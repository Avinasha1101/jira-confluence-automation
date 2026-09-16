# API Endpoints & Data Flow: Weekly Status Report Generator

## Overview

This document details all API interactions, data flows, and integration points for the Manager.AI Weekly Status Report Generator. The tool primarily interacts with Jira and Confluence via MCP (Model Context Protocol) connectors.

**Version:** 1.0  
**Date:** December 25, 2024  
**Product Manager:** Avinash Agarwal

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Claude Code Environment                    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         Weekly Report Generator (Python/TS)         │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │         Configuration Layer                   │ │   │
│  │  │  - Load config from .claude/                  │ │   │
│  │  │  - Validate settings                          │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │                      │                              │   │
│  │                      ▼                              │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │         MCP Client Layer                      │ │   │
│  │  │  - Jira MCP Connector                         │ │   │
│  │  │  - Confluence MCP Connector                   │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │           │                           │             │   │
│  │           ▼                           ▼             │   │
│  │  ┌──────────────┐           ┌──────────────┐     │   │
│  │  │ Jira Client  │           │Confluence Cl.│     │   │
│  │  │   (Wrapper)  │           │  (Wrapper)   │     │   │
│  │  └──────────────┘           └──────────────┘     │   │
│  │           │                           │             │   │
│  └───────────┼───────────────────────────┼─────────────┘   │
│              │                           │                  │
└──────────────┼───────────────────────────┼──────────────────┘
               │                           │
               ▼                           ▼
      ┌─────────────────┐        ┌─────────────────┐
      │  Jira Cloud API │        │ Confluence API  │
      │  (REST v3)      │        │  (REST v2)      │
      └─────────────────┘        └─────────────────┘
```

---

## MCP (Model Context Protocol) Integration

### What is MCP?

MCP is a protocol that enables secure integration between Claude Code and external services. Instead of direct API calls, the tool communicates through MCP servers that handle authentication, rate limiting, and data transformation.

### MCP Connectors Used

1. **Atlassian Jira MCP Server**
   - Repository: `@modelcontextprotocol/server-atlassian-jira`
   - Authentication: OAuth 2.0 (handled by MCP)
   - Scope: Read access to issues, sprints, boards

2. **Atlassian Confluence MCP Server**
   - Repository: `@modelcontextprotocol/server-atlassian-confluence`
   - Authentication: OAuth 2.0 (handled by MCP)
   - Scope: Read/write access to pages in configured space

### MCP Authorization Flow

```
1. User installs MCP servers (one-time)
   └─> npm install -g @modelcontextprotocol/server-atlassian-jira

2. User authorizes servers in Claude Code (one-time)
   └─> Settings → MCP Servers → Authorize Atlassian

3. MCP server obtains OAuth tokens (automatic)
   └─> User redirected to Atlassian login
   └─> Tokens stored securely by MCP

4. Tool invokes MCP methods (every run)
   └─> MCP server uses stored tokens
   └─> No token management in tool code
