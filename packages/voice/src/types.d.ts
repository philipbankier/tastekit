declare module 'node-record-lpcm16' {
  import { Readable } from 'stream';

  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    audioType?: string;
    recorder?: string;
  }

  interface Recording {
    stream(): Readable;
    stop(): void;
  }

  export function record(options?: RecordOptions): Recording;
}

declare module 'play-sound' {
  interface Player {
    play(path: string, callback?: (err: Error | null) => void): void;
  }

  function playSound(options?: Record<string, unknown>): Player;
  export default playSound;
}

declare module 'speaker' {
  import { Writable } from 'stream';

  interface SpeakerOptions {
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
  }

  class Speaker extends Writable {
    constructor(options?: SpeakerOptions);
  }

  export default Speaker;
}
