# Implementation Plan: Weekly Status Report Generator

## Overview

This document provides a detailed, phase-based implementation plan for the Manager.AI Weekly Status Report Generator. The plan breaks down development into manageable phases with clear milestones, dependencies, and deliverables.

**Version:** 1.0  
**Date:** December 25, 2024  
**Product Manager:** Avinash Agarwal  
**Target Delivery:** January 25, 2025 (4 weeks)

---

## Project Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        4-WEEK IMPLEMENTATION                         │
└─────────────────────────────────────────────────────────────────────┘

Week 1: Phase 1 + 2        Week 2: Phase 3        Week 3: Phase 4        Week 4: Phase 5
├──────────────────┤      ├──────────────┤      ├──────────────┤      ├──────────────┤
│ Setup & Config   │      │ Report Gen   │      │ Integration  │      │ Testing &    │
│ Jira Integration │      │ Publishing   │      │ Error Handle │      │ Documentation│
└──────────────────┘      └──────────────┘      └──────────────┘      └──────────────┘

        ↓                         ↓                     ↓                      ↓
    Milestone 1             Milestone 2           Milestone 3            Milestone 4
    (Dec 28)                (Jan 4)               (Jan 11)               (Jan 18)
```

**Final Delivery:** January 25, 2025

---

## Phase 0: Project Setup (Day 1)

**Duration:** 4 hours  
**Goal:** Set up development environment and project structure

### Tasks

#### 0.1 Repository Structure Setup
**Time:** 1 hour  
**Priority:** Must Have

**Activities:**
- [ ] Create project directory structure
- [ ] Initialize package.json (Node.js) or requirements.txt (Python)
- [ ] Set up .gitignore (exclude .claude/, node_modules/, etc.)
- [ ] Create README with quick start guide
- [ ] Set up .env.example for configuration template

**Directory Structure:**
```
Manager.AI/
├── src/
│   ├── config/              # Configuration management
│   ├── clients/             # MCP client wrappers
│   │   ├── jira/
│   │   └── confluence/
│   ├── processors/          # Data processing
│   ├── generators/          # Report generation
│   ├── ui/                  # CLI/UI handlers
│   └── utils/               # Utilities (logging, etc.)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── spec/                    # All specification docs
├── .claude/
│   ├── weekly-report-config.json
│   ├── drafts/
│   └── logs/
├── .gitignore
├── package.json / requirements.txt
└── README.md
```

**Deliverable:** Working project skeleton

---

#### 0.2 Development Environment Setup
**Time:** 1 hour  
**Priority:** Must Have

**Activities:**
- [ ] Install MCP CLI tools
- [ ] Install Atlassian Jira MCP server
- [ ] Install Atlassian Confluence MCP server
- [ ] Authorize MCP servers with OAuth
- [ ] Verify MCP connections work (/mcp-status)
- [ ] Set up IDE (VSCode with Claude Code extension)

**Commands:**
```bash
# Install MCP servers (if not already installed)
npm install -g @modelcontextprotocol/cli
npm install -g @modelcontextprotocol/server-atlassian-jira
npm install -g @modelcontextprotocol/server-atlassian-confluence

# Authorize in Claude Code
# Settings → MCP Servers → Authorize Atlassian
```

**Deliverable:** Authorized MCP environment

---

#### 0.3 Testing Framework Setup
**Time:** 1 hour  
**Priority:** Must Have

**Activities:**
- [ ] Install testing framework (Jest for Node.js or pytest for Python)
- [ ] Create test directory structure
- [ ] Set up test fixtures (mock Jira/Confluence responses)
- [ ] Write sample test to verify setup
- [ ] Configure code coverage reporting

**Python Setup:**
```bash
pip install pytest pytest-cov pytest-mock
```

**Node.js Setup:**
```bash
npm install --save-dev jest @types/jest ts-jest
```

**Deliverable:** Passing sample test

---

#### 0.4 Logging & Utilities Setup
**Time:** 1 hour  
**Priority:** Must Have

**Activities:**
- [ ] Create Logger class/module
- [ ] Implement log file rotation
- [ ] Set up console and file logging
- [ ] Create utility functions (date formatting, etc.)
- [ ] Write tests for utilities

**Deliverable:** Working logger with tests

---

**Phase 0 Milestone:** Development environment ready, project structure in place

---

## Phase 1: Configuration Management (Days 2-3)

**Duration:** 2 days (12 hours)  
**Goal:** Implement configuration loading, validation, and defaults

### Tasks

#### 1.1 Configuration Schema Definition
**Time:** 2 hours  
**Priority:** Must Have  
**User Story:** US-012

**Activities:**
- [ ] Define TypeScript interfaces or Python dataclasses
- [ ] Create Configuration class with properties
- [ ] Implement default values
- [ ] Write unit tests for data structures

**Files to Create:**
- `src/config/schema.ts` (or `.py`)
- `tests/unit/config/test_schema.py`

**Deliverable:** Typed configuration schema

---

#### 1.2 Configuration File Loader
**Time:** 3 hours  
**Priority:** Must Have  
**User Story:** US-012

**Activities:**
- [ ] Implement loadConfig() function
- [ ] Handle file not found gracefully
- [ ] Parse JSON and populate schema
- [ ] Apply default values for missing fields
- [ ] Write unit tests (valid, missing, invalid JSON)

**Files to Create:**
- `src/config/loader.ts`
- `tests/unit/config/test_loader.py`
- `tests/fixtures/config/valid-config.json`
- `tests/fixtures/config/invalid-config.json`

**Test Cases:**
```python
def test_load_valid_config():
    config = load_config('tests/fixtures/config/valid-config.json')
    assert config.project.name == "Manager.AI"

