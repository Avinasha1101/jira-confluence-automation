# Specification: Weekly Status Report Generator (Manager.AI)

## Overview

**Project Name:** Manager.AI - Weekly Status Report Generator  
**Version:** 1.0  
**Date:** December 25, 2024  
**Product Manager:** Avinash Agarwal  
**Company:** EPAM Systems  
**Team:** Rohit, Rajiv, Jagan  
**Status:** Active Development  
**Target Delivery:** January 25, 2025

---

## Problem Statement

Product Managers at EPAM Systems currently spend significant time manually creating weekly status reports for stakeholders. This manual process involves:

- **Time-consuming:** 1-2 hours per week copying data from Jira
- **Error-prone:** Manual data entry leads to inconsistencies and outdated information
- **Repetitive:** Same format and structure every week with different data
- **Context switching:** Constant switching between Jira, Confluence, and report formatting
- **Stakeholder confusion:** Inconsistent reporting makes it difficult for cross-functional teams to track progress

**Goal:** Create an automated system that generates stakeholder-ready weekly status reports from Jira data and publishes them to Confluence with minimal PM intervention.

---

## Objectives

### Primary Objectives
1. **Automate report generation** from Jira sprint/board data using MCP tools
2. **Reduce manual effort** by 90% (from 1-2 hours to < 10 minutes per week)
3. **Ensure consistency** across all weekly reports with standardized format
4. **Improve accuracy** by eliminating manual data entry errors
5. **Maintain single source of truth** via persistent Confluence page updates

### Secondary Objectives
1. **Provide PM review workflow** before publishing to stakeholders
2. **Support flexible configuration** (board vs. sprint, story points vs. count)
3. **Handle edge cases gracefully** (no blockers, unassigned epics, missing data)
4. **Enable easy troubleshooting** with clear error messages and validation

---

## Stakeholders

### Primary Users
- **Product Managers** - Generate and review reports before publishing
- **Scrum Masters** - Monitor sprint progress and identify blockers

### Report Audience
- **Cross-functional stakeholders** - Engineering managers, dependent teams, other departments
- **Leadership** - Executive visibility into project health and risks
- **External partners** - Teams waiting on deliverables or providing dependencies

### Excluded from Report
- Individual contributor performance metrics
- Personal productivity data
- Time tracking or hour-level details

---

## Requirements

### Functional Requirements

#### FR1: Jira Data Retrieval via MCP

```
Given: MCP Atlassian/Jira connector is authorized and configured
When: User executes the `/weekly-report` command
Then: System retrieves sprint data from configured Jira board/sprint including:
  - All issues in the sprint/board scope
  - Issue fields: key, summary, status, epic/workstream, story points, blocked flag
  - Sprint metadata: name, start date, end date, committed points
  - Status change history for completion detection
```

**Acceptance Criteria:**
- System connects to Jira via MCP within 5 seconds
- Supports both Board ID and Sprint ID configuration options
- Returns complete issue data with all required fields
- Handles missing optional fields (story points, epic) gracefully
- Validates data completeness before proceeding to generation

**Configuration Options:**
```yaml
jira:
  query_type: "sprint"  # or "board"
  sprint_id: "12345"     # if query_type = sprint
  board_id: "67890"      # if query_type = board
  metric_preference: "story_points"  # or "issue_count"
```

#### FR2: Completion Detection Logic

```
Given: Issue status history is available
When: Determining "Completed This Week" issues
Then: System identifies issues where:
  - Status changed TO "Done" or "Resolved" 
  - Status change occurred WITHIN the current sprint period
  - Issue was part of the sprint commitment
```

**Acceptance Criteria:**
- Uses Jira status change history (not just current status)
- Filters by sprint start/end dates
- Excludes issues completed before sprint start
- Excludes issues completed after sprint end
- Handles issues with multiple status transitions correctly

**Implementation Note:**
Use MCP Jira query with JQL filter:
```
status changed to (Done, Resolved) 
DURING (startOfSprint(), endOfSprint()) 
AND sprint = <sprint_id>
```

#### FR3: Report Generation (5-Section Structure)

**Section 1: Executive Summary**

```
Content:
- Overall health indicator (Green/Yellow/Red with icon)
- Sprint name and dates
- 2-3 sentence narrative covering:
  * Overall sprint health assessment
  * One key highlight (major completion or milestone)
  * One key risk (if any blockers exist)
```

**Health Calculation Algorithm:**
```
Blocked Issue Percentage = (Blocked Issues Count / Total Issues Count) × 100

IF Blocked% < 10% THEN Health = 🟢 Green (On Track)
ELSE IF Blocked% >= 10% AND Blocked% <= 25% THEN Health = 🟡 Yellow (At Risk)
ELSE IF Blocked% > 25% THEN Health = 🔴 Red (Blocked)
```

**Acceptance Criteria:**
- Health indicator calculated automatically based on blocker percentage
- Narrative is concise (2-3 sentences max, < 150 words)
- Highlight mentions most significant completed item or milestone
- Risk mentions most critical blocker (if any)
- If no blockers, explicitly states "No current blockers"

**Example Output:**
```markdown
## Executive Summary

**Sprint:** Sprint 24 (Dec 18 - Dec 29, 2024)  
**Health:** 🟢 Green - On Track

The team is on track to complete 23 of 25 committed story points this sprint. 
Major highlight: User authentication API integration completed and deployed to staging. 
No current blockers identified.
```

---

**Section 2: Completed This Week**

```
Content:
- Issues that moved to Done/Resolved within sprint period
- Grouped by workstream/epic
- Shows: Issue key, summary, story points (if configured)
- Sorted by epic name alphabetically
```

