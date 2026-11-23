import React, { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../assetUrl';
import { FIGHTERS, FighterId } from '../data/fighters';
import {
  ATLAS_HD2_SCALE,
  ATLAS_HD3_SCALE,
  ATLAS_HD4_SCALE,
  ATLAS_HD_SCALE,
  ATLAS_SCALE,
  DAVI_ATLAS_SCALE,
  SELECT_POSES,
  SPRITE_ATLAS,
  SpriteFrame,
} from '../data/spriteAtlas';

let cachedAtlasImg: HTMLImageElement | null = null;
let cachedAtlasHdImg: HTMLImageElement | null = null;
let cachedAtlasHd2Img: HTMLImageElement | null = null;
let cachedDaviImg: HTMLImageElement | null = null;
const cachedFighterHd3Imgs: Partial<Record<FighterId, HTMLImageElement>> = {};
const cachedFighterHd4Imgs: Partial<Record<FighterId, HTMLImageElement>> = {};

function ensureAtlasImages(onReady: () => void, id: FighterId) {
  if (!cachedAtlasImg) {
    const img = new Image();
    img.src = assetUrl('/assets/sprites/fighters.webp');
    cachedAtlasImg = img;
  }
  if (!cachedAtlasHdImg) {
    const hd = new Image();
    hd.src = assetUrl('/assets/sprites/pedro-hd.webp');
    cachedAtlasHdImg = hd;
  }
  if (!cachedAtlasHd2Img) {
    const hd2 = new Image();
    hd2.src = assetUrl('/assets/sprites/fighters-hd.webp');
    cachedAtlasHd2Img = hd2;
  }
  if (id !== 'pedro' && id !== 'davi' && !cachedFighterHd3Imgs[id]) {
    const hd3 = new Image();
    hd3.src = assetUrl(`/assets/sprites/${id}-hd.webp`);
    cachedFighterHd3Imgs[id] = hd3;
  }
  if (id !== 'davi' && !cachedFighterHd4Imgs[id]) {
    const hd4 = new Image();
    hd4.src = assetUrl(`/assets/sprites/${id}-specials-hd.webp`);
    cachedFighterHd4Imgs[id] = hd4;
  }

  const attach = (img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) return;
    img.addEventListener('load', onReady, { once: true });
  };
  attach(cachedAtlasImg);
  attach(cachedAtlasHdImg);
  attach(cachedAtlasHd2Img);
  if (id !== 'pedro' && id !== 'davi' && cachedFighterHd3Imgs[id]) {
    attach(cachedFighterHd3Imgs[id]);
  }
  if (id !== 'davi' && cachedFighterHd4Imgs[id]) {
    attach(cachedFighterHd4Imgs[id]);
  }
  if (id === 'davi') {
    if (!cachedDaviImg) {
      cachedDaviImg = new Image();
      cachedDaviImg.src = assetUrl('/assets/sprites/davi.webp');
    }
    attach(cachedDaviImg);
  }
}

