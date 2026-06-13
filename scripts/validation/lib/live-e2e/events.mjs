import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { redactSecrets } from './chat-client.mjs';

export function createEventWriter(path, { secrets = [] } = {}) {
  mkdirSync(dirname(path), { recursive: true });

  function write(type, data = {}) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      data: redactSecrets(data, secrets),
    };
    appendFileSync(path, `${JSON.stringify(event)}\n`, 'utf-8');
    return event;
  }

  return {
    path,
    write,
    writeAssertion(name, status, severity, evidence = {}) {
      return write('assertion', { name, status, severity, ...evidence });
    },
    writeFailure(severity, category, message, evidence = {}) {
      return write('failure', { severity, category, message, ...evidence });
    },
  };
}

export function readJsonl(path) {
  const content = readFileSync(path, 'utf-8').trim();
  return content ? content.split('\n').map(line => JSON.parse(line)) : [];
}

export function summarizeTranscriptForJudge(path, { maxChars = 24000, maxEvents = 80 } = {}) {
  if (!path || !existsSync(path)) return '';
  const lines = [];
  for (const event of readJsonl(path)) {
    if (lines.length >= maxEvents) break;
    if (event.type === 'interviewer_message') {
      lines.push(formatTranscriptLine('Interviewer', event.data?.turn, event.data?.message));
    } else if (event.type === 'simulated_user_message') {
      lines.push(formatTranscriptLine('Simulated user', event.data?.turn, event.data?.reply));
    } else if (event.type === 'state_update') {
      const action = event.data?.policy_action ? ` policy=${event.data.policy_action}` : '';
      const coverage = event.data?.coverage_summary ? ` coverage=${JSON.stringify(event.data.coverage_summary)}` : '';
      lines.push(`[turn ${event.data?.turn ?? '?'}] State:${action}${coverage}`);
    }
  }
  const text = lines.filter(Boolean).join('\n\n');
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Transcript excerpt truncated at ${maxChars} characters.]`;
}

function formatTranscriptLine(role, turn, content) {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) return '';
  return `[turn ${turn ?? '?'}] ${role}: ${text}`;
}
