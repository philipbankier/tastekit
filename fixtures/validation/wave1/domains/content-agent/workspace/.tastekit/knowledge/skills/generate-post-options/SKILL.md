# Generate Post Options

## Purpose

Create multiple distinct variations of a social media post based on a topic or situation, allowing the user to choose the best option.

## When to use

- Quick content creation for immediate posting
- When you have a clear topic but need different angles
- For A/B testing different hooks or styles
- When you want options to choose from

## When NOT to use

- For complex, multi-step content workflows
- When you need research before writing
- For long-form content (use specialized skills instead)

## Inputs

- **topic**: The subject or situation to write about
- **platform**: Target platform (twitter, linkedin, etc.)
- **tone**: Desired tone (from constitution, can be overridden)
- **num_options**: Number of variations (default: 3)
- **constraints**: Character limits, hashtag requirements, etc.

## Outputs

- **options**: Array of post variations with:
  - **text**: The post content
  - **hook_style**: The approach used (question, statement, story, etc.)
  - **rationale**: Why this variation might work

## Procedure

### Step 1: Understand the context

Review:
- The topic or situation provided
- Platform constraints (character limits, format)
- Brand voice from constitution
- Any specific tone override

### Step 2: Generate diverse variations

Create [num_options] distinct posts, each using a different approach:

1. **Question Hook**: Start with an engaging question
2. **Bold Statement**: Make a strong, attention-grabbing claim
3. **Personal Story**: Share a relatable anecdote
4. **Data/Stat**: Lead with a surprising number
5. **Contrarian Take**: Challenge conventional wisdom

Ensure each variation:
- Stays true to brand voice
- Fits platform constraints
- Uses different angles (not just rewording)

### Step 3: Add context for each option

For each variation, explain:
- What hook style was used
- Why it might resonate with the audience
- Any tradeoffs (e.g., more engaging but riskier)

### Step 4: Present options clearly

Format output as:
```
Option 1: [Hook Style]
[Post text]

Rationale: [Why this works]

---

Option 2: [Hook Style]
...
```

## Quality checks

- [ ] Each option is meaningfully different (not just reworded)
- [ ] All options fit platform constraints
- [ ] Tone matches brand voice
- [ ] Hooks are attention-grabbing
- [ ] No forbidden phrases used
- [ ] Grammar and spelling are correct

## Guardrail notes

This skill generates text only. No approval required unless the topic is sensitive or the autonomy level is set to require approval for all content.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Create 3-5 post variations for user selection
- When to use: Quick content creation with options

### On Invoke (Load When Skill is Invoked)
- Full procedure with hook styles
- Quality checks and output format

### On Demand Resources
- Examples of effective hooks by platform
- Platform-specific best practices
