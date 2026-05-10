#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../..');
const skillRoot = join(repoRoot, 'skills/tastekit');

const productionDomainRubrics = [
  { domainId: 'development-agent', title: 'Development Agent Rubric' },
  { domainId: 'general-agent', title: 'General Agent Rubric' },
  { domainId: 'content-agent', title: 'Content Agent Rubric' },
  { domainId: 'research-agent', title: 'Research Agent Rubric' },
  { domainId: 'sales-agent', title: 'Sales Agent Rubric' },
  { domainId: 'support-agent', title: 'Support Agent Rubric' },
];

function pascalCaseDomain(domainId) {
  return domainId
    .split('-')
    .map(segment => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join('');
}

const rubricSources = [
  {
    title: 'Universal Rubric',
    sourcePath: 'packages/core/interview/universal-rubric.ts',
    exportName: 'UNIVERSAL_DIMENSIONS',
    outputPath: 'references/rubrics/universal.md',
    kind: 'dimensions',
  },
  ...productionDomainRubrics.map(domain => ({
    title: domain.title,
    sourcePath: `packages/core/domains/${domain.domainId}/rubric.ts`,
    exportName: `${pascalCaseDomain(domain.domainId)}Rubric`,
    outputPath: `references/rubrics/${domain.domainId}.md`,
    kind: 'rubric',
  })),
];

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  throw new Error(`Unsupported property name syntax: ${name.getText()}`);
}

function applyNamedMapper(mapperName, value) {
  if (mapperName !== 'withDefaultDimensionFields') {
    throw new Error(`Unsupported array mapper: ${mapperName}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Mapper ${mapperName} expected an object item`);
  }

  const hasQuickTier = value.depth_tiers?.includes('quick');
  const operatorOnly = value.depth_tiers?.length === 1 && value.depth_tiers[0] === 'operator';

  return {
    ...value,
    priority: value.priority ?? (hasQuickTier ? 'critical' : operatorOnly ? 'nice-to-have' : 'important'),
    question_budget: value.question_budget ?? (hasQuickTier ? { min: 1, max: 2 } : { min: 0, max: 1 }),
  };
}

function evaluateCallExpression(node) {
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'map' &&
    node.arguments.length === 1 &&
    ts.isIdentifier(node.arguments[0])
  ) {
    const value = evaluateNode(node.expression.expression);
    if (!Array.isArray(value)) {
      throw new Error(`Expected array before .map in ${node.getText()}`);
    }
    return value.map(item => applyNamedMapper(node.arguments[0].text, item));
  }

  throw new Error(`Unsupported call expression syntax: ${node.getText()}`);
}

function evaluateNode(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(element => evaluateNode(element));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map(property => {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`Unsupported object member syntax: ${property.getText()}`);
      }
      return [propertyNameText(property.name), evaluateNode(property.initializer)];
    }));
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    return evaluateNode(node.expression);
  }
  if (ts.isCallExpression(node)) {
    return evaluateCallExpression(node);
  }
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    const value = Number(node.operand.text);
    return node.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  throw new Error(`Unsupported initializer syntax: ${node.getText()}`);
}

function findExportInitializer(sourceFile, exportName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (declaration.name.text === exportName) {
        if (!declaration.initializer) {
          throw new Error(`Export ${exportName} has no initializer`);
        }
        return declaration.initializer;
      }
    }
  }
  throw new Error(`Could not find export ${exportName} in ${sourceFile.fileName}`);
}

function missingRubricSources() {
  return rubricSources.filter(source => !existsSync(join(repoRoot, source.sourcePath)));
}

function assertRubricSourcesExist() {
  const missing = missingRubricSources();
  if (missing.length === 0) return;

  throw new Error([
    'Missing rubric sources required for the six-domain skill bundle:',
    ...missing.map(source => `- ${source.sourcePath} -> skills/tastekit/${source.outputPath}`),
    'After Worker A adds these source rubrics, run `node scripts/skill-bundle/sync.mjs` to regenerate the skill references.',
  ].join('\n'));
}

