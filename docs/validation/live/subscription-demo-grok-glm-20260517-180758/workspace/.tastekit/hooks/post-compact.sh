#!/usr/bin/env bash
# TasteKit post-compaction hook (PostCompact)
# Re-injects constitution summary after context is compacted
set -euo pipefail

if [ ! -d ".tastekit" ]; then
  exit 0
fi

CONTEXT=""

# Re-inject top principles after compaction
CONSTITUTION=".tastekit/constitution.v1.json"
if [ ! -f "$CONSTITUTION" ]; then
  CONSTITUTION=".tastekit/self/constitution.v1.json"
fi
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
  echo "{\"additionalContext\": \"$CONTEXT\"}"
fi
