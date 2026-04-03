/**
 * Documenting Code Skill
 *
 * Generate documentation following user's documentation philosophy.
 */

export const DocumentingCodeSkill = {
  skill_id: 'documenting-code',
  name: 'Documenting Code',
  description: 'Generates documentation following the user\'s documentation philosophy and writing conventions. Use when writing READMEs, API docs, architecture docs, inline documentation, or when the user asks to document, explain, or write docs for code.',
  tags: ['development', 'documentation', 'writing'],
  risk_level: 'low' as const,
  required_tools: ['file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['code-review'],
  pipeline_phase: 'connect',
  context_model: 'inherit' as const,

  skill_md_content: `# Documenting Code

## Purpose

Generates documentation that follows the user's documentation philosophy: what to document, how much detail, and what style. Comments explain "why", not "what".

## When to use

- Writing or updating README files
- Documenting public APIs or modules
- Adding architecture decision records
- When the user asks to "document this", "add docs", or "explain this code"

## When NOT to use

- For inline comments on obvious code (code should be self-documenting)
- For generating JSDoc/TSDoc on every function (only public API)
- When the user wants code reviewed, not documented (use code-review)

## Inputs

- **target**: File paths, module, or codebase area to document
- **type**: Documentation type (README, API, architecture, inline, changelog)
- **audience**: Who reads this (new contributors, API consumers, future maintainers)

## Outputs

- **documentation**: Markdown files or inline comments following user conventions
- **structure**: Where docs should live in the project

## Procedure

### Step 1: Understand the code

- Read the target code thoroughly
- Identify the public API and key abstractions
- Note non-obvious design decisions and tradeoffs

### Step 2: Match user's documentation style

Apply the user's documentation philosophy:
- Comments explain "why", never "what"
- Self-documenting code through good naming reduces comment need
- READMEs should have a quick-start that works in under 5 minutes
- API docs should show usage examples, not just signatures

### Step 3: Write documentation

For each documentation type:

**README**: Quick start first, then architecture, then contributing guide.
**API docs**: One example per endpoint/function. Show the happy path, then edge cases.
**Architecture**: Explain the "why" behind structural decisions. Include diagrams if helpful.
**Inline**: Only where the code's intent isn't obvious from reading it.

### Step 4: Verify accuracy

- Run any code examples to confirm they work
- Check that documented APIs match actual signatures
- Verify file paths and commands are correct

## Quality checks

- [ ] Quick-start section works end-to-end (if README)
- [ ] Code examples are runnable and correct
- [ ] Comments explain "why", not "what"
- [ ] No documentation for self-evident code
- [ ] Consistent terminology throughout
- [ ] File paths and commands verified

## Guardrail notes

Low risk. Documentation is additive. No approval needed unless modifying existing docs that others maintain.
`,
};
