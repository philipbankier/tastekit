/**
 * Ticket Triage Skill
 *
 * Assess, categorize, and prioritize incoming support tickets.
 */

export const TicketTriageSkill = {
  skill_id: 'ticket-triage',
  name: 'Ticket Triage',
  description: 'Assess, categorize, and prioritize incoming support tickets based on urgency and type',
  tags: ['support', 'triage', 'prioritization'],
  risk_level: 'low' as const,
  required_tools: ['ticket-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  feeds_into: ['response-draft'],
  pipeline_phase: 'capture',
  context_model: 'inherit' as const,

  skill_md_content: `# Ticket Triage

## Purpose

Quickly assess incoming support tickets, categorize them by type and priority, and route them appropriately.

## When to use

- New ticket arrives and needs initial assessment
- Batch triage of unprocessed tickets
- Re-prioritization of existing tickets when context changes
- Queue management and workload balancing

## When NOT to use

- For actually resolving tickets (use response-draft skill)
- For escalation (use escalation workflows)
- When the ticket is already triaged and in progress

## Inputs

- **ticket**: Ticket content (subject, body, customer info, channel)
- **triage_rules**: From constitution (priority criteria, category definitions)
- **context**: Optional context (customer history, known issues, SLA status)

## Outputs

- **triage_result**: Assessment with:
  - **priority**: critical/high/medium/low
  - **category**: Issue type (bug, feature_request, how_to, billing, account, etc.)
  - **sentiment**: Customer sentiment (frustrated, neutral, positive)
  - **summary**: One-line issue summary
  - **suggested_response_type**: template/personalized/escalation
  - **routing**: Suggested team or agent
  - **sla_deadline**: Calculated response deadline based on priority

## Procedure

### Step 1: Parse the ticket

Extract key information:
- What is the customer asking about?
- What product/feature is involved?
- What is the urgency level?
- Is there emotional content?

### Step 2: Classify priority

Apply priority rules:
- **Critical**: Service down, data loss, security breach
- **High**: Major feature broken, blocking issue, VIP customer
- **Medium**: Feature not working as expected, workaround available
- **Low**: How-to question, feature request, minor inconvenience

### Step 3: Categorize

Assign category based on content:
- Bug report
- Feature request
- How-to / Documentation
- Billing / Account
- Security
- Feedback

### Step 4: Assess sentiment

Evaluate customer tone:
- Frustrated: Urgent language, multiple exclamation marks, negative words
- Neutral: Standard inquiry, no emotional language
- Positive: Praise, constructive feedback

### Step 5: Generate routing recommendation

Based on category, priority, and available context:
- Route to appropriate team/queue
- Flag for escalation if needed
- Suggest response approach

## Quality checks

- [ ] Priority accurately reflects urgency
- [ ] Category matches the actual issue type
- [ ] Sentiment assessment is reasonable
- [ ] SLA deadline is calculated correctly
- [ ] Routing recommendation makes sense

## Guardrail notes

Low risk — assessment only, no customer contact. No approval needed.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Triage and prioritize incoming support tickets
- When to use: New ticket assessment and routing

### On Invoke (Load When Skill is Invoked)
- Full triage procedure and priority definitions
- Sentiment analysis and routing logic

### On Demand Resources
- Priority escalation matrix
- Category taxonomy reference
`
};
