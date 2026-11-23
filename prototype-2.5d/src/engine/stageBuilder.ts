import * as THREE from 'three';
import { assetUrl } from '../assetUrl';
import { STAGES, StageId } from '../data/stages';
import {
  createAsphaltStreetTextures,
  createBrickTextures,
  createCalcadaoTexture,
  createCheckeredClothTexture,
  createCheckeredTileTexture,
  createCitySkylineTexture,
  createCobbleFloorTextures,
  createEarthFloorTextures,
  createFootballTvTexture,
  createHorizonFadeAlphaMap,
  createInteriorBarWallTexture,
  createRoofTileTextures,
  createSandTexture,
  createSidewalkSlabTextures,
  createSignTexture,
  createSoftGlowTexture,
  createStripedTexture,
  createSunsetMountainTexture,
  createSurfWaveTexture,
  createWoodPlankTextures,
} from './proceduralTextures';

export interface BuiltStage {
  id: StageId;
  group: THREE.Group;
  backdrop: THREE.Mesh;
  setParticlesEnabled: (enabled: boolean) => void;
  setParallax?: (camX: number) => void;
  update: (time: number, dt: number) => void;
  dispose: () => void;
}

type TrackFn = <T extends { dispose: () => void }>(item: T) => T;

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
  const geo = new THREE.SphereGeometry(98, 24, 16);
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

function buildDistantHorizonBackdrop(
  id: StageId,
  anisotropy: number,
  track: TrackFn,
  options: { z?: number; y?: number; width?: number; height?: number; emissive?: number; opacity?: number } = {}
): THREE.Mesh {
  const width = options.width ?? 44;
  const height = options.height ?? 24.75;
  const geo = track(new THREE.PlaneGeometry(width, height, 36, 1));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const normX = x / (width * 0.5);
    pos.setZ(i, normX * normX * 2.8);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const stageTex = getStageBackdropTexture(id, anisotropy);
  const mat = track(
    new THREE.MeshStandardMaterial({
      map: stageTex,
      color: 0xa8a2b8,
      emissive: 0xffffff,
      emissiveMap: stageTex,
      emissiveIntensity: options.emissive ?? 0.42,
      roughness: 0.96,
      metalness: 0.0,
      transparent: (options.opacity ?? 1) < 1,
      opacity: options.opacity ?? 1,
    })
  );
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, options.y ?? 7.0, options.z ?? -12.8);
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Reusable composite palm tree (curved segmented trunk + drooping multi-frond crown).
 * Bottom pivot sits flush at y = 0.
 */
function buildPalmTree(
  height: number,
  leanX: number,
  track: TrackFn,
  scale = 1
): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = track(
    new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.9, metalness: 0.02 })
  );
  const ringMat = track(
    new THREE.MeshStandardMaterial({ color: 0x3f2818, roughness: 0.95 })
  );
  const frondMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2f6b2f,
      roughness: 0.68,
      side: THREE.DoubleSide,
    })
  );
  const frondTipMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4d8b31,
      roughness: 0.65,
      side: THREE.DoubleSide,
    })
  );

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(leanX * 0.35, height * 0.35, 0.1),
    new THREE.Vector3(leanX * 0.78, height * 0.72, 0.15),
    new THREE.Vector3(leanX, height, 0.05),
  ]);
  const trunkGeo = track(new THREE.TubeGeometry(curve, 10, 0.16 * scale, 7, false));
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  tree.add(trunk);

  // Subtle bark collars along trunk
  for (let i = 1; i <= 5; i++) {
    const pt = curve.getPoint(i / 6);
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.165 * scale, 0.025 * scale, 6, 10)),
      ringMat
    );
    ring.position.copy(pt);
    ring.rotation.x = Math.PI / 2;
    tree.add(ring);
  }

  // Crown + coconut cluster
  const crown = new THREE.Group();
  crown.position.set(leanX, height, 0.05);
  tree.add(crown);

  for (let c = 0; c < 3; c++) {
    const coco = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.11 * scale, 8, 8)),
      ringMat
    );
    const a = (c / 3) * Math.PI * 2;
    coco.position.set(Math.cos(a) * 0.14 * scale, -0.1 * scale, Math.sin(a) * 0.14 * scale);
    crown.add(coco);
  }

  const frondGeo = track(new THREE.ConeGeometry(0.38 * scale, 2.35 * scale, 5));
  frondGeo.scale(1, 1, 0.14);
  frondGeo.translate(0, 1.15 * scale, 0);

  for (let i = 0; i < 8; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / 8) * Math.PI * 2 + (i % 2) * 0.15;
    const frond = new THREE.Mesh(frondGeo, i % 2 === 0 ? frondMat : frondTipMat);
    frond.rotation.z = 1.05 + (i % 3) * 0.18;
    arm.add(frond);
    crown.add(arm);
  }

  tree.userData.crown = crown;
  return tree;
}

/**
 * Composite 3D Brazilian Red Plastic Bar Table + 2 Chairs + Brahma Green Bottles & Glasses.
 */
function buildBarTableSet(
  track: TrackFn,
  bottles = true,
  chairLeft = true,
  chairRight = true
): THREE.Group {
  const g = new THREE.Group();
  const plasticRed = track(
    new THREE.MeshStandardMaterial({ color: 0xc81e24, roughness: 0.34, metalness: 0.06 })
  );
  const plasticDarkRed = track(
    new THREE.MeshStandardMaterial({ color: 0x8f1218, roughness: 0.42, metalness: 0.05 })
  );
  const bottleGlass = track(
    new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.18, metalness: 0.15 })
  );
  const bottleLabel = track(
    new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, emissive: 0x422006, emissiveIntensity: 0.2 })
  );
  const beerGlass = track(
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.22, metalness: 0.1 })
  );
  const foamMat = track(
    new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.55 })
  );

  // Table top + apron + 4 tapered legs
  const top = new THREE.Mesh(track(new THREE.BoxGeometry(0.92, 0.055, 0.92)), plasticRed);
  top.position.y = 0.72;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  const apron = new THREE.Mesh(track(new THREE.BoxGeometry(0.84, 0.06, 0.84)), plasticDarkRed);
  apron.position.y = 0.67;
  g.add(apron);

  const legGeo = track(new THREE.CylinderGeometry(0.032, 0.022, 0.68, 8));
  for (const lx of [-0.36, 0.36]) {
    for (const lz of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(legGeo, plasticRed);
      leg.position.set(lx, 0.34, lz);
      g.add(leg);
    }
  }

  if (bottles) {
    for (const [bx, bz] of [
      [-0.14, 0.08],
      [0.12, -0.1],
    ]) {
      const body = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.036, 0.04, 0.18, 10)),
        bottleGlass
      );
      body.position.set(bx, 0.84, bz);
      g.add(body);
      const neck = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.015, 0.03, 0.09, 8)),
        bottleGlass
      );
      neck.position.set(bx, 0.96, bz);
      g.add(neck);
      const band = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.038, 0.038, 0.055, 10)),
        bottleLabel
      );
      band.position.set(bx, 0.84, bz);
      g.add(band);
    }

    for (const [gx, gz] of [
      [0.24, 0.16],
      [-0.24, -0.18],
    ]) {
      const cup = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.032, 0.024, 0.095, 10)),
        beerGlass
      );
      cup.position.set(gx, 0.795, gz);
      g.add(cup);
      const foam = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.033, 0.032, 0.022, 10)),
        foamMat
      );
      foam.position.set(gx, 0.848, gz);
      g.add(foam);
    }
  }

  const makeChair = (cx: number, rotY: number) => {
    const chair = new THREE.Group();
    chair.position.set(cx, 0, 0);
    chair.rotation.y = rotY;
    const seat = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.04, 0.4)), plasticRed);
    seat.position.y = 0.44;
    chair.add(seat);
    const back = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.42, 0.045)), plasticRed);
    back.position.set(0, 0.67, -0.18);
    back.rotation.x = -0.12;
    chair.add(back);
    const cLegGeo = track(new THREE.CylinderGeometry(0.022, 0.016, 0.44, 6));
    for (const lx of [-0.17, 0.17]) {
      for (const lz of [-0.16, 0.16]) {
        const leg = new THREE.Mesh(cLegGeo, plasticDarkRed);
        leg.position.set(lx, 0.22, lz);
        chair.add(leg);
      }
    }
    return chair;
  };

  if (chairLeft) g.add(makeChair(-0.68, Math.PI * 0.42));
  if (chairRight) g.add(makeChair(0.68, -Math.PI * 0.42));

  return g;
}

