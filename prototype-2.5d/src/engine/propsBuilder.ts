import * as THREE from 'three';
import { assetUrl } from '../assetUrl';
import {
  SPECIAL_ATLAS,
  SPECIAL_SHEET_H,
  SPECIAL_SHEET_W,
  SpecialSpriteId,
} from '../data/specialsAtlas';
import { createSoftGlowTexture } from './proceduralTextures';

export type ProjectileKind =
  | 'cake'
  | 'beerBlast'
  | 'smoke'
  | 'milk'
  | 'superL'
  | 'brigadeiro'
  | 'food'
  | 'notes'
  | 'cigarette'
  | 'chinelo'
  | 'pizza'
  | 'pan'
  | 'rice'
  | 'controller'
  | 'count1'
  | 'count2'
  | 'count3';

/** Projéteis de golpes cômicos desenhados em código (canvas), sem atlas. */
const CANVAS_KINDS = ['cigarette', 'chinelo', 'pizza', 'pan', 'rice', 'controller', 'count1', 'count2', 'count3'] as const;
type CanvasKind = (typeof CANVAS_KINDS)[number];
export function isCanvasProjectile(kind: ProjectileKind): kind is CanvasKind {
  return (CANVAS_KINDS as readonly string[]).includes(kind);
}

let sharedSpecialTex: THREE.Texture | null = null;
let sharedSpecialDepthMat: THREE.MeshDepthMaterial | null = null;
let sharedGlowTex: THREE.Texture | null = null;

function getSpecialTexture(): THREE.Texture {
  if (sharedSpecialTex) return sharedSpecialTex;
  const tex = new THREE.TextureLoader().load(assetUrl('/assets/sprites/specials-hd.webp'));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  sharedSpecialTex = tex;
  return tex;
}

function getSpecialDepthMaterial(): THREE.MeshDepthMaterial {
  if (sharedSpecialDepthMat) return sharedSpecialDepthMat;
  sharedSpecialDepthMat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: getSpecialTexture(),
    alphaTest: 0.14,
  });
  return sharedSpecialDepthMat;
}

function getSharedGlowTexture(): THREE.Texture {
  if (sharedGlowTex) return sharedGlowTex;
  sharedGlowTex = createSoftGlowTexture();
  return sharedGlowTex;
}

function applySpriteUv(geo: THREE.PlaneGeometry, spriteId: SpecialSpriteId) {
  const [x, y, w, h] = SPECIAL_ATLAS[spriteId];
  // Slight 0.5px texel inset prevents mipmap bleeding from neighbors
  const u0 = (x + 0.5) / SPECIAL_SHEET_W;
  const u1 = (x + w - 0.5) / SPECIAL_SHEET_W;
  const v1 = 1 - (y + 0.5) / SPECIAL_SHEET_H;
  const v0 = 1 - (y + h - 0.5) / SPECIAL_SHEET_H;

  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // PlaneGeometry vertex order: (top-left, top-right, bottom-left, bottom-right)
  uv.setXY(0, u0, v1);
  uv.setXY(1, u1, v1);
  uv.setXY(2, u0, v0);
  uv.setXY(3, u1, v0);
  uv.needsUpdate = true;
}

const PROJECTILE_VISUAL: Record<
  ProjectileKind,
  { targetHeight: number; emissive: number; emissiveIntensity: number; glowHex?: number }
