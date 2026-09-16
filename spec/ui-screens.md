# UI Screens & User Experience: Weekly Status Report Generator

## Overview

This document details all user interface screens, interactions, and user experience flows for the Manager.AI Weekly Status Report Generator. The tool operates within Claude Code's chat interface with a command-driven workflow.

**Version:** 1.0  
**Date:** December 25, 2024  
**Product Manager:** Avinash Agarwal

---

## Platform Context

### Claude Code Interface

The tool runs as a **slash command** within Claude Code's chat interface:

- **Platform:** VSCode extension (Claude Code)
- **Interaction Model:** Conversational AI with structured outputs
- **Input Method:** Text commands and natural language
- **Output Format:** Markdown-rendered text with interactive buttons
- **No Custom UI:** Tool uses native Claude Code interface (no web views or custom windows)

### Key UI Characteristics

✅ **Text-Based Interface**
- All output rendered as markdown in chat
- No graphical widgets or custom components
- Relies on emojis and formatting for visual elements

✅ **Conversational Flow**
- User issues commands via chat
- AI responds with structured information
- Follow-up prompts for user decisions

✅ **Asynchronous Operations**
- Progress indicators during API calls
- Streaming output for long content
- Clear status messages

---

## Screen Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INITIATES COMMAND                    │
│                     /weekly-report                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   SCREEN 1: Loading    │───┐ Error
         │   Configuration        │   │
         └────────────┬───────────┘   │
                      │ Success       │
                      ▼               ▼
         ┌────────────────────────┐  ┌──────────────────────┐
         │   SCREEN 2: Fetching   │  │  ERROR SCREEN:       │
         │   Jira Data            │  │  Configuration Error │
         └────────────┬───────────┘  └──────────────────────┘
                      │                        │
                      ▼                        │
         ┌────────────────────────┐           │
         │   SCREEN 3: Processing │           │
         │   & Generating Report  │           │
         └────────────┬───────────┘           │
                      │                        │
                      ▼                        │
         ┌────────────────────────┐           │
         │   SCREEN 4: Report     │           │
         │   Preview & Review     │           │
         └────────────┬───────────┘           │
                      │                        │
           ┌──────────┴──────────┐            │
           │                     │            │
           ▼                     ▼            │
  ┌────────────────┐   ┌────────────────┐   │
  │  SCREEN 5a:    │   │  SCREEN 5b:    │   │
  │  Publishing    │   │  Cancelled     │   │
  └────────┬───────┘   └────────────────┘   │
           │                                  │
           ▼                                  │
  ┌────────────────┐                        │
  │  SCREEN 6:     │                        │
  │  Success       │◄───────────────────────┘
  └────────────────┘        Or
           │            ERROR SCREEN
           │
           ▼
        [END]
