import { BlockerItem, Metrics, Settings } from '../domain/apiTypes';
import { RedactedIssue, SprintInfo } from '../domain/types';

const DAY_MS = 86_400_000;

type Workflow = Settings['workflow'];

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

export const round1 = (n: number): number => Math.round(n * 10) / 10;

export function isDone(issue: RedactedIssue, wf: Workflow): boolean {
  return issue.statusCategory === 'done' || wf.doneStatuses.some((s) => same(s, issue.status));
}

export function isBlocked(issue: RedactedIssue, wf: Workflow): boolean {
  return !isDone(issue, wf) && same(issue.status, wf.blockedStatus);
}

export function isBug(issue: RedactedIssue): boolean {
  return same(issue.issueType, 'bug');
}

export function ageInDays(fromIso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY_MS));
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sumPoints(issues: RedactedIssue[]): number {
  return issues.reduce((acc, i) => acc + (i.storyPoints ?? 0), 0);
}

export function computeBlockers(issues: RedactedIssue[], wf: Workflow, now: Date): BlockerItem[] {
  return issues
    .filter((i) => isBlocked(i, wf))
    .map((i) => {
      const entries = i.statusHistory.filter((h) => same(h.status, wf.blockedStatus));
      const since = entries.length ? entries[entries.length - 1].at : null;
      return { key: i.key, title: i.title, daysBlocked: since ? ageInDays(since, now) : 0 };
    })
    .sort((a, b) => b.daysBlocked - a.daysBlocked);
}

export function cycleTimeDays(issue: RedactedIssue, wf: Workflow): number | null {
  const startEntry = issue.statusHistory.find((h) => same(h.status, wf.cycleStartStatus));
  if (!startEntry) return null;
  const startMs = new Date(startEntry.at).getTime();
  const endEntries = issue.statusHistory.filter(
    (h) => same(h.status, wf.cycleEndStatus) && new Date(h.at).getTime() >= startMs,
  );
  const endIso = endEntries.length ? endEntries[endEntries.length - 1].at : issue.resolved;
  if (!endIso) return null;
  const days = (new Date(endIso).getTime() - startMs) / DAY_MS;
  return days >= 0 ? days : null;
}

export function computeMetrics(
  issues: RedactedIssue[],
  sprint: SprintInfo,
  wf: Workflow,
  now: Date,
): Metrics {
  const done = issues.filter((i) => isDone(i, wf));
  const committedPoints = sumPoints(issues);
  const donePoints = sumPoints(done);
  const unestimatedCount = issues.filter((i) => i.storyPoints === null).length;

  const percent = committedPoints > 0 ? Math.round((donePoints / committedPoints) * 100) : 0;
  const scopeDonePercent =
    committedPoints > 0
      ? percent
      : issues.length > 0
        ? Math.round((done.length / issues.length) * 100)
        : 0;

  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  const elapsed = end > start ? ((now.getTime() - start) / (end - start)) * 100 : 0;
  const timeElapsedPercent = Math.round(Math.min(100, Math.max(0, elapsed)));

  const blocked = issues.filter((i) => isBlocked(i, wf));
  const statusCounts = {
    todo: issues.filter((i) => !isDone(i, wf) && !isBlocked(i, wf) && i.statusCategory === 'todo').length,
    inProgress: issues.filter(
      (i) => !isDone(i, wf) && !isBlocked(i, wf) && i.statusCategory === 'inprogress',
    ).length,
    blocked: blocked.length,
    done: done.length,
  };

  const openBugs = issues.filter((i) => isBug(i) && !isDone(i, wf));
  const openByPriority: Record<string, number> = {};
  const aging = { '0-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
  for (const bug of openBugs) {
    const p = bug.priority ?? 'Unprioritized';
    openByPriority[p] = (openByPriority[p] ?? 0) + 1;
    const age = ageInDays(bug.created, now);
    if (age <= 7) aging['0-7']++;
    else if (age <= 14) aging['8-14']++;
    else if (age <= 30) aging['15-30']++;
    else aging['30+']++;
  }
  const oldest = openBugs
    .map((b) => ({
      key: b.key,
      title: b.title,
      ageDays: ageInDays(b.created, now),
      priority: b.priority ?? 'Unprioritized',
    }))
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 5);

  const cycles = done
    .filter((i) => i.resolved && new Date(i.resolved).getTime() >= start)
    .map((i) => cycleTimeDays(i, wf))
    .filter((d): d is number => d !== null);

  return {
    velocity: { committedPoints, donePoints, percent, unestimatedCount },
    progress: {
      scopeDonePercent,
      timeElapsedPercent,
      lagPoints: timeElapsedPercent - scopeDonePercent,
    },
    statusCounts,
    bugs: { openTotal: openBugs.length, openByPriority, aging, oldest },
    cycleTime: {
      meanDays: cycles.length ? round1(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null,
      medianDays: cycles.length ? round1(median(cycles)) : null,
      sampleSize: cycles.length,
    },
  };
}
