# Minimal Agent Example

The quickest way to get a TasteKit taste profile. Uses the `quick` depth for the fastest useful interview.

## Setup

```bash
# From the tastekit root directory
cd examples/minimal-agent

# Initialize with a shipped v1 domain
tastekit init --domain general-agent --depth quick

# Run the short interview
tastekit onboard

# Compile your taste into artifacts
tastekit compile
```

## What You Get

After compilation, your `.tastekit/` directory contains:

```
.tastekit/
├── tastekit.yaml
├── session.json
├── constitution.v1.json    # Principles, tone, tradeoffs, taboos
├── guardrails.v1.yaml      # Default permissions
├── memory.v1.yaml          # Default retention policy
└── skills/
    └── manifest.v1.yaml
```

The `quick` depth covers only the essential dimensions, producing a lean profile that's enough to get started.

## Export

```bash
# Generate a CLAUDE.md-style file
tastekit export --target claude-code

# Or generate AGENTS.md for any runtime
tastekit export --target agents-md
```

## Sample Constitution

Here's what a minimal `constitution.v1.json` looks like after a quick interview:

```json
{
  "schema_version": "constitution.v1",
  "generator_version": "0.5.0",
  "principles": [
    {
      "id": "clarity_first",
      "priority": 1,
      "statement": "Prioritize clear, direct communication over elaborate phrasing",
      "rationale": "Concise answers make agent work easier to inspect.",
      "applies_to": ["*"]
    },
    {
      "id": "audience_aware",
      "priority": 2,
      "statement": "Always consider who will read the content and adapt accordingly",
      "rationale": "Audience context changes what a useful answer looks like.",
      "applies_to": ["*"]
    }
  ],
  "tone": {
    "voice_keywords": ["conversational", "knowledgeable", "approachable"],
    "forbidden_phrases": ["leverage", "synergy", "circle back"],
    "formatting_rules": ["Use short paragraphs", "Prefer bullet points over walls of text"]
  },
  "tradeoffs": {
    "accuracy_vs_speed": 0.6,
    "cost_sensitivity": 0.5,
    "autonomy_level": 0.4
  },
  "evidence_policy": {
    "require_citations_for": ["facts", "statistics"],
    "uncertainty_language_rules": ["Say when confidence is low"]
  },
  "taboos": {
    "never_do": ["Invent facts"],
    "must_escalate": ["Irreversible actions"]
  }
}
```
