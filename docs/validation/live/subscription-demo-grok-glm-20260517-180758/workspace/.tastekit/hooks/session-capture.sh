#!/usr/bin/env bash
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
TRACES_DIR=".tastekit/traces"
mkdir -p "$TRACES_DIR"

echo "{\"event\":\"session_end\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$TRACES_DIR/sessions.jsonl" 2>/dev/null || true

exit 0
