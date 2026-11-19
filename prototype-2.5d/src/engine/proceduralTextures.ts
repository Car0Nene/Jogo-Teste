import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

export function finalizeColorTex(
  c: HTMLCanvasElement,
  anisotropy = 4,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function finalizeDataTex(
  c: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createSoftGlowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finalizeColorTex(c, 1);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0, 'rgba(6,5,12,0.88)');
  g.addColorStop(0.38, 'rgba(6,5,12,0.52)');
  g.addColorStop(0.75, 'rgba(6,5,12,0.16)');
  g.addColorStop(1, 'rgba(6,5,12,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finalizeColorTex(c, 1);
}

export function createHorizonFadeAlphaMap(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  // Top edge (v=1 -> far backdrop z) fades to 0; bottom edge (v=0 -> combat lane) is solid white (1.0)
  g.addColorStop(0, '#000000');
  g.addColorStop(0.42, '#404040');
  g.addColorStop(0.82, '#dfdfdf');
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  return finalizeDataTex(c, 1, 1);
}

export function createSidewalkSlabTextures(
  c1: string,
  c2: string,
  grout: string,
  anisotropy: number,
  rx = 14,
  ry = 5
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const [c, ctx] = makeCanvas(256, 256);
  const [bc, bctx] = makeCanvas(256, 256);
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#363636';
  bctx.fillRect(0, 0, 256, 256);

  const rows = 4;
  const cols = 4;
  const rh = 256 / rows;
  const cw = 256 / cols;
  for (let r = 0; r < rows; r++) {
    const ox = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + ox;
      const y = r * rh;
      const pick = ((r * 3 + col * 5) & 1) === 0;
      ctx.fillStyle = pick ? c1 : c2;
      ctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x + 3, y + 3, cw - 6, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.09)';
      ctx.fillRect(x + 3, y + rh - 5, cw - 6, 2);

      bctx.fillStyle = pick ? '#dcdcdc' : '#c8c8c8';
      bctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
    }
  }
  // Subtle damp stone sheen grain
  for (let i = 0; i < 320; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,245,255,0.045)' : 'rgba(15,12,24,0.06)';
    ctx.fillRect((i * 89) % 256, (i * 53) % 256, 4, 2);
  }
  return {
    map: finalizeColorTex(c, anisotropy, rx, ry),
    bumpMap: finalizeDataTex(bc, rx, ry),
  };
}

export function createEarthFloorTextures(
  c1: string,
  c2: string,
  pebbleHex: string,
  anisotropy: number,
  rx = 10,
  ry = 4
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const [c, ctx] = makeCanvas(256, 256);
  const [bc, bctx] = makeCanvas(256, 256);
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#888888';
  bctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 42; i++) {
    const x = (i * 73) % 256;
    const y = (i * 41) % 256;
    const rxPatch = 18 + ((i * 11) % 28);
    const ryPatch = 9 + ((i * 7) % 14);
    ctx.fillStyle = i % 2 === 0 ? c2 : 'rgba(255,205,150,0.08)';
    ctx.beginPath();
    ctx.ellipse(x, y, rxPatch, ryPatch, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 480; i++) {
    const x = (i * 97) % 256;
    const y = (i * 61) % 256;
    ctx.fillStyle = i % 3 === 0 ? pebbleHex : 'rgba(255,232,198,0.14)';
    ctx.fillRect(x, y, i % 4 === 0 ? 3 : 2, 2);
    bctx.fillStyle = i % 3 === 0 ? '#b2b2b2' : '#707070';
    bctx.fillRect(x, y, 2, 2);
  }
  return {
    map: finalizeColorTex(c, anisotropy, rx, ry),
    bumpMap: finalizeDataTex(bc, rx, ry),
  };
}

export function createBrickTextures(
  baseHex: string,
  altHex: string,
  mortarHex: string,
  anisotropy: number,
  rx = 4,
  ry = 2
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const [c, ctx] = makeCanvas(256, 256);
  const [bc, bctx] = makeCanvas(256, 256);
  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#383838';
  bctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 4;
  const rh = 256 / rows;
  const cw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + offset;
      const y = r * rh;
      const shade = ((r * 7 + col * 13) & 3) === 0;
      ctx.fillStyle = shade ? altHex : baseHex;
      ctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      // subtle highlight & bottom shadow for 2.5D depth
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 2, y + 2, cw - 4, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(x + 2, y + rh - 5, cw - 4, 3);

      bctx.fillStyle = shade ? '#c8c8c8' : '#e2e2e2';
      bctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
    }
  }
  return {
    map: finalizeColorTex(c, anisotropy, rx, ry),
    bumpMap: finalizeDataTex(bc, rx, ry),
  };
}