**Grouping Logic:**
```
FOR each completed issue:
  IF issue has epic link:
    Add to epic group
  ELSE:
    Add to "Unassigned" group
  END IF
END FOR

Sort groups alphabetically by epic name
Place "Unassigned" group at the end
```

**Acceptance Criteria:**
- All completed issues appear exactly once
- Issues grouped correctly by epic
- Unassigned issues appear in separate "Unassigned" section at bottom
- Each issue shows: key, summary, story points (if metric_preference = story_points)
- Empty section handled gracefully with message: "No issues completed this sprint"

**Example Output:**
```markdown
## Completed This Week

### Epic: User Authentication System
- **PROJ-123** - Implement OAuth2 login flow (5 pts)
- **PROJ-124** - Add social login providers (3 pts)
- **PROJ-125** - Create password reset functionality (2 pts)

### Epic: Dashboard Redesign
- **PROJ-201** - Update dashboard layout (8 pts)
- **PROJ-202** - Add real-time metrics widgets (5 pts)

### Unassigned
- **PROJ-999** - Fix production login bug (1 pt)
```

---

**Section 3: In Progress / Planned Next**

```
Content:
- Issues currently "In Progress" status
- Issues in "To Do" status (planned for sprint)
- Grouped by workstream/epic
- Shows: Issue key, summary, current status, story points
- Sorted by epic name alphabetically
```

**Acceptance Criteria:**
- Includes both In Progress AND To Do status issues
- Issues grouped correctly by epic
- Unassigned issues appear in separate "Unassigned" section at bottom
- Each issue shows: key, summary, status badge, story points
- Status badge format: `[In Progress]` or `[To Do]`
- Empty section handled gracefully with message: "No issues in progress or planned"

**Example Output:**
```markdown
## In Progress / Planned Next

### Epic: User Authentication System
- **PROJ-126** - [In Progress] Add two-factor authentication (8 pts)
- **PROJ-127** - [To Do] Implement session management (5 pts)

### Epic: Dashboard Redesign
- **PROJ-203** - [In Progress] Add data export feature (5 pts)
- **PROJ-204** - [To Do] Create user preferences panel (3 pts)

### Unassigned
- **PROJ-888** - [To Do] Update API documentation (2 pts)
```

---

**Section 4: Risks / Blockers**

```
Content:
- Issues with "Blocked" status or blocked flag set
- Shows: Issue key, summary, blocker reason/description
- Sorted by issue key
- If no blockers: explicit "No current blockers" message
```

**Detection Logic:**
```
Issue is blocked IF:
  - Status = "Blocked" OR
  - Blocked flag = true OR
  - Issue has "blocker" label
```

**Acceptance Criteria:**
- All blocked issues identified correctly
- Each blocker shows: key, summary, reason for block (from comments or description)
- If no blockers exist, shows: "✅ No current blockers identified"
- Blockers sorted by issue key for consistency

**Example Output (with blockers):**
```markdown
## Risks / Blockers

- **PROJ-126** - Add two-factor authentication  
  *Blocked by:* Waiting on security team approval for SMS provider integration

- **PROJ-204** - Create user preferences panel  
  *Blocked by:* Dependency on PROJ-203 data export feature completion
```

**Example Output (no blockers):**
```markdown
## Risks / Blockers

✅ **No current blockers identified**
```

---

**Section 5: Sprint Metrics**

```
Content:
- Story points (or issue count) completed vs. total committed
- Completion percentage with progress bar
- Issue count breakdown by status
- Velocity indicator (if applicable)
```

**Metrics Calculation:**

```
IF metric_preference = "story_points":
  completed_value = sum(story_points WHERE status = Done/Resolved)
  committed_value = sum(story_points WHERE issue in sprint)
  completion_percentage = (completed_value / committed_value) × 100

ELSE IF metric_preference = "issue_count":
  completed_value = count(issues WHERE status = Done/Resolved)
  committed_value = count(issues WHERE issue in sprint)
  completion_percentage = (completed_value / committed_value) × 100
END IF

Status breakdown:
  to_do_count = count(issues WHERE status = To Do)
  in_progress_count = count(issues WHERE status = In Progress)
  blocked_count = count(issues WHERE status = Blocked OR blocked flag = true)
  done_count = count(issues WHERE status = Done/Resolved)
```

**Acceptance Criteria:**
- Metrics calculated based on configured preference (story points or issue count)
- Completion percentage displayed as whole number (rounded)
- Progress bar visual (text-based) shows percentage
- Status breakdown shows counts for all four categories
- If story points missing and metric_preference = story_points, falls back to issue count with warning

**Example Output (Story Points):**
```markdown
## Sprint Metrics

### Completion Progress
**23 / 25 story points completed (92%)**

Progress: ████████████████████░░ 92%

### Issue Breakdown by Status
- ✅ **Done:** 8 issues
- 🔄 **In Progress:** 3 issues
- 📋 **To Do:** 2 issues
- 🚫 **Blocked:** 0 issues

**Total Issues in Sprint:** 13
```

**Example Output (Issue Count):**
```markdown
## Sprint Metrics

### Completion Progress
**8 / 13 issues completed (62%)**

Progress: ████████████░░░░░░░░ 62%

### Issue Breakdown by Status
- ✅ **Done:** 8 issues
- 🔄 **In Progress:** 3 issues
- 📋 **To Do:** 2 issues
- 🚫 **Blocked:** 0 issues

**Total Issues in Sprint:** 13
```

---

#### FR4: PM Review Workflow

```
Given: Report has been generated from Jira data
When: Generation completes successfully
Then: System presents report draft to PM in Claude Code interface
  AND provides two action options:
    - "Publish to Confluence" (proceed with publishing)
    - "Cancel" (abort without publishing)
```

