import { ConfluenceTarget, MockConfluence, PageRef } from '../src/confluence/client';
import { ReportRecord } from '../src/domain/apiTypes';
import { buildLlmPayload, draftWithLlm, llmGate } from '../src/llm/narrative';
import { draftNarrative, generateReport } from '../src/pipeline/generate';
import { publishReport } from '../src/publish/publisher';
import { FixtureJiraClient } from '../src/jira/fixtures';
import { Store } from '../src/store/db';
import { requestJson } from '../src/util/http';
import { NOW, settings } from './helpers';

async function makeRecord(scenario = 'healthy'): Promise<ReportRecord> {
  const result = await generateReport({
    source: new FixtureJiraClient(scenario, () => NOW),
    settings: settings(),
    now: NOW,
  });
  return {
    id: 1,
    status: 'draft',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    drafter: result.drafter,
    demo: true,
    content: result.content,
    warnings: result.warnings,
    publishes: [],
  };
}

class FlakyTarget implements ConfluenceTarget {
  calls: string[] = [];
  constructor(private readonly failOn: 'dated' | 'latest' | null) {}
  private ref(id: string): PageRef {
    return { id, url: `/p/${id}` };
  }
  async findChildByTitle(): Promise<PageRef | null> {
    return null;
  }
  async createChild(): Promise<PageRef> {
    this.calls.push('dated');
    if (this.failOn === 'dated') throw new Error('dated failed');
    return this.ref('d1');
  }
  async updatePage(id: string): Promise<PageRef> {
    this.calls.push('update');
    return this.ref(id);
  }
  async updateLatest(): Promise<PageRef> {
    this.calls.push('latest');
    if (this.failOn === 'latest') throw new Error('latest failed');
    return this.ref('latest');
  }
}

describe('publishing', () => {
  it('refuses to publish while blocking warnings are unacknowledged', async () => {
    const rec = await makeRecord('pii-leak');
    expect(rec.warnings.filter((w) => w.blocking).length).toBeGreaterThan(0);
    await expect(publishReport(rec, new FlakyTarget(null))).rejects.toThrow(/must be acknowledged/);
  });

  it('publishes both pages once warnings are acknowledged', async () => {
    const rec = await makeRecord('pii-leak');
    rec.warnings.forEach((w) => (w.acknowledged = true));
    const results = await publishReport(rec, new FlakyTarget(null));
    expect(results.map((r) => [r.target, r.ok])).toEqual([['dated', true], ['latest', true]]);
  });

  it('reports a partial failure and retries only the failed page', async () => {
    const rec = await makeRecord();
    const first = await publishReport(rec, new FlakyTarget('latest'));
    expect(first.map((r) => r.ok)).toEqual([true, false]);
    rec.publishes = first;

    const healed = new FlakyTarget(null);
    const second = await publishReport(rec, healed, { retryFailedOnly: true });
    expect(healed.calls).toEqual(['latest']);
    expect(second.every((r) => r.ok)).toBe(true);
  });

  it('is idempotent against the mock: republishing updates instead of duplicating', async () => {
    const store = new Store(':memory:');
    const target = new MockConfluence(store);
    const rec = await makeRecord();
    await publishReport(rec, target);
    await publishReport(rec, target);
    const pages = store.listMockPages();
    expect(pages.filter((p) => p.kind === 'dated')).toHaveLength(1);
    expect(pages.filter((p) => p.kind === 'latest')).toHaveLength(1);
    expect(pages.find((p) => p.kind === 'dated')?.version).toBe(2);
  });

  it('can create a numbered copy when a dated page already exists', async () => {
    const store = new Store(':memory:');
    const target = new MockConfluence(store);
    const rec = await makeRecord();
    await publishReport(rec, target);
    await publishReport(rec, target, { existingPage: 'copy' });
    const titles = store.listMockPages().filter((p) => p.kind === 'dated').map((p) => p.title).sort();
    expect(titles).toHaveLength(2);
    expect(titles[1]).toMatch(/\(2\)$/);
  });

  it('renders the RAG as a Confluence status macro', async () => {
    const store = new Store(':memory:');
    await publishReport(await makeRecord(), new MockConfluence(store));
    const latest = store.getMockPage('latest');
    expect(latest?.body).toContain('ac:name="status"');
  });
});

