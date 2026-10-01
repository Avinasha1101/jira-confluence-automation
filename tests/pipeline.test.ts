import { applyExclusion } from '../src/pipeline/exclusion';
import { redactIssues, redactText } from '../src/pipeline/redact';
import { raw } from './helpers';

describe('exclusion', () => {
  const issues = [
    raw({ key: 'A-1', labels: ['Internal'] }),
    raw({ key: 'A-2', components: ['Platform'] }),
    raw({ key: 'A-3', securityLevel: 'Staff' }),
    raw({ key: 'A-4', issueType: 'Spike' }),
    raw({ key: 'A-5' }),
  ];

  it('keeps everything when the rule is none', () => {
    expect(applyExclusion(issues, { type: 'none' })).toEqual({ kept: issues, excluded: 0 });
  });

  it.each([
    ['label', 'internal', 'A-1'],
    ['component', 'PLATFORM', 'A-2'],
    ['securityLevel', 'staff', 'A-3'],
    ['issueType', 'spike', 'A-4'],
  ] as const)('removes issues matching a %s rule (case-insensitive)', (type, value, key) => {
    const { kept, excluded } = applyExclusion(issues, { type, value });
    expect(excluded).toBe(1);
    expect(kept.map((i) => i.key)).not.toContain(key);
  });

  it('ignores a rule with an empty value', () => {
    expect(applyExclusion(issues, { type: 'label', value: '  ' }).excluded).toBe(0);
  });
});

describe('PII redaction', () => {
  it.each([
    ['email', 'Mail jane.doe@example.com now', 'email'],
    ['ssn', 'Applicant 123-45-6789 stuck', 'ssn'],
    ['card', 'Card 4111 1111 1111 1111 declined', 'card'],
    ['vin', 'Check VIN 1HGCM82633A004352 history', 'vin'],
    ['phone', 'Call (555) 867-5309 today', 'phone'],
    ['address', 'Visit 1428 Elm Street soon', 'address'],
    ['account', 'Loan 123456789012 mismatch', 'account'],
  ])('masks %s', (_name, text, type) => {
    const result = redactText(text);
    expect(result.types).toContain(type);
    expect(result.text).toContain(`[REDACTED-${type.toUpperCase()}]`);
  });

  it('does not touch ordinary titles, ticket keys, or short numbers', () => {
    const text = 'AFP-1234 Improve form validation for 3 fields in sprint 24';
    expect(redactText(text)).toEqual({ text, types: [] });
  });

  it('does not treat a non-Luhn long number as a card', () => {
    expect(redactText('Ref 4111 1111 1111 1112').types).not.toContain('card');
  });

  it('applies a configurable account regex', () => {
    const result = redactText('See LN-00123456 for details', { accountRegex: 'LN-\\d{8}' });
    expect(result.text).toBe('See [REDACTED-ACCOUNT] for details');
  });

  it('ignores an invalid custom regex instead of crashing', () => {
    expect(redactText('plain', { accountRegex: '(' }).types).toEqual([]);
  });

  it('records events with the issue key and field but never the value', () => {
    const { issues, events } = redactIssues([
      raw({ key: 'A-1', summary: 'SSN 123-45-6789', epicName: 'Epic for a@b.co' }),
    ]);
    expect(events).toEqual([
      { issueKey: 'A-1', type: 'ssn', field: 'title' },
      { issueKey: 'A-1', type: 'email', field: 'epic' },
    ]);
    expect(JSON.stringify(issues)).not.toContain('123-45-6789');
    expect(JSON.stringify(events)).not.toContain('123-45-6789');
  });

  it('drops labels, components and security level from the redacted model', () => {
    const { issues } = redactIssues([raw({ key: 'A-1', labels: ['x'], components: ['y'], securityLevel: 'z' })]);
    expect(Object.keys(issues[0])).not.toEqual(expect.arrayContaining(['labels']));
    expect(JSON.stringify(issues[0])).not.toMatch(/securityLevel|components/);
  });
});
