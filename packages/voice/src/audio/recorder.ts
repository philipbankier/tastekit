import { Readable } from 'stream';
import type { Recording } from 'node-record-lpcm16';

/**
 * Microphone recorder producing raw PCM audio chunks.
 *
 * Wraps `node-record-lpcm16` (requires `sox` on macOS, `arecord` on Linux).
 * Output: 16-bit signed integer, 16kHz, mono.
 */
export class MicRecorder {
  private recording: Recording | null = null;
  private stream: Readable | null = null;

  readonly sampleRate: number;

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 16000;
  }

  /**
   * Start recording from the default microphone.
   * Returns an AsyncIterable of PCM audio buffers.
   */
  async *start(): AsyncIterable<Buffer> {
    // Dynamic import so the package is truly optional
    const record = await import('node-record-lpcm16');

    this.recording = record.record({
      sampleRate: this.sampleRate,
      channels: 1,
      audioType: 'raw',
      recorder: process.platform === 'darwin' ? 'sox' : 'arecord',
    });

    const stream = this.recording.stream();
    this.stream = stream;

    for await (const chunk of stream) {
      yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    }
  }

  /** Stop recording and release the microphone. */
  stop(): void {
    if (this.recording) {
      this.recording.stop();
      this.recording = null;
    }
    if (this.stream) {
      this.stream.destroy();
      this.stream = null;
    }
  }
}
