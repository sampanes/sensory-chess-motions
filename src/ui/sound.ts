// Every sound is synthesized with Web Audio -- no files to load.
// One shared AudioContext (browsers cap how many you can make), created on the
// first tap because mobile browsers refuse to start audio without a gesture.

import { PLAIN_MUSIC, type Music } from '../content/looks.ts';
import type { Kind } from '../core/types.ts';
import { buzz } from './senses.ts';

let ctx: AudioContext | null = null;
let muted = false;
let music: Music = PLAIN_MUSIC;

/** Key and instrument for the munch notes and win tune (replays get a surprise). */
export function setMusic(value: Music): void {
  music = value;
}

export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx || ctx.state === 'closed') {
      const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // 'suspended' before the first tap; iOS also reports 'interrupted' after a
    // call or app switch, and stays silent until resumed from a tap.
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
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

/** One musical note in the current key and instrument. */
function tone(freq: number, delay: number, dur: number, vol: number): void {
  const f = freq * 2 ** (music.key / 12);
  switch (music.voice) {
    case 'sine':
      note(f, delay, dur, { type: 'sine', vol: vol * 1.1 });
      break;
    case 'bell':
      note(f, delay, dur * 1.6, { type: 'sine', vol: vol * 0.9 });
      note(f * 2, delay, dur * 0.8, { type: 'sine', vol: vol * 0.35 });
      break;
    case 'pluck':
      note(f, delay, dur * 0.55, { type: 'triangle', vol: vol * 1.1, glideTo: f * 0.985 });
      break;
    default:
      note(f, delay, dur, { type: 'triangle', vol });
  }
}

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
    buzz(12);
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
    buzz(28);
    tone(PENTA[nth % PENTA.length], 0, 0.22, 0.2);
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
    buzz([30, 60, 30, 60, 70]);
    const k = 2 ** (music.key / 12);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, 0.3, 0.18));
    [523.25, 659.25, 783.99].forEach((f) => note(f * k, 0.55, 0.9, { type: 'sine', vol: 0.1 }));
  },
  /** A square around the grumpy king becomes watched: rising chimes. */
  cover(nth: number) {
    note(PENTA[nth % PENTA.length], 0, 0.2, { type: 'sine', vol: 0.16 });
  },
  /** The grumpy king shoos a lonely friend away. */
  shoo() {
    note(200, 0, 0.16, { type: 'triangle', vol: 0.16, glideTo: 150 });
    note(170, 0.14, 0.2, { type: 'triangle', vol: 0.14, glideTo: 120 });
  },
  /** A friend wakes up: a yawn down, then a happy hello up. */
  wake() {
    note(520, 0, 0.45, { type: 'sine', vol: 0.12, glideTo: 330 });
    note(523.25, 0.55, 0.14, { type: 'triangle', vol: 0.15 });
    note(783.99, 0.68, 0.22, { type: 'triangle', vol: 0.15 });
  },
  snore() {
    note(150, 0, 0.5, { type: 'triangle', vol: 0.12, glideTo: 110 });
  },
  /** Slime lab: a friend's magic beam, a sparkly swoop up (each one a little higher). */
  zap(nth: number) {
    const f = PENTA[nth % PENTA.length];
    note(f, 0, 0.22, { type: 'sine', vol: 0.1, glideTo: f * 1.5 });
    note(f * 2, 0.05, 0.12, { type: 'sine', vol: 0.05 });
  },
  /** Slime lab: the slime slurps a lonely friend. */
  gobble() {
    buzz(20);
    note(330, 0, 0.3, { type: 'sine', vol: 0.18, glideTo: 90 });
    note(140, 0.22, 0.12, { type: 'triangle', vol: 0.12, glideTo: 220 });
  },
  /** Slime lab: the slime bonks off a magic bubble. */
  boing() {
    note(220, 0, 0.12, { type: 'sine', vol: 0.18, glideTo: 520 });
    note(520, 0.1, 0.22, { type: 'sine', vol: 0.12, glideTo: 260 });
  },
  /** Slime lab: the slime pops into sparkles. */
  splat() {
    buzz([20, 40, 20]);
    note(180, 0, 0.12, { type: 'triangle', vol: 0.22, glideTo: 520 });
    [1046.5, 1318.51, 1567.98].forEach((f, i) => note(f, 0.1 + i * 0.05, 0.18, { type: 'sine', vol: 0.08 }));
  },
  /** Slime lab: nyah nyah, a wobbly raspberry. */
  raspberry() {
    for (let i = 0; i < 7; i++) note(i % 2 ? 150 : 125, i * 0.06, 0.07, { type: 'sawtooth', vol: 0.06 });
  },
  tap() {
    note(660, 0, 0.08, { type: 'sine', vol: 0.12 });
  },
};