function readRubricDimensions(source) {
  const absoluteSourcePath = join(repoRoot, source.sourcePath);
  const code = readFileSync(absoluteSourcePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    absoluteSourcePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const value = evaluateNode(findExportInitializer(sourceFile, source.exportName));

  if (source.kind === 'dimensions') {
    return value;
  }
  if (!value || !Array.isArray(value.dimensions)) {
    throw new Error(`${source.exportName} must contain a dimensions array`);
  }
  return value.dimensions;
}

function formatQuestionBudget(budget) {
  if (!budget) return 'unspecified';
  return `min ${budget.min}, max ${budget.max}`;
}

function formatCascade(cascade) {
  const condition = cascade.condition ? `; condition: ${cascade.condition}` : '';
  return `- ${cascade.dimension_id} (weight: ${cascade.weight}${condition})`;
}

export function renderRubricReference({ title, sourcePath, dimensions }) {
  const lines = [
    `# ${title}`,
    '',
    `Source: \`${sourcePath}\``,
    '',
    'Generated by `node scripts/skill-bundle/sync.mjs`. Do not edit by hand.',
    '',
    `Total dimensions: ${dimensions.length}`,
    '',
  ];

  for (const dimension of dimensions) {
    lines.push(
      `## ${dimension.id}: ${dimension.name}`,
      '',
      `- id: \`${dimension.id}\``,
      `- name: ${dimension.name}`,
      `- depth_tiers: ${dimension.depth_tiers.join(', ')}`,
      `- priority: ${dimension.priority}`,
      `- maps_to: ${dimension.maps_to.join(', ')}`,
      `- question_budget: ${formatQuestionBudget(dimension.question_budget)}`,
      `- description: ${dimension.description}`,
      '',
      '### exploration_hints',
      ...dimension.exploration_hints.map(hint => `- ${hint}`),
      '',
      '### coverage_criteria',
      ...dimension.coverage_criteria.map(criterion => `- ${criterion}`),
      '',
    );

    if (dimension.sub_areas?.length) {
      lines.push(
        '### sub_areas',
        ...dimension.sub_areas.map(subArea => `- ${subArea}`),
        '',
      );
    }

    if (dimension.cascade_to?.length) {
      lines.push(
        '### cascade_to',
        ...dimension.cascade_to.map(cascade => formatCascade(cascade)),
        '',
      );
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export async function buildGeneratedFiles() {
  assertRubricSourcesExist();

  const schemaPath = 'assets/schemas/constitution.schema.json';
  const files = [
    {
      relativePath: schemaPath,
      content: readFileSync(join(repoRoot, 'packages/core/schemas/json/constitution.schema.json'), 'utf-8'),
    },
  ];

  for (const source of rubricSources) {
    files.push({
      relativePath: source.outputPath,
      content: renderRubricReference({
        title: source.title,
        sourcePath: source.sourcePath,
        dimensions: readRubricDimensions(source),
      }),
    });
  }

  return files;
}

async function run({ check }) {
  if (process.argv.includes('--print-json')) {
    process.stdout.write(`${JSON.stringify(await buildGeneratedFiles(), null, 2)}\n`);
    return;
  }

  if (process.argv.includes('--render-json')) {
    const input = JSON.parse(readFileSync(0, 'utf-8'));
    process.stdout.write(renderRubricReference(input));
    return;
  }

  const files = await buildGeneratedFiles();
  const stale = [];

  for (const file of files) {
    const targetPath = join(skillRoot, file.relativePath);
    const current = existsSync(targetPath) ? readFileSync(targetPath, 'utf-8') : undefined;

    if (current === file.content) continue;
    stale.push(file.relativePath);

    if (!check) {
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, file.content);
    }
  }

  if (check && stale.length > 0) {
    console.error('Skill bundle generated files are out of sync:');
    for (const path of stale) {
      console.error(`- ${path}`);
    }
    console.error('Run `node scripts/skill-bundle/sync.mjs` to update them.');
    process.exitCode = 1;
    return;
  }

  if (check) {
    console.log('Skill bundle generated files are in sync.');
  } else {
    console.log(`Synced ${files.length} generated skill bundle files.`);
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await run({ check: process.argv.includes('--check') }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
