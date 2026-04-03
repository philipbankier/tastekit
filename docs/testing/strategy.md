# TasteKit Testing Strategy

## Goals
- Keep pull request validation deterministic and under 10 minutes.
- Catch compatibility regressions across v1 flat layout and v2 three-space layout.
- Validate every CLI command/subcommand with both success and failure paths.
- Keep live-model checks out of PR gating and run them only pre-release.

## Test Layers
1. Unit tests (`packages/core/**/__tests__`)
   - Pure logic modules (compiler, interview, drift, trust, MCP binder/client boundaries, layout resolution).
2. Adapter tests (`packages/adapters/__tests__`)
   - Export behavior and artifact compatibility for all adapters.
3. CLI integration tests (`packages/cli/tests/integration`)
   - Process-level command execution with temporary workspaces and deterministic fixtures.
   - Includes first-class `general-agent` init coverage.
4. Contract conformance tests (`scripts/validation/contract-conformance.sh`)
   - Canonical contract fixtures and strict schema checks.
   - Path canonicalization assertions for trust/bindings/session contracts.
   - Runtime-tolerant trace parsing compatibility checks.
5. Deterministic e2e replay (`scripts/validation/pr-gate.sh`)
   - Full workspace compile/export/replay checks against committed fixtures.
   - Verifies compatibility with hidden `.tastekit` fixture workspaces checked into git.
6. Live pre-release smoke (`scripts/validation/pre-release-live-ollama.sh`)
   - Real onboarding and compile with Ollama, evidence logged for release readiness.

## Ownership
- `packages/core`: correctness and backward compatibility logic.
- `packages/adapters`: export/import compatibility and runtime-target expectations.
- `packages/cli`: user-facing command semantics, exit codes, and recovery paths.
- `scripts/validation`: release gate behavior and pipeline health.

## Release Gates
### Required on PR
- `pnpm -r build`
- `pnpm --filter @tastekit/core test`
- `pnpm --filter @tastekit/adapters test`
- `pnpm --filter @tastekit/cli test`
- `bash scripts/validation/contract-conformance.sh`
- `bash scripts/validation/pr-gate.sh`

### Required pre-release
- `bash scripts/validation/pre-release-live-ollama.sh`

## Non-goals for this wave
- No schema version changes.
- No forced hosted-provider live checks.
- No multi-agent orchestration validation in TasteKit.
