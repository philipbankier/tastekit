/**
 * Lead Qualification Skill
 *
 * Assess and score inbound leads against qualification criteria.
 */

export const LeadQualificationSkill = {
  skill_id: 'lead-qualification',
  name: 'Lead Qualification',
  description: 'Assess and score inbound leads against ideal customer profile and qualification criteria',
  tags: ['sales', 'lead-scoring', 'qualification'],
  risk_level: 'low' as const,
  required_tools: [],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  feeds_into: ['outreach-email'],
  pipeline_phase: 'capture',
  context_model: 'inherit' as const,

  skill_md_content: `# Lead Qualification

## Purpose

Evaluate inbound leads against the user's ideal customer profile and qualification criteria, producing a score and recommendation.

## When to use

- New lead comes in and needs initial assessment
- Batch evaluation of a lead list
- Re-qualifying leads after new information surfaces
- Prioritizing leads in the pipeline

## When NOT to use

- For lead generation or prospecting (use outreach skills)
- When the lead is already a customer (use account management)
- For deal negotiation or closing

## Inputs

- **lead_data**: Available information about the lead (company, role, source, etc.)
- **qualification_criteria**: From constitution (ideal customer profile, deal-breakers)
- **scoring_model**: Optional custom scoring weights

## Outputs

- **qualification**: Assessment with:
  - **score**: 0-100 qualification score
  - **grade**: A/B/C/D rating
  - **fit_analysis**: How the lead matches ideal customer profile
  - **gaps**: Missing information needed for full qualification
  - **recommendation**: Next action (pursue, nurture, disqualify)
  - **rationale**: Explanation of the scoring

## Procedure

### Step 1: Gather available data

Review all available lead information:
- Company details (size, industry, location)
- Contact details (role, seniority, department)
- Source and context (how they arrived)
- Any prior interactions

### Step 2: Score against criteria

Evaluate each qualification dimension:
- Budget/financial fit
- Authority (decision-making power)
- Need (pain point alignment)
- Timeline (urgency)
- Fit (industry, size, use case match)

### Step 3: Identify gaps

Note any missing information that would improve the assessment:
- Unknown budget range
- Unclear decision-making process
- Unconfirmed timeline

### Step 4: Generate recommendation

Based on score and gaps:
- **A leads**: Immediate outreach, high priority
- **B leads**: Qualified, schedule follow-up
- **C leads**: Nurture, needs more qualification
- **D leads**: Disqualify or park

## Quality checks

- [ ] All available data points considered
- [ ] Scoring is consistent with qualification criteria
- [ ] Gaps are clearly identified
- [ ] Recommendation is actionable
- [ ] Rationale is transparent and explainable

## Guardrail notes

Low risk — assessment only, no customer contact. No approval needed.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Score and qualify inbound leads
- When to use: New lead assessment and prioritization

### On Invoke (Load When Skill is Invoked)
- Full scoring procedure and criteria
- Quality checks and gap analysis

### On Demand Resources
- BANT/MEDDIC framework templates
- Industry-specific qualification criteria
`
};
