// Chase the slime (#/lab/chase/N): the slime moves now. Rules in src/core/chase.ts.
//
// Tap a friend to see where it can go (its dots), then tap a dot (or drag the
// friend there). Then the slime takes one step to a square no friend watches.
// Friends keep their magic showing, faint, on the slime's squares, as in
// bedtime. Checkmate: the magic flies and the slime pops. A friend left next to
// the slime with nobody protecting it gets eaten, and a slime with nowhere to
// go that is not hit sticks its tongue out; either way that move is undone.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  asMate, bestMove, eatenBy, friendMoves, friendsIn, moveFriend, mustParseChase, slimeChoice, solveChase, statusOf,
  type ChaseState, type ChaseTable,
} from '../core/chase.ts';
import { beams as beamsOf } from '../core/mate.ts';
import type { Beam } from '../core/mate.ts';
import type { Friend } from '../core/types.ts';
import { AgainIcon, FriendArt, GoIcon, HandIcon, HomeIcon, PALETTE, RockArt } from './art.tsx';
import { Confetti } from './Confetti.tsx';
import { HIGH_CONTRAST } from '../content/looks.ts';
import { highContrast } from './senses.ts';
import { BeamArt, beamPath } from './SlimeScreen.tsx';
import { SlimeArt, Sparkle, type SlimeMood } from './slime.tsx';
import { sfx, wakeAudio } from './sound.ts';
import { useTimers } from './timers.ts';

const LIGHT = '#eaf7d8';
const DARK = '#bfe6a4';
const HINT_MS = 7000;
const EAGER_HINT_MS = 2500;
/** How long a friend or the slime takes to slide to its new square (matches .chase-piece in the CSS). */
const SLIDE_MS = 340;
const SLIME_THINK_MS = 380;
const BEAM_STAGGER_MS = 110;
const BEAM_DRAW_MS = 380;
const UNDO_MS = 1700;

/** What the slime is doing right now. */
type Act = 'none' | 'eat' | 'nyah' | 'zap' | 'hit' | 'pop';

