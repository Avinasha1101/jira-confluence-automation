// API contract shared by the backend and the web UI (web/src/apiTypes.ts is an identical copy).

export type Rag = 'Red' | 'Amber' | 'Green';

export type ExclusionRule =
  | { type: 'none' }
  | { type: 'label' | 'securityLevel' | 'component' | 'issueType'; value: string };

export interface Settings {
  mode: 'demo' | 'live';
  project: { name: string };
  jira: { baseUrl: string; email: string; boardId: string };
  workflow: {
    readyStatus: string;
    cycleStartStatus: string;
    cycleEndStatus: string;
    blockedStatus: string;
    doneStatuses: string[];
  };
  exclusion: { rule: ExclusionRule; acknowledgedNone: boolean };
  pii: { accountRegex: string };
  rag: {
    redBlockerDays: number;
    redLagPoints: number;
    amberLagPoints: number;
    amberOpenBugs: number;
  };
  confluence: { baseUrl: string; spaceKey: string; parentPageId: string; latestPageId: string };
  llm: { enabled: boolean; approvalReference: string; model: string };
}

export interface SettingsResponse {
  settings: Settings;
  secrets: { jira: boolean; confluence: boolean; llm: boolean };
  warnings: string[];
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
}

export interface Warning {
  id: string;
  kind: 'pii' | 'config' | 'data' | 'llm';
  severity: 'info' | 'warn' | 'error';
  blocking: boolean;
  message: string;
  issueKey?: string;
  acknowledged: boolean;
}

export interface ReportItem {
  key: string;
  title: string;
  status: string;
  points: number | null;
}

export interface EpicGroup {
  epic: string;
  blurb: string;
  items: ReportItem[];
}

export interface BlockerItem {
  key: string;
  title: string;
  daysBlocked: number;
}

export interface BugRef {
  key: string;
  title: string;
  ageDays: number;
  priority: string;
}

export interface Metrics {
  velocity: { committedPoints: number; donePoints: number; percent: number; unestimatedCount: number };
  progress: { scopeDonePercent: number; timeElapsedPercent: number; lagPoints: number };
  statusCounts: { todo: number; inProgress: number; blocked: number; done: number };
  bugs: {
    openTotal: number;
    openByPriority: Record<string, number>;
    aging: { '0-7': number; '8-14': number; '15-30': number; '30+': number };
    oldest: BugRef[];
  };
  cycleTime: { meanDays: number | null; medianDays: number | null; sampleSize: number };
}

export interface ReportContent {
  header: {
    project: string;
    sprintName: string;
    sprintStart: string;
    sprintEnd: string;
    reportDate: string;
    windowStart: string;
    windowEnd: string;
  };
  rag: { computed: Rag; reasons: string[]; final: Rag; overrideReason: string | null };
  summary: string;
  completed: EpicGroup[];
  inProgress: EpicGroup[];
  next: EpicGroup[];
  blockers: BlockerItem[];
  risks: string[];
  manualRisks: string[];
  metrics: Metrics;
  footer: { generatedAt: string; excludedCount: number; redactionCount: number };
}

export interface PublishResult {
  target: 'dated' | 'latest';
  ok: boolean;
  pageId?: string;
  title?: string;
  url?: string;
  error?: string;
  at: string;
}

export interface ReportRecord {
  id: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  drafter: 'template' | 'llm';
  demo: boolean;
  content: ReportContent;
  warnings: Warning[];
  publishes: PublishResult[];
}

export interface ReportSummary {
  id: number;
  sprintName: string;
  reportDate: string;
  rag: Rag;
  status: 'draft' | 'published';
  demo: boolean;
  publishedUrls: string[];
}

export interface DemoScenario {
  id: string;
  label: string;
  description: string;
}

export interface GenerateRequest {
  scenario?: string; // demo mode only
}

// Blurb keys are `${section}:${epic}` where section is completed | inProgress | next.
export interface UpdateReportRequest {
  summary?: string;
  blurbs?: Record<string, string>;
  manualRisks?: string[];
  ragOverride?: { status: Rag; reason: string } | null;
  acknowledged?: string[]; // warning ids; replaces the acknowledged set
}

export interface RegenerateRequest {
  section: 'summary' | 'completed' | 'inProgress' | 'next';
}

export interface LlmPayloadResponse {
  enabled: boolean;
  gatedReason: string | null;
  payload: unknown;
}

export interface PublishResponse {
  ok: boolean;
  results: PublishResult[];
  report: ReportRecord;
}

export interface MockPage {
  id: string;
  title: string;
  kind: 'dated' | 'latest';
  version: number;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
