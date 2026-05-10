/**
 * Taste Composition Block - summarizes rich TasteKit composition extensions.
 */
import type { GeneratorBlock, GeneratorContext } from '../types.js';

const COMPOSITION_EXTENSION_KEY = 'x-tastekit-composition';
const MAX_DOMAIN_ITEMS = 8;
const MAX_DIMENSION_ITEMS = 8;
const MAX_FACTS = 2;

interface CompositionDimension {
  dimension_id?: unknown;
  status?: unknown;
  summary?: unknown;
  facts?: unknown;
}

interface CompositionExtension {
  schema_version?: unknown;
  mode?: unknown;
  domain_specific?: unknown;
  dimensions?: unknown;
}

export const tasteCompositionBlock: GeneratorBlock = (ctx) => {
  const composition = getComposition(ctx);
  if (!composition) return null;

  const lines: string[] = ['## Taste Composition', ''];
  const mode = modeLabel(composition.mode);
  if (mode) {
    lines.push(`Depth: ${mode}`);
    lines.push('');
  }

  const domainSpecific = domainSpecificLines(composition.domain_specific);
  if (domainSpecific.length > 0) {
    lines.push('Domain-specific taste:');
    lines.push(...domainSpecific);
    lines.push('');
  }

  const dimensionSummaries = dimensionLines(composition.dimensions);
  if (dimensionSummaries.length > 0) {
    lines.push('Dimension coverage:');
    lines.push(...dimensionSummaries);
    lines.push('');
  }

  lines.push('Full composition detail lives in `.tastekit/constitution.v1.json`.');
  return lines.join('\n');
};

function getComposition(ctx: GeneratorContext): CompositionExtension | null {
  const value = ctx.constitution?.extensions?.[COMPOSITION_EXTENSION_KEY];
  if (!isRecord(value)) return null;
  if (value.schema_version !== 'tastekit.composition.v1') return null;
  return value;
}

function modeLabel(mode: unknown): string | null {
  switch (mode) {
    case 'quick':
      return 'Quick';
    case 'guided':
      return 'Guided';
    case 'operator':
    case 'full_taste_composition':
      return 'Full Taste Composition';
    default:
      return null;
  }
}

function domainSpecificLines(value: unknown): string[] {
  if (!isRecord(value)) return [];

  return Object.entries(value)
    .slice(0, MAX_DOMAIN_ITEMS)
    .flatMap(([key, child]) => {
      const summary = summarizeValue(child);
      return summary ? [`- **${key}**: ${summary}`] : [];
    });
}

function dimensionLines(value: unknown): string[] {
  if (!isRecord(value)) return [];

  return Object.entries(value)
    .slice(0, MAX_DIMENSION_ITEMS)
    .flatMap(([key, child]) => {
      if (!isRecord(child)) return [];
      const dimension = child as CompositionDimension;
      const label = typeof dimension.dimension_id === 'string' ? dimension.dimension_id : key;
      const status = typeof dimension.status === 'string' ? ` (${dimension.status})` : '';
      const pieces: string[] = [];

      if (typeof dimension.summary === 'string' && dimension.summary.trim()) {
        pieces.push(dimension.summary.trim());
      }

      if (Array.isArray(dimension.facts)) {
        const facts = dimension.facts
          .filter((fact): fact is string => typeof fact === 'string' && fact.trim().length > 0)
          .slice(0, MAX_FACTS);
        if (facts.length > 0) {
          pieces.push(`Facts: ${facts.join('; ')}`);
        }
      }

      return pieces.length > 0 ? [`- **${label}**${status}: ${pieces.join(' ')}`] : [];
    });
}

function summarizeValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const items = value
      .map(item => summarizeValue(item))
      .filter((item): item is string => !!item)
      .slice(0, 3);
    return items.length > 0 ? items.join('; ') : null;
  }
  if (isRecord(value)) {
    const pieces = Object.entries(value)
      .filter(([key]) => !shouldSuppressKey(key))
      .map(([key, child]) => {
        const summary = summarizeValue(child);
        return summary ? `${key}: ${summary}` : null;
      })
      .filter((item): item is string => !!item)
      .slice(0, 3);
    return pieces.length > 0 ? pieces.join('; ') : null;
  }
  return null;
}

function shouldSuppressKey(key: string): boolean {
  return /raw|transcript|source/i.test(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