export function createCobbleFloorTextures(
  c1: string,
  c2: string,
  grout: string,
  anisotropy: number,
  rx = 8,
  ry = 4
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const [c, ctx] = makeCanvas(256, 256);
  const [bc, bctx] = makeCanvas(256, 256);
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#303030';
  bctx.fillRect(0, 0, 256, 256);

  const rows = 6;
  const cols = 6;
  const rh = 256 / rows;
  const cw = 256 / cols;
  for (let r = 0; r < rows; r++) {
    const ox = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + ox;
      const y = r * rh;
      const pick = ((r * 5 + col * 3) % 3) === 0;
      ctx.fillStyle = pick ? c2 : c1;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, cw - 6, rh - 6, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x + 6, y + 5, cw - 12, 3);

      bctx.fillStyle = pick ? '#d0d0d0' : '#ececec';
      bctx.beginPath();
      bctx.roundRect(x + 3, y + 3, cw - 6, rh - 6, 7);
      bctx.fill();
    }
  }
  return {
    map: finalizeColorTex(c, anisotropy, rx, ry),
    bumpMap: finalizeDataTex(bc, rx, ry),
  };
}

export function createCalcadaoTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#ebe4d5';
  ctx.fillRect(0, 0, 256, 256);
  // Classic Rio wave mosaic
  ctx.fillStyle = '#1f2937';
  for (let y = 0; y < 256; y += 64) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const wy = y + 18 + Math.sin((x / 256) * Math.PI * 2) * 14;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    for (let x = 256; x >= 0; x -= 8) {
      const wy = y + 40 + Math.sin((x / 256) * Math.PI * 2) * 14;
      ctx.lineTo(x, wy);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Subtle stone grain
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect((i * 73) % 256, (i * 41) % 256, 3, 3);
  }
  return finalizeColorTex(c, anisotropy, 9, 2);
}

export function createSandTexture(anisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [c, ctx] = makeCanvas(256, 256);
  const [bc, bctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#e8c484';
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    const wave = Math.sin((y / 256) * Math.PI * 4) * 12;
    ctx.fillStyle = y % 12 === 0 ? 'rgba(255,244,214,0.22)' : 'rgba(176,126,64,0.14)';
    ctx.fillRect(0, y + wave * 0.1, 256, 3);
    bctx.fillStyle = y % 12 === 0 ? '#a8a8a8' : '#686868';
    bctx.fillRect(0, y, 256, 3);
  }
  for (let i = 0; i < 650; i++) {
    const x = (i * 97) % 256;
    const y = (i * 53) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,225,0.28)' : 'rgba(150,104,50,0.22)';
    ctx.fillRect(x, y, 2, 2);
  }
  return {
    map: finalizeColorTex(c, anisotropy, 8, 4),
    bumpMap: finalizeDataTex(bc, 8, 4),
  };
}

export function createStripedTexture(
  c1: string,
  c2: string,
  anisotropy: number,
  stripes = 10
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 128);
  const sw = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? c1 : c2;
    ctx.fillRect(i * sw, 0, sw + 1, 128);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 96, 256, 32);
  return finalizeColorTex(c, anisotropy, 3, 1);
}

export function createCheckeredClothTexture(
  c1: string,
  c2: string,
  anisotropy: number
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  const step = 16;
  for (let y = 0; y < 128; y += step) {
    for (let x = 0; x < 128; x += step) {
      ctx.fillStyle = ((x / step + y / step) % 2 === 0) ? c1 : c2;
      ctx.fillRect(x, y, step, step);
    }
  }
  return finalizeColorTex(c, anisotropy, 2, 2);
}

