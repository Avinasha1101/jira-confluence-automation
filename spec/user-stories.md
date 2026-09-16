# User Stories: Weekly Status Report Generator

## Overview

This document contains detailed user stories for the Manager.AI Weekly Status Report Generator, organized by persona and feature area.

**Version:** 1.0  
**Date:** December 25, 2024  
**Product Manager:** Avinash Agarwal

---

## Personas

### Primary Personas

#### 1. **Avinash - Product Manager**
- **Role:** Team lead for 3-person development team (Rohit, Rajiv, Jagan)
- **Goals:** 
  - Save time on weekly status reporting
  - Maintain stakeholder visibility
  - Identify and communicate risks early
- **Pain Points:**
  - Spends 1-2 hours weekly copying data from Jira
  - Manual process prone to errors and omissions
  - Stakeholders need consistent updates
- **Tech Savvy:** High - comfortable with Claude Code and command-line tools

#### 2. **Stakeholder - Cross-Functional Manager**
- **Role:** Engineering manager in dependent team
- **Goals:**
  - Understand project progress at a glance
  - Identify blockers affecting their team
  - Plan dependencies
- **Pain Points:**
  - Needs regular updates but doesn't want to dig through Jira
  - Inconsistent report formats make it hard to track trends
  - Delayed visibility into blockers
- **Tech Savvy:** Medium - reads Confluence, minimal Jira usage

#### 3. **Team Member - Developer**
- **Role:** Individual contributor (Rohit, Rajiv, or Jagan)
- **Goals:**
  - Work is accurately represented to stakeholders
  - No personal performance tracking (privacy)
  - Blockers escalated appropriately
- **Pain Points:**
  - Concerned about misrepresentation of work
  - Uncomfortable with individual metrics being shared
- **Tech Savvy:** High - uses Jira daily

---

## Epic 1: Report Generation

### US-001: Generate Weekly Report from Jira Sprint

**As a** Product Manager  
**I want to** generate a weekly status report from my current sprint with a single command  
**So that** I can save time and ensure accurate data in stakeholder updates

**Acceptance Criteria:**
- [ ] I can execute `/weekly-report` command in Claude Code
- [ ] System retrieves all issues from configured sprint automatically
- [ ] Report is generated within 30 seconds
- [ ] All 5 sections are populated with current sprint data
- [ ] I see a preview before publishing
- [ ] System handles sprints with 0-100+ issues

**Story Points:** 8  
**Priority:** Must Have  
**Dependencies:** MCP Jira connector authorized

**Test Scenarios:**
1. **Happy Path:** Sprint with 20 issues across 3 epics
   - Expected: Report shows all 20 issues grouped correctly
2. **Edge Case:** Empty sprint with no issues
   - Expected: Report shows "No issues" messages in all sections
3. **Edge Case:** Sprint with 100+ issues
   - Expected: Report still generates in <30s, all issues included

---

### US-002: Generate Report from Board Instead of Sprint

**As a** Product Manager  
**I want to** generate reports from my Kanban board (not just sprints)  
**So that** I can use the tool even without formal sprints

**Acceptance Criteria:**
- [ ] I can configure `query_type: "board"` in settings
- [ ] System retrieves all active board issues
- [ ] Report uses board status columns for grouping
- [ ] "Sprint" terminology replaced with "Board" in report
- [ ] Same 5-section structure maintained

**Story Points:** 5  
**Priority:** Must Have  
**Dependencies:** US-001

**Configuration Example:**
```json
{
  "jira": {
    "query_type": "board",
    "board_id": "67890"
  }
}
```

---

### US-003: Detect Completed Issues by Status Change

**As a** Product Manager  
**I want to** see only issues that were completed THIS sprint  
**So that** my report accurately reflects current sprint accomplishments

**Acceptance Criteria:**
- [ ] System uses Jira status change history (not just current status)
- [ ] Only issues that changed TO Done/Resolved DURING sprint period are included
- [ ] Issues completed before sprint start are excluded
- [ ] Issues completed after sprint end are excluded
- [ ] Report clearly shows completion date for each issue

**Story Points:** 5  
**Priority:** Must Have  
**Dependencies:** US-001

