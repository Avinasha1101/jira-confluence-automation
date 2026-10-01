# Weekly Status Report Generator — Task List

Derived from [project_spec.md](project_spec.md) and [BACKLOG.md](BACKLOG.md).  
Legend: `[x]` done and covered by tests, `[~]` built but not yet verified (no live Jira/Confluence, or not exercised end to end), `[ ]` not done. Status as of 2026-10-01.

## Phase 1: Data and Logic (no UI)

### E1: Foundation
- [x] **T1.1 Audit existing code.** Review `src/config/` and `tests/unit/config/` (built for an earlier design). Keep what fits the new spec, delete the rest. *Done when:* only code that serves this spec remains and tests pass.
- [x] **T1.2 Project setup.** Node/TypeScript, Express, Jest, lint, `.gitignore` (excluding `node_modules`, `.env`, local DB). *Done when:* `npm test` and `npm run build` run clean.
- [x] **T1.3 Settings and secrets.** Load config from file plus environment variables; secrets never written to disk in plaintext or logged. Fields: Jira URL/email/token, board ID, blocker status, cycle-time start/end statuses, exclusion rule, PII patterns, RAG thresholds, Confluence targets, LLM toggle and approval reference. *Done when:* invalid or missing config produces a clear error naming the field.
- [x] **T1.4 Fixtures.** Create anonymized Jira sprint payloads covering: normal sprint, blocked issue, unestimated issues, bugs of varied age, issue with fake PII in the title, no active sprint. *Done when:* fixtures load in tests.

### E2: Jira Retrieval (depends on T1.2, T1.3)
- [x] **T2.1 Jira client.** Auth, timeout, retry with backoff on 429/5xx, distinct error for 401/403. *Done when:* unit tests cover success, retry, and auth failure.
- [~] **T2.2 Active sprint fetch.** Find the active sprint on the configured board; fetch its issues with story points, priority, status, epic, labels, flagged state, dates. Do **not** fetch assignees or descriptions into the model. *Done when:* returns normalized issues from fixtures; "no active sprint" returns a clear result, not an error.
- [x] **T2.3 Status history.** Fetch changelog to derive when each issue entered In Dev and Done. *Done when:* cycle-time inputs are produced for completed issues.
- [~] **T2.4 Workflow validation.** Check configured status names (Ready for Dev, In Dev, Blocked, Done) exist on the board; report mismatches. *Done when:* a wrong status name yields an actionable message.

### E3: Exclusion and PII (depends on T2.2)
- [x] **T3.1 Exclusion filter.** Support label, security level, component, and issue-type rules; default "none". *Done when:* each rule type removes matching fixture issues and the excluded count is recorded.
- [x] **T3.2 PII redactor.** Detect and mask SSN, card numbers, configurable account/loan regex, VIN, email, phone, street address (best effort). Record redaction events (type, issue key, never the value). *Done when:* every pattern has positive and negative tests, including the fixture with PII in a title.
- [x] **T3.3 Pipeline guard.** Enforce order fetch, exclude, redact, compute; downstream modules receive only the redacted model type. *Done when:* the type system prevents raw issues reaching metrics, drafting, or rendering.
- [x] **T3.4 Publish gate.** Unresolved PII warnings block publish; acknowledgment is recorded per warning. *Done when:* tests prove publish is refused with an open warning.

### E4: Metrics, Blockers, RAG (depends on T2.2, T2.3)
- [x] **T4.1 Velocity and progress.** Points done vs committed with percentage; scope-done % vs sprint time elapsed; count of unestimated issues. *Done when:* matches hand-calculated fixture values.
- [x] **T4.2 Issue and bug counts.** Counts by status category; open bugs by priority; aging buckets 0-7, 8-14, 15-30, 30+; oldest open bugs list. *Done when:* fixture totals verified.
- [x] **T4.3 Cycle time.** Mean and median from entering In Dev to Done for issues completed this sprint. *Done when:* verified on fixtures, including issues that skipped a status.
- [x] **T4.4 Blocker detection.** Issues in Blocked status with days blocked. *Done when:* "No current blockers" case handled.
- [x] **T4.5 RAG engine.** Apply spec thresholds (Red: blocker over 3 days, progress lags time by over 25 points, or open Critical bug; Amber: any blocker or lag 10-25 points or bug count above threshold; else Green). Return the triggering rules. *Done when:* each rule has a boundary test.

