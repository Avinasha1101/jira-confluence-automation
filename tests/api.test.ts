import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { parseSettings, SettingsStore, settingsWarnings } from '../src/config/settings';
import { ReportRecord } from '../src/domain/apiTypes';
import { mapIssue } from '../src/jira/httpClient';
import { createApp } from '../src/server/app';
import { Store } from '../src/store/db';
import { NOW, settings } from './helpers';

let dir: string;
let store: Store;
let settingsStore: SettingsStore;
const app = () =>
  createApp({
    store,
    settingsStore,
    secrets: () => ({ jiraToken: '', confluenceToken: '', anthropicKey: '' }),
    now: () => NOW,
  });
const local = { Host: 'localhost:3001' };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsr-'));
  store = new Store(':memory:');
  settingsStore = new SettingsStore(dir);
});
afterEach(() => {
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const generate = async (scenario?: string): Promise<ReportRecord> =>
  (await request(app()).post('/api/reports/generate').set(local).send({ scenario })).body as ReportRecord;

describe('API', () => {
  it('rejects requests that are not addressed to localhost', async () => {
    const res = await request(app()).get('/api/health').set('Host', 'evil.example.com');
    expect(res.status).toBe(403);
  });

  it('generates a demo report with a computed RAG and template draft', async () => {
    const rec = await generate('healthy');
    expect(rec.id).toBeGreaterThan(0);
    expect(rec.drafter).toBe('template');
    expect(rec.content.rag.final).toBe('Green');
    expect(rec.content.summary).toMatch(/overall status is Green/);
  });

  it('computes Red for the at-risk scenario with blocker reasons', async () => {
    const rec = await generate('at-risk');
    expect(rec.content.rag.final).toBe('Red');
    expect(rec.content.blockers.length).toBeGreaterThan(0);
  });

  it('returns a friendly 404 when there is no active sprint', async () => {
    const res = await request(app()).post('/api/reports/generate').set(local).send({ scenario: 'no-sprint' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No active sprint/);
  });

  it('masks PII, blocks publish, then allows it after acknowledgement', async () => {
    const rec = await generate('pii-leak');
    expect(JSON.stringify(rec)).not.toMatch(/123-45-6789|jane\.doe@/);
    const blocking = rec.warnings.filter((w) => w.blocking);
    expect(blocking.length).toBeGreaterThanOrEqual(5);

    const refused = await request(app()).post(`/api/reports/${rec.id}/publish`).set(local).send({});
    expect(refused.status).toBe(409);

    await request(app())
      .put(`/api/reports/${rec.id}`)
      .set(local)
      .send({ acknowledged: rec.warnings.map((w) => w.id) });
    const ok = await request(app()).post(`/api/reports/${rec.id}/publish`).set(local).send({});
    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);
    expect(ok.body.report.status).toBe('published');
  });

  it('masks PII typed into an edit and raises a new blocking warning', async () => {
    const rec = await generate('healthy');
    const res = await request(app())
      .put(`/api/reports/${rec.id}`)
      .set(local)
      .send({ summary: 'Customer SSN 987-65-4321 was escalated.' });
    expect(res.body.content.summary).toContain('[REDACTED-SSN]');
    expect(res.body.warnings.some((w: { id: string; blocking: boolean }) => w.id.startsWith('pii:edit:') && w.blocking)).toBe(true);
  });

  it('requires a reason for a RAG override and records it', async () => {
    const rec = await generate('healthy');
    const bad = await request(app()).put(`/api/reports/${rec.id}`).set(local).send({ ragOverride: { status: 'Amber', reason: '  ' } });
    expect(bad.status).toBe(400);

    const good = await request(app())
      .put(`/api/reports/${rec.id}`)
      .set(local)
      .send({ ragOverride: { status: 'Amber', reason: 'Vendor delay not yet in Jira' } });
    expect(good.body.content.rag).toMatchObject({ computed: 'Green', final: 'Amber', overrideReason: 'Vendor delay not yet in Jira' });

    const cleared = await request(app()).put(`/api/reports/${rec.id}`).set(local).send({ ragOverride: null });
    expect(cleared.body.content.rag.final).toBe('Green');
  });

  it('applies the exclusion rule from settings', async () => {
    const before = await generate('healthy');
    const s = settings();
    s.exclusion.rule = { type: 'label', value: 'internal-only' };
    await request(app()).put('/api/settings').set(local).send(s);
    const after = await generate('healthy');
    expect(before.content.footer.excludedCount).toBe(0);
    expect(after.content.footer.excludedCount).toBe(2);
  });

  it('serves a preview and lists history and mock pages after publishing', async () => {
    const rec = await generate('healthy');
    const preview = await request(app()).get(`/api/reports/${rec.id}/preview`).set(local);
    expect(preview.type).toBe('text/html');
    expect(preview.text).toContain('Weekly Status');

    await request(app()).post(`/api/reports/${rec.id}/publish`).set(local).send({});
    const history = await request(app()).get('/api/reports').set(local);
    expect(history.body[0]).toMatchObject({ id: rec.id, status: 'published' });
    const pages = await request(app()).get('/api/mock-confluence/pages').set(local);
    expect(pages.body).toHaveLength(2);
    const page = await request(app()).get(`/api/mock-confluence/pages/${pages.body[0].id}`).set(local);
    expect(page.text).toContain('Confluence (demo mock)');
  });

  it('reports the LLM payload and its gate reason', async () => {
    const rec = await generate('healthy');
    const res = await request(app()).get(`/api/reports/${rec.id}/llm-payload`).set(local);
    expect(res.body.enabled).toBe(false);
    expect(res.body.gatedReason).toMatch(/disabled/);
    expect(JSON.stringify(res.body.payload)).not.toMatch(/description|assignee/i);
  });

  it('regenerates a section back to the template text', async () => {
    const rec = await generate('healthy');
    await request(app()).put(`/api/reports/${rec.id}`).set(local).send({ summary: 'Hand-written.' });
    const res = await request(app()).post(`/api/reports/${rec.id}/regenerate`).set(local).send({ section: 'summary' });
    expect(res.body.content.summary).toMatch(/overall status is/);
  });

  it('blocks live publishing until Confluence targets are configured', async () => {
    const rec = await generate('healthy');
    const live = settings();
    live.mode = 'live';
    await request(app()).put('/api/settings').set(local).send(live);
    const res = await request(app()).post(`/api/reports/${rec.id}/publish`).set(local).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Confluence targets are not configured/);
  });

  it('refuses to enable the LLM without an approval reference', async () => {
    const s = settings();
    s.llm.enabled = true;
    const res = await request(app()).put('/api/settings').set(local).send(s);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/approval/i);
  });

  it('returns 404 for unknown reports', async () => {
    expect((await request(app()).get('/api/reports/999').set(local)).status).toBe(404);
  });

  it('shows the test-connection result for demo mode and the LLM gate', async () => {
    const jira = await request(app()).post('/api/settings/test').set(local).send({ target: 'jira' });
    expect(jira.body.ok).toBe(true);
    const llm = await request(app()).post('/api/settings/test').set(local).send({ target: 'llm' });
    expect(llm.body.ok).toBe(false);
  });
});

