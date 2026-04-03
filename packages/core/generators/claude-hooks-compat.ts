import type { GeneratorContext } from './types.js';

export interface GeneratedHook {
  filename: string;
  content: string;
  executable: boolean;
}

export interface HookEntry {
  type: string;
  command: string;
  matcher?: string;
  if?: string;
}

export interface ClaudeCodeSettings {
  hooks: Record<string, HookEntry[]>;
  permissions?: {
    allow?: string[];
    deny?: string[];
    defaultMode?: string;
  };
}

// ---------------------------------------------------------------------------
// Permission mapping: guardrails -> Claude Code permission patterns
// ---------------------------------------------------------------------------

/**
 * Map guardrails permissions to Claude Code allow patterns.
 *
 * Claude Code uses patterns like "Bash(npm test:*)" or "Read(*)".
 * TasteKit permissions define tool_ref + resources + ops.
 */
function mapPermissionsToAllow(ctx: GeneratorContext): string[] {
  if (!ctx.guardrails?.permissions) return [];

  const patterns: string[] = [];
  for (const perm of ctx.guardrails.permissions) {
    const toolName = mapToolRefToClaudeCode(perm.tool_ref);
    if (!toolName) continue;

    for (const resource of perm.resources) {
      if (resource === '*') {
        patterns.push(toolName);
      } else {
        patterns.push(`${toolName}(${resource})`);
      }
    }
  }
  return patterns;
}

/**
 * Map TasteKit tool_ref to Claude Code tool name.
 */
function mapToolRefToClaudeCode(toolRef: string): string | null {
  // Format: "server:tool" -> Claude Code tool name
  const parts = toolRef.split(':');
  if (parts.length !== 2) return null;

  const [, tool] = parts;
  const toolMap: Record<string, string> = {
    read: 'Read',
    write: 'Write',
    edit: 'Edit',
    bash: 'Bash',
    glob: 'Glob',
    grep: 'Grep',
    ls: 'LS',
  };

  return toolMap[tool.toLowerCase()] ?? null;
}

/**
 * Map guardrails approvals to Claude Code deny patterns.
 *
 * Approval rules with action "block" become deny patterns.
 */
