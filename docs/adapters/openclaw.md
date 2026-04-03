
# OpenClaw Adapter

The OpenClaw adapter allows you to export your TasteKit profile to the configuration format used by the OpenClaw agent runtime.

## How it Works

The adapter translates your `constitution.v1.json` artifact into an `openclaw.config.json` file. This file contains a structured representation of your principles, tone, and preferences that the OpenClaw runtime can interpret.

## Exporting for OpenClaw

To export your profile, use the `tastekit export` command with the `openclaw` target:

```bash
tastekit export --target openclaw --out ./openclaw-profile
```

This will create a directory named `openclaw-profile` containing the `openclaw.config.json` file.

### The `openclaw.config.json` File

The generated configuration file maps the concepts from your TasteKit constitution to the corresponding fields in the OpenClaw configuration:

-   **`profile`**: Contains your core principles, tone, and tradeoffs.
-   **`behavior`**: Defines high-level behavioral settings, such as the autonomy level and citation requirements.
-   **`safety`**: Includes safety-related configurations like forbidden phrases and taboos.

## Installation

To use the exported profile, you would place the `openclaw.config.json` file in the root of your OpenClaw project. The runtime will load this file on startup and configure the agent's behavior accordingly.

```bash
# Copy the generated config into your project
cp ./openclaw-profile/openclaw.config.json /path/to/your/project/
```

## Including Skills

As with other adapters, you can also include your skills in the export:

```bash
tastekit export --target openclaw --out ./openclaw-profile --include-skills
```

This will copy your `.tastekit/skills` directory into the output. While OpenClaw may not support the full progressive disclosure model of TasteKit out of the box, the `SKILL.md` files can still be used as a source of contextual information for the agent.
