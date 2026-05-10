/**
 * Content Draft Options Skill
 *
 * Drafts content alternatives from a voice brief and source material.
 */

export const ContentDraftOptionsSkill = {
  skill_id: 'content-draft-options',
  name: 'Content Draft Options',
  description: 'Drafts audience-specific content options that follow the user\'s voice, evidence, and anti-generic standards. Use for launch posts, founder updates, README-to-social adaptation, and content variants.',
  tags: ['content', 'drafting', 'adaptation'],
  risk_level: 'med' as const,
  required_tools: ['file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  prerequisites: ['content-voice-brief'],
  pipeline_phase: 'process',
  context_model: 'inherit' as const,

  skill_md_content: `# Content Draft Options

## Purpose

Create useful content drafts that preserve the user's voice and avoid unsupported, generic, or over-polished output.

## When to use

- Writing launch posts, founder updates, newsletters, social copy, or landing-page copy
- Turning technical source material into audience-specific content
- Producing multiple content options for user selection
- Revising a draft to better match a voice brief

## When NOT to use

- The task only needs research synthesis
- The user asked for code documentation rather than external-facing content
- Required source facts are missing and the brief says drafting should block

## Inputs

- **voice_brief**: Output from content-voice-brief or equivalent user-approved brief
- **source_material**: Facts and context the draft may rely on
- **format_constraints**: Channel, length, number of options, CTA, and structure

## Outputs

- **draft_options**: 1-3 draft variants with distinct angles when requested
- **claim_notes**: Any claims softened, omitted, or requiring source confirmation
- **selection_guidance**: Short explanation of when each option fits

## Procedure

### Step 1: Lock constraints

- Restate channel, length, audience, and evidence constraints internally
- Remove claims that are not supported by source material
- Choose the most useful angle for the reader

### Step 2: Draft options

- Prefer concrete nouns and active sentences
- Avoid vague hype, empty transformation claims, and AI-coded filler
- Match the user's preferred density and structure

### Step 3: Review against taste

- Check every draft against banned phrases and anti-generic rules
- Confirm claims are sourced, softened, or marked for approval
- Keep rationale concise unless the user requested a detailed edit note

## Quality checks

- [ ] Output meets the requested channel and length
- [ ] Voice matches the brief with no banned phrases
- [ ] Claims are supported or explicitly caveated
- [ ] Options are meaningfully different when multiple are requested

## Guardrail notes

Never publish, schedule, or send content externally unless the runtime guardrails explicitly permit it and the user has approved the exact copy.
`,
};
