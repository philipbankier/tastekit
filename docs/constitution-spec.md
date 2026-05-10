# constitution.v1.json — Locked Spec

**Status:** locked (W0b, 2026-05-01)
**Source of truth:** `packages/core/schemas/constitution.ts` (Zod) + `packages/core/schemas/json/constitution.schema.json` (JSON Schema). The two are kept in parity by `schemas/__tests__/constitution-json-schema.test.ts`.

## Why this artifact is load-bearing

Every TasteKit runtime adapter — Claude Code, Hermes, future Codex — reads the same `constitution.v1.json`. The skill bundle, the npm package, and the validator all converge here. If the format drifts, every downstream surface re-litigates it. Lock it once.

## Format

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | const `"constitution.v1"` | yes | Wire version. Changing this is a major bump. |
| `generated_at` | ISO 8601 string | yes | UTC only, canonical `Date.prototype.toISOString()` form: `YYYY-MM-DDTHH:MM:SS.sssZ` (3-digit ms required). Timezone offsets and lower-precision forms (minute or second) are rejected. Calendar validity is enforced by Zod refinement (JSON Schema regex catches shape only). |
| `generator_version` | semver string | yes | TasteKit version that produced the artifact. Semver 2.0.0: `MAJOR.MINOR.PATCH[-prerelease][+build]`. Leading zeros forbidden. |
| `user_scope` | const `"single_user"` | yes | v1 supports single user only. Multi-user is v2. |
| `principles` | array of `Principle` | yes | 1–20 entries. Ordered by priority. |
| `tone` | object | yes | `voice_keywords`, `forbidden_phrases`, `formatting_rules`. |
| `tradeoffs` | object | yes | `accuracy_vs_speed`, `cost_sensitivity`, `autonomy_level` — each `0..1`. |
| `evidence_policy` | object | yes | `require_citations_for`, `uncertainty_language_rules`. |
| `taboos` | object | yes | `never_do` (absolute), `must_escalate` (require approval). Distinct. |
| `trace_map` | open object | no | Provenance from interview dimensions. Recommended. |
| `extensions` | open object | no | Forward-compat slot. Readers MUST tolerate unknown keys. |

### `Principle`

```json
{
  "id": "slug_form_of_statement",
  "priority": 1,
  "statement": "One-sentence imperative.",
  "rationale": "Why this principle, distinct from the others.",
  "applies_to": ["*"],
  "examples_good": ["concrete example"],
  "examples_bad": ["concrete counter-example"]
}
```

Required: `id`, `priority`, `statement`, `applies_to`. The producer always emits slug IDs (`clarity_over_completeness`, not `principle_0`). Readers accept any non-empty string for forward-compat with hand-edited artifacts.

### Strictness

All defined objects are `additionalProperties: false`. Extra fields fail validation — except inside `trace_map` and `extensions`, which are intentionally open.

This is the load-bearing strictness decision: it forces forward-compat additions to land in `extensions`, where readers know to tolerate them, instead of as ad-hoc top-level fields that older readers silently drop.

## Versioning rules

The artifact has two version fields, and they bump independently.

- **`schema_version`** is the wire format. Top-level shape is closed (`additionalProperties: false`), so any change that adds, removes, renames, or retypes a top-level field is wire-incompatible — bump to `constitution.v2`. New file, new schema, migration tool ships alongside.
- **`generator_version`** is the producing TasteKit's semver. It bumps freely without breaking readers, as long as the wire shape it emits still validates against the current `schema_version`.

What is genuinely additive *within a `schema_version`*:

- New keys inside `extensions.*` (forward-compat slot is open).
- New keys inside `trace_map.*` (provenance is open).
- New optional sub-fields *only if* they live inside an existing open object. There are none today inside `tone`, `tradeoffs`, `evidence_policy`, `taboos`, or `principles[]` — all are `additionalProperties: false`.

What is NOT additive within `schema_version` despite seeming small:

- A new top-level field. Older readers reject it (strict top-level).
- A new sub-field inside `Principle`, `Tone`, `Tradeoffs`, `EvidencePolicy`, or `Taboos`. Older readers reject it (strict sub-objects).
- A new value in any field whose values are bounded by the spec (e.g., `user_scope` only allows `"single_user"`).

### Phase 2 graduation path

A field starts as `extensions.<name>` with an open shape — that's where new ideas live until they stabilize. Producers and readers can land them without a `schema_version` bump.

When the field stabilizes and earns first-class treatment, **promotion to top-level is a `schema_version` bump**, not a MINOR. The reasoning:

