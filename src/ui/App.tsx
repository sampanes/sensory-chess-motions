// Screens are addressed by the URL hash so the phone's back button works:
//   #/              home
//   #/w/rook        a friend's puzzles
//   #/w/rook/3      puzzle 3 of that friend

import { useEffect, useMemo, useState } from 'react';
import { WORLDS } from '../content/worlds.ts';
import { markDone } from '../core/progress.ts';
import { mustParse } from '../core/puzzle.ts';
import { StarIcon } from './art.tsx';
import { GrownUps } from './GrownUps.tsx';
import { Home } from './Home.tsx';
import { PlayScreen } from './PlayScreen.tsx';
import { useProgress } from './useProgress.ts';
import { WorldScreen } from './WorldScreen.tsx';

type Route = { screen: 'home' } | { screen: 'world'; wi: number } | { screen: 'play'; wi: number; li: number };

function parseHash(hash: string): Route {
  const m = /^#\/w\/([a-z]+)(?:\/(\d+))?$/.exec(hash);
  const wi = m ? WORLDS.findIndex((w) => w.id === m[1]) : -1;
  if (wi < 0) return { screen: 'home' };
  if (!m![2]) return { screen: 'world', wi };
  const li = Number(m![2]) - 1;
  if (li < 0 || li >= WORLDS[wi].levels.length) return { screen: 'world', wi };
  return { screen: 'play', wi, li };
}

function go(hash: string, replace = false) {
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

export function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const [progress, update] = useProgress();
  const [grownUps, setGrownUps] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route.screen === 'play') {
    return <Level key={`${route.wi}-${route.li}`} wi={route.wi} li={route.li} progress={progress.done} onDone={(id) => update((p) => markDone(p, id))} />;
  }

  if (route.screen === 'world') {
    const w = WORLDS[route.wi];
    return (
      <WorldScreen
        world={w}
        worldIndex={route.wi}
        progress={progress}
        onPlay={(li) => go(`#/w/${w.id}/${li + 1}`)}
        onHome={() => go('#/')}
      />
    );
  }

  return (
    <>
      <Home progress={progress} onOpenWorld={(id) => go(`#/w/${id}`)} onGrownUps={() => setGrownUps(true)} />
      {grownUps && <GrownUps progress={progress} update={update} onClose={() => setGrownUps(false)} />}
    </>
  );
}

function Level({ wi, li, progress, onDone }: { wi: number; li: number; progress: readonly string[]; onDone: (id: string) => void }) {
  const world = WORLDS[wi];
  const level = world.levels[li];
  const puzzle = useMemo(() => mustParse(level.grid), [level]);
  const last = li === world.levels.length - 1;

  const dots = world.levels.map((l, i) => (
    <StarIcon key={l.id} filled={progress.includes(l.id)} className={i === li ? 'dot-star current' : 'dot-star'} />
  ));

  return (
    <PlayScreen
      puzzle={puzzle}
      treat={world.treat}
      sky={world.sky}
      eagerHint={li === 0}
      dots={dots}
      onWin={() => onDone(level.id)}
      onNext={() => go(last ? '#/' : `#/w/${world.id}/${li + 2}`, true)}
      onHome={() => go(`#/w/${world.id}`)}
    />
  );
}
