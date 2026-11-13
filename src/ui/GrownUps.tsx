// The only screen with words on it -- reached by holding the gear for 2s.

import { useRef, useState, type ReactNode } from 'react';
import { WORLDS } from '../content/worlds.ts';
import { KNOWN_AFTER, knowReport, type KnowReport } from '../core/knows.ts';
import { emptyProgress, type Progress } from '../core/progress.ts';
import { BEDTIME_LEVELS } from '../content/bedtime.ts';
import { PAWN_LEVELS } from '../content/pawnwalk.ts';
import { TIPTOE_LEVELS } from '../content/tiptoe.ts';
import { FriendArt, GRUMPY, SunIcon } from './art.tsx';
import { autoLook, canFullScreen, currentScreenPref, saveScreenPref, toggleFullScreen, type ScreenPref } from './screenMode.ts';
import { canBuzz, currentSenses, saveSenses, type Senses } from './senses.ts';

const WORLD_NAMES: Record<string, string> = {
  king: 'King',
  rook: 'Rook',
  bishop: 'Bishop',
  queen: 'Queen',
  knight: 'Knight',
  pawn: 'Pawn',
  friends: 'Rook and bishop together',
};

const TIPTOE_SET_NAMES = {
  sneak: 'Attacked squares (tiptoe)',
  shoo: 'Captures (tiptoe)',
  safe: 'Safe captures (tiptoe)',
} as const;

const KNOWING_TEXT = { 'not-yet': 'Not yet', learning: 'Learning', knows: 'Knows it' } as const;

function KnowRow({ faces, name, report }: { faces: ReactNode; name: string; report: KnowReport }) {
  return (
    <tr>
      <td className="know-faces">{faces}</td>
      <th scope="row">{name}</th>
      <td>{report.own} of {report.total}</td>
      <td className="know-done muted">{report.done}</td>
      <td><span className={`know-badge k-${report.knowing}`}>{KNOWING_TEXT[report.knowing]}</span></td>
    </tr>
  );
}

