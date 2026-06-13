#!/usr/bin/env bash
# TasteKit artifact validation hook (PostToolUse on Write)
# Warns if a write modifies compiled TasteKit artifacts
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Warn if writing to compiled artifact paths
if echo "$FILE_PATH" | grep -qE '^\.tastekit/(constitution\.v1\.json|guardrails\.v1\.yaml|memory\.v1\.yaml|skills/|playbooks/|self/|artifacts/)'; then
  echo "Warning: modifying compiled TasteKit artifact. Run \`tastekit compile\` to regenerate." >&2
fi

exit 0
