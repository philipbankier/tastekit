#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLI=(node "$ROOT_DIR/packages/cli/dist/cli.js")
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/tastekit-wave1-check.XXXXXX")"
VALIDATION_FIXTURE_ROOT="$ROOT_DIR/fixtures/validation/wave1/domains"
RELEASE_DOMAINS=(
  development-agent
  general-agent
  content-agent
  research-agent
  sales-agent
  support-agent
)

V2_FIXTURE="$ROOT_DIR/fixtures/testing/e2e/v2/workspace"
V1_FIXTURE="$ROOT_DIR/fixtures/testing/e2e/v1/workspace"
SOUL_FIXTURE="$ROOT_DIR/fixtures/testing/import/soul"
AGENT_FIXTURE="$ROOT_DIR/fixtures/testing/import/agent/agent.af"
EVAL_FIXTURE="$ROOT_DIR/fixtures/testing/evals/basic-evalpack.yaml"
TRACE_FIXTURE="$ROOT_DIR/fixtures/testing/traces/replay.jsonl"
MCP_FIXTURE="$ROOT_DIR/fixtures/testing/mcp/mock-server.mjs"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

require_dir() {
  local path="$1"
  if [[ ! -d "$path" ]]; then
    echo "Missing required directory: $path" >&2
    exit 1
  fi
}

require_any_file() {
  local a="$1"
  local b="$2"
  if [[ -f "$a" || -f "$b" ]]; then
    return 0
  fi
  echo "Missing required file (checked both): $a OR $b" >&2
  exit 1
}

require_nonempty_dir() {
  local path="$1"
  if [[ ! -d "$path" ]]; then
    echo "Missing required directory: $path" >&2
    exit 1
  fi
  if ! find "$path" -maxdepth 1 -type f | grep -q .; then
    echo "Directory has no files: $path" >&2
    exit 1
  fi
}

require_any_nonempty_dir() {
  local path
  for path in "$@"; do
    if [[ -d "$path" ]] && find "$path" -maxdepth 1 -type f | grep -q .; then
      return 0
    fi
  done
  echo "Missing required nonempty directory (checked all): $*" >&2
  exit 1
}

echo "[wave1] root: $ROOT_DIR"

echo "[wave1] install/build/test gates"
cd "$ROOT_DIR"
pnpm install
pnpm -r build
pnpm --filter @kairox_ai/tastekit-core test
pnpm --filter @kairox_ai/tastekit-adapters test
pnpm --filter @kairox_ai/tastekit-cli test
pnpm node -e "import('@kairox_ai/tastekit-adapters/claude-code').then(m=>{if(!m.ClaudeCodeAdapter) process.exit(1);})"

echo "[wave1] cli smoke"
"${CLI[@]}" --help >/dev/null
"${CLI[@]}" init --help >/dev/null
"${CLI[@]}" onboard --help >/dev/null
"${CLI[@]}" compile --help >/dev/null
"${CLI[@]}" export --help >/dev/null
"${CLI[@]}" import --help >/dev/null
"${CLI[@]}" skills --help >/dev/null
"${CLI[@]}" drift --help >/dev/null
"${CLI[@]}" trust --help >/dev/null
"${CLI[@]}" mcp --help >/dev/null
"${CLI[@]}" eval --help >/dev/null
"${CLI[@]}" completion --help >/dev/null

replay_fixture() {
  local name="$1"
  local source="$2"
  local replay="$TMP_ROOT/$name"

  require_dir "$source"
  cp -R "$source" "$replay"

  (
    cd "$replay"

    "${CLI[@]}" compile --resume >/dev/null
    "${CLI[@]}" compile --resume >/dev/null
    "${CLI[@]}" skills graph >/dev/null

    for target in claude-code openclaw manus; do
      out="$replay/replay-exports/$target"
      "${CLI[@]}" export --target "$target" --out "$out" >/dev/null
    done

    "${CLI[@]}" drift detect >/dev/null || true
  )

  require_any_file "$replay/.tastekit/constitution.v1.json" "$replay/.tastekit/self/constitution.v1.json"
  require_any_file "$replay/.tastekit/guardrails.v1.yaml" "$replay/.tastekit/self/guardrails.v1.yaml"
  require_any_file "$replay/.tastekit/memory.v1.yaml" "$replay/.tastekit/self/memory.v1.yaml"
  require_any_file "$replay/.tastekit/knowledge/skills/manifest.v1.yaml" "$replay/.tastekit/skills/manifest.v1.yaml"

  require_any_nonempty_dir \
    "$replay/.tastekit/playbooks" \
    "$replay/.tastekit/knowledge/playbooks" \
    "$replay/.tastekit/artifacts/playbooks"

  require_file "$replay/replay-exports/claude-code/CLAUDE.md"
  require_file "$replay/replay-exports/claude-code/.claude/settings.local.json"
  require_file "$replay/replay-exports/openclaw/openclaw.config.json"
  require_file "$replay/replay-exports/manus/README.md"

  echo "[wave1] replay ok: $name"
}

