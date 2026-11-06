// Screens are addressed by the URL hash so the phone's back button works:
//   #/              home
//   #/w/rook        a friend's puzzles
//   #/w/rook/3      puzzle 3 of that friend
//   #/bed           bedtime puzzles (always open)
//   #/bed/2         bedtime puzzle 2
//   #/today         today's puzzle (always open, new every day)
//   #/tiptoe        tiptoe puzzles: sneak past sleepy guards (always open)
//   #/tiptoe/2      tiptoe puzzle 2
//   #/lab           the lab: prototypes of new ideas (#/lab/3/dots = puzzle 3, a variant)

import { useEffect, useMemo, useState } from 'react';
import { BEDTIME_LEVELS, BEDTIME_SKY } from '../content/bedtime.ts';
import { WORLDS } from '../content/worlds.ts';
import { markDone, markWorldMet, needsFriendIntro } from '../core/progress.ts';
import { mustParse } from '../core/puzzle.ts';
import { StarIcon, SunIcon } from './art.tsx';
import { BedtimeScreen } from './BedtimeScreen.tsx';
import { BedtimeWorld } from './BedtimeWorld.tsx';
import { GrownUps } from './GrownUps.tsx';
import { Home } from './Home.tsx';
import { LabScreen } from './LabScreen.tsx';
import { TiptoeScreen } from './TiptoeScreen.tsx';
import { TiptoeWorld } from './TiptoeWorld.tsx';
import { MeetFriend } from './MeetFriend.tsx';
import { PlayScreen } from './PlayScreen.tsx';
import { today, TODAY_SKY } from './today.ts';
import { useProgress, WORLD_LEVEL_IDS } from './useProgress.ts';
import { WorldScreen } from './WorldScreen.tsx';
import type { Peek } from './TiptoeScreen.tsx';
import { TIPTOE_LEVELS } from '../content/tiptoe.ts';

type Route =
  | { screen: 'home' }
  | { screen: 'world'; wi: number }
  | { screen: 'play'; wi: number; li: number }
  | { screen: 'bedtime' }
  | { screen: 'bed'; li: number }
  | { screen: 'today' }
  | { screen: 'tiptoe' }
  | { screen: 'tip'; li: number }
  | { screen: 'lab'; li: number; peek: Peek };

function parseHash(hash: string): Route {
  if (hash === '#/today') return { screen: 'today' };
  const tip = /^#\/tiptoe(?:\/(\d+))?$/.exec(hash);
  if (tip) {
    const li = tip[1] ? Number(tip[1]) - 1 : -1;
    return li >= 0 && li < TIPTOE_LEVELS.length ? { screen: 'tip', li } : { screen: 'tiptoe' };
  }
  const lab = /^#\/lab(?:\/(\d+))?(?:\/(never|dots|always))?$/.exec(hash);
  if (lab) {
    const li = Math.min(Math.max(Number(lab[1] ?? 1) - 1, 0), TIPTOE_LEVELS.length - 1);
    return { screen: 'lab', li, peek: (lab[2] as Peek | undefined) ?? 'never' };
  }
  const bed = /^#\/bed(?:\/(\d+))?$/.exec(hash);
  if (bed) {
    const li = bed[1] ? Number(bed[1]) - 1 : -1;
    return li >= 0 && li < BEDTIME_LEVELS.length ? { screen: 'bed', li } : { screen: 'bedtime' };
  }
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

  if (route.screen === 'bedtime') {
    return <BedtimeWorld progress={progress} onPlay={(li) => go(`#/bed/${li + 1}`)} onHome={() => go('#/')} />;
  }

  if (route.screen === 'bed') {
    const li = route.li;
    const level = BEDTIME_LEVELS[li];
    const last = li === BEDTIME_LEVELS.length - 1;
    return (
      <BedtimeScreen
        key={level.id}
        grid={level.grid}
        tray={level.tray}
        sky={BEDTIME_SKY}
        eagerHint={li === 0}
        dots={BEDTIME_LEVELS.map((l, i) => (
          <StarIcon key={l.id} filled={progress.done.includes(l.id)} className={i === li ? 'dot-star current' : 'dot-star'} />
        ))}
        onWin={() => update((p) => markDone(p, level.id))}
        onNext={() => go(last ? '#/bed' : `#/bed/${li + 2}`, true)}
        onHome={() => go('#/bed')}
      />
    );
  }

  if (route.screen === 'lab') {
    return <LabScreen li={route.li} peek={route.peek} go={(li, peek) => go(`#/lab/${li + 1}/${peek}`, true)} />;
  }

  if (route.screen === 'tiptoe') {
    return <TiptoeWorld progress={progress} onPlay={(li) => go(`#/tiptoe/${li + 1}`)} onHome={() => go('#/')} />;
  }

  if (route.screen === 'tip') {
    const li = route.li;
    const level = TIPTOE_LEVELS[li];
    const last = li === TIPTOE_LEVELS.length - 1;
    return (
      <TiptoeScreen
        key={level.id}
        grid={level.grid}
        peek="never"
        eagerHint={li === 0}
        top={TIPTOE_LEVELS.map((l, i) => (
          <StarIcon key={l.id} filled={progress.done.includes(l.id)} className={i === li ? 'dot-star current' : 'dot-star'} />
        ))}
        onWin={() => update((p) => markDone(p, level.id))}
        onNext={() => go(last ? '#/tiptoe' : `#/tiptoe/${li + 2}`, true)}
        onHome={() => go('#/tiptoe')}
      />
    );
  }

  if (route.screen === 'today') {
    return <TodayLevel progress={progress.done} onDone={(id) => update((p) => markDone(p, id))} />;
  }

  if (route.screen !== 'home') {
    const world = WORLDS[route.wi];
    if (needsFriendIntro(progress, world.id, WORLD_LEVEL_IDS[route.wi])) {
      return (
        <MeetFriend
          key={world.id}
          world={world}
          onMet={() => update((p) => markWorldMet(p, world.id))}
          onHome={() => go('#/')}
        />
      );
    }
  }

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
      <Home
        progress={progress}
        onOpenWorld={(id) => go(`#/w/${id}`)}
        onBedtime={() => go('#/bed')}
        onToday={() => go('#/today')}
        onTiptoe={() => go('#/tiptoe')}
        onGrownUps={() => setGrownUps(true)}
      />
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
      replay={progress.includes(level.id)}
      eagerHint={li === 0}
      dots={dots}
      onWin={() => onDone(level.id)}
      onNext={() => go(last ? '#/' : `#/w/${world.id}/${li + 2}`, true)}
      onHome={() => go(`#/w/${world.id}`)}
    />
  );
}

function TodayLevel({ progress, onDone }: { progress: readonly string[]; onDone: (id: string) => void }) {
  const t = useMemo(() => today(), []);
  const puzzle = useMemo(() => mustParse(t.grid), [t]);
  return (
    <PlayScreen
      puzzle={puzzle}
      treat={t.look.treat}
      sky={TODAY_SKY}
      look={t.look}
      dots={<SunIcon filled={progress.includes(t.id)} className="dot-star current" />}
      onWin={() => onDone(t.id)}
      onNext={() => go('#/', true)}
      onHome={() => go('#/')}
    />
  );
}
