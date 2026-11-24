// Slime lab (#/lab/slime): the bedtime puzzles, explained with no words.
//
// A slime sits where the grumpy king was; same rules (src/core/mate.ts). When
// every friend is on the board, each one fires magic at the slime's patch: a
// straight sparkly beam along its lines, or a lobbed ball for the knight.
// Sparkles land on every square a beam reaches. Then:
//   - every square hit, the slime too: it pops (the win);
//   - a square around it left open: the slime oozes a copy onto each open square
//     (if it was hit too, it leaves its own square: only the copies are left);
//   - every square around it hit but not the slime: it sticks its tongue out (stalemate).
// A friend dropped right next to the slime with nobody protecting it gets
// gobbled (the slime hops onto it, chomps, hops home and leaves goo; the friend goes back to the tray). One that is protected: the slime reaches
// for it and bonks off the magic bubble its protector throws around it.
//
// Variants: 'glow' lights the squares around the slime while a friend is held,
// as bedtime does; 'beams' shows the held friend's own magic instead.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  beams as beamsOf, canPlace, defenders, drop, escapes, friendsOf, kingZone, mateStatus, mustParseMate, solveMate,
  touchesKing, type Beam, type MatePuzzle, type MateStatus, type Placement,
} from '../core/mate.ts';
import type { Friend, Kind } from '../core/types.ts';
import { AgainIcon, FriendArt, GoIcon, HandIcon, HomeIcon, PALETTE, RockArt } from './art.tsx';
import { Confetti } from './Confetti.tsx';
import { HIGH_CONTRAST } from '../content/looks.ts';
import { highContrast } from './senses.ts';
import { GooCover, SlimeArt, Sparkle, type SlimeMood } from './slime.tsx';
import { sfx, wakeAudio } from './sound.ts';
import { useTimers } from './timers.ts';

export type SlimeVariant = 'glow' | 'beams';

const LIGHT = '#eaf7d8';
const DARK = '#bfe6a4';
const HINT_MS = 7000;
const EAGER_HINT_MS = 2500;
const DRAG_PX = 10;
/** Each beam starts a little after the one before. */
const BEAM_STAGGER_MS = 110;
const BEAM_DRAW_MS = 380;
const GOBBLE_MS = 1300;
const THWART_MS = 1650;
/** Thwart: when the lunging slime meets the protector's bubble. */
const BONK_MS = 950;
const AFTER_RESULT_MS = 2300;

interface Drag {
  tray: number;
  pointerId: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  moved: boolean;
  touch: boolean;
  from: 'tray' | 'board';
  over: number | null;
}

/** The magic show after the last friend lands. */
interface Zap {
  beams: Beam[];
  friends: Friend[];
  /** 1: beams fly. 2: sparkles land. 3: the slime answers. */
  stage: 1 | 2 | 3;
  result: MateStatus;
  hits: Set<number>;
  oozes: number[];
}

/** The slime reaching for a friend next to it. */
interface Reach {
  at: number;
  kind: 'gobble' | 'thwart';
  /** Thwart: the protector that zaps the goo. */
  by?: Friend;
}

function closedSquares(p: MatePuzzle, friends: readonly Friend[]): { zone: Set<number>; check: boolean } {
  const open = new Set(escapes(p, friends));
  const zone = new Set(kingZone(p).filter((pos) => !p.rocks[pos] && !open.has(pos)));
  const status = mateStatus(p, friends);
  return { zone, check: status === 'check' || status === 'mate' };
}

const center = (p: MatePuzzle, pos: number) => ({ x: (pos % p.cols) * 100 + 50, y: Math.floor(pos / p.cols) * 100 + 50 });

/** The path a beam takes: straight, or a high arc for the knight's lob. */
function beamPath(p: MatePuzzle, from: number, to: number, kind: Kind): string {
  const a = center(p, from);
  const b = center(p, to);
  if (kind !== 'knight') return `M${a.x} ${a.y} L${b.x} ${b.y}`;
  return `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 110} ${b.x} ${b.y}`;
}

