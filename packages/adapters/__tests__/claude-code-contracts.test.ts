import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ClaudeCodeAdapter } from '../claude-code/index.js';
import { cleanupFixture, createProfileFixture } from './helpers.js';

const BINDINGS_FIXTURE = {
  schema_version: 'bindings.v1',
  servers: [
    {
      name: 'local',
      url: 'stdio://local',
      tools: [
        {
          tool_ref: 'local:read',
          risk_hints: ['filesystem'],
        },
      ],
      resources: [],
      prompts: [],
      last_bind_at: '2026-02-21T00:00:00.000Z',
    },
  ],
};

describe('ClaudeCodeAdapter contract compatibility', () => {
  it('reads canonical root bindings.v1.json when generating CLAUDE.md', async () => {
    const { rootDir, profilePath } = createProfileFixture('v2');
    const outDir = join(rootDir, 'export-contract-canonical');

    try {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(profilePath, 'bindings.v1.json'),
        JSON.stringify(BINDINGS_FIXTURE, null, 2),
        'utf-8',
      );

      const adapter = new ClaudeCodeAdapter();
      await adapter.export(profilePath, outDir, { includeSkills: true });

      const claudeMd = readFileSync(join(outDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toContain('## Tool Usage');
      expect(claudeMd).toContain('`local:read`');
    } finally {
      cleanupFixture(rootDir);
    }
  });

  it('ignores legacy artifacts/bindings.v1.json when canonical file is absent', async () => {
    const { rootDir, profilePath } = createProfileFixture('v2');
    const outDir = join(rootDir, 'export-contract-legacy');

    try {
      mkdirSync(outDir, { recursive: true });
      mkdirSync(join(profilePath, 'artifacts'), { recursive: true });
      writeFileSync(
        join(profilePath, 'artifacts', 'bindings.v1.json'),
        JSON.stringify(BINDINGS_FIXTURE, null, 2),
        'utf-8',
      );

      const adapter = new ClaudeCodeAdapter();
      await adapter.export(profilePath, outDir, { includeSkills: true });

      const claudeMd = readFileSync(join(outDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).not.toContain('## Tool Usage');
      expect(claudeMd).not.toContain('`local:read`');
    } finally {
      cleanupFixture(rootDir);
    }
  });
});