**JQL Implementation:**
```
status changed to (Done, Resolved) 
DURING (startOfSprint(), endOfSprint()) 
AND sprint = <sprint_id>
```

**Example Output:**
```markdown
### Epic: User Authentication
- **PROJ-123** - OAuth2 login flow (Completed: Dec 22, 2024)
- **PROJ-124** - Social login providers (Completed: Dec 23, 2024)
```

---

### US-004: Group Issues by Epic/Workstream

**As a** Product Manager  
**I want to** see issues grouped by epic/workstream  
**So that** stakeholders understand work organized by feature area

**Acceptance Criteria:**
- [ ] Issues with epic links are grouped under epic name
- [ ] Issues without epic go to "Unassigned" section
- [ ] Epic groups sorted alphabetically
- [ ] "Unassigned" group always appears last
- [ ] Each epic shows issue count and total story points

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** US-001

**Example Output:**
```markdown
## Completed This Week

### Epic: User Authentication System (3 issues, 10 pts)
- PROJ-123 - OAuth2 login flow (5 pts)
- PROJ-124 - Social login providers (3 pts)
- PROJ-125 - Password reset (2 pts)

### Epic: Dashboard Redesign (2 issues, 13 pts)
- PROJ-201 - Update layout (8 pts)
- PROJ-202 - Add metrics widgets (5 pts)

### Unassigned (1 issue, 1 pt)
- PROJ-999 - Fix production bug (1 pt)
```

---

### US-005: Calculate Sprint Health Indicator

**As a** Product Manager  
**I want to** see an automatic health indicator (Green/Yellow/Red)  
**So that** I can quickly communicate sprint status to leadership

**Acceptance Criteria:**
- [ ] Health calculated based on blocked issue percentage
- [ ] Green (🟢) if <10% of issues are blocked
- [ ] Yellow (🟡) if 10-25% of issues are blocked
- [ ] Red (🔴) if >25% of issues are blocked
- [ ] Health indicator shown prominently in Executive Summary
- [ ] Algorithm is configurable via settings

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** US-001

**Calculation:**
```
Blocked % = (Blocked Issues / Total Issues) × 100

Health = {
  Green   if Blocked% < 10%
  Yellow  if 10% ≤ Blocked% ≤ 25%
  Red     if Blocked% > 25%
}
```

**Example Output:**
```markdown
## Executive Summary

**Sprint:** Sprint 24 (Dec 18 - Dec 29, 2024)  
**Health:** 🟢 Green - On Track

Blocked Issues: 1 / 13 (7.7%)
```

---

### US-006: Display Sprint Metrics with Progress Bar

**As a** Stakeholder  
**I want to** see visual sprint progress at a glance  
**So that** I can quickly understand completion status

**Acceptance Criteria:**
- [ ] Completion percentage shown (completed / committed)
- [ ] Text-based progress bar displayed
- [ ] Metrics use configured preference (story points OR issue count)
- [ ] Status breakdown shows counts for all statuses
- [ ] If story points missing, falls back to issue count with warning

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** US-001

**Example Output (Story Points):**
```markdown
## Sprint Metrics

### Completion Progress
**23 / 25 story points completed (92%)**

Progress: ████████████████████░░ 92%

### Issue Breakdown by Status
- ✅ Done: 8 issues
- 🔄 In Progress: 3 issues
- 📋 To Do: 2 issues
- 🚫 Blocked: 0 issues

**Total Issues in Sprint:** 13
```

---

### US-007: Generate Executive Summary with AI

**As a** Product Manager  
**I want to** have an AI-generated executive summary  
**So that** I don't have to manually write narrative text

**Acceptance Criteria:**
- [ ] Summary is 2-3 sentences, <150 words
- [ ] Includes overall health assessment
- [ ] Highlights most significant completed item
- [ ] Mentions most critical blocker (if any)
- [ ] If no blockers, explicitly states "No current blockers"
- [ ] Tone is professional and stakeholder-appropriate

**Story Points:** 5  
**Priority:** Should Have  
**Dependencies:** US-005

