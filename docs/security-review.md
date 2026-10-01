# Security Review Pack: Weekly Status Report Generator

Prepared for the company approval needed before redacted ticket titles are sent to the Claude API. Everything else in this document describes the tool as it behaves with LLM drafting **off**, which is the default.

## 1. What the tool does

A local web app run by one product manager. It reads the active Jira Cloud sprint, computes metrics, drafts a status report, and publishes it to Confluence after the PM reviews it.

## 2. Data flow

```
Jira Cloud --(HTTPS, API token)--> local app
   local app: exclude internal-only issues -> redact PII -> compute metrics -> draft
   local app --(HTTPS, API token)--> Confluence Cloud   (publish, after PM approval)
   local app --(HTTPS, API key)----> Claude API          (ONLY if approved and enabled)
```

Nothing is hosted. The server listens on `127.0.0.1` only and rejects requests whose Host header is not localhost.

## 3. Data fetched from Jira

| Field | Fetched | Notes |
|-------|---------|-------|
| Issue key, title, type, status, priority | Yes | Title is redacted before further use |
| Story points, created and resolved dates, status history | Yes | Used for metrics and cycle time |
| Epic name | Yes | Redacted before further use |
| Labels, components, security level | Yes | Used only for the exclusion rule, then dropped |
| Description, comments, attachments | **No** | Never requested |
| Assignee, reporter, any person fields | **No** | Never requested; names cannot appear in reports |

## 4. Protections

1. **Exclusion:** issues matching the configured internal-only rule are removed before any other processing. The rule is not yet defined (open item); a warning shows on every report until it is set or "no exclusions" is explicitly confirmed.
2. **PII redaction:** titles and epic names are scanned for email, SSN, card numbers (Luhn-checked), VINs, phone numbers, street addresses, long account numbers, and a configurable account/loan regex. Matches are replaced with `[REDACTED-TYPE]`. Redaction events record the issue key and type, never the value.
3. **Typed pipeline:** redacted issues are a distinct type. Metrics, drafting, and rendering only accept it, so raw ticket text cannot reach them.
4. **Publish gate:** every redaction raises a blocking warning. Publishing is refused (HTTP 409, enforced on the server) until the PM acknowledges each one. Text the PM types is also redacted and can raise new warnings.
5. **No secrets in files or logs:** tokens come from environment variables, are never returned by the API, and the server logs no ticket content. A log scan of a full demo run found no ticket text or token strings.
6. **Local storage only:** settings and report history are stored in a local SQLite file under `./data`, which is excluded from git. Stored reports contain only redacted text.

## 5. What would be sent to the Claude API (if approved)

Only the following, built by `buildLlmPayload`:

- Project name and sprint name
- Computed RAG status and the reasons text
- Computed metrics (numbers only)
- Blockers: key, redacted title, days blocked
- Per epic: epic name and, for each issue, key, redacted title, status, story points

Not sent: descriptions, comments, assignees, labels, components, security levels, dates of individual issues, or any credentials. The Review screen has a "View LLM payload" panel showing exactly this object, and a test asserts the payload contains no description, comment, or assignee fields and no unredacted PII.

Controls on the feature:

- Disabled by default.
- Cannot be enabled without a recorded approval reference (enforced on save).
- Requires `ANTHROPIC_API_KEY` in the environment.
- If a call fails, the app falls back to the template draft and shows a warning.
- The PM edits all text before publishing; nothing is auto-published.

## 6. Residual risks

| Risk | Mitigation | Remaining exposure |
|------|-----------|--------------------|
| A PII format the patterns do not recognise appears in a title | Titles only; mandatory PM review; configurable regex; payload viewer | A novel format or free-text name (for example "John Smith's loan") is not detected by pattern matching |
| Internal-only issues included by mistake | Exclusion rule plus a persistent warning | Rule is currently undefined |
| API token compromise | Environment variables only; localhost binding | Standard endpoint risk on the PM's machine |
| LLM invents facts | Input limited to facts; human edit required | Reviewer must read the text |

Personal names in titles are the main gap that regex redaction cannot close. Options if this matters for approval: a title-policy for ticket authors, or an allow-list approach that drafts only from epic names and counts.

## 7. Questions for the security team

1. Is sending redacted ticket titles to the Claude API acceptable, or should the payload be limited to epic names and counts?
2. Is the Anthropic API under an approved enterprise agreement (data retention and training terms)?
3. Where may the API tokens be stored on the PM's machine (environment variables, OS credential store)?
4. Is a service account required for Jira and Confluence access instead of the PM's own API token?