**Acceptance Criteria:**
- Report draft shown in full markdown format with all 5 sections
- PM can read and review entire report before publishing
- Clear action buttons/commands presented
- If PM cancels, no Confluence update occurs
- If PM approves, system proceeds to FR5 (Confluence publishing)

**UI Flow:**
```
1. Command executed: /weekly-report
2. [Progress] Fetching data from Jira...
3. [Progress] Generating report...
4. [Preview] Report draft displayed
5. [Prompt] "Review the report above. Publish to Confluence?"
   - Option 1: "Yes, publish now"
   - Option 2: "No, cancel"
6a. If Yes → Proceed to FR5
6b. If No → Exit with message "Report generation cancelled. Draft not published."
```

---

#### FR5: Confluence Publishing (Append Strategy)

```
Given: PM has approved the report for publishing
When: System publishes to Confluence
Then: Report is appended to configured Confluence page using:
  - Page title format: "Weekly Status Reports - [Project Name]"
  - Append new report with timestamp header
  - Preserve all existing content above the new report
  - Include horizontal separator between reports
```

**Page Structure After Multiple Publishes:**
```markdown
# Weekly Status Reports - Manager.AI

---

## Report: Sprint 24 (Dec 18 - Dec 29, 2024)
*Published: Dec 29, 2024 at 3:45 PM*

[Full 5-section report content here]

---

## Report: Sprint 23 (Dec 4 - Dec 15, 2024)
*Published: Dec 15, 2024 at 4:12 PM*

[Previous report content here]

---

[Older reports continue below...]
```

**Acceptance Criteria:**
- New report appended at TOP of page (most recent first)
- All existing reports preserved unchanged
- Timestamp included in format: "Published: [Month DD, YYYY] at [HH:MM AM/PM]"
- Horizontal separator (---) added between reports
- Page title matches configured format
- If page doesn't exist, create it with initial report
- Uses MCP Confluence connector for all page operations

**Confluence API Operations:**
1. Read current page content (GET)
2. Prepend new report with timestamp
3. Update page content (PUT with incremented version)
4. Handle version conflicts (retry with latest version)

---

#### FR6: Configuration Management

```
Given: Tool requires Jira and Confluence settings
When: Tool is first set up or configuration needs updating
Then: Configuration is stored in structured format with validation
```

**Configuration File Location:**
- Path: `.claude/weekly-report-config.json`
- Format: JSON
- Security: Excluded from Git via .gitignore

**Configuration Schema:**
```json
{
  "project": {
    "name": "Manager.AI",
    "team": ["Rohit", "Rajiv", "Jagan"]
  },
  "jira": {
    "query_type": "sprint",
    "sprint_id": "12345",
    "board_id": null,
    "metric_preference": "story_points",
    "status_mappings": {
      "done": ["Done", "Resolved", "Closed"],
      "in_progress": ["In Progress", "In Review"],
      "to_do": ["To Do", "Backlog", "Open"],
      "blocked": ["Blocked", "Impediment"]
    }
  },
  "confluence": {
    "space_key": "MNGR",
    "page_title": "Weekly Status Reports - Manager.AI",
    "page_id": "123456789"
  },
  "report": {
    "health_thresholds": {
      "green_max": 10,
      "yellow_max": 25
    },
    "timezone": "America/New_York"
  }
}
```

**Validation Rules:**
- `query_type` must be "sprint" or "board"
- If `query_type = "sprint"`, `sprint_id` is required
- If `query_type = "board"`, `board_id` is required
- `metric_preference` must be "story_points" or "issue_count"
- `health_thresholds.green_max` must be < `health_thresholds.yellow_max`
- All required fields must be non-empty

**Acceptance Criteria:**
- Configuration file validated on load
- Clear error messages for invalid configuration
- Supports both sprint and board query modes
- Default values provided for optional fields
- Sensitive data (if any) handled securely

---

### Non-Functional Requirements

#### NFR1: Performance
- **Data retrieval:** < 10 seconds from Jira via MCP
- **Report generation:** < 5 seconds for processing and formatting
- **Confluence publishing:** < 10 seconds for page update
- **Total end-to-end:** < 30 seconds from command to published report

**Acceptance Criteria:**
- 95th percentile execution time < 30 seconds
- Progress indicators shown during long operations
- Timeout handling after 60 seconds with error message

#### NFR2: Reliability
- **MCP connection errors:** Retry up to 3 times with exponential backoff
- **Data validation:** Fail fast with clear error if required fields missing
- **Confluence conflicts:** Handle version conflicts with automatic retry
- **Partial failures:** If report generates but publish fails, preserve draft

**Acceptance Criteria:**
- No data loss if Confluence publish fails (draft saved locally)
- Clear error messages for all failure scenarios
- Automatic retry for transient network errors
- Graceful degradation if optional fields missing

#### NFR3: Usability
- **Setup time:** < 10 minutes for initial configuration
- **Learning curve:** PM can run command after single demonstration
- **Error messages:** Human-readable with actionable next steps
- **Documentation:** README with examples and troubleshooting guide

**Acceptance Criteria:**
- Single command execution: `/weekly-report`
- No command-line arguments required (uses config file)
- Preview shown before publishing (no surprises)
- Confirmation required before Confluence update

#### NFR4: Maintainability
- **Code structure:** Modular functions for each report section
- **MCP abstraction:** All Jira/Confluence calls isolated in client modules
- **Configuration:** External config file (no hardcoded values)
- **Logging:** Structured logs for debugging and audit trail

**Acceptance Criteria:**
- Each report section has dedicated generation function
- Configuration changes don't require code edits
- Logs include timestamps, operation names, and outcomes
- Error logs include full context for troubleshooting

#### NFR5: Security
- **Credentials:** Never stored in code or config files
- **MCP authentication:** Relies on pre-authorized MCP server
- **Confluence access:** Uses PM's authenticated session
- **Configuration:** Sensitive fields excluded from version control

