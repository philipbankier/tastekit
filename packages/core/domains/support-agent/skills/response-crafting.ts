/**
 * Response Crafting Skill
 *
 * Write clear, empathetic support responses.
 */

export const ResponseCraftingSkill = {
  skill_id: 'response-crafting',
  name: 'Response Crafting',
  description: 'Crafts clear, empathetic customer support responses that acknowledge the issue, explain the next step, and preserve trust. Use when turning support analysis into customer-facing communication.',
  tags: ['support', 'writing', 'customer-communication'],
  risk_level: 'low' as const,
  required_tools: ['document-editor', 'ticketing-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['troubleshooting'],
  feeds_into: ['knowledge-base-update'],
  pipeline_phase: 'create',
  context_model: 'inherit' as const,

  skill_md_content: `# Response Crafting

## Purpose

Turn support findings into customer-facing responses that are calm, useful, and easy to act on.

## When to use

- Replying to support tickets or chats
- Explaining troubleshooting steps or workarounds
- Sending status updates on open issues

## When NOT to use

- When the issue still needs internal diagnosis before contacting the customer
- When the task is to document the fix internally rather than respond externally

## Inputs

- **issue_context**: What happened, impact, and customer sentiment
- **resolution_status**: Fix provided, workaround available, or investigation ongoing
- **audience_level**: Customer technical sophistication and preferred detail level

## Outputs

- **response_draft**: Customer-ready support message
- **tone_notes**: Optional explanation of tone or wording choices
- **follow_up_request**: Any needed customer action or confirmation

## Procedure

### Step 1: Acknowledge the issue

- Recognize the customer’s problem and its impact
- Keep empathy sincere and proportional

### Step 2: State the resolution clearly

- Explain what to do next or what is happening now
- Use plain language unless the audience expects technical depth

### Step 3: Remove ambiguity

- Make action items, timelines, and ownership obvious
- Ask only for information that advances the case

### Step 4: Close with confidence

- Reassure without overpromising
- Leave the customer with a clear next step or expectation

## Quality checks

- [ ] The response is easy to scan
- [ ] Empathy is present but not excessive
- [ ] Next steps are explicit
- [ ] Wording avoids blame or defensiveness

## Guardrail notes

Do not promise timelines, refunds, or fixes that have not been approved.
`,
};