/**
 * Potted plant / tropical shrub (grounded at y = 0).
 */
function buildPottedPlant(
  potColor: number,
  leafColor: number,
  flowerColor: number | null,
  track: TrackFn,
  scale = 1
): THREE.Group {
  const g = new THREE.Group();
  const potMat = track(new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.78 }));
  const leafMat = track(new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.65 }));

  const pot = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.28 * scale, 0.21 * scale, 0.46 * scale, 12)),
    potMat
  );
  pot.position.y = 0.23 * scale;
  g.add(pot);

  const rim = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.31 * scale, 0.29 * scale, 0.08 * scale, 12)),
    potMat
  );
  rim.position.y = 0.44 * scale;
  g.add(rim);

  for (let i = 0; i < 6; i++) {
    const bush = new THREE.Mesh(
      track(new THREE.DodecahedronGeometry((0.2 + (i % 3) * 0.05) * scale, 1)),
      leafMat
    );
    const a = (i / 6) * Math.PI * 2;
    bush.position.set(
      Math.cos(a) * 0.14 * scale,
      (0.56 + (i % 2) * 0.14) * scale,
      Math.sin(a) * 0.14 * scale
    );
    g.add(bush);
  }

  if (flowerColor !== null) {
    const flMat = track(
      new THREE.MeshStandardMaterial({
        color: flowerColor,
        roughness: 0.5,
        emissive: flowerColor,
        emissiveIntensity: 0.14,
      })
    );
    for (let i = 0; i < 7; i++) {
      const fl = new THREE.Mesh(track(new THREE.SphereGeometry(0.065 * scale, 7, 7)), flMat);
      const a = (i / 7) * Math.PI * 2;
      fl.position.set(
        Math.cos(a) * 0.24 * scale,
        (0.58 + (i % 3) * 0.13) * scale,
        Math.sin(a) * 0.24 * scale
      );
      g.add(fl);
    }
  }
  return g;
}

