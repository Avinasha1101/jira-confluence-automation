/**
 * Configuration Validator
 * 
 * Comprehensive validation for all configuration fields according to the specification.
 * Implements all 42 clarifications and validation rules.
 * 
 * @module config/validator
 * @version 1.0.0
 */

import {
  Configuration,
  QueryType,
  MetricPreference,
  StatusMappings,
  HealthThresholds,
} from './types';
import { REQUIRED_FIELDS, FIELD_DESCRIPTIONS } from './defaults';

/**
 * Validation error severity levels
 */
export enum ValidationSeverity {
  /** Critical error - must be fixed before continuing */
  ERROR = 'error',
  /** Warning - can continue but may cause issues */
  WARNING = 'warning',
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Configuration field path (e.g., 'jira.status_mappings') */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Current value causing the issue (if applicable) */
  currentValue?: any;
  /** Severity level */
  severity: ValidationSeverity;
}

/**
 * Validation result containing all errors and warnings
 */
export interface ValidationResult {
  /** Whether validation passed (no errors) */
  isValid: boolean;
  /** Critical errors that must be fixed */
  errors: ValidationError[];
  /** Warnings that should be reviewed */
  warnings: ValidationError[];
  /** Total number of issues */
  issueCount: number;
}

/**
 * List of valid IANA timezone identifiers
 * 
 * This is a subset of common timezones. Full list available at:
 * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 */
const VALID_IANA_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Fiji',
];

/**
 * Validate complete configuration
 * 
 * Performs comprehensive validation of all configuration fields
 * according to the specification and clarifications.
 * 
 * @param config - Configuration to validate
 * @returns Validation result with errors and warnings
 * 
 * @example
 * ```typescript
 * const result = validateConfiguration(config);
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 *   process.exit(1);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Validation warnings:', result.warnings);
 * }
 * ```
 */
export function validateConfiguration(config: Partial<Configuration>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate all sections
  validateProjectConfig(config, errors, warnings);
  validateJiraConfig(config, errors, warnings);
  validateConfluenceConfig(config, errors, warnings);
  validateReportConfig(config, errors, warnings);

  // Cross-field validations
  validateCrossFieldConstraints(config, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issueCount: errors.length + warnings.length,
  };
}

/**
 * Validate project configuration
 * 
 * @clarification #1: Project name and team are required
 */
function validateProjectConfig(
  config: Partial<Configuration>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Required: project.name
  if (!config.project?.name) {
    errors.push({
      field: 'project.name',
      message: 'Project name is required',
      currentValue: config.project?.name,
      severity: ValidationSeverity.ERROR,
    });
  } else if (config.project.name.trim().length === 0) {
    errors.push({
      field: 'project.name',
      message: 'Project name cannot be empty or whitespace',
      currentValue: config.project.name,
      severity: ValidationSeverity.ERROR,
    });
  }

  // Required: project.team (must be array with at least one member)
  if (!config.project?.team) {
    errors.push({
      field: 'project.team',
      message: 'Team member list is required',
      currentValue: config.project?.team,
      severity: ValidationSeverity.ERROR,
    });
  } else if (!Array.isArray(config.project.team)) {
    errors.push({
      field: 'project.team',
      message: 'Team must be an array of names',
      currentValue: config.project.team,
      severity: ValidationSeverity.ERROR,
    });
  } else if (config.project.team.length === 0) {
    errors.push({
      field: 'project.team',
      message: 'Team must have at least one member',
      currentValue: config.project.team,
      severity: ValidationSeverity.ERROR,
    });
  } else {
    // Validate team member names
    config.project.team.forEach((name, index) => {
      if (typeof name !== 'string' || name.trim().length === 0) {
        errors.push({
          field: `project.team[${index}]`,
          message: 'Team member name must be a non-empty string',
          currentValue: name,
          severity: ValidationSeverity.ERROR,
        });
      }
    });
  }

  // Optional: project.description
  if (config.project?.description && typeof config.project.description !== 'string') {
    warnings.push({
      field: 'project.description',
      message: 'Project description should be a string',
      currentValue: config.project.description,
      severity: ValidationSeverity.WARNING,
    });
  }
}

/**
 * Validate Jira configuration
 * 
 * @clarification #9: Support both sprint and board query modes
 * @clarification #4: Case-insensitive status matching, no overlaps
 * @clarification #7: Metric preference configurable
 */
