/**
 * Response Draft Skill
 *
 * Draft customer support responses matching tone and support philosophy.
 */

export const ResponseDraftSkill = {
  skill_id: 'response-draft',
  name: 'Response Draft',
  description: 'Draft customer support responses matching the user\'s tone, empathy style, and support philosophy',
  tags: ['support', 'customer-communication', 'writing'],
  risk_level: 'med' as const,
  required_tools: [],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  prerequisites: ['ticket-triage'],
  pipeline_phase: 'process',
  context_model: 'inherit' as const,

  skill_md_content: `# Response Draft

## Purpose

Draft customer support responses that match the user's tone, empathy approach, and support philosophy for any support channel.

## When to use

- Responding to a new support ticket
- Follow-up responses in an ongoing conversation
- Proactive outreach about known issues or status updates
- Crafting responses for different channels (email, chat, social)

## When NOT to use

- For ticket triage (use ticket-triage skill)
- For internal team communication
- When a template response is explicitly required with no customization

## Inputs

- **ticket**: The customer's message (subject, body, context)
- **channel**: Support channel (email, chat, phone_script, social_media)
- **triage**: Optional triage result (priority, category, sentiment)
- **customer_history**: Optional prior interaction context
- **resolution**: The actual solution or answer to provide
- **tone_override**: Optional tone override for this response

## Outputs

- **response**: Drafted response with:
  - **greeting**: Appropriate opening
  - **body**: Main response content
  - **closing**: Sign-off and next steps
  - **internal_notes**: Notes for the support team (not sent to customer)
  - **follow_up_suggestion**: Recommended follow-up action

## Procedure

### Step 1: Understand the context

Review:
- What the customer is asking
- Their emotional state (from triage or analysis)
- Channel-specific format requirements
- Prior interaction history

### Step 2: Match tone to context

Based on constitution and customer state:
- **Frustrated customer**: Lead with empathy, acknowledge the issue, then solve
- **Confused customer**: Be patient, use simple language, provide step-by-step
- **Neutral inquiry**: Be helpful and efficient
- **Positive feedback**: Express genuine appreciation

### Step 3: Draft the response

Structure based on channel:

**Email**: Full greeting, structured body, clear next steps, professional closing
**Chat**: Shorter, conversational, can use multiple messages
**Social**: Concise, public-appropriate, offer to move to private channel if needed

### Step 4: Include resolution

Present the solution:
- Clear, actionable steps
- Screenshots or links if relevant
- Alternative solutions if the primary one might not work
- Set expectations for resolution timeline

### Step 5: Add follow-up

Include appropriate follow-up:
- "Is there anything else I can help with?"
- Schedule check-in for complex issues
- Link to relevant knowledge base articles

## Quality checks

- [ ] Tone matches the customer's emotional state
- [ ] Response answers the actual question asked
- [ ] Technical level is appropriate for the customer
- [ ] Channel format is respected (length, formality)
- [ ] No forbidden phrases from constitution
- [ ] Follow-up actions are clear
- [ ] Internal notes are separate from customer-facing content

## Guardrail notes

Medium risk — generates customer-facing communication. Requires approval before sending unless autonomy level allows direct responses. Never promise timelines or refunds without authorization.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Draft customer support responses matching tone
- When to use: Responding to tickets, chat messages, or social inquiries

### On Invoke (Load When Skill is Invoked)
- Full procedure with channel-specific formatting
- Quality checks and tone matching rules

### On Demand Resources
- Response templates by category and channel
- Empathy phrase library
- Escalation language guidelines
`
};