**Example Output:**
```markdown
## Executive Summary

**Sprint:** Sprint 24 (Dec 18 - Dec 29, 2024)  
**Health:** 🟢 Green - On Track

The team is on track to complete 23 of 25 committed story points this sprint. 
Major highlight: User authentication API integration completed and deployed to 
staging, enabling social login for beta users. No current blockers identified.
```

---

## Epic 2: Publishing & Review

### US-008: Review Report Before Publishing

**As a** Product Manager  
**I want to** review the generated report before it's published  
**So that** I can verify accuracy and make mental notes for stakeholder communication

**Acceptance Criteria:**
- [ ] Full report displayed in Claude Code after generation
- [ ] Report shown in markdown format (easy to read)
- [ ] Clear prompt asks "Publish to Confluence?"
- [ ] Two options: "Yes, publish now" or "No, cancel"
- [ ] No automatic publishing without approval
- [ ] Report remains visible during review

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** US-001

**UI Flow:**
```
┌────────────────────────────────────────┐
│  Generated Report Preview              │
│                                        │
│  ## Executive Summary                  │
│  [Full report content here]            │
│                                        │
│  ## Sprint Metrics                     │
│  [Metrics here]                        │
└────────────────────────────────────────┘

Review the report above. Publish to Confluence?

[Yes, publish now]  [No, cancel]
```

---

### US-009: Publish Report to Confluence Page

**As a** Product Manager  
**I want to** publish the approved report to our team Confluence page  
**So that** stakeholders have persistent access to status updates

**Acceptance Criteria:**
- [ ] Report appended to configured Confluence page
- [ ] New report appears at TOP of page (most recent first)
- [ ] Timestamp added: "Published: [Month DD, YYYY] at [HH:MM AM/PM]"
- [ ] Horizontal separator (---) between reports
- [ ] All existing reports preserved unchanged
- [ ] If page doesn't exist, create it automatically
- [ ] Success message shows Confluence page URL

**Story Points:** 5  
**Priority:** Must Have  
**Dependencies:** US-008

**Page Structure:**
```markdown
# Weekly Status Reports - Manager.AI

---

## Report: Sprint 24 (Dec 18 - Dec 29, 2024)
*Published: Dec 29, 2024 at 3:45 PM*

[Full report content]

---

## Report: Sprint 23 (Dec 4 - Dec 15, 2024)
*Published: Dec 15, 2024 at 4:12 PM*

[Previous report content]

---
```

---

### US-010: Cancel Report Without Publishing

**As a** Product Manager  
**I want to** cancel report generation without publishing  
**So that** I can regenerate after fixing issues in Jira

**Acceptance Criteria:**
- [ ] "Cancel" option available during review
- [ ] No Confluence update occurs when cancelled
- [ ] Clear confirmation: "Report cancelled. Draft not published."
- [ ] Draft saved locally for reference
- [ ] I can re-run command immediately
- [ ] No side effects on Confluence

**Story Points:** 2  
**Priority:** Must Have  
**Dependencies:** US-008

**Success Message:**
```
✅ Report generation cancelled. Draft not published.

Draft saved to: .claude/drafts/weekly-report-2024-12-25.md

You can re-run /weekly-report when ready.
```

---

### US-011: Handle Confluence Version Conflicts

**As a** Product Manager  
**I want to** have automatic retry when Confluence page is edited concurrently  
**So that** my publish doesn't fail due to timing issues

**Acceptance Criteria:**
- [ ] System detects version conflict (409 error)
- [ ] Automatically fetches latest page version
- [ ] Retries publish with new version
- [ ] Up to 3 retry attempts
- [ ] Success after retry shows no error to user
- [ ] After 3 failures, saves draft locally with error message

**Story Points:** 3  
**Priority:** Should Have  
**Dependencies:** US-009

**Retry Logic:**
```
Attempt 1: Publish with version N
  → Conflict (page now version N+1)
  
Attempt 2: Fetch version N+1, publish with N+1
  → Conflict (page now version N+2)
  
Attempt 3: Fetch version N+2, publish with N+2
  → Success!
```

---

## Epic 3: Configuration & Setup

### US-012: Set Up Configuration on First Run

**As a** Product Manager  
**I want to** be guided through initial setup  
**So that** I can quickly configure the tool without reading documentation

