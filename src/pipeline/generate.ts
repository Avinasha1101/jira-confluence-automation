import { ReportContent, Settings, Warning } from '../domain/apiTypes';
import { JiraSource, NoActiveSprintError } from '../domain/types';
import { buildLlmPayload, draftWithLlm, llmGate } from '../llm/narrative';
import { buildReportContent } from '../report/build';
import { applyTemplateDraft, Section, templateBlurb, templateSummary } from '../report/template';
import { RequestOptions } from '../util/http';
import { applyExclusion } from './exclusion';
import { PiiType, redactIssues, RedactionEvent } from './redact';

export interface LlmDeps {
  apiKey: string;
  http?: RequestOptions;
}

export interface GenerateDeps {
  source: JiraSource;
  settings: Settings;
  now: Date;
  llm?: LlmDeps;
}

export interface GenerateResult {
  content: ReportContent;
  warnings: Warning[];
  drafter: 'template' | 'llm';
}

const PII_LABEL: Record<PiiType, string> = {
  email: 'an email address',
  ssn: 'a Social Security number',
  card: 'a card number',
  vin: 'a VIN',
  phone: 'a phone number',
  address: 'a street address',
  account: 'an account or loan number',
};

export function piiWarnings(events: RedactionEvent[]): Warning[] {
  const seen = new Map<string, Warning>();
  for (const e of events) {
    const id = `pii:${e.issueKey}:${e.type}:${e.field}`;
    if (seen.has(id)) continue;
    seen.set(id, {
      id,
      kind: 'pii',
      severity: 'error',
      blocking: true,
      issueKey: e.issueKey,
      acknowledged: false,
      message: `${e.issueKey}: ${PII_LABEL[e.type]} was found in the ${e.field} and masked. Confirm the masked text is acceptable before publishing.`,
    });
  }
  return [...seen.values()];
}

export async function draftNarrative(
  content: ReportContent,
  settings: Settings,
  llm: LlmDeps | undefined,
): Promise<{ drafter: 'template' | 'llm'; warning?: Warning }> {
  applyTemplateDraft(content);
  const gate = llmGate(settings, !!llm?.apiKey);
  if (gate || !llm) return { drafter: 'template' };
  try {
    const draft = await draftWithLlm(buildLlmPayload(content), settings, llm.apiKey, llm.http);
    content.summary = draft.summary;
    for (const section of ['completed', 'inProgress', 'next'] as const) {
      for (const g of content[section]) {
        const text = draft.blurbs[`${section}:${g.epic}`];
        if (typeof text === 'string' && text.trim()) g.blurb = text;
      }
    }
    return { drafter: 'llm' };
  } catch (err) {
    return {
      drafter: 'template',
      warning: {
        id: 'llm:fallback',
        kind: 'llm',
        severity: 'warn',
        blocking: false,
        acknowledged: false,
        message: `LLM drafting failed (${(err as Error).message}). The template draft was used instead.`,
      },
    };
  }
}

export async function generateReport(deps: GenerateDeps): Promise<GenerateResult> {
  const { settings, now } = deps;
  const data = await deps.source.getActiveSprint();
  if (!data) throw new NoActiveSprintError();

  const { kept, excluded } = applyExclusion(data.issues, settings.exclusion.rule);
  const { issues, events } = redactIssues(kept, { accountRegex: settings.pii.accountRegex });

  const content = buildReportContent({
    issues,
    sprint: data.sprint,
    settings,
    now,
    excludedCount: excluded,
    redactionCount: events.length,
  });

  const warnings: Warning[] = piiWarnings(events);

  if (settings.exclusion.rule.type === 'none' && !settings.exclusion.acknowledgedNone) {
    warnings.push({
      id: 'config:no-exclusion-rule',
      kind: 'config',
      severity: 'warn',
      blocking: false,
      acknowledged: false,
      message: 'No internal-only exclusion rule is configured, so internal issues may appear in this report.',
    });
  }
  const unestimated = content.metrics.velocity.unestimatedCount;
  if (unestimated > 0) {
    warnings.push({
      id: 'data:unestimated',
      kind: 'data',
      severity: 'info',
      blocking: false,
      acknowledged: false,
      message: `${unestimated} issue(s) have no story points and are excluded from point totals.`,
    });
  }
  const noEpic = [...content.completed, ...content.inProgress, ...content.next]
    .filter((g) => g.epic === 'No epic')
    .reduce((n, g) => n + g.items.length, 0);
  if (noEpic > 0) {
    warnings.push({
      id: 'data:no-epic',
      kind: 'data',
      severity: 'info',
      blocking: false,
      acknowledged: false,
      message: `${noEpic} issue(s) are not linked to an epic and are grouped under "No epic".`,
    });
  }

  const { drafter, warning } = await draftNarrative(content, settings, deps.llm);
  if (warning) warnings.push(warning);
  return { content, warnings, drafter };
}

export async function redraftSection(
  content: ReportContent,
  section: 'summary' | Section,
  settings: Settings,
  llm: LlmDeps | undefined,
): Promise<'template' | 'llm'> {
  // Re-run the whole draft on a copy so the LLM sees consistent context, then keep only the requested section.
  const copy: ReportContent = JSON.parse(JSON.stringify(content)) as ReportContent;
  const { drafter } = await draftNarrative(copy, settings, llm);
  if (section === 'summary') {
    content.summary = copy.summary || templateSummary(content);
  } else {
    content[section] = content[section].map((g, i) => ({
      ...g,
      blurb: copy[section][i]?.blurb || templateBlurb(section, g),
    }));
  }
  return drafter;
}
