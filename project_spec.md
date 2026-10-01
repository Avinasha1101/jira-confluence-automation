# Weekly Status Report Generator — Technical Specification

**Version:** 2.0 (post-interview)  
**Owner:** Product Manager (3-person team, automotive financing project)  
**Status:** Draft, ready for build planning

---

## 1. Overview

A local web application that, on demand, pulls the current active Scrum sprint from Jira Cloud, computes sprint metrics and a suggested RAG status, drafts a stakeholder narrative with an LLM, lets the PM review and edit everything, and publishes the result to Confluence. Because the domain is automotive financing, the tool redacts borrower PII and excludes internal-only issues before any data leaves Jira.

## 2. Goals

- Remove manual copy/paste of Jira data into weekly status updates.
- Produce a consistent report that works for audiences from executives to engineers.
- Keep both a historical record (dated pages) and a current-status page in Confluence.
- Make PII leakage structurally difficult, not dependent on author discipline.

### Non-Goals (v1)
- Scheduled or automatic publishing (PM triggers every run).
- Per-person breakdowns.
- Multi-team or multi-project support.
- Jira Data Center / Server support.

## 3. Users and Audience

**Operator:** the Product Manager, single user, runs the app locally.

**Report readers (all four groups):**
| Reader | Needs |
|--------|-------|
| Executives / VPs | RAG status, headline, top risks |
| Business stakeholders | Feature progress and delivery outlook, plain language |
| Compliance / risk | Risks surfaced clearly, evidence that sensitive data is excluded |
| Engineering / IT leads | Blockers, bug counts and aging, cycle time |

The report is a single document. Sections are ordered so executives can stop after the summary and engineers can read to the end.

## 4. Functional Requirements

### FR1: Jira Data Retrieval
- Connect to Jira Cloud using email + API token.
- Select a Scrum board once in settings; each run fetches that board's **current active sprint**.
- Retrieve for each issue: key, summary, issue type, status, status category, story points, epic, labels, flagged state, created/resolved dates, status-change history (for cycle time), and priority/severity for bugs.
- If no sprint is active, show a clear message and do nothing else.
- Retries with backoff on rate limits (429) and transient errors; clear error on auth failure.

### FR2: Exclusion and PII Protection
1. **Internal-only exclusion:** Issues matching a configurable exclusion rule are dropped before processing. Supported rule types: label, Jira security level, component, issue type. Default rule is **none**, and the UI shows a warning banner until a rule is configured or explicitly set to "no exclusions".
2. **PII redaction:** All text fields are scanned and masked before display, storage, or LLM use. Patterns: SSN, 16-digit card numbers, account/loan numbers (configurable regex), VINs, emails, phone numbers, street addresses (best effort).
3. **Descriptions are never sent to the LLM or published.** Only titles and structured metadata are used. Titles are redacted too.
4. The review screen lists every redaction made (type and issue key, not the matched value) and highlights issues needing manual check.
5. Publishing is blocked while any **unresolved** PII warning exists. The PM must edit the text or explicitly acknowledge each warning.

### FR3: Metrics
| Metric | Definition |
|--------|-----------|
| Sprint velocity | Story points completed (Done) vs committed, with percentage |
| Sprint progress | Percent of scope done versus percent of sprint time elapsed |
| Issue counts | By status category: To Do, In Progress, Blocked, Done |
| Bug counts | Open bugs by priority; count and list of the oldest open bugs |
| Bug aging | Age buckets: 0-7, 8-14, 15-30, 30+ days |
| Cycle time | Mean and median days from entering **In Dev** (from Ready for Dev) to Done, for issues completed this sprint. Start and end statuses are configurable. |

Issues without story points are counted in issue counts but excluded from point totals, with a note showing how many.

### FR4: Blocker Detection
An issue is a blocker if its status is **Blocked**. The status name is configurable. Each blocker shows key, title, and days in Blocked status. If none, the report states "No current blockers."

### FR5: RAG Status (Computed, Overridable)
Computed from rules with configurable thresholds. Proposed defaults:

