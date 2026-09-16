# Specification: Weekly Status Report Generator (Jira/Confluence Automation)

## Overview

**Project Name:** Weekly Status Report Generator
**Version:** 1.0 (SpecKit Format)
**Product Manager:** Avinash Agarwal
**Status:** Active Development

---

## Problem Statement

As a Product Manager overseeing a 3-person team on a CRM project, producing a weekly status report for cross-functional stakeholders currently requires manually pulling data out of Jira, reformatting it, and copy-pasting the result into Confluence. This process is:

- **Time-consuming:** Repetitive manual data pulls and formatting every week.
- **Error-prone:** Manual transcription risks stale or inconsistent numbers.
- **Inconsistent:** Report structure/format can drift week to week.

**Goal:** Automate generation of a stakeholder-ready weekly status report from Jira sprint data, with a PM review step, publishing the approved result to a single persistent Confluence page.

---

## Objectives

### Primary Objectives
1. Automate pulling sprint data from Jira into a structured report.
2. Eliminate manual copy/paste into Confluence.
3. Keep report format and content consistent week over week.

### Secondary Objectives
1. Give the PM a review/approval step before anything is published.
2. Keep report content accessible to stakeholders without Jira context.
3. Leave room for future scheduling/trend features without over-building now.

---

## Requirements

### Functional Requirements

#### FR1: Jira Data Retrieval
```
Given: The Atlassian/Jira MCP connector is authorized
When: The PM invokes the report generator
Then: The system retrieves, for the configured board/sprint:
  - Issues in Done/Resolved status (completed this week)
  - Issues in In Progress / To Do status (in progress / planned)
  - Issues flagged/status = Blocked
  - Story points and issue counts by status
```

**Acceptance Criteria:**
- Data is scoped to the single configured board/sprint (no cross-project bleed).
- Missing/absent blockers produce an empty result, not an error.
- Issues are retrievable with their workstream/epic association for grouping.

#### FR2: Report Assembly (5 Sections)

**Section 1: Executive Summary**
```
Content:
- 2-3 sentence narrative: overall health, one key highlight, one key risk (if any)
- Health signal derived from blocker count and % sprint completion
```

**Section 2: Completed This Week**
```
Content:
- Issues moved to Done/Resolved within the reporting period
- Grouped by workstream/epic (no per-person breakdown)
```

**Section 3: In Progress / Planned Next**
```
Content:
- Current in-progress issues
- Planned/To Do issues for the coming week
- Grouped by workstream/epic
```

**Section 4: Risks / Blockers**
```
Content:
- Issues with Blocked status/flag
- Explicit "no current blockers" message when list is empty
```

**Section 5: Sprint Metrics**
```
Content:
- % complete: story points (or issue count) done vs. total committed
- Issue counts by status: To Do / In Progress / Blocked / Done
```

#### FR3: Review & Approval
```
System behavior:
1. Draft report is assembled from live Jira data.
2. Draft is presented to the PM for review/edit.
3. Publish to Confluence only proceeds after explicit PM approval.
```

**Acceptance Criteria:**
- No Confluence write occurs before approval is given.
- PM can edit draft content before approval.

#### FR4: Confluence Publish
```
Output Specifications:
- Target: a single, persistent Confluence page (space + page ID configured once)
- Behavior: full-body replace of the page content with the approved report
- History: relies on Confluence's native page version history (no new child page per week)
```

**Acceptance Criteria:**
- Page content after publish matches the approved draft exactly.
- Prior week's content is fully replaced, not appended.

### Non-Functional Requirements

#### NFR1: Performance
- Full fetch-draft-publish flow completes in well under a minute for a typical sprint (≤ ~100 issues).

#### NFR2: Reliability
- MCP authorization failures produce a clear, actionable message (not a silent failure).
- Missing configuration (board/sprint ID, Confluence page) produces a clear setup-needed message.

#### NFR3: Usability
- Report language is accessible to stakeholders unfamiliar with Jira terminology.
- No per-person callouts in the stakeholder-facing report.

#### NFR4: Security
- No Jira/Confluence credentials are handled directly by this project — access is delegated to the authorized MCP connector.
- Any locally stored configuration (board/sprint ID, page target) contains no secrets.

#### NFR5: Maintainability
- Fetch and formatting logic are separated per section (per [backlog.md](../backlog.md) Phase 2 breakdown), so either can change independently.

---

## Data Requirements

### Jira Integration (via MCP)

#### Required Data Points
- Sprint/board identifier (configured once)
- Per issue: title, status, epic/workstream link, story points, blocked flag/status

#### Scope Filter
```
Board/Sprint ID: <configured at setup>
```
No ad-hoc JQL, no full-project pull — strictly the configured board/sprint.

### Sprint Metrics Calculations

#### % Complete
```
Formula: (story points or issues Done) / (total committed) × 100
```

#### Status Counts
```
Count of issues per status: To Do, In Progress, Blocked, Done
```

---

## User Workflow

