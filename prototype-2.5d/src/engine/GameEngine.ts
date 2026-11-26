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
import { frameAdvantage, lowMoves, moveFrames, DEFAULT_HITSTUN } from '../data/commands';
import { FUN_LINES, type FunTrigger } from '../data/funLines';
import { findBanter } from '../data/banter';
import { STAGES, StageId } from '../data/stages';
import { CastVoiceEvent, STAGE_MUSIC, castKey, castKeyVariant, clipText, hasClip, soundEngine } from './audio';
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
  buildPopText,
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

export type PressAction = 'light' | 'heavy' | 'special' | 'subSpecial' | 'jump' | 'taunt';
export type TrainingDummy = 'stand' | 'crouch' | 'jump' | 'guard' | 'guardAfterHit' | 'cpu';
export interface TrainingOptions {
  dummy: TrainingDummy;
  /** vida volta ao máximo quando o combo termina */
  refill: boolean;
  /** barra de especial sempre cheia */
  infiniteMeter: boolean;
  /** painel de dados (frames, dano, entradas) */
  showData: boolean;
}
export interface TrainingSnapshot {
  options: TrainingOptions;
  lastMove: { name: string; startup: number; active: number; recovery: number; damage: number; onBlock: number; onHit: number } | null;
  lastResult: { kind: 'hit' | 'block'; advantage: number } | null;
  combo: { hits: number; damage: number };
  best: { hits: number; damage: number };
  inputs: { id: number; dir: string; button: PressAction }[];
  done: string[];
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
  /** Cena de especial (cut-in): quem soltou, nome do golpe; key muda a cada especial. */
  superCutin: { slot: 'p1' | 'p2'; fighterId: FighterId; name: string; move: string; full: boolean; key: number } | null;
  /** golpe cinematográfico em andamento: faixas pretas de cinema na tela */
  cinematic: boolean;
  /** muda a cada flash branco de tela (selfie) */
  flashKey: number;
  /** só no modo treino */
  training: TrainingSnapshot | null;
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
  /** Quando a última fala com áudio foi mostrada (texto e som sempre juntos). */
  barkVoicedAt?: number;
  dogCooldown: number;
  slipTimer: number;
  hitInvuln: number;
  aiThinkTimer: number;
  aiAction: 'approach' | 'retreat' | 'guard' | 'idle';
  daviIdleTime: number;
  daviVoiceCooldown: number;
  daviSpecialCooldown: number;
  /** Super Bundada: onda de impacto já disparada neste golpe */
  bundadaFxDone?: boolean;
  /** especial do adversário em andamento: não consegue defender, só atacar (estilo Mortal Kombat) */
  noGuardTimer: number;
  tauntCooldown: number;
  lowHpSaid: boolean;
  lastFunKey?: string;
  /** duração do atordoamento atual (vem do golpe que acertou) */
  stunDuration: number;
  /** botão apertado enquanto ocupado: sai assim que der (até 0,15 s) */
  inputBuffer: { action: PressAction; t: number } | null;
  /** comando da Lista de Golpes que está saindo agora */
  commandId: string | null;
  /** defendeu agachado (golpe baixo) */
  lowGuard: boolean;
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
  /** segundos até sair da mão do dono (rajada); enquanto > 0 fica invisível e parado */
  delay?: number;
  /** chinelo bumerangue: segundos de voo até voltar */
  boomerang?: number;
  returned?: boolean;
  age?: number;
  /** panela: ao sair, nasce em cima da cabeça do alvo */
  dropOnTarget?: boolean;
}

interface PopText {
  sprite: THREE.Sprite;
  life: number;
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
  private trainingOpts: TrainingOptions = { dummy: 'stand', refill: true, infiniteMeter: true, showData: true };
  private trainingStats = {
    lastMove: null as TrainingSnapshot['lastMove'],
    lastResult: null as TrainingSnapshot['lastResult'],
    combo: { hits: 0, damage: 0 },
    best: { hits: 0, damage: 0 },
    done: new Set<string>(),
  };
  private inputLog: TrainingSnapshot['inputs'] = [];
  private inputSeq = 0;
  private trainingCalm = 0;
  private dummyGuardTimer = 0;
  private dummyJumpTimer = 0;

  private p1Id: FighterId = 'pedro';
  private p2Id: FighterId = 'paula';
  private fighters: [FighterRuntime, FighterRuntime] | null = null;

  private projectiles: ActiveProjectile[] = [];
  private popTexts: PopText[] = [];
  /** conversa no meio da luta: de vez em quando alguém solta uma das falas reais */
  private chatterTimer = 14;
  private flashKey = 0;
  private cameos: ActiveCameo[] = [];
  private bursts: Array<{ mesh: THREE.Group; life: number; maxLife: number }> = [];
  private sparks: SparkParticle[] = [];
  private sparkMats = new Map<string, THREE.MeshBasicMaterial>();
  private sparkPool: THREE.Mesh[] = [];
  private fxKeepAlive: THREE.Group | null = null;
  private sparkGeo: THREE.SphereGeometry;
  private heartGeo: THREE.ShapeGeometry;

  private matchPhase: 'intro' | 'banner' | 'fighting' | 'ko' | 'matchOver' = 'intro';
  private phaseTimer = 0;
  private roundNumber = 1;
  private roundTimer = 99;
  private lastCountdownSec = 99;
  private bannerText = 'ROUND 1';
  private winnerIndex: 0 | 1 | null = null;

  private introQueue: Array<{ speaker: 'p1' | 'p2'; text: string; clip?: { who: FighterId; key: string; dur: number } }> = [];
  /** Humilhação: depois do nocaute que decide a partida, o vencedor tem alguns segundos para o golpe cômico */
  private finishTimer = 0;
  private finishWinner: 0 | 1 | null = null;
  private finishGagUsed = false;
  private introIndex = 0;
  private introLineTimer = 0;

  private hitstopTimer = 0;
  /** Câmera do especial: aproxima de quem soltou o golpe enquanto o jogo congela. */
  private superTimer = 0;
  private superDuration = 0;
  private superFocusX = 0;
  /** câmera de golpe de finalização: aproxima baixo, entre o atacante e o alvo */
  /** câmera lenta do golpe cinematográfico (segundos reais restantes) */
  private slowmoTimer = 0;
  private superCutin: HudSnapshot['superCutin'] = null;
  private superCutinTimer = 0;
  private superKey = 0;
  private shakeTimer = 0;
  private shakeAmp = 0;
  private worldTime = 0;
  private lastTimestamp = 0;
  private frameId = 0;
  private disposed = false;

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
    this.sparkGeo = new THREE.SphereGeometry(0.06, 8, 6);
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

  /**
   * Toca uma fala e mostra na tela exatamente o que foi dito. Texto e áudio saem sempre juntos:
   * se a fala não tocar (mudo, outra fala em andamento), o texto dela também não aparece.
   */
  private speak(f: FighterRuntime, who: string, key: string, throttleMs = 700, caption = true): boolean {
    if (!soundEngine.playClip(who, key, throttleMs)) return false;
    const text = caption ? clipText(who, key) : null;
    if (text) {
      const SPEAKER: Record<string, string> = { franciely: 'Franciely', dada: 'Dadá', cao: 'Doguinho', narrator: '' };
      f.bark = who === f.id || who === 'narrator' ? text : `${SPEAKER[who] ?? who}: ${text}`;
      f.barkTimer = Math.max(2.2, Math.min(9, 0.9 + text.length * 0.05));
      f.barkVoicedAt = performance.now();
    }
    return true;
  }

  /** Fala do elenco (ElevenLabs) para um momento da luta. */
  private castVoice(f: FighterRuntime, event: CastVoiceEvent, throttleMs = 700): boolean {
    return this.speak(f, f.id, castKeyVariant(f.id, event), throttleMs);
  }

  /** Especial/sub-especial: a fala original do golpe tem prioridade; a nova só entra onde não há original. */
  private moveVoice(f: FighterRuntime, isSub: boolean, classicKey: string) {
    if (hasClip(f.id, classicKey)) this.speak(f, f.id, classicKey);
    else this.castVoice(f, isSub ? 'subSpecial' : 'special');
  }

