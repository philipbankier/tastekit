# TasteKit Overview

TasteKit is an open-source command-line interface (CLI) and library designed to capture and compile a user's "taste" into portable, versioned artifacts. It provides a comprehensive framework for managing agent behavior, including a Skills library with progressive disclosure, tool binding via the Model Context Protocol (MCP), trust and provenance enforcement, trace-first logging, and continuous drift maintenance.

## Core Concepts

The TasteKit ecosystem is built around several core concepts that ensure consistent, predictable, and maintainable agent behavior.

| Concept | Description |
| :--- | :--- |
| **Artifacts** | All user preferences, rules, and configurations are compiled into versioned, machine-readable files (JSON or YAML). These artifacts are the single source of truth for an agent's behavior. |
| **Compilation** | The `tastekit compile` command transforms user input from an interactive onboarding session into a set of canonical artifacts, ensuring a deterministic and repeatable process. |
| **Skills** | Modular, reusable capabilities for agents. Skills are defined with **progressive disclosure**, meaning they load only the necessary context, keeping the agent's initial prompt small and efficient. |
| **MCP (Model Context Protocol)** | TasteKit is MCP-first, using the open standard for tool discovery, binding, and invocation. This avoids vendor lock-in and promotes a standardized tool ecosystem. |
| **Trust & Provenance** | Security is a core principle. TasteKit uses cryptographic fingerprints to "pin" trusted MCP servers and skill sources, preventing unauthorized changes or malicious tool introductions. |
| **Tracing** | Every action an agent takes is recorded in a structured, machine-readable trace log. These traces are invaluable for debugging, evaluation, and drift detection. |
| **Drift** | An agent's performance and alignment can "drift" over time. TasteKit includes built-in tools to detect this drift from trace data and user feedback, proposing updates to keep the agent on track. |
| **Adapters** | Pluggable modules that translate TasteKit's universal artifacts into the specific formats required by different agent runtimes, such as Claude Code, Manus, or OpenClaw. |

## Design Principles

TasteKit's architecture is guided by a set of strict design principles:

1.  **Artifact-First**: Everything compiles into files. Runtimes adapt to the files, not the other way around.
2.  **Deterministic Compilation**: The same inputs will always produce the exact same artifacts.
3.  **Progressive Disclosure**: Agents start with minimal context and load deeper knowledge only when a specific Skill is invoked.
4.  **MCP-First**: All tool integration is handled through the MCP standard.
5.  **Trust-by-Default**: New tools and sources are never enabled automatically. Trust must be explicitly granted.
6.  **Trace-First**: All operations produce detailed traces for observability and analysis.
7.  **Maintenance is a V1 Feature**: Drift detection, memory consolidation, and staleness checks are integral parts of the system from day one.

## Workflow

A typical TasteKit workflow involves the following steps:

1.  **Initialize**: A new workspace is created using `tastekit init`.
2.  **Onboard**: The user runs `tastekit onboard` to complete an interactive wizard that captures their goals, principles, and preferences.
3.  **Compile**: The `tastekit compile` command processes the onboarding session and generates the core set of taste artifacts.
4.  **Bind Tools**: The user adds MCP servers with `tastekit mcp add` and binds the desired tools using `tastekit mcp bind`.
5.  **Export**: The compiled artifacts are exported to a target runtime format using `tastekit export --target <adapter>`.
6.  **Run & Trace**: The agent runs in the target environment, producing trace logs of its actions.
7.  **Maintain**: The user periodically runs `tastekit drift detect` to analyze traces and identify potential drift, applying proposals to keep the agent aligned.

This structured, artifact-centric approach makes agent behavior more transparent, manageable, and secure over the long term.
