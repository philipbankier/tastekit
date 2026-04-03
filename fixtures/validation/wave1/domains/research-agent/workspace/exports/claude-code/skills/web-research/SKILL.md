# Web Research

## Purpose

Gather, evaluate, and synthesize information from web sources on a given topic, producing a structured research output.

## When to use

- Answering factual questions requiring current information
- Background research on a topic, company, or person
- Gathering data points for analysis or reporting
- Fact-checking claims or verifying information

## When NOT to use

- For academic literature reviews (use specialized academic tools)
- When the user already has all the data and needs analysis only
- For real-time monitoring (use monitoring workflows instead)

## Inputs

- **topic**: The subject to research
- **scope**: Breadth of research (narrow, moderate, broad)
- **source_preferences**: Preferred source types (optional, from constitution)
- **max_sources**: Maximum number of sources to consult (default: 10)

## Outputs

- **findings**: Structured research findings with:
  - **summary**: Executive summary of findings
  - **key_points**: Bullet-point key findings
  - **sources**: List of sources with titles, URLs, and relevance notes
  - **confidence**: Overall confidence level in findings

## Procedure

### Step 1: Scope the research

Review:
- The topic and any constraints
- Source preferences from constitution
- Time constraints or recency requirements

### Step 2: Search and gather

Execute web searches with:
- Multiple query variations for breadth
- Source type filtering based on preferences
- Recency filtering based on temporal scope

### Step 3: Evaluate sources

For each source:
- Assess authority and credibility
- Check publication date and relevance
- Note potential bias or limitations

### Step 4: Synthesize findings

Combine information across sources:
- Identify consensus points
- Note conflicting information
- Highlight gaps in available data

### Step 5: Format output

Structure findings according to user's synthesis style and output format preferences.

## Quality checks

- [ ] Multiple independent sources consulted
- [ ] Source credibility assessed
- [ ] Conflicting information noted
- [ ] Findings are relevant to the original topic
- [ ] Output format matches user preferences
- [ ] Citations included per citation standards

## Guardrail notes

Low risk — read-only web research. No approval needed unless accessing sensitive or restricted sources.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Web research and information synthesis
- When to use: Answering questions requiring current web information

### On Invoke (Load When Skill is Invoked)
- Full procedure with source evaluation criteria
- Quality checks and output formatting rules

### On Demand Resources
- Source credibility assessment frameworks
- Search query optimization techniques