**Acceptance Criteria:**
- [ ] On first run, system detects missing configuration
- [ ] Error message provides example configuration
- [ ] Clear instructions for each required field
- [ ] Link to full setup documentation
- [ ] Example values for EPAM Systems context
- [ ] After config created, tool runs successfully

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** None

**Error Message:**
```
❌ Configuration file not found

Please create '.claude/weekly-report-config.json' with your settings.

Example configuration:
{
  "project": {
    "name": "Manager.AI",
    "team": ["Rohit", "Rajiv", "Jagan"]
  },
  "jira": {
    "query_type": "sprint",
    "sprint_id": "YOUR_SPRINT_ID",
    "metric_preference": "story_points"
  },
  "confluence": {
    "space_key": "YOUR_SPACE",
    "page_title": "Weekly Status Reports - Manager.AI"
  }
}

How to find your Sprint ID:
1. Open your sprint in Jira
2. Copy ID from URL: .../sprint/12345
3. Paste as "sprint_id": "12345"

See full guide: README.md#configuration
```

---

### US-013: Validate Configuration on Load

**As a** Product Manager  
**I want to** get clear errors for invalid configuration  
**So that** I can fix issues quickly without trial and error

**Acceptance Criteria:**
- [ ] All required fields validated
- [ ] Data types checked (string, number, enum)
- [ ] Enum values validated (query_type, metric_preference)
- [ ] Logical constraints checked (green_max < yellow_max)
- [ ] Multiple errors reported together (not one at a time)
- [ ] Error messages show expected format

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** US-012

**Validation Errors Example:**
```
❌ Configuration validation failed (3 errors):

1. jira.query_type: Must be "sprint" or "board" (got: "spint")
2. jira.sprint_id: Required when query_type = "sprint" (missing)
3. report.health_thresholds.green_max: Must be < yellow_max (got: 25 >= 25)

Please fix these issues in .claude/weekly-report-config.json
```

---

### US-014: Configure Sprint vs Board Query Mode

**As a** Product Manager  
**I want to** choose between sprint-based and board-based queries  
**So that** the tool works for both Scrum and Kanban workflows

**Acceptance Criteria:**
- [ ] `query_type` setting accepts "sprint" or "board"
- [ ] If "sprint", `sprint_id` is required
- [ ] If "board", `board_id` is required
- [ ] Report terminology adapts (Sprint vs Board)
- [ ] Both modes produce same 5-section structure
- [ ] Configuration example provided for each mode

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** US-012

**Configuration (Sprint Mode):**
```json
{
  "jira": {
    "query_type": "sprint",
    "sprint_id": "12345"
  }
}
```

**Configuration (Board Mode):**
```json
{
  "jira": {
    "query_type": "board",
    "board_id": "67890"
  }
}
```

---

### US-015: Configure Story Points vs Issue Count Preference

**As a** Product Manager  
**I want to** choose whether to use story points or issue counts in metrics  
**So that** reports match my team's estimation practices

**Acceptance Criteria:**
- [ ] `metric_preference` setting accepts "story_points" or "issue_count"
- [ ] If "story_points", report shows point values throughout
- [ ] If "issue_count", report shows issue counts throughout
- [ ] If story points missing and preference = points, fallback to counts with warning
- [ ] Metrics section adapts labels accordingly

**Story Points:** 2  
**Priority:** Must Have  
**Dependencies:** US-012

**Example (Story Points Preference):**
```markdown
### Completion Progress
**23 / 25 story points completed (92%)**

### Epic: User Authentication (3 issues, 10 pts)
```

**Example (Issue Count Preference):**
```markdown
### Completion Progress
**8 / 13 issues completed (62%)**

### Epic: User Authentication (3 issues)
```

---

### US-016: Map Custom Jira Statuses to Categories

**As a** Product Manager  
**I want to** map my team's custom Jira statuses to standard categories  
**So that** the tool works with our workflow configuration

**Acceptance Criteria:**
- [ ] Configuration supports `status_mappings` object
- [ ] Four categories: done, in_progress, to_do, blocked
- [ ] Each category accepts array of status names
- [ ] Status matching is case-insensitive
- [ ] Unmapped statuses logged as warnings
- [ ] Default mappings provided for common statuses

