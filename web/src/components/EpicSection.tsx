import type { EpicGroup } from '../apiTypes';
import { EmptyState, Spinner } from './ui';
import { Icon } from './Icon';

export type SectionKey = 'completed' | 'inProgress' | 'next';

interface Props {
  id: SectionKey;
  title: string;
  groups: EpicGroup[];
  blurbValue: (key: string, saved: string) => string;
  onBlurb: (key: string, value: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  disabled: boolean;
  emptyText: string;
}

export function EpicSection({ id, title, groups, blurbValue, onBlurb, onRegenerate, regenerating, disabled, emptyText }: Props) {
  return (
    <section className="card" aria-labelledby={`sec-${id}`}>
      <div className="card-head">
        <h2 className="card-title" id={`sec-${id}`}>
          {title}
        </h2>
        <button type="button" className="btn btn-sm" onClick={onRegenerate} disabled={disabled || regenerating}>
          {regenerating ? <Spinner label="Regenerating" /> : (
            <>
              <Icon name="refresh" size={14} /> Regenerate
            </>
          )}
        </button>
      </div>
      {groups.length === 0 && <EmptyState title={emptyText} />}
      {groups.map((g) => {
        const key = `${id}:${g.epic}`;
        return (
          <div className="epic" key={key}>
            <h3 className="epic-name">{g.epic}</h3>
            <label className="sr-only" htmlFor={`blurb-${key}`}>
              Blurb for {g.epic}
            </label>
            <textarea
              id={`blurb-${key}`}
              className="blurb"
              rows={3}
              value={blurbValue(key, g.blurb)}
              onChange={(e) => onBlurb(key, e.target.value)}
            />
            <table className="table compact">
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Title</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="right">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((it) => (
                  <tr key={it.key}>
                    <td>
                      <code>{it.key}</code>
                    </td>
                    <td>{it.title}</td>
                    <td>
                      <span className="chip">{it.status}</span>
                    </td>
                    <td className="right">{it.points ?? <span className="muted">n/a</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}
