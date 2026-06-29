# TasteKit 0.2.0 Release Guide

TasteKit 0.2.0 is a pre-1.0 OSS release candidate. It is not considered released until deterministic gates, package dry-runs, public documentation review, and the live-evidence decision all pass from a clean standalone checkout.

## Release Positioning

Public claims should stay within what the repo currently ships and verifies:

- Open-source CLI, library, and native skill under `@kairox_ai/*`.
- Six first-class domains: General, Development, Content, Research, Sales, Support.
- Quick, Guided, and Full Taste Composition onboarding.
- Canonical `.tastekit/constitution.v1.json` with composition and metacognition extensions.
- Runtime exports for Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, and Agent File.
- Drift, eval, trust, tracing, and MCP binding surfaces.

Do not claim clinical/therapeutic psychology, autonomous production deployment, or official runtime integration beyond generated files and documented adapters.

## Pre-Launch Checklist

1. Start from a clean standalone checkout of `https://github.com/philipbankier/tastekit`.
2. Confirm version and changelog are aligned for `0.2.0`.
3. Run deterministic gates:

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

4. Run live evidence when official provider keys are available, or record an explicit release waiver:

```bash
bash scripts/validation/pre-release-live-ollama.sh
pnpm test:live-e2e:release
pnpm test:live-e2e:assert-latest
```

5. Dry-run package contents:

```bash
pnpm --filter @kairox_ai/tastekit-core pack --dry-run
pnpm --filter @kairox_ai/tastekit-cli pack --dry-run
pnpm --filter @kairox_ai/tastekit-adapters pack --dry-run
pnpm --filter @kairox_ai/tastekit-voice pack --dry-run
pnpm --filter @kairox_ai/tastekit-validator pack --dry-run
```

6. Review public docs:
   - `README.md`
   - `docs/quickstart.md`
   - `docs/overview.md`
   - `docs/domains.md`
   - `docs/testing/release-verification.md`
   - `docs/validation/live/README.md`
   - `docs/demo/tastekit-release-readiness-one-pager.html`

7. Confirm no generated secrets or local env files are staged.

## Publish Sequence

Only publish after the checklist passes:

```bash
pnpm --filter @kairox_ai/tastekit-core publish --access public
pnpm --filter @kairox_ai/tastekit-adapters publish --access public
pnpm --filter @kairox_ai/tastekit-voice publish --access public
pnpm --filter @kairox_ai/tastekit-validator publish --access public
pnpm --filter @kairox_ai/tastekit-cli publish --access public
```

Publish the CLI last so users do not install a CLI that depends on unavailable package versions.

Then tag and release:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Create the GitHub release from `CHANGELOG.md` and link only to evidence that passed in the release checkout.

The `@kairox_ai/*` packages are new, so `0.2.0` becomes their first published version. If access to the old `@actrun_ai/*` scope is restored, deprecate the accidental `1.0.0` packages there separately:

```bash
npm deprecate @actrun_ai/tastekit-cli@1.0.0 "Superseded by the pre-1.0 0.2.x line; 1.0.0 was published before stable readiness."
```

## Post-Publish Smoke

Run in a temp directory:

```bash
npx @kairox_ai/tastekit-cli --help
npx @kairox_ai/tastekit-cli init --domain general-agent --depth guided
npx @kairox_ai/tastekit-cli compile
npx @kairox_ai/tastekit-cli export --target agents-md --out .
```

Also manually smoke the native `skills/tastekit/` path for Quick, Guided, and Full Taste Composition before public announcement.

## Launch Materials

Use the visual one-pager for review discussions:

- `docs/demo/tastekit-release-readiness-one-pager.html`

For public launch copy, emphasize the verified value:

- "Compile human taste into portable agent artifacts."
- "Full Taste Composition captures operating principles, assumptions, confirmations, boundaries, and runtime guidance."
- "Six first-class domains, deterministic release gates, and live E2E evidence."

Avoid unsupported claims such as "solves personality," "clinical-grade psychology," or "works natively inside every agent runtime."
