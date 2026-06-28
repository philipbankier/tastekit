# Live TasteKit Validation

This directory stores source prompts for the live Full Taste Composition end-to-end validation harness.

Generated Full Taste Composition runs are written to unique timestamped directories:

- `docs/validation/live/full-composition-YYYYMMDD-HHMMSS-<suffix>/`

Those generated evidence directories are ignored by git by default.

## Environment

Required:

- `OPENAI_API_KEY` for the GPT-5.5 interviewer and judge.
- `ZAI_API_KEY` for the GLM-5.1 simulated human. `Z_AI_API_KEY` is accepted as a legacy alias.

Optional:

- `ZAI_BASE_URL`, default `https://api.z.ai/api/coding/paas/v4` for GLM Coding Plan keys.
- `ZAI_MODEL`, default `glm-5.1`.
- `ZAI_THINKING`, default `disabled`.
- `OPENAI_BASE_URL`, default `https://api.openai.com/v1`.
- `OPENAI_MODEL`, default `gpt-5.5` because the live interviewer spec requires GPT-5.5.
- `LIVE_E2E_OUTPUT_DIR` if the harness is run with an explicit output directory option.
- `LIVE_E2E_ENV_FILE` or `--env-file <path>` to load these values from a local dotenv-style file. Existing shell variables win over values from the file.

Release evidence is intentionally stricter than ad hoc diagnostics: `pnpm test:live-e2e:assert-latest` only accepts the official OpenAI endpoint with model `gpt-5.5`, the official Z.ai Coding Plan endpoint with model `glm-5.1`, canonical persona/judge prompt hashes, a GPT-5.5 judge report, matching `report.json`/`report.md`/`demo.md`/`transcript.jsonl`, semantic artifact checks, and a checkout stamp matching the current git commit/package version/dirty fingerprint. Custom gateways, private aliases, custom prompts, proxy routing, and the general Z.ai API endpoint may be useful for debugging, but they are not accepted as official release evidence.

## What The Harness Proves

The live E2E exists to test the lived onboarding value, not just build health. A passing run should show that TasteKit can:

- Conduct an unscripted Full Taste Composition against a nuanced simulated human.
- Preserve dimension-level composition details in `x-tastekit-composition`.
- Preserve metacognitive coverage, assumptions, confirmations, conflicts, fatigue events, and policy decisions in `x-tastekit-metacognition`.
- Generate runtime Markdown that is useful but does not leak raw transcript text or hidden policy machinery.
- Preserve manual content outside TasteKit managed regions on re-run.
- Validate the constitution, export runtime artifacts, run skills/trust/drift/eval checks, and produce reviewable evidence.

## Run

From a clean standalone checkout, install and build first:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm -r build
```

## Evidence Classes

There are two live paths:

- **Official release evidence**: `pnpm test:live-e2e:release`. This requires the official OpenAI endpoint with `gpt-5.5`, the official Z.ai Coding Plan endpoint with `glm-5.1`, the canonical persona and judge prompts, and the release evidence assertion.
- **Subscription-backed real-world demo evidence**: `pnpm test:live-e2e:subscription-demo`. This uses local CLIProxyAPI for the interviewer/judge and Z.ai GLM-5.1 for the simulated human. It proves the harness and product behavior with live LLMs, but is intentionally labeled `subscription-live-demo` and is not accepted by the official release assertion.

For the final release operator path, run the ordered sequence:

```bash
pnpm test:live-e2e:release
```

That command builds once, then runs provider diagnostics, provider preflight, the full live GPT-5.5 interviewer + GLM-5.1 simulated human interview, and the release-evidence assertion. It rejects `--no-judge`, `--mock-provider-smoke`, `--preflight-only`, custom provider endpoints/models, custom prompt paths, proxy-routing environment variables, and non-Full depths because those cannot produce official release evidence.

After it passes, inspect the accepted evidence:

```bash
cat docs/validation/live/latest-run.json
```

Manual commands are mainly for debugging individual stages.

Run the full live E2E harness:

```bash
node scripts/validation/live-full-composition-e2e.mjs
```

After a full live run, assert that the newest report is valid release evidence:

```bash
pnpm test:live-e2e:assert-latest
```

This rejects failed preflight reports, mock-provider smoke reports, custom provider endpoints, stale checkout evidence, missing judge output, missing report/demo/transcript files, missing artifact evidence, and failed deterministic checks.

## Subscription-Backed Demo

Use this when an official OpenAI API key is not available but local CLIProxyAPI is running with subscription-backed models:

```bash
pnpm test:live-e2e:subscription-demo
```

Defaults:

- `CLIPROXY_OPENAI_BASE_URL=http://127.0.0.1:8317/v1`
- `CLIPROXY_OPENAI_MODEL=grok-4.3`
- `CLIPROXY_API_KEY_FILE=~/.cli-proxy-api/client_api_key`

The demo still requires `ZAI_API_KEY` or `Z_AI_API_KEY` for the GLM-5.1 simulated human. Put it in the ignored `docs/validation/live/tastekit-live.env` file:

```bash
ZAI_API_KEY=...
```

