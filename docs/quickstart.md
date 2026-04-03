# Quick Start Guide

This guide walks you through the complete TasteKit workflow: initialize, interview, compile, and export.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [pnpm](https://pnpm.io/) v8 or later
- An LLM API key (Anthropic, OpenAI, or local Ollama) for the onboarding interview

## 1. Installation

```bash
git clone https://github.com/tastekit/tastekit.git
cd tastekit
pnpm install
pnpm build
```

## 2. Initialize a Workspace

```bash
tastekit init
```

The init command walks you through three choices:

1. **Domain** — What type of agent are you building? (Content, Development, Research, Sales, or Support)
2. **Depth** — How thorough should the interview be? (quick ~5 min, guided ~15 min, or operator ~30 min)
3. **LLM Provider** — Auto-detects from environment variables, or lets you choose manually

This creates a `.tastekit/` directory with the workspace structure:

```
.tastekit/
├── tastekit.yaml          # Workspace configuration
├── artifacts/             # Compiled artifacts (after step 4)
├── skills/                # Skills library (after step 4)
└── traces/                # Agent trace logs (during operation)
```

You can also skip the interactive prompts:

```bash
tastekit init --domain content-agent --depth guided
```

## 3. Run the Onboarding Interview

```bash
tastekit onboard
```

The LLM-driven interviewer will have a conversation with you about your preferences, exploring dimensions specific to your chosen domain. It adapts based on your answers — if you give a brief response, it moves on; if you show nuance, it digs deeper.

Special commands during the interview:
- `/save` — Save progress and quit (resume later with `tastekit onboard --resume`)
- `/skip` — Skip the current topic

The interview saves state to `.tastekit/session.json` after every answer, so you can safely quit and resume.

## 4. Compile Artifacts

```bash
tastekit compile
```

The compiler reads your session and generates:

| Artifact | Description |
|:---|:---|
| `constitution.v1.json` | Your principles, tone, tradeoffs, evidence policy, and taboos |
| `guardrails.v1.yaml` | Permissions, approval rules, and rate limits |
| `memory.v1.yaml` | Write policy, retention rules, and consolidation schedule |
| `skills/manifest.v1.yaml` | Skills index with metadata for each skill |
| `skills/<id>/SKILL.md` | Progressive disclosure skill files |
| `playbooks/*.yaml` | Domain-specific execution plans |

## 5. Export for Your Runtime

```bash
# For Claude Code
tastekit export --target claude-code

# For OpenClaw
tastekit export --target openclaw

# For Manus
tastekit export --target manus --out ./manus-profile

# Generate an AGENTS.md
tastekit export --target agents-md

# Generate a Letta Agent File
tastekit export --target agent-file
```

Each adapter translates TasteKit's universal artifacts into the format the target runtime understands.

## 6. (Optional) Bind MCP Tools

If your agent needs tools (web search, file access, APIs), add them via MCP:

```bash
# Add an MCP server (stdio command or HTTP URL)
tastekit mcp add npx --name filesystem --args "-y,@modelcontextprotocol/server-filesystem,."

# See what tools it offers
tastekit mcp inspect filesystem

# Bind tools and auto-generate guardrails
tastekit mcp bind
```

Bindings are saved to `.tastekit/bindings.v1.json`. Guardrails are automatically generated from tool risk annotations.

## 7. (Optional) Set Up Trust

Pin your tool sources so nothing changes without your knowledge:

```bash
# Initialize trust policy
tastekit trust init

# Pin an MCP server fingerprint
tastekit trust pin-mcp https://example.com/mcp --fingerprint sha256:abc123

# Audit for violations
tastekit trust audit
```

## What's Next?

Your TasteKit profile is compiled and ready to use. As your agent runs, it generates trace files in `.tastekit/ops/traces/` (with legacy fallback to `.tastekit/traces/`). Use these for ongoing maintenance:

- **List skills**: `tastekit skills list` — see your generated skills in a table
- **Detect drift**: `tastekit drift detect` — analyze traces for behavioral drift
- **Run evals**: `tastekit eval run` — run evaluation packs against your profile
- **Audit trust**: `tastekit trust audit` — check tool source integrity
- **Import existing profiles**: `tastekit import --target soul-md --source SOUL.md` — bring in OpenClaw profiles
- **Shell completion**: `eval "$(tastekit completion bash)"` — enable tab completion

For machine-readable output, add `--json` to any command. For debug logging, add `--verbose`.
