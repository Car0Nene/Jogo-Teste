import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHARACTERS } from './characters.js';

const atlas = JSON.parse(await readFile(new URL('../../public/assets/fighters.json', import.meta.url), 'utf8'));
const frameNames = new Set(atlas.frames.map(frame => frame.filename));

test('all configured character and form animation frames exist in the atlas', () => {
  for (const character of Object.values(CHARACTERS)) {
    const animations = [
      ...Object.values(character.animations),
      ...Object.values(character.forms || {}).flatMap(form => Object.values(form.animations))
    ];
    for (const animation of animations) {
      for (const frame of animation.frames) {
        assert.ok(frameNames.has(frame), `${character.id} references missing atlas frame ${frame}`);
      }
    }

    for (const [state, animationName] of Object.entries(character.animationFallbacks || {})) {
      assert.ok(character.animations[animationName], `${character.id} fallback for ${state} is not defined`);
    }
  }
});

test('the atlas includes Pedro transformation and both fighters have run cycles', () => {
  assert.deepEqual(CHARACTERS.pedro.animations.transformation.frames, [
    'pedro/hulkPower_0',
    'pedro/hulkPower_1',
    'pedro/hulkPower_2',
    'pedro/hulkPower_3'
  ]);
  assert.equal(CHARACTERS.pedro.forms.transformed.animations.idle.frames[0], 'pedro/hulk_0');
  assert.ok(CHARACTERS.pedro.animations.run.frames.length > 1);
  assert.ok(CHARACTERS.paula.animations.run.frames.length > 1);
  assert.equal(CHARACTERS.paula.animations.ko, undefined);
  assert.equal(CHARACTERS.paula.animationFallbacks.ko, 'defeat');
});