```

---

## API Endpoints

### 1. Jira API Endpoints (via MCP)

#### 1.1 Get Sprint Metadata

**Endpoint:** `GET /rest/agile/1.0/sprint/{sprintId}`  
**MCP Method:** `jira.getSprint(sprintId)`

**Purpose:** Retrieve sprint details including dates, name, and state.

**Request Parameters:**
```typescript
{
  sprintId: string;  // Sprint ID from configuration
}
```

**Response:**
```json
{
  "id": "12345",
  "self": "https://company.atlassian.net/rest/agile/1.0/sprint/12345",
  "state": "active",
  "name": "Sprint 24",
  "startDate": "2024-12-18T09:00:00.000Z",
  "endDate": "2024-12-29T18:00:00.000Z",
  "originBoardId": 67,
  "goal": "Complete user authentication and dashboard redesign"
}
```

**Error Handling:**
- `404 Not Found` → Sprint doesn't exist (invalid sprint ID)
- `401 Unauthorized` → MCP not authorized
- `403 Forbidden` → No access to sprint/board
- `500 Server Error` → Jira API issue (retry with backoff)

**Usage in Tool:**
```typescript
const sprint = await jiraClient.getSprint(config.jira.sprint_id);
const reportTitle = `Report: ${sprint.name} (${formatDateRange(sprint.startDate, sprint.endDate)})`;
```

---

#### 1.2 Get Sprint Issues

**Endpoint:** `GET /rest/agile/1.0/sprint/{sprintId}/issue`  
**MCP Method:** `jira.getSprintIssues(sprintId, options)`

**Purpose:** Retrieve all issues in a sprint with full details.

**Request Parameters:**
```typescript
{
  sprintId: string;
  startAt?: number;      // Pagination offset (default: 0)
  maxResults?: number;   // Page size (default: 100, max: 100)
  fields?: string[];     // Fields to include
  expand?: string[];     // Additional data to expand
}
```

**Fields Requested:**
```typescript
fields: [
  'summary',           // Issue title
  'status',            // Current status
  'issuetype',         // Story, Bug, Task, etc.
  'priority',          // Priority level
  'assignee',          // Assigned person (not shown in report)
  'epic',              // Epic link
  'customfield_10016', // Story points (field ID varies by instance)
  'labels',            // Issue labels
  'flagged',           // Blocked flag
  'comment'            // Comments (for blocker reasons)
]

expand: [
  'changelog'          // Status change history
]
```

**Response:**
```json
{
  "startAt": 0,
  "maxResults": 100,
  "total": 13,
  "issues": [
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
        "customfield_10016": 5,  // Story points
        "labels": [],
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
    },
    // ... more issues
  ]
}
```

**Pagination Handling:**
```typescript
async function getAllSprintIssues(sprintId: string): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = [];
  let startAt = 0;
  const maxResults = 100;
  
  while (true) {
    const response = await jiraClient.getSprintIssues(sprintId, {
      startAt,
      maxResults,
      fields: REQUIRED_FIELDS,
      expand: ['changelog']
    });
    
    allIssues.push(...response.issues);
    
    if (allIssues.length >= response.total) {
      break;
    }
    
    startAt += maxResults;
  }
  
  return allIssues;
}
```

**Error Handling:**
- `404 Not Found` → Sprint doesn't exist
- `401 Unauthorized` → MCP not authorized
- `429 Too Many Requests` → Rate limited (wait and retry)
- Partial failure → Log warning, continue with available data

---

#### 1.3 Get Board Issues (Alternative to Sprint)

**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/issue`  
**MCP Method:** `jira.getBoardIssues(boardId, options)`

**Purpose:** Retrieve all issues from a Kanban board (for non-sprint workflows).

**Request Parameters:**
```typescript
{
  boardId: string;
  jql?: string;          // Additional JQL filter
  startAt?: number;
  maxResults?: number;
  fields?: string[];
}
```

**JQL Filter Applied:**
```sql
-- Get only active issues (exclude archived)
status NOT IN (Closed, Cancelled, Archived)
AND updated >= -30d  -- Only issues updated in last 30 days
ORDER BY rank ASC
```

**Response:** Same structure as Sprint Issues (1.2)

**Usage:**
```typescript
if (config.jira.query_type === 'board') {
  const issues = await jiraClient.getBoardIssues(config.jira.board_id, {
    jql: 'status NOT IN (Closed, Cancelled)',
    fields: REQUIRED_FIELDS,
    expand: ['changelog']
  });
}
```

---

#### 1.4 Search Issues with JQL (Advanced)

**Endpoint:** `POST /rest/api/3/search`  
**MCP Method:** `jira.searchIssues(jql, options)`

**Purpose:** Execute custom JQL queries for completion detection.