```

---

## Screen 1: Command Initiation & Configuration Loading

### User Action
User types `/weekly-report` in Claude Code chat

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 User                                                      │
│ /weekly-report                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ 📋 **Weekly Status Report Generator**                       │
│                                                              │
│ ⏳ Loading configuration...                                 │
│                                                              │
│ ✅ Configuration loaded successfully                         │
│    - Project: Manager.AI                                    │
│    - Query mode: Sprint (ID: 12345)                         │
│    - Metric preference: Story points                        │
│    - Confluence page: Weekly Status Reports - Manager.AI    │
│                                                              │
│ Proceeding to fetch data from Jira...                       │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Progress Indicator:**
- ⏳ Animated loading indicator (built-in Claude Code)
- Status text updates in real-time

**Configuration Summary:**
- ✅ Success checkmark
- Key configuration details displayed
- Project name, query mode, preferences

**Timing:** 
- Load: < 100ms (local file read)
- Display: Immediate

---

## Screen 2: Fetching Jira Data

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant (continued)                                     │
│                                                              │
│ 🔄 **Fetching data from Jira...**                           │
│                                                              │
│ ⏳ Connecting to Jira via MCP...                            │
│ ✅ Connected                                                 │
│                                                              │
│ ⏳ Retrieving Sprint 24 metadata...                         │
│ ✅ Sprint details loaded                                     │
│    - Sprint: Sprint 24 (Dec 18 - Dec 29, 2024)             │
│    - State: Active                                          │
│                                                              │
│ ⏳ Fetching sprint issues (0/?)...                          │
│ ⏳ Fetching sprint issues (13 found)...                     │
│ ✅ All issues retrieved                                      │
│                                                              │
│ ⏳ Loading blocker details for 1 issue...                   │
│ ✅ Complete                                                  │
│                                                              │
│ Data fetching complete. Generating report...                │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Progress Steps:**
- Each step shows ⏳ during execution
- Changes to ✅ on completion
- Real-time count for issues found

**Error State (Example):**
```
┌─────────────────────────────────────────────────────────────┐
│ ⏳ Connecting to Jira via MCP...                            │
│ ⚠️  Connection timeout. Retrying (attempt 1/3)...           │
│ ⏳ Retrying connection...                                    │
│ ✅ Connected                                                 │
└─────────────────────────────────────────────────────────────┘
```

**Timing:**
- MCP connection: ~500ms (first time)
- Sprint metadata: ~200ms
- Issues fetch: ~500-2000ms (depends on count)
- Blocker details: ~200ms per blocker (parallel)

---

## Screen 3: Processing & Report Generation

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant (continued)                                     │
│                                                              │
│ ⚙️  **Processing data...**                                  │
│                                                              │
│ ✅ Identified 8 completed issues                            │
│ ✅ Found 5 issues in progress                               │
│ ✅ Detected 1 blocked issue                                 │
│ ✅ Grouped into 2 epics + unassigned                        │
│                                                              │
│ 📊 **Calculating metrics...**                               │
│                                                              │
│ ✅ Sprint completion: 23/25 story points (92%)              │
│ ✅ Health indicator: 🟢 Green (7.7% blocked)                │
│                                                              │
│ 📝 **Generating report sections...**                        │
│                                                              │
│ ✅ Executive Summary                                         │
│ ✅ Completed This Week                                       │
│ ✅ In Progress / Planned Next                               │
│ ✅ Risks / Blockers                                          │
│ ✅ Sprint Metrics                                            │
│                                                              │
│ Report generation complete!                                 │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Processing Summary:**
- Issue counts for each category
- Epic grouping result
- Metrics summary

**Section Generation:**
- Each section checked off as generated
- All 5 sections always present

**Timing:**
- Data processing: ~50ms
- Metrics calculation: ~20ms
- Report generation: ~30ms
- Total: < 200ms (local processing)

---

## Screen 4: Report Preview & Review (MAIN SCREEN)

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ═══════════════════════════════════════════════════════════ │
│                     📊 REPORT PREVIEW                        │
│ ═══════════════════════════════════════════════════════════ │
│                                                              │
│ ## Executive Summary                                         │
│                                                              │
│ **Sprint:** Sprint 24 (Dec 18 - Dec 29, 2024)              │
│ **Health:** 🟢 Green - On Track                             │
│                                                              │
│ The team is on track to complete 23 of 25 committed story   │
│ points this sprint. Major highlight: User authentication API │
│ integration completed and deployed to staging, enabling      │
│ social login for beta users. No current blockers identified. │
│                                                              │
│ ---                                                          │
│                                                              │
│ ## Completed This Week                                       │
│                                                              │
│ ### Epic: User Authentication System (3 issues, 10 pts)     │
│ - **PROJ-123** - Implement OAuth2 login flow (5 pts)        │
│ - **PROJ-124** - Add social login providers (3 pts)         │
│ - **PROJ-125** - Create password reset functionality (2 pts)│
│                                                              │
│ ### Epic: Dashboard Redesign (2 issues, 13 pts)             │
│ - **PROJ-201** - Update dashboard layout (8 pts)            │
│ - **PROJ-202** - Add real-time metrics widgets (5 pts)      │
│                                                              │
│ ### Unassigned (1 issue, 1 pt)                              │
│ - **PROJ-999** - Fix production login bug (1 pt)            │
│                                                              │
│ ---                                                          │
│                                                              │
│ ## In Progress / Planned Next                                │
│                                                              │
│ ### Epic: User Authentication System (2 issues, 13 pts)     │
│ - **PROJ-126** - [In Progress] Add two-factor auth (8 pts)  │
│ - **PROJ-127** - [To Do] Implement session mgmt (5 pts)     │
│                                                              │
│ ### Epic: Dashboard Redesign (2 issues, 8 pts)              │
│ - **PROJ-203** - [In Progress] Add data export (5 pts)      │
│ - **PROJ-204** - [To Do] Create user preferences (3 pts)    │
│                                                              │
│ ### Unassigned (1 issue, 2 pts)                             │
│ - **PROJ-888** - [To Do] Update API documentation (2 pts)   │
│                                                              │
│ ---                                                          │
│                                                              │
│ ## Risks / Blockers                                          │
│                                                              │
│ - **PROJ-126** - Add two-factor authentication              │
│   *Blocked by:* Waiting on security team approval for SMS   │
│   provider integration                                       │
│                                                              │
│ ---                                                          │
│                                                              │
│ ## Sprint Metrics                                            │
│                                                              │
│ ### Completion Progress                                      │
│ **23 / 25 story points completed (92%)**                    │
│                                                              │
│ Progress: ████████████████████░░ 92%                        │
│                                                              │
│ ### Issue Breakdown by Status                                │
│ - ✅ **Done:** 8 issues                                     │
│ - 🔄 **In Progress:** 3 issues                              │
│ - 📋 **To Do:** 2 issues                                    │
│ - 🚫 **Blocked:** 1 issue                                   │
│                                                              │
│ **Total Issues in Sprint:** 13                               │
│                                                              │
│ ═══════════════════════════════════════════════════════════ │
│                     END OF REPORT PREVIEW                    │
│ ═══════════════════════════════════════════════════════════ │
│                                                              │
│ 📤 **Ready to publish?**                                    │
│                                                              │
│ This report will be published to Confluence:                │
│ 📄 Page: "Weekly Status Reports - Manager.AI"               │
│ 🌐 Space: MNGRAI                                            │
│                                                              │
│ The report will be appended to the top of the page with     │
│ a timestamp. All existing content will be preserved.        │
│                                                              │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ✅ Yes, publish now  │  │ ❌ No, cancel        │        │
│ └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Report Display:**
- Full markdown-rendered report
- All 5 sections with proper formatting
- Visual separators (---) between sections
- Color-coded health indicator (🟢🟡🔴)
- Emoji status badges (✅🔄📋🚫)
- Text-based progress bar

**Context Information:**
- Target Confluence page details
- Publishing strategy explained
- Reassurance about content preservation

**Action Buttons:**
- Two clear options (Approve/Cancel)
- Button-like text with emojis
- User responds with natural language or clicks

**User Interaction:**
User can:
1. Read entire report (scrollable)
2. Respond "Yes" or click "Yes, publish now"
3. Respond "No" or click "No, cancel"
4. Ask questions (e.g., "Why is PROJ-126 blocked?")
5. Request changes (e.g., "Regenerate without PROJ-999")

**Timing:**
- Report display: Immediate (streaming output)
- User review: Variable (human decision)
- Buttons remain active until user responds

---

## Screen 5a: Publishing to Confluence

### User Action
User responds: "Yes" or "Yes, publish now"

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 User                                                      │
│ Yes, publish now                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ 📤 **Publishing report to Confluence...**                   │
│                                                              │
│ ⏳ Connecting to Confluence via MCP...                      │
│ ✅ Connected                                                 │
│                                                              │
│ ⏳ Finding page "Weekly Status Reports - Manager.AI"...     │
│ ✅ Page found (ID: 123456789)                               │
│                                                              │
│ ⏳ Converting report to Confluence format...                │
│ ✅ Conversion complete                                       │
│                                                              │
│ ⏳ Updating page content...                                 │
│ ✅ Page updated successfully                                 │
│                                                              │
│ Publishing complete!                                         │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Progress Steps:**
- MCP connection
- Page lookup
- Format conversion
- Page update

**Retry Handling (Version Conflict):**
```
┌─────────────────────────────────────────────────────────────┐
│ ⏳ Updating page content...                                 │
│ ⚠️  Version conflict detected. Retrying with latest version...│
│ ⏳ Fetching latest page version...                          │
│ ✅ Retry successful                                          │
└─────────────────────────────────────────────────────────────┘
```

**Timing:**
- Confluence connection: ~500ms
- Page lookup: ~300ms
- Format conversion: ~50ms
- Page update: ~500-1500ms (with potential retries)

---

## Screen 6: Success Confirmation

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ✅ **Report Published Successfully!**                       │
│                                                              │
│ 📊 Your weekly status report has been published to          │
│ Confluence and is now visible to stakeholders.              │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 📄 **Report Details**                                  │  │
│ │                                                        │  │
│ │ Sprint: Sprint 24 (Dec 18 - Dec 29, 2024)            │  │
│ │ Health: 🟢 Green - On Track                           │  │
│ │ Completion: 23/25 story points (92%)                  │  │
│ │ Published: December 29, 2024 at 3:45 PM              │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ 🔗 **View on Confluence:**                                  │
│ https://epam.atlassian.net/wiki/spaces/MNGRAI/pages/123456  │
│                                                              │
│ 📬 **Next Steps:**                                          │
│ - Notify stakeholders about the update                      │
│ - Review any blockers with your team                        │
│ - Update sprint ID in config for next sprint                │
│                                                              │
│ 💡 **Tip:** Bookmark the Confluence page for quick access   │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Need to generate another report? Just type /weekly-report   │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Success Banner:**
- ✅ Large checkmark
- Clear success message
- Positive, affirming tone

**Report Summary Box:**
- Key metrics recap
- Publish timestamp
- Health indicator

**Confluence Link:**
- Clickable URL (opens in browser)
- Direct link to published page

**Next Steps:**
- Actionable guidance
- Configuration maintenance reminder
- Usage tip

**Call to Action:**
- Encourages repeated use
- Low-friction command reminder

---

## Screen 5b: Cancelled (Alternative Path)

### User Action
User responds: "No" or "No, cancel"

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 User                                                      │
│ No, cancel                                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ❌ **Report Generation Cancelled**                          │
│                                                              │
│ The report was not published to Confluence. No changes      │
│ were made to the Confluence page.                           │
│                                                              │
│ 💾 **Draft Saved:**                                         │
│ Your report has been saved locally for reference:           │
│                                                              │
│ 📁 .claude/drafts/weekly-report-2024-12-29.md              │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 🔄 **To regenerate the report:**                       │  │
│ │                                                        │  │
│ │ 1. Make any needed updates in Jira                    │  │
│ │ 2. Run /weekly-report again                           │  │
│ │ 3. Review and publish when ready                      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ 💡 **Need help?**                                           │
│ - Ask me questions about the report data                    │
│ - Request specific changes or filtering                     │
│ - Check troubleshooting: README.md#troubleshooting          │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Cancellation Confirmation:**
- ❌ Clear cancellation message
- Reassurance (no changes made)

**Draft Preservation:**
- 💾 File saved locally
- Path shown for reference
- Can view later

**Recovery Instructions:**
- Step-by-step guide to regenerate
- Encouraging tone

**Help Options:**
- Interactive assistance offered
- Documentation link

---

## Error Screens

### ERROR: Configuration Not Found

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ❌ **Configuration File Not Found**                         │
│                                                              │
│ The weekly report generator requires a configuration file   │
│ that doesn't exist yet.                                     │
│                                                              │
│ 📋 **Required file:**                                       │
│ .claude/weekly-report-config.json                           │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 📝 **Create this file with the following content:**   │  │
│ │                                                        │  │
│ │ ```json                                               │  │
│ │ {                                                     │  │
│ │   "project": {                                        │  │
│ │     "name": "Manager.AI",                             │  │
│ │     "team": ["Rohit", "Rajiv", "Jagan"]               │  │
│ │   },                                                  │  │
│ │   "jira": {                                           │  │
│ │     "query_type": "sprint",                           │  │
│ │     "sprint_id": "YOUR_SPRINT_ID",                    │  │
│ │     "metric_preference": "story_points"               │  │
│ │   },                                                  │  │
│ │   "confluence": {                                     │  │
│ │     "space_key": "YOUR_SPACE_KEY",                    │  │
│ │     "page_title": "Weekly Status Reports - Manager.AI"│  │
│ │   },                                                  │  │
│ │   "report": {                                         │  │
│ │     "health_thresholds": {                            │  │
│ │       "green_max": 10,                                │  │
│ │       "yellow_max": 25                                │  │
│ │     }                                                 │  │
│ │   }                                                   │  │
│ │ }                                                     │  │
│ │ ```                                                   │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ 🔍 **How to find your Sprint ID:**                         │
│ 1. Open your sprint in Jira                                 │
│ 2. Look at the URL: .../sprint/12345                        │
│ 3. Copy the number (12345) as your sprint_id                │
│                                                              │
│ 📖 **Full setup guide:**                                    │
│ See: README.md#configuration                                │
│                                                              │
│ Once created, run /weekly-report again.                     │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Error Type:**
- ❌ Clear error heading
- Friendly, non-technical explanation

**Action Required:**
- 📋 File path shown
- Complete example configuration provided
- Copy-paste ready JSON

**Context Help:**
- Step-by-step instructions for required values
- Screenshot-like guidance (URL example)

**Documentation Link:**
- Full setup guide reference
- Easy recovery path

---

### ERROR: Invalid Configuration

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ❌ **Configuration Validation Failed**                      │
│                                                              │
│ Your configuration file has some issues that need to be     │
│ fixed before the report can be generated.                   │
│                                                              │
│ 📁 File: .claude/weekly-report-config.json                 │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ⚠️  **Found 3 errors:**                                │  │
│ │                                                        │  │
│ │ 1. jira.query_type: Must be "sprint" or "board"       │  │
│ │    ↳ Current value: "spint" (typo?)                  │  │
│ │                                                        │  │
│ │ 2. jira.sprint_id: Required when query_type="sprint"  │  │
│ │    ↳ Field is missing                                 │  │
│ │                                                        │  │
│ │ 3. report.health_thresholds.green_max: Must be <      │  │
│ │    yellow_max                                         │  │
│ │    ↳ Current: green_max=25, yellow_max=25            │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ 🔧 **To fix:**                                              │
│ 1. Open: .claude/weekly-report-config.json                  │
│ 2. Correct the errors listed above                          │
│ 3. Save the file                                            │
│ 4. Run /weekly-report again                                 │
│                                                              │
│ 💡 **Need help?** Ask me: "Show me a valid configuration"  │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Error Details:**
- Numbered list of all validation errors
- Each error shows field path, rule, and current value
- Helpful suggestions (e.g., "typo?")

**Fix Instructions:**
- Step-by-step resolution guide
- File path reminder
- Retry command

**Interactive Help:**
- Offer to show valid example
- Conversational assistance available

---

### ERROR: Jira Connection Failed

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ❌ **Failed to Connect to Jira**                            │
│                                                              │
│ The tool couldn't establish a connection to Jira.           │
│                                                              │
│ 🔍 **Error Details:**                                       │
│ MCP connector not responding (timeout after 10s)            │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 🛠️  **Troubleshooting Steps:**                         │  │
│ │                                                        │  │
│ │ 1️⃣  Check MCP server status                           │  │
│ │    Run: /mcp-status                                   │  │
│ │    Look for: "atlassian-jira" - should show           │  │
│ │    "Authorized ✅"                                     │  │
│ │                                                        │  │
│ │ 2️⃣  Verify MCP server is installed                    │  │
│ │    If not authorized, you'll see a prompt to connect │  │
│ │    Follow the OAuth flow to authorize                │  │
│ │                                                        │  │
│ │ 3️⃣  Check network connection                          │  │
│ │    Ensure you can access: https://[your-company].     │  │
│ │    atlassian.net                                      │  │
│ │                                                        │  │
│ │ 4️⃣  Try again                                          │  │
│ │    Run: /weekly-report                                │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ ⚠️  **Attempts:** 3/3 failed (with exponential backoff)    │
│                                                              │
│ 📖 **Still having issues?**                                 │
│ See: README.md#troubleshooting-jira-connection              │
│                                                              │
│ Or try: /weekly-report --diagnose                           │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Error Context:**
- Specific error message from API
- Retry count shown (transparency)

**Step-by-Step Troubleshooting:**
- Numbered steps with emojis
- Actionable commands (/mcp-status)
- Visual cues (checkmarks, URLs)

**Diagnostic Tools:**
- Suggest diagnostic command
- Link to troubleshooting guide

**User Empowerment:**
- Self-service resolution path
- No "contact admin" dead-end

---

### ERROR: Confluence Publish Failed

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ❌ **Confluence Publishing Failed**                         │
│                                                              │
│ The report was generated successfully, but publishing to    │
│ Confluence encountered an error.                            │
│                                                              │
│ 🔍 **Error Details:**                                       │
│ Permission denied for page "Weekly Status Reports"          │
│                                                              │
│ 💾 **Your report has been saved!**                          │
│ Don't worry - no work was lost.                             │
│                                                              │
│ 📁 Draft saved to:                                          │
│ .claude/drafts/weekly-report-2024-12-29.md                  │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 📤 **To publish manually:**                            │  │
│ │                                                        │  │
│ │ 1. Open the Confluence page:                          │  │
│ │    https://epam.atlassian.net/wiki/spaces/MNGRAI/     │  │
│ │    pages/123456                                       │  │
│ │                                                        │  │
│ │ 2. Click "Edit" (or request edit permission)          │  │
│ │                                                        │  │
│ │ 3. Open the draft file (path above)                   │  │
│ │                                                        │  │
│ │ 4. Copy the markdown content                          │  │
│ │                                                        │  │
│ │ 5. Paste at the top of the Confluence page            │  │
│ │                                                        │  │
│ │ 6. Click "Publish"                                    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ 🔑 **To fix permissions:**                                  │
│ Contact your Confluence space admin to request edit access  │
│ to the "Weekly Status Reports - Manager.AI" page.           │
│                                                              │
│ 💡 Once permissions are fixed, you can retry with:          │
│ /weekly-report                                              │
└─────────────────────────────────────────────────────────────┘
```

