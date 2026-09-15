# Specification Review & Clarification Notes

**Reviewer Role:** Senior Developer Code Review  
**Date:** September 15, 2026  
**Documents Reviewed:**
- spec/constitution.md (Jira/Confluence Automation Project)
- spec/specification.md (Turbo-Flux Showcase Deck Generator)

---

## Critical Issues

### ISSUE 1: Fundamental Project Scope Mismatch ✅ RESOLVED
**Severity:** CRITICAL  
**Location:** Both documents  
**Problem:**
- Constitution describes a **Jira/Confluence automation platform** with React 18, Vite, Node.js/Express, and PostgreSQL
- Specification describes **Turbo-Flux Showcase Deck Generator**, a standalone Python CLI tool
- These are completely separate projects with different tech stacks

**Impact:** Teams cannot use constitution standards for specification implementation and vice versa

**RESOLUTION CLARIFIED (Sept 15, 2026):**
- ✅ **Spec must be a Python CLI for Rally** - standalone, not part of Jira/Confluence platform
- Constitution applies to **Jira/Confluence platform project only**
- Specification applies to **Turbo-Flux Showcase Deck Generator only** (separate project)
- Teams should use appropriate standards for their project

**Status:** RESOLVED - Constitution and Specification are for two separate projects with different tech stacks

---

### ISSUE 2: Contradictory Checkboxes in Implementation Plan ✅ RESOLVED
**Severity:** HIGH  
**Location:** specification.md, lines 476-488 (Phase 1 Deliverables)  
**Problem:**
```markdown
Deliverables:
- [x] Rally API client with authentication  ← marked COMPLETE
- [x] Data retrieval for sprint information ← marked COMPLETE
Status: "Active Development" / "Ready for Implementation"
```

Checkboxes indicate work is complete, but document status says "Ready for Implementation" (not started)

**RESOLUTION CLARIFIED (Sept 15, 2026):**
- ✅ **Phase 1 deliverables updated from [x] to [ ]** - NOT YET COMPLETED
- These are aspirational goals for Phase 1 implementation
- Status correctly reflects "Active Development" → "Ready for Implementation"

**Status:** RESOLVED - Phase 1 deliverables now correctly marked as not-started

---

### ISSUE 3: Ambiguous Desktop Path Handling
**Severity:** HIGH  
**Location:** specification.md, line 143-145 (File Output)  
**Problem:**
```
Location: User's Desktop
Naming: Turbo-Flux_Showcase_Sprint_<number>.pptx
```

**Gaps:**
- No specification for non-Windows systems (Linux, macOS use different Desktop paths)
- No specification if Desktop folder doesn't exist
- No specification for handling spaces in Desktop path
- No specification for permission errors

**Questions:**
1. Is this Windows-only application?
2. What's the fallback if Desktop is inaccessible? (Home directory? Current directory?)
3. Should path be configurable via environment variable?
4. How does this interact with WSL or Docker containerization?

**Resolution Needed Before:** Development starts

---

### ISSUE 4: Undefined Narrative Generation Algorithm
**Severity:** HIGH  
**Location:** specification.md, lines 102-106, 381-386 (Slide 4, Data Processor)  
**Problem:**
```
Slide 4 Content:
- Key accomplishments narrative (generated from story titles, descriptions, and completed features)

Component Method:
- aggregate_accomplishments(stories) → String [NO ALGORITHM DEFINED]
```

**Gaps:**
- No specification for how narrative is generated
- No example output
- No word count/character limits
- No specification for handling special characters or formatting
- No specification for story without descriptions

**Questions:**
1. Simple concatenation of story titles?
2. Natural language generation algorithm?
3. Template-based with story data interpolation?
4. Human-written template with data placeholders?

**Resolution Needed Before:** Development

---

### ISSUE 5: Sprint Goal Calculation Ambiguity
**Severity:** MEDIUM  
**Location:** specification.md, lines 258-262 (Sprint Goal Achievement)  
**Problem:**
```
Formula: (Count of accepted stories / Count of planned stories) × 100

BUT ALSO:

Sprint Velocity: Sum of story points for accepted stories
Planned vs Actual: Story points (not story count)
```

**Contradiction:**
- Velocity uses STORY POINTS
- Goal achievement uses STORY COUNT
- These are fundamentally different metrics

**Example Problem:**
- 1 story with 50 points accepted
- 5 stories with 10 points each planned
- By count: (1/5) × 100 = 20%
- By points: (50/50) × 100 = 100%

Which is correct?

**Questions:**
1. Should goal achievement also use story points?
2. If using story count, what's the KPI advantage?
3. Should there be TWO goal metrics?

**Resolution Needed Before:** Slide 3 development

---

## Medium Severity Issues

