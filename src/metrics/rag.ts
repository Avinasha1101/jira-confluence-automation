import { BlockerItem, Metrics, Rag, Settings } from '../domain/apiTypes';

const CRITICAL_PRIORITIES = ['critical', 'highest', 'blocker', 'p0'];

export interface RagInput {
  metrics: Metrics;
  blockers: BlockerItem[];
  openCriticalBugs: number;
  thresholds: Settings['rag'];
}

export function computeRag(input: RagInput): { status: Rag; reasons: string[] } {
  const { metrics, blockers, openCriticalBugs, thresholds: t } = input;
  const red: string[] = [];
  const amber: string[] = [];
  const lag = metrics.progress.lagPoints;

  const longBlocked = blockers.filter((b) => b.daysBlocked > t.redBlockerDays);
  if (longBlocked.length) {
    red.push(
      `${longBlocked.length} blocker(s) open for more than ${t.redBlockerDays} days (${longBlocked
        .map((b) => b.key)
        .join(', ')})`,
    );
  }
  if (lag > t.redLagPoints) {
    red.push(`Progress lags time elapsed by ${lag} points (red above ${t.redLagPoints})`);
  }
  if (openCriticalBugs > 0) {
    red.push(`${openCriticalBugs} open critical bug(s)`);
  }

  if (blockers.length) {
    amber.push(`${blockers.length} issue(s) currently blocked`);
  }
  if (lag >= t.amberLagPoints && lag <= t.redLagPoints) {
    amber.push(`Progress lags time elapsed by ${lag} points (amber from ${t.amberLagPoints})`);
  }
  if (metrics.bugs.openTotal > t.amberOpenBugs) {
    amber.push(`${metrics.bugs.openTotal} open bugs (amber above ${t.amberOpenBugs})`);
  }

  if (red.length) return { status: 'Red', reasons: [...red, ...amber] };
  if (amber.length) return { status: 'Amber', reasons: amber };
  return { status: 'Green', reasons: ['No blockers, no critical bugs, and progress is in line with time elapsed'] };
}

export const isCriticalPriority = (priority: string | null): boolean =>
  priority !== null && CRITICAL_PRIORITIES.includes(priority.trim().toLowerCase());
