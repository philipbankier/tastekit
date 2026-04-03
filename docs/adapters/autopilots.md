
# Autopilots Adapter

The Autopilots adapter serves as a reference implementation for exporting TasteKit profiles to a simple, YAML-based configuration format. It is considered a community-supported adapter.

## How it Works

The adapter converts your `constitution.v1.json` artifact into a human-readable `autopilots.yaml` file. This file provides a straightforward representation of your core principles and preferences.

## Exporting for Autopilots

To export your profile, use the `tastekit export` command with the `autopilots` target:

```bash
tastekit export --target autopilots --out ./autopilots-profile
```

This will create a directory named `autopilots-profile` containing the `autopilots.yaml` file.

### The `autopilots.yaml` File

The generated YAML file provides a clear and simple summary of your taste profile, including:

-   **`principles`**: A list of your core principles with their IDs, statements, and priorities.
-   **`tone`**: Your defined voice keywords and forbidden phrases.
-   **`tradeoffs`**: Your preferences for accuracy vs. speed and autonomy level.

## Installation

To use the exported profile, you would place the `autopilots.yaml` file in the configuration directory of your Autopilots project. The runtime would then parse this YAML file to configure the agent.

```bash
# Copy the generated YAML into your project
cp ./autopilots-profile/autopilots.yaml /path/to/your/project/config/
```

This adapter is a good starting point for anyone looking to integrate TasteKit with a new or custom agent runtime that prefers a simple, YAML-based configuration.
