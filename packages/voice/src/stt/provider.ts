/**
 * Speech-to-Text Provider Interface
 *
 * Consumes an audio stream and yields transcription events.
 * Implementations: ElevenLabs Scribe v2, Whisper.cpp
 */

export interface TranscriptEvent {
  /** 'partial' = interim result, 'final' = committed transcription */
  type: 'partial' | 'final';
  /** Transcribed text */
  text: string;
  /** Confidence score 0-1, if available */
  confidence?: number;
}

export interface STTProvider {
  readonly name: string;
  /**
   * Transcribe an audio stream into text events.
   * @param audio PCM audio chunks (16-bit, 16kHz mono)
   */
  transcribe(audio: AsyncIterable<Buffer>): AsyncIterable<TranscriptEvent>;
  /** Clean up resources (close WebSocket, etc.) */
  dispose?(): Promise<void>;
}
