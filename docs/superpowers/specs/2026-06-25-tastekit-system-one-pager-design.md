# TasteKit System One-Pager Design

## Purpose

Create a polished, single-page HTML infographic that explains all of TasteKit as a complete product system, not a release slice or narrow onboarding demo. The page should make the project understandable enough for review and discussion without forcing the reader to read the full spec set first.

The artifact should use the standalone TasteKit release branch as the source of truth. Older monorepo material is background only and should not override the current pre-1.0 release-readiness shape.

## Audience

- Project owner reviewing whether the product story, architecture, and release scope are coherent.
- Technical collaborators who need a fast but nuanced model of how TasteKit works.
- Future agents or maintainers who need a visual map before digging into README, docs, code, or release plans.

This is not a marketing landing page. It is a technical-product review surface.

## Source Of Truth

Use these current repo surfaces as the factual basis:

- `README.md`
- `CONTEXT.md`
- `docs/overview.md`
- `docs/domains.md`
- `docs/quickstart.md`
- `docs/skills.md`
- `docs/mcp.md`
- `docs/security.md`
- `docs/tracing.md`
- `docs/testing/strategy.md`
- `docs/testing/release-verification.md`
- `docs/validation/live/README.md`
- `skills/tastekit/SKILL.md`
- `skills/tastekit/references/interview-strategy.md`
- `skills/tastekit/references/runtime-output.md`

Do not invent shipped features, metrics, package status, or release evidence. When something is not yet published or not accepted as official release evidence, label it explicitly.

## Core Message

TasteKit captures a person's operating taste through CLI or agent-native onboarding, compiles it into portable versioned artifacts, exports those artifacts to agent runtimes, and maintains behavior over time through traces, evals, trust, and drift review.

The main value proposition to preserve:

- It is more than custom instructions.
- Full Taste Composition is a deep, coverage-driven onboarding path, not a short questionnaire.
- The canonical artifact is `.tastekit/constitution.v1.json`, with rich detail preserved in extension fields.
- Runtime files are practical summaries that should not leak raw transcripts or hidden coverage machinery.
- The system is portable across runtime surfaces.
- Maintenance, trust, validation, and drift review are core product surfaces, not afterthoughts.

## Visual Structure

The one-pager should be one HTML file, optimized for a 1440px desktop screenshot while remaining readable on narrower screens.

### 1. Executive Snapshot

Top band with:

- Title: `TasteKit`
- Subtitle: `Human operating taste -> portable agent runtime artifacts`
- Status chips:
  - `pre-1.0 release readiness`
  - `six domains`
  - `native skill + CLI`
  - `artifact-first`
  - `not published until release gates pass`

Keep this section concise. It should orient the reader, not pitch with generic AI language.

### 2. Core System Map

Primary visual flow:

`Human Taste -> Depth + Domain -> Session State -> Constitution + Artifacts -> Runtime Exports -> Run / Trace / Eval / Drift`

Each node should include one short annotation:

- Human Taste: principles, boundaries, reasoning style, evidence, communication, domain preferences.
- Depth + Domain: Quick, Guided, Full Taste Composition across six agent domains.
- Session State: resumable `.tastekit/session.json` with coverage, hypotheses, confirmations, conflicts, and metacognition.
- Constitution + Artifacts: canonical JSON/YAML files under `.tastekit/`.
- Runtime Exports: Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, Agent File.
- Maintenance Loop: trace-first operation, evals, drift proposals, trust audit.

### 3. Entry Point Matrix

Four compact cards:

- Native skill: easiest onboarding path; agent asks setup prompt and writes runtime files.
- CLI: full operator and automation path.
- Library packages: integration and extension path.
- Validator: release/runtime safety path.

The native skill card should make the low-friction path obvious: give an agent the skill, choose target/domain/depth, do the interview, get files.

### 4. Depth Ladder

Three-tier vertical ladder:

- Quick: fastest useful profile; hypothesis-driven essentials.
- Guided: default; balanced coverage for serious pre-1.0 use.
- Full Taste Composition: coverage-driven; all applicable dimensions; confirmation loops; assumptions, conflicts, fatigue handling; late draft-as-question checkpoint.

Call out that Full uses internal compatibility value `operator`, but the user-facing label is `Full Taste Composition`.

### 5. Six-Domain Grid

Six domain cards:

- General Agent
- Development Agent
- Content Agent
- Research Agent
- Sales Agent
- Support Agent

Each card should show:

- Primary job-to-be-done.
- What TasteKit specializes: rubric, skills, playbooks, guardrails.
- One example focus area.

Keep each card concise and parallel.

### 6. Artifact Stack

Layered diagram of `.tastekit/`:

