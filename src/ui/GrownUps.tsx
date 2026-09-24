// The only screen with words on it -- reached by holding the gear for 2s.

import { useState } from 'react';
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

  return (
    <div className="grownups-backdrop" onClick={onClose}>
      <div className="grownups" role="dialog" aria-label="For grown-ups" onClick={(e) => e.stopPropagation()}>
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
