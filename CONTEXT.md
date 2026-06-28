# TasteKit Context

**Version target:** 0.2.0
**Status:** Pre-1.0 release-readiness work in progress, not published until release gates pass
**Repo:** Standalone TasteKit checkout at `https://github.com/philipbankier/tastekit`

## Project Overview

TasteKit compiles a person's taste into portable agent artifacts. "Taste" means the operating preferences that make an agent useful in practice: what to optimize for, when to challenge, how to verify, where autonomy stops, how to communicate uncertainty, what to remember, and how domain-specific work should be handled.

The project has three user-facing entry points:

1. CLI: `@actrun_ai/tastekit-cli`
2. Library packages: `@actrun_ai/tastekit-core`, adapters, voice, validator
3. Native skill: `skills/tastekit/`

## Core Problem

Generic agents usually start from generic instructions. They forget user-specific operating preferences, drift silently, and force users to rewrite the same context for every runtime.

TasteKit addresses this by producing:

- A canonical `.tastekit/constitution.v1.json`
- Guardrails, memory policy, trust pins, bindings, skills, playbooks, traces, evals, and drift proposals
- Runtime exports for Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, and Agent File

## Current Release Shape

TasteKit 0.2.0 focuses on real profile quality and release confidence without claiming stable v1 maturity:

- Six first-class domains: `general-agent`, `development-agent`, `content-agent`, `research-agent`, `sales-agent`, `support-agent`
- Three depths: Quick, Guided, Full Taste Composition
- Full Taste Composition is coverage-driven, not time-boxed
- `operator` remains the internal compatibility value for Full
- `.tastekit/session.json` is canonical onboarding state
- Rich interview output stays under `constitution.v1.json` extensions:
  - `x-tastekit-composition`
  - `x-tastekit-metacognition`
- Runtime Markdown summarizes practical guidance only; raw transcripts and hidden policy machinery do not belong in runtime files
- Managed regions preserve manual user content on re-run

## Architecture

```text
packages/core/
├── domains/        # Six domain modules and rubrics
├── interview/      # Interview loop, universal rubric, metacognitive policy
├── compiler/       # Session-to-artifacts compilers
├── generators/     # Runtime Markdown and managed-region blocks
├── schemas/        # Zod and JSON Schema contracts
├── mcp/            # MCP registry, client, binder
├── trust/          # Provenance and audit
├── drift/          # Drift signals and proposals
├── eval/           # Eval packs and replay
└── tracing/        # Trace event contracts
```

The skill bundle is generated from source rubrics:

```text
skills/tastekit/
├── SKILL.md
├── references/
│   ├── interview-strategy.md
│   ├── runtime-output.md
│   └── rubrics/
├── assets/
│   ├── schemas/
│   └── templates/
└── scripts/
```

## Evidence And Validation

Deterministic gates prove the repo remains coherent:

- `pnpm test`
- `pnpm -r build`
- `pnpm lint`
- `node scripts/skill-bundle/sync.mjs --check`
- `bash scripts/validation/contract-conformance.sh`
- `bash scripts/validation/pr-gate.sh`

Live E2E proves product value:

- `pnpm test:live-e2e:mock` for local harness readiness
- `pnpm test:live-e2e:subscription-demo` for subscription-backed product review
- `pnpm test:live-e2e:release` for official release evidence

The current passing subscription-backed review run is `docs/validation/live/subscription-demo-grok-glm-20260517-180758/`. It is strong product evidence but not official release evidence.

## Competitive Position

TasteKit's differentiator is not just "custom instructions in files." It combines:

- Domain-specific onboarding
- Portable artifacts
- Native skill onboarding
- Runtime export surfaces
- Drift detection
- Trust/provenance
- Trace/eval maintenance loop
- Release evidence that tests real taste capture, not only schema validity

## Deferred Work

Do not imply these are shipped unless explicitly implemented and tested:

- Hosted dashboard
- Team/multi-user workspace management
- Native runtime control beyond exports
- Clinical, therapeutic, or diagnostic psychology claims
- Fully automatic drift application without review
- Auto-updating skill distribution
