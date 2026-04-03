#!/usr/bin/env npx tsx
/**
 * ElevenLabs smoke test — validates API key, TTS, and STT round-trip.
 * Run: ELEVENLABS_API_KEY="your-key" npx tsx packages/voice/src/__tests__/elevenlabs-smoke.ts
 */

import { ElevenLabsTTS } from '../tts/elevenlabs-tts.js';
import { ElevenLabsSTT } from '../stt/elevenlabs-stt.js';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('❌ ELEVENLABS_API_KEY not set');
  process.exit(1);
}

async function collectStream(stream: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function testTTS(): Promise<Buffer> {
  console.log('\n── TTS Test ──────────────────────────────');

  // Longer text so VAD has enough speech + silence gap to commit
  const testText = 'Hello, welcome to TasteKit! This is a voice system smoke test. We are verifying that text to speech and speech to text both work correctly with the ElevenLabs API.';
  console.log(`Synthesizing: "${testText}"`);

  // Request PCM at 16kHz directly so STT can consume it without downsampling
  const start = Date.now();
  // output_format is a QUERY parameter, not a body parameter
  const url = `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream?output_format=pcm_16000`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey!,
    },
    body: JSON.stringify({
      text: testText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS error (${response.status}): ${errorText}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  const elapsed = Date.now() - start;

  console.log(`✅ TTS OK — ${audio.length} bytes of PCM audio in ${elapsed}ms`);
  console.log(`   Sample rate: 16000Hz, 16-bit signed, mono`);
  console.log(`   Duration: ~${(audio.length / (16000 * 2)).toFixed(1)}s`);

  return audio;
}

async function testSTT(pcmAudio: Buffer): Promise<void> {
  console.log('\n── STT Test (direct WebSocket) ──────────');
  // TTS output is already 16kHz PCM — no downsampling needed
  const downsampled = pcmAudio;
  console.log(`Audio: ${downsampled.length} bytes, ~${(downsampled.length / (16000 * 2)).toFixed(1)}s`);

  // Direct WebSocket test with full debug logging
  const WebSocket = (await import('ws')).default;

  const sampleRate = 16000;
  const url = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=en&audio_format=pcm_${sampleRate}`;

  console.log(`Connecting to: ${url.replace(/\?.*/, '?...')}`);

  const ws = new WebSocket(url, {
    headers: { 'xi-api-key': apiKey! },
  });

  let finalText = '';
  const start = Date.now();

  ws.on('open', () => {
    console.log(`  [ws] Connected (${Date.now() - start}ms)`);

    // Send audio in 1-second chunks (32000 bytes at 16kHz 16-bit) with real-time pacing
    const chunkSize = 32000; // 1 second of 16kHz 16-bit mono
    let offset = 0;

    const sendNext = () => {
      if (offset < downsampled.length && ws.readyState === WebSocket.OPEN) {
        const chunk = downsampled.subarray(offset, Math.min(offset + chunkSize, downsampled.length));
        ws.send(JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: chunk.toString('base64'),
          sample_rate: sampleRate,
          commit: false,
        }));
        offset += chunkSize;
        // Pace at ~1 chunk per second (real-time) but slightly faster
        setTimeout(sendNext, 500);
      } else {
        console.log(`  [ws] Audio sent (${offset} bytes, ${Date.now() - start}ms)`);

        // Small delay before committing to let last chunk process
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log(`  [ws] Committing (${Date.now() - start}ms)`);
            ws.send(JSON.stringify({
              message_type: 'input_audio_chunk',
              audio_base_64: '',
              sample_rate: sampleRate,
              commit: true,
            }));
            // Wait for response before closing
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                console.log(`  [ws] Timeout — closing (${Date.now() - start}ms)`);
                ws.close();
              }
            }, 5000);
          }
        }, 1000);
      }
    };
    sendNext();
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const ts = Date.now() - start;
    // Log every message type for debugging
    console.log(`  [${ts}ms] ${msg.message_type}: ${JSON.stringify(msg).slice(0, 200)}`);
    if (msg.message_type === 'committed_transcript' && msg.text) {
      finalText = msg.text;
      ws.close();
    }
  });

  await new Promise<void>((resolve) => {
    ws.on('close', (code, reason) => {
      console.log(`  [ws] Closed: code=${code} reason="${reason}" (${Date.now() - start}ms)`);
      resolve();
    });
    ws.on('error', (err) => {
      console.error(`  [ws] Error: ${err.message}`);
      resolve();
    });
  });

  if (finalText) {
    console.log(`\n✅ STT OK — "${finalText}"`);
  } else {
    console.log(`\n⚠️  STT returned no final transcript`);
  }
}

async function main() {
  console.log('🔑 ElevenLabs Smoke Test');
  console.log(`   API Key: ${apiKey!.slice(0, 6)}...${apiKey!.slice(-4)}`);

  try {
    // Test 1: TTS
    const audio = await testTTS();

    // Test 2: STT (round-trip — feed TTS output back)
    await testSTT(audio);

    console.log('\n✅ All ElevenLabs tests passed!\n');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

main();
