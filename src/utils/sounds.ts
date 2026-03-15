import { PieceType } from '../types';

// ─── Piece movement sounds ────────────────────────────────────────────────────

/** Warm modest chime — gentle sine, medium pitch, soft attack */
export function playKingMove() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, now); // C5
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

/** Tiny determined pluck — triangle wave, bright, very fast decay */
export function playPawnMove() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, now); // A5
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.007);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

/** Stone slide thud — low sawtooth, quick pitch drop */
export function playRookMove() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(75, now + 0.14);
  gain.gain.setValueAtTime(0.38, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

/** Soft glowing shimmer — sine with gentle vibrato, medium-long decay */
export function playBishopMove() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const gain = ctx.createGain();
  lfo.frequency.setValueAtTime(5.5, now);
  lfoGain.gain.setValueAtTime(7, now);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(659, now); // E5
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  lfo.start(now);
  osc.stop(now + 0.6);
  lfo.stop(now + 0.6);
}

/** Bouncy spring pop — sine pitch-drop: starts high, lands low */
export function playKnightMove() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);
  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/** Radiant sweep — three sine harmonics, graceful staggered fade */
export function playQueenMove() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const config = [
    { freq: 392, vol: 0.20, decay: 0.62 }, // G4
    { freq: 784, vol: 0.13, decay: 0.70 }, // G5
    { freq: 1176, vol: 0.07, decay: 0.78 }, // G5 + fifth
  ];
  for (const { freq, vol, decay } of config) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }
}

/** Dispatch to the right movement sound for any piece type */
export function playMoveSound(piece: PieceType) {
  switch (piece) {
    case 'king':   playKingMove();   break;
    case 'pawn':   playPawnMove();   break;
    case 'rook':   playRookMove();   break;
    case 'bishop': playBishopMove(); break;
    case 'knight': playKnightMove(); break;
    case 'queen':  playQueenMove();  break;
  }
}

// ─── Utility sounds ───────────────────────────────────────────────────────────

export function playWompSound() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  function makeWomp(startTime: number, startFreq: number, endFreq: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.38);
    gain.gain.setValueAtTime(0.35, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  }

  makeWomp(now, 220, 85);
  makeWomp(now + 0.45, 185, 65);
}

export function playCrunchSound() {
  const ctx = new AudioContext();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}