**Request Body:**
```json
{
  "jql": "status changed to (Done, Resolved) DURING (startOfSprint(), endOfSprint()) AND sprint = 12345",
  "startAt": 0,
  "maxResults": 100,
  "fields": ["key", "summary", "status", "epic", "customfield_10016"],
  "expand": ["changelog"]
}
```

**Completion Detection Query:**
```typescript
const completedIssuesJQL = `
  status changed to (Done, Resolved, Closed)
  DURING ("${sprint.startDate}", "${sprint.endDate}")
  AND sprint = ${sprintId}
  ORDER BY resolved DESC
`;

const completedIssues = await jiraClient.searchIssues(completedIssuesJQL);
```

**Response:** Same structure as Sprint Issues (1.2)

---

#### 1.5 Get Issue Details (Individual)

**Endpoint:** `GET /rest/api/3/issue/{issueKey}`  
**MCP Method:** `jira.getIssue(issueKey, options)`

**Purpose:** Fetch additional details for a specific issue (e.g., blocker reason).

**Request Parameters:**
```typescript
{
  issueKey: string;      // e.g., "PROJ-123"
  fields?: string[];
  expand?: string[];
}
```

**Response:**
```json
{
  "key": "PROJ-126",
  "fields": {
    "summary": "Add two-factor authentication",
    "status": {
      "name": "Blocked"
    },
    "comment": {
      "comments": [
        {
          "body": "Blocked: Waiting on security team approval for SMS provider",
          "created": "2024-12-20T10:00:00.000Z"
        }
      ]
    }
  }
}
```

**Usage (Blocker Reason Extraction):**
```typescript
async function getBlockerReason(issueKey: string): Promise<string> {
  const issue = await jiraClient.getIssue(issueKey, {
    fields: ['comment'],
    expand: ['comment']
  });
  
  // Find most recent comment mentioning "blocked"
  const blockerComment = issue.fields.comment.comments
    .reverse()
    .find(c => c.body.toLowerCase().includes('blocked'));
  
  return blockerComment?.body || 'Reason not specified';
}
```

---

### 2. Confluence API Endpoints (via MCP)

#### 2.1 Get Page by Title

**Endpoint:** `GET /wiki/rest/api/content`  
**MCP Method:** `confluence.getPageByTitle(spaceKey, title)`

**Purpose:** Find existing report page or determine if creation needed.

**Request Parameters:**
```typescript
{
  spaceKey: string;      // e.g., "MNGRAI"
  title: string;         // e.g., "Weekly Status Reports - Manager.AI"
  expand?: string[];     // ["body.storage", "version"]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "123456789",
      "type": "page",
      "status": "current",
      "title": "Weekly Status Reports - Manager.AI",
      "version": {
        "number": 15,
        "when": "2024-12-20T16:45:00.000Z"
      },
      "body": {
        "storage": {
          "value": "<h1>Weekly Status Reports - Manager.AI</h1><hr/><h2>Report: Sprint 23...</h2>",
          "representation": "storage"
        }
      },
      "_links": {
        "webui": "/wiki/spaces/MNGRAI/pages/123456789"
      }
    }
  ],
  "size": 1
}
```

**Error Handling:**
- `404 Not Found` → Page doesn't exist (will create)
- `401 Unauthorized` → MCP not authorized
- `403 Forbidden` → No access to space
- Multiple results → Use first result, log warning

**Usage:**
```typescript
async function findOrCreatePage(spaceKey: string, title: string): Promise<Page> {
  try {
    const page = await confluenceClient.getPageByTitle(spaceKey, title);
    return page;
  } catch (error) {
    if (error.status === 404) {
      return await confluenceClient.createPage(spaceKey, title, '');
    }
    throw error;
  }
}
```

---

#### 2.2 Create Page

**Endpoint:** `POST /wiki/rest/api/content`  
**MCP Method:** `confluence.createPage(spaceKey, title, body)`

**Purpose:** Create initial report page if it doesn't exist.

