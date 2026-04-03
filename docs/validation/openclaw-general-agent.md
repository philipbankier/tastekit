# OpenClaw General-Agent Baseline

## Scope
- Domain: `general-agent`
- Depth: `guided`
- LLM provider: `ollama`
- Workspace: `/Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools-worktrees/openclaw-agent`

## Bootstrap Flow
```bash
# From TasteKit workspace root
pnpm -r build

# In target workspace
tastekit init --domain general-agent --depth guided
tastekit onboard --provider ollama
tastekit compile
tastekit export --target openclaw --out ./export/openclaw

# MCP + trust baseline
tastekit mcp add npx --name filesystem --args "-y,@modelcontextprotocol/server-filesystem,<workspace_path>"
tastekit mcp inspect filesystem
tastekit mcp bind
tastekit trust init
tastekit trust pin-mcp <server_url_or_ref> --fingerprint <from-inspect> --mode strict
tastekit trust audit
```

## Evidence Log
- `tastekit init --domain general-agent --depth guided`: passed (`2026-02-23`, auto-detected `ollama`)
- `tastekit onboard --provider ollama`: initial run failed (`2026-02-23`) because default model `llama3.1` was not available locally
- `.tastekit/tastekit.yaml` updated to `model: huihui_ai/qwen3-vl-abliterated:8b-instruct`; `tastekit onboard` rerun with live Ollama response and `/save`: passed (`2026-02-23`)
- `tastekit compile`: passed (`2026-02-23`)
- `tastekit export --target openclaw --out ./export/openclaw`: passed (`2026-02-23`)
- `tastekit mcp add npx --name filesystem --args "-y,@modelcontextprotocol/server-filesystem,<workspace_path>"`: passed (`2026-02-23`)
- `tastekit mcp inspect filesystem`: passed (`2026-02-23`), fingerprint `d6cf71353855638c67398705fde7788423fc6bab571bc8935e17096178399f17`
- `tastekit mcp bind --all`: passed (`2026-02-23`, `14` tools bound)
- `tastekit trust init`: passed (`2026-02-23`)
- `tastekit trust pin-mcp npx --fingerprint <inspect-fingerprint> --mode strict`: passed (`2026-02-23`)
- `tastekit trust audit`: passed (`2026-02-23`, no violations)
- `tastekit init --domain general-agent --depth guided`: passed (`2026-02-22`)
- `tastekit onboard` (configured Ollama model `huihui_ai/qwen3-vl-abliterated:8b-instruct`): session created and saved via `/save` (`2026-02-22`)
- `tastekit compile` + `tastekit compile --resume`: passed (`2026-02-22`)
- `tastekit export --target openclaw --out ./export/openclaw`: passed (`2026-02-22`)
- `tastekit mcp add ... filesystem` (using `@modelcontextprotocol/server-filesystem`): passed (`2026-02-22`)
- `tastekit mcp inspect filesystem`: passed, fingerprint `814dce492311ac7327fb7998d3c0bc4b62368e5939599bbd5128721283e1d770`
- `tastekit mcp bind`: passed (`14` tools bound)
- `tastekit trust init`: passed
- `tastekit trust pin-mcp npx --fingerprint <inspect-fingerprint> --mode strict`: passed
- `tastekit trust audit`: passed (no violations)

## Notes
- The default Ollama model in code is `llama3.1`; this workspace explicitly pins a local installed model in `.tastekit/tastekit.yaml` (`huihui_ai/qwen3-vl-abliterated:8b-instruct`).
- Fully completed guided onboarding remains a manual UX step; this validation run captured a resumable live session and validated downstream compile/export/trust contracts end-to-end.

## Output Contracts To Verify
- `.tastekit/ops/session.json`
- `.tastekit/self/constitution.v1.json`
- `.tastekit/knowledge/skills/manifest.v1.yaml`
- `.tastekit/knowledge/playbooks/general-task-execution.v1.yaml`
- `.tastekit/knowledge/playbooks/research-then-act.v1.yaml`
- `.tastekit/bindings.v1.json`
- `.tastekit/trust.v1.json`
- `export/openclaw/openclaw.config.json`
