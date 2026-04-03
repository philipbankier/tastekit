import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { PiperTTS } from '../tts/piper-tts.js';

const MOCK_PIPER = join(import.meta.dirname, 'fixtures', 'mock-piper.sh');

describe('PiperTTS (mock binary)', () => {
  it('synthesizes text to audio via mock piper binary', async () => {
    const tts = new PiperTTS({
      binaryPath: MOCK_PIPER,
    });

    const audioStream = await tts.synthesize('Hello world, this is a test.');

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    // Should return at least one chunk of PCM audio
    expect(chunks.length).toBeGreaterThan(0);

    const totalAudio = Buffer.concat(chunks);
    // Mock piper generates 4410 bytes of PCM (0.1s at 22050Hz, 16-bit mono)
    // The piper-tts.ts strips the 44-byte WAV header, so we get raw PCM
    expect(totalAudio.length).toBe(4410);
  });

  it('handles short text', async () => {
    const tts = new PiperTTS({
      binaryPath: MOCK_PIPER,
    });

    const audioStream = await tts.synthesize('Hi');

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('passes model argument when specified', async () => {
    const tts = new PiperTTS({
      binaryPath: MOCK_PIPER,
      model: '/path/to/en_US-lessac-medium.onnx',
    });

    // Should not throw — mock piper ignores the --model flag
    const audioStream = await tts.synthesize('Test with model');
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('returns PCM data without WAV header', async () => {
    const tts = new PiperTTS({
      binaryPath: MOCK_PIPER,
    });

    const audioStream = await tts.synthesize('Check header stripping');
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    const audio = Buffer.concat(chunks);
    // The first 4 bytes should NOT be 'RIFF' — header should be stripped
    const header = audio.subarray(0, 4).toString();
    expect(header).not.toBe('RIFF');
  });
});
