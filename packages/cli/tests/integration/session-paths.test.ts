import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit session path contracts', () => {
  it('uses session.json as canonical onboarding session location', async () => {
    const root = makeTempWorkspace('session-contract-path');
    const tastekitDir = join(root, '.tastekit');
    const sessionPath = join(tastekitDir, 'session.json');

    try {
      mkdirSync(tastekitDir, { recursive: true });
      writeFileSync(sessionPath, JSON.stringify({
        session_id: 'sess-contract',
        started_at: '2026-02-21T00:00:00.000Z',
        last_updated_at: '2026-02-21T00:01:00.000Z',
        depth: 'guided',
        current_step: 'complete',
        completed_steps: ['welcome', 'interview'],
        answers: {
          goals: {
            primary_goal: 'Ship contract hardening',
            key_principles: 'be precise, be compatible',
          },
          tone: {
            voice_keywords: ['clear'],
            forbidden_phrases: 'guess wildly',
          },
          tradeoffs: {
            accuracy_vs_speed: 0.8,
            autonomy_level: 0.6,
          },
        },
      }, null, 2));

      const compile = await runCli(['compile'], { cwd: root });
      expect(compile.code).toBe(0);
      expect(existsSync(sessionPath)).toBe(true);

      const session = JSON.parse(readFileSync(sessionPath, 'utf-8'));
      expect(session.session_id).toBe('sess-contract');
      expect(existsSync(join(root, '.tastekit', 'constitution.v1.json'))).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });
});