  private playIntroVoice(speakerSlot: 'p1' | 'p2') {
    if (!this.fighters) return;
    const f = speakerSlot === 'p1' ? this.fighters[0] : this.fighters[1];
    const current = this.introQueue[this.introIndex];
    if (current?.clip) {
      soundEngine.playClip(current.clip.who, current.clip.key, 0);
      return;
    }
    if (this.fighters.some((fighter) => fighter.id === 'davi') && f.id !== 'davi') return;
    // às vezes abre com um áudio real da família (provocação específica contra o adversário, quando tem)
    const foe = speakerSlot === 'p1' ? this.fighters[1] : this.fighters[0];
    if (FUN_LINES[f.id] && Math.random() < 0.55 && this.funSay(f, 'intro', foe)) return;
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
    const list = introClips[f.id]?.length ? introClips[f.id]! : [castKey('intro')];
    const key = list[Math.floor(Math.random() * list.length)];
    if (soundEngine.playClip(f.id, key, 1200)) {
      const text = clipText(f.id, key);
      const line = this.introQueue[this.introIndex];
      if (text && line && line.speaker === speakerSlot) {
        line.text = text;
        this.emitHud();
      }
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
    soundEngine.preloadFighterVoices([p1, p2, 'narrator']);
    void soundEngine.preloadSfx();
    this.warmupEffects(['cake', 'beerBlast', 'smoke', 'milk', 'superL', 'brigadeiro', 'food', 'notes', 'cigarette', 'chinelo', 'pizza', 'pan', 'rice', 'controller', 'count1', 'count2', 'count3']);
    this.warmupFighterTextures();
    soundEngine.startMusic(STAGE_MUSIC[stageId] ?? 'theme', 0.58);
    this.screenMode = 'fight';
    this.updateProjection();
    this.paused = false;
    this.roundNumber = 1;
    this.winnerIndex = null;
    this.finishWinner = null;
    this.finishTimer = 0;

    if (this.fighters) {
      this.fighters[0].roundsWon = 0;
      this.fighters[1].roundsWon = 0;
    }

    if (mode === 'training') {
      this.introQueue = [];
      this.beginRound(false);
    } else {
      // provocação a dois (áudios reais e falas do elenco) quando a dupla tem; senão, o diálogo normal
      const banter = p1 !== p2 ? findBanter(p1, p2) : null;
      this.introQueue = banter
        ? banter.lines.map((l) => ({ speaker: (l.who === p1 ? 'p1' : 'p2') as 'p1' | 'p2', text: clipText(l.who, l.key) ?? '', clip: l }))
        : pickIntroDialogue(p1, p2);
      this.introIndex = 0;
      this.introLineTimer = this.introQueue[0]?.clip ? this.introQueue[0].clip.dur + 0.4 : 2.2;
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

  public setTrainingOptions(opts: Partial<TrainingOptions>) {
    this.trainingOpts = { ...this.trainingOpts, ...opts };
    this.dummyGuardTimer = 0;
    this.emitHud();
  }

  /** Treino: volta os dois para a posição inicial, vida e barra cheias. */
  public resetTraining(clearStats = false) {
    if (!this.fighters) return;
    this.clearEntities();
    this.resetFighterPositions();
    this.fighters[0].meter = 100;
    this.fighters[1].meter = 100;
    this.trainingStats.combo = { hits: 0, damage: 0 };
    this.trainingStats.lastResult = null;
    if (clearStats) {
      this.trainingStats.lastMove = null;
      this.trainingStats.best = { hits: 0, damage: 0 };
      this.trainingStats.done.clear();
      this.inputLog = [];
    }
    this.emitHud();
  }

  public triggerVirtualHold(playerIndex: 0 | 1, action: string, active: boolean) {
    if (active) this.virtualHolds[playerIndex].add(action);
    else this.virtualHolds[playerIndex].delete(action);
  }

  public triggerVirtualPress(playerIndex: 0 | 1, action: 'light' | 'heavy' | 'special' | 'subSpecial' | 'jump' | 'taunt') {
    if (this.screenMode !== 'fight' || this.paused) return;
    if (this.matchPhase === 'intro') {
      this.skipIntro();
      return;
    }
    if (this.matchPhase !== 'fighting' || !this.fighters) return;
    this.pressAction(this.fighters[playerIndex], action);
  }

  /**
   * Entrada única de botão para teclado, controle e toque: registra no histórico do treino,
   * resolve direção + botão pela estrutura de golpes e, se o lutador estiver ocupado,
   * guarda o botão por até 0,15 s para sair no primeiro quadro livre.
   */
  private pressAction(f: FighterRuntime, action: PressAction) {
    if (action === 'special' && this.isHeld(f.index, 'down')) action = 'subSpecial';
    if (f.index === 0) this.logInput(f, action);
    const before = [f.state, f.activeMove, f.bufferedAttack, f.meter, f.vy, f.tauntCooldown];
    this.performAction(f, action);
    const after = [f.state, f.activeMove, f.bufferedAttack, f.meter, f.vy, f.tauntCooldown];
    const acted = before.some((v, i) => v !== after[i]);
    if (!acted && ['attack', 'hitstun', 'blockstun', 'knockdown', 'transform'].includes(f.state)) {
      f.inputBuffer = { action, t: this.worldTime };
    }
  }

  private performAction(f: FighterRuntime, action: PressAction) {
    if (action === 'jump') this.tryJump(f);
    else if (action === 'taunt') this.tryTaunt(f);
    else if (action === 'special') this.trySpecial(f, false);
    else if (action === 'subSpecial') this.trySpecial(f, true);
    else this.tryAttack(f, action);
  }

  private logInput(f: FighterRuntime, action: PressAction) {
    if (this.gameMode !== 'training') return;
    const fwd = this.isHeld(f.index, f.facing === 1 ? 'right' : 'left');
    const back = this.isHeld(f.index, f.facing === 1 ? 'left' : 'right');
    const down = this.isHeld(f.index, 'down');
    const dir = f.y > 0.08 ? '↑' : down ? (fwd ? '↘' : back ? '↙' : '↓') : fwd ? '→' : back ? '←' : '';
    this.inputLog.unshift({ id: ++this.inputSeq, dir, button: action });
    if (this.inputLog.length > 12) this.inputLog.length = 12;
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
    const r1 = buildCharacterRig(p1, this.maxAnisotropy, this.shadowTex);
    const r2 = buildCharacterRig(p2, this.maxAnisotropy, this.shadowTex);
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
      noGuardTimer: 0,
      tauntCooldown: 0,
      lowHpSaid: false,
      stunDuration: DEFAULT_HITSTUN,
      inputBuffer: null,
      commandId: null,
      lowGuard: false,
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
      f.noGuardTimer = 0;
      f.tauntCooldown = 0;
      f.lowHpSaid = false;
      f.inputBuffer = null;
      f.commandId = null;
    }
    this.syncFighterTransforms();
  }

  private beginRound(showBanner: boolean) {
    this.clearEntities();
    this.finishWinner = null;
    this.finishTimer = 0;
    if (!this.fighters) return;
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
      f.noGuardTimer = 0;
      f.tauntCooldown = 0;
      f.lowHpSaid = false;
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
    for (const p of this.projectiles) this.removeFx(p.mesh);
    for (const t of this.popTexts) this.scene.remove(t.sprite);
    this.popTexts = [];
    this.projectiles = [];
    for (const c of this.cameos) this.removeFx(c.mesh);
    this.cameos = [];
    for (const b of this.bursts) this.removeFx(b.mesh);
    this.bursts = [];
    for (const s of this.sparks) this.releaseSpark(s.mesh);
    this.sparks = [];
  }

  private syncFighterTransforms() {
    if (!this.fighters) return;
    for (const f of this.fighters) {
      f.rig.root.position.set(f.x, f.y, 0);
    }
  }

  private isHeld(playerIndex: 0 | 1, action: 'left' | 'right' | 'up' | 'down' | 'guard'): boolean {
    if (playerIndex === 1 && this.gameMode === 'training' && this.trainingOpts.dummy !== 'cpu') {
      const d = this.trainingOpts.dummy;
      if (action === 'down') return d === 'crouch';
      if (action === 'guard') return d === 'guard' || (d === 'guardAfterHit' && this.dummyGuardTimer > 0);
      return false;
    }
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
      this.pressAction(p1, 'jump');
    } else if (code === kb.light || (solo && code === 'KeyF')) {
      this.pressAction(p1, 'light');
    } else if (code === kb.heavy || (solo && code === 'KeyG')) {
      this.pressAction(p1, 'heavy');
    } else if (code === kb.special || (solo && code === 'KeyT')) {
      this.pressAction(p1, 'special');
    } else if (code === 'KeyY') {
      this.pressAction(p1, 'taunt');
    } else if (code === 'KeyR' && this.gameMode === 'training') {
      this.resetTraining();
    }

    if (this.gameMode === 'versus') {
      if (code === 'ArrowUp') this.pressAction(p2, 'jump');
      else if (code === 'KeyU' || code === 'Numpad1') this.pressAction(p2, 'light');
      else if (code === 'KeyP' || code === 'Numpad2') this.pressAction(p2, 'heavy');
      else if (code === 'Numpad3' || code === 'Slash') this.pressAction(p2, 'special');
      else if (code === 'Numpad5' || code === 'Period') this.pressAction(p2, 'taunt');
    }
  }

  /**
   * Provocar: faz pose, fala uma provocação (áudio real da família quando tem) e ganha um pouco de barra.
   * Fica aberto por ~1 s: provocar é arriscado.
   */
  private tryTaunt(f: FighterRuntime) {
    if (f.y > 0.02 || f.tauntCooldown > 0) return;
    if (['attack', 'hitstun', 'blockstun', 'knockdown', 'transform', 'victory'].includes(f.state)) return;
    const opp = this.fighters?.[f.index === 0 ? 1 : 0];
    f.tauntCooldown = 3.5;
    if (this.gameMode === 'training' && f.index === 0) this.trainingStats.done.add('taunt');
    this.startAttackMove(f, {
      id: 'combo', label: 'Provocar', startup: 0.1, active: 0.1, recovery: 0.95,
      damage: 0, minRange: 0, range: 0, hitstun: 0, blockstun: 0, push: 0, hitstop: 0, anim: 'win',
    });
    f.meter = Math.min(100, f.meter + 8);
    if (!this.funSay(f, 'taunt', opp)) {
      const generic = ['Vem! Tá com medo?', 'Bate mais forte, vai!', 'Só isso? Que preguiça...', 'Chama a família toda!', 'Tô nem suando!'];
      f.bark = generic[Math.floor(Math.random() * generic.length)];
      f.barkTimer = 2.2;
    }
    this.emitHud();
  }

  /** Fala engraçada de verdade (áudios da família) para um momento da luta; evita repetir a última. */
  private funSay(f: FighterRuntime, trigger: FunTrigger, opp?: FighterRuntime, delayMs = 0): boolean {
    // golpes comuns (derrubada, vida baixa) falam sem legenda: legenda fica para especiais, intro, provocação e vitória
    const caption = trigger !== 'knockdownOpp' && trigger !== 'lowHp';
    const set = FUN_LINES[f.id];
    if (!set) return false;
    let pool: string[] = [];
    if (opp && (trigger === 'intro' || trigger === 'taunt') && set.vs?.[opp.id] && Math.random() < 0.65) pool = set.vs[opp.id]!;
    if (opp && trigger === 'win' && set.winVs?.[opp.id]) pool = set.winVs[opp.id]!;
    if (!pool.length) pool = set.lines[trigger] ?? [];
    if (!pool.length) return false;
    const options = pool.length > 1 ? pool.filter((k) => k !== f.lastFunKey) : pool;
    const key = options[Math.floor(Math.random() * options.length)];
    f.lastFunKey = key;
    if (delayMs > 0) {
      setTimeout(() => {
        if (!this.disposed && this.fighters) this.speak(f, f.id, key, 0, caption);
      }, delayMs);
      return true;
    }
    return this.speak(f, f.id, key, 0, caption);
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

    // golpe cômico cinematográfico: Frente + Leve juntos (cada lutador tem o seu)
    const fin = spec.moves.gag;
    if (btn === 'light' && f.y <= 0.08 && fin?.finisher && this.isHeld(f.index, f.facing === 1 ? 'right' : 'left')) {
      this.startAttackMove(f, fin, 'gag');
      return;
    }

    if (f.y > 0.08) {
      this.startAttackMove(f, spec.moves.air, 'air');
    } else if (this.isHeld(f.index, 'down')) {
      // golpes baixos: só são defendidos agachado
      const low = lowMoves(f.id);
      this.startAttackMove(f, btn === 'light' ? low.light : low.heavy, btn === 'light' ? 'lowLight' : 'lowHeavy');
    } else {
      this.startAttackMove(f, btn === 'light' ? spec.moves.light : spec.moves.heavy, btn);
    }
  }

  private startAttackMove(f: FighterRuntime, move: MoveSpec, commandId: string | null = null) {
    f.commandId = commandId;
    if (this.gameMode === 'training' && f.index === 0 && move.damage > 0) {
      this.trainingStats.lastMove = { name: move.label, ...moveFrames(move) };
    }
    f.state = 'attack';
    f.stateTimer = 0;
    f.activeMove = move;
    f.activeMoveAnim = move.anim;
    f.moveElapsed = 0;
    f.moveHitConnected = false;
    f.bufferedAttack = null;
    if (move.lunge) {
      f.vx = f.facing * move.lunge;
    }
    soundEngine.playSwing(Boolean(move.heavy));
    if (move.finisher) this.beginFinisher(f, move);
  }

  /**
   * Golpe de finalização de combo (não gasta especial): câmera de foco baixa e próxima,
   * faixa com o nome do golpe, fala própria e o efeito do golpe.
   */
  /** Fecha o TERMINA ELE!: com golpe cômico vira HUMILHAÇÃO!, senão é um nocaute normal. */
  private endFinish(humiliation: boolean) {
    if (!this.fighters || this.finishWinner === null) return;
    const winner = this.fighters[this.finishWinner];
    const loser = this.fighters[this.finishWinner === 0 ? 1 : 0];
    this.finishWinner = null;
    this.finishTimer = 0;
    loser.state = 'knockdown';
    loser.stateTimer = 0;
    loser.noGuardTimer = 0;
    loser.rig.hitFlashTimer = 0.15;
    winner.state = 'victory';
    winner.stateTimer = 0;
    winner.activeMove = null;
    winner.activeMoveAnim = undefined;
    this.matchPhase = 'ko';
    this.phaseTimer = humiliation ? 3.0 : 2.0;
    this.shakeTimer = 0.25;
    this.shakeAmp = 0.18;
    soundEngine.playHit(true, false);
    if (humiliation) {
      this.bannerText = 'HUMILHAÇÃO!';
      soundEngine.playClip('narrator', 'humilhacao', 0);
      this.spawnSparks(loser.x, loser.y + 1.6, 0xfde047, 14);
    } else {
      this.bannerText = 'K.O.!';
    }
    this.setBark(winner, 'win');
    this.emitHud();
  }

  private beginFinisher(f: FighterRuntime, move: MoveSpec) {
    if (this.finishWinner === f.index) this.finishGagUsed = true;
    // golpe cômico é golpe comum: sem foco de câmera, câmera lenta, faixa ou legenda (isso é só dos especiais)
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.05);
    const gag = move.finisher!;
    const voiceKey = gag === 'arroz' ? 'arrozQueimado' : gag;
    this.speak(f, f.id, voiceKey, 0, false);
    const t0 = move.startup;
    const handY = f.y + 1.4;
    f.bundadaFxDone = false;
    switch (gag) {
      case 'bundada':
        this.spawnSparks(f.x, f.y + 1.0, 0xff6fd8, 14, true);
        break;
      case 'cigarro':
        for (let i = 0; i < 5; i++) {
          const last = i === 4;
          this.spawnProjectile('cigarette', f, 12.5, 0, last ? 22 : 14, last, 0.34, 0, undefined, 1.35 + (i % 3) * 0.2, t0 + i * 0.09);
        }
        break;
      case 'chinelo': {
        const p = this.spawnProjectile('chinelo', f, 11, 0, 72, true, 0.36, 0, undefined, handY, t0);
        p.boomerang = 0.62;
        break;
      }
      case 'pizza':
        this.spawnProjectile('pizza', f, 9.5, 0, 76, true, 0.44, 0, undefined, handY + 0.05, t0);
        break;
      case 'conta3':
        this.spawnProjectile('count1', f, 7, 0, 12, false, 0.4, 0, undefined, handY, t0);
        this.spawnProjectile('count2', f, 7, 0, 12, false, 0.42, 0, undefined, handY, t0 + 0.45);
        this.spawnProjectile('count3', f, 8.5, 0, 56, true, 0.5, 0, undefined, handY, t0 + 0.9);
        break;
      case 'selfie':
        break;
      case 'panela': {
        const p = this.spawnProjectile('pan', f, 0, -1, 74, true, 0.45, 26, undefined, undefined, t0);
        p.dropOnTarget = true;
        break;
      }
      case 'arroz':
        this.spawnSparks(f.x + f.facing * 0.8, handY, 0x292524, 10);
        for (let i = 0; i < 10; i++) {
          this.spawnProjectile('rice', f, 8 + Math.random() * 4.5, 0.8 + Math.random() * 3.8, 8, false, 0.2, 9, undefined, handY - 0.1 + Math.random() * 0.3, t0 + i * 0.03);
        }
        break;
      case 'controle':
        this.spawnProjectile('controller', f, 10, 3.4, 66, true, 0.38, 9, undefined, handY, t0);
        break;
    }
    this.emitHud();
  }

