import { useCallback, useEffect, useState } from 'react';
import { WORLDS } from '../content/worlds.ts';
import { loadProgress, saveProgress, type KeyValueStore, type Progress, type WorldLevelIds } from '../core/progress.ts';
import { setMuted } from './sound.ts';

export const WORLD_LEVEL_IDS: WorldLevelIds = WORLDS.map((w) => w.levels.map((l) => l.id));

function storage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(storage()));

  useEffect(() => {
    setMuted(progress.muted);
  }, [progress.muted]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      if (next !== prev) saveProgress(storage(), next);
      return next;
    });
  }, []);

  return [progress, update] as const;
}