def test_load_missing_file():
    with pytest.raises(ConfigNotFoundError):
        load_config('nonexistent.json')

def test_apply_defaults():
    config = load_config('tests/fixtures/config/minimal-config.json')
    assert config.report.health_thresholds.green_max == 10  # Default
```

**Deliverable:** Configuration loader with 90%+ test coverage

---

#### 1.3 Configuration Validator
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-013

**Activities:**
- [ ] Implement validation rules (see spec)
- [ ] Create validateConfig() function
- [ ] Return detailed validation errors
- [ ] Write unit tests (all validation rules)
- [ ] Test error message quality

**Files to Create:**
- `src/config/validator.ts`
- `src/config/errors.ts`
- `tests/unit/config/test_validator.py`

**Validation Rules to Implement:**
```typescript
const VALIDATION_RULES = [
  { field: 'project.name', rule: nonEmpty },
  { field: 'project.team', rule: arrayWithElements },
  { field: 'jira.query_type', rule: enumValue(['sprint', 'board']) },
  { field: 'jira.sprint_id', rule: requiredIfSprintMode },
  { field: 'jira.board_id', rule: requiredIfBoardMode },
  { field: 'report.health_thresholds.green_max', rule: lessThanYellow },
  // ... more rules
];
```

**Test Cases:**
```python
def test_valid_config():
    errors = validate_config(valid_config)
    assert len(errors) == 0

def test_missing_sprint_id():
    config = {..., "jira": {"query_type": "sprint"}}
    errors = validate_config(config)
    assert any(e.field == "jira.sprint_id" for e in errors)

def test_invalid_health_thresholds():
    config = {..., "report": {"health_thresholds": {"green_max": 30, "yellow_max": 25}}}
    errors = validate_config(config)
    assert "green_max must be < yellow_max" in errors[0].message
```

**Deliverable:** Configuration validator with 95%+ test coverage

---

#### 1.4 Configuration CLI Command
**Time:** 3 hours  
**Priority:** Should Have  
**User Story:** US-026

**Activities:**
- [ ] Create /weekly-report-config command
- [ ] Show current configuration
- [ ] Allow editing via prompts (optional)
- [ ] Validate before saving
- [ ] Write integration tests

**Commands:**
```bash
/weekly-report-config               # Show current
/weekly-report-config --validate    # Validate only
/weekly-report-config --edit        # Interactive edit
```

**Deliverable:** Configuration management command

---

**Phase 1 Milestone:** Configuration system complete and tested

---

## Phase 2: Jira Integration (Days 4-6)

**Duration:** 3 days (18 hours)  
**Goal:** Implement Jira MCP client and data retrieval

### Tasks

#### 2.1 MCP Jira Client Wrapper
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-001

**Activities:**
- [ ] Create JiraClient class
- [ ] Implement connect() method (MCP handshake)
- [ ] Implement getSprint(sprintId)
- [ ] Implement getSprintIssues(sprintId) with pagination
- [ ] Implement getBoardIssues(boardId)
- [ ] Handle MCP errors gracefully
- [ ] Write unit tests with mocks

**Files to Create:**
- `src/clients/jira/client.ts`
- `src/clients/jira/types.ts`
- `src/clients/jira/errors.ts`
- `tests/unit/clients/jira/test_client.py`
- `tests/fixtures/jira/sprint-response.json`
- `tests/fixtures/jira/issues-response.json`

**Interface:**
```typescript
interface JiraClient {
  connect(): Promise<void>;
  getSprint(sprintId: string): Promise<Sprint>;
  getSprintIssues(sprintId: string, options?: IssueQueryOptions): Promise<JiraIssue[]>;
  getBoardIssues(boardId: string, options?: IssueQueryOptions): Promise<JiraIssue[]>;
  searchIssues(jql: string): Promise<JiraIssue[]>;
  disconnect(): Promise<void>;
}
```

**Deliverable:** Jira client with 85%+ test coverage

---

#### 2.2 Issue Normalization & Mapping
**Time:** 5 hours  
**Priority:** Must Have  
**User Story:** US-003, US-004

**Activities:**
- [ ] Create normalizeJiraIssue() function
- [ ] Map raw Jira response to JiraIssue type
- [ ] Handle custom field IDs (story points, epic link)
- [ ] Extract completion date from changelog
- [ ] Determine blocked status (flag, status, labels)
- [ ] Map status to category (using config mappings)
- [ ] Write comprehensive unit tests

**Files to Create:**
- `src/processors/normalizer.ts`
- `tests/unit/processors/test_normalizer.py`
- `tests/fixtures/jira/issue-with-epic.json`
- `tests/fixtures/jira/issue-without-epic.json`
- `tests/fixtures/jira/blocked-issue.json`

**Key Functions:**
```typescript
function normalizeJiraIssue(rawIssue: any, config: Config): JiraIssue;
function deriveStatusCategory(status: string, mappings: StatusMappings): StatusCategory;
function deriveCompletedDate(changelog: Changelog, doneMappings: string[]): Date | null;
function deriveBlocked(status: string, flagged: boolean, labels: string[]): boolean;
```

**Test Cases:**
```python
def test_normalize_completed_issue():
    raw = load_fixture('issue-completed.json')
    issue = normalize_jira_issue(raw, config)
    assert issue.status_category == StatusCategory.DONE
    assert issue.completed_date is not None

def test_derive_blocked_from_flag():
    raw = {..., "fields": {"flagged": True}}
    issue = normalize_jira_issue(raw, config)
    assert issue.blocked == True

