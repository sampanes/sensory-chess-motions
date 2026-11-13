// Screens are addressed by the URL hash so the phone's back button works:
//   #/              home
//   #/friends       the friends folder: every friend world
//   #/w/rook        a friend's puzzles
//   #/w/rook/3      puzzle 3 of that friend
//   #/bed           bedtime puzzles (always open)
//   #/bed/2         bedtime puzzle 2
//   #/today         today's puzzle (always open, new every day)
//   #/tiptoe        tiptoe puzzles: sneak past sleepy guards (always open)
//   #/tiptoe/2      tiptoe puzzle 2
//   #/pawn          walk the pawn home (always open), #/pawn/2 = puzzle 2
//   #/lab           the lab: prototypes of new ideas, now the team crossing (#/lab/3/spots = puzzle 3, a variant)

import { useEffect, useMemo, useState } from 'react';
import { BEDTIME_LEVELS, BEDTIME_SKY } from '../content/bedtime.ts';
import { WORLDS } from '../content/worlds.ts';
import { firstLesson, type Lesson } from '../core/lesson.ts';
import { markDone, markWorldMet, needsFriendIntro } from '../core/progress.ts';
import { mustParse } from '../core/puzzle.ts';
import { StarIcon, SunIcon } from './art.tsx';
import { BedtimeScreen } from './BedtimeScreen.tsx';
import { BedtimeWorld } from './BedtimeWorld.tsx';
import { GrownUps } from './GrownUps.tsx';
import { FriendsDrawer, Home } from './Home.tsx';
import { LAB_LEVELS, LabScreen } from './LabScreen.tsx';
import { TiptoeScreen } from './TiptoeScreen.tsx';
import { TiptoeWorld } from './TiptoeWorld.tsx';
import { MeetFriend } from './MeetFriend.tsx';
import { PlayScreen } from './PlayScreen.tsx';
import { today, TODAY_SKY } from './today.ts';
import { useProgress, WORLD_LEVEL_IDS } from './useProgress.ts';
import { WorldScreen } from './WorldScreen.tsx';
import type { LabVariant } from './LabScreen.tsx';
import { SNEAK_MODES, PAWN_MODE, type SneakMode } from './sneakModes.tsx';

type Route =
  | { screen: 'home' }
  | { screen: 'friends' }
  | { screen: 'world'; wi: number }
  | { screen: 'play'; wi: number; li: number }
  | { screen: 'bedtime' }
  | { screen: 'bed'; li: number }
  | { screen: 'today' }
  | { screen: 'sneakWorld'; mode: SneakMode }
  | { screen: 'sneak'; mode: SneakMode; li: number }
  | { screen: 'lab'; li: number; variant: LabVariant };

function parseHash(hash: string): Route {
  if (hash === '#/today') return { screen: 'today' };
  if (hash === '#/friends') return { screen: 'friends' };
  const sneak = /^#\/(tiptoe|pawn)(?:\/(\d+))?$/.exec(hash);
  if (sneak) {
    const mode = SNEAK_MODES[sneak[1] as 'tiptoe' | 'pawn'];
    const li = sneak[2] ? Number(sneak[2]) - 1 : -1;
    return li >= 0 && li < mode.levels.length ? { screen: 'sneak', mode, li } : { screen: 'sneakWorld', mode };
  }
  const lab = /^#\/lab(?:\/(\d+))?(?:\/(plain|spots|reach))?$/.exec(hash);
  if (lab) {
    const li = Math.min(Math.max(Number(lab[1] ?? 1) - 1, 0), LAB_LEVELS.length - 1);
    return { screen: 'lab', li, variant: lab[2] === 'plain' ? 'plain' : 'spots' };
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
    return <LabScreen li={route.li} variant={route.variant} go={(li, v) => go(`#/lab/${li + 1}/${v}`, true)} />;
  }

  if (route.screen === 'sneakWorld') {
    const { mode } = route;
    return <TiptoeWorld mode={mode} progress={progress} onPlay={(li) => go(`#/${mode.path}/${li + 1}`)} onHome={() => go('#/')} />;
  }

  if (route.screen === 'sneak') {
    const { mode, li } = route;
    const level = mode.levels[li];
    const last = li === mode.levels.length - 1;
    return (
      <TiptoeScreen
        key={level.id}
        grid={level.grid}
        rules={mode.rules(level)}
        sky={mode.sky}
        peek="never"
        eagerHint={li === 0}
        top={mode.levels.map((l, i) => (l.set !== level.set ? null : (
          <StarIcon key={l.id} filled={progress.done.includes(l.id)} className={i === li ? 'dot-star current' : 'dot-star'} />
        )))}
        onWin={() => update((p) => markDone(p, level.id))}
        onNext={() => go(last ? `#/${mode.path}` : `#/${mode.path}/${li + 2}`, true)}
        onHome={() => go(`#/${mode.path}`)}
      />
    );
  }

  if (route.screen === 'today') {
    return <TodayLevel progress={progress.done} onDone={(id) => update((p) => markDone(p, id))} />;
  }

  if (route.screen === 'world' || route.screen === 'play') {
    const world = WORLDS[route.wi];
    if (needsFriendIntro(progress, world.id, WORLD_LEVEL_IDS[route.wi])) {
      return (
        <MeetFriend
          key={world.id}
          world={world}
          onMet={() => update((p) => markWorldMet(p, world.id))}
          onHome={() => go('#/friends')}
        />
      );
    }
  }

  if (route.screen === 'play') {
    return <Level key={`${route.wi}-${route.li}`} wi={route.wi} li={route.li} progress={progress.done} lesson={firstLesson(progress, route.wi, route.li)} onDone={(id) => update((p) => markDone(p, id))} />;
  }

  if (route.screen === 'world') {
    const w = WORLDS[route.wi];
    return (
      <WorldScreen
        world={w}
        worldIndex={route.wi}
        progress={progress}
        onPlay={(li) => go(`#/w/${w.id}/${li + 1}`)}
        onHome={() => go('#/friends')}
      />
    );
  }

  if (route.screen === 'friends') {
    return <FriendsDrawer progress={progress} onOpenWorld={(id) => go(`#/w/${id}`)} onHome={() => go('#/')} />;
  }

  return (
    <>
      <Home
        progress={progress}
        onFriends={() => go('#/friends')}
        onBedtime={() => go('#/bed')}
        onToday={() => go('#/today')}
        onTiptoe={() => go('#/tiptoe')}
        onPawn={() => go(`#/${PAWN_MODE.path}`)}
        onGrownUps={() => setGrownUps(true)}
      />
      {grownUps && <GrownUps progress={progress} update={update} onClose={() => setGrownUps(false)} />}
    </>
  );
}

function Level({ wi, li, progress, lesson, onDone }: { wi: number; li: number; progress: readonly string[]; lesson: Lesson; onDone: (id: string) => void }) {
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
      lesson={lesson}
      dots={dots}
      onWin={() => onDone(level.id)}
      onNext={() => go(last ? '#/friends' : `#/w/${world.id}/${li + 2}`, true)}
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
