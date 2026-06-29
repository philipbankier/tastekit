# Artifact Contract v1

## Canonical Paths
All paths are relative to workspace root `.tastekit/`.

- `constitution.v1.json`
- `guardrails.v1.yaml`
- `memory.v1.yaml`
- `skills/manifest.v1.yaml`
- `skills/<skill_id>/SKILL.md`
- `playbooks/<playbook_id>.v1.yaml`
- `derivation.v1.yaml`
- `session.json`
- `traces/<run_id>.trace.v1.jsonl`
- `trust.v1.json`
- `bindings.v1.json`

## Compatibility Read Locations
Validation fixtures and compatibility readers may accept older layout locations when canonical files are absent:

- `self/constitution.v1.json`
- `self/guardrails.v1.yaml`
- `self/memory.v1.yaml`
- `knowledge/skills/manifest.v1.yaml`
- `knowledge/skills/<skill_id>/SKILL.md`
- `knowledge/playbooks/<playbook_id>.v1.yaml`
- `ops/session.json`
- `ops/traces/<run_id>.trace.v1.jsonl`
- `artifacts/constitution.v1.json`
- `artifacts/guardrails.v1.yaml`
- `artifacts/memory.v1.yaml`
- `artifacts/playbooks/*.yaml`
- `skills/manifest.v1.yaml`
- `traces/*.jsonl`
- `artifacts/trust.v1.json` and `artifacts/trust.v1.yaml`
- `artifacts/bindings.v1.json` and `artifacts/bindings.v1.yaml`

## Write Contract
- New writes must target canonical paths.
- Legacy paths are read-compat only.

## Validation Contract
- Artifacts must match existing `*.v1` schemas in `@kairox_ai/tastekit-core/schemas`.
- CI conformance tests enforce strict schema adherence for canonical fixtures.
