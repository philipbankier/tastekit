# TasteKit Setup Guide

This guide covers local development setup for the standalone TasteKit repo and a practical first workspace.

## Requirements

- Node.js 20 or 22 for release-parity development.
- pnpm via Corepack.
- Optional live provider access for onboarding:
  - Anthropic, OpenAI-compatible, or local Ollama for ordinary CLI onboarding.
  - Official GPT-5.5 plus Z.ai GLM-5.1 for strict live release evidence.

## Local Checkout

```bash
git clone https://github.com/philipbankier/tastekit.git
cd tastekit
corepack enable
pnpm install --frozen-lockfile
pnpm -r build
```

Run the CLI from source:

```bash
node packages/cli/dist/cli.js --help
```

During development you can use a shell alias:

```bash
alias tastekit="node $PWD/packages/cli/dist/cli.js"
```

## Create A Workspace

```bash
mkdir -p /tmp/tastekit-demo
cd /tmp/tastekit-demo
tastekit init --domain general-agent --depth guided
tastekit onboard
tastekit compile
tastekit export --target claude-code --out .
```

Choose one of the six production domains:

- `general-agent`
- `development-agent`
- `content-agent`
- `research-agent`
- `sales-agent`
- `support-agent`

Choose one depth:

- `quick`: fastest useful profile.
- `guided`: recommended first-run balance.
- `full` or `full-taste-composition`: comprehensive coverage-driven onboarding, stored internally as `operator`.

## Workspace Files

TasteKit writes canonical v1 files directly under `.tastekit/`:

```text
.tastekit/
├── tastekit.yaml
├── session.json
├── constitution.v1.json
├── guardrails.v1.yaml
├── memory.v1.yaml
├── bindings.v1.json
├── trust.v1.json
├── skills/
├── playbooks/
└── traces/
```

`constitution.v1.json` is the canonical profile. Rich Full Taste Composition data lives in:

- `extensions["x-tastekit-composition"]`
- `extensions["x-tastekit-metacognition"]`

## Runtime Exports

```bash
tastekit export --target claude-code --out ./claude
tastekit export --target openclaw --out ./openclaw
tastekit export --target manus --out ./manus
tastekit export --target agents-md --out .
tastekit export --target agent-file --out ./agent-file
```

Markdown exports use TasteKit managed regions. Manual content outside the managed block is preserved when exports are regenerated.

## Native Skill Setup

The native skill bundle lives at `skills/tastekit/`. To test skill packaging and generated rubric references:

```bash
node scripts/skill-bundle/sync.mjs --check
```

The skill should stay a thin router. Deep interview strategy, runtime-output rules, and generated rubrics live in `skills/tastekit/references/`.

## Development Validation

Run the ordinary deterministic checks before committing:

```bash
pnpm test
pnpm -r build
pnpm lint
node scripts/skill-bundle/sync.mjs --check
bash scripts/validation/pr-gate.sh
```

Run live release evidence only when deterministic checks are green:

```bash
pnpm test:live-e2e:mock
pnpm test:live-e2e:subscription-demo
pnpm test:live-e2e:release
```

See `docs/testing/release-verification.md` for the full pre-release checklist.
