import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');
const onePagerPath = join(repoRoot, 'docs/demo/tastekit-system-one-pager.html');

function readOnePager() {
  assert.ok(
    existsSync(onePagerPath),
    'docs/demo/tastekit-system-one-pager.html should exist',
  );
  return readFileSync(onePagerPath, 'utf-8');
}

test('TasteKit system one-pager exists and is a standalone HTML document', () => {
  const html = readOnePager();

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<title>TasteKit System One-Pager<\/title>/);
  assert.doesNotMatch(html, /<script\b/i, 'one-pager should not need JavaScript');
  assert.doesNotMatch(
    html,
    /<(?:img|source|iframe|embed|object|video|audio|track)\b/i,
    'one-pager should not include load-bearing media or embeds',
  );
  assert.deepEqual(findNonFragmentSvgHrefs(html), [], 'one-pager should not load external SVG assets');
  assert.doesNotMatch(html, /<link\b/i, 'one-pager should not load external stylesheets');
  assert.doesNotMatch(html, /@import\b/i, 'one-pager should not import remote CSS');
  assert.deepEqual(findNonFragmentCssUrls(html), [], 'one-pager should not depend on external images/fonts');
});

test('standalone dependency helpers allow fragments and reject resource paths', () => {
  assert.deepEqual(findNonFragmentSvgHrefs('<svg><use href="#ok"></use><image href="icons.svg#bad"></image><use xlink:href=other.svg></use></svg>'), [
    'icons.svg#bad',
    'other.svg',
  ]);
  assert.deepEqual(findNonFragmentCssUrls('marker-end:url(#ok); clip-path: url("#clip"); background:url( diagram.png );'), [
    'diagram.png',
  ]);
});

test('TasteKit system one-pager covers the full approved system map', () => {
  const html = readOnePager();

  for (const expected of [
    'Human operating taste -&gt; portable agent runtime artifacts',
    'Core System Map',
    'Entry Points',
    'Depth Ladder',
    'Six-Domain Grid',
    'Artifact Stack',
    'Runtime Export Map',
    'Trust, Safety, And Privacy',
    'Maintenance Loop',
    'Evidence Wall',
    'Risks, Gaps, And Unknowns',
    'Reviewer Questions',
  ]) {
    assert.match(html, new RegExp(escapeRegExp(expected)), `missing section: ${expected}`);
  }
});

test('TasteKit system one-pager includes the core product surfaces', () => {
  const html = readOnePager();

  for (const expected of [
    'Native skill',
    'CLI',
    'Library packages',
    'Validator',
    'Quick',
    'Guided',
    'Full Taste Composition',
    'operator',
    'general-agent',
    'development-agent',
    'content-agent',
    'research-agent',
    'sales-agent',
    'support-agent',
    '.tastekit/session.json',
    '.tastekit/constitution.v1.json',
    'x-tastekit-composition',
    'x-tastekit-metacognition',
    'guardrails.v1.yaml',
    'memory.v1.yaml',
    'bindings.v1.json',
    'trust.v1.json',
    'skills/',
    'playbooks/',
    'traces/',
    'evals/',
    'drift/',
    'Claude Code',
    'OpenClaw',
    'Manus',
    'Autopilots',
    'AGENTS.md',
    'Agent File',
    'MCP-first',
    'no auto-enable',
    'trust pins',
    'managed regions',
    'Run -&gt; Trace -&gt; Eval -&gt; Drift Detect -&gt; Human Review -&gt; Update Taste',
  ]) {
    assert.match(html, new RegExp(escapeRegExp(expected)), `missing product surface: ${expected}`);
  }
});

test('TasteKit system one-pager uses visual structure, not only paragraphs', () => {
  const html = readOnePager();

  for (const expected of [
    '<svg',
    'class="flow-node',
    'class="entry-card',
    'class="depth-card',
    'class="domain-card',
    'class="artifact-stack',
    'class="runtime-spoke',
    'class="safety-card',
    'class="evidence-card',
    'class="risk-card',
  ]) {
    assert.match(html, new RegExp(escapeRegExp(expected)), `missing visual hook: ${expected}`);
  }
});

test('TasteKit system one-pager labels release evidence conservatively', () => {
  const html = readOnePager();

  for (const expected of [
    'pre-1.0 release readiness',
    'not published until release gates pass',
    'subscription demo evidence',
    'not official release evidence',
    'official release path',
    'GPT-5.5',
    'GLM-5.1',
    '4.78/5',
    'Deferred',
  ]) {
    assert.match(html, new RegExp(escapeRegExp(expected)), `missing evidence label: ${expected}`);
  }

  for (const forbidden of [
    'v1.1 is published',
    'v1.0 is stable',
    'official release evidence has passed',
    'clinically validated',
    'therapeutic',
    'diagnostic psychology',
    'drift is automatically applied',
    'guaranteed secure',
  ]) {
    assert.doesNotMatch(html, new RegExp(escapeRegExp(forbidden), 'i'), `forbidden overclaim: ${forbidden}`);
  }
});

function findNonFragmentSvgHrefs(html) {
  const matches = [];
  const tagPattern = /<(?:use|image)\b[^>]*>/gi;
  for (const tag of html.matchAll(tagPattern)) {
    const hrefMatch = tag[0].match(/(?:href|xlink:href)\s*=\s*(?:['"]([^'"]*)['"]|([^\s>]+))/i);
    if (!hrefMatch) continue;
    const value = (hrefMatch[1] ?? hrefMatch[2] ?? '').trim();
    if (value.length > 0 && !value.startsWith('#')) {
      matches.push(value);
    }
  }
  return matches;
}

function findNonFragmentCssUrls(html) {
  const matches = [];
  const urlPattern = /url\(\s*(?:['"]([^'"]*)['"]|([^)]*?))\s*\)/gi;
  for (const match of html.matchAll(urlPattern)) {
    const value = (match[1] ?? match[2] ?? '').trim();
    if (value.length > 0 && !value.startsWith('#')) {
      matches.push(value);
    }
  }
  return matches;
}

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
