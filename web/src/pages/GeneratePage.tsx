import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { DemoScenario } from '../apiTypes';
import { useHealth } from '../health';
import { errMsg } from '../format';
import { Banner, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';

const STEPS: { name: string; desc: string }[] = [
  { name: 'Fetch', desc: 'Active sprint and issues from Jira' },
  { name: 'Exclude', desc: 'Drop confidential tickets by rule' },
  { name: 'Redact', desc: 'Strip borrower PII from titles' },
  { name: 'Compute', desc: 'Metrics and RAG status' },
  { name: 'Draft', desc: 'Summary and epic blurbs' },
  { name: 'Review', desc: 'You edit and acknowledge warnings' },
  { name: 'Publish', desc: 'Dated page and Latest page' },
];

export default function GeneratePage() {
  const health = useHealth();
  const navigate = useNavigate();
  const demo = health?.mode === 'demo';

  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [scenario, setScenario] = useState<string>('');
  const [configWarnings, setConfigWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((r) => setConfigWarnings(r.warnings))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!demo) return;
    api
      .scenarios()
      .then((list) => {
        setScenarios(list);
        setScenario((cur) => cur || list[0]?.id || '');
      })
      .catch((e: unknown) => setScenarioError(errMsg(e)));
  }, [demo]);

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, 4)), 650);
    return () => window.clearInterval(t);
  }, [busy]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const rec = await api.generate(demo && scenario ? { scenario } : {});
      navigate(`/reports/${rec.id}`);
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
      setStep(-1);
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Generate weekly status report</h1>
        <p className="lede">
          Builds a draft from the active Jira sprint. Nothing is published until you review the draft, acknowledge every
          compliance warning, and click Publish.
        </p>
      </div>

      {configWarnings.length > 0 && (
        <Banner kind="warn" title="Configuration needs attention">
          <ul className="plain-list">
            {configWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <Link to="/settings">Open Settings</Link>
        </Banner>
      )}

      <section className="card" aria-label="Pipeline">
        <h2 className="card-title">How the report is produced</h2>
        <ol className="stepper">
          {STEPS.map((s, i) => {
            const state = busy ? (i < step ? 'done' : i === step ? 'active' : '') : '';
            return (
              <li key={s.name} className={`step ${state}`}>
                <span className="step-dot">{state === 'done' ? <Icon name="check" size={14} /> : i + 1}</span>
                <span className="step-name">{s.name}</span>
                <span className="step-desc">{s.desc}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {demo && (
        <section className="card" aria-label="Demo scenario">
          <h2 className="card-title">Choose a demo scenario</h2>
          <p className="muted">Each scenario loads fixture sprint data so the full flow can be shown without credentials.</p>
          {scenarioError && <Banner kind="error">{scenarioError}</Banner>}
          {!scenarioError && scenarios.length === 0 && <Spinner label="Loading scenarios" />}
          <div className="radio-cards" role="radiogroup" aria-label="Demo scenario">
            {scenarios.map((s) => (
              <label key={s.id} className={`radio-card${scenario === s.id ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="scenario"
                  value={s.id}
                  checked={scenario === s.id}
                  onChange={() => setScenario(s.id)}
                  disabled={busy}
                />
                <span className="radio-card-title">{s.label}</span>
                <span className="radio-card-desc">{s.description}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {error && (
        <Banner kind="error" title="Could not generate the report">
          {error}
        </Banner>
      )}

      <div className="actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={generate} disabled={busy || (demo && !scenario)}>
          {busy ? <Spinner label="Generating report" /> : 'Generate report'}
        </button>
        {!health && <span className="muted">Connecting to server</span>}
      </div>
    </div>
  );
}
