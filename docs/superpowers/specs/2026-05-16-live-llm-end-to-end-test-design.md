# Live LLM End-to-End TasteKit Test Design

Date: 2026-05-16

## Purpose

This design defines a thorough live end-to-end test for TasteKit that proves the product value, not only schema validity. The test should demonstrate that TasteKit can conduct a real Full Taste Composition, capture nuanced human taste, compile durable artifacts, export those artifacts across runtime targets, and produce useful downstream agent behavior.

The main test must not use scripted interview answers. A live GPT-5.5 TasteKit interviewer should interview a live GLM-5.1 simulated human persona. The only fixed input for the simulated human is a rich persona prompt and behavioral constraints. Every answer should be generated live in response to the interviewer.

## Context

TasteKit already has strong deterministic gates:

- Unit, adapter, and CLI integration tests.
- Six-domain deterministic release replay through `scripts/validation/pr-gate.sh`.
- Contract conformance checks.
- A pre-release Ollama smoke script.

Those gates prove compile/export compatibility and release determinism. They do not prove the lived onboarding experience: whether a Full Taste Composition is deep, human, metacognitively paced, and valuable enough to produce runtime files that an agent can actually use.

This E2E fills that gap.

## External API Facts

Z.ai GLM-5.1 is OpenAI-compatible through chat completions. The official Z.ai API docs show the general endpoint as `https://api.z.ai/api/paas/v4` and chat calls at `/chat/completions`. The Coding Plan docs specify a dedicated Coding Plan endpoint, `https://api.z.ai/api/coding/paas/v4`, instead of the general endpoint. Z.ai also notes that the Coding Plan endpoint is intended for supported coding tools; the harness must therefore preflight the endpoint and fail clearly if the Coding Plan cannot be used for this custom test.

Sources:

- Z.ai GLM-5.1 overview: https://docs.z.ai/guides/llm/glm-5.1
- Z.ai API introduction: https://docs.z.ai/api-reference/introduction
- Z.ai GLM Coding Plan quick start: https://docs.z.ai/devpack/quick-start
- OpenClaw Z.ai provider docs: https://docs.openclaw.ai/providers/zai

## Test Goals

The test should answer these questions:

1. Can TasteKit complete a live Full Taste Composition without scripted answers?
2. Does the interviewer ask useful follow-ups instead of shallow profile-generator questions?
3. Does the metacognitive policy handle fatigue, contradictions, confirmation, draft checkpoints, and stop conditions correctly?
4. Does `.tastekit/session.json` contain deterministic coverage and metacognition state?
5. Does `.tastekit/constitution.v1.json` validate and include meaningful `x-tastekit-composition` and `x-tastekit-metacognition` extensions?
6. Do `CLAUDE.md`, `SOUL.md`, `AGENTS.md`, and optional `taste.md` render practical guidance without leaking raw transcripts or hidden policy machinery?
7. Do exports for Claude Code, OpenClaw, Manus, AGENTS.md, and Agent File preserve the useful taste signal?
8. Can downstream eval, drift, trust, and skills graph commands operate on the resulting workspace?
9. Would an independent judge conclude that the artifacts capture the simulated human's real taste, tensions, boundaries, and working style?

## Non-Goals

- Do not replace deterministic PR gates.
- Do not add the live test as a required PR check.
- Do not use scripted interview answers.
- Do not claim clinical, therapeutic, or psychological diagnostic value.
- Do not require Docker or OpenClaw runtime execution unless an OpenClaw runtime is already stable and easy to run.
- Do not publish packages or mutate the user's real workspace.

## Model Topology

### TasteKit Interviewer

Use GPT-5.5 for the actual TasteKit interviewer. This model is responsible for disciplined rubric coverage, metacognitive pacing, structured extraction, and stop-rule adherence.

Implementation options:

- Preferred: run the real `Interviewer` class with an OpenAI-compatible provider configured for GPT-5.5, if `OPENAI_API_KEY` supports that model through the current provider path.
- Fallback: fail preflight with a clear message explaining that the GPT-5.5 API path is unavailable; do not silently swap in a weaker interviewer model.

### Simulated Human

Use GLM-5.1 for the simulated human. This model is responsible for creative, opinionated, emotionally textured, but coherent answers.

