# Weekly Status Report Generator (Jira-Confluence Automation)

## 📋 Overview

An automated weekly status report generator for Product Managers overseeing development teams. This tool pulls work data from Jira, formats it into stakeholder-friendly reports, and publishes them to Confluence pages after manual review.

## 🎯 Goals

- **Eliminate manual work**: No more copy/paste of Jira data into weekly status updates
- **Consistency**: Produce uniform, stakeholder-readable reports every week with minimal PM effort
- **Single source of truth**: Maintain an up-to-date Confluence page for current project status

## 👥 Audience

Cross-functional stakeholders outside the immediate team (e.g., other departments, dependent teams) who need visibility into:
- What's shipping
- What's blocked
- What depends on them

Reports are designed to be accessible to readers without deep Jira familiarity.

## 📊 Report Structure

The generated report contains five sections:

1. **Executive Summary** — 2–3 sentence narrative covering overall health, one key highlight, and one key risk (if any)
2. **Completed This Week** — Issues that moved to Done/Resolved within the reporting period, grouped by workstream/epic
3. **In Progress / Planned Next** — Current work in progress plus what's planned for the coming week, grouped by workstream/epic
4. **Risks / Blockers** — Issues flagged or set to "Blocked" status/flag in Jira
5. **Sprint Metrics** — Story points completed vs. total committed, and issue counts by status

## 🏗️ Architecture

### Data Sources
- **Jira**: Primary data source via MCP tools (Atlassian/Jira MCP connector)
- **Scope**: Specific board/sprint (configured at setup time)
- **Grouping**: By workstream/epic/status (no per-person breakdown)
- **Time window**: Current week snapshot only

### Publishing
- **Confluence**: Single persistent page updated in place each week
- **Version control**: Relies on Confluence's built-in page history
- **Approval flow**: Reports are drafted and shown to PM for review before publishing

### Invocation
- **Trigger**: Manual, on-demand via Claude Code slash command (`/weekly-report`)
- **No automation**: No scheduled/cron execution in v1

## 🚀 Getting Started

### Prerequisites

Before first run, you must:

1. ✅ Authorize and connect the Atlassian/Jira MCP server in Claude Code
2. ✅ Obtain the target Jira board/sprint identifier
3. ✅ Obtain the target Confluence page (space key + page ID/title)

### Installation

*(Coming soon - implementation in progress)*

### Usage

```bash
/weekly-report
```

The command will:
1. Fetch data from Jira
2. Generate report draft
3. Present for PM review
4. Publish to Confluence upon approval

## 📂 Project Structure

```
jira-confluence-automation/
├── README.md                  # This file
├── project_spec.md            # Technical specification
├── BACKLOG.md                 # Implementation backlog with GitHub issues
├── .gitignore                 # Git ignore rules
├── .mcp.json                  # MCP server configuration
└── .codemie/                  # Virtual assistant configurations
```

## 📝 Documentation

- **[Technical Specification](project_spec.md)** - Complete technical details
- **[Implementation Backlog](BACKLOG.md)** - Phased development plan with GitHub issues

## 🔒 Security

- Never commit credentials or tokens to the repository
- Use environment variables or `.claude/settings.local.json` for secrets
- All sensitive files are excluded via `.gitignore`

## 🛠️ Development Status

**Current Phase**: Planning & Setup

See [BACKLOG.md](BACKLOG.md) for detailed implementation tasks organized by phase:
- Phase 1: Setup ✅ (In Progress)
- Phase 2: Core Features 🚧 (Planned)
- Phase 3: Integration 🚧 (Planned)
- Phase 4: Testing 🚧 (Planned)
- Phase 5: Documentation 🚧 (Planned)

## 🚫 Out of Scope (v1)

- Per-person work breakdown or individual performance callouts
- Week-over-week trend comparisons or velocity charts
- Confluence as a data source
- Scheduled/automatic triggering
- Custom staleness/overdue-date risk detection

## 🔮 Future Enhancements

- Scheduled weekly execution (cron-based)
- Week-over-week deltas and trend indicators
- Confluence as a secondary data source for narrative context
- Per-workstream owner tagging

## 📄 License

*(Add license information here)*

## 👤 Author

**Product Manager**: Avinash Agarwal

## 🤝 Contributing

*(Add contribution guidelines here)*

---

**Note**: This project uses MCP (Model Context Protocol) tools for Jira and Confluence integration.