def test_extract_epic():
    raw = load_fixture('issue-with-epic.json')
    issue = normalize_jira_issue(raw, config)
    assert issue.epic.key == "PROJ-100"
    assert issue.epic.name == "User Authentication System"
```

**Deliverable:** Issue normalization with 90%+ test coverage

---

#### 2.3 Issue Collection Builder
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-003, US-004

**Activities:**
- [ ] Create IssueCollection class
- [ ] Implement filterCompleted(issues, sprint)
- [ ] Implement filterActive(issues)
- [ ] Implement filterBlockers(issues)
- [ ] Implement groupByEpic(issues)
- [ ] Sort epic groups alphabetically
- [ ] Write unit tests for each filter/grouping

**Files to Create:**
- `src/processors/collection.ts`
- `tests/unit/processors/test_collection.py`

**Functions:**
```typescript
function buildIssueCollection(issues: JiraIssue[], sprint: Sprint): IssueCollection;
function filterCompletedIssues(issues: JiraIssue[], sprint: Sprint): JiraIssue[];
function filterActiveIssues(issues: JiraIssue[]): JiraIssue[];
function filterBlockers(issues: JiraIssue[]): JiraIssue[];
function groupByEpic(issues: JiraIssue[]): EpicGroup[];
```

**Test Cases:**
```python
def test_filter_completed_within_sprint():
    issues = [
        create_issue(status="Done", completed_date=sprint.startDate + 1day),  # Include
        create_issue(status="Done", completed_date=sprint.startDate - 1day),  # Exclude (before)
        create_issue(status="In Progress"),  # Exclude (not done)
    ]
    completed = filter_completed_issues(issues, sprint)
    assert len(completed) == 1

def test_group_by_epic():
    issues = [
        create_issue(epic="PROJ-100"),
        create_issue(epic="PROJ-100"),
        create_issue(epic="PROJ-200"),
        create_issue(epic=None),  # Unassigned
    ]
    groups = group_by_epic(issues)
    assert len(groups) == 3  # 2 epics + unassigned
    assert groups[-1].epic_name == "Unassigned"  # Last
```

**Deliverable:** Issue collection builder with 90%+ test coverage

---

#### 2.4 Retry Logic & Error Handling
**Time:** 3 hours  
**Priority:** Must Have  
**User Story:** US-017

**Activities:**
- [ ] Create retryWithBackoff() utility
- [ ] Implement exponential backoff (2s, 4s, 8s)
- [ ] Determine retryable errors (timeout, 429, 503)
- [ ] Log all retry attempts
- [ ] Write unit tests (success, retries, failure)

**Files to Create:**
- `src/utils/retry.ts`
- `tests/unit/utils/test_retry.py`

**Implementation:**
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { maxAttempts: 3, baseDelay: 1000 }
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === options.maxAttempts) {
        throw error;
      }
      const delay = options.baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}
```

**Deliverable:** Retry utility with 85%+ test coverage

---

#### 2.5 Integration Test: Fetch Real Sprint Data
**Time:** 2 hours  
**Priority:** Must Have

**Activities:**
- [ ] Create integration test (requires MCP)
- [ ] Fetch real sprint from Jira test instance
- [ ] Verify data normalization
- [ ] Check all fields populated
- [ ] Handle rate limits

**Files to Create:**
- `tests/integration/test_jira_integration.py`

**Test:**
```python
@pytest.mark.integration
def test_fetch_sprint_data():
    config = load_test_config()  # Test Jira instance
    client = JiraClient(config)
    
    sprint = client.get_sprint(config.jira.sprint_id)
    assert sprint.id == config.jira.sprint_id
    assert sprint.name is not None
    
    issues = client.get_sprint_issues(sprint.id)
    assert len(issues) > 0
    assert all(issue.key is not None for issue in issues)
```

**Deliverable:** Passing integration test

---

**Phase 2 Milestone:** Jira integration complete, data fetching works end-to-end

---

## Phase 3: Report Generation (Days 7-10)

**Duration:** 4 days (24 hours)  
**Goal:** Generate all 5 report sections and format as markdown

### Tasks

#### 3.1 Executive Summary Generator
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-005, US-007

**Activities:**
- [ ] Implement calculateHealth() function
- [ ] Implement generateExecutiveSummary()
- [ ] Generate AI narrative (2-3 sentences)
- [ ] Format with health indicator emoji
- [ ] Write unit tests (green, yellow, red scenarios)

**Files to Create:**
- `src/generators/executive-summary.ts`
- `tests/unit/generators/test_executive_summary.py`

**Functions:**
```typescript
function calculateHealth(issues: IssueCollection, thresholds: HealthThresholds): HealthIndicator;
function generateExecutiveSummary(issues: IssueCollection, metrics: SprintMetrics, sprint: Sprint): string;
function generateNarrative(issues: IssueCollection, metrics: SprintMetrics, health: HealthIndicator): string;
```

**Test Cases:**
```python
def test_calculate_health_green():
    issues = create_issue_collection(blocked_count=1, total_count=13)  # 7.7%
    health = calculate_health(issues, default_thresholds)
    assert health == HealthIndicator.GREEN

def test_generate_summary_markdown():
    summary = generate_executive_summary(issues, metrics, sprint)
    assert "🟢 Green" in summary
    assert "Sprint 24" in summary
    assert "92%" in summary
```

**Deliverable:** Executive summary generator with 90%+ test coverage

---

#### 3.2 Completed Issues Section Generator
**Time:** 3 hours  
**Priority:** Must Have  
**User Story:** US-003, US-004

