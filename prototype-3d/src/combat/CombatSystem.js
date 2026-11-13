import * as THREE from 'three';
import { CHARACTER_LIBRARY } from '../characters/CharacterRegistry.js';
import { CharacterModel } from '../characters/CharacterModel.js';
import { FighterController } from './FighterController.js';

export const ATTACKS = {
  punch: { startup: 0.12, active: 0.12, recovery: 0.28, damage: 12, range: 1.15, width: 0.82, height: 0.8, knockback: 1.6, stun: 0.23, cooldown: 0.38 },
  kick: { startup: 0.18, active: 0.14, recovery: 0.32, damage: 16, range: 1.45, width: 1.0, height: 0.9, knockback: 2.1, stun: 0.33, cooldown: 0.52 },
  special: { startup: 0.22, active: 0.18, recovery: 0.52, damage: 24, range: 2.15, width: 1.55, height: 1.1, knockback: 3.2, stun: 0.52, cooldown: 1.0 },
};

function createFighterRuntime(id, config, x) {
  const fighter = {
    id,
    name: config.name,
    x,
    y: 0,
    z: id === 'pedro' ? 0.5 : -0.5,
    vx: 0,
    vy: 0,
    vz: 0,
    direction: id === 'pedro' ? 1 : -1,
    face: id === 'pedro' ? 1 : -1,
    facing: id === 'pedro' ? 1 : -1,
    onGround: true,
    health: 100,
    energy: 15,
    moveSpeed: config.moveSpeed,
    runSpeed: config.runSpeed,
    jumpSpeed: config.jumpSpeed,
    attack: null,
    crouch: false,
    block: false,
    dead: false,
    cooldowns: { punch: 0, kick: 0, special: 0 },
    combo: 0,
    comboTimer: 0,
    moveIntent: 0,
    age: 0,
    damageFlash: 0,
    screenShake: 0,
    attackCounter: 0,
    startAttack(kind) {
      if (this.dead || this.attack) return false;
      const move = ATTACKS[kind];
      if (!move || this.cooldowns[kind] > 0) return false;
      this.attack = { kind, move, time: 0, hit: false };
      this.cooldowns[kind] = move.cooldown;
      this.vx *= 0.2;
      return true;
    },
    recoverFromShake(dt) {
      this.screenShake = Math.max(0, this.screenShake - dt * 2.5);
    },
  };
  return fighter;
}

export class CombatSystem {
  constructor({ scene, onTick, hud }) {
    this.scene = scene;
    this.onTick = onTick;
    this.hud = hud;
    this.fighters = [];
    this.controllers = [];
    this.roundTime = 99;
    this.matchActive = false;
    this.debugEnabled = false;
    this.keyState = {};
    this.debugGroup = new THREE.Group();
    this.scene.add(this.debugGroup);
    this.message = 'LUTA 3D PROVISÓRIA';
    this.container = null;
    this.resultEl = document.querySelector('#result');
    this.resultTitle = document.querySelector('#result-title');
    this.resultSubtitle = document.querySelector('#result-subtitle');
  }

  setupMatch() {
    if (this.pedroModel) this.scene.remove(this.pedroModel.root);
    if (this.paulaModel) this.scene.remove(this.paulaModel.root);
    if (this.debugGroup) this.debugGroup.clear();

    this.fighters = [];
    this.controllers = [];
    this.roundTime = 99;
    const pedro = createFighterRuntime('pedro', CHARACTER_LIBRARY.pedro, -2.5);
    const paula = createFighterRuntime('paula', CHARACTER_LIBRARY.paula, 2.5);

    this.pedroModel = new CharacterModel(CHARACTER_LIBRARY.pedro);
    this.paulaModel = new CharacterModel(CHARACTER_LIBRARY.paula);
    this.pedroModel.root.position.set(pedro.x, 0.1, pedro.z);
    this.paulaModel.root.position.set(paula.x, 0.1, paula.z);
    this.scene.add(this.pedroModel.root, this.paulaModel.root);

    this.fighters.push(pedro, paula);
    this.controllers.push(
      new FighterController({ fighter: pedro, isHuman: true, keys: { left: 'a', right: 'd', jump: 'w', crouch: 's', punch: 'j', kick: 'k', special: 'l', block: 'shift' }, opponent: paula }),
      new FighterController({ fighter: paula, isHuman: false, opponent: pedro })
    );

    this.matchActive = true;
    this.message = 'ROUND 1';
    if (this.resultEl) this.resultEl.classList.add('hidden');
    this.hud.setMessage('ROUND 1');
    this.updateHud();
  }

