# Contract Pack (Wave CH-1)

This directory defines the canonical machine contracts between TasteKit and downstream consumers (AutoClaw, autoManage).

## Contract Files
- `artifact-contract.v1.md`: canonical artifact paths, formats, and compatibility rules.
- `skills-graph-contract.v1.md`: skill manifest graph relationship contract and analyzer outputs.
- `telemetry-contract.v1.md`: trace event contract and runtime parsing policy.
- `evolution-policy.md`: additive evolution rules and CI conformance expectations.

## Contract Policy
- Runtime behavior is forward-compatible and tolerant.
- CI conformance is strict and deterministic.
- No schema version bumps are introduced in Wave CH-1.
