# Contributing to TasteKit

We welcome contributions from the community! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+ (22 recommended)
- pnpm 10+
- An LLM provider for testing onboarding (Ollama works for local testing)

### Getting Started

```bash
git clone https://github.com/philipbankier/tastekit.git
cd tastekit
pnpm install
pnpm build
pnpm test
```

### Project Structure

```
packages/
├── core/          # @actrun_ai/tastekit-core - schemas, compiler, MCP, drift, eval, trust, tracing
├── cli/           # @actrun_ai/tastekit-cli  - CLI commands (commander.js)
└── adapters/      # @actrun_ai/tastekit-adapters - runtime adapters (Claude Code, OpenClaw, Manus, Autopilots)
```

Key directories in `core/`:
- `schemas/` — Zod schemas for all artifact types
- `compiler/` — Compiles interview answers into artifacts (constitution, guardrails, memory, skills, playbooks)
- `domains/` — Domain-specific rubrics, skills, and playbooks
- `interview/` — LLM-driven adaptive interviewer
- `mcp/` — MCP client, binder, inspector
- `drift/` — Drift detection and memory consolidation
- `trust/` — Fingerprint pinning and audit
- `tracing/` — JSONL trace writer and reader

## How to Add a New Domain

1. Create a directory under `packages/core/domains/your-domain/`
2. Add these files:
   - `domain.ts` — Domain metadata (id, name, description, recommended_tools, vocabulary)
   - `rubric.ts` — Interview rubric with domain-specific dimensions
   - `questions.ts` — Onboarding questions mapped to rubric dimensions
   - `skills/index.ts` — Pre-built skills for this domain
   - `playbooks/` — Domain-specific execution playbooks
   - `index.ts` — Re-exports
3. Register the domain in `packages/core/domains/index.ts`
4. Add the domain to `resolveDomainSkills()` in `compiler/skills-compiler.ts`
5. Add the domain to `resolveDomainPlaybooks()` in `compiler/playbook-compiler.ts`
6. Add tests

See `packages/core/domains/general-agent/` and `packages/core/domains/development-agent/` as reference implementations.

## How to Add a New Adapter

1. Create a directory under `packages/adapters/your-adapter/`
2. Implement the `AdapterInterface` from `adapter-interface.ts`:
   - `detect()` — Check if this runtime is present
   - `export()` — Transform TasteKit artifacts into the runtime's format
   - `install()` — Copy exported files to the runtime's expected location
3. Register the adapter in `packages/adapters/index.ts`
4. Add the export target to `packages/cli/src/commands/export.ts`
5. Add tests in `packages/adapters/__tests__/`

See `packages/adapters/claude-code/` as the reference implementation.

## Reporting Issues

- Use the GitHub issue tracker to report bugs or request features
- Provide detailed steps to reproduce the issue
- Include your Node.js version and OS

## Pull Requests

- Fork the repository and create a new branch for your feature or fix
- Ensure all tests pass: `pnpm test`
- Ensure lint passes: `pnpm lint`
- Follow the existing code style (Prettier is configured)
- Submit a pull request with a clear description of your changes

### Commit Conventions

We use descriptive commit messages:
- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `test:` — Test additions or changes
- `refactor:` — Code changes that neither fix bugs nor add features
- `chore:` — Build process, dependency updates, etc.

## RFCs

For major changes, please open an RFC (Request for Comments) in the `community/RFC/` directory to discuss the proposal with the community before implementation.

## Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.
