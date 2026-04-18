/**
 * Research Trends Skill
 *
 * Analyze emerging topics and content patterns in a niche.
 */

export const ResearchTrendsSkill = {
  skill_id: 'research-trends',
  name: 'Research Trends',
  description: 'Analyzes trending topics, recurring angles, and audience momentum within a niche. Use when developing a content calendar, validating what people are paying attention to, or looking for topic whitespace.',
  tags: ['content', 'research', 'trends'],
  risk_level: 'low' as const,
  required_tools: ['web-search', 'analytics'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  feeds_into: ['generate-post-options'],
  pipeline_phase: 'discover',
  context_model: 'inherit' as const,

  skill_md_content: `# Research Trends

## Purpose

Identify what is trending in a niche, why it is resonating, and where there may be content opportunities worth pursuing.

## When to use

- Building a content strategy or editorial calendar
- Looking for timely hooks in a niche
- Validating whether an angle is saturated or still differentiated
- Finding recurring audience questions and content gaps

## When NOT to use

- When the topic is evergreen and trend sensitivity does not matter
- When the user already has validated research and needs drafting instead

## Inputs

- **niche**: Category, market, or audience to analyze
- **time_window**: Optional recency window for trend detection
- **channels**: Optional platforms or publishers to focus on

## Outputs

- **trend_snapshot**: Key topics, formats, and narratives gaining traction
- **opportunity_map**: Whitespace, underserved angles, or contrarian takes
- **risk_notes**: Overused angles, weak signals, or items needing verification

## Procedure

### Step 1: Gather signal sources

- Look across credible publishers, search demand patterns, and relevant social or community channels
- Distinguish short-term spikes from durable shifts

### Step 2: Cluster patterns

- Group trends by theme, audience need, and content format
- Note what hooks or framings are repeatedly successful

### Step 3: Evaluate usefulness

- Identify which trends fit the user's audience and brand voice
- Separate real opportunity from low-value hype

### Step 4: Recommend angles

- Suggest timely content directions
- Include at least one differentiated or under-covered angle

## Quality checks

- [ ] Sources span more than one signal type
- [ ] Trend claims include a recency lens
- [ ] Recommendations connect to audience value, not just novelty
- [ ] Saturated angles are clearly flagged

## Guardrail notes

Treat weak social chatter as a hypothesis, not proof of sustained demand.
`,
};
