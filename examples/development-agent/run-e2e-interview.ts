#!/usr/bin/env npx tsx
/**
 * E2E Interview Test — Development Agent
 *
 * Runs a complete TasteKit interview programmatically with Ollama,
 * simulating a real customer who is a senior developer setting up
 * an AI coding assistant.
 *
 * Usage:
 *   npx tsx examples/development-agent/run-e2e-interview.ts
 *
 * Requires: Ollama running with qwen2.5-coder:7b (or similar)
 */

import { Interviewer, StructuredAnswers } from '../../packages/core/interview/interviewer.js';
import { getDomainRubric } from '../../packages/core/domains/index.js';
import { OllamaProvider } from '../../packages/core/llm/providers/ollama.js';
import { compileConstitution } from '../../packages/core/compiler/constitution-compiler.js';
import { compileGuardrails } from '../../packages/core/compiler/guardrails-compiler.js';
import { compileMemoryPolicy } from '../../packages/core/compiler/memory-compiler.js';
import { generateSoulMd } from '../../packages/core/generators/soul-md-generator.js';
import { generateAgentsMd } from '../../packages/core/generators/agents-md-generator.js';
import { generateClaudeMd } from '../../packages/core/generators/claude-md-generator.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');

// ---------------------------------------------------------------------------
// Simulated customer responses — a senior backend developer
// ---------------------------------------------------------------------------
const CUSTOMER_RESPONSES = [
  // Opening — broad introduction
  `I'm a senior backend engineer building a distributed payments system at a fintech startup.
  We process about 2M transactions daily. I need an AI coding assistant that understands
  our codebase conventions and can help with code review, debugging, and writing new services.
  We're a Go shop primarily, with some Python for ML pipelines.`,

  // Principles and values
  `Correctness over speed, always. In payments, a bug can cost us millions — literally.
  We follow a "test first" philosophy. Every PR must have tests. We do thorough code review —
  no one merges their own PR. We also value readability — code should be self-documenting.
  If you need a comment to explain it, the code probably needs refactoring.`,

  // Communication tone and style
  `Direct and technical. No fluff, no "great question!" responses. When reviewing code,
  be specific — line numbers, concrete suggestions. I hate vague feedback like "consider
  improving error handling." Tell me exactly what's wrong and how to fix it.
  Use Go idioms — we follow Effective Go and the Google Go Style Guide.`,

  // Autonomy and boundaries
  `For code review and suggestions: high autonomy. Flag issues, suggest fixes, even write
  alternative implementations. But for anything that touches the database schema or payment
  processing logic — always show me first. Never auto-merge, never auto-deploy.
  And never, ever modify or suggest changes to our encryption or key management code
  without explicit approval.`,

  // Tradeoffs and evidence
  `Accuracy over speed, definitely. I'd rather wait 30 seconds for a correct answer than
  get a fast wrong one. Cost isn't a concern — we have budget for good tooling.
  When suggesting changes, cite the specific Go standard library docs or well-known
  patterns. Don't make up API signatures.`,

  // Confirmation/wrap-up response
  `That covers the essentials. Oh, one more thing — for error handling, we use structured
  errors with error codes, not just string messages. And all our services use OpenTelemetry
  for tracing. The assistant should understand and suggest OTel spans when appropriate.
  Let's wrap up.`,

  // Draft reaction (if draft trigger fires)
  `Looks good overall. One correction: our autonomy boundary for database changes should
  be even stricter — any DDL statement (CREATE, ALTER, DROP) requires my explicit approval
  AND a Slack notification to the team. Also add that we use protobuf for all inter-service
  communication, not JSON. That's a hard convention.`,

  // Final confirmation
  `Yes, that captures it well. Let's generate the profile.`,
];