function validateJiraConfig(
  config: Partial<Configuration>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Required: jira.query_type
  if (!config.jira?.query_type) {
    errors.push({
      field: 'jira.query_type',
      message: 'Query type is required (must be "sprint" or "board")',
      currentValue: config.jira?.query_type,
      severity: ValidationSeverity.ERROR,
    });
  } else if (
    config.jira.query_type !== QueryType.SPRINT &&
    config.jira.query_type !== QueryType.BOARD
  ) {
    errors.push({
      field: 'jira.query_type',
      message: `Query type must be "sprint" or "board", got "${config.jira.query_type}"`,
      currentValue: config.jira.query_type,
      severity: ValidationSeverity.ERROR,
    });
  }

  // Conditional: sprint_id required if query_type is "sprint"
  if (config.jira?.query_type === QueryType.SPRINT) {
    if (!config.jira.sprint_id) {
      errors.push({
        field: 'jira.sprint_id',
        message: 'Sprint ID is required when query_type is "sprint"',
        currentValue: config.jira.sprint_id,
        severity: ValidationSeverity.ERROR,
      });
    } else if (typeof config.jira.sprint_id !== 'string' || config.jira.sprint_id.trim().length === 0) {
      errors.push({
        field: 'jira.sprint_id',
        message: 'Sprint ID must be a non-empty string',
        currentValue: config.jira.sprint_id,
        severity: ValidationSeverity.ERROR,
      });
    }
  }

  // Conditional: board_id required if query_type is "board"
  if (config.jira?.query_type === QueryType.BOARD) {
    if (!config.jira.board_id) {
      errors.push({
        field: 'jira.board_id',
        message: 'Board ID is required when query_type is "board"',
        currentValue: config.jira.board_id,
        severity: ValidationSeverity.ERROR,
      });
    } else if (typeof config.jira.board_id !== 'string' || config.jira.board_id.trim().length === 0) {
      errors.push({
        field: 'jira.board_id',
        message: 'Board ID must be a non-empty string',
        currentValue: config.jira.board_id,
        severity: ValidationSeverity.ERROR,
      });
    }
  }

  // Optional: metric_preference (defaults to story_points)
  if (config.jira?.metric_preference) {
    if (
      config.jira.metric_preference !== MetricPreference.STORY_POINTS &&
      config.jira.metric_preference !== MetricPreference.ISSUE_COUNT
    ) {
      errors.push({
        field: 'jira.metric_preference',
        message: `Metric preference must be "story_points" or "issue_count", got "${config.jira.metric_preference}"`,
        currentValue: config.jira.metric_preference,
        severity: ValidationSeverity.ERROR,
      });
    }
  }

  // Optional: custom_fields
  if (config.jira?.custom_fields) {
    if (typeof config.jira.custom_fields !== 'object' || Array.isArray(config.jira.custom_fields)) {
      errors.push({
        field: 'jira.custom_fields',
        message: 'Custom fields must be an object',
        currentValue: config.jira.custom_fields,
        severity: ValidationSeverity.ERROR,
      });
    } else {
      // Validate custom field IDs format
      if (config.jira.custom_fields.story_points) {
        if (!isValidCustomFieldId(config.jira.custom_fields.story_points)) {
          warnings.push({
            field: 'jira.custom_fields.story_points',
            message: 'Story points field ID should match format "customfield_XXXXX"',
            currentValue: config.jira.custom_fields.story_points,
            severity: ValidationSeverity.WARNING,
          });
        }
      }
      if (config.jira.custom_fields.epic_link) {
        if (!isValidCustomFieldId(config.jira.custom_fields.epic_link)) {
          warnings.push({
            field: 'jira.custom_fields.epic_link',
            message: 'Epic link field ID should match format "customfield_XXXXX"',
            currentValue: config.jira.custom_fields.epic_link,
            severity: ValidationSeverity.WARNING,
          });
        }
      }
    }
  }

  // Required: status_mappings
  if (!config.jira?.status_mappings) {
    errors.push({
      field: 'jira.status_mappings',
      message: 'Status mappings are required',
      currentValue: config.jira?.status_mappings,
      severity: ValidationSeverity.ERROR,
    });
  } else {
    validateStatusMappings(config.jira.status_mappings, errors, warnings);
  }
}

/**
 * Validate Confluence configuration
 * 
 * @clarification #3/#11: parent_page_id is REQUIRED
 */
