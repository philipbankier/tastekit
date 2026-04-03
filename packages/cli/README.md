# @actrun_ai/tastekit-cli

CLI for [TasteKit](https://github.com/philipbankier/tastekit) — compile your taste into portable AI agent artifacts.

**One interview. 32+ compatible runtimes.**

## Install

```bash
# Use directly (no install)
npx @actrun_ai/tastekit-cli init

# Or install globally
npm install -g @actrun_ai/tastekit-cli
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

## Domains

| Domain | Dimensions | Description |
|--------|-----------|-------------|
| General Agent | 6-18 | Cross-functional agent configuration |
| Development Agent | 9-28 | Engineering philosophy, code quality, testing, commits |
| Content Agent | 7-23 | Brand voice, editorial standards, publishing |
| Research Agent | 7-25 | Methodology, source evaluation, synthesis |
| Sales Agent | 7-25 | Sales philosophy, objection handling, pipeline |
| Support Agent | 7-25 | Escalation criteria, empathy, SLA targets |

Each domain supports 3 depth tiers: quick (~5 min), guided (~15 min), operator (~30 min).

## Output

After `compile`, your `.tastekit/` directory contains:

```
.tastekit/
├── self/constitution.v1.json      # Principles, tone, tradeoffs, taboos
├── self/guardrails.v1.yaml        # Permissions, approvals, rate limits
├── self/memory.v1.yaml            # Retention policy, salience rules
├── knowledge/skills/              # SKILL.md files (Agent Skills standard)
├── knowledge/playbooks/           # Multi-step workflows
└── ops/derivation.v1.yaml         # Compilation state
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

- Core library: [`@actrun_ai/tastekit-core`](https://www.npmjs.com/package/@actrun_ai/tastekit-core)
- Adapters: [`@actrun_ai/tastekit-adapters`](https://www.npmjs.com/package/@actrun_ai/tastekit-adapters)
- Voice: [`@actrun_ai/tastekit-voice`](https://www.npmjs.com/package/@actrun_ai/tastekit-voice)

## License

MIT
