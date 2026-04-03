/**
 * Context Synthesis Skill
 *
 * Build a reliable working context from fragmented inputs.
 */

export const ContextSynthesisSkill = {
  skill_id: 'context-synthesis',
  name: 'Context Synthesis',
  description: 'Collects and normalizes fragmented context into an actionable brief with assumptions and confidence levels. Use when inputs are scattered across multiple sources, requirements are ambiguous, or you need source-backed context before executing a task.',
  tags: ['general', 'context', 'analysis'],
  risk_level: 'low' as const,
  required_tools: ['file-system', 'web-search'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  feeds_into: ['task-orchestration'],
  pipeline_phase: 'capture',
  context_model: 'inherit' as const,

  skill_md_content: `# Context Synthesis

## Purpose

Turn scattered notes, files, traces, and references into a trustworthy context brief before execution begins.

## When to use

- Inputs are fragmented across multiple sources
- Requirements are ambiguous or conflicting
- You need an explicit assumptions list before acting
- Work requires source-backed context and confidence levels

## When NOT to use

- Context is already complete and validated
- The request is trivial and does not need synthesis overhead

## Inputs

- **sources**: Files, notes, links, traces, or prior outputs
- **question**: What decision or task the synthesis supports
- **time_horizon**: Optional recency requirement

## Outputs

- **context_brief**: Consolidated facts, assumptions, risks, and open questions
- **confidence_map**: Confidence per key claim (high/med/low)
- **next_questions**: Clarifications required before execution

## Procedure

### Step 1: Gather and classify inputs

- Group inputs by reliability, recency, and relevance
- Separate facts, assumptions, and unknowns

### Step 2: Reconcile conflicts

- Identify contradictory claims
- Prefer higher-quality and more recent sources when possible
- Mark unresolved conflicts explicitly

### Step 3: Produce an operator-ready brief

- Include key facts, critical assumptions, and unresolved questions
- Add confidence markers per major claim
- Flag risks that can invalidate downstream work

### Step 4: Hand off cleanly

- Provide a concise brief designed for planning/execution skills
- Include explicit “needs decision” items when blocking ambiguity remains

## Quality checks

- [ ] Facts vs assumptions are clearly separated
- [ ] Conflicts are either resolved or explicitly flagged
- [ ] Confidence levels are attached to key claims
- [ ] Open questions are concrete and answerable

## Guardrail notes

Do not present weakly sourced assumptions as established facts.

## Progressive Disclosure

### Minimal Context (Always Load)
- Primary question, source list, and recency requirements

### On Invoke (Load When Skill is Invoked)
- Conflict-resolution and confidence-annotation workflow

### On Demand Resources
- Source quality rubric and reusable synthesis template
`,
};
