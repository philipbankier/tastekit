/**
 * Generate Post Options Skill
 *
 * Create multiple content variants from a brief.
 */

export const GeneratePostOptionsSkill = {
  skill_id: 'generate-post-options',
  name: 'Generate Post Options',
  description: 'Creates multiple content or post variations from a single brief while preserving strategic consistency. Use when exploring hooks, CTAs, or format-specific variants before selecting a direction.',
  tags: ['content', 'writing', 'variation'],
  risk_level: 'low' as const,
  required_tools: ['document-editor'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['research-trends'],
  feeds_into: ['content-review'],
  pipeline_phase: 'create',
  context_model: 'inherit' as const,

  skill_md_content: `# Generate Post Options

## Purpose

Generate several strong content options from one brief so the user can compare hooks, structures, and tonal choices without losing strategic alignment.

## When to use

- The user wants multiple directions for a post or campaign asset
- Testing hooks, CTAs, or format variations
- Adapting the same idea for different channels or audience segments

## When NOT to use

- When a final approved draft already exists and only polish is needed
- When the task requires critique rather than generation

## Inputs

- **brief**: Core topic, objective, audience, and constraints
- **format**: Target channel or content type
- **variation_goal**: What should vary across options: hook, tone, CTA, framing, length

## Outputs

- **options**: 3 or more distinct content variants
- **variation_notes**: What is intentionally different about each option
- **recommended_pick**: Best-fit option with rationale when requested

## Procedure

### Step 1: Anchor the brief

- Identify non-negotiables: audience, objective, offer, risk boundaries
- Preserve voice and strategic message across all variants

### Step 2: Vary the right levers

- Change hook, structure, angle, pacing, or CTA based on the brief
- Make variations meaningfully different, not cosmetic rewrites

### Step 3: Keep each option usable

- Ensure every option is coherent on its own
- Match the expected conventions of the target format

### Step 4: Annotate the choices

- Explain why each option exists and when it should be selected
- Surface the strongest option if the user wants a recommendation

## Quality checks

- [ ] Options are meaningfully distinct
- [ ] All options preserve the same strategic objective
- [ ] Voice remains on-brand
- [ ] Format constraints are respected

## Guardrail notes

Do not create false variation by changing only adjectives or sentence order.
`,
};
