# Wave-1 Validation Report

## Run Metadata
- Updated: 2026-05-10
- Previous two-domain run: 2026-02-23 on `codex/tastekit-wave1-closure-p1p2`
- Fixture root: `fixtures/validation/wave1/domains/`
- Required live provider: local Ollama
- API keys are not required for this wave.

## Release Scope
- Production domains in release scope:
  - `development-agent`
  - `general-agent`
  - `content-agent`
  - `research-agent`
  - `sales-agent`
  - `support-agent`
- End-to-end flow executed per domain:
  - `init --domain <domain> --depth guided`
  - `onboard --provider ollama` (live interactive + `/save`)
  - `onboard --resume --provider ollama` (`/skip` + `/save`)
  - `compile --resume`
  - `skills graph`
  - `export --target claude-code`
  - `export --target openclaw`
  - `export --target manus`
- Deterministic replay gate retained:
  - `scripts/validation/wave1-check.sh`

## Current Gate Definition
- `scripts/validation/wave1-check.sh` now replays all six committed release-domain fixtures and asserts canonical `.tastekit/constitution.v1.json`, guardrails, memory, skills, playbooks, and exports for `claude-code`, `openclaw`, and `manus`.
- `scripts/validation/pre-release-live-ollama.sh` now enumerates all six domains for live provider connectivity plus deterministic session replay.
- `.github/workflows/release.yml` runs the deterministic six-domain gate before contract conformance and publish.

## Evidence Pointers
- Development agent:
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/init.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/onboard.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/onboard-resume.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/compile.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/skills-graph.json`
- General agent:
  - `docs/validation/openclaw-general-agent.md`
  - `packages/core/domains/__tests__/general-agent.test.ts`
  - `packages/core/compiler/__tests__/general-agent.test.ts`
- Content agent:
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/init.log`
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/onboard.log`
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/onboard-resume.log`
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/compile.log`
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/skills-graph.json`
- Research agent:
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/init.log`
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/onboard.log`
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/onboard-resume.log`
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/compile.log`
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/skills-graph.json`
- Sales agent:
  - `fixtures/validation/wave1/domains/sales-agent/workspace/.tastekit/ops/session.json`
- Support agent:
  - `fixtures/validation/wave1/domains/support-agent/workspace/.tastekit/ops/session.json`
- Live pre-release smoke:
  - `docs/validation/live/pre-release-live-20260510-170451.md` (ignored run artifact)

## Domain Outcomes
| Domain | Fixture | Live Ollama | Compile | Skills Graph | Exports | Status |
|---|---|---|---|---|---|---|
| development-agent | Generated fixture present | Historical pass | Required by gate | Required by gate | Required by gate | Release gate owner: deterministic replay |
| general-agent | Seed fixture present | Required by gate | Required by gate | Required by gate | Required by gate | Release gate owner: deterministic replay |
| content-agent | Generated fixture present | Historical pass | Required by gate | Required by gate | Required by gate | Release gate owner: deterministic replay |
| research-agent | Generated fixture present | Historical pass | Required by gate | Required by gate | Required by gate | Release gate owner: deterministic replay |
| sales-agent | Seed fixture present | Passed | Passed | Passed | Passed | Release gate owner: deterministic replay + live smoke |
| support-agent | Seed fixture present | Passed | Passed | Passed | Passed | Release gate owner: deterministic replay + live smoke |

## Findings

### Open P0/P1
- None.

### Open P2
- Sales/support currently use seed session fixtures. Replace them with richer captured logs after broader manual onboarding E2E, if we want historical UX evidence beyond deterministic replay.

## Backlog Resolution (Commit References)
1. Drift trace path compatibility (`.tastekit/traces` plus older `.tastekit/ops/traces`) resolved in `835b82a`.
2. Session path compatibility (`.tastekit/session.json` plus older `.tastekit/ops/session.json`) resolved in `9e8bca5`.
3. `onboard --provider` now preserves configured model/base URL/API env for same-provider override in `9d404d9`.
4. Nested command `--json` and `--verbose` flag ergonomics fixed in `9d404d9`.
5. `init` now persists explicit Ollama model selection (env-first, installed-model fallback) in `9d404d9`.

## Recommendation
Do not tag the production release until `scripts/validation/wave1-check.sh`, `scripts/validation/contract-conformance.sh`, and the live Ollama smoke all pass with the six-domain registry. This pass met that bar on May 10, 2026; rerun it immediately before tagging.
