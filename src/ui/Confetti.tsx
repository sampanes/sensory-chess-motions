import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#f472b6', '#facc15', '#60a5fa', '#4ade80', '#fb923c', '#a78bfa', '#f87171'];

export function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const power = 30 + Math.random() * 45;
        return {
          id: i,
          color: COLORS[i % COLORS.length],
          x: `${Math.cos(angle) * power}vmin`,
          y: `${Math.sin(angle) * power - 10}vmin`,
          spin: `${Math.round(Math.random() * 720 - 360)}deg`,
          delay: `${Math.round(Math.random() * 150)}ms`,
          round: i % 3 === 0,
        };
      }),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.id}
          className={b.round ? 'confetto round' : 'confetto'}
          style={{ background: b.color, animationDelay: b.delay, '--cx': b.x, '--cy': b.y, '--spin': b.spin } as CSSProperties}
        />
      ))}
    </div>
  );
}
