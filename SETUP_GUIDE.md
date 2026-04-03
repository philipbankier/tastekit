## Step-by-Step Guide: Creating Your Content Agents

This guide will walk you through creating two distinct, specialized Content Agents using TasteKit v0.5: one for your personal brand and one for your Autopilot brand. We will use different onboarding depths to achieve the desired level of rigor for each.

### Prerequisites

Before you begin, ensure you have the following set up:

1.  **Node.js and pnpm**: Make sure Node.js (v18+) and pnpm are installed on your system.
2.  **TasteKit Project**: You should have the `tastekit-v0.5-final.tar.gz` archive and have extracted it.
3.  **Build the Project**: Navigate to the `tastekit/` directory and run the following commands to install dependencies and build the project. You only need to do this once.

    ```bash
    cd /path/to/tastekit
    pnpm install
    pnpm build
    ```

### Part 1: Creating Your Two Agent Workspaces

To keep your agents' personalities, skills, and memories completely separate, we will create two different workspaces. A workspace is simply a directory where an agent's configuration and artifacts are stored.

1.  **Create a parent directory** for your agents:

    ```bash
    mkdir ~/my-content-agents
    cd ~/my-content-agents
    ```

2.  **Create a workspace for each agent**:

    ```bash
    mkdir personal-brand-agent
    mkdir autopilot-brand-agent
    ```

This structure ensures that when you run `tastekit` commands, the context for each agent remains isolated.

### Part 2: Building Your Personal Brand Agent (Max Rigor)

For your personal brand, we will use the most intensive onboarding process (`--depth operator`) to capture the maximum amount of nuance and detail.

1.  **Navigate to your personal brand workspace**:

    ```bash
    cd ~/my-content-agents/personal-brand-agent
    ```

2.  **Initialize the TasteKit workspace**:

    Run the `init` command. When prompted, select **Content Agent**.

    ```bash
    tastekit init
    ? What type of agent are you building? › - Use arrow-keys. Return to submit.
    ❯   Content Agent - Social media, brand management, content creation
        Research Agent - Information gathering and analysis
        Sales Agent - Lead generation and deal management
        Support Agent - Customer support and assistance
        Development Agent - Software development tasks
        General Agent - Custom agent (advanced users)
    ```

3.  **Run the Max-Rigor Onboarding Interview**:

    Now, run the `onboard` command with the `--depth operator` flag. This will trigger the most comprehensive interview, asking you all available questions, including those that require you to provide specific examples and detailed inputs.

    ```bash
    tastekit onboard --depth operator
    ```

    Be prepared to answer questions about your brand voice, provide links to example posts you admire, and detail your workflow preferences. This is where you'll define that "brash, edgy" persona.

4.  **Compile the Artifacts**:

    Once the interview is complete, compile your answers into the final agent artifacts.

    ```bash
    tastekit compile
    ```

    This will create a `.tastekit/` directory inside `personal-brand-agent/` containing all the compiled JSON and YAML files that define your agent's taste.

### Part 3: Building Your Autopilot Brand Agent (Guided Rigor)

For your Autopilot brand, we'll use the `guided` depth. This is still very thorough but slightly less intensive than the `operator` level, making it perfect for a professional business brand.

1.  **Navigate to your Autopilot brand workspace**:

    ```bash
    cd ~/my-content-agents/autopilot-brand-agent
    ```

2.  **Initialize the TasteKit workspace**:

    Just as before, initialize the workspace and select **Content Agent**.

    ```bash
    tastekit init
    ```

3.  **Run the Guided Onboarding Interview**:

    This time, use the `--depth guided` flag. This will ask all the important strategic questions without requiring the most detailed, operator-level inputs.

    ```bash
    tastekit onboard --depth guided
    ```

    This process will help you define a professional, technical, and authoritative voice for the Autopilot brand.

4.  **Compile the Artifacts**:

    Finally, compile the artifacts for your second agent.

    ```bash
    tastekit compile
    ```

    This will create a separate `.tastekit/` directory inside `autopilot-brand-agent/`, with a completely different set of artifacts tailored to your business.

### Summary of Your Setup

You now have the following structure:

```
my-content-agents/
├── personal-brand-agent/
│   └── .tastekit/          # Artifacts for your "brash, edgy" personal brand
│       ├── artifacts/
│       ├── session/
│       └── traces/
└── autopilot-brand-agent/
    └── .tastekit/          # Artifacts for your professional Autopilot brand
        ├── artifacts/
        ├── session/
        └── traces/
```

You have successfully created two distinct Content Agents, each with a unique personality and strategy, ready to be integrated into a runtime like OpenClaw or Autopilots.