- A `constitution.v1.0.0` reader does not know about `memory` as a top-level field. With strict top-level validation, it rejects the artifact.
- A `constitution.v1.5.0` reader (hypothetical, if MINOR could promote) knows `memory` and accepts it. But it now disagrees with the v1.0.0 reader on what a valid v1 artifact looks like — that is the definition of wire incompatibility.

So the honest protocol is:

1. New idea lands in `extensions.<name>`. Stays there as long as needed. Multiple TasteKit MINOR/PATCH versions can ship while the field matures.
2. When promoting to first-class:
   - Bump `schema_version` to `constitution.v2`.
   - Migration tool (or compiler) reads `constitution.v1` artifacts and writes `constitution.v2` artifacts, lifting the field from `extensions` to top-level.
   - Old readers continue to read v1 artifacts; new readers read v2 artifacts.
3. Alternative: the field stays in `extensions` permanently. That's a valid outcome — `extensions` is not a holding pen, it is a stable home for everything that doesn't need first-class status.

This collapses the question: don't promote. Use `extensions` until you have a strong reason to bump `schema_version`. The extension slot is the contract.

## Reserved keys in `extensions`

Informational, not enforced:

- `memory` — tiered-memory hints (Phase 2)
- `drift` — drift detection thresholds (Phase 2)
- `perf` — per-domain performance budgets (Phase 2)
- `x-<runtime>-*` — runtime-specific hints (e.g., `x-hermes-priority`)

Anything else is allowed. Readers MUST NOT fail on unknown keys.

## Validation

Two enforcement paths, kept in parity for what each can express:

1. **Zod** — `ConstitutionV1Schema` in `packages/core/schemas/constitution.ts`. Used at runtime by the npm package. Strictest layer; enforces cross-item invariants (priority uniqueness, 1..N sequencing, principle id uniqueness) via `superRefine`.
2. **JSON Schema** — `packages/core/schemas/json/constitution.schema.json` (Draft 2020-12). Used by the skill bundle (host LLM validates without TS), and by the future `@actrun_ai/tastekit-validator` package via AJV. Enforces shape and per-field constraints; cross-item invariants are out of scope for portable JSON Schema.

Parity is enforced by `schemas/__tests__/constitution-json-schema.test.ts`. The `bothAgree` corpus covers everything both validators can express. A separate suite (`Zod-only refinements`) documents the cases where Zod is stricter than JSON Schema — duplicate priorities, gapped priority sequences, duplicate principle ids. Producers must satisfy Zod (the runtime gate). Skill-bundle consumers using JSON Schema alone get *most* of the lock; the validator package shipped with v1 closes the remaining gap by running both.

Edit one validator, you must edit the other or the test fails.

The JSON Schema uses `pattern` for date-time validation rather than `format: "date-time"` so AJV enforces the regex without needing `ajv-formats` as a dependency. The `format` keyword is still present as documentation.

## Filled example

A real, validating artifact lives at `examples/constitutions/development-agent.example.json`. It exercises every field, including `extensions` and `trace_map`. The parity test loads it and asserts both validators accept it — so it can never silently drift out of conformance.

## What this artifact does NOT contain

- **Runtime configuration** — that's `bindings.v1.json` and `guardrails.v1.yaml`.
- **Memory state** — that's `memory.v1.yaml`.
- **Trace events** — that's `trace.v1.jsonl`.
- **Skills manifest** — that's `manifest.v1.yaml`.

Constitution is *who you are*. The other artifacts are *what you do* and *what you remember*. Keeping them separate lets a user share their constitution as a social object without leaking operational state.

## Change protocol

To modify this spec:

1. Edit Zod schema (`packages/core/schemas/constitution.ts`).
2. Edit JSON Schema (`packages/core/schemas/json/constitution.schema.json`) to match.
3. Add a parity test case proving the new behavior.
4. Run `pnpm test`. The parity test catches divergence.
5. Update this doc.

If `schema_version` changes, also: write a migration tool, version-stamp the change in `CHANGELOG.md`, update every adapter that parses the artifact.

## Bug history that informed the lock

W0a (Apr 30 – May 1) closed six LLM-extraction-boundary bugs that surfaced because the extraction → compilation → render pipeline had no contract enforcement at the boundaries. The fixes:

- Slug IDs (Bug 3) → `id.minLength: 1` + producer convention; numeric-only IDs forbidden by producer, accepted by reader for hand-edits.
- Real schema fields in AGENTS.md generator (Bug 1) → no schema change; was a generator bug.
- Validator-with-retry catches Bugs 2/4/5/6 → no schema change; was an extraction-prompt + post-validation gap.

The lock here makes one new commitment: `additionalProperties: false` everywhere except `trace_map` and `extensions`. This is what closes the door on the *next* class of these bugs — extra fields silently flowing through and accumulating.
