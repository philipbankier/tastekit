import { describe, expect, it } from 'vitest';
import { detectSkillDrift } from '../detector.js';
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

function errorRun(skillId: string, runId: string): TraceEvent[] {
  return [
    makeEvent({ skill_id: skillId, run_id: runId, event_type: 'plan' }),
    makeEvent({ skill_id: skillId, run_id: runId, event_type: 'error', error: 'failed' }),
  ];
}

function successRun(skillId: string, runId: string): TraceEvent[] {
  return [
    makeEvent({ skill_id: skillId, run_id: runId, event_type: 'plan' }),
    makeEvent({ skill_id: skillId, run_id: runId, event_type: 'tool_call' }),
  ];
}

describe('detectSkillDrift', () => {
  it('generates proposals for skills below success threshold', () => {
    // 3 runs for skill-a, all fail → 0% success rate → below 0.7 threshold
    const events = [
      ...errorRun('skill-a', 'r1'),
      ...errorRun('skill-a', 'r2'),
      ...errorRun('skill-a', 'r3'),
    ];
    const proposals = detectSkillDrift(events);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].skill_id).toBe('skill-a');
    expect(proposals[0].evidence.success_rate).toBe(0);
  });

  it('skips skills with fewer than minRuns', () => {
    // Only 2 runs (default minRuns is 3)
    const events = [
      ...errorRun('skill-a', 'r1'),
      ...errorRun('skill-a', 'r2'),
    ];
    const proposals = detectSkillDrift(events);
    expect(proposals).toHaveLength(0);
  });

  it('respects custom minRuns', () => {
    const events = [
      ...errorRun('skill-a', 'r1'),
      ...errorRun('skill-a', 'r2'),
    ];
    const proposals = detectSkillDrift(events, undefined, { minRuns: 2 });
    expect(proposals).toHaveLength(1);
  });

  it('skips skills above success threshold', () => {
    // 3 successes, 0 failures → 100% success rate → above 0.7 threshold
    const events = [
      ...successRun('skill-a', 'r1'),
      ...successRun('skill-a', 'r2'),
      ...successRun('skill-a', 'r3'),
    ];
    const proposals = detectSkillDrift(events);
    expect(proposals).toHaveLength(0);
  });

  it('respects custom success threshold', () => {
    // 2 succeed, 1 fails → 66% → below custom threshold of 0.9
    const events = [
      ...successRun('skill-a', 'r1'),
      ...successRun('skill-a', 'r2'),
      ...errorRun('skill-a', 'r3'),
    ];
    const proposals = detectSkillDrift(events, undefined, { successThreshold: 0.9 });
    expect(proposals).toHaveLength(1);
  });

  it('confidence increases with distance below threshold', () => {
    // skill-a: 0% success (far below threshold)
    // skill-b: 60% success (just below 0.7 threshold)
    const events = [
      ...errorRun('skill-a', 'r1'),
      ...errorRun('skill-a', 'r2'),
      ...errorRun('skill-a', 'r3'),
      ...successRun('skill-b', 'r4'),
      ...successRun('skill-b', 'r5'),
      ...errorRun('skill-b', 'r6'),
      ...errorRun('skill-b', 'r7'),
      ...successRun('skill-b', 'r8'),
    ];
    const proposals = detectSkillDrift(events, undefined, { successThreshold: 0.7 });

    const proposalA = proposals.find(p => p.skill_id === 'skill-a');
    const proposalB = proposals.find(p => p.skill_id === 'skill-b');

    expect(proposalA).toBeDefined();
    expect(proposalB).toBeDefined();
    expect(proposalA!.confidence).toBeGreaterThan(proposalB!.confidence);
  });

  it('includes suggested_changes in proposals', () => {
    const events = [
      ...errorRun('skill-a', 'r1'),
      ...errorRun('skill-a', 'r2'),
      ...errorRun('skill-a', 'r3'),
    ];
    const proposals = detectSkillDrift(events);
    expect(proposals[0].suggested_changes.length).toBeGreaterThan(0);
  });

  it('sets amendment_type based on failure patterns', () => {
    const events = [
      ...errorRun('skill-a', 'r1'),
      ...errorRun('skill-a', 'r2'),
      ...errorRun('skill-a', 'r3'),
    ];
    const proposals = detectSkillDrift(events);
    // Default amendment type when no specific keywords in failure reasons
    expect(proposals[0].amendment_type).toBeTruthy();
  });

  it('returns empty array when no events provided', () => {
    expect(detectSkillDrift([])).toEqual([]);
  });
});
