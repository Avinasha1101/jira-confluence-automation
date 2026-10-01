import { RawIssue, RedactedIssue } from '../domain/types';

export type PiiType = 'email' | 'ssn' | 'card' | 'vin' | 'phone' | 'address' | 'account';

export interface RedactionEvent {
  issueKey: string;
  type: PiiType;
  field: 'title' | 'epic';
}

export interface RedactOptions {
  accountRegex?: string;
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

const PATTERNS: { type: PiiType; re: RegExp; accept?: (match: string) => boolean }[] = [
  { type: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: 'ssn', re: /\b\d{3}[- ]\d{2}[- ]\d{4}\b/g },
  {
    type: 'card',
    re: /\b(?:\d[ -]?){12,18}\d\b/g,
    accept: (m) => {
      const digits = m.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19 && luhnValid(digits);
    },
  },
  {
    type: 'vin',
    re: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
    accept: (m) => /\d/.test(m) && /[A-Z]/.test(m),
  },
  { type: 'phone', re: /(?<![\w-])(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g },
  {
    type: 'address',
    re: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)\b\.?/g,
  },
  { type: 'account', re: /(?<![\w-])\d{9,12}(?![\w-])/g },
];

function compileCustom(source: string | undefined): RegExp | null {
  if (!source || !source.trim()) return null;
  try {
    return new RegExp(source, 'g');
  } catch {
    return null;
  }
}

export function redactText(
  text: string,
  opts: RedactOptions = {},
): { text: string; types: PiiType[] } {
  const found = new Set<PiiType>();
  let out = text;

  const apply = (type: PiiType, re: RegExp, accept?: (m: string) => boolean): void => {
    out = out.replace(re, (m) => {
      if (accept && !accept(m)) return m;
      found.add(type);
      return `[REDACTED-${type.toUpperCase()}]`;
    });
  };

  for (const p of PATTERNS) apply(p.type, p.re, p.accept);
  const custom = compileCustom(opts.accountRegex);
  if (custom) apply('account', custom);

  return { text: out, types: [...found] };
}

export function redactIssues(
  raw: RawIssue[],
  opts: RedactOptions = {},
): { issues: RedactedIssue[]; events: RedactionEvent[] } {
  const events: RedactionEvent[] = [];
  const issues = raw.map((r) => {
    const title = redactText(r.summary, opts);
    for (const type of title.types) events.push({ issueKey: r.key, type, field: 'title' });
    let epicName = r.epicName;
    if (epicName) {
      const epic = redactText(epicName, opts);
      epicName = epic.text;
      for (const type of epic.types) events.push({ issueKey: r.key, type, field: 'epic' });
    }
    const redacted = {
      key: r.key,
      title: title.text,
      issueType: r.issueType,
      status: r.status,
      statusCategory: r.statusCategory,
      storyPoints: r.storyPoints,
      priority: r.priority,
      epicKey: r.epicKey,
      epicName,
      created: r.created,
      resolved: r.resolved,
      statusHistory: r.statusHistory,
    };
    return redacted as unknown as RedactedIssue;
  });
  return { issues, events };
}