### Primary Workflow: Generate & Publish Weekly Report
```
1. PM invokes the /weekly-report slash command.
2. System fetches Jira data for the configured board/sprint via MCP.
3. System assembles the 5-section report (Exec Summary, Completed, In Progress/Planned, Risks/Blockers, Metrics).
4. System presents the draft to the PM.
5. PM reviews/edits and approves.
6. System publishes the approved content to the configured Confluence page, replacing prior content.
```

### Error Recovery Workflows

#### Scenario 1: MCP Not Authorized
```
1. System attempts to call the Jira/Confluence MCP connector.
2. Call fails due to missing authorization.
3. System displays: "Jira/Confluence connector not authorized — authorize it via /mcp before running this report."
```

#### Scenario 2: Missing Configuration
```
1. System looks up configured board/sprint ID or Confluence page target.
2. Value is not set.
3. System displays a setup-needed message identifying exactly which config item is missing.
```

#### Scenario 3: Empty Sprint
```
1. System fetches sprint data.
2. No completed, in-progress, or blocked issues found.
3. System still generates a valid report, with each section stating there is nothing to report rather than rendering blank.
```

---

## Technology Stack

- **Frontend:** React 18 + Vite (for any future draft-review UI)
- **Backend:** Node.js + Express (orchestrates Jira/Confluence MCP calls, assembles report)
- **Database:** PostgreSQL 15, via Docker (stores configuration and run history)
- **Integration:** Jira and Confluence via Atlassian MCP connector
- **Invocation:** Claude Code slash command / skill (`/weekly-report`)

See [constitution.md](constitution.md) for the governing engineering principles for this stack.

---

## System Architecture

### Component Design

#### 1. Config Store
```
Responsibility: Persist board/sprint ID and Confluence page target
Storage: PostgreSQL
```

#### 2. Jira Fetch Layer
```
Responsibility: Retrieve issues for the configured board/sprint via MCP
Methods:
  - fetchCompleted()
  - fetchInProgressAndPlanned()
  - fetchBlocked()
  - fetchMetrics()
```

#### 3. Report Assembler
```
Responsibility: Group and format fetched data into the 5-section markdown report
Methods:
  - buildExecutiveSummary()
  - buildCompletedSection()
  - buildInProgressSection()
  - buildRisksSection()
  - buildMetricsSection()
  - assembleReport()
```

#### 4. Review Gate
```
Responsibility: Present draft to PM and block publish until approved
```

#### 5. Confluence Publish Layer
```
Responsibility: Replace the configured Confluence page's body with the approved report
```

### Data Flow
```
/weekly-report invoked
    ↓
Config lookup (board/sprint ID, Confluence page)
    ↓
Jira MCP fetch (completed, in-progress, blocked, metrics)
    ↓
Report assembly (5 sections)
    ↓
PM review & approval
    ↓
Confluence MCP publish (full-body replace)
```

---

## Implementation Plan

See [backlog.md](../backlog.md) for the full phased task breakdown (Setup, Core Features, Integration, Testing, Documentation).

---

## Testing Strategy

### Automated Tests
- Grouping logic (workstream/epic) — multiple issues, single issue, no issues.
- Sprint metrics calculation — normal, zero-total, all-complete cases.
- Blocker formatting — including empty-state message.
- Executive summary health-signal derivation.

### Manual Acceptance Tests
- End-to-end dry run against a real configured sprint.
- Empty-sprint edge case produces a sensible, non-blank report.
- Review/approval gate actually blocks publish until confirmed.
- Confluence page is fully replaced, not appended, after publish.

---

## Success Criteria

- [ ] Report is generated from live Jira data with no manual data entry.
- [ ] All 5 sections render correctly, including empty-state messaging.
- [ ] No Confluence write occurs without explicit PM approval.
- [ ] Confluence page reflects the approved report exactly after publish.
- [ ] MCP authorization and missing-config failures produce clear, actionable messages.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| MCP connector not authorized | Medium | High | Clear setup error directing PM to authorize via `/mcp` |
| Board/sprint or Confluence page misconfigured | Medium | Medium | Explicit missing-config messaging naming the exact item |
| Empty sprint data | Low | Low | Explicit empty-state messaging per section |
| Confluence full-page overwrite removes unrelated content | Low | Medium | Page is dedicated to this report only; scope confirmed at setup |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Board/Sprint** | The single Jira board or sprint this report is scoped to |
| **Workstream/Epic** | Grouping used to organize issues in the report instead of by assignee |
| **MCP** | Model Context Protocol — used here to connect to Jira/Confluence without custom API code |
| **Blocked** | Jira status/flag used to identify risks for the Risks/Blockers section |

---

## Document History

| Version | Date | Author | Change Summary |
|---------|------|--------|-----------------|
| 1.0 | 2026-09-16 | Claude Code | Initial SpecKit-format specification for weekly status report generator, replacing prior unrelated specification.md content |

---

## Sign-off

**Product Manager:** Avinash Agarwal
**Status:** Ready for Implementation
