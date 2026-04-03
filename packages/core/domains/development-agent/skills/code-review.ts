/**
 * Code Review Skill
 *
 * Analyze code against user's engineering principles and standards.
 */

export const CodeReviewSkill = {
  skill_id: 'code-review',
  name: 'Code Review',
  description: 'Reviews code for quality, standards compliance, and alignment with engineering principles. Use when reviewing pull requests, auditing code changes, doing pre-commit review, or when the user asks to check or review code.',
  tags: ['development', 'code-review', 'quality'],
  risk_level: 'low' as const,
  required_tools: ['file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  feeds_into: ['refactor-plan'],
  pipeline_phase: 'verify',
  context_model: 'inherit' as const,

  skill_md_content: `# Code Review

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

`
,

  bundled_files: [
    {
      path: 'references/REFERENCE.md',
      description: 'Security checklist, architecture patterns, and severity classification guide',
      load_when: 'Reviewing for security, assessing architecture, or classifying issue severity',
      content: `# Code Review Reference

## Security Vulnerability Checklist

Check for these categories in order of severity:

### Critical
- **Injection**: SQL injection, command injection, XSS, template injection
- **Authentication bypass**: Missing auth checks, broken session management
- **Data exposure**: Secrets in code, PII in logs, unencrypted sensitive data
- **Privilege escalation**: Missing authorization checks on sensitive operations

### High
- **CSRF**: Missing CSRF tokens on state-changing endpoints
- **Path traversal**: Unsanitized file paths from user input
- **Insecure deserialization**: Parsing untrusted data without validation
- **Race conditions**: TOCTOU bugs, non-atomic check-then-act patterns

### Medium
- **Information disclosure**: Verbose error messages, stack traces in production
- **Missing rate limiting**: Endpoints vulnerable to brute force
- **Weak cryptography**: MD5/SHA1 for security, hardcoded keys

## Severity Classification Guide

| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | Security vulnerability, data loss, crash in production | Must fix before merge |
| **Warning** | Logic error, missing edge case, performance issue | Should fix, can negotiate |
| **Suggestion** | Style, readability, alternative approach | Nice to have, author decides |

## Architecture Assessment

When reviewing architectural changes, check:

1. **Dependency direction**: Do dependencies point inward (clean architecture)?
2. **Abstraction level**: Is the new code at the right level of abstraction?
3. **Single responsibility**: Does each module/class have one reason to change?
4. **Interface boundaries**: Are public APIs minimal and well-defined?
5. **Testability**: Can the new code be tested in isolation?
`,
    },
  ],
};
