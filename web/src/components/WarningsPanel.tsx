import type { Warning } from '../apiTypes';
import { Icon } from './Icon';

interface Props {
  warnings: Warning[];
  onToggle: (id: string, ack: boolean) => void;
}

const KIND_LABEL: Record<Warning['kind'], string> = {
  pii: 'PII redaction',
  config: 'Configuration',
  data: 'Data quality',
  llm: 'LLM',
};

export function blockingCount(warnings: Warning[]): number {
  return warnings.filter((w) => w.blocking && !w.acknowledged).length;
}

export function WarningsPanel({ warnings, onToggle }: Props) {
  const blocking = blockingCount(warnings);
  const sorted = [...warnings].sort((a, b) => {
    const rank = (w: Warning) => (w.blocking && !w.acknowledged ? 0 : w.acknowledged ? 2 : 1);
    return rank(a) - rank(b);
  });

  return (
    <section className="card side-card" aria-labelledby="warn-title">
      <div className="card-head">
        <h2 className="card-title" id="warn-title">
          Warnings
        </h2>
        <span className={`counter ${blocking > 0 ? 'counter-bad' : 'counter-ok'}`} aria-live="polite">
          {blocking > 0 ? `${blocking} blocking publish` : 'None blocking'}
        </span>
      </div>
      {warnings.length === 0 && <p className="muted">No warnings for this report.</p>}
      <ul className="warn-list">
        {sorted.map((w) => {
          const emphasised = w.blocking && !w.acknowledged;
          return (
            <li key={w.id} className={`warn sev-${w.severity}${emphasised ? ' emphasised' : ''}${w.acknowledged ? ' acked' : ''}`}>
              <span className="warn-icon" title={`Severity: ${w.severity}`}>
                <Icon name={w.severity === 'info' ? 'info' : 'alert'} size={18} />
              </span>
              <div className="warn-body">
                <div className="warn-tags">
                  <span className="chip">{KIND_LABEL[w.kind]}</span>
                  {w.blocking && <span className="chip chip-bad">Blocking</span>}
                  {w.issueKey && <code>{w.issueKey}</code>}
                </div>
                <div className="warn-msg">{w.message}</div>
                <label className="check-row small">
                  <input type="checkbox" checked={w.acknowledged} onChange={(e) => onToggle(w.id, e.target.checked)} />
                  <span>Acknowledge</span>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
