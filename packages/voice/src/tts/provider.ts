/**
 * Text-to-Speech Provider Interface
 *
 * Converts text into an audio stream for playback.
 * Implementations: ElevenLabs, Piper
 */

export interface TTSProvider {
  readonly name: string;
  /**
   * Synthesize text into an audio stream.
   * @returns AsyncIterable of PCM or MP3 audio chunks
   */
  synthesize(text: string): Promise<AsyncIterable<Buffer>>;
  /** Clean up resources */
  dispose?(): Promise<void>;
}
