#!/usr/bin/env node

/**
 * generate.mjs -- Real end-to-end TasteKit example generator
 *
 * This script runs the full TasteKit pipeline programmatically:
 *   1. Creates workspace structure (like `tastekit init`)
 *   2. Runs an LLM-driven onboarding interview (like `tastekit onboard`)
 *   3. Saves the session for compilation
 *
 * The interview uses a REAL LLM (Claude via `claude -p` print mode) with
 * pre-written answers. The LLM conducts the interview adaptively -- asking
 * follow-up questions, tracking dimension coverage, and extracting structured data.
 *
 * After running this script, run:
 *   node ../../packages/cli/dist/cli.js compile
 *   node ../../packages/cli/dist/cli.js export --target claude-code --out ./export
 *   node ../../packages/cli/dist/cli.js export --target agents-md --out ./export
 *
 * Requirements:
 *   - Claude Code CLI installed and authenticated (`claude auth status`)
 *   - TasteKit packages built (`pnpm build` from repo root)
 *   - Must be run from a STANDALONE terminal (not from within Claude Code)
 */

import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// Import from built dist files (relative to this script's location)
const __dirname = dirname(fileURLToPath(import.meta.url));
const coreBase = join(__dirname, '..', '..', 'packages', 'core', 'dist');

const { Interviewer, createSession, saveSession } = await import(join(coreBase, 'interview', 'index.js'));
const { getDomainRubric } = await import(join(coreBase, 'domains', 'index.js'));

// --- Claude Print Mode LLM Provider ---
// Implements the LLMProvider interface using `claude -p` (print mode).
// This uses the user's Claude Max subscription -- no API key needed.
class ClaudePrintProvider {
  constructor() {
    this.name = 'claude-cli (print mode)';
    this.callCount = 0;
  }

