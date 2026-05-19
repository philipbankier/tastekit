# TasteKit Project Summary

TasteKit is an open-source CLI, TypeScript library, and native agent skill that compiles a user's taste into portable agent artifacts. It is built for agents that need more than generic custom instructions: durable operating principles, reasoning style, evidence policy, autonomy boundaries, runtime skills, playbooks, trust rules, traces, evaluation, and drift maintenance.

## Current Status

TasteKit is in a v1.1 release-readiness phase. The important current work is:

- Six production domains are first-class: General, Development, Content, Research, Sales, Support.
- Full Taste Composition is coverage-driven and user-facing; the internal compatibility value remains `operator`.
- Rich onboarding output is preserved inside `constitution.v1.json` extensions rather than through a breaking schema version.
- The native skill source of truth is `skills/tastekit/`.
- Runtime Markdown uses managed regions so re-runs do not destroy hand-written user content.
- Release confidence requires deterministic gates plus strict live Full Taste Composition evidence.

## Packages

| Package | Purpose |
|:---|:---|
| `@actrun_ai/tastekit-core` | Schemas, compiler, domains, interview policy, generators, MCP, trust, tracing, drift, eval |
| `@actrun_ai/tastekit-cli` | User-facing command line |
| `@actrun_ai/tastekit-adapters` | Runtime adapter interfaces and exports |
| `@actrun_ai/tastekit-voice` | Voice provider interfaces and local/provider integrations |
| `@actrun_ai/tastekit-validator` | Validation for `constitution.v1.json` and known deterministic extraction failures |

## Product Shape

```text
Domain + depth
      ↓
Adaptive onboarding interview
      ↓
.tastekit/session.json
      ↓
constitution.v1.json + guardrails + memory + skills + playbooks
      ↓
runtime exports + drift/eval/trust/trace loop
```

## Six Domains

| Domain | Primary Work |
| :--- | :--- |
| General Agent | Mixed technical and non-technical work, planning, synthesis, and decision support |
| Development Agent | Code review, debugging, tests, refactors, and engineering documentation |
| Content Agent | Brand voice, editorial drafting, channel adaptation, and publishing boundaries |
| Research Agent | Source discovery, evidence grading, synthesis, and competitive analysis |
| Sales Agent | Account research, qualification, buyer-facing follow-up, and deal-risk escalation |
| Support Agent | Troubleshooting, customer communication, privacy-safe assistance, and escalation |

## Native Skill

The skill at `skills/tastekit/` is the low-friction agent-native front door. It asks for target runtime, domain, and depth; reads prior `CLAUDE.md`, `AGENTS.md`, or `SOUL.md` as hypotheses; routes Full Taste Composition to deeper strategy references; and writes the same canonical `.tastekit/` artifacts as the CLI path.

## Evidence

The strongest current product review evidence is the subscription-backed live run at:

- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/report.md`
- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/demo.md`

That run passed, completed 30 live turns, covered all merged dimensions for `general-agent`, generated validated artifacts, preserved managed-region manual content, and scored 4.78/5 from the judge. It is not official release evidence because strict release evidence still requires the official GPT-5.5 + GLM-5.1 route.

## Validation

Release readiness is documented in `docs/testing/release-verification.md`. The short version:

```bash
pnpm test
pnpm -r build
pnpm lint
node scripts/skill-bundle/sync.mjs --check
bash scripts/validation/contract-conformance.sh
bash scripts/validation/pr-gate.sh
pnpm test:live-e2e:release
```

## Key Docs

- `README.md` — public overview
- `docs/quickstart.md` — first workflow
- `docs/overview.md` — conceptual model
- `docs/domains.md` — production domain system
- `docs/testing/release-verification.md` — release gates
- `docs/validation/live/README.md` — live E2E operation
- `docs/demo/tastekit-release-readiness-one-pager.html` — visual synthesis
