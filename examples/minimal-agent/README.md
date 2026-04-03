# Minimal Agent Example

The quickest way to get a TasteKit taste profile. Uses the `quick` depth for a ~5 minute interview.

## Setup

```bash
# From the tastekit root directory
cd examples/minimal-agent

# Initialize with defaults
tastekit init --domain content-agent --depth quick

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
├── artifacts/
│   ├── constitution.v1.json    # 5-7 principles, basic tone
│   ├── guardrails.v1.yaml      # Default permissions
│   └── memory.v1.yaml          # Default retention policy
└── skills/
    ├── manifest.v1.yaml
    └── research-trends/SKILL.md
```

The `quick` depth covers only the 5 essential dimensions, producing a lean profile that's enough to get started.

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
      "id": "clarity-first",
      "statement": "Prioritize clear, direct communication over elaborate phrasing",
      "weight": 0.9
    },
    {
      "id": "audience-aware",
      "statement": "Always consider who will read the content and adapt accordingly",
      "weight": 0.8
    }
  ],
  "tone": {
    "voice_keywords": ["conversational", "knowledgeable", "approachable"],
    "forbidden_phrases": ["leverage", "synergy", "circle back"],
    "formatting_rules": ["Use short paragraphs", "Prefer bullet points over walls of text"]
  },
  "tradeoffs": {
    "autonomy_level": "suggest",
    "speed_vs_quality": "balanced",
    "creativity_vs_consistency": "creative"
  }
}
```
