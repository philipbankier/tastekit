# Agent Skills

In TasteKit, a **Skill** is a modular, reusable capability that an agent can use to perform a specific task. Skills are designed to be self-contained and portable, with a strong emphasis on **progressive disclosure** to keep the agent's initial context small and efficient.

## The `SKILL.md` Contract

Every Skill is defined by a directory containing a `SKILL.md` file. This Markdown file is the contract for the skill, providing the agent with all the information it needs to understand and use the skill effectively. It must contain the following sections:

| Section | Description |
| :--- | :--- |
| **Purpose** | A brief, one-sentence description of what the skill does. |
| **When to use / When not to use** | Clear guidance on the appropriate and inappropriate situations for using the skill. |
| **Inputs / Outputs** | A description of the expected inputs and the outputs the skill will produce. |
| **Procedure** | A step-by-step guide on how to execute the skill. This section is the core of the skill's logic. |
| **Quality checks** | A checklist of criteria to verify that the skill was executed successfully. |
| **Guardrail notes** | Information about which actions might trigger an approval workflow. |
| **Progressive Disclosure** | The most critical section, which defines how the skill's content is loaded. |

## Progressive Disclosure

To avoid overwhelming the agent with unnecessary information, TasteKit enforces a strict progressive disclosure model. The `SKILL.md` file is divided into three parts, which are loaded at different times:

1.  **Minimal Context (Always Load)**: This is a very small, high-level summary of the skill. It includes the `Purpose` and `When to use` sections. This minimal context is always loaded into the agent's prompt, allowing it to know which skills are available without being burdened by the implementation details.

2.  **On Invoke (Load When Skill is Invoked)**: This section contains the detailed `Procedure` and `Quality checks`. It is only loaded into the agent's context *after* the agent has decided to use that specific skill. This is the "just-in-time" delivery of information.

3.  **On Demand Resources (Load Only if Needed)**: This section points to supplementary resources like examples, templates, or scripts that are part of the skill's directory. These resources are only loaded if the agent explicitly asks for them during the execution of the procedure.

This layered approach ensures that the agent's working context remains as small as possible, improving both performance and accuracy.

## Skills Manifest

The skills library is managed by a `manifest.v1.yaml` file located in the `.tastekit/skills/` directory. This file provides metadata about all available skills, including:

-   `skill_id`: A unique identifier for the skill.
-   `name`: A human-readable name.
-   `tags`: A list of tags for categorization.
-   `risk_level`: An assessment of the potential risk of using the skill (`low`, `med`, `high`).
-   `required_tools`: A list of MCP tool references that the skill depends on.

## Managing Skills with the CLI

TasteKit provides a set of CLI commands for managing your skills library:

-   `tastekit skills list`: Lists all the skills available in your workspace.
-   `tastekit skills lint`: Validates the structure of your `SKILL.md` files to ensure they comply with the progressive disclosure contract.
-   `tastekit skills pack`: Packages your skills library into a portable format (`zip` or `dir`) that can be shared or deployed to a runtime like Manus.
