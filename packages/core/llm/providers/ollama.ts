import { LLMProvider, LLMMessage, LLMCompletionOptions, LLMCompletionResult } from '../provider.js';

/**
 * Ollama local model provider.
 * Connects to Ollama HTTP API at localhost (default port 11434).
 * Uses native fetch — no SDK dependency.
 */
export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private model: string;
  private baseUrl: string;

  constructor(options?: { model?: string; baseUrl?: string }) {
    this.model = options?.model ?? 'llama3.1';
    this.baseUrl = options?.baseUrl ?? 'http://localhost:11434';
  }

  async complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    };

    if (options?.temperature !== undefined || options?.stop) {
      body.options = {
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options?.stop ? { stop: options.stop } : {}),
      };
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    const data = await response.json() as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      content: data.message?.content ?? '',
      usage: {
        input_tokens: data.prompt_eval_count,
        output_tokens: data.eval_count,
      },
    };
  }
}