// ---------------------------------------------------------------------------
// Main E2E flow
// ---------------------------------------------------------------------------
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  TasteKit E2E Interview — Development Agent          ║');
  console.log('║  Customer: Senior Backend Engineer (Fintech/Go)      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 1. Setup
  const rubric = getDomainRubric('development-agent');
  if (!rubric) throw new Error('development-agent rubric not found');

  const llm = new OllamaProvider({ model: 'qwen2.5-coder:7b' });

  let responseIndex = 0;
  const transcript: Array<{ role: string; message: string }> = [];
  const issues: string[] = [];
  const observations: string[] = [];

  console.log('🔌 Using Ollama (qwen2.5-coder:7b) for interview...\n');
  console.log('─'.repeat(60));

  // 2. Run interview
  const startTime = Date.now();

  const interviewer = new Interviewer({
    llm,
    rubric,
    depth: 'quick',
    onInterviewerMessage: async (message: string) => {
      console.log(`\n🤖 Interviewer:\n${message}\n`);
      transcript.push({ role: 'interviewer', message });

      // Check for UX issues
      if (message.length > 2000) {
        issues.push(`Turn ${transcript.length}: Interviewer message too long (${message.length} chars)`);
      }
      const questionCount = (message.match(/\?/g) || []).length;
      if (questionCount > 3) {
        issues.push(`Turn ${transcript.length}: Too many questions in one message (${questionCount})`);
      }
      if (questionCount === 0 && transcript.length > 2) {
        observations.push(`Turn ${transcript.length}: No question asked — good for 2-1-2 pacing`);
      }
    },
    getUserInput: async () => {
      if (responseIndex >= CUSTOMER_RESPONSES.length) {
        console.log('\n⚠️  Ran out of simulated responses — sending wrap-up signal');
        return 'That covers everything. Please wrap up and generate my profile.';
      }
      const response = CUSTOMER_RESPONSES[responseIndex++];
      console.log(`\n👤 Customer:\n${response}\n`);
      console.log('─'.repeat(60));
      transcript.push({ role: 'customer', message: response });
      return response;
    },
    onStateChange: (state) => {
      const covered = state.dimension_coverage.filter(d => d.status === 'covered').length;
      const total = state.dimension_coverage.length;
      const meta = state.interview_meta;
      console.log(`📊 Coverage: ${covered}/${total} dimensions | Turn ${state.turn_count} | ` +
        `Position: ${meta?.pacing_position ?? 'unknown'} | ` +
        `Fatigue: ${meta?.fatigue_detected ? 'YES' : 'no'} | ` +
        `Draft: ${meta?.draft_triggered ? 'triggered' : 'no'}`);
    },
  });

  let structuredAnswers: StructuredAnswers;
  try {
    structuredAnswers = await interviewer.run();
  } catch (error) {
    console.error('\n❌ Interview failed:', error);
    issues.push(`Interview failed: ${error}`);
    // Create fallback answers for compilation testing
    structuredAnswers = createFallbackAnswers();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const state = interviewer.getState();

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Interview complete in ${duration}s (${state.turn_count} turns)`);
  console.log('═'.repeat(60));

  // 3. Compile artifacts
  console.log('\n📦 Compiling artifacts...\n');

  const session = {
    schema_version: 'workspace.v1' as const,
    session_id: `e2e-test-${Date.now()}`,
    domain_id: 'development-agent',
    depth: 'quick' as const,
    status: 'completed' as const,
    llm_provider: { name: 'ollama' as const },
    answers: {},
    structured_answers: structuredAnswers,
  };

  const constitution = compileConstitution(session as any, '1.0.0');
  const guardrails = compileGuardrails(session as any);
  const memory = compileMemoryPolicy(session as any);

  console.log(`  ✓ Constitution: ${constitution.principles.length} principles`);
  console.log(`  ✓ Guardrails: ${guardrails.permissions?.length ?? 0} permissions`);
  console.log(`  ✓ Memory policy: ${memory.write_policy?.update_mode ?? 'default'} mode`);

  // 4. Generate output files
  console.log('\n📝 Generating output files...\n');

  const generatorCtx = {
    generator_version: '1.0.0',
    domain_id: 'development-agent',
    constitution,
    guardrails,
    memory,
    vocabulary: {
      principles_heading: 'Engineering Standards',
      drift_verb: 'Standards drift',
    },
  };

  const soulMd = generateSoulMd(generatorCtx);
  const agentsMd = generateAgentsMd(generatorCtx);
  const claudeMd = generateClaudeMd(generatorCtx);

  // 5. Write output files
  mkdirSync(OUTPUT_DIR, { recursive: true });

  writeFileSync(join(OUTPUT_DIR, 'constitution.v1.json'), JSON.stringify(constitution, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'guardrails.v1.yaml'), JSON.stringify(guardrails, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'memory.v1.yaml'), JSON.stringify(memory, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'SOUL.md'), soulMd);
  writeFileSync(join(OUTPUT_DIR, 'AGENTS.md'), agentsMd);
  writeFileSync(join(OUTPUT_DIR, 'CLAUDE.md'), claudeMd);
  writeFileSync(join(OUTPUT_DIR, 'structured-answers.json'), JSON.stringify(structuredAnswers, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'interview-transcript.json'), JSON.stringify(transcript, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'interview-state.json'), JSON.stringify(state, null, 2));

  console.log(`  ✓ SOUL.md (${soulMd.length} chars)`);
  console.log(`  ✓ AGENTS.md (${agentsMd.length} chars)`);
  console.log(`  ✓ CLAUDE.md (${claudeMd.length} chars)`);
  console.log(`  ✓ constitution.v1.json`);
  console.log(`  ✓ guardrails.v1.yaml`);
  console.log(`  ✓ memory.v1.yaml`);
  console.log(`  ✓ structured-answers.json`);
  console.log(`  ✓ interview-transcript.json`);
  console.log(`  ✓ interview-state.json`);

  // 6. Quality report
  console.log('\n' + '═'.repeat(60));
  console.log('📋 QUALITY REPORT');
  console.log('═'.repeat(60));

  console.log(`\n📊 Interview Stats:`);
  console.log(`  Turns: ${state.turn_count}`);
  console.log(`  Duration: ${duration}s`);
  console.log(`  Simulated responses used: ${responseIndex}/${CUSTOMER_RESPONSES.length}`);

  const covered = state.dimension_coverage.filter(d => d.status === 'covered');
  const partial = state.dimension_coverage.filter(d => d.status === 'in_progress');
  const notStarted = state.dimension_coverage.filter(d => d.status === 'not_started');
  console.log(`  Dimensions covered: ${covered.length}/${state.dimension_coverage.length}`);
  console.log(`  Dimensions in progress: ${partial.length}`);
  console.log(`  Dimensions not started: ${notStarted.length}`);

  if (notStarted.length > 0) {
    console.log(`  ⚠️  Not started: ${notStarted.map(d => d.dimension_id).join(', ')}`);
  }

  console.log(`\n📝 Constitution Quality:`);
  console.log(`  Principles: ${constitution.principles.length}`);
  if (constitution.principles.length === 0) {
    issues.push('Constitution has 0 principles — extraction failed');
  }
  for (const p of constitution.principles) {
    console.log(`    ${p.priority}. ${p.statement}`);
    if (!p.rationale) observations.push(`Principle "${p.statement}" missing rationale`);
  }

  console.log(`\n  Tone keywords: ${constitution.tone?.voice_keywords?.join(', ') || 'none'}`);
  console.log(`  Forbidden phrases: ${constitution.tone?.forbidden_phrases?.join(', ') || 'none'}`);
  console.log(`  Autonomy: ${constitution.tradeoffs?.autonomy_level}`);
  console.log(`  Accuracy vs Speed: ${constitution.tradeoffs?.accuracy_vs_speed}`);
  console.log(`  Taboos (never): ${constitution.taboos?.never_do?.join(', ') || 'none'}`);
  console.log(`  Taboos (escalate): ${constitution.taboos?.must_escalate?.join(', ') || 'none'}`);

  if (issues.length > 0) {
    console.log(`\n⚠️  Issues Found (${issues.length}):`);
    for (const issue of issues) {
      console.log(`  ❌ ${issue}`);
    }
  }

  if (observations.length > 0) {
    console.log(`\n💡 Observations (${observations.length}):`);
    for (const obs of observations) {
      console.log(`  📌 ${obs}`);
    }
  }

  console.log(`\n📁 Output: ${OUTPUT_DIR}`);
  console.log('─'.repeat(60));
}

function createFallbackAnswers(): StructuredAnswers {
  return {
    principles: [
      {
        statement: 'Correctness over speed in all code',
        rationale: 'Payment processing bugs cost millions',
        priority: 1,
        applies_to: ['*'],
        source_dimension: 'core_technical_values',
      },
      {
        statement: 'Test-first development — every PR must have tests',
        rationale: 'Tests catch bugs before they reach production',
        priority: 2,
        applies_to: ['development'],
        source_dimension: 'core_technical_values',
      },
      {
        statement: 'Code should be self-documenting — minimize comments',
        rationale: 'If you need a comment to explain it, refactor the code',
        priority: 3,
        applies_to: ['development'],
        source_dimension: 'guiding_principles',
      },
    ],
    tone: {
      voice_keywords: ['direct', 'technical', 'specific', 'concise'],
      forbidden_phrases: ['great question', 'consider improving', 'you might want to'],
      formatting_rules: ['Use Go idioms', 'Reference line numbers in reviews', 'Cite standard library docs'],
      source_dimensions: ['communication_tone'],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.9,
      cost_sensitivity: 0.1,
      autonomy_level: 0.6,
      source_dimensions: ['autonomy_boundaries', 'accuracy_evidence'],
    },
    evidence_policy: {
      require_citations_for: ['API signatures', 'performance claims', 'security practices'],
      uncertainty_language_rules: ['Never guess at API signatures — look them up', 'Hedge performance claims'],
      source_dimensions: ['accuracy_evidence'],
    },
    taboos: {
      never_do: [
        'Modify encryption or key management code without approval',
        'Auto-merge or auto-deploy any code',
        'Execute DDL statements without explicit approval',
        'Make up API signatures',
      ],
      must_escalate: [
        'Database schema changes (DDL)',
        'Payment processing logic changes',
        'Encryption/key management changes',
      ],
      source_dimensions: ['hard_boundaries', 'autonomy_boundaries'],
    },
    domain_specific: {
      language: 'Go',
      style_guide: 'Effective Go + Google Go Style Guide',
      ipc: 'protobuf',
      error_handling: 'structured errors with error codes',
      observability: 'OpenTelemetry',
    },
  };
}

main().catch(console.error);