**Acceptance Criteria:**
- No API tokens or passwords in repository
- Configuration file in .gitignore
- MCP authorization handled by Claude Code environment
- Audit log of all Confluence page updates

---

## Data Model

### Jira Issue Object
```typescript
interface JiraIssue {
  key: string;                    // e.g., "PROJ-123"
  summary: string;                // Issue title
  status: string;                 // Current status
  epic: {
    key: string;                  // Epic key, e.g., "PROJ-100"
    name: string;                 // Epic name
  } | null;                       // null if no epic assigned
  storyPoints: number | null;     // null if not estimated
  blocked: boolean;               // true if blocked flag set
  blockerReason: string | null;   // Description of blocker
  statusHistory: Array<{
    status: string;
    changedAt: Date;
  }>;
  sprint: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
}
```

### Sprint Metadata Object
```typescript
interface SprintMetadata {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  committedPoints: number;
  completedPoints: number;
  committedIssues: number;
  completedIssues: number;
}
```

### Report Object
```typescript
interface WeeklyReport {
  metadata: {
    sprintName: string;
    sprintDates: string;          // "Dec 18 - Dec 29, 2024"
    generatedAt: Date;
    publishedAt: Date | null;
  };
  executiveSummary: {
    health: "green" | "yellow" | "red";
    healthIcon: string;           // 🟢 🟡 🔴
    narrative: string;            // 2-3 sentences
  };
  completedIssues: {
    epicGroups: Array<{
      epicName: string;
      issues: JiraIssue[];
    }>;
    unassigned: JiraIssue[];
  };
  inProgressIssues: {
    epicGroups: Array<{
      epicName: string;
      issues: JiraIssue[];
    }>;
    unassigned: JiraIssue[];
  };
  blockers: JiraIssue[];
  metrics: {
    completedValue: number;       // Points or count
    committedValue: number;       // Points or count
    completionPercentage: number; // 0-100
    statusBreakdown: {
      done: number;
      inProgress: number;
      toDo: number;
      blocked: number;
    };
  };
}
```

---

## User Workflows

### Workflow 1: Generate and Publish Report (Happy Path)

**Actor:** Product Manager (Avinash)

**Preconditions:**
- MCP Jira/Confluence connectors authorized
- Configuration file exists with valid settings
- Sprint is active or recently completed

**Steps:**
1. PM opens Claude Code
2. PM types `/weekly-report` command
3. System displays "Fetching data from Jira..."
4. System retrieves all issues from configured sprint/board
5. System displays "Generating report..."
6. System processes data into 5 sections
7. System displays full report draft in markdown
8. System prompts: "Review the report above. Publish to Confluence?"
9. PM reviews report content
10. PM responds: "Yes, publish now"
11. System displays "Publishing to Confluence..."
12. System appends report to Confluence page
13. System displays success message: "✅ Report published successfully to [page URL]"

**Postconditions:**
- Report appended to Confluence page with timestamp
- Stakeholders can view updated status on Confluence
- Report draft retained in Claude Code session history

**Success Criteria:**
- Total time < 30 seconds
- All 5 sections populated correctly
- Confluence page updated successfully

---

### Workflow 2: Generate Report but Cancel Publishing

**Actor:** Product Manager (Avinash)

**Preconditions:**
- Same as Workflow 1

**Steps:**
1. PM opens Claude Code
2. PM types `/weekly-report` command
3. System fetches data and generates report (steps 3-7 from Workflow 1)
4. System displays full report draft
5. System prompts: "Review the report above. Publish to Confluence?"
6. PM reviews report and finds issue (e.g., missing context)
7. PM responds: "No, cancel"
8. System displays "Report generation cancelled. Draft not published."

**Postconditions:**
- No Confluence update occurs
- Report draft available in session for reference
- PM can re-run command after making adjustments

**Success Criteria:**
- Clear cancellation confirmation
- No side effects on Confluence
- Draft remains accessible

---

### Workflow 3: Handle Missing Configuration

**Actor:** Product Manager (new setup)

**Preconditions:**
- MCP connectors authorized
- Configuration file does NOT exist

**Steps:**
1. PM types `/weekly-report` command
2. System checks for configuration file
3. System finds no configuration
4. System displays error:
   ```
   ❌ Configuration file not found
   
   Please create '.claude/weekly-report-config.json' with required settings.
   
   Example configuration:
   {
     "jira": {
       "query_type": "sprint",
       "sprint_id": "YOUR_SPRINT_ID"
     },
     "confluence": {
       "space_key": "YOUR_SPACE",
       "page_title": "Weekly Status Reports"
     }
   }
   
   See README.md for full configuration guide.
   ```
5. PM creates configuration file with appropriate values
6. PM re-runs `/weekly-report` command
7. System executes successfully (Workflow 1)

**Postconditions:**
- PM understands configuration requirement
- Clear path to resolution provided
- Configuration file created correctly

---

### Workflow 4: Handle Jira Connection Failure

**Actor:** Product Manager

**Preconditions:**
- Configuration exists
- MCP Jira connector NOT authorized or connection fails

**Steps:**
1. PM types `/weekly-report` command
2. System attempts to connect to Jira via MCP
3. Connection fails (unauthorized or network error)
4. System displays error:
   ```
   ❌ Failed to connect to Jira
   
   Error: MCP Jira connector not authorized or connection timeout
   
   Please ensure:
   1. Atlassian/Jira MCP server is installed
   2. MCP server is authorized in Claude Code settings
   3. Network connection is stable
   
   Try running: /mcp-status
   ```
5. PM checks MCP authorization status
6. PM authorizes MCP connector if needed
7. PM re-runs `/weekly-report` command
8. System executes successfully (Workflow 1)