**Activities:**
- [ ] Implement generateCompletedSection()
- [ ] Group issues by epic
- [ ] Format markdown lists
- [ ] Handle empty section (no completed issues)
- [ ] Show story points per issue
- [ ] Write unit tests

**Files to Create:**
- `src/generators/completed-section.ts`
- `tests/unit/generators/test_completed_section.py`

**Output Format:**
```markdown
## Completed This Week

### Epic: User Authentication System (3 issues, 10 pts)
- **PROJ-123** - Implement OAuth2 login flow (5 pts)
- **PROJ-124** - Add social login providers (3 pts)
- **PROJ-125** - Create password reset functionality (2 pts)

### Unassigned (1 issue, 1 pt)
- **PROJ-999** - Fix production login bug (1 pt)
```

**Deliverable:** Completed section generator with 85%+ test coverage

---

#### 3.3 In Progress Section Generator
**Time:** 2 hours  
**Priority:** Must Have  
**User Story:** US-001

**Activities:**
- [ ] Implement generateInProgressSection()
- [ ] Group by epic
- [ ] Show status badges ([In Progress], [To Do])
- [ ] Handle empty section
- [ ] Write unit tests

**Files to Create:**
- `src/generators/in-progress-section.ts`
- `tests/unit/generators/test_in_progress_section.py`

**Deliverable:** In Progress section generator with 85%+ test coverage

---

#### 3.4 Blockers Section Generator
**Time:** 3 hours  
**Priority:** Must Have  
**User Story:** US-001

**Activities:**
- [ ] Implement generateBlockersSection()
- [ ] Extract blocker reasons from comments
- [ ] Format with issue key and description
- [ ] Handle no blockers (show "No current blockers")
- [ ] Write unit tests

**Files to Create:**
- `src/generators/blockers-section.ts`
- `tests/unit/generators/test_blockers_section.py`

**Output Format:**
```markdown
## Risks / Blockers

- **PROJ-126** - Add two-factor authentication  
  *Blocked by:* Waiting on security team approval for SMS provider integration

✅ No current blockers identified  (if empty)
```

**Deliverable:** Blockers section generator with 85%+ test coverage

---

#### 3.5 Metrics Section Generator
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-006, US-015

**Activities:**
- [ ] Implement calculateMetrics()
- [ ] Implement generateMetricsSection()
- [ ] Generate text-based progress bar
- [ ] Handle story points vs issue count
- [ ] Handle fallback (story points missing)
- [ ] Show status breakdown
- [ ] Write unit tests (both metrics types)

**Files to Create:**
- `src/generators/metrics-section.ts`
- `src/utils/progress-bar.ts`
- `tests/unit/generators/test_metrics_section.py`

**Functions:**
```typescript
function calculateMetrics(issues: IssueCollection, config: Config): SprintMetrics;
function generateMetricsSection(metrics: SprintMetrics): string;
function generateProgressBar(percentage: number, width: number = 20): string;
```

**Output Format:**
```markdown
## Sprint Metrics

### Completion Progress
**23 / 25 story points completed (92%)**

Progress: ████████████████████░░ 92%

### Issue Breakdown by Status
- ✅ **Done:** 8 issues
- 🔄 **In Progress:** 3 issues
- 📋 **To Do:** 2 issues
- 🚫 **Blocked:** 1 issue

**Total Issues in Sprint:** 13
```

**Deliverable:** Metrics section generator with 90%+ test coverage

---

#### 3.6 Report Assembler
**Time:** 3 hours  
**Priority:** Must Have  
**User Story:** US-001

**Activities:**
- [ ] Create ReportGenerator class
- [ ] Implement generateReport() orchestrator
- [ ] Assemble all 5 sections
- [ ] Add metadata (timestamps, version)
- [ ] Format complete markdown
- [ ] Write integration tests

**Files to Create:**
- `src/generators/report-generator.ts`
- `tests/integration/test_report_generation.py`

**Function:**
```typescript
function generateReport(
  sprint: Sprint,
  issues: IssueCollection,
  config: Configuration
): WeeklyReport {
  const metrics = calculateMetrics(issues, config);
  const executiveSummary = generateExecutiveSummary(issues, metrics, sprint);
  const completed = generateCompletedSection(issues.completed, config);
  const inProgress = generateInProgressSection(issues.active, config);
  const blockers = generateBlockersSection(issues.blocked);
  const metricsSection = generateMetricsSection(metrics);
  
  return {
    metadata: { ... },
    markdown: [
      executiveSummary,
      completed,
      inProgress,
      blockers,
      metricsSection
    ].join('\n\n---\n\n')
  };
}
```

**Deliverable:** Complete report generator with 85%+ test coverage

---

#### 3.7 Markdown to Confluence HTML Converter
**Time:** 5 hours  
**Priority:** Must Have  
**User Story:** US-009

**Activities:**
- [ ] Install markdown parser library (marked.js or markdown-it)
- [ ] Implement markdownToConfluenceHTML()
- [ ] Convert emojis to Confluence emoticons
- [ ] Handle special formatting (tables, code blocks)
- [ ] Write unit tests (various markdown elements)

**Files to Create:**
- `src/generators/confluence-converter.ts`
- `tests/unit/generators/test_confluence_converter.py`

**Conversions:**
```typescript
const EMOJI_MAPPINGS = {
  '🟢': '<ac:emoticon ac:name="green_circle" />',
  '🟡': '<ac:emoticon ac:name="yellow_circle" />',
  '🔴': '<ac:emoticon ac:name="red_circle" />',
  '✅': '<ac:emoticon ac:name="check" />',
  '🔄': '<ac:emoticon ac:name="arrows_counterclockwise" />',
  '📋': '<ac:emoticon ac:name="clipboard" />',
  '🚫': '<ac:emoticon ac:name="no_entry_sign" />',
};
```

