import test from 'node:test';
import assert from 'node:assert/strict';
import { PaulaAI } from './PaulaAI.js';

function fighter(x, state = 'idle', attack = null) {
  return { x, state, attack, dead: false, depthPosition: 0.5 };
}

test('Paula approaches from far away and retreats if the player is too close', () => {
  const ai = new PaulaAI();
  const paula = fighter(300);
  assert.equal(ai.update(paula, fighter(0), 16, () => 0.9).controls.left, true);

  ai.thinkTime = 1;
  assert.equal(ai.update(paula, fighter(260), 16, () => 0.9).controls.right, true);
});

test('Paula attacks only when close and avoids attacking while stunned', () => {
  const ai = new PaulaAI();
  const attackDecision = ai.update(fighter(100), fighter(0), 16, () => 0.1);
  assert.equal(attackDecision.attack, 'punch');

  const stunnedDecision = ai.update(fighter(100, 'hit'), fighter(0), 16, () => 0.1);
  assert.equal(stunnedDecision.attack, null);
});

test('Paula blocks a threatening move occasionally and honors the block duration', () => {
  const ai = new PaulaAI({ reactionChance: 0.5 });
  const player = fighter(0, 'attack', {
    time: 0.2,
    move: { startup: 0.2, active: 0.2 }
  });
  const paula = fighter(100);
  assert.equal(ai.update(paula, player, 16, () => 0.1).controls.block, true);
  assert.equal(ai.update(paula, player, 100, () => 0.9).controls.block, true);
  assert.equal(ai.update(paula, player, 300, () => 0.9).controls.block, false);
});
