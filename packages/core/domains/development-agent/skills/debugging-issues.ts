/**
 * Debugging Issues Skill
 *
 * Systematic debugging with root cause investigation.
 */

export const DebuggingIssuesSkill = {
  skill_id: 'debugging-issues',
  name: 'Debugging Issues',
  description: 'Systematically investigates bugs and failures to find root causes before proposing fixes. Use when debugging errors, investigating test failures, diagnosing unexpected behavior, or when the user asks to fix a bug, debug, or investigate an issue.',
  tags: ['development', 'debugging', 'investigation'],
  risk_level: 'low' as const,
  required_tools: ['file-system'],
  compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  feeds_into: ['writing-tests'],
  pipeline_phase: 'process',
  context_model: 'inherit' as const,

  skill_md_content: `# Debugging Issues

## Purpose

Systematically investigates bugs and failures to find root causes. No fixes until the root cause is understood.

## When to use

- Investigating error messages or stack traces
- Diagnosing test failures
- Understanding unexpected behavior
- When the user says "fix this bug", "why is this broken", or "debug this"

## When NOT to use

- For code review (use code-review skill)
- For writing new features (not a debugging task)
- When the fix is obvious and doesn't need investigation

## Inputs

- **symptom**: Error message, failing test, or description of unexpected behavior
- **context**: When it started, what changed recently, reproduction steps
- **scope**: Where to look (file paths, modules, or "unknown")

## Outputs

- **root_cause**: Clear explanation of why the bug happens
- **evidence**: Specific code paths, line numbers, and data flow that prove the cause
- **fix_recommendation**: Proposed fix with confidence level
- **regression_test**: Test case that would catch this bug

## Procedure

### Step 1: Reproduce and observe

- Confirm the bug is reproducible
- Note the exact error, stack trace, or unexpected output
- Identify what the correct behavior should be

### Step 2: Form hypotheses

- List 2-3 most likely causes based on the symptom
- Rank by probability
- Identify what evidence would confirm or eliminate each

### Step 3: Investigate systematically

- Start with the most likely hypothesis
- Trace the code path from input to failure point
- Check recent changes (git log, git blame) near the failure
- Look for related issues (same pattern elsewhere?)

### Step 4: Confirm root cause

- Identify the exact line(s) causing the issue
- Explain the causal chain: input -> code path -> failure
- Verify this explains ALL observed symptoms, not just some

### Step 5: Recommend fix

- Propose the minimal fix that addresses the root cause
- Explain why this fix is correct (not just that it works)
- Suggest a regression test that would catch this bug
- Note any related code that might have the same issue

## Quality checks

- [ ] Root cause identified with specific evidence (file, line, data flow)
- [ ] Fix addresses root cause, not just symptoms
- [ ] Causal chain explains all observed symptoms
- [ ] Regression test proposed
- [ ] No speculative fixes applied without evidence

## Guardrail notes

Low risk during investigation (read-only). The fix itself may require approval depending on scope. Always present the root cause analysis before applying any fix.
`,

  bundled_files: [
    {
      path: 'references/REFERENCE.md',
      description: 'Common bug patterns, investigation commands, and root cause analysis templates',
      load_when: 'Investigating unfamiliar bug categories or need investigation command references',
      content: `# Debugging Reference

## Common Bug Patterns

### State-Related
- **Stale state**: Component reads cached/outdated value after mutation
- **Race condition**: Two operations assume exclusive access to shared state
- **Missing initialization**: Variable used before assignment, default value wrong
- **State leak**: State from one request/session bleeds into another

### Type-Related
- **Null/undefined access**: Property access on null without guard
- **Type coercion**: Implicit conversion produces unexpected value (e.g., "5" + 3 = "53")
- **Schema mismatch**: API response shape differs from expected type

### Async-Related
- **Unhandled rejection**: Promise error not caught
- **Ordering assumption**: Code assumes async operations complete in call order
- **Timeout**: Operation takes longer than expected, no timeout configured
- **Resource leak**: Connection/handle opened but never closed on error path

### Integration-Related
- **API contract change**: Upstream service changed response format
- **Environment difference**: Works locally, fails in CI/production
- **Dependency version**: Transitive dependency upgrade changed behavior

## Investigation Commands

\`\`\`bash
# Find what changed recently near the failure
git log --oneline -10 -- <file>
git blame -L <start>,<end> <file>

# Search for similar patterns in codebase
grep -rn "<error_pattern>" src/
grep -rn "<function_name>" src/ --include="*.test.*"

# Check for the same bug elsewhere
grep -rn "<buggy_pattern>" src/ | grep -v test | grep -v node_modules
\`\`\`

## Root Cause Report Template

\`\`\`
SYMPTOM: [What the user sees]
ROOT CAUSE: [Why it happens — exact file:line and mechanism]
EVIDENCE: [What proves this is the cause, not just a correlate]
FIX: [Minimal change that addresses the root cause]
REGRESSION TEST: [Test that catches this bug if it recurs]
RELATED: [Other code with the same pattern that might also be affected]
\`\`\`
`,
    },
  ],
};
