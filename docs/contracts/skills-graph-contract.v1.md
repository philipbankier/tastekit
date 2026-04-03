# Skills Graph Contract v1

## Source Artifact
- Canonical source: `knowledge/skills/manifest.v1.yaml`
- Schema: `skills_manifest.v1`

## Graph Relationship Fields
Optional per-skill fields:
- `prerequisites: string[]`
- `feeds_into: string[]`
- `alternatives: string[]`
- `pipeline_phase: string`
- `context_model: "inherit" | "fork"`
- `model_hint: string`

## Analyzer Expectations
`tastekit skills graph` must report:
- total node/edge counts
- cycle detection
- orphan skill detection
- missing references across graph fields
- pipeline extraction and density summary

## Compatibility
- Missing relationship fields must remain valid.
- Unknown additional fields in manifest entries are tolerated at runtime and ignored by graph derivation logic unless explicitly adopted.
