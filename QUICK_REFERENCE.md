# TasteKit v0.5 - Quick Reference

Archived v0.5 scenario note: this file describes an older content-agent planning workflow. For the current v1 release surface, use `README.md` or `docs/quickstart.md`; shipped domains are `development-agent` and `general-agent`.

This is a concise reference for the most common TasteKit commands and workflows.

## Your Two-Agent Setup

You are creating two distinct Content Agents:

| Agent | Workspace | Onboarding Depth | Brand Voice | Target Platforms |
|:------|:----------|:-----------------|:------------|:-----------------|
| **Personal Brand** | `~/my-content-agents/personal-brand-agent` | Full Taste Composition | Brash, edgy, personal | Twitter, LinkedIn |
| **Autopilot Brand** | `~/my-content-agents/autopilot-brand-agent` | `guided` (high rigor) | Professional, technical | Twitter, LinkedIn |

## Essential Commands

### Initialization

```bash
# Create a new agent workspace
tastekit init
```

You will be prompted to select a domain. Choose **Content Agent**.

### Onboarding

```bash
# Full Taste Composition (for personal brand)
tastekit onboard --depth full

# High rigor (for Autopilot brand)
tastekit onboard --depth guided

# Quick setup (for testing)
tastekit onboard --depth quick
```

### Compilation

```bash
# Compile your answers into artifacts
tastekit compile
```

This creates `.tastekit/constitution.v1.json` plus runtime artifacts for your agent's configuration.

### Exporting to Runtimes

```bash
# Export for OpenClaw
tastekit export --target openclaw --out ./openclaw-profile

# Export for Autopilots
tastekit export --target autopilots --out ./autopilot-profile

# Export for Manus
tastekit export --target manus --out ./manus-profile

# Export for Claude Code
tastekit export --target claude-code --out ./claude-profile
```

### Skills Management

```bash
# List all available skills
tastekit skills list

# View a specific skill
tastekit skills show research-trends

# Generate new skills (future feature)
tastekit skills generate
```

### MCP Tool Integration

```bash
# Add an MCP server
tastekit mcp add <server_url>

# List MCP servers
tastekit mcp list

# Bind tools interactively
tastekit mcp bind --interactive
```

### Drift Detection

```bash
# Check for drift in your agent's behavior
tastekit drift detect

# Review drift proposals
tastekit drift review

# Apply approved drift changes
tastekit drift apply
```

## Typical Workflow

### First-Time Setup (Per Agent)

1.  Create a workspace directory for the agent.
2.  Navigate to that directory.
3.  Run `tastekit init` and select **Content Agent**.
4.  Run `tastekit onboard --depth <level>`.
5.  Run `tastekit compile`.

### Exporting to a Runtime

1.  Navigate to the agent's workspace directory.
2.  Run `tastekit export --target <runtime> --out <output_dir>`.
3.  Load the exported profile into your runtime (OpenClaw, Autopilots, etc.).

### Updating an Existing Agent

1.  Navigate to the agent's workspace directory.
2.  Run `tastekit onboard --depth <level>` again to update answers.
3.  Run `tastekit compile` to regenerate artifacts.
4.  Re-export to your runtime if needed.

## File Structure

After initialization and compilation, your workspace will look like this:

```
your-agent-workspace/
├── .tastekit/
│   ├── constitution.v1.json
│   ├── guardrails.v1.yaml
│   ├── memory.v1.json
│   ├── bindings.v1.yaml
│   ├── trust.v1.json
│   ├── playbook.v1.yaml
│   ├── skills.v1.json
│   ├── session/
│   │   └── onboarding-session.json
│   └── traces/
│       └── [trace files]
└── [exported profiles if you ran export]
```

## Onboarding Depth Comparison

| Depth | Questions Asked | Best For | Time Required |
|:------|:----------------|:---------|:--------------|
| **quick** | ~5 essential questions | Testing, prototyping | 2-3 minutes |
| **guided** | ~15 comprehensive questions | Production agents, businesses | 10-15 minutes |
| **full** | Coverage-driven Full Taste Composition | Max customization, personal brands | Completion-based |

## Domain-Specific Features (Content Agent)

### Brand Archetypes

Choose from: Professional, Casual, Edgy, Humorous, Educational, Inspirational, Technical

### Supported Platforms

Twitter, LinkedIn, TikTok, Instagram, YouTube, Facebook, Blog, Newsletter

### Content Types

Short-form text, Long-form text, Image posts, Carousels, Videos, Threads, Stories

### Workflow Modes

- **Simple**: Topic → 3 options → Choose
- **Assisted**: Research → Propose → Approve
- **Autopilot**: Ideate → Plan → Create → Schedule (with review)

## Getting Help

```bash
# View help for any command
tastekit --help
tastekit onboard --help
tastekit export --help
```

## Troubleshooting

**Issue**: `tastekit: command not found`  
**Solution**: Make sure you've run `pnpm build` in the TasteKit project directory and that the CLI is properly linked.

**Issue**: Onboarding session is interrupted  
**Solution**: TasteKit saves your progress. Simply run `tastekit onboard --depth <level>` again to resume.

**Issue**: Compilation fails  
**Solution**: Check that you've completed the onboarding process. Run `tastekit onboard --depth <level>` to ensure all required questions are answered.

## Next Steps

- Read `SETUP_GUIDE.md` for detailed setup instructions
- Read `OPENCLAW_GUIDE.md` for OpenClaw integration
- Read `AUTOPILOTS_GUIDE.md` for Autopilots integration
- Explore `docs/domains.md` for the currently shipped domains