**Story Points:** 3  
**Priority:** Should Have  
**Dependencies:** US-012

**Configuration Example:**
```json
{
  "jira": {
    "status_mappings": {
      "done": ["Done", "Resolved", "Closed", "Deployed"],
      "in_progress": ["In Progress", "In Review", "Code Review", "Testing"],
      "to_do": ["To Do", "Backlog", "Open", "Selected for Development"],
      "blocked": ["Blocked", "Impediment", "On Hold", "Waiting"]
    }
  }
}
```

---

## Epic 4: Error Handling & Resilience

### US-017: Handle Jira Connection Failures

**As a** Product Manager  
**I want to** get clear guidance when Jira connection fails  
**So that** I can resolve the issue without technical support

**Acceptance Criteria:**
- [ ] MCP connection errors detected
- [ ] Error message explains likely causes
- [ ] Troubleshooting steps provided
- [ ] Retry occurs automatically (up to 3 times)
- [ ] After retries exhausted, user-friendly error shown
- [ ] Link to documentation provided

**Story Points:** 3  
**Priority:** Must Have  
**Dependencies:** US-001

**Error Message:**
```
❌ Failed to connect to Jira

Error: MCP connector not responding (timeout after 10s)

Troubleshooting steps:
1. Check MCP server status: /mcp-status
2. Verify Atlassian/Jira MCP server is installed
3. Ensure MCP server is authorized in Claude Code settings
4. Check your network connection
5. Try again in a few moments

Attempts: 3/3 failed

If problem persists:
- Restart Claude Code
- See: README.md#troubleshooting-jira-connection
```

---

### US-018: Handle Empty Sprint Gracefully

**As a** Product Manager  
**I want to** still get a report when my sprint has no issues  
**So that** I can communicate to stakeholders even during setup phases

**Acceptance Criteria:**
- [ ] Empty sprint detected (0 issues)
- [ ] Report still generates successfully
- [ ] All 5 sections present
- [ ] Each section shows appropriate "No issues" message
- [ ] Health indicator shows Green (no blockers possible)
- [ ] Metrics show 0/0 (100% or N/A)

**Story Points:** 2  
**Priority:** Should Have  
**Dependencies:** US-001

**Example Output:**
```markdown
## Executive Summary

**Sprint:** Sprint 25 (Jan 1 - Jan 12, 2025)  
**Health:** 🟢 Green - On Track

Sprint contains no issues. This may be a new sprint or backlog is being refined.

---

## Completed This Week

No issues completed this sprint.

---

## In Progress / Planned Next

No issues currently in progress or planned.

---

## Risks / Blockers

✅ No current blockers identified

---

## Sprint Metrics

### Completion Progress
**0 / 0 story points committed (N/A)**

### Issue Breakdown by Status
- ✅ Done: 0 issues
- 🔄 In Progress: 0 issues
- 📋 To Do: 0 issues
- 🚫 Blocked: 0 issues

**Total Issues in Sprint:** 0
```

---

### US-019: Handle Missing Story Points

**As a** Product Manager  
**I want to** get meaningful metrics even when story points are missing  
**So that** reports work during sprint planning or for non-estimating teams

**Acceptance Criteria:**
- [ ] System detects when issues lack story points
- [ ] If metric_preference = "story_points" but points missing, falls back to counts
- [ ] Warning message shown to user
- [ ] Report clearly indicates fallback mode
- [ ] No report generation failure

**Story Points:** 2  
**Priority:** Must Have  
**Dependencies:** US-015

**Warning Message:**
```
⚠️  Warning: Story points missing from 8/13 issues

Falling back to issue count for metrics calculation.

To use story points:
1. Add estimates to all sprint issues in Jira
2. Re-run /weekly-report

Report will continue using issue counts...
```

---

### US-020: Save Draft When Confluence Publish Fails

**As a** Product Manager  
**I want to** preserve my report if publishing fails  
**So that** I don't lose work and can publish manually if needed

