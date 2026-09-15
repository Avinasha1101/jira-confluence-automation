# Specification: Turbo-Flux Showcase Deck Generator

## Overview

**Project Name:** Turbo-Flux Showcase Deck Automation  
**Version:** 2.0 (SpecKit Format)  
**Date:** September 15, 2026  
**Product Manager:** Avinash Agarwal  
**Company:** Cox Automotive  
**Status:** Active Development

---

## Problem Statement

The Turbo-Flux team at Cox Automotive currently spends significant time manually creating bi-weekly showcase presentations to report sprint accomplishments, KPIs, and team updates to stakeholders. This manual process is:

- **Time-consuming:** 2-3 hours per sprint (5+ hours per month)
- **Error-prone:** Manual data entry leads to inconsistencies
- **Repetitive:** Same format, different data each sprint
- **Dependent:** Requires PM involvement that could be automated

**Goal:** Create an automated system that generates presentation-ready PowerPoint decks in < 30 seconds with minimal user intervention.

---

## Objectives

### Primary Objectives
1. **Automate presentation creation** from Rally (CA Agile Central) data
2. **Reduce manual effort** by 90% (from 2+ hours to < 5 minutes)
3. **Ensure consistency** across all generated decks
4. **Improve accuracy** of sprint metrics and reporting

### Secondary Objectives
1. **Provide clear feedback** during generation process
2. **Handle error scenarios** gracefully
3. **Enable future enhancements** (scheduling, email delivery, etc.)
4. **Maintain credential security** with environment-based configuration

---

## Requirements

### Functional Requirements

#### FR1: Automated Data Retrieval
```
Given: Rally API credentials are configured
When: User executes the generator script
Then: System retrieves current sprint data including:
  - Sprint number and dates
  - Planned story count and points
  - Accepted stories and points
  - Features completed in sprint
```

**Acceptance Criteria:**
- System connects to Rally API within 5 seconds
- Returns sprint data with 100% accuracy match to Rally UI
- Handles missing optional fields gracefully
- Validates data completeness before proceeding

#### FR2: Presentation Generation (6-Slide Structure)

**Slide 1: Project Overview**
```
Content:
- Project: "VCA Voice Unified Settings Platform"
- Team: "Turbo-Flux"
- Sprint: [number from Rally]
- Sprint Dates: [start] to [end]
- Team Members:
  - Kartik (Developer)
  - Vishal (Developer)
  - Ramesh (Developer)
- Product Manager: Avinash Agarwal
- Status: [Manual Input: On Track/At Risk/Behind]
```

**Slide 2: Sprint Progress**
```
Content:
- Sprint identifier
- Completed user stories (bulleted list of titles)
- Total stories completed
- Total story points completed
```

**Slide 3: Key Performance Indicators**
```
Metrics (Calculated):
- Sprint Velocity: [Sum of accepted story points]
- Planned vs Actual: [Planned] planned / [Actual] completed
- Sprint Goal Achievement: [Percentage]%
  Formula: (Count of accepted stories / Count of planned stories) × 100
```

**Slide 4: Team Updates**
```
Content:
- List of completed user stories
- Key accomplishments narrative
- Features delivered in sprint
- Number of stories completed
```

**Slide 5: Blockers & Risks**
```
Content:
- Current blockers (manual input, optional)
- Current risks (manual input, optional)
- Display "No blockers or risks reported" if empty
```

**Slide 6: Rally Board Screenshot**
```
Content:
- Embedded image of Rally board (user-provided)
- Properly scaled and positioned
- Supports: PNG, JPG, BMP formats
```

#### FR3: User Input Collection
```
System prompts user for:
1. Project Status: On Track / At Risk / Behind (required)
2. Blockers: Free text (optional)
3. Risks: Free text (optional)
4. Rally Board Screenshot: File path (required)
```

**Acceptance Criteria:**
- All prompts are clear and intuitive
- Optional fields can be skipped
- File paths are validated before use
- Invalid inputs trigger helpful re-prompts

#### FR4: File Output Management
```
Output Specifications:
- Format: Microsoft PowerPoint (.pptx)
- Location: User's Desktop
- Naming: Turbo-Flux_Showcase_Sprint_<number>.pptx
- Example: Turbo-Flux_Showcase_Sprint_12.pptx
```