export function ChaseScreen({ grid, sky, eagerHint, top, onWin, onNext, onHome }: {
  grid: readonly string[];
  sky: string;
  eagerHint?: boolean;
  top?: ReactNode;
  onWin?: (own: boolean) => void;
  onNext?: () => void;
  onHome: () => void;
}) {
  const pz = useMemo(() => mustParseChase(grid), [grid]);
  const later = useTimers();
  const tableRef = useRef<ChaseTable | null>(null);
  const table = () => (tableRef.current ??= solveChase(pz));
  const [s, setS] = useState<ChaseState>(pz.start);
  const [prev, setPrev] = useState<ChaseState | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [act, setAct] = useState<Act>('none');
  const [zap, setZap] = useState<{ beams: Beam[]; friends: Friend[] } | null>(null);
  const [eaten, setEaten] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [showGo, setShowGo] = useState(false);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [idleKey, setIdleKey] = useState(0);
  const [said, setSaid] = useState('');
  const layer = useRef<HTMLDivElement>(null);
  const pressed = useRef<number | null>(null);
  const hinted = useRef(false);

  // Work the endgame table out just after the first paint, so the board shows at once.
  useEffect(() => {
    const t = window.setTimeout(() => { table(); }, 60);
    return () => window.clearTimeout(t);
  }, [pz]); // eslint-disable-line react-hooks/exhaustive-deps

  const friends = friendsIn(pz, s);
  const mate = asMate(pz, s);
  const status = statusOf(pz, s);

  const cellStyle = (pos: number): CSSProperties => ({
    left: `${((pos % pz.cols) * 100) / pz.cols}%`,
    top: `${(Math.floor(pos / pz.cols) * 100) / pz.rows}%`,
    width: `${100 / pz.cols}%`,
    height: `${100 / pz.rows}%`,
  });

  const squareAt = (x: number, y: number): number | null => {
    const box = layer.current?.getBoundingClientRect();
    if (!box) return null;
    const c = Math.floor(((x - box.left) / box.width) * pz.cols);
    const r = Math.floor(((y - box.top) / box.height) * pz.rows);
    if (r < 0 || r >= pz.rows || c < 0 || c >= pz.cols) return null;
    return r * pz.cols + c;
  };

  useEffect(() => {
    if (won || busy) return;
    const t = window.setTimeout(() => {
      const way = bestMove(pz, table(), s);
      if (way) {
        hinted.current = true;
        setHint(way);
      }
    }, eagerHint && !prev ? EAGER_HINT_MS : HINT_MS);
    return () => window.clearTimeout(t);
  }, [won, busy, s, idleKey, eagerHint]); // eslint-disable-line react-hooks/exhaustive-deps

  const touched = () => {
    wakeAudio();
    setHint(null);
    setIdleKey((n) => n + 1);
  };

  /** Back to the position before the kid's last move. */
  const undo = (to: ChaseState) => {
    setS(to);
    setAct('none');
    setEaten(null);
    setBusy(false);
    setSaid('');
    sfx.rewind();
  };

  const win = (after: ChaseState) => {
    const fr = friendsIn(pz, after);
    const list = beamsOf(asMate(pz, after), fr);
    setZap({ beams: list, friends: fr });
    setAct('zap');
    onWin?.(!hinted.current);
    list.slice(0, 10).forEach((_, i) => later(() => sfx.zap(i), i * BEAM_STAGGER_MS + 60));
    const land = list.length * BEAM_STAGGER_MS + BEAM_DRAW_MS;
    later(() => setAct('hit'), land);
    later(() => {
      setAct('pop');
      sfx.splat();
      setSaid('Checkmate! The slime pops.');
    }, land + 650);
    later(() => {
      setWon(true);
      sfx.win();
    }, land + 1150);
    later(() => setShowGo(true), land + 2350);
  };

  const move = (i: number, to: number) => {
    const before = s;
    const after = moveFriend(s, i, to);
    setPicked(null);
    setHint(null);
    setPrev(before);
    setS(after);
    setBusy(true);
    sfx.hop(pz.kinds[i]);
    const st = statusOf(pz, after);
    if (st === 'mate') {
      later(() => win(after), SLIDE_MS + 150);
      return;
    }
    if (st === 'stalemate') {
      later(() => {
        setAct('nyah');
        sfx.raspberry();
        setSaid('Stalemate: the slime is not hit, but cannot move.');
      }, SLIDE_MS + 200);
      later(() => undo(before), SLIDE_MS + 200 + UNDO_MS);
      return;
    }
    later(() => {
      const step = slimeChoice(pz, table(), after);
      if (step === null) return; // cannot happen: no steps is mate or stalemate
      const victim = eatenBy(after, step);
      setS({ slime: step, friends: after.friends });
      if (victim >= 0) {
        setAct('eat');
        sfx.gobble();
        later(() => setEaten(victim), SLIDE_MS - 60);
        setSaid('The slime eats a friend nobody protects.');
        later(() => undo(before), SLIDE_MS + UNDO_MS);
        return;
      }
      sfx.hop('king');
      later(() => setBusy(false), SLIDE_MS);
    }, SLIDE_MS + SLIME_THINK_MS);
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (won || busy || e.button > 0) return;
    const pos = squareAt(e.clientX, e.clientY);
    if (pos === null) return;
    touched();
    const f = s.friends.indexOf(pos);
    if (f >= 0) {
      pressed.current = f;
      setPicked((p) => (p === f ? null : f));
      sfx.select(pz.kinds[f]);
      return;
    }
    pressed.current = null;
    if (picked !== null && friendMoves(pz, s, picked).includes(pos)) {
      move(picked, pos);
      return;
    }
    sfx.nudge();
  };

  // Drag: let go of a pressed friend over one of its dots.
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    const f = pressed.current;
    pressed.current = null;
    if (f === null || won || busy) return;
    const pos = squareAt(e.clientX, e.clientY);
    if (pos === null || pos === s.friends[f]) return;
    if (friendMoves(pz, s, f).includes(pos)) move(f, pos);
  };

  const again = () => {
    wakeAudio();
    if (busy && !won) return;
    later.clear();
    setS(pz.start);
    setPrev(null);
    setPicked(null);
    setAct('none');
    setZap(null);
    setEaten(null);
    setWon(false);
    setShowGo(false);
    setBusy(false);
    setHint(null);
    setSaid('');
    sfx.rewind();
  };

  const contrast = highContrast() ? HIGH_CONTRAST : null;
  const dots = picked !== null && !busy ? friendMoves(pz, s, picked) : [];
  const standing = !busy && !won ? beamsOf(mate, friends) : [];
  const standingSparks = [...new Set(standing.map((b) => b.to))];
  let mood: SlimeMood = status === 'check' ? 'scared' : 'idle';
  if (act === 'eat') mood = 'smug';
  if (act === 'nyah') mood = 'nyah';
  if (act === 'zap') mood = 'scared';
  if (act === 'hit') mood = 'hit';
  const slimeAnim = act === 'nyah' ? 'nyah' : act === 'hit' ? 'flinch' : act === 'eat' ? 'dance' : 'bob';
  const hits = zap ? [...new Set(zap.beams.map((b) => b.to))] : [];

  return (
    <div className="screen play bedtime slime-lab chase" style={{ background: sky }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="dots-row">{top}</div>
        <button className="round-btn" onClick={again} aria-label="Start over">
          <AgainIcon className="icon" />
        </button>
      </div>

      <div className="board-wrap">
        <div
          className="board"
          style={{ '--rows': pz.rows, '--cols': pz.cols, ...(contrast ? { '--rim': contrast.rim, '--rim-dark': contrast.rimDark } : {}) } as CSSProperties}
        >
          <div ref={layer} className="board-layer" onPointerDown={down} onPointerUp={up} onContextMenu={(e) => e.preventDefault()}>
            <div className="squares">
              {Array.from({ length: pz.rows * pz.cols }, (_, pos) => {
                const r = Math.floor(pos / pz.cols);
                const c = pos % pz.cols;
                return (
                  <div key={pos} className="square" style={{ ...cellStyle(pos), background: (r + c) % 2 ? contrast?.dark ?? DARK : contrast?.light ?? LIGHT }}>
                    {pz.rocks[pos] && <RockArt className="fill" at={pos} />}
                  </div>
                );
              })}
            </div>

            <svg className="zap-layer" viewBox={`0 0 ${pz.cols * 100} ${pz.rows * 100}`} aria-hidden="true">
              {standing.map((b, i) => {
                const f = friends[b.friend];
                return <path key={`st${i}`} d={beamPath(mate, f.at, b.to, f.kind)} className={`beam-preview standing ${f.kind === 'knight' ? 'lob' : ''}`} stroke={PALETTE[f.kind].dark} />;
              })}
              {zap?.beams.map((b, i) => (
                <BeamArt key={`b${i}`} p={mate} from={zap.friends[b.friend].at} to={b.to} kind={zap.friends[b.friend].kind} delay={i * BEAM_STAGGER_MS} />
              ))}
            </svg>

            {act !== 'pop' && !won && (
              <div className={`friend chase-piece ${act === 'eat' ? 'on-top' : ''}`} style={cellStyle(s.slime)}>
                <div key={`s-${act}`} className={`friend-body ${slimeAnim}`}>
                  <SlimeArt mood={mood} className="fill" />
                </div>
              </div>
            )}
            {act === 'pop' && (
              <div className="friend" style={cellStyle(s.slime)}>
                {Array.from({ length: 10 }, (_, i) => {
                  const a = (i / 10) * Math.PI * 2;
                  return <span key={i} className="splat-drop" style={{ '--dx': `${Math.cos(a) * 120}%`, '--dy': `${Math.sin(a) * 120}%` } as CSSProperties} />;
                })}
                <Sparkle className="fill splat-star" />
              </div>
            )}

            {friends.map((f, i) => (
              <div key={`f${i}`} className={`friend chase-piece ${eaten === i ? 'slimed' : ''}`} style={cellStyle(f.at)}>
                <div className={`friend-body ${won ? 'dance' : picked === i ? 'bob chase-picked' : ''}`}>
                  <FriendArt kind={f.kind} mood={won ? 'wow' : 'happy'} className="fill" />
                </div>
              </div>
            ))}

            {dots.map((pos) => (
              <div key={`d${pos}`} className="hop-spot" style={cellStyle(pos)}>
                <div className="hop-dot" style={{ '--dot': PALETTE[pz.kinds[picked!]].fill, '--dot-dark': PALETTE[pz.kinds[picked!]].dark } as CSSProperties} />
              </div>
            ))}

            {(act === 'hit' || act === 'pop') && hits.map((pos) => (
              <div key={`h${pos}`} className={`hit-spark ${pos === s.slime ? 'on-slime' : ''}`} style={cellStyle(pos)}>
                <Sparkle className="fill" />
              </div>
            ))}
            {standingSparks.map((pos) => (
              <div key={`ss${pos}`} className="hit-spark preview-spark standing" style={cellStyle(pos)}>
                <Sparkle className="fill" />
              </div>
            ))}

            {hint && (
              <>
                <div className="hint" style={cellStyle(s.friends[hint[0]])}>
                  <div className="hint-ripple" />
                  <HandIcon className="hint-hand" />
                </div>
                <div className="hop-spot" style={cellStyle(hint[1])}>
                  <div className="hop-ring" style={{ '--dot': PALETTE[pz.kinds[hint[0]]].fill, '--dot-dark': PALETTE[pz.kinds[hint[0]]].dark } as CSSProperties} />
                </div>
              </>
            )}
          </div>
        </div>
        {won && <Confetti />}
        <div className="sr-status" role="status" aria-live="polite">{said}</div>
      </div>

      <div className="bottombar">
        {showGo && (
          <button
            className="go-btn"
            onClick={() => { sfx.tap(); if (onNext) onNext(); else again(); }}
            aria-label={onNext ? 'Next puzzle' : 'Play again'}
          >
            {onNext ? <GoIcon className="icon-lg" /> : <AgainIcon className="icon-lg invert" />}
          </button>
        )}
      </div>
    </div>
  );
}
