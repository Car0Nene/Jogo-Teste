import Phaser from 'phaser';

export class StageSystem {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.backgrounds = new Map();
  }

  create() {
    this.resize(this.scene.scale.width, this.scene.scale.height);
    this.createLayers();
    this.createArenaPlane();
    this.createGroundCollider();
    this.createAtmosphere();
    return this.scene.stageData;
  }

  resize(width, height) {
    const worldWidth = width * this.stage.camera.worldWidthMultiplier;
    const groundY = height * this.stage.groundYRatio;
    const horizontalBounds = {
      left: worldWidth * this.stage.horizontalBounds.left,
      right: worldWidth * this.stage.horizontalBounds.right
    };

    this.scene.stageData = {
      ...this.stage,
      width,
      height,
      worldWidth,
      groundY,
      horizontalBounds
    };
    this.scene.physics.world.setBounds(
      horizontalBounds.left,
      0,
      horizontalBounds.right - horizontalBounds.left,
      height
    );

    if (this.backgrounds.size) this.resizeLayers();
    if (this.arenaPlane) this.drawArenaPlane();
    if (this.ground) this.positionGround();
    if (this.atmosphere) this.drawAtmosphere();
    if (this.fallback) this.drawFallback();
  }

  createLayers() {
    for (const layer of this.stage.layers) {
      if (this.scene.textures.exists(layer.textureKey)) {
        const background = this.scene.add.image(0, 0, layer.textureKey);
        background.setDepth(layer.depth);
        background.setScrollFactor(layer.parallax);
        this.backgrounds.set(layer.id, background);
        if (!this.scene.background) this.scene.background = background;
      } else {
        if (!this.backgrounds.size) this.createFallback(layer.depth);
      }
    }

    if (![...this.backgrounds.values()].length && !this.fallback) this.createFallback();
    this.resizeLayers();
  }

  resizeLayers() {
    const { worldWidth, height } = this.scene.stageData;
    for (const layer of this.stage.layers) {
      const background = this.backgrounds.get(layer.id);
      if (!background) continue;
      const fit = Math.max(worldWidth / background.width, height / background.height);
      background.setPosition(worldWidth / 2, height / 2).setScale(fit);
    }
  }

  createFallback(depth = -20) {
    const graphics = this.scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.fallback = graphics;
    this.scene.background = graphics;
    this.fallbackTitle = this.scene.add.text(0, 0, this.stage.name.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fff3d4'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);
    this.drawFallback();
  }

  drawFallback() {
    const graphics = this.fallback;
    if (!graphics) return;
    const { width, height } = this.scene.stageData;
    const isBeach = this.stage.id === 'praia';
    const skyTop = isBeach ? 0x28a9df : 0x1688ae;
    const skyBottom = isBeach ? 0x174d87 : 0x22234e;
    graphics.clear();
    graphics.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(isBeach ? 0x2296b2 : 0x1a5b48, 1);
    graphics.fillRect(0, height * 0.38, width, height * 0.48);
    graphics.fillStyle(isBeach ? 0xd4ad63 : 0x402c35, 1);
    graphics.fillRect(0, height * 0.62, width, height * 0.25);
    this.fallbackTitle.setPosition(width / 2, height * 0.235);
  }

  createArenaPlane() {
    this.arenaPlane = this.scene.add.graphics().setDepth(-10);
    this.drawArenaPlane();
  }

  drawArenaPlane() {
    const { worldWidth, height } = this.scene.stageData;
    const { backYRatio, frontYRatio } = this.stage.depth;
    const plane = this.arenaPlane;
    plane.clear();
    plane.fillStyle(this.stage.plane.color, this.stage.plane.alpha);
    plane.beginPath();
    plane.moveTo(0, height * backYRatio);
    plane.lineTo(worldWidth, height * backYRatio);
    plane.lineTo(worldWidth, height * frontYRatio);
    plane.lineTo(0, height * frontYRatio);
    plane.closePath();
    plane.fillPath();
  }

  createGroundCollider() {
    this.ground = this.scene.add.rectangle(0, 0, 1, 24, 0x4b3944, 0);
    this.scene.physics.add.existing(this.ground, true);
    this.ground.setVisible(false);
    this.positionGround();
  }

  positionGround() {
    const { worldWidth, groundY } = this.scene.stageData;
    this.ground.setPosition(worldWidth / 2, groundY + 12);
    this.ground.setSize(worldWidth + 100, 24);
    this.ground.body.updateFromGameObject();
  }

  createAtmosphere() {
    if (!this.stage.atmosphere) return;
    this.atmosphere = this.scene.add.graphics().setDepth(-8);
    this.drawAtmosphere();
  }

  drawAtmosphere() {
    const atmosphere = this.atmosphere;
    if (!atmosphere || !this.stage.atmosphere) return;
    const { worldWidth, height } = this.scene.stageData;
    const config = this.stage.atmosphere;
    atmosphere.clear();
    atmosphere.fillStyle(config.color, config.alpha);
    atmosphere.fillCircle(worldWidth / 2, height * 0.48, worldWidth * 0.18);
    atmosphere.fillStyle(config.dustColor, 0.26);
    for (let i = 0; i < config.dustCount; i++) {
      const x = worldWidth * (0.08 + ((i * 37) % 83) / 100);
      const y = height * (0.28 + ((i * 19) % 52) / 100);
      atmosphere.fillCircle(x, y, i % 3 === 0 ? 1.6 : 1);
    }
  }

  projectDepth(depthPosition) {
    const { height } = this.scene.stageData;
    const { min, max, backYRatio, frontYRatio } = this.stage.depth;
    const normalized = Phaser.Math.Clamp((depthPosition - min) / (max - min), 0, 1);
    return height * Phaser.Math.Linear(backYRatio, frontYRatio, normalized);
  }

  scaleAtDepth(depthPosition) {
    const { min, max, scaleRange } = this.stage.depth;
    const normalized = Phaser.Math.Clamp((depthPosition - min) / (max - min), 0, 1);
    return Phaser.Math.Linear(scaleRange[0], scaleRange[1], normalized);
  }
}
