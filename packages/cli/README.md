# @kairox_ai/tastekit-cli

Pre-1.0 CLI for [TasteKit](https://github.com/philipbankier/tastekit) — compile human taste into portable AI agent artifacts.

**One interview. 32+ compatible runtimes.**

TasteKit is still pre-1.0. Treat this package as a serious release candidate, not a battle-tested stable runtime contract.

## Install

```bash
# Use directly (no install)
npx @kairox_ai/tastekit-cli init

# Or install globally
npm install -g @kairox_ai/tastekit-cli
```

## Quick Start

```bash
# 1. Create a workspace (pick domain + depth + LLM provider)
tastekit init

# 2. Run the LLM-driven onboarding interview
tastekit onboard

# 3. Compile your taste into artifacts
tastekit compile

# 4. Export to your runtime
tastekit export --target claude-code
tastekit export --target openclaw
tastekit export --target agents-md
```

## Commands

| Command | What it does |
|---------|-------------|
| `tastekit init` | Create workspace. Pick domain, depth, LLM provider |
| `tastekit onboard` | LLM-driven adaptive interview (voice mode optional) |
| `tastekit compile` | Generate artifacts from session (supports `--resume`) |
| `tastekit export` | Export to claude-code, openclaw, manus, autopilots, agents-md, agent-file |
| `tastekit skills` | list, lint, graph, pack, report, inspect, history, rollback |
| `tastekit drift` | detect, review, accept, reject — behavioral drift monitoring |
| `tastekit mcp` | add, list, inspect, bind — MCP tool management |
| `tastekit trust` | init, pin-mcp, pin-skill-source, audit |
| `tastekit eval` | run, replay — evaluation packs |
| `tastekit import` | Import from SOUL.md or Agent File (.af) |
| `tastekit completion` | Shell completions for bash, zsh, fish |

## Runtime Compatibility

TasteKit's direct exports cover Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, and Agent File. The "32+ compatible runtimes" claim comes from combining those direct adapters with the broader AGENTS.md ecosystem: any agent or tool that reads AGENTS.md can consume the generated operating contract even when it does not have a dedicated TasteKit adapter.

## Domains

| Domain | Dimensions | Description |
|--------|-----------|-------------|
| General Agent | 6-18 | Cross-functional agent configuration |
| Development Agent | 9-28 | Engineering philosophy, code quality, testing, commits |
| Content Agent | 7-23 | Brand voice, editorial standards, publishing |
| Research Agent | 7-25 | Methodology, source evaluation, synthesis |
| Sales Agent | 7-25 | Sales philosophy, objection handling, pipeline |
| Support Agent | 7-25 | Escalation criteria, empathy, SLA targets |

Each domain supports three depth tiers: Quick, Guided, and Full Taste Composition. Full is coverage-driven rather than time-boxed.

## Output

After `compile`, your `.tastekit/` directory contains:

```
.tastekit/
├── constitution.v1.json           # Principles, tone, tradeoffs, taboos
├── guardrails.v1.yaml             # Permissions, approvals, rate limits
├── memory.v1.yaml                 # Retention policy, salience rules
├── skills/                        # SKILL.md files
├── playbooks/                     # Multi-step workflows
└── derivation.v1.yaml             # Compilation state
```

After `export --target claude-code`:

```
export/
├── CLAUDE.md                      # System instructions
├── .claude/settings.local.json    # Hooks + permissions + defaultMode
├── .tastekit/hooks/*.sh           # 5 lifecycle hooks
└── skills/                        # Agent Skills-compatible directory
```

## Part of TasteKit

- Core library: [`@kairox_ai/tastekit-core`](https://www.npmjs.com/package/@kairox_ai/tastekit-core)
- Adapters: [`@kairox_ai/tastekit-adapters`](https://www.npmjs.com/package/@kairox_ai/tastekit-adapters)
- Validator: [`@kairox_ai/tastekit-validator`](https://www.npmjs.com/package/@kairox_ai/tastekit-validator)
- Voice: [`@kairox_ai/tastekit-voice`](https://www.npmjs.com/package/@kairox_ai/tastekit-voice)

## License

MIT
