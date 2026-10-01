import type { Metrics } from '../apiTypes';
import { fmtNum } from '../format';

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{fmtNum(value, 0)}%</strong>
      </div>
      <div className="bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const AGING_KEYS = ['0-7', '8-14', '15-30', '30+'] as const;
const AGING_TONE: Record<(typeof AGING_KEYS)[number], string> = {
  '0-7': 'tone-green',
  '8-14': 'tone-amber',
  '15-30': 'tone-orange',
  '30+': 'tone-red',
};

export function MetricsPanel({ metrics }: { metrics: Metrics }) {
  const { velocity, progress, statusCounts, bugs, cycleTime } = metrics;
  const agingMax = Math.max(1, ...AGING_KEYS.map((k) => bugs.aging[k]));
  const lagTone = progress.lagPoints > 0 ? 'bad' : 'good';

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <h4>Velocity</h4>
        <div className="metric-big">
          {fmtNum(velocity.donePoints)} <span className="metric-of">of {fmtNum(velocity.committedPoints)} points</span>
        </div>
        <div className="metric-sub">{fmtNum(velocity.percent, 0)}% of committed points done</div>
        {velocity.unestimatedCount > 0 && (
          <div className="metric-note">
            {velocity.unestimatedCount} item{velocity.unestimatedCount === 1 ? '' : 's'} unestimated and not counted in points
          </div>
        )}
      </div>

      <div className="metric-card">
        <h4>Progress vs time</h4>
        <Bar label="Scope done" value={progress.scopeDonePercent} tone="tone-blue" />
        <Bar label="Time elapsed" value={progress.timeElapsedPercent} tone="tone-grey" />
        <div className={`metric-sub lag-${lagTone}`}>
          {progress.lagPoints > 0
            ? `Behind by ${fmtNum(progress.lagPoints)} points`
            : progress.lagPoints < 0
              ? `Ahead by ${fmtNum(Math.abs(progress.lagPoints))} points`
              : 'On pace'}
        </div>
      </div>

      <div className="metric-card">
        <h4>Status counts</h4>
        <div className="stacked" role="img" aria-label="Issue status distribution">
          <span className="seg tone-grey" style={{ flexGrow: statusCounts.todo }} />
          <span className="seg tone-blue" style={{ flexGrow: statusCounts.inProgress }} />
          <span className="seg tone-red" style={{ flexGrow: statusCounts.blocked }} />
          <span className="seg tone-green" style={{ flexGrow: statusCounts.done }} />
        </div>
        <ul className="legend">
          <li>
            <i className="dot tone-grey" />To do <strong>{statusCounts.todo}</strong>
          </li>
          <li>
            <i className="dot tone-blue" />In progress <strong>{statusCounts.inProgress}</strong>
          </li>
          <li>
            <i className="dot tone-red" />Blocked <strong>{statusCounts.blocked}</strong>
          </li>
          <li>
            <i className="dot tone-green" />Done <strong>{statusCounts.done}</strong>
          </li>
        </ul>
      </div>

      <div className="metric-card">
        <h4>Cycle time</h4>
        <div className="metric-big">
          {fmtNum(cycleTime.meanDays)} <span className="metric-of">days mean</span>
        </div>
        <div className="metric-sub">
          Median {fmtNum(cycleTime.medianDays)} days, sample of {cycleTime.sampleSize}
        </div>
        {cycleTime.sampleSize < 5 && <div className="metric-note">Small sample size; treat as indicative only</div>}
      </div>

      <div className="metric-card wide">
        <h4>Open bugs</h4>
        <div className="bugs-layout">
          <div>
            <div className="metric-big">{bugs.openTotal}</div>
            <ul className="legend vertical">
              {Object.entries(bugs.openByPriority).map(([p, n]) => (
                <li key={p}>
                  {p} <strong>{n}</strong>
                </li>
              ))}
              {Object.keys(bugs.openByPriority).length === 0 && <li className="muted">No open bugs</li>}
            </ul>
          </div>
          <div>
            <div className="chart-caption">Age of open bugs (days)</div>
            <div className="vbars" role="img" aria-label="Bug aging buckets">
              {AGING_KEYS.map((k) => (
                <div key={k} className="vbar">
                  <span className="vbar-val">{bugs.aging[k]}</span>
                  <div className="vbar-track">
                    <div className={`vbar-fill ${AGING_TONE[k]}`} style={{ height: `${(bugs.aging[k] / agingMax) * 100}%` }} />
                  </div>
                  <span className="vbar-label">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {bugs.oldest.length > 0 && (
          <div className="oldest">
            <div className="chart-caption">Oldest open bugs</div>
            <ul className="plain-list">
              {bugs.oldest.map((b) => (
                <li key={b.key}>
                  <code>{b.key}</code> {b.title} <span className="muted">({b.priority}, {b.ageDays}d)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
