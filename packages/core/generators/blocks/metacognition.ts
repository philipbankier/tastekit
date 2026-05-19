/**
 * Metacognition Block - practical operating guidance from onboarding policy state.
 */
import type { GeneratorBlock, GeneratorContext } from '../types.js';

const METACOGNITION_EXTENSION_KEY = 'x-tastekit-metacognition';
const MAX_ASSUMPTIONS = 3;
const MAX_CONFLICTS = 3;

interface MetacognitionExtension {
  schema_version?: unknown;
  public_depth_label?: unknown;
  coverage_summary?: unknown;
  unresolved_assumptions?: unknown;
  conflicts?: unknown;
  confirmation_checkpoints?: unknown;
}

export const metacognitionBlock: GeneratorBlock = (ctx) => {
  const metacognition = getMetacognition(ctx);
  if (!metacognition) return null;

  const lines: string[] = ['## Metacognitive Operating Style', ''];
  if (typeof metacognition.public_depth_label === 'string') {
    lines.push(`Onboarding depth: ${metacognition.public_depth_label}`);
    lines.push('');
  }

  const coverage = coverageLine(metacognition.coverage_summary);
  if (coverage) {
    lines.push(coverage);
    lines.push('');
  }

  const assumptions = assumptionLines(metacognition.unresolved_assumptions);
  if (assumptions.length > 0) {
    lines.push('Assumptions to handle carefully:');
    lines.push(...assumptions);
    lines.push('- Confirm assumptions before acting on them.');
    lines.push('');
  }

  const conflicts = conflictLines(metacognition.conflicts);
  if (conflicts.length > 0) {
    lines.push('Resolve before acting:');
    lines.push(...conflicts);
    lines.push('');
  }

  if (hasAcceptedDraft(metacognition.confirmation_checkpoints)) {
    lines.push('- Use the accepted onboarding draft as the current operating hypothesis, but revise when the user corrects it.');
  } else {
    lines.push('- Treat the profile as provisional until the user confirms a draft.');
  }
  lines.push('- Surface uncertainty, tradeoffs, and challenge points plainly.');

  return lines.join('\n');
};

function getMetacognition(ctx: GeneratorContext): MetacognitionExtension | null {
  const value = ctx.constitution?.extensions?.[METACOGNITION_EXTENSION_KEY];
  if (!isRecord(value)) return null;
  if (value.schema_version !== 'tastekit.metacognition.v1') return null;
  return value;
}

function coverageLine(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const total = numeric(value.total_dimensions);
  const covered = numeric(value.covered_dimensions);
  const critical = isRecord(value.critical) ? value.critical : null;
  const criticalConfirmed = critical ? numeric(critical.confirmed) : null;
  const criticalTotal = critical ? numeric(critical.total) : null;

  const parts: string[] = [];
  if (covered !== null && total !== null) {
    parts.push(`${covered}/${total} dimensions covered`);
  }
  if (criticalConfirmed !== null && criticalTotal !== null) {
    parts.push(`${criticalConfirmed}/${criticalTotal} critical dimensions confirmed`);
  }
  return parts.length > 0 ? `Coverage state: ${parts.join('; ')}.` : null;
}

function assumptionLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap(item => {
      if (!isRecord(item) || typeof item.summary !== 'string') return [];
      return [`- ${item.summary.trim()}`];
    })
    .slice(0, MAX_ASSUMPTIONS);
}

function conflictLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap(item => {
      if (!isRecord(item) || item.status !== 'unresolved' || typeof item.summary !== 'string') return [];
      return [`- ${item.summary.trim()}`];
    })
    .slice(0, MAX_CONFLICTS);
}

function hasAcceptedDraft(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(item => (
    isRecord(item)
    && item.type === 'draft'
    && item.accepted === true
  ));
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
