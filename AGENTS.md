# AGENTS.md

This file provides guidance for coding agents working on the TasteKit codebase.

## Project Overview

TasteKit is a CLI-first tool for compiling user taste profiles into portable artifacts with Skills, MCP integration, trust management, tracing, and drift maintenance.

## Key Principles

1. **Artifact-first**: All outputs are files. Adapters map files to runtime environments.
2. **Deterministic compilation**: Same inputs must produce same artifacts. Record all LLM calls with hashes.
3. **Progressive disclosure**: Keep global taste summaries small. Skills load deeper context on invocation.
4. **MCP-first**: Use Model Context Protocol for all tool binding. No custom tool protocols.
5. **Trust-by-default**: Pin MCP servers and skill sources. Never auto-enable new tools.
6. **Trace-first**: All operations produce machine-readable traces.
7. **Maintenance is core**: Drift detection and staleness checks are v1 features, not future work.

## What NOT to Assume

- **Do not assume websockets exist**: Core must work with polling-based transports
- **Do not implement a memory database**: Map to runtime memory systems instead
- **Do not store secrets in repo files**: Only store references (env var names, secret IDs)
- **Do not invent MCP tool schemas**: Follow the official MCP specification

## Architecture

The project uses a monorepo structure with pnpm workspaces:

- `packages/core`: Core library with schemas, compiler, skills, MCP, trust, tracing modules
- `packages/cli`: Command-line interface built on Commander.js
- `packages/adapters`: Runtime adapters for Claude Code, Manus, OpenClaw, Autopilots

## Schema Versioning

All artifacts use versioned schemas (e.g., `constitution.v1`, `guardrails.v1`). Schema versions are embedded in the artifact files themselves. When making schema changes:

1. Create a new schema version (e.g., `constitution.v2`)
2. Maintain backward compatibility or provide migration tools
3. Update the compiler to generate the new version

## Testing Requirements

All code must pass these acceptance tests:

1. Schema validation for all example profiles
2. MCP bind test with mocked server (no silent tool changes)
3. Skills lint passes for bundled examples
4. Simulate generates trace + draft output without side effects
5. Drift detect produces proposals from synthetic traces
6. Export/import round-trip preserves core rules
7. Trust audit flags changed MCP fingerprints

## Security Requirements

- No secrets in artifacts (only references)
- Trust pinning defaults to strict mode
- No auto-enabling of tools on MCP changes
- Provide threat model documentation covering:
  - Malicious MCP servers
  - Malicious skill packs
  - Prompt injection via retrieved content
  - Tool misuse scenarios

## Code Style

- Use TypeScript with strict mode enabled
- Follow ESM module syntax
- Use Zod for runtime schema validation
- Prefer functional programming patterns
- Write comprehensive JSDoc comments for public APIs

## Development Workflow

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Normative References

Align with these specifications:

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/concepts/security)
- Agent Skills best practices (progressive disclosure, bounded instructions)
- Claude Code Hooks (adapter enforcement/logging surface)

## Questions?

Refer to the specification document or open an RFC in `community/RFC/`.