### ISSUE 6: "Planned Stories" Definition
**Severity:** MEDIUM  
**Location:** specification.md, Data Requirements section  
**Problem:**
- No clear definition of what counts as "planned"
- Is it stories added at sprint creation?
- Stories added during first day?
- Only stories in the planned release?
- How to handle mid-sprint additions?

**Questions:**
1. Is "planned" snapshot taken at sprint start or sprint end?
2. How are stories added mid-sprint treated?
3. How are stories removed from sprint treated?
4. Does carryover from previous sprint count as "planned"?

**Impact:** KPI accuracy depends on this

---

### ISSUE 7: Stories Without Story Points
**Severity:** MEDIUM  
**Location:** specification.md, Data Requirements  
**Problem:**
- No specification for handling stories with 0 or NULL story points
- These might exist in Rally for various reasons
- Affects velocity calculation

**Questions:**
1. Exclude them from velocity calculation?
2. Treat as 0 points?
3. Treat as error condition?
4. Prompt user for estimation?

**Resolution:** Add validation rule

---

### ISSUE 8: Unresolved Technology Choices (Constitution)
**Severity:** MEDIUM  
**Location:** constitution.md, throughout  
**Unresolved Choices:**
```
State Management: Redux OR Zustand
HTTP Client: Axios OR Fetch API  
UI Components: Material-UI OR Chakra UI OR custom
ORM: Sequelize OR TypeORM OR Knex.js
Validation: joi OR zod
Logging: winston OR pino
Testing Framework: Vitest OR Jest OR Mocha
E2E Testing: Cypress OR Playwright
```

**Impact:** 
- Cannot write code until decisions made
- Affects architecture decisions
- Makes constitution non-actionable

**Resolution Needed:** Create decision matrix (each choice with pros/cons)

---

### ISSUE 9: Database Migration Tool Inconsistency
**Severity:** MEDIUM  
**Location:** constitution.md, line 37  
**Problem:**
```
Migration Tool: db-migrate or Alembic
```

**Issue:** 
- db-migrate is JavaScript-based (for Node.js)
- Alembic is Python-based (SQLAlchemy)
- Cannot use both for the same Node.js/Express backend

**Questions:**
1. Which tool should be used?
2. If db-migrate: How are database-agnostic migrations?
3. If Alembic: Why use Python tool for Node.js project?

**Resolution:** Pick one tool

---

### ISSUE 10: Missing Jira/Confluence Integration Details
**Severity:** MEDIUM  
**Location:** constitution.md (entire document)  
**Problem:**
- Title says "Jira/Confluence Automation Project"
- No mention of how Jira integration works
- No mention of how Confluence integration works
- No API specifications for Jira/Confluence
- No authentication mechanism for these systems
- No mention of which Jira/Confluence features are being automated

**Questions:**
1. What is being automated in Jira? (Issue creation? Workflow transitions? Reporting?)
2. What is being automated in Confluence? (Page creation? Synchronization? Content updates?)
3. What data flows between systems?
4. Authentication: OAuth? API tokens? Basic auth?
5. Rate limiting? Jira has strict API limits.

**Impact:** Constitution is incomplete and misleading

---

### ISSUE 11: CORS Configuration Undefined
**Severity:** MEDIUM  
**Location:** constitution.md, line 292  
**Problem:**
```
- Implement CORS properly
```

No details on:
- Allowed origins (localhost? production domain? both?)
- Allowed methods
- Allowed headers
- Credentials handling
- CORS headers setup

**Questions:**
1. Will frontend and backend be on same domain?
2. If separate domains, which origins are allowed?
3. Does backend accept cookies/credentials?

**Resolution:** Create CORS configuration specification

---

### ISSUE 12: Rate Limiting Not Specified
**Severity:** MEDIUM  
**Location:** constitution.md, line 290  
**Problem:**
```
- Implement rate limiting on API endpoints
```

No details on:
- Which endpoints are rate-limited?
- Limits per endpoint
- Time window
- Per-user or per-IP?
- Behavior when limit exceeded

**Questions:**
1. How many requests per minute per endpoint?
2. Is rate limiting per-user or per-IP?
3. Should it differ for authenticated vs anonymous requests?
4. How does it interact with JWT refresh?

**Resolution:** Create rate limiting policy

---

### ISSUE 13: Soft Delete Query Impact
**Severity:** MEDIUM  
**Location:** constitution.md, line 124  
**Problem:**
```
- Soft Deletes: Use `deleted_at` column for logical deletes where audit trail needed
```

Implemented but no specification for:
- Do ALL queries need to filter out soft-deleted records?
- How does ORM handle this? (Scopes? Global filters?)
- What about queries that SHOULD include soft-deleted records?
- Migration strategy for existing data?

**Questions:**
1. Is soft delete global or per-table?
2. How are foreign key constraints handled with soft deletes?
3. Should there be a recovery mechanism?

---

