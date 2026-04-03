import { z } from 'zod';

/**
 * Voice configuration schema.
 * Stored in tastekit.yaml under the `voice` key.
 * The core WorkspaceConfigSchema uses z.any().optional() for this field —
 * detailed validation happens here at runtime.
 */
export const VoiceConfigSchema = z.object({
  stt: z.object({
    provider: z.enum(['elevenlabs', 'whisper']).default('elevenlabs'),
    /** Environment variable holding the API key (ElevenLabs) */
    api_key_env: z.string().default('ELEVENLABS_API_KEY'),
    /** ISO 639-1 language code */
    language: z.string().default('en'),
    /** VAD silence threshold in milliseconds (ElevenLabs) */
    vad_silence_threshold_ms: z.number().default(1500),
    /** Whisper model name (e.g., 'base.en', 'small.en') */
    whisper_model: z.string().default('base.en'),
    /** Path to whisper.cpp binary (local mode) */
    whisper_binary_path: z.string().optional(),
  }).default({}),

  tts: z.object({
    provider: z.enum(['elevenlabs', 'piper']).default('elevenlabs'),
    /** Environment variable holding the API key (ElevenLabs) */
    api_key_env: z.string().default('ELEVENLABS_API_KEY'),
    /** ElevenLabs voice ID */
    voice_id: z.string().default('21m00Tcm4TlvDq8ikWAM'),
    /** ElevenLabs model ID */
    model_id: z.string().default('eleven_multilingual_v2'),
    /** Path to piper binary (local mode) */
    piper_binary_path: z.string().optional(),
    /** Piper voice model name */
    piper_model: z.string().optional(),
  }).default({}),
});

export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
