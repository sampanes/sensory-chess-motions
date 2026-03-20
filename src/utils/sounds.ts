import { PieceType } from '../types';

// ─── Shared AudioContext singleton ────────────────────────────────────────────
// Creating a new AudioContext on every sound call hits browser limits (~6 on
// iOS) when the player taps rapidly — all subsequent sounds silently fail.
// One shared context used for the entire session sidesteps the limit entirely.

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext();
  }
  // Browser may auto-suspend after inactivity; resume before scheduling audio.
  if (_ctx.state === 'suspended') {
    void _ctx.resume();
  }
  return _ctx;
}

// ─── Piece movement sounds ────────────────────────────────────────────────────

/** Warm modest chime — gentle sine, medium pitch, soft attack */
export function playKingMove() {
  try {
    const ctx = getCtx();
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
  } catch { /* AudioContext unavailable */ }
}

/** Tiny determined pluck — triangle wave, bright, very fast decay */
export function playPawnMove() {
  try {
    const ctx = getCtx();
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
  } catch { /* AudioContext unavailable */ }
}

/** Heavy stone thud — two sine waves pitch-dropping for a warm, soft impact */
export function playRookMove() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(65, now + 0.2);
    gain1.gain.setValueAtTime(0.34, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.26);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.exponentialRampToValueAtTime(130, now + 0.1);
    gain2.gain.setValueAtTime(0.13, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.15);
  } catch { /* AudioContext unavailable */ }
}

/** Soft glowing shimmer — sine with gentle vibrato, medium-long decay */
export function playBishopMove() {
  try {
    const ctx = getCtx();
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
  } catch { /* AudioContext unavailable */ }
}

/** Two-beat clip-clop — triangle wave, woody and percussive, mirrors the L-jump */
export function playKnightMove() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // First clop — push-off, slightly lower
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(210, now);
    osc1.frequency.exponentialRampToValueAtTime(95, now + 0.07);
    gain1.gain.setValueAtTime(0.32, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.11);

    // Second clop — landing, slightly higher pitched
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(260, now + 0.16);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.23);
    gain2.gain.setValueAtTime(0.26, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.30);
  } catch { /* AudioContext unavailable */ }
}

/** Radiant sweep — three sine harmonics, graceful staggered fade */
export function playQueenMove() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const config = [
      { freq: 392, vol: 0.20, decay: 0.62 }, // G4
      { freq: 784, vol: 0.13, decay: 0.70 }, // G5
      { freq: 1176, vol: 0.07, decay: 0.78 },
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
  } catch { /* AudioContext unavailable */ }
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

// ─── Celebration sounds ───────────────────────────────────────────────────────

function playCelebrationKing() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  for (const [freq, delay, vol] of [[330, 0, 0.22], [415, 0.07, 0.18], [494, 0.14, 0.15]] as const) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + delay);
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(vol, now + delay + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.9);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now + delay); osc.stop(now + delay + 1);
  }
}

function playCelebrationPawn() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  for (const [freq, delay] of [[523, 0], [659, 0.11], [784, 0.22]] as const) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, now + delay);
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(0.24, now + delay + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now + delay); osc.stop(now + delay + 0.4);
  }
}

function playCelebrationRook() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  for (const [freq, vol, decay] of [[82, 0.35, 0.9], [165, 0.22, 0.75], [247, 0.14, 0.65]] as const) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + decay + 0.05);
  }
}

function playCelebrationBishop() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  for (const [freq, delay, vol] of [[440, 0, 0.18], [550, 0.06, 0.14], [660, 0.12, 0.11], [880, 0.18, 0.08]] as const) {
    const osc = ctx.createOscillator(); const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain(); const g = ctx.createGain();
    lfo.frequency.setValueAtTime(5, now); lfoG.gain.setValueAtTime(6, now);
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + delay);
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(vol, now + delay + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.75);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now + delay); lfo.start(now + delay);
    osc.stop(now + delay + 0.8); lfo.stop(now + delay + 0.8);
  }
}

function playCelebrationKnight() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  for (const [startFreq, endFreq, delay] of [[1300, 280, 0], [1500, 320, 0.18], [1700, 360, 0.36]] as const) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now + delay);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + 0.22);
    g.gain.setValueAtTime(0.25, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now + delay); osc.stop(now + delay + 0.3);
  }
}

function playCelebrationQueen() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  for (const [freq, vol, decay] of [
    [196, 0.20, 1.1], [294, 0.16, 1.0], [392, 0.14, 0.9], [494, 0.10, 0.8], [587, 0.07, 0.75],
  ] as const) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + decay + 0.05);
  }
}

/** Play the triumphant celebration sound for the given piece type. */
export function playCelebrationSound(piece: PieceType) {
  try {
    switch (piece) {
      case 'king':   playCelebrationKing();   break;
      case 'pawn':   playCelebrationPawn();   break;
      case 'rook':   playCelebrationRook();   break;
      case 'bishop': playCelebrationBishop(); break;
      case 'knight': playCelebrationKnight(); break;
      case 'queen':  playCelebrationQueen();  break;
    }
  } catch { /* AudioContext unavailable */ }
}

// ─── Utility sounds ───────────────────────────────────────────────────────────

export function playWompSound() {
  try {
    const ctx = getCtx();
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
  } catch { /* AudioContext unavailable */ }
}

export function playCrunchSound() {
  try {
    const ctx = getCtx();
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
  } catch { /* AudioContext unavailable */ }
}

/** Brief air-sweep: bandpass-filtered noise rising in frequency. */
export function playWhooshSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const dur = 0.28;
    const bufSize = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + dur - 0.03);
    filter.Q.setValueAtTime(2.5, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.02);
  } catch { /* AudioContext unavailable */ }
}

// ─── Chess / Free Play sounds ─────────────────────────────────────────────────

/**
 * Two-tone warning ping — tense minor-second interval.
 * Plays when the player's king is put in check.
 */
export function playChessCheck() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    for (const [freq, delay] of [[880, 0], [932, 0.13]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.26, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.36);
    }
  } catch { /* AudioContext unavailable */ }
}

/**
 * Descending power chord — weighty and conclusive.
 * Plays when the game ends in checkmate.
 */
export function playChessCheckmate() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    for (const [freq, delay, vol, decay] of [
      [523, 0,    0.28, 0.85],
      [392, 0.12, 0.22, 0.80],
      [261, 0.26, 0.30, 1.05],
      [196, 0.42, 0.18, 0.75],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + decay + 0.05);
    }
  } catch { /* AudioContext unavailable */ }
}

/**
 * Rising pawn-arpeggio — the pawn reaches the other side and transforms.
 * Plays when a pawn is promoted.
 */
export function playChessPromotion() {
  try {
    playCelebrationPawn();
  } catch { /* AudioContext unavailable */ }
}
