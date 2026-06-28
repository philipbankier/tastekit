# @actrun_ai/tastekit-core

Pre-1.0 core library for [TasteKit](https://github.com/philipbankier/tastekit) — compile human taste into portable AI agent artifacts.

TasteKit is not a stable v1 contract yet. Expect useful APIs, active iteration, and semver below 1.0 until the project has more field testing.

## What's in core?

This package contains the schemas, compilers, interview engine, drift detector, and generators that power TasteKit. Use it when building tools on top of TasteKit's compilation pipeline.

| Module | What it does |
|--------|-------------|
| `schemas/` | 9 Zod schemas (constitution, guardrails, memory, skills, bindings, trust, playbook, evalpack, workspace) |
| `compiler/` | 5-step pipeline: constitution → guardrails → memory → skills → playbooks |
| `interview/` | LLM-driven adaptive interviewer with confidence tracking and cascades |
| `domains/` | 6 domain rubrics (general, development, content, research, sales, support) |
| `drift/` | 7 drift signal types with proposal generation and memory consolidation |
| `skills/` | Graph analyzer, constraints validator, versioner, tracker, linter, packer |
| `generators/` | CLAUDE.md, SOUL.md, AGENTS.md, and hook script generators |
| `llm/` | Anthropic, OpenAI, and Ollama provider adapters |
| `mcp/` | MCP client wrapping the official SDK |
| `trust/` | Fingerprint pinning and audit |

## Install

```bash
npm install @actrun_ai/tastekit-core
```

## Usage

```typescript
import { compile } from '@actrun_ai/tastekit-core/compiler';
import { loadSession } from '@actrun_ai/tastekit-core/interview';
import { ConstitutionV1Schema } from '@actrun_ai/tastekit-core/schemas';

// Load a session from an onboarding interview
const session = loadSession('.tastekit/session.json');

// Compile artifacts
const result = await compile({
  workspacePath: '.tastekit',
  session,
  generatorVersion: '0.2.0',
});

console.log(result.artifacts);
// ['constitution.v1.json', 'guardrails.v1.yaml', 'memory.v1.yaml', 'skills/manifest.v1.yaml', ...]
```

## Schemas

All artifact schemas are Zod-validated:

```typescript
import { ConstitutionV1Schema } from '@actrun_ai/tastekit-core/schemas';

const result = ConstitutionV1Schema.safeParse(data);
if (result.success) {
  console.log(result.data.principles);
}
```

## Part of TasteKit

This is the core library. For the CLI tool, see [`@actrun_ai/tastekit-cli`](https://www.npmjs.com/package/@actrun_ai/tastekit-cli). For runtime adapters, see [`@actrun_ai/tastekit-adapters`](https://www.npmjs.com/package/@actrun_ai/tastekit-adapters).

## License

MIT