### Elements

**Reassurance:**
- Report NOT lost
- Draft saved automatically
- Positive framing

**Manual Workaround:**
- Detailed step-by-step process
- Direct Confluence URL
- Copy-paste instructions

**Root Cause Resolution:**
- Permission issue explained
- Who to contact (space admin)
- How to fix permanently

**Recovery Path:**
- Retry command provided
- After permissions fixed

---

## Special Screens

### Empty Sprint Warning

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ⚠️  **Empty Sprint Detected**                               │
│                                                              │
│ Sprint 25 (Jan 1 - Jan 12, 2025) contains no issues.       │
│                                                              │
│ 📊 A report will still be generated with all sections,      │
│ but they will show "No issues" messages.                    │
│                                                              │
│ 🤔 **Is this expected?**                                    │
│ This could mean:                                            │
│ - Sprint is newly created (backlog not refined yet)         │
│ - Wrong sprint ID in configuration                          │
│ - Issues were moved to another sprint                       │
│                                                              │
│ ❓ **Would you like to:**                                   │
│                                                              │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ✅ Continue anyway   │  │ ❌ Cancel & check    │        │
│ └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│ (Continuing will generate a report with all sections empty) │
└─────────────────────────────────────────────────────────────┘
```

### Missing Story Points Fallback

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│                                                              │
│ ⚠️  **Story Points Missing from Some Issues**              │
│                                                              │
│ Your configuration prefers story points, but 8 out of 13    │
│ issues don't have story point estimates.                    │
│                                                              │
│ 📊 **Fallback mode:**                                       │
│ Metrics will use issue counts instead of story points.      │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Issues without estimates:                              │  │
│ │ - PROJ-126, PROJ-127, PROJ-203, PROJ-204, ...         │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ 💡 **To use story points in future reports:**              │
│ Add estimates to all sprint issues in Jira before running   │
│ the report.                                                 │
│                                                              │
│ Continuing with issue count metrics...                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### Natural Language Understanding

The tool accepts various user responses:

**Approval:**
- "Yes"
- "Yes, publish now"
- "Publish"
- "Publish it"
- "Go ahead"
- "👍"

**Cancellation:**
- "No"
- "No, cancel"
- "Cancel"
- "Don't publish"
- "Wait"
- "👎"

**Questions During Review:**
- "Why is PROJ-126 blocked?"
- "Show me more details about the authentication epic"
- "What does the health indicator mean?"
- "Can I regenerate without unassigned issues?"

**Follow-up Commands:**
- "Show me the draft file"
- "Open the Confluence page"
- "What's my current configuration?"
- "/weekly-report --diagnose"

---

## Accessibility Features

### Screen Reader Support

**Structured Content:**
- Semantic headings (##, ###)
- Lists for scannable content
- Clear section separators

**Status Indicators:**
- Text equivalents for emojis
  - 🟢 → "Green" or "On Track"
  - ⏳ → "Loading..." or "In Progress"
  - ✅ → "Complete" or "Success"

**Link Descriptions:**
- Descriptive link text (not "click here")
- Full URLs shown for copy-paste

### Keyboard Navigation

**Command Execution:**
- Type `/weekly-report` (no mouse needed)

**Button Interaction:**
- Type "Yes" or "No" (no clicking required)
- Natural language responses accepted

### High Contrast

**Visual Hierarchy:**
- Clear separators (═══, ---)
- Emoji status indicators (color + shape)
- Bold headings and labels

---

## Mobile Experience

### Responsive Layout

The tool runs in Claude Code (desktop app), but reports can be viewed on mobile via Confluence:

**Confluence Mobile Rendering:**
- Markdown converted to responsive HTML
- Tables and code blocks adapt
- Emojis render natively
- Links are tappable

**Best Practices:**
- Keep lines < 80 characters when possible
- Use emojis for quick visual scanning
- Avoid ASCII art (progress bars degrade gracefully)

---

## UI/UX Principles Applied

### 1. **Progressive Disclosure**
- Show status step-by-step (not all at once)
- Detailed errors only when needed
- Expand context on user request

### 2. **Feedback & Transparency**
- Real-time progress indicators
- Clear success/error messages
- Retry counts visible (trust building)

### 3. **Forgiving & Resilient**
- Auto-save drafts on failure
- Multiple retry attempts
- Clear recovery paths

### 4. **Conversational & Human**
- Friendly, non-technical language
- Encouraging tone (not robotic)
- Emoji for emotion and clarity

### 5. **Self-Service & Empowering**
- Troubleshooting built into errors
- Documentation links readily available
- Diagnostic tools suggested

---

## UI Component Library

### Progress Indicators

```
⏳ Loading...
⏳ Fetching data (13 items found)...
⏳ Processing... [===>    ] 40%
```

### Status Icons

```
✅ Success / Complete
❌ Error / Failed
⚠️  Warning / Attention needed
🔄 In progress / Updating
📋 To Do / Pending
🚫 Blocked / Stopped
```

### Separators

```
─────────────────────────────────────  (thin)
═════════════════════════════════════  (thick)
---                                     (markdown)
```

### Buttons (Text-Based)

```
┌──────────────────────┐
│ ✅ Primary Action    │
└──────────────────────┘