**Deliverable:** Markdown → Confluence converter with 90%+ test coverage

---

**Phase 3 Milestone:** Report generation complete, all sections render correctly

---

## Phase 4: Confluence Publishing & UI (Days 11-14)

**Duration:** 4 days (24 hours)  
**Goal:** Implement publishing workflow and user interface

### Tasks

#### 4.1 MCP Confluence Client Wrapper
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-009

**Activities:**
- [ ] Create ConfluenceClient class
- [ ] Implement connect()
- [ ] Implement getPageByTitle()
- [ ] Implement createPage()
- [ ] Implement updatePage()
- [ ] Handle version conflicts with retry
- [ ] Write unit tests with mocks

**Files to Create:**
- `src/clients/confluence/client.ts`
- `src/clients/confluence/types.ts`
- `src/clients/confluence/errors.ts`
- `tests/unit/clients/confluence/test_client.py`
- `tests/fixtures/confluence/page-response.json`

**Interface:**
```typescript
interface ConfluenceClient {
  connect(): Promise<void>;
  getPageByTitle(spaceKey: string, title: string): Promise<ConfluencePage | null>;
  createPage(spaceKey: string, title: string, content: string): Promise<ConfluencePage>;
  updatePage(pageId: string, title: string, content: string, version: number): Promise<ConfluencePage>;
  disconnect(): Promise<void>;
}
```

**Deliverable:** Confluence client with 85%+ test coverage

---

#### 4.2 Report Prepending Logic
**Time:** 3 hours  
**Priority:** Must Have  
**User Story:** US-009

**Activities:**
- [ ] Implement prependReportToPage()
- [ ] Add timestamp header
- [ ] Insert horizontal separators
- [ ] Preserve existing content
- [ ] Handle page title extraction
- [ ] Write unit tests

**Files to Create:**
- `src/processors/page-prepender.ts`
- `tests/unit/processors/test_page_prepender.py`

**Function:**
```typescript
function prependReportToPage(
  currentPage: ConfluencePage,
  newReport: WeeklyReport,
  timestamp: Date
): string {
  const header = createReportHeader(newReport.metadata.sprint, timestamp);
  const reportHTML = newReport.html;
  const separator = '<hr/>';
  
  return existingContent.replace(
    /<h1>.*?<\/h1>/,
    `$&\n\n${separator}\n\n${header}\n${reportHTML}\n\n${separator}\n`
  );
}
```

**Deliverable:** Prepending logic with 90%+ test coverage

---

#### 4.3 Draft Saving Logic
**Time:** 2 hours  
**Priority:** Must Have  
**User Story:** US-010, US-020

**Activities:**
- [ ] Implement saveDraft()
- [ ] Create .claude/drafts/ directory
- [ ] Generate filename with date
- [ ] Add frontmatter metadata
- [ ] Add publishing instructions in footer
- [ ] Write unit tests

**Files to Create:**
- `src/utils/draft-saver.ts`
- `tests/unit/utils/test_draft_saver.py`

**Deliverable:** Draft saving with 85%+ test coverage

---

#### 4.4 CLI Command Handler
**Time:** 5 hours  
**Priority:** Must Have  
**User Story:** US-001, US-008

**Activities:**
- [ ] Create /weekly-report command handler
- [ ] Implement progress indicators
- [ ] Implement report preview display
- [ ] Implement approval prompt (Yes/No)
- [ ] Handle user responses
- [ ] Write integration tests

**Files to Create:**
- `src/ui/command-handler.ts`
- `src/ui/progress.ts`
- `src/ui/prompts.ts`
- `tests/integration/test_command_handler.py`

**Flow:**
```typescript
async function handleWeeklyReportCommand(): Promise<void> {
  // 1. Load configuration
  showProgress('Loading configuration...');
  const config = await loadConfiguration();
  showSuccess('Configuration loaded');
  
  // 2. Fetch Jira data
  showProgress('Fetching data from Jira...');
  const sprint = await jiraClient.getSprint(config.jira.sprint_id);
  const issues = await jiraClient.getSprintIssues(sprint.id);
  showSuccess(`Retrieved ${issues.length} issues`);
  
  // 3. Generate report
  showProgress('Generating report...');
  const report = generateReport(sprint, issues, config);
  showSuccess('Report generated');
  
  // 4. Display preview
  displayReportPreview(report.markdown);
  
  // 5. Prompt for approval
  const approved = await promptYesNo('Publish to Confluence?');
  
  if (approved) {
    await publishReport(report, config);
  } else {
    const draftPath = saveDraft(report);
    showCancellation(draftPath);
  }
}
```

**Deliverable:** Complete CLI command with 80%+ test coverage

---

#### 4.5 Publishing Orchestrator
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-009, US-011

**Activities:**
- [ ] Create publishReport() function
- [ ] Find or create Confluence page
- [ ] Convert markdown to HTML
- [ ] Prepend to page
- [ ] Handle version conflicts (retry up to 3x)
- [ ] Display success with page URL
- [ ] Write integration tests

**Files to Create:**
- `src/publishers/confluence-publisher.ts`
- `tests/integration/test_publishing.py`

