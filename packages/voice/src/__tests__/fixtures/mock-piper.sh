#!/bin/bash
# Mock piper binary for testing.
# Simulates piper CLI: reads text from stdin, writes a valid WAV file.
# Generates a minimal WAV with 0.1s of silence at 22050Hz, 16-bit mono.

OUTPUT_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output_file) OUTPUT_FILE="$2"; shift 2 ;;
    --model) shift 2 ;;  # Ignore model arg
    *) shift ;;
  esac
done

if [ -z "$OUTPUT_FILE" ]; then
  echo "Error: no output file specified (use --output_file)" >&2
  exit 1
fi

# Read text from stdin (consume it like real piper does)
TEXT=$(cat)
if [ -z "$TEXT" ]; then
  echo "Error: no text provided on stdin" >&2
  exit 1
fi

# Generate a valid WAV file with silence
# 22050 Hz, 16-bit, mono, 0.1 seconds = 4410 bytes of PCM data
SAMPLE_RATE=22050
BITS_PER_SAMPLE=16
NUM_CHANNELS=1
DATA_SIZE=4410  # 0.1s * 22050 * 2 bytes
FILE_SIZE=$((DATA_SIZE + 36))
BYTE_RATE=$((SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8))
BLOCK_ALIGN=$((NUM_CHANNELS * BITS_PER_SAMPLE / 8))

# Write WAV header + silence using printf for binary data
{
  # RIFF header
  printf 'RIFF'
  printf "$(printf '\\x%02x\\x%02x\\x%02x\\x%02x' $((FILE_SIZE & 0xFF)) $(((FILE_SIZE >> 8) & 0xFF)) $(((FILE_SIZE >> 16) & 0xFF)) $(((FILE_SIZE >> 24) & 0xFF)))"
  printf 'WAVE'
  # fmt chunk
  printf 'fmt '
  printf '\x10\x00\x00\x00'  # chunk size = 16
  printf '\x01\x00'          # PCM format
  printf '\x01\x00'          # mono
  printf "$(printf '\\x%02x\\x%02x\\x%02x\\x%02x' $((SAMPLE_RATE & 0xFF)) $(((SAMPLE_RATE >> 8) & 0xFF)) $(((SAMPLE_RATE >> 16) & 0xFF)) $(((SAMPLE_RATE >> 24) & 0xFF)))"
  printf "$(printf '\\x%02x\\x%02x\\x%02x\\x%02x' $((BYTE_RATE & 0xFF)) $(((BYTE_RATE >> 8) & 0xFF)) $(((BYTE_RATE >> 16) & 0xFF)) $(((BYTE_RATE >> 24) & 0xFF)))"
  printf "$(printf '\\x%02x\\x%02x' $((BLOCK_ALIGN & 0xFF)) $(((BLOCK_ALIGN >> 8) & 0xFF)))"
  printf "$(printf '\\x%02x\\x%02x' $((BITS_PER_SAMPLE & 0xFF)) $(((BITS_PER_SAMPLE >> 8) & 0xFF)))"
  # data chunk
  printf 'data'
  printf "$(printf '\\x%02x\\x%02x\\x%02x\\x%02x' $((DATA_SIZE & 0xFF)) $(((DATA_SIZE >> 8) & 0xFF)) $(((DATA_SIZE >> 16) & 0xFF)) $(((DATA_SIZE >> 24) & 0xFF)))"
  # silence (zero bytes)
  dd if=/dev/zero bs=$DATA_SIZE count=1 2>/dev/null
} > "$OUTPUT_FILE"
