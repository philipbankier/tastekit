# Content-Style Agent Example

This v1 example uses the shipped `content-agent` domain for content-style workflows.

## Setup

```bash
cd examples/content-agent

# Initialize with the content domain
tastekit init --domain content-agent --depth guided

# Run the guided LLM interview
tastekit onboard

# Compile all artifacts
tastekit compile
```

## What You Get

The `guided` depth produces a content-focused profile with brand voice, channel strategy, evidence policy, and approval boundaries:

```
.tastekit/
├── constitution.v1.json     # Principles, tone, tradeoffs, taboos
├── guardrails.v1.yaml       # Approval and safety rules
├── memory.v1.yaml           # What the agent remembers about your style
├── skills/
│   └── manifest.v1.yaml
└── session.json
```

## Skills

| Skill | Risk | Description |
|:---|:---:|:---|
| `content-voice-brief` | low | Turn source material and taste into an editorial brief |
| `content-draft-options` | low | Generate multiple content options from the brief |

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

For richer content creation, add web search if you have an MCP server available:

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
