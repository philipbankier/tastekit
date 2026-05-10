# Research Trends

## Purpose

Analyze what content is currently performing well in your niche or on your target platform to inform content strategy.

## When to use

- Before planning a content calendar
- When you need fresh ideas
- When performance is declining and you need to adapt
- When entering a new topic area

## When NOT to use

- For evergreen content that doesn't depend on trends
- When you have a specific, time-sensitive topic to cover
- If you already have a validated content plan

## Inputs

- **niche**: The topic area or industry (e.g., "AI agents", "productivity tools")
- **platform**: The target platform (e.g., "twitter", "linkedin")
- **timeframe**: How recent (e.g., "past week", "past month")

## Outputs

- **trending_topics**: List of trending topics in the niche
- **winning_formats**: Content formats that are performing well
- **example_posts**: Links to high-performing posts
- **insights**: Key takeaways and patterns

## Procedure

### Step 1: Search for recent high-performing content

Use the web-search tool to find:
- Top posts in the niche from the past [timeframe]
- Viral content on [platform] related to [niche]
- Trending hashtags or topics

### Step 2: Analyze patterns

Look for:
- Common themes or topics
- Content formats (threads, videos, carousels, etc.)
- Hook styles (questions, bold statements, storytelling)
- Engagement patterns (what gets comments vs. shares)

### Step 3: Extract insights

Identify:
- 3-5 trending topics worth covering
- 2-3 content formats to try
- Specific hooks or angles that are working

### Step 4: Document findings

Save the research to a file in the workspace:
- `.tastekit/research/trends-[date].md`

## Quality checks

- [ ] Found at least 5 high-performing examples
- [ ] Identified clear patterns (not just random posts)
- [ ] Insights are actionable (can be turned into content ideas)
- [ ] Research is recent (within specified timeframe)

## Guardrail notes

This skill requires web search access. No approval needed as it's read-only research.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Analyze trending content in your niche
- When to use: Before content planning or when needing fresh ideas

### On Invoke (Load When Skill is Invoked)
- Full procedure with search strategies
- Quality checks and output format

### On Demand Resources
- Example research reports
- Platform-specific search strategies
