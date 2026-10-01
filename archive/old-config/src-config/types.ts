/**
 * Configuration Type Definitions for Weekly Status Report Generator
 * 
 * This module defines all TypeScript interfaces for the application configuration.
 * All configurations are loaded from .claude/weekly-report-config.json and merged
 * with sensible defaults.
 * 
 * @module config/types
 * @version 1.0.0
 */

/**
 * Enum for Jira query types
 * @enum {string}
 */
export enum QueryType {
  /** Query by sprint ID */
  SPRINT = 'sprint',
  /** Query by board ID */
  BOARD = 'board',
}

/**
 * Enum for metric preference
 * @enum {string}
 */
export enum MetricPreference {
  /** Use story points for metrics and completion calculations */
  STORY_POINTS = 'story_points',
  /** Use issue count for metrics and completion calculations */
  ISSUE_COUNT = 'issue_count',
}

/**
 * Enum for issue status categories
 * Used to categorize Jira status values into logical groups
 * @enum {string}
 */
export enum StatusCategory {
  /** Issue is completed (Done, Resolved, Closed, etc.) */
  DONE = 'done',
  /** Issue is actively being worked on (In Progress, In Review, etc.) */
  IN_PROGRESS = 'in_progress',
  /** Issue has not started yet (To Do, Backlog, Open, etc.) */
  TO_DO = 'to_do',
  /** Issue is blocked and cannot proceed (Blocked, On Hold, Impediment, etc.) */
  BLOCKED = 'blocked',
}

/**
 * Project configuration
 * 
 * Contains metadata about the project and team
 */
export interface ProjectConfig {
  /** Project name (e.g., "Manager.AI") */
  name: string;
  
  /** Team member names */
  team: string[];
  
  /** Optional project description */
  description?: string;
}

/**
 * Status mappings configuration
 * 
 * Maps Jira status values to status categories.
 * All status values are treated case-insensitively during comparison.
 * No status value can appear in multiple categories (validation enforced).
 * 
 * @clarification #4: Case-insensitive matching, no overlaps allowed
 */
export interface StatusMappings {
  /** Status values that indicate issue is completed */
  done: string[];
  
  /** Status values that indicate issue is being worked on */
  in_progress: string[];
  
  /** Status values that indicate issue has not started */
  to_do: string[];
  
  /** Status values that indicate issue is blocked */
  blocked: string[];
}

/**
 * Health threshold configuration
 * 
 * Defines thresholds for determining sprint health based on blocked issue percentage.
 * 
 * @clarification #18: green_max (5-50), yellow_max (green_max+1 to 100), green < yellow
 */
export interface HealthThresholds {
  /**
   * Maximum percentage of blocked issues for green (on track) status
   * Valid range: 5-50
   * Example: 10 means green if <10% blocked
   */
  green_max: number;
  
  /**
   * Maximum percentage of blocked issues for yellow (at risk) status
   * Valid range: green_max+1 to 100
   * Example: 25 means yellow if 10-25% blocked, red if >25%
   */
  yellow_max: number;
}

/**
 * Jira configuration
 * 
 * Contains settings for connecting to and querying Jira
 */
export interface JiraConfig {
  /**
   * Query type: fetch data by sprint ID or board ID
   * 
   * @clarification #9: Support both options
   */
  query_type: QueryType;
  
  /**
   * Jira Sprint ID (required if query_type is SPRINT)
   * Example: "123" or "PROJ-123"
   */
  sprint_id?: string;
  
  /**
   * Jira Board ID (required if query_type is BOARD)
   * Example: "456" or "PROJ-456"
   */
  board_id?: string;
  
  /**
   * Metric preference for calculations and display
   * 
   * @clarification #7: Let PM configure (not automatic)
   */
  metric_preference: MetricPreference;
  
  /**
   * Custom field configurations
   * 
   * Jira custom field IDs vary by instance. Users can specify their own
   * or use defaults. If field is missing, tool warns and falls back to
   * issue count.
   * 
   * @clarification #2: Manual discovery acceptable, warn if invalid
   */
  custom_fields?: {
    /**
     * Custom field ID for story points
     * Default: "customfield_10016" (common Atlassian default)
     */
    story_points?: string;
    
    /**
     * Custom field ID for epic link
     * Default: "customfield_10014" (common Atlassian default)
     */
    epic_link?: string;
  };
  
  /**
   * Status mappings: maps Jira status values to status categories
   * 
   * @clarification #4: Case-insensitive, no overlapping statuses allowed
   */
  status_mappings: StatusMappings;
}

/**
 * Confluence configuration
 * 
 * Contains settings for connecting to and publishing reports to Confluence
 */
export interface ConfluenceConfig {
  /**
   * Confluence space key where reports will be published
   * Example: "MNGRAI", "CRM", "REPORTS"
   */
  space_key: string;
  
  /**
   * Title of the Confluence page to create/update
   * Example: "Weekly Status Reports"
   */
  page_title: string;
  
  /**
   * Parent page ID in Confluence
   * 
   * Reports will be created as child pages under this parent.
   * Required for page creation.
   * 
   * To find parent page ID:
   * 1. Open the parent page in Confluence
   * 2. Page ID is in the URL: /wiki/spaces/KEY/pages/12345/...
   * 3. Use the numeric ID: 12345
   * 
   * @clarification #3: REQUIRED, fail if missing on create
   * @clarification #11: parent_page_id is REQUIRED
   */
  parent_page_id: string;
  
  /**
   * Page ID of the status report page (auto-populated after first publish)
   * 
   * Initially null, will be populated after the report page is created
   * in Confluence and subsequent reports are appended to this page.
   */
  page_id?: string;
}

/**
 * Report generation configuration
 * 
 * Contains settings for report generation and publishing
 */
export interface ReportConfig {
  /**
   * Health status thresholds
   * 
   * @clarification #18: Enforce 5-50 (green) and green+1-100 (yellow)
   */
  health_thresholds: HealthThresholds;
  
  /**
   * Timezone for report timestamps
   * 
   * Must be a valid IANA timezone name.
   * Examples: "America/New_York", "Europe/London", "UTC", "Asia/Tokyo"
   * 
   * NOT valid: "EST", "PST", "UTC-5", "GMT+1" (abbreviations/offsets)
   * 
   * @clarification #19: IANA format only, reject abbreviations
   * @default "UTC"
   */
  timezone?: string;
}

/**
 * Complete application configuration
 * 
 * This is the root configuration interface. All configuration is merged from
 * user-provided settings and defaults.
 * 
 * Configuration is loaded from: .claude/weekly-report-config.json
 */
export interface Configuration {
  /** Project metadata */
  project: ProjectConfig;
  
  /** Jira integration settings */
  jira: JiraConfig;
  
  /** Confluence publishing settings */
  confluence: ConfluenceConfig;
  
  /** Report generation settings */
  report: ReportConfig;
}

/**
 * Partial configuration for user input
 * 
 * User config file can have optional fields that will be merged with defaults.
 * This type represents the user-provided partial config.
 */
export type PartialConfiguration = {
  project?: Partial<ProjectConfig>;
  jira?: Partial<JiraConfig>;
  confluence?: Partial<ConfluenceConfig>;
  report?: Partial<ReportConfig>;
};