**Postconditions:**
- PM understands MCP authorization requirement
- Clear troubleshooting steps provided
- Issue resolved without developer intervention

---

## Technical Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code Environment                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         /weekly-report Slash Command               │   │
│  │                                                      │   │
│  │  ┌──────────────┐      ┌──────────────┐           │   │
│  │  │ Config Loader│─────▶│  Validator   │           │   │
│  │  └──────────────┘      └──────────────┘           │   │
│  │          │                                          │   │
│  │          ▼                                          │   │
│  │  ┌──────────────┐      ┌──────────────┐           │   │
│  │  │ Jira Client  │─────▶│Data Processor│           │   │
│  │  │  (via MCP)   │      │              │           │   │
│  │  └──────────────┘      └──────┬───────┘           │   │
│  │                               │                    │   │
│  │                               ▼                    │   │
│  │                      ┌──────────────┐             │   │
│  │                      │   Report     │             │   │
│  │                      │  Generator   │             │   │
│  │                      └──────┬───────┘             │   │
│  │                             │                     │   │
│  │                             ▼                     │   │
│  │                      ┌──────────────┐            │   │
│  │                      │   PM Review  │            │   │
│  │                      │   Workflow   │            │   │
│  │                      └──────┬───────┘            │   │
│  │                             │                     │   │
│  │                  ┌──────────┴──────────┐        │   │
│  │                  │                     │        │   │
│  │             [Approve]            [Cancel]       │   │
│  │                  │                     │        │   │
│  │                  ▼                     ▼        │   │
│  │         ┌──────────────┐      ┌──────────┐    │   │
│  │         │ Confluence   │      │  Exit    │    │   │
│  │         │   Client     │      └──────────┘    │   │
│  │         │  (via MCP)   │                       │   │
│  │         └──────────────┘                       │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
   ┌──────────┐                        ┌──────────┐
   │   Jira   │                        │Confluence│
   │  Server  │                        │  Server  │
   └──────────┘                        └──────────┘
```

### Module Breakdown

#### 1. Config Loader Module
**Responsibility:** Load and validate configuration file

**Functions:**
- `loadConfig()` - Read config from `.claude/weekly-report-config.json`
- `validateConfig(config)` - Ensure all required fields present and valid
- `getDefaultConfig()` - Return default values for optional fields

**Error Handling:**
- File not found → Detailed setup instructions
- Invalid JSON → Syntax error location
- Missing required fields → List of missing fields
- Invalid values → Validation error with expected format

---

#### 2. Jira Client Module (MCP Wrapper)
**Responsibility:** Interact with Jira via MCP connector

**Functions:**
- `connectToJira()` - Establish MCP connection
- `fetchSprintMetadata(sprintId)` - Get sprint details
- `fetchBoardIssues(boardId)` - Get all issues from board
- `fetchSprintIssues(sprintId)` - Get all issues from sprint
- `fetchIssueHistory(issueKey)` - Get status change history for issue
- `queryJQL(jqlString)` - Execute custom JQL query

**Error Handling:**
- MCP not authorized → Authorization instructions
- Connection timeout → Retry with backoff (3 attempts)
- Invalid sprint/board ID → Validation error
- API rate limit → Wait and retry with exponential backoff

---

#### 3. Data Processor Module
**Responsibility:** Transform Jira data into report-ready structure

**Functions:**
- `identifyCompletedIssues(issues, sprintPeriod)` - Filter issues by status change
- `groupByEpic(issues)` - Group issues into epic buckets
- `calculateHealth(issues)` - Determine health indicator based on blocked %
- `calculateMetrics(issues, metricPreference)` - Compute completion and status breakdown
- `extractBlockerInfo(issue)` - Get blocker reason from issue
- `sortEpicGroups(groups)` - Alphabetical sort with Unassigned last

**Data Transformations:**
```
Raw Jira Issues → Filtered by completion → Grouped by epic → Sorted
                                                            ↓
                                                    Report Object
```

---

#### 4. Report Generator Module
**Responsibility:** Format report object into markdown

**Functions:**
- `generateExecutiveSummary(data)` - Create Section 1
- `generateCompletedSection(data)` - Create Section 2
- `generateInProgressSection(data)` - Create Section 3
- `generateBlockersSection(data)` - Create Section 4
- `generateMetricsSection(data)` - Create Section 5
- `generateProgressBar(percentage)` - Text-based progress bar
- `formatTimestamp(date)` - Human-readable date format

**Markdown Templates:**
Each section uses consistent markdown formatting with:
- Headings (##, ###)
- Lists (-, *)
- Emphasis (**bold**, *italic*)
- Emoji indicators (🟢, 🔄, ✅)

---

#### 5. PM Review Workflow Module
**Responsibility:** Present report and handle approval

**Functions:**
- `displayReportPreview(reportMarkdown)` - Show full report
- `promptForApproval()` - Ask "Publish to Confluence?"
- `handleApproval(response)` - Route to publish or cancel
- `saveDraftLocally(report)` - Persist draft if cancelled

**User Interface:**
- Clear separation between report content and action prompt
- Explicit options: "Yes, publish now" / "No, cancel"
- Confirmation message for both outcomes

---

#### 6. Confluence Client Module (MCP Wrapper)
**Responsibility:** Interact with Confluence via MCP connector

**Functions:**
- `connectToConfluence()` - Establish MCP connection
- `fetchPageContent(spaceKey, pageTitle)` - Get current page content
- `createPage(spaceKey, title, content)` - Create new page if not exists
- `appendToPage(pageId, newContent)` - Prepend report to existing content
- `handleVersionConflict(pageId)` - Retry with latest version

**Append Logic:**
```
1. Fetch current page content and version
2. Construct new content:
   newContent = new_report + separator + existing_content
