# Weekly Status Report Generator

A local web app that turns the active Jira Scrum sprint into a stakeholder status report, lets you review and edit it, and publishes it to Confluence (a dated page plus a "Latest Status" page). Built for a product manager on an automotive financing project, so borrower PII is redacted before anything is displayed, drafted, or published.

Spec: [project_spec.md](project_spec.md). Work plan: [BACKLOG.md](BACKLOG.md), [TASKS.md](TASKS.md). Security review pack: [docs/security-review.md](docs/security-review.md).

## Quick start (demo mode, no credentials)

Requires Node 22.13 or later.

```bash
npm install
npm run web:install
npm run web:build
npm run build
npm start            # http://localhost:3001
```

Demo mode is the default. It uses fixture sprint data and a mock Confluence, so the whole flow works offline. Pick a scenario on the Generate screen:

| Scenario | Shows |
|----------|-------|
| Healthy sprint | Green status; set an exclusion rule of label `internal-only` in Settings to see two issues removed |
| At risk: blocked work | Red status with blockers, a critical bug, and a lagging sprint |
| Sensitive data in titles | PII masked, six blocking warnings, publish disabled until acknowledged |
| No active sprint | The friendly error path |

For development with hot reload, run `npm run dev` (API on 3001) and `npm run web:dev` (UI on 5173).

## Live mode

1. In Settings, switch mode to `live` and fill in the Jira URL, email, and board ID.
2. Set secrets as environment variables (they are never stored in files or shown in the UI):
   - `JIRA_API_TOKEN`
   - `CONFLUENCE_API_TOKEN` (optional, defaults to the Jira token)
   - `ANTHROPIC_API_KEY` (only if LLM drafting is approved)
3. Use "Test connection" in Settings. The Jira test also checks that your workflow status names exist on the board.
4. Fill in the Confluence base URL, space key, parent page ID, and Latest page ID. Publishing is blocked until these are set.

## How it works

Fetch, exclude, redact, compute, draft, review, publish. Redacted issues have their own type, so nothing after the redaction step can touch raw ticket text. Ticket descriptions, comments, and assignees are never fetched.

- **Metrics:** velocity, sprint progress vs time, status counts, open bugs with aging, cycle time (Ready for Dev to In Dev start, through Done).
- **RAG:** computed from rules (thresholds in Settings), with the triggering reasons shown. Overriding requires a reason.
- **Blockers:** issues in the `Blocked` status (configurable).
- **Drafting:** template by default. LLM drafting is off until a company security approval reference is recorded in Settings.
- **Publishing:** blocked while any PII warning is unacknowledged. The dated page and Latest page are written independently, and a failure of one is reported and retryable without touching the other.

## Settings that need your input

- **Internal-only rule:** the label, security level, component, or issue type that marks internal issues. Until set, a warning shows on every report.
- **Confluence targets:** space, parent page, Latest page.
- **Security approval:** the reference for sending redacted titles to the Claude API.

## Development

```bash
npm test              # 70 tests
npm run test:coverage # gate: 80% on pipeline, metrics, and report logic
npx tsc --noEmit
```

Data (settings and report history) is stored under `./data` (override with `DATA_DIR`) in SQLite via Node's built-in `node:sqlite`. The server binds to `127.0.0.1` and rejects requests whose Host header is not localhost.

`src/domain/apiTypes.ts` is the API contract; `web/src/apiTypes.ts` must stay an identical copy.

`archive/old-config/` holds code from an earlier design, kept for reference only.
