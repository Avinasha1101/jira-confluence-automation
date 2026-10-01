import { useState } from 'react';
import type { Rag, ReportContent } from '../apiTypes';
import { RagPill, Spinner } from './ui';

interface Props {
  rag: ReportContent['rag'];
  busy: boolean;
  onSave: (status: Rag, reason: string) => void;
  onClear: () => void;
}

export function RagControl({ rag, busy, onSave, onClear }: Props) {
  const overridden = rag.overrideReason !== null || rag.final !== rag.computed;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Rag>(rag.final);
  const [reason, setReason] = useState(rag.overrideReason ?? '');

  return (
    <div className="rag-block">
      <div className="rag-head">
        <div>
          <div className="eyebrow">Overall status</div>
          <div className="rag-line">
            <RagPill rag={rag.final} large />
            {overridden && <span className="chip chip-warn">Overridden (computed: {rag.computed})</span>}
          </div>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Close' : 'Override RAG'}
        </button>
      </div>

      <div className="eyebrow">Why {rag.computed} (computed)</div>
      {rag.reasons.length === 0 ? (
        <p className="muted">No rules triggered.</p>
      ) : (
        <ul className="reasons">
          {rag.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {overridden && rag.overrideReason && (
        <div className="override-note">
          <strong>Override reason:</strong> {rag.overrideReason}
        </div>
      )}

      {open && (
        <form
          className="override-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(status, reason.trim());
            setOpen(false);
          }}
        >
          <div className="grid-2 tight">
            <div className="field">
              <label htmlFor="rag-status">Status</label>
              <select id="rag-status" value={status} onChange={(e) => setStatus(e.target.value as Rag)}>
                <option>Green</option>
                <option>Amber</option>
                <option>Red</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="rag-reason">Reason (required)</label>
              <textarea
                id="rag-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why the computed status does not reflect reality"
              />
            </div>
          </div>
          <div className="actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || reason.trim() === ''}>
              {busy ? <Spinner label="Saving" /> : 'Save override'}
            </button>
            {overridden && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={() => {
                  onClear();
                  setOpen(false);
                  setReason('');
                  setStatus(rag.computed);
                }}
              >
                Clear override
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
