import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  DriftDetector,
  aggregateObservations,
  aggregateTensions,
  shouldTriggerReview,
} from '../detector.js';
import type { TraceEvent } from '../../schemas/trace.js';

function makeEvent(overrides: Partial<TraceEvent>): TraceEvent {
  return {
    schema_version: 'trace_event.v1',
    run_id: 'run-1',
    timestamp: '2026-02-20T00:00:00.000Z',
    actor: 'agent',
    event_type: 'plan',
    data: {},
    ...overrides,
  };
}

function plusMinutes(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60_000).toISOString();
}

describe('DriftDetector signal coverage', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  function setup(): { detector: DriftDetector; writeTrace: (events: TraceEvent[]) => string; dir: string } {
    const dir = mkdtempSync(join(tmpdir(), 'tastekit-drift-'));
    tempDirs.push(dir);

    return {
      detector: new DriftDetector(),
      dir,
      writeTrace: (events: TraceEvent[]) => {
        const path = join(dir, `trace-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
        writeFileSync(path, events.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
        return path;
      },
    };
  }

  it('detects repeated_edit proposals', () => {
    const { detector, writeTrace } = setup();
    const trace = writeTrace([
      makeEvent({ actor: 'user', event_type: 'approval_response', data: { approved: false, reason: 'unsafe write' } }),
      makeEvent({ actor: 'user', event_type: 'approval_response', data: { approved: false, reason: 'unsafe write' } }),
      makeEvent({ actor: 'user', event_type: 'approval_response', data: { approved: false, reason: 'unsafe write' } }),
    ]);

    const proposals = detector.detectFromTraces([trace]);
    expect(proposals.some(p => p.signal_type === 'repeated_edit')).toBe(true);
  });

  it('detects principle_violation proposals from error accumulation', () => {
    const { detector, writeTrace } = setup();
    const trace = writeTrace([
      makeEvent({ event_type: 'error', error: 'timeout' }),
      makeEvent({ event_type: 'error', error: 'bad parse' }),
      makeEvent({ event_type: 'error', error: 'tool crash' }),
    ]);

    const proposals = detector.detectFromTraces([trace]);
    expect(proposals.some(p => p.signal_type === 'principle_violation')).toBe(true);
  });

  it('detects user_correction proposals from quick user rewrites', () => {
    const { detector, writeTrace } = setup();
    const base = new Date('2026-02-20T00:00:00.000Z');
    const events: TraceEvent[] = [];

    for (let i = 0; i < 3; i++) {
      events.push(
        makeEvent({
          timestamp: plusMinutes(base, i * 10),
          actor: 'agent',
          event_type: 'artifact_written',
          data: { path: `file-${i}.md` },
        }),
      );
      events.push(
        makeEvent({
          timestamp: plusMinutes(base, i * 10 + 1),
          actor: 'user',
          event_type: 'artifact_written',
          data: { path: `file-${i}.md` },
        }),
      );
    }

    const trace = writeTrace(events);
    const proposals = detector.detectFromTraces([trace]);
    expect(proposals.some(p => p.signal_type === 'user_correction')).toBe(true);
  });

  it('detects tool_change proposals when many tools are used for one skill', () => {
    const { detector, writeTrace } = setup();
    const trace = writeTrace([
      makeEvent({ event_type: 'tool_call', skill_id: 'analysis', tool_ref: 'repo:read' }),
      makeEvent({ event_type: 'tool_call', skill_id: 'analysis', tool_ref: 'web:search' }),
      makeEvent({ event_type: 'tool_call', skill_id: 'analysis', tool_ref: 'db:query' }),
    ]);

    const proposals = detector.detectFromTraces([trace]);
    expect(proposals.some(p => p.signal_type === 'tool_change')).toBe(true);
  });

  it('detects staleness proposals based on constitution age', () => {
    const { detector, writeTrace, dir } = setup();
    const trace = writeTrace([
      makeEvent({ timestamp: '2026-02-20T00:00:00.000Z' }),
    ]);

    const constitutionPath = join(dir, 'constitution.v1.json');
    writeFileSync(
      constitutionPath,
      JSON.stringify({
        schema_version: 'constitution.v1',
        generated_at: '2025-01-01T00:00:00.000Z',
      }),
      'utf-8',
    );

    const proposals = detector.detectFromTraces([trace], { constitutionPath });
    expect(proposals.some(p => p.signal_type === 'staleness')).toBe(true);
  });

  it('detects coverage_gap proposals for unknown skills and tools', () => {
    const { detector, writeTrace } = setup();
    const trace = writeTrace([
      makeEvent({ skill_id: 'unknown-skill-1' }),
      makeEvent({ skill_id: 'unknown-skill-2' }),
      makeEvent({ tool_ref: 'unknown-server:unknown-tool' }),
    ]);

    const proposals = detector.detectFromTraces([trace], {
      knownSkillIds: ['known-skill'],
      knownToolRefs: ['known-server:known-tool'],
    });

    expect(proposals.some(p => p.signal_type === 'coverage_gap')).toBe(true);
  });

  it('detects assertion_mismatch proposals from principle-linked errors', () => {
    const { detector, writeTrace } = setup();
    const trace = writeTrace([
      makeEvent({ event_type: 'error', error: 'violation-1', principle_refs: ['p_no_delete'] }),
      makeEvent({ event_type: 'error', error: 'violation-2', principle_refs: ['p_no_delete'] }),
      makeEvent({ event_type: 'error', error: 'violation-3', principle_refs: ['p_no_delete'] }),
    ]);

    const proposals = detector.detectFromTraces([trace]);
    expect(proposals.some(p => p.signal_type === 'assertion_mismatch')).toBe(true);
  });
});

describe('observation and tension aggregation', () => {
  it('aggregates observation and tension totals and triggers review thresholds', () => {
    const events: TraceEvent[] = [];

    for (let i = 0; i < 10; i++) {
      events.push(makeEvent({ event_type: 'observation', observation_category: i % 2 === 0 ? 'process' : 'friction' }));
    }
    for (let i = 0; i < 5; i++) {
      events.push(
        makeEvent({
          event_type: 'tension',
          tension: {
            description: `Tension ${i}`,
            involves: ['p1'],
            status: 'pending',
          },
        }),
      );
    }

    const observations = aggregateObservations(events);
    const tensions = aggregateTensions(events);

    expect(observations.total).toBe(10);
    expect(observations.by_category.process).toBe(5);
    expect(tensions.pending).toBe(5);
    expect(shouldTriggerReview(observations, tensions)).toBe(true);
  });

  it('does not trigger review below thresholds', () => {
    const events: TraceEvent[] = [
      makeEvent({ event_type: 'observation', observation_category: 'quality' }),
      makeEvent({
        event_type: 'tension',
        tension: {
          description: 'Minor tension',
          involves: ['p1'],
          status: 'pending',
        },
      }),
    ];

    const observations = aggregateObservations(events);
    const tensions = aggregateTensions(events);
    expect(shouldTriggerReview(observations, tensions)).toBe(false);
  });
});