**Acceptance Criteria:**
- File is created on Desktop
- Naming follows convention exactly
- Deck is immediately usable (no post-generation editing needed)
- Success message displays file location

### Non-Functional Requirements

#### NFR1: Performance
- **Generation Time:** Must complete in < 30 seconds (90% of cases < 20 seconds)
- **API Timeouts:** Individual Rally API calls timeout after 10 seconds
- **Data Processing:** KPI calculations complete in < 1 second
- **File Save:** PowerPoint write completes in < 5 seconds
- **Scalability:** Support sprints with up to 100 user stories

#### NFR2: Reliability
- **Retry Logic:** 3 attempts with exponential backoff for API failures
- **Data Validation:** Verify all data before presentation generation
- **Graceful Degradation:** Generate deck with partial data (with warnings)
- **Error Recovery:** Clear error messages enable user self-service
- **Logging:** All operations logged for troubleshooting

#### NFR3: Usability
- **Clear Messaging:** Console output shows progress at each step
- **Intuitive Prompts:** Human-readable, natural language input requests
- **Helpful Errors:** Error messages include troubleshooting hints
- **Confirmation:** Success message confirms file location and status
- **Documentation:** README includes setup and execution examples

#### NFR4: Security
- **Credential Management:** All secrets stored in .env file
- **No Code Secrets:** API keys never hardcoded in source
- **Git Safety:** .env included in .gitignore
- **Safe Logging:** No sensitive data in console output
- **Input Validation:** All user inputs validated and sanitized

#### NFR5: Maintainability
- **Modular Architecture:** Each component has single responsibility
- **Code Documentation:** Functions and classes include docstrings
- **Configuration Isolation:** All settings in configuration module
- **Template Management:** Easy to modify slide structures
- **Dependency Management:** Use requirements.txt for version control

---

## Data Requirements

### Rally API Integration

#### Required Data Points
```python
# Sprint Information
- Sprint Number (e.g., "Sprint 12")
- Sprint Start Date
- Sprint End Date
- Total Planned Stories
- Total Planned Story Points

# Story Information (per story)
- Story Title
- Story Description (for narrative)
- Story Points (effort estimate)
- Status: "Accepted" = Completed
- Feature Association

# Feature Information
- Feature Title
- Associated Stories
- Completion Status
```

#### Rally API Queries
```python
# Get current/most recent sprint
iteration_query = '(Project.Name = "VCA Voice Unified Settings Platform") AND (EndDate <= today) AND (StartDate >= today-30)'

# Get accepted stories in sprint
story_query = '(Iteration.Name = "Sprint <N>") AND (ScheduleState = "Accepted")'

# Get all stories in sprint (planned)
planned_query = '(Iteration.Name = "Sprint <N>")'

# Get features for completed stories
feature_query = '(Parent.State = "Accepted")'
```

#### Environment Variables
```bash
RALLY_API_KEY=<api_key>
RALLY_SERVER=https://rally1.rallydev.com
RALLY_WORKSPACE=<workspace_name>
RALLY_PROJECT=VCA Voice Unified Settings Platform
RALLY_USERNAME=<optional>
```

### KPI Calculations

#### Sprint Velocity
```
Formula: Sum of story points for all stories with status = "Accepted"
Example: 3 + 5 + 8 + 2 = 18 story points
```

#### Planned vs Actual
```
Planned: Sum of all story points at sprint start
Actual: Sum of story points for accepted stories
Display: "18 planned / 15 completed"
```

#### Sprint Goal Achievement
```
Formula: (Count of accepted stories / Count of planned stories) × 100
Example: (12 accepted / 15 planned) × 100 = 80%
```

---

## User Workflows

### Primary Workflow: Generate Showcase Deck

```
1. User executes: python generate_showcase_deck.py
2. System validates Rally credentials
3. System retrieves current sprint data
4. System prompts user for manual inputs:
   - Project status (On Track/At Risk/Behind)
   - Blockers (optional)
   - Risks (optional)
   - Rally board screenshot path
5. System validates screenshot file
6. System generates 6-slide presentation
7. System saves to Desktop with standard naming
8. System displays success message with file path
```

### Error Recovery Workflows

#### Scenario 1: Rally Connection Failure
```
1. System attempts Rally API connection
2. Connection fails (timeout/auth error)
3. System retries up to 3 times
4. After 3 failures, displays error: "Rally authentication failed. Check API key in .env file"
5. User updates .env and retries
```

