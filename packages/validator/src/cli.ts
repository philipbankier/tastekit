#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { validateConstitutionArtifact } from './index.js';

function usage(): string {
  return [
    'Usage: tastekit-validator <constitution.v1.json> [--json]',
    '',
    'Validates a TasteKit constitution artifact with JSON Schema, Zod, and deterministic semantic checks.',
  ].join('\n');
}

function main(argv: string[]): number {
  const json = argv.includes('--json');
  const file = argv.find(arg => arg !== '--json' && !arg.startsWith('-'));

  if (!file || argv.includes('--help') || argv.includes('-h')) {
    const output = usage();
    if (json) {
      console.log(JSON.stringify({ ok: false, usage: output }, null, 2));
      return file ? 0 : 1;
    }
    console.log(output);
    return file ? 0 : 1;
  }

  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf-8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) {
      console.log(JSON.stringify({
        ok: false,
        issues: [{ code: 'read_or_parse', message }],
      }, null, 2));
    } else {
      console.error(`TasteKit validation failed: ${message}`);
    }
    return 1;
  }

  const result = validateConstitutionArtifact(data);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log('TasteKit constitution is valid.');
  } else {
    console.error('TasteKit constitution is invalid:');
    for (const issue of result.issues) {
      const path = issue.path ? `${issue.path}: ` : '';
      console.error(`- [${issue.code}] ${path}${issue.message}`);
    }
  }

  return result.ok ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
