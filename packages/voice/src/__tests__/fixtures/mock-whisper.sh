#!/bin/bash
# Mock whisper-cpp binary for testing.
# Simulates whisper.cpp CLI: reads a WAV file and outputs transcription to stdout.
# Ignores all flags except -f (input file) — just verifies the file exists.

INPUT_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f) INPUT_FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$INPUT_FILE" ]; then
  echo "Error: no input file specified" >&2
  exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: input file not found: $INPUT_FILE" >&2
  exit 1
fi

# Verify it's a WAV file (check RIFF header)
HEADER=$(head -c 4 "$INPUT_FILE")
if [ "$HEADER" != "RIFF" ]; then
  echo "Error: not a valid WAV file" >&2
  exit 1
fi

# Output canned transcription (mimics whisper.cpp stdout)
echo "Hello I am testing the voice onboarding system"
