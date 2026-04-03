import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoDetectProvider, resolveProvider } from '../resolve.js';

const ORIGINAL_ENV = { ...process.env };

describe('resolveProvider', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it('throws when anthropic key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(resolveProvider({ provider: 'anthropic' })).rejects.toThrow(
      'Missing environment variable: ANTHROPIC_API_KEY',
    );
  });

  it('resolves anthropic provider when key exists', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const provider = await resolveProvider({ provider: 'anthropic', model: 'claude-test' });
    expect(provider.name).toBe('anthropic');
  });

  it('throws when openai key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(resolveProvider({ provider: 'openai' })).rejects.toThrow(
      'Missing environment variable: OPENAI_API_KEY',
    );
  });

  it('resolves ollama provider with explicit model', async () => {
    const provider = await resolveProvider({ provider: 'ollama', model: 'llama3.2' });
    expect(provider.name).toBe('ollama');
  });
});

describe('autoDetectProvider', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it('prefers anthropic key over others', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic';
    process.env.OPENAI_API_KEY = 'openai';

    const config = await autoDetectProvider();
    expect(config.provider).toBe('anthropic');
  });

  it('falls back to openai when anthropic key absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = 'openai';

    const config = await autoDetectProvider();
    expect(config.provider).toBe('openai');
  });

  it('detects ollama when local endpoint responds', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const config = await autoDetectProvider();

    expect(config.provider).toBe('ollama');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('throws when no provider is available', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const fetchMock = vi.fn().mockRejectedValue(new Error('connection refused'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(autoDetectProvider()).rejects.toThrow('No LLM provider detected');
  });
});
