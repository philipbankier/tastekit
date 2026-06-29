---
name: tastekit
description: Use when a user wants to create, refresh, validate, or export a TasteKit taste profile for an AI agent using Quick, Guided, or Full Taste Composition onboarding.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# TasteKit

TasteKit turns a user's preferences, principles, communication style, boundaries, planning habits, and agent operating taste into portable runtime files. This skill is a thin router: load only the reference files needed for the chosen path, and let the npm packages handle full validation when available.

## Route

1. Find the workspace root with `git rev-parse --show-toplevel`; fall back to the current directory.
2. If `.tastekit/session.json` exists, offer to resume before asking new setup questions. If a legacy interview-state file exists, read it only as migration context and continue writing `.tastekit/session.json`.
3. Read existing `CLAUDE.md`, `AGENTS.md`, and `SOUL.md` when present. Treat them as hypotheses only; interview answers win.
4. Ask one compact setup prompt: target (`Claude Code`, `Hermes/artifact`, or `both`), domain (`development-agent`, `general-agent`, `content-agent`, `research-agent`, `sales-agent`, or `support-agent`), optional general-agent capability packs (`development`, `content`, `research`, `sales`, `support`), and depth (`Quick`, `Guided`, or `Full Taste Composition`). Default to Guided and offer Full before starting.

## Depths

- Quick: load quick-tier dimensions from `references/rubrics/universal.md` and the chosen domain rubric.
- Guided: load quick plus guided tiers and cover enough detail for production use.
- Full Taste Composition: load all tiers plus `references/interview-strategy.md`; use planning, confirmation loops, gap detection, cascades, and extraction retries.

## References

- Universal rubric: `references/rubrics/universal.md`
- Development domain rubric: `references/rubrics/development-agent.md`
- General domain rubric: `references/rubrics/general-agent.md`
- Content domain rubric: `references/rubrics/content-agent.md`
- Research domain rubric: `references/rubrics/research-agent.md`
- Sales domain rubric: `references/rubrics/sales-agent.md`
- Support domain rubric: `references/rubrics/support-agent.md`
- Interview strategy for Full or stalled sessions: `references/interview-strategy.md`
- Runtime write and validation rules: `references/runtime-output.md`

## Output

Track coverage, hypotheses, conflicts, explicit answers, metacognitive policy decisions, and draft readiness in `.tastekit/session.json`. At about 70% coverage, ask what is wrong, missing, or overfit. Distinguish `never_do` from `must_escalate`, and ask only for missing or contradictory details when validation fails.

- Claude Code target: write or update `CLAUDE.md` and `.tastekit/constitution.v1.json`.
- Hermes/artifact target: write or update `SOUL.md` and `AGENTS.md`, plus `.tastekit/constitution.v1.json`.
- Optional social artifact: offer `taste.md` only after the core runtime files exist.

Templates:

- `assets/templates/claude-code.md`
- `assets/templates/hermes-soul.md`
- `assets/templates/hermes-agents.md`
- `assets/templates/taste.md`

Validate `.tastekit/constitution.v1.json` with `npx @kairox_ai/tastekit-validator <file>` when available. If unavailable, use `assets/schemas/constitution.schema.json` plus deterministic checks from `references/runtime-output.md`, then tell the user validation used the fallback path.
