import { describe, expect, it } from 'vitest';
import {
  TASTEKIT_MANAGED_REGION_BEGIN,
  TASTEKIT_MANAGED_REGION_END,
  extractManagedRegion,
  mergeManagedRegion,
  renderManagedRegion,
} from '../managed-region.js';

describe('managed region helpers', () => {
  it('wraps generated content in TasteKit markers', () => {
    const result = renderManagedRegion('# Generated\n');

    expect(result).toContain(TASTEKIT_MANAGED_REGION_BEGIN);
    expect(result).toContain('# Generated');
    expect(result).toContain(TASTEKIT_MANAGED_REGION_END);
  });

  it('replaces only the existing managed region', () => {
    const existing = [
      '# Manual Header',
      '',
      renderManagedRegion('old generated'),
      '',
      'manual footer',
    ].join('\n');

    const merged = mergeManagedRegion(existing, renderManagedRegion('new generated'));

    expect(merged).toContain('# Manual Header');
    expect(merged).toContain('manual footer');
    expect(merged).toContain('new generated');
    expect(merged).not.toContain('old generated');
  });

  it('appends a generated region when the existing file has no markers', () => {
    const merged = mergeManagedRegion('# Manual file\n\nKeep this.', renderManagedRegion('generated'));

    expect(merged).toContain('# Manual file');
    expect(merged).toContain('Keep this.');
    expect(merged).toContain('generated');
    expect(merged.indexOf('Keep this.')).toBeLessThan(merged.indexOf('generated'));
  });

  it('preserves malformed existing content and appends a fresh region', () => {
    const existing = `# Manual\n${TASTEKIT_MANAGED_REGION_BEGIN}\nold without end`;

    const merged = mergeManagedRegion(existing, renderManagedRegion('generated'));

    expect(merged).toContain('old without end');
    expect(merged).toContain('generated');
    expect((merged.match(new RegExp(TASTEKIT_MANAGED_REGION_BEGIN, 'g')) ?? [])).toHaveLength(2);
  });

  it('extracts the managed region content', () => {
    const region = renderManagedRegion('generated body');

    expect(extractManagedRegion(region)).toBe('generated body');
  });
});