#### Scenario 2: Invalid Screenshot Path
```
1. User provides screenshot file path
2. System checks file exists
3. File not found
4. System displays error: "File not found. Please enter valid screenshot path"
5. User provides corrected path
6. System validates and proceeds
```

#### Scenario 3: Incomplete Sprint Data
```
1. System retrieves sprint data
2. Some fields are missing/incomplete
3. System displays warning: "Some data is missing, generating with available information"
4. System continues with partial data
5. User is notified of missing information in console output
```

---

## Technology Stack

### Core Technologies
- **Language:** Python 3.8+
- **PowerPoint Generation:** python-pptx
- **Rally Integration:** pyral or requests
- **Configuration:** python-dotenv
- **Image Processing:** Pillow
- **CLI Interface:** argparse

### Development Stack
- **Package Manager:** pip
- **Testing Framework:** pytest or unittest
- **Version Control:** Git
- **Code Quality:** flake8, black (optional)

### Dependencies (requirements.txt)
```
python-pptx>=0.6.21
pyral>=2.1.2
python-dotenv>=0.19.0
Pillow>=8.0.0
requests>=2.26.0
```

---

## System Architecture

### Component Design

#### 1. Configuration Manager
```
Responsibility: Load and validate environment settings
Methods:
  - load_env() → Dict
  - validate_credentials() → Boolean
  - get_rally_config() → RallyConfig
  
Error Handling:
  - Missing .env file → Create template and exit
  - Invalid keys → Display helpful error with sample
  - Missing values → Display which keys are required
```

#### 2. Rally API Client
```
Responsibility: Authenticate and retrieve Rally data
Methods:
  - connect() → Boolean
  - get_current_sprint() → Sprint
  - get_sprint_stories() → List[Story]
  - get_story_details() → Story
  - get_sprint_features() → List[Feature]
  
Features:
  - 3-retry mechanism with exponential backoff
  - Request timeout: 10 seconds
  - Connection pooling for efficiency
  - Error classification and logging
```

#### 3. Data Processor
```
Responsibility: Calculate metrics and aggregate data
Methods:
  - calculate_velocity(stories) → int
  - calculate_goal_achievement(planned, accepted) → float
  - aggregate_accomplishments(stories) → String
  - extract_feature_list(stories) → List[String]
  
Validation:
  - Verify story point accuracy
  - Validate date ranges
  - Check for duplicate stories
```

#### 4. User Input Handler
```
Responsibility: Collect and validate manual inputs
Methods:
  - prompt_project_status() → String
  - prompt_blockers() → String
  - prompt_risks() → String
  - prompt_screenshot_path() → Path
  - validate_screenshot(path) → Boolean
  
Validation Rules:
  - Status must be: On Track | At Risk | Behind
  - Screenshot must be: PNG, JPG, or BMP
  - File must exist and be readable
  - Optional fields can be empty
```

#### 5. Presentation Generator
```
Responsibility: Create PowerPoint presentation
Methods:
  - create_presentation() → Presentation
  - add_title_slide(data) → Slide
  - add_progress_slide(data) → Slide
  - add_kpi_slide(data) → Slide
  - add_updates_slide(data) → Slide
  - add_blockers_slide(data) → Slide
  - add_screenshot_slide(data) → Slide
  - save_presentation(path) → Boolean
  
Features:
  - Consistent formatting across all slides
  - Professional color scheme
  - Slide numbers on all slides
  - Optimized image scaling for screenshots
```

#### 6. Error Handler
```
Responsibility: Centralized error management
Methods:
  - handle_api_error(error) → String
  - handle_file_error(error) → String
  - handle_validation_error(error) → String
  - log_error(error, context) → void
  
Categories:
  - API Errors (authentication, timeout, not found)
  - File System Errors (missing file, disk full, permissions)
  - Validation Errors (invalid input, missing data)
  - Unknown Errors (with diagnostic info)
```

### Data Flow Diagram
```
User Execution
    ↓
Configuration Load
    ↓
Rally Connection & Auth
    ↓
Sprint Data Retrieval
    ↓
User Input Collection
    ↓
Data Processing & Validation
    ↓
Presentation Generation
    ↓
File Save & Output
    ↓
Success Message
```

