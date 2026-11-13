import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSystem } from './CombatSystem.js';

function createFighter({ x, facing, depthPosition = 0.5, state = 'attack' }) {
  const fighter = {
    x,
    facing,
    depthPosition,
    projectedGroundY: 300,
    jumpHeight: 0,
    depthScale: 1,
    state,
    dead: false,
    invulnerabilityTime: 0,
    attack: {
      hit: false,
      time: 0.15,
      move: {
        startup: 0.1,
        active: 0.2,
        range: 100,
        height: 100,
        damage: 50,
        knockback: 150,
        priority: 1
      }
    },
    characterData: { body: { width: 40, height: 100 } },
    physicsBody: {
      bottom: 300,
      setVelocityX(value) {
        this.velocityX = value;
      }
    },
    damageTaken: 0,
    scene: {
      stageData: { depth: { hitTolerance: 0.22 } },
      audio: { played: [], playEffect(name) { this.played.push(name); } },
      showImpact() {}
    },
    takeDamage(amount) {
      this.damageTaken += amount;
      return true;
    },
    registerComboHit() {
      this.comboCount = (this.comboCount || 0) + 1;
    }
  };
  return fighter;
}

function pair(options = {}) {
  return [
    createFighter({ x: 100, facing: 1 }),
    createFighter({ x: 170, facing: -1, ...options })
  ];
}

test('only active attack frames can hit', () => {
  const combat = new CombatSystem();
  const [attacker, defender] = pair();

  attacker.attack.time = 0.05;
  combat.update([attacker, defender]);
  assert.equal(defender.damageTaken, 0);

  attacker.attack.time = 0.15;
  combat.update([attacker, defender]);
  assert.equal(defender.damageTaken, 50);
  assert.equal(attacker.comboCount, 1);
});

test('a move hits once and cannot hit across depth lanes', () => {
  const combat = new CombatSystem();
  const [attacker, defender] = pair();

  combat.update([attacker, defender]);
  combat.update([attacker, defender]);
  assert.equal(defender.damageTaken, 50);

  const [farAttacker, farDefender] = pair({ depthPosition: 1 });
  combat.update([farAttacker, farDefender]);
  assert.equal(farDefender.damageTaken, 0);
});

test('a correctly facing defender blocks damage', () => {
  const combat = new CombatSystem();
  const [attacker, defender] = pair({ state: 'block' });

  combat.update([attacker, defender]);
  assert.equal(defender.damageTaken, 0);
  assert.deepEqual(attacker.scene.audio.played, ['block']);
  assert.equal(defender.physicsBody.velocityX, 95);
});

test('configured hitboxes, invulnerability, and attack priority are respected', () => {
  const combat = new CombatSystem();
  const [attacker, defender] = pair();
  attacker.attack.move.hitbox = { offsetX: 44, offsetY: 50, width: 52, height: 62 };
  defender.invulnerabilityTime = 0.2;
  combat.update([attacker, defender]);
  assert.equal(defender.damageTaken, 0);

  defender.invulnerabilityTime = 0;
  defender.attack.move.priority = 2;
  defender.attack.move.range = 50;
  combat.update([attacker, defender]);
  assert.equal(defender.damageTaken, 0);
});

test('a configured block hit uses block stun and prevents duplicate damage', () => {
  const combat = new CombatSystem();
  const [attacker, defender] = pair({ state: 'block' });
  attacker.attack.move.blockStun = 0.24;
  defender.receiveBlock = function receiveBlock(move, direction) {
    this.blockStun = move.blockStun;
    this.physicsBody.setVelocityX(direction * 80);
  };

  combat.update([attacker, defender]);
  combat.update([attacker, defender]);
  assert.equal(defender.damageTaken, 0);
  assert.equal(defender.blockStun, 0.24);
});