function validateConfluenceConfig(
  config: Partial<Configuration>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Required: space_key
  if (!config.confluence?.space_key) {
    errors.push({
      field: 'confluence.space_key',
      message: 'Confluence space key is required',
      currentValue: config.confluence?.space_key,
      severity: ValidationSeverity.ERROR,
    });
  } else if (typeof config.confluence.space_key !== 'string' || config.confluence.space_key.trim().length === 0) {
    errors.push({
      field: 'confluence.space_key',
      message: 'Space key must be a non-empty string',
      currentValue: config.confluence.space_key,
      severity: ValidationSeverity.ERROR,
    });
  }

  // Required: page_title
  if (!config.confluence?.page_title) {
    errors.push({
      field: 'confluence.page_title',
      message: 'Confluence page title is required',
      currentValue: config.confluence?.page_title,
      severity: ValidationSeverity.ERROR,
    });
  } else if (typeof config.confluence.page_title !== 'string' || config.confluence.page_title.trim().length === 0) {
    errors.push({
      field: 'confluence.page_title',
      message: 'Page title must be a non-empty string',
      currentValue: config.confluence.page_title,
      severity: ValidationSeverity.ERROR,
    });
  }

  // REQUIRED: parent_page_id (clarification #3/#11)
  if (!config.confluence?.parent_page_id) {
    errors.push({
      field: 'confluence.parent_page_id',
      message: 'Parent page ID is required for creating new Confluence pages',
      currentValue: config.confluence?.parent_page_id,
      severity: ValidationSeverity.ERROR,
    });
  } else if (typeof config.confluence.parent_page_id !== 'string' || config.confluence.parent_page_id.trim().length === 0) {
    errors.push({
      field: 'confluence.parent_page_id',
      message: 'Parent page ID must be a non-empty string',
      currentValue: config.confluence.parent_page_id,
      severity: ValidationSeverity.ERROR,
    });
  }

  // Optional: page_id
  if (config.confluence?.page_id) {
    if (typeof config.confluence.page_id !== 'string' || config.confluence.page_id.trim().length === 0) {
      warnings.push({
        field: 'confluence.page_id',
        message: 'Page ID should be a non-empty string if provided',
        currentValue: config.confluence.page_id,
        severity: ValidationSeverity.WARNING,
      });
    }
  }
}

/**
 * Validate report configuration
 * 
 * @clarification #18: Health thresholds constrained (green: 5-50, yellow: green+1-100)
 * @clarification #19: Timezone IANA format only
 */
function validateReportConfig(
  config: Partial<Configuration>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Required: health_thresholds
  if (!config.report?.health_thresholds) {
    errors.push({
      field: 'report.health_thresholds',
      message: 'Health thresholds are required',
      currentValue: config.report?.health_thresholds,
      severity: ValidationSeverity.ERROR,
    });
  } else {
    validateHealthThresholds(config.report.health_thresholds, errors, warnings);
  }

  // Optional: timezone (defaults to UTC)
  if (config.report?.timezone) {
    validateTimezone(config.report.timezone, errors, warnings);
  }
}

/**
 * Validate status mappings
 * 
 * @clarification #4: Case-insensitive matching, no overlaps allowed
 * @clarification #26: Strictly forbid overlapping mappings
 */
function validateStatusMappings(
  mappings: StatusMappings,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Ensure all categories exist
  const requiredCategories = ['done', 'in_progress', 'to_do', 'blocked'];
  requiredCategories.forEach((category) => {
    if (!mappings[category]) {
      errors.push({
        field: `jira.status_mappings.${category}`,
        message: `Status category "${category}" is required`,
        currentValue: mappings[category],
        severity: ValidationSeverity.ERROR,
      });
    } else if (!Array.isArray(mappings[category])) {
      errors.push({
        field: `jira.status_mappings.${category}`,
        message: `Status category "${category}" must be an array`,
        currentValue: mappings[category],
        severity: ValidationSeverity.ERROR,
      });
    } else if (mappings[category].length === 0) {
      warnings.push({
        field: `jira.status_mappings.${category}`,
        message: `Status category "${category}" is empty - no statuses will match this category`,
        currentValue: mappings[category],
        severity: ValidationSeverity.WARNING,
      });
    }
  });

  // Check for overlaps (case-insensitive)
  const allStatuses: Map<string, string[]> = new Map();

  Object.entries(mappings).forEach(([category, statuses]) => {
    if (Array.isArray(statuses)) {
      statuses.forEach((status) => {
        if (typeof status !== 'string') {
          errors.push({
            field: `jira.status_mappings.${category}`,
            message: `Status value must be a string, got ${typeof status}`,
            currentValue: status,
            severity: ValidationSeverity.ERROR,
          });
          return;
        }

        const statusLower = status.toLowerCase().trim();
        
        if (statusLower.length === 0) {
          errors.push({
            field: `jira.status_mappings.${category}`,
            message: 'Status value cannot be empty or whitespace',
            currentValue: status,
            severity: ValidationSeverity.ERROR,
          });
          return;
        }

        // Track which categories this status appears in
        const existingCategories = allStatuses.get(statusLower) || [];
        existingCategories.push(category);
        allStatuses.set(statusLower, existingCategories);
      });
    }
  });

  // Report any overlaps
  const overlaps: Array<{ status: string; categories: string[] }> = [];
  allStatuses.forEach((categories, status) => {
    if (categories.length > 1) {
      overlaps.push({ status, categories });
    }
  });

  if (overlaps.length > 0) {
    const overlapMessages = overlaps
      .map((overlap) => `"${overlap.status}" appears in: ${overlap.categories.join(', ')}`)
      .join('; ');
    
    errors.push({
      field: 'jira.status_mappings',
      message: `Status values cannot appear in multiple categories (case-insensitive): ${overlapMessages}`,
      currentValue: mappings,
      severity: ValidationSeverity.ERROR,
    });
  }
}