### ISSUE 14: JWT Refresh Token Rotation Not Detailed
**Severity:** MEDIUM  
**Location:** constitution.md, line 114  
**Problem:**
```
- Authentication: JWT tokens with refresh token rotation
```

No specification for:
- How rotation works
- Token storage
- Revocation mechanism
- Refresh token expiry

**Questions:**
1. Does refresh token get issued with access token?
2. How long is refresh token valid?
3. Is refresh token stored in database?
4. How are old refresh tokens invalidated?
5. Can same refresh token be used multiple times?

---

### ISSUE 15: OpenAPI/Swagger Versioning Missing
**Severity:** MEDIUM  
**Location:** constitution.md, line 317  
**Problem:**
```
- OpenAPI/Swagger specification
```

No specification for:
- OpenAPI version (2.0? 3.0? 3.1?)
- Swagger UI hosting
- How to keep spec in sync with code
- Server definitions

**Questions:**
1. Should spec be auto-generated or hand-written?
2. Where is Swagger UI hosted?
3. How are API changes versioned?

---

### ISSUE 16: Alembic Not Compatible with Node.js Project
**Severity:** MEDIUM  
**Location:** constitution.md, line 37  
**Problem:**
- Alembic is Python library for SQLAlchemy
- Constitution specifies Node.js/Express backend
- Alembic cannot be used with Node.js project

**Resolution:** Remove Alembic, use JavaScript migration tool

---

## Low Severity Issues (Gaps/Unclear Requirements)

### ISSUE 17: "Professional Color Scheme" Undefined
**Severity:** LOW  
**Location:** specification.md, line 426  
**Problem:**
- No specification of actual colors
- No reference to brand guidelines
- No contrast requirements for accessibility

**Resolution:** Specify hex codes or reference to design system

---

### ISSUE 18: Slide Layout Not Specified
**Severity:** LOW  
**Location:** specification.md, Presentation Generator  
**Problem:**
- No specification for slide dimensions
- No specification for font sizes, families
- No specification for margins/padding
- No color scheme for slides
- No logo/branding requirements

**Resolution:** Create slide template specification or mockups

---

### ISSUE 19: Image Compression for Screenshots
**Severity:** LOW  
**Location:** specification.md, line 120  
**Problem:**
- No specification for how large screenshots are handled
- No specification for compression
- PowerPoint file size could become very large
- No specification for image quality settings

**Questions:**
1. Max screenshot size?
2. Should image be compressed?
3. What quality level?
4. What if screenshot > max size?

---

### ISSUE 20: Concurrent Execution Not Addressed
**Severity:** LOW  
**Location:** specification.md  
**Problem:**
- No specification if user runs script twice simultaneously
- No file locking mechanism
- No specification for handling concurrent file writes

**Questions:**
1. Should it prevent concurrent runs?
2. Should it queue them?
3. What if both try to write to same file?

---

### ISSUE 21: Story Point Calculation Edge Cases
**Severity:** LOW  
**Location:** specification.md, Data Requirements  
**Missing Specification:**
- What if story has float points (e.g., 3.5)?
- What if story points are negative?
- What if story has no point value (NULL)?
- How to handle acceptance criteria without points?

---

### ISSUE 22: Feature Extraction Logic Undefined
**Severity:** LOW  
**Location:** specification.md, line 386  
**Problem:**
```
- extract_feature_list(stories) → List[String]
```

No specification for:
- How features are associated with stories in Rally
- What if story has no feature?
- What if multiple features?
- Feature naming format

---

### ISSUE 23: Error Logging Destination
**Severity:** LOW  
**Location:** specification.md, NFR2  
**Problem:**
- "All operations logged for troubleshooting"
- No specification where logs are stored
- No log rotation policy
- No specification for log verbosity levels

**Questions:**
1. File or stdout?
2. Log rotation? (Size, age?)
3. Log format?
4. How long to retain logs?

---

### ISSUE 24: Terminal Interruption Handling
**Severity:** LOW  
**Location:** specification.md  
**Problem:**
- No specification for what happens if user closes terminal/cancels execution
- Partial file handling
- Incomplete presentation cleanup

**Questions:**
1. Clean up partial PowerPoint file?
2. Rollback any database changes (if using)?
3. Final state recovery?

---

### ISSUE 25: PowerPoint File Corruption Handling
**Severity:** LOW  
**Location:** specification.md  
**Problem:**
- No specification if generated PowerPoint is corrupted
- No validation after save
- No recovery mechanism

**Questions:**
1. Should file be validated after write?
2. What to do if validation fails?
3. Keep backup?

---

## Architectural/Design Gaps

### ISSUE 26: Missing Data Model Specification
**Severity:** MEDIUM  
**Location:** constitution.md  
**Problem:**
- No entity relationship diagram
- No database schema specification
- No specification for data relationships
- Cannot implement migrations without this

