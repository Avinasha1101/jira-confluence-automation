/**
 * Configuration Schema Utilities
 * 
 * Utilities for working with configuration schemas,
 * including merging user config with defaults.
 * 
 * @module config/schema
 * @version 1.0.0
 */

import { Configuration, PartialConfiguration } from './types';\nimport { DEFAULT_CONFIG } from './defaults';

/**
 * Deep merge user configuration with defaults
 * 
 * User-provided values override defaults. Nested objects are merged recursively.
 * 
 * @param userConfig - User-provided partial configuration
 * @returns Complete configuration with defaults filled in
 * 
 * @example
 * ```typescript
 * const userConfig = {
 *   project: { name: 'Manager.AI', team: ['Rohit', 'Rajiv'] },
 *   jira: { query_type: 'sprint', sprint_id: '123' },
 *   confluence: { space_key: 'MNGRAI', page_title: 'Reports', parent_page_id: '456' },
 * };
 * 
 * const fullConfig = mergeWithDefaults(userConfig);
 * // fullConfig.jira.metric_preference === 'story_points' (from defaults)
 * // fullConfig.report.timezone === 'UTC' (from defaults)
 * ```
 */
export function mergeWithDefaults(userConfig: PartialConfiguration): Partial<Configuration> {
  return {
    project: {
      ...userConfig.project,
    },
    jira: {
      ...DEFAULT_CONFIG.jira,
      ...userConfig.jira,
      custom_fields: {
        ...DEFAULT_CONFIG.jira?.custom_fields,
        ...userConfig.jira?.custom_fields,
      },
      status_mappings: userConfig.jira?.status_mappings || DEFAULT_CONFIG.jira?.status_mappings,
    },
    confluence: {
      ...userConfig.confluence,
    },
    report: {
      ...DEFAULT_CONFIG.report,
      ...userConfig.report,
    },
  };
}

/**
 * Get configuration with all defaults applied
 * 
 * This is the main function to merge user config with defaults.
 * Returns a configuration object suitable for use throughout the application.
 * 
 * @param userConfig - User-provided configuration
 * @returns Complete configuration object
 */
export function getFullConfiguration(userConfig: PartialConfiguration): Partial<Configuration> {
  return mergeWithDefaults(userConfig);
}

/**
 * Validate required fields are present in configuration
 * 
 * This function checks that all required fields are defined.
 * Returns array of missing fields (empty if all present).
 * 
 * Note: This is a simple presence check. Full validation is in config/validator.ts
 * 
 * @param config - Configuration to validate
 * @returns Array of missing required field paths (e.g., ['jira.sprint_id'])
 * 
 * @example
 * ```typescript
 * const missing = validateRequiredFields(config);\n * if (missing.length > 0) {\n *   console.log('Missing required fields:', missing);\n * }\n * ```\n */\nexport function validateRequiredFields(config: Partial<Configuration>): string[] {\n  const missing: string[] = [];\n\n  // Check project\n  if (!config.project?.name) missing.push('project.name');\n  if (!config.project?.team || config.project.team.length === 0) missing.push('project.team');\n\n  // Check jira\n  if (!config.jira?.query_type) missing.push('jira.query_type');\n  if (!config.jira?.status_mappings) missing.push('jira.status_mappings');\n\n  // Check confluence\n  if (!config.confluence?.space_key) missing.push('confluence.space_key');\n  if (!config.confluence?.page_title) missing.push('confluence.page_title');\n  if (!config.confluence?.parent_page_id) missing.push('confluence.parent_page_id');\n\n  // Check report\n  if (!config.report?.health_thresholds) missing.push('report.health_thresholds');\n\n  return missing;\n}\n\n/**\n * Get a configuration field by path\n * \n * Utility function to access nested configuration fields by dot-notation path.\n * \n * @param config - Configuration object\n * @param path - Dot-notation path (e.g., 'jira.query_type')\n * @returns Field value or undefined if not found\n * \n * @example\n * ```typescript\n * const queryType = getConfigField(config, 'jira.query_type');\n * const greenThreshold = getConfigField(config, 'report.health_thresholds.green_max');\n * ```\n */\nexport function getConfigField(config: Partial<Configuration>, path: string): any {\n  const parts = path.split('.');\n  let value: any = config;\n\n  for (const part of parts) {\n    value = value?.[part];\n    if (value === undefined) break;\n  }\n\n  return value;\n}\n