#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLI=(node "$ROOT_DIR/packages/cli/dist/cli.js")
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/tastekit-pre-release-live.XXXXXX")"
REPORT_DIR="$ROOT_DIR/docs/validation/live"
REPORT_FILE="$REPORT_DIR/pre-release-live-$(date +%Y%m%d-%H%M%S).md"
DOMAINS=(
  development-agent
  general-agent
  content-agent
  research-agent
  sales-agent
  support-agent
)
OLLAMA_MODEL="${OLLAMA_MODEL:-}"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

mkdir -p "$REPORT_DIR"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is required for live pre-release smoke." >&2
  exit 1
fi

if ! curl -fsS "http://localhost:11434/api/version" >/dev/null; then
  echo "Ollama server is not reachable at http://localhost:11434" >&2
  exit 1
fi

if [[ -z "$OLLAMA_MODEL" ]]; then
  OLLAMA_MODEL="$(ollama list | awk 'NR==2 {print $1}')"
fi

if [[ -z "$OLLAMA_MODEL" ]]; then
  echo "No Ollama models available. Pull a model first (e.g., 'ollama pull llama3.1')." >&2
  exit 1
fi

if ! ollama list | awk 'NR>1 {print $1}' | grep -qx "$OLLAMA_MODEL"; then
  echo "Configured OLLAMA_MODEL is not installed: $OLLAMA_MODEL" >&2
  exit 1
fi

cat > "$REPORT_FILE" <<REPORT
# Pre-release Live Ollama Smoke

- Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Root: $ROOT_DIR
- Domains: ${DOMAINS[*]}
- Provider: ollama
- Model: $OLLAMA_MODEL

## Results
REPORT

write_minimal_session() {
  local domain="$1"
  local out="$2"
  local now
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat > "$out" <<SESSION
{
  "session_id": "pre-release-live-$domain",
  "started_at": "$now",
  "last_updated_at": "$now",
  "depth": "quick",
  "current_step": "complete",
  "completed_steps": ["welcome", "interview"],
  "answers": {
    "goals": {
      "primary_goal": "Support mixed agent work with clear plans, evidence, and safe escalation.",
      "key_principles": "Clarity, Evidence, Safety"
    },
    "tone": {
      "voice_keywords": ["direct", "pragmatic"],
      "forbidden_phrases": ""
    },
    "tradeoffs": {
      "accuracy_vs_speed": 0.7,
      "autonomy_level": 0.6
    }
  },
  "domain_id": "$domain",
  "llm_provider": {
    "name": "ollama",
    "model": "$OLLAMA_MODEL"
  }
}
SESSION
}

for domain in "${DOMAINS[@]}"; do
  workspace="$TMP_ROOT/$domain"
  mkdir -p "$workspace"

  (
    cd "$workspace"

    echo "[live] domain=$domain init"
    if ! printf '\n' | "${CLI[@]}" init . --domain "$domain" --depth quick >/tmp/tastekit-live-init.log 2>&1; then
      echo "init failed for $domain" >&2
      cat /tmp/tastekit-live-init.log >&2 || true
      exit 1
    fi

    # Ensure onboarding uses an installed model.
    CONFIG_PATH="$workspace/.tastekit/tastekit.yaml"
    if [[ -f "$CONFIG_PATH" ]] && ! grep -q '^  model:' "$CONFIG_PATH"; then
      awk -v model="$OLLAMA_MODEL" '
        /^llm_provider:/ { print; in_llm=1; next }
        in_llm && /^  provider:/ { print; print "  model: " model; in_llm=0; next }
        { print }
      ' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp"
      mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
    fi

    echo "[live] domain=$domain provider ping"
    if ! (
      cd "$ROOT_DIR"
      OLLAMA_MODEL="$OLLAMA_MODEL" pnpm --filter @kairox_ai/tastekit-core exec node -
    ) >/tmp/tastekit-live-provider.log 2>&1 <<'NODE'; then
(async () => {
  const llm = await import('@kairox_ai/tastekit-core/llm');
  const provider = await llm.resolveProvider({
    provider: 'ollama',
    model: process.env.OLLAMA_MODEL,
  });

  const result = await provider.complete(
    [{ role: 'user', content: 'Reply with OK only.' }],
    { maxTokens: 32 },
  );

  if (!result.content || result.content.trim().length === 0) {
    throw new Error('empty response');
  }
})().catch((err) => {
  console.error(err?.message ?? String(err));
  process.exit(1);
});
NODE
      echo "provider ping failed for $domain" >&2
      cat /tmp/tastekit-live-provider.log >&2 || true
      exit 1
    fi

    echo "[live] domain=$domain seed session replay"
    session_fixture_v2="$ROOT_DIR/fixtures/validation/wave1/domains/$domain/workspace/.tastekit/ops/session.json"
    session_fixture_v1="$ROOT_DIR/fixtures/validation/wave1/domains/$domain/workspace/.tastekit/session.json"
    mkdir -p "$workspace/.tastekit/ops"
    if [[ -f "$session_fixture_v2" ]]; then
      cp "$session_fixture_v2" "$workspace/.tastekit/session.json"
    elif [[ -f "$session_fixture_v1" ]]; then
      cp "$session_fixture_v1" "$workspace/.tastekit/session.json"
    else
      write_minimal_session "$domain" "$workspace/.tastekit/session.json"
    fi
    cp "$workspace/.tastekit/session.json" "$workspace/.tastekit/ops/session.json"

    echo "[live] domain=$domain compile/graph/export"
    if ! "${CLI[@]}" compile --resume >/tmp/tastekit-live-compile.log 2>&1; then
      cat /tmp/tastekit-live-compile.log >&2 || true
      exit 1
    fi
    if ! "${CLI[@]}" skills graph >/tmp/tastekit-live-graph.log 2>&1; then
      cat /tmp/tastekit-live-graph.log >&2 || true
      exit 1
    fi

    for target in claude-code openclaw manus; do
      out="$workspace/live-exports/$target"
      if ! "${CLI[@]}" export --target "$target" --out "$out" >/tmp/tastekit-live-export.log 2>&1; then
        cat /tmp/tastekit-live-export.log >&2 || true
        exit 1
      fi
    done
  )

  cat >> "$REPORT_FILE" <<REPORT
- [x] $domain: init -> ollama provider ping (live) -> compile(session replay) -> skills graph -> export(claude-code/openclaw/manus)
REPORT

done

echo "[live] success"
cat >> "$REPORT_FILE" <<REPORT

## Notes
- This check is pre-release only and intentionally separate from deterministic PR gating.
- Hosted providers are optional in this wave.
- Onboarding remains interactive in CLI mode; pre-release automation validates live provider connectivity and then runs deterministic replay for reproducible compile/export checks.
REPORT

echo "Live report written: $REPORT_FILE"
