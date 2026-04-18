import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { TraceReader } from '../reader.js';
import { Tracer } from '../tracer.js';
import { hashObject } from '../../utils/hash.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY_FIXTURE = join(__dirname, '../../../../fixtures/testing/traces/replay.jsonl');

function makeWorkspace(): string {
  return mkdtempSync(join(tmpdir(), 'tastekit-tracer-'));
}

describe('Tracer', () => {
  const workspaces: string[] = [];

  afterEach(() => {
    for (const workspace of workspaces.splice(0)) {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('emits plan, think, tool_call, tool_result, and error events', () => {
    const workspace = makeWorkspace();
    workspaces.push(workspace);

    const tracer = new Tracer(workspace, 'emit-events');
    const reader = new TraceReader();

    tracer.tracePlan({ steps: ['inspect', 'edit'] });
    tracer.traceThink({ note: 'checking state' }, 'skill.trace');
    tracer.traceToolCall('shell', { command: 'pwd' }, 'skill.trace', 'step-1');
    tracer.traceToolResult('shell', { stdout: '/tmp/workspace' }, 'skill.trace', 'step-1');
    tracer.traceError(new Error('boom'), { phase: 'tool_result' });

    const tracePath = join(workspace, 'traces', 'emit-events.trace.v1.jsonl');
    const events = reader.readTrace(tracePath);

    expect(events.map(event => event.event_type)).toEqual([
      'plan',
      'think',
      'tool_call',
      'tool_result',
      'error',
    ]);

    expect(events[0]).toMatchObject({
      schema_version: 'trace_event.v1',
      run_id: 'emit-events',
      actor: 'agent',
      event_type: 'plan',
      data: { steps: ['inspect', 'edit'] },
    });
    expect(events[1]).toMatchObject({
      actor: 'agent',
      event_type: 'think',
      skill_id: 'skill.trace',
      data: { note: 'checking state' },
    });
    expect(events[2]).toMatchObject({
      actor: 'agent',
      event_type: 'tool_call',
      tool_ref: 'shell',
      skill_id: 'skill.trace',
      step_id: 'step-1',
      input_hash: hashObject({ command: 'pwd' }),
    });
    expect(events[3]).toMatchObject({
      actor: 'agent',
      event_type: 'tool_result',
      tool_ref: 'shell',
      skill_id: 'skill.trace',
      step_id: 'step-1',
      output_hash: hashObject({ stdout: '/tmp/workspace' }),
    });
    expect(events[4]).toMatchObject({
      actor: 'system',
      event_type: 'error',
      error: 'boom',
    });
  });

  it('writes many events to the JSONL trace file', () => {
    const workspace = makeWorkspace();
    workspaces.push(workspace);

    const tracer = new Tracer(workspace, 'many-events');
    const reader = new TraceReader();

    for (let index = 0; index < 100; index += 1) {
      tracer.traceThink({ index });
    }

    const tracePath = join(workspace, 'traces', 'many-events.trace.v1.jsonl');
    const raw = readFileSync(tracePath, 'utf-8');
    const lines = raw.trim().split('\n');
    const events = reader.readTrace(tracePath);

    expect(existsSync(tracePath)).toBe(true);
    expect(lines).toHaveLength(100);
    expect(events).toHaveLength(100);
    expect(events[0]).toMatchObject({
      event_type: 'think',
      data: { index: 0 },
    });
    expect(events[99]).toMatchObject({
      event_type: 'think',
      data: { index: 99 },
    });
  });

  it('replays the provided JSONL fixture with TraceReader', () => {
    const reader = new TraceReader();
    const events = reader.readTrace(REPLAY_FIXTURE);

    expect(events).toHaveLength(5);
    expect(events[0] as any).toMatchObject({
      trace_id: 'trc-1',
      skill_id: 'code-review',
      tool_name: 'shell',
      error_message: '',
    });
    expect(events[4] as any).toMatchObject({
      trace_id: 'trc-5',
      skill_id: 'unknown-skill',
      tool_name: 'custom-tool',
      error_message: 'tool failure',
    });
  });

  it('produces consistent hashes for identical tool_call inputs', () => {
    const workspace = makeWorkspace();
    workspaces.push(workspace);

    const tracer = new Tracer(workspace, 'hash-consistency');
    const reader = new TraceReader();
    const input = { command: 'ls', args: ['-la'], cwd: '/tmp' };

    tracer.traceToolCall('shell', input, 'skill.trace', 'step-1');
    tracer.traceToolCall('shell', input, 'skill.trace', 'step-2');

    const tracePath = join(workspace, 'traces', 'hash-consistency.trace.v1.jsonl');
    const events = reader.readTrace(tracePath);

    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe('tool_call');
    expect(events[1].event_type).toBe('tool_call');
    expect(events[0].input_hash).toBe(events[1].input_hash);
    expect(events[0].input_hash).toBe(hashObject(input));
  });
});
