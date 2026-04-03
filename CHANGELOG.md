# Changelog

All notable changes to TasteKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-27

### Added

#### Full Guardrails Compilation
- **Domain-specific permissions**: Each domain (content, sales, development, research, support) generates tailored tool permissions with appropriate scopes and resource patterns
- **5-tier approval rules**: Autonomy-based thresholds (from full approval at <0.3 to autonomous at >=0.9), high-risk tool detection, domain-specific extra approvals, taboo block rules, and escalation rules
- **Rate limits**: Domain-adjusted rate limiting with cost sensitivity scaling
- **Rollback policies**: Domain-specific rollback playbook references
- **Structured answers support**: Dual-path compilation from rich StructuredAnswers or legacy flat answers

#### Full Memory Policy Compilation
- **Domain-specific salience rules**: Each domain gets specialized memory signals (e.g., sales: deal_context at 0.95, content: brand_voice at 0.95, dev: code_patterns at 0.9)
- **PII handling**: Automatic detection and redaction for sensitive domains (sales, support) and when privacy taboos are present
- **Retention customization**: TTL adjusted by cost sensitivity preferences
- **Update mode selection**: Consolidate mode for high autonomy (>=0.6), revise mode for lower
- **Domain-specific revisit triggers**: Tailored memory refresh triggers per domain

#### Trust Auditor — New Tool Detection
- `audit()` accepts optional `previousBindings` parameter for baseline comparison
- Emits `new_tool` warnings when tools not in the baseline are discovered
- Backward compatible — skips detection when no baseline provided

#### MCP Binder — Tool Selector Callback
- Added `toolSelector` callback to `BindingOptions` interface
- Core stays dependency-free of UI libraries; CLI injects interactive selector

#### Testing
- 48 new tests across 5 new test files (253 total, all passing)
- `guardrails-compiler.test.ts`: 16 tests covering schema validation, autonomy levels, domain presets, taboos, rate limits
- `memory-compiler.test.ts`: 16 tests covering schema validation, domain salience, PII handling, retention, update modes
- `skills-compiler.test.ts`: 5 tests covering domain skill generation and manifest validation
- `playbook-compiler.test.ts`: 6 tests covering domain playbook generation and schema validation
- `auditor.test.ts`: 3 new tests for new_tool baseline detection

#### CI/CD
- GitHub Actions release workflow (`.github/workflows/release.yml`): tag-triggered build, test, npm publish, and GitHub release creation
- ESLint 9 flat config with typescript-eslint (`eslint.config.js`)
- Working lint scripts in all packages

### Changed

- **Version**: Bumped from 0.5.0 to 1.0.0 across all packages
- **CI workflow**: Removed silent failure suppression (`|| echo`), updated pnpm 8→10, dropped Node 18.x (keep 20.x + 22.x)
- **Simulate command**: Now exits cleanly with a friendly "planned for v1.1" message instead of error exit
- **npm packaging**: All packages configured for public npm publishing with proper `publishConfig`, `files`, `repository`, and `author` fields
- **README**: Added CI/npm badges, "Why TasteKit?" section, npm install instructions
- **CONTRIBUTING.md**: Expanded with development setup, "how to add a domain/adapter" guides, and commit conventions

### Fixed

- Guardrails compiler no longer a stub — fully wires interview answers and domain context
- Memory compiler no longer a stub — generates domain-specific memory policies
- ESLint lint paths corrected for packages with source at root (not in `src/`)

## [0.5.0] - 2026-02-14

### Added - Domain-Based Architecture

This release introduces a major architectural shift to domain-focused agent building. Instead of creating generic agents, users now choose a specific domain (Content, Research, Sales, Support, Development) and receive specialized onboarding, skills, and playbooks for that domain.

#### Core Architecture
- **Domain System**: New `packages/core/domains/` structure for organizing domain-specific functionality
- **Domain Registry**: Central registry for discovering and loading available domains
- **Domain Selection**: Users choose their agent type during `tastekit init`

#### Content Agent Domain (Fully Implemented)
- **Specialized Onboarding**: 20+ domain-specific questions covering brand identity, platforms, content strategy, workflow preferences, tools, and performance metrics
- **Pre-built Skills**:
  - `research-trends`: Analyze what content is performing well in your niche
  - `generate-post-options`: Create 3-5 post variations for user selection
- **Platform Support**: Twitter, LinkedIn, TikTok, Instagram, YouTube, Facebook, Blog, Newsletter
- **Content Types**: Short-form text, long-form text, image posts, carousels, videos, threads, stories
- **Brand Archetypes**: Professional, casual, edgy, humorous, educational, inspirational, technical
- **Workflow Modes**: Simple (topic → options), Assisted (research → propose), Autopilot (autonomous)

#### Domain Stubs (Community Contribution Ready)
- **Research Agent**: Information gathering, analysis, and synthesis
- **Sales Agent**: Lead generation, qualification, and deal management
- **Support Agent**: Customer support and user assistance
- **Development Agent**: Software development assistance

#### Documentation
- New `docs/domains.md` explaining the domain architecture
- Domain contribution guidelines in `CONTRIBUTING.md`
- Research notes from real-world content agent use case (Larry/OpenClaw)

### Changed

- **Version**: Bumped from 1.0.0 to 0.5.0 to reflect pre-release status
- **README**: Updated to emphasize domain-focused approach
- **Project Status**: Positioned as functional but evolving, ready for community contributions

### Technical Details

The domain architecture is designed for extensibility:

```typescript
packages/core/domains/
├── content-agent/          # Fully implemented
│   ├── domain.ts           # Domain metadata
│   ├── questions.ts        # Specialized onboarding
│   ├── skills/             # Pre-built skills
│   └── playbooks/          # Example workflows
├── research-agent/         # Stub
├── sales-agent/            # Stub
├── support-agent/          # Stub
└── development-agent/      # Stub
```

Each domain is self-contained and can be developed independently by the community.

### Migration Notes

If you were using TasteKit v1.0 (unreleased):
- The core architecture remains the same (artifacts, schemas, compilation)
- New: Domain selection during initialization
- New: Domain-specific onboarding questions replace generic questions
- New: Pre-built skills for Content Agent domain

## [0.1.0] - 2026-02-13 (Internal)

This internal prototype was never publicly released. It was superseded by v0.5.0 with the domain-based architecture.

### Notes

The v0.1.0 prototype included all core modules (schemas, compiler, interview, skills, MCP, trust, tracing, drift, eval) but used a generic onboarding approach. Based on user feedback, we pivoted to a domain-focused architecture to make the tool immediately useful for specific use cases.

[1.0.0]: https://github.com/tastekit/tastekit/releases/tag/v1.0.0
[0.5.0]: https://github.com/tastekit/tastekit/releases/tag/v0.5.0
