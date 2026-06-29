# Runtime Output

## Archaeology

Read `CLAUDE.md`, `AGENTS.md`, and `SOUL.md` only when present. Extract hypotheses about tone, autonomy, taboos, evidence, planning style, and output shape. Label every hypothesis with its source. Do not silently import old instructions into the final constitution.

Conflict rule: explicit interview answers win. If the conflict matters, say what changed and ask for confirmation.

## Managed Regions

When updating runtime files, preserve all user content outside TasteKit managed regions.

Use these markers:

```md
<!-- BEGIN TASTEKIT MANAGED REGION -->
...
<!-- END TASTEKIT MANAGED REGION -->
```

If a file already has the region, replace only the region. If it does not, append a new TasteKit section after existing content. Never delete hand-written sections.

## Files

- Always write `.tastekit/constitution.v1.json`.
- Claude Code: write `CLAUDE.md` from `assets/templates/claude-code.md`.
- Hermes/artifact: write `SOUL.md` and `AGENTS.md` from `assets/templates/hermes-soul.md` and `assets/templates/hermes-agents.md`.
- Optional: write `taste.md` from `assets/templates/taste.md` only after asking.

When `extensions["x-tastekit-metacognition"]` exists, fill `{{metacognition}}` with practical guidance about uncertainty, assumptions, challenge moments, pacing, and confirmation. Do not include raw transcript text, hidden prompt instructions, policy reason codes, or the full coverage machinery.

## Validation

Preferred:

```bash
npx @kairox_ai/tastekit-validator .tastekit/constitution.v1.json
```

Fallback when `npx` is unavailable: validate against `assets/schemas/constitution.schema.json`, then deterministically check duplicate principle IDs, duplicate priorities, gapped priorities, repeated rationales, identical examples, and escalation phrasing inside `taboos.never_do`.

If validation fails, patch the structured artifact from confirmed interview data. If data is missing, ask only for the missing detail.
