# MCP Integration

TasteKit is designed to be **MCP-first**, meaning all tool integration is handled through the **Model Context Protocol (MCP)**. MCP is an open standard for discovering, binding, and invoking tools, resources, and prompts in a way that is runtime-agnostic and secure.

## Why MCP?

By standardizing on MCP, TasteKit avoids vendor lock-in and the need for custom, one-off tool integrations. This approach provides several key benefits:

-   **Interoperability**: Any tool that speaks MCP can be integrated with TasteKit.
-   **Discoverability**: Agents can dynamically discover the capabilities of an MCP server.
-   **Security**: MCP includes annotations for risk and destructive operations, which TasteKit uses to automatically generate guardrails.
-   **Standardization**: It provides a common language for tools, agents, and runtimes to communicate.

## The MCP Workflow in TasteKit

Integrating tools via MCP follows a clear, command-driven workflow.

### 1. Add an MCP Server

First, you add a connection to an MCP server. This server could be running locally, on a corporate network, or be a public service. You give it a local name for easy reference.

```bash
# Add an MCP server running on localhost
tastekit mcp add http://localhost:8080 --name local-tools
```

This command stores the server's connection details in `.tastekit/bindings.v1.yaml`.

### 2. Inspect the Server

Before binding, you can inspect the server to see what tools, resources, and prompts it offers.

```bash
tastekit mcp inspect local-tools
```

This command connects to the server, queries its capabilities, and displays a summary, including any risk annotations provided by the server.

### 3. Bind Tools

Binding is the process of selecting which tools from a server you want to make available to your agent. You can do this interactively or allow all tools to be bound.

```bash
# Interactively select which tools to bind
tastekit mcp bind --interactive
```

This is a critical step for security. During the binding process, TasteKit does two important things:

1.  **Records Tool List**: It saves the list of selected tools to `bindings.v1.yaml`. If the MCP server later adds a new tool, it will **not** be automatically enabled. You must re-run `mcp bind` to approve its use.
2.  **Generates Guardrails**: It reads the risk and `destructive` annotations from the MCP tool metadata and automatically generates corresponding approval rules in `guardrails.v1.yaml`. For example, a tool marked as `destructive` will automatically require human approval before it can be run.

### 4. Pin the Server (Trust)

To ensure you are always connecting to the same, trusted server, you can "pin" its cryptographic fingerprint.

```bash
# Initialize the trust policy
tastekit trust init

# Pin the server's fingerprint
tastekit trust pin-mcp local-tools
```

This saves the server's fingerprint to `.tastekit/trust.v1.yaml`. If the server's identity ever changes, TasteKit will either warn you or block the connection, depending on your configured trust policy.

## The `bindings.v1.yaml` File

This file is the source of truth for all MCP integrations. It contains a list of all configured servers and, for each server, the specific tools, resources, and prompts that have been explicitly bound to the workspace. It also stores the server's fingerprint at the time of binding, which is used by the `trust audit` command to detect changes.
