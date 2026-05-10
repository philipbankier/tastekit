## Autopilots Integration Guide

Archived v0.5 scenario note: this guide uses the older content-agent example. For the current v1 release surface, create a `development-agent` or `general-agent` profile, then export with `tastekit export --target autopilots`.

This guide covers how to use your TasteKit-generated agent profiles with **Autopilots**, a runtime focused on structured, multi-step task execution. The integration with Autopilots is slightly different from OpenClaw, as it leverages TasteKit’s more structured artifacts, like Playbooks and YAML-based configurations.

### How the Integration Works

Autopilots are designed to execute predefined sequences of tasks and skills. The TasteKit adapter for Autopilots therefore focuses on translating your agent’s constitution and skills into a format that can be easily consumed by an Autopilot’s task-running engine.

1.  **You create an agent profile** in TasteKit.
2.  **You run the `export` command**, targeting `autopilots`.
3.  **TasteKit’s Autopilots adapter** reads your compiled artifacts.
4.  **The adapter creates an Autopilot-compatible profile directory** containing YAML configuration files and a skills library.
5.  **You configure your Autopilot** to use these files as its core instruction set.

### Step-by-Step Integration

Let’s export your **Autopilot brand agent** to a profile suitable for the Autopilots runtime.

1.  **Navigate to Your Agent’s Workspace**:

    Open your terminal and go to the directory where you created your Autopilot brand agent.

    ```bash
    cd ~/my-content-agents/autopilot-brand-agent
    ```

2.  **Run the Export Command**:

    Use the `tastekit export` command, this time specifying `autopilots` as the target.

    ```bash
    tastekit export --target autopilots --out ./autopilot-profile
    ```

3.  **Review the Exported Profile**:

    The generated `autopilot-profile/` directory will have a different structure, tailored for this runtime:

    ```
    autopilot-profile/
    ├── constitution.yaml     # Core principles and voice in a structured format
    ├── guardrails.yaml       # Safety and approval rules
    ├── skills/
    │   ├── research_trends.md
    │   └── generate_post_options.md
    └── playbooks/
        └── sample_content_playbook.yaml # An example playbook to get started
    ```

    *   **`constitution.yaml`**: This is a structured YAML file containing your agent’s core identity, principles, voice keywords, and goals. Autopilots can parse this file to set the context for every task.
    *   **`guardrails.yaml`**: Defines the approval workflows and safety constraints for the Autopilot.
    *   **`skills/`**: The skills are exported in the same Markdown format, as Autopilots can also read these files to understand how to perform specific tasks.
    *   **`playbooks/`**: The adapter generates a sample playbook. This is a sequence of steps that the Autopilot can execute. For example, it might define a workflow like: `Research Trends` -> `Generate Post Options` -> `Request Approval`.

4.  **Load the Profile into Your Autopilot**:

    To use this profile, you would configure your Autopilot to load these files on startup.

    *   Point your Autopilot to the `autopilot-profile/` directory.
    *   Instruct it to use `constitution.yaml` as its base context.
    *   Load the skills from the `skills/` directory into its skill library.
    *   Make the playbooks in the `playbooks/` directory available for execution.

    An example configuration for an Autopilot might look like this:

    ```python
    # In your Autopilot's main script
    from autopilot_runtime import Autopilot

    agent = Autopilot(
        profile_path="./autopilot-profile",
        constitution_file="constitution.yaml",
        skills_dir="skills/",
        playbooks_dir="playbooks/"
    )

    agent.run_playbook("sample_content_playbook.yaml")
    ```

5.  **Execute a Playbook**:

    With Autopilots, you typically run a playbook rather than giving one-off commands. You can now trigger the sample playbook:

    > "Run the `sample_content_playbook` to generate today's social media posts."

    The Autopilot will then execute the steps defined in the playbook, using the skills and constitution you created in TasteKit to guide its actions.

### Key Advantages of Using TasteKit with Autopilots

*   **Structured Configuration**: TasteKit provides a systematic way to generate the structured YAML files that Autopilots excel at using.
*   **Reusable Skills**: The skills you define in TasteKit are portable and can be used directly by the Autopilot runtime.
*   **Decoupled Taste Management**: You can update your brand’s voice, strategy, or principles in TasteKit, re-export the profile, and your Autopilot will instantly adopt the new taste without you needing to change the Autopilot’s own code.

This workflow allows you to maintain a clear separation between the **"what"** (the agent’s taste and strategy, managed in TasteKit) and the **"how"** (the task execution engine, managed by the Autopilot runtime).
