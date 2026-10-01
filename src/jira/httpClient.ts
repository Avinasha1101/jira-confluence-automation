import { Settings } from '../domain/apiTypes';
import {
  JiraSource,
  RawIssue,
  SprintData,
  StatusCategory,
  StatusChange,
} from '../domain/types';
import { basicAuth, requestJson, RequestOptions } from '../util/http';

interface JiraField {
  id: string;
  name: string;
}

interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    issuetype?: { name: string };
    status?: { name: string; statusCategory?: { key: string } };
    priority?: { name: string } | null;
    labels?: string[];
    components?: { name: string }[];
    security?: { name: string } | null;
    created?: string;
    resolutiondate?: string | null;
    parent?: { key: string; fields?: { summary?: string; issuetype?: { name: string } } } | null;
    [custom: string]: unknown;
  };
  changelog?: {
    histories?: { created: string; items: { field: string; toString?: string }[] }[];
  };
}

const CATEGORY: Record<string, StatusCategory> = { new: 'todo', indeterminate: 'inprogress', done: 'done' };

export function mapIssue(issue: JiraIssue, storyPointsField: string | null): RawIssue {
  const f = issue.fields;
  const history: StatusChange[] = [];
  for (const h of issue.changelog?.histories ?? []) {
    for (const item of h.items) {
      if (item.field === 'status' && item.toString) history.push({ status: item.toString, at: h.created });
    }
  }
  history.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const sp = storyPointsField ? f[storyPointsField] : null;
  const parent = f.parent;
  const epic = parent && parent.fields?.issuetype?.name?.toLowerCase() === 'epic' ? parent : null;

  return {
    key: issue.key,
    summary: f.summary ?? '',
    issueType: f.issuetype?.name ?? 'Task',
    status: f.status?.name ?? 'Unknown',
    statusCategory: CATEGORY[f.status?.statusCategory?.key ?? 'new'] ?? 'todo',
    storyPoints: typeof sp === 'number' ? sp : null,
    priority: f.priority?.name ?? null,
    epicKey: epic?.key ?? null,
    epicName: epic?.fields?.summary ?? null,
    labels: f.labels ?? [],
    components: (f.components ?? []).map((c) => c.name),
    securityLevel: f.security?.name ?? null,
    created: f.created ?? new Date().toISOString(),
    resolved: f.resolutiondate ?? null,
    statusHistory: history,
  };
}

export class HttpJiraClient implements JiraSource {
  private readonly base: string;
  private readonly auth: string;
  private storyPointsField: string | null | undefined;

  constructor(
    private readonly settings: Settings,
    token: string,
    private readonly opts: RequestOptions = {},
  ) {
    this.base = settings.jira.baseUrl.replace(/\/+$/, '');
    this.auth = basicAuth(settings.jira.email, token);
  }

  private get<T>(path: string): Promise<T> {
    return requestJson<T>(
      'Jira',
      `${this.base}${path}`,
      { headers: { Authorization: this.auth, Accept: 'application/json' } },
      this.opts,
    );
  }

  async testConnection(): Promise<string> {
    const me = await this.get<{ displayName?: string }>('/rest/api/3/myself');
    return `Connected to Jira as ${me.displayName ?? 'authenticated user'}.`;
  }

  private async resolveStoryPointsField(): Promise<string | null> {
    if (this.storyPointsField !== undefined) return this.storyPointsField;
    const fields = await this.get<JiraField[]>('/rest/api/3/field');
    const match = fields.find((f) => /^story point(s| estimate)?$/i.test(f.name));
    this.storyPointsField = match?.id ?? null;
    return this.storyPointsField;
  }

  async validateWorkflow(): Promise<string[]> {
    const wf = this.settings.workflow;
    const cfg = await this.get<{ columnConfig: { columns: { statuses: { id: string }[] }[] } }>(
      `/rest/agile/1.0/board/${this.settings.jira.boardId}/configuration`,
    );
    const statuses = await this.get<{ id: string; name: string }[]>('/rest/api/3/status');
    const onBoard = new Set(
      cfg.columnConfig.columns
        .flatMap((c) => c.statuses.map((s) => s.id))
        .map((id) => statuses.find((s) => s.id === id)?.name.toLowerCase())
        .filter((n): n is string => !!n),
    );
    const wanted = [wf.readyStatus, wf.cycleStartStatus, wf.blockedStatus, ...wf.doneStatuses];
    return wanted.filter((n) => !onBoard.has(n.toLowerCase())).map(
      (n) => `Status "${n}" is configured but was not found on board ${this.settings.jira.boardId}.`,
    );
  }

  async getActiveSprint(): Promise<SprintData | null> {
    const sprints = await this.get<{
      values: { id: number; name: string; startDate?: string; endDate?: string }[];
    }>(`/rest/agile/1.0/board/${this.settings.jira.boardId}/sprint?state=active`);
    const active = sprints.values[0];
    if (!active || !active.startDate || !active.endDate) return null;

    const spField = await this.resolveStoryPointsField();
    const issues: RawIssue[] = [];
    let startAt = 0;
    for (;;) {
      const page = await this.get<{ issues: JiraIssue[]; total: number }>(
        `/rest/agile/1.0/sprint/${active.id}/issue?startAt=${startAt}&maxResults=100&expand=changelog&fields=summary,issuetype,status,priority,labels,components,security,created,resolutiondate,parent${
          spField ? `,${spField}` : ''
        }`,
      );
      issues.push(...page.issues.map((i) => mapIssue(i, spField)));
      startAt += page.issues.length;
      if (!page.issues.length || startAt >= page.total) break;
    }
    return {
      sprint: { id: active.id, name: active.name, startDate: active.startDate, endDate: active.endDate },
      issues,
    };
  }
}
