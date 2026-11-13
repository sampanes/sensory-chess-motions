// A puzzle someone shared with ?p=<code>, or a set of them to play in order
// (?p=<code>_<code>_...), as made in the puzzle maker.

import { useMemo, useState } from 'react';
import { decodeSet } from '../core/share.ts';
import { FriendArt, HomeIcon, StarIcon } from './art.tsx';
import { PlayScreen } from './PlayScreen.tsx';

export function SharedPuzzle({ code }: { code: string }) {
  const res = useMemo(() => decodeSet(code), [code]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<readonly number[]>([]);
  const home = () => window.location.assign(window.location.pathname);

  if (!res.ok) {
    return (
      <div className="screen center" style={{ background: '#e0f2fe' }}>
        <FriendArt kind="pawn" mood="sleepy" className="hero-friend big" />
        <p className="grownup-note">{res.error}</p>
        <button className="round-btn" onClick={home} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
      </div>
    );
  }

  const { puzzles } = res;
  const last = index === puzzles.length - 1;
  // A set shows a star per puzzle, like a friend's world. Stars last until the page closes.
  const dots = puzzles.length > 1
    ? puzzles.map((_, i) => (
      <StarIcon key={i} filled={done.includes(i)} className={i === index ? 'dot-star current' : 'dot-star'} />
    ))
    : undefined;

  return (
    <PlayScreen
      key={index}
      puzzle={puzzles[index]}
      treat="cookie"
      sky="#e0f2fe"
      eagerHint={index === 0}
      dots={dots}
      onWin={() => setDone((d) => (d.includes(index) ? d : [...d, index]))}
      onNext={last ? undefined : () => setIndex(index + 1)}
      onHome={home}
    />
  );
}
