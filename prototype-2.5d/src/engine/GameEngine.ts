import * as THREE from 'three';
import { DesktopProfile, FightFraming, platform } from '../platform/platform';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  FIGHTERS,
  FIGHTER_BARKS,
  FighterId,
  FORMS,
  FormId,
  MoveSpec,
  pickIntroDialogue,
} from '../data/fighters';
import {
  DEFAULT_KEY_BINDINGS,
  GraphicsQuality,
  Player1KeyBindings,
  ResolutionScale,
} from '../data/settings';
import { STAGES, StageId } from '../data/stages';
import { STAGE_MUSIC, soundEngine } from './audio';
import { diagnostics } from './diagnostics';
import { getInitialAtlasTier } from './graphicsProfile';
import {
  AnimState,
  CharacterRig,
  animateCharacterRig,
  applyRigFormAndFlash,
  applyStageLightingToRig,
  buildCharacterRig,
} from './characterBuilder';
import { createContactShadowTexture } from './proceduralTextures';
import {
  ProjectileKind,
  buildBurstMesh,
  buildCameoMesh,
  buildProjectileMesh,
  setProjectileFacing,
  updateCameoVisual,
} from './propsBuilder';
import { BuiltStage, buildStage } from './stageBuilder';

export type ScreenMode = 'title' | 'select' | 'fight';
export type GameMode = 'cpu' | 'versus' | 'training';
export type CpuDifficulty = 'easy' | 'normal' | 'hard';

export interface HudFighterSnapshot {
  id: FighterId;
  name: string;
  hp: number;
  maxHp: number;
  trailHp: number;
  meter: number;
  form: FormId;
  formLabel: string;
  formTimeLeft: number;
  comboCount: number;
  roundsWon: number;
  bark: string | null;
}

export interface HudSnapshot {
  phase: 'intro' | 'banner' | 'fighting' | 'ko' | 'matchOver';
  bannerText: string;
  roundNumber: number;
  timer: number;
  winnerIndex: 0 | 1 | null;
  introLine: { speaker: 'p1' | 'p2'; name: string; text: string } | null;
  p1: HudFighterSnapshot;
  p2: HudFighterSnapshot;
}

interface FighterRuntime {
  index: 0 | 1;
  id: FighterId;
  rig: CharacterRig;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  trailHp: number;
  maxHp: number;
  meter: number;
  form: FormId;
  formTimer: number;
  nextCarlosForm: 'gordao' | 'crente';
  state: 'idle' | 'move' | 'crouch' | 'guard' | 'attack' | 'hitstun' | 'blockstun' | 'knockdown' | 'transform' | 'victory';
  stateTimer: number;
  activeMove: MoveSpec | null;
  activeMoveAnim?: string;
  moveElapsed: number;
  moveHitConnected: boolean;
  bufferedAttack: 'light' | 'medium' | 'heavy' | 'combo' | null;
  comboCount: number;
  comboResetTimer: number;
  roundsWon: number;
  bark: string | null;
  barkTimer: number;
  dogCooldown: number;
  slipTimer: number;
  hitInvuln: number;
  aiThinkTimer: number;
  aiAction: 'approach' | 'retreat' | 'guard' | 'idle';
  daviIdleTime: number;
  daviVoiceCooldown: number;
  daviSpecialCooldown: number;
}

interface ActiveProjectile {
  mesh: THREE.Group;
  kind: ProjectileKind;
  ownerIndex: 0 | 1;
  facing: 1 | -1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  knockdown: boolean;
  radius: number;
  life: number;
  gravity: number;
}

interface ActiveCameo {
  mesh: THREE.Group;
  kind: 'dog' | 'dada' | 'kid';
  ownerIndex: 0 | 1;
  x: number;
  vx: number;
  damage: number;
  hitDone: boolean;
  life: number;
  wetZoneX?: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const ARENA_HALF_W = 7.4;
const MAX_HP = 1000;

export class GameEngine {
  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private shadowTex: THREE.Texture;
  private currentStage: BuiltStage | null = null;
  private currentStageId: StageId = 'bar';

  private screenMode: ScreenMode = 'title';
  private gameMode: GameMode = 'cpu';
  private difficulty: CpuDifficulty = 'normal';
  private paused = false;

  private p1Id: FighterId = 'pedro';
  private p2Id: FighterId = 'paula';
  private fighters: [FighterRuntime, FighterRuntime] | null = null;

  private projectiles: ActiveProjectile[] = [];
  private cameos: ActiveCameo[] = [];
  private bursts: Array<{ mesh: THREE.Group; life: number; maxLife: number }> = [];
  private sparks: SparkParticle[] = [];
  private sparkGeo: THREE.SphereGeometry;
  private heartGeo: THREE.ShapeGeometry;

  private matchPhase: 'intro' | 'banner' | 'fighting' | 'ko' | 'matchOver' = 'intro';
  private phaseTimer = 0;
  private roundNumber = 1;
  private roundTimer = 99;
  private lastCountdownSec = 99;
  private bannerText = 'ROUND 1';
  private winnerIndex: 0 | 1 | null = null;

  private introQueue: Array<{ speaker: 'p1' | 'p2'; text: string }> = [];
  private introIndex = 0;
  private introLineTimer = 0;

  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeAmp = 0;
  private worldTime = 0;
  private lastTimestamp = 0;
  private frameId = 0;
  private disposed = false;

  // Material cache for sparks (avoid creating new materials each impact)
  private sparkMaterialCache = new Map<number, THREE.MeshBasicMaterial>();
  private heartMaterialCache = new Map<number, THREE.MeshBasicMaterial>();

  // === FIX FOR PROBLEM 6: Object pool for spark particles ===
  private sparkPool: SparkParticle[] = [];
  private sparkPoolSize = 200;

  private heldKeys = new Set<string>();
  private virtualHolds: [Set<string>, Set<string>] = [new Set(), new Set()];
  private keyBindings: Player1KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  private gamepadEnabled = true;
  private gamepadHolds = new Set<string>();
  private prevGamepadButtons: Record<string, boolean> = {};
  private graphicsQuality: GraphicsQuality = 'high';
  private resolutionScale: ResolutionScale = 1;
  private showcaseOrbit = false;
  private showcaseAngle = 0;

  // Apresentação por plataforma (js: src/platform). Só muda câmera e densidade de
  // pixels — física, hitboxes, dano e IA não leem estes valores.
  private readonly baseFov = 38;
  private framing: FightFraming = DesktopProfile.framing.landscape;
  private dprCap = 2;
  private maxPixels = 8.3e6;

  private onHudUpdate: (hud: HudSnapshot) => void;
  private hudEmitAccum = 0;

  // Reusable math helpers for zero GC in loop
  private readonly _camTarget = new THREE.Vector3();
  private readonly _camLook = new THREE.Vector3();

  constructor(container: HTMLElement, onHudUpdate: (hud: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.getEffectivePixelRatio());
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
    this.scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.2, 160);
    this.camera.position.set(0, 2.5, 11.2);

