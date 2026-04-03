# @actrun_ai/tastekit-adapters

Runtime adapters for [TasteKit](https://github.com/philipbankier/tastekit) — transform compiled artifacts into runtime-specific formats.

## Adapters

| Adapter | Version | Output |
|---------|---------|--------|
| **Claude Code** | v2.0 | CLAUDE.md + settings.local.json (hooks, permissions, defaultMode) + 5 hook scripts |
| **OpenClaw** | v2.0 | SOUL.md + IDENTITY.md + AGENTS.md + openclaw.config.json + skills/ |
| **ActRun Autopilots** | v2.0 | autopilots.yaml + .agents/skills/ (Agent Skills standard) |
| **Manus** | v1.0 | skills/ directory + README.md |

All adapters produce skills in the [Agent Skills](https://agentskills.io) open standard format, compatible with 32+ runtimes including Claude Code, OpenAI Codex, Gemini CLI, Cursor, VS Code Copilot, and more.

## Install

```bash
npm install @actrun_ai/tastekit-adapters
```

## Usage

```typescript
import { ClaudeCodeAdapter } from '@actrun_ai/tastekit-adapters/claude-code';

const adapter = new ClaudeCodeAdapter();
await adapter.export('.tastekit', './export', {
  includeSkills: true,
  includePlaybooks: true,
});
```

## Adapter Interface

All adapters implement:

```typescript
interface TasteKitAdapter {
  id: string;
  version: string;
  detect(target: string): Promise<boolean>;
  export(profilePath: string, outDir: string, opts: ExportOpts): Promise<void>;
  install(outDir: string, target: string, opts: InstallOpts): Promise<void>;
}
```

## Claude Code Adapter Details

The Claude Code adapter (v2.0) generates:

- **CLAUDE.md** — Compositional system instructions from constitution blocks
- **settings.local.json** — Hooks configuration + permission patterns + defaultMode
  - `permissions.allow` mapped from guardrails permissions
  - `permissions.deny` mapped from guardrails block rules
  - `defaultMode` derived from autonomy_level (<0.3: plan, 0.3-0.7: default, >0.7: acceptEdits)
- **5 hook scripts** across 5 lifecycle events:
  - `tastekit-guard.sh` (PreToolUse) — guardrail enforcement
  - `session-orient.sh` (SessionStart) — inject principles + drift status
  - `post-compact.sh` (PostCompact) — re-inject constitution after compaction
  - `artifact-validate.sh` (PostToolUse) — warn on artifact modification
  - `session-capture.sh` (Stop) — log session for drift detection

## Part of TasteKit

- CLI: [`@actrun_ai/tastekit-cli`](https://www.npmjs.com/package/@actrun_ai/tastekit-cli)
- Core: [`@actrun_ai/tastekit-core`](https://www.npmjs.com/package/@actrun_ai/tastekit-core)

## License

MIT
