import WebSocket from 'ws';
import type { STTProvider, TranscriptEvent } from './provider.js';

export interface ElevenLabsSTTOptions {
  apiKey: string;
  language?: string;
  /** VAD silence threshold in seconds (default 1.5) */
  vadSilenceThreshold?: number;
  /** Base WebSocket URL (default: wss://api.elevenlabs.io) */
  baseUrl?: string;
  sampleRate?: number;
}

/**
 * ElevenLabs Scribe v2 realtime speech-to-text provider.
 *
 * Opens a WebSocket to the ElevenLabs realtime STT endpoint.
 * Sends base64-encoded PCM audio chunks and yields transcript events.
 * Built-in VAD commits transcription when the user stops speaking.
 */
export class ElevenLabsSTT implements STTProvider {
  readonly name = 'elevenlabs-stt';
  private options: Required<Pick<ElevenLabsSTTOptions, 'apiKey' | 'language' | 'vadSilenceThreshold' | 'baseUrl' | 'sampleRate'>>;

  constructor(options: ElevenLabsSTTOptions) {
    this.options = {
      apiKey: options.apiKey,
      language: options.language ?? 'en',
      vadSilenceThreshold: options.vadSilenceThreshold ?? 1.5,
      baseUrl: options.baseUrl ?? 'wss://api.elevenlabs.io',
      sampleRate: options.sampleRate ?? 16000,
    };
  }

  async *transcribe(audio: AsyncIterable<Buffer>): AsyncIterable<TranscriptEvent> {
    const { apiKey, language, vadSilenceThreshold, baseUrl, sampleRate } = this.options;

    const url = `${baseUrl}/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=${language}&audio_format=pcm_${sampleRate}`;

    const ws = new WebSocket(url, {
      headers: { 'xi-api-key': apiKey },
    });

    // Queue for transcript events received from the server
    const eventQueue: TranscriptEvent[] = [];
    let resolveWaiting: (() => void) | null = null;
    let done = false;
    let error: Error | null = null;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.message_type === 'partial_transcript' && msg.text) {
          eventQueue.push({ type: 'partial', text: msg.text });
        } else if (msg.message_type === 'committed_transcript' && msg.text) {
          eventQueue.push({ type: 'final', text: msg.text });
        } else if (msg.message_type === 'error' || msg.message_type === 'auth_error') {
          error = new Error(`ElevenLabs STT error: ${msg.message ?? msg.error ?? 'unknown'}`);
        }

        if (resolveWaiting) {
          resolveWaiting();
          resolveWaiting = null;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('error', (err) => {
      error = err instanceof Error ? err : new Error(String(err));
      if (resolveWaiting) {
        resolveWaiting();
        resolveWaiting = null;
      }
    });

    ws.on('close', () => {
      done = true;
      if (resolveWaiting) {
        resolveWaiting();
        resolveWaiting = null;
      }
    });

    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    // Start sending audio in the background
    const sendAudio = (async () => {
      try {
        let isFirst = true;
        for await (const chunk of audio) {
          if (ws.readyState !== WebSocket.OPEN) break;

          const message: Record<string, unknown> = {
            message_type: 'input_audio_chunk',
            audio_base_64: chunk.toString('base64'),
            sample_rate: sampleRate,
            commit: false,
          };

          // Only send previous_text on the first chunk
          if (isFirst) {
            message.previous_text = '';
            isFirst = false;
          }

          ws.send(JSON.stringify(message));
        }

        // Send a final commit to flush any remaining audio
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: '',
            sample_rate: sampleRate,
            commit: true,
          }));
        }
      } catch {
        // Audio stream ended or WebSocket closed
      }
    })();

    // Yield transcript events as they arrive
    try {
      while (!done || eventQueue.length > 0) {
        if (error) throw error;

        if (eventQueue.length > 0) {
          yield eventQueue.shift()!;

          // If we got a final transcript, we're done with this utterance
          if (eventQueue.length === 0) {
            const lastEvent = eventQueue[eventQueue.length];
            // Check if the last yielded event was final
            // Actually, let's check: we already yielded it above, so we need
            // to track differently. Let's just continue and let the caller
            // decide when to stop.
          }
        } else if (!done) {
          await new Promise<void>((resolve) => {
            resolveWaiting = resolve;
          });
        }
      }
    } finally {
      await sendAudio;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  }

  async dispose(): Promise<void> {
    // No persistent state to clean up — each transcribe() call manages its own WebSocket
  }
}
