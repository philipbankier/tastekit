/**
 * @tastekit/voice — Voice I/O layer for TasteKit onboarding
 *
 * Adds speech-to-text and text-to-speech to the interview,
 * turning the text questionnaire into a natural voice conversation.
 *
 * Supported providers:
 * - ElevenLabs (hosted, SOTA quality): Scribe v2 STT + streaming TTS
 * - Whisper.cpp + Piper (local, offline): quality-first local option
 */

export type { STTProvider, TranscriptEvent } from './stt/provider.js';
export type { TTSProvider } from './tts/provider.js';
export { VoiceConfigSchema, type VoiceConfig } from './config.js';
export { VoiceIO } from './voice-io.js';
export { resolveVoiceProviders, createVoiceIO } from './resolve.js';
