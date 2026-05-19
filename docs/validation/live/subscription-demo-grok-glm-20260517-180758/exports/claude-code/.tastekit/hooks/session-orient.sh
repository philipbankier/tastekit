#!/usr/bin/env bash
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
    CONTEXT="$CONTEXT | Pending drift proposals: $DRIFT_COUNT. Run \`tastekit drift review\` to review."
  fi
fi

# Check for constitution summary
CONSTITUTION=".tastekit/constitution.v1.json"
if [ ! -f "$CONSTITUTION" ]; then
  CONSTITUTION=".tastekit/self/constitution.v1.json"
fi
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
  echo "{\"additionalContext\": \"$CONTEXT\"}"
fi