**Function:**
```typescript
async function publishReport(
  report: WeeklyReport,
  config: Configuration
): Promise<string> {
  const confluenceClient = new ConfluenceClient(config);
  await confluenceClient.connect();
  
  // Find or create page
  let page = await confluenceClient.getPageByTitle(
    config.confluence.space_key,
    config.confluence.page_title
  );
  
  if (!page) {
    page = await confluenceClient.createPage(
      config.confluence.space_key,
      config.confluence.page_title,
      '<h1>' + config.confluence.page_title + '</h1>'
    );
  }
  
  // Prepend report with retry
  const updatedContent = prependReportToPage(page, report, new Date());
  
  await retryWithBackoff(async () => {
    await confluenceClient.updatePage(
      page.id,
      page.title,
      updatedContent,
      page.version.number + 1
    );
  }, { maxAttempts: 3 });
  
  const pageUrl = `https://epam.atlassian.net${page._links.webui}`;
  return pageUrl;
}
```

**Deliverable:** Publishing orchestrator with 85%+ test coverage

---

#### 4.6 Error Screen Implementations
**Time:** 4 hours  
**Priority:** Must Have  
**User Story:** US-017, US-018, US-019, US-020

**Activities:**
- [ ] Create error handler classes
- [ ] Implement ConfigNotFoundError screen
- [ ] Implement ConfigValidationError screen
- [ ] Implement JiraConnectionError screen
- [ ] Implement ConfluencePublishError screen
- [ ] Implement EmptySprintWarning screen
- [ ] Write unit tests for error formatting

**Files to Create:**
- `src/ui/error-screens.ts`
- `tests/unit/ui/test_error_screens.py`

**Error Templates:**
```typescript
function formatConfigNotFoundError(): string {
  return `
❌ Configuration File Not Found

Please create '.claude/weekly-report-config.json' with your settings.

Example configuration:
{
  "project": { ... },
  "jira": { ... },
  "confluence": { ... }
}

See: README.md#configuration
  `;
}
```

**Deliverable:** All error screens implemented and tested

---

#### 4.7 End-to-End Integration Test
**Time:** 2 hours  
**Priority:** Must Have

**Activities:**
- [ ] Create full workflow test (requires MCP)
- [ ] Test: Config → Jira → Generate → Confluence
- [ ] Verify report published successfully
- [ ] Check Confluence page content
- [ ] Test cancellation flow
- [ ] Test error recovery

**Files to Create:**
- `tests/integration/test_end_to_end.py`

**Test:**
```python
@pytest.mark.integration
@pytest.mark.slow
def test_full_workflow():
    # 1. Load config
    config = load_test_config()
    
    # 2. Generate report
    report = generate_report_for_sprint(config.jira.sprint_id)
    assert report is not None
    assert len(report.markdown) > 0
    
    # 3. Publish (to test Confluence space)
    page_url = publish_report(report, config)
    assert 'atlassian.net' in page_url
    
    # 4. Verify published
    page = fetch_confluence_page(config.confluence.page_id)
    assert report.metadata.sprint.name in page.body.storage.value
```

**Deliverable:** Passing E2E test

---

**Phase 4 Milestone:** Complete workflow functional, publishing works end-to-end

---

## Phase 5: Testing, Documentation & Polish (Days 15-20)

**Duration:** 6 days (36 hours)  
**Goal:** Achieve 80%+ test coverage, complete documentation, final polish

### Tasks

#### 5.1 Unit Test Completion
**Time:** 8 hours  
**Priority:** Must Have

**Activities:**
- [ ] Review test coverage report
- [ ] Write missing unit tests (target: 80%+)
- [ ] Test all edge cases
- [ ] Test error conditions
- [ ] Refactor brittle tests
- [ ] Document test patterns

**Commands:**
```bash
# Python
pytest --cov=src --cov-report=html

# Node.js
npm run test -- --coverage
```

**Target Coverage:**
- Configuration: 90%+
- Jira Client: 85%+
- Generators: 90%+
- Confluence Client: 85%+
- Utils: 90%+
- Overall: 80%+

**Deliverable:** 80%+ test coverage achieved

---

#### 5.2 Integration Test Suite
**Time:** 6 hours  
**Priority:** Must Have

**Activities:**
- [ ] Write integration tests for all workflows
- [ ] Test with real MCP connections
- [ ] Test error recovery paths
- [ ] Test version conflicts
- [ ] Test empty sprint scenario
- [ ] Test missing story points scenario

**Test Scenarios:**
- [ ] Happy path (sprint → report → publish)
- [ ] Board mode (instead of sprint)
- [ ] Empty sprint handling
- [ ] Missing story points fallback
- [ ] Confluence version conflict retry
- [ ] MCP connection failure recovery
- [ ] Configuration errors
- [ ] Cancellation flow

**Deliverable:** Comprehensive integration test suite

---

#### 5.3 Performance Testing & Optimization
**Time:** 4 hours  
**Priority:** Should Have

**Activities:**
- [ ] Measure end-to-end execution time
- [ ] Identify bottlenecks (profiling)
- [ ] Optimize slow operations
- [ ] Add caching where beneficial
- [ ] Test with large sprints (100+ issues)
- [ ] Verify < 30s target

**Benchmarks:**
```python
def test_performance_small_sprint():
    # Sprint with 10-20 issues
    start = time.time()
    report = generate_report_for_sprint('12345')
    duration = time.time() - start
    assert duration < 10  # Target: < 10s

def test_performance_large_sprint():
    # Sprint with 100+ issues
    start = time.time()
    report = generate_report_for_sprint('12346')
    duration = time.time() - start
    assert duration < 30  # Target: < 30s
