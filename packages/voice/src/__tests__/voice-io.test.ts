import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceIO } from '../voice-io.js';
import type { STTProvider, TranscriptEvent } from '../stt/provider.js';
import type { TTSProvider } from '../tts/provider.js';
import { MicRecorder } from '../audio/recorder.js';
import { AudioPlayer } from '../audio/player.js';

// Mock STT provider that returns scripted transcripts
function createMockSTT(events: TranscriptEvent[]): STTProvider {
  return {
    name: 'mock-stt',
    async *transcribe(): AsyncIterable<TranscriptEvent> {
      for (const event of events) {
        yield event;
      }
    },
  };
}

// Mock TTS provider that yields empty audio
function createMockTTS(): TTSProvider {
  return {
    name: 'mock-tts',
    async synthesize(): Promise<AsyncIterable<Buffer>> {
      async function* empty(): AsyncIterable<Buffer> {
        yield Buffer.alloc(0);
      }
      return empty();
    },
  };
}

// Mock recorder that yields scripted audio chunks
function createMockRecorder(): MicRecorder {
  const recorder = new MicRecorder();
  // Override start to yield a few dummy chunks
  recorder.start = async function* () {
    yield Buffer.alloc(1600); // 100ms of 16kHz audio
    yield Buffer.alloc(1600);
  };
  recorder.stop = vi.fn();
  return recorder;
}

// Mock player that does nothing
function createMockPlayer(): AudioPlayer {
  const player = new AudioPlayer();
  player.playStream = vi.fn().mockResolvedValue(undefined);
  player.stop = vi.fn();
  return player;
}

describe('VoiceIO', () => {
  let stt: STTProvider;
  let tts: TTSProvider;
  let recorder: MicRecorder;
  let player: AudioPlayer;

  beforeEach(() => {
    tts = createMockTTS();
    recorder = createMockRecorder();
    player = createMockPlayer();
  });

  describe('getUserInput', () => {
    it('returns final transcript text', async () => {
      stt = createMockSTT([
        { type: 'partial', text: 'Hello' },
        { type: 'final', text: 'Hello world' },
      ]);
      const voiceIO = new VoiceIO(stt, tts, recorder, player, {
        showTranscription: false,
        printText: false,
      });

      const result = await voiceIO.getUserInput();
      expect(result).toBe('Hello world');
    });

    it('throws when no speech detected', async () => {
      stt = createMockSTT([]); // No events
      const voiceIO = new VoiceIO(stt, tts, recorder, player, {
        showTranscription: false,
        printText: false,
      });

      await expect(voiceIO.getUserInput()).rejects.toThrow('No speech detected');
    });

    it('calls onPartial with partial transcripts', async () => {
      const onPartial = vi.fn();
      stt = createMockSTT([
        { type: 'partial', text: 'He' },
        { type: 'partial', text: 'Hello' },
        { type: 'final', text: 'Hello world' },
      ]);
      const voiceIO = new VoiceIO(stt, tts, recorder, player, {
        showTranscription: false,
        printText: false,
        onPartial,
      });

      await voiceIO.getUserInput();
      expect(onPartial).toHaveBeenCalledTimes(2);
      expect(onPartial).toHaveBeenCalledWith('He');
      expect(onPartial).toHaveBeenCalledWith('Hello');
    });

    it('calls onFinalTranscript with final text', async () => {
      const onFinalTranscript = vi.fn();
      stt = createMockSTT([
        { type: 'final', text: 'Test answer' },
      ]);
      const voiceIO = new VoiceIO(stt, tts, recorder, player, {
        showTranscription: false,
        printText: false,
        onFinalTranscript,
      });

      await voiceIO.getUserInput();
      expect(onFinalTranscript).toHaveBeenCalledWith('Test answer');
    });

    it('stops recorder after final transcript', async () => {
      stt = createMockSTT([
        { type: 'final', text: 'Done' },
      ]);
      const voiceIO = new VoiceIO(stt, tts, recorder, player, {
        showTranscription: false,
        printText: false,
      });

      await voiceIO.getUserInput();
      expect(recorder.stop).toHaveBeenCalled();
    });
  });

  describe('onInterviewerMessage', () => {
    it('synthesizes and plays audio', async () => {
      stt = createMockSTT([]);
      const voiceIO = new VoiceIO(stt, tts, recorder, player, {
        showTranscription: false,
        printText: false,
      });

      await voiceIO.onInterviewerMessage('Hello there');
      expect(player.playStream).toHaveBeenCalled();
    });

    it('does not throw on TTS failure', async () => {
      const failingTTS: TTSProvider = {
        name: 'failing-tts',
        async synthesize() {
          throw new Error('Network error');
        },
      };
      stt = createMockSTT([]);
      const voiceIO = new VoiceIO(stt, failingTTS, recorder, player, {
        showTranscription: false,
        printText: false,
      });

      // Should not throw — TTS failure is non-fatal
      await expect(voiceIO.onInterviewerMessage('Test')).resolves.toBeUndefined();
    });
  });

  describe('dispose', () => {
    it('cleans up all resources', async () => {
      stt = createMockSTT([]);
      const disposeStt = vi.fn().mockResolvedValue(undefined);
      const disposeTts = vi.fn().mockResolvedValue(undefined);
      stt.dispose = disposeStt;
      tts.dispose = disposeTts;

      const voiceIO = new VoiceIO(stt, tts, recorder, player, {
        showTranscription: false,
        printText: false,
      });

      await voiceIO.dispose();
      expect(recorder.stop).toHaveBeenCalled();
      expect(player.stop).toHaveBeenCalled();
      expect(disposeStt).toHaveBeenCalled();
      expect(disposeTts).toHaveBeenCalled();
    });
  });
});
