# TasteKit P0 Blockers + Wave 0 Hardening

**Date:** 2026-04-16
**Status:** Ready for execution
**Source:** HANDOFF.md gap analysis

---

## Phase 1: P0 Ship Blockers (Fix broken references)

### 1.1 Create missing validation scripts

Two scripts referenced in `package.json` don't exist:
- `scripts/validation/pr-gate.sh`
- `scripts/validation/pre-release-live-ollama.sh`

**Create `scripts/validation/pr-gate.sh`:**
- Run `pnpm build` (fail if build errors)
- Run `pnpm test` (fail if any test fails)
- Run `pnpm lint` (warn but don't fail)
- Print summary: total tests, pass/fail, duration
- Exit 0 on success, 1 on failure
- Make executable

**Create `scripts/validation/pre-release-live-ollama.sh`:**
- Check if Ollama is running (`curl -s http://localhost:11434/api/tags`)
- If not running, print instructions and exit 0 with skip message
- If running, run `pnpm test` with `OLLAMA_BASE_URL=http://localhost:11434` env var
- This is for pre-release live smoke tests only, not PR gating
- Make executable

### 1.2 Fix AGENTS.md guardrails bug

In `packages/core/generators/agents-md-generator.ts`, the generated AGENTS.md outputs `undefined: denied` for guardrail entries because the generator reads fields that don't exist on the guardrails schema.

- Find the code path that generates guardrail entries in AGENTS.md
- Check what fields the guardrails schema actually exposes (look at `packages/core/schemas/guardrails.ts`)
- Fix the field references so they output correct values (not `undefined`)
- Verify with existing test in `packages/core/generators/__tests__/agents-md-generator.test.ts`

### 1.3 Add "main" field to CLI package.json

`packages/cli/package.json` has no `main` or `exports` field. This means library imports of CLI modules fail.

- Add `"main": "./dist/cli.js"` to `packages/cli/package.json`
- This is consistent with how core and adapters declare their entry point

### 1.4 Add voice package to release CI

`.github/workflows/release.yml` filters out `@actrun_ai/tastekit-voice` from the test step.

- Find the filter in `release.yml` that excludes voice
- Remove the exclusion so voice tests run during release
- Keep the voice package's optional native deps graceful degradation (the tests already handle missing binaries)

---

## Phase 2: Wave 0 Test Hardening

### 2.1 Expand adapter tests

Current state: 6 tests across 5 files. Only verify files exist, not content.

Add content validation tests to each adapter test file:

**`packages/adapters/__tests__/claude-code.test.ts`:**
- Verify CLAUDE.md output contains expected sections (guardrails, memory, skills)
- Verify hooks are valid bash scripts (check shebang)
- Verify settings.local.json is valid JSON with expected keys

**`packages/adapters/__tests__/openclaw.test.ts`:**
- Verify SOUL.md output contains key sections
- Verify AGENTS.md is well-formed
- Verify config JSON has correct structure

**`packages/adapters/__tests__/manus.test.ts`:**
- Verify skills directory is copied with correct structure
- Verify README.md is generated
- Test that export produces SOMETHING (even if minimal)

**`packages/adapters/__tests__/autopilots.test.ts`:**
- Verify autopilots.yaml is valid YAML
- Verify it contains expected top-level keys

### 2.2 Expand MCP client tests

Current: 4 tests, no transport layer testing.

Add tests in `packages/core/mcp/__tests__/client.test.ts`:
- Test `connect()` with mock stdio server (use `fixtures/testing/mcp/mock-server.mjs`)
- Test `listTools()` returns expected tool list
- Test `callTool()` with valid and invalid arguments
- Test `getFingerprint()` returns deterministic hash for same server
- Test error handling when server fails to start

### 2.3 Expand tracing tests

Current: 2 tests, minimal compatibility checks.

Add tests in `packages/core/tracing/__tests__/tracer.test.ts`:
- Test trace event emission with valid payloads
- Test trace file rotation / size limits
- Test trace replay from fixture files
- Test hash consistency for same input

---

## Phase 3: Skills Compiler Fix (Biggest Quality Gap)

### 3.1 Make skills compiler domain-aware

Current: Generates the same hardcoded `content_creation` skill regardless of domain or interview data.

Fix `packages/core/compiler/skills-compiler.ts`:
- Read the domain from the session/config
- Generate domain-appropriate skills based on domain type:
  - `development-agent`: code-review, refactor-plan, writing-tests, debugging-issues, documenting-code (these already exist in `packages/core/domains/development-agent/skills/`)
  - `general-agent`: context-synthesis, task-orchestration (these exist in `packages/core/domains/general-agent/skills/`)
- Include skills from the domain's skill definitions, not hardcoded templates
- Generate a proper manifest with all domain skills

### 3.2 Wire interview data into skills

Current: Skills compiler ignores interview answers entirely.

- Read structured answers from the session data
- Use domain expertise level to determine skill depth/complexity
- Generate skill frontmatter that reflects user preferences (e.g., if user prefers TypeScript, skills should reference TypeScript patterns)

---

## Phase 4: Missing Domains (First Two)

### 4.1 Implement content-agent domain

Create `packages/core/domains/content-agent/` with:
- `domain.ts` — metadata, ID, display name, description
- `rubric.ts` — 16+ rubric dimensions for content creation
- `skills/research-trends.ts` — analyze trending content in niche
- `skills/generate-post-options.ts` — create post variations
- `skills/index.ts` — export all skills
- `index.ts` — export domain

Register in `packages/core/domains/index.ts`.

Reference: The content-agent was previously implemented in v0.5.0 (before domain removal). Check git history for reference.

### 4.2 Implement research-agent domain

Create `packages/core/domains/research-agent/` with:
- `domain.ts` — metadata
- `rubric.ts` — 18+ dimensions for research work
- `skills/web-research.ts` — web search and synthesis
- `skills/competitive-analysis.ts` — competitor profiling
- `skills/index.ts`
- `index.ts`

Register in `packages/core/domains/index.ts`.

---

## Coding Standards

- TypeScript strict mode
- Use existing patterns from `development-agent` and `general-agent` domains as templates
- All new code needs tests
- Run `pnpm build && pnpm test` after each phase
- Follow the dual-path compilation pattern (StructuredAnswers + legacy)
