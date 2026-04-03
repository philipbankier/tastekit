# TasteKit Domains

TasteKit uses a **domain-based architecture** that provides specialized onboarding, skills, and playbooks for specific types of agents. Instead of creating a generic agent, users choose a domain that matches their use case, and TasteKit provides deep, specialized support for that domain.

## What is a Domain?

A **domain** in TasteKit is a complete package that includes:

- **Interview rubric** with domain-specific dimensions organized by depth tier (quick, guided, operator)
- **Structured onboarding questions** as fallback when no LLM is available
- **Pre-built skills library** with SKILL.md files and progressive disclosure
- **Playbooks** that define multi-step execution plans for common workflows
- **Domain constants** (methodologies, output formats, channels, etc.)

## Available Domains

All 5 domains are fully implemented with rubrics, questions, skills, and playbooks.

### Content Agent

The Content Agent domain is designed for individuals and businesses that want to automate social media content creation, brand management, and audience engagement.

**Use Cases:** Personal brand management, business social media, AI influencers, newsletter/blog generation.

**Rubric:** 16 dimensions across 3 depth tiers. Covers brand voice, platform strategy, content workflow, engagement philosophy, and more.

**Skills:** `research-trends` (web research for content ideas), `generate-post-options` (draft multiple post variations).

**Playbooks:** `simple-post` (single post creation), `research-and-post` (research-informed content), `content-calendar` (multi-day planning).

**Learn More:** [Content Agent Documentation](./domains/content-agent.md)

### Development Agent

The Development Agent domain is for agents that assist with software development tasks.

**Use Cases:** Code review, documentation generation, bug triage, test generation, refactoring assistance.

**Rubric:** 24 dimensions (the most comprehensive domain). Covers code style, architecture preferences, testing philosophy, documentation standards, and more.

**Skills:** `code-review` (automated code review), `test-generation` (generate test cases from code).

**Playbooks:** `review-and-fix` (review code and apply fixes), `documentation-sprint` (generate docs for a module).

### Research Agent

The Research Agent domain is for agents that gather, analyze, and synthesize information from various sources.

**Use Cases:** Market research, competitive analysis, academic literature reviews, news monitoring, due diligence.

**Rubric:** 18 dimensions. Covers research methodology, source preferences, synthesis style, citation standards, bias awareness, fact-checking rigor, and more.

**Skills:** `web-research` (structured web research with source tracking), `competitive-analysis` (market and competitor analysis).

**Playbooks:** `quick-lookup` (fast factual research), `deep-dive-analysis` (comprehensive multi-source research report).

### Sales Agent

The Sales Agent domain is for agents that support sales processes, from lead generation to deal closing.

**Use Cases:** Lead qualification, outreach email sequences, CRM management, proposal generation, pipeline analytics.

**Rubric:** 18 dimensions. Covers sales philosophy, communication style, objection handling, deal management, negotiation approach, and more.

**Skills:** `lead-qualification` (score and qualify leads), `outreach-email` (personalized outreach sequences).

**Playbooks:** `lead-outreach` (qualification to first email), `proposal-workflow` (research to proposal delivery).

### Support Agent

The Support Agent domain is for agents that handle customer support, troubleshooting, and user assistance.

**Use Cases:** Ticket triage, response drafting, knowledge base management, escalation workflows, quality assurance.

**Rubric:** 18 dimensions. Covers support philosophy, tone and empathy, escalation approach, SLA awareness, crisis communication, and more.

**Skills:** `ticket-triage` (classify and prioritize tickets), `response-draft` (draft customer-facing responses).

**Playbooks:** `standard-ticket` (triage through resolution), `escalation-workflow` (escalation with context handoff).

## Choosing a Domain

When you run `tastekit init`, you will be prompted to choose a domain:

```bash
$ tastekit init
? What type of agent are you building?
  > Content Agent - Social media, brand management, content creation
    Development Agent - Software development tasks
    Research Agent - Information gathering and analysis
    Sales Agent - Lead generation and deal management
    Support Agent - Customer support and assistance
```

Your choice determines which specialized interview rubric, skills, and playbooks you receive. You can also skip the interactive prompt:

```bash
tastekit init --domain content-agent --depth guided
```

## Interview Depth Tiers

Each domain organizes its rubric dimensions into three depth tiers:

| Tier | Time | Dimensions | Description |
|:---|:---:|:---:|:---|
| Quick | ~5 min | 5 | Essential preferences only — enough to get started |
| Guided | ~15 min | 13 | Thorough profile with domain-specific deep dives |
| Operator | ~30 min | 18+ | Full exploration with examples and edge cases |

The LLM interviewer adaptively explores dimensions based on the chosen depth, spending more time on topics where your answers reveal nuance.

## Contributing a New Domain

We welcome community contributions of new domains! Each domain requires:

1. **`domain.ts`** — Domain metadata, version, description, and constants
2. **`rubric.ts`** — Interview dimensions organized by depth tier
3. **`questions.ts`** — Structured fallback questions
4. **`skills/`** — At least 2 skills with SKILL.md content
5. **`index.ts`** — Barrel exports

Plus wiring into `domains/index.ts`, `skills-compiler.ts`, and `playbook-compiler.ts`.

See the existing domains (e.g., `packages/core/domains/content-agent/`) as a reference implementation.

## Domain Architecture

Each domain is a self-contained module within the core library:

```
packages/core/domains/
├── content-agent/
│   ├── domain.ts           # Domain metadata and constants
│   ├── rubric.ts           # 16 interview dimensions by depth tier
│   ├── questions.ts        # 15 structured fallback questions
│   ├── skills/
│   │   ├── research-trends.ts
│   │   ├── generate-hooks.ts
│   │   └── index.ts
│   └── index.ts
├── development-agent/
│   ├── domain.ts
│   ├── rubric.ts           # 24 dimensions (most comprehensive)
│   ├── questions.ts
│   ├── skills/
│   └── index.ts
├── research-agent/
│   ├── domain.ts
│   ├── rubric.ts           # 18 dimensions
│   ├── questions.ts
│   ├── skills/
│   └── index.ts
├── sales-agent/
│   ├── domain.ts
│   ├── rubric.ts           # 18 dimensions
│   ├── questions.ts
│   ├── skills/
│   └── index.ts
└── support-agent/
    ├── domain.ts
    ├── rubric.ts           # 18 dimensions
    ├── questions.ts
    ├── skills/
    └── index.ts
```
