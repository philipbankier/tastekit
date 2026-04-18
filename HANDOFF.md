# HANDOFF.md — TasteKit Project Handoff

> Generated 2026-04-07 by the original Claude Code builder. Reflects repo state at commit d466f33 (main branch).

## 1. What's Done and What's Not

### Fully Wired (Real, Tested, Working)

| Module | Status | Evidence |
|:---|:---|:---|
| Schemas (11 files) | Complete | All Zod-validated, 42 tests |
| Constitution Compiler | Complete | Dual-path (structured + legacy), 8 tests |
| Guardrails Compiler | Complete | Domain presets, autonomy tiers, 16 tests |
| Memory Compiler | Complete | PII handling, retention, consolidation, 18 tests |
| Interview System | Complete | LLM-driven, 3 depth tiers, resume support, 10 tests |
| Drift Detection | Complete | 7 signal types, threshold proposals, 29 tests |
| Evaluation System | Complete | 4 judge types (deterministic/regex/schema/LLM), 25 tests |
| Tracing | Complete | JSONL event capture with hashing, 2 tests |
| Trust/Provenance | Complete | MCP fingerprinting + skill source pinning, 16 tests |
| MCP Client | Complete | Real SDK integration, stdio + HTTP transports, 6 tests |
| MCP Binder | Complete | Live tool discovery, auto-guardrail generation |
| Skill Linter | Complete | Agent Skills spec validation, 19 tests |
| Skill Tracker | Complete | Execution aggregation, performance metrics, 15 tests |
| Skill Versioner | Complete | Content hashing, rollback support, 11 tests |
| Generators (CLAUDE.md, SOUL.md, AGENTS.md) | Complete | Block-based composition, 28 tests |
| Claude Code Adapter | Complete | CLAUDE.md + 5 hooks + settings.local.json |
| OpenClaw Adapter | Complete | SOUL.md + IDENTITY.md + AGENTS.md + config |
| Voice Package | Complete | ElevenLabs + Whisper + Piper, 30 tests |
| All CLI commands (except simulate) | Complete | init, onboard, compile, export, import, mcp, skills, trust, drift, eval |

### Partially Implemented

| Module | What Works | What Doesn't |
|:---|:---|:---|
| Skills Compiler | Generates manifest + frontmatter | Only produces 1 hardcoded example skill (content_creation). Skills aren't learned from interview. |
| Playbook Compiler | Full orchestration engine (1179 lines) | Playbooks are hardcoded templates, not derived from onboarding |
| Manus Adapter | Copies skills dir + generates README | No guardrails/tone/tradeoffs encoding. Assumes Manus infers from skills alone. |
| Autopilots Adapter | Generates autopilots.yaml | YAML reference only. No hooks, no approval workflows, no tool permissions. |
| Domain Presets | dev-agent + general-agent presets | content-agent and sales-agent presets in guardrails compiler are hardcoded examples, not real |

### Stubs / Not Implemented

| Module | Status |
|:---|:---|
| tastekit simulate | Prints "planned for v1.1". No implementation. |
| Adapter optional methods | runSimulation(), mapMemoryPolicy(), emitTrace() defined in interface but not implemented in ANY adapter |
| 4 of 6 domains | content-agent, research-agent, sales-agent, support-agent do NOT exist. Tests explicitly verify they're absent. |
| Validation scripts | scripts/validation/pr-gate.sh and pre-release-live-ollama.sh referenced in package.json but files don't exist |

---

## 2. Known Issues and Tech Debt

### Critical

1. **Missing validation scripts** — package.json references scripts/validation/pr-gate.sh and pre-release-live-ollama.sh that don't exist. `npm run test:pr-gate` fails with "No such file."
2. **Voice excluded from release CI** — release.yml filters out @actrun_ai/tastekit-voice from tests. Voice bugs ship to npm without CI validation.
3. **CLI package missing "main" field** — packages/cli/package.json has no "main" or "exports". Library imports of CLI modules will fail.

### Medium

4. **Skills are templates, not learned** — The skills compiler generates the same hardcoded skill regardless of what the user says in the interview. This is the biggest gap between "works" and "works well."
5. **Playbooks are hardcoded** — 1179-line playbook compiler generates domain-specific templates. None of the playbook content comes from the user's interview.
6. **Adapter quality asymmetry** — Claude Code (95%) and OpenClaw (90%) are production-ready. Manus (40%) and Autopilots (35%) are minimal. If someone exports to Manus, they get skills copied and a README — no guardrails, no tone, no tradeoffs.
7. **Guardrails schema mismatch in AGENTS.md** — Generated AGENTS.md shows `undefined: denied` for guardrail entries (visible in the example output). The generator reads fields that don't exist on the guardrails schema.
8. **Duplicate rationale in constitutions** — Multiple principles get the same rationale string. The extraction LLM reuses phrases.