```

**Deliverable:** Performance benchmarks documented, optimizations applied

---

#### 5.4 README.md Completion
**Time:** 4 hours  
**Priority:** Must Have

**Activities:**
- [ ] Write complete setup guide
- [ ] Document all commands
- [ ] Add configuration examples
- [ ] Create troubleshooting section
- [ ] Add screenshots/examples
- [ ] Document prerequisites

**Sections:**
1. Overview & Goals
2. Prerequisites (MCP setup)
3. Installation
4. Configuration (step-by-step)
5. Usage (/weekly-report command)
6. Troubleshooting (common errors)
7. Development (for contributors)
8. FAQ

**Deliverable:** Complete, user-friendly README

---

#### 5.5 API Documentation
**Time:** 3 hours  
**Priority:** Should Have

**Activities:**
- [ ] Generate API docs from code (JSDoc/Sphinx)
- [ ] Document all public functions
- [ ] Add code examples
- [ ] Document error codes
- [ ] Create architecture diagram

**Files to Create:**
- `docs/api-reference.md`
- `docs/architecture.md`
- `docs/error-codes.md`

**Deliverable:** Complete API documentation

---

#### 5.6 Troubleshooting Guide
**Time:** 3 hours  
**Priority:** Must Have

**Activities:**
- [ ] Document all error scenarios
- [ ] Provide resolution steps
- [ ] Add diagnostic commands
- [ ] Create decision tree for common issues
- [ ] Link to relevant docs

**File to Create:**
- `docs/troubleshooting.md`

**Common Issues:**
1. MCP not authorized → Authorization steps
2. Configuration invalid → Validation examples
3. Jira connection failed → Network/MCP checks
4. Confluence publish failed → Permission checks
5. Empty sprint → Expected behavior explanation
6. Missing story points → Fallback explanation

**Deliverable:** Comprehensive troubleshooting guide

---

#### 5.7 User Acceptance Testing (UAT)
**Time:** 4 hours  
**Priority:** Must Have

**Activities:**
- [ ] Run through all user stories manually
- [ ] Test with real Jira/Confluence
- [ ] Verify stakeholder readability (show to stakeholder)
- [ ] Check report quality
- [ ] Test error recovery (simulate failures)
- [ ] Collect feedback

**Test Plan:**
- [ ] US-001: Generate report from sprint ✓
- [ ] US-002: Generate report from board ✓
- [ ] US-008: Review before publishing ✓
- [ ] US-009: Publish to Confluence ✓
- [ ] US-010: Cancel without publishing ✓
- [ ] US-012: Setup configuration ✓
- [ ] US-017: Handle Jira errors ✓
- [ ] US-020: Save draft on failure ✓

**Deliverable:** UAT checklist completed, feedback incorporated

---

#### 5.8 Final Polish & Bug Fixes
**Time:** 4 hours  
**Priority:** Must Have

**Activities:**
- [ ] Fix all critical bugs
- [ ] Improve error messages
- [ ] Clean up console output
- [ ] Add helpful hints/tips
- [ ] Optimize user experience
- [ ] Final code review

**Deliverable:** Production-ready code

---

**Phase 5 Milestone:** 80%+ test coverage, complete documentation, passing UAT

---

## Milestones & Deliverables

### Milestone 1: Foundation Complete (End of Week 1)
**Date:** December 28, 2024

**Deliverables:**
- ✅ Project structure set up
- ✅ Configuration system complete (load, validate, defaults)
- ✅ Jira client implemented
- ✅ Issue normalization working
- ✅ 70%+ test coverage

**Acceptance Criteria:**
- Can load and validate configuration
- Can fetch sprint data from Jira via MCP
- All core data structures defined
- Unit tests passing

---

### Milestone 2: Report Generation Complete (End of Week 2)
**Date:** January 4, 2025

**Deliverables:**
- ✅ All 5 report sections implemented
- ✅ Markdown generation working
- ✅ Confluence HTML conversion working
- ✅ 80%+ test coverage for generators

**Acceptance Criteria:**
- Can generate complete 5-section report
- Report matches specification examples
- All edge cases handled (empty sections, missing data)
- Markdown is well-formatted

---

### Milestone 3: Publishing & UI Complete (End of Week 3)
**Date:** January 11, 2025

**Deliverables:**
- ✅ Confluence client implemented
- ✅ Publishing workflow complete
- ✅ CLI command handler functional
- ✅ Error screens implemented
- ✅ Draft saving working

**Acceptance Criteria:**
- /weekly-report command works end-to-end
- Can publish report to Confluence successfully
- Version conflicts handled gracefully
- All error scenarios display helpful messages
- User can review and approve/cancel

---

### Milestone 4: Production Ready (End of Week 4)
**Date:** January 18, 2025

**Deliverables:**
- ✅ 80%+ test coverage achieved
- ✅ Complete documentation (README, API, troubleshooting)
- ✅ All user stories tested
- ✅ Performance benchmarks met
- ✅ UAT completed

**Acceptance Criteria:**
- All tests passing (unit + integration)
- Documentation is complete and accurate
- Tool works reliably with real Jira/Confluence
- Stakeholders can read and understand reports
- PM can use tool without assistance

---

### Final Delivery (End of Week 4 + Buffer)
**Date:** January 25, 2025

**Deliverables:**
- ✅ Version 1.0 released
- ✅ Repository tagged (v1.0.0)
- ✅ All documentation published
- ✅ Tool deployed to production use

---

## Risk Management

### High Risks

#### Risk 1: MCP Authorization Issues
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Test MCP setup early (Phase 0)
- Document authorization flow thoroughly
- Create diagnostic tools
- Have fallback: manual API key setup (if MCP fails)

---

#### Risk 2: Confluence Version Conflicts
**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Implement retry logic with exponential backoff
- Test concurrent edits scenario
- Save draft before attempting publish
- Clear error messages with manual recovery steps

---

#### Risk 3: Jira Custom Field ID Variations
**Probability:** High  
**Impact:** Medium  
**Mitigation:**
- Make custom field IDs configurable
- Provide auto-detection utility
- Document how to find field IDs
- Support common defaults

---

#### Risk 4: Performance with Large Sprints
**Probability:** Low  
**Impact:** Medium  
**Mitigation:**
- Implement pagination early
- Test with 100+ issue sprint
- Add progress indicators
- Optimize data processing
- Set expectations (< 30s for large sprints)

---

### Medium Risks

#### Risk 5: Story Points Missing
**Probability:** High  
**Impact:** Low  
**Mitigation:**
- Implement automatic fallback to issue count
- Warn user clearly
- Provide guidance on adding estimates
- Make metric preference configurable

---

#### Risk 6: Empty Sprints
**Probability:** Medium  
**Impact:** Low  
**Mitigation:**
- Handle gracefully (still generate report)
- Show clear "No issues" messages
- Prompt user to verify sprint ID
- Document expected behavior

---

## Quality Gates

### Definition of Done (Per Task)

- [ ] Code written and follows style guide
- [ ] Unit tests written (80%+ coverage)
- [ ] Unit tests passing
- [ ] Integration tests written (if applicable)
- [ ] Integration tests passing
- [ ] Code reviewed (self-review minimum)
- [ ] Documentation updated (inline comments + docs)
- [ ] No critical bugs
- [ ] Acceptance criteria met

---

### Definition of Done (Per Phase)

- [ ] All phase tasks completed
- [ ] Phase milestone deliverables met
- [ ] All tests passing (unit + integration)
- [ ] Test coverage target achieved
- [ ] Documentation complete for phase
- [ ] Phase demo successful (if applicable)
- [ ] No blocking bugs

---

### Definition of Done (Overall Project)

- [ ] All user stories implemented
- [ ] All phases completed
- [ ] 80%+ overall test coverage
- [ ] All tests passing (unit + integration + E2E)
- [ ] UAT completed successfully
- [ ] Performance benchmarks met (< 30s)
- [ ] Documentation complete (README, API, troubleshooting)
- [ ] No critical or high-priority bugs
- [ ] Version tagged (v1.0.0)
- [ ] Deployed to production use
- [ ] PM trained and can use independently

---

## Success Metrics

### Quantitative Metrics

1. **Time Savings**: Reduce report generation time from 1-2 hours to < 10 minutes (90% reduction)
2. **Test Coverage**: Achieve 80%+ code coverage
3. **Performance**: Generate report in < 30 seconds (95th percentile)
4. **Reliability**: < 5% failure rate (excluding MCP/network issues)
5. **Adoption**: Used for 100% of weekly status reports after deployment

---

### Qualitative Metrics

1. **Stakeholder Readability**: Non-technical stakeholders can understand reports without assistance
2. **PM Satisfaction**: PM can generate reports without developer help
3. **Report Quality**: Reports meet or exceed manual report quality
4. **Error Recovery**: User can resolve common issues independently (via error messages)
5. **Documentation Quality**: New PM could learn tool from documentation alone

---

## Communication Plan

### Daily
- Commit code daily with clear messages
- Update progress in task tracker (if used)
- Log blockers/questions

### Weekly
- Review phase progress
- Demo completed features (if stakeholders available)
- Adjust plan if needed

### Milestones
- Demo to PM/stakeholders
- Gather feedback
- Update backlog for next phase

---

## Contingency Plan

### If Behind Schedule

**Week 1 Behind:**
- Reduce test coverage target to 70% temporarily
- Defer configuration CLI (US-026) to v1.1
- Focus on core functionality

**Week 2 Behind:**
- Defer AI narrative generation (US-007) - use template instead
- Simplify error messages (basic only)
- Skip performance optimization

**Week 3 Behind:**
- Defer comprehensive error screens - implement basic only
- Reduce integration test coverage
- Focus on happy path

**Week 4 Behind:**
- Reduce documentation scope
- Defer API documentation to v1.1
- Focus on README and troubleshooting only

---

### If Ahead of Schedule

**Completed Early:**
- Add v1.1 features:
  - Scheduled execution (cron)
  - Email delivery
  - Historical comparisons
  - Custom templates
- Improve test coverage (target 90%+)
- Add analytics/metrics
- Create video walkthrough

---

## Post-Launch Plan (v1.1+)

### v1.1 Enhancements (Week 5-6)
- Scheduled weekly execution
- Email delivery to stakeholders
- Slack notification
- Diagnostic command (/weekly-report --diagnose)

### v1.2 Features (Week 7-8)
- Week-over-week comparison
- Velocity trends (last 4 sprints)
- Custom report templates
- Multiple Confluence pages

### v2.0 Vision (Future)
- Multi-project support
- Web-based dashboard
- Advanced analytics
- Team performance insights (aggregate only)

---

## Conclusion

This implementation plan provides a structured, phase-based approach to building the Weekly Status Report Generator within the 4-week timeline. The plan emphasizes:

- **Early risk mitigation** (MCP setup in Phase 0)
- **Incremental delivery** (working features at each milestone)
- **Quality focus** (80%+ test coverage throughout)
- **User experience** (comprehensive error handling and documentation)

By following this plan, the team will deliver a production-ready tool by January 25, 2025, meeting all acceptance criteria and success metrics.

---

*End of Implementation Plan*
