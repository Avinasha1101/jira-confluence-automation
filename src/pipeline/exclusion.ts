import { ExclusionRule } from '../domain/apiTypes';
import { RawIssue } from '../domain/types';

const eq = (a: string | null | undefined, b: string): boolean =>
  (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();

export function isExcluded(issue: RawIssue, rule: ExclusionRule): boolean {
  switch (rule.type) {
    case 'none':
      return false;
    case 'label':
      return issue.labels.some((l) => eq(l, rule.value));
    case 'component':
      return issue.components.some((c) => eq(c, rule.value));
    case 'securityLevel':
      return eq(issue.securityLevel, rule.value);
    case 'issueType':
      return eq(issue.issueType, rule.value);
  }
}

export function applyExclusion(
  issues: RawIssue[],
  rule: ExclusionRule,
): { kept: RawIssue[]; excluded: number } {
  if (rule.type !== 'none' && !rule.value.trim()) {
    return { kept: issues, excluded: 0 };
  }
  const kept = issues.filter((i) => !isExcluded(i, rule));
  return { kept, excluded: issues.length - kept.length };
}