/**
 * Validate health thresholds
 * 
 * @clarification #18: green_max (5-50), yellow_max (green_max+1 to 100), green < yellow
 */
function validateHealthThresholds(
  thresholds: HealthThresholds,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Required: green_max
  if (thresholds.green_max === undefined || thresholds.green_max === null) {
    errors.push({
      field: 'report.health_thresholds.green_max',
      message: 'Green threshold maximum is required',
      currentValue: thresholds.green_max,
      severity: ValidationSeverity.ERROR,
    });
  } else if (typeof thresholds.green_max !== 'number') {
    errors.push({
      field: 'report.health_thresholds.green_max',
      message: 'Green threshold must be a number',
      currentValue: thresholds.green_max,
      severity: ValidationSeverity.ERROR,
    });
  } else {
    // Constraint: 5-50
    if (thresholds.green_max < 5 || thresholds.green_max > 50) {
      errors.push({
        field: 'report.health_thresholds.green_max',
        message: 'Green threshold must be between 5 and 50 (inclusive)',
        currentValue: thresholds.green_max,
        severity: ValidationSeverity.ERROR,
      });
    }
  }

  // Required: yellow_max
  if (thresholds.yellow_max === undefined || thresholds.yellow_max === null) {
    errors.push({
      field: 'report.health_thresholds.yellow_max',
      message: 'Yellow threshold maximum is required',
      currentValue: thresholds.yellow_max,
      severity: ValidationSeverity.ERROR,
    });
  } else if (typeof thresholds.yellow_max !== 'number') {
    errors.push({
      field: 'report.health_thresholds.yellow_max',
      message: 'Yellow threshold must be a number',
      currentValue: thresholds.yellow_max,
      severity: ValidationSeverity.ERROR,
    });
  } else if (typeof thresholds.green_max === 'number') {
    // Constraint: green_max+1 to 100
    if (thresholds.yellow_max <= thresholds.green_max) {
      errors.push({
        field: 'report.health_thresholds.yellow_max',
        message: `Yellow threshold (${thresholds.yellow_max}) must be greater than green threshold (${thresholds.green_max})`,
        currentValue: thresholds.yellow_max,
        severity: ValidationSeverity.ERROR,
      });
    }
    if (thresholds.yellow_max > 100) {
      errors.push({
        field: 'report.health_thresholds.yellow_max',
        message: 'Yellow threshold cannot exceed 100',
        currentValue: thresholds.yellow_max,
        severity: ValidationSeverity.ERROR,
      });
    }
  }

  // Warning for unusual values
  if (
    typeof thresholds.green_max === 'number' &&
    typeof thresholds.yellow_max === 'number' &&
    thresholds.green_max >= 5 &&
    thresholds.green_max <= 50 &&
    thresholds.yellow_max > thresholds.green_max &&
    thresholds.yellow_max <= 100
  ) {
    // Check for very tight thresholds
    const gap = thresholds.yellow_max - thresholds.green_max;
    if (gap < 5) {
      warnings.push({
        field: 'report.health_thresholds',
        message: `Thresholds are very tight (gap of ${gap}%). Consider wider spacing for clearer health indicators.`,
        currentValue: thresholds,
        severity: ValidationSeverity.WARNING,
      });
    }

    // Check for very lenient green threshold
    if (thresholds.green_max > 30) {
      warnings.push({
        field: 'report.health_thresholds.green_max',
        message: `Green threshold of ${thresholds.green_max}% is quite high. Teams may appear healthy with many blockers.`,
        currentValue: thresholds.green_max,
        severity: ValidationSeverity.WARNING,
      });
    }
  }
}

/**
 * Validate timezone format
 * 
 * @clarification #19: IANA format only, reject abbreviations
 */
