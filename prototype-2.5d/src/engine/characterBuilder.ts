import * as THREE from 'three';
import { assetUrl } from '../assetUrl';
import { FIGHTERS, FighterId, FORMS, FormId } from '../data/fighters';
import { STAGES, StageId } from '../data/stages';
import {
  ATLAS_HD2_SCALE,
  ATLAS_HD3_SCALE,
  ATLAS_HD4_SCALE,
  ATLAS_HD_SCALE,
  ATLAS_SCALE,
  BASE_SPRITE_HEIGHT,
  CHAR_SPRITE_SCALE,
  DAVI_ATLAS_SCALE,
  SELECT_POSES,
  SPRITE_ATLAS,
  SpriteFrame,
} from '../data/spriteAtlas';
import { createContactShadowTexture } from './proceduralTextures';

const WORLD_UNIT_PER_GAME_PX = 0.0132;
const SCALE_STABLE_STATES = new Set<AnimState>([
  'idle',
  'walk',
  'backwalk',
  'run',
  'guard',
  'light',
  'medium',
  'heavy',
  'combo',
  'air',
  'special',
  'hitstun',
  'jump',
  'fall',
  'victory',
]);

let sharedAtlasTex: THREE.Texture | null = null;
let sharedAtlasHdTex: THREE.Texture | null = null;
let sharedAtlasHd2Tex: THREE.Texture | null = null;
const sharedFighterHd3Tex: Partial<Record<FighterId, THREE.Texture>> = {};
const sharedFighterHd4Tex: Partial<Record<FighterId, THREE.Texture>> = {};
let sharedDaviTex: THREE.Texture | null = null;

function configureSpriteTexture(tex: THREE.Texture, anisotropy: number): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function getAtlasTexture(tier: 0 | 1 | 2, anisotropy: number): THREE.Texture {
  const existing = tier === 2 ? sharedAtlasHd2Tex : tier === 1 ? sharedAtlasHdTex : sharedAtlasTex;
  if (existing) return existing;

  const loader = new THREE.TextureLoader();
  const url =
    tier === 2
      ? assetUrl('/assets/sprites/fighters-hd.webp')
      : tier === 1
      ? assetUrl('/assets/sprites/pedro-hd.webp')
      : assetUrl('/assets/sprites/fighters.webp');
  const tex = configureSpriteTexture(loader.load(url), anisotropy);

  if (tier === 2) sharedAtlasHd2Tex = tex;
  else if (tier === 1) sharedAtlasHdTex = tex;
  else sharedAtlasTex = tex;
  return tex;
}

function getFighterHd3Texture(id: FighterId, anisotropy: number): THREE.Texture | undefined {
  if (id === 'pedro' || id === 'davi') return undefined;
  if (sharedFighterHd3Tex[id]) return sharedFighterHd3Tex[id];
  const loader = new THREE.TextureLoader();
  const tex = configureSpriteTexture(loader.load(assetUrl(`/assets/sprites/${id}-hd.webp`)), anisotropy);
  sharedFighterHd3Tex[id] = tex;
  return tex;
}

function getFighterHd4Texture(id: FighterId, anisotropy: number): THREE.Texture | undefined {
  if (id === 'davi') return undefined;
  if (sharedFighterHd4Tex[id]) return sharedFighterHd4Tex[id];
  const loader = new THREE.TextureLoader();
  const tex = configureSpriteTexture(loader.load(assetUrl(`/assets/sprites/${id}-specials-hd.webp`)), anisotropy);
  sharedFighterHd4Tex[id] = tex;
  return tex;
}

function getDaviTexture(anisotropy: number): THREE.Texture {
  if (sharedDaviTex) return sharedDaviTex;
  const loader = new THREE.TextureLoader();
  sharedDaviTex = configureSpriteTexture(loader.load(assetUrl('/assets/sprites/davi.webp')), anisotropy);
  return sharedDaviTex;
}

export type AnimState =
  | 'idle'
  | 'walk'
  | 'backwalk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'crouch'
  | 'guard'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'combo'
  | 'air'
  | 'special'
  | 'transform'
  | 'hitstun'
  | 'knockdown'
  | 'victory';

export interface AnimContext {
  form: FormId;
  nextForm?: FormId;
  moveAnim?: string;
  moveTiming?: { startup: number; active: number; recovery: number };
  vy?: number;
  vx?: number;
  isSelectShowcase?: boolean;
  cameraPos?: THREE.Vector3;
}

