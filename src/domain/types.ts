export type StatusCategory = 'todo' | 'inprogress' | 'done';

export interface StatusChange {
  status: string;
  at: string;
}

// Raw Jira data. Descriptions, comments and assignees are deliberately never fetched.
export interface RawIssue {
  key: string;
  summary: string;
  issueType: string;
  status: string;
  statusCategory: StatusCategory;
  storyPoints: number | null;
  priority: string | null;
  epicKey: string | null;
  epicName: string | null;
  labels: string[];
  components: string[];
  securityLevel: string | null;
  created: string;
  resolved: string | null;
  statusHistory: StatusChange[];
}

export interface SprintInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface SprintData {
  sprint: SprintInfo;
  issues: RawIssue[];
}

declare const redactedBrand: unique symbol;

// Only produced by redactIssues(). Everything downstream of redaction takes this type,
// so raw issues cannot reach metrics, drafting, or rendering.
export interface RedactedIssue {
  readonly [redactedBrand]: true;
  key: string;
  title: string;
  issueType: string;
  status: string;
  statusCategory: StatusCategory;
  storyPoints: number | null;
  priority: string | null;
  epicKey: string | null;
  epicName: string | null;
  created: string;
  resolved: string | null;
  statusHistory: StatusChange[];
}

export interface JiraSource {
  getActiveSprint(): Promise<SprintData | null>;
}

export class NoActiveSprintError extends Error {
  constructor() {
    super('No active sprint was found on the configured board. Start a sprint in Jira, then try again.');
    this.name = 'NoActiveSprintError';
  }
}

export class UserFacingError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'UserFacingError';
  }
}
