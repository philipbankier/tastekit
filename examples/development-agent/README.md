# Example: Development Agent — Senior Backend Engineer (Fintech/Go)

This example demonstrates a complete TasteKit interview-to-artifacts pipeline for a **senior backend engineer** building a distributed payments system at a fintech startup.

## The Customer

- **Role:** Senior backend engineer
- **Company:** Fintech startup, 2M transactions/day
- **Stack:** Go (primary), Python (ML pipelines)
- **Focus:** Distributed payments, code quality, security

## What Happened

The `run-e2e-interview.ts` script runs a complete TasteKit pipeline:

1. **Interview** — The LLM-driven interviewer asks adaptive questions based on the `development-agent` rubric (9 dimensions for "quick" depth)
2. **Extraction** — After the conversation, the LLM analyzes the full transcript and extracts structured answers (principles, tone, tradeoffs, taboos)
3. **Compilation** — Structured answers are compiled into versioned artifacts (constitution, guardrails, memory policy)
4. **Generation** — Three human-readable markdown files are generated: SOUL.md, AGENTS.md, CLAUDE.md

## Running It

```bash
# Requires Ollama running with a model
npx tsx examples/development-agent/run-e2e-interview.ts
```

The script uses simulated customer responses. Output goes to `examples/development-agent/output/`.

## Generated Artifacts

### SOUL.md
The portable personality artifact. Contains:
- **Principles** — "Correctness over speed", "Test-first development", "Self-documenting code"
- **Voice & Tone** — "direct, technical, specific, line numbers, concrete suggestions"
- **Tradeoffs** — Autonomy: 0.8, Accuracy vs Speed: 0.9
- **Taboos** — Never modify encryption code without approval, never auto-merge/deploy

### AGENTS.md
The AAIF-standard operational config. Contains principles, guardrails, tone, behavior settings, and restrictions.

### CLAUDE.md
The full runtime context. Contains all of the above plus:
- Guardrails with auto-generated blocking rules
- Domain context (software development specialization)
- Memory policy (120-day retention, consolidation schedule)
- Drift awareness instructions (monitor for principle violations)
- Session rhythm (orient → work → persist)

### constitution.v1.json
The machine-readable source of truth. Contains 6 principles with rationale, examples_good/examples_bad, tone configuration, tradeoffs, evidence policy, and taboos.

## Key Interview Dimensions

For "quick" depth, the development-agent rubric covers 9 dimensions:

| Dimension | Priority | Description |
|-----------|----------|-------------|
| `core_purpose` | CRITICAL | What the agent should accomplish |
| `guiding_principles` | CRITICAL | Values and beliefs about quality |
| `communication_tone` | IMPORTANT | How the agent should communicate |
| `autonomy_boundaries` | CRITICAL | When to act vs when to ask |
| `engineering_identity` | CRITICAL | Technical philosophy and approach |
| `core_technical_values` | CRITICAL | Code quality, testing, standards |
| `collaboration_style` | IMPORTANT | How to work with the developer |
| `learning_philosophy` | NICE-TO-HAVE | Approach to learning and growth |
| `failure_tolerance` | IMPORTANT | How to handle mistakes |

## What the Customer Said

The simulated customer provided 4 substantive responses covering:

1. **Context** — Distributed payments, Go shop, 2M transactions/day
2. **Values** — Correctness over speed, test-first, self-documenting code
3. **Communication** — Direct, technical, specific (line numbers, concrete suggestions, Go idioms)
4. **Autonomy** — High for code review; strict approval for DB schema, encryption, payment logic

From just these 4 responses, TasteKit extracted:
- 6 principles with rationale and examples
- 5 tone keywords + 3 forbidden phrases + 1 formatting rule
- Accurate tradeoff values (accuracy=0.9, autonomy=0.8)
- 3 taboos (encryption approval, no auto-merge, no auto-deploy)

## Output Files

```
output/
├── SOUL.md                    # Human-readable personality
├── AGENTS.md                  # AAIF operational config
├── CLAUDE.md                  # Full runtime context
├── constitution.v1.json       # Machine-readable constitution
├── guardrails.v1.yaml         # Permissions and approvals
├── memory.v1.yaml             # Memory retention policy
├── structured-answers.json    # Raw extracted answers
├── interview-transcript.json  # Full conversation record
└── interview-state.json       # Interview state with coverage
```
