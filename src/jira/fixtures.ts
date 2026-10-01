import { DemoScenario } from '../domain/apiTypes';
import {
  JiraSource,
  RawIssue,
  SprintData,
  StatusCategory,
  StatusChange,
} from '../domain/types';

const DAY = 86_400_000;

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'healthy',
    label: 'Healthy sprint',
    description:
      'On track, no blockers. Two issues carry the label "internal-only" so you can try the exclusion rule in Settings.',
  },
  {
    id: 'at-risk',
    label: 'At risk: blocked work',
    description: 'A credit-bureau dependency has blocked work for 5 days and progress is behind schedule.',
  },
  {
    id: 'pii-leak',
    label: 'Sensitive data in titles',
    description:
      'Ticket titles contain fake borrower details (SSN, card, email, phone, VIN). They are masked and publishing is blocked until each is acknowledged.',
  },
  {
    id: 'no-sprint',
    label: 'No active sprint',
    description: 'The board has no active sprint, which shows the friendly error path.',
  },
];

interface Spec {
  key: string;
  title: string;
  type?: string;
  status: string;
  cat: StatusCategory;
  points: number | null;
  priority?: string;
  epic: string | null;
  createdAgo: number;
  startedAgo?: number;
  doneAgo?: number;
  blockedAgo?: number;
  labels?: string[];
}

const EPICS: Record<string, [string, string]> = {
  ORI: ['AFP-10', 'Loan Origination Portal'],
  CRD: ['AFP-20', 'Credit Decisioning'],
  SRV: ['AFP-30', 'Servicing and Payments'],
};

function build(now: Date, specs: Spec[]): RawIssue[] {
  const at = (daysAgo: number): string => new Date(now.getTime() - daysAgo * DAY).toISOString();
  return specs.map((s) => {
    const history: StatusChange[] = [{ status: 'Ready for Dev', at: at(s.createdAgo - 1 < 0 ? 0 : s.createdAgo - 1) }];
    if (s.startedAgo !== undefined) history.push({ status: 'In Dev', at: at(s.startedAgo) });
    if (s.blockedAgo !== undefined) history.push({ status: 'Blocked', at: at(s.blockedAgo) });
    if (s.doneAgo !== undefined) history.push({ status: 'Done', at: at(s.doneAgo) });
    const epic = s.epic ? EPICS[s.epic] : null;
    return {
      key: s.key,
      summary: s.title,
      issueType: s.type ?? 'Story',
      status: s.status,
      statusCategory: s.cat,
      storyPoints: s.points,
      priority: s.priority ?? 'Medium',
      epicKey: epic?.[0] ?? null,
      epicName: epic?.[1] ?? null,
      labels: s.labels ?? [],
      components: [],
      securityLevel: null,
      created: at(s.createdAgo),
      resolved: s.doneAgo !== undefined ? at(s.doneAgo) : null,
      statusHistory: history,
    };
  });
}

