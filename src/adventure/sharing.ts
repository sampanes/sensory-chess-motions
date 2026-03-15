import { Position } from '../types';

// ─── Challenge URLs ────────────────────────────────────────────────────────────

/** Build a shareable URL for a built-in level. */
export function encodeBuiltinChallenge(worldId: number, levelIndex: number): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?adventure&challenge=w${worldId}:${levelIndex}`;
}

/**
 * Parse a challenge descriptor from URL search params.
 * Returns null if the URL is not a challenge link.
 */
export function decodeChallenge(
  params: URLSearchParams,
): { worldId: number; levelIndex: number } | null {
  const raw = params.get('challenge');
  if (!raw) return null;
  const m = raw.match(/^w(\d+):(\d+)$/);
  if (!m) return null;
  return { worldId: parseInt(m[1], 10), levelIndex: parseInt(m[2], 10) };
}

// ─── Ghost replays ─────────────────────────────────────────────────────────────

function ghostKey(worldId: number, levelIndex: number): string {
  return `tbk_ghost_w${worldId}_l${levelIndex}`;
}

function attemptsKey(worldId: number, levelIndex: number): string {
  return `tbk_attempts_w${worldId}_l${levelIndex}`;
}

/** Load the stored best-route ghost for a level, or null if none recorded yet. */
export function loadGhost(worldId: number, levelIndex: number): Position[] | null {
  try {
    const raw = localStorage.getItem(ghostKey(worldId, levelIndex));
    if (!raw) return null;
    return JSON.parse(raw) as Position[];
  } catch {
    return null;
  }
}

/**
 * Save this trail as the ghost if it is shorter (fewer moves) than what is
 * currently stored.  `trail` includes the start position, so
 * moves = trail.length − 1.
 */
export function saveGhostIfBest(
  worldId: number,
  levelIndex: number,
  trail: Position[],
): void {
  try {
    const existing = loadGhost(worldId, levelIndex);
    if (!existing || trail.length < existing.length) {
      localStorage.setItem(ghostKey(worldId, levelIndex), JSON.stringify(trail));
    }
  } catch {
    // ignore storage quota errors
  }
}

/** Return how many times the player has pressed Play on this level. */
export function getAttempts(worldId: number, levelIndex: number): number {
  try {
    return parseInt(localStorage.getItem(attemptsKey(worldId, levelIndex)) ?? '0', 10);
  } catch {
    return 0;
  }
}

/** Increment the attempt counter (call once per Play press). */
export function incrementAttempts(worldId: number, levelIndex: number): void {
  try {
    const n = getAttempts(worldId, levelIndex);
    localStorage.setItem(attemptsKey(worldId, levelIndex), String(n + 1));
  } catch {
    // ignore
  }
}
