# Weekly Status Report Generator — Backlog

Derived from [project_spec.md](project_spec.md). Detailed, ordered work items are in [TASKS.md](TASKS.md).

## Prerequisites and Blockers

| Item | Owner | Blocks | Status |
|------|-------|--------|--------|
| Jira Cloud URL, account email, API token | PM | First live Jira fetch | Open |
| Scrum board ID | PM | First live Jira fetch | Open |
| Internal-only issue marker (label / security level / component) | Jira admin | Production use (warning banner until set) | Unknown |
| Confluence space, parent page, "Latest Status" page | PM | Publishing | To be supplied |
| Company security approval for sending redacted titles to Claude API | PM / Security | Enabling LLM drafting | Required, pending |
| Anonymized Jira payload fixtures | PM / Dev | Offline tests | Open |

Work can start without any of these. Phases 1-2 run on fixtures and the template fallback.

## Epics (priority order)

| # | Epic | Value | Phase |
|---|------|-------|-------|
| E1 | Project foundation | Repo, tooling, config, secrets handling | 1 |
| E2 | Jira data retrieval | Pull the active sprint reliably | 1 |
| E3 | Exclusion and PII protection | Compliance-critical; nothing downstream sees raw text | 1 |
| E4 | Metrics, blockers, RAG | Core report content | 1 |
| E5 | Report rendering and template drafting | Usable report with no LLM | 2 |
| E6 | Review and edit UI | PM control before anything is published | 3 |
| E7 | Confluence publishing | Dated page plus Latest page | 3 |
| E8 | LLM narrative drafting | Better summaries; gated on security approval | 3 |
| E9 | History and settings | Reopen and re-publish past reports | 3 |
| E10 | Hardening and release | Security review, docs, error handling | 4 |

## Parked (not in v1)

- Scheduled draft generation
- Week-over-week trends and velocity charts
- Per-epic owner internal view
- Email and PDF delivery
- Jira Data Center / Server support
- Multi-team support

## Risks to Watch

- PII patterns missing a format (mitigation: titles only, mandatory review, "view payload" panel)
- Internal-only rule never defined (mitigation: persistent warning, explicit "no exclusions" choice)
- Security approval delayed (mitigation: template fallback keeps the product usable)
- Workflow status names differing from "Ready for Dev", "In Dev", "Blocked" (mitigation: configurable names, validated against the board)