function BeamArt({ p, from, to, kind, delay }: { p: MatePuzzle; from: number; to: number; kind: Kind; delay: number }) {
  const d = beamPath(p, from, to, kind);
  const style = { '--d': `${delay}ms` } as CSSProperties;
  if (kind === 'knight') {
    return (
      <g style={style}>
        <path d={d} className="lob-trail" stroke={PALETTE.knight.dark} />
        <path d={d} pathLength={1} className="lob-ball" stroke={PALETTE.knight.fill} />
        <path d={d} pathLength={1} className="lob-ball core" />
      </g>
    );
  }
  return (
    <g style={style}>
      <path d={d} pathLength={1} className="beam-glow" stroke={PALETTE[kind].dark} />
      <path d={d} pathLength={1} className="beam-core" stroke={PALETTE[kind].fill} />
      <path d={d} className="beam-sparkles" />
    </g>
  );
}

export function SlimeScreen({ grid, tray, sky, variant, eagerHint, top, onNext, onHome }: {
  grid: readonly string[];
  tray: string;
  sky: string;
  variant: SlimeVariant;
  eagerHint?: boolean;
  top?: ReactNode;
  onNext?: () => void;
  onHome: () => void;
}) {
  const p = useMemo(() => mustParseMate(grid, tray), [grid, tray]);
  const later = useTimers();
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [won, setWon] = useState(false);
  const [showGo, setShowGo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  const [zap, setZap] = useState<Zap | null>(null);
  const [reach, setReach] = useState<Reach | null>(null);
  const [bonked, setBonked] = useState(false);
  const [slimed, setSlimed] = useState<number[]>([]);
  const [hint, setHint] = useState<Placement | null>(null);
  const [idleKey, setIdleKey] = useState(0);
  const layer = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  const friends = friendsOf(p, placed);
  const status = mateStatus(p, friends);
  const now = closedSquares(p, friends);

  const lifted = drag ? placed.filter((pl) => pl.tray !== drag.tray) : placed;
  const preview = drag?.moved && drag.over !== null
    ? closedSquares(p, friendsOf(p, [...lifted, { tray: drag.tray, at: drag.over }]))
    : null;
  const shown = preview ?? (drag?.moved ? closedSquares(p, friendsOf(p, lifted)) : now);
  const before = drag?.moved ? closedSquares(p, friendsOf(p, lifted)).zone : now.zone;

  const cellStyle = (pos: number): CSSProperties => ({
    left: `${((pos % p.cols) * 100) / p.cols}%`,
    top: `${(Math.floor(pos / p.cols) * 100) / p.rows}%`,
    width: `${100 / p.cols}%`,
    height: `${100 / p.rows}%`,
  });

  const squareAt = (x: number, y: number): number | null => {
    const box = layer.current?.getBoundingClientRect();
    if (!box) return null;
    const c = Math.floor(((x - box.left) / box.width) * p.cols);
    const r = Math.floor(((y - box.top) / box.height) * p.rows);
    if (r < 0 || r >= p.rows || c < 0 || c >= p.cols) return null;
    return r * p.cols + c;
  };
  const cellPx = () => (layer.current?.getBoundingClientRect().width ?? 300) / p.cols;

  const dragging = drag !== null;
  useEffect(() => {
    if (won || busy || dragging) return;
    const t = window.setTimeout(() => {
      const way = solveMate(p, placed, 1)[0];
      if (way && way.length > 0) setHint(way[0]);
    }, eagerHint && placed.length === 0 ? EAGER_HINT_MS : HINT_MS);
    return () => window.clearTimeout(t);
  }, [won, busy, dragging, p, placed, eagerHint, idleKey]);

  const touched = () => {
    wakeAudio();
    setHint(null);
    setIdleKey((n) => n + 1);
  };

  const reset = () => {
    setZap(null);
    setReach(null);
    setSlimed([]);
    setPlaced([]);
    setHint(null);
    setRound((r) => r + 1);
    setBusy(false);
    sfx.rewind();
  };

  /** Every friend fires at the slime's patch, then the slime answers. */
  const showdown = (after: Friend[], result: MateStatus) => {
    setBusy(true);
    setHint(null);
    const list = beamsOf(p, after);
    const hits = new Set(list.map((b) => b.to));
    const oozes = result === 'mate' || result === 'stalemate' ? [] : escapes(p, after);
    setZap({ beams: list, friends: after, stage: 1, result, hits, oozes });
    list.slice(0, 10).forEach((_, i) => later(() => sfx.zap(i), i * BEAM_STAGGER_MS + 60));
    const land = list.length * BEAM_STAGGER_MS + BEAM_DRAW_MS;
    later(() => setZap((z) => (z ? { ...z, stage: 2 } : z)), land);
    const answer = land + 650;
    later(() => {
      setZap((z) => (z ? { ...z, stage: 3 } : z));
      if (result === 'mate') sfx.splat();
      else if (result === 'stalemate') sfx.raspberry();
      else sfx.gobble();
    }, answer);
    if (result === 'mate') {
      later(() => {
        setWon(true);
        sfx.win();
      }, answer + 500);
      later(() => setShowGo(true), answer + 1700);
    } else {
      later(reset, answer + AFTER_RESULT_MS);
    }
  };

  const place = (t: number, at: number) => {
    const res = drop(p, placed, t, at);
    setChosen(null);
    sfx.hop(p.tray[t]);

    if (res.shooed.length > 0) {
      // The slime gobbles each lonely friend next to it, one at a time.
      const attempted = [...placed.filter((pl) => pl.tray !== t), { tray: t, at }];
      setPlaced(attempted);
      setBusy(true);
      res.shooed.forEach((trayIndex, i) => {
        const target = attempted.find((pl) => pl.tray === trayIndex)!;
        const t0 = i * GOBBLE_MS + 250;
        later(() => { setReach({ at: target.at, kind: 'gobble' }); sfx.gobble(); }, t0);
        later(() => setSlimed((s) => [...s, trayIndex]), t0 + 330);
        later(() => setPlaced((cur) => cur.filter((pl) => pl.tray !== trayIndex)), t0 + 900);
        later(() => setReach(null), t0 + 1250);
      });
      // On the last drop the showdown follows with whoever is left, so the slime also oozes
      // onto every square it can still reach. Earlier drops just lose the friend: order matters.
      const lastDrop = attempted.length === p.tray.length;
      later(() => {
        setPlaced(res.placed);
        setSlimed([]);
        if (!lastDrop) {
          setBusy(false);
          return;
        }
        const left = friendsOf(p, res.placed);
        showdown(left, mateStatus(p, left));
      }, res.shooed.length * GOBBLE_MS + 250);
      return;
    }

    setPlaced(res.placed);
    const after = friendsOf(p, res.placed);
    const result = mateStatus(p, after);
    const finish = result === 'mate' || res.placed.length === p.tray.length;

    let wait = 0;
    if (touchesKing(p, at)) {
      // Protected: the protector throws a magic bubble around it, and the slime bonks off it.
      const me = after.findIndex((f) => f.at === at);
      const by = after[defenders(p, after, me)[0]];
      setBusy(true);
      later(() => { setReach({ at, kind: 'thwart', by }); sfx.zap(2); }, 100);
      later(() => { setBonked(true); sfx.boing(); }, 100 + BONK_MS);
      later(() => {
        setReach(null);
        setBonked(false);
        if (!finish) setBusy(false);
      }, THWART_MS);
      wait = THWART_MS + 150;
    }
    if (finish) later(() => showdown(after, result), wait + 250);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const moved = d.moved || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_PX;
      const lift = d.touch ? cellPx() * 0.75 : 0;
      const sq = squareAt(e.clientX, e.clientY - lift);
      const others = friendsOf(p, placed.filter((pl) => pl.tray !== d.tray));
      const over = sq !== null && canPlace(p, others, p.tray[d.tray], sq) ? sq : null;
      setDrag({ ...d, x: e.clientX, y: e.clientY, moved, over });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      setDrag(null);
      if (!d.moved) {
        if (d.from === 'tray') {
          setChosen((c) => (c === d.tray ? null : d.tray));
          sfx.select(p.tray[d.tray]);
        }
        return;
      }
      if (d.over !== null) place(d.tray, d.over);
      else if (d.from === 'board') {
        setPlaced((pls) => pls.filter((pl) => pl.tray !== d.tray));
        sfx.rewind();
      }
    };
    const cancel = (e: PointerEvent) => {
      if (e.pointerId === dragRef.current?.pointerId) setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [drag !== null, placed]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: ReactPointerEvent, t: number, from: 'tray' | 'board') => {
    if (won || busy || dragRef.current) return;
    if (e.button > 0) return;
    e.preventDefault();
    touched();
    const d: Drag = {
      tray: t, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      moved: false, touch: e.pointerType !== 'mouse', from, over: null,
    };
    dragRef.current = d;
    setDrag(d);
  };

  const boardDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (won || busy || dragRef.current || e.button > 0) return;
    const pos = squareAt(e.clientX, e.clientY);
    if (pos === null) return;
    const mine = placed.find((pl) => pl.at === pos);
    if (mine) {
      startDrag(e, mine.tray, 'board');
      return;
    }
    touched();
    if (chosen !== null && canPlace(p, friends, p.tray[chosen], pos)) {
      place(chosen, pos);
      return;
    }
    sfx.nudge();
  };

  const again = () => {
    wakeAudio();
    if (busy && !won) return;
    later.clear();
    setPlaced([]);
    setZap(null);
    setReach(null);
    setBonked(false);
    setSlimed([]);
    setChosen(null);
    setWon(false);
    setShowGo(false);
    setBusy(false);
    setHint(null);
    setRound((r) => r + 1);
    sfx.rewind();
  };

  const contrast = highContrast() ? HIGH_CONTRAST : null;
  const placedTrays = new Set(placed.map((pl) => pl.tray));
  const ghost = drag?.moved && drag.over !== null ? drag.over : null;
  const draggingFromBoard = drag?.moved && drag.from === 'board' ? drag.tray : null;

  const slimeHit = zap !== null && zap.stage >= 2 && zap.hits.has(p.king);
  const popped = zap?.stage === 3 && zap.result === 'mate';
  // Hit but with somewhere to go: the slime leaves its square for good; only the copies are left.
  const fled = zap?.stage === 3 && zap.result === 'check';
  let mood: SlimeMood = status === 'check' ? 'hit' : 'idle';
  if (reach) mood = bonked ? 'hit' : 'smug';
  if (zap) mood = zap.stage === 1 ? 'idle' : zap.stage === 2 ? (slimeHit ? 'hit' : 'smug') : zap.result === 'stalemate' ? 'nyah' : slimeHit ? 'hit' : 'smug';
  const slimeAnim = popped ? 'slime-pop' : fled ? 'split-away' : zap?.stage === 3 && zap.result === 'stalemate' ? 'nyah' : slimeHit && zap?.stage === 2 ? 'flinch' : reach?.kind === 'thwart' ? 'lunge' : reach ? 'slime-hop' : 'bob';
  const kr = Math.floor(p.king / p.cols);
  const kc = p.king % p.cols;
  const glowZone = variant === 'glow' && !zap && !won && !reach;
  // Beams variant: the held friend's own magic, from where it would land.
  const held = variant === 'beams' && drag?.moved && drag.over !== null ? friendsOf(p, [...lifted, { tray: drag.tray, at: drag.over }]) : null;
  const previewBeams = held ? beamsOf(p, held).filter((b) => b.friend === held.length - 1) : [];
  // Beams variant: friends already on the board keep their magic showing, faint (glow's lit squares do the same).
  const standingFriends = variant === 'beams' && !zap && !won && !reach ? friendsOf(p, lifted) : [];
  const standingBeams = beamsOf(p, standingFriends);
  const standingSparks = [...new Set(standingBeams.map((b) => b.to))].filter((pos) => !previewBeams.some((b) => b.to === pos));
  const reachBy = reach?.kind === 'thwart' ? 30 : 100;
  const lunge = reach
    ? { '--lx': `${((reach.at % p.cols) - kc) * reachBy}%`, '--ly': `${(Math.floor(reach.at / p.cols) - kr) * reachBy}%` } as CSSProperties
    : undefined;

  return (
    <div className="screen play bedtime slime-lab" style={{ background: sky }}>
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
          style={{ '--rows': p.rows, '--cols': p.cols, ...(contrast ? { '--rim': contrast.rim, '--rim-dark': contrast.rimDark } : {}) } as CSSProperties}
        >
          <div ref={layer} className="board-layer" onPointerDown={boardDown} onContextMenu={(e) => e.preventDefault()}>
            <div className="squares">
              {Array.from({ length: p.rows * p.cols }, (_, pos) => {
                const r = Math.floor(pos / p.cols);
                const c = pos % p.cols;
                return (
                  <div key={pos} className="square" style={{ ...cellStyle(pos), background: (r + c) % 2 ? contrast?.dark ?? DARK : contrast?.light ?? LIGHT }}>
                    {p.rocks[pos] && <RockArt className="fill" at={pos} />}
                  </div>
                );
              })}
              {glowZone && [...shown.zone].map((pos) => (
                <div key={`z${pos}`} className={`watched ${preview && !before.has(pos) ? 'fresh' : ''}`} style={cellStyle(pos)} />
              ))}
              {glowZone && shown.check && <div className="watched check" style={cellStyle(p.king)} />}
            </div>

            {/* Every beam, under the friends. */}
            <svg className="zap-layer" viewBox={`0 0 ${p.cols * 100} ${p.rows * 100}`} aria-hidden="true">
              {standingBeams.map((b, i) => {
                const f = standingFriends[b.friend];
                return (
                  <path key={`st${i}`} d={beamPath(p, f.at, b.to, f.kind)} className={`beam-preview standing ${f.kind === 'knight' ? 'lob' : ''}`} stroke={PALETTE[f.kind].dark} />
                );
              })}
              {held && previewBeams.map((b, i) => {
                const kind = held[b.friend].kind;
                const d = beamPath(p, held[b.friend].at, b.to, kind);
                return (
                  <g key={`pv${i}`}>
                    <path d={d} className={`beam-preview ${kind === 'knight' ? 'lob' : ''}`} stroke={PALETTE[kind].dark} />
                    {kind !== 'knight' && <path d={d} className="beam-preview-dots" />}
                  </g>
                );
              })}
              {zap?.beams.map((b, i) => (
                <BeamArt key={`b${i}`} p={p} from={zap.friends[b.friend].at} to={b.to} kind={zap.friends[b.friend].kind} delay={i * BEAM_STAGGER_MS} />
              ))}
            </svg>

            {!popped && !won && (
              <div className={`friend slime-at ${reach?.kind === 'gobble' ? 'on-top' : ''}`} style={cellStyle(p.king)}>
                <div key={`s${round}-${slimeAnim}`} className={`friend-body ${slimeAnim}`} style={lunge}>
                  <SlimeArt mood={mood} className="fill" />
                </div>
              </div>
            )}
            {popped && (
              <div className="friend" style={cellStyle(p.king)}>
                {Array.from({ length: 10 }, (_, i) => {
                  const a = (i / 10) * Math.PI * 2;
                  return <span key={i} className="splat-drop" style={{ '--dx': `${Math.cos(a) * 120}%`, '--dy': `${Math.sin(a) * 120}%` } as CSSProperties} />;
                })}
                <Sparkle className="fill splat-star" />
              </div>
            )}

            {zap?.stage === 3 && zap.oozes.map((pos) => (
              <div key={`o${pos}`} className="friend" style={cellStyle(pos)}>
                <div
                  className="ooze"
                  style={{ '--dx': `${(kc - (pos % p.cols)) * 100}%`, '--dy': `${(kr - Math.floor(pos / p.cols)) * 100}%` } as CSSProperties}
                >
                  <SlimeArt mood="smug" className="fill" />
                </div>
              </div>
            ))}

            {p.fixed.map((f) => (
              <div key={`f${f.at}`} className="friend" style={cellStyle(f.at)}>
                <div className={`friend-body ${won ? 'dance' : ''}`}><FriendArt kind={f.kind} mood={won ? 'wow' : 'happy'} className="fill" /></div>
              </div>
            ))}

            {placed.map((pl) => (
              <div
                key={`p${round}-${pl.tray}-${pl.at}`}
                className={`friend ${draggingFromBoard === pl.tray ? 'lifted-away' : ''} ${slimed.includes(pl.tray) ? 'slimed' : ''}`}
                style={cellStyle(pl.at)}
              >
                <div className={`friend-body ${won ? 'dance' : 'landed'}`}>
                  <FriendArt kind={p.tray[pl.tray]} mood={won ? 'wow' : 'happy'} className="fill" />
                </div>
              </div>
            ))}

            {/* The goo reaching for a friend, and a protector's zap, over everyone: next-door squares would hide them. */}
            <svg className="zap-layer over" viewBox={`0 0 ${p.cols * 100} ${p.rows * 100}`} aria-hidden="true">
              {reach?.kind === 'thwart' && reach.by && (
                <BeamArt p={p} from={reach.by.at} to={reach.at} kind={reach.by.kind} delay={0} />
              )}
            </svg>

            {zap && zap.stage >= 2 && [...zap.hits].filter((pos) => pos !== p.king || zap.stage === 2 || zap.result === 'mate' || zap.result === 'check').map((pos) => (
              <div key={`h${pos}`} className={`hit-spark ${pos === p.king ? 'on-slime' : ''}`} style={cellStyle(pos)}>
                <Sparkle className="fill" />
              </div>
            ))}
            {reach?.kind === 'gobble' && (
              <div key={`goo${reach.at}`} className="friend goo-left" style={cellStyle(reach.at)}>
                <GooCover className="fill" />
              </div>
            )}
            {reach?.kind === 'thwart' && reach.by && (
              <div
                key={`sh${reach.at}`}
                className="shield"
                style={{ ...cellStyle(reach.at), '--sh': PALETTE[reach.by.kind].dark, '--shf': PALETTE[reach.by.kind].fill } as CSSProperties}
              >
                <div className="shield-bubble" />
              </div>
            )}
            {standingSparks.map((pos) => (
              <div key={`ss${pos}`} className="hit-spark preview-spark standing" style={cellStyle(pos)}>
                <Sparkle className="fill" />
              </div>
            ))}
            {previewBeams.map((b) => (
              <div key={`ps${b.to}`} className="hit-spark preview-spark" style={cellStyle(b.to)}>
                <Sparkle className="fill" />
              </div>
            ))}

            {ghost !== null && drag && (
              <div className="friend ghost" style={cellStyle(ghost)}>
                <FriendArt kind={p.tray[drag.tray]} className="fill" />
              </div>
            )}

            {hint && !drag && (
              <div className="hint" style={cellStyle(hint.at)}>
                <div className="hint-ripple" />
                <HandIcon className="hint-hand" />
              </div>
            )}
          </div>
        </div>
        {won && <Confetti />}
      </div>

      <div className="bottombar">
        {showGo ? (
          <button
            className="go-btn"
            onClick={() => { sfx.tap(); if (onNext) onNext(); else again(); }}
            aria-label={onNext ? 'Next puzzle' : 'Play again'}
          >
            {onNext ? <GoIcon className="icon-lg" /> : <AgainIcon className="icon-lg invert" />}
          </button>
        ) : (
          <div className="tray">
            {p.tray.map((kind, t) => {
              const away = placedTrays.has(t) || (drag?.moved && drag.tray === t);
              const cls = ['tray-slot', chosen === t ? 'chosen' : '', hint?.tray === t && !drag ? 'hinted' : ''].join(' ');
              return (
                <div key={`${round}-${t}`} className={cls}>
                  {!away && (
                    <button
                      className="tray-friend"
                      onPointerDown={(e) => startDrag(e, t, 'tray')}
                      onContextMenu={(e) => e.preventDefault()}
                      aria-label={`Friend: ${kind}`}
                    >
                      <FriendArt kind={kind} className="fill" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {drag?.moved && (
        <div
          className="held"
          style={{
            left: drag.x,
            top: drag.touch ? drag.y - cellPx() * 0.75 : drag.y,
            width: cellPx() * 1.1,
            height: cellPx() * 1.1,
          }}
        >
          <FriendArt kind={p.tray[drag.tray]} className="fill" />
        </div>
      )}
    </div>
  );
}
