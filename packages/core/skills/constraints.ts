import { ConstraintResult } from '../schemas/skills.js';

/**
 * Skill Constraint Validation
 *
 * Safety gates that every evolved skill must pass before acceptance.
 * Adapted from NousResearch/hermes-agent-self-evolution constraint system.
 */

const DEFAULT_MAX_BYTES = 15360; // 15KB
const DEFAULT_MAX_GROWTH_PCT = 20;

/** Skills must not exceed a maximum size. */
export function validateSize(content: string, maxBytes = DEFAULT_MAX_BYTES): ConstraintResult {
  const size = Buffer.byteLength(content, 'utf-8');
  return {
    passed: size <= maxBytes,
    constraint_id: 'size_limit',
    message: size <= maxBytes
      ? `Size OK (${size} bytes)`
      : `Skill exceeds max size: ${size} > ${maxBytes} bytes`,
    details: { size, maxBytes },
  };
}

/** Evolved version can't be more than N% larger than the original. */
export function validateGrowth(
  original: string,
  evolved: string,
  maxGrowthPercent = DEFAULT_MAX_GROWTH_PCT,
): ConstraintResult {
  const originalSize = Buffer.byteLength(original, 'utf-8');
  const evolvedSize = Buffer.byteLength(evolved, 'utf-8');

  if (originalSize === 0) {
    return {
      passed: true,
      constraint_id: 'growth_limit',
      message: 'Original was empty — growth check skipped',
    };
  }

  const growthPct = ((evolvedSize - originalSize) / originalSize) * 100;
  const passed = growthPct <= maxGrowthPercent;

  return {
    passed,
    constraint_id: 'growth_limit',
    message: passed
      ? `Growth OK (${growthPct.toFixed(1)}%)`
      : `Skill grew too much: ${growthPct.toFixed(1)}% > ${maxGrowthPercent}% allowed`,
    details: { originalSize, evolvedSize, growthPct: Math.round(growthPct * 10) / 10, maxGrowthPercent },
  };
}

/** Skill content must not be empty. */
export function validateNonEmpty(content: string): ConstraintResult {
  const stripped = content.trim();
  return {
    passed: stripped.length > 0,
    constraint_id: 'non_empty',
    message: stripped.length > 0 ? 'Content is non-empty' : 'Skill content is empty',
  };
}

/**
 * Skill must have required SKILL.md sections.
 *
 * Required: Purpose, Procedure (or Steps), and Inputs (or Outputs).
 */
export function validateStructure(content: string): ConstraintResult {
  const lower = content.toLowerCase();

  const requiredPatterns: Array<{ name: string; patterns: string[] }> = [
    { name: 'Purpose', patterns: ['## purpose', '# purpose', 'purpose:'] },
    { name: 'Procedure', patterns: ['## procedure', '# procedure', '## steps', '# steps', 'procedure:'] },
    { name: 'Inputs/Outputs', patterns: ['## inputs', '# inputs', '## outputs', '# outputs', 'inputs:', 'outputs:'] },
  ];

  const missing: string[] = [];

  for (const req of requiredPatterns) {
    const found = req.patterns.some(p => lower.includes(p));
    if (!found) missing.push(req.name);
  }

  return {
    passed: missing.length === 0,
    constraint_id: 'structure',
    message: missing.length === 0
      ? 'All required sections present'
      : `Missing required sections: ${missing.join(', ')}`,
    details: { missing },
  };
}

/** Run all constraints. Returns array of results (all must pass for acceptance). */
export function validateAll(
  content: string,
  baseline?: string,
  opts?: { maxBytes?: number; maxGrowthPct?: number },
): ConstraintResult[] {
  const results: ConstraintResult[] = [
    validateNonEmpty(content),
    validateSize(content, opts?.maxBytes),
    validateStructure(content),
  ];

  if (baseline) {
    results.push(validateGrowth(baseline, content, opts?.maxGrowthPct));
  }

  return results;
}
