import type { STTProvider, TranscriptEvent } from './stt/provider.js';
import type { TTSProvider } from './tts/provider.js';
import { MicRecorder } from './audio/recorder.js';
import { AudioPlayer } from './audio/player.js';

export interface VoiceIOOptions {
  /** Show live transcription while user speaks */
  showTranscription?: boolean;
  /** Called with partial transcription updates */
  onPartial?: (text: string) => void;
  /** Called when the user's final transcription is ready */
  onFinalTranscript?: (text: string) => void;
  /** Print interviewer text to console alongside audio */
  printText?: boolean;
}

/**
 * Voice I/O orchestrator for TasteKit onboarding.
 *
 * Composes STT + TTS + mic recorder + audio player into the two
 * callbacks the Interviewer expects: getUserInput() and onInterviewerMessage().
 *
 * Drop-in replacement for the text-based inquirer callbacks.
 */
export class VoiceIO {
  private stt: STTProvider;
  private tts: TTSProvider;
  private recorder: MicRecorder;
  private player: AudioPlayer;
  private options: Required<VoiceIOOptions>;

  constructor(
    stt: STTProvider,
    tts: TTSProvider,
    recorder?: MicRecorder,
    player?: AudioPlayer,
    options?: VoiceIOOptions,
  ) {
    this.stt = stt;
    this.tts = tts;
    this.recorder = recorder ?? new MicRecorder();
    this.player = player ?? new AudioPlayer();
    this.options = {
      showTranscription: options?.showTranscription ?? true,
      onPartial: options?.onPartial ?? (() => {}),
      onFinalTranscript: options?.onFinalTranscript ?? (() => {}),
      printText: options?.printText ?? true,
    };
  }

  /**
   * Drop-in replacement for Interviewer's getUserInput callback.
   * Records from mic → runs STT → returns transcribed text.
   */
  async getUserInput(): Promise<string> {
    if (this.options.showTranscription) {
      process.stdout.write('\n  🎤 Listening... (speak now)\n');
    }

    // Start recording
    const audioStream = this.recorder.start();

    // Create a controlled audio iterator that we can stop
    let stopRecording = false;
    const controlledAudio = this.createControlledStream(audioStream, () => stopRecording);

    let finalText = '';

    // Run STT on the audio stream
    for await (const event of this.stt.transcribe(controlledAudio)) {
      if (event.type === 'partial') {
        if (this.options.showTranscription) {
          // Overwrite the current line with partial transcript
          process.stdout.write(`\r  📝 ${event.text}${''.padEnd(20)}`);
        }
        this.options.onPartial(event.text);
      } else if (event.type === 'final') {
        finalText = event.text;
        stopRecording = true;
        this.recorder.stop();

        if (this.options.showTranscription) {
          // Clear the partial and show final
          process.stdout.write(`\r  ✅ ${finalText}${''.padEnd(20)}\n`);
        }
        this.options.onFinalTranscript(finalText);
        break;
      }
    }

    // Ensure recorder is stopped
    this.recorder.stop();

    if (!finalText) {
      throw new Error('No speech detected');
    }

    return finalText;
  }

  /**
   * Drop-in replacement for Interviewer's onInterviewerMessage callback.
   * Prints text AND plays it as audio via TTS.
   */
  async onInterviewerMessage(message: string): Promise<void> {
    // Always print to console so user can read along
    if (this.options.printText) {
      process.stdout.write(`\n  🔊 ${message}\n`);
    }

    // Synthesize and play audio
    try {
      const audioChunks = await this.tts.synthesize(message);
      await this.player.playStream(audioChunks, { sampleRate: 22050 });
    } catch (err) {
      // TTS failure is non-fatal — text was already printed
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`  ⚠ TTS playback failed: ${msg}\n`);
    }
  }

  /** Clean up all resources. */
  async dispose(): Promise<void> {
    this.recorder.stop();
    this.player.stop();
    await this.stt.dispose?.();
    await this.tts.dispose?.();
  }

  /**
   * Wrap an async iterable so it stops yielding when a condition is met.
   * This lets us stop the mic recording when STT returns a final transcript.
   */
  private async *createControlledStream(
    source: AsyncIterable<Buffer>,
    shouldStop: () => boolean,
  ): AsyncIterable<Buffer> {
    for await (const chunk of source) {
      if (shouldStop()) break;
      yield chunk;
    }
  }
}
