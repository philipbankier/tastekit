# TasteKit TODOs

Captured by `/plan-eng-review` on 2026-05-01. See
`~/.gstack/projects/philipbankier-OSS-Agent-Tools/philipbankier-main-design-20260425-114210.md`
for the v1 design context.

## TODO 1: Skill auto-update mechanism (deferred from v1)

**What:** Add version check to TasteKit skill that calls GitHub API on first
invoke per session. If a newer tag exists, prompt user to git-pull the skill
repo before continuing.

**Why:** Without it, users stay on initial commit and miss bug fixes. Critical
for an infrastructure-layer product where v1 will need rapid iteration.

**Pros:**
- Bug fixes propagate naturally to existing users
- Users always running recent version
- Reduces support burden ("did you pull the latest?")

**Cons:**
- Adds GitHub API dependency at runtime (rate-limit concerns, needs caching)
- Adds first-invoke latency
- Fails ungracefully on offline / restricted networks

**Context:** No skill marketplace exists yet, so version discovery is per-repo
(check upstream tags). The right time to add this is after v1 has 10 users
asking for it. v1 ships with manual `git -C ~/.claude/skills/tastekit pull`.

**Depends on:** v1 launched, stable, ≥10 real users. Decided GitHub repo
location (still pending: `philipbankier/tastekit-skill` vs `actrun-ai/tastekit-skill`).

**Estimated effort:** ~half day human / ~1 hour with CC.

---

## TODO 2: Codex CLI as third runtime target (v1.1)

**What:** Add `--target=codex` path that writes Codex's expected config files
(AGENTS.md to repo root, plus any Codex-specific identity files).

**Why:** Codex CLI is widely used; supporting it broadens the "taste portable
across ecosystems" claim. Aligns with Anthropic Skills + agentskills.io
multi-runtime story.

**Pros:**
- Bigger total addressable user base
- Validates the cross-runtime claim with a 3rd ecosystem (not just
  Claude Code + Hermes)
- Codex uses AGENTS.md which we already generate — primary work is install
  path verification

**Cons:**
- Codex CLI is currently broken on gpt-5.5 (out of date locally as of May 2026)
- Need to verify install path conventions for skills in Codex
- Adds another runtime to test matrix

**Context:** Office-hours originally proposed 4 runtimes (Claude Code, Codex,
OpenClaw, Hermes). Eng-review cut to 2 (Claude Code + OpenClaw). Cross-model
tension swap: Hermes replaced OpenClaw. Codex remains a v1.1 candidate.

**Depends on:** Codex CLI updated and stable. v1 launched and stable.
Verified install path for skills in Codex.

**Estimated effort:** ~1 day human / ~2-3 hours with CC.

---

## TODO 3: Trace-driven taste extraction (v2 north star)

**What:** Skill (or follow-on tool) consumes existing agent execution traces,
extracts patterns the user can't articulate (the 70-80% tacit knowledge per
the taste-landscape essay's Polanyi paradox citation).

**Why:** Closes the gap interview-only v1 can't close. Interview captures the
20-30% explicit foundation; traces capture the rest. Together they form the
"living skill base that compounds" north star from office-hours.

**Pros:**
- Differentiates from every other AI onboarding tool (which all rely on
  self-report)
- Makes the "living skill base" framing real
- Compounds value: every agent session enriches the base
- Addresses alpha decay structurally — re-running becomes useful, not
  redundant
- Aligns with Phase 2 in CONTEXT.md (tiered memory: Constitution → Preferences
  → Working Memory)

**Cons:**
- Requires trace storage standard (probably leverage existing
  `packages/core/tracing/` JSONL format)
- Requires observability infrastructure (where do traces live? user's
  filesystem? cloud? both?)
- Requires interpretation logic that distinguishes "user preference" from
  "happenstance"
- Real engineering — multi-week, not multi-day

**Context:** This is the v2 north star, not the next sprint. CONTEXT.md
already has Phase 2 (Memory Intelligence) sketched out — three-layer memory
architecture is the foundation this would build on. Cold-read flagged in
plan-eng-review that v1's interview-only approach is fundamentally limited
without this.

**Depends on:** v1 launched. Real users producing traces. The npm package's
tracing system mature enough to be a stable input. Phase 2 design work
(tiered memory) at least started.

**Estimated effort:** Multi-week to v2 milestone. Not estimable as a single
ticket — should be broken down once Phase 2 starts.

---

## TODO 4: drift apply — handle modify_principle / remove_principle (deferred from W0b)

**What:** `tastekit drift apply` currently only implements `add_principle`. The detector
produces `modify_principle` and `remove_principle` proposal shapes too (see
`packages/core/drift/detector.ts`); applying them today is a silent no-op that still
marks the proposal as applied.

**Why:** Captured by codex-handoff Pass 5 (W0b review). Not a schema-lock hole — the
constitution is still validated before write, so an unsupported shape can't corrupt the
artifact. But it's a drift-correctness issue: users who accept a `modify_principle`
proposal currently get no change and no error.

**Pros:**
- Closes the loop on the drift workflow (detect → propose → apply actually applies)
- Removes a silent failure that erodes trust in the tool

**Cons:**
- Each proposal shape needs careful merge semantics + validation (modify must preserve
  ID, remove must keep priorities a 1..N sequence)
- More surface area for drift-applied changes to break the lock if not careful

**Context:** W0b validates every drift apply against the locked schema, so the lock
itself can't be violated by adding these. The work is purely drift correctness:
implement the merge, normalize priorities, pass through `safeParse`, write.

**Estimated effort:** ~1-2 hours with CC (similar shape to the W0b drift fix).

**Recommended fix:** Reject unsupported proposal shapes with a clear error message
before silently marking them applied; implement `modify_principle` and
`remove_principle` in a follow-up PR.

---

## Source-of-truth links

- v1 design doc: `~/.gstack/projects/philipbankier-OSS-Agent-Tools/philipbankier-main-design-20260425-114210.md`
- v1 test plan: `~/.gstack/projects/philipbankier-OSS-Agent-Tools/philipbankier-main-eng-review-test-plan-20260501-091500.md`
- Long-term roadmap: `OSS-Agent-Tools/PLAN.md` (sections R.2 + Parking Lot)
- Strategic context: `OSS-Agent-Tools/TasteKit/tastekit/CONTEXT.md` (Phase 1-6)
- Taste landscape thinking: `https://philipbankier.com/pages/taste-landscape.html`
