import React, { useEffect, useRef } from 'react';
import { assetUrl } from '../../assetUrl';
import { SPECIAL_ATLAS, SpecialSpriteId } from '../../data/specialsAtlas';

let cachedSpecialImg: HTMLImageElement | null = null;

function getSpecialImg(onLoad: () => void): HTMLImageElement {
  if (!cachedSpecialImg) {
    const img = new Image();
    img.src = assetUrl('/assets/sprites/specials-hd.webp');
    cachedSpecialImg = img;
  }
  if (!cachedSpecialImg.complete || cachedSpecialImg.naturalWidth === 0) {
    cachedSpecialImg.addEventListener('load', onLoad, { once: true });
  }
  return cachedSpecialImg;
}

export function SpecialSpritePreview({
  spriteId,
  alt,
  className = '',
}: {
  spriteId: SpecialSpriteId;
  alt: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    const draw = () => {
      if (!alive) return;
      const cv = canvasRef.current;
      if (!cv) return;
      const img = getSpecialImg(draw);
      if (!img.complete || img.naturalWidth === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = cv.clientWidth || 120;
      const cssH = cv.clientHeight || 96;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);

      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.clearRect(0, 0, cssW, cssH);

      const [sx, sy, sw, sh] = SPECIAL_ATLAS[spriteId];
      const scale = Math.min((cssW * 0.86) / sw, (cssH * 0.86) / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      g.drawImage(img, sx, sy, sw, sh, (cssW - dw) * 0.5, (cssH - dh) * 0.5, dw, dh);
    };
    draw();
    return () => {
      alive = false;
    };
  }, [spriteId]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={alt}
      className={`block ${className}`}
    />
  );
}
