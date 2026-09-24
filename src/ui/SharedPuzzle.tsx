// A puzzle someone shared with ?p=<code>.

import { decodePuzzle } from '../core/share.ts';
import { FriendArt, HomeIcon } from './art.tsx';
import { PlayScreen } from './PlayScreen.tsx';

export function SharedPuzzle({ code }: { code: string }) {
  const res = decodePuzzle(code);
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

  return <PlayScreen puzzle={res.puzzle} treat="cookie" sky="#e0f2fe" eagerHint onHome={home} />;
}
