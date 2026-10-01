import { useState } from 'react';
import { api } from '../api';
import type { LlmPayloadResponse } from '../apiTypes';
import { errMsg } from '../format';
import { Banner, Spinner } from './ui';
import { Icon } from './Icon';

export function LlmPayload({ reportId, drafter }: { reportId: number; drafter: 'template' | 'llm' }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LlmPayloadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      setError(null);
      try {
        setData(await api.llmPayload(reportId));
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <section className="card side-card">
      <div className="card-head">
        <h2 className="card-title">Drafting</h2>
        <span className={`chip ${drafter === 'llm' ? 'chip-accent' : ''}`}>{drafter === 'llm' ? 'LLM drafter' : 'Template drafter'}</span>
      </div>
      <p className="muted small">
        {drafter === 'llm'
          ? 'Summary and blurbs were drafted by an LLM from the redacted payload below.'
          : 'Summary and blurbs were drafted from fixed templates. No data left your network.'}
      </p>
      <button type="button" className="disclosure" onClick={() => void toggle()} aria-expanded={open}>
        <span className={`chev${open ? ' open' : ''}`}>
          <Icon name="chevron" size={14} />
        </span>
        View LLM payload
      </button>
      {open && (
        <div className="disclosure-body">
          {loading && <Spinner label="Loading payload" />}
          {error && <Banner kind="error">{error}</Banner>}
          {data && (
            <>
              <p className="muted small">
                This is exactly what would be sent to the model. Ticket descriptions, comments and assignees are never sent.
              </p>
              {data.gatedReason && (
                <Banner kind="info" title={data.enabled ? 'Note' : 'LLM drafting is off'}>
                  {data.gatedReason}
                </Banner>
              )}
              <pre className="json">{JSON.stringify(data.payload, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </section>
  );
}
