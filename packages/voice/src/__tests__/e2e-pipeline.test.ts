import { describe, it, expect, vi } from 'vitest';
import { join } from 'path';
import { VoiceIO } from '../voice-io.js';
import { WhisperSTT } from '../stt/whisper-stt.js';
import { PiperTTS } from '../tts/piper-tts.js';
import { MicRecorder } from '../audio/recorder.js';
import { AudioPlayer } from '../audio/player.js';

const MOCK_WHISPER = join(import.meta.dirname, 'fixtures', 'mock-whisper.sh');
const MOCK_PIPER = join(import.meta.dirname, 'fixtures', 'mock-piper.sh');

/**
 * BufferRecorder: yields pre-generated PCM data instead of using the mic.
 * Simulates a user speaking for a short duration.
 */
class BufferRecorder extends MicRecorder {
  private pcmData: Buffer;
  private stopped = false;

  constructor(pcmData?: Buffer) {
    super();
    // 0.5s of silence at 16kHz, 16-bit mono
    this.pcmData = pcmData ?? Buffer.alloc(16000);
  }

  async *start(): AsyncIterable<Buffer> {
    this.stopped = false;
    const chunkSize = 3200; // 100ms chunks
    for (let i = 0; i < this.pcmData.length; i += chunkSize) {
      if (this.stopped) break;
      yield this.pcmData.subarray(i, Math.min(i + chunkSize, this.pcmData.length));
    }
  }

  stop(): void {
    this.stopped = true;
  }
}

/**
 * MockPlayer: captures audio data instead of playing it through speakers.
 */
class MockPlayer extends AudioPlayer {
  public capturedChunks: Buffer[] = [];

  async playStream(chunks: AsyncIterable<Buffer>): Promise<void> {
    for await (const chunk of chunks) {
      this.capturedChunks.push(chunk);
    }
  }

  stop(): void {
    // no-op
  }
}

describe('Voice E2E Pipeline', () => {
  it('full flow: recorder → WhisperSTT → VoiceIO.getUserInput → text', async () => {
    const stt = new WhisperSTT({ binaryPath: MOCK_WHISPER });
    const tts = new PiperTTS({ binaryPath: MOCK_PIPER });
    const recorder = new BufferRecorder();
    const player = new MockPlayer();

    const voiceIO = new VoiceIO(stt, tts, recorder, player, {
      showTranscription: false,
      printText: false,
    });

    // getUserInput: recorder → STT → text
    const transcript = await voiceIO.getUserInput();
    expect(transcript).toBe('Hello I am testing the voice onboarding system');

    await voiceIO.dispose();
  });

  it('full flow: text → PiperTTS → VoiceIO.onInterviewerMessage → audio', async () => {
    const stt = new WhisperSTT({ binaryPath: MOCK_WHISPER });
    const tts = new PiperTTS({ binaryPath: MOCK_PIPER });
    const recorder = new BufferRecorder();
    const player = new MockPlayer();

    const voiceIO = new VoiceIO(stt, tts, recorder, player, {
      showTranscription: false,
      printText: false,
    });

    // onInterviewerMessage: text → TTS → player
    await voiceIO.onInterviewerMessage('Welcome to the interview!');

    // Player should have received audio data
    expect(player.capturedChunks.length).toBeGreaterThan(0);
    const totalAudio = Buffer.concat(player.capturedChunks);
    expect(totalAudio.length).toBeGreaterThan(0);

    await voiceIO.dispose();
  });

  it('full round-trip: getUserInput → onInterviewerMessage', async () => {
    const stt = new WhisperSTT({ binaryPath: MOCK_WHISPER });
    const tts = new PiperTTS({ binaryPath: MOCK_PIPER });
    const recorder = new BufferRecorder();
    const player = new MockPlayer();

    const partials: string[] = [];
    const finals: string[] = [];

    const voiceIO = new VoiceIO(stt, tts, recorder, player, {
      showTranscription: false,
      printText: false,
      onPartial: (text) => partials.push(text),
      onFinalTranscript: (text) => finals.push(text),
    });

    // Simulate one interview turn:
    // 1. User speaks (recorder → STT)
    const userAnswer = await voiceIO.getUserInput();
    expect(userAnswer).toBeTruthy();
    expect(finals).toHaveLength(1);

    // 2. Interviewer responds (TTS → player)
    await voiceIO.onInterviewerMessage(`You said: ${userAnswer}`);
    expect(player.capturedChunks.length).toBeGreaterThan(0);

    await voiceIO.dispose();
  });

  it('getUserInput throws on empty audio', async () => {
    const stt = new WhisperSTT({ binaryPath: MOCK_WHISPER });
    const tts = new PiperTTS({ binaryPath: MOCK_PIPER });
    // Empty recorder — yields zero bytes
    const recorder = new BufferRecorder(Buffer.alloc(0));
    const player = new MockPlayer();

    const voiceIO = new VoiceIO(stt, tts, recorder, player, {
      showTranscription: false,
      printText: false,
    });

    await expect(voiceIO.getUserInput()).rejects.toThrow('No speech detected');

    await voiceIO.dispose();
  });

  it('TTS failure does not break the pipeline', async () => {
    const stt = new WhisperSTT({ binaryPath: MOCK_WHISPER });
    // TTS with a binary that doesn't exist — will fail
    const tts = new PiperTTS({ binaryPath: '/nonexistent/piper' });
    const recorder = new BufferRecorder();
    const player = new MockPlayer();

    const voiceIO = new VoiceIO(stt, tts, recorder, player, {
      showTranscription: false,
      printText: false,
    });

    // STT should still work
    const transcript = await voiceIO.getUserInput();
    expect(transcript).toBeTruthy();

    // TTS failure should not throw (non-fatal)
    await expect(
      voiceIO.onInterviewerMessage('This will fail TTS but should not throw'),
    ).resolves.toBeUndefined();

    await voiceIO.dispose();
  });

  it('resolves voice providers from config with local settings', async () => {
    // Test the resolver with local config
    const { resolveVoiceProviders } = await import('../resolve.js');

    const { stt, tts } = await resolveVoiceProviders({
      stt: { provider: 'whisper', whisper_binary_path: MOCK_WHISPER },
      tts: { provider: 'piper', piper_binary_path: MOCK_PIPER },
    });

    expect(stt.name).toBe('whisper-stt');
    expect(tts.name).toBe('piper-tts');

    // Verify they work
    async function* audio(): AsyncIterable<Buffer> {
      yield Buffer.alloc(3200);
    }

    const events = [];
    for await (const event of stt.transcribe(audio())) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].text).toContain('Hello');

    const audioChunks = [];
    for await (const chunk of await tts.synthesize('Test')) {
      audioChunks.push(chunk);
    }
    expect(audioChunks.length).toBeGreaterThan(0);
  });

  it('createVoiceIO wires everything together from config', async () => {
    const { createVoiceIO } = await import('../resolve.js');

    const voiceIO = await createVoiceIO({
      stt: { provider: 'whisper', whisper_binary_path: MOCK_WHISPER },
      tts: { provider: 'piper', piper_binary_path: MOCK_PIPER },
    }, { showTranscription: false, printText: false });

    // Can't test getUserInput without a mock recorder in createVoiceIO,
    // but we can verify the object was created correctly
    expect(voiceIO).toBeDefined();
    expect(voiceIO.getUserInput).toBeInstanceOf(Function);
    expect(voiceIO.onInterviewerMessage).toBeInstanceOf(Function);
    expect(voiceIO.dispose).toBeInstanceOf(Function);

    await voiceIO.dispose();
  });
});
