/**
 * Default Configuration Values
 * 
 * Sensible defaults for all optional configuration fields.
 * User-provided config is merged with these defaults.
 * 
 * @module config/defaults
 * @version 1.0.0
 */

import {
  Configuration,
  QueryType,
  MetricPreference,
  StatusMappings,
  HealthThresholds,
} from './types';

/**
 * Default status mappings for common Jira status values
 * 
 * Covers most standard Atlassian Jira status values.
 * Users can override with custom status values specific to their instance.
 * 
 * All comparisons are case-insensitive.
 */
export const DEFAULT_STATUS_MAPPINGS: StatusMappings = {
  done: [
    'Done',
    'Resolved',
    'Closed',
    'Complete',
    'Finished',
  ],
  in_progress: [
    'In Progress',
    'In Development',
    'In Review',
    'Code Review',
    'QA Review',
    'Testing',
  ],
  to_do: [
    'To Do',
    'Backlog',
    'Open',
    'Selected for Development',
    'Ready',
    'Planned',
  ],
  blocked: [
    'Blocked',
    'Impediment',
    'On Hold',
    'Waiting',
    'Waiting for Response',
  ],
};

/**
 * Default custom field IDs
 * 
 * These are the most common Atlassian Jira custom field IDs.
 * Different Jira instances may have different IDs.
 * 
 * Users should verify their instance's field IDs or set custom values.
 * If field ID is incorrect, tool will warn and fall back to issue count.
 * 
 * To find custom field IDs in Jira:
 * 1. Go to Administration → Custom Fields
 * 2. Find the field and hover over its name
 * 3. Copy the field ID from the URL (e.g., customfield_10016)
 */
export const DEFAULT_CUSTOM_FIELDS = {
  story_points: 'customfield_10016',
  epic_link: 'customfield_10014',
};

/**
 * Default health thresholds
 * 
 * - Green (on track): < 10% blocked issues
 * - Yellow (at risk): 10-25% blocked issues
 * - Red (blocked): > 25% blocked issues
 * 
 * @clarification #18: Thresholds 5-50 (green), green+1-100 (yellow)
 */
export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  green_max: 10,
  yellow_max: 25,
};

/**
 * Default partial configuration
 * 
 * Contains sensible defaults for all optional fields.
 * User-provided config is merged with this to create the final configuration.
 */
export const DEFAULT_CONFIG: Partial<Configuration> = {
  jira: {
    metric_preference: MetricPreference.STORY_POINTS,
    custom_fields: DEFAULT_CUSTOM_FIELDS,
    status_mappings: DEFAULT_STATUS_MAPPINGS,
  },
  report: {
    health_thresholds: DEFAULT_HEALTH_THRESHOLDS,
    timezone: 'UTC',
  },
};

/**
 * List of required configuration fields
 * 
 * These fields must be provided by the user and cannot have defaults.
 * Validation will check for these fields.
 */
export const REQUIRED_FIELDS = {
  project: ['name', 'team'],
  jira: ['query_type', 'status_mappings'],
  confluence: ['space_key', 'page_title', 'parent_page_id'],
  report: ['health_thresholds'],
};

/**
 * Configuration field descriptions
 * 
 * Used for error messages and documentation generation
 */
export const FIELD_DESCRIPTIONS: Record<string, string> = {
  'project.name': 'Project name (e.g., "Manager.AI")',
  'project.team': 'Team member names (array)',
  'jira.query_type': 'Query type: "sprint" or "board"',
  'jira.sprint_id': 'Jira Sprint ID (required if query_type="sprint")',
  'jira.board_id': 'Jira Board ID (required if query_type="board")',
  'jira.metric_preference': 'Metric preference: "story_points" or "issue_count"',
  'jira.status_mappings': 'Status mappings for Jira status values',
  'confluence.space_key': 'Confluence space key',
  'confluence.page_title': 'Title of the status report page',
  'confluence.parent_page_id': 'Parent page ID for new report pages',
  'report.health_thresholds': 'Health status thresholds for sprint health indicator',
  'report.timezone': 'Timezone for report timestamps (IANA format)',
};