export interface CharacterRig {
  id: FighterId;
  root: THREE.Group;
  billboardGroup: THREE.Group;
  motionGroup: THREE.Group;
  spriteMesh: THREE.Mesh;
  spriteGeo: THREE.BufferGeometry;
  spriteMat: THREE.MeshStandardMaterial;
  depthMat: THREE.MeshDepthMaterial;
  trailMeshes: THREE.Mesh[];
  guardShield: THREE.Mesh;
  baptismBeam?: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  auraRing: THREE.Mesh;
  auraLight: THREE.PointLight;
  contactShadow: THREE.Mesh;
  atlasTex: THREE.Texture;
  atlasHdTex: THREE.Texture;
  atlasHd2Tex: THREE.Texture;
  atlasHd3Tex?: THREE.Texture;
  atlasHd4Tex?: THREE.Texture;
  daviTex?: THREE.Texture;
  atlasTier: 0 | 1 | 2 | 3 | 4 | 5;
  baseScale: number;
  baseShadowOpacity: number;
  hitFlashTimer: number;
}

function createSpriteQuadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  // 4 vertices: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
  const positions = new Float32Array([
    -0.6, 2.0, 0,
    0.6, 2.0, 0,
    -0.6, 0.0, 0,
    0.6, 0.0, 0,
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);
  const uvs = new Float32Array([
    0, 1,
    1, 1,
    0, 0,
    1, 0,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  return geo;
}

export function buildCharacterRig(
  id: FighterId,
  anisotropy: number,
  shadowTex?: THREE.Texture
): CharacterRig {
  const spec = FIGHTERS[id];
  const atlasTex = getAtlasTexture(0, anisotropy);
  const atlasHdTex = getAtlasTexture(1, anisotropy);
  const atlasHd2Tex = getAtlasTexture(2, anisotropy);
  const atlasHd3Tex = getFighterHd3Texture(id, anisotropy);
  const atlasHd4Tex = getFighterHd4Texture(id, anisotropy);
  const daviTex = id === 'davi' ? getDaviTexture(anisotropy) : undefined;

  const root = new THREE.Group();

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.36, 0.54),
    new THREE.MeshBasicMaterial({
      map: shadowTex || createContactShadowTexture(),
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.012;
  root.add(contactShadow);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.86, 36),
    new THREE.MeshBasicMaterial({
      color: spec.auraColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.03;
  root.add(auraRing);

  const auraLight = new THREE.PointLight(spec.auraColor, 0, 4.6, 2);
  auraLight.position.set(0, 1.15, 0.55);
  root.add(auraLight);

  const billboardGroup = new THREE.Group();
  root.add(billboardGroup);

  const motionGroup = new THREE.Group();
  billboardGroup.add(motionGroup);

  const spriteGeo = createSpriteQuadGeometry();
  const spriteMat = new THREE.MeshStandardMaterial({
    map: atlasTex,
    alphaTest: 0.22,
    transparent: false,
    side: THREE.DoubleSide,
    roughness: 0.66,
    metalness: 0.05,
  });
  const rimUniform = {
    uRimTint: { value: new THREE.Color(0xffb86b) },
    uRimPower: { value: 0.16 },
  };
  spriteMat.userData.rimUniform = rimUniform;
  spriteMat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimTint = rimUniform.uRimTint;
    shader.uniforms.uRimPower = rimUniform.uRimPower;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vSpriteLocalY;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vSpriteLocalY = position.y;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uRimTint;
         uniform float uRimPower;
         varying float vSpriteLocalY;`
      )
      .replace(
        '#include <dithering_fragment>',
        `vec3 viewDirSafe = normalize(vViewPosition);
         float rimEdge = pow(1.0 - clamp(abs(dot(normal, viewDirSafe)), 0.0, 1.0), 1.65);
         float groundBounce = smoothstep(0.0, 0.85, vSpriteLocalY);
         gl_FragColor.rgb += uRimTint * (rimEdge * uRimPower * (0.4 + 0.6 * groundBounce));
         #include <dithering_fragment>`
      );
  };

  const depthMat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: atlasTex,
    alphaTest: 0.26,
  });

  const spriteMesh = new THREE.Mesh(spriteGeo, spriteMat);
  spriteMesh.castShadow = true;
  spriteMesh.receiveShadow = false;
  spriteMesh.customDepthMaterial = depthMat;
  spriteMesh.visible = false;
  motionGroup.add(spriteMesh);

  // Motion-blur afterimage trails for dashes/runs
  const trailMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const tMat = new THREE.MeshBasicMaterial({
      map: atlasTex,
      alphaTest: 0.15,
      transparent: true,
      opacity: 0,
      color: spec.auraColor,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const tMesh = new THREE.Mesh(spriteGeo, tMat);
    tMesh.visible = false;
    motionGroup.add(tMesh);
    trailMeshes.push(tMesh);
  }

  // Translucent 3D energy guard shield arc
  const guardShield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.7, 16, 1, true, -Math.PI * 0.35, Math.PI * 0.7),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  guardShield.position.set(0.35, 0.95, 0.12);
  guardShield.visible = false;
  billboardGroup.add(guardShield);

  // Carlos Modo Fé floating 3D golden halo & baptism beam
  let haloMesh: THREE.Mesh | undefined;
  let baptismBeam: THREE.Mesh | undefined;
  if (id === 'carlos') {
    haloMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.022, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xffe478, transparent: true, opacity: 0.92 })
    );
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(0, 2.25, 0.05);
    haloMesh.visible = false;
    billboardGroup.add(haloMesh);

    baptismBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.78, 5.0, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff3b0,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    baptismBeam.position.set(0, 2.5, -0.05);
    baptismBeam.visible = false;
    billboardGroup.add(baptismBeam);
  }

  return {
    id,
    root,
    billboardGroup,
    motionGroup,
    spriteMesh,
    spriteGeo,
    spriteMat,
    depthMat,
    trailMeshes,
    guardShield,
    baptismBeam,
    haloMesh,
    auraRing,
    auraLight,
    contactShadow,
    atlasTex,
    atlasHdTex,
    atlasHd2Tex,
    atlasHd3Tex,
    atlasHd4Tex,
    daviTex,
    atlasTier: 0,
    baseScale: CHAR_SPRITE_SCALE[id] || 1.2,
    baseShadowOpacity: 0.46,
    hitFlashTimer: 0,
  };
}

