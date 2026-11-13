// Bedtime puzzle play screen. Friends wait in a tray; drag one onto the board
// (or tap it, then tap a square). While a friend is in the air, the squares
// around the grumpy king that it would watch light up, so a kid sees what a
// drop does before letting go. Rules live in src/core/mate.ts.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  canPlace, drop, escapes, friendsOf, kingZone, mateStatus, mustParseMate, solveMate,
  type MatePuzzle, type Placement,
} from '../core/mate.ts';
import type { Friend } from '../core/types.ts';
import { AgainIcon, FriendArt, GoIcon, GRUMPY, HandIcon, HomeIcon, RockArt } from './art.tsx';
import { Confetti } from './Confetti.tsx';
import { HIGH_CONTRAST } from '../content/looks.ts';
import { highContrast } from './senses.ts';
import { sfx, wakeAudio } from './sound.ts';
import { useTimers } from './timers.ts';

const LIGHT = '#eaf7d8';
const DARK = '#bfe6a4';
const HINT_MS = 7000;
const EAGER_HINT_MS = 2500;
const REWIND_AFTER_MS = 1300;
/** A press that moves less than this is a tap, not a drag. */
const DRAG_PX = 10;

interface Drag {
  tray: number;
  pointerId: number;
  /** Where the press started, to tell a tap from a drag. */
  x0: number;
  y0: number;
  x: number;
  y: number;
  moved: boolean;
  touch: boolean;
  from: 'tray' | 'board';
  /** Square the friend would land on, or null when off the board or not allowed. */
  over: number | null;
}

/** Squares around the king (and his own square) that are closed to him. */
function closedSquares(p: MatePuzzle, friends: readonly Friend[]): { zone: Set<number>; check: boolean } {
  const open = new Set(escapes(p, friends));
  const zone = new Set(kingZone(p).filter((pos) => !p.rocks[pos] && !open.has(pos)));
  const status = mateStatus(p, friends);
  return { zone, check: status === 'check' || status === 'mate' };
}

export function BedtimeScreen({ grid, tray, sky, eagerHint, dots, onWin, onNext, onHome }: {
  grid: readonly string[];
  tray: string;
  sky: string;
  eagerHint?: boolean;
  dots?: ReactNode;
  /** `own` is true when no hint hand showed since the puzzle was opened. */
  onWin?: (own: boolean) => void;
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
  const [shoo, setShoo] = useState(0);
  const [hint, setHint] = useState<Placement | null>(null);
  const [idleKey, setIdleKey] = useState(0);
  const layer = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const hinted = useRef(false);
  dragRef.current = drag;

  const friends = friendsOf(p, placed);
  const status = mateStatus(p, friends);
  const now = closedSquares(p, friends);

  // What the board would look like with the friend in the air dropped where it hovers.
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

  // Idle hint: a hand points at where the next friend could go, and that
  // friend bounces in the tray.
  // Not while a friend is held: the hand is not drawn during a drag, so a hint
  // that arrived then would count against the kid without ever being seen.
  const dragging = drag !== null;
  useEffect(() => {
    if (won || busy || dragging) return;
    const t = window.setTimeout(() => {
      const way = solveMate(p, placed, 1)[0];
      if (way && way.length > 0) {
        hinted.current = true;
        setHint(way[0]);
      }
    }, eagerHint && placed.length === 0 ? EAGER_HINT_MS : HINT_MS);
    return () => window.clearTimeout(t);
  }, [won, busy, dragging, p, placed, eagerHint, idleKey]);

  const touched = () => {
    wakeAudio();
    setHint(null);
    setIdleKey((n) => n + 1);
  };

  const place = (t: number, at: number) => {
    const res = drop(p, placed, t, at);
    const after = friendsOf(p, res.placed);
    const nowClosed = closedSquares(p, after);
    setPlaced(res.placed);
    setChosen(null);
    sfx.hop(p.tray[t]);

    // A rising chime for each square that just closed around the king.
    const fresh = [...nowClosed.zone].filter((pos) => !now.zone.has(pos));
    fresh.forEach((_, i) => later(() => sfx.cover(i), 120 + 110 * i));

    if (res.shooed.length > 0) {
      setShoo((k) => k + 1);
      later(() => sfx.shoo(), 150);
      return;
    }
    if (mateStatus(p, after) === 'mate') {
      setWon(true);
      setBusy(true);
      setHint(null);
      later(() => sfx.win(), 450);
      onWin?.(!hinted.current);
      later(() => setShowGo(true), 1500);
      return;
    }
    if (res.placed.length === p.tray.length) {
      // Everyone is on the board and he is still awake: float them all home.
      setBusy(true);
      later(() => {
        setPlaced([]);
        setHint(null);
        setRound((r) => r + 1);
        setBusy(false);
        sfx.rewind();
      }, REWIND_AFTER_MS);
    }
  };

  // Pointer tracking while a friend is held. One finger at a time.
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const moved = d.moved || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_PX;
      // On touch the friend floats above the finger, so it lands where it is drawn.
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
        setPlaced((pls) => pls.filter((pl) => pl.tray !== d.tray)); // dragged off: back to the tray
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
    // Listeners are rebound when the drag starts or the board changes.
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
    later.clear(); // nothing an old win had planned may land on the fresh board
    setPlaced([]);
    setChosen(null);
    setWon(false);
    setShowGo(false);
    setBusy(false);
    setHint(null);
    setRound((r) => r + 1);
    sfx.rewind();
  };

  // The grown-up high-contrast board reaches this board too (it draws its own squares).
  const contrast = highContrast() ? HIGH_CONTRAST : null;
  const placedTrays = new Set(placed.map((pl) => pl.tray));
  const kingMood = won ? 'sleepy' : status === 'check' ? 'wow' : 'grumpy';
  const kingAnim = won ? '' : status === 'stalemate' && placed.length > 0 ? 'confused' : 'bob';
  const ghost = drag?.moved && drag.over !== null ? drag.over : null;
  const draggingFromBoard = drag?.moved && drag.from === 'board' ? drag.tray : null;

  return (
    <div className="screen play bedtime" style={{ background: sky }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="dots-row">{dots}</div>
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
                    {p.rocks[pos] && <RockArt className="fill" />}
                  </div>
                );
              })}
              {[...shown.zone].map((pos) => (
                <div
                  key={`z${pos}`}
                  className={`watched ${preview && !before.has(pos) ? 'fresh' : ''} ${won ? 'tucked' : ''}`}
                  style={cellStyle(pos)}
                />
              ))}
              {shown.check && <div className={`watched check ${won ? 'tucked' : ''}`} style={cellStyle(p.king)} />}
            </div>

            <div className="friend" style={cellStyle(p.king)}>
              <div key={`k${shoo}-${kingAnim}`} className={`friend-body ${shoo ? 'confused' : kingAnim}`}>
                <FriendArt kind="king" colors={GRUMPY} mood={kingMood} className="fill" />
              </div>
            </div>

            {p.fixed.map((f) => (
              <div key={`f${f.at}`} className="friend" style={cellStyle(f.at)}>
                <div className="friend-body"><FriendArt kind={f.kind} className="fill" /></div>
              </div>
            ))}

            {placed.map((pl) => (
              <div
                key={`p${round}-${pl.tray}-${pl.at}`}
                className={`friend ${draggingFromBoard === pl.tray ? 'lifted-away' : ''}`}
                style={cellStyle(pl.at)}
              >
                <div className={`friend-body ${won ? 'dance' : 'landed'}`}>
                  <FriendArt kind={p.tray[pl.tray]} mood={won ? 'wow' : 'happy'} className="fill" />
                </div>
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
