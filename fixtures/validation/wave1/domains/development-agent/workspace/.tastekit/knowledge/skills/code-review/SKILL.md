# Code Review

## Purpose

Review code changes for quality, standards compliance, and alignment with the user's engineering principles. Produce actionable feedback.

## When to use

- Reviewing pull requests or code changes
- Auditing code quality against team standards
- Pre-commit review of own changes
- Onboarding review of unfamiliar codebases

## When NOT to use

- For automated linting (use linter tools directly)
- For performance benchmarking (use profiling tools)
- When the user wants code written, not reviewed (use refactor-plan instead)

## Inputs

- **target**: File paths, diff, or PR reference to review
- **focus**: Review focus areas (optional: security, performance, readability, architecture)
- **depth**: Review depth (quick, standard, thorough)

## Outputs

- **findings**: Structured review findings with:
  - **summary**: Overall assessment
  - **issues**: List of issues found, with severity (critical, warning, suggestion)
  - **principle_alignment**: How the code aligns with user's engineering principles
  - **positive_notes**: Things done well (important for balanced feedback)

## Procedure

### Step 1: Understand context

- Read the code changes and surrounding context
- Identify the purpose of the changes
- Check which engineering principles are most relevant

### Step 2: Review against principles

For each user principle that applies:
- Check if the code follows the principle
- Note violations with specific line references
- Note positive alignment

### Step 3: Check for common issues

- Security vulnerabilities (injection, auth, data exposure)
- Error handling gaps
- Edge cases not covered
- Naming and readability
- Test coverage gaps

### Step 4: Assess architecture

- Does the change fit the existing architecture?
- Are there unnecessary dependencies introduced?
- Is the abstraction level appropriate?

### Step 5: Format feedback

Structure findings by severity. Lead with the most important issues. Include positive notes.

## Quality checks

- [ ] All changed files reviewed
- [ ] Feedback references specific lines/sections
- [ ] Issues categorized by severity
- [ ] Positive aspects noted alongside issues
- [ ] Feedback aligns with user's engineering principles
- [ ] Suggestions are actionable

## Guardrail notes

Low risk — read-only analysis. No approval needed.

## Progressive Disclosure

### Minimal Context (Always Load)
- Purpose: Code review against engineering principles
- When to use: Reviewing PRs, code changes, or codebases

### On Invoke (Load When Skill is Invoked)
- Full review procedure with principle checking
- Common issue checklist and severity classification

### On Demand Resources
- Security vulnerability patterns
- Architecture assessment frameworks
