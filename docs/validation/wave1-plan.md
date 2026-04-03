# Wave-1 TasteKit Validation Plan

## Goal
Validate TasteKit usability and reliability on three production-relevant domains before new feature expansion.

## Current Status
- Last full interactive rerun: 2026-02-23 (`codex/tastekit-wave1-closure-p1p2`)
- Status: Wave-1 closure complete (no open P0/P1 from original backlog)

## Locked Scope
- Domains:
  - `development-agent`
  - `content-agent`
  - `research-agent`
- Method: hybrid scripted + manual UX walkthrough
- Realism: hybrid live LLM onboarding + deterministic fixture replay
- Runtime targets: `claude-code`, `openclaw`, `manus`

## Validation Matrix
| Domain | Live Interview Evidence | Deterministic Replay | Export Targets | Manual UX Checks |
|---|---|---|---|---|
| development-agent | `logs/init.log`, `logs/onboard.log`, `logs/onboard-resume.log` | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | `/save`, `/resume`, `/skip`, prompt clarity |
| content-agent | `logs/init.log`, `logs/onboard.log`, `logs/onboard-resume.log` | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | `/save`, `/resume`, `/skip`, prompt clarity |
| research-agent | `logs/init.log`, `logs/onboard.log`, `logs/onboard-resume.log` | `scripts/validation/wave1-check.sh` replay on committed fixture | claude-code, openclaw, manus | `/save`, `/resume`, `/skip`, prompt clarity |

## Fixture Layout
- Root: `fixtures/validation/wave1/domains/<domain>/workspace/`
- Includes per domain:
  - `.tastekit/ops/session.json` (sanitized canonical path)
  - generated artifacts under `.tastekit/self`, `.tastekit/knowledge`, `.tastekit/ops`
  - deterministic synthetic traces in `.tastekit/ops/traces/*.trace.v1.jsonl` (legacy `.tastekit/traces/` tolerated for compatibility tests)
  - exports under `exports/{claude-code,openclaw,manus}`
  - run logs under `logs/`

## Execution Flow
1. Build and test workspace:
   - `pnpm install`
   - `pnpm -r build`
   - `pnpm --filter @tastekit/core test`
   - `pnpm --filter @tastekit/cli build`
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

## Pass Criteria
- All three domains complete end-to-end (`init -> onboard -> compile -> skills graph -> export`).
- Resume/interruption paths (`/save`, `/resume`, `/skip`) are observed in logs.
- Replay script passes across fixtures.
- Findings are recorded with severity (`P0`, `P1`, `P2`) and next PR slices.

## Notes
- Wave-1 is stabilization and validation only. Historical `P0/P1` fixes are expected to land before starting feature expansion.
- AutoClaw implementation work remains deferred while local Go toolchain is unavailable.