  /** Reação cômica quando um objeto acerta: onomatopeia, som e estrelinhas. */
  private gagImpact(kind: ProjectileKind, x: number, y: number, target: FighterRuntime) {
    const pops: Partial<Record<ProjectileKind, [string, string]>> = {
      chinelo: ['PAFT!', '#60a5fa'],
      pizza: ['SPLAT!', '#fbbf24'],
      pan: ['BOING!', '#e5e7eb'],
      controller: ['LAG!', '#a78bfa'],
      count3: ['TRÊS!!', '#ef4444'],
    };
    const pop = pops[kind];
    if (!pop) return;
    this.spawnPop(pop[0], x, Math.min(y + 0.5, 1.9), pop[1]);
    if (kind === 'pan' || kind === 'chinelo') soundEngine.playBoing();
    if (kind === 'pan' || kind === 'controller') {
      // fica tonto: estrelinhas e um tempinho a mais parado
      this.spawnSparks(target.x, target.y + 2.0, 0xfde047, 12);
      if (target.state === 'hitstun') target.stateTimer = -0.5;
    }
  }

  private spawnPop(text: string, x: number, y: number, color: string) {
    // uma onomatopeia por vez: a nova substitui a anterior (tela limpa)
    for (const t of this.popTexts) this.scene.remove(t.sprite);
    this.popTexts = [];
    const sprite = buildPopText(text, color);
    sprite.position.set(x, y, 0.3);
    this.scene.add(sprite);
    this.popTexts.push({ sprite, life: 0.95 });
  }

