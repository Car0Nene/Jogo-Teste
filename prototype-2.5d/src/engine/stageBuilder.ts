import * as THREE from 'three';
import { assetUrl } from '../assetUrl';
import { STAGES, StageId } from '../data/stages';
import {
  createCobbleFloorTextures,
  createEarthFloorTextures,
  createHorizonFadeAlphaMap,
  createSandTexture,
  createSidewalkSlabTextures,
  createSoftGlowTexture,
} from './proceduralTextures';

export interface BuiltStage {
  id: StageId;
  group: THREE.Group;
  backdrop: THREE.Mesh;
  setParticlesEnabled: (enabled: boolean) => void;
  update: (time: number, dt: number) => void;
  dispose: () => void;
}

const stageTexCache = new Map<StageId, THREE.Texture>();

function getStageBackdropTexture(id: StageId, anisotropy: number): THREE.Texture {
  const existing = stageTexCache.get(id);
  if (existing) {
    existing.anisotropy = anisotropy;
    return existing;
  }
  const loader = new THREE.TextureLoader();
  const tex = loader.load(assetUrl(`/assets/stages/${id}.webp`));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = anisotropy;
  stageTexCache.set(id, tex);
  return tex;
}

function makeSkyDome(topHex: number, horizonHex: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(95, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(topHex) },
      uHorizon: { value: new THREE.Color(horizonHex) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      varying vec3 vWorldPos;
      void main() {
        float h = clamp(normalize(vWorldPos).y * 1.65 + 0.08, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 1.0, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

function buildCurvedStageBackdrop(
  id: StageId,
  anisotropy: number,
  track: <T extends { dispose: () => void }>(item: T) => T
): THREE.Mesh {
  const width = 34.4;
  const height = 19.35;
  const geo = track(new THREE.PlaneGeometry(width, height, 40, 1));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const normX = x / (width * 0.5);
    // Gentle concave cyclorama wrap framing the 2.5D arena
    pos.setZ(i, normX * normX * 2.5);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const stageTex = getStageBackdropTexture(id, anisotropy);
  const mat = track(
    new THREE.MeshStandardMaterial({
      map: stageTex,
      color: 0xc2c2c2,
      emissive: 0xffffff,
      emissiveMap: stageTex,
      emissiveIntensity: 0.64,
      roughness: 0.94,
      metalness: 0.0,
      side: THREE.FrontSide,
    })
  );

  const mesh = new THREE.Mesh(geo, mat);
  // Bottom edge at y = -3.87 so painted horizon/curb (v ~ 0.20) meets y = 0 stage floor naturally
  mesh.position.set(0, 5.8, -5.9);
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Builds an opaque combat floor from z = -2.2 to z = +14.8 (for crisp cast shadows under fighters)
 * plus a feathered horizon strip from z = -6.0 to z = -2.2 that dissolves smoothly into the
 * hand-painted stage backdrop with zero hard cutoff seam.
 */
function buildSeamlessStageFloor(
  map: THREE.Texture,
  bumpMap: THREE.Texture | undefined,
  options: {
    roughness: number;
    metalness?: number;
    bumpScale?: number;
    colorTint?: number;
    tileRepeatX?: number;
    tileRepeatY?: number;
  },
  track: <T extends { dispose: () => void }>(item: T) => T,
  group: THREE.Group
) {
  const tint = options.colorTint ?? 0xffffff;
  const solidGeo = track(new THREE.PlaneGeometry(66, 17));
  const solidMat = track(
    new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: options.bumpScale ?? 0.035,
      color: tint,
      roughness: options.roughness,
      metalness: options.metalness ?? 0.04,
    })
  );
  const solidGround = new THREE.Mesh(solidGeo, solidMat);
  solidGround.rotation.x = -Math.PI / 2;
  solidGround.position.set(0, 0, 6.3); // spans z: -2.2 to +14.8
  solidGround.receiveShadow = true;
  group.add(solidGround);

  // Seamless feather apron spanning z: -6.0 to -2.2
  const featherTex = track(map.clone());
  featherTex.needsUpdate = true;
  const rx = options.tileRepeatX ?? 12;
  const ry = options.tileRepeatY ?? 4;
  featherTex.repeat.set(rx, Math.max(0.8, ry * (3.8 / 17)));
  featherTex.wrapS = THREE.RepeatWrapping;
  featherTex.wrapT = THREE.RepeatWrapping;

  const alphaMap = track(createHorizonFadeAlphaMap());
  const featherGeo = track(new THREE.PlaneGeometry(66, 3.8));
  const featherMat = track(
    new THREE.MeshStandardMaterial({
      map: featherTex,
      alphaMap,
      color: tint,
      roughness: options.roughness,
      metalness: options.metalness ?? 0.04,
      transparent: true,
      depthWrite: false,
    })
  );
  const featherGround = new THREE.Mesh(featherGeo, featherMat);
  featherGround.rotation.x = -Math.PI / 2;
  featherGround.position.set(0, 0.002, -4.1); // spans z: -6.0 to -2.2
  featherGround.receiveShadow = true;
  group.add(featherGround);
}

export function buildStage(id: StageId, anisotropy: number): BuiltStage {
  const spec = STAGES[id];
  const group = new THREE.Group();
  const updaters: Array<(t: number, dt: number) => void> = [];
  const particleNodes: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const sky = makeSkyDome(spec.skyTop, spec.skyHorizon);
  track(sky.geometry);
  track(sky.material as THREE.Material);
  group.add(sky);

  const backdrop = buildCurvedStageBackdrop(id, anisotropy, track);
  group.add(backdrop);

  const glowTex = track(createSoftGlowTexture());

  if (id === 'padaria') {
    const floorTex = createCobbleFloorTextures('#ba9266', '#9e764d', '#5a4129', anisotropy, 15, 5);
    track(floorTex.map);
    track(floorTex.bumpMap);
    buildSeamlessStageFloor(
      floorTex.map,
      floorTex.bumpMap,
      { roughness: 0.84, metalness: 0.03, bumpScale: 0.035, colorTint: 0xfaebd7, tileRepeatX: 15, tileRepeatY: 5 },
      track,
      group
    );

    const steamSprites: THREE.Sprite[] = [];
    for (let i = 0; i < 3; i++) {
      const mat = track(
        new THREE.SpriteMaterial({ map: glowTex, color: 0xfffbeb, transparent: true, opacity: 0.28 })
      );
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.42, 0.42, 1);
      sp.position.set(-4.2 + i * 0.45, 1.1, -3.1);
      group.add(sp);
      steamSprites.push(sp);
      particleNodes.push(sp);
    }

    const butterflies: THREE.Mesh[] = [];
    const bfGeo = track(new THREE.PlaneGeometry(0.18, 0.12));
    for (let i = 0; i < 3; i++) {
      const bfMat = track(
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xfbbf24 : 0xff7ab8,
          side: THREE.DoubleSide,
        })
      );
      const bf = new THREE.Mesh(bfGeo, bfMat);
      bf.position.set(-3 + i * 3, 1.6 + i * 0.3, -1.8);
      group.add(bf);
      butterflies.push(bf);
      particleNodes.push(bf);
    }

    updaters.push((t) => {
      steamSprites.forEach((sp, i) => {
        const phase = (t * 0.45 + i * 0.33) % 1;
        sp.position.y = 1.05 + phase * 1.1;
        sp.position.x = -4.2 + i * 0.45 + Math.sin(t * 2 + i) * 0.1;
        (sp.material as THREE.SpriteMaterial).opacity = Math.sin(phase * Math.PI) * 0.3;
      });
      butterflies.forEach((bf, i) => {
        bf.position.x = Math.sin(t * 0.55 + i * 2.1) * 5.2;
        bf.position.y = 1.45 + Math.sin(t * 2.4 + i) * 0.35;
        bf.scale.x = 0.3 + Math.abs(Math.sin(t * 14 + i)) * 0.7;
      });
    });
  } else if (id === 'quintal') {
    const floorTex = createEarthFloorTextures('#aa633e', '#8e4d2d', '#68361f', anisotropy, 10, 4);
    track(floorTex.map);
    track(floorTex.bumpMap);
    buildSeamlessStageFloor(
      floorTex.map,
      floorTex.bumpMap,
      { roughness: 0.9, metalness: 0.02, bumpScale: 0.03, colorTint: 0xf5d6bd, tileRepeatX: 10, tileRepeatY: 4 },
      track,
      group
    );

    const fireflies: THREE.Sprite[] = [];
    for (let i = 0; i < 12; i++) {
      const mat = track(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffe07d,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
        })
      );
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.24, 0.24, 1);
      sp.position.set(-7.5 + i * 1.35, 1.15 + (i % 4) * 0.55, -2.8 + (i % 3) * 0.7);
      group.add(sp);
      fireflies.push(sp);
      particleNodes.push(sp);
    }

    updaters.push((t) => {
      fireflies.forEach((sp, i) => {
        sp.position.y = 1.15 + (i % 4) * 0.55 + Math.sin(t * 1.8 + i * 2) * 0.25;
        (sp.material as THREE.SpriteMaterial).opacity = 0.25 + (Math.sin(t * 3 + i * 1.7) + 1) * 0.32;
      });
    });
  } else if (id === 'festa') {
    const floorTex = createCobbleFloorTextures('#72523d', '#593d2b', '#2e1e14', anisotropy, 14, 5);
    track(floorTex.map);
    track(floorTex.bumpMap);
    buildSeamlessStageFloor(
      floorTex.map,
      floorTex.bumpMap,
      { roughness: 0.88, metalness: 0.03, bumpScale: 0.038, colorTint: 0xedd5c4, tileRepeatX: 14, tileRepeatY: 5 },
      track,
      group
    );

    const fireLight = new THREE.PointLight(0xff8c2b, 4.4, 18, 1.65);
    fireLight.position.set(-1.6, 1.65, -2.0);
    group.add(fireLight);

    const embers: THREE.Sprite[] = [];
    for (let i = 0; i < 14; i++) {
      const mat = track(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: i % 2 === 0 ? 0xffb703 : 0xff7b00,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        })
      );
      const em = new THREE.Sprite(mat);
      em.scale.set(0.22, 0.22, 1);
      em.position.set(-2.4 + (i % 5) * 0.45, 0.8, -2.7);
      group.add(em);
      embers.push(em);
      particleNodes.push(em);
    }

    updaters.push((t) => {
      fireLight.intensity = 4.0 + Math.sin(t * 17) * 0.7 + Math.cos(t * 23) * 0.35;
      embers.forEach((em, i) => {
        const p = (t * 0.62 + i * 0.17) % 1;
        em.position.y = 0.7 + p * 4.2;
        em.position.x = -1.6 + Math.sin(t * 2.8 + i * 1.9) * 1.1;
        (em.material as THREE.SpriteMaterial).opacity = Math.sin(p * Math.PI) * 0.85;
      });
    });
  } else if (id === 'bar') {
    // Bar da Simone: stone sidewalk slabs matching painted sidewalk + warm doorway reflection
    const floorTex = createSidewalkSlabTextures('#5d627a', '#4d5268', '#252738', anisotropy, 14, 5);
    track(floorTex.map);
    track(floorTex.bumpMap);
    buildSeamlessStageFloor(
      floorTex.map,
      floorTex.bumpMap,
      { roughness: 0.42, metalness: 0.14, bumpScale: 0.025, colorTint: 0xd8cce6, tileRepeatX: 14, tileRepeatY: 5 },
      track,
      group
    );

    // Warm golden light spilling out of the open Bar da Simone doorway onto fighters & pavement
    const doorwayWarmLight = new THREE.PointLight(0xffb95c, 4.2, 14, 1.45);
    doorwayWarmLight.position.set(-0.2, 2.35, -1.35);
    group.add(doorwayWarmLight);

    // Magenta neon sign spill from overhead sign
    const neonLight = new THREE.PointLight(0xff4fd8, 3.2, 16, 1.55);
    neonLight.position.set(0, 4.2, -1.8);
    group.add(neonLight);

    // Subtle cool streetlamp fill from left
    const streetBlueLight = new THREE.PointLight(0x60a5fa, 1.6, 13, 1.6);
    streetBlueLight.position.set(-6.5, 3.4, 1.5);
    group.add(streetBlueLight);

    updaters.push((t) => {
      const flicker = Math.sin(t * 4.1) > 0.96 ? 1.8 : 3.2 + Math.sin(t * 2.5) * 0.35;
      neonLight.intensity = flicker;
    });
  } else if (id === 'praia') {
    // Praia · Calçadão: seamless warm sunset golden sand matching the beach illustration
    const sandTex = createSandTexture(anisotropy);
    track(sandTex.map);
    track(sandTex.bumpMap);
    buildSeamlessStageFloor(
      sandTex.map,
      sandTex.bumpMap,
      { roughness: 0.88, metalness: 0.02, bumpScale: 0.03, colorTint: 0xffe4bc, tileRepeatX: 10, tileRepeatY: 4 },
      track,
      group
    );

    // Warm golden sunset key bounce from ocean right side
    const sunBounce = new THREE.PointLight(0xffb968, 2.8, 18, 1.4);
    sunBounce.position.set(5.5, 2.8, -1.5);
    group.add(sunBounce);

    const glints: THREE.Sprite[] = [];
    for (let i = 0; i < 8; i++) {
      const mat = track(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xfff5d6,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
        })
      );
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.32, 0.32, 1);
      sp.position.set(-7 + i * 2.1, 0.65 + (i % 3) * 0.35, -3.4);
      group.add(sp);
      glints.push(sp);
      particleNodes.push(sp);
    }

    updaters.push((t) => {
      glints.forEach((sp, i) => {
        (sp.material as THREE.SpriteMaterial).opacity = 0.2 + (Math.sin(t * 2.2 + i * 1.4) + 1) * 0.22;
      });
    });
  }

  return {
    id,
    group,
    backdrop,
    setParticlesEnabled: (enabled: boolean) => {
      for (const n of particleNodes) {
        n.visible = enabled;
      }
    },
    update: (t, dt) => {
      for (const fn of updaters) fn(t, dt);
    },
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
