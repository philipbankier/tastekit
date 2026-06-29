# TasteKit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/philipbankier/tastekit/actions/workflows/ci.yml/badge.svg)](https://github.com/philipbankier/tastekit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kairox_ai/tastekit-cli.svg)](https://www.npmjs.com/package/@kairox_ai/tastekit-cli)

**Compile your taste into portable agent artifacts.**

TasteKit is an open-source CLI, library, and native agent skill for capturing how a person wants an AI agent to reason, challenge, research, plan, write, and act. It runs an adaptive onboarding interview, compiles the result into versioned artifacts, and exports those artifacts to agent runtimes including Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, and Agent File.

TasteKit is currently **pre-1.0**. The `0.2.x` line is intended for early adopters and OSS review, not for users who need a battle-tested stable contract.

## Why TasteKit?

AI agents are powerful, but they usually start from generic instructions. TasteKit turns a user's taste, operating principles, boundaries, and domain preferences into durable runtime context. Instead of repeating the same preferences in every system prompt, compile them once and export everywhere:

- **One interview, many runtimes** — Your taste works in Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, and Agent File
- **Agent-native onboarding** — Use the CLI or drop in the `skills/tastekit/` skill and let a capable agent guide the setup
- **Depth control** — Choose Quick, Guided, or Full Taste Composition; Guided is the default, Full is coverage-driven rather than time-boxed
- **Drift detection** — Know when an agent's behavior drifts from your preferences over time (no other OSS tool does this)
- **Trust & provenance** — Pin MCP server fingerprints to prevent silent tool changes
- **Domain expertise** — Pre-built rubrics, skills, and playbooks for 6 agent domains
- **Broad compatibility** — Direct adapters plus AGENTS.md and Agent File compatibility reach the broader 32+ agent/runtime ecosystem

## Features

- **LLM-driven onboarding** — Adaptive interview that explores preferences across domain-specific dimensions, confirmation loops, assumptions, conflicts, and metacognitive pacing
- **Native skill bundle** — `skills/tastekit/` provides a thin-router agent skill with generated rubric references and runtime templates
- **6 agent domains** — General, Content, Development, Research, Sales, and Support agents with specialized rubrics and skills
- **Taste composition extensions** — Rich interview output is preserved in `constitution.v1.json` under `x-tastekit-composition` and `x-tastekit-metacognition`
- **Artifact-first compilation** — Everything compiles into JSON/YAML files; adapters map files to runtime format
- **Managed-region runtime files** — Re-runs update only the TasteKit-managed block in `CLAUDE.md`, `SOUL.md`, and `AGENTS.md`
- **Skills with progressive disclosure** — SKILL.md files with three tiers: minimal context (always loaded), on-invoke, and on-demand
- **MCP-first tool binding** — Discover, inspect, and bind tools via Model Context Protocol
- **Trust & provenance** — Pin MCP server fingerprints and skill sources; audit for violations
- **Trace-first logging** — Every agent run produces machine-readable JSONL traces
- **Drift detection** — Detect when agent behavior drifts from your taste profile over time
- **Evaluation system** — Run eval packs with deterministic, regex, schema, and LLM judges
- **Multi-format interop** — Import from SOUL.md and Agent File (.af); export to AGENTS.md and 4 runtime adapters

## Installation

```bash
# Install globally via npm
npm install -g @kairox_ai/tastekit-cli

# Or use directly with npx
npx @kairox_ai/tastekit-cli init
```

### Development Setup

```bash
git clone https://github.com/philipbankier/tastekit.git
cd tastekit
pnpm install
pnpm build
```

## Quick Start

```bash
# 1. Initialize workspace — pick your domain and interview depth
tastekit init

# 2. Run the LLM-driven onboarding interview
tastekit onboard

# 3. Compile taste into artifacts
tastekit compile

# 4. Export for your runtime
tastekit export --target claude-code
tastekit export --target openclaw

# 5. (Optional) Add MCP tools
tastekit mcp add npx --name filesystem --args "-y,@modelcontextprotocol/server-filesystem,."
tastekit mcp inspect filesystem
tastekit mcp bind

# 6. (Optional) Manage over time
tastekit drift detect
tastekit eval run --pack .tastekit/evals/tone-check.yaml
tastekit trust audit
```

## Testing and Validation

TasteKit uses a layered test stack:
- Core unit tests
- Adapter compatibility tests
- CLI integration tests
- Native skill bundle checks
- Deterministic fixture replay gates (`v1` + `v2` workspace layouts)
- Subscription-backed live demo evidence for product review
- Strict GPT-5.5 + GLM-5.1 live evidence as a manual pre-release evidence gate

Run the deterministic PR gate locally:

```bash
bash scripts/validation/pr-gate.sh
```

Run the strict live evidence sequence when official provider keys are available:

```bash
pnpm test:live-e2e:release
```

Testing docs:
- `docs/testing/strategy.md`
- `docs/testing/command-matrix.md`
- `docs/testing/layout-compatibility.md`
- `docs/testing/release-verification.md`
- `docs/validation/live/README.md`

Review artifact:
- `docs/demo/tastekit-release-readiness-one-pager.html`

## CLI Commands

