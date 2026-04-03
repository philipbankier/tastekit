import { describe, it, expect } from 'vitest';
import { Judge } from '../judge.js';

// ─── Deterministic Rule Tests ───

describe('Judge - deterministic rules', () => {
  const judge = new Judge();

  it('passes when required_outputs are present as object keys', async () => {
    const results = await judge.judgeOutputs(
      { summary: 'hello', score: 0.9 },
      {
        rules: [{ rule_id: 'r1', type: 'deterministic', weight: 1 }],
        output_format: 'json',
      },
      {
        rubrics: ['quality'],
        thresholds: { quality: 0.8 },
        required_outputs: ['summary', 'score'],
      }
    );
    expect(results[0].passed).toBe(true);
    expect(results[0].score).toBe(1.0);
  });

  it('fails when required_outputs are missing', async () => {
    const results = await judge.judgeOutputs(
      { summary: 'hello' },
      {
        rules: [{ rule_id: 'r1', type: 'deterministic', weight: 1 }],
        output_format: 'json',
      },
      {
        rubrics: ['quality'],
        thresholds: { quality: 0.8 },
        required_outputs: ['summary', 'missing_field'],
      }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('missing_field');
  });

  it('passes for non-empty output when no required_outputs', async () => {
    const results = await judge.judgeOutputs(
      'some output text',
      {
        rules: [{ rule_id: 'r1', type: 'deterministic', weight: 1 }],
        output_format: 'text',
      },
      {
        rubrics: ['quality'],
        thresholds: { quality: 0.5 },
      }
    );
    expect(results[0].passed).toBe(true);
  });

  it('fails for empty output', async () => {
    const results = await judge.judgeOutputs(
      '',
      {
        rules: [{ rule_id: 'r1', type: 'deterministic', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('empty');
  });

  it('checks rubric pattern in output', async () => {
    const results = await judge.judgeOutputs(
      'The quality of this analysis is excellent',
      {
        rules: [{ rule_id: 'r1', type: 'deterministic', pattern: 'quality', weight: 1 }],
        output_format: 'text',
      },
      {
        rubrics: ['quality'],
        thresholds: { quality: 0.8 },
      }
    );
    expect(results[0].passed).toBe(true);
  });
});

// ─── Regex Rule Tests ───

describe('Judge - regex rules', () => {
  const judge = new Judge();

  it('passes when regex matches output', async () => {
    const results = await judge.judgeOutputs(
      'The answer is 42',
      {
        rules: [{ rule_id: 'r1', type: 'regex', pattern: '\\d+', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(true);
    expect(results[0].score).toBe(1.0);
  });

  it('fails when regex does not match', async () => {
    const results = await judge.judgeOutputs(
      'no numbers here',
      {
        rules: [{ rule_id: 'r1', type: 'regex', pattern: '\\d+', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].score).toBe(0);
  });

  it('fails when no pattern is provided', async () => {
    const results = await judge.judgeOutputs(
      'anything',
      {
        rules: [{ rule_id: 'r1', type: 'regex', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('No pattern');
  });

  it('handles complex regex patterns', async () => {
    const results = await judge.judgeOutputs(
      '{"name": "test", "value": 123}',
      {
        rules: [{ rule_id: 'r1', type: 'regex', pattern: '"name":\\s*"\\w+"', weight: 1 }],
        output_format: 'json',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(true);
  });
});

// ─── Schema Rule Tests ───

describe('Judge - schema rules', () => {
  const judge = new Judge();

  it('passes when output matches JSON schema', async () => {
    const schema = JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    });

    const results = await judge.judgeOutputs(
      { name: 'Alice', age: 30 },
      {
        rules: [{ rule_id: 'r1', type: 'schema', pattern: schema, weight: 1 }],
        output_format: 'json',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(true);
  });

  it('fails when required field is missing', async () => {
    const schema = JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });

    const results = await judge.judgeOutputs(
      { age: 30 },
      {
        rules: [{ rule_id: 'r1', type: 'schema', pattern: schema, weight: 1 }],
        output_format: 'json',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('Schema validation failed');
  });

  it('fails when no schema pattern provided', async () => {
    const results = await judge.judgeOutputs(
      { name: 'test' },
      {
        rules: [{ rule_id: 'r1', type: 'schema', weight: 1 }],
        output_format: 'json',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('No schema pattern');
  });

  it('handles array type schema', async () => {
    const schema = JSON.stringify({
      type: 'array',
      items: { type: 'string' },
    });

    const results = await judge.judgeOutputs(
      ['hello', 'world'],
      {
        rules: [{ rule_id: 'r1', type: 'schema', pattern: schema, weight: 1 }],
        output_format: 'json',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(true);
  });
});

// ─── LLM Judge Tests (without provider) ───

describe('Judge - llm_judge without provider', () => {
  const judge = new Judge(); // No LLM provider

  it('fails when no LLM provider is set', async () => {
    const results = await judge.judgeOutputs(
      'test output',
      {
        rules: [{ rule_id: 'r1', type: 'llm_judge', template: 'Rate this: {{output}}', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('LLMJudgeProvider');
  });
});

// ─── LLM Judge Tests (with mock provider) ───

describe('Judge - llm_judge with mock provider', () => {
  it('parses score from LLM response', async () => {
    const mockProvider = {
      complete: async () => 'This output is good. Score: 0.85. Pass.',
    };
    const judge = new Judge(mockProvider);

    const results = await judge.judgeOutputs(
      'test output',
      {
        rules: [{ rule_id: 'r1', type: 'llm_judge', template: 'Rate: {{output}}', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(true);
    expect(results[0].score).toBeCloseTo(0.85);
  });

  it('uses pass/fail signals when no score present', async () => {
    const mockProvider = {
      complete: async () => 'This output has passed the quality check.',
    };
    const judge = new Judge(mockProvider);

    const results = await judge.judgeOutputs(
      'test output',
      {
        rules: [{ rule_id: 'r1', type: 'llm_judge', template: 'Rate: {{output}}', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(true);
  });

  it('fails when LLM response indicates failure', async () => {
    const mockProvider = {
      complete: async () => 'Score: 0.3. This output failed the quality check.',
    };
    const judge = new Judge(mockProvider);

    const results = await judge.judgeOutputs(
      'bad output',
      {
        rules: [{ rule_id: 'r1', type: 'llm_judge', template: 'Rate: {{output}}', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].score).toBeCloseTo(0.3);
  });

  it('fails when llm_judge has no template', async () => {
    const mockProvider = { complete: async () => 'ok' };
    const judge = new Judge(mockProvider);

    const results = await judge.judgeOutputs(
      'test',
      {
        rules: [{ rule_id: 'r1', type: 'llm_judge', weight: 1 }],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('template');
  });
});

// ─── Multiple Rules ───

describe('Judge - multiple rules', () => {
  const judge = new Judge();

  it('evaluates all rules and returns results for each', async () => {
    const results = await judge.judgeOutputs(
      'The result is 42',
      {
        rules: [
          { rule_id: 'det', type: 'deterministic', weight: 1 },
          { rule_id: 'reg', type: 'regex', pattern: '42', weight: 1 },
        ],
        output_format: 'text',
      },
      { rubrics: [], thresholds: {} }
    );
    expect(results.length).toBe(2);
    expect(results[0].rule_id).toBe('det');
    expect(results[1].rule_id).toBe('reg');
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
  });
});
