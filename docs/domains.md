# TasteKit Domains

TasteKit uses a **domain-based architecture** that provides specialized onboarding, skills, and playbooks for specific types of agents. Instead of creating a generic profile from scratch every time, users choose a domain that matches their use case, and TasteKit selects the matching rubric and runtime assets.

## What Is A Domain?

A **domain** in TasteKit is a complete package that includes:

- **Interview rubric** with domain-specific dimensions organized by depth tier (Quick, Guided, Full Taste Composition)
- **Pre-built skills library** with SKILL.md files and progressive disclosure
- **Playbooks** that define multi-step execution plans for common workflows
- **Domain constants** such as recommended tools and vocabulary

## Available Domains

TasteKit's production release scope is six domains. The deterministic release gates enumerate all six; live release evidence currently focuses on Full Taste Composition quality for `general-agent` plus the separate all-domain Ollama smoke path.

- `development-agent`
- `general-agent`
- `content-agent`
- `research-agent`
- `sales-agent`
- `support-agent`

### General Agent

The General Agent domain is for broad assistants that handle mixed technical and non-technical work.

**Use Cases:** Personal copilot workflows, general task execution, planning, research-then-act flows, decision support.

**Rubric:** 17 domain dimensions across 3 depth tiers, plus universal dimensions merged at interview time. Covers mission scope, decision style, communication contract, evidence rigor, risk escalation, planning horizon, tooling preferences, and more.

**Skills:** `context-synthesis` (summarize and ground working context), `task-orchestration` (plan, execute, and close tasks).

**Playbooks:** `general-task-execution`, `research-then-act`.

**Capability Packs:** General Agent can opt into `development` and `content` packs when one broad agent should still receive task-specific workflows.

### Development Agent

The Development Agent domain is for agents that assist with software development tasks.

**Use Cases:** Code review, documentation generation, debugging, test generation, refactoring assistance.

**Rubric:** 24 domain dimensions, plus universal dimensions merged at interview time. Covers engineering identity, code quality, testing philosophy, documentation standards, type safety, CI/CD, open-source etiquette, and more.

**Skills:** `code-review`, `debugging-issues`, `documenting-code`, `refactor-plan`, `writing-tests`.

**Playbooks:** `general-task` execution workflow adapted for software development work.

### Content Agent

The Content Agent domain is for agents that create, adapt, and review written content while preserving voice, audience fit, and evidence discipline.

**Use Cases:** Launch posts, founder updates, README-to-social adaptation, editorial review, campaign drafts.

**Rubric:** 12 domain dimensions, plus universal dimensions merged at interview time. Covers brand voice, audience definition, evidence and claims policy, anti-generic standards, channel strategy, content workflow, editorial structure, publishing boundaries, and performance feedback.

**Skills:** `content-voice-brief` (turn taste and source material into an editorial brief), `content-draft-options` (draft content variants from the brief while enforcing voice and claim rules).

**Playbooks:** `simple-post`, `research-and-post`, `content-calendar`.

### Research Agent

The Research Agent domain is for agents that gather, evaluate, and synthesize information with explicit source discipline.

**Use Cases:** Background research, market scans, literature-style summaries, competitive analysis, claim verification, briefing notes.

**Rubric:** 18 domain dimensions, plus universal dimensions merged at interview time. Covers research scope, source quality, evidence thresholds, uncertainty handling, citation expectations, synthesis depth, and escalation for weak or restricted sources.

**Skills:** Research-oriented skills for web/source research and competitive analysis.

**Playbooks:** Quick lookup and deeper analysis workflows that move from scope definition to source review, synthesis, and caveats.

### Sales Agent

The Sales Agent domain is for agents that support account research, qualification, follow-up drafting, and deal-risk escalation without overclaiming.

**Use Cases:** Account preparation, lead qualification, discovery-call prep, follow-up notes, objection synthesis, renewal or expansion planning.

**Rubric:** 18 domain dimensions, plus universal dimensions merged at interview time. Covers buyer relevance, product-claim discipline, CRM/data boundaries, pricing and terms escalation, outreach tone, and handoff expectations.

**Skills:** Sales-oriented skills for opportunity qualification, account context, and buyer-facing drafting.

**Playbooks:** Account research, qualification, and follow-up workflows with explicit approval points for external communication and commercial commitments.

