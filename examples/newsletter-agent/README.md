# Newsletter Agent Example

A content agent specialized for newsletter generation, demonstrating MCP tool integration and the `research-and-post` playbook.

## Setup

```bash
cd examples/newsletter-agent

# Initialize for content creation with operator depth (most thorough)
tastekit init --domain content-agent --depth operator

# Run the full onboarding interview (~30 min)
# Focus on newsletter-specific preferences when asked about content strategy
tastekit onboard

# Compile artifacts
tastekit compile
```

## Add Web Search

Newsletters need research. Add a web search MCP server:

```bash
# Add web search capability
tastekit mcp add npx @anthropic/mcp-server-web-search --name web-search

# Verify it works
tastekit mcp inspect web-search

# Bind tools — this auto-generates guardrails based on risk annotations
tastekit mcp bind
```

## Set Up Trust

Pin the MCP server so it can't be swapped without your knowledge:

```bash
tastekit trust init
tastekit trust pin-mcp web-search --fingerprint $(tastekit mcp inspect web-search --json | jq -r .fingerprint)
tastekit trust audit
```

## Generated Artifacts

The `operator` depth produces the most detailed profile:

```
.tastekit/
├── artifacts/
│   ├── constitution.v1.json     # Deep principles, detailed tone rules
│   ├── guardrails.v1.yaml       # Approvals for external publishing
│   ├── memory.v1.yaml           # Remember past topics, audience feedback
│   ├── trust.v1.json            # Pinned web-search server
│   ├── bindings.v1.json         # Bound web-search tools
│   └── playbooks/
│       ├── simple-post.v1.yaml
│       ├── research-and-post.v1.yaml    # <-- primary newsletter workflow
│       └── content-calendar.v1.yaml
├── skills/
│   ├── manifest.v1.yaml
│   ├── research-trends/SKILL.md
│   └── generate-post-options/SKILL.md
└── session.json
```

## The Newsletter Workflow

The `research-and-post` playbook is ideal for newsletters:

1. **Think** — Identify the newsletter topic and angle
2. **Tool (web-search)** — Research current news, data, and opinions
3. **Think** — Synthesize findings into key insights
4. **Write** — Draft the newsletter following your tone and structure preferences
5. **Approval gate** — Review before sending

This playbook respects your constitution's `autonomy_level`. If set to `suggest`, it pauses at the approval gate. If set to `full-auto`, it proceeds without human review.

## Export for Your Runtime

```bash
# For Claude Code — get a CLAUDE.md with your newsletter preferences baked in
tastekit export --target claude-code

# For OpenClaw — generates openclaw.config.json
tastekit export --target openclaw

# For sharing — export as a Letta Agent File
tastekit export --target agent-file
```

## Tips

- During onboarding, emphasize your newsletter's unique angle, target audience, and preferred structure
- Set `autonomy_level` to `suggest` initially — you can increase to `auto` once you trust the output
- Use `tastekit eval run` regularly to check if your agent's tone stays consistent
- Run `tastekit drift detect` weekly to catch style drift before it becomes an issue
