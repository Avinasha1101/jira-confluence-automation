import fs from 'node:fs';
import path from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { ConfluenceTarget, HttpConfluenceClient, MockConfluence } from '../confluence/client';
import {
  loadSecrets,
  parseSettings,
  Secrets,
  SettingsStore,
  settingsWarnings,
} from '../config/settings';
import {
  LlmPayloadResponse,
  PublishResponse,
  ReportRecord,
  Settings,
  SettingsResponse,
  TestConnectionResult,
  Warning,
} from '../domain/apiTypes';
import { JiraSource, NoActiveSprintError, UserFacingError } from '../domain/types';
import { HttpJiraClient } from '../jira/httpClient';
import { DEMO_SCENARIOS, FixtureJiraClient } from '../jira/fixtures';
import { buildLlmPayload, llmGate } from '../llm/narrative';
import { generateReport, redraftSection } from '../pipeline/generate';
import { redactText } from '../pipeline/redact';
import { publishReport } from '../publish/publisher';
import { renderPreviewHtml } from '../report/render';
import { Store } from '../store/db';
import { HttpError } from '../util/http';

export interface AppDeps {
  store: Store;
  settingsStore: SettingsStore;
  secrets?: () => Secrets;
  now?: () => Date;
  webDist?: string;
  makeSource?: (settings: Settings, scenario: string | undefined) => JiraSource;
  makeConfluence?: (settings: Settings) => ConfluenceTarget;
  fetchImpl?: typeof fetch;
}

