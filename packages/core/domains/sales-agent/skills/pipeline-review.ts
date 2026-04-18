/**
 * Pipeline Review Skill
 *
 * Evaluate opportunity health and optimize pipeline focus.
 */

export const PipelineReviewSkill = {
  skill_id: 'pipeline-review',
  name: 'Pipeline Review',
  description: 'Reviews a sales pipeline for health, prioritization, forecast quality, and next-step clarity. Use when auditing opportunity stages, identifying stalled deals, or deciding where the team should focus.',
  tags: ['sales', 'pipeline', 'forecasting'],
  risk_level: 'low' as const,
  required_tools: ['crm', 'analytics'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['proposal-drafting'],
  pipeline_phase: 'verify',
  context_model: 'inherit' as const,

  skill_md_content: `# Pipeline Review

## Purpose

Review pipeline quality and recommend where attention, cleanup, or acceleration is needed.

## When to use

- Weekly pipeline reviews
- Forecast preparation
- Identifying stalled or low-quality deals
- Prioritizing follow-up effort across accounts

## When NOT to use

- When the task is to write a single outreach message
- When CRM data is too incomplete to support a review

## Inputs

- **pipeline_snapshot**: Opportunities, stages, ages, values, and owners
- **review_goal**: Forecasting, cleanup, prioritization, coaching, or conversion improvement
- **focus_segment**: Optional rep, region, product line, or stage subset

## Outputs

- **pipeline_findings**: Risks, strengths, and cleanup items
- **priority_actions**: Recommended next steps by account or stage
- **forecast_notes**: Confidence observations and assumptions where relevant

## Procedure

### Step 1: Assess pipeline hygiene

- Check stage accuracy, stale opportunities, and missing next steps
- Flag records that cannot support a trustworthy forecast

### Step 2: Review opportunity quality

- Evaluate qualification strength, stakeholder coverage, and buying signals
- Distinguish promising deals from inflated pipeline

### Step 3: Prioritize intervention

- Recommend where follow-up, disqualification, or executive attention is most justified
- Separate urgent deals from background noise

### Step 4: Summarize clearly

- Produce a concise view of risk, upside, and immediate actions
- Make assumptions visible when data quality is limited

## Quality checks

- [ ] Stale or weak opportunities are identified
- [ ] Next-step recommendations are actionable
- [ ] Forecast confidence is grounded in evidence
- [ ] Data quality caveats are explicit

## Guardrail notes

Do not present speculative forecast confidence as fact.
`,
};
