/**
 * Competitive Analysis Skill
 *
 * Profile competitors and the surrounding market.
 */

export const CompetitiveAnalysisSkill = {
  skill_id: 'competitive-analysis',
  name: 'Competitive Analysis',
  description: 'Profiles competitors, substitutes, and market positioning to identify patterns and strategic gaps. Use when mapping the competitive landscape, comparing offerings, or preparing positioning research.',
  tags: ['research', 'competitive', 'market-analysis'],
  risk_level: 'med' as const,
  required_tools: ['web-search', 'spreadsheets', 'citations'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  feeds_into: ['research-synthesis'],
  pipeline_phase: 'analyze',
  context_model: 'inherit' as const,

  skill_md_content: `# Competitive Analysis

## Purpose

Analyze competitors and adjacent substitutes to understand positioning, differentiation, and strategic whitespace.

## When to use

- Building a market landscape
- Comparing competitor messaging, product surface area, or pricing
- Preparing GTM, product, or strategy inputs
- Identifying positioning gaps or convergence trends

## When NOT to use

- When the request is only for broad industry research without competitor focus
- When internal proprietary data is required but unavailable

## Inputs

- **market**: Market or category to analyze
- **comparison_axes**: Optional dimensions such as pricing, features, audience, messaging
- **target_company**: Optional focal company for relative comparison

## Outputs

- **competitor_profiles**: Concise profiles of key players
- **comparison_matrix**: Differences across the requested axes
- **strategic_implications**: Opportunities, threats, and open questions

## Procedure

### Step 1: Define the landscape

- Identify direct competitors, adjacent substitutes, and emerging entrants
- Use a clear inclusion rule so the comparison set stays coherent

### Step 2: Gather comparable evidence

- Pull the same kinds of evidence for each company where possible
- Distinguish self-reported claims from third-party observations

### Step 3: Compare on the requested axes

- Look for meaningful differences, not just checklist parity
- Note where the market is converging or fragmenting

### Step 4: Extract implications

- Identify whitespace, messaging gaps, or strategic risks
- Separate observed facts from interpretation

## Quality checks

- [ ] Comparison set is coherent
- [ ] Evidence is comparable across players
- [ ] Self-reported claims are not treated as neutral fact
- [ ] Strategic implications are tied back to evidence

## Guardrail notes

Avoid overclaiming on hidden economics or internal strategy without evidence.
`,
};
