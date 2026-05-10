# Layout Compatibility Matrix

TasteKit writes the v1 release layout directly under `.tastekit/`:
- `constitution.v1.json`, `guardrails.v1.yaml`, `memory.v1.yaml`
- `skills/`, `playbooks/`, `traces/`, `session.json`
- cross-cutting contracts at workspace root (`trust.v1.json`, `bindings.v1.json`)

Compatibility fixtures still exercise older split layouts (`self/`, `knowledge/`, `ops/`) and legacy `artifacts/` paths where import/replay support needs to remain non-destructive.

## Resolution Contract
- `resolveArtifactPath`: writes and reads flat root artifact files.
- `resolveTracesPath`: writes and reads `traces/`.
- `resolveSkillsPath`: writes and reads `skills/`.
- `resolvePlaybooksPath`: writes and reads `playbooks/`.
- `resolveSessionPath`: writes and reads `session.json`.
- `resolveTrustPath`: writes and reads `trust.v1.json`.
- `resolveBindingsPath`: writes and reads `bindings.v1.json`.

## Required Regression Scenarios
1. Flat v1 workspace compiles and exports.
2. Older split-layout fixtures replay without destructive migration.
3. Mixed workspace behavior preserves existing files and emits current flat artifacts.
4. CLI commands using traces/session/artifacts behave consistently across compatibility fixtures.
5. Trust and bindings writes are canonicalized to root JSON paths.
6. `general-agent` compiles dedicated skills/playbooks in the release layout.

## Fixture Sets
- `fixtures/testing/e2e/v1/` for flat workspace replay.
- `fixtures/testing/e2e/v2/` for three-space replay.
- `fixtures/contracts/v1/` for strict contract conformance fixtures.