**Acceptance Criteria:**
- [ ] Draft saved to `.claude/drafts/` before publish attempt
- [ ] Filename includes date: `weekly-report-YYYY-MM-DD.md`
- [ ] If publish fails, draft location shown in error
- [ ] Manual publish instructions provided
- [ ] Draft includes full report with all sections

**Story Points:** 3  
**Priority:** Should Have  
**Dependencies:** US-009

**Error Message:**
```
❌ Confluence publishing failed

Error: Permission denied for page "Weekly Status Reports"

✅ Your report has been saved to:
   .claude/drafts/weekly-report-2024-12-25.md

To publish manually:
1. Open: https://company.atlassian.net/wiki/spaces/MNGR/pages/123456
2. Click "Edit" 
3. Copy content from draft file
4. Paste at top of page
5. Click "Publish"

To fix permissions:
Contact your Confluence admin to request edit access for this page.
```

---

## Epic 5: Stakeholder Experience

### US-021: Read Report on Confluence (Stakeholder)

**As a** Stakeholder  
**I want to** view the latest status report on Confluence  
**So that** I can stay informed without bothering the PM

**Acceptance Criteria:**
- [ ] Reports published to known Confluence page
- [ ] Page title is consistent and findable
- [ ] Latest report always at top (easy to find)
- [ ] Report format is readable (good markdown rendering)
- [ ] Historical reports accessible by scrolling down
- [ ] Timestamp shows when report was published

**Story Points:** N/A (Read-only, no development)  
**Priority:** Must Have  
**Dependencies:** US-009

**Stakeholder Experience:**
```
1. Navigate to Confluence space
2. Find "Weekly Status Reports - Manager.AI" page (bookmarked)
3. See latest report at top with clear date
4. Read Executive Summary for quick status
5. Drill into sections as needed
6. Scroll down for historical context if needed
```

---

### US-022: Understand Report Without Jira Knowledge (Stakeholder)

**As a** Stakeholder  
**I want to** understand the report without deep Jira familiarity  
**So that** I can focus on project status, not tooling

**Acceptance Criteria:**
- [ ] No Jira-specific terminology (use "Issues" not "Stories")
- [ ] Health indicator is visual (🟢🟡🔴) not text codes
- [ ] Status badges are intuitive (✅ Done, 🔄 In Progress)
- [ ] Epics explained as "workstreams" in context
- [ ] Metrics shown as percentages, not raw numbers only
- [ ] Executive Summary provides narrative context

**Story Points:** N/A (Content/UX focus)  
**Priority:** Must Have  
**Dependencies:** US-001

**Example Stakeholder-Friendly Content:**
```markdown
## Executive Summary

**Sprint:** Sprint 24 (Dec 18 - Dec 29, 2024)  
**Health:** 🟢 Green - On Track (7.7% of work blocked)

The team is 92% complete with this sprint's goals. Major milestone: 
User login system is now live in staging. No significant blockers.
```

---

### US-023: Identify Blockers Affecting My Team (Stakeholder)

**As a** Stakeholder  
**I want to** quickly see if there are blockers I need to help resolve  
**So that** I can take action and unblock dependent teams

**Acceptance Criteria:**
- [ ] Blockers section prominently placed (Section 4)
- [ ] Each blocker clearly states the issue
- [ ] Blocker reason/description included
- [ ] If no blockers, explicitly states this (reduces anxiety)
- [ ] Blocker list sorted for readability

**Story Points:** N/A (Read-only, no development)  
**Priority:** Must Have  
**Dependencies:** US-001

**Example Blocker Section:**
```markdown
## Risks / Blockers

- **PROJ-126** - Add two-factor authentication  
  *Blocked by:* Waiting on security team approval for SMS provider integration  
  *Impact:* Delays user authentication feature by 3-5 days
  
- **PROJ-204** - Create user preferences panel  
  *Blocked by:* Dependency on PROJ-203 data export feature completion  
  *Impact:* Must complete PROJ-203 first (in progress, due Dec 27)
```

---

## Epic 6: Team Privacy & Transparency

### US-024: Ensure No Individual Performance Metrics (Team Member)

**As a** Team Member  
**I want to** ensure my individual productivity is NOT tracked in reports  
**So that** I feel comfortable with transparent status updates