- `session.json`
- `constitution.v1.json`
  - `x-tastekit-composition`
  - `x-tastekit-metacognition`
- `guardrails.v1.yaml`
- `memory.v1.yaml`
- `bindings.v1.json`
- `trust.v1.json`
- `skills/`
- `playbooks/`
- `traces/`
- `evals/`
- `drift/`

Use visual layering to show canonical source of truth versus generated/runtime outputs.

### 7. Runtime Export Map

Spoke diagram from canonical artifacts to runtime surfaces:

- Claude Code: `CLAUDE.md` plus hooks/settings.
- OpenClaw: `SOUL.md`, `AGENTS.md`, `IDENTITY.md`, `openclaw.config.json`.
- Manus.
- Autopilots.
- Standalone `AGENTS.md`.
- Agent File.

Mention managed regions: re-runs replace only the TasteKit-managed block and preserve manual content outside it.

### 8. Trust, Safety, And Privacy Band

Compact horizontal layer with five blocks:

- MCP-first binding.
- Tool inspection and no auto-enable.
- Trust/provenance pins.
- Validator and schema checks.
- Runtime markdown excludes raw transcripts and hidden policy machinery.

Avoid security overclaims. Describe the implemented posture, not a guarantee.

### 9. Maintenance Loop

Circular diagram:

`Run -> Trace -> Eval -> Drift Detect -> Human Review -> Update Taste`

Emphasize that drift is reviewed through proposals, not silently applied.

### 10. Evidence Wall

Two-column evidence section:

- Deterministic gates:
  - `pnpm test`
  - `pnpm -r build`
  - `pnpm lint`
  - skill bundle sync
  - contract conformance
  - six-domain PR gate
- Live evidence:
  - official release path requires GPT-5.5 interviewer/judge and GLM-5.1 simulated human.
  - subscription-backed demo is product review evidence, not official release evidence.

Include the current known subscription demo result only if sourced from `docs/testing/release-verification.md`: 30 live turns, all merged dimensions covered for `general-agent`, judge average 4.78/5. Label it as subscription demo evidence, not publishable evidence.

### 11. Risks, Gaps, And Unknowns

Small amber/red review box:

- Release is blocked until gates pass.
- Live release evidence depends on provider availability and accepted official endpoints.
- Public docs must not overclaim unpublished or untested surfaces.
- Hosted dashboard, team workflows, native runtime control beyond exports, clinical/diagnostic claims, fully automatic drift application, and skill auto-update are deferred.

### 12. Reviewer Questions

End with a small checklist:

- Does the page make TasteKit feel more useful than custom instructions?
- Is the skill-first path obvious enough?
- Is Full Taste Composition prominent enough?
- Are release and evidence claims conservative and accurate?
- Does the maintenance loop feel core, not bolted on?

## Visual Style

Use a modern, dense, technical-product style:

- White or very light background with restrained dark text.
- Strong section hierarchy.
- Cards, bands, arrows, matrix cells, and compact legends.
- Multiple accent colors mapped to meaning:
  - onboarding / human input
  - artifacts / source of truth
  - runtime exports
  - trust and safety
  - evidence and risk
- Avoid a one-note purple/blue gradient palette.
- Avoid decorative blobs, generic AI imagery, or marketing hero layout.
- Use inline SVG or CSS diagrams where useful; do not depend on network assets.

## Constraints

- Single HTML file under `docs/demo/`.
- No external runtime dependencies.
- No unsupported metrics or claims.
- No raw transcript excerpts.
- No statements that v1.0 or v1.1 is stable or published unless the repo says it is.
- Preserve nuance with labels, captions, and callouts rather than long paragraphs.

## Proposed Output Path

`docs/demo/tastekit-system-one-pager.html`

This should coexist with `docs/demo/tastekit-release-readiness-one-pager.html`. The existing release-readiness page is narrower; this new page is the full-system visual map.

## Acceptance Criteria

- The page explains onboarding, domains, artifacts, exports, trust, MCP, tracing, evals, drift, validator, native skill, CLI, and release evidence.
- The page is readable as a single desktop screenshot and remains usable on mobile.
- The page uses diagrams or structured visuals for the main relationships.
- The page distinguishes current truth, release-readiness status, subscription demo evidence, and deferred work.
- The page does not overclaim release status or unimplemented features.
- The page can be opened directly as a local HTML file.

## Non-Goals

- Do not build a marketing homepage.
- Do not replace the README or full docs.
- Do not include AutoClaw or autoManage as part of TasteKit except as runtime/export context when relevant.
- Do not generate a new image asset unless later requested.
- Do not redesign the TasteKit product itself.
