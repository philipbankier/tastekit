import { describe, it, expect } from 'vitest';
import { VoiceConfigSchema } from '../config.js';

describe('VoiceConfigSchema', () => {
  it('provides sensible defaults for empty config', () => {
    const config = VoiceConfigSchema.parse({});
    expect(config.stt.provider).toBe('elevenlabs');
    expect(config.stt.language).toBe('en');
    expect(config.stt.vad_silence_threshold_ms).toBe(1500);
    expect(config.tts.provider).toBe('elevenlabs');
    expect(config.tts.voice_id).toBe('21m00Tcm4TlvDq8ikWAM');
  });

  it('accepts elevenlabs STT config', () => {
    const config = VoiceConfigSchema.parse({
      stt: { provider: 'elevenlabs', language: 'fr', vad_silence_threshold_ms: 2000 },
    });
    expect(config.stt.provider).toBe('elevenlabs');
    expect(config.stt.language).toBe('fr');
    expect(config.stt.vad_silence_threshold_ms).toBe(2000);
  });

  it('accepts whisper STT config', () => {
    const config = VoiceConfigSchema.parse({
      stt: { provider: 'whisper', whisper_model: 'small.en', whisper_binary_path: '/usr/local/bin/whisper' },
    });
    expect(config.stt.provider).toBe('whisper');
    expect(config.stt.whisper_model).toBe('small.en');
    expect(config.stt.whisper_binary_path).toBe('/usr/local/bin/whisper');
  });

  it('accepts elevenlabs TTS config', () => {
    const config = VoiceConfigSchema.parse({
      tts: { provider: 'elevenlabs', voice_id: 'custom-voice-123' },
    });
    expect(config.tts.provider).toBe('elevenlabs');
    expect(config.tts.voice_id).toBe('custom-voice-123');
  });

  it('accepts piper TTS config', () => {
    const config = VoiceConfigSchema.parse({
      tts: { provider: 'piper', piper_model: 'en_US-lessac-medium' },
    });
    expect(config.tts.provider).toBe('piper');
    expect(config.tts.piper_model).toBe('en_US-lessac-medium');
  });

  it('rejects unknown STT provider', () => {
    expect(() => VoiceConfigSchema.parse({ stt: { provider: 'unknown' } })).toThrow();
  });

  it('rejects unknown TTS provider', () => {
    expect(() => VoiceConfigSchema.parse({ tts: { provider: 'unknown' } })).toThrow();
  });

  it('accepts full mixed config', () => {
    const config = VoiceConfigSchema.parse({
      stt: { provider: 'whisper', whisper_model: 'base.en' },
      tts: { provider: 'elevenlabs', voice_id: 'abc123' },
    });
    expect(config.stt.provider).toBe('whisper');
    expect(config.tts.provider).toBe('elevenlabs');
  });
});
