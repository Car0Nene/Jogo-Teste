export function getTargetZoom(distance, viewportWidth, config) {
  const fullZoomDistance = viewportWidth * config.fullZoomDistanceRatio;
  const distanceScale = Math.max(1, distance / fullZoomDistance);
  return Math.max(config.minZoom, Math.min(
    config.baseZoom / distanceScale,
    config.maxZoom
  ));
}

export class CameraSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.config = config;
    this.target = scene.add.zone(0, 0, 1, 1).setDepth(-100);
    this.camera.setZoom(config.baseZoom);
    this.camera.startFollow(this.target, false, config.followLerp, config.followLerp);
    this.resize();
  }

  resize() {
    const { worldWidth, height } = this.scene.stageData;
    this.camera.setBounds(0, 0, worldWidth, height);
    this.target.setPosition(worldWidth / 2, height * this.config.focusY);
  }

  update(fighters, delta) {
    if (fighters.length < 2) return;
    const [first, second] = fighters;
    const distance = Math.abs(first.x - second.x);
    this.modeTime = (this.modeTime || 0) + delta;
    const targetZoom = this.mode === 'intro'
      ? this.config.presentationZoom || 1.08
      : this.mode === 'result'
        ? this.config.resultZoom || 1.04
        : getTargetZoom(distance, this.scene.scale.width, this.config);
    const smoothing = 1 - Math.exp(-delta / 180);
    this.camera.setZoom(this.camera.zoom + (targetZoom - this.camera.zoom) * smoothing);
    const focus = this.focusFighter;
    const midpoint = (first.x + second.x) / 2;
    const introProgress = this.mode === 'intro' ? Math.min(1, this.modeTime / 1000) : 1;
    const targetX = this.mode === 'intro'
      ? this.scene.stageData.worldWidth / 2
        + (midpoint - this.scene.stageData.worldWidth / 2) * introProgress
      : focus ? focus.x : midpoint;
    this.target.setPosition(
      targetX,
      this.scene.scale.height * (this.mode === 'normal' ? this.config.focusY : 0.48)
    );
  }

  setMode(mode, focusFighter = null) {
    if (this.mode !== mode) this.modeTime = 0;
    this.mode = mode;
    this.focusFighter = focusFighter;
  }

  destroy() {
    this.target.destroy();
  }
}