**Resolution:** Create ERD and schema specification

---

### ISSUE 27: API Endpoint Specification Missing
**Severity:** MEDIUM  
**Location:** constitution.md  
**Problem:**
- Constitution mentions REST API design
- No actual endpoints specified
- No request/response payloads
- No authentication per endpoint

**Resolution:** Create API specification document (OpenAPI/Swagger)

---

### ISSUE 28: Frontend State Management Pattern Missing
**Severity:** MEDIUM  
**Location:** constitution.md  
**Problem:**
- Says "Centralized store for application state"
- But 2-3 choices given without guidance
- No specification for Redux structure (reducers, actions, etc.)
- No specification for Zustand patterns

**Resolution:** Decide on state management and provide pattern spec

---

### ISSUE 29: Error Code Standardization Missing
**Severity:** MEDIUM  
**Location:** constitution.md, line 209  
**Problem:**
```
Error Response:
{
  code: "ERROR_CODE",
  message: "Human readable message"
}
```

No specification for:
- What ERROR_CODEs are valid?
- Format? (UPPERCASE_SNAKE_CASE? Numeric?)
- Should there be an error code catalog?
- How many codes are there?

**Resolution:** Create error code specification/catalog

---

## Documentation Gaps

### ISSUE 30: Missing Architecture Decision Records (ADRs)
**Severity:** MEDIUM  
**Location:** Both documents  
**Problem:**
- Technology choices made without documented reasoning
- No decision history
- Future maintainers won't understand why choices were made

**Resolution:** Create ADR for each major decision

---

### ISSUE 31: Missing API Response Examples
**Severity:** LOW  
**Location:** constitution.md, API Standards  
**Problem:**
- Generic response format provided
- No actual endpoint examples
- No error response examples with codes

**Resolution:** Add example responses for common endpoints

---

### ISSUE 32: Performance Baseline Missing
**Severity:** LOW  
**Location:** constitution.md, Performance Standards  
**Problem:**
- Performance targets defined
- No specification for how to measure
- No baseline/testing methodology
- No specification for test environment

**Questions:**
1. How to run performance tests?
2. What hardware/network conditions?
3. Development vs production measurement?

---

## Questions for Product Manager / Stakeholders

### Strategic Questions

1. **Project Scope:** Are constitution.md (Jira/Confluence platform) and specification.md (Turbo-Flux Rally tool) two separate initiatives, or is Turbo-Flux part of the larger platform?

2. **Priority:** If two separate projects, which has higher priority?

3. **Timeline:** What's the delivery deadline for Turbo-Flux?

4. **Team Structure:** Will same team build both projects or different teams?

5. **Jira/Confluence Integration:** What specific automation is needed for Jira/Confluence in the constitution project?

### Technical Questions

6. **Turbo-Flux Desktop Path:** Should tool support Linux/macOS, or Windows-only?

7. **Narrative Generation:** How should "key accomplishments narrative" be generated? (Auto-generated text, template-based, or manual?)

8. **Planned Stories Definition:** How is "planned" calculated? (Sprint start snapshot? Any story ever added?)

9. **State Management:** Redux or Zustand? (for constitution project)

10. **Database Migrations:** JavaScript (db-migrate) or stick with one tool? (Alembic is Python)

---

## Recommendations for Next Steps

### Before Development Starts

**MUST DO (Blocking):**
1. Clarify project scope (2 projects vs 1?)
2. Fix phase deliverables checkboxes
3. Resolve sprint goal calculation (count vs points)
4. Define narrative generation algorithm
5. Define "Planned stories" precisely

**SHOULD DO (High Priority):**
1. Make technology choices (Redux/Zustand, ORM, etc.)
2. Create Jira/Confluence integration specification
3. Define Desktop path handling for cross-platform
4. Create error code catalog
5. Create data model (ERD and schema)
6. Create API endpoint specification

**NICE TO DO (Can be deferred):**
1. Create slide design templates/mockups
2. Create performance testing methodology
3. Write architecture decision records
4. Create rate limiting policy
5. Create CORS configuration spec

---

## Summary Table

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 2 | Project scope mismatch, contradictory status |
| HIGH | 4 | Desktop paths, narrative generation, goal calc, unresolved choices |
| MEDIUM | 11 | Missing details, ambiguous requirements |
| LOW | 10 | Edge cases, optional specifications |
| **TOTAL** | **27** | **Issues Identified** |

---

## Review Sign-off

**Reviewed By:** Senior Developer  
**Review Date:** September 15, 2026  
**Overall Assessment:** Specifications have good structure but contain critical issues preventing implementation. Projects need clarification and decision-making before development can begin.

**Recommendation:** Schedule clarification meeting with PM and architects to resolve CRITICAL and HIGH severity issues before team starts development.

**Next Review Cycle:** After critical issues are resolved

---

**End of Clarification Document**