To avoid pasting a key into chat or shell history, use the local configuration helper:

```bash
pnpm configure:live-e2e -- --subscription-demo
```

It prompts for the Z.ai key without echoing it, writes only the gitignored `tastekit-live.env`, and configures the local CLIProxyAPI interviewer/judge route. If the key is already in another local file, use:

```bash
pnpm configure:live-e2e -- --subscription-demo --zai-key-file /path/to/zai.key
```

The generated `report.md` and `demo.md` are useful for product review because they show the live interview, extracted taste, value walkthrough, runtime artifacts, managed-region preservation, validator/export/trust/drift/eval checks, and judge read. They should not be used as official release evidence unless the official release sequence also passes.

The current passing subscription-backed review run is:

- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/report.md`
- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/demo.md`
- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/constitution.v1.json`
- `docs/validation/live/subscription-demo-grok-glm-20260517-180758/transcript.jsonl`

It is summarized visually in `docs/demo/tastekit-release-readiness-one-pager.html`.

Run a preflight-only check:

```bash
pnpm test:live-e2e:preflight
```

Diagnose provider routing independently before a full preflight:

```bash
pnpm test:live-e2e:diagnostics
```

The diagnostics command loads the same local env file but checks OpenAI and Z.ai separately. Use it when one provider is missing, quota-limited, or routed to the wrong model; it does not start an interview and does not create release evidence.
`env_loaded_keys` only means the local env file was parsed; diagnostics still checks whether each credential is present and accepted by its provider.

For automation or release checklists, use machine-readable diagnostics:

```bash
node scripts/validation/live-provider-diagnostics.mjs --json
```

Run with a local env file:

```bash
cp docs/validation/live/tastekit-live.env.example docs/validation/live/tastekit-live.env
$EDITOR docs/validation/live/tastekit-live.env
pnpm test:live-e2e:preflight
```

Use `docs/validation/live/tastekit-live.env.example` as the template. `docs/validation/live/tastekit-live.env` is gitignored and auto-loaded by the harness when present. For another location, set `LIVE_E2E_ENV_FILE=/path/to/tastekit-live.env` or pass `--env-file /path/to/tastekit-live.env`.

Run with explicit provider routing:

```bash
node scripts/validation/live-full-composition-e2e.mjs \
  --openai-base-url https://api.openai.com/v1 \
  --openai-model gpt-5.5 \
  --zai-base-url https://api.z.ai/api/coding/paas/v4 \
  --zai-model glm-5.1 \
  --zai-thinking disabled
```

For general Z.ai API credentials, `--zai-base-url https://api.z.ai/api/paas/v4` can diagnose routing, but the release assertion gate still requires the Coding Plan endpoint above.

Run with explicit prompt paths for debugging only:

```bash
node scripts/validation/live-full-composition-e2e.mjs \
  --persona docs/validation/live/full-composition-persona.md \
  --judge docs/validation/live/full-composition-judge-rubric.md
```

## Interpretation

The live E2E harness is release evidence, not a PR gate. It uses live LLMs and may fail due to provider availability, latency, model changes, or subjective quality. Deterministic failures should block release confidence until fixed. Judge-only failures should trigger product review.

Run the live release sequence from the exact release checkout after deterministic gates are green. Because generated evidence is ignored by git, GitHub Actions cannot infer local live evidence unless a release operator uploads or preserves it separately; the local release checklist must include `pnpm test:live-e2e:release` before publishing.

## Deterministic mock-provider smoke

Use this before spending live provider credits when local wiring changed:

```bash
pnpm test:live-e2e:mock
```

This starts a local OpenAI-compatible mock chat server, runs the same harness through provider preflight, Full Taste Composition interview completion, compile/export/validate, managed-region rerun, import roundtrip, skills/trust/drift/eval checks, and writes the same `report.md` and `demo.md` shapes. Reports from this path are marked `provider_mode: mock-provider-smoke` and are **not live release evidence**. They only prove local integration readiness; the real release demo still requires GPT-5.5 plus GLM-5.1.

Each run writes `report.json`, `report.md`, `demo.md`, and `transcript.jsonl`. The final report includes runtime artifact checksums, safe markdown excerpts, validator/export/trust/drift/eval command evidence, and the GPT judge rubric scores. `demo.md` turns the same evidence into a reviewable walkthrough of what TasteKit learned and how the generated runtime files should change agent behavior.

The harness also writes an ignored pointer at `docs/validation/live/latest-run.json` so reviewers can find the newest evidence directory without sorting ignored run folders manually:

```bash
cat docs/validation/live/latest-run.json
```

If a reachable frontier model rejects optional sampling parameters such as `temperature`, the harness records a warning and retries that request once without the unsupported parameter. It does not retry missing credentials, model routing failures, malformed responses, or failed deterministic artifact checks.

## Older Live Smoke

The older pre-release live smoke flow writes timestamped reports here:

- `pre-release-live-YYYYMMDD-HHMMSS.md`

Generate that report with:

```bash
bash scripts/validation/pre-release-live-ollama.sh
```

The live smoke defaults to all six first-class domains: development, general, content, research, sales, and support.