/**
 * Shared perspective sidewalk + feathered horizon blend + street curb so every stage
 * feels seamlessly anchored to real 3D ground geometry.
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
    solidSpanZ?: number;
    solidCenterZ?: number;
    featherStartZ?: number;
  },
  track: TrackFn,
  group: THREE.Group
) {
  const tint = options.colorTint ?? 0xffffff;
  const spanZ = options.solidSpanZ ?? 16;
  const centerZ = options.solidCenterZ ?? 5.2; // default spans -2.8 .. +13.2

  const solidGeo = track(new THREE.PlaneGeometry(70, spanZ));
  const solidMat = track(
    new THREE.MeshStandardMaterial({
      map,
      ...(bumpMap ? { bumpMap } : {}),
      bumpScale: options.bumpScale ?? 0.032,
      color: tint,
      roughness: options.roughness,
      metalness: options.metalness ?? 0.04,
    })
  );
  const solidGround = new THREE.Mesh(solidGeo, solidMat);
  solidGround.rotation.x = -Math.PI / 2;
  solidGround.position.set(0, 0, centerZ);
  solidGround.receiveShadow = true;
  group.add(solidGround);

  if (options.featherStartZ !== undefined) {
    const featherTex = track(map.clone());
    featherTex.needsUpdate = true;
    const rx = options.tileRepeatX ?? 12;
    const ry = options.tileRepeatY ?? 4;
    featherTex.repeat.set(rx, Math.max(0.8, ry * (4.5 / spanZ)));
    featherTex.wrapS = THREE.RepeatWrapping;
    featherTex.wrapT = THREE.RepeatWrapping;

    const alphaMap = track(createHorizonFadeAlphaMap());
    const featherGeo = track(new THREE.PlaneGeometry(70, 4.5));
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
    featherGround.position.set(0, 0.003, options.featherStartZ);
    featherGround.receiveShadow = true;
    group.add(featherGround);
  }
}

export function buildStage(id: StageId, anisotropy: number): BuiltStage {
  const spec = STAGES[id];
  const group = new THREE.Group();
  const updaters: Array<(t: number, dt: number) => void> = [];
  const particleNodes: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const farParallaxNodes: Array<{ node: THREE.Object3D; factor: number }> = [];

  const track: TrackFn = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const sky = makeSkyDome(spec.skyTop, spec.skyHorizon);
  track(sky.geometry);
  track(sky.material as THREE.Material);
  group.add(sky);

  const glowTex = track(createSoftGlowTexture());
  let backdrop: THREE.Mesh;

  if (id === 'bar') {
    // =========================================================================
    // BAR DA SIMONE — True 5-Layer 2.5D Urban Nightlife Arena
    // =========================================================================

    // LAYER 1 — Deep Horizon Backdrop + Glowing City Skyline + Palms (z = -15..-9.5)
    backdrop = buildDistantHorizonBackdrop('bar', anisotropy, track, {
      z: -16.5,
      y: 7.4,
      width: 52,
      height: 29.25,
      emissive: 0.25,
      opacity: 0.52,
    });
    group.add(backdrop);
    farParallaxNodes.push({ node: backdrop, factor: 0.24 });

    const skylineTex = track(createCitySkylineTexture(anisotropy));
    const skylinePlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(46, 13)),
      track(
        new THREE.MeshBasicMaterial({
          map: skylineTex,
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
        })
      )
    );
    skylinePlane.position.set(0, 5.4, -12.6);
    group.add(skylinePlane);
    farParallaxNodes.push({ node: skylinePlane, factor: 0.18 });

    const farPalmL = buildPalmTree(6.8, -0.9, track, 1.15);
    farPalmL.position.set(-8.6, 0, -7.8);
    group.add(farPalmL);
    const farPalmR = buildPalmTree(7.2, 1.0, track, 1.2);
    farPalmR.position.set(8.8, 0, -8.2);
    group.add(farPalmR);

    // LAYER 2 — Sidewalk Combat Floor + Concrete Curb + Damp Cobblestone Street
    const slabTex = createSidewalkSlabTextures('#5e627c', '#4b4f66', '#252738', anisotropy, 16, 4);
    track(slabTex.map);
    track(slabTex.bumpMap);
    buildSeamlessStageFloor(
      slabTex.map,
      slabTex.bumpMap,
      {
        roughness: 0.44,
        metalness: 0.12,
        bumpScale: 0.024,
        colorTint: 0xe3d6ee,
        solidSpanZ: 7.4,
        solidCenterZ: -1.8, // spans -5.5 to +1.9 seamlessly from bar interior through combat lane
      },
      track,
      group
    );

    // Raised concrete curb separating sidewalk combat lane (z <= 1.85) from damp street
    const curbMat = track(
      new THREE.MeshStandardMaterial({ color: 0x4c5166, roughness: 0.72, metalness: 0.05 })
    );
    const curb = new THREE.Mesh(track(new THREE.BoxGeometry(58, 0.14, 0.24)), curbMat);
    curb.position.set(0, -0.02, 1.92);
    curb.receiveShadow = true;
    group.add(curb);

    // Dark wet evening street cobblestones spanning z: +2.0 .. +13.0
    const streetTex = createAsphaltStreetTextures(anisotropy);
    track(streetTex.map);
    track(streetTex.bumpMap);
    const streetMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(66, 12)),
      track(
        new THREE.MeshStandardMaterial({
          map: streetTex.map,
          bumpMap: streetTex.bumpMap,
          bumpScale: 0.032,
          roughness: 0.34,
          metalness: 0.18,
          color: 0xc2b8d8,
        })
      )
    );
    streetMesh.rotation.x = -Math.PI / 2;
    streetMesh.position.set(0, -0.08, 7.8);
    streetMesh.receiveShadow = true;
    group.add(streetMesh);

    // LAYER 3 — Midground 3D Bar da Simone Storefront + Illuminated Interior Room
    const wallPlasterMat = track(
      new THREE.MeshStandardMaterial({ color: 0xd9a86c, roughness: 0.82 })
    );
    const greenTrimMat = track(
      new THREE.MeshStandardMaterial({ color: 0x155e36, roughness: 0.62, metalness: 0.08 })
    );
    const darkWoodMat = track(
      new THREE.MeshStandardMaterial({ color: 0x4b2410, roughness: 0.68, metalness: 0.06 })
    );
    const interiorWallTex = track(createInteriorBarWallTexture(anisotropy));
    const interiorTileTex = track(createCheckeredTileTexture('#f7d89c', '#e6b873', anisotropy, 5, 3));
    track(interiorTileTex);

    // Bar Interior Room (z = -5.4 .. -2.9) visible cleanly through wide open doors!
    const interiorFloor = new THREE.Mesh(
      track(new THREE.PlaneGeometry(8.8, 2.7)),
      track(
        new THREE.MeshStandardMaterial({
          map: interiorTileTex,
          roughness: 0.36,
          emissive: 0xffb347,
          emissiveIntensity: 0.18,
        })
      )
    );
    interiorFloor.rotation.x = -Math.PI / 2;
    interiorFloor.position.set(0, 0.015, -4.15);
    group.add(interiorFloor);

    const interiorBackWall = new THREE.Mesh(
      track(new THREE.PlaneGeometry(8.8, 3.6)),
      track(
        new THREE.MeshStandardMaterial({
          map: interiorWallTex,
          emissive: 0xffb855,
          emissiveMap: interiorWallTex,
          emissiveIntensity: 0.52,
          roughness: 0.85,
        })
      )
    );
    interiorBackWall.position.set(0, 1.8, -5.45);
    group.add(interiorBackWall);

    // Football match TV mounted inside the bar!
    const tvTex = track(createFootballTvTexture(anisotropy));
    const tvFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.75, 1.05, 0.1)),
      track(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.4 }))
    );
    tvFrame.position.set(-2.05, 2.22, -5.32);
    group.add(tvFrame);
    const tvScreen = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.6, 0.92)),
      track(new THREE.MeshBasicMaterial({ map: tvTex }))
    );
    tvScreen.position.set(-2.05, 2.22, -5.26);
    group.add(tvScreen);

    // Interior wooden counter + barstools on right inside
    const barCounter = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 1.02, 0.65)), darkWoodMat);
    barCounter.position.set(2.4, 0.51, -4.65);
    group.add(barCounter);

    // Interior ambient warm table & pendant lamp glow
    const interiorTable = buildBarTableSet(track, true, true, true);
    interiorTable.scale.setScalar(0.86);
    interiorTable.position.set(-0.25, 0.015, -4.45);
    group.add(interiorTable);

    // Main Front Facade Pillars & Header Beam (z = -2.85) framing the open doorway
    const facadeGroup = new THREE.Group();
    group.add(facadeGroup);

    const leftPillar = new THREE.Mesh(track(new THREE.BoxGeometry(1.45, 3.65, 0.55)), wallPlasterMat);
    leftPillar.position.set(-3.72, 1.825, -2.85);
    facadeGroup.add(leftPillar);
    const leftDado = new THREE.Mesh(track(new THREE.BoxGeometry(1.47, 0.95, 0.58)), greenTrimMat);
    leftDado.position.set(-3.72, 0.475, -2.85);
    facadeGroup.add(leftDado);

    const rightPillar = new THREE.Mesh(track(new THREE.BoxGeometry(1.45, 3.65, 0.55)), wallPlasterMat);
    rightPillar.position.set(3.72, 1.825, -2.85);
    facadeGroup.add(rightPillar);
    const rightDado = new THREE.Mesh(track(new THREE.BoxGeometry(1.47, 0.95, 0.58)), greenTrimMat);
    rightDado.position.set(3.72, 0.475, -2.85);
    facadeGroup.add(rightDado);

    // Right side return wall with open glowing side door
    const sideWall = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 3.65, 2.75)), wallPlasterMat);
    sideWall.position.set(4.26, 1.825, -4.2);
    facadeGroup.add(sideWall);

    // Overhead lintel + dark wood doorway trim
    const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(8.9, 0.85, 0.62)), greenTrimMat);
    lintel.position.set(0, 3.45, -2.82);
    facadeGroup.add(lintel);

    const doorFrameTop = new THREE.Mesh(track(new THREE.BoxGeometry(6.15, 0.16, 0.42)), darkWoodMat);
    doorFrameTop.position.set(0, 2.96, -2.75);
    facadeGroup.add(doorFrameTop);

    // Open folding wooden door leaves on left & right doorway jambs
    for (const dx of [-2.95, 2.95]) {
      const doorLeaf = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 2.88, 0.52)), darkWoodMat);
      doorLeaf.position.set(dx, 1.44, -2.65);
      facadeGroup.add(doorLeaf);
    }

    // Pitched Terracotta Tile Roof
    const roofTex = createRoofTileTextures('#b94e2c', '#6e2814', anisotropy, 6, 2);
    track(roofTex.map);
    track(roofTex.bumpMap);
    const roofSlope = new THREE.Mesh(
      track(new THREE.BoxGeometry(9.6, 0.18, 3.4)),
      track(
        new THREE.MeshStandardMaterial({
          map: roofTex.map,
          bumpMap: roofTex.bumpMap,
          bumpScale: 0.045,
          roughness: 0.78,
        })
      )
    );
    roofSlope.position.set(0, 4.18, -3.55);
    roofSlope.rotation.x = 0.24;
    facadeGroup.add(roofSlope);

    // Iconic Striped Green-and-White 3D Awning over sidewalk
    const awningTex = track(createStripedTexture('#146b3a', '#f3f4f6', anisotropy, 14));
    const awning = new THREE.Mesh(
      track(new THREE.BoxGeometry(8.6, 0.09, 1.48)),
      track(new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.65 }))
    );
    awning.position.set(0, 3.16, -2.18);
    awning.rotation.x = 0.28;
    facadeGroup.add(awning);

    // Glowing BAR DA SIMONE Main Neon Marquee
    const mainSignTex = track(
      createSignTexture('BAR DA SIMONE', null, '#180d29', '#facc15', '#fb7185', '#fde047', anisotropy, 640, 140)
    );
    const signBox = new THREE.Mesh(
      track(new THREE.BoxGeometry(4.85, 1.05, 0.24)),
      track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 }))
    );
    signBox.position.set(0, 4.12, -2.42);
    facadeGroup.add(signBox);
    const signFace = new THREE.Mesh(
      track(new THREE.PlaneGeometry(4.68, 0.92)),
      track(
        new THREE.MeshStandardMaterial({
          map: mainSignTex,
          emissive: 0xffffff,
          emissiveMap: mainSignTex,
          emissiveIntensity: 0.95,
          roughness: 0.3,
        })
      )
    );
    signFace.position.set(0, 4.12, -2.29);
    facadeGroup.add(signFace);

    // Three Neon Sub-Signs under the awning: ABERTO | CERVEJA GELADA | SINUCA
    const subSigns: Array<{ text: string; x: number; w: number; border: string; fg: string }> = [
      { text: 'ABERTO', x: -2.15, w: 1.45, border: '#38bdf8', fg: '#e0f2fe' },
      { text: 'CERVEJA GELADA', x: 0, w: 2.35, border: '#f59e0b', fg: '#fef3c7' },
      { text: 'SINUCA', x: 2.15, w: 1.45, border: '#e879f9', fg: '#fae8ff' },
    ];
    for (const sb of subSigns) {
      const sTex = track(createSignTexture(sb.text, null, '#120b1f', sb.border, sb.fg, '#fff', anisotropy, 320, 96));
      const sMesh = new THREE.Mesh(
        track(new THREE.PlaneGeometry(sb.w, 0.42)),
        track(
          new THREE.MeshStandardMaterial({
            map: sTex,
            emissive: 0xffffff,
            emissiveMap: sTex,
            emissiveIntensity: 0.88,
            roughness: 0.35,
          })
        )
      );
      sMesh.position.set(sb.x, 2.74, -2.54);
      facadeGroup.add(sMesh);
    }

    // Glowing vertical SINUCA blade sign & round Brahma medallion
    const bladeTex = track(
      createSignTexture('SINUCA', null, '#1b0b2e', '#f472b6', '#fbcfe8', '#fff', anisotropy, 220, 120)
    );
    const bladeSign = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.55, 1.15, 0.14)),
      track(
        new THREE.MeshStandardMaterial({
          map: bladeTex,
          emissive: 0xf472b6,
          emissiveIntensity: 0.5,
          roughness: 0.35,
        })
      )
    );
    bladeSign.position.set(4.65, 2.55, -2.7);
    facadeGroup.add(bladeSign);

    // Sidewalk outdoor red plastic tables & chairs flanking the open doorway (z = -1.78..-2.25)
    const tableL = buildBarTableSet(track, true, true, true);
    tableL.position.set(-4.35, 0, -1.85);
    tableL.scale.setScalar(0.92);
    group.add(tableL);

    const tableR = buildBarTableSet(track, true, true, true);
    tableR.position.set(3.55, 0, -1.82);
    tableR.scale.setScalar(0.92);
    group.add(tableR);

    // Adjacent left neighbor shuttered storefronts for urban depth
    const shutterMat = track(
      new THREE.MeshStandardMaterial({ color: 0x3b384a, roughness: 0.72, metalness: 0.25 })
    );
    const neighborWall = new THREE.Mesh(track(new THREE.BoxGeometry(6.8, 3.6, 0.8)), wallPlasterMat);
    neighborWall.position.set(-8.1, 1.8, -3.15);
    group.add(neighborWall);
    const shutter = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 2.35, 0.12)), shutterMat);
    shutter.position.set(-6.9, 1.18, -2.72);
    group.add(shutter);

    // Right-hand "Carrinhos de Espetinho" food cart + warm potted plants!
    const cartGroup = new THREE.Group();
    cartGroup.position.set(6.85, 0, -2.45);
    cartGroup.rotation.y = -0.35;
    const cartBody = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.45, 0.92, 0.78)),
      track(new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.42, metalness: 0.55 }))
    );
    cartBody.position.y = 0.68;
    cartGroup.add(cartBody);
    const cartCanopyTex = track(createStripedTexture('#dc2626', '#facc15', anisotropy, 10));
    const cartCanopy = new THREE.Mesh(
      track(new THREE.ConeGeometry(1.05, 0.38, 4)),
      track(new THREE.MeshStandardMaterial({ map: cartCanopyTex, roughness: 0.65 }))
    );
    cartCanopy.rotation.y = Math.PI / 4;
    cartCanopy.position.y = 2.15;
    cartGroup.add(cartCanopy);
    for (const px of [-0.62, 0.62]) {
      const post = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 6)),
        shutterMat
      );
      post.position.set(px, 1.35, 0.28);
      cartGroup.add(post);
    }
    for (const wx of [-0.45, 0.45]) {
      const wheel = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.22, 0.035, 8, 16)),
        shutterMat
      );
      wheel.position.set(wx, 0.24, 0.4);
      cartGroup.add(wheel);
    }
    group.add(cartGroup);

    const barFern = buildPottedPlant(0x9a4b2d, 0x1e6b34, null, track, 1.05);
    barFern.position.set(5.2, 0, -2.55);
    group.add(barFern);

    // Utility Streetlamp Poles + Overhead Catenary Cables
    const poleMat = track(new THREE.MeshStandardMaterial({ color: 0x262630, roughness: 0.65 }));
    for (const px of [-7.6, 8.2]) {
      const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.11, 6.2, 8)), poleMat);
      pole.position.set(px, 3.1, -2.25);
      group.add(pole);

      const lampHead = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.16, 10, 8)),
        track(new THREE.MeshBasicMaterial({ color: 0xffd166 }))
      );
      lampHead.position.set(px + (px < 0 ? 0.55 : -0.55), 4.65, -2.1);
      group.add(lampHead);
    }

    const wireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.6, 5.45, -2.25),
      new THREE.Vector3(0, 4.95, -2.4),
      new THREE.Vector3(8.2, 5.55, -2.25),
    ]);
    const wire = new THREE.Mesh(
      track(new THREE.TubeGeometry(wireCurve, 18, 0.015, 4, false)),
      poleMat
    );
    group.add(wire);

    // LAYER 4 — Near-Camera Foreground Framing (pushed to far outer edges so fighters are 100% clear)
    const fgTable = buildBarTableSet(track, true, true, false);
    fgTable.position.set(-7.65, -0.06, 3.15);
    fgTable.rotation.y = 0.38;
    fgTable.scale.setScalar(1.08);
    group.add(fgTable);

    const fgBollard = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.09, 0.1, 0.85, 8)),
      poleMat
    );
    fgBollard.position.set(7.75, 0.36, 3.2);
    group.add(fgBollard);

    // Atmospheric Lighting & Dynamic Neon Sign Pulse
    const doorwayWarmLight = new THREE.PointLight(0xffb95c, 4.4, 15, 1.45);
    doorwayWarmLight.position.set(-0.2, 2.35, -1.65);
    group.add(doorwayWarmLight);

    const neonLight = new THREE.PointLight(0xff4fd8, 3.4, 16, 1.55);
    neonLight.position.set(0, 4.15, -1.55);
    group.add(neonLight);

    const streetBlueLight = new THREE.PointLight(0x60a5fa, 1.8, 14, 1.6);
    streetBlueLight.position.set(-6.8, 4.1, 1.4);
    group.add(streetBlueLight);

    const motes: THREE.Sprite[] = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: i % 2 === 0 ? 0xffd166 : 0xf472b6,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
          })
        )
      );
      m.scale.set(0.18, 0.18, 1);
      m.position.set(-5.8 + i * 1.3, 1.6 + (i % 3) * 0.75, -1.2 + (i % 2) * 1.8);
      group.add(m);
      motes.push(m);
      particleNodes.push(m);
    }

    updaters.push((t) => {
      const flicker = Math.sin(t * 4.1) > 0.96 ? 1.9 : 3.3 + Math.sin(t * 2.5) * 0.35;
      neonLight.intensity = flicker;
      motes.forEach((m, i) => {
        m.position.y = 1.5 + (i % 3) * 0.75 + Math.sin(t * 1.3 + i * 1.9) * 0.18;
        (m.material as THREE.SpriteMaterial).opacity = 0.22 + (Math.sin(t * 2.4 + i) + 1) * 0.16;
      });
    });
  } else if (id === 'praia') {
    // =========================================================================
    // PRAIA · CALÇADÃO — True 5-Layer 2.5D Sunset Beach & Boardwalk Arena
    // =========================================================================

    // LAYER 1 — Sunset Horizon Backdrop + Sun Disc + Coastal Mountain Ridge
    backdrop = buildDistantHorizonBackdrop('praia', anisotropy, track, {
      z: -21.0,
      y: 8.6,
      width: 62,
      height: 34.8,
      emissive: 0.32,
      opacity: 0.45,
    });
    group.add(backdrop);
    farParallaxNodes.push({ node: backdrop, factor: 0.25 });

    const sunOrb = new THREE.Mesh(
      track(new THREE.CircleGeometry(2.3, 28)),
      track(new THREE.MeshBasicMaterial({ color: 0xfff3c4 }))
    );
    sunOrb.position.set(7.6, 5.2, -19.5);
    group.add(sunOrb);
    farParallaxNodes.push({ node: sunOrb, factor: 0.22 });

    const sunHalo = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffb36b,
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    sunHalo.scale.set(11.5, 11.5, 1);
    sunHalo.position.set(7.6, 5.2, -19.2);
    group.add(sunHalo);
    farParallaxNodes.push({ node: sunHalo, factor: 0.22 });

    const mtnTex = track(createSunsetMountainTexture(anisotropy));
    const mtnPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(48, 12.5)),
      track(new THREE.MeshBasicMaterial({ map: mtnTex, transparent: true, depthWrite: false }))
    );
    mtnPlane.position.set(-2.5, 4.9, -15.6);
    group.add(mtnPlane);
    farParallaxNodes.push({ node: mtnPlane, factor: 0.17 });

    // LAYER 2 — Ocean Plane + Animated Surf Waves + Beach Midground
    const oceanMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(76, 14)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x0e7490,
          roughness: 0.16,
          metalness: 0.48,
          emissive: 0x164e63,
          emissiveIntensity: 0.25,
        })
      )
    );
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, -0.04, -12.8);
    group.add(oceanMesh);

    const waveTex = track(createSurfWaveTexture(anisotropy));
    const waveRibbons: THREE.Mesh[] = [];
    for (let w = 0; w < 3; w++) {
      const ribbon = new THREE.Mesh(
        track(new THREE.PlaneGeometry(58, 2.2)),
        track(
          new THREE.MeshBasicMaterial({
            map: waveTex,
            transparent: true,
            opacity: 0.85 - w * 0.15,
            depthWrite: false,
          })
        )
      );
      ribbon.rotation.x = -Math.PI / 2;
      ribbon.position.set(0, 0.012 + w * 0.004, -7.8 + w * 1.05);
      group.add(ribbon);
      waveRibbons.push(ribbon);
    }

    // Seamless Warm Golden Sand covering deep beach (-6.2) straight through combat lane (+1.9)
    const sandTex = createSandTexture(anisotropy);
    track(sandTex.map);
    track(sandTex.bumpMap);
    buildSeamlessStageFloor(
      sandTex.map,
      sandTex.bumpMap,
      {
        roughness: 0.88,
        metalness: 0.02,
        bumpScale: 0.032,
        colorTint: 0xffe4bc,
        solidSpanZ: 9.2,
        solidCenterZ: -2.4, // spans z = -7.0 .. +2.2
        tileRepeatX: 11,
        tileRepeatY: 4,
      },
      track,
      group
    );

    // Foreground Iconic Rio Wave Calçadão Promenade (z = +1.9 .. +11.0) + stone border curb
    const calcadaoTex = track(createCalcadaoTexture(anisotropy));
    const calcadaoMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(66, 9.5)),
      track(
        new THREE.MeshStandardMaterial({
          map: calcadaoTex,
          roughness: 0.72,
          metalness: 0.05,
          color: 0xffedd5,
        })
      )
    );
    calcadaoMesh.rotation.x = -Math.PI / 2;
    calcadaoMesh.position.set(0, 0.035, 6.6);
    calcadaoMesh.receiveShadow = true;
    group.add(calcadaoMesh);

    const woodTex = createWoodPlankTextures('#8c6239', '#6d4c2d', '#3e2715', anisotropy, 2, 2);
    track(woodTex.map);
    track(woodTex.bumpMap);
    const woodMat = track(
      new THREE.MeshStandardMaterial({
        map: woodTex.map,
        bumpMap: woodTex.bumpMap,
        bumpScale: 0.035,
        roughness: 0.86,
      })
    );

    // Foreground stone curb edge dividing sand combat lane from Rio calçadão
    const stoneCurb = new THREE.Mesh(
      track(new THREE.BoxGeometry(60, 0.09, 0.24)),
      track(new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.8 }))
    );
    stoneCurb.position.set(0, 0.02, 1.9);
    stoneCurb.receiveShadow = true;
    group.add(stoneCurb);

    // LAYER 3 — Midground 3D Lifeguard Tower, Christmas Tree, Umbrellas, Fence & Palms
    // 1) Weathered wooden beach fence posts framing the back flanks cleanly (leaving center beach vista open)
    for (const segX of [-6.8, -5.0, -3.2, 4.4, 6.2, 8.0]) {
      const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.92, 0.14)), woodMat);
      post.position.set(segX, 0.46, -2.55);
      group.add(post);
    }
    for (const span of [
      { cx: -5.2, w: 4.1 },
      { cx: 6.2, w: 3.9 },
    ]) {
      for (const ry of [0.38, 0.74]) {
        const rail = new THREE.Mesh(track(new THREE.BoxGeometry(span.w, 0.08, 0.07)), woodMat);
        rail.position.set(span.cx, ry, -2.55);
        group.add(rail);
      }
    }

    // 2) Iconic PARTIU PRAIA! Wooden Signpost (left midground)
    const signGroup = new THREE.Group();
    signGroup.position.set(-3.75, 0, -2.35);
    signGroup.rotation.y = 0.22;
    const signPost = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.07, 1.75, 8)), woodMat);
    signPost.position.y = 0.875;
    signGroup.add(signPost);
    const partiuTex = track(
      createSignTexture('PARTIU PRAIA!', 'CALÇADÃO · NATAL', '#6b4226', '#d97706', '#fef3c7', '#7dd3fc', anisotropy, 360, 140)
    );
    const partiuBoard = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.18, 0.56, 0.07)),
      track(new THREE.MeshStandardMaterial({ map: partiuTex, roughness: 0.72 }))
    );
    partiuBoard.position.y = 1.48;
    signGroup.add(partiuBoard);
    group.add(signGroup);

    // 3) Iconic 3D Wooden Lifeguard Tower (`Torre Salva-Vidas`) + Red/White Lifebuoy
    const tower = new THREE.Group();
    tower.position.set(2.55, 0, -4.1);
    tower.rotation.y = -0.22;
    const stiltGeo = track(new THREE.BoxGeometry(0.11, 2.05, 0.11));
    for (const sx of [-0.55, 0.55]) {
      for (const sz of [-0.55, 0.55]) {
        const stilt = new THREE.Mesh(stiltGeo, woodMat);
        stilt.position.set(sx, 1.0, sz);
        stilt.rotation.z = sx * -0.08;
        tower.add(stilt);
      }
    }
    const deck = new THREE.Mesh(track(new THREE.BoxGeometry(1.38, 0.1, 1.38)), woodMat);
    deck.position.y = 1.92;
    tower.add(deck);
    const cabin = new THREE.Mesh(track(new THREE.BoxGeometry(1.16, 1.12, 1.12)), woodMat);
    cabin.position.y = 2.52;
    tower.add(cabin);
    const roof = new THREE.Mesh(track(new THREE.ConeGeometry(1.06, 0.45, 4)), woodMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.28;
    tower.add(roof);
    const buoy = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.28, 0.075, 10, 20)),
      track(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 }))
    );
    buoy.position.set(-0.62, 1.65, 0.42);
    buoy.rotation.y = Math.PI * 0.3;
    tower.add(buoy);
    group.add(tower);

    // 4) Iconic Tropical Christmas Tree (`Feliz Natal · Praia Calçadão`)
    const xmas = new THREE.Group();
    xmas.position.set(5.45, 0, -3.55);
    const xTrunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.18, 0.55, 8)), woodMat);
    xTrunk.position.y = 0.275;
    xmas.add(xTrunk);
    const pineMat = track(new THREE.MeshStandardMaterial({ color: 0x155e2c, roughness: 0.78 }));
    for (let tier = 0; tier < 4; tier++) {
      const r = 1.05 - tier * 0.22;
      const h = 1.0 - tier * 0.1;
      const cone = new THREE.Mesh(track(new THREE.ConeGeometry(r, h, 10)), pineMat);
      cone.position.y = 0.85 + tier * 0.56;
      xmas.add(cone);
    }
    const star = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(0.18, 0)),
      track(new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.95 }))
    );
    star.position.y = 3.1;
    xmas.add(star);

    const xmasBulbs: THREE.Mesh[] = [];
    const bulbCols = [0xfef08a, 0xef4444, 0x38bdf8, 0x4ade80];
    for (let b = 0; b < 14; b++) {
      const tierPct = b / 14;
      const rad = 0.9 - tierPct * 0.65;
      const ang = b * 1.9;
      const bulb = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.055, 7, 7)),
        track(
          new THREE.MeshStandardMaterial({
            color: bulbCols[b % bulbCols.length],
            emissive: bulbCols[b % bulbCols.length],
            emissiveIntensity: 0.9,
          })
        )
      );
      bulb.position.set(Math.cos(ang) * rad, 0.68 + tierPct * 2.1, Math.sin(ang) * rad);
      xmas.add(bulb);
      xmasBulbs.push(bulb);
    }

    const natalTex = track(
      createSignTexture('FELIZ NATAL', 'PRAIA CALÇADÃO', '#451a03', '#fbbf24', '#fef08a', '#fed7aa', anisotropy, 320, 110)
    );
    const natalSign = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.38, 0.48, 0.08)),
      track(new THREE.MeshStandardMaterial({ map: natalTex, roughness: 0.65 }))
    );
    natalSign.position.set(0, 0.26, 0.95);
    xmas.add(natalSign);
    group.add(xmas);

    // 5) Colorful Beach Umbrellas & Lounge Chairs on sand
    const umbrellaColors = [0xef4444, 0x0ea5e9, 0xfacc15, 0x22c55e];
    for (const [ux, uz, cIdx] of [
      [-1.1, -4.5, 0],
      [-4.9, -4.8, 1],
      [-6.8, -5.6, 2],
    ]) {
      const uGroup = new THREE.Group();
      uGroup.position.set(ux, 0, uz);
      const uPole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.035, 0.035, 2.15, 8)), woodMat);
      uPole.position.y = 1.075;
      uGroup.add(uPole);
      const canopy = new THREE.Mesh(
        track(new THREE.ConeGeometry(1.12, 0.42, 8)),
        track(
          new THREE.MeshStandardMaterial({
            color: umbrellaColors[cIdx],
            roughness: 0.55,
            side: THREE.DoubleSide,
          })
        )
      );
      canopy.position.y = 2.05;
      uGroup.add(canopy);
      group.add(uGroup);
    }

    // 6) Tall Swaying 3D Coconut Palms flanking left & right
    const palmL1 = buildPalmTree(6.4, 0.85, track, 1.05);
    palmL1.position.set(-5.7, 0, -2.85);
    group.add(palmL1);
    const palmL2 = buildPalmTree(5.4, 0.5, track, 0.92);
    palmL2.position.set(-8.1, 0, -3.9);
    group.add(palmL2);
    const palmR1 = buildPalmTree(6.8, -0.95, track, 1.12);
    palmR1.position.set(7.7, 0, -3.1);
    group.add(palmR1);

    // LAYER 4 — Near-Camera Tropical Foliage Corners (far left/right z = +3.0)
    const fgBushL = buildPottedPlant(0x5c3e26, 0x256d30, 0xf97316, track, 1.28);
    fgBushL.position.set(-7.6, -0.05, 3.0);
    group.add(fgBushL);
    const fgBushR = buildPottedPlant(0x5c3e26, 0x1e6b34, 0xef4444, track, 1.24);
    fgBushR.position.set(7.7, -0.05, 3.05);
    group.add(fgBushR);

    // Lighting & Wave/Palm Animation
    const sunBounce = new THREE.PointLight(0xffb968, 3.0, 20, 1.35);
    sunBounce.position.set(5.5, 3.2, -1.6);
    group.add(sunBounce);

    const glints: THREE.Sprite[] = [];
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: 0xfff5d6,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
          })
        )
      );
      sp.scale.set(0.32, 0.32, 1);
      sp.position.set(-6.8 + i * 2.0, 0.55 + (i % 3) * 0.35, -3.4);
      group.add(sp);
      glints.push(sp);
      particleNodes.push(sp);
    }

    updaters.push((t) => {
      waveRibbons.forEach((r, idx) => {
        r.position.z = -7.8 + idx * 1.05 + Math.sin(t * 1.4 + idx * 1.1) * 0.38;
        (r.material as THREE.MeshBasicMaterial).opacity =
          0.55 + Math.sin(t * 1.4 + idx) * 0.25;
      });
      for (const tree of [palmL1, palmL2, palmR1]) {
        const crown = tree.userData.crown as THREE.Group | undefined;
        if (crown) crown.rotation.z = Math.sin(t * 1.2 + tree.position.x) * 0.045;
      }
      xmasBulbs.forEach((b, i) => {
        const mat = b.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.45 + (Math.sin(t * 4.5 + i * 0.9) + 1) * 0.55;
      });
      glints.forEach((sp, i) => {
        (sp.material as THREE.SpriteMaterial).opacity =
          0.18 + (Math.sin(t * 2.2 + i * 1.4) + 1) * 0.2;
      });
    });
  } else if (id === 'padaria') {
    // =========================================================================
    // PADARIA DA JUJU — 2.5D Morning Bakery Storefront, Awning & Street Curb
    // =========================================================================
    backdrop = buildDistantHorizonBackdrop('padaria', anisotropy, track, {
      z: -15.5,
      y: 7.4,
      width: 50,
      height: 28.1,
      emissive: 0.35,
      opacity: 0.65,
    });
    group.add(backdrop);
    farParallaxNodes.push({ node: backdrop, factor: 0.22 });

    // Checkered pink-and-cream bakery sidewalk floor + cobblestone street
    const sidewalkTex = track(createCheckeredTileTexture('#e9a8a6', '#f4d9cf', anisotropy, 16, 4));
    buildSeamlessStageFloor(
      sidewalkTex,
      undefined,
      {
        roughness: 0.72,
        metalness: 0.04,
        colorTint: 0xfaebd7,
        solidSpanZ: 6.4,
        solidCenterZ: -1.3, // z: -4.5 .. +1.9
      },
      track,
      group
    );
    const streetTex = createCobbleFloorTextures('#ba9266', '#9e764d', '#5a4129', anisotropy, 15, 3);
    track(streetTex.map);
    track(streetTex.bumpMap);
    const street = new THREE.Mesh(
      track(new THREE.PlaneGeometry(66, 12)),
      track(
        new THREE.MeshStandardMaterial({
          map: streetTex.map,
          bumpMap: streetTex.bumpMap,
          bumpScale: 0.035,
          roughness: 0.84,
        })
      )
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, -0.07, 7.9);
    street.receiveShadow = true;
    group.add(street);

    const curb = new THREE.Mesh(
      track(new THREE.BoxGeometry(58, 0.13, 0.22)),
      track(new THREE.MeshStandardMaterial({ color: 0xbfae9a, roughness: 0.8 }))
    );
    curb.position.set(0, -0.015, 1.9);
    curb.receiveShadow = true;
    group.add(curb);

    // 3D Padaria Storefront Facade (z = -2.85)
    const wallPeach = track(new THREE.MeshStandardMaterial({ color: 0xe69f73, roughness: 0.82 }));
    const woodTrim = track(new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.65 }));
    const facade = new THREE.Mesh(track(new THREE.BoxGeometry(8.8, 4.4, 0.6)), wallPeach);
    facade.position.set(0, 2.2, -3.05);
    group.add(facade);

    // Warm bakery display windows with glowing cakes
    const winGlowMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xffc66e,
        emissiveIntensity: 0.65,
        roughness: 0.3,
      })
    );
    for (const wx of [-2.4, 2.4]) {
      const frame = new THREE.Mesh(track(new THREE.BoxGeometry(2.75, 2.1, 0.14)), woodTrim);
      frame.position.set(wx, 1.45, -2.72);
      group.add(frame);
      const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(2.5, 1.85)), winGlowMat);
      glass.position.set(wx, 1.45, -2.63);
      group.add(glass);
    }

    // Center Bakery Door + ABERTO sign
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.28, 2.45, 0.14)), woodTrim);
    door.position.set(0, 1.225, -2.7);
    group.add(door);
    const abertoTex = track(
      createSignTexture('ABERTO', null, '#1e1b4b', '#38bdf8', '#fca5a5', '#fff', anisotropy, 240, 96)
    );
    const aberto = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.75, 0.34)),
      track(new THREE.MeshStandardMaterial({ map: abertoTex, emissive: 0xffffff, emissiveMap: abertoTex, emissiveIntensity: 0.7 }))
    );
    aberto.position.set(0, 1.72, -2.61);
    group.add(aberto);

    // Red & Cream Striped Awning + Wooden Marquee Sign
    const bakeryAwningTex = track(createStripedTexture('#c9342d', '#fef3c7', anisotropy, 16));
    const bakeryAwning = new THREE.Mesh(
      track(new THREE.BoxGeometry(8.8, 0.1, 1.45)),
      track(new THREE.MeshStandardMaterial({ map: bakeryAwningTex, roughness: 0.65 }))
    );
    bakeryAwning.position.set(0, 3.05, -2.28);
    bakeryAwning.rotation.x = 0.28;
    group.add(bakeryAwning);

    const jujuSignTex = track(
      createSignTexture('PADARIA DA JUJU', 'BOLOS DA JUJU · PÃES QUENTES', '#fff3db', '#7c4a21', '#b91c1c', '#57534e', anisotropy, 640, 160)
    );
    const jujuSign = new THREE.Mesh(
      track(new THREE.BoxGeometry(4.5, 1.05, 0.18)),
      track(new THREE.MeshStandardMaterial({ map: jujuSignTex, roughness: 0.55 }))
    );
    jujuSign.position.set(0, 4.05, -2.62);
    group.add(jujuSign);

    // Outdoor checkered café table + bougainvillea planters + foreground shrubs
    const cafeTable = new THREE.Group();
    cafeTable.position.set(-3.1, 0, -1.85);
    const clothTex = track(createCheckeredClothTexture('#f43f5e', '#fff1f2', anisotropy));
    const cafeTop = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.46, 0.52, 0.34, 14)),
      track(new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.72 }))
    );
    cafeTop.position.y = 0.68;
    cafeTable.add(cafeTop);
    const cafePed = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.18, 0.6, 8)), woodTrim);
    cafePed.position.y = 0.3;
    cafeTable.add(cafePed);
    group.add(cafeTable);

    const potL = buildPottedPlant(0xb45309, 0x2f6b2f, 0xec4899, track, 1.1);
    potL.position.set(-4.35, 0, -2.25);
    group.add(potL);
    const potR = buildPottedPlant(0xb45309, 0x2f6b2f, 0xf43f5e, track, 1.1);
    potR.position.set(4.15, 0, -2.25);
    group.add(potR);

    const fgPotL = buildPottedPlant(0x9a4b2d, 0x2f6b2f, 0xec4899, track, 1.25);
    fgPotL.position.set(-7.65, -0.05, 3.05);
    group.add(fgPotL);
    const fgPotR = buildPottedPlant(0x9a4b2d, 0x2f6b2f, 0xfbbf24, track, 1.2);
    fgPotR.position.set(7.7, -0.05, 3.05);
    group.add(fgPotR);

    const steamSprites: THREE.Sprite[] = [];
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(
        track(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffbeb, transparent: true, opacity: 0.28 }))
      );
      sp.scale.set(0.42, 0.42, 1);
      sp.position.set(-3.1 + i * 0.22, 1.05, -1.85);
      group.add(sp);
      steamSprites.push(sp);
      particleNodes.push(sp);
    }

    const butterflies: THREE.Mesh[] = [];
    const bfGeo = track(new THREE.PlaneGeometry(0.18, 0.12));
    for (let i = 0; i < 3; i++) {
      const bf = new THREE.Mesh(
        bfGeo,
        track(
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0xfbbf24 : 0xff7ab8,
            side: THREE.DoubleSide,
          })
        )
      );
      bf.position.set(-3 + i * 3, 1.6 + i * 0.3, -1.5);
      group.add(bf);
      butterflies.push(bf);
      particleNodes.push(bf);
    }

    updaters.push((t) => {
      steamSprites.forEach((sp, i) => {
        const phase = (t * 0.45 + i * 0.33) % 1;
        sp.position.y = 0.95 + phase * 1.1;
        sp.position.x = -3.1 + Math.sin(t * 2 + i) * 0.08;
        (sp.material as THREE.SpriteMaterial).opacity = Math.sin(phase * Math.PI) * 0.28;
      });
      butterflies.forEach((bf, i) => {
        bf.position.x = Math.sin(t * 0.55 + i * 2.1) * 5.2;
        bf.position.y = 1.45 + Math.sin(t * 2.4 + i) * 0.35;
        bf.scale.x = 0.3 + Math.abs(Math.sin(t * 14 + i)) * 0.7;
      });
    });
  } else if (id === 'quintal') {
    // =========================================================================
    // QUINTAL DA FAMÍLIA — 2.5D Brick Patio, Clothesline, Mango Tree & Sunset
    // =========================================================================
    backdrop = buildDistantHorizonBackdrop('quintal', anisotropy, track, {
      z: -15.5,
      y: 7.4,
      width: 50,
      height: 28.1,
      emissive: 0.38,
      opacity: 0.72,
    });
    group.add(backdrop);
    farParallaxNodes.push({ node: backdrop, factor: 0.22 });

    const floorTex = createEarthFloorTextures('#aa633e', '#8e4d2d', '#68361f', anisotropy, 11, 4);
    track(floorTex.map);
    track(floorTex.bumpMap);
    buildSeamlessStageFloor(
      floorTex.map,
      floorTex.bumpMap,
      {
        roughness: 0.9,
        metalness: 0.02,
        bumpScale: 0.032,
        colorTint: 0xf5d6bd,
        solidSpanZ: 13.5,
        solidCenterZ: 4.5, // z: -2.25 .. +11.25
      },
      track,
      group
    );

    // Raised terracotta patio terrace in back (z = -4.6 .. -2.1)
    const patioMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(22, 0.14, 2.7)),
      track(new THREE.MeshStandardMaterial({ color: 0xb95432, roughness: 0.76 }))
    );
    patioMesh.position.set(0, 0.05, -3.45);
    patioMesh.receiveShadow = true;
    group.add(patioMesh);

    // Red brick garden perimeter wall + wrought iron gate
    const brickTex = createBrickTextures('#9c442c', '#7c321e', '#572417', anisotropy, 6, 2);
    track(brickTex.map);
    track(brickTex.bumpMap);
    const brickMat = track(
      new THREE.MeshStandardMaterial({
        map: brickTex.map,
        bumpMap: brickTex.bumpMap,
        bumpScale: 0.04,
        roughness: 0.86,
      })
    );
    const wallL = new THREE.Mesh(track(new THREE.BoxGeometry(9.6, 2.85, 0.36)), brickMat);
    wallL.position.set(-4.2, 1.425, -4.7);
    group.add(wallL);
    const wallR = new THREE.Mesh(track(new THREE.BoxGeometry(6.8, 2.65, 0.36)), brickMat);
    wallR.position.set(6.2, 1.325, -4.7);
    group.add(wallR);

    // Wrought-iron gate bars in the gap (x = 0.6 .. 2.8)
    const ironMat = track(new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.45, metalness: 0.55 }));
    for (let gx = 0.85; gx <= 2.55; gx += 0.28) {
      const bar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 2.45, 6)), ironMat);
      bar.position.set(gx, 1.25, -4.68);
      group.add(bar);
    }

    // 3D Clothesline (`varal`) with swaying colorful family clothes!
    const lineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.2, 2.55, -3.4),
      new THREE.Vector3(-1.4, 2.22, -3.4),
      new THREE.Vector3(1.2, 2.55, -3.4),
    ]);
    const rope = new THREE.Mesh(
      track(new THREE.TubeGeometry(lineCurve, 14, 0.015, 4, false)),
      ironMat
    );
    group.add(rope);
    const clothColors = [0xfbbf24, 0xf472b6, 0x22c55e, 0xef4444, 0x3b82f6];
    const clothes: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const cx = -3.4 + i * 0.96;
      const cloth = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.62, 0.82, 0.03)),
        track(new THREE.MeshStandardMaterial({ color: clothColors[i], roughness: 0.82 }))
      );
      cloth.position.set(cx, 1.98 - Math.sin((i / 4) * Math.PI) * 0.22, -3.4);
      group.add(cloth);
      clothes.push(cloth);
    }

    // Lush Mango Tree rising behind right brick wall + hanging mangoes
    const mangoTrunk = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.45, 0.62, 3.8, 10)),
      track(new THREE.MeshStandardMaterial({ color: 0x4b2f1d, roughness: 0.9 }))
    );
    mangoTrunk.position.set(6.4, 1.9, -5.2);
    group.add(mangoTrunk);
    const leafMat = track(new THREE.MeshStandardMaterial({ color: 0x2e6426, roughness: 0.72 }));
    const mangoMat = track(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, emissive: 0x92400e, emissiveIntensity: 0.25 })
    );
    for (let c = 0; c < 6; c++) {
      const canopy = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1.55, 1)), leafMat);
      canopy.position.set(4.5 + (c % 3) * 1.45, 4.35 + Math.floor(c / 3) * 0.85, -4.8 + (c % 2) * 0.5);
      group.add(canopy);
      const mango = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 8, 8)), mangoMat);
      mango.scale.set(0.85, 1.25, 0.85);
      mango.position.set(4.1 + c * 0.72, 3.35 + (c % 2) * 0.4, -4.1);
      group.add(mango);
    }

    // Potted backyard bromeliads on left/right + foreground planters
    for (const px of [-5.8, -4.6, 4.9]) {
      const pot = buildPottedPlant(0x9a4b2d, 0x226832, 0xf97316, track, 1.1);
      pot.position.set(px, 0.12, -2.55);
      group.add(pot);
    }
    const fgQ1 = buildPottedPlant(0x7c3e24, 0x226832, 0xf43f5e, track, 1.25);
    fgQ1.position.set(-7.6, -0.05, 3.05);
    group.add(fgQ1);
    const fgQ2 = buildPottedPlant(0x7c3e24, 0x226832, 0xfacc15, track, 1.2);
    fgQ2.position.set(7.7, -0.05, 3.05);
    group.add(fgQ2);

    const fireflies: THREE.Sprite[] = [];
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: 0xffe07d,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
          })
        )
      );
      sp.scale.set(0.24, 0.24, 1);
      sp.position.set(-7.2 + i * 1.35, 1.15 + (i % 4) * 0.55, -2.6 + (i % 3) * 0.7);
      group.add(sp);
      fireflies.push(sp);
      particleNodes.push(sp);
    }

    updaters.push((t) => {
      clothes.forEach((c, i) => {
        c.rotation.x = Math.sin(t * 2.2 + i * 0.9) * 0.11;
      });
      fireflies.forEach((sp, i) => {
        sp.position.y = 1.15 + (i % 4) * 0.55 + Math.sin(t * 1.8 + i * 2) * 0.25;
        (sp.material as THREE.SpriteMaterial).opacity =
          0.25 + (Math.sin(t * 3 + i * 1.7) + 1) * 0.32;
      });
    });
  } else {
    // =========================================================================
    // FESTA JUNINA — 2.5D Plaza Bonfire, Barracas, Bandeirinhas & Night Sky
    // =========================================================================
    backdrop = buildDistantHorizonBackdrop('festa', anisotropy, track, {
      z: -16.5,
      y: 7.4,
      width: 52,
      height: 29.25,
      emissive: 0.34,
      opacity: 0.6,
    });
    group.add(backdrop);
    farParallaxNodes.push({ node: backdrop, factor: 0.24 });

    const floorTex = createCobbleFloorTextures('#72523d', '#593d2b', '#2e1e14', anisotropy, 14, 5);
    track(floorTex.map);
    track(floorTex.bumpMap);
    buildSeamlessStageFloor(
      floorTex.map,
      floorTex.bumpMap,
      {
        roughness: 0.88,
        metalness: 0.03,
        bumpScale: 0.038,
        colorTint: 0xedd5c4,
        solidSpanZ: 16.5,
        solidCenterZ: 3.4, // z: -4.85 .. +11.65
      },
      track,
      group
    );

    // 3D Crackling Bonfire (`Fogueira`) center-left behind combat lane
    const woodMat = track(new THREE.MeshStandardMaterial({ color: 0x452212, roughness: 0.9 }));
    const stoneMat = track(new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.85 }));
    const fireGroup = new THREE.Group();
    fireGroup.position.set(-1.6, 0, -3.15);
    for (let s = 0; s < 10; s++) {
      const a = (s / 10) * Math.PI * 2;
      const rock = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.18, 0)), stoneMat);
      rock.position.set(Math.cos(a) * 0.72, 0.12, Math.sin(a) * 0.56);
      fireGroup.add(rock);
    }
    for (let l = 0; l < 5; l++) {
      const log = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.09, 1.15, 7)), woodMat);
      log.position.y = 0.38;
      log.rotation.y = (l / 5) * Math.PI * 2;
      log.rotation.z = 0.52;
      fireGroup.add(log);
    }
    const flameOuter = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.46, 1.35, 8)),
      track(new THREE.MeshBasicMaterial({ color: 0xff6b00, transparent: true, opacity: 0.82 }))
    );
    flameOuter.position.y = 0.78;
    fireGroup.add(flameOuter);
    const flameInner = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.26, 0.92, 8)),
      track(new THREE.MeshBasicMaterial({ color: 0xfde047 }))
    );
    flameInner.position.y = 0.62;
    fireGroup.add(flameInner);
    group.add(fireGroup);

    // Flanking Festival Stalls (`Barracas`: PIPOCA & QUENTÃO) angled toward center
    const makeBarraca = (title: string, stripeA: string, stripeB: string, px: number, pz: number, rotY: number) => {
      const stall = new THREE.Group();
      stall.position.set(px, 0, pz);
      stall.rotation.y = rotY;
      const base = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 1.05, 1.2)), woodMat);
      base.position.y = 0.525;
      stall.add(base);
      const canopyTex = track(createStripedTexture(stripeA, stripeB, anisotropy, 8));
      const canopy = new THREE.Mesh(
        track(new THREE.BoxGeometry(2.85, 0.14, 1.55)),
        track(new THREE.MeshStandardMaterial({ map: canopyTex, roughness: 0.68 }))
      );
      canopy.position.y = 2.55;
      canopy.rotation.x = 0.22;
      stall.add(canopy);
      const stTex = track(createSignTexture(title, null, '#451a03', '#facc15', '#fef08a', '#fff', anisotropy, 320, 96));
      const sign = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.9, 0.44, 0.08)),
        track(new THREE.MeshStandardMaterial({ map: stTex, emissive: 0xffffff, emissiveMap: stTex, emissiveIntensity: 0.45 }))
      );
      sign.position.set(0, 2.28, 0.68);
      stall.add(sign);
      for (const sx of [-1.2, 1.2]) {
        const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6)), woodMat);
        post.position.set(sx, 1.25, 0.52);
        stall.add(post);
      }
      return stall;
    };

    group.add(makeBarraca('PIPOCA', '#dc2626', '#fef08a', -5.4, -3.4, 0.34));
    group.add(makeBarraca('PAMONHA', '#ea580c', '#fde047', -3.6, -4.8, 0.2));
    group.add(makeBarraca('QUENTÃO & BOLOS', '#16a34a', '#fbbf24', 5.2, -3.4, -0.34));

    // Overhead Strings of Colorful 3D Bandeirinhas + Lanterns
    const flagCols = [0xef4444, 0xfacc15, 0x3b82f6, 0x22c55e, 0xf472b6];
    const flagGeo = track(new THREE.ConeGeometry(0.14, 0.28, 3));
    flagGeo.rotateX(Math.PI);
    const bandeirinhasGroup = new THREE.Group();
    for (let row = 0; row < 2; row++) {
      const zRow = -2.2 - row * 1.8;
      const yBase = 4.35 + row * 0.55;
      for (let i = -8; i <= 8; i++) {
        const sag = Math.cos((i / 8) * (Math.PI / 2)) * 0.55;
        const flag = new THREE.Mesh(
          flagGeo,
          track(
            new THREE.MeshStandardMaterial({
              color: flagCols[(i + 10 + row) % flagCols.length],
              emissive: flagCols[(i + 10 + row) % flagCols.length],
              emissiveIntensity: 0.2,
              roughness: 0.7,
            })
          )
        );
        flag.position.set(i * 0.92, yBase - sag, zRow);
        bandeirinhasGroup.add(flag);
      }
    }
    group.add(bandeirinhasGroup);

    // Foreground rustic wooden barrels at outer edges (z = +3.1)
    for (const bx of [-7.65, 7.65]) {
      const barrel = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.42, 0.38, 0.88, 12)),
        woodMat
      );
      barrel.position.set(bx, 0.44, 3.15);
      group.add(barrel);
    }

    const fireLight = new THREE.PointLight(0xff8c2b, 4.6, 18, 1.6);
    fireLight.position.set(-1.6, 1.65, -2.5);
    group.add(fireLight);

    const embers: THREE.Sprite[] = [];
    for (let i = 0; i < 14; i++) {
      const em = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: i % 2 === 0 ? 0xffb703 : 0xff7b00,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
          })
        )
      );
      em.scale.set(0.22, 0.22, 1);
      em.position.set(-2.4 + (i % 5) * 0.45, 0.8, -3.1);
      group.add(em);
      embers.push(em);
      particleNodes.push(em);
    }

    updaters.push((t) => {
      fireLight.intensity = 4.2 + Math.sin(t * 17) * 0.75 + Math.cos(t * 23) * 0.38;
      flameOuter.scale.set(1 + Math.sin(t * 14) * 0.08, 1 + Math.cos(t * 18) * 0.14, 1);
      flameInner.scale.set(1 + Math.cos(t * 16) * 0.1, 1 + Math.sin(t * 21) * 0.16, 1);
      bandeirinhasGroup.rotation.z = Math.sin(t * 1.4) * 0.012;
      embers.forEach((em, i) => {
        const p = (t * 0.62 + i * 0.17) % 1;
        em.position.y = 0.7 + p * 4.2;
        em.position.x = -1.6 + Math.sin(t * 2.8 + i * 1.9) * 1.1;
        (em.material as THREE.SpriteMaterial).opacity = Math.sin(p * Math.PI) * 0.85;
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
    setParallax: (camX: number) => {
      for (const item of farParallaxNodes) {
        item.node.position.x = -camX * item.factor;
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
