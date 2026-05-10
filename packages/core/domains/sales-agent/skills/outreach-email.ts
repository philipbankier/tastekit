/**
 * Outreach Email Skill
 *
 * Draft personalized outreach emails matching the user's sales communication style.
 */

export const OutreachEmailSkill = {
  skill_id: 'outreach-email',
  name: 'Outreach Email',
  description: 'Draft personalized sales outreach emails matching the user\'s communication style and sales philosophy',
  tags: ['sales', 'email', 'outreach', 'prospecting'],
  risk_level: 'med' as const,
  required_tools: ['email-sender'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  prerequisites: ['lead-qualification'],
  pipeline_phase: 'process',
  context_model: 'inherit' as const,

  skill_md_content: `# Outreach Email

## Purpose

Draft personalized sales outreach emails that match the user's communication style, sales philosophy, and brand voice.

## When to use

- Initial cold outreach to a new prospect
- Follow-up emails in a sequence
- Re-engagement emails to cold leads
- Personalized responses to inbound inquiries

## When NOT to use

- For mass email blasts (use marketing automation)
- For customer support responses (use support skills)
- For internal team communication

## Inputs

- **recipient**: Prospect information (name, company, role, context)
- **purpose**: Email type (cold_outreach, follow_up, re_engagement, inquiry_response)
- **context**: Any relevant context (prior interaction, trigger event, referral)
- **sequence_position**: Position in outreach sequence (1st, 2nd, 3rd, etc.)
- **tone_override**: Optional tone override for this specific email

## Outputs

- **email**: Drafted email with:
  - **subject**: Subject line (with A/B variant)
  - **body**: Email body text
  - **cta**: Call to action
  - **personalization_notes**: What was personalized and why
  - **send_timing**: Recommended send time

## Procedure

### Step 1: Research the recipient

Review available information:
- Company and role context
- Recent news or triggers
- LinkedIn or public profile insights
- Prior interaction history

### Step 2: Choose approach

Based on sales philosophy and email purpose:
- **Consultative**: Lead with insight about their challenges
- **Challenger**: Lead with a surprising insight or contrarian view
- **Relationship**: Lead with a personal connection or mutual contact
- **Value**: Lead with a specific value proposition

### Step 3: Draft the email

Write the email following constitution guidelines:
- Match communication style (tone, formality)
- Keep subject line compelling and concise
- Personalize beyond just {{first_name}}
- Include a clear, low-friction CTA
- Respect length preferences

### Step 4: Create variants

Generate subject line variants for testing:
- One direct/clear variant
- One curiosity-driven variant

### Step 5: Review against guidelines

Check against:
- Anti-spam compliance
- Brand voice consistency
- Forbidden phrases from constitution
- Appropriate level of assertiveness

## Quality checks

- [ ] Email is genuinely personalized (not just name-swapped)
- [ ] Subject line is compelling and appropriate
- [ ] CTA is clear and low-friction
- [ ] Tone matches sales communication style
- [ ] Compliant with email regulations (CAN-SPAM, GDPR)
- [ ] No forbidden phrases used
- [ ] Appropriate length for email type

## Guardrail notes

Medium risk — generates customer-facing communication. Requires approval before sending unless autonomy level is high. Always check compliance rules before any send operation.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Draft personalized sales outreach emails
- When to use: Cold outreach, follow-ups, re-engagement

### On Invoke (Load When Skill is Invoked)
- Full procedure with approach options
- Quality checks and compliance guidelines

### On Demand Resources
- Email templates by type and industry
- Subject line best practices
- Compliance requirement checklists
`
};