The GLM caller should not use TasteKit's existing `OpenAIProvider` unchanged for Z.ai Coding Plan, because that provider appends `/v1/chat/completions`. Z.ai Coding Plan documentation uses `https://api.z.ai/api/coding/paas/v4/chat/completions` directly. The harness should use a tiny direct chat-completions client or a provider option that can call an exact endpoint without appending `/v1`.

Environment:

- `ZAI_API_KEY`
- `ZAI_BASE_URL`, default candidate `https://api.z.ai/api/coding/paas/v4`
- `ZAI_MODEL`, default `glm-5.1`
- `ZAI_THINKING`, default `disabled` for the simulated human unless exploratory depth needs it

### Judge

Use GPT-5.5 for final judgment. The judge should compare persona prompt, transcript summary, session state, constitution, runtime markdown, and exports. It should score real-world value, not only pass/fail schema validity.

## Simulated Human Persona

The persona should be a research-heavy product/engineering founder building AI agents for high-stakes operator workflows.

Fixed persona traits:

- Builds AI agents for complex operator workflows involving engineering, research, planning, and execution.
- Wants an agent that can plan, challenge, ideate, research, write, and execute.
- Hates generic agreement, vague praise, and shallow productivity advice.
- Values taste, judgment, nuance, principled disagreement, and adversarial thinking.
- Wants high autonomy for exploration, synthesis, option generation, and first-pass drafts.
- Wants low autonomy for irreversible changes, public claims, external messages, credentials, user-data handling, legal/medical/financial claims, and production deploys.
- Has productive contradictions:
  - Says "move fast" but rejects sloppy assumptions.
  - Says "be concise" but wants deep reasoning for high-leverage decisions.
  - Wants the agent to challenge them but dislikes performative contrarianism.
  - Wants creative leaps but hates unjustified novelty.
- Shows fatigue partway through and asks for compression.
- Pushes back on a draft to force confirmation-loop behavior.
- Occasionally under-specifies answers, forcing follow-up.
- Does not volunteer the whole profile up front.

The persona prompt should instruct GLM-5.1 to answer as the person, not as a helpful assistant explaining the persona. It should answer only the interviewer's question, with natural human incompleteness. It may correct itself, show impatience, and revise earlier statements.

## Architecture

The live E2E should be a standalone validation harness, not a production CLI command.

Proposed file:

`scripts/validation/live-full-composition-e2e.mjs`

Supporting prompt/reference files, if useful:

- `docs/validation/live/full-composition-persona.md`
- `docs/validation/live/full-composition-judge-rubric.md`

Output directory:

`docs/validation/live/full-composition-YYYYMMDD-HHMMSS/`

Generated outputs:

- `report.md`
- `transcript.jsonl`
- `persona-prompt.md`
- `judge-report.json`
- `judge-report.md`
- `workspace/.tastekit/session.json`
- `workspace/.tastekit/constitution.v1.json`
- `workspace/CLAUDE.md`
- `workspace/SOUL.md`
- `workspace/AGENTS.md`
- export directories for Claude Code, OpenClaw, Manus, AGENTS.md, and Agent File

The report directory is intentionally reviewable and can be committed selectively if it is useful release evidence. Raw secrets must never be written.

## Harness Command Interface

Default command:

```bash
node scripts/validation/live-full-composition-e2e.mjs \
  --domain general-agent \
  --depth full-taste-composition \
  --persona docs/validation/live/full-composition-persona.md \
  --judge docs/validation/live/full-composition-judge-rubric.md
```

Useful flags:

- `--domain <id>`: defaults to `general-agent`; accepts any first-class domain.
- `--second-domain <id>`: optional second live or artifact-only pass, usually `development-agent`.
- `--depth <quick|guided|full|full-taste-composition|operator>`: defaults to `full-taste-composition`; stores internal `operator`.
- `--output <dir>`: overrides the timestamped report directory.
- `--max-turns <n|auto>`: defaults to TasteKit's Full safety ceiling.
- `--no-judge`: runs deterministic assertions only.
- `--keep-invalid`: preserves invalid artifacts after validation failure; default true for this live harness.
- `--zai-base-url <url>`: overrides `ZAI_BASE_URL`.
- `--zai-model <id>`: overrides `ZAI_MODEL`.
- `--openai-model <id>`: defaults to `gpt-5.5`.