    this.hemiLight = new THREE.HemisphereLight(0x9ed8ff, 0x6b472d, 0.95);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff0d4, 2.3);
    this.keyLight.position.set(8, 13, 10);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -13;
    this.keyLight.shadow.camera.right = 13;
    this.keyLight.shadow.camera.top = 10;
    this.keyLight.shadow.camera.bottom = -4;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 34;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xffb86b, 0.9);
    this.rimLight.position.set(-6, 7, -8);
    this.scene.add(this.rimLight);

    this.shadowTex = createContactShadowTexture();
    this.sparkGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.13);
    heart.bezierCurveTo(-0.3, 0.06, -0.14, 0.23, 0, 0.1);
    heart.bezierCurveTo(0.14, 0.23, 0.3, 0.06, 0, -0.13);
    this.heartGeo = new THREE.ShapeGeometry(heart);

    this.loadStage('bar');
    this.spawnFighters('pedro', 'paula');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // === FIX FOR PROBLEM 6: Initialize spark pool early ===
    this.initSparkPool();

    this.bindEvents();
    this.lastTimestamp = performance.now();
    this.startLoop();
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const pixelRatio = this.getEffectivePixelRatio();
    if (Math.abs(this.renderer.getPixelRatio() - pixelRatio) > 0.01) {
      this.renderer.setPixelRatio(pixelRatio);
    }
    this.renderer.setSize(w, h);
    this.updateProjection();
  };

  /**
   * Na luta, a câmera centraliza os lutadores na ÁREA ÚTIL do perfil (entre o HUD em
   * cima e os controles embaixo), sem mudar a escala da imagem: o quadro é deslocado
   * com setViewOffset sobre uma imagem virtual mais alta. Nos menus, projeção normal.
   */
  private updateProjection() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const fr = this.screenMode === 'fight' ? this.framing : null;
    const shift = fr ? ((fr.top - fr.bottom) / 2) * h : 0;
    if (!fr || Math.abs(shift) < 0.5) {
      this.camera.clearViewOffset();
      this.camera.fov = this.baseFov;
      this.camera.aspect = w / h;
    } else {
      const fullH = h + 2 * Math.abs(shift);
      const tan = Math.tan(THREE.MathUtils.degToRad(this.baseFov * 0.5));
      this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((tan * fullH) / h));
      this.camera.aspect = w / fullH;
      // centro da área útil (h/2 + shift) cai no centro da imagem virtual
      this.camera.setViewOffset(w, fullH, 0, fullH / 2 - (h / 2 + shift), w, h);
    }
    this.camera.updateProjectionMatrix();
  }

  /** Perfil da plataforma: enquadramento da luta e limites de densidade de pixels. */
  public setPresentation(framing: FightFraming, quality: { dprCap: number; maxPixels: number }) {
    this.framing = framing;
    this.dprCap = quality.dprCap;
    this.maxPixels = quality.maxPixels;
    const ratio = this.getEffectivePixelRatio();
    if (Math.abs(this.renderer.getPixelRatio() - ratio) > 0.01) this.renderer.setPixelRatio(ratio);
    this.handleResize();
  }

  private getEffectivePixelRatio() {
    const baseDpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, this.dprCap);
    let ratio = this.isSoftwareGl
      ? Math.min(1, this.resolutionScale)
      : Math.max(0.65, Math.min(2.25, baseDpr * (this.graphicsQuality === 'low' ? 0.85 : 1) * this.resolutionScale));
    // limite de pixels físicos do canvas (monitores 4K/5K, celulares 3x)
    const w = Math.max(1, this.container?.clientWidth || innerWidth);
    const h = Math.max(1, this.container?.clientHeight || innerHeight);
    if (w * h * ratio * ratio > this.maxPixels) ratio = Math.max(0.65, Math.sqrt(this.maxPixels / (w * h)));
    return ratio;
  }

  /**
   * === FIX FOR PROBLEM 6: Initialize spark object pool ===
   * Pre-allocates meshes for spark particles to avoid allocation during impact
   */
  private initSparkPool() {
    for (let i = 0; i < this.sparkPoolSize; i++) {
      const isHeart = i % 10 === 0; // 10% hearts, 90% sparks
      const mesh = new THREE.Mesh(isHeart ? this.heartGeo : this.sparkGeo, this.getSparkMaterial(0xffffff, isHeart));
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkPool.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0,
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) &&
      this.screenMode === 'fight'
    ) {
      e.preventDefault();
    }
    const firstPress = !this.heldKeys.has(e.code);
    this.heldKeys.add(e.code);

    if (firstPress && this.screenMode === 'fight' && !this.paused) {
      this.handleEdgeAction(e.code);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = () => {
    this.heldKeys.clear();
    this.virtualHolds[0].clear();
    this.virtualHolds[1].clear();
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
  }

  public applyGraphicsSettings(quality: GraphicsQuality, resolutionScale: ResolutionScale) {
    this.graphicsQuality = quality;
    this.resolutionScale = resolutionScale;
    this.renderer.setPixelRatio(this.getEffectivePixelRatio());

    const shadowsOn = !this.isSoftwareGl && quality !== 'low';
    this.renderer.shadowMap.enabled = shadowsOn;
    this.keyLight.castShadow = shadowsOn;
    const mapSize = quality === 'high' ? 1024 : 512;
    if (this.keyLight.shadow.mapSize.x !== mapSize) {
      this.keyLight.shadow.mapSize.set(mapSize, mapSize);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }

    this.currentStage?.setParticlesEnabled(quality !== 'low');
    this.handleResize();
  }

  /**
   * === FIX FOR PROBLEM 4: Warm up HD textures on initial load ===
   * This ensures textures are loaded and compiled before combat starts
   */
  public warmUpHdAssets() {
    if (!this.fighters) return;
    // Pre-load all fighter atlases by accessing their textures
    for (const f of this.fighters) {
      // Force texture loads through the rig
      const atlasHd3Tex = f.rig.atlasHd3Tex;
      const atlasHd4Tex = f.rig.atlasHd4Tex;
      // Create dummy access to force loading
      if (atlasHd3Tex) {
        const _ = atlasHd3Tex.image;
      }
      if (atlasHd4Tex) {
        const _ = atlasHd4Tex.image;
      }
    }
  }

  public setKeyBindings(bindings: Player1KeyBindings) {
    this.keyBindings = { ...bindings };
  }

  public setGamepadEnabled(enabled: boolean) {
    this.gamepadEnabled = enabled;
    if (!enabled) {
      this.gamepadHolds.clear();
      this.prevGamepadButtons = {};
    }
  }

  public setScreenMode(mode: ScreenMode) {
    this.screenMode = mode;
    this.updateProjection();
    this.paused = false;
    this.clearEntities();
    soundEngine.stopAllVoices();
    if (this.currentStage) {
      this.currentStage.backdrop.position.x = 0;
    }
    if (mode === 'title') {
      this.showcaseOrbit = false;
      this.resetFighterPositions();
      soundEngine.startMusic('theme', 1);
    } else if (mode === 'select') {
      this.resetFighterPositions();
      soundEngine.startMusic('theme', 1);
    }
  }

  public setShowcaseOrbit(enabled: boolean) {
    this.showcaseOrbit = enabled;
    if (!enabled) this.showcaseAngle = 0;
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    soundEngine.pauseMusic(paused);
    if (paused) this.handleBlur();
  }

  public setStage(stageId: StageId) {
    if (this.currentStageId === stageId && this.currentStage) return;
    this.loadStage(stageId);
  }

  public setFighters(p1: FighterId, p2: FighterId) {
    if (this.p1Id === p1 && this.p2Id === p2 && this.fighters) return;
    this.p1Id = p1;
    this.p2Id = p2;
    this.spawnFighters(p1, p2);
  }

  private playIntroVoice(speakerSlot: 'p1' | 'p2') {
    if (!this.fighters) return;
    const f = speakerSlot === 'p1' ? this.fighters[0] : this.fighters[1];
    if (this.fighters.some((fighter) => fighter.id === 'davi') && f.id !== 'davi') return;
    if (f.id === 'davi' && this.introQueue[this.introIndex]?.text !== 'Vamos jogar videogame.') return;
    const introClips: Partial<Record<FighterId, string[]>> = {
      franciely: ['ferrinho', 'montar', 'desarma', 'isso'],
      daniel: ['preparativos', 'praia'],
      tainara: ['danielTrabalhar', 'trabalho'],
      pedro: ['combo', 'drink'],
      juraci: ['cozinha'],
      carlos: ['pizzaAmor'],
      gabi: ['sing'],
      paula: ['lunch'],
      davi: ['videogame'],
    };
    const list = introClips[f.id];
    if (list && list.length) {
      soundEngine.playClip(f.id, list[Math.floor(Math.random() * list.length)], 1200);
    }
  }

  public startMatch(
    p1: FighterId,
    p2: FighterId,
    stageId: StageId,
    mode: GameMode,
    difficulty: CpuDifficulty
  ) {
    this.gameMode = mode;
    this.difficulty = difficulty;
    this.loadStage(stageId);
    this.spawnFighters(p1, p2);
    this.clearEntities();
    soundEngine.stopAllVoices();
    soundEngine.startMusic(STAGE_MUSIC[stageId] ?? 'theme', 0.58);
    
    // === FIX FOR PROBLEM 3: Pre-load combat audio before fight starts ===
    soundEngine.preloadCombatAudio();
    
    this.screenMode = 'fight';
    this.updateProjection();
    this.paused = false;
    this.roundNumber = 1;
    this.winnerIndex = null;

    if (this.fighters) {
      this.fighters[0].roundsWon = 0;
      this.fighters[1].roundsWon = 0;
    }

    if (mode === 'training') {
      this.introQueue = [];
      this.beginRound(false);
    } else {
      this.introQueue = pickIntroDialogue(p1, p2);
      this.introIndex = 0;
      this.introLineTimer = 2.2;
      this.matchPhase = 'intro';
      this.phaseTimer = 0;
      if (this.introQueue[0]) this.playIntroVoice(this.introQueue[0].speaker);
      this.emitHud();
    }
  }

  public skipIntro() {
    if (this.screenMode === 'fight' && this.matchPhase === 'intro') {
      soundEngine.stopAllVoices();
      this.introQueue = [];
      this.beginRound(true);
    }
  }

  public triggerVirtualHold(playerIndex: 0 | 1, action: string, active: boolean) {
    if (active) this.virtualHolds[playerIndex].add(action);
    else this.virtualHolds[playerIndex].delete(action);
  }

  public triggerVirtualPress(playerIndex: 0 | 1, action: 'light' | 'heavy' | 'special' | 'subSpecial' | 'jump') {
    if (this.screenMode !== 'fight' || this.paused) return;
    if (this.matchPhase === 'intro') {
      this.skipIntro();
      return;
    }
    if (this.matchPhase !== 'fighting' || !this.fighters) return;
    const f = this.fighters[playerIndex];
    if (action === 'jump') {
      this.tryJump(f);
    } else if (action === 'special') {
      this.trySpecial(f, false);
    } else if (action === 'subSpecial') {
      this.trySpecial(f, true);
    } else {
      this.tryAttack(f, action);
    }
  }

  private loadStage(stageId: StageId) {
    if (this.currentStage) {
      this.scene.remove(this.currentStage.group);
      this.currentStage.dispose();
    }
    this.currentStageId = stageId;
    this.currentStage = buildStage(stageId, this.maxAnisotropy);
    this.currentStage.setParticlesEnabled(this.graphicsQuality !== 'low');
    this.scene.add(this.currentStage.group);

    const spec = STAGES[stageId];
    this.scene.fog = new THREE.FogExp2(spec.fogColor, spec.fogDensity);
    this.keyLight.color.setHex(spec.keyColor);
    this.keyLight.intensity = spec.keyIntensity;
    this.keyLight.position.set(spec.keyPos[0], spec.keyPos[1], spec.keyPos[2]);
    this.hemiLight.color.setHex(spec.hemiSky);
    this.hemiLight.groundColor.setHex(spec.hemiGround);
    this.hemiLight.intensity = spec.hemiIntensity;
    this.rimLight.color.setHex(spec.rimColor);
    this.rimLight.intensity = spec.rimIntensity;

    if (this.fighters) {
      applyStageLightingToRig(this.fighters[0].rig, stageId);
      applyStageLightingToRig(this.fighters[1].rig, stageId);
    }
  }

  private spawnFighters(p1: FighterId, p2: FighterId) {
    if (this.fighters) {
      this.scene.remove(this.fighters[0].rig.root);
      this.scene.remove(this.fighters[1].rig.root);
    }
    
    // === FIX FOR PROBLEM 4: Use quality-aware initial atlas tier ===
    const initialAtlasTier = getInitialAtlasTier(this.graphicsQuality, this.isSoftwareGl);
    
    const r1 = buildCharacterRig(p1, this.maxAnisotropy, this.shadowTex, initialAtlasTier);
    const r2 = buildCharacterRig(p2, this.maxAnisotropy, this.shadowTex, initialAtlasTier);
    applyStageLightingToRig(r1, this.currentStageId);
    applyStageLightingToRig(r2, this.currentStageId);
    this.scene.add(r1.root);
    this.scene.add(r2.root);

    this.fighters = [
      this.makeRuntime(0, p1, r1, -2.2, 1),
      this.makeRuntime(1, p2, r2, 2.2, -1),
    ];
    this.syncFighterTransforms();
  }

  private makeRuntime(
    index: 0 | 1,
    id: FighterId,
    rig: CharacterRig,
    x: number,
    facing: 1 | -1
  ): FighterRuntime {
    return {
      index,
      id,
      rig,
      x,
      y: 0,
      vx: 0,
      vy: 0,
      facing,
      hp: MAX_HP,
      trailHp: MAX_HP,
      maxHp: MAX_HP,
      meter: 50,
      form: 'normal',
      formTimer: 0,
      nextCarlosForm: 'gordao',
      state: 'idle',
      stateTimer: 0,
      activeMove: null,
      activeMoveAnim: undefined,
      moveElapsed: 0,
      moveHitConnected: false,
      bufferedAttack: null,
      comboCount: 0,
      comboResetTimer: 0,
      roundsWon: 0,
      bark: null,
      barkTimer: 0,
      dogCooldown: id === 'daniel' ? 7 : Infinity,
      slipTimer: 0,
      hitInvuln: 0,
      aiThinkTimer: 0.2,
      aiAction: 'approach',
      daviIdleTime: 0,
      daviVoiceCooldown: 0,
      daviSpecialCooldown: 0,
    };
  }

  private resetFighterPositions() {
    if (!this.fighters) return;
    const [f1, f2] = this.fighters;
    for (const f of [f1, f2]) {
      f.x = f.index === 0 ? -2.2 : 2.2;
      f.y = 0;
      f.vx = 0;
      f.vy = 0;
      f.facing = f.index === 0 ? 1 : -1;
      f.hp = MAX_HP;
      f.trailHp = MAX_HP;
      f.meter = 50;
      f.form = 'normal';
      f.formTimer = 0;
      f.state = 'idle';
      f.stateTimer = 0;
      f.activeMove = null;
      f.activeMoveAnim = undefined;
      f.bufferedAttack = null;
      f.comboCount = 0;
      f.bark = null;
      f.barkTimer = 0;
      f.slipTimer = 0;
      f.hitInvuln = 0;
      f.daviIdleTime = 0;
      f.daviVoiceCooldown = 0;
      f.daviSpecialCooldown = 0;
    }
    this.syncFighterTransforms();
  }

  private beginRound(showBanner: boolean) {
    this.clearEntities();
    if (!this.fighters) return;

    // === FIX FOR PROBLEM 4: Warm up HD textures at round start ===
    if (this.roundNumber === 1 && this.graphicsQuality !== 'low') {
      this.warmUpHdAssets();
    }

    for (const f of this.fighters) {
      f.x = f.index === 0 ? -2.4 : 2.4;
      f.y = 0;
      f.vx = 0;
      f.vy = 0;
      f.facing = f.index === 0 ? 1 : -1;
      f.hp = MAX_HP;
      f.trailHp = MAX_HP;
      f.meter = Math.max(f.meter, 50);
      f.form = 'normal';
      f.formTimer = 0;
      f.state = 'idle';
      f.stateTimer = 0;
      f.activeMove = null;
      f.activeMoveAnim = undefined;
      f.comboCount = 0;
      f.bark = null;
      f.daviIdleTime = 0;
      f.daviVoiceCooldown = 0;
      f.daviSpecialCooldown = 0;
    }
    this.roundTimer = 99;
    this.lastCountdownSec = 99;
    if (showBanner) {
      this.matchPhase = 'banner';
      this.bannerText = this.roundNumber >= 3 ? 'FINAL ROUND!' : `ROUND ${this.roundNumber}`;
      this.phaseTimer = 1.45;
      soundEngine.playRoundBell();
      soundEngine.playAnnouncer(
        this.roundNumber >= 3 ? 'final_round' : (`round_${this.roundNumber}` as 'round_1' | 'round_2')
      );
    } else {
      this.matchPhase = 'fighting';
      this.bannerText = 'TREINO LIVRE';
      this.phaseTimer = 0;
    }
    this.emitHud();
  }

  private clearEntities() {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      this.disposeMesh(p.mesh);
    }
    this.projectiles = [];
    for (const c of this.cameos) {
      this.scene.remove(c.mesh);
      this.disposeMesh(c.mesh);
    }
    this.cameos = [];
    for (const b of this.bursts) {
      this.scene.remove(b.mesh);
      this.disposeMesh(b.mesh);
    }
    this.bursts = [];
    
    // === FIX FOR PROBLEM 6: Return sparks to pool instead of disposing ===
    for (const s of this.sparks) {
      s.mesh.visible = false;
      this.sparkPool.push(s);
    }
    this.sparks = [];
  }

  private syncFighterTransforms() {
    if (!this.fighters) return;
    for (const f of this.fighters) {
      f.rig.root.position.set(f.x, f.y, 0);
    }
  }

  private isHeld(playerIndex: 0 | 1, action: 'left' | 'right' | 'up' | 'down' | 'guard'): boolean {
    if (this.virtualHolds[playerIndex].has(action)) return true;

    if (playerIndex === 0) {
      if (this.gamepadHolds.has(action)) return true;
      const soloOrP1 = this.gameMode !== 'versus';
      const kb = this.keyBindings;
      switch (action) {
        case 'left':
          return this.heldKeys.has(kb.left) || (soloOrP1 && this.heldKeys.has('ArrowLeft'));
        case 'right':
          return this.heldKeys.has(kb.right) || (soloOrP1 && this.heldKeys.has('ArrowRight'));
        case 'up':
          return (
            this.heldKeys.has(kb.up) ||
            this.heldKeys.has('Space') ||
            (soloOrP1 && this.heldKeys.has('ArrowUp'))
          );
        case 'down':
          return this.heldKeys.has(kb.down) || (soloOrP1 && this.heldKeys.has('ArrowDown'));
        case 'guard':
          return this.heldKeys.has(kb.guard) || (soloOrP1 && this.heldKeys.has('KeyH'));
      }
    } else if (this.gameMode === 'versus') {
      switch (action) {
        case 'left':
          return this.heldKeys.has('ArrowLeft');
        case 'right':
          return this.heldKeys.has('ArrowRight');
        case 'up':
          return this.heldKeys.has('ArrowUp');
        case 'down':
          return this.heldKeys.has('ArrowDown');
        case 'guard':
          return this.heldKeys.has('KeyO') || this.heldKeys.has('Numpad4');
      }
    }
    return false;
  }

  private handleEdgeAction(code: string) {
    if (this.matchPhase === 'intro') {
      if (code === 'Space' || code === 'Enter' || code === this.keyBindings.light) {
        this.skipIntro();
      }
      return;
    }
    if (this.matchPhase !== 'fighting' || !this.fighters) return;

    const p1 = this.fighters[0];
    const p2 = this.fighters[1];
    const solo = this.gameMode !== 'versus';
    const kb = this.keyBindings;

    if (code === kb.up || code === 'Space' || (solo && code === 'ArrowUp')) {
      this.tryJump(p1);
    } else if (code === kb.light || (solo && code === 'KeyF')) {
      this.tryAttack(p1, 'light');
    } else if (code === kb.heavy || (solo && code === 'KeyG')) {
      this.tryAttack(p1, 'heavy');
    } else if (code === kb.special || (solo && code === 'KeyT')) {
      this.trySpecial(p1, this.isHeld(0, 'down'));
    }

    if (this.gameMode === 'versus') {
      if (code === 'ArrowUp') this.tryJump(p2);
      else if (code === 'KeyU' || code === 'Numpad1') this.tryAttack(p2, 'light');
      else if (code === 'KeyP' || code === 'Numpad2') this.tryAttack(p2, 'heavy');
      else if (code === 'Numpad3' || code === 'Slash') this.trySpecial(p2, this.isHeld(1, 'down'));
    }
  }

  private tryJump(f: FighterRuntime) {
    if (f.y > 0.02) return;
    if (['hitstun', 'blockstun', 'knockdown', 'transform', 'victory'].includes(f.state)) return;
    if (f.state === 'attack' || f.daviSpecialCooldown > 0) return;
    const spec = FIGHTERS[f.id];
    f.vy = spec.jumpVel;
    f.vx = (this.isHeld(f.index, 'right') ? 1 : this.isHeld(f.index, 'left') ? -1 : 0) * spec.walkSpeed * 0.92;
    soundEngine.playJump();
  }

  private tryAttack(f: FighterRuntime, btn: 'light' | 'heavy') {
    if (['hitstun', 'blockstun', 'knockdown', 'transform', 'victory'].includes(f.state)) return;
    const spec = FIGHTERS[f.id];

    // Combo chain buffering during an active/recovery attack!
    if (f.state === 'attack' && f.activeMove) {
      if (f.moveHitConnected && f.activeMove.chainTo) {
        if (btn === 'light' && f.activeMove.chainTo === 'medium') {
          f.bufferedAttack = 'medium';
        } else if (btn === 'heavy' && (f.activeMove.chainTo === 'heavy' || f.activeMove.chainTo === 'combo')) {
          f.bufferedAttack = f.activeMove.chainTo;
        }
      }
      return;
    }

    if (f.y > 0.08) {
      this.startAttackMove(f, spec.moves.air);
    } else {
      this.startAttackMove(f, btn === 'light' ? spec.moves.light : spec.moves.heavy);
    }
  }

  private startAttackMove(f: FighterRuntime, move: MoveSpec) {
    f.state = 'attack';
    f.stateTimer = 0;
    f.activeMove = move;
    f.activeMoveAnim = undefined;
    f.moveElapsed = 0;
    f.moveHitConnected = false;
    f.bufferedAttack = null;
    if (move.lunge) {
      f.vx = f.facing * move.lunge;
    }
    soundEngine.playSwing(Boolean(move.heavy));
  }

  private setBark(f: FighterRuntime, category: 'special' | 'subSpecial' | 'win') {
    const lines = FIGHTER_BARKS[f.id][category];
    if (!lines || !lines.length) return;
    f.bark = lines[Math.floor(Math.random() * lines.length)];
    f.barkTimer = 2.1;
  }

  private trySpecial(f: FighterRuntime, isSub: boolean) {
    if (['hitstun', 'blockstun', 'knockdown', 'transform', 'victory'].includes(f.state)) return;
    if (f.y > 0.08) return;

    if (f.id === 'davi') {
      if (f.state === 'attack') return;
      const cost = isSub ? 50 : 100;
      if (f.meter < cost) return;
      f.meter -= cost;
      f.daviSpecialCooldown = 1.2;
      if (isSub) {
        soundEngine.playDaviSpecial('purple');
        this.activateTransform(f, 'daviPurple', 10);
        this.setBark(f, 'subSpecial');
        soundEngine.playClip('davi', 'preguica', 2500);
      } else {
        const finisher = f.form === 'daviPurple';
        soundEngine.playDaviSpecial(finisher ? 'final' : 'hearts');
        if (!finisher) {
          f.form = 'daviPurple';
          f.formTimer = 8;
        }
        if (finisher) {
          f.bark = 'Vamos jogar videogame.';
          f.barkTimer = 2.1;
        } else {
          this.setBark(f, 'special');
        }
        soundEngine.playClip('davi', finisher ? 'videogame' : 'outra', 2500);
        this.spawnSparks(f.x, f.y + 1.1, finisher ? 0x22c55e : 0xec4899, 20, !finisher);
        if (finisher) {
          this.spawnSparks(f.x, f.y + 1.1, 0xffffff, 8);
          this.spawnSparks(f.x, f.y + 1.1, 0xa855f7, 8);
        }
        this.startAttackMove(f, {
          id: 'special', label: finisher ? 'Paixão Alviverde' : 'Super Namorador',
          startup: 0.3, active: 0.2, recovery: 0.45,
          damage: finisher ? 145 : 115, minRange: 0, range: 2.7,
          hitstun: 0.45, blockstun: 0.25, push: 4.5, hitstop: 0.1,
          lunge: finisher ? 3 : 1.5, heavy: true, knockdown: true,
        });
        f.activeMoveAnim = 'special';
      }
      this.emitHud();
      return;
    }

    const cost = isSub ? 50 : 100;
    const actualSub = isSub || f.meter < 100;
    if (f.meter < (actualSub ? 50 : cost)) return;

    f.meter = Math.max(0, f.meter - (actualSub ? 50 : 100));
    soundEngine.playSpecial();
    let moveAnim: string | undefined;

    if (f.id === 'juraci') {
      moveAnim = 'special';
      if (!actualSub) {
        this.setBark(f, 'special');
        soundEngine.playClip('juraci', 'cozinha');
        this.spawnProjectile('cake', f, 10.5, 0, 155, true, 0.44, 0);
      } else {
        this.setBark(f, 'subSpecial');
        soundEngine.playClip('franciely', 'isso');
        this.spawnCameo('dada', f);
      }
    } else if (f.id === 'carlos') {
      if (!actualSub) {
        const next = f.nextCarlosForm;
        f.nextCarlosForm = next === 'gordao' ? 'crente' : 'gordao';
        this.activateTransform(f, next, 10);
        if (next === 'crente') soundEngine.playBless();
        else soundEngine.playClip('carlos', 'pizzaAmor');
        this.setBark(f, 'special');
      } else {
        moveAnim = 'special';
        this.setBark(f, 'subSpecial');
        soundEngine.playClip('carlos', 'pizzaAmor');
        this.spawnProjectile('notes', f, 9.0, 0, 85, false, 0.4, 0);
      }
    } else if (f.id === 'pedro') {
      if (!actualSub) {
        if (f.form === 'hulk') {
          moveAnim = 'hulkBlast';
          this.setBark(f, 'special');
          soundEngine.playClip('pedro', 'fumaBebe');
          this.spawnProjectile('beerBlast', f, 11.5, 0, 130, true, 0.46, 0);
        } else {
          this.activateTransform(f, 'hulk', 10);
          soundEngine.playClip('pedro', 'drink');
          this.setBark(f, 'special');
        }
      } else {
        moveAnim = 'smoke';
        this.setBark(f, 'subSpecial');
        soundEngine.playClip('pedro', 'combo');
        this.spawnProjectile('smoke', f, 6.2, 0, 75, false, 0.46, 0);
      }
    } else if (f.id === 'daniel') {
      if (!actualSub) {
        this.activateTransform(f, 'praia', 10);
        soundEngine.playClip('daniel', 'praia');
        this.setBark(f, 'special');
        this.spawnCameo('dog', f);
      } else {
        moveAnim = 'dance';
        soundEngine.playClip('daniel', 'preparativos');
        this.setBark(f, 'subSpecial');
        this.spawnProjectile('notes', f, 9.6, 0, 78, false, 0.38, 0);
      }
    } else if (f.id === 'franciely') {
      if (!actualSub) {
        this.activateTransform(f, 'brava', 10);
        soundEngine.playClip('franciely', 'cuidar');
        this.setBark(f, 'special');
      } else {
        moveAnim = 'mama';
        soundEngine.playClip('franciely', 'ferrinho');
        this.setBark(f, 'subSpecial');
        this.spawnProjectile('milk', f, 11.8, 0, 82, false, 0.38, 0);
      }
    } else if (f.id === 'gabi') {
      moveAnim = 'dance';
      if (!actualSub) {
        this.setBark(f, 'special');
        soundEngine.playClip('gabi', 'amor');
        this.spawnProjectile('superL', f, 10.2, 0, 125, true, 0.48, 0);
        const opp = this.fighters?.[f.index === 0 ? 1 : 0];
        const targetX = opp ? opp.x : f.x + f.facing * 3.5;
        for (let i = 0; i < 4; i++) {
          this.spawnProjectile(
            'brigadeiro',
            f,
            0,
            -5.5,
            42,
            false,
            0.34,
            10,
            targetX + (i - 1.5) * 0.9,
            5.2 + i * 0.7
          );
        }
      } else {
        this.setBark(f, 'subSpecial');
        soundEngine.playClip('gabi', 'sing');
        this.spawnProjectile('notes', f, 9.5, 0, 80, false, 0.4, 0);
      }
    } else if (f.id === 'paula') {
      if (!actualSub) {
        moveAnim = 'special';
        this.setBark(f, 'special');
        soundEngine.playClip('paula', 'lunch');
        for (let i = 0; i < 3; i++) {
          this.spawnProjectile(
            'food',
            f,
            9.5 + i * 1.4,
            1.8 + i * 0.7,
            58,
            i === 2,
            0.38,
            8.5,
            f.x + f.facing * 0.7,
            1.1 + i * 0.25
          );
        }
      } else {
        this.activateTransform(f, 'paulaFury', 9.5);
        soundEngine.playClip('paula', 'bar');
        this.setBark(f, 'subSpecial');
      }
    } else if (f.id === 'tainara') {
      if (!actualSub) {
        this.activateTransform(f, 'ricePower', 10);
        soundEngine.playClip('tainara', 'arroz');
        this.setBark(f, 'special');
      } else {
        moveAnim = 'special';
        soundEngine.playClip('tainara', 'cuidado');
        this.setBark(f, 'subSpecial');
        this.spawnCameo('kid', f);
      }
    }

    if (f.state !== 'transform') {
      f.state = 'attack';
      f.stateTimer = 0;
      f.activeMoveAnim = moveAnim;
      f.activeMove = {
        id: 'special',
        label: 'Especial',
        startup: 0.16,
        active: 0.08,
        recovery: 0.28,
        damage: 0,
        minRange: 0,
        range: 0,
        hitstun: 0,
        blockstun: 0,
        push: 0,
        hitstop: 0,
      };
      f.moveElapsed = 0;
      f.moveHitConnected = true;
    }
  }

  private activateTransform(f: FighterRuntime, form: FormId, duration: number) {
    f.form = form;
    f.formTimer = duration;
    f.state = 'transform';
    f.stateTimer = 0;
    f.activeMove = null;
    f.activeMoveAnim = undefined;
    soundEngine.playTransform();
    this.spawnSparks(f.x, f.y + 1.1, FORMS[form].auraHex, 16);
  }

  private spawnProjectile(
    kind: ProjectileKind,
    owner: FighterRuntime,
    speedX: number,
    vy: number,
    damage: number,
    knockdown: boolean,
    radius: number,
    gravity: number,
    overrideX?: number,
    overrideY?: number
  ) {
    const mesh = buildProjectileMesh(kind);
    setProjectileFacing(mesh, owner.facing);
    const startX = overrideX ?? owner.x + owner.facing * 0.85;
    const startY = overrideY ?? owner.y + 1.15;
    mesh.position.set(startX, startY, 0.08);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      kind,
      ownerIndex: owner.index,
      facing: owner.facing,
      x: startX,
      y: startY,
      vx: speedX === 0 ? 0 : owner.facing * speedX,
      vy,
      damage,
      knockdown,
      radius,
      life: 2.3,
      gravity,
    });
  }

  private spawnCameo(kind: 'dog' | 'dada' | 'kid', owner: FighterRuntime) {
    const mesh = buildCameoMesh(kind, this.shadowTex);
    const startX = Math.max(-ARENA_HALF_W, Math.min(ARENA_HALF_W, owner.x - owner.facing * 2.2));
    mesh.position.set(startX, 0, kind === 'kid' ? 0.35 : 0.18);
    updateCameoVisual(mesh, kind === 'dog' ? 'dog_run' : kind, owner.facing);
    this.scene.add(mesh);

    if (kind === 'dog') {
      soundEngine.playClip('cao', Math.random() < 0.5 ? 'protect' : 'lick');
    } else if (kind === 'dada') {
      soundEngine.playClip('dada', 'reply');
    }

    this.cameos.push({
      mesh,
      kind,
      ownerIndex: owner.index,
      x: startX,
      vx: owner.facing * (kind === 'dog' ? 8.2 : kind === 'kid' ? 7.0 : 5.4),
      damage: kind === 'dog' ? 75 : kind === 'kid' ? 95 : 80,
      hitDone: false,
      life: 1.9,
      wetZoneX: kind === 'dada' ? owner.x + owner.facing * 2.6 : undefined,
    });
  }

  /**
   * Get or create a cached material for sparks
   * Avoids creating new materials on every hit
   */
  private getSparkMaterial(colorHex: number, isHeart: boolean): THREE.MeshBasicMaterial {
    const cache = isHeart ? this.heartMaterialCache : this.sparkMaterialCache;
    let mat = cache.get(colorHex);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: isHeart ? THREE.DoubleSide : THREE.FrontSide,
      });
      cache.set(colorHex, mat);
    }
    return mat;
  }

  private spawnBurst(x: number, y: number) {
    const mesh = buildBurstMesh();
    mesh.position.set(x, y, 0.25);
    this.scene.add(mesh);
    this.bursts.push({ mesh, life: 0.24, maxLife: 0.24 });
  }

  private spawnSparks(x: number, y: number, colorHex: number, count = 10, hearts = false) {
    const mat = this.getSparkMaterial(colorHex, hearts);
    
    // === FIX FOR PROBLEM 6: Use spark object pool instead of allocating ===
    for (let i = 0; i < count; i++) {
      let spark = this.sparkPool.pop();
      
      // If pool exhausted, create new (shouldn't happen with 200 pool size)
      if (!spark) {
        const m = new THREE.Mesh(hearts ? this.heartGeo : this.sparkGeo, mat);
        this.scene.add(m);
        spark = {
          mesh: m,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 0,
          maxLife: 0,
        };
      }

      // Reset and initialize spark
      spark.mesh.material = mat;
      spark.mesh.position.set(x, y, (Math.random() - 0.5) * 0.4);
      spark.mesh.visible = true;
      
      const a = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.2;
      spark.vx = Math.cos(a) * spd;
      spark.vy = Math.sin(a) * spd + 1.5;
      spark.vz = (Math.random() - 0.5) * 2.5;
      spark.life = 0.36 + Math.random() * 0.18;
      spark.maxLife = 0.5;
      
      this.sparks.push(spark);
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      diagnostics.markFrameStart();

      const now = performance.now();
      const rawDt = Math.max(0, (now - this.lastTimestamp) / 1000);
      this.lastTimestamp = now;
      const dt = Math.min(rawDt, 0.05);

      this.step(dt);
      diagnostics.markLogicEnd();

      this.renderer.render(this.scene, this.camera);
      diagnostics.markRenderEnd();

      // Record diagnostic snapshot
      diagnostics.recordSnapshot({
        activeEffects: this.bursts.length + this.sparks.length,
        activeSparks: this.sparks.length,
        activeBursts: this.bursts.length,
        activeVoices: soundEngine.getActiveVoiceCount?.() || 0,
        activeProjectiles: this.projectiles.length,
        memoryMb: ((performance as any).memory?.usedJSHeapSize || 0) / 1048576,
        texturesCount: 0, // TODO: count from cache
        materialsCount: 0, // TODO: count from cache
        meshesCount: this.scene.children.length,
        combatHitCount: this.fighters ? (this.fighters[0]?.comboCount || 0) + (this.fighters[1]?.comboCount || 0) : 0,
        hitstopTimer: this.hitstopTimer,
      });

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private pollGamepadInput() {
    this.gamepadHolds.clear();
    if (!this.gamepadEnabled || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const gp = pads?.[0];
    if (!gp || !gp.connected) return;

    const ax = gp.axes?.[0] ?? 0;
    const ay = gp.axes?.[1] ?? 0;
    const btn = (idx: number) => Boolean(gp.buttons?.[idx]?.pressed);
    if (Math.abs(ax) > 0.5 || Math.abs(ay) > 0.6 || gp.buttons?.some((b) => b.pressed)) platform.noteGamepad();

    if (ax < -0.35 || btn(14)) this.gamepadHolds.add('left');
    if (ax > 0.35 || btn(15)) this.gamepadHolds.add('right');
    if (ay > 0.42 || btn(13)) this.gamepadHolds.add('down');
    if (ay < -0.45 || btn(12)) this.gamepadHolds.add('up');
    if (btn(4) || btn(5) || btn(6) || btn(7)) this.gamepadHolds.add('guard');

    if (this.screenMode === 'fight' && !this.paused && this.fighters) {
      const p1 = this.fighters[0];
      const edge = (name: string, pressed: boolean, fn: () => void) => {
        const was = Boolean(this.prevGamepadButtons[name]);
        this.prevGamepadButtons[name] = pressed;
        if (pressed && !was) fn();
      };
      const jumpPressed = btn(1) || btn(12) || ay < -0.58;
      edge('jump', jumpPressed, () => {
        if (this.matchPhase === 'fighting') this.tryJump(p1);
      });
      edge('light', btn(0), () => {
        if (this.matchPhase === 'intro') this.skipIntro();
        else if (this.matchPhase === 'fighting') this.tryAttack(p1, 'light');
      });
      edge('heavy', btn(2), () => {
        if (this.matchPhase === 'fighting') this.tryAttack(p1, 'heavy');
      });
      edge('special', btn(3), () => {
        if (this.matchPhase === 'fighting') this.trySpecial(p1, this.isHeld(0, 'down'));
      });
    }
  }

  private step(dt: number) {
    if (!this.paused) {
      this.worldTime += dt;
      this.currentStage?.update(this.worldTime, dt);
    }
    this.pollGamepadInput();

    if (this.screenMode === 'title') {
      this.updateTitleScene(dt);
    } else if (this.screenMode === 'select') {
      this.updateSelectScene(dt);
    } else if (this.screenMode === 'fight' && !this.paused) {
      this.updateFightSimulation(dt);
    }

    this.updateSparks(dt);
  }

  private updateTitleScene(dt: number) {
    if (this.fighters) {
      for (const f of this.fighters) {
        applyRigFormAndFlash(f.rig, f.form, this.worldTime, dt);
        animateCharacterRig(f.rig, 'idle', this.worldTime, this.worldTime, f.facing, 0, dt, {
          form: f.form,
          isSelectShowcase: true,
          cameraPos: this.camera.position,
        });
      }
    }
    const panX = Math.sin(this.worldTime * 0.28) * 2.4;
    const panY = 2.35 + Math.sin(this.worldTime * 0.4) * 0.2;
    this._camTarget.set(panX, panY, 10.2);
    this._camLook.set(panX * 0.35, 1.4, -1.5);
    this.camera.position.lerp(this._camTarget, 1 - Math.exp(-4 * dt));
    this.camera.lookAt(this._camLook);
    this.currentStage?.setParallax?.(this.camera.position.x);
  }

  private updateSelectScene(dt: number) {
    if (this.fighters) {
      for (const f of this.fighters) {
        applyRigFormAndFlash(f.rig, f.form, this.worldTime, dt);
        animateCharacterRig(f.rig, 'idle', this.worldTime, this.worldTime, f.facing, 0, dt, {
          form: f.form,
          isSelectShowcase: true,
          cameraPos: this.camera.position,
        });
      }
    }
    if (this.showcaseOrbit) {
      this.showcaseAngle += dt * 0.55;
      const r = 7.4;
      this._camTarget.set(Math.sin(this.showcaseAngle) * r, 2.35, Math.cos(this.showcaseAngle) * r);
    } else {
      this._camTarget.set(0, 1.95, 7.6);
    }
    this._camLook.set(0, 1.25, 0);
    this.camera.position.lerp(this._camTarget, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(this._camLook);
    this.currentStage?.setParallax?.(this.camera.position.x);
  }

  private updateFightSimulation(dt: number) {
    if (!this.fighters) return;
    const [f1, f2] = this.fighters;

    // Hitstop freeze for heavy arcade impact weight
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateFightCamera(dt);
      return;
    }

    if (this.matchPhase === 'intro') {
      this.introLineTimer -= dt;
      if (this.introLineTimer <= 0) {
        this.introIndex++;
        if (this.introIndex >= this.introQueue.length) {
          this.beginRound(true);
        } else {
          this.introLineTimer = 2.2;
          this.playIntroVoice(this.introQueue[this.introIndex].speaker);
          this.emitHud();
        }
      }
    } else if (this.matchPhase === 'banner') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.matchPhase = 'fighting';
        this.bannerText = 'LUTE!';
        this.phaseTimer = 0.65;
        soundEngine.playFightBell();
        soundEngine.playAnnouncer('fight');
        this.emitHud();
      }
    } else if (this.matchPhase === 'fighting') {
      if (this.phaseTimer > 0) {
        this.phaseTimer = Math.max(0, this.phaseTimer - dt);
        if (this.phaseTimer === 0) this.bannerText = '';
      }

      if (this.gameMode !== 'training') {
        this.roundTimer = Math.max(0, this.roundTimer - dt);
        const sec = Math.ceil(this.roundTimer);
        if (sec !== this.lastCountdownSec) {
          this.lastCountdownSec = sec;
          if (sec === 10 || (sec <= 5 && sec >= 1)) {
            soundEngine.playCountdown();
          }
        }
        if (this.roundTimer <= 0) {
          this.resolveTimeOver();
        }
      } else {
        // Training mode auto-regenerates health & special meter smoothly
        f1.hp = Math.min(f1.maxHp, f1.hp + dt * 65);
        f2.hp = Math.min(f2.maxHp, f2.hp + dt * 65);
        f1.meter = Math.min(100, f1.meter + dt * 22);
      }

      this.updateCpuAi(f2, f1, dt);
      this.stepFighter(f1, f2, dt, false);
      this.stepFighter(f2, f1, dt, this.gameMode === 'cpu');
      this.resolveBodyPush(f1, f2);
      this.stepProjectiles(dt);
      this.stepCameos(dt);
    } else if (this.matchPhase === 'ko') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.advanceAfterRound();
      }
    }

    // Update rigs and visual polish
    for (const f of [f1, f2]) {
      f.trailHp = THREE.MathUtils.damp(f.trailHp, f.hp, 6, dt);
      if (f.barkTimer > 0) {
        f.barkTimer = Math.max(0, f.barkTimer - dt);
        if (f.barkTimer === 0) f.bark = null;
      }
      applyRigFormAndFlash(f.rig, f.form, this.worldTime, dt);
      animateCharacterRig(
        f.rig,
        this.resolveAnimState(f),
        f.stateTimer,
        this.worldTime,
        f.facing,
        0,
        dt,
        {
          form: f.form,
          nextForm: f.form,
          moveAnim: f.activeMoveAnim,
          moveTiming: f.activeMove ?? undefined,
          vy: f.vy,
          vx: f.vx,
          cameraPos: this.camera.position,
        }
      );
    }
    this.syncFighterTransforms();
    this.updateFightCamera(dt);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private resolveAnimState(f: FighterRuntime): AnimState {
    if (f.state === 'victory') return 'victory';
    if (f.state === 'knockdown') return 'knockdown';
    if (f.state === 'hitstun') return 'hitstun';
    if (f.state === 'transform') return 'transform';
    if (f.state === 'guard' || f.state === 'blockstun') return 'guard';
    if (f.state === 'crouch') return 'crouch';
    if (f.state === 'attack' && f.activeMove) {
      if (f.activeMove.id === 'combo') return 'combo';
      return f.activeMove.id as AnimState;
    }
    if (f.y > 0.08) return f.vy > 0 ? 'jump' : 'fall';
    if (Math.abs(f.vx) > 0.35) {
      return Math.sign(f.vx) === f.facing ? (Math.abs(f.vx) > 5.2 ? 'run' : 'walk') : 'backwalk';
    }
    return 'idle';
  }

  private updateCpuAi(cpu: FighterRuntime, player: FighterRuntime, dt: number) {
    if (this.gameMode !== 'cpu') return;
    if (['hitstun', 'blockstun', 'knockdown', 'transform', 'victory'].includes(cpu.state)) return;

    // Daniel's loyal golden dog passive support!
    if (cpu.id === 'daniel') {
      cpu.dogCooldown -= dt;
      if (cpu.dogCooldown <= 0) {
        cpu.dogCooldown = 14;
        this.spawnCameo('dog', cpu);
      }
    }

    const dist = Math.abs(cpu.x - player.x);
    const aggr = this.difficulty === 'hard' ? 0.85 : this.difficulty === 'normal' ? 0.58 : 0.32;
    const blockChance = this.difficulty === 'hard' ? 0.72 : this.difficulty === 'normal' ? 0.45 : 0.2;

    cpu.aiThinkTimer -= dt;
    if (cpu.aiThinkTimer <= 0) {
      cpu.aiThinkTimer = this.difficulty === 'hard' ? 0.14 : this.difficulty === 'normal' ? 0.24 : 0.42;

      if (player.state === 'attack' && dist < 2.6 && Math.random() < blockChance) {
        cpu.aiAction = 'guard';
      } else if (dist > 2.3) {
        cpu.aiAction = Math.random() < aggr ? 'approach' : 'idle';
      } else if (dist < 1.2 && Math.random() < 0.25) {
        cpu.aiAction = 'retreat';
      } else {
        cpu.aiAction = 'idle';
      }

      if (cpu.state !== 'attack') {
        if (cpu.id === 'davi' && cpu.meter >= 100 && dist < 2.7 && Math.random() < aggr * 0.6) {
          this.trySpecial(cpu, false);
        } else if (cpu.id === 'davi' && cpu.form === 'normal' && cpu.meter >= 50 && dist > 2.5 && Math.random() < aggr * 0.22) {
          this.trySpecial(cpu, true);
        } else if (cpu.id !== 'davi' && cpu.meter >= 100 && dist > 2.2 && Math.random() < aggr * 0.6) {
          this.trySpecial(cpu, false);
        } else if (cpu.id !== 'davi' && cpu.meter >= 50 && dist > 1.8 && Math.random() < aggr * 0.32) {
          this.trySpecial(cpu, true);
        } else if (dist <= 2.15 && Math.random() < aggr) {
          this.tryAttack(cpu, Math.random() < 0.55 ? 'light' : 'heavy');
        } else if (dist > 3.2 && Math.random() < 0.12 * aggr) {
          this.tryJump(cpu);
        }
      }
    }
  }

  private stepFighter(f: FighterRuntime, opp: FighterRuntime, dt: number, isCpu: boolean) {
    const spec = FIGHTERS[f.id];
    const formSpec = FORMS[f.form];

    f.stateTimer += dt;
    if (f.id === 'davi' && this.matchPhase === 'fighting') {
      f.daviVoiceCooldown = Math.max(0, f.daviVoiceCooldown - dt);
      f.daviSpecialCooldown = Math.max(0, f.daviSpecialCooldown - dt);
      f.daviIdleTime = f.state === 'idle' ? f.daviIdleTime + dt : 0;
      if (f.daviIdleTime >= 8 && f.daviVoiceCooldown === 0) {
        f.bark = 'Agora tô c preguiça.';
        f.barkTimer = 2.1;
        f.daviVoiceCooldown = 20;
        f.daviIdleTime = 0;
        soundEngine.playClip('davi', 'preguica', 2500);
      }
    }
    if (f.hitInvuln > 0) f.hitInvuln = Math.max(0, f.hitInvuln - dt);
    if (f.slipTimer > 0) f.slipTimer = Math.max(0, f.slipTimer - dt);

    if (f.comboResetTimer > 0) {
      f.comboResetTimer = Math.max(0, f.comboResetTimer - dt);
      if (f.comboResetTimer === 0) f.comboCount = 0;
    }

    if (f.form !== 'normal') {
      f.formTimer -= dt;
      if (f.formTimer <= 0) {
        f.form = 'normal';
        f.formTimer = 0;
      }
    }

    // Daniel's golden dog passive support for P1 as well!
    if (!isCpu && f.id === 'daniel' && this.matchPhase === 'fighting') {
      f.dogCooldown -= dt;
      if (f.dogCooldown <= 0) {
        f.dogCooldown = 14;
        this.spawnCameo('dog', f);
      }
    }

    // Face opponent when idle/moving on ground
    if (f.y <= 0.02 && !['attack', 'hitstun', 'knockdown'].includes(f.state)) {
      f.facing = opp.x >= f.x ? 1 : -1;
    }

    if (f.state === 'transform') {
      f.vx *= Math.exp(-12 * dt);
      const tfDur = f.form === 'crente' ? 1.4 : f.form === 'hulk' ? 1.3 : 1.15;
      if (f.stateTimer >= tfDur) f.state = 'idle';
    } else if (f.state === 'hitstun' || f.state === 'blockstun') {
      f.vx *= Math.exp(-8 * dt);
      if (f.stateTimer >= 0.28) f.state = 'idle';
    } else if (f.state === 'knockdown') {
      f.vx *= Math.exp(-6 * dt);
      if (f.stateTimer >= 0.85 && f.hp > 0) {
        f.state = 'idle';
        f.hitInvuln = 0.35;
      }
    } else if (f.state === 'attack' && f.activeMove) {
      f.moveElapsed += dt;
      const m = f.activeMove;
      const activeStart = m.startup;
      const activeEnd = m.startup + m.active;
      const total = activeEnd + m.recovery;

      if (!f.moveHitConnected && m.damage > 0 && f.moveElapsed >= activeStart && f.moveElapsed <= activeEnd) {
        const dist = Math.abs(opp.x - f.x);
        const dirToOpp = Math.sign(opp.x - f.x) || f.facing;
        const reach = m.range * formSpec.reach;
        if (dirToOpp === f.facing && dist >= m.minRange && dist <= reach && Math.abs(opp.y - f.y) < 1.55) {
          this.applyHit(f, opp, m.damage * formSpec.atk, m.push * formSpec.push, m.hitstop, Boolean(m.heavy), Boolean(m.knockdown));
          f.moveHitConnected = true;
        }
      }

      if (f.y <= 0.02) f.vx *= Math.exp(-10 * dt);

      if (f.moveElapsed >= total) {
        if (f.bufferedAttack) {
          const next = f.bufferedAttack;
          f.bufferedAttack = null;
          const nextMove =
            next === 'medium'
              ? spec.moves.medium
              : next === 'combo' && spec.moves.combo
              ? spec.moves.combo
              : spec.moves.heavy;
          this.startAttackMove(f, nextMove);
        } else {
          f.state = 'idle';
          f.activeMove = null;
          f.activeMoveAnim = undefined;
        }
      }
    } else if (f.state !== 'victory') {
      // Normal movement / crouch / guard
      const wantLeft = isCpu ? f.aiAction === (f.facing === 1 ? 'retreat' : 'approach') : this.isHeld(f.index, 'left');
      const wantRight = isCpu ? f.aiAction === (f.facing === 1 ? 'approach' : 'retreat') : this.isHeld(f.index, 'right');
      const wantDown = !isCpu && this.isHeld(f.index, 'down');
      const wantGuard = isCpu ? f.aiAction === 'guard' : this.isHeld(f.index, 'guard');

      if (f.y <= 0.02) {
        if (wantGuard) {
          f.state = 'guard';
          f.vx *= Math.exp(-14 * dt);
        } else if (wantDown) {
          f.state = 'crouch';
          f.vx *= Math.exp(-14 * dt);
        } else {
          const dir = (wantRight ? 1 : 0) - (wantLeft ? 1 : 0);
          if (dir !== 0) {
            const spd = (dir === f.facing ? spec.walkSpeed : spec.backSpeed) * formSpec.speed * (f.slipTimer > 0 ? 1.45 : 1);
            f.vx = dir * spd;
            f.state = 'move';
          } else {
            f.vx *= Math.exp(-16 * dt);
            f.state = 'idle';
          }
        }
      }
    }

    // Integrate X & Y physics
    f.x += f.vx * dt;
    f.x = Math.max(-ARENA_HALF_W, Math.min(ARENA_HALF_W, f.x));

    if (f.y > 0 || f.vy > 0) {
      f.vy -= spec.gravity * dt;
      f.y += f.vy * dt;
      if (f.y <= 0) {
        f.y = 0;
        f.vy = 0;
        if (f.state === 'attack' && f.activeMove?.id === 'air') {
          f.state = 'idle';
          f.activeMove = null;
        }
      }
    }
  }

  private resolveBodyPush(f1: FighterRuntime, f2: FighterRuntime) {
    const minDist = 0.78;
    const dx = f2.x - f1.x;
    const dist = Math.abs(dx);
    if (dist < minDist && Math.abs(f1.y - f2.y) < 1.3) {
      const overlap = (minDist - dist) * 0.5;
      const dir = dx >= 0 ? 1 : -1;
      f1.x = Math.max(-ARENA_HALF_W, f1.x - dir * overlap);
      f2.x = Math.min(ARENA_HALF_W, f2.x + dir * overlap);
    }
  }

  private applyHit(
    att: FighterRuntime,
    def: FighterRuntime,
    rawDamage: number,
    push: number,
    hitstop: number,
    heavy: boolean,
    knockdown: boolean
  ) {
    if (def.hitInvuln > 0 || this.matchPhase !== 'fighting') return;

    const isBlocking =
      def.state === 'guard' ||
      def.state === 'blockstun' ||
      (def.y <= 0.02 &&
        def.state !== 'attack' &&
        def.state !== 'hitstun' &&
        def.state !== 'knockdown' &&
        ((def.facing === 1 && this.isHeld(def.index, 'left')) ||
          (def.facing === -1 && this.isHeld(def.index, 'right'))));

    const defMult = FORMS[def.form].def;
    const dmg = Math.round(rawDamage * defMult * (isBlocking ? 0.22 : 1));
    def.hp = Math.max(0, def.hp - dmg);
    def.vx = att.facing * push * (isBlocking ? 0.65 : 1);

    att.meter = Math.min(100, att.meter + (isBlocking ? 7 : 15));
    def.meter = Math.min(100, def.meter + 8);

    if (isBlocking) {
      def.state = 'blockstun';
      def.stateTimer = 0;
      soundEngine.playHit(heavy, true);
      this.spawnSparks((att.x + def.x) * 0.5, def.y + 1.15, 0x93c5fd, 7);
    } else {
      def.rig.hitFlashTimer = 0.11;
      att.comboCount++;
      att.comboResetTimer = 1.4;
      if (att.comboCount === 3) {
        soundEngine.playAnnouncer('combo');
      }
      def.state = knockdown || def.hp <= 0 ? 'knockdown' : 'hitstun';
      def.stateTimer = 0;
      def.activeMove = null;
      def.activeMoveAnim = undefined;
      soundEngine.playHit(heavy, false);
      this.hitstopTimer = hitstop;
      this.shakeTimer = heavy ? 0.2 : 0.1;
      this.shakeAmp = heavy ? 0.22 : 0.1;
      if (heavy) {
        this.spawnBurst((att.x + def.x) * 0.5, def.y + 1.15);
      }
      this.spawnSparks((att.x + def.x) * 0.5, def.y + 1.15, heavy ? 0xff9f1c : 0xfef08a, heavy ? 14 : 9);
    }

    if (def.hp <= 0 && this.gameMode !== 'training') {
      this.triggerKO(att, def);
    }
    this.emitHud();
  }

  private stepProjectiles(dt: number) {
    if (!this.fighters) return;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.mesh.position.set(p.x, p.y, 0.08);
      if (p.kind === 'cake' || p.kind === 'brigadeiro' || p.kind === 'food') {
        p.mesh.rotation.z += dt * 4.5 * p.facing;
      } else {
        p.mesh.rotation.z = Math.sin(this.worldTime * 10 + i) * 0.08;
      }

      const target = this.fighters[p.ownerIndex === 0 ? 1 : 0];
      const owner = this.fighters[p.ownerIndex];
      const hitDist = Math.hypot(p.x - target.x, p.y - (target.y + 1.0));
      if (hitDist <= p.radius + 0.48) {
        this.spawnBurst(p.x, p.y);
        this.applyHit(owner, target, p.damage, 4.2, 0.08, true, p.knockdown);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.life <= 0 || Math.abs(p.x) > 12 || p.y < 0.05) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private stepCameos(dt: number) {
    if (!this.fighters) return;
    for (let i = this.cameos.length - 1; i >= 0; i--) {
      const c = this.cameos[i];
      c.life -= dt;
      c.x += c.vx * dt;
      c.mesh.position.x = c.x;
      c.mesh.position.y = Math.abs(Math.sin(this.worldTime * 14)) * 0.14;

      const target = this.fighters[c.ownerIndex === 0 ? 1 : 0];
      const owner = this.fighters[c.ownerIndex];
      const facing: 1 | -1 = c.vx >= 0 ? 1 : -1;
      const distToTarget = Math.abs(c.x - target.x);
      if (c.kind === 'dog') {
        updateCameoVisual(
          c.mesh,
          c.hitDone || distToTarget < 2.4 ? 'dog_attack' : 'dog_run',
          facing
        );
      } else {
        updateCameoVisual(c.mesh, c.kind, facing);
      }

      if (!c.hitDone && distToTarget < 0.85 && target.y < 1.2) {
        c.hitDone = true;
        if (c.kind === 'dada') {
          target.slipTimer = 2.0;
          soundEngine.playSplash();
        } else if (c.kind === 'dog') {
          soundEngine.playBite();
        }
        this.spawnBurst(c.x, 0.9);
        this.applyHit(owner, target, c.damage, 3.8, 0.075, true, c.kind === 'kid');
      }

      if (c.life <= 0 || Math.abs(c.x) > 12) {
        this.scene.remove(c.mesh);
        this.cameos.splice(i, 1);
      }
    }
  }

  private triggerKO(winner: FighterRuntime, loser: FighterRuntime) {
    this.matchPhase = 'ko';
    this.bannerText = 'K.O.!';
    this.phaseTimer = 2.3;
    winner.roundsWon++;
    winner.state = 'victory';
    winner.stateTimer = 0;
    this.setBark(winner, 'win');
    if (winner.id === 'davi') winner.bark = 'Vamos jogar videogame.';
    loser.state = 'knockdown';
    loser.stateTimer = 0;
    soundEngine.playKO();
    soundEngine.playClip('narrator', 'victory');
    this.shakeTimer = 0.35;
    this.shakeAmp = 0.3;
    this.emitHud();
  }

  private resolveTimeOver() {
    if (!this.fighters) return;
    const [f1, f2] = this.fighters;
    const isTie = f1.hp === f2.hp;
    const winner = f1.hp >= f2.hp ? f1 : f2;
    const loser = winner === f1 ? f2 : f1;
    this.bannerText = isTie ? 'EMPATE!' : 'TEMPO ESGOTADO!';
    this.matchPhase = 'ko';
    this.phaseTimer = 2.1;
    if (!isTie) winner.roundsWon++;
    winner.state = 'victory';
    this.setBark(winner, 'win');
    if (winner.id === 'davi') winner.bark = 'Vamos jogar videogame.';
    loser.state = 'idle';
    soundEngine.playAnnouncer('time');
    soundEngine.playVictory();
    this.emitHud();
  }

  private advanceAfterRound() {
    if (!this.fighters) return;
    const [f1, f2] = this.fighters;
    if (f1.roundsWon >= 2 || f2.roundsWon >= 2) {
      this.matchPhase = 'matchOver';
      this.winnerIndex = f1.roundsWon >= 2 ? 0 : 1;
      const winId = this.fighters[this.winnerIndex].id;
      this.bannerText = `${FIGHTERS[winId].name} VENCEU!`;
      soundEngine.playVictory();
      soundEngine.playAnnouncer(this.winnerIndex === 0 ? 'you_win' : 'you_lose');
      const winClips: Partial<Record<FighterId, string>> = {
        juraci: 'cozinha',
        carlos: 'pizzaAmor',
        pedro: 'fumaBebe',
        daniel: 'praia',
        franciely: 'cuidar',
        gabi: 'amor',
        paula: 'bar',
        tainara: 'arroz',
        davi: 'videogame',
      };
      const wk = winClips[winId];
      if (wk) {
        setTimeout(() => {
          if (!this.disposed) soundEngine.playClip(winId, wk, 0);
        }, 700);
      }
      soundEngine.startMusic('theme', 0.85);
      this.emitHud();
    } else {
      this.roundNumber++;
      this.beginRound(true);
    }
  }

  private updateFightCamera(dt: number) {
    if (!this.fighters) return;
    const [f1, f2] = this.fighters;
    const midX = (f1.x + f2.x) * 0.5;
    const span = Math.abs(f1.x - f2.x);
    const fr = this.framing;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const maxY = Math.max(f1.y, f2.y);
    const baseDistance = fr.minDistance - 0.4 + span * 0.68;
    // escala da imagem é a da tela inteira (o deslocamento não muda o zoom)
    const tan = Math.tan(THREE.MathUtils.degToRad(this.baseFov * 0.5));
    const horizontalViewTangent = (tan * w) / h;
    const desiredWidth = span + fr.sideMargin;
    const fitDistance = desiredWidth / (2 * Math.max(0.01, horizontalViewTangent));
    // altura: corpo + pulo cabem na área útil (entre HUD e controles)
    const usefulH = Math.max(0.25, 1 - fr.top - fr.bottom);
    const fitHeight = (3.1 + maxY) / (2 * tan * usefulH);
    const zDist = THREE.MathUtils.clamp(Math.max(baseDistance, fitDistance, fitHeight), fr.minDistance, 60);

    let sx = 0;
    let sy = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      sx = (Math.random() - 0.5) * this.shakeAmp;
      sy = (Math.random() - 0.5) * this.shakeAmp;
    }

    this._camTarget.set(
      midX * 0.85 + sx,
      1.74 + maxY * 0.32 + sy + Math.max(0, zDist - 10) * 0.11,
      zDist
    );
    this._camLook.set(midX * 0.9, 1.08 + maxY * 0.25, -0.4);
    this.camera.position.lerp(this._camTarget, 1 - Math.exp(-9 * dt));
    this.camera.lookAt(this._camLook);
    this.currentStage?.setParallax?.(this.camera.position.x);
  }

  private updateSparks(dt: number) {
    // === FIX FOR PROBLEM 5: Clean up burst materials on removal ===
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      const t = 1 - Math.max(0, b.life / b.maxLife);
      const sc = 0.7 + Math.sin(t * Math.PI) * 0.55;
      b.mesh.scale.setScalar(sc);
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.disposeMesh(b.mesh);
        this.bursts.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vy -= 14 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      const sc = Math.max(0.01, s.life / s.maxLife);
      s.mesh.scale.setScalar(sc);
      if (s.life <= 0) {
        // === FIX FOR PROBLEM 6: Return spark to pool for reuse ===
        s.mesh.visible = false;
        this.sparkPool.push(s);
        this.sparks.splice(i, 1);
      }
    }
  }

  /**
   * === FIX FOR PROBLEM 5: Properly dispose mesh geometry and material ===
   * Prevents memory leaks when removing particles and effects
   */
  private disposeMesh(obj: THREE.Object3D) {
    if (!obj) return;
    if ('geometry' in obj && obj.geometry) {
      (obj.geometry as THREE.BufferGeometry).dispose();
    }
    if ('material' in obj && obj.material) {
      const mat = obj.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose());
      } else {
        mat.dispose();
      }
    }
    // Recursively dispose children (for Groups)
    if ('children' in obj) {
      obj.children.forEach(child => this.disposeMesh(child));
    }
  }

  public emitHud() {
    if (!this.fighters) return;
    const [f1, f2] = this.fighters;
    const curIntro = this.introQueue[this.introIndex];
    const introLine =
      this.matchPhase === 'intro' && curIntro
        ? {
            speaker: curIntro.speaker,
            name: FIGHTERS[curIntro.speaker === 'p1' ? f1.id : f2.id].name,
            text: curIntro.text,
          }
        : null;

    this.onHudUpdate({
      phase: this.matchPhase,
      bannerText: this.bannerText,
      roundNumber: this.roundNumber,
      timer: Math.ceil(this.roundTimer),
      winnerIndex: this.winnerIndex,
      introLine,
      p1: this.snapshotFighter(f1),
      p2: this.snapshotFighter(f2),
    });
  }

  private snapshotFighter(f: FighterRuntime): HudFighterSnapshot {
    return {
      id: f.id,
      name: FIGHTERS[f.id].name,
      hp: Math.round(f.hp),
      maxHp: f.maxHp,
      trailHp: Math.round(f.trailHp),
      meter: Math.round(f.meter),
      form: f.form,
      formLabel: FORMS[f.form].label,
      formTimeLeft: Math.ceil(f.formTimer),
      comboCount: f.comboCount,
      roundsWon: f.roundsWon,
      bark: f.bark,
    };
  }

  public dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.clearEntities();
    this.currentStage?.dispose();
    this.shadowTex.dispose();
    this.sparkGeo.dispose();
    this.heartGeo.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
