import { useCallback, useEffect, useRef } from 'react';

/** setTimeout that is cancelled automatically when the screen goes away. */
export function useTimers() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => ids.current.forEach((id) => window.clearTimeout(id)), []);
  return useCallback((fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms));
  }, []);
}
