import { useEffect, useMemo, useRef, useState } from 'react';
import type { World } from '../content/worlds.ts';
import { makeFriendIntro } from '../core/intro.ts';
import { friendIndexAt } from '../core/rules.ts';
import { HomeIcon } from './art.tsx';
import { Board } from './Board.tsx';
import { moveDuration, reducedMotion } from './motion.ts';
import { sfx, wakeAudio } from './sound.ts';

const START_PAUSE_MS = 450;
const BETWEEN_HOPS_MS = 300;
const REDUCED_MOTION_PAUSE_MS = 440;

export function MeetFriend({ world, onMet, onHome }: {
  world: World;
  onMet: () => void;
  onHome: () => void;
}) {
  const intro = useMemo(() => makeFriendIntro(world.faces), [world.faces]);
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const pressedFriend = useRef<number | null>(null);
  const finishing = useRef(false);

  useEffect(() => {
    if (frame > intro.moves.length) return;

    if (frame === intro.moves.length) {
      const last = intro.moves[frame - 1];
      const before = intro.states[frame - 1].friends[last.friend];
      const wait = hopTime(before.at, last.to, before.kind, intro.puzzle.cols) + pauseTime();
      const timer = window.setTimeout(() => setReady(true), wait);
      return () => window.clearTimeout(timer);
    }

    const wait = frame === 0
      ? START_PAUSE_MS
      : previousHopTime(intro, frame) + pauseTime();
    const timer = window.setTimeout(() => {
      const move = intro.moves[frame];
      const friend = intro.states[frame].friends[move.friend];
      sfx.hop(friend.kind);
      setFrame((n) => n + 1);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [frame, intro]);

  const game = intro.states[frame];
  const invited = intro.moves[intro.moves.length - 1].friend;
  const hint = ready ? game.friends[invited].at : null;

  const press = (pos: number) => {
    wakeAudio();
    pressedFriend.current = ready ? friendIndexAt(game, pos) : null;
  };

  const release = (pos: number) => {
    const pressed = pressedFriend.current;
    pressedFriend.current = null;
    if (!ready || finishing.current || pressed === null || pressed < 0) return;
    const friend = friendIndexAt(game, pos);
    if (friend !== pressed) return;
    finishing.current = true;
    sfx.select(game.friends[friend].kind);
    // Keep this board mounted through the compatibility click that follows
    // pointerup, so it cannot land on a puzzle tile on the next screen.
    window.setTimeout(onMet, 0);
  };

  return (
    <div className="screen play meet" style={{ background: world.sky }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="round-btn-spacer" />
        <div className="round-btn-spacer" />
      </div>

      <div className="board-wrap">
        <Board
          puzzle={intro.puzzle}
          state={game}
          treat={world.treat}
          selected={ready ? invited : null}
          hops={[]}
          hint={hint}
          mood="idle"
          gulp={null}
          motion="normal"
          round={0}
          nudgeKey={0}
          pokeKey={0}
          interactive={ready}
          onPress={press}
          onRelease={release}
        />
      </div>

      <div className="bottombar" />
    </div>
  );
}

function pauseTime(): number {
  return reducedMotion ? REDUCED_MOTION_PAUSE_MS : BETWEEN_HOPS_MS;
}

function previousHopTime(intro: ReturnType<typeof makeFriendIntro>, frame: number): number {
  const move = intro.moves[frame - 1];
  const before = intro.states[frame - 1].friends[move.friend];
  return hopTime(before.at, move.to, before.kind, intro.puzzle.cols);
}

function hopTime(from: number, to: number, kind: World['faces'][number], cols: number): number {
  const distance = Math.max(
    Math.abs((from % cols) - (to % cols)),
    Math.abs(Math.floor(from / cols) - Math.floor(to / cols)),
  );
  return moveDuration(kind, distance);
}
