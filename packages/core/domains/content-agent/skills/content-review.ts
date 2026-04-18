/**
 * Content Review Skill
 *
 * Review drafts against brand voice and editorial standards.
 */

export const ContentReviewSkill = {
  skill_id: 'content-review',
  name: 'Content Review',
  description: 'Reviews content against brand voice, audience fit, factual rigor, and editorial standards. Use when evaluating drafts before publishing or tightening material that feels off-brand or underdeveloped.',
  tags: ['content', 'review', 'editorial'],
  risk_level: 'low' as const,
  required_tools: ['document-editor', 'file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  pipeline_phase: 'verify',
  context_model: 'inherit' as const,

  skill_md_content: `# Content Review

## Purpose

Review content drafts for voice alignment, audience fit, clarity, and editorial quality before publication.

## When to use

- Reviewing a draft before publishing
- Checking alignment with brand voice or style guide
- Tightening structure, factual clarity, or CTA quality
- Explaining why a piece feels weak or off-brand

## When NOT to use

- When the user needs brand-new content from scratch
- When only factual research is needed without copy evaluation

## Inputs

- **draft**: Content to review
- **target_audience**: Intended reader or segment
- **standards**: Optional style guide, editorial rules, or brand notes

## Outputs

- **review_summary**: Overall assessment of the draft
- **issues**: Prioritized findings with severity and recommended fixes
- **strengths**: What already works and should be preserved

## Procedure

### Step 1: Assess strategic fit

- Confirm the piece supports the intended objective and audience
- Check whether the framing and CTA match the brief

### Step 2: Review voice and tone

- Check for on-brand vocabulary, pacing, and posture
- Flag sections that sound generic, inconsistent, or overhyped

### Step 3: Review editorial quality

- Check clarity, structure, grammar, sourcing, and transitions
- Flag unsupported claims or weak evidence where relevant

### Step 4: Deliver actionable feedback

- Organize findings by severity
- Suggest revisions that preserve the strongest parts of the draft

## Quality checks

- [ ] Feedback is specific and actionable
- [ ] Voice and audience fit are explicitly evaluated
- [ ] Unsupported claims are flagged
- [ ] Positive strengths are preserved, not just weaknesses listed

## Guardrail notes

Do not approve persuasive content that makes claims the available evidence cannot support.
`,
};
