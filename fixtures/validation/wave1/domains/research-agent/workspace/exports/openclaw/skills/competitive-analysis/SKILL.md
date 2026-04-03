# Competitive Analysis

## Purpose

Research and analyze competitors or market landscape, producing structured comparisons and strategic insights.

## When to use

- Evaluating competitors before a strategic decision
- Understanding market positioning and gaps
- Comparing features, pricing, or approaches across players
- Due diligence on companies or products

## When NOT to use

- For general topic research (use web-research instead)
- When user already has all competitive data and just needs formatting
- For real-time competitive monitoring

## Inputs

- **subject**: The company, product, or market to analyze
- **competitors**: Known competitors to include (optional, agent can discover)
- **framework**: Analysis framework (swot, feature_matrix, porters, custom)
- **focus_areas**: Specific aspects to compare (pricing, features, market_share, etc.)

## Outputs

- **analysis**: Structured competitive analysis with:
  - **overview**: Market landscape summary
  - **comparison_matrix**: Feature/attribute comparison table
  - **strengths_weaknesses**: Per-competitor assessment
  - **opportunities**: Identified gaps or opportunities
  - **sources**: Research sources used

## Procedure

### Step 1: Define the competitive landscape

- Identify the market segment
- List known competitors (user-provided + discovered)
- Define comparison dimensions

### Step 2: Research each competitor

For each competitor:
- Company overview and positioning
- Key products/features
- Pricing model (if available)
- Market presence and reputation
- Recent news or developments

### Step 3: Build comparison framework

Apply the requested framework:
- **SWOT**: Strengths, Weaknesses, Opportunities, Threats per competitor
- **Feature Matrix**: Feature-by-feature comparison table
- **Porter's Five Forces**: Industry structure analysis
- **Custom**: User-defined comparison dimensions

### Step 4: Identify insights

- Common strengths across competitors
- Gaps no competitor addresses
- Differentiation opportunities
- Market trends and direction

### Step 5: Format deliverable

Structure according to user's output format preferences with appropriate visualizations.

## Quality checks

- [ ] All specified competitors researched
- [ ] Comparison is fair and based on verifiable information
- [ ] Sources are cited for key claims
- [ ] Framework is consistently applied
- [ ] Insights are actionable, not just descriptive
- [ ] Bias toward or against any competitor is avoided

## Guardrail notes

Low risk — read-only research. Ensure ethical boundaries are respected (no accessing private/confidential competitor data). Flag if the user asks for information that would require unauthorized access.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Structured competitive and market analysis
- When to use: Evaluating competitors, market positioning

### On Invoke (Load When Skill is Invoked)
- Full procedure with framework options
- Quality checks and ethical guidelines

### On Demand Resources
- Framework templates (SWOT, Porter's, feature matrix)
- Industry-specific comparison dimensions
