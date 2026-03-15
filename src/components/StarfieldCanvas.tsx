/**
 * StarfieldCanvas — purely decorative 3-layer parallax starfield.
 * Rendered as a fixed full-screen canvas behind the game board.
 * Has no access to game state and no effect on layout.
 *
 * Layer 1: dense small stars, slow drift
 * Layer 2: medium stars, medium drift
 * Layer 3: sparse large stars + occasional twinkle, fastest drift
 *
 * Respects prefers-reduced-motion by freezing all animation.
 */

import { useEffect, useRef } from 'react';

// ─── Star type ────────────────────────────────────────────────────────────────

type Star = {
  x: number;
  y: number;
  r: number;
  speed: number;   // px per second
  opacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
};

// ─── Layer configs ────────────────────────────────────────────────────────────

const LAYERS: Array<{ count: number; minR: number; maxR: number; speed: number; twinkle: boolean }> = [
  { count: 140, minR: 0.4, maxR: 1.0, speed: 4,  twinkle: false },
  { count: 60,  minR: 0.8, maxR: 1.6, speed: 9,  twinkle: false },
  { count: 24,  minR: 1.4, maxR: 2.6, speed: 16, twinkle: true  },
];

function buildStars(count: number, minR: number, maxR: number, speed: number, W: number, H: number): Star[] {
  return Array.from({ length: count }, () => ({
    x:            Math.random() * W,
    y:            Math.random() * H,
    r:            minR + Math.random() * (maxR - minR),
    speed,
    opacity:      0.4 + Math.random() * 0.6,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.8 + Math.random() * 1.6,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Freeze if user prefers reduced motion
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    // Build all layers
    const layers = LAYERS.map(l => buildStars(l.count, l.minR, l.maxR, l.speed, W, H));

    let lastTime = performance.now();
    let rafId: number;

    function draw(now: number) {
      const dt = reduced ? 0 : Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx!.clearRect(0, 0, W, H);

      LAYERS.forEach((layerCfg, li) => {
        const stars = layers[li];
        stars.forEach(star => {
          // Drift downward slowly (piece moving "up through space" feel)
          star.y += star.speed * dt;
          if (star.y > H + star.r) star.y = -star.r;

          // Twinkle
          let alpha = star.opacity;
          if (layerCfg.twinkle) {
            star.twinklePhase += star.twinkleSpeed * dt;
            alpha = star.opacity * (0.6 + 0.4 * Math.sin(star.twinklePhase));
          }

          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
          ctx!.fill();
        });
      });

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    const handleResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
      // Scatter stars to new bounds
      LAYERS.forEach((l, li) => {
        layers[li] = buildStars(l.count, l.minR, l.maxR, l.speed, W, H);
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width:  '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'linear-gradient(to bottom, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
      }}
    />
  );
}
