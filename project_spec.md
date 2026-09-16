# Weekly Status Report Generator — Technical Specification

## 1. Overview

An automated weekly status report generator for a Product Manager overseeing a 3-person team on a CRM project. The tool pulls work data from Jira, formats it into a stakeholder-friendly report, and publishes it to a persistent Confluence page after manual review.

## 2. Goals

- Eliminate manual copy/paste of Jira data into weekly status updates.
- Produce a consistent, stakeholder-readable report every week with minimal PM effort.
- Keep a single up-to-date Confluence page as the source of truth for current project status.

## 3. Audience

Cross-functional stakeholders outside the immediate team (e.g. other departments, dependent teams) who need visibility into what's shipping, what's blocked, and what depends on them. Report content and tone should be accessible to readers without deep Jira familiarity.

## 4. Scope of Data

- **Source system:** Jira, scoped to a specific board/sprint (not full project, not ad-hoc JQL). The exact board/sprint ID(s) to be configured at setup time.
- **Grouping:** By workstream/epic/status — no per-person breakdown. Individual contributor names are not called out in the stakeholder-facing report.
- **Time window:** Current week snapshot only. No week-over-week comparison or trend deltas in v1.

## 5. Report Content

The generated report contains, in order:

1. **Executive Summary** — 2–3 sentence narrative covering overall health, one key highlight, and one key risk (if any).
2. **Completed This Week** — Issues that moved to Done/Resolved within the reporting period, grouped by workstream/epic.
3. **In Progress / Planned Next** — Current work in progress plus what's planned for the coming week, grouped by workstream/epic.
4. **Risks / Blockers** — Issues flagged or set to a "Blocked" status/flag in Jira. If none, state explicitly that there are no current blockers.
5. **Sprint Metrics** — Two data points:
   - Story points (or issue count) completed vs. total committed for the sprint, shown as a percentage.
   - Issue counts by status (To Do / In Progress / Blocked / Done).

## 6. Data Source — Jira

- **Integration method:** MCP tools (Atlassian/Jira MCP connector), not a custom REST API script.
- **Dependency:** Requires the relevant Atlassian/Jira MCP server to be authorized in the user's Claude Code environment before this can run. This is an external setup step outside the scope of the generator itself.
- **Filter:** Specific board/sprint configured once at setup (e.g. sprint ID or board ID), reused each week to pull the active sprint's issues.
- **Risk/blocker detection:** Issues identified via Jira's native "Blocked" status or flag field — no custom staleness or due-date heuristics in v1.

## 7. Publish Destination — Confluence

- **Role:** Confluence is the publish destination only (not a data source in v1).
- **Page structure:** A single persistent Confluence page is updated in place each week. Version history is relied upon via Confluence's built-in page history — no new child page is created per week.
- **Publish flow:** Report content is drafted first and shown to the PM for review/edit. Publishing to Confluence only happens after explicit approval — no auto-publish.

## 8. Invocation / Trigger

- **Trigger type:** Manual, on-demand — no scheduled/cron automation in v1.
- **Invocation mechanism:** A Claude Code slash command / skill (e.g. `/weekly-report`) that walks through: fetch Jira data → draft report → present for review → publish to Confluence on approval.

## 9. Out of Scope (v1)

- Per-person work breakdown or individual performance callouts.
- Week-over-week trend comparisons or velocity charts.
- Confluence as a data source (pulling notes/context pages).
- Scheduled/automatic triggering without manual initiation.
- Custom staleness/overdue-date risk detection beyond Jira's native blocked flag.

## 10. Open Configuration Items (to finalize before first run)

- Exact Jira board/sprint identifier to pull from.
- Target Confluence page (space + page ID/title) to update each week.
- Confirmation that the required Atlassian/Jira MCP server is authorized and connected.

## 11. Future Enhancements (not in v1)

- Scheduled weekly execution (cron-based).
- Week-over-week deltas and trend indicators.
- Confluence as a secondary data source for narrative context.
- Per-workstream owner tagging (internal-only view) separate from the stakeholder-facing report.
