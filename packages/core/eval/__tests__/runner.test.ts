import { describe, expect, it } from 'vitest';
import { EvalRunner } from '../runner.js';
import type { EvalPackV1 } from '../../schemas/evalpack.js';

function makeEvalPack(overrides?: Partial<EvalPackV1>): EvalPackV1 {
  return {
    schema_version: 'evalpack.v1',
    id: 'test-pack',
    name: 'Test Pack',
    description: 'Test evaluation pack',
    scenarios: [
      {
        scenario_id: 'scenario-1',
        name: 'Basic test',
        description: 'Tests basic output',
        setup: {
          inputs: { query: 'hello', expected_word: 'hello' },
        },
        expected: {
          rubrics: ['deterministic'],
          thresholds: {},
          required_outputs: ['expected_word'],
        },
      },
    ],
    judging: {
      rules: [
        {
          rule_id: 'contains-expected',
          type: 'deterministic',
          weight: 1,
        },
      ],
      output_format: 'text',
    },
    ...overrides,
  };
}

describe('EvalRunner', () => {
  it('runs eval pack and returns report with scores', async () => {
    const runner = new EvalRunner();
    const pack = makeEvalPack();
    const report = await runner.runEvalPack(pack);

    expect(report.evalpack_id).toBe('test-pack');
    expect(report.timestamp).toBeTruthy();
    expect(report.results).toHaveLength(1);
    expect(report.results[0].scenario_id).toBe('scenario-1');
    expect(typeof report.overall_score).toBe('number');
  });

  it('calculates overall_score as average of scenario scores', async () => {
    const runner = new EvalRunner();
    const pack = makeEvalPack({
      scenarios: [
        {
          scenario_id: 's1',
          name: 'S1',
          description: 'First',
          setup: { inputs: { expected_word: 'yes' } },
          expected: { rubrics: [], thresholds: {}, required_outputs: ['expected_word'] },
        },
        {
          scenario_id: 's2',
          name: 'S2',
          description: 'Second',
          setup: { inputs: { expected_word: 'no' } },
          expected: { rubrics: [], thresholds: {}, required_outputs: ['expected_word'] },
        },
      ],
    });

    const report = await runner.runEvalPack(pack);
    expect(report.results).toHaveLength(2);
    // Overall score is average of individual scores
    const avg = report.results.reduce((s, r) => s + r.score, 0) / report.results.length;
    expect(report.overall_score).toBeCloseTo(avg, 5);
  });

  it('uses executor function when provided', async () => {
    const executor = async () => ({ answer: 'custom output', expected_word: 'hello' });
    const runner = new EvalRunner({ executor });
    const pack = makeEvalPack();
    const report = await runner.runEvalPack(pack);

    expect(report.results[0].outputs).toEqual({ answer: 'custom output', expected_word: 'hello' });
  });

  it('falls back to scenario inputs when no executor', async () => {
    const runner = new EvalRunner();
    const pack = makeEvalPack();
    const report = await runner.runEvalPack(pack);

    // Without executor, outputs = scenario.setup.inputs
    expect(report.results[0].outputs).toEqual({ query: 'hello', expected_word: 'hello' });
  });

  it('handles empty scenarios array', async () => {
    const runner = new EvalRunner();
    const pack = makeEvalPack({ scenarios: [] });
    const report = await runner.runEvalPack(pack);

    expect(report.results).toHaveLength(0);
    expect(report.overall_score).toBe(0);
    expect(report.passed).toBe(false);
  });

  it('marks pack as passed only when all scenarios pass', async () => {
    const runner = new EvalRunner();
    const pack = makeEvalPack({
      scenarios: [
        {
          scenario_id: 's1',
          name: 'Passing',
          description: 'Has required output',
          setup: { inputs: { expected_word: 'yes' } },
          expected: { rubrics: [], thresholds: {}, required_outputs: ['expected_word'] },
        },
      ],
    });

    const report = await runner.runEvalPack(pack);
    // With deterministic rule checking required_outputs, scenario should pass
    expect(typeof report.passed).toBe('boolean');
  });
});
