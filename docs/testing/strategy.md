# TasteKit Testing Strategy

## Goals
- Keep pull request validation deterministic and under 10 minutes.
- Catch compatibility regressions across the canonical flat v1 layout and older split-layout compatibility fixtures.
- Validate every CLI command/subcommand with both success and failure paths.
- Keep live-model checks out of PR gating and run them only for pre-release evidence or review demos.
- Prove real product value with at least one unscripted Full Taste Composition run before publishing, not only schema validity.

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
   - Replays release-domain fixtures for development, general, content, research, sales, and support.
6. Skill bundle checks (`scripts/skill-bundle/sync.mjs --check`)
   - Verifies `skills/tastekit/` frontmatter, referenced files, schema copy parity, generated rubric references, and bundle size policy.
7. Live pre-release smoke (`scripts/validation/pre-release-live-ollama.sh`)
   - Real provider connectivity and deterministic session replay with Ollama across all six production domains, evidence logged for release readiness.
8. Live Full Taste Composition E2E (`pnpm test:live-e2e:release`)
   - GPT-5.5 interviewer and judge plus GLM-5.1 simulated human.
   - Runs an unscripted Full Taste Composition, compiles, validates, exports, checks managed-region safety, runs skills/trust/drift/eval commands, and writes report/demo/transcript evidence.
   - This is not a PR gate because it depends on live providers and subjective quality.

## Ownership
- `packages/core`: correctness and backward compatibility logic.
- `packages/adapters`: export/import compatibility and runtime-target expectations.
- `packages/cli`: user-facing command semantics, exit codes, and recovery paths.
- `scripts/validation`: release gate behavior and pipeline health.

## Release Gates
### Required on PR
- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm -r build`
- `pnpm lint`
- `node scripts/skill-bundle/sync.mjs --check`
- `bash scripts/validation/contract-conformance.sh`
- `bash scripts/validation/pr-gate.sh`

### Required pre-release
- `bash scripts/validation/pre-release-live-ollama.sh`
- `pnpm test:live-e2e:release`
- dry-run package packs for all publishable `@actrun_ai/*` packages

The deterministic and live release gates must remain aligned in meaning, but not in exact runtime shape. If docs claim a production domain, deterministic replay must enumerate it. If docs claim real Full Taste Composition quality, the live E2E evidence must prove it with real model calls.

### Review Evidence

The current subscription-backed live demo at `docs/validation/live/subscription-demo-grok-glm-20260517-180758/` passed and is useful product evidence. It used Grok 4.3 through local CLIProxyAPI for interviewer/judge and GLM-5.1 through Z.ai for the simulated human. It is not publishable release evidence because the strict release route requires official GPT-5.5 plus GLM-5.1.

## Non-goals for this wave
- No schema version changes.
- No hosted-provider live checks in ordinary PR gating.
- No multi-agent orchestration validation in TasteKit.
