import { z } from 'zod';

/**
 * Constitution v1 Schema — locked artifact contract.
 *
 * Top-level shape is strict (`additionalProperties: false` everywhere except
 * `trace_map` and `extensions`). The two version fields bump independently:
 *
 *   - `schema_version` is the wire format. Adding/removing/renaming/retyping
 *     ANY top-level field, or any sub-field inside the strict objects, is
 *     wire-incompatible — bump to `constitution.v2`. New schema, new file,
 *     migration tool ships alongside.
 *
 *   - `generator_version` is the producing TasteKit's semver. Bumps freely
 *     without breaking readers as long as it still emits shape that validates
 *     against the current `schema_version`.
 *
 * Forward-compat lives in `extensions`. New Phase 2 features (tiered memory,
 * drift thresholds, performance budgets) land there as `extensions.<name>`
 * and stay there. Promotion to top-level is a `schema_version` bump, not
 * a generator MINOR — see docs/constitution-spec.md for the reasoning.
 */

export const ConstitutionPrincipleSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe('Stable principle identifier. Slug-form, derived from statement (e.g., "clarity_over_completeness"). Numeric-only IDs are not allowed.'),
    priority: z
      .number()
      .int()
      .positive()
      .describe('Priority (1 = highest). Within a constitution, priorities must be unique and form a 1..N sequence.'),
    statement: z
      .string()
      .min(1)
      .describe('The principle statement. One sentence imperative.'),
    rationale: z
      .string()
      .optional()
      .describe('Why this principle matters. Each principle must have a distinct rationale (validator-enforced at extraction time).'),
    applies_to: z
      .array(z.string())
      .describe('Tags: skill_ids, domains, or contexts. Use ["*"] for global.'),
    examples_good: z
      .array(z.string())
      .optional()
      .describe('Positive examples specific to this principle. Must not duplicate examples_good of another principle.'),
    examples_bad: z
      .array(z.string())
      .optional()
      .describe('Negative examples specific to this principle.'),
  })
  .strict();

export const ConstitutionToneSchema = z
  .object({
    voice_keywords: z.array(z.string()).describe('Keywords describing voice/tone.'),
    forbidden_phrases: z.array(z.string()).describe('Phrases to never use.'),
    formatting_rules: z.array(z.string()).describe('Formatting preferences (markdown style, code-block usage, bullet vs prose).'),
  })
  .strict();

export const ConstitutionTradeoffsSchema = z
  .object({
    accuracy_vs_speed: z.number().min(0).max(1).describe('0 = speed, 1 = accuracy.'),
    cost_sensitivity: z.number().min(0).max(1).describe('0 = cost-insensitive, 1 = highly cost-sensitive.'),
    autonomy_level: z.number().min(0).max(1).describe('0 = always ask, 1 = fully autonomous.'),
  })
  .strict();

export const ConstitutionEvidencePolicySchema = z
  .object({
    require_citations_for: z.array(z.string()).describe('Domains/types requiring citations.'),
    uncertainty_language_rules: z.array(z.string()).describe('How to express uncertainty.'),
  })
  .strict();

export const ConstitutionTaboosSchema = z
  .object({
    never_do: z
      .array(z.string())
      .describe('Absolute prohibitions. Agent must never take these actions under any circumstances.'),
    must_escalate: z
      .array(z.string())
      .describe('Actions requiring human approval before proceeding. Distinct from never_do; the agent pauses and asks rather than refusing outright.'),
  })
  .strict();

/**
 * Extensions slot — forward-compat for Phase 2 features without bumping
 * the schema_version. Keys here are NOT promoted to first-class fields
 * automatically. Strict top-level validation means promoting a key to
 * top-level is wire-incompatible — it requires a `schema_version` bump
 * (constitution.v2), not a generator MINOR. See docs/constitution-spec.md
 * for the reasoning. Most ideas should stay in `extensions` permanently.
 *
 * Reserved keys (informational, not enforced):
 *   - "memory": tiered-memory hints (Phase 2)
 *   - "drift": drift detection thresholds (Phase 2)
 *   - "perf": per-domain performance budgets (Phase 2)
 *   - "x-<runtime>-*": runtime-specific hints (e.g., "x-hermes-priority")
 */