replay_domain_fixture() {
  local domain="$1"
  local source="$VALIDATION_FIXTURE_ROOT/$domain/workspace"
  local replay="$TMP_ROOT/domain-$domain"

  require_dir "$source"
  cp -R "$source" "$replay"

  mkdir -p "$replay/.tastekit/ops"
  if [[ -f "$replay/.tastekit/ops/session.json" && ! -f "$replay/.tastekit/session.json" ]]; then
    cp "$replay/.tastekit/ops/session.json" "$replay/.tastekit/session.json"
  fi
  require_file "$replay/.tastekit/session.json"

  (
    cd "$replay"

    "${CLI[@]}" compile --resume >/dev/null
    "${CLI[@]}" compile --resume >/dev/null
    "${CLI[@]}" skills graph >/dev/null

    for target in claude-code openclaw manus; do
      out="$replay/replay-exports/$target"
      "${CLI[@]}" export --target "$target" --out "$out" >/dev/null
    done

    "${CLI[@]}" drift detect >/dev/null || true
  )

  require_any_file "$replay/.tastekit/constitution.v1.json" "$replay/.tastekit/self/constitution.v1.json"
  require_any_file "$replay/.tastekit/guardrails.v1.yaml" "$replay/.tastekit/self/guardrails.v1.yaml"
  require_any_file "$replay/.tastekit/memory.v1.yaml" "$replay/.tastekit/self/memory.v1.yaml"
  require_any_file "$replay/.tastekit/knowledge/skills/manifest.v1.yaml" "$replay/.tastekit/skills/manifest.v1.yaml"

  require_any_nonempty_dir \
    "$replay/.tastekit/playbooks" \
    "$replay/.tastekit/knowledge/playbooks" \
    "$replay/.tastekit/artifacts/playbooks"

  require_file "$replay/replay-exports/claude-code/CLAUDE.md"
  require_file "$replay/replay-exports/claude-code/.claude/settings.local.json"
  require_file "$replay/replay-exports/openclaw/openclaw.config.json"
  require_file "$replay/replay-exports/manus/README.md"

  echo "[wave1] domain replay ok: $domain"
}

echo "[wave1] deterministic replay"
replay_fixture "v2-workspace" "$V2_FIXTURE"
replay_fixture "v1-workspace" "$V1_FIXTURE"

echo "[wave1] six-domain release replay"
for domain in "${RELEASE_DOMAINS[@]}"; do
  replay_domain_fixture "$domain"
done

echo "[wave1] import round-trip"
IMPORT_WS="$TMP_ROOT/import-workspace"
mkdir -p "$IMPORT_WS"
(
  cd "$IMPORT_WS"
  "${CLI[@]}" import --target soul-md --source "$SOUL_FIXTURE" >/dev/null
  require_file "$IMPORT_WS/.tastekit/constitution.v1.json"
  "${CLI[@]}" import --target agent-file --source "$AGENT_FIXTURE" >/dev/null
  require_file "$IMPORT_WS/.tastekit/constitution.v1.json"
)

echo "[wave1] eval checks"
EVAL_WS="$TMP_ROOT/eval-workspace"
cp -R "$V1_FIXTURE" "$EVAL_WS"
(
  cd "$EVAL_WS"
  "${CLI[@]}" eval run --pack "$EVAL_FIXTURE" >/dev/null
  "${CLI[@]}" eval replay --trace "$TRACE_FIXTURE" >/dev/null
)

echo "[wave1] mcp checks"
MCP_WS="$TMP_ROOT/mcp-workspace"
mkdir -p "$MCP_WS/.tastekit"
(
  cd "$MCP_WS"
  "${CLI[@]}" mcp add node --name mock --args "$MCP_FIXTURE" >/dev/null
  "${CLI[@]}" mcp inspect mock >/dev/null
  "${CLI[@]}" mcp bind --server mock >/dev/null
  require_file "$MCP_WS/.tastekit/bindings.v1.json"
)

echo "[wave1] completion and simulate contract"
for shell in bash zsh fish; do
  "${CLI[@]}" completion "$shell" >/dev/null
done

# simulate exits cleanly with a pre-1.0 roadmap message (no error)
if ! "${CLI[@]}" simulate 2>&1 | grep -q "planned for a future TasteKit pre-1.0 release"; then
  echo "simulate command did not show expected pre-1.0 message" >&2
  exit 1
fi

echo "[wave1] all checks passed"
