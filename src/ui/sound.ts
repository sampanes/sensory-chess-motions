// Every sound is synthesized with Web Audio -- no files to load.
// One shared AudioContext (browsers cap how many you can make), created on the
// first tap because mobile browsers refuse to start audio without a gesture.

import type { Kind } from '../core/types.ts';

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from any tap handler so audio is ready before the first real sound. */
export function wakeAudio(): void {
  audio();
}

interface NoteOpts {
  type?: OscillatorType;
  vol?: number;
  glideTo?: number;
}

function note(freq: number, delay: number, dur: number, { type = 'sine', vol = 0.18, glideTo }: NoteOpts = {}): void {
  const ac = audio();
  if (!ac) return;
  try {
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch {
    // A missed sound is never worth a crash.
  }
}

// C major pentatonic: any sequence of these sounds pleasant together.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

const VOICE: Record<Kind, number> = {
  king: 392,
  queen: 523.25,
  rook: 329.63,
  bishop: 440,
  knight: 293.66,
  pawn: 587.33,
};

export const sfx = {
  /** A friend says hi when tapped. */
  select(kind: Kind) {
    const f = VOICE[kind];
    note(f, 0, 0.12, { type: 'triangle', vol: 0.16 });
    note(f * 1.25, 0.09, 0.16, { type: 'triangle', vol: 0.16 });
  },
  hop(kind: Kind) {
    if (kind === 'knight') {
      note(220, 0, 0.09, { type: 'triangle', vol: 0.22, glideTo: 110 });
      note(260, 0.16, 0.09, { type: 'triangle', vol: 0.22, glideTo: 120 });
    } else if (kind === 'king' || kind === 'pawn') {
      note(440, 0, 0.12, { type: 'sine', vol: 0.14, glideTo: 620 });
    } else {
      note(300, 0, 0.26, { type: 'triangle', vol: 0.1, glideTo: 640 });
    }
  },
  /** Each treat in a puzzle plays the next note up, so finishing sounds like a tune. */
  munch(nth: number) {
    note(PENTA[nth % PENTA.length], 0, 0.22, { type: 'triangle', vol: 0.2 });
    note(320, 0, 0.08, { type: 'sine', vol: 0.12, glideTo: 140 });
  },
  nudge() {
    note(240, 0, 0.14, { type: 'sine', vol: 0.12, glideTo: 200 });
  },
  uhoh() {
    note(440, 0, 0.18, { type: 'triangle', vol: 0.14 });
    note(349.23, 0.18, 0.28, { type: 'triangle', vol: 0.14 });
  },
  rewind() {
    note(900, 0, 0.45, { type: 'triangle', vol: 0.08, glideTo: 280 });
  },
  promote() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => note(f, i * 0.06, 0.25, { type: 'triangle', vol: 0.14 }));
  },
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.12, 0.3, { type: 'triangle', vol: 0.18 }));
    [523.25, 659.25, 783.99].forEach((f) => note(f, 0.55, 0.9, { type: 'sine', vol: 0.1 }));
  },
  snore() {
    note(150, 0, 0.5, { type: 'triangle', vol: 0.12, glideTo: 110 });
  },
  tap() {
    note(660, 0, 0.08, { type: 'sine', vol: 0.12 });
  },
};
