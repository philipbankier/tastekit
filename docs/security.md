
# Security and Trust

Security is a foundational principle of TasteKit, not an afterthought. The entire system is designed with a "trust-by-default" posture, ensuring that users have full control over what their agents can do. This is achieved through a combination of trust pinning, automated guardrails, and a strict "no auto-enable" policy.

## The Trust Policy: `trust.v1.yaml`

The core of TasteKit's security model is the `trust.v1.yaml` file. This artifact defines the sources of truth for all external resources, including MCP servers and skill sources.

### MCP Server Pinning

When you connect to an MCP server, you can "pin" its cryptographic fingerprint. This is similar to how SSH verifies the identity of a server you connect to for the first time.

```bash
tastekit trust pin-mcp <server_name>
```

This command fetches the server's fingerprint and saves it in `trust.v1.yaml`. From that point on, every time TasteKit connects to that server, it verifies that the fingerprint matches. If it doesn't, it means the server's identity has changed, and TasteKit will either warn the user or block the connection, preventing man-in-the-middle attacks or connections to malicious servers.

### Skill Source Pinning

Similarly, you can pin the sources of your skills, whether they are local directories or Git repositories.

```bash
# Pin a Git repository to a specific commit
tastekit trust pin-skill-source https://github.com/example/skills.git --commit <commit_hash>
```

This ensures that the skills your agent uses are exactly the ones you have reviewed and approved.

## Automated Guardrails from MCP

TasteKit leverages the metadata provided by the Model Context Protocol (MCP) to automatically generate a baseline set of security guardrails.

When you run `tastekit mcp bind`, the system inspects each tool for annotations provided by the MCP server, such as:

-   `destructive`: Indicates that the tool performs an irreversible action (e.g., deleting a file).
-   `risk`: A classification of the tool's potential risk (`low`, `medium`, `high`).

Based on this metadata, TasteKit automatically writes rules to `guardrails.v1.yaml`. For example:

-   A tool marked as `destructive` will automatically be configured to **require human approval** before it can be executed.
-   A tool with a `risk` level of `high` will also be set to require approval.

This provides a safe-by-default configuration, which you can then customize if needed.

## No Auto-Enabling of New Tools

A critical security feature of TasteKit is that it **never automatically enables new tools**. When you bind to an MCP server, TasteKit records the list of available tools at that moment.

If the administrator of the MCP server later adds a new, potentially dangerous tool, your agent will **not** be able to see or use it. The new tool will only become available after you explicitly re-run the `tastekit mcp bind` command and approve its inclusion.

This prevents a scenario where an agent's capabilities could be dangerously expanded without the user's knowledge or consent.

## Threat Model

The `docs/security.md` file in the repository outlines the project's threat model, which considers the following risks:

-   **Malicious MCP Server**: An attacker sets up a fake MCP server to trick the agent into connecting and executing malicious commands. (Mitigated by fingerprint pinning).
-   **Malicious Skill Pack**: A user downloads a skill pack from an untrusted source that contains malicious code. (Mitigated by skill source pinning).
-   **Prompt Injection**: An attacker crafts input that causes the agent to ignore its instructions and perform unintended actions. (Mitigated by structured artifacts and clear separation of instructions from data).
-   **Tool Misuse**: A legitimate but powerful tool is used in an unintended or harmful way. (Mitigated by automated guardrails and the principle of least privilege).