export function createSignTexture(
  title: string,
  subtitle: string | null,
  bg: string,
  border: string,
  textColor: string,
  subColor: string,
  anisotropy: number,
  w = 512,
  h = 160
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 18);
  ctx.fill();

  ctx.lineWidth = 8;
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.font = `800 ${subtitle ? Math.round(h * 0.34) : Math.round(h * 0.44)}px "Barlow Condensed", sans-serif`;
  ctx.fillText(title, w / 2, subtitle ? h * 0.4 : h * 0.52);

  if (subtitle) {
    ctx.fillStyle = subColor;
    ctx.font = `600 ${Math.round(h * 0.17)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(subtitle, w / 2, h * 0.74);
  }
  return finalizeColorTex(c, anisotropy);
}

export function createFootballTvTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 144);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 0, 256, 144);
  // stands
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 36);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = i % 3 === 0 ? '#f43f5e' : i % 3 === 1 ? '#facc15' : '#f8fafc';
    ctx.fillRect((i * 17) % 254, 6 + ((i * 11) % 24), 4, 4);
  }
  // pitch lines
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 42, 232, 92);
  ctx.beginPath();
  ctx.moveTo(128, 42);
  ctx.lineTo(128, 134);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 88, 22, 0, Math.PI * 2);
  ctx.stroke();
  // players
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i < 4 ? '#facc15' : '#ef4444';
    ctx.fillRect(36 + i * 26, 62 + ((i * 23) % 50), 6, 10);
  }
  return finalizeColorTex(c, anisotropy);
}

export function createFloralSkirtTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#232c52';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle fabric weave
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }

  const blossoms = [
    { x: 34, y: 36, col: '#ec4899', r: 11 },
    { x: 96, y: 24, col: '#a855f7', r: 10 },
    { x: 162, y: 46, col: '#60a5fa', r: 12 },
    { x: 222, y: 32, col: '#f472b6', r: 10 },
    { x: 58, y: 102, col: '#818cf8', r: 12 },
    { x: 128, y: 92, col: '#ec4899', r: 13 },
    { x: 196, y: 110, col: '#c084fc', r: 11 },
    { x: 28, y: 172, col: '#f472b6', r: 12 },
    { x: 98, y: 164, col: '#60a5fa', r: 11 },
    { x: 168, y: 178, col: '#e879f9', r: 13 },
    { x: 230, y: 162, col: '#38bdf8', r: 10 },
    { x: 64, y: 228, col: '#ec4899', r: 11 },
    { x: 144, y: 232, col: '#a855f7', r: 12 },
    { x: 212, y: 222, col: '#f472b6', r: 11 },
  ];

  for (const b of blossoms) {
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.ellipse(b.x + b.r * 0.9, b.y + 4, 7, 3.2, 0.5, 0, Math.PI * 2);
    ctx.ellipse(b.x - b.r * 0.9, b.y - 3, 7, 3.2, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = b.col;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * b.r * 0.55, b.y + Math.sin(a) * b.r * 0.55, b.r * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeColorTex(c, anisotropy, 2, 1);
}

export function createDenimTexture(
  baseHex: string,
  skinHex: number | null,
  ripped: boolean,
  anisotropy: number
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Diagonal denim twill lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = -256; i < 512; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 256);
    ctx.stroke();
  }

  // Vertical side seams
  ctx.strokeStyle = 'rgba(24,38,66,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 0, 236, 256);

  if (ripped && skinHex !== null) {
    const col = new THREE.Color(skinHex);
    const skinCss = `#${col.getHexString()}`;
    for (const ry of [128, 176]) {
      ctx.fillStyle = 'rgba(220,232,245,0.85)';
      ctx.beginPath();
      ctx.ellipse(128, ry, 54, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skinCss;
      ctx.beginPath();
      ctx.ellipse(128, ry, 48, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dbeafe';
      ctx.lineWidth = 1.5;
      for (let x = 84; x <= 172; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, ry - 9);
        ctx.lineTo(x + 3, ry + 9);
        ctx.stroke();
      }
    }
  }

  return finalizeColorTex(c, anisotropy);
}

export function createArmTattooTexture(skinHex: number, anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 256);
  const col = new THREE.Color(skinHex);
  ctx.fillStyle = `#${col.getHexString()}`;
  ctx.fillRect(0, 0, 128, 256);

  ctx.strokeStyle = 'rgba(22,26,34,0.8)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const y of [55, 118, 175]) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.bezierCurveTo(44, y - 22, 84, y + 22, 114, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(64, y + 10, 14, Math.PI * 0.15, Math.PI * 1.45);
    ctx.stroke();
  }
  return finalizeColorTex(c, anisotropy);
}