## Phase 2: Report and Drafting

### E5: Rendering and Template Drafting (depends on Phase 1)
- [x] **T5.1 Report model.** Header, summary, completed, in-progress/next, blockers and risks, metrics, footer. No individual names anywhere. *Done when:* model is built from fixtures.
- [x] **T5.2 Completed-this-week window.** 7-day window for "completed this week", sprint dates for sprint metrics. *Done when:* boundary dates tested.
- [x] **T5.3 Template drafter.** Deterministic executive summary and per-epic text from metrics. *Done when:* output is readable and fully reproducible for a fixture.
- [x] **T5.4 HTML preview renderer.** *Done when:* preview shows all sections with RAG colour.
- [~] **T5.5 Confluence storage-format renderer.** Status macro for RAG. *Done when:* output validates against Confluence storage format in a manual test page.

## Phase 3: UI, Publishing, LLM

### E6: Review UI
- [~] **T6.1 Local server, localhost only.** *Done when:* app is unreachable from other machines.
- [~] **T6.2 Generate flow.** Fetch, process, show preview; progress and error states. *Done when:* fixture-backed run works end to end.
- [~] **T6.3 Inline editing.** All narrative text editable; manual risks can be added. *Done when:* edits persist into the published content.
- [~] **T6.4 RAG override.** Requires a reason; reason stored with the report. *Done when:* override without reason is rejected.
- [~] **T6.5 Warnings panel.** PII, missing story points, issues without epic, no exclusion rule configured. *Done when:* each warning appears for its fixture.
- [~] **T6.6 "View payload" panel.** Shows exactly what would be sent to the LLM. *Done when:* panel matches the real request body.

### E7: Confluence Publishing (blocked until targets supplied; build against mocks)
- [~] **T7.1 Confluence client.** Auth, retry, error classification. *Done when:* unit tests with mocked API.
- [x] **T7.2 Dated child page.** Create under configured parent; handle existing page (update or numbered copy). *Done when:* both paths tested.
- [x] **T7.3 Latest page update.** Replace content in place. *Done when:* repeat publish creates no duplicates.
- [x] **T7.4 Partial failure handling.** Report which page failed; retry only that page. *Done when:* simulated failure of each page tested.
- [ ] **T7.5 Live verification.** Run against the real space once targets are supplied. *Done when:* both pages visible and correct.

### E8: LLM Drafting (blocked until security approval; template fallback remains default)
- [x] **T8.1 Settings gate.** LLM disabled by default; enabling requires an approval reference. *Done when:* cannot be enabled without it.
- [x] **T8.2 Claude narrative service.** Input limited to redacted titles, statuses, epics, metrics. *Done when:* a test asserts descriptions, comments, and assignees never appear in the request.
- [x] **T8.3 Per-section regenerate and fallback.** Falls back to template on any LLM failure. *Done when:* simulated outage still yields a complete report.

### E9: History and Settings
- [x] **T9.1 Local store (SQLite).** Reports, redaction events, publish results. *Done when:* a past report reopens with its links.
- [~] **T9.2 Re-publish from history.** *Done when:* a past report can be re-published without regeneration.
- [~] **T9.3 Settings screen.** All config fields plus "Test connection" for Jira, Confluence, and LLM. *Done when:* each test gives a clear pass/fail.

## Phase 4: Hardening and Release

### E10
- [x] **T10.1 Log audit.** Confirm no ticket text or secrets in logs. *Done when:* scan of a full run's logs is clean.
- [x] **T10.2 Security review pack.** Data-flow diagram and list of data sent externally, for the company approval. *Done when:* document ready to submit. (Can be started early.)
- [~] **T10.3 Error messages.** Every failure path names the cause and next step. *Done when:* reviewed against a list of failure scenarios.
- [x] **T10.4 Coverage.** 80%+ on exclusion, redaction, metrics, and RAG. *Done when:* CI/`npm test` enforces it.
- [x] **T10.5 README and runbook.** Setup, weekly use, troubleshooting. *Done when:* a new user can run a report from the README.
- [ ] **T10.6 Acceptance run.** Walk through every acceptance criterion in `project_spec.md` Section 9 against a real sprint. *Done when:* all pass.

## Suggested Start

T1.1, T1.2, T1.3, T1.4, then T10.2 in parallel (the security review pack has the longest external lead time).