const updateSchema = z.object({
  summary: z.string().optional(),
  blurbs: z.record(z.string()).optional(),
  manualRisks: z.array(z.string()).optional(),
  ragOverride: z
    .object({ status: z.enum(['Red', 'Amber', 'Green']), reason: z.string() })
    .nullable()
    .optional(),
  acknowledged: z.array(z.string()).optional(),
});

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function renderMockPage(title: string, body: string): string {
  const colours: Record<string, string> = { Red: '#c62828', Yellow: '#b26a00', Green: '#2e7d32' };
  const html = body.replace(
    /<ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">(\w+)<\/ac:parameter><ac:parameter ac:name="title">([^<]*)<\/ac:parameter><\/ac:structured-macro>/g,
    (_m, colour: string, label: string) =>
      `<span style="background:${colours[colour] ?? '#555'};color:#fff;padding:2px 10px;border-radius:3px;font-weight:700;font-size:12px">${label}</span>`,
  );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>
body{margin:0;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#172b4d;background:#f4f5f7}
.bar{background:#0052cc;color:#fff;padding:10px 24px;font-weight:600}
.page{background:#fff;max-width:880px;margin:24px auto;padding:32px 48px;box-shadow:0 1px 3px rgba(9,30,66,.25)}
h1{font-size:28px}h2{font-size:20px;margin-top:28px;border-bottom:1px solid #ebecf0;padding-bottom:4px}h3{font-size:16px}
table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #c1c7d0;padding:6px 10px;text-align:left;font-size:14px}th{background:#f4f5f7}
</style></head><body><div class="bar">Confluence (demo mock) &nbsp;|&nbsp; ${title}</div><div class="page">${html}</div></body></html>`;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  const now = deps.now ?? (() => new Date());
  const secrets = deps.secrets ?? (() => loadSecrets());

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    if (!LOCAL_HOST.test(req.headers.host ?? '')) {
      res.status(403).json({ error: 'This app only accepts requests addressed to localhost.' });
      return;
    }
    next();
  });

  const makeSource = (settings: Settings, scenario: string | undefined): JiraSource => {
    if (deps.makeSource) return deps.makeSource(settings, scenario);
    if (settings.mode === 'demo') return new FixtureJiraClient(scenario ?? 'healthy', now);
    const s = secrets();
    if (!settings.jira.baseUrl || !settings.jira.email || !settings.jira.boardId || !s.jiraToken) {
      throw new UserFacingError(
        'Jira is not configured. Set the Jira URL, email and board ID in Settings and JIRA_API_TOKEN in the environment.',
      );
    }
    return new HttpJiraClient(settings, s.jiraToken, { fetchImpl: deps.fetchImpl });
  };

  const makeConfluence = (settings: Settings): ConfluenceTarget => {
    if (deps.makeConfluence) return deps.makeConfluence(settings);
    if (settings.mode === 'demo') return new MockConfluence(deps.store);
    const c = settings.confluence;
    const s = secrets();
    if (!c.baseUrl || !c.spaceKey || !c.parentPageId || !c.latestPageId || !s.confluenceToken) {
      throw new UserFacingError(
        'Confluence targets are not configured yet. Add the base URL, space, parent page and Latest page in Settings.',
      );
    }
    return new HttpConfluenceClient(settings, s.confluenceToken, settings.jira.email, {
      fetchImpl: deps.fetchImpl,
    });
  };

  const getRecord = (req: Request): ReportRecord => {
    const id = Number(req.params.id);
    const rec = Number.isInteger(id) ? deps.store.getReport(id) : null;
    if (!rec) throw new UserFacingError('Report not found.', 404);
    return rec;
  };

  const settingsResponse = (settings: Settings): SettingsResponse => {
    const s = secrets();
    return {
      settings,
      secrets: { jira: !!s.jiraToken, confluence: !!s.confluenceToken, llm: !!s.anthropicKey },
      warnings: settingsWarnings(settings, s),
    };
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: deps.settingsStore.load().mode });
  });

  app.get('/api/settings', (_req, res) => {
    res.json(settingsResponse(deps.settingsStore.load()));
  });

  app.put('/api/settings', (req, res) => {
    let saved: Settings;
    try {
      saved = deps.settingsStore.save(parseSettings(req.body));
    } catch (err) {
      throw new UserFacingError(err instanceof ZodError ? 'Invalid settings.' : (err as Error).message);
    }
    res.json(settingsResponse(saved));
  });

  app.post(
    '/api/settings/test',
    asyncHandler(async (req, res) => {
      const target = z.enum(['jira', 'confluence', 'llm']).parse(req.body?.target);
      const settings = deps.settingsStore.load();
      const s = secrets();
      let result: TestConnectionResult;
      try {
        if (target === 'llm') {
          const gate = llmGate(settings, !!s.anthropicKey);
          result = gate ? { ok: false, message: gate } : { ok: true, message: 'LLM drafting is approved and the API key is set.' };
        } else if (settings.mode === 'demo') {
          result = { ok: true, message: `Demo mode: ${target === 'jira' ? 'fixture data' : 'mock Confluence'} is in use, no network call made.` };
        } else if (target === 'jira') {
          const source = makeSource(settings, undefined) as HttpJiraClient;
          const message = await source.testConnection();
          const missing = await source.validateWorkflow();
          result = { ok: missing.length === 0, message: [message, ...missing].join(' ') };
        } else {
          const client = makeConfluence(settings) as HttpConfluenceClient;
          result = { ok: true, message: await client.testConnection() };
        }
      } catch (err) {
        result = { ok: false, message: (err as Error).message };
      }
      res.json(result);
    }),
  );

  app.get('/api/demo/scenarios', (_req, res) => {
    res.json(DEMO_SCENARIOS);
  });

  app.post(
    '/api/reports/generate',
    asyncHandler(async (req, res) => {
      const settings = deps.settingsStore.load();
      const scenario = z.object({ scenario: z.string().optional() }).parse(req.body ?? {}).scenario;
      if (settings.mode === 'demo' && scenario && !DEMO_SCENARIOS.some((d) => d.id === scenario)) {
        throw new UserFacingError(`Unknown demo scenario "${scenario}".`);
      }
      const s = secrets();
      const result = await generateReport({
        source: makeSource(settings, scenario),
        settings,
        now: now(),
        llm: s.anthropicKey ? { apiKey: s.anthropicKey, http: { fetchImpl: deps.fetchImpl } } : undefined,
      });
      const stamp = now().toISOString();
      const record = deps.store.insertReport({
        status: 'draft',
        createdAt: stamp,
        updatedAt: stamp,
        drafter: result.drafter,
        demo: settings.mode === 'demo',
        content: result.content,
        warnings: result.warnings,
        publishes: [],
      });
      res.json(record);
    }),
  );

  app.get('/api/reports', (_req, res) => {
    res.json(deps.store.listReports());
  });

  app.get('/api/reports/:id', (req, res) => {
    res.json(getRecord(req));
  });

  app.put('/api/reports/:id', (req, res) => {
    const record = getRecord(req);
    const body = updateSchema.parse(req.body);
    const settings = deps.settingsStore.load();
    const opts = { accountRegex: settings.pii.accountRegex };
    const added: Warning[] = [];

    const clean = (field: string, text: string): string => {
      const r = redactText(text, opts);
      for (const type of r.types) {
        const id = `pii:edit:${field}:${type}`;
        if (!record.warnings.some((w) => w.id === id) && !added.some((w) => w.id === id)) {
          added.push({
            id,
            kind: 'pii',
            severity: 'error',
            blocking: true,
            acknowledged: false,
            message: `Your edit to "${field}" contained ${type} data, which was masked. Confirm the masked text before publishing.`,
          });
        }
      }
      return r.text;
    };

    let contentChanged = false;
    const c = record.content;
    if (body.summary !== undefined) {
      c.summary = clean('summary', body.summary);
      contentChanged = true;
    }
    if (body.blurbs) {
      for (const section of ['completed', 'inProgress', 'next'] as const) {
        for (const g of c[section]) {
          const text = body.blurbs[`${section}:${g.epic}`];
          if (text !== undefined) g.blurb = clean(`${section}:${g.epic}`, text);
        }
      }
      contentChanged = true;
    }
    if (body.manualRisks) {
      c.manualRisks = body.manualRisks.map((r, i) => clean(`manual risk ${i + 1}`, r)).filter((r) => r.trim());
      contentChanged = true;
    }
    if (body.ragOverride !== undefined) {
      if (body.ragOverride === null) {
        c.rag.final = c.rag.computed;
        c.rag.overrideReason = null;
      } else {
        const reason = body.ragOverride.reason.trim();
        if (!reason) throw new UserFacingError('A reason is required to override the RAG status.');
        c.rag.final = body.ragOverride.status;
        c.rag.overrideReason = clean('RAG override reason', reason);
      }
      contentChanged = true;
    }

    record.warnings.push(...added);
    if (body.acknowledged) {
      const ids = new Set(body.acknowledged);
      for (const w of record.warnings) w.acknowledged = ids.has(w.id);
    }
    if (contentChanged && record.status === 'published') record.status = 'draft';
    record.updatedAt = now().toISOString();
    deps.store.saveReport(record);
    res.json(record);
  });

  app.post(
    '/api/reports/:id/regenerate',
    asyncHandler(async (req, res) => {
      const record = getRecord(req);
      const { section } = z
        .object({ section: z.enum(['summary', 'completed', 'inProgress', 'next']) })
        .parse(req.body);
      const s = secrets();
      record.drafter = await redraftSection(
        record.content,
        section,
        deps.settingsStore.load(),
        s.anthropicKey ? { apiKey: s.anthropicKey, http: { fetchImpl: deps.fetchImpl } } : undefined,
      );
      record.updatedAt = now().toISOString();
      deps.store.saveReport(record);
      res.json(record);
    }),
  );

  app.get('/api/reports/:id/preview', (req, res) => {
    res.type('html').send(renderPreviewHtml(getRecord(req).content));
  });

  app.get('/api/reports/:id/llm-payload', (req, res) => {
    const record = getRecord(req);
    const response: LlmPayloadResponse = {
      enabled: record.drafter === 'llm',
      gatedReason: llmGate(deps.settingsStore.load(), !!secrets().anthropicKey),
      payload: buildLlmPayload(record.content),
    };
    res.json(response);
  });

  app.post(
    '/api/reports/:id/publish',
    asyncHandler(async (req, res) => {
      const record = getRecord(req);
      const opts = z
        .object({
          existingPage: z.enum(['update', 'copy']).optional(),
          retryFailedOnly: z.boolean().optional(),
        })
        .parse(req.body ?? {});
      const target = makeConfluence(deps.settingsStore.load());
      const results = await publishReport(record, target, { ...opts, now });
      record.publishes = results;
      const ok = results.every((r) => r.ok);
      record.status = ok ? 'published' : 'draft';
      record.updatedAt = now().toISOString();
      deps.store.saveReport(record);
      const response: PublishResponse = { ok, results, report: record };
      res.json(response);
    }),
  );

  app.get('/api/mock-confluence/pages', (_req, res) => {
    res.json(deps.store.listMockPages());
  });

  app.get('/api/mock-confluence/pages/:id', (req, res) => {
    const page = deps.store.getMockPage(String(req.params.id));
    if (!page) throw new UserFacingError('Page not found.', 404);
    res.type('html').send(renderMockPage(page.title, page.body));
  });

  const dist = deps.webDist;
  if (dist && fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof UserFacingError) {
      res.status(err.status).json({ error: err.message });
    } else if (err instanceof NoActiveSprintError) {
      res.status(404).json({ error: err.message });
    } else if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request.', details: err.issues.map((i) => i.message) });
    } else if (err instanceof HttpError) {
      res.status(502).json({ error: err.message });
    } else {
      console.error('Unexpected error:', (err as Error).message);
      res.status(500).json({ error: 'Something went wrong. Check the server log for details.' });
    }
  });

  return app;
}