describe('LLM gating and payload', () => {
  it('is gated by default and until approval and a key exist', () => {
    const s = settings();
    expect(llmGate(s, true)).toMatch(/disabled/);
    s.llm.enabled = true;
    expect(llmGate(s, true)).toMatch(/approval/);
    s.llm.approvalReference = 'SEC-123';
    expect(llmGate(s, false)).toMatch(/ANTHROPIC_API_KEY/);
    expect(llmGate(s, true)).toBeNull();
  });

  it('never includes descriptions, comments or assignees in the payload', async () => {
    const rec = await makeRecord();
    const json = JSON.stringify(buildLlmPayload(rec.content));
    expect(json).not.toMatch(/description|comment|assignee/i);
  });

  it('masks PII before it can reach the payload', async () => {
    const rec = await makeRecord('pii-leak');
    const json = JSON.stringify(buildLlmPayload(rec.content));
    expect(json).not.toMatch(/123-45-6789|4111 1111|jane\.doe|867-5309|1HGCM/);
  });

  it('does not call the LLM when gated and uses the template draft', async () => {
    const fetchImpl = jest.fn();
    const rec = await makeRecord();
    const out = await draftNarrative(rec.content, settings(), { apiKey: 'k', http: { fetchImpl } });
    expect(out.drafter).toBe('template');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rec.content.summary).toMatch(/overall status is/);
  });

  const enabled = () => {
    const s = settings();
    s.llm = { enabled: true, approvalReference: 'SEC-1', model: 'm' };
    return s;
  };
  const reply = (text: string) =>
    jest.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 }));

  it('uses LLM output when approved', async () => {
    const rec = await makeRecord();
    const epic = rec.content.completed[0].epic;
    const fetchImpl = reply(JSON.stringify({ summary: 'LLM summary.', blurbs: { [`completed:${epic}`]: 'LLM blurb.' } }));
    const out = await draftNarrative(rec.content, enabled(), { apiKey: 'k', http: { fetchImpl } });
    expect(out.drafter).toBe('llm');
    expect(rec.content.summary).toBe('LLM summary.');
    expect(rec.content.completed[0].blurb).toBe('LLM blurb.');
  });

  it('falls back to the template with a warning when the LLM fails', async () => {
    const rec = await makeRecord();
    const fetchImpl = jest.fn().mockResolvedValue(new Response('not json', { status: 200 }));
    const out = await draftNarrative(rec.content, enabled(), { apiKey: 'k', http: { fetchImpl } });
    expect(out.drafter).toBe('template');
    expect(out.warning?.id).toBe('llm:fallback');
    expect(rec.content.summary).toMatch(/overall status is/);
  });

  it('rejects an unexpected response shape', async () => {
    const fetchImpl = reply('{"foo":1}');
    await expect(
      draftWithLlm(buildLlmPayload((await makeRecord()).content), enabled(), 'k', { fetchImpl }),
    ).rejects.toThrow(/unexpected/);
  });
});

describe('http retry', () => {
  const sleep = jest.fn().mockResolvedValue(undefined);
  const ok = () => new Response(JSON.stringify({ a: 1 }), { status: 200 });

  it('retries on 429 honouring Retry-After and then succeeds', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '2' } }))
      .mockResolvedValueOnce(ok());
    await expect(requestJson('X', 'http://x', {}, { fetchImpl, sleep })).resolves.toEqual({ a: 1 });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('retries 5xx with backoff and gives up after the retry budget', async () => {
    const fetchImpl = jest.fn().mockImplementation(async () => new Response('', { status: 503 }));
    await expect(requestJson('X', 'http://x', {}, { fetchImpl, sleep, retries: 2 })).rejects.toThrow(/503/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry auth failures and names the problem', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response('', { status: 401 }));
    await expect(requestJson('Jira', 'http://x', {}, { fetchImpl, sleep })).rejects.toThrow(/rejected the credentials/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry other 4xx errors', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response('bad', { status: 400 }));
    await expect(requestJson('X', 'http://x', {}, { fetchImpl, sleep })).rejects.toThrow(/400/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
