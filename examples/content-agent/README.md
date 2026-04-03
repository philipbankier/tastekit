# Content Agent Example

A full content creation agent with guided onboarding, skills, playbooks, and MCP tool integration.

## Setup

```bash
cd examples/content-agent

# Initialize for content creation with guided depth
tastekit init --domain content-agent --depth guided

# Run the 15-minute LLM interview
tastekit onboard

# Compile all artifacts
tastekit compile
```

## What You Get

The `guided` depth covers 13 dimensions (5 quick + 8 guided), producing a thorough content profile:

```
.tastekit/
├── artifacts/
│   ├── constitution.v1.json     # Principles, tone, brand voice
│   ├── guardrails.v1.yaml       # Content approval rules
│   ├── memory.v1.yaml           # What the agent remembers about your style
│   └── playbooks/
│       ├── simple-post.v1.yaml          # Single post creation
│       ├── research-and-post.v1.yaml    # Research-informed content
│       └── content-calendar.v1.yaml     # Multi-day planning
├── skills/
│   ├── manifest.v1.yaml
│   ├── research-trends/SKILL.md
│   └── generate-post-options/SKILL.md
└── session.json
```

## Skills

| Skill | Risk | Description |
|:---|:---:|:---|
| `research-trends` | low | Research current trends and topics in your niche |
| `generate-post-options` | low | Generate multiple post variations for review |

Each skill uses progressive disclosure:
- **Minimal Context** (always loaded): Skill name, description, required tools
- **On Invoke**: Detailed instructions, input/output format, examples
- **On Demand**: Reference material, brand guidelines, past performance data

## Playbooks

### simple-post

Quick single-post workflow: think about topic → draft post → review.

### research-and-post

Research-first workflow: search for trends → synthesize findings → draft informed post → review.

### content-calendar

Multi-day planning: analyze recent performance → identify content gaps → plan 5-7 posts → draft each.

## Adding MCP Tools

For richer content creation, add web search:

```bash
# Add a web search MCP server
tastekit mcp add npx @anthropic/mcp-server-web-search --name web-search

# Inspect available tools
tastekit mcp inspect web-search

# Bind and auto-generate guardrails
tastekit mcp bind

# Verify trust
tastekit trust init
tastekit trust audit
```

## Export

```bash
# For Claude Code
tastekit export --target claude-code

# For OpenClaw
tastekit export --target openclaw --out ./openclaw-profile

# Generate AGENTS.md
tastekit export --target agents-md
```

## Ongoing Maintenance

As your agent creates content, traces accumulate in `.tastekit/traces/`. Use them:

```bash
# Check if the agent is drifting from your style
tastekit drift detect

# Run evaluations
tastekit eval run --pack .tastekit/evals/tone-check.yaml

# Review and apply drift proposals
tastekit drift apply <proposal_id>

# Recompile after drift changes
tastekit compile
```
