/**
 * Session Rhythm Block — Orient → Work → Persist lifecycle.
 */
import type { GeneratorBlock } from '../types.js';

export const sessionRhythmBlock: GeneratorBlock = (_ctx) => {
  const lines: string[] = [
    '## Session Rhythm',
    '',
    '1. **Orient**: Read workspace state. Check `drift/` for pending proposals. Review recent observations.',
    '2. **Work**: Execute tasks following the principles above. When something unexpected happens, log an observation.',
    '3. **Persist**: Update session state. Commit changes. Capture session metadata.',
  ];

  return lines.join('\n');
};
