import YAML from 'yaml';

/**
 * YAML utilities with canonical formatting for deterministic output
 */

export function stringifyYAML(obj: any): string {
  return YAML.stringify(obj, {
    sortMapEntries: true,
    lineWidth: 0,
  });
}

export function parseYAML<T = any>(content: string): T {
  return YAML.parse(content);
}
