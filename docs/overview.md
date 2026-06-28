# TasteKit Overview

TasteKit is an open-source command-line interface, library, and native agent skill for capturing a user's "taste" and compiling it into portable, versioned artifacts. It makes agent behavior durable across runtimes: domain-aware onboarding, Skills with progressive disclosure, tool binding via the Model Context Protocol (MCP), trust and provenance enforcement, trace-first logging, evaluation, and drift maintenance.

The current 0.2.0 release direction is not a shallow profile generator, but it remains pre-1.0 until the project has more field testing. TasteKit is meant to produce a usable operating profile for real agents: how to reason, challenge, verify, plan, communicate, escalate, and adapt over time.

## Core Concepts

| Concept | Description |
| :--- | :--- |
| **Artifacts** | User preferences, rules, and configurations are compiled into versioned JSON/YAML files. Artifacts are the durable source of truth for an agent's behavior. |
| **Onboarding** | Users complete Quick, Guided, or Full Taste Composition. Full is coverage-driven and uses confirmation, conflict handling, assumptions, fatigue handling, and draft-as-question checkpoints. |
| **Compilation** | `tastekit compile` transforms onboarding state into canonical artifacts and runtime Markdown. |
| **Composition Extensions** | Rich profile details live inside `constitution.v1.json` under `x-tastekit-composition` and `x-tastekit-metacognition`, keeping the v1 schema stable while preserving depth. |
| **Skills** | Modular capabilities with progressive disclosure. Agents load the smallest useful context first and deeper references only when invoked. |
| **MCP** | TasteKit is MCP-first for tool discovery, binding, and trust. |
| **Trust & Provenance** | TasteKit pins MCP servers and skill sources so new or changed tools are visible before they affect an agent. |
| **Tracing** | Agent runs produce machine-readable trace logs for debugging, evaluation, replay, and drift detection. |
| **Drift** | TasteKit detects behavior changes from traces and proposes updates instead of silently rewriting a user's profile. |
| **Adapters** | Runtime adapters translate TasteKit artifacts into Claude Code, Manus, OpenClaw, Autopilots, AGENTS.md, and Agent File surfaces. |

## Design Principles

1. **Artifact-first**: Everything compiles into files. Runtimes adapt to the files, not the other way around.
2. **Deterministic compilation**: The same inputs should produce the same artifacts.
3. **Progressive disclosure**: Agents start with minimal context and load deeper knowledge only when a Skill or runtime surface needs it.
4. **MCP-first**: Tool integration uses MCP rather than a custom TasteKit tool protocol.
5. **Trust-by-default**: New tools and sources are never silently enabled.
6. **Trace-first**: Observability, replay, evaluation, and drift detection operate on structured traces.
7. **Maintenance is v1**: Drift detection, consolidation, and staleness checks are part of the core product surface.
8. **Human agency first**: Full Taste Composition can infer and compress, but consequential assumptions remain visible and resumable instead of hidden in prompt text.

## Workflow

1. **Initialize**: `tastekit init` creates a workspace, selects a first-class domain, and chooses Quick, Guided, or Full Taste Composition.
2. **Onboard**: `tastekit onboard` or the native `skills/tastekit/` agent skill runs the adaptive interview.
3. **Compile**: `tastekit compile` generates canonical artifacts, domain skills, playbooks, and runtime guidance.
4. **Bind Tools**: `tastekit mcp add` and `tastekit mcp bind` discover tools and produce guarded bindings.
5. **Export**: `tastekit export --target <adapter>` writes runtime-specific outputs.
6. **Run & Trace**: Agents run in their target environments and produce trace logs.
7. **Maintain**: `tastekit drift detect`, `tastekit eval run`, `tastekit eval replay`, and `tastekit trust audit` keep behavior reviewable.

## Runtime Outputs

TasteKit's canonical workspace layout is flat under `.tastekit/`: `constitution.v1.json`, `guardrails.v1.yaml`, `memory.v1.yaml`, `session.json`, `skills/`, `playbooks/`, `traces/`, `trust.v1.json`, and `bindings.v1.json`. Compatibility readers still accept older split layouts where needed, but new writes target the canonical paths.

Runtime Markdown files use managed regions. Re-running compile/export replaces only the TasteKit region and preserves manual user content outside that region.

## Native Skill

The native skill lives at `skills/tastekit/`. It is a thin router that asks for target runtime, domain, and depth, then loads deeper rubric and interview references as needed. This keeps first context small while preserving Full Taste Composition for users who want the complete onboarding.

The skill is agent-native rather than a CLI wrapper. It can read prior `CLAUDE.md`, `AGENTS.md`, or `SOUL.md` as hypotheses, but interview answers win on conflict.

## Evidence Model

TasteKit has two evidence classes:

| Evidence | Purpose | Release Meaning |
| :--- | :--- | :--- |
| Deterministic gates | Unit, adapter, CLI, schema, skill-bundle, and six-domain replay checks | Required for ordinary development and release readiness |
| Live Full Taste Composition | Real LLM interview plus judge, artifacts, exports, drift/eval/trust checks | Product-quality evidence; strict GPT-5.5 + GLM-5.1 route is manual pre-release evidence or an explicit waiver |

The current subscription-backed live demo is useful review evidence, not official release evidence. See `docs/validation/live/README.md` and `docs/demo/tastekit-release-readiness-one-pager.html`.