**Request Body:**
```json
{
  "type": "page",
  "title": "Weekly Status Reports - Manager.AI",
  "space": {
    "key": "MNGRAI"
  },
  "body": {
    "storage": {
      "value": "<h1>Weekly Status Reports - Manager.AI</h1><p>Initial page created. Reports will appear below.</p>",
      "representation": "storage"
    }
  }
}
```

**Response:**
```json
{
  "id": "123456789",
  "type": "page",
  "status": "current",
  "title": "Weekly Status Reports - Manager.AI",
  "version": {
    "number": 1
  },
  "_links": {
    "webui": "/wiki/spaces/MNGRAI/pages/123456789"
  }
}
```

**Error Handling:**
- `409 Conflict` → Page already exists (fetch instead)
- `400 Bad Request` → Invalid space key or title
- `403 Forbidden` → No create permission

---

#### 2.3 Update Page Content

**Endpoint:** `PUT /wiki/rest/api/content/{pageId}`  
**MCP Method:** `confluence.updatePage(pageId, title, body, version)`

**Purpose:** Append new report to existing page (main publishing action).

**Request Body:**
```json
{
  "id": "123456789",
  "type": "page",
  "title": "Weekly Status Reports - Manager.AI",
  "version": {
    "number": 16,
    "message": "Added Sprint 24 report"
  },
  "body": {
    "storage": {
      "value": "<h1>Weekly Status Reports - Manager.AI</h1><hr/><h2>Report: Sprint 24 (Dec 18 - Dec 29, 2024)</h2><p><em>Published: Dec 29, 2024 at 3:45 PM</em></p><!-- NEW REPORT CONTENT --><hr/><h2>Report: Sprint 23...</h2><!-- OLD REPORTS -->",
      "representation": "storage"
    }
  }
}
```

**Version Conflict Handling:**
```typescript
async function publishReport(pageId: string, newReport: string): Promise<void> {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Fetch current page content and version
      const currentPage = await confluenceClient.getPage(pageId);
      const currentContent = currentPage.body.storage.value;
      const currentVersion = currentPage.version.number;
      
      // Prepend new report to existing content
      const updatedContent = prependReport(newReport, currentContent);
      
      // Update with incremented version
      await confluenceClient.updatePage(
        pageId,
        currentPage.title,
        updatedContent,
        currentVersion + 1
      );
      
      return; // Success
      
    } catch (error) {
      if (error.status === 409 && attempt < maxRetries) {
        // Version conflict - retry with latest version
        await sleep(1000 * attempt); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Failed to publish after 3 attempts (version conflicts)');
}
```

**Content Prepending Logic:**
```typescript
function prependReport(newReport: string, existingContent: string): string {
  // Convert markdown report to Confluence storage format (HTML)
  const newReportHTML = markdownToConfluenceHTML(newReport);
  
  // Add timestamp
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const reportWithTimestamp = `
    <h2>Report: Sprint 24 (Dec 18 - Dec 29, 2024)</h2>
    <p><em>Published: ${timestamp}</em></p>
    ${newReportHTML}
    <hr/>
  `;
  
  // Insert after page title, before existing reports
  const pageTitleRegex = /<h1>.*?<\/h1>/;
  return existingContent.replace(
    pageTitleRegex,
    `$&\n${reportWithTimestamp}`
  );
}
```

---

#### 2.4 Get Page Content (for Verification)

**Endpoint:** `GET /wiki/rest/api/content/{pageId}`  
**MCP Method:** `confluence.getPage(pageId, expand)`

**Purpose:** Retrieve page content after publishing to verify success.

**Request Parameters:**
```typescript
{
  pageId: string;
  expand?: string[];  // ["body.storage", "version"]
}
```

**Response:** Same as 2.1

**Usage:**
```typescript
async function verifyPublish(pageId: string, expectedContent: string): Promise<boolean> {
  const page = await confluenceClient.getPage(pageId, ['body.storage']);
  return page.body.storage.value.includes(expectedContent);
}
```

