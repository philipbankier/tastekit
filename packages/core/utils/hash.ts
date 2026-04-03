import { createHash } from 'crypto';

/**
 * Hashing utilities for deterministic compilation and fingerprinting
 */

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashObject(obj: any): string {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return hashString(json);
}

export function shortHash(input: string, length: number = 8): string {
  return hashString(input).substring(0, length);
}
