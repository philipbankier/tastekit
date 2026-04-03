import { describe, expect, it } from 'vitest';
import { aggregateSkillRuns, getSkillPerformance, rankByFailureRate } from '../tracker.js';
import type { TraceEvent } from '../../schemas/trace.js';

function makeEvent(overrides: Partial<TraceEvent>): TraceEvent {
  return {
    schema_version: 'trace_event.v1',
    run_id: 'run-1',
    timestamp: '2026-02-20T00:00:00.000Z',
    actor: 'agent',
    event_type: 'plan',
    ...overrides,
  };
}

function ts(minutesOffset: number): string {
  return new Date(new Date('2026-02-20T00:00:00.000Z').getTime() + minutesOffset * 60_000).toISOString();
}

describe('aggregateSkillRuns', () => {
  it('groups events by skill_id + run_id', () => {
    const events = [
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'plan' }),
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'tool_call' }),
      makeEvent({ skill_id: 'b', run_id: 'r2', event_type: 'plan' }),
    ];
    const records = aggregateSkillRuns(events);
    expect(records).toHaveLength(2);
    expect(records.map(r => r.skill_id).sort()).toEqual(['a', 'b']);
  });

  it('marks outcome as failure when errors exist', () => {
    const events = [
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'plan' }),
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'error', error: 'boom' }),
    ];
    const records = aggregateSkillRuns(events);
    expect(records[0].outcome).toBe('failure');
    expect(records[0].error_count).toBe(1);
  });

  it('marks outcome as partial on user corrections', () => {
    const events = [
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'approval_response', actor: 'user', data: { approved: false } }),
    ];
    const records = aggregateSkillRuns(events);
    expect(records[0].outcome).toBe('partial');
    expect(records[0].user_corrections).toBe(1);
  });

  it('marks outcome as success when no errors or corrections', () => {
    const events = [
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'plan' }),
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'tool_call' }),
    ];
    const records = aggregateSkillRuns(events);
    expect(records[0].outcome).toBe('success');
  });

  it('calculates duration from first to last event', () => {
    const events = [
      makeEvent({ skill_id: 'a', run_id: 'r1', timestamp: ts(0) }),
      makeEvent({ skill_id: 'a', run_id: 'r1', timestamp: ts(5) }),
    ];
    const records = aggregateSkillRuns(events);
    expect(records[0].duration_ms).toBe(5 * 60_000);
  });

  it('skips events without skill_id', () => {
    const events = [
      makeEvent({ run_id: 'r1', event_type: 'plan' }),
      makeEvent({ skill_id: 'a', run_id: 'r1', event_type: 'plan' }),
    ];
    const records = aggregateSkillRuns(events);
    expect(records).toHaveLength(1);
    expect(records[0].skill_id).toBe('a');
  });

  it('returns empty array for empty events', () => {
    expect(aggregateSkillRuns([])).toEqual([]);
  });

  it('extracts user feedback from quality observations', () => {
    const events = [
      makeEvent({
        skill_id: 'a',
        run_id: 'r1',
        event_type: 'observation',
        observation_category: 'quality',
        data: { description: 'output was too verbose' },
      }),
    ];
    const records = aggregateSkillRuns(events);
    expect(records[0].user_feedback).toBe('output was too verbose');
  });
});

