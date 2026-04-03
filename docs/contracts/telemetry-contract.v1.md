# Telemetry Contract v1

## Canonical Trace Location
- `ops/traces/<run_id>.trace.v1.jsonl`

## Trace Record Shape
- Schema key: `schema_version: "trace_event.v1"`
- Required core fields: `schema_version`, `run_id`, `timestamp`, `actor`, `event_type`
- Optional event payload fields remain event-specific.

## Runtime Parsing Policy
- Readers must parse JSONL records without failing on unknown fields.
- Readers may retain unknown fields for downstream tooling.
- Unknown `event_type` values are tolerated at runtime parsing layer.

## CI Conformance Policy
- Canonical conformance fixtures use known event types and must pass strict schema validation.
- Compatibility fixtures with future/unknown event types are expected to fail strict schema validation while still parsing at runtime.