function baseSpecs(): Spec[] {
  return [
    { key: 'AFP-101', title: 'Loan application intake form validation', status: 'Done', cat: 'done', points: 5, epic: 'ORI', createdAgo: 12, startedAgo: 8, doneAgo: 3 },
    { key: 'AFP-102', title: 'Dealer portal e-signature for retail contracts', status: 'Done', cat: 'done', points: 8, epic: 'ORI', createdAgo: 12, startedAgo: 8, doneAgo: 2 },
    { key: 'AFP-103', title: 'Co-borrower invitation workflow', status: 'Done', cat: 'done', points: 5, epic: 'ORI', createdAgo: 12, startedAgo: 6, doneAgo: 1 },
    { key: 'AFP-104', title: 'Save and resume partially completed applications', status: 'Ready for Dev', cat: 'todo', points: 3, epic: 'ORI', createdAgo: 10 },
    { key: 'AFP-201', title: 'Credit bureau response caching', status: 'Done', cat: 'done', points: 5, epic: 'CRD', createdAgo: 12, startedAgo: 7, doneAgo: 4 },
    { key: 'AFP-202', title: 'Decision rules engine: debt-to-income thresholds', status: 'Done', cat: 'done', points: 8, epic: 'CRD', createdAgo: 12, startedAgo: 7, doneAgo: 2 },
    { key: 'AFP-203', title: 'Adverse action notice generation', status: 'Ready for Dev', cat: 'todo', points: 5, epic: 'CRD', createdAgo: 9 },
    { key: 'AFP-204', title: 'Manual underwriter review queue', status: 'In Dev', cat: 'inprogress', points: 3, epic: 'CRD', createdAgo: 9, startedAgo: 2 },
    { key: 'AFP-301', title: 'Payoff quote calculation for early settlement', status: 'Done', cat: 'done', points: 5, epic: 'SRV', createdAgo: 12, startedAgo: 9, doneAgo: 5 },
    { key: 'AFP-302', title: 'Autopay enrollment confirmation emails', status: 'In Dev', cat: 'inprogress', points: 3, epic: 'SRV', createdAgo: 11, startedAgo: 2 },
    { key: 'AFP-303', title: 'Lease-end notification schedule', status: 'Ready for Dev', cat: 'todo', points: 5, epic: 'SRV', createdAgo: 8 },
    { key: 'AFP-304', title: 'Late fee waiver approval screen', status: 'Ready for Dev', cat: 'todo', points: 2, epic: 'SRV', createdAgo: 6 },
    { key: 'AFP-401', title: 'Payment grid misaligned on mobile Safari', type: 'Bug', status: 'In Dev', cat: 'inprogress', points: 1, priority: 'Low', epic: 'SRV', createdAgo: 6, startedAgo: 1 },
    { key: 'AFP-402', title: 'Duplicate email sent on application resubmit', type: 'Bug', status: 'Ready for Dev', cat: 'todo', points: 2, priority: 'High', epic: 'ORI', createdAgo: 20 },
    { key: 'AFP-403', title: 'Rounding error in APR display', type: 'Bug', status: 'Done', cat: 'done', points: 2, priority: 'High', epic: 'CRD', createdAgo: 14, startedAgo: 6, doneAgo: 1 },
    { key: 'AFP-501', title: 'Update runbook for nightly batch job', type: 'Task', status: 'Done', cat: 'done', points: 1, epic: null, createdAgo: 9, startedAgo: 5, doneAgo: 2 },
    { key: 'AFP-901', title: 'Spike: vendor sandbox access', type: 'Task', status: 'In Dev', cat: 'inprogress', points: null, epic: null, createdAgo: 5, startedAgo: 3, labels: ['internal-only'] },
    { key: 'AFP-902', title: 'Rotate service credentials in test environment', type: 'Task', status: 'Done', cat: 'done', points: 1, epic: null, createdAgo: 8, startedAgo: 4, doneAgo: 3, labels: ['internal-only'] },
  ];
}

function scenarioSpecs(id: string): Spec[] {
  const specs = baseSpecs();
  const find = (key: string): Spec => specs.find((s) => s.key === key) as Spec;
  if (id === 'at-risk') {
    for (const key of ['AFP-102', 'AFP-103', 'AFP-201', 'AFP-301', 'AFP-403', 'AFP-501', 'AFP-202']) {
      Object.assign(find(key), { status: 'In Dev', cat: 'inprogress' as const, doneAgo: undefined });
    }
    Object.assign(find('AFP-202'), { status: 'Blocked', cat: 'inprogress' as const, blockedAgo: 5 });
    Object.assign(find('AFP-103'), { status: 'Blocked', cat: 'inprogress' as const, blockedAgo: 4 });
    Object.assign(find('AFP-203'), { title: 'Adverse action notice generation (waiting on credit bureau API)', status: 'Blocked', cat: 'inprogress' as const, startedAgo: 4, blockedAgo: 2 });
    specs.push({ key: 'AFP-404', title: 'Intermittent 500 on contract download', type: 'Bug', status: 'Ready for Dev', cat: 'todo', points: 3, priority: 'Critical', epic: 'ORI', createdAgo: 2 });
  }
  if (id === 'pii-leak') {
    find('AFP-402').title = 'Duplicate email to jane.doe@example.com on resubmit';
    find('AFP-302').title = 'Autopay email failing for customer, call 555-867-5309';
    find('AFP-104').title = 'Resume fails for applicant SSN 123-45-6789';
    find('AFP-303').title = 'Lease 4111 1111 1111 1111 shows wrong end date';
    find('AFP-401').title = 'Payment grid broken for VIN 1HGCM82633A004352';
    find('AFP-304').title = 'Waiver screen error at 1428 Elm Street';
  }
  return specs;
}

export class FixtureJiraClient implements JiraSource {
  constructor(
    private readonly scenario: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getActiveSprint(): Promise<SprintData | null> {
    if (this.scenario === 'no-sprint') return null;
    const now = this.now();
    const start = new Date(now.getTime() - 9 * DAY);
    const end = new Date(now.getTime() + 5 * DAY);
    return {
      sprint: { id: 42, name: 'Sprint 24', startDate: start.toISOString(), endDate: end.toISOString() },
      issues: build(now, scenarioSpecs(this.scenario)),
    };
  }
}