### Low

9. ~26 ESLint warnings — Pre-existing `any` types across the codebase. Not blocking.
10. No cross-platform CI — Only ubuntu-latest. Voice package may fail on macOS/Windows.
11. Version mismatch — Code internally says v1.0.0 (CHANGELOG, generator headers). npm says v0.1.1. Intentional but confusing.

---

## 3. Test Status

391 tests across 63 files. All passing. No skipped tests.

| Package | Tests | Files | Quality |
|:---|:---:|:---:|:---|
| Core | 312 | 35 | High — boundary values, dual-path testing, edge cases |
| CLI | 43 | 18 | Medium — command coverage good, error paths thin |
| Voice | 30 | 5 | Medium — mock-based, no real audio hardware |
| Adapters | 6 | 5 | Low — smoke tests only, verify files exist but not content |

### What's Well Tested
- Compiler thresholds at every autonomy tier (0.3, 0.5, 0.7, 0.9)
- All 4 judge types with pass/fail cases
- Drift signal detection (repeated edits, corrections, violations)
- Skill constraints (size limits, growth thresholds, missing sections)
- Schema validation with both valid and invalid data

### What's Undertested
- Adapters — Only 6 tests total. Verify file creation, not content correctness
- MCP client — 4 tests. No transport layer testing. Assumes stdio/HTTP work
- Tracing — 2 tests. Minimal compatibility checks only
- Interview branching — 10 tests. Limited coverage of dimension routing logic
- No integration tests with real LLM providers — All tests use fixtures/mocks

---

## 4. MCP Client Status

The roadmap says "stub" — this is **wrong**. The MCP client is genuinely functional.

### What Actually Works
- `MCPClient.connect()` — Real connections via official `@modelcontextprotocol/sdk`. Both stdio (spawns process) and streamable-HTTP transports
- `listTools()` / `listResources()` / `listPrompts()` — Real SDK calls to connected server
- `callTool(name, args)` — Real tool invocation
- `getFingerprint()` — SHA256 hash of server identity + discovered schemas. Deterministic.
- `getCapabilities()` — Real server capability query
- `MCPBinder.bindServer()` — Discovers actual tools, auto-generates guardrails from MCP annotations (destructive → require_approval)
- `MCPInspector.inspect()` — Full server capability analysis with risk assessment
- CLI `mcp add/list/inspect/bind` — All functional with real network operations

### What Doesn't Work / Isn't Wired
- MCP tools aren't used during compilation — the compiler doesn't call MCP servers
- No MCP tool invocation during interviews
- No runtime MCP monitoring (`emitTrace` not implemented in adapters)
- Transport auto-detection is basic (command → stdio, url → HTTP, no SSE)
- Tests use mock MCP server but don't test transport edge cases

### Bottom Line
The MCP client can connect to any MCP server, discover its tools, create bindings, and generate guardrails. It's a working integration tool. What's missing is deeper pipeline integration — using MCP during compilation/interview, not just as a standalone discovery tool.

---

## 5. Domain System Status

Only **2 of 6** planned domains exist. The other 4 were removed, not stubbed.

| Domain | Status | Dimensions | Skills | Quality |
|:---|:---|:---|:---|:---|
| development-agent | Shipped | 28 (5 quick / 11 guided / 8 operator) | 5 (CodeReview, Refactor, Tests, Debug, Docs) | Excellent — deep engineering focus |
| general-agent | Shipped | 18 (6 quick / 7 guided / 5 operator) | 2 (ContextSynthesis, TaskOrchestration) | Good — broad cross-functional |
| content-agent | Does not exist | — | — | Removed |
| research-agent | Does not exist | — | — | Removed |
| sales-agent | Does not exist | — | — | Removed |
| support-agent | Does not exist | — | — | Removed |

The two shipped domains are NOT copy-paste. They have distinct vocabularies, dimension sets, skill counts, and interview approaches. The domain registry is static (hardcoded array in `index.ts`).

**Note:** `general-agent` serves as the fallback for any domain ID that doesn't match. Adding new domains requires creating a directory + registering in `index.ts`.

---

## 6. Voice Package Status

Experimental but functional. All 30 tests pass.

