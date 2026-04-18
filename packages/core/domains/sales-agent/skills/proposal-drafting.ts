/**
 * Proposal Drafting Skill
 *
 * Draft proposals, commercial summaries, and deal recaps.
 */

export const ProposalDraftingSkill = {
  skill_id: 'proposal-drafting',
  name: 'Proposal Drafting',
  description: 'Drafts sales proposals, executive summaries, and deal recap documents that clarify scope, value, pricing, and next steps. Use when converting discovery into a concrete offer or commercial summary.',
  tags: ['sales', 'proposal', 'deal-support'],
  risk_level: 'med' as const,
  required_tools: ['document-editor', 'crm'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['lead-outreach'],
  feeds_into: ['pipeline-review'],
  pipeline_phase: 'create',
  context_model: 'inherit' as const,

  skill_md_content: `# Proposal Drafting

## Purpose

Turn opportunity context into a clear, persuasive proposal or deal summary that helps the buyer evaluate and advance the deal.

## When to use

- Drafting a proposal after discovery or qualification
- Summarizing scope, pricing, and deliverables before formal approval
- Producing internal or external deal recap documents

## When NOT to use

- When pricing or scope is still too unclear to state confidently
- When the task is only to diagnose pipeline health

## Inputs

- **deal_context**: Buyer goals, pain points, timeline, stakeholders, and risks
- **solution_scope**: Proposed services, product package, or implementation plan
- **commercial_terms**: Pricing, term length, options, and assumptions
- **document_type**: Proposal, recap, executive summary, or statement of work draft

## Outputs

- **draft_document**: Structured proposal or summary
- **open_items**: Questions, assumptions, or approvals still needed
- **positioning_notes**: Key value framing used in the draft

## Procedure

### Step 1: Define the buying case

- Restate the customer problem, desired outcome, and why action matters now
- Ensure the document reflects what was actually learned in discovery

### Step 2: Translate scope into value

- Connect deliverables or solution components to business outcomes
- Make pricing and options legible without hiding assumptions

### Step 3: Reduce ambiguity

- Call out dependencies, exclusions, and risks plainly
- Highlight next steps, approvals, and timeline expectations

### Step 4: Polish for decision-makers

- Keep the structure easy to scan for both champions and executives
- Use concise language that supports forward motion

## Quality checks

- [ ] Customer goals and proposed solution clearly connect
- [ ] Pricing and scope are understandable
- [ ] Assumptions and open items are visible
- [ ] Next steps are explicit

## Guardrail notes

Do not invent pricing approvals, commitments, or implementation details.
`,
};
