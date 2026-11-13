import test from 'node:test';
import assert from 'node:assert/strict';
import { FighterStateMachine, FIGHTER_STATES } from './FighterStateMachine.js';

test('only known states and explicitly cancelable attack transitions are accepted', () => {
  const machine = new FighterStateMachine();
  assert.equal(machine.transition('walk'), true);
  assert.equal(machine.transition('attack'), true);
  assert.equal(machine.transition('special'), false);
  assert.equal(machine.transition('special', { cancel: true }), true);
  assert.equal(machine.transition('special', { cancel: true }), true);
  assert.equal(machine.transition('not-a-state'), false);
  assert.deepEqual(FIGHTER_STATES.includes('fall'), true);
});

test('KO and other terminal outcomes cannot be interrupted', () => {
  const machine = new FighterStateMachine('ko');
  assert.equal(machine.transition('idle'), false);
  assert.equal(machine.transition('victory'), false);
  assert.equal(machine.state, 'ko');
});

test('hit stun can recover, while transformation exits only to idle', () => {
  const machine = new FighterStateMachine('hit');
  assert.equal(machine.transition('transformation'), false);
  assert.equal(machine.transition('attack'), false);
  assert.equal(machine.transition('walk'), false);
  assert.equal(machine.transition('idle'), true);

  const transforming = new FighterStateMachine('transformation');
  assert.equal(transforming.transition('walk'), false);
  assert.equal(transforming.transition('hit'), false);
  assert.equal(transforming.transition('idle'), true);
});
