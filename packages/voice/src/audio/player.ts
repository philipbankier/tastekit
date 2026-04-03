import { Writable } from 'stream';

/**
 * Audio player for TTS output.
 *
 * Supports two modes:
 * - Streaming: pipes raw PCM to `speaker` for low-latency playback
 * - File: plays a WAV/MP3 file via `play-sound`
 */
export class AudioPlayer {
  private activeSpeaker: Writable | null = null;

  /**
   * Play an audio stream (raw PCM) through the speaker.
   * Resolves when playback completes.
   */
  async playStream(
    chunks: AsyncIterable<Buffer>,
    options?: { sampleRate?: number; channels?: number; bitDepth?: number },
  ): Promise<void> {
    const SpeakerModule = await import('speaker');
    const Speaker = SpeakerModule.default ?? SpeakerModule;

    const speaker = new Speaker({
      sampleRate: options?.sampleRate ?? 22050,
      channels: options?.channels ?? 1,
      bitDepth: options?.bitDepth ?? 16,
    });

    this.activeSpeaker = speaker;

    return new Promise<void>((resolve, reject) => {
      speaker.on('close', resolve);
      speaker.on('error', reject);

      (async () => {
        try {
          for await (const chunk of chunks) {
            if (!speaker.writable) break;
            const canContinue = speaker.write(chunk);
            if (!canContinue) {
              await new Promise<void>((r) => speaker.once('drain', r));
            }
          }
          speaker.end();
        } catch (err) {
          speaker.destroy();
          reject(err);
        }
      })();
    });
  }

  /**
   * Play an audio file (WAV, MP3) through the system player.
   * Fallback for when streaming isn't available.
   */
  async playFile(filePath: string): Promise<void> {
    const playSound = await import('play-sound');
    const player = (playSound.default ?? playSound)({});

    return new Promise<void>((resolve, reject) => {
      player.play(filePath, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** Stop any active playback. */
  stop(): void {
    if (this.activeSpeaker) {
      this.activeSpeaker.destroy();
      this.activeSpeaker = null;
    }
  }
}