### What's Real
- **STT**: ElevenLabs Scribe v2 (WebSocket streaming) + Whisper.cpp (local binary)
- **TTS**: ElevenLabs streaming REST + Piper (local binary)
- **VoiceIO orchestrator**: Composes STT+TTS into drop-in callbacks for the interview system
- **CLI integration**: `tastekit onboard --voice` with 3-layer fallback (ElevenLabs → Whisper/Piper → text)
- **Architecture**: Zero core changes — VoiceIO wraps `getUserInput()` and `onInterviewerMessage()` callbacks

### Caveats
- Requires ElevenLabs API key for cloud providers (user has Creator account)
- Local providers require `whisper-cpp` and `piper` binaries installed
- Audio hardware deps (`node-record-lpcm-16`, `speaker`, `play-sound`) are optional — graceful degradation if missing
- Excluded from release CI — ships without automated testing in the release pipeline
- No real hardware testing — all tests use mock recorders/players
- May not work on all platforms (tested on macOS, untested on Linux/Windows)

---

## 7. Near-Term Priorities

Based on roadmap, code state, and gap analysis:

### P0 — Ship Blockers
1. Create missing validation scripts — `pr-gate.sh` and `pre-release-live-ollama.sh` are referenced but don't exist
2. Fix AGENTS.md guardrails bug — `undefined: denied` in generated output
3. Add voice to release CI — Currently excluded from release test step
4. Add `main` field to CLI `package.json`

### P1 — Quality Gaps
5. Expand adapter tests — From 6 smoke tests to content validation + error scenarios
6. Fix skills compiler — Generate domain-appropriate skills from interview data, not hardcoded templates
7. Add more domains — At minimum `content-agent` and `research-agent` to demonstrate the system's breadth

### P2 — Feature Completion
8. Implement `tastekit simulate` — Currently prints "planned for v1.1"
9. Wire MCP into compilation pipeline — Tool discovery should inform skill/guardrail generation
10. Implement adapter optional methods — `runSimulation`, `mapMemoryPolicy`, `emitTrace`

### P3 — Polish
11. Cross-platform CI (macOS, Windows)
12. Version alignment — Resolve v1.0.0 internal vs v0.1.1 npm confusion
13. Improve Manus and Autopilots adapters — Currently minimal

---

## 8. Gotchas

### Build
- pnpm workspaces — use `pnpm add -wD` for workspace root deps, not `-D`
- ESLint flat config requires `typescript-eslint` with `projectService: true`
- Voice package has optional native deps — `pnpm install` may warn about them

### Dependencies
- `@modelcontextprotocol/sdk` is dynamically imported — won't fail at build time if missing, only at runtime
- Voice WebSocket (`ws`) is a hard dep even for local-only providers

### CI
- Voice package explicitly excluded from release workflow test step
- No pre-release validation scripts exist despite being referenced
- Only tests on ubuntu-latest

### npm
- All packages at `@actrun_ai` scope, v0.1.1
- Published with provenance (OIDC via GitHub Actions)
- Root package is `private: true` (not published)

### Code Patterns
- **Dual-path compilation**: Constitution, guardrails, and memory compilers have TWO code paths — `StructuredAnswers` (from interview) and legacy flat answers. Both must be kept in sync. Code review catches divergences that tests miss.
- **Autonomy tiers**: `< 0.3`, `0.3-0.5`, `0.5-0.7`, `>= 0.7`, `>= 0.9` — these thresholds are used consistently across all compilers. Changing one means changing all.
- **Slug-based ID generation**: Can produce collisions. Current fix: append index suffix `block_taboo_${slug}_${i}`

---

## 9. Open Questions

1. **Trademark**: "TasteKit" — taste-kit.com exists (unrelated recommendations-as-a-service). Trademark check still needed.
2. **Domain strategy**: Ship 2 deep domains or 6 shallow ones? Current state is 2 deep, which may be better for demonstrating quality, but users asking for content/research/sales/support will find nothing.
3. **Skills from interview**: The current skills compiler ignores interview data entirely. Should skills be generated from what the user says, or curated per domain? This is an architectural decision, not a bug.
4. **MCP pipeline integration**: The MCP client works standalone but isn't wired into compilation. Should `tastekit compile` automatically discover and bind MCP servers? Or keep it as a separate `mcp bind` step?
5. **Adapter parity**: Is it OK that Claude Code gets hooks+settings while Manus gets just skills+README? Or should all adapters produce equivalent enforcement?
6. **Version strategy**: v1.0.0 internally vs v0.1.1 on npm. When does npm catch up? What constitutes a "real" v1.0?
