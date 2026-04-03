# Refactor Plan

## Purpose

Analyze existing code and propose a structured refactoring plan that improves code quality while aligning with the user's engineering principles and standards.

## When to use

- Code has accumulated technical debt
- Architecture needs to evolve for new requirements
- Readability or maintainability needs improvement
- Preparing for a major feature that requires cleaner foundations

## When NOT to use

- For cosmetic-only changes (formatting, naming) — use linter
- When the user wants a code review without changes — use code-review
- For greenfield development (no existing code to refactor)

## Inputs

- **target**: File paths or module to refactor
- **goal**: What the refactoring should achieve (readability, performance, extensibility, etc.)
- **constraints**: Things that must not change (public API, behavior, etc.)
- **budget**: Scope limit (small: single file, medium: module, large: cross-cutting)

## Outputs

- **plan**: Structured refactoring plan with:
  - **assessment**: Current state analysis and identified problems
  - **steps**: Ordered list of refactoring steps, each with:
    - description of the change
    - files affected
    - risk level
    - estimated scope
  - **principle_alignment**: How the refactoring serves user's engineering principles
  - **risks**: What could go wrong and mitigation strategies
  - **testing_strategy**: How to verify the refactoring didn't break anything

## Procedure

### Step 1: Analyze current state

- Read the target code thoroughly
- Map dependencies (what depends on this code, what it depends on)
- Identify code smells and structural issues
- Note what works well (don't refactor unnecessarily)

### Step 2: Align with principles

- Review user's engineering principles
- Determine which principles the refactoring should serve
- Ensure the proposed changes don't violate other principles

### Step 3: Design the refactoring

- Break into small, independently testable steps
- Order steps to minimize risk (safest changes first)
- Identify which steps require approval (behavior changes, API changes)
- Ensure each step leaves the code in a working state

### Step 4: Assess risks

- What tests exist? What's the coverage?
- What downstream dependencies could break?
- Is there a rollback strategy?

### Step 5: Present the plan

Structure the plan so the user can approve step-by-step. Each step should be independently executable.

## Quality checks

- [ ] Current state thoroughly analyzed
- [ ] All affected files identified
- [ ] Steps are ordered by risk (safest first)
- [ ] Each step leaves code in a working state
- [ ] Testing strategy covers refactored code
- [ ] Plan aligns with user's engineering principles
- [ ] Risks identified with mitigation strategies

## Guardrail notes

Medium risk — the plan itself is read-only, but executing it modifies code. The plan should be reviewed before execution. Each step with risk_level >= medium requires approval.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Propose refactoring plans aligned with engineering principles
- When to use: Technical debt, architecture evolution, maintainability improvement

### On Invoke (Load When Skill is Invoked)
- Full analysis and planning procedure
- Risk assessment and testing strategy requirements

### On Demand Resources
- Refactoring pattern catalog
- Risk mitigation strategies