export const ConstitutionExtensionsSchema = z.record(z.unknown());

export const ConstitutionV1Schema = z
  .object({
    schema_version: z.literal('constitution.v1'),
    generated_at: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        'generated_at must be UTC ISO 8601 with millisecond precision: YYYY-MM-DDTHH:MM:SS.sssZ',
      )
      .refine(
        s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString() === s,
        'generated_at must be a calendar-valid date in canonical .toISOString() form',
      )
      .describe('UTC ISO 8601 with ms precision (e.g., 2026-05-01T19:30:00.000Z). Matches Date.prototype.toISOString() output exactly. Calendar-validity is a Zod-only refinement; JSON Schema regex catches shape but cannot reject 2026-02-30.'),
    generator_version: z
      .string()
      .regex(
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
        'generator_version must be semver (semver.org 2.0.0)',
      )
      .describe('TasteKit version used to generate this artifact. Semver 2.0.0 — supports prerelease (-alpha.1) and build metadata (+sha.deadbeef). Leading zeros forbidden.'),
    user_scope: z.literal('single_user').describe('v1 supports single_user only. Multi-user comes in v2.'),

    principles: z
      .array(ConstitutionPrincipleSchema)
      .min(1)
      .max(20)
      .superRefine((principles, ctx) => {
        const priorities = principles.map(p => p.priority);
        const ids = principles.map(p => p.id);
        const seenP = new Set<number>();
        for (let i = 0; i < priorities.length; i++) {
          if (seenP.has(priorities[i])) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, 'priority'],
              message: `Duplicate priority ${priorities[i]}. Within a constitution, priorities must be unique.`,
            });
          }
          seenP.add(priorities[i]);
        }
        const sorted = [...priorities].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i] !== i + 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [],
              message: `Priorities must form a 1..N sequence. Got [${sorted.join(', ')}], expected [${Array.from({ length: sorted.length }, (_, k) => k + 1).join(', ')}].`,
            });
            break;
          }
        }
        const seenIds = new Set<string>();
        for (let i = 0; i < ids.length; i++) {
          if (seenIds.has(ids[i])) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, 'id'],
              message: `Duplicate principle id "${ids[i]}".`,
            });
          }
          seenIds.add(ids[i]);
        }
      })
      .describe('Ordered principles (priority 1 = highest). 1..N priorities, unique. At least one required; cap at 20 to keep the artifact useful for prompting.'),
    tone: ConstitutionToneSchema,
    tradeoffs: ConstitutionTradeoffsSchema,
    evidence_policy: ConstitutionEvidencePolicySchema,
    taboos: ConstitutionTaboosSchema,

    trace_map: z
      .record(z.unknown())
      .optional()
      .describe('Provenance: maps principle_id and section keys to source dimensions / interview turns. Optional but strongly recommended.'),

    extensions: ConstitutionExtensionsSchema
      .optional()
      .describe('Forward-compat bag for Phase 2 features. Readers MUST ignore unknown keys here without failing.'),
  })
  .strict();

export type ConstitutionV1 = z.infer<typeof ConstitutionV1Schema>;
export type ConstitutionPrinciple = z.infer<typeof ConstitutionPrincipleSchema>;
export type ConstitutionTone = z.infer<typeof ConstitutionToneSchema>;
export type ConstitutionTradeoffs = z.infer<typeof ConstitutionTradeoffsSchema>;
export type ConstitutionEvidencePolicy = z.infer<typeof ConstitutionEvidencePolicySchema>;
export type ConstitutionTaboos = z.infer<typeof ConstitutionTaboosSchema>;
export type ConstitutionExtensions = z.infer<typeof ConstitutionExtensionsSchema>;