function mapApprovalsToDeny(ctx: GeneratorContext): string[] {
  if (!ctx.guardrails?.approvals) return [];

  const deny: string[] = [];
  for (const rule of ctx.guardrails.approvals) {
    if (rule.action === 'block' && rule.when) {
      // Try to extract a tool pattern from the "when" expression
      const toolMatch = rule.when.match(/tool\s*==\s*['"](\w+)['"]/);
      if (toolMatch) {
        deny.push(toolMatch[1]);
      }
    }
  }
  return deny;
}

/**
 * Derive Claude Code defaultMode from constitution autonomy_level.
 *
 * autonomy_level 0.0-1.0 maps to:
 *   <0.3:  "plan"         (very conservative, plan everything)
 *   0.3-0.5: "default"    (balanced, ask for writes)
 *   0.5-0.7: "default"    (balanced)
 *   >0.7:  "acceptEdits"  (high autonomy, auto-accept edits)
 */
function deriveDefaultMode(ctx: GeneratorContext): string {
  const autonomy = ctx.constitution?.tradeoffs?.autonomy_level ?? 0.5;
  if (autonomy < 0.3) return 'plan';
  if (autonomy > 0.7) return 'acceptEdits';
  return 'default';
}

// ---------------------------------------------------------------------------
// Hook script generators
// ---------------------------------------------------------------------------

function generateGuardScript(ctx: GeneratorContext): GeneratedHook {
  // Build a list of blocked patterns from approval rules
  const blockPatterns: string[] = [];
  if (ctx.guardrails?.approvals) {
    for (const rule of ctx.guardrails.approvals) {
      if (rule.action === 'block' && rule.when) {
        blockPatterns.push(rule.when);
      }
    }
  }

  const blockChecks = blockPatterns.length > 0
    ? blockPatterns.map(p =>
      `# Rule: ${p}\n# (Evaluated by Claude Code permission system via settings.local.json)`
    ).join('\n')
    : '# No block rules defined in guardrails';

  return {
    filename: 'tastekit-guard.sh',
    executable: true,
    content: `#!/usr/bin/env bash
# TasteKit guardrail enforcement hook (PreToolUse)
# Blocks tool calls that match guardrails.approvals[action=block]
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

${blockChecks}

# Approval rules with action=require_approval are handled by
# Claude Code's built-in permission system via settings.local.json.
# This script handles additional runtime checks.

# Check for destructive operations in Bash commands
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
  # Block rm -rf on root or home
  if echo "$COMMAND" | grep -qE 'rm\\s+-rf\\s+(/|~|\\$HOME)'; then
    echo "Blocked: destructive operation on root/home directory" >&2
    exit 2
  fi
fi

exit 0
`,
  };
}

function generateSessionOrientScript(_ctx: GeneratorContext): GeneratedHook {
  return {
    filename: 'session-orient.sh',
    executable: true,
    content: `#!/usr/bin/env bash
# TasteKit session orientation hook (SessionStart)
# Injects constitution summary and drift status into context
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

CONTEXT=""

# Check for pending drift proposals
DRIFT_DIR=".tastekit/drift"
if [ -d "$DRIFT_DIR" ]; then
  DRIFT_COUNT=$(find "$DRIFT_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$DRIFT_COUNT" -gt 0 ]; then
    CONTEXT="$CONTEXT | Pending drift proposals: $DRIFT_COUNT. Run \\\`tastekit drift review\\\` to review."
  fi
fi

# Check for constitution summary
CONSTITUTION=".tastekit/self/constitution.v1.json"
if [ ! -f "$CONSTITUTION" ]; then
  CONSTITUTION=".tastekit/artifacts/constitution.v1.json"
fi
if [ -f "$CONSTITUTION" ]; then
  PRINCIPLES=$(jq -r '.principles[:3] | map(.statement) | join("; ")' "$CONSTITUTION" 2>/dev/null || true)
  if [ -n "$PRINCIPLES" ]; then
    CONTEXT="TasteKit principles: $PRINCIPLES$CONTEXT"
  fi
fi

if [ -n "$CONTEXT" ]; then
  echo "{\\"additionalContext\\": \\"$CONTEXT\\"}"
fi
`,
  };
}

function generatePostCompactScript(_ctx: GeneratorContext): GeneratedHook {
  return {
    filename: 'post-compact.sh',
    executable: true,
    content: `#!/usr/bin/env bash
# TasteKit post-compaction hook (PostCompact)
# Re-injects constitution summary after context is compacted
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

CONTEXT=""

# Re-inject top principles after compaction
CONSTITUTION=".tastekit/self/constitution.v1.json"
if [ ! -f "$CONSTITUTION" ]; then
  CONSTITUTION=".tastekit/artifacts/constitution.v1.json"
fi
if [ -f "$CONSTITUTION" ]; then
  PRINCIPLES=$(jq -r '.principles[:3] | map(.statement) | join("; ")' "$CONSTITUTION" 2>/dev/null || true)
  VOICE=$(jq -r '.tone.voice_keywords | join(", ")' "$CONSTITUTION" 2>/dev/null || true)
  FORBIDDEN=$(jq -r '.tone.forbidden_phrases | join(", ")' "$CONSTITUTION" 2>/dev/null || true)
  if [ -n "$PRINCIPLES" ]; then
    CONTEXT="[TasteKit] Principles: $PRINCIPLES"
    [ -n "$VOICE" ] && CONTEXT="$CONTEXT | Voice: $VOICE"
    [ -n "$FORBIDDEN" ] && CONTEXT="$CONTEXT | Avoid: $FORBIDDEN"
  fi
fi

if [ -n "$CONTEXT" ]; then
  echo "{\\"additionalContext\\": \\"$CONTEXT\\"}"
fi
`,
  };
}

function generateArtifactValidateScript(_ctx: GeneratorContext): GeneratedHook {
  return {
    filename: 'artifact-validate.sh',
    executable: true,
    content: `#!/usr/bin/env bash
# TasteKit artifact validation hook (PostToolUse on Write)
# Warns if a write modifies compiled TasteKit artifacts
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Warn if writing to compiled artifact paths
if echo "$FILE_PATH" | grep -qE '^\\.tastekit/(self|artifacts)/'; then
  echo "Warning: modifying compiled TasteKit artifact. Run \\\`tastekit compile\\\` to regenerate." >&2
fi

exit 0
`,
  };
}

function generateSessionCaptureScript(_ctx: GeneratorContext): GeneratedHook {
  return {
    filename: 'session-capture.sh',
    executable: true,
    content: `#!/usr/bin/env bash
# TasteKit session capture hook (Stop)
# Logs session end timestamp for trace analysis
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

# Prevent infinite loops when stop hook re-triggers
INPUT=$(cat)
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0
fi

# Log session activity marker for drift detection
TRACES_DIR=".tastekit/ops/traces"
if [ ! -d "$TRACES_DIR" ]; then
  TRACES_DIR=".tastekit/traces"
fi
mkdir -p "$TRACES_DIR"

echo "{\\"event\\":\\"session_end\\",\\"ts\\":\\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"}" >> "$TRACES_DIR/sessions.jsonl" 2>/dev/null || true

exit 0
`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate Claude Code hooks and settings.
 *
 * When called with context, produces guardrail-aware hooks, permissions,
 * and defaultMode. Without context, produces the basic hook set.
 */
export function generateHooks(ctx?: GeneratorContext): {
  scripts: GeneratedHook[];
  settings: ClaudeCodeSettings;
  /** @deprecated Use settings instead */
  manifest: ClaudeCodeSettings;
} {
  const context: GeneratorContext = ctx ?? { generator_version: '0.0.0' };

  const scripts = [
    generateGuardScript(context),
    generateSessionOrientScript(context),
    generatePostCompactScript(context),
    generateArtifactValidateScript(context),
    generateSessionCaptureScript(context),
  ];

  // Build permissions from guardrails
  const allow = mapPermissionsToAllow(context);
  const deny = mapApprovalsToDeny(context);
  const defaultMode = deriveDefaultMode(context);

  const settings: ClaudeCodeSettings = {
    hooks: {
      SessionStart: [
        { type: 'command', command: '.tastekit/hooks/session-orient.sh' },
      ],
      PreToolUse: [
        { type: 'command', command: '.tastekit/hooks/tastekit-guard.sh', matcher: 'Bash|Edit|Write' },
      ],
      PostToolUse: [
        { type: 'command', command: '.tastekit/hooks/artifact-validate.sh', matcher: 'Write' },
      ],
      PostCompact: [
        { type: 'command', command: '.tastekit/hooks/post-compact.sh' },
      ],
      Stop: [
        { type: 'command', command: '.tastekit/hooks/session-capture.sh' },
      ],
    },
    permissions: {
      ...(allow.length > 0 ? { allow } : {}),
      ...(deny.length > 0 ? { deny } : {}),
      defaultMode,
    },
  };

  return { scripts, settings, manifest: settings };
}