┌──────────────────────┐
│ ❌ Secondary Action  │
└──────────────────────┘
```

### Info Boxes

```
┌───────────────────────────────────────┐
│ 📋 **Title**                          │
│                                       │
│ Content goes here                     │
└───────────────────────────────────────┘
```

### Progress Bars

```
Progress: ████████████████████░░ 92%
          [====================  ] 92%
          ●●●●●●●●●●●●●●●●●●●●○○ 92%
```

### Health Indicators

```
🟢 Green - On Track
🟡 Yellow - At Risk
🔴 Red - Blocked
```

---

## Screen Mockup: Full Happy Path

**Timeline: 0s → 5s → User Review → 8s**

```
[0s - Command Entered]
┌─────────────────────────────────────────────────────────────┐
│ 💬 User: /weekly-report                                      │
└─────────────────────────────────────────────────────────────┘

[1s - Configuration Loaded]
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│ 📋 Weekly Status Report Generator                           │
│ ✅ Configuration loaded (Manager.AI)                         │
│ 🔄 Fetching Jira data...                                    │
└─────────────────────────────────────────────────────────────┘

[3s - Data Fetched]
┌─────────────────────────────────────────────────────────────┐
│ ✅ Sprint 24 data retrieved (13 issues)                      │
│ ⚙️  Generating report...                                     │
└─────────────────────────────────────────────────────────────┘