  private stepFinish(dt: number, f1: FighterRuntime, f2: FighterRuntime) {
    const winner = this.finishWinner === 0 ? f1 : f2;
    const loser = this.finishWinner === 0 ? f2 : f1;
    this.finishTimer -= dt;
    loser.state = 'hitstun';
    loser.stateTimer = -99;
    loser.vx *= Math.exp(-8 * dt);
    if (Math.random() < dt * 3) this.spawnSparks(loser.x, loser.y + 2.05, 0xfde047, 2);
    // CPU vencedora: chega perto (se o golpe for corpo a corpo) e solta o golpe cômico
    if (this.gameMode === 'cpu' && winner.index === 1 && winner.state !== 'attack' && this.finishTimer < 3.8) {
      const gag = FIGHTERS[winner.id].moves.gag;
      const melee = gag?.finisher === 'bundada' || gag?.finisher === 'selfie';
      const dist = Math.abs(winner.x - loser.x);
      if (gag && (!melee || dist <= 2.2)) this.startAttackMove(winner, gag);
      else winner.aiAction = 'approach';
    }
    this.stepFighter(winner, loser, dt, this.gameMode === 'cpu' && winner.index === 1);
    this.resolveBodyPush(f1, f2);
    this.stepProjectiles(dt);
    this.stepCameos(dt);
    this.stepPopTexts(dt);
    if (this.finishTimer <= 0 && this.finishWinner !== null) this.endFinish(false);
  }

  private stepChatter(dt: number) {
    if (!this.fighters) return;
    this.chatterTimer -= dt;
    if (this.chatterTimer > 0) return;
    this.chatterTimer = 22 + Math.random() * 12;
    const now = performance.now();
    const quiet = this.fighters.every((x) => !x.barkVoicedAt || now - x.barkVoicedAt > 5000);
    if (!quiet || this.fighters.some((x) => x.id === 'davi')) return;
    const talkers = this.fighters.filter((x) => FUN_LINES[x.id] && !['knockdown', 'victory', 'transform'].includes(x.state));
    if (!talkers.length) return;
    const f = talkers[Math.floor(Math.random() * talkers.length)];
    this.funSay(f, 'taunt', this.fighters[f.index === 0 ? 1 : 0]);
  }

  private stepPopTexts(dt: number) {
    for (let i = this.popTexts.length - 1; i >= 0; i--) {
      const t = this.popTexts[i];
      t.life -= dt;
      t.sprite.position.y += dt * 0.4;
      const k = Math.min(1, (0.95 - t.life) / 0.12);
      const s = 0.6 + 0.4 * k + Math.max(0, 0.15 * Math.sin(k * Math.PI));
      t.sprite.scale.set(1.45 * s, 1.45 * (180 / 512) * s, 1);
      (t.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, t.life / 0.3);
      if (t.life <= 0) {
        this.scene.remove(t.sprite);
        (t.sprite.material as THREE.SpriteMaterial).dispose();
        this.popTexts.splice(i, 1);
      }
    }
  }

  private setBark(f: FighterRuntime, category: 'special' | 'subSpecial' | 'win') {
    if (f.barkVoicedAt && performance.now() - f.barkVoicedAt < 400) return;
    const lines = FIGHTER_BARKS[f.id][category];
    if (!lines || !lines.length) return;
    f.bark = lines[Math.floor(Math.random() * lines.length)];
    f.barkTimer = 2.1;
  }

  /**
   * Cena do especial: congela a luta, aproxima a câmera de quem soltou e mostra a faixa
   * com retrato e nome do golpe. Sub-especial (50%) usa só um flash curto.
   */
  private beginSuperCutin(f: FighterRuntime, full: boolean) {
    const fd = FIGHTERS[f.id];
    // estilo Mortal Kombat: durante o especial o adversário não consegue defender, só atacar
    const opp = this.fighters?.[f.index === 0 ? 1 : 0];
    if (opp) {
      opp.noGuardTimer = full ? 3.4 : 2.6;
      if (opp.state === 'guard' || opp.state === 'blockstun') {
        opp.state = 'idle';
        opp.stateTimer = 0;
      }
      this.spawnPop('SEM DEFESA!', opp.x, opp.y + 1.85, '#f87171');
    }
    const freeze = full ? 0.62 : 0.18;
    this.hitstopTimer = Math.max(this.hitstopTimer, freeze);
    this.superTimer = this.superDuration = full ? 0.95 : 0.3;
    this.superFocusX = f.x;
    this.superKey++;
    this.superCutin = {
      slot: f.index === 0 ? 'p1' : 'p2',
      fighterId: f.id,
      name: fd.name,
      move: full ? this.specialMoveName(f) : fd.subSpecialName,
      full,
      key: this.superKey,
    };
    this.superCutinTimer = full ? 1.15 : 0.55;
    if (full) { this.shakeTimer = 0.12; this.shakeAmp = 0.05; }
    this.emitHud();
  }

