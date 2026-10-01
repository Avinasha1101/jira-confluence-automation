import { computeBlockers, computeMetrics, cycleTimeDays } from '../src/metrics/metrics';
import { computeRag } from '../src/metrics/rag';
import { buildReportContent } from '../src/report/build';
import { daysAgo, NOW, raw, redacted, settings, sprint } from './helpers';

const wf = settings().workflow;

const done = (key: string, pts: number | null, started: number, finished: number, extra = {}) =>
  raw({
    key,
    status: 'Done',
    statusCategory: 'done',
    storyPoints: pts,
    resolved: daysAgo(finished),
    statusHistory: [
      { status: 'In Dev', at: daysAgo(started) },
      { status: 'Done', at: daysAgo(finished) },
    ],
    ...extra,
  });

describe('metrics', () => {
  const issues = redacted([
    done('A-1', 5, 6, 2),
    done('A-2', 3, 4, 3),
    raw({ key: 'A-3', status: 'In Dev', statusCategory: 'inprogress', storyPoints: 8 }),
    raw({ key: 'A-4', storyPoints: null }),
    raw({
      key: 'A-5',
      status: 'Blocked',
      statusCategory: 'inprogress',
      storyPoints: 4,
      statusHistory: [{ status: 'Blocked', at: daysAgo(5) }],
    }),
    raw({ key: 'B-1', issueType: 'Bug', priority: 'High', created: daysAgo(40), storyPoints: 1 }),
    raw({ key: 'B-2', issueType: 'Bug', priority: 'Low', created: daysAgo(3), storyPoints: 1 }),
    raw({ key: 'B-3', issueType: 'Bug', priority: 'High', created: daysAgo(20), storyPoints: 1 }),
  ]);
  const m = computeMetrics(issues, sprint, wf, NOW);

  it('computes velocity and counts unestimated issues', () => {
    expect(m.velocity).toEqual({ committedPoints: 23, donePoints: 8, percent: 35, unestimatedCount: 1 });
  });

  it('computes progress against elapsed time', () => {
    expect(m.progress.timeElapsedPercent).toBe(71);
    expect(m.progress.scopeDonePercent).toBe(35);
    expect(m.progress.lagPoints).toBe(36);
  });

  it('counts statuses with blocked separate from in progress', () => {
    expect(m.statusCounts).toEqual({ todo: 4, inProgress: 1, blocked: 1, done: 2 });
  });

  it('counts open bugs by priority with aging buckets', () => {
    expect(m.bugs.openTotal).toBe(3);
    expect(m.bugs.openByPriority).toEqual({ High: 2, Low: 1 });
    expect(m.bugs.aging).toEqual({ '0-7': 1, '8-14': 0, '15-30': 1, '30+': 1 });
    expect(m.bugs.oldest[0]).toMatchObject({ key: 'B-1', ageDays: 40 });
  });

  it('computes mean and median cycle time from In Dev to Done', () => {
    // A-1: 4 days, A-2: 1 day
    expect(m.cycleTime).toEqual({ meanDays: 2.5, medianDays: 2.5, sampleSize: 2 });
  });

  it('skips issues that never entered the start status', () => {
    const skipped = redacted([done('A-9', 2, 0, 0, { statusHistory: [{ status: 'Done', at: daysAgo(1) }] })]);
    expect(cycleTimeDays(skipped[0], wf)).toBeNull();
  });

  it('falls back to issue counts when nothing is estimated', () => {
    const r = computeMetrics(redacted([raw({ key: 'A-1', storyPoints: null }), done('A-2', null, 2, 1)]), sprint, wf, NOW);
    expect(r.progress.scopeDonePercent).toBe(50);
    expect(r.velocity.percent).toBe(0);
  });

  it('handles an empty sprint', () => {
    const r = computeMetrics([], sprint, wf, NOW);
    expect(r.velocity.committedPoints).toBe(0);
    expect(r.cycleTime.meanDays).toBeNull();
  });
});

describe('blockers', () => {
  it('reports days blocked and none when empty', () => {
    const issues = redacted([
      raw({ key: 'A-1', status: 'Blocked', statusHistory: [{ status: 'Blocked', at: daysAgo(4) }] }),
      raw({ key: 'A-2' }),
    ]);
    expect(computeBlockers(issues, wf, NOW)).toEqual([{ key: 'A-1', title: 'A story', daysBlocked: 4 }]);
    expect(computeBlockers(redacted([raw({ key: 'A-2' })]), wf, NOW)).toEqual([]);
  });
});

describe('RAG', () => {
  const t = settings().rag;
  const base = computeMetrics([], sprint, wf, NOW);
  const withLag = (lagPoints: number) => ({ ...base, progress: { ...base.progress, lagPoints } });
  const blocker = (daysBlocked: number) => ({ key: 'A-1', title: 't', daysBlocked });
  const run = (over: Partial<Parameters<typeof computeRag>[0]> = {}) =>
    computeRag({ metrics: withLag(0), blockers: [], openCriticalBugs: 0, thresholds: t, ...over });

  it('is Green with nothing wrong', () => {
    expect(run().status).toBe('Green');
  });

  it('is Amber for any blocker up to the day threshold, Red above it', () => {
    expect(run({ blockers: [blocker(3)] }).status).toBe('Amber');
    expect(run({ blockers: [blocker(4)] }).status).toBe('Red');
  });

  it('uses lag boundaries: below 10 Green, 10-25 Amber, above 25 Red', () => {
    expect(run({ metrics: withLag(9) }).status).toBe('Green');
    expect(run({ metrics: withLag(10) }).status).toBe('Amber');
    expect(run({ metrics: withLag(25) }).status).toBe('Amber');
    expect(run({ metrics: withLag(26) }).status).toBe('Red');
  });

  it('is Red for an open critical bug', () => {
    expect(run({ openCriticalBugs: 1 }).status).toBe('Red');
  });

  it('is Amber when open bugs exceed the threshold', () => {
    const noLag = withLag(0);
    const m = { ...noLag, bugs: { ...noLag.bugs, openTotal: 6 } };
    expect(run({ metrics: m }).status).toBe('Amber');
    expect(run({ metrics: { ...noLag, bugs: { ...noLag.bugs, openTotal: 5 } } }).status).toBe('Green');
  });

  it('lists the reasons that triggered the status', () => {
    const r = run({ blockers: [blocker(5)], openCriticalBugs: 2 });
    expect(r.reasons.join(' ')).toMatch(/blocker/);
    expect(r.reasons.join(' ')).toMatch(/critical/);
  });
});

describe('report content', () => {
  it('groups by epic, windows completed work to 7 days, and names no individuals', () => {
    const issues = redacted([
      done('A-1', 5, 6, 2, { epicName: 'Origination' }),
      done('A-2', 3, 14, 12, { epicName: 'Origination' }),
      raw({ key: 'A-3', status: 'In Dev', statusCategory: 'inprogress', epicName: 'Servicing' }),
      raw({ key: 'A-4' }),
    ]);
    const c = buildReportContent({ issues, sprint, settings: settings(), now: NOW, excludedCount: 1, redactionCount: 0 });
    expect(c.completed).toHaveLength(1);
    expect(c.completed[0].items.map((i) => i.key)).toEqual(['A-1']);
    expect(c.inProgress[0].epic).toBe('Servicing');
    expect(c.next[0].epic).toBe('No epic');
    expect(c.footer.excludedCount).toBe(1);
    expect(JSON.stringify(c)).not.toMatch(/assignee/i);
  });
});
