# TasteKit Quick Reference

Fast commands for working in the current standalone TasteKit release checkout.

## Install And Build

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm -r build
```

Use the CLI from source while developing:

```bash
node packages/cli/dist/cli.js --help
```

After publishing, users can run:

```bash
npx @actrun_ai/tastekit-cli --help
```

## Core Workflow

```bash
# Create a workspace and choose domain/depth/provider
tastekit init

# Non-interactive initialization
tastekit init --domain general-agent --depth guided

# Run or resume onboarding
tastekit onboard
tastekit onboard --resume

# Full Taste Composition aliases
tastekit onboard --depth full
tastekit onboard --depth full-taste-composition

# Compile artifacts
tastekit compile

# Export runtime files
tastekit export --target claude-code
tastekit export --target openclaw --out ./openclaw-profile
tastekit export --target manus --out ./manus-profile
tastekit export --target agents-md --out .
tastekit export --target agent-file --out ./agent-file
```

## Production Domains

- `general-agent`
- `development-agent`
- `content-agent`
- `research-agent`
- `sales-agent`
- `support-agent`

Depths:

| Depth | Best For |
|:---|:---|
| Quick | Fast useful setup and prototypes |
| Guided | Recommended default for serious first use |
| Full Taste Composition | Coverage-driven comprehensive onboarding |

## Canonical Workspace Layout

```text
.tastekit/
├── tastekit.yaml
├── session.json
├── constitution.v1.json
├── guardrails.v1.yaml
├── memory.v1.yaml
├── bindings.v1.json
├── trust.v1.json
├── derivation.v1.yaml
├── skills/
├── playbooks/
├── traces/
├── evals/
└── drift/
```

Compatibility readers still accept older split layouts, but new writes target the flat v1 paths above.

## Maintenance Commands

```bash
tastekit skills list
tastekit skills graph --json
tastekit trust audit --json
tastekit drift detect --json
tastekit eval run --pack .tastekit/evals/tone-check.yaml --format json
tastekit eval replay --trace .tastekit/traces/run.trace.v1.jsonl --json
```

## MCP Commands

```bash
tastekit mcp add npx --name filesystem --args "-y,@modelcontextprotocol/server-filesystem,."
tastekit mcp list
tastekit mcp inspect filesystem
tastekit mcp bind
```

## Native Skill

The native skill source of truth is:

```text
skills/tastekit/
```

It supports Claude Code and Hermes/artifact-style outputs, asks for domain and depth, reads prior `CLAUDE.md`/`AGENTS.md`/`SOUL.md` as hypotheses, and writes canonical `.tastekit/session.json` state.

## Validation

```bash
pnpm test
pnpm -r build
pnpm lint
node scripts/skill-bundle/sync.mjs --check
bash scripts/validation/pr-gate.sh
```

Live evidence:

```bash
pnpm test:live-e2e:mock
pnpm test:live-e2e:subscription-demo
pnpm test:live-e2e:release
```

See `docs/testing/release-verification.md` before publishing.