  async complete(messages, options) {
    this.callCount++;
    const callNum = this.callCount;

    // Extract system prompt
    const systemMsg = messages.find(m => m.role === 'system');
    const conversationMsgs = messages.filter(m => m.role !== 'system');

    // Format conversation as a clear prompt
    const conversation = conversationMsgs.map(m => {
      const label = m.role === 'user' ? 'User' : 'Assistant';
      return `${label}: ${m.content}`;
    }).join('\n\n');

    // Write system prompt to temp file (avoids shell escaping issues)
    const tmpFile = join(tmpdir(), `tastekit-sysprompt-${randomUUID()}.txt`);
    const args = ['-p', '--no-session-persistence', '--model', 'sonnet'];

    if (systemMsg) {
      writeFileSync(tmpFile, systemMsg.content, 'utf-8');
      args.push('--append-system-prompt-file', tmpFile);
    }

    // Disable all tools -- we only want text completion
    args.push('--tools', '');

    console.log(`    [claude -p call #${callNum}, ${conversationMsgs.length} messages]`);

    try {
      const result = execFileSync('claude', args, {
        input: conversation,
        encoding: 'utf-8',
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
        // Capture stderr separately so it doesn't pollute output
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return { content: result.trim() };
    } finally {
      // Clean up temp file
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  }
}

// --- Configuration ---
const DOMAIN_ID = 'development-agent';
const DEPTH = 'guided';
const WORKSPACE = join(__dirname, '.tastekit');
const SESSION_PATH = join(WORKSPACE, 'ops', 'session.json');

// --- Pre-written answers ---
// These are thoughtful, opinionated answers about development philosophy.
// The LLM asks adaptive follow-up questions, so these are designed to be
// rich enough to cover ~20 dimensions across the development-agent rubric.
const ANSWERS = [
  // Q1: Opening / engineering identity
  `I'd describe myself as a pragmatic craftsperson. I care deeply about code quality but I'm not precious about it -- shipping working software that users love matters more than architectural perfection. I'm a product-minded engineer: I think about the user impact of every technical decision. My background is full-stack TypeScript, but I've built systems in Go and Python too. I admire engineers who write simple, readable code that a junior dev can understand on their first day.`,

  // Q2: Core technical values
  `My top three non-negotiable values are readability, simplicity, and correctness -- in that order. Readability first because code is read 10x more than it's written. Simplicity because the best code is code that doesn't exist -- every abstraction has a maintenance cost. Correctness because silent bugs are worse than loud failures. If I had to choose between a clever O(n) solution and a readable O(n log n) one, I'd pick readable unless profiling proves it matters. I get frustrated when I see over-engineered code with unnecessary abstractions, premature optimization, or "design pattern bingo" -- factories wrapping builders wrapping strategies.`,

  // Q3: Collaboration / agent relationship
  `I think of the agent as a thoughtful peer -- not a tool, not a junior dev. I want direct, honest communication. If the agent thinks my approach is wrong, I want it to say so and explain why, not just silently comply. For code review, I care about: correctness first, then readability, then consistency with the codebase. I don't want nitpicky style feedback -- that's what linters are for. I want the agent to catch logic errors, edge cases I missed, and suggest simpler approaches when they exist.`,

  // Q4: Code quality / testing
  `Good code to me is code where you can read a function and understand what it does without scrolling. Small, focused functions with meaningful names. I don't obsess over DRY -- three similar lines is better than a premature abstraction. For testing, I'm test-after for features (I like to prototype first, then lock it down with tests) and TDD for bugs (write the failing test that reproduces the bug, then fix it). I prefer integration tests over unit tests because they catch real problems. I aim for testing critical paths, not chasing coverage percentages. A test that tests implementation details is worse than no test.`,

  // Q5: Naming and structure
  `For naming, I'm descriptive over terse -- getUserById over getUsr. camelCase for variables and functions, PascalCase for types and classes, kebab-case for file names. No abbreviations unless they're universally understood (like URL, API, ID). I hate single-letter variables except in loops. For file organization, I keep files small -- if a file is over 300 lines, it probably needs splitting. I organize by feature, not by type. So src/auth/login.ts rather than src/controllers/authController.ts. Single responsibility at the module level.`,

  // Q6: Type safety and error handling
  `I'm strict TypeScript all the way. No any ever -- use unknown and narrow it. Explicit return types on exported functions. I use discriminated unions over inheritance. For error handling, fail fast and fail loud. Throw early with actionable error messages that tell you what went wrong AND what to do about it. Never silently swallow errors. I prefer Result types for expected failures and exceptions for unexpected ones. Logging should be structured JSON in production, human-readable in dev. Log at info for important state changes, warn for recoverable issues, error only for things that need attention.`,

  // Q7: Commits, PRs, documentation
  `Conventional commits always -- feat:, fix:, refactor:, docs:, test:. Atomic commits: one logical change per commit. I squash feature branches on merge. PR descriptions should have a one-sentence summary, what changed and why, and a test plan. No screenshots unless it's UI work. For documentation, code should be self-documenting through good naming and structure. Comments should explain "why", never "what" -- if you need a comment to explain what code does, the code needs rewriting. READMEs should have a quick-start that works in under 5 minutes.`,

  // Q8: Autonomy and learning
  `For autonomy, give the agent high freedom for reading, analysis, and safe operations. But always ask before destructive writes, production deployments, or architectural changes. I prefer battle-tested technology over shiny new things. I'll adopt something new when there's a clear, measurable benefit -- not because it's trending on Hacker News. That said, I'm not afraid to experiment in side projects and bring proven tools into production.`,

  // Q9: Wrap-up / anything else
  `One more thing: I have strong opinions about what NOT to do. Never generate placeholder code or TODO comments -- either implement it or don't touch it. Never add code "just in case" for hypothetical future requirements. Never break existing tests without understanding why they exist first. And never commit code without running the test suite. These are hard lines for me.`,

  // Additional answers in case the LLM asks more follow-ups
  `To add to the error messages point -- I want errors that a developer seeing them for the first time can act on immediately. Something like "Failed to connect to database at localhost:5432 -- is PostgreSQL running? Check DATABASE_URL env var" rather than just "Connection refused". The error message is part of the user experience.`,

  `For the agent specifically -- when writing code, I want minimal diffs. Don't reformat code you didn't change. Don't add type annotations to functions you didn't modify. Don't "improve" adjacent code unless I asked for it. Focused, surgical changes that do exactly what was requested and nothing more.`,

  `On the topic of dependencies -- I'm conservative. I'd rather write 20 lines of straightforward code than add a dependency. Every dependency is a liability: security surface, bundle size, maintenance burden. If I do add one, I prefer well-maintained projects with minimal transitive dependencies. No leftpad situations.`,
];

// --- Main ---
async function main() {
  console.log('=== TasteKit Example Generator ===\n');
  console.log('Using claude -p (print mode) as the LLM provider.');
  console.log('Make sure you are running this from a STANDALONE terminal.\n');

  // Step 1: Create workspace structure (mirrors tastekit init)
  console.log('Step 1: Creating workspace structure...');
  const dirs = [
    'self',
    'knowledge/skills',
    'knowledge/playbooks',
    'ops/traces',
    'ops/drift',
    'ops/observations',
    'ops/sessions',
  ];
  for (const dir of dirs) {
    mkdirSync(join(WORKSPACE, dir), { recursive: true });
  }

  // Write tastekit.yaml manually (avoids yaml package dependency)
  const createdAt = new Date().toISOString();
  const yamlContent = `version: "1.0.0"
project_name: development-agent-example
created_at: "${createdAt}"
domain_id: ${DOMAIN_ID}
onboarding:
  depth: ${DEPTH}
  completed: false
llm_provider:
  provider: anthropic
`;
  writeFileSync(join(WORKSPACE, 'tastekit.yaml'), yamlContent);
  console.log('  Created .tastekit/ workspace with three-space layout\n');

  // Step 2: Create LLM provider
  console.log('Step 2: Initializing Claude print mode provider...');
  const llm = new ClaudePrintProvider();
  console.log(`  Provider: ${llm.name}\n`);

  // Step 3: Load domain rubric
  const rubric = getDomainRubric(DOMAIN_ID) ?? {
    domain_id: DOMAIN_ID,
    version: '0.1.0',
    interview_goal: `Configure a ${DOMAIN_ID} agent based on your preferences and principles.`,
    dimensions: [],
    includes_universal: true,
  };

  const totalDimensions = rubric.dimensions?.length ?? 0;
  console.log(`Step 3: Loaded ${DOMAIN_ID} rubric (${totalDimensions} domain dimensions + universal)\n`);

  // Step 4: Create session
  const session = createSession(DEPTH);
  session.domain_id = DOMAIN_ID;
  session.llm_provider = { name: llm.name };

  // Step 5: Run interview
  console.log('Step 4: Running onboarding interview...\n');
  console.log('='.repeat(60));

  let answerIndex = 0;
  const interviewer = new Interviewer({
    llm,
    rubric,
    depth: DEPTH,
    getUserInput: async () => {
      if (answerIndex >= ANSWERS.length) {
        console.log('\n  [All prepared answers used -- completing interview]');
        return '/save';
      }
      const answer = ANSWERS[answerIndex++];
      console.log(`\n  You (answer ${answerIndex}/${ANSWERS.length}):`);
      // Print first 100 chars as preview
      console.log(`  "${answer.substring(0, 100)}..."\n`);
      return answer;
    },
    onInterviewerMessage: (msg) => {
      console.log(`  Interviewer: ${msg.substring(0, 200)}${msg.length > 200 ? '...' : ''}\n`);
    },
    onStateChange: (state) => {
      session.interview = state;
      session.current_step = 'interview';
      saveSession(SESSION_PATH, session);

      // Print coverage progress
      const covered = state.dimension_coverage.filter(d => d.status === 'covered').length;
      const total = state.dimension_coverage.length;
      const inProgress = state.dimension_coverage.filter(d => d.status === 'in_progress').length;
      console.log(`  [Coverage: ${covered}/${total} covered, ${inProgress} in progress, turn ${state.turn_count}]`);
    },
  });

  const structuredAnswers = await interviewer.run();

  // Step 6: Save final session
  console.log('\n' + '='.repeat(60));
  console.log('\nStep 5: Saving final session...');

  session.structured_answers = structuredAnswers;
  session.completed_steps = ['welcome', 'interview'];
  session.current_step = 'complete';
  session.interview = interviewer.getState();
  saveSession(SESSION_PATH, session);

  // Print summary
  const state = interviewer.getState();
  const covered = state.dimension_coverage.filter(d => d.status === 'covered').length;
  const total = state.dimension_coverage.length;
  const skipped = state.dimension_coverage.filter(d => d.status === 'skipped').length;

  console.log(`\n  Dimensions covered: ${covered}/${total}${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
  console.log(`  Principles extracted: ${structuredAnswers.principles?.length ?? 0}`);
  console.log(`  Voice keywords: ${structuredAnswers.tone?.voice_keywords?.join(', ') ?? 'none'}`);
  console.log(`  Session saved to: .tastekit/ops/session.json`);

  console.log('\n=== Interview complete! ===');
  console.log('\nNext steps (run from this directory):');
  console.log('  node ../../packages/cli/dist/cli.js compile');
  console.log('  node ../../packages/cli/dist/cli.js export --target claude-code --out ./export');
  console.log('  node ../../packages/cli/dist/cli.js export --target agents-md --out ./export');
}

main().catch(err => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