### Support Agent

The Support Agent domain is for agents that help customers troubleshoot issues while preserving privacy, accuracy, and escalation boundaries.

**Use Cases:** Technical support, help-center response drafting, issue triage, incident-aware replies, reproduction steps, escalation summaries.

**Rubric:** 18 domain dimensions, plus universal dimensions merged at interview time. Covers empathy, troubleshooting precision, policy accuracy, privacy handling, incident escalation, and handoff clarity.

**Skills:** Support-oriented skills for ticket triage, troubleshooting guidance, and customer response drafting.

**Playbooks:** Triage, troubleshoot, respond, and escalate workflows with approval gates for account, billing, security, and data requests.

## Choosing A Domain

When you run `tastekit init`, you will be prompted to choose a domain:

```bash
$ tastekit init
? What type of agent are you building?
  > General Agent - Mixed technical and non-technical work
    Development Agent - Software development tasks
    Content Agent - Content creation and editorial workflows
    Research Agent - Research and synthesis
    Sales Agent - Sales and account workflows
    Support Agent - Customer support and troubleshooting
```

Your choice determines which specialized interview rubric, skills, and playbooks you receive. You can also skip the interactive prompt:

```bash
tastekit init --domain general-agent --depth guided
```

## Interview Depth Tiers

Each domain organizes its rubric dimensions into three depth tiers:

| Tier | Scope | Description |
|:---|:---:|:---|
| Quick | Essential | Core preferences only, enough to get started |
| Guided | Balanced | Thorough profile with domain-specific deep dives |
| Full Taste Composition | Complete | Coverage-driven exploration with confirmation checkpoints, assumptions, conflicts, fatigue handling, and draft-as-question behavior |

The LLM interviewer adaptively explores dimensions based on the chosen depth, spending more attention on topics where answers reveal nuance. Full Taste Composition uses the internal compatibility value `operator`, but users should see the public label.

## Release Readiness Expectations

Every first-class domain must satisfy the same release-readiness bar:

- Registered in the domain registry and CLI init choices.
- Source rubric has complete fields for skill generation: id, name, tiers, priority, maps_to, question budget, description, exploration hints, coverage criteria, sub-areas when present, and cascade targets.
- Quick, Guided, and Full depth ladders have no duplicate dimension IDs after universal dimensions merge.
- Domain skills and playbooks compile, or the domain deliberately ships a documented minimum production set.
- Committed fixtures compile canonical `.tastekit/constitution.v1.json`, `guardrails.v1.yaml`, `memory.v1.yaml`, `skills/`, `playbooks/`, and exports.
- Generated skill-bundle rubric references stay in sync with TypeScript source rubrics.

## Contributing A New Domain

Community domains are welcome. Each domain requires:

1. **`domain.ts`** - Domain metadata, version, description, recommended tools, and vocabulary
2. **`rubric.ts`** - Interview dimensions organized by depth tier
3. **`skills/`** - At least one domain-specific skill with SKILL.md content
4. **`index.ts`** - Barrel exports
5. Tests for registry lookup, rubric coverage, skill compilation, and playbook behavior if domain-specific playbooks are included

Plus wiring into `domains/index.ts`, `skills-compiler.ts`, and `playbook-compiler.ts`.

See the shipped modules under `packages/core/domains/` as reference implementations.

## Domain Architecture

Each shipped domain is a self-contained module within the core library:

```
packages/core/domains/
├── general-agent/
│   ├── domain.ts
│   ├── rubric.ts           # 17 interview dimensions by depth tier
│   ├── skills/
│   └── index.ts
├── development-agent/
│   ├── domain.ts
│   ├── rubric.ts           # 24 dimensions
│   ├── skills/
│   └── index.ts
├── content-agent/
│   ├── domain.ts
│   ├── rubric.ts
│   ├── skills/
│   └── index.ts
├── research-agent/
│   ├── domain.ts
│   ├── rubric.ts
│   ├── skills/
│   └── index.ts
├── sales-agent/
│   ├── domain.ts
│   ├── rubric.ts
│   ├── skills/
│   └── index.ts
├── support-agent/
│   ├── domain.ts
│   ├── rubric.ts
│   ├── skills/
│   └── index.ts
└── index.ts                # Domain registry
```
