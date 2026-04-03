# Wave-1 Fixtures

Committed deterministic fixtures for Wave-1 validation across:
- `development-agent`
- `content-agent`
- `research-agent`

Each domain fixture includes:
- sanitized `.tastekit/session.json`
- generated artifacts (`self/`, `knowledge/`, `ops/`)
- export outputs for `claude-code`, `openclaw`, and `manus`
- captured run logs for init/onboard/compile/export/drift
- synthetic traces for drift replay

Replay all checks with:

```bash
./scripts/validation/wave1-check.sh
```
