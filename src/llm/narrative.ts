import { ReportContent, Settings } from '../domain/apiTypes';
import { requestJson, RequestOptions } from '../util/http';

export interface LlmPayload {
  project: string;
  sprint: string;
  rag: string;
  ragReasons: string[];
  metrics: ReportContent['metrics'];
  blockers: { key: string; title: string; daysBlocked: number }[];
  epics: {
    section: 'completed' | 'inProgress' | 'next';
    epic: string;
    items: { key: string; title: string; status: string; points: number | null }[];
  }[];
}

export interface LlmDraft {
  summary: string;
  blurbs: Record<string, string>;
}

// Redacted titles and computed metrics only. No descriptions, comments or assignees exist in the model.
export function buildLlmPayload(content: ReportContent): LlmPayload {
  const epics: LlmPayload['epics'] = [];
  for (const section of ['completed', 'inProgress', 'next'] as const) {
    for (const g of content[section]) {
      epics.push({ section, epic: g.epic, items: g.items });
    }
  }
  return {
    project: content.header.project,
    sprint: content.header.sprintName,
    rag: content.rag.final,
    ragReasons: content.rag.reasons,
    metrics: content.metrics,
    blockers: content.blockers,
    epics,
  };
}

export function llmGate(settings: Settings, hasKey: boolean): string | null {
  if (!settings.llm.enabled) {
    return 'LLM drafting is disabled. It needs company security approval before it can be enabled.';
  }
  if (!settings.llm.approvalReference.trim()) {
    return 'No security approval reference is recorded.';
  }
  if (!hasKey) return 'ANTHROPIC_API_KEY is not set in the environment.';
  return null;
}

const SYSTEM = `You write concise weekly status report text for a product manager at an automotive financing company.
Use only the facts in the JSON provided. Never invent issues, numbers, names or dates.
Return strict JSON: {"summary": string, "blurbs": {"<section>:<epic>": string}}.
The summary is 2-3 sentences covering overall health, one highlight and one key risk.
Each blurb is one short sentence for that epic in plain language for non-technical readers.`;

export async function draftWithLlm(
  payload: LlmPayload,
  settings: Settings,
  apiKey: string,
  opts: RequestOptions = {},
): Promise<LlmDraft> {
  const res = await requestJson<{ content: { type: string; text?: string }[] }>(
    'Anthropic API',
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.llm.model,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      }),
    },
    opts,
  );
  const text = res.content.find((c) => c.type === 'text')?.text ?? '';
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const parsed = JSON.parse(json) as Partial<LlmDraft>;
  if (typeof parsed.summary !== 'string' || typeof parsed.blurbs !== 'object' || !parsed.blurbs) {
    throw new Error('LLM returned an unexpected response shape');
  }
  return { summary: parsed.summary, blurbs: parsed.blurbs as Record<string, string> };
}
