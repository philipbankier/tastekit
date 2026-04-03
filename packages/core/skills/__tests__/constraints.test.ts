import { describe, expect, it } from 'vitest';
import {
  validateNonEmpty,
  validateSize,
  validateStructure,
  validateGrowth,
  validateAll,
} from '../constraints.js';

const VALID_SKILL = `## Purpose
Do something useful.

## Procedure
1. Step one
2. Step two

## Inputs
- task_input: string

## Outputs
- result: string
`;

describe('validateNonEmpty', () => {
  it('passes for non-empty content', () => {
    expect(validateNonEmpty('hello').passed).toBe(true);
  });

  it('fails for empty string', () => {
    expect(validateNonEmpty('').passed).toBe(false);
  });

  it('fails for whitespace-only string', () => {
    expect(validateNonEmpty('   \n\t  ').passed).toBe(false);
  });
});

describe('validateSize', () => {
  it('passes under default limit', () => {
    expect(validateSize('small content').passed).toBe(true);
  });

  it('fails over default limit (15KB)', () => {
    const huge = 'x'.repeat(16000);
    expect(validateSize(huge).passed).toBe(false);
  });

  it('respects custom maxBytes', () => {
    const result = validateSize('hello', 3);
    expect(result.passed).toBe(false);
    expect(result.details.size).toBe(5);
  });
});

describe('validateStructure', () => {
  it('passes when all required sections present', () => {
    expect(validateStructure(VALID_SKILL).passed).toBe(true);
  });

  it('fails when Purpose section missing', () => {
    const content = VALID_SKILL.replace('## Purpose', '## Overview');
    const result = validateStructure(content);
    expect(result.passed).toBe(false);
    expect(result.details.missing).toContain('Purpose');
  });

  it('fails when Procedure section missing', () => {
    const content = VALID_SKILL.replace('## Procedure', '## How It Works');
    const result = validateStructure(content);
    expect(result.passed).toBe(false);
    expect(result.details.missing).toContain('Procedure');
  });

  it('accepts Steps as alternative to Procedure', () => {
    const content = VALID_SKILL.replace('## Procedure', '## Steps');
    expect(validateStructure(content).passed).toBe(true);
  });

  it('fails when Inputs/Outputs section missing', () => {
    const content = '## Purpose\nDo stuff\n\n## Procedure\n1. Step';
    const result = validateStructure(content);
    expect(result.passed).toBe(false);
    expect(result.details.missing).toContain('Inputs/Outputs');
  });
});

describe('validateGrowth', () => {
  it('passes under threshold', () => {
    const original = 'x'.repeat(100);
    const evolved = 'x'.repeat(110); // 10% growth
    expect(validateGrowth(original, evolved).passed).toBe(true);
  });

  it('fails over threshold', () => {
    const original = 'x'.repeat(100);
    const evolved = 'x'.repeat(130); // 30% growth
    const result = validateGrowth(original, evolved);
    expect(result.passed).toBe(false);
  });

  it('respects custom maxGrowthPercent', () => {
    const original = 'x'.repeat(100);
    const evolved = 'x'.repeat(106);
    expect(validateGrowth(original, evolved, 5).passed).toBe(false);
  });

  it('handles empty original (skips check)', () => {
    expect(validateGrowth('', 'new content').passed).toBe(true);
  });

  it('passes when evolved is smaller', () => {
    const original = 'x'.repeat(100);
    const evolved = 'x'.repeat(50);
    expect(validateGrowth(original, evolved).passed).toBe(true);
  });
});

describe('validateAll', () => {
  it('runs all constraints and returns array', () => {
    const results = validateAll(VALID_SKILL);
    expect(results.length).toBeGreaterThanOrEqual(3); // nonEmpty, size, structure
    expect(results.every(r => r.passed)).toBe(true);
  });

  it('includes growth check when baseline provided', () => {
    const results = validateAll(VALID_SKILL, VALID_SKILL);
    const growthResult = results.find(r => r.constraint_id === 'growth_limit');
    expect(growthResult).toBeDefined();
    expect(growthResult!.passed).toBe(true);
  });

  it('reports failures in results array', () => {
    const results = validateAll('');
    expect(results.some(r => !r.passed)).toBe(true);
  });
});
