/**
 * Troubleshooting Skill
 *
 * Systematically diagnose issues and guide resolution.
 */

export const TroubleshootingSkill = {
  skill_id: 'troubleshooting',
  name: 'Troubleshooting',
  description: 'Diagnoses support issues methodically and recommends the next best resolution step. Use when the agent needs to isolate causes, collect missing evidence, and move a case toward resolution.',
  tags: ['support', 'diagnosis', 'resolution'],
  risk_level: 'med' as const,
  required_tools: ['ticketing-system', 'knowledge-base'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  feeds_into: ['response-crafting', 'knowledge-base-update'],
  pipeline_phase: 'verify',
  context_model: 'inherit' as const,

  skill_md_content: `# Troubleshooting

## Purpose

Diagnose customer issues in a structured way so the resolution path is evidence-based rather than guesswork.

## When to use

- Investigating a reported bug or broken workflow
- Narrowing down likely causes before replying
- Determining what information is still missing from the customer

## When NOT to use

- When the issue is already understood and only response polish is needed
- When the case requires immediate escalation due to security, compliance, or outage risk

## Inputs

- **issue_report**: Customer description, symptoms, timeline, and impact
- **environment_context**: Product area, version, device, account, or configuration details
- **known_history**: Prior tickets, troubleshooting already attempted, or relevant KB entries

## Outputs

- **diagnosis_summary**: Likely causes and confidence notes
- **next_steps**: Ordered actions to confirm or resolve the issue
- **missing_info**: Specific questions or evidence still needed

## Procedure

### Step 1: Clarify the problem

- Restate the issue in concrete terms
- Separate symptoms, impact, environment, and timeline

### Step 2: Narrow the search space

- Check for known patterns, recent changes, and likely failure points
- Eliminate obvious causes before proposing advanced fixes

### Step 3: Recommend the next best test

- Prioritize low-risk, high-signal troubleshooting steps
- Explain what each step is meant to confirm

### Step 4: Decide resolution vs escalation

- Escalate when impact, risk, or uncertainty exceeds support scope
- Keep the handoff crisp with evidence attached

## Quality checks

- [ ] Problem statement is clear and specific
- [ ] Suggested steps are ordered and purposeful
- [ ] Missing information requests are concrete
- [ ] Escalation is flagged when appropriate

## Guardrail notes

Do not claim a root cause without enough evidence to support it.
`,
};