3. Update page with new content and version+1
4. If conflict (version changed):
   - Fetch latest version
   - Retry update
```

**Error Handling:**
- Page not found → Create new page
- Version conflict → Automatic retry with latest version
- Permission denied → Error with Confluence access instructions
- Network error → Retry with backoff (3 attempts)

---

### Data Flow

**End-to-End Request Flow:**

```
1. User Command
   /weekly-report
        ↓
2. Load Configuration
   config = loadConfig()
   validateConfig(config)
        ↓
3. Fetch Jira Data
   jiraClient.connect()
   issues = jiraClient.fetchSprintIssues(config.sprint_id)
   metadata = jiraClient.fetchSprintMetadata(config.sprint_id)
        ↓
4. Process Data
   completed = processor.identifyCompletedIssues(issues)
   grouped = processor.groupByEpic(issues)
   health = processor.calculateHealth(issues)
   metrics = processor.calculateMetrics(issues)
        ↓
5. Generate Report
   reportObj = {
     executiveSummary: generator.generateExecutiveSummary(...),
     completed: generator.generateCompletedSection(...),
     inProgress: generator.generateInProgressSection(...),
     blockers: generator.generateBlockersSection(...),
     metrics: generator.generateMetricsSection(...)
   }
   markdown = assembleReport(reportObj)
        ↓
6. PM Review
   displayReportPreview(markdown)
   approval = promptForApproval()
        ↓
7a. If Approved:
    confluenceClient.connect()
    confluenceClient.appendToPage(config.page_id, markdown)
    displaySuccess(pageUrl)
        ↓
7b. If Cancelled:
    saveDraftLocally(markdown)
    displayCancellation()
```

---

## Error Handling

### Error Categories

#### 1. Configuration Errors
**Scenarios:**
- Missing configuration file
- Invalid JSON syntax
- Missing required fields
- Invalid field values (wrong type, out of range)

**Handling Strategy:**
- Fail fast with detailed error message
- Provide example configuration
- List specific validation failures
- Link to documentation

**Example Error:**
```
❌ Configuration Error: Missing required field 'jira.sprint_id'

Your configuration is missing a required field.

Expected format:
{
  "jira": {
    "query_type": "sprint",
    "sprint_id": "12345"  ← This field is required
  }
}

Please update .claude/weekly-report-config.json

See: README.md#configuration
```

---

#### 2. MCP Connection Errors
**Scenarios:**
- MCP server not installed
- MCP server not authorized
- Network timeout
- API rate limit exceeded

**Handling Strategy:**
- Retry transient errors (3 attempts with exponential backoff)
- Fail permanent errors with troubleshooting steps
- Log all attempts for debugging

**Retry Logic:**
```python
def fetch_with_retry(operation, max_attempts=3):
    for attempt in range(1, max_attempts + 1):
        try:
            return operation()
        except TransientError as e:
            if attempt == max_attempts:
                raise
            wait_time = 2 ** attempt  # Exponential backoff: 2s, 4s, 8s
            time.sleep(wait_time)
```

**Example Error:**
```
❌ Jira Connection Failed

Error: MCP connector not responding (timeout after 10s)

Troubleshooting steps:
1. Check MCP server status: /mcp-status
2. Verify Jira MCP server is installed and authorized
3. Check network connection
4. Try again in a few moments

Attempts: 3/3 failed

If problem persists, see: README.md#troubleshooting-jira-connection
```

---

#### 3. Data Validation Errors
**Scenarios:**
- Empty sprint (no issues found)
- Missing required issue fields
- Invalid date ranges
- Malformed epic links

**Handling Strategy:**
- Gracefully handle missing optional fields (use defaults)
- Fail if critical data missing (sprint ID, issue key)
- Log warnings for minor issues
- Provide partial report if possible

**Example Warning:**
```
⚠️  Warning: Issue PROJ-123 has no story points assigned

Falling back to issue count for metrics calculation.

To fix: Add story point estimates to all issues in Jira.
```

**Example Error:**
```
❌ Data Validation Failed

Error: Sprint 12345 contains no issues

Possible causes:
- Sprint ID is incorrect
- Sprint has not started yet
- All issues have been moved to another sprint

Please verify sprint ID in configuration.
```

---

#### 4. Report Generation Errors
**Scenarios:**
- Markdown formatting issues
- Missing epic names
- Invalid date formatting
- Empty report sections (edge case)

**Handling Strategy:**
- Use fallback values for missing data
- Never fail report generation due to formatting
- Log warnings for data quality issues
- Ensure all 5 sections always present (even if empty)

**Fallback Rules:**
```
- Missing epic name → Use epic key as name
- No epic assigned → Place in "Unassigned" group
- No story points → Show issue count instead
- No blockers → Show "No current blockers" message
- Empty completed section → Show "No issues completed this sprint"
```

---

#### 5. Confluence Publishing Errors
**Scenarios:**
- Page not found
- Permission denied
- Version conflict (concurrent edits)
- Network timeout during publish

**Handling Strategy:**
- Save draft locally before attempting publish
- Retry version conflicts automatically
- Provide page URL for manual publish if automation fails
- Preserve all work (no data loss)

**Draft Saving:**
```
On publish failure:
1. Save markdown to: .claude/drafts/weekly-report-YYYY-MM-DD.md
2. Display error with draft location
3. Provide manual publish instructions
```

**Example Error:**
```
❌ Confluence Publishing Failed

Error: Permission denied for page "Weekly Status Reports"

Your report has been saved to:
.claude/drafts/weekly-report-2024-12-25.md

To publish manually:
1. Open Confluence page
2. Edit page
3. Copy content from draft file
4. Save page

