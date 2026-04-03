import { SessionState } from '../schemas/workspace.js';
import { readFileSync, writeFileSync } from 'fs';

/**
 * Session state management
 */

export function loadSession(path: string): SessionState {
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

export function saveSession(path: string, session: SessionState): void {
  session.last_updated_at = new Date().toISOString();
  writeFileSync(path, JSON.stringify(session, null, 2));
}

export function createSession(depth: 'quick' | 'guided' | 'operator'): SessionState {
  return {
    session_id: crypto.randomUUID(),
    started_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    depth,
    current_step: 'welcome',
    completed_steps: [],
    answers: {},
  };
}

export function isSessionComplete(session: SessionState): boolean {
  // New LLM interview flow
  if (session.interview) {
    return session.interview.is_complete;
  }
  // Legacy hardcoded flow (backward compat)
  const requiredSteps = ['welcome', 'goals', 'tone', 'tradeoffs'];
  return requiredSteps.every(step => session.completed_steps.includes(step));
}
