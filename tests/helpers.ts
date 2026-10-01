import { RawIssue } from '../src/domain/types';
import { redactIssues } from '../src/pipeline/redact';
import { RedactedIssue } from '../src/domain/types';
import { defaultSettings } from '../src/config/settings';

export const NOW = new Date('2026-10-02T12:00:00.000Z');
const DAY = 86_400_000;
export const daysAgo = (n: number): string => new Date(NOW.getTime() - n * DAY).toISOString();

export function raw(over: Partial<RawIssue> & { key: string }): RawIssue {
  return {
    summary: 'A story',
    issueType: 'Story',
    status: 'Ready for Dev',
    statusCategory: 'todo',
    storyPoints: 3,
    priority: 'Medium',
    epicKey: null,
    epicName: null,
    labels: [],
    components: [],
    securityLevel: null,
    created: daysAgo(5),
    resolved: null,
    statusHistory: [],
    ...over,
  };
}

export const redacted = (issues: RawIssue[]): RedactedIssue[] => redactIssues(issues).issues;

export const settings = defaultSettings;

export const sprint = {
  id: 1,
  name: 'Sprint 1',
  startDate: daysAgo(10),
  endDate: new Date(NOW.getTime() + 4 * DAY).toISOString(),
};