---

## Implementation Plan

### Phase 1: Core Functionality (Weeks 1-3)
**Scope:** MVP presentation generation with Rally integration

**Deliverables:**
- [ ] Rally API client with authentication
- [ ] Data retrieval for sprint information
- [ ] KPI calculation module
- [ ] PowerPoint generation (all 6 slides)
- [ ] Command-line interface
- [ ] Basic error handling (3-retry logic)
- [ ] File output to Desktop

**Success Metrics:**
- Generate complete deck in < 30 seconds
- All 6 slides display correctly
- All KPI calculations match Rally data
- File saves to Desktop with correct naming

### Phase 2: Enhancement & Polish (Week 4)
**Scope:** Refinement and comprehensive testing

**Deliverables:**
- [ ] Enhanced error messages with troubleshooting
- [ ] Improved narrative generation for accomplishments
- [ ] Better slide formatting and styling
- [ ] Comprehensive unit and integration tests
- [ ] Documentation and README

**Success Metrics:**
- 80%+ code coverage in tests
- All error scenarios handled gracefully
- User accepts deck without post-generation edits

### Phase 3: Future Enhancements (Backlog)
**Scope:** Advanced features for future releases

**Potential Features:**
- Automated scheduling (bi-weekly via Task Scheduler)
- Email delivery of generated deck
- Historical trend charts (velocity over time)
- Custom slide templates
- Web-based UI (alternative to CLI)
- Export to PDF and Google Slides
- Team email notifications

---

## Testing Strategy

### Unit Tests
```python
# Configuration Manager
test_load_valid_env()
test_missing_env_file()
test_invalid_credential_format()

# Data Processor
test_velocity_calculation()
test_goal_achievement_calculation()
test_story_aggregation()
test_feature_extraction()

# Rally API Client
test_successful_connection()
test_authentication_failure()
test_connection_timeout()
test_sprint_retrieval()
test_retry_logic()
```

### Integration Tests
```python
# End-to-End
test_full_generation_with_mock_rally()
test_generation_with_incomplete_data()
test_file_creation_and_naming()

# Rally Integration
test_live_rally_connection()
test_current_sprint_retrieval()
test_story_data_accuracy()

# File Operations
test_desktop_file_creation()
test_file_overwrite_behavior()
test_screenshot_embedding()
```

### Manual Acceptance Tests
```
✓ Generate deck with real Rally sprint data
✓ Verify all 6 slides contain expected content
✓ Confirm all metrics match Rally dashboard
✓ Test with various sprint scenarios:
  - Complete sprint (all stories accepted)
  - Partial sprint (some stories incomplete)
  - No stories in sprint
  - Large sprint (50+ stories)
✓ Validate screenshot scaling on different image sizes
✓ Verify error handling with network interruptions
✓ Confirm user can execute without developer assistance
```

---

## Success Criteria

The Showcase Deck Generator will be considered **complete and successful** when:

### Performance
- [x] Deck generation completes in < 30 seconds (90% of cases < 20 seconds)
- [x] Rally API connection established within 5 seconds
- [x] No user perceivable lag during file operations

### Accuracy
- [x] All 6 slides present and properly formatted
- [x] Rally data matches Rally UI with 100% accuracy
- [x] KPI calculations verified against manual calculations
- [x] Sprint dates and metadata correct

### Usability
- [x] Deck is presentation-ready (minimal/no post-generation editing)
- [x] User can execute without developer assistance
- [x] Console messages are clear and helpful
- [x] Error messages provide actionable next steps

### Reliability
- [x] System handles all documented error scenarios
- [x] 3-retry logic prevents transient failures
- [x] Graceful degradation with partial data
- [x] No data loss or corruption scenarios

### Quality
- [x] Code coverage ≥ 80%
- [x] All tests pass (unit, integration, acceptance)
- [x] Code follows PEP 8 style standards
- [x] Documentation complete and accurate

---

## Acceptance Criteria

### Definition of Done
A user story is complete when:
1. Code changes implemented and reviewed
2. All unit tests pass with >80% coverage
3. Integration tests pass with real/mock data
4. Manual testing validates acceptance criteria
5. Code review approved by another developer
6. Documentation updated
7. No console warnings or debug output

