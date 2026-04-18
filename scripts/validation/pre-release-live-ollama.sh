#!/usr/bin/env bash
set -euo pipefail

if ! curl -sf http://localhost:11434/api/tags >/dev/null; then
  echo "SKIP: Ollama not running. Pre-release live test skipped."
  exit 0
fi

start_time="$(date +%s)"
test_log="$(mktemp)"

cleanup() {
  rm -f "$test_log"
}

trap cleanup EXIT

extract_test_summary() {
  local log_file="$1"
  local totals

  totals="$(node - "$log_file" <<'NODE'
const fs = require('fs');

const log = fs.readFileSync(process.argv[2], 'utf8');
const lines = log.split(/\r?\n/);
let passed = 0;
let failed = 0;
let duration = '';

for (const line of lines) {
  const testsLine = line.match(/Tests\s+(.+)/);
  if (testsLine) {
    const segment = testsLine[1];
    const passedMatch = segment.match(/(\d+)\s+passed/);
    const failedMatch = segment.match(/(\d+)\s+failed/);

    if (passedMatch) {
      passed += Number(passedMatch[1]);
    }

    if (failedMatch) {
      failed += Number(failedMatch[1]);
    }
  }

  const durationLine = line.match(/Duration\s+(.+)/);
  if (durationLine) {
    duration = durationLine[1].trim();
  }
}

const total = passed + failed;
process.stdout.write(`${total}\n${passed}\n${failed}\n${duration}`);
NODE
)"

  mapfile -t summary <<<"$totals"
  TEST_TOTAL="${summary[0]:-0}"
  TEST_PASSED="${summary[1]:-0}"
  TEST_FAILED="${summary[2]:-0}"
  TEST_DURATION="${summary[3]:-unknown}"
}

echo "==> Running live pre-release tests against Ollama"
test_status=0

if ! OLLAMA_BASE_URL="http://localhost:11434" pnpm test 2>&1 | tee "$test_log"; then
  test_status=1
fi

extract_test_summary "$test_log"

elapsed="$(( $(date +%s) - start_time ))"

echo
echo "Pre-release live summary"
echo "Total tests: $TEST_TOTAL"
echo "Passed: $TEST_PASSED"
echo "Failed: $TEST_FAILED"
echo "Test duration: $TEST_DURATION"
echo "Elapsed: ${elapsed}s"

if [[ "$test_status" -ne 0 ]]; then
  exit 1
fi

exit 0
