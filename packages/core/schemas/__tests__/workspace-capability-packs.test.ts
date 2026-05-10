import { describe, expect, it } from 'vitest';
import { SessionStateSchema, WorkspaceConfigSchema } from '../workspace.js';

describe('workspace capability packs', () => {
  it('allows general-agent workspaces to declare optional capability packs', () => {
    const config = WorkspaceConfigSchema.parse({
      version: '1.0.0',
      project_name: 'demo',
      created_at: '2026-05-10T00:00:00.000Z',
      domain_id: 'general-agent',
      capability_packs: ['development', 'content'],
      onboarding: {
        depth: 'guided',
        completed: false,
      },
    });

    expect(config.capability_packs).toEqual(['development', 'content']);
  });

  it('persists selected capability packs on the onboarding session', () => {
    const session = SessionStateSchema.parse({
      session_id: 'demo',
      started_at: '2026-05-10T00:00:00.000Z',
      last_updated_at: '2026-05-10T00:00:00.000Z',
      depth: 'guided',
      current_step: 'complete',
      completed_steps: [],
      answers: {},
      domain_id: 'general-agent',
      capability_packs: ['development', 'content'],
    });

    expect(session.capability_packs).toEqual(['development', 'content']);
  });
});