> = {
  cake: { targetHeight: 0.92, emissive: 0xff80ab, emissiveIntensity: 0.16, glowHex: 0xff80ab },
  beerBlast: { targetHeight: 1.05, emissive: 0x4ade80, emissiveIntensity: 0.45, glowHex: 0x4ade80 },
  smoke: { targetHeight: 1.02, emissive: 0x94a3b8, emissiveIntensity: 0.08 },
  milk: { targetHeight: 0.95, emissive: 0xe0f2fe, emissiveIntensity: 0.25, glowHex: 0xbae6fd },
  superL: { targetHeight: 1.15, emissive: 0xff4d6d, emissiveIntensity: 0.42, glowHex: 0xf43f5e },
  brigadeiro: { targetHeight: 0.78, emissive: 0xfbbf24, emissiveIntensity: 0.1 },
  food: { targetHeight: 0.86, emissive: 0xfdba74, emissiveIntensity: 0.12 },
  notes: { targetHeight: 0.96, emissive: 0xff6fd8, emissiveIntensity: 0.4, glowHex: 0xf472b6 },
  cigarette: { targetHeight: 0.5, emissive: 0xff7a1a, emissiveIntensity: 0.35, glowHex: 0xff6a00 },
  chinelo: { targetHeight: 0.42, emissive: 0, emissiveIntensity: 0 },
  pizza: { targetHeight: 0.9, emissive: 0, emissiveIntensity: 0, glowHex: 0xffb347 },
  pan: { targetHeight: 0.75, emissive: 0, emissiveIntensity: 0 },
  rice: { targetHeight: 0.46, emissive: 0, emissiveIntensity: 0 },
  controller: { targetHeight: 0.5, emissive: 0, emissiveIntensity: 0, glowHex: 0x60a5fa },
  count1: { targetHeight: 0.9, emissive: 0, emissiveIntensity: 0, glowHex: 0xfacc15 },
  count2: { targetHeight: 1.0, emissive: 0, emissiveIntensity: 0, glowHex: 0xfb923c },
  count3: { targetHeight: 1.25, emissive: 0, emissiveIntensity: 0, glowHex: 0xef4444 },
};

