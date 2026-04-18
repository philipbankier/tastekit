/**
 * Web Research Skill
 *
 * Research a topic across web sources with evaluation and synthesis.
 */

export const WebResearchSkill = {
  skill_id: 'web-research',
  name: 'Web Research',
  description: 'Finds, evaluates, and synthesizes web sources into a concise research brief. Use when investigating a topic, validating recent information, or assembling source-backed context for decisions.',
  tags: ['research', 'web', 'synthesis'],
  risk_level: 'med' as const,
  required_tools: ['web-search', 'citations'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  feeds_into: ['research-synthesis'],
  pipeline_phase: 'discover',
  context_model: 'inherit' as const,

  skill_md_content: `# Web Research

## Purpose

Research a topic using web sources, evaluate source quality, and synthesize findings into a reliable brief.

## When to use

- Investigating a current topic or event
- Validating claims with recent sources
- Building source-backed context before making a recommendation
- Comparing multiple viewpoints on a question

## When NOT to use

- When the topic can be answered from provided materials alone
- When the user explicitly does not want external research

## Inputs

- **question**: Research question or claim to investigate
- **scope**: Optional boundaries for topic, geography, industry, or timeframe
- **source_preferences**: Optional preferred or banned source types

## Outputs

- **research_brief**: Findings with supporting sources
- **source_notes**: Reliability notes and important caveats
- **open_questions**: Gaps or unresolved conflicts that remain

## Procedure

### Step 1: Define the search frame

- Clarify the exact question, recency needs, and scope boundaries
- Identify likely source types before searching

### Step 2: Gather candidate sources

- Prefer primary and authoritative sources when available
- Capture more than one perspective when the topic is contested

### Step 3: Evaluate evidence

- Check source credibility, recency, methodology, and relevance
- Flag weak sourcing or unresolved contradictions

### Step 4: Synthesize cleanly

- Separate established facts, interpretations, and unknowns
- Cite sources for consequential claims

## Quality checks

- [ ] Sources are relevant and recent enough for the question
- [ ] Reliability caveats are noted
- [ ] Findings separate fact from inference
- [ ] Open questions are explicit

## Guardrail notes

Do not flatten conflicting evidence into false certainty.
`,
};