export function createChestTattooTexture(skinHex: number, anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  const col = new THREE.Color(skinHex);
  ctx.fillStyle = `#${col.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(85,40,20,0.16)';
  ctx.beginPath();
  ctx.ellipse(94, 96, 34, 24, 0, 0, Math.PI * 2);
  ctx.ellipse(162, 96, 34, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(102, 142, 22, 22);
  ctx.fillRect(132, 142, 22, 22);
  ctx.fillRect(102, 172, 22, 22);
  ctx.fillRect(132, 172, 22, 22);

  ctx.strokeStyle = 'rgba(20,24,32,0.82)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const cx = 128 + side * 44;
    ctx.beginPath();
    ctx.moveTo(cx - side * 12, 48);
    ctx.quadraticCurveTo(cx + side * 30, 62, cx + side * 14, 94);
    ctx.quadraticCurveTo(cx - side * 10, 114, cx + side * 34, 124);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + side * 12, 78, 12, 0, Math.PI * 1.65);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - side * 4, 102, 8, Math.PI * 0.4, Math.PI * 1.9);
    ctx.stroke();
  }
  return finalizeColorTex(c, anisotropy);
}

export function createFaceTexture(
  skinHex: number,
  options: {
    plumLips?: boolean;
    beard?: boolean;
    mustache?: 'thick' | 'trim';
    smile?: boolean;
    wrinkles?: boolean;
  },
  anisotropy: number
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  const base = new THREE.Color(skinHex);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  const browShade = ctx.createLinearGradient(0, 65, 0, 122);
  browShade.addColorStop(0, 'rgba(60,30,18,0.12)');
  browShade.addColorStop(1, 'rgba(60,30,18,0)');
  ctx.fillStyle = browShade;
  ctx.fillRect(40, 65, 176, 58);

  const cheek = ctx.createRadialGradient(84, 152, 4, 84, 152, 34);
  cheek.addColorStop(0, 'rgba(220,90,70,0.24)');
  cheek.addColorStop(1, 'rgba(220,90,70,0)');
  ctx.fillStyle = cheek;
  ctx.fillRect(40, 110, 90, 80);

  const cheekR = ctx.createRadialGradient(172, 152, 4, 172, 152, 34);
  cheekR.addColorStop(0, 'rgba(220,90,70,0.24)');
  cheekR.addColorStop(1, 'rgba(220,90,70,0)');
  ctx.fillStyle = cheekR;
  ctx.fillRect(126, 110, 90, 80);

  if (options.wrinkles) {
    ctx.strokeStyle = 'rgba(95,52,26,0.34)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, 86);
    ctx.quadraticCurveTo(128, 82, 160, 86);
    ctx.moveTo(94, 158);
    ctx.quadraticCurveTo(86, 176, 98, 188);
    ctx.moveTo(162, 158);
    ctx.quadraticCurveTo(170, 176, 158, 188);
    ctx.stroke();
  }

  if (options.beard) {
    ctx.fillStyle = 'rgba(24,18,16,0.56)';
    ctx.beginPath();
    ctx.ellipse(128, 198, 62, 48, 0, 0, Math.PI);
    ctx.fill();
  }

  ctx.strokeStyle = options.wrinkles ? '#57535c' : '#1d1412';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(74, 108);
  ctx.quadraticCurveTo(94, 98, 112, 107);
  ctx.moveTo(144, 107);
  ctx.quadraticCurveTo(162, 98, 182, 108);
  ctx.stroke();

  for (const ex of [94, 162]) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(ex, 126, 15, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b2416';
    ctx.beginPath();
    ctx.arc(ex, 126, 7.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f0c0c';
    ctx.beginPath();
    ctx.arc(ex, 126, 4.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 2.8, 123.5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#161110';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(ex, 126, 15, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,245,230,0.18)';
  ctx.beginPath();
  ctx.ellipse(128, 146, 5, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = options.plumLips ? '#4a122a' : '#a1433a';
  ctx.beginPath();
  ctx.ellipse(128, 180, 21, options.smile ? 9.5 : 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (options.smile) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(128, 179, 15, 4.6, 0, 0, Math.PI);
    ctx.fill();
  }

  if (options.mustache === 'thick') {
    ctx.fillStyle = '#141114';
    ctx.beginPath();
    ctx.moveTo(128, 165);
    ctx.quadraticCurveTo(106, 153, 88, 169);
    ctx.quadraticCurveTo(108, 180, 128, 171);
    ctx.quadraticCurveTo(148, 180, 168, 169);
    ctx.quadraticCurveTo(150, 153, 128, 165);
    ctx.fill();
  } else if (options.beard) {
    ctx.fillStyle = 'rgba(20,16,16,0.88)';
    ctx.beginPath();
    ctx.ellipse(128, 167, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeColorTex(c, anisotropy);
}