  setKeyState(state) {
    this.keyState = state;
  }

  completeMatch(winner) {
    this.matchActive = false;
    const label = winner?.name || 'VITÓRIA';
    if (this.resultEl) this.resultEl.classList.remove('hidden');
    if (this.resultTitle) this.resultTitle.textContent = label;
    if (this.resultSubtitle) this.resultSubtitle.textContent = winner ? `${winner.name} venceu a luta.` : 'KO!';
    this.message = `${label} VENCE`;
    this.hud.setMessage(this.message);
  }

  update(dt, elapsed) {
    if (!this.matchActive || this.fighters.length === 0) return;
    this.roundTime = Math.max(0, this.roundTime - dt);
    for (const fighter of this.fighters) {
      fighter.age += dt;
      fighter.cooldowns.punch = Math.max(0, fighter.cooldowns.punch - dt);
      fighter.cooldowns.kick = Math.max(0, fighter.cooldowns.kick - dt);
      fighter.cooldowns.special = Math.max(0, fighter.cooldowns.special - dt);
      fighter.damageFlash = Math.max(0, fighter.damageFlash - dt * 2.4);
      fighter.screenShake = Math.max(0, fighter.screenShake - dt * 2.5);

      if (fighter.attack) {
        fighter.attack.time += dt;
        const move = fighter.attack.move;
        if (fighter.attack.time >= move.startup + move.active + move.recovery) {
          fighter.attack = null;
        }
      }

      fighter.vy -= 9.8 * dt;
      fighter.y = Math.max(0, fighter.y + fighter.vy * dt);
      if (fighter.y <= 0) {
        fighter.y = 0;
        fighter.vy = 0;
        fighter.onGround = true;
      } else {
        fighter.onGround = false;
      }

      if (fighter.onGround && fighter.moveIntent !== 0) {
        fighter.face = Math.sign(fighter.moveIntent) || fighter.face;
      }

      fighter.facing = fighter.x < this.getOpponent(fighter).x ? 1 : -1;
      fighter.x += fighter.vx * dt;
      fighter.z += fighter.vz * dt;
      fighter.x = THREE.MathUtils.clamp(fighter.x, -5.4, 5.4);
      fighter.z = THREE.MathUtils.clamp(fighter.z, -2.2, 2.2);
      fighter.vx *= 0.82;
      fighter.vz *= 0.82;
    }

    this.controllers.forEach((controller) => controller.update(dt, this.keyState || {}));

    for (let i = 0; i < this.fighters.length; i += 1) {
      const a = this.fighters[i];
      const b = this.getOpponent(a);
      this.resolveAttack(a, b);
      this.resolveProximity(a, b);
    }

    const winner = this.fighters.find((fighter) => fighter.health > 0);
    if (winner && this.fighters.some((fighter) => fighter.health <= 0)) {
      this.completeMatch(winner);
      return;
    }

    this.syncVisuals();
    this.updateDebug();
    this.updateHud();
  }

  getOpponent(fighter) {
    return fighter.id === 'pedro' ? this.fighters[1] : this.fighters[0];
  }

  getHitbox(fighter) {
    if (!fighter.attack) return null;
    const move = fighter.attack.move;
    const activeWindow = fighter.attack.time >= move.startup && fighter.attack.time <= move.startup + move.active;
    if (!activeWindow) return null;
    const offset = fighter.facing * (move.range * 0.62);
    return {
      minX: fighter.x + offset - move.width * 0.5,
      maxX: fighter.x + offset + move.width * 0.5,
      minY: fighter.y + 0.8,
      maxY: fighter.y + 0.8 + move.height,
      minZ: fighter.z - 0.45,
      maxZ: fighter.z + 0.45,
    };
  }

  getHurtbox(fighter) {
    const height = fighter.crouch ? 1.05 : 1.75;
    return {
      minX: fighter.x - 0.46,
      maxX: fighter.x + 0.46,
      minY: fighter.y,
      maxY: fighter.y + height,
      minZ: fighter.z - 0.55,
      maxZ: fighter.z + 0.55,
    };
  }

  overlaps(a, b) {
    if (!a || !b) return false;
    return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ;
  }