export function AnimatedFighterCanvas({
  id,
  mirror = false,
  className = '',
}: {
  id: FighterId;
  mirror?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectStampRef = useRef<number>(performance.now());

  useEffect(() => {
    selectStampRef.current = performance.now();
  }, [id]);

  useEffect(() => {
    let raf = 0;
    let alive = true;

    const draw = (now: number) => {
      if (!alive) return;
      const cv = canvasRef.current;
      if (!cv) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = cv.clientWidth || 168;
      const cssH = cv.clientHeight || 126;
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (cv.width !== targetW || cv.height !== targetH) {
        cv.width = targetW;
        cv.height = targetH;
      }

      const g = cv.getContext('2d');
      if (!g) return;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.clearRect(0, 0, cssW, cssH);

      const spec = FIGHTERS[id];
      const glow = g.createRadialGradient(
        cssW / 2,
        cssH * 0.7,
        6,
        cssW / 2,
        cssH * 0.7,
        cssW * 0.54
      );
      glow.addColorStop(0, `${spec.accentHex}38`);
      glow.addColorStop(1, `${spec.accentHex}00`);
      g.fillStyle = glow;
      g.fillRect(0, 0, cssW, cssH);

      const floorY = cssH - 12;
      const floorGlow = g.createRadialGradient(
        cssW / 2,
        floorY,
        2,
        cssW / 2,
        floorY,
        cssW * 0.34
      );
      floorGlow.addColorStop(0, 'rgba(5, 6, 17, 0.75)');
      floorGlow.addColorStop(1, 'rgba(5, 6, 17, 0)');
      g.fillStyle = floorGlow;
      g.beginPath();
      g.ellipse(cssW / 2, floorY, cssW * 0.32, 9, 0, 0, Math.PI * 2);
      g.fill();

      const S = SPRITE_ATLAS[id];
      const idleFrames = S?.idle || [];
      if (!idleFrames.length) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const t = now / 1000;
      const sincePick = (now - selectStampRef.current) / 1000;
      const sp = SELECT_POSES[id];
      const poseArr = sp ? S[sp.anim] : undefined;
      const poseFrame = poseArr?.[sp.frame];

      // Strike signature select pose right when selected or rhythmically during showcase, otherwise smooth idle cycle
      const strikePose =
        Boolean(poseFrame) &&
        (sincePick < 0.9 || Math.sin(t * 0.9 + (mirror ? 1.4 : 0)) > 0.78);

      const frame: SpriteFrame = strikePose && poseFrame
        ? poseFrame
        : idleFrames[Math.floor(t * 5.5 + (mirror ? 0.35 : 0)) % idleFrames.length];

      const [sx, sy, sw, sh, ax, ay, hdFlag] = frame;
      const tier = hdFlag === 5 ? 5 : hdFlag === 4 ? 4 : hdFlag === 3 ? 3 : hdFlag === 2 ? 2 : hdFlag === 1 ? 1 : 0;
      const srcImg =
        tier === 5
          ? cachedDaviImg
          : tier === 4
          ? cachedFighterHd4Imgs[id]
          : tier === 3
          ? cachedFighterHd3Imgs[id]
          : tier === 2
          ? cachedAtlasHd2Img
          : tier === 1
          ? cachedAtlasHdImg
          : cachedAtlasImg;

      if (srcImg && srcImg.complete && srcImg.naturalWidth > 0) {
        const ad =
          tier === 5
            ? DAVI_ATLAS_SCALE
            : tier === 4
            ? ATLAS_HD4_SCALE
            : tier === 3
            ? ATLAS_HD3_SCALE
            : tier === 2
            ? ATLAS_HD2_SCALE
            : tier === 1
            ? ATLAS_HD_SCALE
            : ATLAS_SCALE;
        const normW = sw / ad;
        const normH = sh / ad;
        const fitScale = Math.min((cssH * 0.84) / normH, (cssW * 0.88) / normW) / ad;
        const breath = Math.sin(t * 3.2 + (mirror ? 1.1 : 0));
        const sxScale = fitScale * (1 - breath * 0.01);
        const syScale = fitScale * (1 + breath * 0.015);

        g.save();
        g.translate(cssW / 2, floorY);
        g.scale(mirror ? -sxScale : sxScale, syScale);
        g.drawImage(srcImg, sx, sy, sw, sh, -ax, -ay, sw, sh);
        g.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    ensureAtlasImages(() => {
      if (alive) draw(performance.now());
    }, id);
    raf = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [id, mirror]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-[120px] ${className}`}
      aria-label={`Animação de ${FIGHTERS[id].name}`}
    />
  );
}

export function TitleLockupSvg() {
  return (
    <svg
      viewBox="0 0 640 164"
      className="w-full max-w-[560px] h-auto drop-shadow-[0_10px_28px_rgba(0,0,0,0.75)]"
      role="img"
      aria-label="Família Fighter 2.5D"
    >
      <defs>
        <linearGradient id="ffGoldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="ffAccentGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#facc15" />
        </linearGradient>
      </defs>

      {/* Ornamental top bar */}
      <path d="M96 22 H544 L530 30 H110 Z" fill="url(#ffAccentGrad)" opacity="0.92" />

      {/* Main Title: FAMÍLIA */}
      <text
        x="320"
        y="84"
        textAnchor="middle"
        fill="url(#ffGoldGrad)"
        stroke="#1c0d09"
        strokeWidth="7"
        paintOrder="stroke"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontStyle: 'italic',
          fontSize: '74px',
          letterSpacing: '0.04em',
        }}
      >
        FAMÍLIA FIGHTER
      </text>

      {/* Sub-crest */}
      <path d="M168 104 H472 L454 134 H186 Z" fill="#18121b" stroke="#fbbf24" strokeWidth="2.5" />
      <text
        x="320"
        y="125"
        textAnchor="middle"
        fill="#fef3c7"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '21px',
          letterSpacing: '0.2em',
        }}
      >
        EDIÇÃO 2.5D SEMIRREALISTA
      </text>
    </svg>
  );
}

export function FighterIconSvg({ id, color }: { id: FighterId; color: string }) {
  return (
    <svg viewBox="0 0 36 36" className="w-7 h-7 shrink-0" aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="#18141c" stroke={color} strokeWidth="2.2" />
      {id === 'juraci' && (
        <>
          <path d="M9 15 C9 8, 27 8, 27 15 Z" fill="#f8fafc" />
          <circle cx="18" cy="20" r="6" fill="#d48b54" />
        </>
      )}
      {id === 'carlos' && (
        <>
          <path d="M11 13 Q18 7 25 13 L24 17 L12 17 Z" fill="#18181b" />
          <rect x="11" y="17" width="6" height="3.5" rx="1" fill="#dc2626" />
          <rect x="19" y="17" width="6" height="3.5" rx="1" fill="#dc2626" />
        </>
      )}
      {id === 'pedro' && (
        <>
          <path d="M10 26 L12 10 Q18 7 24 10 L26 26 Z" fill="#18181b" />
          <circle cx="18" cy="17" r="5" fill="#a66238" />
          <path d="M14 19 Q18 23 22 19" stroke="#18181b" strokeWidth="2.5" fill="none" />
        </>
      )}
      {id === 'daniel' && (
        <>
          <circle cx="18" cy="16" r="6" fill="#d99b6a" />
          <path d="M11 28 L15 22 M25 28 L21 22" stroke="#ff1e8a" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {id === 'franciely' && (
        <>
          <circle cx="18" cy="10" r="5" fill="#1c1417" />
          <circle cx="18" cy="19" r="5.8" fill="#c9824e" />
          <rect x="12.5" y="17" width="4.5" height="3.2" stroke="#f8fafc" strokeWidth="1.2" fill="none" />
          <rect x="19" y="17" width="4.5" height="3.2" stroke="#f8fafc" strokeWidth="1.2" fill="none" />
        </>
      )}
      {id === 'gabi' && (
        <>
          <circle cx="18" cy="17" r="6" fill="#d18a52" />
          <path d="M12 20 Q15 17 18 19.5 Q21 17 24 20" stroke="#141114" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )}
      {id === 'paula' && (
        <>
          <circle cx="18" cy="16" r="5.5" fill="#dca06f" />
          <rect x="16.5" y="21" width="3" height="8" fill="#cbd5e1" />
          <rect x="14" y="25" width="8" height="5" rx="1" fill="#94a3b8" />
        </>
      )}
      {id === 'tainara' && (
        <>
          <path d="M10 26 L12 10 Q18 7 24 10 L26 26 Z" fill="#141013" />
          <circle cx="18" cy="17" r="5" fill="#d08956" />
          <circle cx="11.5" cy="20" r="2.2" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
          <circle cx="24.5" cy="20" r="2.2" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
        </>
      )}
    </svg>
  );
}

export function FighterPortrait({
  id,
  size = 'md',
  className = '',
}: {
  id: FighterId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const spec = FIGHTERS[id];

  const sizeClass =
    size === 'sm'
      ? 'w-10 h-10 rounded-md'
      : size === 'md'
      ? 'w-12 h-12 rounded-lg'
      : size === 'lg'
      ? 'w-16 h-16 rounded-xl'
      : 'w-20 h-20 rounded-xl';

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden bg-stone-900 border-2 shadow-md flex items-center justify-center ${className}`}
      style={{ borderColor: spec.accentHex }}
    >
      {failed ? (
        <FighterIconSvg id={id} color={spec.accentHex} />
      ) : (
        <img
          src={spec.portraitUrl}
          alt={spec.name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      )}
    </div>
  );
}
