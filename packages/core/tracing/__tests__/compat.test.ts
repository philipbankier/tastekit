import { describe, expect, it } from 'vitest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { TraceReader } from '../reader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UNKNOWN_TRACE_FIXTURE = join(
  __dirname,
  '../../../../fixtures/contracts/v1/traces/unknown-fields-and-events.trace.v1.jsonl',
);

describe('TraceReader compatibility', () => {
  it('parses traces with unknown fields and unknown event types without crashing', () => {
    const reader = new TraceReader();
    const events = reader.readTrace(UNKNOWN_TRACE_FIXTURE);

    expect(events.length).toBeGreaterThan(1);
    expect(events[0].schema_version).toBe('trace_event.v1');
    expect((events[1] as any).event_type).toBe('future_event');
    expect((events[1] as any).future_payload).toBeDefined();
  });

  it('continues to support typed filtering for known event types', () => {
    const reader = new TraceReader();
    const events = reader.readTrace(UNKNOWN_TRACE_FIXTURE);
    const toolCalls = reader.filterByEventType(events, 'tool_call');

    expect(toolCalls.length).toBe(1);
    expect(toolCalls[0].event_type).toBe('tool_call');
  });
});