[5s - Report Preview Shown]
┌─────────────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════════════════ │
│                     📊 REPORT PREVIEW                        │
│ ═══════════════════════════════════════════════════════════ │
│                                                              │
│ [Full 5-section report displayed here]                      │
│                                                              │
│ ═══════════════════════════════════════════════════════════ │
│ 📤 Ready to publish?                                        │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ✅ Yes, publish now  │  │ ❌ No, cancel        │        │
│ └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘

[User reviews for ~30 seconds]

[User responds: "Yes"]
┌─────────────────────────────────────────────────────────────┐
│ 💬 User: Yes                                                 │
└─────────────────────────────────────────────────────────────┘

[6s - Publishing]
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                                 │
│ 📤 Publishing to Confluence...                              │
│ ✅ Connected                                                 │
│ ✅ Page updated                                              │
└─────────────────────────────────────────────────────────────┘

[8s - Success]
┌─────────────────────────────────────────────────────────────┐
│ ✅ Report Published Successfully!                           │
│                                                              │
│ 🔗 View: https://epam.atlassian.net/wiki/spaces/MNGRAI/... │
│                                                              │
│ Need another report? Type /weekly-report                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Benchmarks

### Screen Transition Timing

| Screen | Target Time | Max Time |
|--------|-------------|----------|
| Config Load | < 100ms | 200ms |
| Jira Fetch | < 3s | 10s |
| Report Gen | < 200ms | 500ms |
| Preview Display | < 100ms | 200ms |
| Confluence Publish | < 2s | 5s |
| **Total (no review)** | **< 6s** | **15s** |

### User Experience Goals

- **First meaningful paint:** < 1s (config confirmation)
- **Report preview:** < 5s from command
- **Publish completion:** < 3s from approval
- **Error recovery:** < 2s to show actionable guidance

---

*End of UI Screens Document*
