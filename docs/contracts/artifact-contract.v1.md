# Artifact Contract v1

## Canonical Paths
All paths are relative to workspace root `.tastekit/`.

- `self/constitution.v1.json`
- `self/guardrails.v1.yaml`
- `self/memory.v1.yaml`
- `knowledge/skills/manifest.v1.yaml`
- `knowledge/skills/<skill_id>/SKILL.md`
- `knowledge/playbooks/<playbook_id>.v1.yaml`
- `ops/derivation.v1.yaml`
- `ops/session.json`
- `ops/traces/<run_id>.trace.v1.jsonl`
- `trust.v1.json`
- `bindings.v1.json`

## Legacy Read Compatibility
Consumers may read legacy locations when canonical files are absent:

- `artifacts/constitution.v1.json`
- `artifacts/guardrails.v1.yaml`
- `artifacts/memory.v1.yaml`
- `artifacts/playbooks/*.yaml`
- `skills/manifest.v1.yaml`
- `session.json`
- `traces/*.jsonl`
- `artifacts/trust.v1.json` and `artifacts/trust.v1.yaml`
- `artifacts/bindings.v1.json` and `artifacts/bindings.v1.yaml`

## Write Contract
- New writes must target canonical paths.
- Legacy paths are read-compat only.

## Validation Contract
- Artifacts must match existing `*.v1` schemas in `@tastekit/core/schemas`.
- CI conformance tests enforce strict schema adherence for canonical fixtures.