---

## Data Transformation Pipeline

### Pipeline Overview

```
Jira Raw Data → Normalize → Filter → Group → Calculate → Format → Markdown → HTML → Confluence
```

### Step 1: Normalize Jira Data

**Input:** Jira API response (varying structures across instances)

**Output:** Standardized `JiraIssue` objects

```typescript
interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: 'done' | 'in_progress' | 'to_do' | 'blocked';
  epic: {
    key: string;
    name: string;
  } | null;
  storyPoints: number | null;
  blocked: boolean;
  blockerReason: string | null;
  completedDate: Date | null;
  assignee: string | null;  // Not used in report
}

function normalizeJiraIssue(rawIssue: any, config: Config): JiraIssue {
  return {
    key: rawIssue.key,
    summary: rawIssue.fields.summary,
    status: rawIssue.fields.status.name,
    statusCategory: mapStatus(rawIssue.fields.status.name, config.jira.status_mappings),
    epic: rawIssue.fields.epic ? {
      key: rawIssue.fields.epic.key,
      name: rawIssue.fields.epic.name
    } : null,
    storyPoints: rawIssue.fields[config.jira.story_points_field] || null,
    blocked: isBlocked(rawIssue),
    blockerReason: extractBlockerReason(rawIssue),
    completedDate: getCompletionDate(rawIssue.changelog),
    assignee: rawIssue.fields.assignee?.displayName || null
  };
}
```

---

### Step 2: Filter Issues

**Completed Issues:**
```typescript
function filterCompletedIssues(issues: JiraIssue[], sprint: Sprint): JiraIssue[] {
  return issues.filter(issue => {
    if (issue.statusCategory !== 'done') return false;
    if (!issue.completedDate) return false;
    
    return issue.completedDate >= sprint.startDate 
        && issue.completedDate <= sprint.endDate;
  });
}
```

**In Progress / Planned:**
```typescript
function filterActiveIssues(issues: JiraIssue[]): JiraIssue[] {
  return issues.filter(issue => 
    issue.statusCategory === 'in_progress' || 
    issue.statusCategory === 'to_do'
  );
}
```

**Blockers:**
```typescript
function filterBlockers(issues: JiraIssue[]): JiraIssue[] {
  return issues.filter(issue => issue.blocked);
}
```

---

### Step 3: Group by Epic

```typescript
interface EpicGroup {
  epicKey: string | null;
  epicName: string;
  issues: JiraIssue[];
  totalStoryPoints: number;
  issueCount: number;
}

function groupByEpic(issues: JiraIssue[]): EpicGroup[] {
  const groups = new Map<string, JiraIssue[]>();
  
  issues.forEach(issue => {
    const epicKey = issue.epic?.key || 'unassigned';
    if (!groups.has(epicKey)) {
      groups.set(epicKey, []);
    }
    groups.get(epicKey)!.push(issue);
  });
  
  const epicGroups: EpicGroup[] = [];
  
  groups.forEach((issues, epicKey) => {
    epicGroups.push({
      epicKey: epicKey === 'unassigned' ? null : epicKey,
      epicName: issues[0].epic?.name || 'Unassigned',
      issues,
      totalStoryPoints: issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0),
      issueCount: issues.length
    });
  });
  
  // Sort: Epics alphabetically, Unassigned last
  return epicGroups.sort((a, b) => {
    if (a.epicKey === null) return 1;
    if (b.epicKey === null) return -1;
    return a.epicName.localeCompare(b.epicName);
  });
}
```

---

### Step 4: Calculate Metrics

