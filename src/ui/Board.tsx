import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { TreatKind } from '../content/worlds.ts';
import type { Friend, GameState, Kind, Puzzle } from '../core/types.ts';
import { FriendArt, HandIcon, PALETTE, RockArt, TreatArt } from './art.tsx';
import { moveDuration, moveKeyframes, REWIND_MS } from './motion.ts';

export type FriendMood = 'idle' | 'confused' | 'dance';

export interface BoardProps {
  puzzle: Puzzle;
  state: GameState;
  treat: TreatKind;
  selected: number | null;
  /** Squares the selected friend can move to (shown as glowing dots). */
  hops: readonly number[];
  /** Square the hint hand points at. */
  hint: number | null;
  mood: FriendMood;
  /** Treat being eaten right now, and how long until the friend arrives. */
  gulp: { index: number; delay: number } | null;
  /** 'rewind' makes everyone glide back to the start. */
  motion: 'normal' | 'rewind';
  /** Bumps each time the whole puzzle resets, so treats pop back in. */
  round: number;
  /** Bumps on a tap that did nothing, so the dots wave hello. */
  nudgeKey: number;
  /** Bumps when a friend is tapped, so it does a little jump. */
  pokeKey: number;
  onPress: (pos: number) => void;
  onRelease: (pos: number) => void;
}

const LIGHT = '#eaf7d8';
const DARK = '#bfe6a4';

export function Board(props: BoardProps) {
  const { puzzle, state, treat, selected, hops, hint, mood, gulp, round, nudgeKey } = props;
  const { rows, cols } = puzzle;
  const layer = useRef<HTMLDivElement>(null);

  const cellStyle = (pos: number): CSSProperties => ({
    left: `${((pos % cols) * 100) / cols}%`,
    top: `${(Math.floor(pos / cols) * 100) / rows}%`,
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
  });

  const posFromEvent = (e: PointerEvent): number | null => {
    const box = layer.current?.getBoundingClientRect();
    if (!box) return null;
    const c = Math.floor(((e.clientX - box.left) / box.width) * cols);
    const r = Math.floor(((e.clientY - box.top) / box.height) * rows);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    return r * cols + c;
  };

  // One finger at a time, tracked by the board itself. The browser's
  // "primary" pointer is not enough: a thumb resting on the edge of a tablet
  // becomes primary and would make every tap on the board be ignored.
  const active = useRef<number | null>(null);
  useEffect(() => {
    // Safety net for when capture failed and the finger lifted off the board.
    const end = (e: globalThis.PointerEvent) => {
      if (e.pointerId === active.current) active.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0) return; // right or middle mouse button
    if (active.current !== null) return; // a second finger or a palm while one is down
    e.preventDefault();
    active.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers refuse capture for synthetic events; taps still work.
    }
    const pos = posFromEvent(e);
    if (pos !== null) props.onPress(pos);
  };

  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== active.current) return;
    active.current = null;
    const pos = posFromEvent(e);
    if (pos !== null) props.onRelease(pos);
  };

  // The browser took the touch away (a system gesture, an alert, a lost
  // capture): forget it so the next tap works, but do not count it as a drop.
  const cancel = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === active.current) active.current = null;
  };

  const dotColor = selected !== null && state.friends[selected] ? PALETTE[state.friends[selected].kind] : PALETTE.king;
  const treatSquares = new Set(puzzle.treats.filter((_, i) => (state.left >> i) & 1));

  return (
    <div
      className="board"
      style={{ '--rows': rows, '--cols': cols } as CSSProperties}
    >
      <div
        ref={layer}
        className="board-layer"
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="squares">
          {Array.from({ length: rows * cols }, (_, pos) => {
            const r = Math.floor(pos / cols);
            const c = pos % cols;
            return (
              <div key={`sq${pos}`} className="square" style={{ ...cellStyle(pos), background: (r + c) % 2 ? DARK : LIGHT }}>
                {puzzle.rocks[pos] && <RockArt className="fill" />}
              </div>
            );
          })}
        </div>

        {puzzle.treats.map((sq, i) => {
          const present = (state.left >> i) & 1;
          const eating = !present && gulp?.index === i;
          if (!present && !eating) return null;
          const cls = eating ? 'treat gulp' : round > 0 ? 'treat pop-in' : 'treat';
          const style = { ...cellStyle(sq), animationDelay: eating ? `${gulp!.delay}ms` : undefined };
          return (
            <div key={`t${round}-${i}`} className={cls} style={style}>
              <div className="treat-bob" style={{ animationDelay: `${(i * 173) % 900}ms` }}>
                <TreatArt kind={treat} className="fill" />
              </div>
              {eating && <Sparkles delay={gulp!.delay} />}
            </div>
          );
        })}

        {hops.map((sq) => (
          <div key={`h${sq}-${nudgeKey}`} className={nudgeKey ? 'hop-spot nudge' : 'hop-spot'} style={cellStyle(sq)}>
            <div
              className={treatSquares.has(sq) ? 'hop-ring' : 'hop-dot'}
              style={{ '--dot': dotColor.fill, '--dot-dark': dotColor.dark } as CSSProperties}
            />
          </div>
        ))}

        {state.friends.map((f, i) => (
          <FriendToken
            key={i}
            friend={f}
            cols={cols}
            style={cellStyle(f.at)}
            selected={i === selected && state.friends.length > 1}
            mood={mood}
            rewind={props.motion === 'rewind'}
            poke={i === selected ? props.pokeKey : 0}
          />
        ))}

        {hint !== null && (
          <div className="hint" style={cellStyle(hint)}>
            <div className="hint-ripple" />
            <HandIcon className="hint-hand" />
          </div>
        )}
      </div>
    </div>
  );
}

