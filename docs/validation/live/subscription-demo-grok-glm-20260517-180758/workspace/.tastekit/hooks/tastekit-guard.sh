#!/usr/bin/env bash
# TasteKit guardrail enforcement hook (PreToolUse)
# Blocks tool calls that match guardrails.approvals[action=block]
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# No block rules defined in guardrails

# Approval rules with action=require_approval are handled by
# Claude Code's built-in permission system via settings.local.json.
# This script handles additional runtime checks.

# Check for destructive operations in Bash commands
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
  # Block rm -rf on root or home
  if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+(/|~|\$HOME)'; then
    echo "Blocked: destructive operation on root/home directory" >&2
    exit 2
  fi
fi

exit 0
