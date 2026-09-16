# Data Model: Weekly Status Report Generator

## Overview

This document defines the complete data model for the Manager.AI Weekly Status Report Generator, including data structures, relationships, storage mechanisms, and persistence strategies.

**Version:** 1.0  
**Date:** December 25, 2024  
**Product Manager:** Avinash Agarwal

---

## Data Architecture

### Storage Overview

The Weekly Status Report Generator uses a **hybrid storage model**:

1. **Local File System** - Configuration and drafts
2. **Jira Cloud** - Source data (read-only)
3. **Confluence Cloud** - Published reports (append-only)
4. **In-Memory** - Runtime processing cache

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│              │ Read   │              │ Read   │              │
│  Jira Cloud  │───────▶│  Generator   │───────▶│  Confluence  │
│  (Source)    │        │  (Process)   │        │  (Publish)   │
│              │        │              │        │              │
└──────────────┘        └──────┬───────┘        └──────────────┘
                               │
                               │ Read/Write
                               ▼
                        ┌──────────────┐
                        │ Local Files  │
                        │ - Config     │
                        │ - Drafts     │
                        │ - Logs       │
                        └──────────────┘
```

---

## 1. Configuration Data Model

### 1.1 Configuration File Structure

**File:** `.claude/weekly-report-config.json`  
**Format:** JSON  
**Persistence:** Local file system  
**Version Control:** Excluded (`.gitignore`)

**Schema:**

```typescript
interface Configuration {
  project: ProjectConfig;
  jira: JiraConfig;
  confluence: ConfluenceConfig;
  report: ReportConfig;
}

interface ProjectConfig {
  name: string;                // Project name (e.g., "Manager.AI")
  team: string[];              // Team member names
  description?: string;        // Optional project description
}

interface JiraConfig {
  query_type: 'sprint' | 'board';
  sprint_id?: string;          // Required if query_type = 'sprint'
  board_id?: string;           // Required if query_type = 'board'
  metric_preference: 'story_points' | 'issue_count';
  
  // Custom field mappings (varies by Jira instance)
  custom_fields?: {
    story_points?: string;     // e.g., "customfield_10016"
    epic_link?: string;        // e.g., "customfield_10014"
    sprint?: string;           // e.g., "customfield_10020"
  };
  
  // Status mappings to categories
  status_mappings: {
    done: string[];            // Statuses considered "completed"
    in_progress: string[];     // Statuses considered "active"
    to_do: string[];           // Statuses considered "planned"
    blocked: string[];         // Statuses considered "blocked"
  };
}

interface ConfluenceConfig {
  space_key: string;           // Confluence space key (e.g., "MNGRAI")
  page_title: string;          // Target page title
  page_id?: string;            // Optional: specific page ID
}