  resolveAttack(attacker, defender) {
    if (!attacker.attack || attacker.dead || defender.dead) return;
    const box = this.getHitbox(attacker);
    const hurt = this.getHurtbox(defender);
    if (!box || !this.overlaps(box, hurt)) return;
    if (attacker.attack.hit) return;
    attacker.attack.hit = true;
    const blocked = defender.block && defender.facing === -attacker.facing;
    const move = attacker.attack.move;
    defender.health = Math.max(0, defender.health - (blocked ? move.damage * 0.25 : move.damage));
    defender.energy = Math.min(100, defender.energy + (blocked ? 12 : 18));
    attacker.energy = Math.min(100, attacker.energy + 10);
    defender.vx = (blocked ? 0.2 : 1.5) * attacker.facing * move.knockback;
    defender.vy = blocked ? 0.7 : 1.3;
    defender.damageFlash = 1;
    defender.screenShake = 1;
    defender.block = blocked;
    if (blocked) {
      this.message = 'BLOQUEIO';
    } else {
      this.message = attacker.id === 'pedro' ? 'ACERTO' : 'ATAQUE';
      defender.facing = attacker.facing * -1;
      if (defender.health <= 0) {
        defender.dead = true;
        this.message = `${attacker.name} VENCE`; 
      }
    }
    this.hud.setMessage(this.message);
  }

  resolveProximity(a, b) {
    const gap = Math.abs(a.x - b.x);
    if (gap < 0.7) {
      const push = 0.7 - gap;
      if (a.x < b.x) {
        a.x -= push * 0.5;
        b.x += push * 0.5;
      } else {
        a.x += push * 0.5;
        b.x -= push * 0.5;
      }
    }
  }

  syncVisuals() {
    if (!this.pedroModel || !this.paulaModel || this.fighters.length < 2) return;
    this.pedroModel.root.position.set(this.fighters[0].x, this.fighters[0].y + 0.08, this.fighters[0].z);
    this.paulaModel.root.position.set(this.fighters[1].x, this.fighters[1].y + 0.08, this.fighters[1].z);
    this.pedroModel.updateFromRuntime(this.fighters[0]);
    this.paulaModel.updateFromRuntime(this.fighters[1]);
  }

  beginAttack(fighterId, kind) {
    const fighter = this.fighters.find((entry) => entry.id === fighterId);
    if (!fighter || fighter.dead || fighter.attack) return false;
    const move = ATTACKS[kind];
    if (!move || fighter.cooldowns[kind] > 0) return false;
    fighter.attack = { kind, move, time: 0, hit: false };
    fighter.cooldowns[kind] = move.cooldown;
    fighter.vx *= 0.2;
    this.message = `${fighter.name} ${kind.toUpperCase()}`;
    this.hud.setMessage(this.message);
    return true;
  }

  updateHud() {
    const [p1, p2] = this.fighters;
    const p1Health = Math.max(0, p1.health / 100);
    const p2Health = Math.max(0, p2.health / 100);
    this.hud.update({
      timer: String(Math.max(0, Math.ceil(this.roundTime))),
      p1: p1Health * 100,
      p2: p2Health * 100,
      energy1: p1.energy,
      energy2: p2.energy,
      combo: `${this.fighters[0].combo || 0}x`,
      message: this.message,
      debug: {
        p1: `HP ${p1.health.toFixed(0)} | E ${p1.energy.toFixed(0)} | x ${p1.x.toFixed(2)} z ${p1.z.toFixed(2)}`,
        p2: `HP ${p2.health.toFixed(0)} | E ${p2.energy.toFixed(0)} | x ${p2.x.toFixed(2)} z ${p2.z.toFixed(2)}`,
      },
    });
  }

  updateDebug() {
    this.debugGroup.clear();
    if (!this.debugEnabled) return;
    for (const fighter of this.fighters) {
      const hurt = this.getHurtbox(fighter);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(hurt.maxX - hurt.minX, hurt.maxY - hurt.minY, hurt.maxZ - hurt.minZ),
        new THREE.MeshBasicMaterial({ color: 0x2ed3ff, wireframe: true, transparent: true, opacity: 0.8 })
      );
      box.position.set((hurt.minX + hurt.maxX) / 2, (hurt.minY + hurt.maxY) / 2, (hurt.minZ + hurt.maxZ) / 2);
      this.debugGroup.add(box);

      if (fighter.attack) {
        const atk = this.getHitbox(fighter);
        const hitBox = new THREE.Mesh(
          new THREE.BoxGeometry(atk.maxX - atk.minX, atk.maxY - atk.minY, atk.maxZ - atk.minZ),
          new THREE.MeshBasicMaterial({ color: 0xffcf5a, wireframe: true, transparent: true, opacity: 0.8 })
        );
        hitBox.position.set((atk.minX + atk.maxX) / 2, (atk.minY + atk.maxY) / 2, (atk.minZ + atk.maxZ) / 2);
        this.debugGroup.add(hitBox);
      }
    }
  }

  setDebug(enabled) {
    this.debugEnabled = enabled;
    this.updateDebug();
  }
}