Contact your Confluence admin to request edit permissions.
```

---

## Testing Strategy

### Unit Tests

**Coverage Target:** 80%+

**Test Modules:**

1. **Config Loader Tests**
   - Valid configuration loads successfully
   - Missing file throws appropriate error
   - Invalid JSON throws parse error
   - Missing required fields detected
   - Invalid field values detected
   - Default values applied correctly

2. **Data Processor Tests**
   - Completion detection filters issues correctly
   - Epic grouping handles all cases (with epic, without epic)
   - Health calculation matches algorithm
   - Metrics calculation accurate (story points and issue count)
   - Unassigned group placed last
   - Empty data handled gracefully

3. **Report Generator Tests**
   - Executive summary formats correctly
   - Each section renders valid markdown
   - Progress bar displays correct percentage
   - Emoji indicators match health status
   - Empty sections show appropriate messages
   - Timestamp formatting is correct

4. **Jira Client Tests (Mocked)**
   - Connection established successfully
   - Sprint metadata retrieved
   - Issues fetched completely
   - Status history parsed correctly
   - Retry logic executes on failure
   - Error handling for all API failures

5. **Confluence Client Tests (Mocked)**
   - Page content fetched successfully
   - Append logic prepends correctly
   - Version conflict handled with retry
   - Page creation when not exists
   - Error handling for all API failures

---

### Integration Tests

**Test Scenarios:**

1. **End-to-End Happy Path**
   - Load valid configuration
   - Fetch real sprint data (test Jira instance)
   - Generate complete report
   - Display preview
   - Publish to test Confluence page
   - Verify appended content correct

2. **Configuration Error Handling**
   - Missing configuration file
   - Invalid configuration values
   - Verify error messages clear and actionable

3. **Jira Connection Failure**
   - Simulate MCP connection failure
   - Verify retry logic executes
   - Verify error message provides troubleshooting

4. **Empty Sprint Handling**
   - Configure with empty sprint
   - Verify graceful handling
   - Verify all sections show "No issues" messages

5. **Confluence Conflict Resolution**
   - Simulate version conflict
   - Verify automatic retry
   - Verify eventual success

---

### Manual Test Cases

**Test Case 1: First-Time Setup**
1. Delete configuration file
2. Run `/weekly-report`
3. Verify error message with setup instructions
4. Create configuration file
5. Re-run command
6. Verify successful execution

**Test Case 2: PM Review and Cancel**
1. Run `/weekly-report`
2. Review generated report
3. Choose "Cancel" option
4. Verify no Confluence update
5. Verify draft accessible

**Test Case 3: Multiple Report Publishes**
1. Run `/weekly-report` and publish
2. Verify first report appended
3. Run `/weekly-report` again (same sprint)
4. Publish second report
5. Verify both reports visible
6. Verify timestamps differ
7. Verify separators present

**Test Case 4: Sprint with No Blockers**
1. Configure sprint with no blocked issues
2. Run `/weekly-report`
3. Verify Blockers section shows "No current blockers"
4. Verify health indicator is Green

**Test Case 5: Sprint with Many Blockers**
1. Configure sprint with >25% blocked issues
2. Run `/weekly-report`
3. Verify health indicator is Red
4. Verify all blockers listed in section

---

## Deployment

### Prerequisites
- Claude Code environment with MCP support
- Atlassian/Jira MCP server installed and authorized
- Atlassian/Confluence MCP server installed and authorized
- Python 3.8+ (if using Python implementation)
- OR Node.js 16+ (if using JavaScript/TypeScript implementation)

### Installation Steps

1. **Clone Repository**
   ```bash
   cd ~/.claude/skills
   git clone https://github.com/Avinasha1101/jira-confluence-automation.git
   cd jira-confluence-automation
   ```

2. **Install Dependencies**
   ```bash
   # Python
   pip install -r requirements.txt
   
   # OR Node.js
   npm install
   ```

3. **Create Configuration**
   ```bash
   cp .claude/weekly-report-config.example.json .claude/weekly-report-config.json
   # Edit configuration with your Jira/Confluence details
   ```

4. **Verify MCP Authorization**
   ```bash
   # In Claude Code
   /mcp-status
   
   # Verify both Jira and Confluence connectors show as "Authorized"
   ```

5. **Test Installation**
   ```bash
   /weekly-report
   
   # Should fetch data and generate report (review and cancel if test)
   ```

---

### Configuration File Setup

**Example Configuration:**
```json
{
  "project": {
    "name": "Manager.AI",
    "team": ["Rohit", "Rajiv", "Jagan"]
  },
  "jira": {
    "query_type": "sprint",
    "sprint_id": "12345",
    "board_id": null,
    "metric_preference": "story_points",
    "status_mappings": {
      "done": ["Done", "Resolved", "Closed"],
      "in_progress": ["In Progress", "In Review", "Code Review"],
      "to_do": ["To Do", "Backlog", "Open", "Selected for Development"],
      "blocked": ["Blocked", "Impediment", "On Hold"]
    }
  },
  "confluence": {
    "space_key": "MNGRAI",
    "page_title": "Weekly Status Reports - Manager.AI",
    "page_id": null
  },
  "report": {
    "health_thresholds": {
      "green_max": 10,
      "yellow_max": 25
    },
    "timezone": "America/New_York"
  }
}
```

**Configuration Instructions:**

1. **Jira Settings:**
   - `query_type`: Choose "sprint" (for active sprint) or "board" (for backlog)
   - `sprint_id`: Get from Jira sprint URL (e.g., `.../sprint/12345`)
   - `metric_preference`: "story_points" (if team estimates) or "issue_count"
   - `status_mappings`: Map your Jira statuses to categories (adjust to match your workflow)

2. **Confluence Settings:**
   - `space_key`: Get from Confluence space URL (e.g., `https://company.atlassian.net/wiki/spaces/MNGRAI`)
   - `page_title`: Title for the persistent status reports page
   - `page_id`: Leave null initially (will be created on first publish)