```typescript
interface SprintMetrics {
  completedValue: number;
  committedValue: number;
  completionPercentage: number;
  statusBreakdown: {
    done: number;
    inProgress: number;
    toDo: number;
    blocked: number;
  };
  health: 'green' | 'yellow' | 'red';
  healthIcon: string;
  blockedPercentage: number;
}

function calculateMetrics(
  issues: JiraIssue[], 
  config: Config
): SprintMetrics {
  const useStoryPoints = config.jira.metric_preference === 'story_points';
  
  const completedIssues = issues.filter(i => i.statusCategory === 'done');
  const blockedIssues = issues.filter(i => i.blocked);
  
  const completedValue = useStoryPoints
    ? completedIssues.reduce((sum, i) => sum + (i.storyPoints || 1), 0)
    : completedIssues.length;
  
  const committedValue = useStoryPoints
    ? issues.reduce((sum, i) => sum + (i.storyPoints || 1), 0)
    : issues.length;
  
  const completionPercentage = committedValue > 0
    ? Math.round((completedValue / committedValue) * 100)
    : 0;
  
  const blockedPercentage = issues.length > 0
    ? (blockedIssues.length / issues.length) * 100
    : 0;
  
  const health = 
    blockedPercentage < config.report.health_thresholds.green_max ? 'green' :
    blockedPercentage <= config.report.health_thresholds.yellow_max ? 'yellow' :
    'red';
  
  return {
    completedValue,
    committedValue,
    completionPercentage,
    statusBreakdown: {
      done: issues.filter(i => i.statusCategory === 'done').length,
      inProgress: issues.filter(i => i.statusCategory === 'in_progress').length,
      toDo: issues.filter(i => i.statusCategory === 'to_do').length,
      blocked: blockedIssues.length
    },
    health,
    healthIcon: health === 'green' ? '🟢' : health === 'yellow' ? '🟡' : '🔴',
    blockedPercentage
  };
}
```

---

### Step 5: Format to Markdown

```typescript
function generateMarkdownReport(
  sprint: Sprint,
  issues: JiraIssue[],
  metrics: SprintMetrics,
  config: Config
): string {
  const sections = [
    generateExecutiveSummary(sprint, metrics),
    generateCompletedSection(filterCompletedIssues(issues, sprint)),
    generateInProgressSection(filterActiveIssues(issues)),
    generateBlockersSection(filterBlockers(issues)),
    generateMetricsSection(metrics, config)
  ];
  
  return sections.join('\n\n---\n\n');
}
```

---

### Step 6: Convert to Confluence HTML

```typescript
function markdownToConfluenceHTML(markdown: string): string {
  // Use markdown library + custom Confluence formatting
  let html = marked.parse(markdown);
  
  // Confluence-specific transformations
  html = html
    .replace(/<h2>/g, '<h2 style="color: #172B4D;">')
    .replace(/🟢/g, '<ac:emoticon ac:name="green_circle" />')
    .replace(/🟡/g, '<ac:emoticon ac:name="yellow_circle" />')
    .replace(/🔴/g, '<ac:emoticon ac:name="red_circle" />')
    .replace(/✅/g, '<ac:emoticon ac:name="check" />')
    .replace(/🔄/g, '<ac:emoticon ac:name="arrows_counterclockwise" />')
    .replace(/📋/g, '<ac:emoticon ac:name="clipboard" />')
    .replace(/🚫/g, '<ac:emoticon ac:name="no_entry_sign" />');
  
  return html;
}
```

---

## Error Handling & Retry Logic

### Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;      // milliseconds
  maxDelay: number;       // milliseconds
  backoffMultiplier: number;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry permanent errors
      if (!isRetryable(error)) {
        throw error;
      }
      
      if (attempt === config.maxAttempts) {
        throw new Error(
          `Operation failed after ${config.maxAttempts} attempts: ${lastError.message}`
        );
      }
      
      // Calculate exponential backoff delay
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

