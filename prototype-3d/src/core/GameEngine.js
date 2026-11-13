import * as THREE from 'three';
import { Renderer } from '../rendering/Renderer.js';
import { CameraController } from '../rendering/CameraController.js';
import { LightingSystem } from '../rendering/LightingSystem.js';
import { StageManager } from '../stages/StageManager.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { HUD } from '../ui/HUD.js';
import { GameLoop } from './GameLoop.js';

export class GameEngine {
  constructor({ mount, hudContainer }) {
    this.mount = mount;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b12);
    this.scene.fog = new THREE.Fog(0x070b12, 12, 30);

    this.renderer = new Renderer();
    this.renderer.domElement.setAttribute('aria-label', '3D arena canvas');
    this.mount.appendChild(this.renderer.domElement);
    this.cameraController = new CameraController();
    this.lighting = new LightingSystem(this.scene);
    this.stageManager = new StageManager(this.scene);
    this.hud = new HUD(hudContainer);
    this.combatSystem = new CombatSystem({ scene: this.scene, hud: this.hud });
    this.loop = new GameLoop((dt) => this.update(dt), () => this.render());
    this.resize();

    this.keyState = {};
    this.lastError = 'Nenhuma';
    this.bindInput();
    this.combatSystem.setupMatch();
    this.loop.start();
  }

  bindInput() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.keyState[key] = true;
      if (key === 'shift') this.keyState.shift = true;
      if (key === ' ') this.keyState['space'] = true;
      if (key === 'f3') {
        this.toggleDebug();
        event.preventDefault();
      }
      if (['w', 'a', 's', 'd', 'j', 'k', 'l'].includes(key)) event.preventDefault();
    });

    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      this.keyState[key] = false;
      if (key === 'shift') this.keyState.shift = false;
      if (key === ' ') this.keyState['space'] = false;
    });

    window.addEventListener('error', (event) => {
      this.lastError = event.message || 'Erro de runtime';
      this.hud.setDebugState(true, { lastError: this.lastError });
      console.error('Game error:', event.error || event.message);
    });
  }

  update(dt) {
    try {
      this.combatSystem.setKeyState(this.keyState);
      this.combatSystem.update(dt, performance.now() / 1000);
      this.cameraController.update(this.combatSystem.fighters);
      if (this.hud) this.hud.setDebugState(this.combatSystem.debugEnabled, this.getDiagnosticState());
    } catch (error) {
      this.lastError = error?.message || String(error);
      console.error('Combat tick failed:', error);
      if (this.hud) this.hud.setDebugState(true, { lastError: this.lastError, state: 'tick-failed' });
    }
  }

  getDiagnosticState() {
    return {
      gameState: this.combatSystem.matchActive ? 'fight' : 'menu',
      scene: 'arena-3d',
      fps: (1 / Math.max(0.016, this.loop ? this.loop.fixedStep : 0.016)).toFixed(0),
      loop: this.loop && this.loop.running ? 'active' : 'stopped',
      p1: this.combatSystem.fighters[0] || null,
      p2: this.combatSystem.fighters[1] || null,
      lastError: this.lastError,
      renderer: this.renderer ? 'ready' : 'missing',
    };
  }

  render() {
    this.renderer.render(this.scene, this.cameraController.camera);
  }

  resize() {
    const { clientWidth, clientHeight } = this.mount;
    this.renderer.setSize(clientWidth, clientHeight);
    this.cameraController.setAspect(clientWidth, clientHeight);
  }

  startMatch() {
    this.combatSystem.setupMatch();
    this.hud.setDebugState(this.combatSystem.debugEnabled, this.getDiagnosticState());
  }

  toggleDebug() {
    this.combatSystem.setDebug(!this.combatSystem.debugEnabled);
    this.hud.setDebugState(this.combatSystem.debugEnabled, this.getDiagnosticState());
  }
}