export function GrownUps({ progress, update, onClose }: {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  onClose: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [screenPref, setScreenPref] = useState<ScreenPref>(currentScreenPref);
  const [senses, setSenses] = useState<Senses>(currentSenses);
  const sense = (next: Senses) => { saveSenses(next); setSenses(next); };
  const total = WORLDS.reduce((n, w) => n + w.levels.length, 0);
  const finished = WORLDS.reduce((n, w) => n + w.levels.filter((l) => progress.done.includes(l.id)).length, 0);
  const days = progress.done.filter((id) => id.startsWith('day-')).length;
  // Close on a tap outside the panel, but only a tap that also started there.
  // On touch screens, lifting the finger that held the gear sends a click to
  // whatever is now under it -- the backdrop -- which used to close the panel
  // the moment it opened.
  const pressedOutside = useRef(false);

  return (
    <div
      className="grownups-backdrop"
      onPointerDown={(e) => (pressedOutside.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedOutside.current && e.target === e.currentTarget) onClose();
        pressedOutside.current = false;
      }}
    >
      <div className="grownups" role="dialog" aria-label="For grown-ups">
        <div className="grownups-head">
          <h1>Tiny Hops -- for grown-ups</h1>
          <button className="text-btn" onClick={onClose}>Close</button>
        </div>

        <p>
          Every friend is a real chess piece and moves exactly like one. Your child learns how the pieces move by
          collecting treats. There is nothing to read and no way to lose: if a puzzle can no longer be finished, it
          gently rewinds. After a few quiet seconds a little hand shows the next move. The very first puzzle is a
          tiny lesson: the hand shows tap the friend, tap a glowing spot, then the green button.
        </p>
        <p className="muted">
          Puzzles finished: {finished} of {total}. Tap a friend (or drag it) to move; with two friends,
          tap one to choose who goes.
        </p>

        <ul className="lessons">
          {WORLDS.map((w) => (
            <li key={w.id}>
              <div className="lesson-faces">
                {w.faces.map((k) => <FriendArt key={k} kind={k} className="lesson-friend" />)}
              </div>
              <span>{w.lesson}</span>
            </li>
          ))}
          <li>
            <div className="lesson-faces">
              <FriendArt kind="king" colors={GRUMPY} mood="grumpy" className="lesson-friend" />
            </div>
            <span>
              Bedtime puzzles (the night-sky bubble, always open): drag friends from the tray until the grumpy king is
              in check and every square he could step to is watched. That is checkmate. Red squares show what a
              friend would watch before you let go. Finished {BEDTIME_LEVELS.filter((l) => progress.done.includes(l.id)).length}{' '}
              of {BEDTIME_LEVELS.length}.
            </span>
          </li>
          <li>
            <div className="lesson-faces">
              <FriendArt kind="rook" colors={GRUMPY} mood="sleepy" className="lesson-friend" />
            </div>
            <span>
              Tiptoe puzzles (the green bubble, always open): sneak past sleepy gray guards to the treats. A guard
              watches the squares it attacks in real chess. Stop on one and it wakes up, shows what it watches, and
              your friend scurries back. Land right on a guard from a square it does not watch to send it home (a
              capture). There are three sets of eight: sneaking past; shooing a guard that is in the way; and
              staying safe, where a guard that another guard watches is protected, so the protector has to go
              home first. Finished {TIPTOE_LEVELS.filter((l) => progress.done.includes(l.id)).length} of{' '}
              {TIPTOE_LEVELS.length}.
            </span>
          </li>
          <li>
            <div className="lesson-faces">
              <FriendArt kind="pawn" className="lesson-friend" />
            </div>
            <span>
              Pawn walk (the blue bubble, always open): get the pawn to the gold top row, where it becomes a queen,
              like promotion in chess. It walks straight ahead and eats diagonally. In races a gray pawn walks down
              too; if it gets home first it becomes an angry queen and you start over. Stand in front of it to stop
              it, or eat it when it steps next to you. Finished{' '}
              {PAWN_LEVELS.filter((l) => progress.done.includes(l.id)).length} of {PAWN_LEVELS.length}.
            </span>
          </li>
          <li>
            <div className="lesson-faces">
              <SunIcon className="lesson-friend" />
            </div>
            <span>
              Today's puzzle (the sunny bubble, always open): a new puzzle every day, made from the date and checked by
              the solver. The friend changes with the day of the week; Saturday brings two. Days finished: {days}.
            </span>
          </li>
        </ul>

        <h2>What they know</h2>
        <p className="muted">
          How many puzzles were finished with no hint hand showing. A row turns to "knows it" after {KNOWN_AFTER}.
          Nothing leaves this device. Puzzles finished before this was counted show up once they are played again.
        </p>
        <table className="knows">
          <thead>
            <tr>
              <td />
              <td />
              <th scope="col">Alone</th>
              <th scope="col" className="know-done">Finished</th>
              <td />
            </tr>
          </thead>
          <tbody>
            {WORLDS.map((w) => (
              <KnowRow
                key={w.id}
                faces={w.faces.map((k) => <FriendArt key={k} kind={k} className="know-friend" />)}
                name={WORLD_NAMES[w.id] ?? w.id}
                report={knowReport(progress, w.levels.map((l) => l.id))}
              />
            ))}
            {(['sneak', 'shoo', 'safe'] as const).map((set) => (
              <KnowRow
                key={set}
                faces={<FriendArt kind="rook" colors={GRUMPY} mood="sleepy" className="know-friend" />}
                name={TIPTOE_SET_NAMES[set]}
                report={knowReport(progress, TIPTOE_LEVELS.filter((l) => l.set === set).map((l) => l.id))}
              />
            ))}
            <KnowRow
              faces={<FriendArt kind="pawn" className="know-friend" />}
              name="Pawn races and promotion"
              report={knowReport(progress, PAWN_LEVELS.map((l) => l.id))}
            />
            <KnowRow
              faces={<FriendArt kind="king" colors={GRUMPY} mood="grumpy" className="know-friend" />}
              name="Checkmate (bedtime)"
              report={knowReport(progress, BEDTIME_LEVELS.map((l) => l.id))}
            />
          </tbody>
        </table>

        <h2>Handing it to a little one</h2>
        <ul className="tips">
          <li>
            <b>Play offline:</b> after one visit the game works without internet. Add it to the home screen
            (Share, then "Add to Home Screen" on iPhone and iPad; the browser menu, then "Install app" or "Add to
            Home screen" on Android) so it opens full screen like an app.
          </li>
          <li>
            <b>Keep them in the game</b> on iPhone and iPad: turn on Settings, Accessibility, Guided Access. Open
            Tiny Hops and triple-click the side (or home) button to lock the screen to it. Triple-click again to
            unlock.
          </li>
          <li>
            <b>Keep them in the game</b> on Android: turn on Settings, Security, App pinning (sometimes called
            Screen pinning). Open recent apps, tap the Tiny Hops icon, then Pin.
          </li>
          <li>
            <b>On a touchscreen computer:</b> tap Full screen below to hide the browser's tabs and address bar (press
            Esc, or swipe down from the top edge, to get them back). Or install it from the Edge or Chrome menu
            ("Apps", then "Install this site as an app") so it opens in its own window.
          </li>
        </ul>

        <div className="settings">
          <div className="screen-pick" role="radiogroup" aria-label="Screen size">
            <span>Screen:</span>
            {([
              ['auto', `Auto (${autoLook().screen === 'big' ? 'big screen' : 'phone'} here)`],
              ['phone', 'Phone'],
              ['big', 'Big screen'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={screenPref === id}
                className={`text-btn ${screenPref === id ? 'primary' : ''}`}
                onClick={() => { saveScreenPref(id); setScreenPref(id); }}
              >
                {label}
              </button>
            ))}
          </div>
          {canFullScreen() && <button className="text-btn" onClick={toggleFullScreen}>Full screen</button>}
          <label className="toggle">
            <input
              type="checkbox"
              checked={!progress.muted}
              onChange={(e) => update((p) => ({ ...p, muted: !e.target.checked }))}
            />
            Sound
          </label>
          <label className="toggle">
            <input type="checkbox" checked={senses.contrast} onChange={(e) => sense({ ...senses, contrast: e.target.checked })} />
            High-contrast board (white and slate squares, dark edges)
          </label>
          {canBuzz() && (
            <label className="toggle">
              <input type="checkbox" checked={senses.buzz} onChange={(e) => sense({ ...senses, buzz: e.target.checked })} />
              A tiny buzz on each hop
            </label>
          )}
          <label className="toggle">
            <input
              type="checkbox"
              checked={progress.unlockAll}
              onChange={(e) => update((p) => ({ ...p, unlockAll: e.target.checked }))}
            />
            Open every friend and puzzle
          </label>
          <a className="text-btn" href="?maker">Make your own puzzle</a>
          <a className="text-btn" href="?card">Friends and chess pieces: a card to print</a>
          {confirmReset ? (
            <button
              className="text-btn danger"
              onClick={() => {
                update((p) => ({ ...emptyProgress(), muted: p.muted }));
                setConfirmReset(false);
              }}
            >
              Tap again to erase all progress
            </button>
          ) : (
            <button className="text-btn" onClick={() => setConfirmReset(true)}>Start over from the beginning</button>
          )}
        </div>
      </div>
    </div>
  );
}