**Acceptance Criteria:**
- [ ] No per-person issue counts in any section
- [ ] No per-person story points completed
- [ ] No per-person velocity metrics
- [ ] No assignee names shown in issue lists
- [ ] Only team-level aggregates reported
- [ ] Privacy explicitly stated in README

**Story Points:** N/A (Design constraint)  
**Priority:** Must Have  
**Dependencies:** US-001

**Anti-Pattern (NOT ALLOWED):**
```markdown
❌ Team Performance:
- Rohit: 8 story points completed
- Rajiv: 7 story points completed
- Jagan: 8 story points completed
```

**Correct Pattern:**
```markdown
✅ Sprint Metrics:
**23 / 25 story points completed (92%)**
Team is on track to meet sprint goals.
```

---

### US-025: Verify Work Representation Accuracy (Team Member)

**As a** Team Member  
**I want to** see that my work is accurately reflected in stakeholder reports  
**So that** my contributions are properly communicated

**Acceptance Criteria:**
- [ ] All completed issues appear in report
- [ ] Issue summaries match Jira exactly
- [ ] Epic assignments reflected correctly
- [ ] Story points shown accurately
- [ ] No work omitted or misrepresented

**Story Points:** N/A (Quality assurance)  
**Priority:** Must Have  
**Dependencies:** US-001, US-008

**PM Review Step:**
During US-008 (PM Review), PM can verify:
- All team members' completed work is visible
- No issues accidentally excluded
- Epic groupings make sense
- Report reflects team accomplishments fairly

---

## Epic 7: Administration & Maintenance

### US-026: Update Configuration for New Sprint

**As a** Product Manager  
**I want to** easily update sprint ID when a new sprint starts  
**So that** reports pull from the correct sprint

**Acceptance Criteria:**
- [ ] Configuration file is human-readable JSON
- [ ] I can edit with any text editor
- [ ] Changes take effect immediately (no restart needed)
- [ ] Invalid changes caught with clear error message
- [ ] Example provided in README for sprint transitions

**Story Points:** 1  
**Priority:** Must Have  
**Dependencies:** US-012

**Update Process:**
```bash
# 1. Open configuration
notepad .claude/weekly-report-config.json

# 2. Update sprint_id
{
  "jira": {
    "sprint_id": "12346"  # Changed from 12345 to 12346
  }
}

# 3. Save file

# 4. Run report with new sprint
/weekly-report
```

---

### US-027: Troubleshoot MCP Connection Issues

**As a** Product Manager  
**I want to** have a troubleshooting command for MCP issues  
**So that** I can resolve connection problems independently

**Acceptance Criteria:**
- [ ] `/weekly-report --diagnose` command available
- [ ] Checks MCP Jira connector status
- [ ] Checks MCP Confluence connector status
- [ ] Validates configuration
- [ ] Tests Jira query with sample data
- [ ] Provides specific fix recommendations

**Story Points:** 5  
**Priority:** Should Have  
**Dependencies:** US-017

**Diagnostic Output:**
```
Running diagnostics...

✅ Configuration file: Valid (.claude/weekly-report-config.json)
✅ MCP Jira connector: Authorized and connected
✅ MCP Confluence connector: Authorized and connected
✅ Jira sprint query: Success (found 13 issues in sprint 12345)
⚠️  Confluence page: Not found (will be created on first publish)

Diagnosis: All systems operational

You can safely run: /weekly-report
```

---

### US-028: View Report History on Confluence

**As a** Product Manager  
**I want to** see all historical reports on one page  
**So that** I can reference past status updates easily

**Acceptance Criteria:**
- [ ] All reports preserved on same Confluence page
- [ ] Reports sorted newest-first (chronological)
- [ ] Each report has clear timestamp
- [ ] Horizontal separators between reports for readability
- [ ] Page table of contents auto-generated (if Confluence supports)
- [ ] Page doesn't become unmanageably large (archive strategy for >50 reports)

**Story Points:** 2  
**Priority:** Should Have  
**Dependencies:** US-009

