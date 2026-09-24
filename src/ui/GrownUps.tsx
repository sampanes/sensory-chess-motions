// The only screen with words on it -- reached by holding the gear for 2s.

import { useRef, useState } from 'react';
import { WORLDS } from '../content/worlds.ts';
import { emptyProgress, type Progress } from '../core/progress.ts';
import { FriendArt } from './art.tsx';

export function GrownUps({ progress, update, onClose }: {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  onClose: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const total = WORLDS.reduce((n, w) => n + w.levels.length, 0);
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
          gently rewinds. After a few quiet seconds a little hand shows the next move.
        </p>
        <p className="muted">
          Puzzles finished: {progress.done.length} of {total}. Tap a friend (or drag it) to move; with two friends,
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
        </ul>

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
        </ul>

        <div className="settings">
          <label className="toggle">
            <input
              type="checkbox"
              checked={!progress.muted}
              onChange={(e) => update((p) => ({ ...p, muted: !e.target.checked }))}
            />
            Sound
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={progress.unlockAll}
              onChange={(e) => update((p) => ({ ...p, unlockAll: e.target.checked }))}
            />
            Open every friend and puzzle
          </label>
          <a className="text-btn" href="?maker">Make your own puzzle</a>
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