interface ReportConfig {
  health_thresholds: {
    green_max: number;         // Max blocked % for green (default: 10)
    yellow_max: number;        // Max blocked % for yellow (default: 25)
  };
  timezone?: string;           // Timezone for timestamps (default: UTC)
}
```

**Example:**

```json
{
  "project": {
    "name": "Manager.AI",
    "team": ["Rohit", "Rajiv", "Jagan"],
    "description": "Weekly status report automation for CRM project"
  },
  "jira": {
    "query_type": "sprint",
    "sprint_id": "12345",
    "metric_preference": "story_points",
    "custom_fields": {
      "story_points": "customfield_10016",
      "epic_link": "customfield_10014"
    },
    "status_mappings": {
      "done": ["Done", "Resolved", "Closed"],
      "in_progress": ["In Progress", "In Review", "Code Review"],
      "to_do": ["To Do", "Backlog", "Open"],
      "blocked": ["Blocked", "Impediment", "On Hold"]
    }
  },
  "confluence": {
    "space_key": "MNGRAI",
    "page_title": "Weekly Status Reports - Manager.AI"
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

| Field | Rule | Error Message |
|-------|------|---------------|
| `project.name` | Required, non-empty | "Project name is required" |
| `project.team` | Array with 1+ names | "At least one team member required" |
| `jira.query_type` | Enum: 'sprint' \| 'board' | "Must be 'sprint' or 'board'" |
| `jira.sprint_id` | Required if query_type='sprint' | "Sprint ID required for sprint mode" |
| `jira.board_id` | Required if query_type='board' | "Board ID required for board mode" |
| `jira.metric_preference` | Enum: 'story_points' \| 'issue_count' | "Invalid metric preference" |
| `confluence.space_key` | Required, non-empty | "Confluence space key required" |
| `confluence.page_title` | Required, non-empty | "Page title required" |
| `report.health_thresholds.green_max` | 0-100, < yellow_max | "Green threshold must be < yellow" |
| `report.health_thresholds.yellow_max` | 0-100, > green_max | "Yellow threshold must be > green" |

---

### 1.2 Configuration Defaults

**Default Values (Applied if Missing):**

```typescript
const CONFIG_DEFAULTS: Partial<Configuration> = {
  jira: {
    metric_preference: 'story_points',
    custom_fields: {
      story_points: 'customfield_10016',  // Common Jira default
      epic_link: 'customfield_10014',
      sprint: 'customfield_10020'
    },
    status_mappings: {
      done: ['Done', 'Resolved', 'Closed'],
      in_progress: ['In Progress', 'In Development', 'In Review'],
      to_do: ['To Do', 'Backlog', 'Open', 'Selected for Development'],
      blocked: ['Blocked', 'Impediment', 'On Hold', 'Waiting']
    }
  },
  report: {
    health_thresholds: {
      green_max: 10,
      yellow_max: 25
    },
    timezone: 'UTC'
  }
};
```

---

## 2. Jira Data Model

### 2.1 Sprint Metadata

**Source:** Jira Agile API (`/rest/agile/1.0/sprint/{sprintId}`)  
**Persistence:** In-memory (transient)  
**Lifecycle:** Fetched on each report run

**Entity:**

```typescript
interface Sprint {
  id: string;                  // Sprint ID (e.g., "12345")
  name: string;                // Sprint name (e.g., "Sprint 24")
  state: SprintState;          // Current state
  startDate: Date;             // Sprint start timestamp
  endDate: Date;               // Sprint end timestamp
  originBoardId: number;       // Parent board ID
  goal?: string;               // Sprint goal/objective
}

enum SprintState {
  FUTURE = 'future',
  ACTIVE = 'active',
  CLOSED = 'closed'
}
```

**Relationships:**
- One Sprint contains many Issues
- One Sprint belongs to one Board

**Usage:**
- Determine reporting period (startDate → endDate)
- Display in Executive Summary
- Filter completed issues by completion date within sprint

---

### 2.2 Issue (Normalized)

**Source:** Jira API (`/rest/agile/1.0/sprint/{sprintId}/issue`)  
**Persistence:** In-memory (transient)  
**Lifecycle:** Fetched on each report run, normalized, then discarded

**Raw Jira Response (Subset):**

```json
{
  "id": "10001",
  "key": "PROJ-123",
  "fields": {
    "summary": "Implement OAuth2 login flow",
    "status": {
      "name": "Done",
      "statusCategory": {
        "key": "done"
      }
    },
    "issuetype": {
      "name": "Story"
    },
    "epic": {
      "id": "10100",
      "key": "PROJ-100",
      "name": "User Authentication System"
    },
    "customfield_10016": 5,
    "assignee": {
      "displayName": "Rohit"
    },
    "labels": ["backend", "security"],
    "flagged": false
  },
  "changelog": {
    "histories": [
      {
        "created": "2024-12-22T14:30:00.000Z",
        "items": [
          {
            "field": "status",
            "fromString": "In Progress",
            "toString": "Done"
          }
        ]
      }
    ]
  }
}
```

**Normalized Entity:**

```typescript
interface JiraIssue {
  // Identity
  id: string;                  // Jira issue ID
  key: string;                 // Issue key (e.g., "PROJ-123")
  
  // Core Fields
  summary: string;             // Issue title
  issueType: string;           // Story, Bug, Task, etc.
  status: string;              // Current status name
  statusCategory: StatusCategory;
  
  // Epic Relationship
  epic: Epic | null;           // Epic link (null if unassigned)
  
  // Estimation
  storyPoints: number | null;  // Story points (null if unestimated)
  
  // Metadata
  labels: string[];            // Issue labels
  assignee: string | null;     // Assignee name (NOT used in report)
  
  // Blocking
  blocked: boolean;            // Is issue blocked?
  blockerReason: string | null;// Blocker description
  
  // Lifecycle
  createdDate: Date;           // When issue was created
  completedDate: Date | null;  // When moved to Done (from changelog)
}

enum StatusCategory {
  DONE = 'done',
  IN_PROGRESS = 'in_progress',
  TO_DO = 'to_do',
  BLOCKED = 'blocked'
}

interface Epic {
  id: string;
  key: string;                 // Epic key (e.g., "PROJ-100")
  name: string;                // Epic name (e.g., "User Authentication System")
}
```

**Derived Fields:**

```typescript
// Calculated from status mappings
function deriveStatusCategory(
  status: string, 
  mappings: StatusMappings
): StatusCategory {
  if (mappings.done.includes(status)) return StatusCategory.DONE;
  if (mappings.in_progress.includes(status)) return StatusCategory.IN_PROGRESS;
  if (mappings.blocked.includes(status)) return StatusCategory.BLOCKED;
  return StatusCategory.TO_DO;
}

// Extracted from changelog
function deriveCompletedDate(
  changelog: Changelog, 
  doneMappings: string[]
): Date | null {
  for (const history of changelog.histories.reverse()) {
    for (const item of history.items) {
      if (item.field === 'status' && doneMappings.includes(item.toString)) {
        return new Date(history.created);
      }
    }
  }
  return null;
}

// Determined from status or flag
function deriveBlocked(
  status: string, 
  flagged: boolean, 
  labels: string[]
): boolean {
  return (
    flagged || 
    status === 'Blocked' || 
    labels.includes('blocked')
  );
}
```

**Relationships:**
- One Issue belongs to zero or one Epic
- One Issue has one Status
- One Issue belongs to one Sprint

---

### 2.3 Issue Collection

**Entity:**

```typescript
interface IssueCollection {
  all: JiraIssue[];            // All issues in sprint/board
  completed: JiraIssue[];      // Issues completed in reporting period
  active: JiraIssue[];         // Issues in progress or planned
  blocked: JiraIssue[];        // Issues currently blocked
  
  // Groupings
  byEpic: Map<string, JiraIssue[]>;
  unassigned: JiraIssue[];     // Issues without epic
  
  // Counts
  totalCount: number;
  completedCount: number;
  blockedCount: number;
}
```

**Construction:**

```typescript
function buildIssueCollection(
  issues: JiraIssue[], 
  sprint: Sprint
): IssueCollection {
  const completed = issues.filter(i => 
    i.statusCategory === StatusCategory.DONE &&
    i.completedDate &&
    i.completedDate >= sprint.startDate &&
    i.completedDate <= sprint.endDate
  );
  
  const active = issues.filter(i =>
    i.statusCategory === StatusCategory.IN_PROGRESS ||
    i.statusCategory === StatusCategory.TO_DO
  );
  
  const blocked = issues.filter(i => i.blocked);
  
  const byEpic = new Map<string, JiraIssue[]>();
  const unassigned: JiraIssue[] = [];
  
  issues.forEach(issue => {
    if (issue.epic) {
      const epicKey = issue.epic.key;
      if (!byEpic.has(epicKey)) {
        byEpic.set(epicKey, []);
      }
      byEpic.get(epicKey)!.push(issue);
    } else {
      unassigned.push(issue);
    }
  });
  
  return {
    all: issues,
    completed,
    active,
    blocked,
    byEpic,
    unassigned,
    totalCount: issues.length,
    completedCount: completed.length,
    blockedCount: blocked.length
  };
}
```

---

## 3. Report Data Model

### 3.1 Report Metadata

**Entity:**

```typescript
interface ReportMetadata {
  generatedAt: Date;           // When report was generated
  publishedAt: Date | null;    // When published to Confluence (null if draft)
  version: string;             // Report schema version (e.g., "1.0")
  
  // Source Info
  sprint: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    state: SprintState;
  };
  
  project: {
    name: string;
    team: string[];
  };
  
  // Settings Used
  metricPreference: 'story_points' | 'issue_count';
  healthThresholds: {
    green_max: number;
    yellow_max: number;
  };
}
```

---

### 3.2 Executive Summary

**Entity:**

```typescript
interface ExecutiveSummary {
  health: HealthIndicator;
  healthIcon: string;          // Emoji: 🟢🟡🔴
  blockedPercentage: number;   // 0-100
  narrative: string;           // 2-3 sentence summary
}

enum HealthIndicator {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red'
}
```

**Calculation:**

```typescript
function calculateExecutiveSummary(
  issues: IssueCollection,
  metrics: SprintMetrics,
  config: ReportConfig
): ExecutiveSummary {
  const blockedPercentage = issues.totalCount > 0
    ? (issues.blockedCount / issues.totalCount) * 100
    : 0;
  
  const health = 
    blockedPercentage < config.health_thresholds.green_max
      ? HealthIndicator.GREEN
    : blockedPercentage <= config.health_thresholds.yellow_max
      ? HealthIndicator.YELLOW
      : HealthIndicator.RED;
  
  const healthIcon = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴'
  }[health];
  
  // AI-generated narrative (simplified example)
  const narrative = generateNarrative(issues, metrics, health);
  
  return {
    health,
    healthIcon,
    blockedPercentage,
    narrative
  };
}
```

---

### 3.3 Epic Group

**Entity:**

```typescript
interface EpicGroup {
  epicKey: string | null;      // Null for unassigned
  epicName: string;            // Display name
  issues: JiraIssue[];         // Issues in this epic
  
  // Aggregates
  totalStoryPoints: number;
  issueCount: number;
  
  // Sorting
  sortOrder: number;           // Alphabetical, unassigned last
}
```

**Grouping Logic:**

```typescript
function groupIssuesByEpic(issues: JiraIssue[]): EpicGroup[] {
  const groups = new Map<string, JiraIssue[]>();
  
  issues.forEach(issue => {
    const key = issue.epic?.key || '__unassigned__';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(issue);
  });
  
  const epicGroups: EpicGroup[] = [];
  
  groups.forEach((issues, epicKey) => {
    epicGroups.push({
      epicKey: epicKey === '__unassigned__' ? null : epicKey,
      epicName: issues[0].epic?.name || 'Unassigned',
      issues,
      totalStoryPoints: issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0),
      issueCount: issues.length,
      sortOrder: epicKey === '__unassigned__' ? 9999 : 0
    });
  });
  
  // Sort: alphabetically by epic name, unassigned last
  return epicGroups.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.epicName.localeCompare(b.epicName);
  });
}
```

---

### 3.4 Sprint Metrics

**Entity:**

```typescript
interface SprintMetrics {
  // Completion
  completedValue: number;      // Story points or issue count
  committedValue: number;      // Story points or issue count
  completionPercentage: number;// 0-100
  
  // Status Breakdown
  statusBreakdown: {
    done: number;
    inProgress: number;
    toDo: number;
    blocked: number;
  };
  
  // Metadata
  metricType: 'story_points' | 'issue_count';
  metricUnit: string;          // "story points" or "issues"
  
  // Fallback Flag
  fallbackUsed: boolean;       // True if switched from points to count
}
```

**Calculation:**

```typescript
function calculateMetrics(
  issues: IssueCollection,
  config: Configuration
): SprintMetrics {
  const useStoryPoints = config.jira.metric_preference === 'story_points';
  
  // Check if story points available
  const hasStoryPoints = issues.all.some(i => i.storyPoints !== null);
  const fallbackUsed = useStoryPoints && !hasStoryPoints;
  const actualMetricType = fallbackUsed ? 'issue_count' : config.jira.metric_preference;
  
  let completedValue: number;
  let committedValue: number;
  
  if (actualMetricType === 'story_points') {
    completedValue = issues.completed.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    committedValue = issues.all.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  } else {
    completedValue = issues.completedCount;
    committedValue = issues.totalCount;
  }
  
  const completionPercentage = committedValue > 0
    ? Math.round((completedValue / committedValue) * 100)
    : 0;
  
  return {
    completedValue,
    committedValue,
    completionPercentage,
    statusBreakdown: {
      done: issues.completed.length,
      inProgress: issues.all.filter(i => i.statusCategory === StatusCategory.IN_PROGRESS).length,
      toDo: issues.all.filter(i => i.statusCategory === StatusCategory.TO_DO).length,
      blocked: issues.blockedCount
    },
    metricType: actualMetricType,
    metricUnit: actualMetricType === 'story_points' ? 'story points' : 'issues',
    fallbackUsed
  };
}
```

---

### 3.5 Complete Report

**Entity:**

```typescript
interface WeeklyReport {
  metadata: ReportMetadata;
  executiveSummary: ExecutiveSummary;
  
  // Section 2: Completed This Week
  completed: {
    epicGroups: EpicGroup[];
    isEmpty: boolean;
  };
  
  // Section 3: In Progress / Planned
  inProgress: {
    epicGroups: EpicGroup[];
    isEmpty: boolean;
  };
  
  // Section 4: Blockers
  blockers: {
    issues: JiraIssue[];
    isEmpty: boolean;
  };
  
  // Section 5: Metrics
  metrics: SprintMetrics;
  
  // Rendered Output
  markdown: string;            // Full markdown report
  html?: string;               // Confluence HTML (after conversion)
}
```

**Construction:**

```typescript
function buildReport(
  sprint: Sprint,
  issues: IssueCollection,
  config: Configuration
): WeeklyReport {
  const metrics = calculateMetrics(issues, config);
  const executiveSummary = calculateExecutiveSummary(issues, metrics, config.report);
  
  const completedGroups = groupIssuesByEpic(issues.completed);
  const activeGroups = groupIssuesByEpic(issues.active);
  
  const report: WeeklyReport = {
    metadata: {
      generatedAt: new Date(),
      publishedAt: null,
      version: '1.0',
      sprint: {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        state: sprint.state
      },
      project: {
        name: config.project.name,
        team: config.project.team
      },
      metricPreference: config.jira.metric_preference,
      healthThresholds: config.report.health_thresholds
    },
    executiveSummary,
    completed: {
      epicGroups: completedGroups,
      isEmpty: issues.completedCount === 0
    },
    inProgress: {
      epicGroups: activeGroups,
      isEmpty: issues.active.length === 0
    },
    blockers: {
      issues: issues.blocked,
      isEmpty: issues.blockedCount === 0
    },
    metrics,
    markdown: ''  // Generated next
  };
  
  report.markdown = generateMarkdown(report);
  
  return report;
}
```

---

## 4. Draft & Publishing Data

### 4.1 Draft File

**File:** `.claude/drafts/weekly-report-YYYY-MM-DD.md`  
**Format:** Markdown  
**Persistence:** Local file system  
**Lifecycle:** Created on cancellation or publish failure, retained indefinitely

**Structure:**

```markdown
---
metadata:
  generated_at: 2024-12-29T15:45:00Z
  sprint_id: "12345"
  sprint_name: "Sprint 24"
  project: "Manager.AI"
  status: "draft"
---

# Weekly Status Report - Sprint 24

Generated: December 29, 2024 at 3:45 PM
Status: **DRAFT** (Not Published)

---

[Full 5-section report content here]

---

## Publishing Instructions

To publish this report to Confluence:
1. Copy the content above (excluding this section)
2. Open: https://epam.atlassian.net/wiki/spaces/MNGRAI/pages/123456
3. Click "Edit"
4. Paste at top of page
5. Add timestamp header
6. Click "Publish"
```

**Entity:**

```typescript
interface DraftFile {
  filepath: string;            // Full path to .md file
  metadata: ReportMetadata;
  content: string;             // Full markdown report
  savedAt: Date;
}
```

**Creation Logic:**

```typescript
function saveDraft(report: WeeklyReport): DraftFile {
  const filename = `weekly-report-${format(new Date(), 'yyyy-MM-dd')}.md`;
  const filepath = `.claude/drafts/${filename}`;
  
  const frontmatter = `---
metadata:
  generated_at: ${report.metadata.generatedAt.toISOString()}
  sprint_id: "${report.metadata.sprint.id}"
  sprint_name: "${report.metadata.sprint.name}"
  project: "${report.metadata.project.name}"
  status: "draft"
---
`;
  
  const header = `# Weekly Status Report - ${report.metadata.sprint.name}

Generated: ${formatTimestamp(report.metadata.generatedAt)}
Status: **DRAFT** (Not Published)

---

`;
  
  const footer = `

---

## Publishing Instructions

To publish this report to Confluence:
1. Copy the content above (excluding this section)
2. Open: [Confluence Page URL]
3. Click "Edit"
4. Paste at top of page
5. Add timestamp header
6. Click "Publish"
`;
  
  const content = frontmatter + header + report.markdown + footer;
  
  fs.writeFileSync(filepath, content, 'utf-8');
  
  return {
    filepath,
    metadata: report.metadata,
    content,
    savedAt: new Date()
  };
}
```

---

### 4.2 Confluence Page Data

**Source:** Confluence API (`/wiki/rest/api/content/{pageId}`)  
**Format:** Confluence Storage Format (HTML-like)  
**Persistence:** Confluence Cloud database  
**Lifecycle:** Append-only (historical reports preserved)

**Entity:**

```typescript
interface ConfluencePage {
  id: string;                  // Page ID
  type: 'page';
  status: 'current';
  title: string;               // Page title
  
  version: {
    number: number;            // Current version (increments on update)
    when: Date;                // Last modified timestamp
    message?: string;          // Version message
  };
  
  body: {
    storage: {
      value: string;           // HTML content
      representation: 'storage';
    };
  };
  
  space: {
    key: string;               // Space key (e.g., "MNGRAI")
  };
  
  _links: {
    webui: string;             // Relative URL to view page
    self: string;              // API URL
  };
}
```

**Page Content Structure (After Multiple Reports):**

```html
<h1>Weekly Status Reports - Manager.AI</h1>

<hr/>

<h2>Report: Sprint 24 (Dec 18 - Dec 29, 2024)</h2>
<p><em>Published: December 29, 2024 at 3:45 PM</em></p>

<h3>Executive Summary</h3>
<p><strong>Sprint:</strong> Sprint 24 (Dec 18 - Dec 29, 2024)<br/>
<strong>Health:</strong> <ac:emoticon ac:name="green_circle" /> Green - On Track</p>
<p>The team is on track to complete 23 of 25 committed story points...</p>

<hr/>

<h3>Completed This Week</h3>
<!-- Issue lists here -->

<hr/>

<!-- More sections -->

<hr/>

<h2>Report: Sprint 23 (Dec 4 - Dec 15, 2024)</h2>
<p><em>Published: December 15, 2024 at 4:12 PM</em></p>
<!-- Previous report content -->

<hr/>

<!-- Older reports continue -->
```

**Prepending Logic:**

```typescript
function prependReportToPage(
  currentPage: ConfluencePage,
  newReport: WeeklyReport
): string {
  // Convert markdown to Confluence storage format
  const reportHTML = markdownToConfluenceHTML(newReport.markdown);
  
  // Create timestamped header
  const timestamp = formatTimestamp(new Date());
  const header = `
<h2>Report: ${newReport.metadata.sprint.name} (${formatDateRange(newReport.metadata.sprint.startDate, newReport.metadata.sprint.endDate)})</h2>
<p><em>Published: ${timestamp}</em></p>
`;
  
  const separator = '<hr/>';
  
  // Extract existing content (after page title)
  const pageTitleRegex = /<h1>.*?<\/h1>/;
  const existingContent = currentPage.body.storage.value;
  
  // Insert new report after title
  const updatedContent = existingContent.replace(
    pageTitleRegex,
    `$&\n\n${separator}\n\n${header}\n${reportHTML}\n\n${separator}\n`
  );
  
  return updatedContent;
}
```

---

## 5. Cache & Temporary Data

### 5.1 In-Memory Cache

**Purpose:** Avoid redundant API calls during single report run  
**Persistence:** In-memory only (cleared after run)  
**Lifecycle:** Created at start, discarded at end

**Entity:**

```typescript
interface DataCache {
  sprint?: Sprint;
  issues?: JiraIssue[];
  epicDetails?: Map<string, Epic>;
  
  // Timestamps
  cachedAt: Map<string, Date>;
  ttl: number;                 // Time-to-live in milliseconds
}

class CacheManager {
  private cache: DataCache = {
    cachedAt: new Map(),
    ttl: 300000  // 5 minutes
  };
  
  get<T>(key: string): T | null {
    const cachedTime = this.cache.cachedAt.get(key);
    if (!cachedTime) return null;
    
    const age = Date.now() - cachedTime.getTime();
    if (age > this.cache.ttl) {
      this.cache.cachedAt.delete(key);
      return null;
    }
    
    return (this.cache as any)[key];
  }
  
  set<T>(key: string, value: T): void {
    (this.cache as any)[key] = value;
    this.cache.cachedAt.set(key, new Date());
  }
  
  clear(): void {
    this.cache = {
      cachedAt: new Map(),
      ttl: this.cache.ttl
    };
  }
}
```

**Usage:**

```typescript
const cache = new CacheManager();

async function getSprintData(sprintId: string): Promise<Sprint> {
  const cached = cache.get<Sprint>('sprint');
  if (cached) {
    console.log('Using cached sprint data');
    return cached;
  }
  
  console.log('Fetching sprint from Jira...');
  const sprint = await jiraClient.getSprint(sprintId);
  cache.set('sprint', sprint);
  return sprint;
}
```

---

### 5.2 Log Files

**File:** `.claude/logs/weekly-report-YYYY-MM-DD.log`  
**Format:** Plain text (structured logging)  
**Persistence:** Local file system  
**Lifecycle:** Created on each run, retained for debugging

**Entity:**

```typescript
interface LogEntry {
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;           // e.g., "JiraClient", "ReportGenerator"
  message: string;
  context?: Record<string, any>;
}
```

**Example Log:**

```
2024-12-29T15:45:00.123Z [INFO] CommandHandler: /weekly-report command received
2024-12-29T15:45:00.150Z [DEBUG] ConfigLoader: Loading config from .claude/weekly-report-config.json
2024-12-29T15:45:00.175Z [INFO] ConfigLoader: Configuration loaded successfully
2024-12-29T15:45:00.200Z [INFO] JiraClient: Connecting to Jira via MCP
2024-12-29T15:45:00.750Z [INFO] JiraClient: Connected successfully
2024-12-29T15:45:00.755Z [DEBUG] JiraClient: Fetching sprint metadata (sprint_id=12345)
2024-12-29T15:45:00.980Z [INFO] JiraClient: Sprint 24 retrieved
2024-12-29T15:45:00.985Z [DEBUG] JiraClient: Fetching sprint issues (sprint_id=12345)
2024-12-29T15:45:02.345Z [INFO] JiraClient: Retrieved 13 issues
2024-12-29T15:45:02.350Z [DEBUG] DataProcessor: Normalizing 13 issues
2024-12-29T15:45:02.375Z [INFO] DataProcessor: Identified 8 completed, 5 active, 1 blocked
2024-12-29T15:45:02.380Z [DEBUG] ReportGenerator: Calculating metrics
2024-12-29T15:45:02.385Z [INFO] ReportGenerator: Metrics calculated (92% complete)
2024-12-29T15:45:02.390Z [DEBUG] ReportGenerator: Generating markdown
2024-12-29T15:45:02.420Z [INFO] ReportGenerator: Report generated successfully
2024-12-29T15:45:02.425Z [INFO] UIHandler: Displaying report preview to user
2024-12-29T15:45:34.560Z [INFO] UIHandler: User approved publishing
2024-12-29T15:45:34.565Z [INFO] ConfluenceClient: Connecting to Confluence via MCP
2024-12-29T15:45:35.120Z [INFO] ConfluenceClient: Connected successfully
2024-12-29T15:45:35.125Z [DEBUG] ConfluenceClient: Finding page (space=MNGRAI, title=Weekly Status Reports)
2024-12-29T15:45:35.450Z [INFO] ConfluenceClient: Page found (id=123456789, version=15)
2024-12-29T15:45:35.455Z [DEBUG] ConfluenceClient: Converting markdown to Confluence HTML
2024-12-29T15:45:35.480Z [DEBUG] ConfluenceClient: Prepending report to page
2024-12-29T15:45:35.485Z [DEBUG] ConfluenceClient: Updating page (new_version=16)
2024-12-29T15:45:36.320Z [INFO] ConfluenceClient: Page updated successfully
2024-12-29T15:45:36.325Z [INFO] CommandHandler: Report published successfully
2024-12-29T15:45:36.330Z [INFO] CommandHandler: Total execution time: 36.207s
```

**Logging Implementation:**

```typescript
class Logger {
  private logFile: string;
  
  constructor() {
    const date = format(new Date(), 'yyyy-MM-dd');
    this.logFile = `.claude/logs/weekly-report-${date}.log`;
  }
  
  log(level: string, component: string, message: string, context?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: level as any,
      component,
      message,
      context
    };
    
    const logLine = this.formatLogEntry(entry);
    
    // Write to file
    fs.appendFileSync(this.logFile, logLine + '\n', 'utf-8');
    
    // Also console log
    console.log(logLine);
  }
  
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `${timestamp} [${entry.level}] ${entry.component}: ${entry.message}${contextStr}`;
  }
  
  info(component: string, message: string, context?: any) {
    this.log('INFO', component, message, context);
  }
  
  debug(component: string, message: string, context?: any) {
    this.log('DEBUG', component, message, context);
  }
  
  warn(component: string, message: string, context?: any) {
    this.log('WARN', component, message, context);
  }
  
  error(component: string, message: string, context?: any) {
    this.log('ERROR', component, message, context);
  }
}
```

---

## 6. Database Schema (Logical)

**Note:** This tool does NOT use a traditional database. However, here's a logical schema if it were implemented:

### 6.1 Entity-Relationship Diagram

```
┌─────────────────┐
│   Configuration │
│─────────────────│
│ + id: UUID (PK) │
│   project_name  │
│   team_members  │
│   created_at    │
│   updated_at    │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│     Report      │
│─────────────────│
│ + id: UUID (PK) │
│ + config_id (FK)│
│   sprint_id     │
│   sprint_name   │
│   generated_at  │
│   published_at  │
│   status        │
│   markdown      │
│   confluence_id │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│   ReportIssue   │
│─────────────────│
│ + id: UUID (PK) │
│ + report_id (FK)│
│   jira_key      │
│   summary       │
│   status        │
│   epic_name     │
│   story_points  │
│   blocked       │
│   section       │
└─────────────────┘
```

### 6.2 SQL Schema (Hypothetical)

```sql
-- Configuration table
CREATE TABLE configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(255) NOT NULL,
  team_members TEXT[] NOT NULL,
  jira_query_type VARCHAR(10) CHECK (jira_query_type IN ('sprint', 'board')),
  jira_sprint_id VARCHAR(50),
  jira_board_id VARCHAR(50),
  metric_preference VARCHAR(20) CHECK (metric_preference IN ('story_points', 'issue_count')),
  confluence_space_key VARCHAR(50) NOT NULL,
  confluence_page_title VARCHAR(255) NOT NULL,
  health_threshold_green INT DEFAULT 10,
  health_threshold_yellow INT DEFAULT 25,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT sprint_or_board CHECK (
    (jira_query_type = 'sprint' AND jira_sprint_id IS NOT NULL) OR
    (jira_query_type = 'board' AND jira_board_id IS NOT NULL)
  )
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES configurations(id),
  sprint_id VARCHAR(50) NOT NULL,
  sprint_name VARCHAR(255) NOT NULL,
  sprint_start_date TIMESTAMP NOT NULL,
  sprint_end_date TIMESTAMP NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('draft', 'published', 'failed')),
  health VARCHAR(10) CHECK (health IN ('green', 'yellow', 'red')),
  completed_value INT,
  committed_value INT,
  completion_percentage INT,
  blocked_count INT,
  total_count INT,
  markdown TEXT,
  confluence_page_id VARCHAR(50),
  confluence_version INT,
  
  INDEX idx_sprint (sprint_id),
  INDEX idx_status (status),
  INDEX idx_generated_at (generated_at)
);

-- Report issues table (for queryability)
CREATE TABLE report_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  jira_key VARCHAR(50) NOT NULL,
  summary TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  status_category VARCHAR(20) CHECK (status_category IN ('done', 'in_progress', 'to_do', 'blocked')),
  epic_key VARCHAR(50),
  epic_name VARCHAR(255),
  story_points INT,
  blocked BOOLEAN DEFAULT FALSE,
  blocker_reason TEXT,
  completed_date TIMESTAMP,
  section VARCHAR(50) CHECK (section IN ('completed', 'in_progress', 'blockers')),
  
  INDEX idx_jira_key (jira_key),
  INDEX idx_epic (epic_key),
  INDEX idx_section (section)
);

-- Drafts table (for failed publishes)
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  filepath VARCHAR(500) NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255),  -- Why was it saved as draft?
  
  INDEX idx_saved_at (saved_at)
);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR(10) CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  component VARCHAR(100),
  message TEXT,
  context JSONB,
  
  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level)
);
```

**Why NOT implemented:**
- No need for historical queries (Confluence is the source of truth)
- Local files sufficient for configuration and drafts
- Jira already stores source data
- Adds complexity without clear benefit for v1.0

**Future consideration (v2.0+):**
- Implement database for analytics (velocity trends, blockers over time)
- Multi-team dashboard
- Scheduled report history

---

## 7. Data Privacy & Security

### 7.1 Sensitive Data Handling

**Not Stored:**
- ❌ Jira API credentials (handled by MCP)
- ❌ Confluence API credentials (handled by MCP)
- ❌ OAuth tokens (managed by MCP server)
- ❌ Individual assignee names in reports (privacy)
- ❌ Private comments or internal notes

**Stored Locally:**
- ✅ Configuration (no credentials)
- ✅ Draft reports (issue keys, summaries - non-sensitive)
- ✅ Logs (no credentials, sanitized output)

**Stored in Confluence:**
- ✅ Published reports (issue keys, summaries, epics)
- ✅ Sprint metrics (aggregated, no personal data)
- ✅ Blockers (descriptions may contain internal info - acceptable)

### 7.2 Data Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│                      DATA LIFECYCLE                         │
└────────────────────────────────────────────────────────────┘

1. Configuration
   Created: Manually by PM
   Updated: Manually (sprint transitions)
   Deleted: Never (retained)
   Backup: Manual (committed to Git)

2. Jira Issues (Raw)
   Created: Fetched via API
   Updated: Never (transient, re-fetched each run)
   Deleted: Immediately after processing
   Backup: None (source in Jira)

3. Report (Generated)
   Created: Each report run
   Updated: Never (immutable)
   Deleted: Never (draft retained, published to Confluence)
   Backup: Drafts in .claude/drafts/, Confluence history

4. Logs
   Created: Each report run
   Updated: Appended during run
   Deleted: Manual cleanup (recommend 90-day retention)
   Backup: Optional (not critical)

5. Cache
   Created: Start of report run
   Updated: During run
   Deleted: End of run (all cleared)
   Backup: None (temporary only)
```

---

## 8. Data Validation Rules

### 8.1 Configuration Validation

```typescript
interface ValidationRule {
  field: string;
  validate: (value: any, config: Partial<Configuration>) => boolean;
  error: string;
}

const CONFIG_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'project.name',
    validate: (v) => typeof v === 'string' && v.length > 0,
    error: 'Project name is required and must be non-empty'
  },
  {
    field: 'project.team',
    validate: (v) => Array.isArray(v) && v.length > 0,
    error: 'At least one team member is required'
  },
  {
    field: 'jira.query_type',
    validate: (v) => ['sprint', 'board'].includes(v),
    error: 'Query type must be "sprint" or "board"'
  },
  {
    field: 'jira.sprint_id',
    validate: (v, config) => {
      if (config.jira?.query_type === 'sprint') {
        return typeof v === 'string' && v.length > 0;
      }
      return true;  // Not required for board mode
    },
    error: 'Sprint ID is required when query_type is "sprint"'
  },
  {
    field: 'report.health_thresholds.green_max',
    validate: (v, config) => {
      return v >= 0 && v <= 100 && v < (config.report?.health_thresholds?.yellow_max || 100);
    },
    error: 'Green threshold must be 0-100 and less than yellow threshold'
  }
];