function FriendToken(props: {
  friend: Friend;
  cols: number;
  style: CSSProperties;
  selected: boolean;
  mood: FriendMood;
  rewind: boolean;
  poke: number;
}) {
  const { friend, cols, rewind } = props;
  const outer = useRef<HTMLDivElement>(null);
  const lastAt = useRef(friend.at);
  // The pawn should travel as a pawn and only become a queen once it lands.
  const [shownKind, setShownKind] = useState<Kind>(friend.kind);
  const [sparkle, setSparkle] = useState(0);

  useLayoutEffect(() => {
    const from = lastAt.current;
    lastAt.current = friend.at;
    if (from === friend.at || !outer.current) return;
    const dc = (from % cols) - (friend.at % cols);
    const dr = Math.floor(from / cols) - Math.floor(friend.at / cols);
    const dist = Math.max(Math.abs(dc), Math.abs(dr));
    const duration = rewind ? REWIND_MS : moveDuration(shownKind, dist);
    outer.current.animate(moveKeyframes(shownKind, dc, dr, rewind), {
      duration,
      easing: 'cubic-bezier(.45,0,.25,1)',
    });
  }, [friend.at]);

  useEffect(() => {
    if (friend.kind === shownKind) return;
    if (rewind) {
      setShownKind(friend.kind);
      return;
    }
    const t = setTimeout(() => {
      setShownKind(friend.kind);
      setSparkle((n) => n + 1);
    }, moveDuration(shownKind, 1));
    return () => clearTimeout(t);
  }, [friend.kind, shownKind, rewind]);

  const moodClass = props.mood === 'dance' ? 'dance' : props.mood === 'confused' ? 'confused' : props.selected ? 'bob' : '';
  return (
    <div ref={outer} className="friend" style={props.style}>
      {props.selected && <div className="friend-glow" style={{ background: PALETTE[shownKind].fill }} />}
      <div key={`${props.poke}-${moodClass}`} className={`friend-body ${moodClass} ${props.poke ? 'poke' : ''}`}>
        <FriendArt kind={shownKind} mood={props.mood === 'dance' ? 'wow' : 'happy'} className="fill" />
      </div>
      {sparkle > 0 && <Sparkles key={sparkle} delay={0} big />}
    </div>
  );
}

const SPARK_COLORS = ['#facc15', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#a78bfa'];

function Sparkles({ delay, big = false }: { delay: number; big?: boolean }) {
  const count = big ? 12 : 7;
  return (
    <div className="sparkles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = big ? 90 : 60;
        return (
          <span
            key={i}
            className="spark"
            style={{
              background: SPARK_COLORS[i % SPARK_COLORS.length],
              animationDelay: `${delay}ms`,
              '--sx': `${Math.cos(angle) * dist}%`,
              '--sy': `${Math.sin(angle) * dist}%`,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}
