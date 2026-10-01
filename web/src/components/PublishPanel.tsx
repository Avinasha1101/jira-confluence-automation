import { Link } from 'react-router-dom';
import type { PublishResult, ReportRecord } from '../apiTypes';
import { fmtDateTime } from '../format';
import { Icon } from './Icon';
import { Banner, Spinner, StatusPill } from './ui';

interface Props {
  record: ReportRecord;
  blocking: number;
  busy: boolean;
  saving: boolean;
  error: string | null;
  onPublish: () => void;
}

const TARGET_LABEL: Record<PublishResult['target'], string> = {
  dated: 'Dated page',
  latest: 'Latest page',
};

function latestPerTarget(publishes: PublishResult[]): PublishResult[] {
  const out: PublishResult[] = [];
  (['dated', 'latest'] as const).forEach((t) => {
    const found = [...publishes].reverse().find((p) => p.target === t);
    if (found) out.push(found);
  });
  return out;
}

function PageLink({ result, demo }: { result: PublishResult; demo: boolean }) {
  if (!result.ok) return null;
  if (demo && result.pageId) {
    return (
      <Link to={`/mock-confluence/${result.pageId}`} className="inline-link">
        View in mock Confluence
      </Link>
    );
  }
  if (result.url) {
    return (
      <a href={result.url} target="_blank" rel="noreferrer" className="inline-link">
        Open in Confluence <Icon name="external" size={12} />
      </a>
    );
  }
  return null;
}

export function PublishPanel({ record, blocking, busy, saving, error, onPublish }: Props) {
  const results = latestPerTarget(record.publishes);
  const failed = results.some((r) => !r.ok);
  const published = record.status === 'published';
  const blockedReason =
    blocking > 0
      ? `Acknowledge ${blocking} blocking warning${blocking === 1 ? '' : 's'} to enable publishing.`
      : saving
        ? 'Waiting for your edits to save.'
        : null;
  const label = failed ? 'Retry publish' : published ? 'Publish again' : 'Publish to Confluence';

  return (
    <section className="card side-card" aria-labelledby="pub-title">
      <div className="card-head">
        <h2 className="card-title" id="pub-title">
          Publish
        </h2>
        <StatusPill status={record.status} />
      </div>

      {published && !failed && (
        <Banner kind="success" title="Published">
          This report has been published. Publishing again creates a new version of the pages.
        </Banner>
      )}
      {error && (
        <Banner kind="error" title="Publish failed">
          {error}
        </Banner>
      )}

      {results.length > 0 && (
        <ul className="result-list">
          {results.map((r) => (
            <li key={r.target} className={r.ok ? 'ok' : 'fail'}>
              <span className="result-icon">
                <Icon name={r.ok ? 'check' : 'x'} size={16} />
              </span>
              <div>
                <strong>{TARGET_LABEL[r.target]}</strong>
                <div className="muted small">{r.ok ? (r.title ?? 'Published') : (r.error ?? 'Failed')}</div>
                <div className="muted small">{fmtDateTime(r.at)}</div>
                <PageLink result={r} demo={record.demo} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {failed && !error && (
        <Banner kind="warn" title="Partially published">
          One target failed. Retrying publishes again and is safe to repeat.
        </Banner>
      )}

      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onPublish} disabled={busy || blockedReason !== null}>
        {busy ? <Spinner label="Publishing" /> : label}
      </button>
      {blockedReason && <p className="blocked-reason">{blockedReason}</p>}
    </section>
  );
}
