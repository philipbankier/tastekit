# Wave-1 Validation Report

## Run Metadata
- Date: 2026-02-23
- Branch: `codex/tastekit-wave1-closure-p1p2`
- Fixture root: `fixtures/validation/wave1/domains/`
- Live provider used: local Ollama (`huihui_ai/qwen3-vl-abliterated:8b-instruct`)
- API keys were not required for this wave.

## Scope Completed
- Domains validated:
  - `development-agent`
  - `content-agent`
  - `research-agent`
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

## Evidence Pointers
- Development agent:
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/init.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/onboard.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/onboard-resume.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/compile.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/skills-graph.json`
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

## Domain Outcomes
| Domain | Init | Onboard (Live) | Resume Flow | Compile | Skills Graph | Exports |
|---|---|---|---|---|---|---|
| development-agent | Pass | Pass (`Connected to ollama`) | Pass (`Resuming previous session`, `/skip`, `/save`) | Pass (`--resume`) | Pass | Pass (3/3) |
| content-agent | Pass | Pass (`Connected to ollama`) | Pass (`Resuming previous session`, `/skip`, `/save`) | Pass (`--resume`) | Pass | Pass (3/3) |
| research-agent | Pass | Pass (`Connected to ollama`) | Pass (`Resuming previous session`, `/skip`, `/save`) | Pass (`--resume`) | Pass | Pass (3/3) |

## Findings

### Open P0/P1
- None.

### Open P2
- None introduced in this rerun.

## Backlog Resolution (Commit References)
1. Drift trace path mismatch (`.tastekit/traces` vs `.tastekit/ops/traces`) resolved in `835b82a`.
2. Canonical session path (`.tastekit/ops/session.json`) resolved in `9e8bca5`.
3. `onboard --provider` now preserves configured model/base URL/API env for same-provider override in `9d404d9`.
4. Nested command `--json` and `--verbose` flag ergonomics fixed in `9d404d9`.
5. `init` now persists explicit Ollama model selection (env-first, installed-model fallback) in `9d404d9`.

## Recommendation
Wave-1 closure criteria are satisfied. Proceed with Track B (`autoManage` B1 scaffold) on a fresh `codex/*` branch from `main`.
