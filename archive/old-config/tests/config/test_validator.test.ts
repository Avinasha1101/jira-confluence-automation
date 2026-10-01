/**
 * Unit Tests for Configuration Validator
 * 
 * Tests verify all 42 clarifications and validation rules:
 * - Required field validation
 * - Status mapping overlap detection (case-insensitive)
 * - Health threshold constraints (5-50, green+1-100)
 * - IANA timezone validation
 * - Cross-field constraints
 * - Error and warning severity
 * 
 * @module tests/unit/config/test_validator
 */

import {
  validateConfiguration,
  ValidationSeverity,
  ValidationResult,
  formatValidationErrors,
  getValidationSummary,
} from '../../../src/config/validator';
import { Configuration, QueryType, MetricPreference } from '../../../src/config/types';

/**
 * Helper: Create a valid configuration for testing
 */
function createValidConfig(): Partial<Configuration> {
  return {
    project: {
      name: 'Manager.AI',
      team: ['Rohit', 'Rajiv', 'Jagan'],
    },
    jira: {
      query_type: QueryType.SPRINT,
      sprint_id: '12345',
      board_id: undefined,
      metric_preference: MetricPreference.STORY_POINTS,
      custom_fields: {
        story_points: 'customfield_10016',
        epic_link: 'customfield_10014',
      },
      status_mappings: {
        done: ['Done', 'Resolved', 'Closed'],
        in_progress: ['In Progress', 'In Review'],
        to_do: ['To Do', 'Backlog', 'Open'],
        blocked: ['Blocked', 'On Hold'],
      },
    },
    confluence: {
      space_key: 'MNGRAI',
      page_title: 'Weekly Status Reports',
      parent_page_id: '123456',
      page_id: undefined,
    },
    report: {
      health_thresholds: {
        green_max: 10,
        yellow_max: 25,
      },
      timezone: 'America/New_York',
    },
  };
}

