import { execFile } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { STTProvider, TranscriptEvent } from './provider.js';

export interface WhisperSTTOptions {
  /** Path to whisper.cpp main binary (default: 'whisper-cpp') */
  binaryPath?: string;
  /** Whisper model name/path (default: 'base.en') */
  model?: string;
  /** Language for transcription */
  language?: string;
}

/**
 * Local Whisper.cpp speech-to-text provider.
 *
 * Records the full utterance, writes to a temp WAV file,
 * then runs whisper.cpp for batch transcription.
 * No partial transcripts — yields a single final event.
 */
export class WhisperSTT implements STTProvider {
  readonly name = 'whisper-stt';
  private binaryPath: string;
  private model: string;
  private language: string;

  constructor(options?: WhisperSTTOptions) {
    this.binaryPath = options?.binaryPath ?? 'whisper-cpp';
    this.model = options?.model ?? 'base.en';
    this.language = options?.language ?? 'en';
  }

  async *transcribe(audio: AsyncIterable<Buffer>): AsyncIterable<TranscriptEvent> {
    // Collect all audio chunks into a single buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const rawPcm = Buffer.concat(chunks);

    if (rawPcm.length === 0) {
      return;
    }

    // Write raw PCM as a WAV file (16-bit, 16kHz, mono)
    const tempPath = join(tmpdir(), `tastekit-voice-${Date.now()}.wav`);
    writeWav(tempPath, rawPcm, 16000);

    try {
      const text = await this.runWhisper(tempPath);
      if (text.trim()) {
        yield { type: 'final', text: text.trim() };
      }
    } finally {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }

  private runWhisper(wavPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', this.model,
        '-l', this.language,
        '-f', wavPath,
        '--no-timestamps',
        '--print-progress', 'false',
      ];

      execFile(this.binaryPath, args, { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Whisper failed: ${stderr || err.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async dispose(): Promise<void> {
    // Stateless
  }
}

/** Write raw 16-bit PCM data as a WAV file. */
function writeWav(path: string, pcm: Buffer, sampleRate: number): void {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);
  header.write('RIFF', 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);         // fmt chunk size
  header.writeUInt16LE(1, 20);          // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  writeFileSync(path, Buffer.concat([header, pcm]));
}
