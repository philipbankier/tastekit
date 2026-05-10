# TasteKit v1.0 - Project Summary

**TasteKit** is a comprehensive, open-source CLI tool and library for building domain-specific AI agents. It compiles user taste profiles into portable, versioned artifacts with specialized Skills, MCP integration, trust management, trace-first logging, and continuous drift maintenance.

## Project Status

✅ **v1.0 - Six-Domain Production Release Pass**

This release hardens TasteKit's domain-focused agent building model for six production domains: General, Development, Content, Research, Sales, and Support. Release validation gates now enumerate all six domains before docs can claim production readiness.

## Release Direction

Based on real-world feedback and use case analysis, TasteKit moved from a generic "one-size-fits-all" profile toward a **domain-based architecture**. This makes TasteKit immediately useful for specific workflows instead of requiring users to specialize a generic agent from scratch.

### Key Improvements

**Before:** Generic onboarding → Generic skills → User figures out specialization
**Now:** Choose domain → Specialized onboarding → Pre-built domain skills → Ready to use

This change was inspired by analyzing successful AI agents like "Larry" (an OpenClaw agent that got millions of TikTok views), which demonstrated that **the system around the agent** (specialized skills, workflows, tool integrations) is just as important as the AI model itself.

## Architecture Overview

TasteKit follows a **monorepo structure** with domain-focused organization:

### 1. Core Library (`@actrun_ai/tastekit-core`)

The foundation combines artifact compilation with the domains system:

**Core modules**:
- **Schemas**: Zod-based runtime validation for all artifact types
- **Compiler**: Transforms onboarding sessions into canonical artifacts
- **Interview**: Manages onboarding wizard and session state
- **Skills**: Agent Skills with progressive disclosure
- **MCP**: Model Context Protocol integration
- **Trust**: Security and provenance management
- **Tracing**: Trace-first logging
- **Drift**: Drift detection and memory consolidation
- **Eval**: Evaluation and judging
- **Utils**: Filesystem, hash, YAML utilities

**Domain modules**:
- **Domains**: Domain-specific packages with specialized onboarding, skills, and playbooks

```
packages/core/domains/
├── general-agent/          # Fully implemented
│   ├── domain.ts           # Domain metadata
│   ├── rubric.ts           # Domain rubric
│   ├── skills/             # Pre-built skills
│   │   └── index.ts
├── development-agent/      # Fully implemented
│   ├── domain.ts
│   ├── rubric.ts
│   ├── skills/
│   │   └── index.ts
├── content-agent/          # Production domain
├── research-agent/         # Production domain
├── sales-agent/            # Production domain
├── support-agent/          # Production domain
└── index.ts                # Domain registry
```

### 2. CLI (`@actrun_ai/tastekit-cli`)

The CLI remains largely unchanged, with domain selection added to the `init` command:

```bash
$ tastekit init
? What type of agent are you building?
  ❯ General Agent - Mixed technical and non-technical work
    Development Agent - Software development tasks
    Content Agent - Content creation and editorial workflows
    Research Agent - Research and synthesis
    Sales Agent - Sales and account workflows
    Support Agent - Customer support and troubleshooting
```

### 3. Adapters

Runtime adapters remain the same as v1.0:
- Claude Code
- Manus
- OpenClaw
- Autopilots

## Production Domains

The release surface is:

| Domain | Primary Work |
| :--- | :--- |
| **General Agent** | Mixed technical and non-technical work, planning, synthesis, and decision support |
| **Development Agent** | Code review, debugging, tests, refactors, and engineering documentation |
| **Content Agent** | Brand voice, editorial drafting, channel adaptation, and publishing boundaries |
| **Research Agent** | Source discovery, evidence grading, synthesis, and competitive analysis |
| **Sales Agent** | Account research, qualification, buyer-facing follow-up, and deal-risk escalation |
| **Support Agent** | Troubleshooting, customer communication, privacy-safe assistance, and escalation |

Each production domain includes metadata, a depth-aware rubric, domain assets, and validation coverage. The release gate replays committed fixtures for all six domains and fails if any domain cannot compile canonical `.tastekit/constitution.v1.json`, guardrails, memory, skills, playbooks, and runtime exports.

## Design Principles (Unchanged from v1.0)

1. **Artifact-first**: Everything compiles into files
2. **Deterministic compilation**: Same inputs → same artifacts
3. **Progressive disclosure**: Minimal context by default
4. **MCP-first**: Standard protocol for tools
5. **Trust-by-default**: Explicit trust required
6. **Trace-first**: All operations logged
7. **Maintenance is v1**: Drift detection from day one

## Documentation

Complete documentation suite:

- `README.md` - Project overview and quick start
- `docs/overview.md` - Core concepts and design principles
- `docs/quickstart.md` - Step-by-step getting started guide
- `docs/schemas.md` - Complete artifact schema reference
- `docs/skills.md` - Agent Skills and progressive disclosure
- `docs/mcp.md` - MCP integration workflow
- `docs/security.md` - Security model and threat model
- `docs/tracing.md` - Trace-first philosophy and replay
- **`docs/domains.md`** - **New:** Domain architecture overview
- `docs/adapters/` - Adapter-specific documentation
- `CHANGELOG.md` - Version history
- `ROADMAP.md` - Future development plans
- `LAUNCH_GUIDE.md` - Launch preparation checklist
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js v18+
- **Package Manager**: pnpm (workspaces)
- **Validation**: Zod for runtime schema validation
- **CLI Framework**: Commander.js
- **Interactive Prompts**: Inquirer
- **Styling**: Chalk for terminal colors, Ora for spinners
- **YAML**: yaml package for canonical formatting

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Initialize a workspace (choose a production domain)
tastekit init

# Run specialized onboarding
tastekit onboard --depth guided

# Compile artifacts
tastekit compile

# Add MCP tools
tastekit mcp add <server_url>
tastekit mcp bind --interactive

# Export for runtime
tastekit export --target manus --out ./profile
```

## What's Next

### Short-term
- Keep six-domain fixtures generated and current
- Expand domain-specific skills and playbooks
- Add more adapter contract coverage
- Improve release evidence capture

### Medium-term
- Keep six production domains green in deterministic and live gates
- Production-ready MCP client
- Comprehensive test suite
- VSCode extension for skill authoring
- Skills marketplace concept

### Long-term (v2.0+)
- Runtime integrations (not just export/import)
- Real-time drift detection
- Web-based dashboard
- Multi-user/team workspaces

See `ROADMAP.md` for detailed plans.

## Contributing

We welcome contributions! The domain architecture makes it easy to contribute:

1. **Add skills to existing domains** (especially Content Agent)
2. **Deepen production domains** (Research, Sales, Support, Development, Content, General)
3. **Create new domains** for other use cases
4. **Improve documentation** and examples
5. **Build adapters** for additional runtimes

See `CONTRIBUTING.md` for guidelines.

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ following the TasteKit specification and real-world use case analysis**
