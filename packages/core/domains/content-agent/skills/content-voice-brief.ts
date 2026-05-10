/**
 * Content Voice Brief Skill
 *
 * Builds an editorial brief from user taste before drafting.
 */

export const ContentVoiceBriefSkill = {
  skill_id: 'content-voice-brief',
  name: 'Content Voice Brief',
  description: 'Creates a compact editorial brief from the user\'s voice, audience, evidence, and anti-generic standards. Use before drafting or adapting public-facing content.',
  tags: ['content', 'voice', 'brief'],
  risk_level: 'low' as const,
  required_tools: ['file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  feeds_into: ['content-draft-options'],
  pipeline_phase: 'capture',
  context_model: 'inherit' as const,

  skill_md_content: `# Content Voice Brief

## Purpose

Turn the user's content taste profile into a short, usable editorial brief before drafting.

## When to use

- Drafting public-facing or audience-sensitive content
- Adapting technical material into social, launch, newsletter, or founder-update copy
- Reviewing whether content sounds like the user or brand
- The task mentions tone, audience, voice, claims, or generic wording

## When NOT to use

- The user asks for purely mechanical formatting
- The content has no audience or voice requirements
- A draft already includes a complete approved brief

## Inputs

- **goal**: Desired content outcome
- **audience**: Reader group, knowledge level, and desired action
- **source_material**: Notes, docs, transcript, README, or prior draft
- **constraints**: Channel, length, banned phrases, evidence requirements

## Outputs

- **voice_brief**: Voice, audience, angle, evidence rules, and anti-generic constraints
- **claim_policy**: Claims that need citations, softer wording, or removal
- **drafting_constraints**: Format, length, and approval notes for the next skill

## Procedure

### Step 1: Extract the content job

- Identify the reader, desired action, and channel
- Separate confirmed source facts from assumptions
- Flag missing context that could change the draft materially

### Step 2: Apply taste constraints

- Translate voice keywords into concrete writing moves
- List banned phrases, tropes, and empty claims to avoid
- Decide whether evidence is required before making claims

### Step 3: Produce a brief

- Keep the brief compact enough to guide the next draft
- Include one recommended angle and one backup angle when useful
- Include explicit "do not say" guidance

## Quality checks

- [ ] Audience and desired reader action are explicit
- [ ] Claims are separated from assumptions
- [ ] Voice guidance is behavioral, not vague
- [ ] Anti-generic rules are concrete enough to enforce

## Guardrail notes

Do not invent product facts, metrics, customer claims, or external validation. Mark them as assumptions or ask for sources.
`,
};
