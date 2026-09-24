// Saved progress. Storage can be missing or throw (private mode, blocked
// site data), so every read and write is guarded and the game still works
// without it -- it just forgets on reload.

export interface Progress {
  done: string[];
  unlockAll: boolean;
  muted: boolean;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'tiny-hops-progress-v1';

export function emptyProgress(): Progress {
  return { done: [], unlockAll: false, muted: false };
}

export function loadProgress(store: KeyValueStore | null): Progress {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as Partial<Progress>;
    return {
      done: Array.isArray(data.done) ? data.done.filter((x): x is string => typeof x === 'string') : [],
      unlockAll: data.unlockAll === true,
      muted: data.muted === true,
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(store: KeyValueStore | null, p: Progress): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Storage full or blocked -- progress lives in memory for this visit.
  }
}

export function markDone(p: Progress, levelId: string): Progress {
  return p.done.includes(levelId) ? p : { ...p, done: [...p.done, levelId] };
}

/** Level ids of each world, in order. */
export type WorldLevelIds = readonly (readonly string[])[];

export function doneCount(p: Progress, levelIds: readonly string[]): number {
  return levelIds.filter((id) => p.done.includes(id)).length;
}

/** A world opens once half of the previous world is done. */
export function isWorldOpen(p: Progress, worlds: WorldLevelIds, wi: number): boolean {
  if (wi === 0 || p.unlockAll) return true;
  const prev = worlds[wi - 1];
  return isWorldOpen(p, worlds, wi - 1) && doneCount(p, prev) >= Math.ceil(prev.length / 2);
}

/** Levels inside an open world unlock one after another. */
export function isLevelOpen(p: Progress, worlds: WorldLevelIds, wi: number, li: number): boolean {
  if (!isWorldOpen(p, worlds, wi)) return false;
  if (li === 0 || p.unlockAll) return true;
  return p.done.includes(worlds[wi][li - 1]);
}
