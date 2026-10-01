import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { Settings } from '../domain/apiTypes';

const exclusionRule = z.union([
  z.object({ type: z.literal('none') }),
  z.object({
    type: z.enum(['label', 'securityLevel', 'component', 'issueType']),
    value: z.string(),
  }),
]);

export const settingsSchema = z.object({
  mode: z.enum(['demo', 'live']).default('demo'),
  project: z.object({ name: z.string().min(1).default('Auto Finance Platform') }).default({}),
  jira: z
    .object({
      baseUrl: z.string().default(''),
      email: z.string().default(''),
      boardId: z.string().default(''),
    })
    .default({}),
  workflow: z
    .object({
      readyStatus: z.string().default('Ready for Dev'),
      cycleStartStatus: z.string().default('In Dev'),
      cycleEndStatus: z.string().default('Done'),
      blockedStatus: z.string().default('Blocked'),
      doneStatuses: z.array(z.string()).default(['Done']),
    })
    .default({}),
  exclusion: z
    .object({
      rule: exclusionRule.default({ type: 'none' }),
      acknowledgedNone: z.boolean().default(false),
    })
    .default({}),
  pii: z.object({ accountRegex: z.string().default('') }).default({}),
  rag: z
    .object({
      redBlockerDays: z.number().min(0).default(3),
      redLagPoints: z.number().min(0).default(25),
      amberLagPoints: z.number().min(0).default(10),
      amberOpenBugs: z.number().min(0).default(5),
    })
    .default({}),
  confluence: z
    .object({
      baseUrl: z.string().default(''),
      spaceKey: z.string().default(''),
      parentPageId: z.string().default(''),
      latestPageId: z.string().default(''),
    })
    .default({}),
  llm: z
    .object({
      enabled: z.boolean().default(false),
      approvalReference: z.string().default(''),
      model: z.string().default('claude-sonnet-5-5'),
    })
    .default({}),
});

export const defaultSettings = (): Settings => settingsSchema.parse({}) as Settings;

export function parseSettings(input: unknown): Settings {
  const parsed = settingsSchema.parse(input) as Settings;
  if (parsed.pii.accountRegex.trim()) {
    new RegExp(parsed.pii.accountRegex);
  }
  if (parsed.rag.amberLagPoints > parsed.rag.redLagPoints) {
    throw new Error('rag.amberLagPoints must not exceed rag.redLagPoints');
  }
  if (parsed.llm.enabled && !parsed.llm.approvalReference.trim()) {
    throw new Error(
      'llm.approvalReference is required: LLM drafting needs company security approval before it can be enabled',
    );
  }
  return parsed;
}

export interface Secrets {
  jiraToken: string;
  confluenceToken: string;
  anthropicKey: string;
}

export function loadSecrets(env: NodeJS.ProcessEnv = process.env): Secrets {
  const jira = env.JIRA_API_TOKEN ?? '';
  return {
    jiraToken: jira,
    confluenceToken: env.CONFLUENCE_API_TOKEN || jira,
    anthropicKey: env.ANTHROPIC_API_KEY ?? '',
  };
}

export class SettingsStore {
  private readonly file: string;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.file = path.join(dataDir, 'settings.json');
  }

  load(): Settings {
    if (!fs.existsSync(this.file)) return defaultSettings();
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return settingsSchema.parse(raw) as Settings;
    } catch (err) {
      throw new Error(
        `Settings file ${this.file} is invalid: ${(err as Error).message}. Fix or delete it to reset to defaults.`,
      );
    }
  }

  save(settings: Settings): Settings {
    const valid = parseSettings(settings);
    fs.writeFileSync(this.file, JSON.stringify(valid, null, 2), 'utf8');
    return valid;
  }
}

export function settingsWarnings(settings: Settings, secrets: Secrets): string[] {
  const warnings: string[] = [];
  if (settings.exclusion.rule.type === 'none' && !settings.exclusion.acknowledgedNone) {
    warnings.push(
      'No internal-only exclusion rule is configured. Internal issues will appear in the report. Set a rule or confirm that no exclusions are needed.',
    );
  }
  if (settings.mode === 'live') {
    if (!settings.jira.baseUrl || !settings.jira.email || !settings.jira.boardId) {
      warnings.push('Jira URL, email and board ID are required in live mode.');
    }
    if (!secrets.jiraToken) warnings.push('JIRA_API_TOKEN is not set in the environment.');
    const c = settings.confluence;
    if (!c.baseUrl || !c.spaceKey || !c.parentPageId || !c.latestPageId) {
      warnings.push('Confluence targets are not configured. You can generate reports, but publishing is blocked.');
    }
  }
  if (!settings.llm.enabled) {
    warnings.push('LLM drafting is off (needs company security approval). Template drafting is in use.');
  }
  return warnings;
}
