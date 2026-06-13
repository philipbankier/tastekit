# TasteKit Roadmap

This roadmap reflects the standalone TasteKit release direction. It is intentionally conservative: public claims should follow implemented and verified behavior, not aspirational architecture.

## Current Status: v1.1.0 Release Readiness

The current priority is finishing v1.1.0 with no corner cutting:

- Six production domains remain green.
- Native `skills/tastekit/` onboarding remains source-complete and generated from source rubrics.
- Full Taste Composition remains coverage-driven and useful in real-world live runs.
- Managed-region runtime exports preserve manual edits.
- Validator, docs, package metadata, and release gates align with `@actrun_ai/*`.
- Official live release evidence is produced before publishing.

## Immediate Release Gates

Required before publishing:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm -r build
pnpm lint
node scripts/skill-bundle/sync.mjs --check
bash scripts/validation/contract-conformance.sh
bash scripts/validation/pr-gate.sh
pnpm test:live-e2e:release
```

Also required:

- Dry-run packs for all publishable packages.
- Review of `README.md`, `docs/quickstart.md`, `docs/overview.md`, `docs/domains.md`, and live evidence docs.
- Post-publish `npx @actrun_ai/tastekit-cli` smoke checks.

## Near-Term Backlog

### v1.1.x: Release Stabilization

- Fix any release-gate failures found by the strict live E2E route.
- Improve sales/support fixture richness beyond seed sessions.
- Keep docs and package metadata aligned with what is actually shipped.
- Improve native skill install/update guidance after real user feedback.

### v1.2: Drift And Maintenance Depth

- Complete `drift apply` support for additional proposal shapes such as modify/remove principle.
- Expand trace-driven regression tests.
- Improve human review UX for drift proposals.
- Add more eval-pack examples tied to each production domain.

### v1.3: Runtime And Skill Ergonomics

- Verify install-path conventions for Codex and other runtimes before adding a Codex-specific target.
- Expand runtime templates only when a runtime has a stable, tested convention.
- Improve skill-bundle publishing and manual smoke docs.

## Medium-Term Themes

- More domain-specific skills and playbooks, especially where real usage shows repeated workflows.
- Better MCP server compatibility coverage.
- Better artifact visualization and profile diff tooling.
- Optional local UI for reviewing profiles, traces, eval results, and drift proposals.

## Long-Term Research

- Trace-driven taste extraction as a v2 direction.
- Team/shared profile governance.
- Bidirectional runtime sync where runtime APIs are stable enough.
- Privacy-preserving profile sharing and profile composition.

## Non-Goals For v1.1

- No `constitution.v2`.
- No clinical, therapeutic, or diagnostic claims.
- No forced hosted service.
- No auto-publishing or auto-updating skills.
- No broad runtime control claims beyond generated artifacts and tested adapter outputs.

**Last updated:** 2026-05-19
