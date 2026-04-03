import { execFile } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { TTSProvider } from './provider.js';

export interface PiperTTSOptions {
  /** Path to piper binary (default: 'piper') */
  binaryPath?: string;
  /** Path to voice model ONNX file */
  model?: string;
}

/**
 * Local Piper text-to-speech provider.
 *
 * Runs piper via child process to generate WAV audio.
 * Returns the audio as a single-chunk AsyncIterable for playback.
 */
export class PiperTTS implements TTSProvider {
  readonly name = 'piper-tts';
  private binaryPath: string;
  private model: string | undefined;

  constructor(options?: PiperTTSOptions) {
    this.binaryPath = options?.binaryPath ?? 'piper';
    this.model = options?.model;
  }

  async synthesize(text: string): Promise<AsyncIterable<Buffer>> {
    const tempPath = join(tmpdir(), `tastekit-tts-${Date.now()}.wav`);

    await this.runPiper(text, tempPath);

    const audioData = readFileSync(tempPath);
    try { unlinkSync(tempPath); } catch { /* ignore */ }

    // Strip the WAV header (44 bytes) to get raw PCM
    const pcm = audioData.subarray(44);

    async function* singleChunk(): AsyncIterable<Buffer> {
      yield pcm;
    }

    return singleChunk();
  }

  private runPiper(text: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['--output_file', outputPath];
      if (this.model) {
        args.push('--model', this.model);
      }

      const child = execFile(this.binaryPath, args, { timeout: 30000 }, (err) => {
        if (err) {
          reject(new Error(`Piper failed: ${err.message}`));
        } else {
          resolve();
        }
      });

      // Pipe text to piper's stdin
      if (child.stdin) {
        child.stdin.write(text);
        child.stdin.end();
      }
    });
  }

  async dispose(): Promise<void> {
    // Stateless
  }
}