**Page Structure (After 4 Sprints):**
```markdown
# Weekly Status Reports - Manager.AI

## Report: Sprint 27 (Jan 15 - Jan 26, 2025)
*Published: Jan 26, 2025 at 2:15 PM*
[Latest report]

---

## Report: Sprint 26 (Jan 1 - Jan 12, 2025)
*Published: Jan 12, 2025 at 4:30 PM*
[Previous report]

---

## Report: Sprint 25 (Dec 18 - Dec 29, 2024)
*Published: Dec 29, 2024 at 3:45 PM*
[Older report]

---

## Report: Sprint 24 (Dec 4 - Dec 15, 2024)
*Published: Dec 15, 2024 at 5:00 PM*
[Oldest report]
```

---

## Story Mapping & Prioritization

### Release 1.0 (MVP) - Target: January 25, 2025

**Must Have (Blocking launch):**
- US-001: Generate report from sprint ⭐⭐⭐
- US-002: Generate report from board ⭐⭐⭐
- US-003: Detect completed issues ⭐⭐⭐
- US-004: Group by epic ⭐⭐⭐
- US-005: Calculate health indicator ⭐⭐⭐
- US-006: Display metrics ⭐⭐⭐
- US-008: Review before publishing ⭐⭐⭐
- US-009: Publish to Confluence ⭐⭐⭐
- US-010: Cancel without publishing ⭐⭐
- US-012: Setup configuration ⭐⭐⭐
- US-013: Validate configuration ⭐⭐⭐
- US-014: Configure sprint vs board ⭐⭐⭐
- US-015: Configure metric preference ⭐⭐⭐
- US-017: Handle Jira failures ⭐⭐⭐
- US-019: Handle missing story points ⭐⭐
- US-024: No individual metrics ⭐⭐⭐

**Should Have (Nice to have for launch):**
- US-007: AI executive summary ⭐⭐
- US-011: Handle version conflicts ⭐⭐
- US-016: Map custom statuses ⭐⭐
- US-018: Handle empty sprint ⭐
- US-020: Save draft on failure ⭐⭐

**Could Have (Defer to 1.1):**
- US-027: Diagnostics command ⭐
- US-028: Report history view ⭐

---

## Estimation Summary

| Epic | Total Story Points |
|------|-------------------|
| Epic 1: Report Generation | 32 pts |
| Epic 2: Publishing & Review | 13 pts |
| Epic 3: Configuration | 14 pts |
| Epic 4: Error Handling | 10 pts |
| Epic 7: Administration | 6 pts |
| **Total (MVP)** | **75 pts** |

**Velocity Assumption:** 15-20 pts/week (solo developer)  
**Timeline:** 4-5 weeks → Target: Jan 25, 2025 ✅

---

## Acceptance Testing Checklist

### End-to-End Happy Path Test
- [ ] Configure tool for first time
- [ ] Run `/weekly-report` command
- [ ] Verify all 5 sections populated
- [ ] Verify health indicator correct
- [ ] Approve and publish to Confluence
- [ ] Verify Confluence page updated
- [ ] Verify report readable by non-technical stakeholder

### Edge Case Testing
- [ ] Empty sprint (0 issues)
- [ ] Sprint with no epics (all unassigned)
- [ ] Sprint with no blockers
- [ ] Sprint with >25% blockers (red health)
- [ ] Issues missing story points
- [ ] Board query instead of sprint
- [ ] Sprint with 100+ issues
- [ ] Concurrent Confluence edits (version conflict)

### Error Scenario Testing
- [ ] Missing configuration file
- [ ] Invalid configuration values
- [ ] MCP Jira not authorized
- [ ] MCP Confluence not authorized
- [ ] Network timeout during Jira fetch
- [ ] Confluence publish failure
- [ ] Invalid sprint ID
- [ ] Invalid board ID

---

## User Story Template

For future stories, use this template:

```markdown
### US-XXX: [Story Title]

**As a** [persona]  
**I want to** [action]  
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Story Points:** X  
**Priority:** Must Have | Should Have | Could Have  
**Dependencies:** US-YYY, US-ZZZ

**Test Scenarios:**
1. Scenario description → Expected outcome
2. Edge case → Expected handling

**Example Output:**
```
[Code or mockup]
```
```

---

*End of User Stories Document*
