import { describe, expect, it } from 'vitest';
import { resolveOnboardProviderConfig } from '../../src/commands/onboard.js';

describe('resolveOnboardProviderConfig', () => {
  it('returns configured provider config when no override is provided', () => {
    const resolved = resolveOnboardProviderConfig({
      provider: 'ollama',
      model: 'qwen2.5:7b',
      base_url: 'http://localhost:11434',
    });

    expect(resolved).toEqual({
      provider: 'ollama',
      model: 'qwen2.5:7b',
      base_url: 'http://localhost:11434',
    });
  });

  it('preserves model/base_url/api_key_env when override matches configured provider', () => {
    const resolved = resolveOnboardProviderConfig(
      {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        base_url: 'https://example.test/v1',
        api_key_env: 'OPENAI_API_KEY_ALT',
      },
      'openai',
    );

    expect(resolved).toEqual({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      base_url: 'https://example.test/v1',
      api_key_env: 'OPENAI_API_KEY_ALT',
    });
  });

  it('does not leak configured fields across provider overrides', () => {
    const resolved = resolveOnboardProviderConfig(
      {
        provider: 'ollama',
        model: 'llama3.1',
        base_url: 'http://localhost:11434',
      },
      'anthropic',
    );

    expect(resolved).toEqual({
      provider: 'anthropic',
    });
  });

  it('returns provider-only config when overriding without prior configuration', () => {
    const resolved = resolveOnboardProviderConfig(undefined, 'ollama');
    expect(resolved).toEqual({ provider: 'ollama' });
  });
});
