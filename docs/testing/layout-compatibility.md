# Layout Compatibility Matrix

TasteKit supports:
- `v1` flat layout (`.tastekit/artifacts`, `.tastekit/traces`, `.tastekit/session.json`)
- `v2` three-space layout (`.tastekit/self`, `.tastekit/knowledge`, `.tastekit/ops`)
- canonical cross-cutting contracts at workspace root (`.tastekit/trust.v1.json`, `.tastekit/bindings.v1.json`)

## Resolution Contract
- `resolveArtifactPath`: prefers v2, falls back to v1.
- `resolveTracesPath`: prefers `ops/traces`, falls back to `traces`.
- `resolveSkillsPath`: prefers `knowledge/skills`, falls back to `skills`.
- `resolvePlaybooksPath`: prefers `knowledge/playbooks`, falls back to `artifacts/playbooks`.
- `resolveSessionPath`: prefers `ops/session.json`, falls back to `session.json`.
- `resolveTrustPath`: prefers `trust.v1.json`, falls back to root YAML and legacy `artifacts/` locations.
- `resolveBindingsPath`: prefers `bindings.v1.json`, falls back to root YAML and legacy `artifacts/` locations.

## Required Regression Scenarios
1. v2 workspace with no legacy files uses v2 paths.
2. v1 workspace without v2 directories still compiles and exports.
3. mixed workspace (both layouts present) always prefers v2.
4. migration helper preserves existing files and is non-destructive.
5. CLI commands using traces/session/artifacts behave identically across layouts.
6. Trust and bindings writes are canonicalized to root JSON paths.
7. `general-agent` compiles dedicated skills/playbooks in both fixture layouts.

## Fixture Sets
- `fixtures/testing/e2e/v1/` for flat workspace replay.
- `fixtures/testing/e2e/v2/` for three-space replay.
- `fixtures/contracts/v1/` for strict contract conformance fixtures.
