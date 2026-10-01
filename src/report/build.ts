import { EpicGroup, ReportContent, ReportItem, Settings } from '../domain/apiTypes';
import { RedactedIssue, SprintInfo } from '../domain/types';
import { computeBlockers, computeMetrics, isBlocked, isBug, isDone } from '../metrics/metrics';
import { computeRag, isCriticalPriority } from '../metrics/rag';

const DAY_MS = 86_400_000;
export const NO_EPIC = 'No epic';

export const toItem = (i: RedactedIssue): ReportItem => ({
  key: i.key,
  title: i.title,
  status: i.status,
  points: i.storyPoints,
});

export function groupByEpic(issues: RedactedIssue[]): EpicGroup[] {
  const groups = new Map<string, ReportItem[]>();
  for (const issue of issues) {
    const name = issue.epicName ?? NO_EPIC;
    groups.set(name, [...(groups.get(name) ?? []), toItem(issue)]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === NO_EPIC ? 1 : b === NO_EPIC ? -1 : a.localeCompare(b)))
    .map(([epic, items]) => ({ epic, blurb: '', items }));
}

export interface BuildInput {
  issues: RedactedIssue[];
  sprint: SprintInfo;
  settings: Settings;
  now: Date;
  excludedCount: number;
  redactionCount: number;
}

export function buildReportContent(input: BuildInput): ReportContent {
  const { issues, sprint, settings, now } = input;
  const wf = settings.workflow;
  const windowStart = new Date(now.getTime() - 7 * DAY_MS);

  const metrics = computeMetrics(issues, sprint, wf, now);
  const blockers = computeBlockers(issues, wf, now);
  const criticalBugs = issues.filter(
    (i) => isBug(i) && !isDone(i, wf) && isCriticalPriority(i.priority),
  );
  const rag = computeRag({
    metrics,
    blockers,
    openCriticalBugs: criticalBugs.length,
    thresholds: settings.rag,
  });

  const completed = issues.filter(
    (i) => isDone(i, wf) && i.resolved && new Date(i.resolved).getTime() >= windowStart.getTime(),
  );
  const open = issues.filter((i) => !isDone(i, wf));
  const inProgress = open.filter((i) => i.statusCategory === 'inprogress' || isBlocked(i, wf));
  const next = open.filter((i) => i.statusCategory === 'todo' && !isBlocked(i, wf));

  const risks: string[] = [
    ...blockers.map((b) => `${b.key} has been blocked for ${b.daysBlocked} day(s): ${b.title}`),
    ...criticalBugs.map((b) => `Open critical bug ${b.key}: ${b.title}`),
  ];
  if (metrics.progress.lagPoints >= settings.rag.amberLagPoints) {
    risks.push(
      `Sprint progress (${metrics.progress.scopeDonePercent}%) is behind time elapsed (${metrics.progress.timeElapsedPercent}%)`,
    );
  }
  if (metrics.bugs.aging['30+'] > 0) {
    risks.push(`${metrics.bugs.aging['30+']} open bug(s) older than 30 days`);
  }

  return {
    header: {
      project: settings.project.name,
      sprintName: sprint.name,
      sprintStart: sprint.startDate,
      sprintEnd: sprint.endDate,
      reportDate: now.toISOString().slice(0, 10),
      windowStart: windowStart.toISOString().slice(0, 10),
      windowEnd: now.toISOString().slice(0, 10),
    },
    rag: { computed: rag.status, reasons: rag.reasons, final: rag.status, overrideReason: null },
    summary: '',
    completed: groupByEpic(completed),
    inProgress: groupByEpic(inProgress),
    next: groupByEpic(next),
    blockers,
    risks,
    manualRisks: [],
    metrics,
    footer: {
      generatedAt: now.toISOString(),
      excludedCount: input.excludedCount,
      redactionCount: input.redactionCount,
    },
  };
}