Exit behavior:

- Exit `0` when deterministic assertions pass and judge thresholds pass or judge is disabled.
- Exit `1` on deterministic artifact, provider, validation, export, or harness failures.
- Exit `2` when deterministic assertions pass but judge thresholds fail. This distinguishes "product quality concern" from harness/runtime breakage.

## Data Flow

1. Preflight environment and providers.
2. Create a temp workspace under a live validation directory.
3. Initialize TasteKit domain and depth.
4. Run the live interview loop:
   - GPT-5.5 interviewer calls the real TasteKit `Interviewer`.
   - GLM-5.1 simulated human receives interviewer messages and replies live.
   - Harness persists every turn to `transcript.jsonl`.
   - Harness saves state on every TasteKit state update.
5. End only when TasteKit marks the interview complete, the user persona explicitly asks to finish and TasteKit records assumptions, or the safety ceiling is reached.
6. Compile artifacts.
7. Validate constitution with `@kairox_ai/tastekit-validator`.
8. Generate runtime markdown.
9. Export all supported runtime targets.
10. Run skills graph, trust audit, eval replay, and a drift scenario.
11. Ask GPT-5.5 judge to grade the generated artifacts against the persona and transcript.
12. Write a human-readable report with evidence, failures, warnings, and recommendations.

## Implementation Surface

The harness should cover both library behavior and CLI behavior without turning the test into a brittle terminal transcript:

- Use the real core `Interviewer` APIs for the interview loop so every turn exposes state, policy action, coverage, and extraction status.
- Use CLI commands for workspace lifecycle steps where users will feel the product: `init`, `compile`, `export`, `skills graph`, `trust audit`, `eval run`, and `drift detect`.
- Use the local workspace packages, not published npm packages, except when explicitly testing `npx` after release.
- Prefer built package entrypoints after `pnpm -r build`; if direct TypeScript execution is needed, the harness should document that dependency and keep it local to validation scripts.

## Domain And Depth

Default domain: `general-agent`

Reason: the persona needs a broad agent that does mixed planning, research, product thinking, writing, and execution. This stresses more of TasteKit's real value than a narrow coding-only domain.

Optional second pass: `development-agent`

Reason: it stress-tests engineering-specific runtime outputs and makes OpenClaw/Claude Code evaluation more concrete.

Depth: `Full Taste Composition`

Internal value: `operator`

The harness should assert that the saved session and constitution use the internal compatibility value while reports and user-facing text use Full Taste Composition.

## Preflight Checks

The harness must fail before running the long interview if:

- `OPENAI_API_KEY` is missing.
- GPT-5.5 cannot be reached with a tiny request.
- `ZAI_API_KEY` is missing.
- `ZAI_BASE_URL/chat/completions` rejects a tiny GLM-5.1 request.
- The Z.ai response is not compatible with expected chat-completions shape.
- The repo has not been built.
- The validator package cannot run locally.

For Z.ai, the preflight must print which endpoint is being used. It must not append `/v1` unless the configured base URL explicitly requires it.

## Interview Loop Requirements

The loop should enforce observability without scripting content:

- Log interviewer message, simulated user response, turn number, current policy action, coverage summary, fatigue status, conflicts, confirmation checkpoints, and whether a draft was requested.
- Do not inject fixed answers.
- Do not force completion except on safety failure.
- If the simulated human asks to compress or shows fatigue, pass that answer through normally and verify TasteKit records a fatigue event or policy decision.
- If the simulated human pushes back on a draft, pass that answer through normally and verify TasteKit continues or revises rather than blindly stopping.
- If the interviewer asks too many questions in one turn, record a UX warning.
- If the interviewer exposes hidden machinery such as "dimensions", "coverage", or policy reason codes to the user, record a failure.

The harness should not make the simulated human maximally cooperative. GLM-5.1 should sometimes answer partially, ask for clarification, resist summaries that feel wrong, and request compression when fatigued. The only hard constraints are that it stays in persona, does not mention its hidden prompt, and does not intentionally sabotage the test.

