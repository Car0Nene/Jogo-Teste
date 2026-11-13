const SHARED_CAMERA = {
  baseZoom: 1,
  minZoom: 0.72,
  maxZoom: 1,
  presentationZoom: 1.08,
  resultZoom: 1.04,
  fullZoomDistanceRatio: 0.62,
  followLerp: 0.09,
  focusY: 0.5,
  worldWidthMultiplier: 1.35
};

const SHARED_DEPTH = {
  min: 0,
  max: 1,
  moveSpeed: 0.48,
  acceleration: 2.5,
  friction: 3.4,
  collisionTolerance: 0.16,
  hitTolerance: 0.22,
  scaleRange: [0.88, 1.08]
};

export const DEFAULT_STAGE_ID = 'bar';

export const STAGES = Object.freeze({
  bar: {
    id: 'bar',
    name: 'Bar da Simone',
    source: { width: 1536, height: 397 },
    layers: [{ id: 'backdrop', textureKey: 'bar', image: 'assets/bar.webp', depth: -20, parallax: 1 }],
    groundYRatio: 0.865,
    horizontalBounds: { left: 0.07, right: 0.93 },
    depth: {
      ...SHARED_DEPTH,
      backYRatio: 0.78,
      frontYRatio: 0.95,
      initial: 0.55
    },
    spawns: [{ x: 0.37, depth: 0.55 }, { x: 0.63, depth: 0.55 }],
    plane: { color: 0x211920, alpha: 0.1 },
    shadow: { width: 94, height: 18, alpha: 0.38, jumpSquash: 0.55 },
    atmosphere: { color: 0xffc46a, alpha: 0.045, dustCount: 14, dustColor: 0xffedb5 },
    camera: { ...SHARED_CAMERA },
    music: 'music/family-fighter-2.mp3'
  },
  praia: {
    id: 'praia',
    name: 'Praia',
    source: { width: 1672, height: 443 },
    layers: [{ id: 'backdrop', textureKey: 'praia', image: 'assets/praia.webp', depth: -20, parallax: 1 }],
    groundYRatio: 0.825,
    horizontalBounds: { left: 0.06, right: 0.94 },
    depth: {
      ...SHARED_DEPTH,
      backYRatio: 0.68,
      frontYRatio: 0.89,
      initial: 0.56
    },
    spawns: [{ x: 0.37, depth: 0.56 }, { x: 0.63, depth: 0.56 }],
    plane: { color: 0x433622, alpha: 0.075 },
    shadow: { width: 100, height: 18, alpha: 0.32, jumpSquash: 0.6 },
    atmosphere: null,
    camera: { ...SHARED_CAMERA, fullZoomDistanceRatio: 0.64 },
    music: 'music/family-fighter-3.mp3'
  }
});

export function getStage(stageId = DEFAULT_STAGE_ID) {
  const stage = STAGES[stageId];
  if (!stage) throw new Error(`Unknown stage: ${stageId}`);
  return stage;
}