function isRetryable(error: any): boolean {
  // Retry network errors, timeouts, rate limits
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.status === 429 ||  // Rate limit
    error.status === 503 ||  // Service unavailable
    error.status === 504     // Gateway timeout
  );
}
```

---

### Error Response Formats

#### Jira API Error

```json
{
  "errorMessages": [
    "Sprint does not exist or you do not have permission to access it."
  ],
  "errors": {}
}
```

#### Confluence API Error

```json
{
  "statusCode": 409,
  "message": "A page with this title already exists",
  "reason": "Conflict"
}
```

#### MCP Error

```json
{
  "error": {
    "code": "mcp_unauthorized",
    "message": "MCP server 'atlassian-jira' is not authorized",
    "details": {
      "serverName": "atlassian-jira",
      "authUrl": "https://id.atlassian.com/oauth/authorize?..."
    }
  }
}
```

---

## Rate Limiting

### Jira Cloud Rate Limits

**Per User:**
- 50 requests per second
- 3,000 requests per hour

**Strategy:**
- Batch requests when possible
- Use pagination (max 100 results per page)
- Implement exponential backoff on 429 responses

**Implementation:**
```typescript
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens = 50;
  private readonly refillRate = 50; // tokens per second
  
  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens < 1) {
      const waitTime = 1000 / this.refillRate;
      await sleep(waitTime);
      this.refill();
    }
    
    this.tokens -= 1;
  }
  
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

---

### Confluence Cloud Rate Limits

**Per User:**
- Similar to Jira (50 req/sec, 3000 req/hour)

**Page Update Specific:**
- Maximum 1 update per second per page (to prevent version conflicts)

**Strategy:**
- Single page update per report run
- Retry with latest version on conflicts

---

## Security Considerations

### Authentication

**MCP OAuth Tokens:**
- Stored securely by MCP server (not in tool code)
- Scoped to minimum required permissions
- Automatically refreshed by MCP

**Configuration File:**
- No credentials stored in `.claude/weekly-report-config.json`
- File excluded from Git via `.gitignore`

### Data Privacy

**Not Exposed in Reports:**
- Individual assignee names
- Detailed time tracking
- Private comments
- Internal team communications

**Audit Trail:**
- Confluence page history tracks all updates
- Each report includes publish timestamp
- MCP logs all API requests (for debugging)

---

## Performance Optimization

### Caching Strategy

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;  // milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}

// Usage
const cache = new DataCache();

async function getSprintWithCache(sprintId: string): Promise<Sprint> {
  const cacheKey = `sprint:${sprintId}`;
  const cached = cache.get<Sprint>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const sprint = await jiraClient.getSprint(sprintId);
  cache.set(cacheKey, sprint, 300000); // 5 minutes TTL
  
  return sprint;
}
```

### Parallel Requests

```typescript
async function fetchAllData(config: Config): Promise<ReportData> {
  // Fetch sprint metadata and issues in parallel
  const [sprint, issues] = await Promise.all([
    jiraClient.getSprint(config.jira.sprint_id),
    jiraClient.getSprintIssues(config.jira.sprint_id)
  ]);
  
  // Fetch issue details for blockers only (parallel)
  const blockers = issues.filter(i => i.blocked);
  const blockerDetails = await Promise.all(
    blockers.map(b => jiraClient.getIssue(b.key, { fields: ['comment'] }))
  );
  
  return {
    sprint,
    issues: mergeBlockerDetails(issues, blockerDetails)
  };
}
```

---

## API Call Sequence (End-to-End)

### Typical Report Generation

```
1. Load Configuration
   └─> Read .claude/weekly-report-config.json (local file, <10ms)

2. Validate Configuration
   └─> Check required fields, types (local validation, <5ms)

3. Connect to Jira (MCP)
   └─> MCP handshake (if not already connected, ~500ms first time)

4. Fetch Sprint Metadata
   └─> GET /rest/agile/1.0/sprint/{sprintId} (~200ms)

5. Fetch Sprint Issues (with pagination)
   └─> GET /rest/agile/1.0/sprint/{sprintId}/issue (page 1, ~500ms)
   └─> GET /rest/agile/1.0/sprint/{sprintId}/issue (page 2, ~500ms, if needed)

