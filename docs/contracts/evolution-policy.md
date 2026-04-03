# Contract Evolution Policy

## Core Rules
- Prefer additive changes.
- Preserve existing `schema_version` contracts unless a breaking change is unavoidable.
- Keep canonical file paths stable once published internally.

## Runtime vs CI
- Runtime: tolerant parsing for forward compatibility.
- CI: strict contract conformance to prevent accidental drift.

## Breaking Changes
- Breaking changes require:
  - a new schema version
  - fixture updates
  - explicit migration notes
  - dedicated PR scope

## Wave CH-1 Defaults
- No schema version bumps.
- Immediate cutover to canonical root JSON for trust/bindings.
- Legacy locations remain read-compatible only.