export function applyStageLightingToRig(rig: CharacterRig, stageId: StageId) {
  const st = STAGES[stageId];
  rig.spriteMat.color.setHex(st.charTint);
  rig.spriteMat.envMapIntensity = st.charEnvIntensity;
  const rim = rig.spriteMat.userData.rimUniform as
    | { uRimTint: { value: THREE.Color }; uRimPower: { value: number } }
    | undefined;
  if (rim) {
    rim.uRimTint.value.setHex(st.rimColor);
    rim.uRimPower.value = 0.12 + st.rimIntensity * 0.08;
  }
  rig.spriteMat.needsUpdate = true;
  rig.baseShadowOpacity = st.shadowOpacity;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pickFrame(frames: SpriteFrame[] | undefined, idx: number): SpriteFrame | null {
  if (!Array.isArray(frames) || !frames.length) return null;
  return frames[clamp(Math.floor(idx), 0, frames.length - 1)];
}

function cycleFrame(frames: SpriteFrame[] | undefined, fps: number, time: number): SpriteFrame | null {
  if (!Array.isArray(frames) || !frames.length) return null;
  const idx = Math.floor(Math.max(0, time) * fps) % frames.length;
  return frames[idx];
}

function attackFrame(
  frames: SpriteFrame[] | undefined,
  t: number,
  timing?: { startup: number; active: number; recovery: number }
): SpriteFrame | null {
  if (!Array.isArray(frames) || !frames.length) return null;
  const n = frames.length;
  if (n === 1) return frames[0];
  const su = timing?.startup ?? 0.08;
  const act = timing?.active ?? 0.1;
  const rec = timing?.recovery ?? 0.18;
  if (t < su) return frames[Math.min(n - 2, Math.floor((t / Math.max(0.01, su)) * (n - 1)))];
  if (t < su + act + rec * 0.6) return frames[n - 1];
  return frames[0];
}

interface PoseResult {
  frame: SpriteFrame | null;
  rot: number;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
}

function resolveSpritePose(
  id: FighterId,
  state: AnimState,
  stateTime: number,
  worldTime: number,
  ctx: AnimContext
): PoseResult {
  const S = SPRITE_ATLAS[id];
  const fallback = S.idle || [];
  const pose: PoseResult = {
    frame: fallback[0] || null,
    rot: 0,
    dx: 0,
    dy: 0,
    sx: 1,
    sy: 1,
  };
  if (!fallback.length) return pose;

  const t = stateTime;

  // Showcase idle/select animation on Title & Escolher Lutador screens
  if (ctx.isSelectShowcase) {
    // Cycle smoothly through idle frames and briefly highlight iconic select pose
    const sp = SELECT_POSES[id];
    const idleCycle = cycleFrame(S.idle, 5.5, worldTime + (id.length * 0.17));
    if (sp && S[sp.anim]?.[sp.frame] && Math.sin(worldTime * 0.85 + id.length) > 0.72) {
      pose.frame = S[sp.anim][sp.frame];
      pose.sy = 1 + Math.sin(worldTime * 4) * 0.014;
      pose.sx = 1 - Math.sin(worldTime * 4) * 0.008;
    } else {
      pose.frame = idleCycle;
      const breath = Math.sin(worldTime * 2.8 + id.length);
      pose.sy = 1 + breath * 0.014;
      pose.sx = 1 - breath * 0.008;
    }
    return pose;
  }

  // Transform state (choreographed HD 2.5D transformation animations!)
  if (state === 'transform') {
    const formKey = ctx.nextForm || ctx.form;
    const total = formKey === 'hulk' ? 1.3 : formKey === 'crente' ? 1.4 : 1.15;
    const frames = S[formKey] && S[formKey].length ? S[formKey] : fallback;
    switch (formKey) {
      case 'gordao':
        if (t < 0.65) {
          pose.frame = frames[0];
          pose.sy = 1 - Math.sin(((t % 0.16) / 0.16) * Math.PI) * 0.035;
          pose.sx = 1 + Math.sin(((t % 0.16) / 0.16) * Math.PI) * 0.02;
        } else {
          const k = clamp((t - 0.65) / (total - 0.65), 0, 1);
          pose.frame = frames[1] || frames[0];
          const swell = 1 + Math.sin(k * Math.PI) * 0.09;
          pose.sx = swell;
          pose.sy = swell;
        }
        break;
      case 'crente':
        if (t < 0.68) {
          pose.frame = frames[0];
          pose.dy = 2 * Math.sin(t * 6);
        } else {
          const k = clamp((t - 0.68) / (total - 0.68), 0, 1);
          pose.frame = frames[frames.length - 1];
          pose.sx = 1 + Math.sin(k * Math.PI) * 0.06;
          pose.sy = 1 + Math.sin(k * Math.PI) * 0.06;
        }
        break;
      case 'hulk':
        if (t < 0.62 && S.drink) {
          pose.frame = S.drink[0];
          pose.rot = -0.04 * Math.sin((t / 0.62) * Math.PI);
        } else if (S.hulkPower && S.hulkPower.length) {
          const power = clamp((t - 0.62) / (total - 0.62), 0, 1);
          pose.frame = pickFrame(S.hulkPower, Math.floor(power * S.hulkPower.length));
          pose.sx = pose.sy = 0.94 + Math.sin(power * Math.PI * 0.7) * 0.14;
        } else {
          pose.frame = pickFrame(S.hulk, 0);
        }
        break;
      case 'praia':
        pose.frame = t < 0.6 ? cycleFrame(S.dance || frames, 7, t) : frames[0];
        if (t >= 0.6) {
          const k = clamp((t - 0.6) / 0.55, 0, 1);
          pose.sx = pose.sy = 1 + Math.sin(k * Math.PI) * 0.08;
        }
        break;
      case 'brava':
      case 'paulaFury':
      case 'ricePower':
        if (t < 0.55) {
          pose.frame = frames[0];
          pose.dx = Math.sin(t * 65) * 2.5;
        } else {
          const k = clamp((t - 0.55) / (total - 0.55), 0, 1);
          pose.frame = frames[Math.min(frames.length - 1, 1)];
          pose.sx = pose.sy = 1 + Math.sin(k * Math.PI) * 0.09;
        }
        break;
      default:
        pose.frame = pickFrame(frames, Math.floor((t / total) * frames.length));
        break;
    }
    return pose;
  }

  const specialState = state === 'knockdown' || state === 'victory';

  // Big forms: Carlos Gordão & Pedro Monstrão
  const big =
    ctx.form === 'gordao' && S.gordao
      ? { idle: S.gordao[1] || S.gordao[0], windup: S.gordao[1] || S.gordao[0], pose: S.gordao[2] || S.gordao[1], hurt: S.hurt?.[0] || S.gordao[1] }
      : ctx.form === 'hulk' && S.hulk
      ? { idle: S.hulk[0], windup: S.hulk[0], pose: S.hulk[1] || S.hulk[0], hurt: S.hulk[0] }
      : null;

  if (big && !specialState) {
    if (state === 'light' || state === 'medium' || state === 'heavy' || state === 'combo' || state === 'air' || state === 'special') {
      const su = ctx.moveTiming?.startup ?? 0.1;
      const active = t >= su;
      const hulkBlast = ctx.form === 'hulk' && ctx.moveAnim === 'hulkBlast' ? S.hulkBlast : null;
      pose.frame =
        hulkBlast && hulkBlast.length
          ? attackFrame(hulkBlast, t, ctx.moveTiming)
          : active
          ? big.pose
          : big.windup;
      pose.dx = active ? 14 : -5;
      pose.sx = active ? 1.05 : 0.97;
    } else if (state === 'hitstun' || state === 'guard') {
      pose.frame = big.hurt;
      pose.rot = state === 'hitstun' ? -0.08 : 0;
    } else {
      pose.frame = big.idle;
      const bounce =
        state === 'walk' || state === 'run' || state === 'backwalk'
          ? Math.abs(Math.sin(t * 10)) * 0.05
          : Math.sin(worldTime * 5) * 0.015;
      pose.sy = 1 - bounce;
      pose.sx = 1 + bounce;
      if (state === 'crouch') {
        pose.sy = 0.82;
        pose.sx = 1.07;
      }
    }
    return pose;
  }

  // Natal Praia: Daniel wearing Santa hat & beach moves
  if (
    ctx.form === 'praia' &&
    S.praia &&
    ['idle', 'walk', 'backwalk', 'run', 'light', 'medium', 'heavy', 'special'].includes(state)
  ) {
    if (['light', 'medium', 'heavy', 'special'].includes(state)) {
      const su = ctx.moveTiming?.startup ?? 0.1;
      pose.frame = pickFrame(S.praia, t >= su ? 2 : 1);
    } else if (state === 'walk' || state === 'backwalk' || state === 'run') {
      pose.frame = t % 0.24 < 0.12 ? S.praia[1] : S.praia[0];
      pose.dy = -Math.abs(Math.sin(t * 11)) * 4;
    } else {
      pose.frame = S.praia[0];
      pose.dy = -Math.abs(Math.sin(worldTime * 5.5)) * 4;
    }
    return pose;
  }

  // Standard states mapped directly to original frame sequences
  switch (state) {
    case 'idle': {
      pose.frame = id === 'davi' && ctx.form === 'daviPurple'
        ? S.daviPurple[1]
        : cycleFrame(S.idle, 6, worldTime + id.length * 0.35);
      const breath = Math.sin(worldTime * 2.6 + id.length * 0.7);
      pose.sy = 1 + breath * 0.012;
      pose.sx = 1 - breath * 0.006;
      pose.dy = -Math.max(0, breath) * 1.4;
      break;
    }
    case 'walk':
    case 'backwalk': {
      const frames = state === 'backwalk' ? [...(S.walk || fallback)].reverse() : S.walk || fallback;
      pose.frame = cycleFrame(frames, 9, t);
      pose.dy = -Math.abs(Math.sin(t * 9)) * 2.2;
      pose.rot = state === 'walk' ? 0.03 : -0.025;
      break;
    }
    case 'run': {
      pose.frame = cycleFrame(S.run || S.walk || fallback, 12, t);
      pose.dy = -Math.abs(Math.sin(t * 14)) * 3.5;
      pose.rot = 0.07;
      pose.sx = 1.03;
      pose.sy = 0.98;
      break;
    }
    case 'crouch': {
      const cr = S.crouch || fallback;
      pose.frame = cr[t < 0.06 || cr.length < 2 ? 0 : 1 + (Math.floor(worldTime * 3) % (cr.length - 1))];
      break;
    }
    case 'guard': {
      pose.frame = pickFrame(S.guard || fallback, t < 0.05 ? 0 : 1);
      break;
    }
    case 'jump':
    case 'fall': {
      const jp = S.jump || fallback;
      const vy = ctx.vy ?? (state === 'jump' ? 5 : -5);
      pose.frame = vy > 4.2 ? pickFrame(jp, 0) : vy > -3 ? pickFrame(jp, Math.min(1, jp.length - 1)) : jp[jp.length - 1];
      const airStretch = clamp(Math.abs(vy) / 28, 0, 0.1);
      pose.sx = 1 - airStretch * 0.55;
      pose.sy = 1 + airStretch;
      break;
    }
    case 'air': {
      if (id === 'pedro' && S.flykick) pose.frame = pickFrame(S.flykick, 1);
      else if (id === 'juraci' || id === 'paula' || id === 'tainara') pose.frame = pickFrame(S.medium, 1) || pickFrame(S.medium, 0);
      else if (id === 'daniel') pose.frame = pickFrame(S.jump, 2);
      else if (id === 'gabi') pose.frame = pickFrame(S.heavy, 2);
      else pose.frame = pickFrame(S.heavy, 1);
      break;
    }
    case 'light':
    case 'medium':
    case 'heavy':
    case 'combo':
    case 'special': {
      const animKey =
        ctx.moveAnim ||
        (state === 'combo'
          ? 'special'
          : state === 'special'
          ? S.special
            ? 'special'
            : S.dance
            ? 'dance'
            : 'heavy'
          : state);
      const frames = S[animKey] || S.special || S.heavy || fallback;
      pose.frame = attackFrame(frames, t, ctx.moveTiming);

      // Procedural anticipation/strike follow-through
      const su = ctx.moveTiming?.startup ?? 0.08;
      const act = ctx.moveTiming?.active ?? 0.1;
      const rec = ctx.moveTiming?.recovery ?? 0.2;
      if (t < su) {
        const k = t / Math.max(0.01, su);
        pose.rot = -0.05 * k;
        pose.sx = 1 - 0.03 * k;
      } else if (t < su + act) {
        pose.rot = 0.06;
        pose.sx = 1.05;
        pose.sy = 0.98;
      } else {
        const k = clamp((t - su - act) / Math.max(0.01, rec), 0, 1);
        pose.rot = 0.06 * (1 - k);
        pose.sx = 1 + 0.04 * (1 - k);
      }
      break;
    }
    case 'hitstun': {
      if (S.hurt && S.hurt.length) {
        pose.frame = pickFrame(S.hurt, Math.floor(t * 12));
      } else {
        pose.frame = pickFrame(S.guard, 1) || fallback[0];
        pose.rot = -0.15;
      }
      const k = clamp(t / 0.28, 0, 1);
      pose.dx = -6 * (1 - k) + Math.sin(t * 70) * 3 * (1 - k);
      break;
    }
    case 'knockdown': {
      if (S.knockdown && S.knockdown.length) {
        pose.frame = t < 0.22 ? S.knockdown[0] : S.knockdown[S.knockdown.length - 1];
      } else {
        const fallAmt = clamp(t / 0.25, 0, 1);
        pose.frame = fallback[0];
        pose.rot = -1.45 * fallAmt;
        pose.dy = 2.0 * fallAmt;
      }
      break;
    }
    case 'victory': {
      pose.frame = cycleFrame(S.win || S.heavy || fallback, 2.2, t);
      pose.dy = -Math.abs(Math.sin(t * 4.2)) * 3.5;
      break;
    }
  }

  return pose;
}

export function applyRigFormAndFlash(
  rig: CharacterRig,
  formId: FormId,
  time: number,
  dt: number
) {
  const f = FORMS[formId];
  const d = 1 - Math.exp(-10 * dt);

  if (rig.haloMesh) {
    rig.haloMesh.visible = formId === 'crente';
    if (rig.haloMesh.visible) {
      rig.haloMesh.position.y = 2.28 + Math.sin(time * 4) * 0.05;
      rig.haloMesh.rotation.z = time * 1.5;
    }
  }

  const activeAura = formId !== 'normal';
  const auraMat = rig.auraRing.material as THREE.MeshBasicMaterial;
  if (activeAura) {
    auraMat.color.setHex(f.auraHex);
    auraMat.opacity = 0.58 + Math.sin(time * 8) * 0.2;
    const pulse = 1 + Math.sin(time * 7) * 0.1;
    rig.auraRing.scale.set(pulse, pulse, 1);
    rig.auraLight.color.setHex(f.auraHex);
    rig.auraLight.intensity = 2.0 + Math.sin(time * 10) * 0.55;
  } else {
    auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, 0, d);
    rig.auraLight.intensity = THREE.MathUtils.lerp(rig.auraLight.intensity, 0, d);
  }

  if (rig.hitFlashTimer > 0) {
    rig.hitFlashTimer = Math.max(0, rig.hitFlashTimer - dt);
  }
  const flash = rig.hitFlashTimer > 0;
  if (flash) {
    rig.spriteMat.emissive.setHex(0xffffff);
    rig.spriteMat.emissiveIntensity = 0.85;
  } else if (activeAura) {
    rig.spriteMat.emissive.setHex(f.auraHex);
    rig.spriteMat.emissiveIntensity = 0.14;
  } else {
    rig.spriteMat.emissive.setHex(0x000000);
    rig.spriteMat.emissiveIntensity = 0;
  }
}

