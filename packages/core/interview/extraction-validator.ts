import type { StructuredAnswers } from './interviewer.js';

export interface ExtractionIssue {
  code:
    | 'duplicate_principle_rationale'
    | 'duplicate_examples_good'
    | 'literal_dim_id_placeholder'
    | 'escalation_in_never_do'
    | 'empty_principles'
    | 'invalid_domain_specific'
    | 'placeholder_domain_specific_key'
    | 'generic_domain_specific_filler';
  message: string;
  location?: string;
}

const ESCALATION_HINTS = [
  'escalat',
  'ask before',
  'check with',
  'require approval',
  'requires approval',
  'must approve',
  'flag for review',
  'human review',
  'pause for',
  'confirm before',
];

const DOMAIN_SPECIFIC_PLACEHOLDER_KEYS = new Set([
  'dim_id',
  'dimension_id',
  'dimension',
  'placeholder',
  'real_dimension_id',
  'real-dimension-id',
  '<real-dimension-id>',
  'domain_specific',
  'unknown',
  'tbd',
  'todo',
]);

const GENERIC_FILLER_STRINGS = new Set([
  'user preferences and requirements should be followed',
  'follow user preferences',
  'follow the user preferences',
  "follow the user's preferences",
  'based on user preferences',
  "based on the user's preferences",
  'customize based on user needs',
  "customize based on the user's needs",
  'not specified',
  'none',
  'n/a',
]);

export function validateStructuredAnswers(sa: StructuredAnswers): ExtractionIssue[] {
  const issues: ExtractionIssue[] = [];

  if (!sa.principles || sa.principles.length === 0) {
    issues.push({
      code: 'empty_principles',
      message: 'No principles extracted. The interview should yield at least one principle.',
      location: 'principles',
    });
    return issues;
  }

  const seenRationales = new Map<string, number>();
  for (let i = 0; i < sa.principles.length; i++) {
    const r = sa.principles[i].rationale?.trim().toLowerCase() ?? '';
    if (!r) continue;
    if (seenRationales.has(r)) {
      issues.push({
        code: 'duplicate_principle_rationale',
        message: `Principles ${seenRationales.get(r)} and ${i} share the same rationale verbatim. Each principle must have a distinct rationale that explains why this specific principle (not the others) matters.`,
        location: `principles[${i}].rationale`,
      });
    }
    seenRationales.set(r, i);
  }

  const seenExamples = new Map<string, number>();
  for (let i = 0; i < sa.principles.length; i++) {
    const ex = sa.principles[i].examples_good;
    if (!ex || ex.length === 0) continue;
    const fingerprint = ex.map(e => e.trim().toLowerCase()).sort().join('||');
    if (!fingerprint) continue;
    if (seenExamples.has(fingerprint)) {
      issues.push({
        code: 'duplicate_examples_good',
        message: `Principles ${seenExamples.get(fingerprint)} and ${i} share identical examples_good arrays. Each principle needs distinct examples that illustrate it specifically.`,
        location: `principles[${i}].examples_good`,
      });
    }
    seenExamples.set(fingerprint, i);
  }

  for (let i = 0; i < sa.principles.length; i++) {
    if (sa.principles[i].source_dimension === 'dim_id') {
      issues.push({
        code: 'literal_dim_id_placeholder',
        message: `principles[${i}].source_dimension is the literal placeholder "dim_id" instead of an actual dimension id. Replace it with the dimension this principle came from (e.g., "core_principles", "communication_style").`,
        location: `principles[${i}].source_dimension`,
      });
    }
  }

  if (sa.taboos?.never_do) {
    for (const item of sa.taboos.never_do) {
      const lower = item.toLowerCase();
      const matched = ESCALATION_HINTS.find(hint => lower.includes(hint));
      if (matched) {
        issues.push({
          code: 'escalation_in_never_do',
          message: `taboos.never_do contains "${item}" — that reads like an escalation rule (matched hint: "${matched}"), not an absolute prohibition. never_do = the agent must never do this under any circumstances; must_escalate = the agent pauses and asks for human approval. Move this item to must_escalate.`,
          location: `taboos.never_do["${item}"]`,
        });
      }
    }
  }

  validateDomainSpecific(sa.domain_specific, issues);

  return issues;
}

function validateDomainSpecific(value: unknown, issues: ExtractionIssue[]): void {
  if (value === undefined) return;

  if (!isPlainRecord(value)) {
    issues.push({
      code: 'invalid_domain_specific',
      message: 'domain_specific must be a JSON object keyed by real dimension ids or stable domain concepts. Use {} when no domain-specific data was extracted.',
      location: 'domain_specific',
    });
    return;
  }

  const genericFillerLocations = new Map<string, string[]>();

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);
    if (
      DOMAIN_SPECIFIC_PLACEHOLDER_KEYS.has(normalizedKey)
      || /^dim[-_]?id$/.test(normalizedKey)
    ) {
      issues.push({
        code: 'placeholder_domain_specific_key',
        message: `domain_specific key "${key}" is a placeholder. Use the actual dimension id or a stable domain concept key.`,
        location: `domain_specific.${key}`,
      });
    }

    if (!/^[a-z][a-z0-9_-]*$/.test(key)) {
      issues.push({
        code: 'invalid_domain_specific',
        message: `domain_specific key "${key}" is not stable. Use lower-case snake_case or kebab-case dimension/concept ids.`,
        location: `domain_specific.${key}`,
      });
    }

    collectGenericFillerStrings(child, `domain_specific.${key}`, genericFillerLocations);
  }

  for (const [text, locations] of genericFillerLocations.entries()) {
    if (locations.length < 2) continue;
    issues.push({
      code: 'generic_domain_specific_filler',
      message: `domain_specific repeats generic filler "${text}" in ${locations.length} places. Replace it with concrete facts from the interview or omit it.`,
      location: locations[1],
    });
    break;
  }
}

function collectGenericFillerStrings(
  value: unknown,
  location: string,
  matches: Map<string, string[]>,
): void {
  if (typeof value === 'string') {
    const normalized = normalizeText(value);
    if (GENERIC_FILLER_STRINGS.has(normalized)) {
      const existing = matches.get(normalized) ?? [];
      existing.push(location);
      matches.set(normalized, existing);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectGenericFillerStrings(item, `${location}[${index}]`, matches);
    });
    return;
  }

  if (isPlainRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectGenericFillerStrings(child, `${location}.${key}`, matches);
    }
  }
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function formatIssuesForRetryPrompt(issues: ExtractionIssue[]): string {
  if (issues.length === 0) return '';
  const lines = issues.map((iss, idx) => `${idx + 1}. [${iss.code}] ${iss.message}`);
  return [
    'Your previous extraction had these issues. Fix all of them and return corrected JSON:',
    '',
    ...lines,
    '',
    'Return only the corrected JSON object. No explanation, no markdown fences.',
  ].join('\n');
}
