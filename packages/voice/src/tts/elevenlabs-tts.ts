import type { TTSProvider } from './provider.js';

export interface ElevenLabsTTSOptions {
  apiKey: string;
  /** ElevenLabs voice ID (default: Rachel - 21m00Tcm4TlvDq8ikWAM) */
  voiceId?: string;
  /** Model ID (default: eleven_multilingual_v2) */
  modelId?: string;
  /** Base URL (default: https://api.elevenlabs.io) */
  baseUrl?: string;
}

/**
 * ElevenLabs streaming text-to-speech provider.
 *
 * Uses the REST streaming endpoint to convert text to audio.
 * Returns raw PCM audio chunks for streaming playback.
 */
export class ElevenLabsTTS implements TTSProvider {
  readonly name = 'elevenlabs-tts';
  private options: Required<Pick<ElevenLabsTTSOptions, 'apiKey' | 'voiceId' | 'modelId' | 'baseUrl'>>;

  constructor(options: ElevenLabsTTSOptions) {
    this.options = {
      apiKey: options.apiKey,
      voiceId: options.voiceId ?? '21m00Tcm4TlvDq8ikWAM',
      modelId: options.modelId ?? 'eleven_multilingual_v2',
      baseUrl: options.baseUrl ?? 'https://api.elevenlabs.io',
    };
  }

  async synthesize(text: string): Promise<AsyncIterable<Buffer>> {
    const { apiKey, voiceId, modelId, baseUrl } = this.options;

    // output_format is a query parameter, not a body field
    const url = `${baseUrl}/v1/text-to-speech/${voiceId}/stream?output_format=pcm_22050`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs TTS error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('ElevenLabs TTS returned no body');
    }

    // Convert the ReadableStream to AsyncIterable<Buffer>
    const reader = response.body.getReader();

    async function* streamToAsyncIterable(): AsyncIterable<Buffer> {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield Buffer.from(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    return streamToAsyncIterable();
  }

  async dispose(): Promise<void> {
    // Stateless — nothing to clean up
  }
}