### User Acceptance Criteria
For each generated deck:
1. User can open .pptx file without errors
2. All 6 slides display with expected content
3. No visual formatting issues or broken layouts
4. All data matches Rally and user inputs
5. File named correctly on Desktop
6. User receives success confirmation message

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Rally API changes | Medium | High | Monitor Rally docs, version API calls, maintain compatibility layer |
| API rate limiting | Low | Medium | Cache responses, optimize queries, implement backoff |
| Incomplete sprint data | Medium | Medium | Validate completeness, provide clear warnings, continue with partial data |
| Screenshot quality | Medium | Low | Support multiple formats (PNG/JPG/BMP), implement resize |
| Credential exposure | Low | Critical | Use .env files, .gitignore, user education, no logging of secrets |
| Network interruptions | Low | High | 3-retry with backoff, timeouts, clear error messages |
| Desktop path issues | Low | Medium | Validate path accessibility, clear permission error messages |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Rally** | CA Agile Central - Agile project management platform |
| **Sprint** | 2-week development iteration cycle |
| **Story Point** | Unit of effort estimation for user stories |
| **Velocity** | Total story points completed in a sprint |
| **Accepted** | Rally status indicating story completion |
| **Feature** | Mid-level work item; child of Epic |
| **User Story** | Granular deliverable work item; child of Feature |
| **VCA** | Voice Unified Settings Platform (project name) |
| **Turbo-Flux** | Team name at Cox Automotive |
| **Showcase Deck** | PowerPoint presentation summarizing sprint results |

---

## Appendices

### Appendix A: Sample .env Configuration
```env
# Rally API Configuration
RALLY_API_KEY=_your_rally_api_key_here_
RALLY_SERVER=https://rally1.rallydev.com
RALLY_WORKSPACE=Cox Automotive
RALLY_PROJECT=VCA Voice Unified Settings Platform
RALLY_USERNAME=optional_username
```

### Appendix B: Expected Console Output
```
=== Turbo-Flux Showcase Deck Generator ===

Connecting to Rally...
✓ Rally connection successful

Retrieving sprint data...
✓ Found Sprint 12 (01/15/2024 - 01/28/2024)
✓ Retrieved 15 user stories (12 accepted)
✓ Calculated velocity: 45 story points

Enter project status (On Track/At Risk/Behind): On Track
Enter blockers (or press Enter to skip): 
Enter risks (or press Enter to skip): API rate limiting concerns
Enter path to Rally board screenshot: C:\Users\Avinash\Desktop\rally_board.png
✓ Screenshot loaded

Generating presentation...
✓ Slide 1: Project Overview
✓ Slide 2: Sprint Progress
✓ Slide 3: KPIs
✓ Slide 4: Team Updates
✓ Slide 5: Blockers/Risks
✓ Slide 6: Rally Board Screenshot

Saving to Desktop...
✓ SUCCESS: Turbo-Flux_Showcase_Sprint_12.pptx saved to Desktop

Deck generation complete!
```

### Appendix C: Rally API Query Examples
```python
# Get current/most recent sprint
iteration_query = '''
(Project.Name = "VCA Voice Unified Settings Platform") 
AND (EndDate <= today) 
AND (StartDate >= today-30)
'''

# Get accepted stories in sprint
story_query = '''
(Iteration.Name = "Sprint 12") 
AND (ScheduleState = "Accepted")
'''

# Get all planned stories in sprint
all_stories_query = '''
(Iteration.Name = "Sprint 12")
'''
```

### Appendix D: Execution Instructions
```bash
# Installation
1. Clone repository
2. Install Python 3.8+
3. pip install -r requirements.txt
4. Create .env file with Rally credentials
5. Verify .gitignore includes .env

# Execution
python generate_showcase_deck.py

# Expected Duration
30-60 seconds total (most of which is Rally API calls)
```

---

## Document History

| Version | Date | Author | Change Summary |
|---------|------|--------|-----------------|
| 1.0 | 2024 | CodeMie Developer | Initial specification |
| 2.0 | Sept 15, 2026 | Claude Code | Converted to SpecKit format, enhanced structure |

---

## Sign-off

**Product Manager:** Avinash Agarwal  
**Development Lead:** [To be assigned]  
**QA Lead:** [To be assigned]  
**Status:** Ready for Implementation

---

**End of Specification Document**
