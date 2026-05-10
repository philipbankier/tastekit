# Wave-1 Fixtures

Deterministic fixtures for Wave-1 release validation across the six production domains:
- `development-agent`
- `general-agent`
- `content-agent`
- `research-agent`
- `sales-agent`
- `support-agent`

The release gate replays every domain listed above. Generated fixtures are checked in where available; sales/support currently provide seed sessions so the gate can compile fresh artifacts once their production domain modules land.

Each domain fixture includes a sanitized `.tastekit/ops/session.json`. Generated fixtures also include:
- generated artifacts (`self/`, `knowledge/`, `ops/`)
- export outputs for `claude-code`, `openclaw`, and `manus`
- captured run logs for init/onboard/compile/export/drift
- synthetic traces for drift replay

The deterministic gate recompiles every fixture and asserts replay-generated canonical `.tastekit/constitution.v1.json`, `.tastekit/guardrails.v1.yaml`, and `.tastekit/memory.v1.yaml`.

Replay all checks with:

```bash
./scripts/validation/wave1-check.sh
```