3. **Report Settings:**
   - `health_thresholds`: Adjust percentages to match your team's tolerance
   - `timezone`: Set to your local timezone for accurate timestamps

---

## Acceptance Criteria Summary

### Phase 1: MVP (Version 1.0 - Due: January 25, 2025)

**Must Have:**
- [ ] Fetch data from Jira via MCP (sprint or board)
- [ ] Generate 5-section report with all specified content
- [ ] Health indicator calculated correctly (Green/Yellow/Red)
- [ ] Group issues by epic (with "Unassigned" group)
- [ ] Detect completed issues via status change history
- [ ] Display PM review workflow before publishing
- [ ] Append report to Confluence page with timestamp
- [ ] Configuration file with validation
- [ ] Error handling for all major failure scenarios
- [ ] README with setup and usage instructions

**Quality Gates:**
- [ ] All unit tests passing (80%+ coverage)
- [ ] Integration tests passing (happy path + error cases)
- [ ] Manual testing completed (all 5 test cases)
- [ ] End-to-end execution < 30 seconds (95th percentile)
- [ ] No credentials in code or config (security audit passed)
- [ ] Documentation complete (README, inline comments)

---

## Out of Scope (v1.0)

The following features are **explicitly excluded** from version 1.0 to maintain focus and ensure timely delivery:

### Reporting Features
- ❌ Week-over-week trend comparisons or velocity charts
- ❌ Historical sprint comparisons
- ❌ Per-person work breakdown or individual performance metrics
- ❌ Time tracking or hour-level reporting
- ❌ Custom KPIs beyond story points and issue count

### Data Sources
- ❌ Confluence as a data source (narrative context extraction)
- ❌ Multiple Jira projects (only single project/board/sprint)
- ❌ Integration with other tools (GitHub, GitLab, etc.)
- ❌ Custom JQL queries (beyond configured sprint/board)

### Publishing Features
- ❌ Scheduled/automatic triggering (cron-based execution)
- ❌ Email delivery of reports
- ❌ Slack/Teams notifications
- ❌ PDF export
- ❌ Multiple Confluence pages (one page only)

### Advanced Features
- ❌ Custom templates or branding
- ❌ Multi-language support
- ❌ Team member tagging or @mentions
- ❌ Custom staleness/overdue detection logic
- ❌ Risk scoring beyond blocked issue percentage
- ❌ Dependency tracking across epics/teams

### Technical Features
- ❌ Web UI or dashboard
- ❌ REST API for external access
- ❌ Database for historical report storage
- ❌ Advanced analytics or BI integration
- ❌ Role-based access control

---

## Future Enhancements (Backlog)

### Version 1.1 - Planned Enhancements
- Scheduled weekly execution (cron-based automation)
- Week-over-week delta indicators (velocity trends)
- Email delivery to stakeholder distribution list
- Slack notification with report summary

### Version 1.2 - Advanced Features
- Confluence as secondary data source (read narrative context)
- Custom report templates (PM-configurable sections)
- Per-workstream owner tagging
- Historical sprint comparison (last 4 sprints)

### Version 2.0 - Enterprise Features
- Multi-project support (consolidate multiple boards)
- Web-based dashboard (read-only view)
- Advanced risk detection (custom rules)
- Dependency mapping across teams
- BI tool integration (Tableau, PowerBI)

---

## Glossary

**Board** - A Jira board containing issues, typically representing a team's backlog and current work. Can be Scrum or Kanban.

**Sprint** - A time-boxed iteration in Scrum (typically 1-4 weeks) with a committed set of work.

**Epic** - A large body of work in Jira that can be broken down into smaller stories. Used for workstream grouping.

**Story Points** - A unit of measure for expressing the effort required to implement a user story or task.

**Blocked Issue** - An issue that cannot progress due to an external dependency, technical impediment, or resource constraint.

**MCP (Model Context Protocol)** - A protocol for integrating external tools and APIs with Claude Code, enabling secure data access.

**Confluence Page** - A document in Confluence wiki used for team documentation and knowledge sharing.

**Health Indicator** - A visual signal (Green/Yellow/Red) representing the overall status of sprint progress.

**Workstream** - A logical grouping of related work, typically mapped to an Epic in Jira.

**Append Strategy** - Publishing approach where new content is added to the top of an existing page, preserving historical reports below.

**PM Review Workflow** - A human-in-the-loop step where the Product Manager reviews and approves the generated report before publication.

**Status Change History** - A log of all status transitions for a Jira issue, used to detect when an issue was completed.

---

## References

### Internal Documents
- [project_spec.md](../project_spec.md) - Original technical specification
- [BACKLOG.md](../BACKLOG.md) - Implementation backlog with GitHub issues
- [README.md](../README.md) - Repository overview and quick start

### External Documentation
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Confluence REST API Documentation](https://developer.atlassian.com/cloud/confluence/rest/v2/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Code Documentation](https://claude.ai/docs)

### Related Projects
- [Atlassian MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/atlassian)
- [pyral Library](https://github.com/RallyTools/RallyRestToolkitForPython)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 25, 2024 | Avinash Agarwal | Initial SpecKit format specification based on project_spec.md |

---

## Sign-Off

**Product Manager:** ___________________________  
**Date:** _____________

**Technical Lead:** ___________________________  
**Date:** _____________

**Stakeholder Approval:** ___________________________  
**Date:** _____________

---

*This specification follows the SpecKit format for comprehensive project documentation. For questions or clarifications, contact Avinash Agarwal (Product Manager).*