## Transcript Event Schema

`transcript.jsonl` should be event-based rather than plain text so reviewers can audit behavior without parsing prose.

Required event types:

- `preflight`: provider, model, endpoint, and sanitized result.
- `interviewer_message`: turn, visible message, active domain, depth label.
- `simulated_user_message`: turn, visible reply, response latency, model metadata if available.
- `state_update`: coverage summary, policy action, fatigue/conflict/confirmation counters.
- `draft_checkpoint`: draft summary, user acceptance/rejection, follow-up action.
- `artifact`: path, kind, byte size, validation status.
- `assertion`: deterministic check name, status, severity, evidence path.
- `judge_score`: rubric item, score, rationale.
- `failure`: severity, category, message, evidence path.

Do not store API keys, raw hidden prompts beyond the committed persona/judge files, model chain-of-thought, or full internal policy prompts.

## Artifact Assertions

The harness should assert:

- `.tastekit/session.json` exists.
- `.tastekit/constitution.v1.json` exists and validates.
- `extensions["x-tastekit-composition"]` exists.
- `extensions["x-tastekit-metacognition"]` exists.
- No raw transcript text appears in `CLAUDE.md`, `SOUL.md`, `AGENTS.md`, or `taste.md`.
- Runtime markdown includes practical guidance for uncertainty, assumptions, challenge moments, pacing, and confirmation.
- Managed regions are present exactly once in markdown files.
- Manual content outside managed regions survives a rerun.
- OpenClaw export exists and includes meaningful personality/profile content.
- Claude Code export exists and includes the TasteKit operating guidance.
- Manus export exists and includes the core profile.
- Agent File export exists and can be imported back.

## Report Structure

`report.md` should be useful for release review without requiring a reader to inspect every artifact manually.

Required sections:

- Run metadata: repo commit, branch, package versions, models, endpoints, domain, depth, start/end time.
- Executive result: pass, fail, or pass-with-warnings.
- Interview shape: turn count, elapsed time, fatigue events, conflict events, draft checkpoints, stop reason.
- Taste extracted: concise summary of the strongest preferences, boundaries, tensions, and anti-signals.
- Deterministic assertions: table of pass/fail/warn with evidence links.
- Artifact inventory: generated files and export directories.
- Judge results: scores, average, threshold decision, rationale.
- Drift/eval results: commands run and core findings.
- Release interpretation: whether this run increases, blocks, or does not affect release confidence.
- Follow-ups: only concrete issues discovered by the run.

## Value Assertions

The judge should score these dimensions from 1 to 5:

- Depth: did the interview discover non-obvious preferences?
- Specificity: are artifacts concrete enough to guide an agent?
- Tension capture: did TasteKit preserve contradictions and tradeoffs?
- Agency: are autonomy boundaries usable?
- Challenge style: does the profile say when and how to push back?
- Evidence behavior: does it capture research/citation/uncertainty expectations?
- Metacognition: does it capture pacing, fatigue, assumptions, and confirmation?
- Runtime usability: could a Claude Code/OpenClaw-style agent use these files immediately?
- Drift/eval readiness: are outputs structured enough for later maintenance?

Pass threshold:

- Average judge score at least 4.0.
- No score below 3 on autonomy boundaries, metacognition, or runtime usability.
- No critical deterministic assertion failures.

Warnings should be allowed for subjective quality issues, but critical failures should block release confidence.

## Failure Classification

Critical failures:

- Provider preflight cannot reach required models.
- Interview uses scripted answers.
- Interview completes without required Full Taste Composition coverage semantics.
- Constitution does not validate.
- Composition or metacognition extensions are missing or obviously empty.
- Runtime markdown leaks raw transcript or hidden policy machinery.
- Exports are missing or unusable for advertised targets.
- Managed-region rerun destroys manual content.

Release warnings:

- Judge average below ideal but above pass threshold.
- Interview needed more turns than expected but stopped correctly.
- Non-core optional OpenClaw runtime check is unavailable.
- Drift/eval warnings are plausible but under-specific.
- Z.ai endpoint is slow or rate-limited but eventually succeeds.

Harness bugs:

