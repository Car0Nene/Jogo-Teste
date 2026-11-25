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
  | 'cigarette';

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
};

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

export function buildCameoMesh(
  kind: 'dog' | 'dada' | 'kid',
  shadowTex?: THREE.Texture
): THREE.Group {
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
