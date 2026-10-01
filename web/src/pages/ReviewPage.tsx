import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Rag, ReportRecord, UpdateReportRequest, Warning } from '../apiTypes';
import { errMsg, fmtDate, fmtDateTime } from '../format';
import { Banner, PageSkeleton, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { RagControl } from '../components/RagControl';
import { EpicSection, type SectionKey } from '../components/EpicSection';
import { MetricsPanel } from '../components/MetricsPanel';
import { WarningsPanel, blockingCount } from '../components/WarningsPanel';
import { PublishPanel } from '../components/PublishPanel';
import { LlmPayload } from '../components/LlmPayload';
import { PreviewModal } from '../components/PreviewModal';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const SAVE_DELAY_MS = 800;
const isBlank = (s: string) => s.trim() === '';

export default function ReviewPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const toast = useToast();

  const [record, setRecord] = useState<ReportRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraftState] = useState<UpdateReportRequest>({});
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [regen, setRegen] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const draftRef = useRef<UpdateReportRequest>({});
  const timer = useRef<number | undefined>(undefined);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const idRef = useRef(id);
  idRef.current = id;

  const commitDraft = useCallback((d: UpdateReportRequest) => {
    draftRef.current = d;
    setDraftState(d);
  }, []);

  useEffect(() => {
    setRecord(null);
    setLoadError(null);
    setPublishError(null);
    commitDraft({});
    setSaveState('saved');
    if (!Number.isFinite(id)) {
      setLoadError('Invalid report id');
      return;
    }
    let live = true;
    api
      .getReport(id)
      .then((r) => live && setRecord(r))
      .catch((e: unknown) => live && setLoadError(errMsg(e)));
    return () => {
      live = false;
      window.clearTimeout(timer.current);
    };
  }, [id, commitDraft]);

  const doFlush = useCallback(async (): Promise<boolean> => {
    const body = draftRef.current;
    if (Object.keys(body).length === 0) return true;
    setSaveState('saving');
    const payload: UpdateReportRequest = { ...body };
    if (body.manualRisks) payload.manualRisks = body.manualRisks.filter((r) => !isBlank(r));
    try {
      const r = await api.updateReport(idRef.current, payload);
      setRecord(r);
      const cur = draftRef.current;
      const next: UpdateReportRequest = { ...cur };
      (Object.keys(body) as (keyof UpdateReportRequest)[]).forEach((k) => {
        if (JSON.stringify(cur[k]) !== JSON.stringify(body[k])) return;
        if (k === 'manualRisks' && body.manualRisks?.some(isBlank)) return;
        delete next[k];
      });
      commitDraft(next);
      const keys = Object.keys(next);
      const onlyBlankRow = keys.length === 1 && next.manualRisks !== undefined && next.manualRisks.some(isBlank);
      const remaining = keys.length > 0 && !onlyBlankRow;
      setSaveState(remaining ? 'dirty' : 'saved');
      if (remaining) {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
      }
      return true;
    } catch (e) {
      const cur = { ...draftRef.current };
      delete cur.ragOverride;
      commitDraft(cur);
      setSaveState('error');
      toast('error', `Save failed: ${errMsg(e)}`);
      return false;
    }
  }, [commitDraft, toast]);

  const flush = useCallback((): Promise<boolean> => {
    window.clearTimeout(timer.current);
    chain.current = chain.current.then(doFlush);
    return chain.current;
  }, [doFlush]);

  const queue = useCallback(
    (patch: UpdateReportRequest, immediate = false) => {
      commitDraft({ ...draftRef.current, ...patch });
      setSaveState('dirty');
      window.clearTimeout(timer.current);
      if (immediate) void flush();
      else timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [commitDraft, flush],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(draftRef.current).length > 0) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (loadError) {
    return (
      <div className="stack">
        <Banner kind="error" title="Could not load report">
          {loadError}
        </Banner>
        <Link to="/history">Back to history</Link>
      </div>
    );
  }
  if (!record) return <PageSkeleton />;

  const c = record.content;
  const ackOverride = draft.acknowledged ? new Set(draft.acknowledged) : null;
  const warnings: Warning[] = ackOverride
    ? record.warnings.map((w) => ({ ...w, acknowledged: ackOverride.has(w.id) }))
    : record.warnings;
  const blocking = blockingCount(warnings);
  const manualRisks = draft.manualRisks ?? c.manualRisks;
  const blurbValue = (key: string, saved: string) => draft.blurbs?.[key] ?? saved;

  const onBlurb = (key: string, value: string) => queue({ blurbs: { ...(draftRef.current.blurbs ?? {}), [key]: value } });

  const setManualRisks = (next: string[]) => queue({ manualRisks: next });

  const onToggleAck = (wid: string, ack: boolean) => {
    const ids = new Set(warnings.filter((w) => w.acknowledged).map((w) => w.id));
    if (ack) ids.add(wid);
    else ids.delete(wid);
    queue({ acknowledged: [...ids] }, true);
  };

  async function saveOverride(status: Rag, reason: string) {
    setOverrideBusy(true);
    queue({ ragOverride: { status, reason } }, true);
    await chain.current;
    setOverrideBusy(false);
  }

  async function clearOverride() {
    setOverrideBusy(true);
    queue({ ragOverride: null }, true);
    await chain.current;
    setOverrideBusy(false);
  }

  async function regenerate(section: 'summary' | SectionKey) {
    setRegen(section);
    try {
      if (!(await flush())) return;
      commitDraft({});
      setRecord(await api.regenerate(id, { section }));
      setSaveState('saved');
      toast('success', 'Section regenerated');
    } catch (e) {
      toast('error', errMsg(e));
    } finally {
      setRegen(null);
    }
  }

  async function publish() {
    setPublishing(true);
    setPublishError(null);
    try {
      if (!(await flush())) {
        setPublishError('Your edits could not be saved, so publishing was cancelled.');
        return;
      }
      const res = await api.publish(id);
      setRecord(res.report);
      if (res.ok) toast('success', 'Report published to both pages');
      else toast('error', 'Publishing partly failed. See the Publish panel.');
    } catch (e) {
      setPublishError(errMsg(e));
    } finally {
      setPublishing(false);
    }
  }

  const sections: { id: SectionKey; title: string; empty: string }[] = [
    { id: 'completed', title: 'Completed this week', empty: 'Nothing was completed in this window' },
    { id: 'inProgress', title: 'In progress', empty: 'No work in progress' },
    { id: 'next', title: 'Planned next', empty: 'Nothing planned next' },
  ];

  const saveLabel: Record<SaveState, string> = {
    saved: 'All changes saved',
    dirty: 'Unsaved changes',
    saving: 'Saving',
    error: 'Save failed',
  };

  return (
    <div className="stack">
      <div className="review-head">
        <div>
          <div className="breadcrumb">
            <Link to="/history">History</Link> / Report #{record.id}
          </div>
          <h1>{c.header.project} weekly status</h1>
          <div className="meta-line">
            <span>
              <strong>{c.header.sprintName}</strong>
            </span>
            <span>
              Sprint {fmtDate(c.header.sprintStart)} to {fmtDate(c.header.sprintEnd)}
            </span>
            <span>Report date {fmtDate(c.header.reportDate)}</span>
            {record.demo && <span className="chip chip-demo">Demo data</span>}
          </div>
        </div>
        <div className="head-actions">
          <span className={`save-ind save-${saveState}`} role="status" aria-live="polite">
            {saveState === 'saving' ? <Spinner label="Saving" /> : <>
              <Icon name={saveState === 'saved' ? 'check' : 'alert'} size={14} /> {saveLabel[saveState]}
            </>}
          </span>
          {saveState === 'dirty' || saveState === 'error' ? (
            <button type="button" className="btn btn-sm" onClick={() => void flush()}>
              <Icon name="save" size={14} /> Save now
            </button>
          ) : null}
          <button type="button" className="btn btn-sm" onClick={() => void flush().then((ok) => ok && setPreviewOpen(true))}>
            <Icon name="eye" size={14} /> Preview
          </button>
        </div>
      </div>

      <div className="review-grid">
        <div className="stack">
          <div className="compliance-strip">
            <Icon name="shield" size={18} />
            <span>
              <strong>{c.footer.redactionCount}</strong> redaction{c.footer.redactionCount === 1 ? '' : 's'} applied and{' '}
              <strong>{c.footer.excludedCount}</strong> ticket{c.footer.excludedCount === 1 ? '' : 's'} excluded before drafting. Review
              every warning before publishing.
            </span>
          </div>

          <section className="card">
            <RagControl
              key={`${c.rag.final}-${c.rag.overrideReason ?? ''}`}
              rag={c.rag}
              busy={overrideBusy}
              onSave={(s, r) => void saveOverride(s, r)}
              onClear={() => void clearOverride()}
            />
          </section>

          <section className="card" aria-labelledby="sec-summary">
            <div className="card-head">
              <h2 className="card-title" id="sec-summary">
                Executive summary
              </h2>
              <button type="button" className="btn btn-sm" onClick={() => void regenerate('summary')} disabled={regen !== null}>
                {regen === 'summary' ? <Spinner label="Regenerating" /> : (
                  <>
                    <Icon name="refresh" size={14} /> Regenerate
                  </>
                )}
              </button>
            </div>
            <label className="sr-only" htmlFor="summary">
              Executive summary
            </label>
            <textarea id="summary" rows={6} value={draft.summary ?? c.summary} onChange={(e) => queue({ summary: e.target.value })} />
          </section>

          {sections.map((s) => (
            <EpicSection
              key={s.id}
              id={s.id}
              title={s.title}
              groups={c[s.id]}
              blurbValue={blurbValue}
              onBlurb={onBlurb}
              onRegenerate={() => void regenerate(s.id)}
              regenerating={regen === s.id}
              disabled={regen !== null}
              emptyText={s.empty}
            />
          ))}

          <section className="card" aria-labelledby="sec-blockers">
            <h2 className="card-title" id="sec-blockers">
              Blockers
            </h2>
            {c.blockers.length === 0 ? (
              <div className="ok-note">
                <Icon name="check" size={16} /> No current blockers
              </div>
            ) : (
              <table className="table compact">
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col">Title</th>
                    <th scope="col" className="right">
                      Days blocked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.blockers.map((b) => (
                    <tr key={b.key}>
                      <td>
                        <code>{b.key}</code>
                      </td>
                      <td>{b.title}</td>
                      <td className="right">
                        <span className={`chip ${b.daysBlocked >= 5 ? 'chip-bad' : 'chip-warn'}`}>{b.daysBlocked}d</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card" aria-labelledby="sec-risks">
            <h2 className="card-title" id="sec-risks">
              Risks
            </h2>
            <div className="eyebrow">Drafted from data (read-only)</div>
            {c.risks.length === 0 ? (
              <p className="muted">No risks were identified from the data.</p>
            ) : (
              <ul className="bullets">
                {c.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <div className="eyebrow">Manual risks</div>
            {manualRisks.length === 0 && <p className="muted">No manual risks added.</p>}
            <ul className="risk-rows">
              {manualRisks.map((r, i) => (
                <li key={i}>
                  <label className="sr-only" htmlFor={`risk-${i}`}>
                    Manual risk {i + 1}
                  </label>
                  <input
                    id={`risk-${i}`}
                    type="text"
                    value={r}
                    placeholder="Describe the risk and its impact"
                    onChange={(e) => setManualRisks(manualRisks.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setManualRisks(manualRisks.filter((_, j) => j !== i))}
                    aria-label={`Remove manual risk ${i + 1}`}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-sm" onClick={() => setManualRisks([...manualRisks, ''])}>
              <Icon name="plus" size={14} /> Add risk
            </button>
          </section>

          <section className="card" aria-labelledby="sec-metrics">
            <h2 className="card-title" id="sec-metrics">
              Metrics
            </h2>
            <MetricsPanel metrics={c.metrics} />
          </section>

          <footer className="report-footer">
            Generated {fmtDateTime(c.footer.generatedAt)}. {c.footer.excludedCount} ticket
            {c.footer.excludedCount === 1 ? '' : 's'} excluded, {c.footer.redactionCount} redaction
            {c.footer.redactionCount === 1 ? '' : 's'} applied.
          </footer>
        </div>

        <aside className="side" aria-label="Review panel">
          <WarningsPanel warnings={warnings} onToggle={onToggleAck} />
          <PublishPanel
            record={record}
            blocking={blocking}
            busy={publishing}
            saving={saveState === 'saving'}
            error={publishError}
            onPublish={() => void publish()}
          />
          <LlmPayload reportId={record.id} drafter={record.drafter} />
        </aside>
      </div>

      {previewOpen && <PreviewModal reportId={record.id} version={Date.parse(record.updatedAt) || 0} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
