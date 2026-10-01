import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { ExclusionRule, Settings, SettingsResponse, TestConnectionResult } from '../apiTypes';
import { errMsg } from '../format';
import { Banner, PageSkeleton, Spinner } from '../components/ui';
import { useToast } from '../components/Toast';

type Target = 'jira' | 'confluence' | 'llm';
type RuleType = ExclusionRule['type'];

function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  type = 'text',
  mono,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input id={id} type={type} className={mono ? 'mono' : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function NumberField({ id, label, value, onChange, hint }: { id: string; label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input id={id} type="number" min={0} value={Number.isNaN(value) ? '' : value} onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} />
    </Field>
  );
}

function SecretChip({ label, set }: { label: string; set: boolean }) {
  return (
    <span className={`chip ${set ? 'chip-ok' : 'chip-bad'}`}>
      {label}: {set ? 'set' : 'missing'}
    </span>
  );
}

function TestButton({ target, disabled }: { target: Target; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestConnectionResult | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await api.testConnection(target));
    } catch (e) {
      setResult({ ok: false, message: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="test-row">
      <button type="button" className="btn btn-sm" onClick={run} disabled={busy || disabled}>
        {busy ? <Spinner label="Testing" /> : 'Test connection'}
      </button>
      {result && (
        <span className={`test-result ${result.ok ? 'ok' : 'fail'}`} role="status">
          {result.ok ? 'OK' : 'Failed'}: {result.message}
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [doneText, setDoneText] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function apply(r: SettingsResponse) {
    setData(r);
    setForm(r.settings);
    setDoneText(r.settings.workflow.doneStatuses.join(', '));
    setDirty(false);
  }

  useEffect(() => {
    api
      .getSettings()
      .then(apply)
      .catch((e: unknown) => setLoadError(errMsg(e)));
  }, []);

  if (loadError) return <Banner kind="error" title="Could not load settings">{loadError}</Banner>;
  if (!form || !data) return <PageSkeleton />;

  function update(fn: (s: Settings) => Settings) {
    setForm((cur) => (cur ? fn(cur) : cur));
    setDirty(true);
  }

  function setRuleType(type: RuleType) {
    update((s) => ({
      ...s,
      exclusion: {
        acknowledgedNone: type === 'none' ? s.exclusion.acknowledgedNone : false,
        rule: type === 'none' ? { type } : { type, value: s.exclusion.rule.type === 'none' ? '' : s.exclusion.rule.value },
      },
    }));
  }

  function setApproval(ref: string) {
    update((s) => ({ ...s, llm: { ...s.llm, approvalReference: ref, enabled: ref.trim() ? s.llm.enabled : false } }));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    const body: Settings = {
      ...form,
      workflow: {
        ...form.workflow,
        doneStatuses: doneText
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      },
    };
    try {
      apply(await api.saveSettings(body));
      toast('success', 'Settings saved');
    } catch (e) {
      const m = errMsg(e);
      setSaveError(m);
      toast('error', m);
    } finally {
      setSaving(false);
    }
  }

  const rule = form.exclusion.rule;
  const noApproval = form.llm.approvalReference.trim() === '';
  const rag = form.rag;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Settings</h1>
        <p className="lede">Configuration for data sources, compliance controls and publishing targets.</p>
      </div>

      {data.warnings.length > 0 && (
        <Banner kind="warn" title="Configuration warnings">
          <ul className="plain-list">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Banner>
      )}
      {saveError && (
        <Banner kind="error" title="Settings were not saved">
          {saveError}
        </Banner>
      )}

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <section className="card">
          <h2 className="card-title">General</h2>
          <div className="grid-2">
            <Field label="Mode" htmlFor="mode" hint="Demo uses fixture data and a mock Confluence. Live uses Jira and Confluence.">
              <select id="mode" value={form.mode} onChange={(e) => update((s) => ({ ...s, mode: e.target.value as Settings['mode'] }))}>
                <option value="demo">Demo</option>
                <option value="live">Live</option>
              </select>
            </Field>
            <TextField id="project" label="Project name" value={form.project.name} onChange={(v) => update((s) => ({ ...s, project: { name: v } }))} />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Jira</h2>
            <SecretChip label="Jira token" set={data.secrets.jira} />
          </div>
          <div className="grid-2">
            <TextField id="jira-url" label="Base URL" value={form.jira.baseUrl} onChange={(v) => update((s) => ({ ...s, jira: { ...s.jira, baseUrl: v } }))} hint="For example https://yourcompany.atlassian.net" />
            <TextField id="jira-email" label="Account email" value={form.jira.email} onChange={(v) => update((s) => ({ ...s, jira: { ...s.jira, email: v } }))} />
            <TextField id="jira-board" label="Board ID" value={form.jira.boardId} onChange={(v) => update((s) => ({ ...s, jira: { ...s.jira, boardId: v } }))} />
          </div>
          <TestButton target="jira" disabled={dirty} />
        </section>

        <section className="card">
          <h2 className="card-title">Workflow status names</h2>
          <p className="muted">Must match the status names in your Jira workflow exactly.</p>
          <div className="grid-2">
            <TextField id="wf-ready" label="Ready status" value={form.workflow.readyStatus} onChange={(v) => update((s) => ({ ...s, workflow: { ...s.workflow, readyStatus: v } }))} />
            <TextField id="wf-start" label="Cycle start status" value={form.workflow.cycleStartStatus} onChange={(v) => update((s) => ({ ...s, workflow: { ...s.workflow, cycleStartStatus: v } }))} />
            <TextField id="wf-end" label="Cycle end status" value={form.workflow.cycleEndStatus} onChange={(v) => update((s) => ({ ...s, workflow: { ...s.workflow, cycleEndStatus: v } }))} />
            <TextField id="wf-blocked" label="Blocked status" value={form.workflow.blockedStatus} onChange={(v) => update((s) => ({ ...s, workflow: { ...s.workflow, blockedStatus: v } }))} />
          </div>
          <TextField
            id="wf-done"
            label="Done statuses"
            value={doneText}
            onChange={(v) => {
              setDoneText(v);
              setDirty(true);
            }}
            hint="Comma separated, for example Done, Released"
          />
        </section>

        <section className="card">
          <h2 className="card-title">Confidentiality exclusion</h2>
          <p className="muted">Tickets matching this rule are removed before any processing and never appear in the report.</p>
          <div className="grid-2">
            <Field label="Rule type" htmlFor="ex-type">
              <select id="ex-type" value={rule.type} onChange={(e) => setRuleType(e.target.value as RuleType)}>
                <option value="none">No exclusions</option>
                <option value="label">Label</option>
                <option value="securityLevel">Security level</option>
                <option value="component">Component</option>
                <option value="issueType">Issue type</option>
              </select>
            </Field>
            {rule.type !== 'none' && (
              <TextField
                id="ex-value"
                label="Rule value"
                value={rule.value}
                onChange={(v) => update((s) => ({ ...s, exclusion: { ...s.exclusion, rule: s.exclusion.rule.type === 'none' ? s.exclusion.rule : { ...s.exclusion.rule, value: v } } }))}
              />
            )}
          </div>
          {rule.type === 'none' && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.exclusion.acknowledgedNone}
                onChange={(e) => update((s) => ({ ...s, exclusion: { ...s.exclusion, acknowledgedNone: e.target.checked } }))}
              />
              <span>
                <strong>No exclusions - I confirm.</strong> I confirm that no tickets in this project need to be hidden from reports.
              </span>
            </label>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">PII redaction</h2>
          <TextField
            id="pii"
            label="Account identifier regex"
            mono
            value={form.pii.accountRegex}
            onChange={(v) => update((s) => ({ ...s, pii: { accountRegex: v } }))}
            hint="Matches loan or account numbers in ticket titles. Matches are replaced before drafting and flagged for review. Other PII patterns (emails, phone numbers, SSNs) are always redacted."
          />
        </section>

        <section className="card">
          <h2 className="card-title">RAG thresholds</h2>
          <p className="muted">The computed status is Red if any red rule matches, otherwise Amber if any amber rule matches, otherwise Green.</p>
          <div className="grid-4">
            <NumberField id="rag-rb" label="Red: blocker days" value={rag.redBlockerDays} onChange={(v) => update((s) => ({ ...s, rag: { ...s.rag, redBlockerDays: v } }))} hint="A blocker open at least this long" />
            <NumberField id="rag-rl" label="Red: lag points" value={rag.redLagPoints} onChange={(v) => update((s) => ({ ...s, rag: { ...s.rag, redLagPoints: v } }))} hint="Scope-done behind time elapsed" />
            <NumberField id="rag-al" label="Amber: lag points" value={rag.amberLagPoints} onChange={(v) => update((s) => ({ ...s, rag: { ...s.rag, amberLagPoints: v } }))} />
            <NumberField id="rag-ab" label="Amber: open bugs" value={rag.amberOpenBugs} onChange={(v) => update((s) => ({ ...s, rag: { ...s.rag, amberOpenBugs: v } }))} />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Confluence</h2>
            <SecretChip label="Confluence token" set={data.secrets.confluence} />
          </div>
          <div className="grid-2">
            <TextField id="cf-url" label="Base URL" value={form.confluence.baseUrl} onChange={(v) => update((s) => ({ ...s, confluence: { ...s.confluence, baseUrl: v } }))} />
            <TextField id="cf-space" label="Space key" value={form.confluence.spaceKey} onChange={(v) => update((s) => ({ ...s, confluence: { ...s.confluence, spaceKey: v } }))} />
            <TextField id="cf-parent" label="Parent page ID" value={form.confluence.parentPageId} onChange={(v) => update((s) => ({ ...s, confluence: { ...s.confluence, parentPageId: v } }))} hint="New dated pages are created under this page" />
            <TextField id="cf-latest" label="Latest page ID" value={form.confluence.latestPageId} onChange={(v) => update((s) => ({ ...s, confluence: { ...s.confluence, latestPageId: v } }))} hint="This page is updated on every publish" />
          </div>
          <TestButton target="confluence" disabled={dirty} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">LLM drafting</h2>
            <SecretChip label="Anthropic key" set={data.secrets.llm} />
          </div>
          <Banner kind="info">
            Template drafting is the default and sends nothing outside your network. LLM drafting is disabled until you record
            the reference of the company security approval that permits it. Descriptions, comments and assignees are never sent.
          </Banner>
          <div className="gap-sm" />
          <div className="grid-2">
            <TextField id="llm-ref" label="Security approval reference" value={form.llm.approvalReference} onChange={setApproval} hint="For example the ticket or review ID from your security team" />
            <TextField id="llm-model" label="Model" value={form.llm.model} onChange={(v) => update((s) => ({ ...s, llm: { ...s.llm, model: v } }))} />
          </div>
          <label className={`check-row${noApproval ? ' disabled' : ''}`}>
            <input
              type="checkbox"
              checked={form.llm.enabled}
              disabled={noApproval}
              onChange={(e) => update((s) => ({ ...s, llm: { ...s.llm, enabled: e.target.checked } }))}
            />
            <span>
              <strong>Enable LLM drafting</strong>
              {noApproval && <span className="muted"> Enter an approval reference to enable this option.</span>}
            </span>
          </label>
          <TestButton target="llm" disabled={dirty} />
        </section>

        <section className="card">
          <h2 className="card-title">Secrets</h2>
          <p className="muted">
            Secrets are never edited or stored here. Set them as environment variables on the server and restart it.
          </p>
          <div className="chips">
            <SecretChip label="Jira token" set={data.secrets.jira} />
            <SecretChip label="Confluence token" set={data.secrets.confluence} />
            <SecretChip label="Anthropic key" set={data.secrets.llm} />
          </div>
          <ul className="env-list">
            <li>
              <code>JIRA_API_TOKEN</code>
            </li>
            <li>
              <code>CONFLUENCE_API_TOKEN</code> <span className="muted">(falls back to JIRA_API_TOKEN)</span>
            </li>
            <li>
              <code>ANTHROPIC_API_KEY</code>
            </li>
          </ul>
        </section>

        <div className="save-bar">
          <span className="muted">{dirty ? 'You have unsaved changes. Test connection uses saved values.' : 'All changes saved.'}</span>
          <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
            {saving ? <Spinner label="Saving" /> : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
