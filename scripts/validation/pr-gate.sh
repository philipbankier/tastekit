#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
START_TS="$(date +%s)"

echo "[pr-gate] starting deterministic gate"
cd "$ROOT_DIR"

bash "$ROOT_DIR/scripts/validation/wave1-check.sh"
bash "$ROOT_DIR/scripts/validation/contract-conformance.sh"

END_TS="$(date +%s)"
ELAPSED="$((END_TS - START_TS))"

echo "[pr-gate] passed in ${ELAPSED}s"
if [[ "$ELAPSED" -gt 600 ]]; then
  echo "[pr-gate] warning: exceeded 10 minute target (${ELAPSED}s)"
fi
