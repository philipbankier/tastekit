import { z } from 'zod';

/**
 * LLM Provider Interface
 *
 * Minimal abstraction over LLM APIs. Supports multi-turn conversation.
 * No external dependencies — implementations use native fetch.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  /** Maximum tokens to generate. Default: provider-dependent. */
  maxTokens?: number;
  /** Temperature. Default: 0.7 for interviews. */
  temperature?: number;
  /** Stop sequences. */
  stop?: string[];
}

export interface LLMCompletionResult {
  content: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Any LLM that can take messages and return text.
 */
export interface LLMProvider {
  readonly name: string;
  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
}

/**
 * Configuration for resolving an LLM provider.
 * Stored in tastekit.yaml or passed via CLI flags.
 */
export const LLMProviderConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'ollama', 'custom']),
  model: z.string().optional(),
  api_key_env: z.string().optional().describe('Environment variable name for API key'),
  base_url: z.string().optional().describe('Base URL for API (Ollama, custom)'),
});

export type LLMProviderConfig = z.infer<typeof LLMProviderConfigSchema>;

/**
 * Adapt the full LLMProvider to the simpler single-prompt interface
 * used by the eval judge (LLMJudgeProvider).
 */
export function asJudgeProvider(provider: LLMProvider): { complete(prompt: string): Promise<string> } {
  return {
    async complete(prompt: string): Promise<string> {
      const result = await provider.complete([{ role: 'user', content: prompt }]);
      return result.content;
    },
  };
}