function validateConfiguration(config: Partial<Configuration>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const rule of CONFIG_VALIDATION_RULES) {
    const value = getNestedValue(config, rule.field);
    if (!rule.validate(value, config)) {
      errors.push({
        field: rule.field,
        message: rule.error,
        currentValue: value
      });
    }
  }
  
  return errors;
}
```

### 8.2 Issue Data Validation

```typescript
function validateIssue(rawIssue: any): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Required fields
  if (!rawIssue.key) {
    errors.push('Issue key is missing');
  }
  if (!rawIssue.fields?.summary) {
    errors.push('Issue summary is missing');
  }
  if (!rawIssue.fields?.status?.name) {
    errors.push('Issue status is missing');
  }
  
  // Optional but recommended
  if (!rawIssue.fields?.epic) {
    warnings.push(`Issue ${rawIssue.key} has no epic assigned`);
  }
  if (rawIssue.fields?.customfield_10016 === null) {
    warnings.push(`Issue ${rawIssue.key} has no story points`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 9. Data Migration & Versioning

### 9.1 Configuration Schema Versioning

**Version 1.0 (Current):**
- All fields as documented above

**Version 2.0 (Future):**
- Add `report.historical_comparison: boolean`
- Add `jira.custom_jql: string` for advanced filtering
- Add `confluence.template_id: string` for custom templates

**Migration Strategy:**

```typescript
interface ConfigMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (oldConfig: any) => Configuration;
}

const MIGRATIONS: ConfigMigration[] = [
  {
    fromVersion: '1.0',
    toVersion: '2.0',
    migrate: (oldConfig) => {
      // Add new fields with defaults
      return {
        ...oldConfig,
        report: {
          ...oldConfig.report,
          historical_comparison: false  // Default: disabled
        },
        jira: {
          ...oldConfig.jira,
          custom_jql: null  // Default: none
        }
      };
    }
  }
];

function migrateConfiguration(config: any): Configuration {
  let currentVersion = config._version || '1.0';
  let migratedConfig = { ...config };
  
  for (const migration of MIGRATIONS) {
    if (currentVersion === migration.fromVersion) {
      migratedConfig = migration.migrate(migratedConfig);
      currentVersion = migration.toVersion;
      migratedConfig._version = currentVersion;
    }
  }
  
  return migratedConfig;
}
```

---

## 10. Data Access Patterns

### 10.1 Read Patterns

**Configuration:**
- Read once per report run
- Cached in memory
- No concurrent access (single-user tool)

**Jira Issues:**
- Read once (batch fetch)
- No pagination for small sprints (<100 issues)
- Pagination for large sprints (100+ issues)

**Confluence Page:**
- Read once (before publish)
- Version checked for conflicts

**Drafts:**
- Written on failure
- Read rarely (manual recovery)

**Logs:**
- Written continuously
- Read only for debugging

### 10.2 Write Patterns

**Configuration:**
- Written manually (rare)
- No automated updates

**Drafts:**
- Written on publish failure or cancellation
- Atomic write (single operation)

**Confluence Page:**
- Written once per report (append)
- Optimistic locking (version-based)
- Retry on conflict (up to 3 attempts)

**Logs:**
- Appended continuously
- Buffered writes (performance)

---

## 11. Data Quality Metrics

### 11.1 Issue Data Quality Checks

```typescript
interface DataQualityMetrics {
  totalIssues: number;
  issuesWithoutEpic: number;
  issuesWithoutStoryPoints: number;
  issuesWithoutAssignee: number;
  issuesWithIncompleteData: number;
  
  // Percentages
  epicCoverage: number;        // % with epic
  estimationCoverage: number;  // % with story points
  completeness: number;        // Overall data quality
}

function calculateDataQuality(issues: JiraIssue[]): DataQualityMetrics {
  const totalIssues = issues.length;
  const issuesWithoutEpic = issues.filter(i => !i.epic).length;
  const issuesWithoutStoryPoints = issues.filter(i => i.storyPoints === null).length;
  const issuesWithoutAssignee = issues.filter(i => !i.assignee).length;
  
  // Incomplete: missing summary, status, or key (critical fields)
  const issuesWithIncompleteData = issues.filter(i => 
    !i.summary || !i.status || !i.key
  ).length;
  
  return {
    totalIssues,
    issuesWithoutEpic,
    issuesWithoutStoryPoints,
    issuesWithoutAssignee,
    issuesWithIncompleteData,
    epicCoverage: ((totalIssues - issuesWithoutEpic) / totalIssues) * 100,
    estimationCoverage: ((totalIssues - issuesWithoutStoryPoints) / totalIssues) * 100,
    completeness: ((totalIssues - issuesWithIncompleteData) / totalIssues) * 100
  };
}
```

**Thresholds:**
- **Epic Coverage:** Warn if < 80%
- **Estimation Coverage:** Warn if < 70% (and preference = story_points)
- **Completeness:** Error if < 100% (critical fields)

---

## Summary

### Data Storage Locations

| Data Type | Storage | Persistence | Access Pattern |
|-----------|---------|-------------|----------------|
| Configuration | Local file (JSON) | Permanent | Read-heavy |
| Jira Issues | In-memory | Transient | Read-once |
| Report (Draft) | Local file (MD) | Permanent | Write-on-failure |
| Report (Published) | Confluence (HTML) | Permanent | Write-once |
| Cache | In-memory | Transient | Read/Write during run |
| Logs | Local file (TXT) | Permanent (manual cleanup) | Append-only |

### Data Dependencies

```
Configuration → Jira Client → Issues → Report → Confluence
                                 ↓
                              Drafts (on failure)
                                 ↓
                              Logs (always)
```

### Data Size Estimates

| Data Type | Typical Size | Max Size |
|-----------|-------------|----------|
| Configuration | 2-5 KB | 10 KB |
| Single Issue (raw JSON) | 5-10 KB | 50 KB |
| 100 Issues (raw JSON) | 500 KB - 1 MB | 5 MB |
| Normalized Issue | 1-2 KB | 5 KB |
| Complete Report (MD) | 10-30 KB | 100 KB |
| Confluence Page (HTML) | 50-200 KB | 2 MB (after many reports) |
| Log File (single run) | 10-50 KB | 500 KB |

---

*End of Data Model Document*