- Incorrect path handling.
- Broken redaction.
- Bad JSONL event schema.
- A validation assertion inspects the wrong file or stale output.

## Drift Scenario

After compile/export, the harness should synthesize a short trace where an agent violates the taste profile:

- It agrees too quickly with a weak product idea.
- It makes an unsupported public claim.
- It proposes an irreversible action without approval.
- It over-explains a low-stakes update.

Run `tastekit drift detect` and verify that drift proposals or warnings reflect the violation categories. This proves TasteKit maintenance value, not only onboarding value.

## Eval Scenario

Create a temporary eval pack that checks:

- The agent challenges weak assumptions.
- The agent states uncertainty rather than inventing evidence.
- The agent asks before irreversible/public actions.
- The agent compresses when the user signals fatigue.

Run `tastekit eval run` or replay against generated traces. The exact eval format should follow existing fixtures and avoid adding a new eval framework.

## OpenClaw Handling

The first pass should inspect OpenClaw export artifacts, not necessarily run a Dockerized OpenClaw runtime.

Reason: the current TasteKit release surface is artifact-first, and OpenClaw runtime behavior may introduce external instability. If OpenClaw has a stable local CLI/container available, a second optional step can launch it with the exported profile and ask two tasks:

- Produce a research/action plan under uncertainty.
- Challenge a weak operator instruction while respecting autonomy boundaries.

This optional runtime step should be reported separately from the core TasteKit E2E result.

## Error Handling

Provider failures:

- Fail fast on preflight.
- During long interview, retry transient 429/5xx errors with exponential backoff up to a small limit.
- If Z.ai Coding Plan rejects custom use, record the endpoint and error, then stop. Do not silently use a different model.

Interview failures:

- If TasteKit reaches safety ceiling, mark as failure unless the report shows explicit user finish handling and valid artifacts.
- If extraction fails, preserve transcript and state, then mark failure.
- If validation fails, save invalid artifact and validator output.

Judge failures:

- If judge call fails, do not fail the deterministic artifact test; mark qualitative assessment unavailable.

Filesystem failures:

- Keep all generated artifacts inside the validation output directory.
- Never write secrets to reports.
- Never mutate the user's real root `CLAUDE.md`, `SOUL.md`, or `AGENTS.md`.

## Security And Privacy

- Redact API keys from logs.
- Store prompts, transcript, and artifacts only in `docs/validation/live/full-composition-*` or a temp directory.
- Do not include hidden model reasoning in reports.
- Do not include raw full transcript in runtime markdown.
- Clearly label the simulated human as synthetic.

## Codex Execution Model

Use one main Codex session as the test coordinator. Use fresh Codex sessions only for independent review or judging of the final report, not for driving the interview.

Recommended flow:

1. Main session implements or runs the harness.
2. Fresh reviewer session audits the generated report and artifacts from scratch.
3. Main session resolves any clear test harness bugs.
4. Main session reports final evidence and remaining risks.

Do not parallelize live model calls aggressively. Z.ai Coding Plan users have reported endpoint and concurrency sensitivities, and this test does not need high concurrency.

## Acceptance Criteria

The E2E is accepted when:

- Provider preflight succeeds for GPT-5.5 and GLM-5.1.
- Full live interview completes without scripted answers.
- Session and constitution artifacts validate.
- Composition and metacognition extensions exist and are meaningful.
- Runtime markdown and exports are generated.
- Drift and eval checks run.
- GPT-5.5 judge report meets threshold.
- A reviewable `report.md` summarizes the transcript shape, key taste extracted, artifact paths, assertions, judge scores, warnings, and failures.

## Deliverables

- A live E2E harness script.
- A persona prompt file.
- A judge rubric file.
- A generated live report from at least one successful run.
- Notes on any model/provider instability encountered.

## Open Questions

None blocking for implementation. The only runtime decision is which endpoint to use first:

- Coding Plan endpoint: `https://api.z.ai/api/coding/paas/v4`
- General endpoint: `https://api.z.ai/api/paas/v4`

The harness should default to the explicit `ZAI_BASE_URL` environment variable and print the endpoint before use. If no value is set, use the Coding Plan endpoint because the user has a Coding Plan, but fail clearly if the endpoint rejects custom harness usage.
