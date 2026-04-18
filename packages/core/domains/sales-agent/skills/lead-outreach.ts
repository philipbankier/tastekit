/**
 * Lead Outreach Skill
 *
 * Craft personalized outbound messaging and multi-step sequences.
 */

export const LeadOutreachSkill = {
  skill_id: 'lead-outreach',
  name: 'Lead Outreach',
  description: 'Crafts personalized outreach messages and short sequences for prospects or accounts. Use when generating cold emails, follow-ups, LinkedIn messages, or outreach variants tied to a clear value proposition.',
  tags: ['sales', 'outreach', 'personalization'],
  risk_level: 'med' as const,
  required_tools: ['document-editor', 'crm'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  feeds_into: ['proposal-drafting'],
  pipeline_phase: 'discover',
  context_model: 'inherit' as const,

  skill_md_content: `# Lead Outreach

## Purpose

Create personalized sales outreach that is relevant, concise, and strong enough to earn a reply without sounding automated.

## When to use

- Drafting first-touch outbound emails or messages
- Building follow-up sequences for open opportunities
- Adapting messaging by persona, account, or funnel stage

## When NOT to use

- When a legal or compliance review is required before contacting prospects
- When the task is to summarize a live deal rather than initiate one

## Inputs

- **prospect_context**: Account, persona, situation, and any known trigger events
- **offer**: Product, service, or outcome being introduced
- **goal**: Desired next step such as reply, meeting, or referral
- **sequence_length**: Optional number of touches to generate

## Outputs

- **messages**: One or more outreach drafts tailored to the recipient context
- **personalization_notes**: The signals used to personalize the message
- **next_step_prompt**: Clear CTA aligned to the target stage

## Procedure

### Step 1: Anchor on relevance

- Pull out the strongest account-specific or persona-specific context
- Match the opening to a plausible business problem, priority, or trigger

### Step 2: Lead with value

- State the likely outcome or pain relief in concrete terms
- Keep product detail secondary unless the buyer context demands it

### Step 3: Make the ask friction-light

- End with a specific, easy next step
- Keep the CTA proportional to the relationship stage

### Step 4: Build a usable sequence

- Vary angle, proof, and CTA across follow-ups
- Avoid repetitive bumps that add no new reason to respond

## Quality checks

- [ ] Personalization is specific, not cosmetic
- [ ] Value proposition is visible early
- [ ] CTA matches the stage and audience
- [ ] Sequence touches are meaningfully differentiated

## Guardrail notes

Do not fabricate prospect facts or fake familiarity.
`,
};
