/**
 * Writing Tests Skill
 *
 * Generate tests following user's testing philosophy and quality bar.
 */

export const WritingTestsSkill = {
  skill_id: 'writing-tests',
  name: 'Writing Tests',
  description: 'Generates tests following the user\'s testing philosophy, coverage expectations, and quality bar. Use when writing tests for new features, adding regression tests for bugs, improving test coverage, or when the user asks to test, add tests, or verify code.',
  tags: ['development', 'testing', 'quality'],
  risk_level: 'low' as const,
  required_tools: ['file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  prerequisites: ['code-review'],
  feeds_into: ['refactor-plan'],
  pipeline_phase: 'verify',
  context_model: 'inherit' as const,

  skill_md_content: `# Writing Tests

## Purpose

Generates tests that follow the user's testing philosophy, preferred frameworks, naming conventions, and coverage expectations.

## When to use

- Writing tests for new features or modules
- Adding regression tests for bug fixes (TDD: write failing test first)
- Improving test coverage on critical paths
- When the user asks to "test this", "add tests", or "verify"

## When NOT to use

- For manual QA or exploratory testing (out of scope)
- When tests already exist and just need running (use the test runner directly)
- For performance benchmarking (use profiling tools)

## Inputs

- **target**: File paths or module to test
- **focus**: What aspect to test (behavior, edge cases, integration, regression)
- **framework**: Test framework if known (vitest, jest, mocha, pytest, go test, etc.)

## Outputs

- **test_files**: One or more test files following project conventions
- **coverage_summary**: Which critical paths are now covered

## Procedure

### Step 1: Understand what to test

- Read the target code and its public API
- Identify the behavior contract (what it promises to do)
- Note edge cases, error paths, and boundary conditions
- Check existing tests for patterns and conventions

### Step 2: Choose test strategy

Based on user's testing philosophy:
- **Unit tests**: For pure functions and isolated logic
- **Integration tests**: For cross-module interactions and real dependencies
- **Regression tests**: For specific bugs (write the failing case first)

Prefer testing behavior over implementation details. A test that breaks when you refactor internals is worse than no test.

### Step 3: Write tests

- Follow project naming conventions for test files and test names
- Use descriptive test names that explain the expected behavior
- Structure: Arrange (setup) -> Act (execute) -> Assert (verify)
- One logical assertion per test (multiple expect calls are fine if testing one behavior)

### Step 4: Verify tests

- Run the test suite to confirm tests pass
- Intentionally break the target code to verify tests catch it
- Check that test names read as documentation

## Quality checks

- [ ] Tests cover the critical path (happy path)
- [ ] At least one edge case or error path tested
- [ ] Test names describe expected behavior, not implementation
- [ ] Tests follow project conventions (naming, file location, framework)
- [ ] Tests are independent (no shared mutable state between tests)
- [ ] No implementation details tested (tests survive refactoring)

## Guardrail notes

Low risk. Tests are additive and don't modify production code. No approval needed.
`,
};