function validateTimezone(
  timezone: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (typeof timezone !== 'string' || timezone.trim().length === 0) {
    errors.push({
      field: 'report.timezone',
      message: 'Timezone must be a non-empty string',
      currentValue: timezone,
      severity: ValidationSeverity.ERROR,
    });
    return;
  }

  // Check for common abbreviation mistakes
  const commonAbbreviations = ['EST', 'CST', 'MST', 'PST', 'EDT', 'CDT', 'MDT', 'PDT', 'GMT', 'BST'];
  if (commonAbbreviations.includes(timezone.toUpperCase())) {
    errors.push({
      field: 'report.timezone',
      message: `Timezone abbreviation "${timezone}" is not allowed. Use IANA format (e.g., "America/New_York" instead of "EST")`,
      currentValue: timezone,
      severity: ValidationSeverity.ERROR,
    });
    return;
  }

  // Validate against known IANA timezones
  if (!VALID_IANA_TIMEZONES.includes(timezone)) {
    warnings.push({
      field: 'report.timezone',
      message: `Timezone "${timezone}" is not in the common IANA timezone list. Verify it's a valid IANA timezone identifier.`,
      currentValue: timezone,
      severity: ValidationSeverity.WARNING,
    });
  }

  // Check for likely mistakes (spaces, lowercase, etc.)
  if (timezone.includes(' ')) {
    errors.push({
      field: 'report.timezone',
      message: `Timezone "${timezone}" contains spaces. IANA timezones use underscores (e.g., "America/New_York")`,
      currentValue: timezone,
      severity: ValidationSeverity.ERROR,
    });
  }
}

/**
 * Validate cross-field constraints
 * 
 * Constraints that depend on multiple fields across different sections
 */
function validateCrossFieldConstraints(
  config: Partial<Configuration>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // If metric_preference is story_points, warn about custom field configuration
  if (
    config.jira?.metric_preference === MetricPreference.STORY_POINTS &&
    !config.jira?.custom_fields?.story_points
  ) {
    warnings.push({
      field: 'jira.custom_fields.story_points',
      message: 'Metric preference is "story_points" but no custom field ID configured. Will use default, which may not work for your Jira instance.',
      currentValue: config.jira?.custom_fields?.story_points,
      severity: ValidationSeverity.WARNING,
    });
  }

  // Warn if both sprint_id and board_id are provided
  if (config.jira?.sprint_id && config.jira?.board_id) {
    warnings.push({
      field: 'jira',
      message: 'Both sprint_id and board_id are provided. Only the one matching query_type will be used.',
      currentValue: { sprint_id: config.jira.sprint_id, board_id: config.jira.board_id },
      severity: ValidationSeverity.WARNING,
    });
  }
}

/**
 * Helper: Check if custom field ID matches expected format
 */
function isValidCustomFieldId(fieldId: string): boolean {
  return /^customfield_\d+$/.test(fieldId);
}

/**
 * Format validation errors for display
 * 
 * Formats validation errors in a human-readable format for console output.
 * 
 * @param result - Validation result
 * @returns Formatted error message
 * 
 * @example
 * ```typescript
 * const result = validateConfiguration(config);
 * if (!result.isValid) {
 *   console.error(formatValidationErrors(result));
 * }
 * ```
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('\n❌ Configuration Errors (must be fixed):');
    lines.push('─'.repeat(60));
    result.errors.forEach((error, index) => {
      lines.push(`${index + 1}. [${error.field}]`);
      lines.push(`   ${error.message}`);
      if (error.currentValue !== undefined && error.currentValue !== null) {
        lines.push(`   Current value: ${JSON.stringify(error.currentValue)}`);
      }
      lines.push('');
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\n⚠️  Configuration Warnings (review recommended):');
    lines.push('─'.repeat(60));
    result.warnings.forEach((warning, index) => {
      lines.push(`${index + 1}. [${warning.field}]`);
      lines.push(`   ${warning.message}`);
      if (warning.currentValue !== undefined && warning.currentValue !== null) {
        lines.push(`   Current value: ${JSON.stringify(warning.currentValue)}`);
      }
      lines.push('');
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    lines.push('\n✅ Configuration validation passed with no issues!');
  }

  return lines.join('\n');
}

/**
 * Get validation summary
 * 
 * Returns a brief summary of validation results.
 * 
 * @param result - Validation result
 * @returns Summary string
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return '✅ Configuration is valid';
  } else if (result.isValid) {
    return `⚠️  Configuration is valid with ${result.warnings.length} warning(s)`;
  } else {
    return `❌ Configuration has ${result.errors.length} error(s) and ${result.warnings.length} warning(s)`;
  }
}
