#!/usr/bin/env node
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import {
  createDefaultAbDemoPlan,
  renderOnePagerHtml,
} from '../../packages/core/dist/demo/index.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../..');
const outputPath = resolve(repoRoot, process.argv[2] ?? 'docs/demo/tastekit-ab-one-pager.html');

const html = renderOnePagerHtml({
  plan: createDefaultAbDemoPlan(),
  generated_at: new Date().toISOString(),
  summary: [
    { track_id: 'dev', baseline: 44, tastekit: 86 },
    { track_id: 'content', baseline: 51, tastekit: 88 },
    { track_id: 'general', baseline: 48, tastekit: 82 },
  ],
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf-8');
console.log(`Wrote ${outputPath}`);