  /** Nome do especial que vai sair agora (vários têm duas versões "A / B"). */
  private specialMoveName(f: FighterRuntime): string {
    const parts = FIGHTERS[f.id].specialName.split(' / ');
    if (parts.length < 2) return parts[0];
    const second =
      (f.id === 'carlos' && f.nextCarlosForm === 'crente') ||
      (f.id === 'pedro' && f.form === 'hulk') ||
      (f.id === 'davi' && f.form === 'daviPurple');
    return second ? parts[1] : parts[0];
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
      if (this.gameMode === 'training' && f.index === 0) this.trainingStats.done.add(isSub ? 'subSpecial' : 'special');
      this.beginSuperCutin(f, !isSub);
      if (isSub) {
        soundEngine.playDaviSpecial('purple');
        this.activateTransform(f, 'daviPurple', 10);
        this.setBark(f, 'subSpecial');
        this.speak(f, 'davi', 'preguica', 2500);
      } else {
        const finisher = f.form === 'daviPurple';
        soundEngine.playDaviSpecial(finisher ? 'final' : 'hearts');
        if (!finisher) {
          f.form = 'daviPurple';
          f.formTimer = 8;
        }
        if (!finisher) this.setBark(f, 'special');
        if (!this.speak(f, 'davi', finisher ? 'videogame' : 'outra', finisher ? 0 : 2500) && finisher) {
          // voz ocupada: mostra a frase do golpe final mesmo assim
          f.bark = clipText('davi', 'videogame') ?? 'Vamos jogar videogame.';
          f.barkTimer = 2.4;
        }
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
    if (this.gameMode === 'training' && f.index === 0) this.trainingStats.done.add(actualSub ? 'subSpecial' : 'special');
    soundEngine.playSpecial();
    this.beginSuperCutin(f, !actualSub);
    let moveAnim: string | undefined;

    if (f.id === 'juraci') {
      moveAnim = 'special';
      if (!actualSub) {
        this.setBark(f, 'special');
        this.castVoice(f, 'special');
        this.spawnProjectile('cake', f, 10.5, 0, 155, true, 0.44, 0);
      } else {
        this.setBark(f, 'subSpecial');
        this.castVoice(f, 'subSpecial');
        this.spawnCameo('dada', f);
      }
    } else if (f.id === 'carlos') {
      if (!actualSub) {
        const next = f.nextCarlosForm;
        f.nextCarlosForm = next === 'gordao' ? 'crente' : 'gordao';
        this.activateTransform(f, next, 10);
        if (next === 'crente') {
          soundEngine.playBless();
          // fala própria do Modo Fé (se o arquivo existir); nunca a fala do Gordão
          if (!this.speak(f, 'carlos', 'fe')) {
            f.bark = 'Modo Fé ativado!';
            f.barkTimer = 2.2;
          }
        } else {
          this.setBark(f, 'special');
          this.castVoice(f, 'special');
        }
      } else {
        moveAnim = 'special';
        this.setBark(f, 'subSpecial');
        this.castVoice(f, 'subSpecial');
        this.spawnProjectile('notes', f, 9.0, 0, 85, false, 0.4, 0);
      }
    } else if (f.id === 'pedro') {
      if (!actualSub) {
        if (f.form === 'hulk') {
          moveAnim = 'hulkBlast';
          this.setBark(f, 'special');
          this.castVoice(f, 'special');
          this.spawnProjectile('beerBlast', f, 11.5, 0, 130, true, 0.46, 0);
        } else {
          this.activateTransform(f, 'hulk', 10);
          this.moveVoice(f, actualSub, 'drink');
          this.setBark(f, 'special');
        }
      } else {
        moveAnim = 'smoke';
        this.setBark(f, 'subSpecial');
        this.castVoice(f, 'subSpecial');
        this.spawnProjectile('smoke', f, 6.2, 0, 75, false, 0.46, 0);
      }
    } else if (f.id === 'daniel') {
      if (!actualSub) {
        this.activateTransform(f, 'praia', 10);
        this.moveVoice(f, actualSub, 'praia');
        this.setBark(f, 'special');
        this.spawnCameo('dog', f);
      } else {
        moveAnim = 'dance';
        this.castVoice(f, 'subSpecial');
        this.setBark(f, 'subSpecial');
        this.spawnProjectile('notes', f, 9.6, 0, 78, false, 0.38, 0);
      }
    } else if (f.id === 'franciely') {
      if (!actualSub) {
        this.activateTransform(f, 'brava', 10);
        this.castVoice(f, 'special');
        this.setBark(f, 'special');
      } else {
        moveAnim = 'mama';
        this.castVoice(f, 'subSpecial');
        this.setBark(f, 'subSpecial');
        this.spawnProjectile('milk', f, 11.8, 0, 82, false, 0.38, 0);
      }
    } else if (f.id === 'gabi') {
      moveAnim = 'dance';
      if (!actualSub) {
        this.setBark(f, 'special');
        this.castVoice(f, 'special');
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
        this.moveVoice(f, actualSub, 'sing');
        this.spawnProjectile('notes', f, 9.5, 0, 80, false, 0.4, 0);
      }
    } else if (f.id === 'paula') {
      if (!actualSub) {
        moveAnim = 'special';
        this.setBark(f, 'special');
        this.moveVoice(f, actualSub, 'lunch');
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
        this.castVoice(f, 'subSpecial');
        this.setBark(f, 'subSpecial');
      }
    } else if (f.id === 'tainara') {
      if (!actualSub) {
        this.activateTransform(f, 'ricePower', 10);
        this.moveVoice(f, actualSub, 'arroz');
        this.setBark(f, 'special');
      } else {
        moveAnim = 'special';
        this.moveVoice(f, actualSub, 'cuidado');
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
    this.funSay(f, 'transform', undefined, 2600);
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
    overrideY?: number,
    delay = 0
  ) {
    const mesh = buildProjectileMesh(kind);
    setProjectileFacing(mesh, owner.facing);
    const startX = overrideX ?? owner.x + owner.facing * 0.85;
    const startY = overrideY ?? owner.y + 1.15;
    mesh.position.set(startX, startY, 0.08);
    this.scene.add(mesh);

    const proj: ActiveProjectile = {
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
      life: 2.3 + delay,
      gravity,
      delay,
      age: 0,
    };
    this.projectiles.push(proj);
    if (delay > 0) mesh.visible = false;
    return proj;
  }

  private spawnCameo(kind: 'dog' | 'dada' | 'kid', owner: FighterRuntime) {
    const mesh = buildCameoMesh(kind, this.shadowTex);
    const startX = Math.max(-ARENA_HALF_W, Math.min(ARENA_HALF_W, owner.x - owner.facing * 2.2));
    mesh.position.set(startX, 0, kind === 'kid' ? 0.35 : 0.18);
    updateCameoVisual(mesh, kind === 'dog' ? 'dog_run' : kind, owner.facing);
    this.scene.add(mesh);

    // a participação responde logo depois da fala do dono do golpe, sem atropelar
    const who = kind === 'dog' ? 'cao' : kind === 'dada' ? 'dada' : null;
    if (who) {
      const key = kind === 'dog' ? (Math.random() < 0.5 ? 'protect' : 'lick') : 'reply';
      setTimeout(() => {
        if (!this.disposed) this.speak(owner, who, key, 0);
      }, 1700);
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

  private spawnBurst(x: number, y: number) {
    const mesh = buildBurstMesh();
    mesh.position.set(x, y, 0.25);
    this.scene.add(mesh);
    this.bursts.push({ mesh, life: 0.24, maxLife: 0.24 });
  }

  private sparkMaterial(colorHex: number, hearts: boolean): THREE.MeshBasicMaterial {
    const key = `${colorHex}:${hearts ? 1 : 0}`;
    let mat = this.sparkMats.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color: colorHex, side: hearts ? THREE.DoubleSide : THREE.FrontSide });
      this.sparkMats.set(key, mat);
    }
    return mat;
  }

  private releaseSpark(m: THREE.Mesh) {
    this.scene.remove(m);
    if (this.sparkPool.length < 160) this.sparkPool.push(m);
  }

  /** Tira um efeito de cena e libera geometria/material (texturas são compartilhadas e ficam). */
  private removeFx(obj: THREE.Object3D) {
    this.scene.remove(obj);
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry && mesh.geometry !== this.sparkGeo && mesh.geometry !== this.heartGeo) mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m?.dispose();
    });
  }

  /**
   * Compila antes da luta os shaders de faísca, explosão e projéteis destes lutadores,
   * para o primeiro golpe forte/especial não travar a tela.
   */
  private warmupEffects(kinds: ProjectileKind[]) {
    const holder = new THREE.Group();
    holder.position.set(0, -50, 0);
    holder.add(buildBurstMesh());
    for (const k of kinds) holder.add(buildProjectileMesh(k));
    for (const hex of [0x93c5fd, 0xff9f1c, 0xfef08a]) holder.add(new THREE.Mesh(this.sparkGeo, this.sparkMaterial(hex, false)));
    holder.add(new THREE.Mesh(this.heartGeo, this.sparkMaterial(0xec4899, true)));
    this.scene.add(holder);
    try {
      this.renderer.compile(this.scene, this.camera);
      // texturas dos efeitos: envia para a GPU já (quando a imagem terminar de baixar)
      const maps = new Set<THREE.Texture>();
      holder.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
        if (mat && !Array.isArray(mat) && mat.map) maps.add(mat.map);
      });
      const upload = (tex: THREE.Texture, tries: number) => {
        const img = tex.image as { complete?: boolean; width?: number } | undefined;
        if (img && (img.complete || img.width)) this.renderer.initTexture(tex);
        else if (tries > 0 && !this.disposed) setTimeout(() => upload(tex, tries - 1), 250);
      };
      for (const tex of maps) upload(tex, 40);
    } finally {
      // Fica fora de cena mas NÃO é liberado: enquanto estes materiais existirem, o three.js
      // mantém os shaders compilados, e os efeitos criados durante a luta reaproveitam.
      this.scene.remove(holder);
      if (this.fxKeepAlive) this.removeFx(this.fxKeepAlive);
      this.fxKeepAlive = holder;
    }
  }

  /** Envia para a GPU, antes da luta, os atlas dos lutadores (golpes, especiais, transformações). */
  private warmupFighterTextures() {
    if (!this.fighters) return;
    const texs: (THREE.Texture | undefined)[] = [];
    for (const f of this.fighters) {
      const r = f.rig;
      texs.push(r.atlasTex, r.atlasHdTex, r.atlasHd2Tex, r.atlasHd3Tex, r.atlasHd4Tex, r.atlasHd6Tex, r.daviTex);
    }
    const upload = (tex: THREE.Texture, tries: number) => {
      const img = tex.image as { complete?: boolean; width?: number } | undefined;
      if (img && (img.complete || img.width)) this.renderer.initTexture(tex);
      else if (tries > 0 && !this.disposed) setTimeout(() => upload(tex, tries - 1), 250);
    };
    for (const t of new Set(texs)) if (t) upload(t, 40);
  }

  private spawnSparks(x: number, y: number, colorHex: number, count = 10, hearts = false) {
    const mat = this.sparkMaterial(colorHex, hearts);
    const geo = hearts ? this.heartGeo : this.sparkGeo;
    for (let i = 0; i < count; i++) {
      const pooled = this.sparkPool.pop();
      const m = pooled ?? new THREE.Mesh(geo, mat);
      m.geometry = geo;
      m.material = mat;
      m.scale.setScalar(1);
      m.position.set(x, y, (Math.random() - 0.5) * 0.4);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.2;
      this.sparks.push({
        mesh: m,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd + 1.5,
        vz: (Math.random() - 0.5) * 2.5,
        life: 0.36 + Math.random() * 0.18,
        maxLife: 0.5,
      });
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0, (now - this.lastTimestamp) / 1000);
      this.lastTimestamp = now;
      const dt = Math.min(rawDt, 0.05);

      this.step(dt);
      this.renderer.render(this.scene, this.camera);

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
        if (this.matchPhase === 'fighting') this.pressAction(p1, 'jump');
      });
      edge('light', btn(0), () => {
        if (this.matchPhase === 'intro') this.skipIntro();
        else if (this.matchPhase === 'fighting') this.pressAction(p1, 'light');
      });
      edge('heavy', btn(2), () => {
        if (this.matchPhase === 'fighting') this.pressAction(p1, 'heavy');
      });
      edge('special', btn(3), () => {
        if (this.matchPhase === 'fighting') this.pressAction(p1, 'special');
      });
      edge('taunt', btn(8), () => {
        if (this.matchPhase === 'fighting') this.pressAction(p1, 'taunt');
      });
      // L3 (analógico apertado): reinicia a posição no treino
      edge('reset', btn(10), () => {
        if (this.gameMode === 'training') this.resetTraining();
      });
    }
  }

  private step(dt: number) {
    if (this.slowmoTimer > 0 && !this.paused) {
      this.slowmoTimer = Math.max(0, this.slowmoTimer - dt);
      dt *= 0.5;
    }
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
          const nextLine = this.introQueue[this.introIndex];
          this.introLineTimer = nextLine.clip ? nextLine.clip.dur + 0.4 : 2.2;
          this.playIntroVoice(nextLine.speaker);
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

      if (this.finishWinner !== null) {
        this.stepFinish(dt, f1, f2);
      } else {
      this.stepChatter(dt);
      if (this.gameMode !== 'training') {
        this.roundTimer = Math.max(0, this.roundTimer - dt);
        const sec = Math.ceil(this.roundTimer);
        if (sec !== this.lastCountdownSec) {
          this.lastCountdownSec = sec;
          if (sec === 10 || (sec <= 5 && sec >= 1)) {
            soundEngine.playCountdown();
          }
          if (sec === 10 && this.fighters) {
            const who = this.fighters.find((x) => FUN_LINES[x.id]?.lines.timeLow);
            if (who) this.funSay(who, 'timeLow');
          }
        }
        if (this.roundTimer <= 0) {
          this.resolveTimeOver();
        }
      } else {
        this.stepTraining(dt, f1, f2);
      }

      const p2Cpu = this.gameMode === 'cpu' || (this.gameMode === 'training' && this.trainingOpts.dummy === 'cpu');
      if (p2Cpu) this.updateCpuAi(f2, f1, dt);
      this.stepFighter(f1, f2, dt, false);
      this.stepFighter(f2, f1, dt, p2Cpu);
      this.resolveBodyPush(f1, f2);
      this.stepProjectiles(dt);
      this.stepCameos(dt);
      this.stepPopTexts(dt);
      }
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
    if (f.state === 'blockstun' && f.lowGuard) return 'crouch';
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
    if (this.gameMode !== 'cpu' && this.gameMode !== 'training') return;
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
    if (cpu.noGuardTimer > 0 && cpu.state !== 'attack') {
      // sem defesa: a única saída é atacar para interromper o especial
      if (dist <= 2.2) this.tryAttack(cpu, Math.random() < 0.5 ? 'light' : 'heavy');
      else cpu.aiAction = 'approach';
    }
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
        } else if (
          FIGHTERS[cpu.id].moves.gag &&
          (['bundada', 'selfie'].includes(FIGHTERS[cpu.id].moves.gag!.finisher!) ? dist <= 2.4 : dist > 2.4 && dist < 7.5) &&
          Math.random() < aggr * 0.1
        ) {
          // golpe cômico da CPU (bundada/selfie de perto, os arremessos de longe)
          this.startAttackMove(cpu, FIGHTERS[cpu.id].moves.gag!);
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
    if (f.inputBuffer) {
      if (this.worldTime - f.inputBuffer.t > 0.15) f.inputBuffer = null;
      else if (!['attack', 'hitstun', 'blockstun', 'knockdown', 'transform', 'victory'].includes(f.state)) {
        const a = f.inputBuffer.action;
        f.inputBuffer = null;
        this.performAction(f, a);
      }
    }
    f.noGuardTimer = Math.max(0, f.noGuardTimer - dt);
    f.tauntCooldown = Math.max(0, f.tauntCooldown - dt);
    if (f.id === 'davi' && this.matchPhase === 'fighting') {
      f.daviVoiceCooldown = Math.max(0, f.daviVoiceCooldown - dt);
      f.daviSpecialCooldown = Math.max(0, f.daviSpecialCooldown - dt);
      f.daviIdleTime = f.state === 'idle' ? f.daviIdleTime + dt : 0;
      if (f.daviIdleTime >= 8 && f.daviVoiceCooldown === 0) {
        f.daviVoiceCooldown = 20;
        f.daviIdleTime = 0;
        this.speak(f, 'davi', 'preguica', 2500);
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
      if (f.stateTimer >= (f.stunDuration || DEFAULT_HITSTUN)) {
        f.state = 'idle';
        f.lowGuard = false;
      }
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

      if (m.finisher === 'selfie' && !f.bundadaFxDone && f.moveElapsed >= activeStart) {
        // flash da selfie: cega quem estiver na frente (até uns 6,5 m) e deixa tonto
        f.bundadaFxDone = true;
        soundEngine.playShutter();
        this.flashKey++;
        this.emitHud();
        const d = (opp.x - f.x) * f.facing;
        if (d > 0 && d < 6.5 && Math.abs(opp.y - f.y) < 1.6) {
          this.applyHit(f, opp, 48, 1.2, 0.1, true, false);
          if (opp.state === 'hitstun') {
            opp.stateTimer = -1.0;
            this.spawnSparks(opp.x, opp.y + 2.0, 0xfde047, 14);
            this.spawnPop('TONTO!', opp.x, opp.y + 1.8, '#fde047');
          }
        }
      }
      if (f.activeMoveAnim === 'bundada' && !f.bundadaFxDone && f.moveElapsed >= activeStart) {
        // a bundada gigante bate no chão: onda rosa, tremor e poeira
        f.bundadaFxDone = true;
        const bx = f.x + f.facing * 1.1;
        this.spawnBurst(bx, f.y + 0.9);
        this.spawnSparks(bx, f.y + 0.9, 0xff6fd8, 22, true);
        this.spawnSparks(bx, f.y + 0.5, 0xffffff, 10);
        this.shakeTimer = 0.28;
        this.shakeAmp = 0.3;
        soundEngine.playSwing(true);
        this.spawnPop('BUNDADA!', bx, f.y + 1.75, '#f472b6');
      }

      if (!f.moveHitConnected && m.damage > 0 && f.moveElapsed >= activeStart && f.moveElapsed <= activeEnd) {
        const dist = Math.abs(opp.x - f.x);
        const dirToOpp = Math.sign(opp.x - f.x) || f.facing;
        const reach = m.range * formSpec.reach;
        if (dirToOpp === f.facing && dist >= m.minRange && dist <= reach && Math.abs(opp.y - f.y) < 1.55) {
          this.applyHit(f, opp, m.damage * formSpec.atk, m.push * formSpec.push, m.hitstop, Boolean(m.heavy), Boolean(m.knockdown), m);
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
          this.startAttackMove(f, nextMove, next === 'medium' ? 'chainMedium' : 'chainHeavy');
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
        if (wantGuard && f.noGuardTimer <= 0) {
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
    knockdown: boolean,
    move?: MoveSpec
  ) {
    if (def.hitInvuln > 0 || this.matchPhase !== 'fighting') return;
    if (this.finishWinner !== null) {
      // durante o TERMINA ELE! só o vencedor bate, e o golpe encerra a partida
      if (att.index === this.finishWinner) this.endFinish(this.finishGagUsed);
      return;
    }

    const standingGuard =
      def.noGuardTimer <= 0 &&
      (def.state === 'guard' ||
      def.state === 'blockstun' ||
      (def.y <= 0.02 &&
        def.state !== 'attack' &&
        def.state !== 'hitstun' &&
        def.state !== 'knockdown' &&
        ((def.facing === 1 && this.isHeld(def.index, 'left')) ||
          (def.facing === -1 && this.isHeld(def.index, 'right')))));
    // golpe baixo só é defendido agachado (baixo + defesa); boneco do treino em "Defende tudo" defende qualquer um
    const dummyAll = this.isTrainingDummy(def) && (this.trainingOpts.dummy === 'guard' || (this.trainingOpts.dummy === 'guardAfterHit' && this.dummyGuardTimer > 0));
    const crouching = this.isHeld(def.index, 'down') || def.state === 'crouch';
    const isBlocking =
      (standingGuard && (!move?.low || crouching || dummyAll)) ||
      (dummyAll && def.noGuardTimer <= 0 && def.y <= 0.02 && !['attack', 'hitstun', 'knockdown'].includes(def.state));
    def.lowGuard = isBlocking && Boolean(move?.low);
    def.stunDuration = Math.max(0.16, (isBlocking ? move?.blockstun : move?.hitstun) || DEFAULT_HITSTUN);

    const defMult = FORMS[def.form].def;
    // escala de combo (padrão de jogo de luta): a partir do 3º acerto seguido cada golpe tira 10% menos, mínimo 55%
    const comboScale = isBlocking ? 1 : Math.max(0.55, 1 - Math.max(0, att.comboCount - 1) * 0.1);
    const dmg = Math.round(rawDamage * defMult * comboScale * (isBlocking ? 0.22 : 1));
    def.hp = Math.max(0, def.hp - dmg);
    def.vx = att.facing * push * (isBlocking ? 0.65 : 1);
    // defesa empurra os dois: quem defende não fica preso na parede de golpes
    if (isBlocking && Math.abs(att.x - def.x) < 2.4) att.vx = -att.facing * push * 0.45;

    att.meter = Math.min(100, att.meter + (isBlocking ? 7 : 15));
    def.meter = Math.min(100, def.meter + 8);

    if (isBlocking) {
      def.state = 'blockstun';
      def.stateTimer = 0;
      soundEngine.playHit(heavy, true);
      this.spawnSparks(def.x - att.facing * 0.25, def.y + 1.15, 0x93c5fd, 4);
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
      this.hitstopTimer = Math.max(this.hitstopTimer, hitstop);
      // tremor só em golpe forte/derrubada; golpe leve fica limpo (o flash branco já marca o acerto)
      if (heavy || knockdown) {
        this.shakeTimer = knockdown ? 0.16 : 0.1;
        this.shakeAmp = knockdown ? 0.14 : 0.08;
      }
      const hx = def.x - att.facing * 0.25;
      if (knockdown) this.spawnBurst(hx, def.y + 1.15);
      this.spawnSparks(hx, def.y + 1.15, heavy ? 0xffb347 : 0xfef3c7, heavy ? 7 : 4);
    }

    if (def.hp > 0 && def.state === 'knockdown' && Math.random() < 0.45) {
      this.funSay(att, 'knockdownOpp', def, 450);
    }
    if (def.hp > 0 && !def.lowHpSaid && def.hp / def.maxHp < 0.25) {
      def.lowHpSaid = true;
      this.funSay(def, 'lowHp', att, 350);
    }

    if (this.gameMode === 'training') this.noteTrainingHit(att, def, dmg, isBlocking, move);

    if (def.hp <= 0 && this.gameMode !== 'training') {
      this.triggerKO(att, def);
    }
    this.emitHud();
  }

  private isTrainingDummy(f: FighterRuntime) {
    return this.gameMode === 'training' && f.index === 1;
  }

  private noteTrainingHit(att: FighterRuntime, def: FighterRuntime, dmg: number, blocked: boolean, move?: MoveSpec) {
    if (def.hp <= 0) def.hp = 1;
    if (this.isTrainingDummy(def) && this.trainingOpts.dummy === 'guardAfterHit') this.dummyGuardTimer = 1.0;
    if (att.index !== 0) return;
    const st = this.trainingStats;
    if (att.commandId) st.done.add(att.commandId);
    if (move) st.lastResult = { kind: blocked ? 'block' : 'hit', advantage: move.knockdown && !blocked ? 99 : frameAdvantage(move, blocked) };
    if (!blocked) {
      if (att.comboCount <= 1) st.combo = { hits: 0, damage: 0 };
      st.combo.hits = att.comboCount;
      st.combo.damage += dmg;
      st.best = { hits: Math.max(st.best.hits, st.combo.hits), damage: Math.max(st.best.damage, st.combo.damage) };
    }
    this.trainingCalm = 0;
  }

  /** Boneco do treino: o que ele segura e como se recupera. */
  private stepTraining(dt: number, f1: FighterRuntime, f2: FighterRuntime) {
    const o = this.trainingOpts;
    this.dummyGuardTimer = Math.max(0, this.dummyGuardTimer - dt);
    if (o.infiniteMeter) f1.meter = 100;
    f2.meter = Math.min(100, f2.meter + dt * 20);
    if (o.dummy === 'jump' && f2.y <= 0.02 && (f2.state === 'idle' || f2.state === 'move')) {
      this.dummyJumpTimer -= dt;
      if (this.dummyJumpTimer <= 0) {
        this.dummyJumpTimer = 0.9;
        this.tryJump(f2);
      }
    }
    // vida volta quando ninguém está apanhando há 1 s
    const busy = (f: FighterRuntime) => ['hitstun', 'blockstun', 'knockdown'].includes(f.state);
    this.trainingCalm = busy(f1) || busy(f2) ? 0 : this.trainingCalm + dt;
    if (this.trainingCalm >= 1 && o.refill) {
      f1.hp = f1.maxHp;
      f2.hp = f2.maxHp;
    }
    if (f1.state === 'guard' || f1.state === 'blockstun') this.trainingStats.done.add('guard');
    if (f1.y > 0.3) this.trainingStats.done.add('jump');
  }

  private stepProjectiles(dt: number) {
    if (!this.fighters) return;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.delay && p.delay > 0) {
        p.delay -= dt;
        p.life -= dt;
        const owner = this.fighters[p.ownerIndex];
        if (p.delay > 0) continue;
        // sai da mão de quem lançou, onde ele estiver agora
        p.facing = owner.facing;
        p.vx = Math.abs(p.vx) * owner.facing;
        p.x = owner.x + owner.facing * 0.85;
        if (p.dropOnTarget) {
          const tgt = this.fighters[p.ownerIndex === 0 ? 1 : 0];
          p.x = tgt.x;
          p.y = tgt.y + 4.4;
        }
        setProjectileFacing(p.mesh, owner.facing);
        p.mesh.visible = true;
        soundEngine.playSwing(p.kind === 'pan');
      }
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.mesh.position.set(p.x, p.y, 0.08);
      p.age = (p.age ?? 0) + dt;
      if (p.boomerang && !p.returned && p.age >= p.boomerang) {
        // o chinelo faz a curva e volta para a mão de quem jogou
        p.returned = true;
        p.vx = -p.vx;
        p.facing = (p.facing * -1) as 1 | -1;
      }
      if (p.kind === 'cigarette') {
        p.mesh.rotation.z = Math.sin(this.worldTime * 18 + i * 1.7) * 0.05;
        p.mesh.position.y = p.y + Math.sin(this.worldTime * 9 + i) * 0.05;
      } else if (p.kind === 'chinelo' || p.kind === 'controller' || p.kind === 'rice') {
        p.mesh.rotation.z -= dt * (p.kind === 'chinelo' ? 20 : 11) * p.facing;
      } else if (p.kind === 'pizza') {
        p.mesh.rotation.z -= dt * 13 * p.facing;
        p.mesh.position.y = p.y + Math.sin(p.age * 14) * 0.06;
      } else if (p.kind === 'pan') {
        p.mesh.rotation.z = Math.PI + Math.sin(p.age * 20) * 0.08;
      } else if (p.kind === 'count1' || p.kind === 'count2' || p.kind === 'count3') {
        const pulse = 1 + Math.sin(p.age * 16) * 0.12;
        p.mesh.scale.set(pulse, pulse, 1);
      } else if (p.kind === 'cake' || p.kind === 'brigadeiro' || p.kind === 'food') {
        p.mesh.rotation.z += dt * 4.5 * p.facing;
      } else {
        p.mesh.rotation.z = Math.sin(this.worldTime * 10 + i) * 0.08;
      }

      const target = this.fighters[p.ownerIndex === 0 ? 1 : 0];
      const owner = this.fighters[p.ownerIndex];
      const hitDist = Math.hypot(p.x - target.x, p.y - (target.y + 1.0));
      // cigarros voam em alturas diferentes: acertam o corpo inteiro (canela até a cabeça)
      const bodyHit =
        ['cigarette', 'chinelo', 'pizza', 'pan', 'rice', 'controller', 'count1', 'count2', 'count3'].includes(p.kind) &&
        Math.abs(p.x - target.x) <= p.radius + 0.42 &&
        p.y >= target.y + 0.25 &&
        p.y <= target.y + 2.1;
      if (p.returned && Math.sign(owner.x - p.x) !== Math.sign(p.vx)) {
        // o chinelo voltou para a mão
        this.removeFx(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (bodyHit || hitDist <= p.radius + 0.48) {
        this.spawnBurst(p.x, p.y);
        this.applyHit(owner, target, p.damage, 4.2, 0.08, true, p.knockdown);
        this.gagImpact(p.kind, p.x, p.y, target);
        this.removeFx(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.life <= 0 || Math.abs(p.x) > 12 || p.y < 0.05) {
        this.removeFx(p.mesh);
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
        this.removeFx(c.mesh);
        this.cameos.splice(i, 1);
      }
    }
  }

  private triggerKO(winner: FighterRuntime, loser: FighterRuntime) {
    // nocaute que decide a partida: TERMINA ELE! (o perdedor fica tonto e o vencedor pode humilhar)
    if (this.finishWinner === null && winner.roundsWon + 1 >= 2 && this.gameMode !== 'training') {
      winner.roundsWon++;
      this.finishWinner = winner.index;
      this.finishTimer = 4.8;
      this.finishGagUsed = false;
      loser.hp = 0;
      loser.state = 'hitstun';
      loser.stateTimer = -99;
      loser.vx = 0;
      loser.activeMove = null;
      loser.activeMoveAnim = undefined;
      loser.noGuardTimer = 99;
      this.projectiles.forEach((p) => this.removeFx(p.mesh));
      this.projectiles = [];
      this.bannerText = 'TERMINA ELE!';
      this.phaseTimer = 0;
      soundEngine.playKO();
      soundEngine.playClip('narrator', 'termina', 0);
      if (!this.funSay(loser, 'ko')) this.castVoice(loser, 'ko', 0);
      this.slowmoTimer = 0.5;
      this.emitHud();
      return;
    }
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
    if (!this.funSay(loser, 'ko')) this.castVoice(loser, 'ko', 0);
    if (FUN_LINES[winner.id]?.winVs?.[loser.id]) this.funSay(winner, 'win', loser, 1900);
    setTimeout(() => {
      if (!this.disposed) soundEngine.playClip('narrator', 'victory');
    }, 1100);
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
      const winnerF = this.fighters[this.winnerIndex];
      const loserF = this.fighters[this.winnerIndex === 0 ? 1 : 0];
      const funWin = !!FUN_LINES[winId] && !!(FUN_LINES[winId]!.winVs?.[loserF.id] || FUN_LINES[winId]!.lines.win) && Math.random() < 0.6;
      const wk = funWin ? null : (winClips[winId] && Math.random() < 0.4 ? winClips[winId] : castKeyVariant(winId, 'win'));
      if (funWin) this.funSay(winnerF, 'win', loserF, 700);
      if (wk) {
        setTimeout(() => {
          if (!this.disposed && this.fighters) this.speak(this.fighters.find((x) => x.id === winId) ?? this.fighters[0], winId, wk, 0);
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

    // especial: aproxima e centraliza em quem soltou o golpe, depois volta suave
    let camX = midX;
    let camZ = zDist;
    if (this.superTimer > 0) {
      this.superTimer = Math.max(0, this.superTimer - dt);
      const p = 1 - this.superTimer / Math.max(0.001, this.superDuration);
      const k = Math.sin(Math.min(1, p) * Math.PI);
      camX = THREE.MathUtils.lerp(midX, this.superFocusX, 0.75 * k);
      camZ = zDist * (1 - 0.28 * k);
    }
    const camDrop = 0;
    const camOrbit = 0;
    if (this.superCutinTimer > 0) {
      this.superCutinTimer = Math.max(0, this.superCutinTimer - dt);
      if (this.superCutinTimer === 0) {
        this.superCutin = null;
        this.emitHud();
      }
    }

    this._camTarget.set(
      camX * 0.85 + sx + camOrbit,
      1.74 + maxY * 0.32 + sy + Math.max(0, camZ - 10) * 0.11 - camDrop,
      camZ
    );
    this._camLook.set(camX * 0.9, 1.08 + maxY * 0.25, -0.4);
    this.camera.position.lerp(this._camTarget, 1 - Math.exp(-9 * dt));
    this.camera.lookAt(this._camLook);
    this.currentStage?.setParallax?.(this.camera.position.x);
  }

  private updateSparks(dt: number) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      const t = 1 - Math.max(0, b.life / b.maxLife);
      const sc = 0.7 + Math.sin(t * Math.PI) * 0.55;
      b.mesh.scale.setScalar(sc);
      if (b.life <= 0) {
        this.removeFx(b.mesh);
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
        this.releaseSpark(s.mesh);
        this.sparks.splice(i, 1);
      }
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
      superCutin: this.superCutin,
      cinematic: false,
      training:
        this.gameMode === 'training'
          ? {
              options: { ...this.trainingOpts },
              lastMove: this.trainingStats.lastMove,
              lastResult: this.trainingStats.lastResult,
              combo: { ...this.trainingStats.combo },
              best: { ...this.trainingStats.best },
              inputs: this.inputLog.slice(),
              done: [...this.trainingStats.done],
            }
          : null,
      flashKey: this.flashKey,
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
    for (const m of this.sparkMats.values()) m.dispose();
    if (this.fxKeepAlive) this.removeFx(this.fxKeepAlive);
    this.heartGeo.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
