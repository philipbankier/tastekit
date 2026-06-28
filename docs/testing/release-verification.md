# Release Verification

This document is the operator checklist for moving TasteKit from a development checkout to a publishable pre-1.0 `@actrun_ai/*` release. It separates deterministic gates, live product evidence, package checks, and human review artifacts so release confidence is not based on a single green command.

## Evidence Classes

| Class | What It Proves | Command / Artifact | Blocks Release |
|:---|:---|:---|:---:|
| Unit and integration tests | Core behavior, CLI paths, adapters, schema helpers, interview policy, generators | `pnpm test` | Yes |
| Workspace build | Every package compiles from source | `pnpm -r build` | Yes |
| Lint | Static code and packaging hygiene | `pnpm lint` | Yes |
| Skill bundle sync | Native skill schema/rubric references match TypeScript source | `node scripts/skill-bundle/sync.mjs --check` | Yes |
| Contract conformance | Canonical v1 artifacts and compatibility readers obey the contract | `bash scripts/validation/contract-conformance.sh` | Yes |
| Six-domain replay | All first-class domains compile and export from fixtures | `bash scripts/validation/pr-gate.sh` | Yes |
| Live Ollama smoke | All domains can run through local live-provider smoke | `bash scripts/validation/pre-release-live-ollama.sh` | Pre-release |
| Full live E2E | Full Taste Composition produces useful artifacts from unscripted live model interaction | `pnpm test:live-e2e:release` | Manual pre-release evidence or explicit waiver |
| Package dry-runs | Publish contents, bins, exports, metadata, README/LICENSE inclusion | `pnpm --filter <pkg> pack --dry-run` | Yes |

## Deterministic Gate

Run from a clean standalone checkout:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm -r build
pnpm lint
node scripts/skill-bundle/sync.mjs --check
bash scripts/validation/contract-conformance.sh
bash scripts/validation/pr-gate.sh
```

If one command fails, fix that failure directly and re-run the exact failing command before restarting the whole sequence.

## Live Full Taste Composition Gate

The strict publishable path is:

```bash
pnpm test:live-e2e:release
pnpm test:live-e2e:assert-latest
```

This requires:

- Official OpenAI endpoint with `gpt-5.5` for interviewer and judge.
- Official Z.ai Coding Plan endpoint with `glm-5.1` for the simulated human.
- Canonical persona and judge prompt hashes.
- Full Taste Composition depth, stored internally as `operator`.
- A current checkout/package-version stamp.

The harness writes `report.json`, `report.md`, `demo.md`, `transcript.jsonl`, workspace artifacts, and exports under `docs/validation/live/<run>/`.

## Subscription Demo Evidence

When official GPT-5.5 API access is not available, the subscription-backed route is still valuable:

```bash
pnpm test:live-e2e:subscription-demo
```

The current passing review evidence is:

- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/report.md`
- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/demo.md`
- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/constitution.v1.json`
- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/transcript.jsonl`

That run passed in 30 live turns for `general-agent` Full Taste Composition. It covered 24 of 24 merged dimensions, confirmed all critical and important dimensions, produced three confirmation checkpoints, recorded zero conflicts, preserved managed-region manual content, and passed validator/export/trust/drift/eval checks. Its judge average was 4.78/5.

This is strong product review evidence, but it remains labeled `subscription-live-demo` and is not accepted by the strict release assertion.

## Package Dry-Runs

Before publishing, dry-run every publishable package:

```bash
pnpm --filter @actrun_ai/tastekit-core pack --dry-run
pnpm --filter @actrun_ai/tastekit-cli pack --dry-run
pnpm --filter @actrun_ai/tastekit-adapters pack --dry-run
pnpm --filter @actrun_ai/tastekit-voice pack --dry-run
pnpm --filter @actrun_ai/tastekit-validator pack --dry-run
```

Check that each package includes only intentional runtime files, has correct repository metadata, includes README/LICENSE coverage through package files or root inclusion, and exposes the expected bins/exports.

## Human Review

Review these artifacts before tagging:

- `CHANGELOG.md` for accurate release notes and unreleased-versus-published wording.
- `README.md`, `docs/quickstart.md`, and `docs/overview.md` for public claims.
- `docs/domains.md` for six-domain claims.
- `docs/validation/live/latest-run.json` and the referenced run folder for live release evidence.
- `docs/demo/tastekit-release-readiness-one-pager.html` for a visual, non-code review surface.

Open questions should block release only if they affect public claims, artifact safety, schema compatibility, package publishability, or the real usefulness of Full Taste Composition.
