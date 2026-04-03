
# Manus Adapter

The Manus adapter is designed to export your TasteKit profile, particularly your Skills library, into a format that can be directly used within the Manus ecosystem.

## How it Works

Manus has a native understanding of the Agent Skills format, including the `SKILL.md` contract and the principle of progressive disclosure. The Manus adapter, therefore, focuses on packaging your skills in a way that is optimized for the Manus runtime.

## Exporting for Manus

To export your profile for Manus, use the `tastekit export` command with the `manus` target:

```bash
tastekit export --target manus --out ./manus-skills
```

This command performs two main actions:

1.  **Copies the Skills Library**: It recursively copies your entire `.tastekit/skills` directory to the output directory (`./manus-skills`). This includes all your `SKILL.md` files, resources, scripts, and the `manifest.v1.yaml`.

2.  **Generates a README**: It creates a `README.md` file in the output directory that provides a high-level summary of your taste profile, including your core principles and tone. This gives a human-readable overview of the agent persona that the skills are designed to embody.

## Installation

To use the exported skills in Manus, you would typically upload the packaged directory to your Manus workspace. The Manus runtime will automatically discover and load the skills from the `manifest.v1.yaml` file and respect the progressive disclosure sections within each `SKILL.md` file.

## The Power of Progressive Disclosure

Because Manus natively supports the progressive disclosure model, the integration is highly efficient. When your agent is running in Manus:

-   It starts with only the **minimal context** from all available skills.
-   When it decides to use a specific skill, Manus loads the **on-invoke** section for that skill only.
-   If the skill requires additional information, the agent can request the **on-demand resources** as needed.

This ensures that your agent remains fast and focused, with a minimal context window, while still having access to a rich library of complex capabilities.
