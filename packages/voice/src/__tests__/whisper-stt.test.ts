import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { WhisperSTT } from '../stt/whisper-stt.js';

const MOCK_WHISPER = join(import.meta.dirname, 'fixtures', 'mock-whisper.sh');

describe('WhisperSTT (mock binary)', () => {
  it('transcribes PCM audio via mock whisper binary', async () => {
    const stt = new WhisperSTT({
      binaryPath: MOCK_WHISPER,
      model: 'base.en',
      language: 'en',
    });

    // Generate 0.5s of fake 16kHz mono PCM (silence)
    const pcmData = Buffer.alloc(16000); // 0.5s at 16kHz, 16-bit = 16000 bytes

    async function* audioStream(): AsyncIterable<Buffer> {
      // Yield in realistic-sized chunks (100ms each)
      const chunkSize = 3200; // 100ms at 16kHz, 16-bit
      for (let i = 0; i < pcmData.length; i += chunkSize) {
        yield pcmData.subarray(i, Math.min(i + chunkSize, pcmData.length));
      }
    }

    const events: Array<{ type: string; text: string }> = [];
    for await (const event of stt.transcribe(audioStream())) {
      events.push(event);
    }

    // Should produce a single final event with canned transcription
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('final');
    expect(events[0].text).toBe('Hello I am testing the voice onboarding system');
  });

  it('produces no events for empty audio', async () => {
    const stt = new WhisperSTT({
      binaryPath: MOCK_WHISPER,
      model: 'base.en',
    });

    async function* emptyAudio(): AsyncIterable<Buffer> {
      // yield nothing
    }

    const events: Array<{ type: string; text: string }> = [];
    for await (const event of stt.transcribe(emptyAudio())) {
      events.push(event);
    }

    expect(events).toHaveLength(0);
  });

  it('handles multiple chunks correctly', async () => {
    const stt = new WhisperSTT({
      binaryPath: MOCK_WHISPER,
    });

    // Multiple small chunks
    async function* chunkedAudio(): AsyncIterable<Buffer> {
      yield Buffer.alloc(320);  // 10ms
      yield Buffer.alloc(320);
      yield Buffer.alloc(320);
      yield Buffer.alloc(320);
      yield Buffer.alloc(320);
    }

    const events: Array<{ type: string; text: string }> = [];
    for await (const event of stt.transcribe(chunkedAudio())) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('final');
    expect(events[0].text).toContain('Hello');
  });
});