describe('getSkillPerformance', () => {
  it('rolls up success rate and avg duration', () => {
    const records = [
      { skill_id: 'a', run_id: 'r1', timestamp: ts(0), outcome: 'success' as const, error_count: 0, user_corrections: 0, duration_ms: 1000 },
      { skill_id: 'a', run_id: 'r2', timestamp: ts(1), outcome: 'success' as const, error_count: 0, user_corrections: 0, duration_ms: 3000 },
      { skill_id: 'a', run_id: 'r3', timestamp: ts(2), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 500 },
    ];
    const reports = getSkillPerformance(records);
    expect(reports).toHaveLength(1);
    expect(reports[0].total_runs).toBe(3);
    expect(reports[0].success_rate).toBeCloseTo(0.667, 2);
    expect(reports[0].avg_duration_ms).toBe(1500);
  });

  it('aggregates failure reasons', () => {
    const records = [
      { skill_id: 'a', run_id: 'r1', timestamp: ts(0), outcome: 'failure' as const, error_count: 2, user_corrections: 0, duration_ms: 0, user_feedback: 'tool broken' },
      { skill_id: 'a', run_id: 'r2', timestamp: ts(1), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 0, user_feedback: 'tool broken' },
      { skill_id: 'a', run_id: 'r3', timestamp: ts(2), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 0 },
    ];
    const reports = getSkillPerformance(records);
    expect(reports[0].failure_reasons['tool broken']).toBe(2);
    expect(reports[0].failure_reasons['errors:1']).toBe(1);
  });

  it('detects improving trend', () => {
    // 4 records: first 2 fail, second 2 succeed
    const records = [
      { skill_id: 'a', run_id: 'r1', timestamp: ts(0), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 0 },
      { skill_id: 'a', run_id: 'r2', timestamp: ts(1), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 0 },
      { skill_id: 'a', run_id: 'r3', timestamp: ts(2), outcome: 'success' as const, error_count: 0, user_corrections: 0, duration_ms: 0 },
      { skill_id: 'a', run_id: 'r4', timestamp: ts(3), outcome: 'success' as const, error_count: 0, user_corrections: 0, duration_ms: 0 },
    ];
    expect(getSkillPerformance(records)[0].trend).toBe('improving');
  });

  it('detects degrading trend', () => {
    // 4 records: first 2 succeed, second 2 fail
    const records = [
      { skill_id: 'a', run_id: 'r1', timestamp: ts(0), outcome: 'success' as const, error_count: 0, user_corrections: 0, duration_ms: 0 },
      { skill_id: 'a', run_id: 'r2', timestamp: ts(1), outcome: 'success' as const, error_count: 0, user_corrections: 0, duration_ms: 0 },
      { skill_id: 'a', run_id: 'r3', timestamp: ts(2), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 0 },
      { skill_id: 'a', run_id: 'r4', timestamp: ts(3), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 0 },
    ];
    expect(getSkillPerformance(records)[0].trend).toBe('degrading');
  });

  it('returns stable for fewer than 4 records', () => {
    const records = [
      { skill_id: 'a', run_id: 'r1', timestamp: ts(0), outcome: 'failure' as const, error_count: 1, user_corrections: 0, duration_ms: 0 },
    ];
    expect(getSkillPerformance(records)[0].trend).toBe('stable');
  });
});

describe('rankByFailureRate', () => {
  it('sorts worst-first (lowest success rate first)', () => {
    const reports = [
      { skill_id: 'good', total_runs: 10, success_rate: 0.9, avg_duration_ms: 0, failure_reasons: {}, trend: 'stable' as const },
      { skill_id: 'bad', total_runs: 10, success_rate: 0.2, avg_duration_ms: 0, failure_reasons: {}, trend: 'stable' as const },
      { skill_id: 'mid', total_runs: 10, success_rate: 0.5, avg_duration_ms: 0, failure_reasons: {}, trend: 'stable' as const },
    ];
    const ranked = rankByFailureRate(reports);
    expect(ranked.map(r => r.skill_id)).toEqual(['bad', 'mid', 'good']);
  });

  it('does not mutate the original array', () => {
    const reports = [
      { skill_id: 'a', total_runs: 1, success_rate: 0.9, avg_duration_ms: 0, failure_reasons: {}, trend: 'stable' as const },
      { skill_id: 'b', total_runs: 1, success_rate: 0.1, avg_duration_ms: 0, failure_reasons: {}, trend: 'stable' as const },
    ];
    const ranked = rankByFailureRate(reports);
    expect(reports[0].skill_id).toBe('a');
    expect(ranked[0].skill_id).toBe('b');
  });
});