describe('Configuration Validator', () => {
  describe('validateConfiguration - Full Valid Config', () => {
    test('valid configuration passes all checks', () => {
      const config = createValidConfig();
      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.issueCount).toBe(0);
    });
  });

  describe('Project Configuration Validation', () => {
    test('missing project name causes error', () => {
      const config = createValidConfig();
      delete config.project!.name;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'project.name',
          severity: ValidationSeverity.ERROR,
        })
      );
    });

    test('empty project name causes error', () => {
      const config = createValidConfig();
      config.project!.name = '   ';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'project.name')).toBe(true);
    });

    test('missing team causes error', () => {
      const config = createValidConfig();
      delete config.project!.team;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'project.team')).toBe(true);
    });

    test('empty team array causes error', () => {
      const config = createValidConfig();
      config.project!.team = [];

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'project.team')).toBe(true);
    });

    test('non-array team causes error', () => {
      const config = createValidConfig();
      (config.project!.team as any) = 'Not an array';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'project.team')).toBe(true);
    });

    test('team with empty string member causes error', () => {
      const config = createValidConfig();
      config.project!.team = ['Rohit', '', 'Jagan'];

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'project.team[1]')).toBe(true);
    });

    test('invalid project description causes warning', () => {
      const config = createValidConfig();
      (config.project!.description as any) = 12345;

      const result = validateConfiguration(config);

      expect(result.warnings.some((w) => w.field === 'project.description')).toBe(true);
    });
  });

  describe('Jira Configuration Validation', () => {
    test('missing query_type causes error', () => {
      const config = createValidConfig();
      delete config.jira!.query_type;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.query_type')).toBe(true);
    });

    test('invalid query_type causes error', () => {
      const config = createValidConfig();
      (config.jira!.query_type as any) = 'invalid';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.query_type')).toBe(true);
    });

    test('missing sprint_id when query_type is sprint causes error', () => {
      const config = createValidConfig();
      config.jira!.query_type = QueryType.SPRINT;
      delete config.jira!.sprint_id;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.sprint_id')).toBe(true);
    });

    test('empty sprint_id causes error', () => {
      const config = createValidConfig();
      config.jira!.query_type = QueryType.SPRINT;
      config.jira!.sprint_id = '   ';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.sprint_id')).toBe(true);
    });

    test('missing board_id when query_type is board causes error', () => {
      const config = createValidConfig();
      config.jira!.query_type = QueryType.BOARD;
      delete config.jira!.board_id;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.board_id')).toBe(true);
    });

    test('empty board_id causes error', () => {
      const config = createValidConfig();
      config.jira!.query_type = QueryType.BOARD;
      config.jira!.board_id = '   ';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.board_id')).toBe(true);
    });

    test('invalid metric_preference causes error', () => {
      const config = createValidConfig();
      (config.jira!.metric_preference as any) = 'invalid';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.metric_preference')).toBe(true);
    });

    test('non-object custom_fields causes error', () => {
      const config = createValidConfig();
      (config.jira!.custom_fields as any) = 'not an object';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.custom_fields')).toBe(true);
    });

    test('invalid story_points field ID format causes warning', () => {
      const config = createValidConfig();
      config.jira!.custom_fields!.story_points = 'invalid_format';

      const result = validateConfiguration(config);

      expect(result.warnings.some((w) => w.field === 'jira.custom_fields.story_points')).toBe(true);
    });

    test('invalid epic_link field ID format causes warning', () => {
      const config = createValidConfig();
      config.jira!.custom_fields!.epic_link = 'invalid_format';

      const result = validateConfiguration(config);

      expect(result.warnings.some((w) => w.field === 'jira.custom_fields.epic_link')).toBe(true);
    });

    test('missing status_mappings causes error', () => {
      const config = createValidConfig();
      delete config.jira!.status_mappings;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings')).toBe(true);
    });
  });

  describe('Status Mappings Validation - Clarification #4', () => {
    test('valid status mappings pass', () => {
      const config = createValidConfig();
      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
      expect(result.errors.filter((e) => e.field.startsWith('jira.status_mappings'))).toHaveLength(0);
    });

    test('missing status category causes error', () => {
      const config = createValidConfig();
      delete config.jira!.status_mappings!.done;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings.done')).toBe(true);
    });

    test('non-array status category causes error', () => {
      const config = createValidConfig();
      (config.jira!.status_mappings!.done as any) = 'not an array';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings.done')).toBe(true);
    });

    test('empty status category causes warning', () => {
      const config = createValidConfig();
      config.jira!.status_mappings!.blocked = [];

      const result = validateConfiguration(config);

      expect(result.warnings.some((w) => w.field === 'jira.status_mappings.blocked')).toBe(true);
    });

    test('non-string status value causes error', () => {
      const config = createValidConfig();
      (config.jira!.status_mappings!.done as any) = [123, 'Done'];

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings.done')).toBe(true);
    });

    test('empty status value causes error', () => {
      const config = createValidConfig();
      config.jira!.status_mappings!.done = ['Done', '   ', 'Resolved'];

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings.done')).toBe(true);
    });

    test('CRITICAL: case-insensitive overlap detection', () => {
      const config = createValidConfig();
      config.jira!.status_mappings = {
        done: ['Done', 'Resolved'],
        in_progress: ['In Progress', 'done'], // 'done' overlaps with Done
        to_do: ['To Do'],
        blocked: ['Blocked'],
      };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('done'))).toBe(true);
    });

    test('overlap detection with mixed case', () => {
      const config = createValidConfig();
      config.jira!.status_mappings = {
        done: ['DONE', 'Resolved'],
        in_progress: ['In Progress'],
        to_do: ['To Do', 'DoNe'], // Different case
        blocked: ['Blocked'],
      };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings' && e.message.includes('done'))).toBe(true);
    });

    test('overlap detection with whitespace', () => {
      const config = createValidConfig();
      config.jira!.status_mappings = {
        done: ['Done  ', 'Resolved'], // Extra whitespace
        in_progress: ['In Progress', ' done'], // Leading/trailing spaces
        to_do: ['To Do'],
        blocked: ['Blocked'],
      };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings')).toBe(true);
    });

    test('multiple overlaps detected', () => {
      const config = createValidConfig();
      config.jira!.status_mappings = {
        done: ['Done', 'Closed'],
        in_progress: ['Done', 'In Progress'], // 'Done' overlaps
        to_do: ['To Do', 'closed'], // 'closed' overlaps
        blocked: ['Blocked'],
      };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      const overlapErrors = result.errors.filter((e) => e.field === 'jira.status_mappings');
      expect(overlapErrors.length).toBeGreaterThan(0);
      expect(overlapErrors[0].message).toContain('done');
      expect(overlapErrors[0].message).toContain('closed');
    });

    test('no overlap with similar but different statuses', () => {
      const config = createValidConfig();
      config.jira!.status_mappings = {
        done: ['Done', 'Resolved'],
        in_progress: ['In Progress', 'Doing'], // 'Doing' != 'Done'
        to_do: ['To Do', 'Todo'], // 'Todo' != 'To Do'
        blocked: ['Blocked'],
      };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Confluence Configuration Validation', () => {
    test('missing space_key causes error', () => {
      const config = createValidConfig();
      delete config.confluence!.space_key;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confluence.space_key')).toBe(true);
    });

    test('empty space_key causes error', () => {
      const config = createValidConfig();
      config.confluence!.space_key = '   ';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confluence.space_key')).toBe(true);
    });

    test('missing page_title causes error', () => {
      const config = createValidConfig();
      delete config.confluence!.page_title;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confluence.page_title')).toBe(true);
    });

    test('empty page_title causes error', () => {
      const config = createValidConfig();
      config.confluence!.page_title = '   ';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confluence.page_title')).toBe(true);
    });

    test('CRITICAL: missing parent_page_id causes error (Clarification #3/#11)', () => {
      const config = createValidConfig();
      delete config.confluence!.parent_page_id;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confluence.parent_page_id')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('required'))).toBe(true);
    });

    test('empty parent_page_id causes error', () => {
      const config = createValidConfig();
      config.confluence!.parent_page_id = '   ';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confluence.parent_page_id')).toBe(true);
    });

    test('invalid page_id causes warning', () => {
      const config = createValidConfig();
      config.confluence!.page_id = '   ';

      const result = validateConfiguration(config);

      expect(result.warnings.some((w) => w.field === 'confluence.page_id')).toBe(true);
    });
  });

  describe('Report Configuration Validation', () => {
    test('missing health_thresholds causes error', () => {
      const config = createValidConfig();
      delete config.report!.health_thresholds;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds')).toBe(true);
    });
  });

  describe('Health Thresholds Validation - Clarification #18', () => {
    test('valid thresholds pass', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 10, yellow_max: 25 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
    });

    test('missing green_max causes error', () => {
      const config = createValidConfig();
      delete (config.report!.health_thresholds as any).green_max;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.green_max')).toBe(true);
    });

    test('missing yellow_max causes error', () => {
      const config = createValidConfig();
      delete (config.report!.health_thresholds as any).yellow_max;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.yellow_max')).toBe(true);
    });

    test('non-number green_max causes error', () => {
      const config = createValidConfig();
      (config.report!.health_thresholds!.green_max as any) = '10';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.green_max')).toBe(true);
    });

    test('non-number yellow_max causes error', () => {
      const config = createValidConfig();
      (config.report!.health_thresholds!.yellow_max as any) = '25';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.yellow_max')).toBe(true);
    });

    test('CRITICAL: green_max below 5 causes error', () => {
      const config = createValidConfig();
      config.report!.health_thresholds!.green_max = 3;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.green_max')).toBe(true);
    });

    test('CRITICAL: green_max above 50 causes error', () => {
      const config = createValidConfig();
      config.report!.health_thresholds!.green_max = 55;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.green_max')).toBe(true);
    });

    test('green_max = 5 is valid (boundary)', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 5, yellow_max: 20 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
    });

    test('green_max = 50 is valid (boundary)', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 50, yellow_max: 80 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
    });

    test('CRITICAL: yellow_max <= green_max causes error', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 25, yellow_max: 25 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.yellow_max')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('greater than'))).toBe(true);
    });

    test('yellow_max < green_max causes error', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 30, yellow_max: 20 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.yellow_max')).toBe(true);
    });

    test('CRITICAL: yellow_max > 100 causes error', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 10, yellow_max: 105 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.yellow_max')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('100'))).toBe(true);
    });

    test('yellow_max = 100 is valid (boundary)', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 30, yellow_max: 100 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
    });

    test('warning for tight thresholds (gap < 5)', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 10, yellow_max: 13 }; // Gap of 3

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true); // Valid but has warning
      expect(result.warnings.some((w) => w.field === 'report.health_thresholds')).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('tight'))).toBe(true);
    });

    test('warning for high green threshold (> 30)', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 35, yellow_max: 70 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.field === 'report.health_thresholds.green_max')).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('high'))).toBe(true);
    });

    test('no warning for reasonable thresholds', () => {
      const config = createValidConfig();
      config.report!.health_thresholds = { green_max: 10, yellow_max: 25 };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings.filter((w) => w.field.includes('health_thresholds'))).toHaveLength(0);
    });
  });

  describe('Timezone Validation - Clarification #19', () => {
    test('valid IANA timezone passes', () => {
      const config = createValidConfig();
      config.report!.timezone = 'America/New_York';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
      expect(result.errors.filter((e) => e.field === 'report.timezone')).toHaveLength(0);
    });

    test('UTC is valid', () => {
      const config = createValidConfig();
      config.report!.timezone = 'UTC';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
    });

    test('CRITICAL: timezone abbreviation EST rejected', () => {
      const config = createValidConfig();
      config.report!.timezone = 'EST';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.timezone')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('abbreviation'))).toBe(true);
      expect(result.errors.some((e) => e.message.includes('America/New_York'))).toBe(true);
    });

    test('timezone abbreviation PST rejected', () => {
      const config = createValidConfig();
      config.report!.timezone = 'PST';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.timezone')).toBe(true);
    });

    test('timezone abbreviation GMT rejected', () => {
      const config = createValidConfig();
      config.report!.timezone = 'GMT';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.timezone')).toBe(true);
    });

    test('timezone with spaces rejected', () => {
      const config = createValidConfig();
      config.report!.timezone = 'America/New York'; // Space instead of underscore

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.timezone')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('spaces'))).toBe(true);
    });

    test('empty timezone rejected', () => {
      const config = createValidConfig();
      config.report!.timezone = '   ';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report.timezone')).toBe(true);
    });

    test('uncommon IANA timezone causes warning', () => {
      const config = createValidConfig();
      config.report!.timezone = 'Antarctica/McMurdo';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true); // Valid but uncommon
      expect(result.warnings.some((w) => w.field === 'report.timezone')).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('not in the common'))).toBe(true);
    });

    test('all common IANA timezones accepted', () => {
      const commonTimezones = [
        'America/New_York',
        'America/Chicago',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Australia/Sydney',
        'UTC',
      ];

      commonTimezones.forEach((timezone) => {
        const config = createValidConfig();
        config.report!.timezone = timezone;

        const result = validateConfiguration(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Cross-Field Validation', () => {
    test('warning when story_points metric but no custom field configured', () => {
      const config = createValidConfig();
      config.jira!.metric_preference = MetricPreference.STORY_POINTS;
      delete config.jira!.custom_fields!.story_points;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true); // Valid but has warning
      expect(result.warnings.some((w) => w.field === 'jira.custom_fields.story_points')).toBe(true);
    });

    test('warning when both sprint_id and board_id provided', () => {
      const config = createValidConfig();
      config.jira!.query_type = QueryType.SPRINT;
      config.jira!.sprint_id = '12345';
      config.jira!.board_id = '67890';

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.field === 'jira')).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('Both sprint_id and board_id'))).toBe(true);
    });

    test('no warning when only sprint_id provided for sprint query', () => {
      const config = createValidConfig();
      config.jira!.query_type = QueryType.SPRINT;
      config.jira!.sprint_id = '12345';
      delete config.jira!.board_id;

      const result = validateConfiguration(config);

      expect(result.warnings.filter((w) => w.field === 'jira')).toHaveLength(0);
    });

    test('no warning when only board_id provided for board query', () => {
      const config = createValidConfig();
      config.jira!.query_type = QueryType.BOARD;
      config.jira!.board_id = '67890';
      delete config.jira!.sprint_id;

      const result = validateConfiguration(config);

      expect(result.warnings.filter((w) => w.field === 'jira')).toHaveLength(0);
    });
  });

  describe('Validation Result Formatting', () => {
    test('formatValidationErrors shows errors first', () => {
      const config = createValidConfig();
      delete config.project!.name;
      config.report!.health_thresholds!.green_max = 35; // Causes warning

      const result = validateConfiguration(config);
      const formatted = formatValidationErrors(result);

      expect(formatted).toContain('❌ Configuration Errors');
      expect(formatted).toContain('⚠️  Configuration Warnings');
      expect(formatted.indexOf('❌')).toBeLessThan(formatted.indexOf('⚠️'));
    });

    test('formatValidationErrors shows only warnings if no errors', () => {
      const config = createValidConfig();
      config.report!.health_thresholds!.green_max = 35; // Warning only

      const result = validateConfiguration(config);
      const formatted = formatValidationErrors(result);

      expect(formatted).not.toContain('❌ Configuration Errors');
      expect(formatted).toContain('⚠️  Configuration Warnings');
    });

    test('formatValidationErrors shows success message if valid', () => {
      const config = createValidConfig();
      const result = validateConfiguration(config);
      const formatted = formatValidationErrors(result);

      expect(formatted).toContain('✅ Configuration validation passed');
    });

    test('getValidationSummary returns correct summary for valid config', () => {
      const config = createValidConfig();
      const result = validateConfiguration(config);
      const summary = getValidationSummary(result);

      expect(summary).toContain('✅');
      expect(summary).toContain('valid');
    });

    test('getValidationSummary returns correct summary for warnings', () => {
      const config = createValidConfig();
      config.report!.health_thresholds!.green_max = 35;

      const result = validateConfiguration(config);
      const summary = getValidationSummary(result);

      expect(summary).toContain('⚠️');
      expect(summary).toContain('warning');
    });

    test('getValidationSummary returns correct summary for errors', () => {
      const config = createValidConfig();
      delete config.project!.name;

      const result = validateConfiguration(config);
      const summary = getValidationSummary(result);

      expect(summary).toContain('❌');
      expect(summary).toContain('error');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('handles completely empty config', () => {
      const config = {};
      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('handles partial config with only project', () => {
      const config = {
        project: {
          name: 'Test Project',
          team: ['Alice', 'Bob'],
        },
      };

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.startsWith('jira'))).toBe(true);
      expect(result.errors.some((e) => e.field.startsWith('confluence'))).toBe(true);
    });

    test('handles null values gracefully', () => {
      const config = createValidConfig();
      (config.project!.name as any) = null;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'project.name')).toBe(true);
    });

    test('handles undefined nested objects', () => {
      const config = {
        project: undefined,
        jira: undefined,
        confluence: undefined,
        report: undefined,
      } as any;

      const result = validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5); // Multiple missing required fields
    });

    test('validation result includes issue count', () => {
      const config = createValidConfig();
      delete config.project!.name; // 1 error
      config.report!.health_thresholds!.green_max = 35; // 1 warning

      const result = validateConfiguration(config);

      expect(result.issueCount).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.warnings.length).toBe(1);
    });
  });

  describe('Integration Test - Full Invalid Config', () => {
    test('comprehensive validation of heavily invalid config', () => {
      const invalidConfig = {
        project: {
          name: '',
          team: [],
        },
        jira: {
          query_type: 'invalid' as any,
          sprint_id: undefined,
          board_id: undefined,
          metric_preference: 'invalid' as any,
          status_mappings: {
            done: ['Done'],
            in_progress: ['Done'], // Overlap
            to_do: [],
            blocked: ['Blocked'],
          },
        },
        confluence: {
          space_key: '',
          page_title: '',
          parent_page_id: undefined, // Missing required field
        },
        report: {
          health_thresholds: {
            green_max: 60, // Out of range
            yellow_max: 50, // Less than green_max
          },
          timezone: 'PST', // Abbreviation
        },
      };

      const result = validateConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(10);

      // Verify specific critical errors are caught
      expect(result.errors.some((e) => e.field === 'project.name')).toBe(true);
      expect(result.errors.some((e) => e.field === 'project.team')).toBe(true);
      expect(result.errors.some((e) => e.field === 'jira.query_type')).toBe(true);
      expect(result.errors.some((e) => e.field === 'jira.status_mappings')).toBe(true);
      expect(result.errors.some((e) => e.field === 'confluence.parent_page_id')).toBe(true);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.green_max')).toBe(true);
      expect(result.errors.some((e) => e.field === 'report.health_thresholds.yellow_max')).toBe(true);
      expect(result.errors.some((e) => e.field === 'report.timezone')).toBe(true);
    });
  });
});
