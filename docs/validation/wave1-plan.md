# Wave-1 TasteKit Validation Plan

## Goal
Validate TasteKit usability and reliability on the shipped production domains before new feature expansion.

## Current Status
- Last two-domain historical rerun: 2026-02-23 (`codex/tastekit-wave1-closure-p1p2`)
- Six-domain release gate update: 2026-05-10
- Status: Release gate scope expanded to all six production domains. Final release signoff requires a green run after the domain registry and generated assets for all six domains are present.

## Locked Scope
- Domains:
  - `development-agent`
  - `general-agent`
  - `content-agent`
  - `research-agent`
  - `sales-agent`
  - `support-agent`
- Method: hybrid scripted + manual UX walkthrough
- Realism: hybrid live LLM onboarding + deterministic fixture replay
- Runtime targets: `claude-code`, `openclaw`, `manus`

## Validation Matrix
| Domain | Live Interview Evidence | Deterministic Replay | Export Targets | Manual UX Checks |
|---|---|---|---|---|
| development-agent | `logs/init.log`, `logs/onboard.log`, `logs/onboard-resume.log` | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | `/save`, `/resume`, `/skip`, prompt clarity |
| general-agent | `docs/validation/openclaw-general-agent.md` plus release fixture replay | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | prompt clarity, compile/export parity |
| content-agent | `logs/init.log`, `logs/onboard.log`, `logs/onboard-resume.log` | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | content workflow prompt clarity, evidence boundaries |
| research-agent | `logs/init.log`, `logs/onboard.log`, `logs/onboard-resume.log` | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | source-quality prompts, citation expectations |
| sales-agent | release fixture replay, live Ollama pre-release run | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | external outreach approval, commercial-claim escalation |
| support-agent | release fixture replay, live Ollama pre-release run | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | privacy prompts, incident/billing/security escalation |

## Fixture Layout
- Root: `fixtures/validation/wave1/domains/<domain>/workspace/`
- Includes per domain:
  - `.tastekit/session.json` (sanitized canonical path)
  - generated artifacts under `.tastekit/` plus compatibility split-layout artifacts where available
  - deterministic synthetic traces in `.tastekit/traces/*.trace.v1.jsonl` where generated fixtures are present
  - exports under `exports/{claude-code,openclaw,manus}` where generated fixtures are present
  - run logs under `logs/` where generated fixtures are present
  - replay-generated canonical `.tastekit/constitution.v1.json` during gate execution

## Execution Flow
1. Build and test workspace:
   - `pnpm install`
   - `pnpm -r build`
   - `pnpm --filter @actrun_ai/tastekit-core test`
   - `pnpm --filter @actrun_ai/tastekit-cli build`
2. Domain run (live + scripted):
   - `tastekit init --domain <domain> --depth guided`
   - `tastekit onboard --provider ollama` (live interactive, `/save`)
   - `tastekit onboard --resume --provider ollama` (`/skip` then `/save`)
   - `tastekit compile --resume`
   - `tastekit skills graph`
   - `tastekit export --target <adapter>` for all adapters in scope
3. Drift loop sanity:
   - write synthetic traces
   - `tastekit drift detect`
4. Deterministic replay:
   - run `scripts/validation/wave1-check.sh`
   - confirms all six release-domain fixtures compile to `.tastekit/constitution.v1.json`, guardrails, memory, skills, playbooks, and all three exports
5. Pre-release live smoke:
   - run `scripts/validation/pre-release-live-ollama.sh`
   - confirms all six domains initialize, connect to Ollama, replay a session, compile, graph skills, and export

## Pass Criteria
- All six production domains complete end-to-end (`init -> onboard -> compile -> skills graph -> export`).
- Resume/interruption paths (`/save`, `/resume`, `/skip`) are observed in logs.
- Replay script passes across v1/v2 layout fixtures and all six release-domain fixtures.
- Findings are recorded with severity (`P0`, `P1`, `P2`) and next PR slices.

## Notes
- Wave-1 is stabilization and validation only. Historical `P0/P1` fixes are expected to land before starting feature expansion.
- AutoClaw implementation work remains deferred while local Go toolchain is unavailable.
- Sales and support fixtures are seed sessions until generated domain assets land from the parallel domain-module workers; the deterministic gate intentionally fails if those domains are not registered and able to compile.
