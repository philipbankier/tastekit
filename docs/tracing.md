# Tracing

TasteKit is built with a **trace-first** philosophy. This means that every significant action taken by the system or an agent is recorded as a structured, machine-readable event. These traces are the foundation for debugging, evaluation, and drift detection.

## The `trace.v1.jsonl` Format

All traces are stored in `.tastekit/traces/` as `.jsonl` files (one JSON object per line). Each line in the file is a `trace_event.v1` object that captures a single moment in the agent's lifecycle.

Each trace event contains the following key fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `schema_version` | String | The version of the trace event schema, e.g., `trace_event.v1`. |
| `run_id` | String | A unique identifier for the entire execution run. |
| `timestamp` | String | An ISO 8601 timestamp of when the event occurred. |
| `actor` | String | Who performed the action: `agent`, `user`, or `system`. |
| `skill_id` | String | The ID of the skill being executed, if any. |
| `event_type` | String | The type of event, such as `tool_call`, `approval_requested`, or `error`. |
| `tool_ref` | String | The reference to the MCP tool being called, if applicable. |
| `input_hash` | String | A hash of the input data for the event, used for reproducibility. |
| `output_hash` | String | A hash of the output data. |
| `data` | Object | A payload containing event-specific data, such as tool parameters or output content. |

## Why Trace-First?

A trace-first approach provides several powerful advantages:

-   **Observability**: Traces provide a complete, step-by-step record of an agent's execution, making it easy to understand *why* it made a particular decision.
-   **Debuggability**: When an agent behaves unexpectedly, the trace log is the first place to look. It shows the exact sequence of tool calls, inputs, and outputs that led to the issue.
-   **Reproducibility**: By capturing hashes of inputs and outputs, traces make it possible to reproduce a specific run for testing or analysis.
-   **Evaluation**: Evaluation packs (`evalpacks`) operate on traces, comparing the actual execution against a set of expected outcomes and rubrics.
-   **Drift Detection**: The `tastekit drift detect` command consumes trace files to identify patterns of failure, user corrections, or repeated errors that indicate the agent's behavior is drifting away from the user's intent.

## The Tracer Module

The `@tastekit/core` library includes a `Tracer` class that makes it easy to write trace events from anywhere in the system. It handles the creation of the trace file, the injection of metadata like the `run_id` and `timestamp`, and the serialization of events to the JSONL format.

```typescript
import { Tracer } from '@tastekit/core';

const tracer = new Tracer('./.tastekit');

tracer.traceToolCall('local-tools:file-writer', { path: './output.txt', content: 'Hello' });
// ... tool executes ...
tracer.traceToolResult('local-tools:file-writer', { success: true });
```

## Replaying Traces

TasteKit also includes a `Replay` module that can take an existing trace file and "replay" it against a new or updated taste profile. This is a powerful regression testing tool. It allows you to check if a change to your constitution or guardrails would have altered the outcome of a past run, helping you catch unintended consequences before they happen.
