import { useEffect, useMemo, useRef } from 'react';

export interface Later {
  (fn: () => void, ms: number): void;
  /**
   * Drop everything still waiting. "Start over" calls this, so a fresh board
   * is never caught up by what an old win had planned (the go button, a reveal).
   */
  clear(): void;
}

/** setTimeout that is cancelled automatically when the screen goes away. */
export function useTimers(): Later {
  const ids = useRef<number[]>([]);
  useEffect(() => () => ids.current.forEach((id) => window.clearTimeout(id)), []);
  return useMemo(() => {
    const later = (fn: () => void, ms: number) => {
      ids.current.push(window.setTimeout(fn, ms));
    };
    later.clear = () => {
      ids.current.forEach((id) => window.clearTimeout(id));
      ids.current = [];
    };
    return later;
  }, []);
}
