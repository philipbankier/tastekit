export const TASTEKIT_MANAGED_REGION_BEGIN = '<!-- BEGIN TASTEKIT MANAGED REGION -->';
export const TASTEKIT_MANAGED_REGION_END = '<!-- END TASTEKIT MANAGED REGION -->';

function regionPattern(): RegExp {
  return new RegExp(
    `${escapeRegExp(TASTEKIT_MANAGED_REGION_BEGIN)}\\n?([\\s\\S]*?)\\n?${escapeRegExp(TASTEKIT_MANAGED_REGION_END)}`,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function trimOuterBlankLines(content: string): string {
  return content.replace(/^\n+|\n+$/g, '');
}

export function renderManagedRegion(content: string): string {
  return [
    TASTEKIT_MANAGED_REGION_BEGIN,
    '',
    trimOuterBlankLines(content),
    '',
    TASTEKIT_MANAGED_REGION_END,
    '',
  ].join('\n');
}

export function extractManagedRegion(content: string): string | null {
  const match = content.match(regionPattern());
  return match ? trimOuterBlankLines(match[1]) : null;
}

export function mergeManagedRegion(existing: string | null | undefined, generated: string): string {
  if (!existing || existing.trim().length === 0) {
    return generated;
  }

  const replacement = generated.includes(TASTEKIT_MANAGED_REGION_BEGIN)
    ? generated.trimEnd()
    : renderManagedRegion(generated).trimEnd();
  const pattern = regionPattern();

  if (pattern.test(existing)) {
    return `${existing.replace(pattern, replacement).trimEnd()}\n`;
  }

  return [
    existing.trimEnd(),
    '',
    replacement,
    '',
  ].join('\n');
}