| Command | Description |
|:---|:---|
| `tastekit init` | Initialize workspace with domain and depth selection |
| `tastekit onboard` | Run LLM-driven onboarding interview |
| `tastekit compile` | Compile taste artifacts from session |
| `tastekit export` | Export to Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, or Agent File |
| `tastekit import` | Import from SOUL.md or Agent File (.af) |
| `tastekit mcp add\|list\|inspect\|bind` | Manage MCP server bindings |
| `tastekit skills list\|lint\|pack` | Manage skills library |
| `tastekit trust init\|pin-mcp\|pin-skill-source\|audit` | Manage trust and provenance |
| `tastekit drift detect\|apply\|memory-consolidate` | Drift detection and memory management |
| `tastekit eval run\|replay` | Run evaluations and replay traces |
| `tastekit completion [bash\|zsh\|fish]` | Generate shell completions |

All commands support `--json` for machine-readable output and `--verbose` for debug logging.

## Generated Artifacts

After running `tastekit compile`, TasteKit writes the v1 release layout directly under `.tastekit/`. Older split layouts are still read for compatibility, but new writes target the canonical flat paths.

```
.tastekit/
├── tastekit.yaml              # Workspace configuration
├── session.json               # Resumable onboarding state
├── constitution.v1.json       # Principles, tone, tradeoffs, trace map, extensions
├── guardrails.v1.yaml         # Permissions, approvals, rate limits
├── memory.v1.yaml             # Write policy, retention, consolidation
├── bindings.v1.json           # MCP tool bindings
├── trust.v1.json              # Pinned MCP and skill provenance
├── derivation.v1.yaml         # Compile resume state
├── skills/
│   ├── manifest.v1.yaml       # Skills index with metadata
│   └── <skill-id>/SKILL.md    # Progressive disclosure skill files
├── playbooks/                 # Domain-specific execution plans
├── traces/                    # JSONL trace files from agent runs
├── evals/                     # Evaluation packs and results
└── drift/                     # Drift proposals
```

Runtime exports use managed regions in Markdown files so hand-written content outside TasteKit blocks is preserved on re-run.

## Agent Domains

TasteKit includes six first-class domains, each with specialized rubrics, interview dimensions, skills, playbooks, and validation fixtures:

| Domain | Focus |
|:---|:---|
| General Agent | Mixed technical and non-technical work, planning, synthesis, and decision support |
| Development Agent | Code review, debugging, testing, refactoring, and engineering documentation |
| Content Agent | Brand voice, editorial drafting, channel adaptation, and publishing boundaries |
| Research Agent | Source discovery, evidence grading, synthesis, and competitive analysis |
| Sales Agent | Account research, qualification, buyer-facing follow-up, and deal-risk escalation |
| Support Agent | Troubleshooting, customer communication, privacy-safe assistance, and escalation |

Each domain supports Quick, Guided, and Full Taste Composition depths. General Agent can also opt into `development`, `content`, `research`, `sales`, and `support` capability packs when one broad agent needs task-specific workflows. Deterministic validation gates enumerate all six domains; strict live evidence is currently centered on Full Taste Composition for `general-agent`.

### What "32+ Compatible Runtimes" Means

TasteKit does not ship 32 dedicated adapters. The compatibility claim is the combination of:

- Direct runtime adapters: Claude Code, OpenClaw, Manus, and Autopilots.
- Generic exports: AGENTS.md and Agent File.
- The broader AGENTS.md ecosystem: agents and coding tools that read AGENTS.md can consume TasteKit's generated operating contract without a dedicated adapter.

## Project Structure

```
tastekit/
├── packages/
│   ├── core/          # Core library (schemas, compiler, skills, MCP, trust, tracing, drift, eval)
│   ├── cli/           # Command-line interface
│   └── adapters/      # Runtime adapters (Claude Code, Manus, OpenClaw, Autopilots)
├── examples/          # Example agent projects
├── docs/              # Documentation
│   ├── overview.md    # Architecture and concepts
│   ├── quickstart.md  # Getting started guide
│   ├── schemas.md     # Artifact schema reference
│   ├── skills.md      # Skills and progressive disclosure
│   ├── mcp.md         # MCP integration guide
│   ├── security.md    # Trust model and threat analysis
│   ├── tracing.md     # Trace format and replay
│   ├── domains.md     # Domain system architecture
│   ├── testing/       # Test strategy and coverage matrices
│   ├── adapters/      # Per-adapter guides
│   └── domains/       # Per-domain deep dives
└── community/         # Contributing guidelines and RFCs
```

## Design Principles

1. **Artifact-first** — Everything compiles into files; adapters only map files to runtime format
2. **Deterministic compilation** — Same inputs produce same artifacts (LLM calls recorded/hashed)
3. **Progressive disclosure** — Global taste summary is small; skills pull deeper context only when invoked
4. **MCP-first** — Tool binding uses MCP; no custom tool protocol in core
5. **Trust-by-default** — Pin MCP servers and skill sources; no silent enabling of new tools
6. **Trace-first** — All runs produce machine-readable traces; evals operate on traces
7. **Maintenance is v1** — Drift detection, consolidation, and staleness checks are core features

## License

MIT

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./community/CONTRIBUTING.md) for guidelines.
