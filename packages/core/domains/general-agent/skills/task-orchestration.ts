/**
 * Task Orchestration Skill
 *
 * Turn mixed requests into an executable, tracked plan with clear checkpoints.
 */

export const TaskOrchestrationSkill = {
  skill_id: 'task-orchestration',
  name: 'Task Orchestration',
  description: 'Plans and executes multi-step tasks with explicit checkpoints, constraints, and escalation points. Use when handling complex requests that combine planning and execution, multi-step workflows with dependencies, or when the user asks to plan, orchestrate, or manage a task.',
  tags: ['general', 'planning', 'execution'],
  risk_level: 'low' as const,
  required_tools: ['file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
  prerequisites: ['context-synthesis'],
  pipeline_phase: 'process',
  context_model: 'inherit' as const,

  skill_md_content: `# Task Orchestration

## Purpose

Convert a goal into a concrete execution plan, then drive progress with explicit checkpoints, guardrails, and status updates.

## When to use

- Multi-step tasks with dependencies
- Requests that combine planning, research, and execution
- Work that needs milestones, handoffs, and risk tracking
- Ongoing operator workflows with periodic reprioritization

## When NOT to use

- Single-step tasks that can be completed immediately
- Work requiring deep domain-specific expertise where a specialized skill exists
- Situations with insufficient context and no permission to clarify

## Inputs

- **goal**: Desired outcome
- **constraints**: Time, budget, policy, tooling, or scope constraints
- **context_snapshot**: Current state, assumptions, and known dependencies
- **priority_rule**: Optional prioritization criteria (impact/urgency/risk)

## Outputs

- **execution_plan**: Ordered steps with dependencies and owners
- **checkpoint_log**: Milestone updates, blockers, and next actions
- **escalation_events**: Issues requiring approval or human decision

## Procedure

### Step 1: Frame the objective

- Restate goal and success criteria in one concise block
- Identify constraints and unknowns before execution

### Step 2: Decompose and order work

- Break into phases with step-level outputs
- Mark dependencies and parallelizable tracks
- Highlight irreversible or high-risk actions

### Step 3: Execute with checkpoints

- Run one step at a time unless safe parallelization is clear
- After each checkpoint, report status, artifacts, and blockers
- Re-prioritize if constraints or context change

### Step 4: Escalate intentionally

- Escalate on policy risk, destructive actions, missing authority, or ambiguity
- Present options with tradeoffs when escalation is needed

### Step 5: Close with a decision-ready summary

- Report completed steps, residual risks, and recommended next action

## Quality checks

- [ ] Plan includes clear success criteria and constraints
- [ ] Dependencies and ordering are explicit
- [ ] Checkpoints include concrete evidence of progress
- [ ] Escalation triggers were respected
- [ ] Final summary is decision-ready and actionable

## Guardrail notes

Do not perform destructive or irreversible actions without explicit approval when guardrails require it.

## Progressive Disclosure

### Minimal Context (Always Load)
- Goal, constraints, and current priority policy

### On Invoke (Load When Skill is Invoked)
- Full decomposition/checkpoint workflow and escalation rules

### On Demand Resources
- Reusable checklist templates and incident-style escalation format
`,
};