export function animateCharacterRig(
  rig: CharacterRig,
  state: AnimState,
  stateTime: number,
  worldTime: number,
  facing: 1 | -1,
  groundY: number,
  dt: number,
  ctx: AnimContext = { form: 'normal' }
) {
  // Cylindrical Y-billboarding toward camera so characters never look flat even during 3D orbit
  if (ctx.cameraPos) {
    const dxCam = ctx.cameraPos.x - rig.root.position.x;
    const dzCam = ctx.cameraPos.z - rig.root.position.z;
    rig.billboardGroup.rotation.y = Math.atan2(dxCam, dzCam);
  } else {
    rig.billboardGroup.rotation.y = 0;
  }

  // Ground shadow scaling with height
  const heightAboveFloor = Math.max(0, rig.root.position.y - groundY);
  const shadowScale = Math.max(0.42, 1 - heightAboveFloor * 0.16);
  rig.contactShadow.position.y = -heightAboveFloor + 0.012;
  rig.contactShadow.scale.set(shadowScale, shadowScale, 1);
  (rig.contactShadow.material as THREE.MeshBasicMaterial).opacity = rig.baseShadowOpacity * shadowScale;

  // Toggle 3D guard shield & Carlos baptism light beam
  rig.guardShield.visible = state === 'guard';
  if (rig.guardShield.visible) {
    rig.guardShield.position.x = facing * 0.42;
    rig.guardShield.rotation.y = facing === 1 ? 0 : Math.PI;
  }
  if (rig.baptismBeam) {
    rig.baptismBeam.visible = state === 'transform' && (ctx.nextForm || ctx.form) === 'crente';
  }

  const pose = resolveSpritePose(rig.id, state, stateTime, worldTime, ctx);
  const frame = pose.frame;
  if (!frame) return;

  const [sx, sy, sw, sh, ax, ay, hdFlag] = frame;
  const tier: 0 | 1 | 2 | 3 | 4 | 5 =
    hdFlag === 5 ? 5 : hdFlag === 4 ? 4 : hdFlag === 3 ? 3 : hdFlag === 2 ? 2 : hdFlag === 1 ? 1 : 0;
  const tex =
    tier === 5
      ? rig.daviTex
      : tier === 4 && rig.atlasHd4Tex
      ? rig.atlasHd4Tex
      : tier === 3 && rig.atlasHd3Tex
      ? rig.atlasHd3Tex
      : tier === 2
      ? rig.atlasHd2Tex
      : tier === 1
      ? rig.atlasHdTex
      : rig.atlasTex;
  if (!tex) {
    rig.spriteMesh.visible = false;
    return;
  }
  const img = tex.image as { width?: number; height?: number } | undefined;

  if (!img || !img.width || !img.height) {
    rig.spriteMesh.visible = false;
    return;
  }

  if (rig.atlasTier !== tier) {
    rig.atlasTier = tier;
    rig.spriteMat.map = tex;
    rig.spriteMat.needsUpdate = true;
    rig.depthMat.map = tex;
    rig.depthMat.needsUpdate = true;
    for (const tm of rig.trailMeshes) {
      (tm.material as THREE.MeshBasicMaterial).map = tex;
      (tm.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
  }

  rig.spriteMesh.visible = true;

  const texW = img.width;
  const texH = img.height;
  const ad =
    tier === 4
      ? ATLAS_HD4_SCALE
      : tier === 3
      ? ATLAS_HD3_SCALE
      : tier === 5
      ? DAVI_ATLAS_SCALE
      : tier === 2
      ? ATLAS_HD2_SCALE
      : tier === 1
      ? ATLAS_HD_SCALE
      : ATLAS_SCALE;

  const keepIntentionalScale = ctx.form === 'gordao' || ctx.form === 'hulk' || state === 'crouch';
  const heightCorrection =
    tier !== 1 && tier !== 3 && tier !== 4 && tier !== 5 && SCALE_STABLE_STATES.has(state) && !keepIntentionalScale
      ? clamp((BASE_SPRITE_HEIGHT[rig.id] || sh) / sh, 0.86, 1.14)
      : 1;
  const formScale = ctx.form === 'hulk' ? 1.1 : ctx.form === 'gordao' ? 1.05 : 1;
  const s = rig.baseScale * heightCorrection * formScale;

  // Compute exact anchor-centered quad vertices in 3D world meters
  const leftLocal = (-ax / ad) * s * WORLD_UNIT_PER_GAME_PX;
  const rightLocal = ((sw - ax) / ad) * s * WORLD_UNIT_PER_GAME_PX;
  const bottomLocal = ((ay - sh) / ad) * s * WORLD_UNIT_PER_GAME_PX;
  const topLocal = (ay / ad) * s * WORLD_UNIT_PER_GAME_PX;

  const x0 = facing === 1 ? leftLocal : -rightLocal;
  const x1 = facing === 1 ? rightLocal : -leftLocal;

  const posAttr = rig.spriteGeo.getAttribute('position') as THREE.BufferAttribute;
  posAttr.setXYZ(0, x0, topLocal, 0);
  posAttr.setXYZ(1, x1, topLocal, 0);
  posAttr.setXYZ(2, x0, bottomLocal, 0);
  posAttr.setXYZ(3, x1, bottomLocal, 0);
  posAttr.needsUpdate = true;
  rig.spriteGeo.computeBoundingBox();
  rig.spriteGeo.computeBoundingSphere();

  // Half-texel inset prevents atlas bleeding
  const padU = 0.5 / texW;
  const padV = 0.5 / texH;
  const uMin = sx / texW + padU;
  const uMax = (sx + sw) / texW - padU;
  const vTop = 1 - sy / texH - padV;
  const vBot = 1 - (sy + sh) / texH + padV;

  const uLeft = facing === 1 ? uMin : uMax;
  const uRight = facing === 1 ? uMax : uMin;

  const uvAttr = rig.spriteGeo.getAttribute('uv') as THREE.BufferAttribute;
  uvAttr.setXY(0, uLeft, vTop);
  uvAttr.setXY(1, uRight, vTop);
  uvAttr.setXY(2, uLeft, vBot);
  uvAttr.setXY(3, uRight, vBot);
  uvAttr.needsUpdate = true;

  // Apply procedural squash, stretch, lean & step offset
  const pxOffset = pose.dx * facing * WORLD_UNIT_PER_GAME_PX;
  const pyOffset = -pose.dy * WORLD_UNIT_PER_GAME_PX;
  rig.motionGroup.position.set(pxOffset, pyOffset, 0);
  rig.motionGroup.rotation.z = -pose.rot * facing;
  rig.motionGroup.scale.set(pose.sx, pose.sy, 1);

  // Motion trails during run / fast lunge
  const showTrails = state === 'run' || (Math.abs(ctx.vx || 0) > 5.4 && state !== 'hitstun');
  for (let i = 0; i < rig.trailMeshes.length; i++) {
    const tm = rig.trailMeshes[i];
    if (showTrails) {
      tm.visible = true;
      tm.position.set(-facing * (i + 1) * 0.24, 0, -(i + 1) * 0.06);
      (tm.material as THREE.MeshBasicMaterial).opacity = 0.24 / (i + 1);
    } else {
      tm.visible = false;
    }
  }
}
