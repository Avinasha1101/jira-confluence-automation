import { ConfluenceTarget } from '../confluence/client';
import { PublishResult, ReportRecord } from '../domain/apiTypes';
import { UserFacingError } from '../domain/types';
import { renderConfluence } from '../report/render';

export interface PublishOptions {
  existingPage?: 'update' | 'copy';
  retryFailedOnly?: boolean;
  now?: () => Date;
}

export function blockingWarnings(record: ReportRecord): number {
  return record.warnings.filter((w) => w.blocking && !w.acknowledged).length;
}

async function datedTitle(
  target: ConfluenceTarget,
  base: string,
  mode: 'update' | 'copy',
): Promise<{ title: string; existingId: string | null }> {
  const existing = await target.findChildByTitle(base);
  if (!existing) return { title: base, existingId: null };
  if (mode === 'update') return { title: base, existingId: existing.id };
  for (let n = 2; n < 50; n++) {
    const candidate = `${base} (${n})`;
    if (!(await target.findChildByTitle(candidate))) return { title: candidate, existingId: null };
  }
  throw new UserFacingError(`Too many pages already exist with the title "${base}".`, 409);
}

// Writes the dated page and the "Latest" page independently so one failure never hides the other.
export async function publishReport(
  record: ReportRecord,
  target: ConfluenceTarget,
  opts: PublishOptions = {},
): Promise<PublishResult[]> {
  const unresolved = blockingWarnings(record);
  if (unresolved > 0) {
    throw new UserFacingError(
      `${unresolved} warning(s) must be acknowledged before publishing.`,
      409,
    );
  }

  const now = (opts.now ?? (() => new Date()))().toISOString();
  const body = renderConfluence(record.content);
  const baseTitle = `Status Report - ${record.content.header.reportDate}`;
  const latestTitle = `${record.content.header.project} - Latest Status`;
  const previous = new Map(record.publishes.map((p) => [p.target, p]));
  const results: PublishResult[] = [];

  const run = async (
    which: 'dated' | 'latest',
    action: () => Promise<{ id: string; url: string; title: string }>,
  ): Promise<void> => {
    const prior = previous.get(which);
    if (opts.retryFailedOnly && prior?.ok) {
      results.push(prior);
      return;
    }
    try {
      const ref = await action();
      results.push({ target: which, ok: true, pageId: ref.id, url: ref.url, title: ref.title, at: now });
    } catch (err) {
      results.push({ target: which, ok: false, error: (err as Error).message, at: now });
    }
  };

  await run('dated', async () => {
    const { title, existingId } = await datedTitle(target, baseTitle, opts.existingPage ?? 'update');
    const ref = existingId
      ? await target.updatePage(existingId, title, body)
      : await target.createChild(title, body);
    return { ...ref, title };
  });
  await run('latest', async () => {
    const ref = await target.updateLatest(latestTitle, body);
    return { ...ref, title: latestTitle };
  });

  return results;
}