type Draw = (g: CanvasRenderingContext2D, W: number, H: number) => void;

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function comicText(text: string, fill: string): Draw {
  return (g, W, H) => {
    let size = Math.round(H * 0.82);
    g.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    const fit = (W * 0.9) / Math.max(1, g.measureText(text).width);
    if (fit < 1) {
      size = Math.floor(size * fit);
      g.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = size * 0.14;
    g.strokeStyle = '#1a0b02';
    g.strokeText(text, W / 2, H * 0.54);
    const grad = g.createLinearGradient(0, H * 0.15, 0, H * 0.9);
    grad.addColorStop(0, '#fffbe6');
    grad.addColorStop(0.35, fill);
    grad.addColorStop(1, fill);
    g.fillStyle = grad;
    g.fillText(text, W / 2, H * 0.54);
  };
}

/** [largura em px, altura em px, desenho]; a proporção define a largura no mundo. */
const CANVAS_DRAW: Record<Exclude<CanvasKind, 'cigarette'>, [number, number, Draw]> = {
  // chinelo visto de cima: sola azul, borda branca e tira em Y (sem marca)
  chinelo: [512, 200, (g, W, H) => {
    const cy = H / 2;
    g.save();
    g.translate(W / 2, cy);
    const sole = (sx: number, sy: number) => {
      g.beginPath();
      g.ellipse(-W * 0.18, 0, W * 0.26 * sx, H * 0.36 * sy, 0, 0, Math.PI * 2);
      g.ellipse(W * 0.2, 0, W * 0.24 * sx, H * 0.42 * sy, 0, 0, Math.PI * 2);
      g.rect(-W * 0.2, -H * 0.34 * sy, W * 0.4, H * 0.68 * sy);
    };
    g.fillStyle = '#f8fafc';
    sole(1.04, 1.1);
    g.fill();
    g.fillStyle = '#1d4ed8';
    sole(0.96, 0.98);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.ellipse(W * 0.12, -H * 0.12, W * 0.22, H * 0.12, 0, 0, Math.PI * 2);
    g.fill();
    // tira em Y
    g.strokeStyle = '#facc15';
    g.lineWidth = H * 0.1;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(W * 0.3, 0);
    g.lineTo(W * 0.02, -H * 0.3);
    g.moveTo(W * 0.3, 0);
    g.lineTo(W * 0.02, H * 0.3);
    g.stroke();
    g.restore();
  }],
  // pizza vista de cima: borda, queijo, calabresa e cortes
  pizza: [400, 400, (g, W, H) => {
    const c = W / 2;
    const r = W * 0.46;
    g.fillStyle = '#b45309';
    g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f59e0b';
    g.beginPath(); g.arc(c, c, r * 0.86, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fde68a';
    g.beginPath(); g.arc(c, c, r * 0.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(234,179,8,0.55)';
    for (let i = 0; i < 18; i++) { const a = i * 2.4; const d = (i % 6) * r * 0.12; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, r * 0.09, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#b91c1c';
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3; const d = r * (0.25 + (i % 3) * 0.2); g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, r * 0.1, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#166534';
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 1.1; const d = r * (0.18 + (i % 4) * 0.15); g.fillRect(c + Math.cos(a) * d, c + Math.sin(a) * d, r * 0.07, r * 0.04); }
    g.strokeStyle = 'rgba(120,53,15,0.55)';
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.moveTo(c - Math.cos(a) * r * 0.82, c - Math.sin(a) * r * 0.82); g.lineTo(c + Math.cos(a) * r * 0.82, c + Math.sin(a) * r * 0.82); g.stroke(); }
  }],
  // frigideira de lado, de cabeça para baixo (cai com o fundo na cabeça)
  pan: [512, 240, (g, W, H) => {
    g.fillStyle = '#3f2a1a';
    roundRect(g, W * 0.6, H * 0.42, W * 0.38, H * 0.14, H * 0.07);
    g.fill();
    g.fillStyle = '#1f2937';
    g.beginPath();
    g.ellipse(W * 0.32, H * 0.5, W * 0.3, H * 0.36, 0, 0, Math.PI * 2);
    g.fill();
    const grad = g.createRadialGradient(W * 0.26, H * 0.38, 4, W * 0.32, H * 0.5, W * 0.3);
    grad.addColorStop(0, '#9ca3af');
    grad.addColorStop(0.5, '#4b5563');
    grad.addColorStop(1, '#111827');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(W * 0.32, H * 0.5, W * 0.27, H * 0.31, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(W * 0.24, H * 0.36, W * 0.08, H * 0.05, -0.4, 0, Math.PI * 2);
    g.fill();
  }],
  // bolota de arroz queimado: grãos brancos com partes pretas
  rice: [160, 160, (g, W) => {
    const c = W / 2;
    for (let i = 0; i < 34; i++) {
      const a = i * 2.39;
      const d = Math.sqrt(i / 34) * W * 0.36;
      g.save();
      g.translate(c + Math.cos(a) * d, c + Math.sin(a) * d);
      g.rotate(a * 1.7);
      g.fillStyle = i % 4 === 0 ? '#1c1917' : i % 4 === 1 ? '#78350f' : '#fafaf9';
      g.beginPath();
      g.ellipse(0, 0, W * 0.07, W * 0.03, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }],
  // controle de videogame genérico (sem marca)
  controller: [440, 280, (g, W, H) => {
    g.fillStyle = '#111827';
    roundRect(g, W * 0.06, H * 0.2, W * 0.88, H * 0.5, H * 0.24);
    g.fill();
    g.beginPath(); g.ellipse(W * 0.22, H * 0.66, W * 0.15, H * 0.26, 0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(W * 0.78, H * 0.66, W * 0.15, H * 0.26, -0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#374151';
    roundRect(g, W * 0.1, H * 0.24, W * 0.8, H * 0.14, H * 0.07);
    g.fill();
    g.fillStyle = '#9ca3af';
    g.fillRect(W * 0.18, H * 0.43, W * 0.11, H * 0.05);
    g.fillRect(W * 0.21, H * 0.36, W * 0.05, H * 0.19);
    const btn = (x: number, y: number, col: string) => { g.fillStyle = col; g.beginPath(); g.arc(W * x, H * y, H * 0.05, 0, Math.PI * 2); g.fill(); };
    btn(0.76, 0.36, '#22c55e'); btn(0.83, 0.46, '#ef4444'); btn(0.69, 0.46, '#3b82f6'); btn(0.76, 0.56, '#facc15');
    g.fillStyle = '#4b5563';
    g.beginPath(); g.arc(W * 0.4, H * 0.6, H * 0.08, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(W * 0.6, H * 0.6, H * 0.08, 0, Math.PI * 2); g.fill();
  }],
  count1: [300, 300, comicText('1', '#facc15')],
  count2: [300, 300, comicText('2', '#fb923c')],
  count3: [420, 300, comicText('3!', '#ef4444')],
};

const canvasTexCache = new Map<string, THREE.Texture>();
function canvasTexture(key: string, W: number, H: number, draw: Draw): THREE.Texture {
  const hit = canvasTexCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  draw(c.getContext('2d')!, W, H);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  canvasTexCache.set(key, tex);
  return tex;
}

function buildCanvasProjectile(kind: Exclude<CanvasKind, 'cigarette'>): THREE.Group {
  const g = new THREE.Group();
  const [W, H, draw] = CANVAS_DRAW[kind];
  const vis = PROJECTILE_VISUAL[kind];
  const h = vis.targetHeight;
  const w = h * (W / H);
  const mat = new THREE.MeshBasicMaterial({ map: canvasTexture(kind, W, H, draw), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  quad.name = 'spriteQuad';
  g.add(quad);
  if (vis.glowHex) {
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: getSharedGlowTexture(), color: vis.glowHex, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    aura.scale.set(w * 1.5, h * 1.5, 1);
    aura.position.z = -0.05;
    g.add(aura);
  }
  g.userData.spriteId = kind;
  return g;
}

/** Texto cômico que sobe e some (BOING!, PAFT!, LAG!...). */
export function buildPopText(text: string, color: string): THREE.Sprite {
  const W = 512;
  const H = 180;
  const key = `pop:${text}:${color}`;
  const tex = canvasTexture(key, W, H, (g) => {
    g.translate(W / 2, H / 2);
    g.rotate(-0.08);
    g.translate(-W / 2, -H / 2);
    comicText(text, color)(g, W, H);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(1.9, 1.9 * (H / W), 1);
  sp.renderOrder = 20;
  return sp;
}

let sharedDogTex: THREE.Texture | null = null;
/** Doguinho, o cachorro do Daniel (recorte da foto), para a participação no especial. */
function getDoguinhoTexture(): THREE.Texture {
  if (sharedDogTex) return sharedDogTex;
  const tex = new THREE.TextureLoader().load(assetUrl('/assets/sprites/doguinho.webp'));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  sharedDogTex = tex;
  return tex;
}

let sharedCigaretteTex: THREE.Texture | null = null;

/** Cigarro aceso desenhado em canvas: brasa à direita (frente), filtro laranja e rastro de fumaça atrás. */
function getCigaretteTexture(): THREE.Texture {
  if (sharedCigaretteTex) return sharedCigaretteTex;
  const W = 512;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const cy = H / 2;
  // rastro de fumaça (atrás, à esquerda)
  for (let i = 0; i < 16; i++) {
    const k = i / 15;
    const x = 230 - k * 220;
    const y = cy + Math.sin(k * 7) * 14 * k;
    const r = 8 + k * 22;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(215,215,220,${0.5 * (1 - k)})`);
    grad.addColorStop(1, 'rgba(215,215,220,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const x0 = 210;
  const x1 = 470;
  const half = 13;
  // filtro
  const filt = g.createLinearGradient(0, cy - half, 0, cy + half);
  filt.addColorStop(0, '#f3b35b');
  filt.addColorStop(0.5, '#d9862c');
  filt.addColorStop(1, '#a25c16');
  g.fillStyle = filt;
  g.fillRect(x0, cy - half, 80, half * 2);
  g.fillStyle = 'rgba(120,60,10,0.35)';
  for (let i = 0; i < 26; i++) g.fillRect(x0 + 4 + ((i * 37) % 72), cy - half + ((i * 53) % 24), 3, 2);
  // papel
  const paper = g.createLinearGradient(0, cy - half, 0, cy + half);
  paper.addColorStop(0, '#ffffff');
  paper.addColorStop(0.55, '#ecebe6');
  paper.addColorStop(1, '#bdbbb2');
  g.fillStyle = paper;
  g.fillRect(x0 + 80, cy - half, x1 - x0 - 80, half * 2);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(x0 + 80, cy - half, 3, half * 2);
  // cinza + brasa
  g.fillStyle = '#5b5752';
  g.fillRect(x1, cy - half, 10, half * 2);
  const ember = g.createRadialGradient(x1 + 14, cy, 2, x1 + 14, cy, 26);
  ember.addColorStop(0, '#fff6c2');
  ember.addColorStop(0.3, '#ffb020');
  ember.addColorStop(0.65, '#ff4d00');
  ember.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = ember;
  g.beginPath();
  g.arc(x1 + 14, cy, 26, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedCigaretteTex = tex;
  return tex;
}

function buildCigaretteMesh(): THREE.Group {
  const g = new THREE.Group();
  const vis = PROJECTILE_VISUAL.cigarette;
  const h = vis.targetHeight;
  const w = h * 4;
  const tex = getCigaretteTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  quad.name = 'spriteQuad';
  g.add(quad);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getSharedGlowTexture(),
      color: vis.glowHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.name = 'ember';
  glow.scale.set(0.9, 0.9, 1);
  glow.position.set(w * 0.43, 0, 0.02);
  g.add(glow);
  g.userData.spriteId = 'cigarette';
  return g;
}

export function buildProjectileMesh(kind: ProjectileKind): THREE.Group {
  if (kind === 'cigarette') return buildCigaretteMesh();
  if (isCanvasProjectile(kind)) return buildCanvasProjectile(kind);
  const g = new THREE.Group();
  const vis = PROJECTILE_VISUAL[kind];
  const [, , aw, ah] = SPECIAL_ATLAS[kind];
  const aspect = aw / ah;
  const h = vis.targetHeight;
  const w = h * aspect;

  const tex = getSpecialTexture();
  const geo = new THREE.PlaneGeometry(w, h);
  applySpriteUv(geo, kind);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.14,
    transparent: false,
    side: THREE.DoubleSide,
    roughness: 0.42,
    metalness: 0.04,
    emissive: vis.emissive,
    emissiveMap: tex,
    emissiveIntensity: vis.emissiveIntensity,
  });

  const quad = new THREE.Mesh(geo, mat);
  quad.name = 'spriteQuad';
  quad.castShadow = true;
  quad.customDepthMaterial = getSpecialDepthMaterial();
  g.add(quad);

  if (vis.glowHex) {
    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getSharedGlowTexture(),
        color: vis.glowHex,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    aura.scale.set(w * 1.45, h * 1.45, 1);
    aura.position.z = -0.06;
    g.add(aura);
  }

  g.userData.spriteId = kind;
  return g;
}

export function setProjectileFacing(group: THREE.Group, facing: 1 | -1) {
  const quad = group.getObjectByName('spriteQuad');
  if (quad) {
    quad.scale.x = facing;
  }
  const ember = group.getObjectByName('ember');
  if (ember) ember.position.x = Math.abs(ember.position.x) * facing;
}

export function buildBurstMesh(): THREE.Group {
  const g = new THREE.Group();
  const [, , aw, ah] = SPECIAL_ATLAS.burst;
  const h = 1.45;
  const w = h * (aw / ah);
  const tex = getSpecialTexture();
  const geo = new THREE.PlaneGeometry(w, h);
  applySpriteUv(geo, 'burst');

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    alphaTest: 0.1,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const quad = new THREE.Mesh(geo, mat);
  quad.name = 'spriteQuad';
  quad.position.z = 0.28;
  g.add(quad);
  return g;
}

const CAMEO_VISUAL: Record<'dog' | 'dada' | 'kid', { initialSprite: SpecialSpriteId; height: number }> = {
  dog: { initialSprite: 'dog_run', height: 1.08 },
  dada: { initialSprite: 'dada', height: 1.68 },
  kid: { initialSprite: 'kid', height: 1.28 },
};

function buildDoguinhoMesh(shadowTex?: THREE.Texture): THREE.Group {
  const g = new THREE.Group();
  const h = 1.55;
  const w = h * (432 / 720);
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: getDoguinhoTexture(), alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, emissive: 0xffffff, emissiveMap: getDoguinhoTexture(), emissiveIntensity: 0.18 })
  );
  quad.name = 'spriteQuad';
  quad.position.y = h * 0.5;
  quad.castShadow = true;
  g.add(quad);
  if (shadowTex) {
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.3, 0.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.018;
    g.add(disc);
  }
  g.userData.doguinho = true;
  g.userData.baseHeight = h;
  return g;
}

export function buildCameoMesh(
  kind: 'dog' | 'dada' | 'kid',
  shadowTex?: THREE.Texture
): THREE.Group {
  if (kind === 'dog') return buildDoguinhoMesh(shadowTex);
  const g = new THREE.Group();
  const spec = CAMEO_VISUAL[kind];
  const [, , aw, ah] = SPECIAL_ATLAS[spec.initialSprite];
  const h = spec.height;
  const w = h * (aw / ah);

  const tex = getSpecialTexture();
  const geo = new THREE.PlaneGeometry(w, h);
  applySpriteUv(geo, spec.initialSprite);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.14,
    transparent: false,
    side: THREE.DoubleSide,
    roughness: 0.52,
    metalness: 0.04,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.16,
  });

  const quad = new THREE.Mesh(geo, mat);
  quad.name = 'spriteQuad';
  quad.position.y = h * 0.5;
  quad.castShadow = true;
  quad.customDepthMaterial = getSpecialDepthMaterial();
  g.add(quad);

  if (shadowTex) {
    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.95, 0.55),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.018;
    g.add(disc);
  }

  g.userData.spriteId = spec.initialSprite;
  g.userData.baseHeight = h;
  return g;
}

export function updateCameoVisual(
  group: THREE.Group,
  spriteId: SpecialSpriteId,
  facing: 1 | -1
) {
  const quad = group.getObjectByName('spriteQuad') as THREE.Mesh | undefined;
  if (!quad) return;
  if (group.userData.doguinho) {
    // a foto olha para a esquerda: espelha para correr para a direita
    const t = performance.now() / 1000;
    const attack = spriteId === 'dog_attack';
    const baseH = group.userData.baseHeight as number;
    const sq = attack ? 1.12 : 1 + Math.sin(t * 22) * 0.06;
    quad.scale.set(-facing * (attack ? 1.15 : 1 / sq), attack ? 1.08 : sq, 1);
    quad.rotation.z = attack ? -facing * 0.28 : Math.sin(t * 22) * 0.07;
    quad.position.y = baseH * quad.scale.y * 0.5 + (attack ? 0.35 : Math.abs(Math.sin(t * 11)) * 0.22);
    return;
  }
  quad.scale.x = facing;

  if (group.userData.spriteId !== spriteId) {
    group.userData.spriteId = spriteId;
    const baseH = (group.userData.baseHeight as number) || 1.08;
    const prevSprite = SPECIAL_ATLAS[
      (group.userData.prevSpriteId as SpecialSpriteId) || 'dog_run'
    ];
    const [, , aw, ah] = SPECIAL_ATLAS[spriteId];
    const [, , pw, ph] = prevSprite;
    const ratio = (aw / ah) / (pw / ph);
    quad.scale.y = spriteId === 'dog_attack' ? 1.18 : 1.0;
    quad.scale.x = facing * (spriteId === 'dog_attack' ? ratio * 1.12 : 1.0);
    quad.position.y = (baseH * quad.scale.y) * 0.5;
    applySpriteUv(quad.geometry as THREE.PlaneGeometry, spriteId);
  }
}
