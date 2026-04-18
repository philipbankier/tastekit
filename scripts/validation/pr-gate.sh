#!/usr/bin/env bash
set -euo pipefail

start_time="$(date +%s)"
test_log="$(mktemp)"

cleanup() {
  rm -f "$test_log"
}

trap cleanup EXIT

build_status=0
test_status=0
lint_status=0

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

echo "==> Running build"
if ! pnpm build; then
  build_status=1
fi

if [[ "$build_status" -eq 0 ]]; then
  echo "==> Running tests"
  if ! pnpm test 2>&1 | tee "$test_log"; then
    test_status=1
  fi
fi

echo "==> Running lint"
if ! pnpm lint; then
  lint_status=1
  echo "WARN: lint failed"
fi

extract_test_summary "$test_log"

elapsed="$(( $(date +%s) - start_time ))"

echo
echo "PR gate summary"
echo "Total tests: $TEST_TOTAL"
echo "Passed: $TEST_PASSED"
echo "Failed: $TEST_FAILED"
echo "Test duration: $TEST_DURATION"
echo "Elapsed: ${elapsed}s"

if [[ "$build_status" -ne 0 || "$test_status" -ne 0 ]]; then
  exit 1
fi

if [[ "$lint_status" -ne 0 ]]; then
  echo "Lint warnings detected."
fi

exit 0
