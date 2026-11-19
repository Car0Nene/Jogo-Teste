import React, { useEffect, useRef } from 'react';

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: string;
}

export function AmbientParticles({
  enabled = true,
  accentColor = '#fbbf24',
}: {
  enabled?: boolean;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;

    let raf = 0;
    let alive = true;
    const embers: Ember[] = [];
    const palette = [accentColor, '#fb923c', '#f43f5e', '#fde68a'];

    const resize = () => {
      if (!cv) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.floor(cv.clientWidth * dpr));
      cv.height = Math.max(1, Math.floor(cv.clientHeight * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 36; i++) {
      embers.push({
        x: Math.random() * (cv.clientWidth || 1280),
        y: Math.random() * (cv.clientHeight || 720),
        vx: -12 + Math.random() * 24,
        vy: -18 - Math.random() * 34,
        size: 1.2 + Math.random() * 2.4,
        alpha: 0.25 + Math.random() * 0.55,
        hue: palette[i % palette.length],
      });
    }

    let last = performance.now();
    const tick = (now: number) => {
      if (!alive || !cv) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = cv.clientWidth || 1280;
      const h = cv.clientHeight || 720;
      g.clearRect(0, 0, w, h);

      for (const p of embers) {
        p.x += p.vx * dt + Math.sin(now * 0.001 + p.y * 0.02) * 8 * dt;
        p.y += p.vy * dt;
        if (p.y < -12) {
          p.y = h + 12;
          p.x = Math.random() * w;
        }
        if (p.x < -12) p.x = w + 12;
        if (p.x > w + 12) p.x = -12;

        g.globalAlpha = p.alpha;
        g.fillStyle = p.hue;
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, accentColor]);

  if (!enabled) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-[5]"
    />
  );
}
