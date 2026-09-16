# Weekly Status Report Generator — Implementation Backlog

Derived from [project_spec.md](project_spec.md).

## Prerequisites (not blocking, must be resolved before first live run)

- [ ] Confirm the Atlassian/Jira MCP server is authorized and connected in Claude Code.
- [ ] Obtain the target Jira board/sprint identifier to pull issues from.
- [ ] Obtain the target Confluence page (space key + page ID/title) to update each week.

## Phase 1: Setup

- [ ] Create the project skill directory/file structure for the `/weekly-report` slash command. ([#1](https://github.com/Avinasha1101/jira-confluence-automation/issues/1))
- [ ] Define a config location (e.g. a small config file or skill frontmatter) for board/sprint ID and Confluence page target, using placeholder values until Prerequisites are resolved. ([#2](https://github.com/Avinasha1101/jira-confluence-automation/issues/2))
- [ ] Confirm which Jira fields are available via the MCP connector (status, epic/workstream link, story points, blocked flag) and note any gaps against spec requirements. ([#3](https://github.com/Avinasha1101/jira-confluence-automation/issues/3))
- [ ] Confirm which Confluence MCP operations are available (read page, update page) and note the page-update method to use (full body replace vs. section patch). ([#4](https://github.com/Avinasha1101/jira-confluence-automation/issues/4))

## Phase 2: Core Features

### Executive Summary
- [ ] Build logic to derive overall health signal (e.g. based on blocker count and % complete).
- [ ] Build narrative formatting for the 2–3 sentence exec summary (health + highlight + risk).

### Completed This Week
- [ ] Build fetch logic: query Jira for issues in Done/Resolved status within the sprint scope for the reporting period.
- [ ] Build grouping logic: group fetched issues by workstream/epic.
- [ ] Build formatting logic: render grouped completed issues as markdown section.

### In Progress / Planned Next
- [ ] Build fetch logic: query Jira for issues in In Progress and To Do status within the sprint scope.
- [ ] Build grouping logic: group in-progress and planned issues by workstream/epic.
- [ ] Build formatting logic: render grouped in-progress/planned issues as markdown section.

### Risks / Blockers
- [ ] Build fetch logic: query Jira for issues with the "Blocked" status or flag set.
- [ ] Build formatting logic: render blocker list as markdown, including an explicit "no current blockers" message when the list is empty.

### Sprint Metrics
- [ ] Build fetch/calc logic: compute story points (or issue count) completed vs. total committed, as a percentage.
- [ ] Build fetch/calc logic: compute issue counts by status (To Do / In Progress / Blocked / Done).
- [ ] Build formatting logic: render metrics as a markdown table or summary line.

### Slash Command / Skill
- [ ] Build the `/weekly-report` skill definition (trigger name, description, invocation flow).
- [ ] Wire skill steps in order: fetch Jira data → assemble all five sections → present draft to PM → await approval → publish to Confluence.
- [ ] Assemble the full report markdown (exec summary + 4 sections) into a single document, matching the section order defined in the spec.

## Phase 3: Integration

- [ ] Integrate Jira MCP calls into each section's fetch logic (replace any placeholder/mock data with live MCP tool calls).
- [ ] Integrate Confluence MCP call to update the target page in place with the approved report content.
- [ ] Implement the review/approval gate: halt the skill after drafting and require explicit PM confirmation before the Confluence publish step runs.
- [ ] Handle MCP authorization failure gracefully (clear message directing the PM to authorize the connector, per the Prerequisites).
- [ ] Handle empty/missing config (board/sprint ID or Confluence page not yet set) with a clear setup-needed message instead of failing silently.

## Phase 4: Testing

- [ ] Write automated tests for the grouping logic (workstream/epic grouping) covering multiple issues, single issue, and no-issues cases.
- [ ] Write automated tests for the sprint metrics calculation (% complete, status counts) covering normal, zero-total, and all-complete cases.
- [ ] Write automated tests for the blocker formatting logic, covering the "no blockers" empty-state message.
- [ ] Write automated tests for the exec summary health-signal derivation logic.
- [ ] Manually dry-run the full skill end-to-end against the real configured sprint and verify all five sections render correctly.
- [ ] Manually verify the edge case of an empty sprint (no completed, no in-progress, no blockers) produces a sensible report rather than blank/broken sections.
- [ ] Manually verify the review/approval gate actually stops before publishing until confirmation is given.
- [ ] Manually verify the Confluence page updates correctly in place and prior content is fully replaced as expected.

## Phase 5: Documentation

- [ ] Document how to invoke the `/weekly-report` command.
- [ ] Document how to set/update the config (board/sprint ID, Confluence page target).
- [ ] Document the one-time MCP authorization steps needed before first use.
- [ ] Document common troubleshooting steps (MCP auth errors, missing config, empty data edge cases).
