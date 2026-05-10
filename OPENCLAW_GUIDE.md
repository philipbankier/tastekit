## OpenClaw Integration Guide

Archived v0.5 scenario note: this guide uses the older content-agent example. For the current v1 release surface, create a `development-agent` or `general-agent` profile, then export with `tastekit export --target openclaw`.

This guide explains how to use the agent profiles you created with TasteKit v0.5 in **OpenClaw**, a powerful, locally-run AI agent runtime. OpenClaw is an excellent first step for using your new Content Agents because it directly supports the concept of persistent agent personalities and local file access.

### How the Integration Works

TasteKit is designed to be runtime-agnostic. It generates a set of standardized configuration files (artifacts) that define your agent. The **OpenClaw adapter** in TasteKit knows how to translate these standard artifacts into the specific file formats that OpenClaw understands.

Here’s a conceptual overview of the process:

1.  **You create an agent profile** using TasteKit (`init`, `onboard`, `compile`).
2.  **You run the `export` command** in TasteKit, specifying `openclaw` as the target.
3.  **TasteKit’s OpenClaw adapter** reads your compiled artifacts (`constitution.v1.json`, `skills.v1.json`, etc.).
4.  **The adapter creates an OpenClaw-compatible profile directory** containing the necessary configuration files for that runtime (e.g., `personality.txt`, `memories/`, `skills/`).
5.  **You load this profile** into your OpenClaw agent.

### Step-by-Step Integration

Let’s export your **personal brand agent** to an OpenClaw profile.

1.  **Navigate to Your Agent’s Workspace**:

    Open your terminal and go to the directory where you created your personal brand agent.

    ```bash
    cd ~/my-content-agents/personal-brand-agent
    ```

2.  **Run the Export Command**:

    Use the `tastekit export` command. You need to specify two things:
    *   `--target openclaw`: This tells TasteKit to use the OpenClaw adapter.
    *   `--out ./openclaw-profile`: This specifies the directory where the exported profile will be saved.

    ```bash
    tastekit export --target openclaw --out ./openclaw-profile
    ```

3.  **Review the Exported Profile**:

    After the command completes, you will have a new `openclaw-profile/` directory. Let’s look inside:

    ```
    openclaw-profile/
    ├── personality.txt       # Generated from your Constitution artifact
    ├── memories/
    │   └── core_memories.txt # Key memories and principles
    └── skills/
        ├── research_trends.md  # The research skill, formatted for OpenClaw
        └── generate_post_options.md # The post generation skill
    ```

    *   **`personality.txt`**: This file contains the core identity of your agent—its name, brand voice, principles, and guardrails. OpenClaw will use this as the base prompt for your agent.
    *   **`memories/`**: This directory holds long-term memories. TasteKit places the most critical principles here.
    *   **`skills/`**: Each of your TasteKit skills has been converted into a separate Markdown file that OpenClaw can read and execute.

4.  **Load the Profile into OpenClaw**:

    Now, you need to configure your OpenClaw agent to use this new profile. The exact steps may vary slightly depending on your OpenClaw setup, but it generally involves the following:

    *   Move the `openclaw-profile` directory to your OpenClaw agent’s directory.
    *   Update your OpenClaw agent’s main configuration file to point to this new profile directory.

    For example, you might have a configuration that looks like this:

    ```yaml
    # In your OpenClaw agent's config.yaml
    agent:
      name: MyPersonalBrandAgent
      profile_path: "./openclaw-profile"
    ```

5.  **Run Your Agent**:

    Start your OpenClaw agent. It will now embody the personality and capabilities you defined in TasteKit. You can start giving it tasks like:

    > "Use the `generate_post_options` skill to create three edgy tweets about the future of AI agents."

    > "Use the `research_trends` skill to find out what’s currently trending on Twitter in the #buildinpublic community."

### Repeating for Your Autopilot Brand

To use your Autopilot brand agent with OpenClaw, you simply repeat the process from within its workspace directory:

1.  Navigate to the Autopilot agent’s workspace:

    ```bash
    cd ~/my-content-agents/autopilot-brand-agent
    ```

2.  Run the export command:

    ```bash
    tastekit export --target openclaw --out ./autopilot-openclaw-profile
    ```

3.  Load the new `autopilot-openclaw-profile` into a separate OpenClaw agent.

By following this process, you can use TasteKit as a central "foundry" for creating and managing multiple, distinct agent personalities, and then deploy them to powerful runtimes like OpenClaw.