| Status | Condition (any) |
|--------|----------------|
| Red | Any blocker older than 3 days; or progress lags time elapsed by more than 25 percentage points; or any open Critical bug |
| Amber | Any blocker; or progress lags by 10-25 points; or bug count rising to above threshold |
| Green | None of the above |

The UI shows the resulting status with the rule(s) that triggered it. The PM may override and must enter a reason, which is recorded in the saved report.

### FR6: Narrative Drafting (LLM)
- The Claude API drafts: executive summary (2-3 sentences), "Completed this week" and "In progress / next week" blurbs per epic, and a risk list.
- Input is limited to redacted titles, statuses, epics, and computed metrics, never descriptions or comments.
- Output is shown as editable text. The PM edits freely before publishing.
- The PM can add manual risks that do not exist in Jira.
- Regenerate button available per section.
- If the LLM is unavailable, the app falls back to a deterministic template so the workflow is never blocked.
- **Security gate:** sending redacted titles to the Claude API requires company security approval. The LLM feature is **disabled by default**. It can only be enabled after the PM records the approval reference in settings. Until then, the template fallback is the only drafting mode.

### FR7: Report Structure
1. **Header:** project, sprint name and dates, report date, RAG status.
2. **Executive summary** (editable).
3. **Completed this week:** issues moved to Done in the reporting window, grouped by epic.
4. **In progress / next week:** current work and planned work, grouped by epic.
5. **Blockers and risks:** Blocked issues plus manual risks.
6. **Metrics:** velocity, progress, issue counts, bugs and aging, cycle time.
7. **Footer:** generated-at timestamp, data window, redaction/exclusion count.

No individual names appear anywhere in the report (assignees are never fetched into the output model).

### FR8: Review and Edit
- Local web UI: select week, fetch, then preview with inline editing of all narrative text and RAG override.
- Side panel shows warnings (PII, missing story points, issues without epic, no exclusion rule).
- Nothing is published until the PM presses Publish.

### FR9: Confluence Publishing
- Publish writes **both**:
  1. A new **dated child page** under a configured parent page (e.g. "Status Report - 2026-10-02"), preserving history.
  2. An update to a configured **"Latest Status"** page, replaced in place.
- Content uses Confluence storage format, with RAG shown as a status macro/colour.
- If a dated page for that date already exists, the PM chooses to update it or create a numbered copy.
- Partial failure (one page succeeds, one fails) is reported precisely and retryable for the failed page only.
- Records the published page URLs in local history.

### FR10: Local History
- Each run saves the report snapshot (redacted) and publish results locally.
- PM can reopen a past report, view its publish links, and re-publish.

### FR11: Configuration Screen
Jira URL/credentials, board, blocker status name, exclusion rule, PII patterns, RAG thresholds, Confluence space/parent/latest page, LLM API key and on/off toggle. A "Test connection" button for Jira, Confluence, and LLM.

## 5. Non-Functional Requirements

- **Performance:** Fetch plus metrics plus draft completes in under 60 seconds for a sprint of up to 100 issues.
- **Security:** Secrets in environment variables or OS credential store, never in the repository, logs, or saved reports. App binds to localhost only. Ticket text is never logged.
- **Privacy:** Only redacted titles and metrics reach the LLM. This is stated in the UI and verifiable by a "view LLM payload" panel.
- **Reliability:** Idempotent publish (re-run does not duplicate pages). Clear, actionable error messages.
- **Usability:** From launch to published report in under 5 minutes of PM time.
- **Maintainability:** Typed code, 80%+ unit coverage on metrics, RAG, redaction, and exclusion logic.

## 6. Architecture

```
Browser (local web UI)
      |
Local server (localhost)
  |- JiraClient ---------> Jira Cloud REST API
  |- Exclusion filter + PII redactor
  |- Metrics + RAG engine
  |- NarrativeService ---> Claude API (redacted input only)
  |- ReportRenderer (preview HTML + Confluence storage format)
  |- ConfluenceClient ---> Confluence Cloud REST API
  |- Local store (history, settings)
```