6. Fetch Blocker Details (parallel)
   └─> GET /rest/api/3/issue/{key} for each blocker (~200ms each, parallel)

7. Process Data (local)
   └─> Normalize, filter, group, calculate (~50ms)

8. Generate Report (local)
   └─> Format markdown (~20ms)

9. Display Preview (UI)
   └─> Show in Claude Code interface (~10ms)

10. Wait for PM Approval (human)
    └─> User reviews and responds

11. Connect to Confluence (MCP)
    └─> MCP handshake (if not already connected, ~500ms)

12. Find Confluence Page
    └─> GET /wiki/rest/api/content?title=... (~300ms)

13. Update Page Content
    └─> PUT /wiki/rest/api/content/{pageId} (~500ms)
    └─> Retry if version conflict (~800ms, if needed)

14. Display Success
    └─> Show confirmation with page URL

Total Time: ~3-5 seconds (excluding PM review)
```

---

## API Mocking for Testing

### Mock Jira Responses

```typescript
// tests/mocks/jira-responses.ts

export const mockSprint = {
  id: '12345',
  name: 'Sprint 24',
  state: 'active',
  startDate: '2024-12-18T09:00:00.000Z',
  endDate: '2024-12-29T18:00:00.000Z',
  goal: 'Complete user authentication'
};

export const mockIssues = [
  {
    key: 'PROJ-123',
    fields: {
      summary: 'Implement OAuth2 login',
      status: { name: 'Done' },
      epic: {
        key: 'PROJ-100',
        name: 'User Authentication System'
      },
      customfield_10016: 5,
      flagged: false
    },
    changelog: {
      histories: [
        {
          created: '2024-12-22T14:30:00.000Z',
          items: [
            {
              field: 'status',
              fromString: 'In Progress',
              toString: 'Done'
            }
          ]
        }
      ]
    }
  },
  // ... more mock issues
];
```

### Mock MCP Client

```typescript
// tests/mocks/mcp-client.ts

export class MockJiraClient implements JiraClient {
  async getSprint(sprintId: string): Promise<Sprint> {
    if (sprintId === 'invalid') {
      throw new Error('Sprint not found');
    }
    return mockSprint;
  }
  
  async getSprintIssues(sprintId: string): Promise<JiraIssue[]> {
    return mockIssues;
  }
  
  // ... other methods
}

export class MockConfluenceClient implements ConfluenceClient {
  private pages = new Map<string, Page>();
  
  async getPageByTitle(spaceKey: string, title: string): Promise<Page> {
    const key = `${spaceKey}:${title}`;
    const page = this.pages.get(key);
    if (!page) {
      throw { status: 404, message: 'Page not found' };
    }
    return page;
  }
  
  // ... other methods
}
```

---

## Appendix: Custom Field IDs

Jira custom field IDs vary by instance. Common fields:

| Field Name | Common Field ID | How to Find |
|------------|----------------|-------------|
| Story Points | `customfield_10016` | Settings → Issues → Custom Fields → "Story Points" |
| Epic Link | `customfield_10014` | Settings → Issues → Custom Fields → "Epic Link" |
| Sprint | `customfield_10020` | Settings → Issues → Custom Fields → "Sprint" |
| Flagged | `customfield_10021` | Settings → Issues → Custom Fields → "Flagged" |

**How to Discover Field IDs:**
```bash
# Get issue with all fields
curl -u email:token https://company.atlassian.net/rest/api/3/issue/PROJ-123

# Search for "story" in response JSON
# Look for: "customfield_XXXXX": 5
```

**Configuration Support:**
```json
{
  "jira": {
    "custom_fields": {
      "story_points": "customfield_10016",
      "epic_link": "customfield_10014"
    }
  }
}
```

---

*End of API Endpoints Document*
