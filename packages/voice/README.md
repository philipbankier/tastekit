# @actrun_ai/tastekit-voice

Voice-based onboarding for [TasteKit](https://github.com/philipbankier/tastekit) — speak your preferences instead of typing them.

## Providers

| Provider | Type | Requires |
|----------|------|----------|
| **ElevenLabs Scribe v2** | STT (cloud) | `ELEVENLABS_API_KEY` |
| **ElevenLabs Streaming** | TTS (cloud) | `ELEVENLABS_API_KEY` |
| **Whisper.cpp** | STT (local) | `whisper-cpp` binary |
| **Piper** | TTS (local) | `piper` binary |

Automatic 3-layer fallback: ElevenLabs → local binaries → text input.

## Install

```bash
npm install @actrun_ai/tastekit-voice
```

## Usage

```bash
# Via CLI (automatically loads voice package)
tastekit onboard --voice
```

```typescript
// Programmatic
import { createVoiceIO } from '@actrun_ai/tastekit-voice';

const voiceIO = await createVoiceIO();
const input = await voiceIO.getUserInput();      // Records mic → STT
await voiceIO.onInterviewerMessage('Hello!');      // TTS → speaker
await voiceIO.dispose();
```

## Requirements

- **sox** — required for microphone recording (`brew install sox`)
- **ElevenLabs API key** — for cloud STT/TTS (optional, falls back to local)
- **whisper-cpp** — for local STT (optional)
- **piper** — for local TTS (optional)

## Part of TasteKit

- CLI: [`@actrun_ai/tastekit-cli`](https://www.npmjs.com/package/@actrun_ai/tastekit-cli)
- Core: [`@actrun_ai/tastekit-core`](https://www.npmjs.com/package/@actrun_ai/tastekit-core)

## License

MIT
