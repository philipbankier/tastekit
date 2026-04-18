/**
 * Knowledge Base Update Skill
 *
 * Capture new solutions and close documentation gaps.
 */

export const KnowledgeBaseUpdateSkill = {
  skill_id: 'knowledge-base-update',
  name: 'Knowledge Base Update',
  description: 'Identifies when a support case should become documentation and drafts clear knowledge base updates. Use when a resolved issue exposes a repeatable fix, missing article, or stale support guidance.',
  tags: ['support', 'documentation', 'knowledge-base'],
  risk_level: 'low' as const,
  required_tools: ['knowledge-base', 'document-editor'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['troubleshooting', 'response-crafting'],
  pipeline_phase: 'archive',
  context_model: 'inherit' as const,

  skill_md_content: `# Knowledge Base Update

## Purpose

Turn resolved support work into reusable documentation so future cases can be solved faster and more consistently.

## When to use

- A new issue pattern has been resolved
- Existing documentation is missing, incomplete, or outdated
- Repeated tickets suggest a self-service article should exist

## When NOT to use

- When the solution is still uncertain or not yet validated
- When the case is too account-specific to generalize safely

## Inputs

- **case_summary**: Issue, root cause or workaround, and final resolution
- **doc_gap**: Missing article, stale article, or weak troubleshooting steps
- **target_audience**: Internal support team, external customers, or both

## Outputs

- **kb_update_draft**: Draft article or revision notes
- **reuse_rationale**: Why this information belongs in the knowledge base
- **follow_up_gaps**: Any validation or screenshots still needed

## Procedure

### Step 1: Confirm the solution is reusable

- Check that the fix or workaround is repeatable and accurate
- Decide whether the audience is internal, external, or both

### Step 2: Structure the article

- Document symptoms, cause, steps, and expected outcome
- Make prerequisites, warnings, and limits easy to find

### Step 3: Improve findability

- Use titles, keywords, and cross-links that match how cases are described
- Flag overlaps with existing articles

### Step 4: Capture remaining gaps

- Note screenshots, approvals, or validation still needed before publishing
- Keep the update scoped to verified information

## Quality checks

- [ ] The article reflects a validated solution
- [ ] Steps are reproducible and easy to follow
- [ ] Audience and publishing scope are correct
- [ ] Remaining gaps are explicitly called out

## Guardrail notes

Do not publish guessed fixes or account-specific private details as general guidance.
`,
};
