
# Claude Code Adapter

The Claude Code adapter for TasteKit allows you to export your compiled taste profile into a format that can be used with Anthropic's Claude Code runtime. This enables you to enforce your principles and tone preferences directly within the Claude ecosystem.

## How it Works

The adapter transforms your `constitution.v1.json` artifact into a `hooks.json` file. This file configures the Claude Code runtime to apply your taste profile during code generation and other tasks.

## Exporting for Claude Code

To export your profile, use the `tastekit export` command with the `claude-code` target:

```bash
tastekit export --target claude-code --out ./claude-profile
```

This command will create a directory named `claude-profile` containing a `.claude/` subdirectory with the `hooks.json` file.

### The `hooks.json` File

The generated `hooks.json` file contains several key sections derived from your constitution:

-   **`principles`**: A direct mapping of the principles from your constitution.
-   **`tone`**: Your voice keywords and forbidden phrases.
-   **`enforcement`**: Configures pre-execution and post-execution hooks. For example, the `check_forbidden_phrases` hook can be enabled to prevent the model from generating output that contains words you have disallowed.

## Installation

To use the exported profile, you would typically copy the `.claude` directory into your Claude Code project.

```bash
# Copy the generated hooks into your project
cp -r ./claude-profile/.claude /path/to/your/project/
```

Once installed, the Claude Code runtime will automatically load the hooks and apply your taste profile to its operations.

## Including Skills

You can also include your TasteKit skills in the export:

```bash
tastekit export --target claude-code --out ./claude-profile --include-skills
```

This will copy your `.tastekit/skills` directory into the output directory. While Claude Code does not have a native concept of TasteKit's progressive disclosure, the `SKILL.md` files can still serve as valuable context for the model.