**Pipeline order is a hard requirement:** fetch, exclude, redact, compute, draft, review, publish. Nothing downstream of redaction may access raw ticket text.

### Technology
No hard constraint was given. Recommended:
- **Backend:** Node.js + TypeScript (matches the existing repo's `package.json` and `tsconfig.json`), Express.
- **Frontend:** React + Vite.
- **Local storage:** SQLite (single user, no Docker needed).
- **Testing:** Jest for logic, plus fixtures of anonymized Jira payloads.

**Constraint to confirm:** a tool holding Jira/Confluence tokens and calling an external LLM may need company security approval (see Open Questions).

## 7. Data Model (local)

- `settings` (key, value; secrets referenced, not stored in plaintext)
- `reports` (id, sprint_id, sprint_name, report_date, rag_computed, rag_final, rag_override_reason, content_json, created_at)
- `redaction_events` (report_id, issue_key, type, resolved)
- `publishes` (report_id, target: dated|latest, page_id, url, status, error, published_at)

## 8. Implementation Plan

**Phase 1: Data and logic (no UI)**
- Jira client, sprint selection, fixtures
- Exclusion and PII redaction with tests
- Metrics, blocker detection, RAG engine with tests

**Phase 2: Report and drafting**
- Report model and renderer (preview + Confluence format)
- Claude narrative service with template fallback

**Phase 3: UI and publishing**
- Settings screen, review/edit screen, warnings panel
- Confluence dual publish, history

**Phase 4: Hardening**
- Error handling, retry, publish idempotency
- Security review, documentation

## 9. Acceptance Criteria

- Running against a real active sprint produces a complete report with all sections.
- No ticket description or assignee name appears in the report, the LLM payload, or logs.
- A ticket title containing a fake SSN is masked, flagged, and blocks publish until resolved.
- A Blocked issue appears in the blockers section and drives RAG to at least Amber.
- Publish creates the dated page and updates the Latest page; a repeated publish does not create duplicates.
- RAG override requires a reason and is recorded.
- With the LLM disabled, the PM can still produce and publish a report from the template.

## 10. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| PII regex misses a pattern | High (compliance) | Titles-only policy, mandatory review, configurable patterns, "view payload" panel |
| Internal-only rule undefined | High | Warning banner until configured; spec makes the rule configurable |
| Story points missing or inconsistent | Medium | Surface count of unestimated issues; fall back to issue counts |
| LLM hallucination in narrative | Medium | Input limited to facts, human edit required, deterministic fallback |
| Security approval delays | Medium | Raise early; all data stays local except redacted LLM input and Atlassian calls |
| Sprint boundary vs "this week" mismatch | Low | Use sprint dates for sprint metrics and a 7-day window for "completed this week" |

## 11. Decisions and Open Questions

### Resolved
- **Story points and bug severity:** always present as standard Jira fields. Use the standard fields (story point estimate, priority); no custom field IDs needed.
- **Cycle time:** starts when an issue moves from Ready for Dev to In Dev; ends at Done.
- **Security approval:** required before sending redacted titles to the Claude API. LLM is off by default (FR6).
- **RAG thresholds:** the defaults in FR5 are accepted.
- **Tech stack:** no preference stated; Node/TypeScript + React + SQLite adopted (Section 6).

### Still Open
1. **Internal-only marker:** unknown at this time. The exclusion rule stays configurable with default "none", and the warning banner remains until a rule is set or "no exclusions" is chosen explicitly. Needs your Jira admin.
2. **Confluence targets:** space, parent page, and "Latest Status" page will be supplied later. Publishing is blocked until configured; everything before it works without them.
3. **Security approval reference:** the approval itself (ticket or sign-off) is pending, so LLM drafting is unavailable until it's obtained.

## 12. Future Enhancements (not in v1)

- Scheduled drafts for review.
- Week-over-week trends and velocity charts.
- Per-epic owner views for internal use.
- Additional delivery channels (email, PDF).