describe('settings', () => {
  it('warns about the missing exclusion rule and LLM state, and clears it when acknowledged', () => {
    const s = settings();
    const secrets = { jiraToken: '', confluenceToken: '', anthropicKey: '' };
    expect(settingsWarnings(s, secrets).join(' ')).toMatch(/exclusion rule/);
    s.exclusion.acknowledgedNone = true;
    expect(settingsWarnings(s, secrets).join(' ')).not.toMatch(/exclusion rule/);
  });

  it('validates threshold ordering and regex', () => {
    const s = settings();
    s.rag.amberLagPoints = 40;
    expect(() => parseSettings(s)).toThrow(/amberLagPoints/);
    const r = settings();
    r.pii.accountRegex = '(';
    expect(() => parseSettings(r)).toThrow();
  });
});

describe('Jira mapping', () => {
  it('maps a Jira issue without descriptions or assignees and derives status history', () => {
    const issue = mapIssue(
      {
        key: 'AFP-1',
        fields: {
          summary: 'Title',
          issuetype: { name: 'Bug' },
          status: { name: 'In Dev', statusCategory: { key: 'indeterminate' } },
          priority: { name: 'High' },
          labels: ['x'],
          components: [{ name: 'Core' }],
          created: '2026-09-20T00:00:00.000Z',
          parent: { key: 'AFP-9', fields: { summary: 'Epic name', issuetype: { name: 'Epic' } } },
          customfield_10016: 5,
          description: 'secret borrower text',
          assignee: { displayName: 'Someone' },
        },
        changelog: {
          histories: [
            { created: '2026-09-25T00:00:00.000Z', items: [{ field: 'status', toString: 'In Dev' }] },
            { created: '2026-09-22T00:00:00.000Z', items: [{ field: 'status', toString: 'Ready for Dev' }] },
          ],
        },
      },
      'customfield_10016',
    );
    expect(issue).toMatchObject({
      key: 'AFP-1',
      statusCategory: 'inprogress',
      storyPoints: 5,
      epicName: 'Epic name',
      components: ['Core'],
    });
    expect(issue.statusHistory.map((h) => h.status)).toEqual(['Ready for Dev', 'In Dev']);
    expect(JSON.stringify(issue)).not.toMatch(/secret borrower|Someone/);
  });
});
