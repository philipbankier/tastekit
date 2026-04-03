# Command Coverage Matrix

Legend:
- `U`: unit/module coverage
- `I`: CLI integration coverage
- `E`: deterministic replay/e2e coverage

| Command | Success Path | Failure Path | Coverage |
|---|---|---|---|
| `tastekit init` | workspace + config created (including `general-agent`) | reject existing workspace | I,E |
| `tastekit onboard` | covered indirectly in live checks | missing workspace/config/provider | I (error), pre-release live |
| `tastekit compile` | compile + resume path | missing session/workspace | U,I,E |
| `tastekit export` | all adapters + agents-md + agent-file | missing artifacts/invalid target | I,E |
| `tastekit import` | soul-md + agent-file import | missing source/invalid json | I,E |
| `tastekit skills list` | manifest parsed and displayed | missing manifest | I |
| `tastekit skills lint` | valid skills pass | invalid skills fail exit 1 | I |
| `tastekit skills pack` | pack output written | missing skills dir | I |
| `tastekit skills graph` | graph and warnings output | missing manifest | U,I,E |
| `tastekit drift detect` | proposals/no-proposals flows | missing traces | U,I,E |
| `tastekit drift apply` | proposal applied + artifact update | unknown proposal id | I |
| `tastekit drift memory-consolidate` | plan generation | missing memory dir | U,I |
| `tastekit trust init` | trust policy scaffolded | existing policy no-op | I |
| `tastekit trust pin-mcp` | pin write | missing fingerprint | U,I |
| `tastekit trust pin-skill-source` | pin write | missing hash/commit | U,I |
| `tastekit trust audit` | pass/warn/fail report | missing trust policy | U,I,E |
| `tastekit mcp add` | stdio/http registry add | invalid input guarded by parser | I |
| `tastekit mcp list` | listed servers | empty registry | I |
| `tastekit mcp inspect` | local mock server inspect | unknown server | I |
| `tastekit mcp bind` | mock server tool binding | no servers configured | U,I,E |
| `tastekit eval run` | evalpack run + report output | missing evalpack | U,I |
| `tastekit eval replay` | replay pass/fail | missing trace/profile | U,I |
| `tastekit completion` | bash/zsh/fish output | invalid shell selection handled by commander | I |
| `tastekit simulate` | explicit not-implemented contract | non-zero exit assertion | I |

## Contract Paths Covered
- `.tastekit/trust.v1.json`
- `.tastekit/bindings.v1.json`
- `.tastekit/ops/session.json`
- `.tastekit/ops/traces/*.trace.v1.jsonl`

## Domain Coverage Notes
- Deterministic integration tests include non-interactive `general-agent` init.
- Compiler module tests validate `general-agent` dedicated skills and playbooks.
