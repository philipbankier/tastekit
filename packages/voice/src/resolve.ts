import { VoiceConfigSchema, type VoiceConfig } from './config.js';
import type { STTProvider } from './stt/provider.js';
import type { TTSProvider } from './tts/provider.js';
import { VoiceIO, type VoiceIOOptions } from './voice-io.js';
import { MicRecorder } from './audio/recorder.js';
import { AudioPlayer } from './audio/player.js';

/**
 * Resolve STT and TTS providers from voice configuration.
 */
export async function resolveVoiceProviders(
  rawConfig: unknown,
): Promise<{ stt: STTProvider; tts: TTSProvider }> {
  const config = VoiceConfigSchema.parse(rawConfig ?? {});

  const stt = await resolveSTT(config);
  const tts = await resolveTTS(config);

  return { stt, tts };
}

/**
 * Create a fully-wired VoiceIO instance from raw config.
 * This is the main entry point used by the CLI.
 */
export async function createVoiceIO(
  rawConfig: unknown,
  options?: VoiceIOOptions,
): Promise<VoiceIO> {
  const { stt, tts } = await resolveVoiceProviders(rawConfig);
  const recorder = new MicRecorder();
  const player = new AudioPlayer();

  return new VoiceIO(stt, tts, recorder, player, options);
}

async function resolveSTT(config: VoiceConfig): Promise<STTProvider> {
  switch (config.stt.provider) {
    case 'elevenlabs': {
      const apiKey = process.env[config.stt.api_key_env];
      if (!apiKey) {
        throw new Error(
          `Missing environment variable: ${config.stt.api_key_env}\n` +
          'Set your ElevenLabs API key to enable voice STT.',
        );
      }
      const { ElevenLabsSTT } = await import('./stt/elevenlabs-stt.js');
      return new ElevenLabsSTT({
        apiKey,
        language: config.stt.language,
        vadSilenceThreshold: config.stt.vad_silence_threshold_ms / 1000,
      });
    }
    case 'whisper': {
      const { WhisperSTT } = await import('./stt/whisper-stt.js');
      return new WhisperSTT({
        binaryPath: config.stt.whisper_binary_path,
        model: config.stt.whisper_model,
        language: config.stt.language,
      });
    }
    default:
      throw new Error(`Unknown STT provider: ${config.stt.provider}`);
  }
}

async function resolveTTS(config: VoiceConfig): Promise<TTSProvider> {
  switch (config.tts.provider) {
    case 'elevenlabs': {
      const apiKey = process.env[config.tts.api_key_env];
      if (!apiKey) {
        throw new Error(
          `Missing environment variable: ${config.tts.api_key_env}\n` +
          'Set your ElevenLabs API key to enable voice TTS.',
        );
      }
      const { ElevenLabsTTS } = await import('./tts/elevenlabs-tts.js');
      return new ElevenLabsTTS({
        apiKey,
        voiceId: config.tts.voice_id,
        modelId: config.tts.model_id,
      });
    }
    case 'piper': {
      const { PiperTTS } = await import('./tts/piper-tts.js');
      return new PiperTTS({
        binaryPath: config.tts.piper_binary_path,
        model: config.tts.piper_model,
      });
    }
    default:
      throw new Error(`Unknown TTS provider: ${config.tts.provider}`);
  }
}
