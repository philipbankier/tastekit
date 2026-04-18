/**
 * Research Synthesis Skill
 *
 * Turn findings into an actionable report.
 */

export const ResearchSynthesisSkill = {
  skill_id: 'research-synthesis',
  name: 'Research Synthesis',
  description: 'Synthesizes research findings into a structured, actionable report with implications, uncertainty notes, and next steps. Use when disparate evidence needs to become a decision-ready brief.',
  tags: ['research', 'synthesis', 'reporting'],
  risk_level: 'low' as const,
  required_tools: ['document-editor', 'citations'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['web-research'],
  pipeline_phase: 'report',
  context_model: 'inherit' as const,

  skill_md_content: `# Research Synthesis

## Purpose

Convert raw findings into a decision-ready report that explains what is known, what is uncertain, and what follows from the evidence.

## When to use

- Summarizing research for a stakeholder or decision-maker
- Combining findings from multiple prior research steps
- Turning notes and source excerpts into a concise brief

## When NOT to use

- When source gathering has not been completed enough to support synthesis
- When the user needs raw source collection rather than interpretation

## Inputs

- **findings**: Notes, excerpts, comparisons, or prior briefs
- **decision_context**: Optional decision or question the synthesis should support
- **output_format**: Optional report, memo, table, or executive summary

## Outputs

- **synthesis_report**: Structured report with findings, implications, and caveats
- **confidence_notes**: Confidence level and major uncertainty drivers
- **next_steps**: Recommended follow-up research or decisions

## Procedure

### Step 1: Organize the evidence

- Group findings into themes, claims, and unresolved questions
- Remove duplication while preserving important disagreement

### Step 2: Distill what matters

- Highlight the strongest evidence and what it supports
- Make tradeoffs and implications explicit

### Step 3: Communicate uncertainty

- State where evidence is thin, conflicting, or time-sensitive
- Avoid recommendations that outrun the evidence

### Step 4: Produce an actionable artifact

- Match the requested structure and audience level
- End with clear implications or next questions

## Quality checks

- [ ] Findings are grouped logically
- [ ] Recommendations do not exceed the evidence
- [ ] Uncertainty is explicit
- [ ] Output is structured for the target audience

## Guardrail notes

Do not hide evidence gaps just to make the report sound more decisive.
`,
};
