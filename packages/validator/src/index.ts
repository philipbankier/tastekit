import Ajv2020 from 'ajv/dist/2020.js';
import { createRequire } from 'node:module';
import { ConstitutionV1Schema, type ConstitutionV1 } from '@kairox_ai/tastekit-core/schemas';

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export type ValidationResult =
  | { ok: true; data: ConstitutionV1; issues: [] }
  | { ok: false; issues: ValidationIssue[] };

const require = createRequire(import.meta.url);
const constitutionJsonSchema = require('@kairox_ai/tastekit-core/schemas/json/constitution.schema.json');

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

function normalizePath(path: Array<string | number>): string | undefined {
  return path.length > 0 ? path.join('.') : undefined;
}

function jsonSchemaIssues(data: unknown): ValidationIssue[] {
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
  const validate = ajv.compile(constitutionJsonSchema);
  if (validate(data)) return [];

  return (validate.errors ?? []).map(error => ({
    code: 'json_schema',
    path: error.instancePath
      ? error.instancePath.slice(1).replaceAll('/', '.')
      : undefined,
    message: error.message ?? 'JSON Schema validation failed',
  }));
}

function zodParse(data: unknown): { data?: ConstitutionV1; issues: ValidationIssue[] } {
  const result = ConstitutionV1Schema.safeParse(data);
  if (result.success) {
    return { data: result.data, issues: [] };
  }

  return {
    issues: result.error.issues.map(issue => ({
      code: 'zod',
      path: normalizePath(issue.path),
      message: issue.message,
    })),
  };
}

function semanticIssues(data: ConstitutionV1): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenRationales = new Map<string, number>();
  const seenExamples = new Map<string, number>();

  for (let i = 0; i < data.principles.length; i++) {
    const rationale = data.principles[i].rationale?.trim().toLowerCase();
    if (rationale) {
      const first = seenRationales.get(rationale);
      if (first !== undefined) {
        issues.push({
          code: 'duplicate_principle_rationale',
          path: `principles.${i}.rationale`,
          message: `Principles ${first} and ${i} share the same rationale.`,
        });
      }
      seenRationales.set(rationale, i);
    }

    const examples = data.principles[i].examples_good;
    if (examples && examples.length > 0) {
      const fingerprint = examples.map(example => example.trim().toLowerCase()).sort().join('||');
      const first = seenExamples.get(fingerprint);
      if (fingerprint && first !== undefined) {
        issues.push({
          code: 'duplicate_examples_good',
          path: `principles.${i}.examples_good`,
          message: `Principles ${first} and ${i} share identical examples_good arrays.`,
        });
      }
      seenExamples.set(fingerprint, i);
    }
  }

  for (let i = 0; i < data.taboos.never_do.length; i++) {
    const item = data.taboos.never_do[i];
    const lower = item.toLowerCase();
    const matched = ESCALATION_HINTS.find(hint => lower.includes(hint));
    if (matched) {
      issues.push({
        code: 'escalation_in_never_do',
        path: `taboos.never_do.${i}`,
        message: `"${item}" reads like an escalation rule, not an absolute prohibition.`,
      });
    }
  }

  return issues;
}

export function validateConstitutionArtifact(data: unknown): ValidationResult {
  const issues: ValidationIssue[] = [...jsonSchemaIssues(data)];
  const parsed = zodParse(data);
  issues.push(...parsed.issues);

  if (!parsed.data) {
    return { ok: false, issues };
  }

  issues.push(...semanticIssues(parsed.data));
  return issues.length === 0
    ? { ok: true, data: parsed.data, issues: [] }
    : { ok: false, issues };
}
