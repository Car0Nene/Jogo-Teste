import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHARACTER_ROSTER, PLAYABLE_CHARACTER_IDS } from './roster.js';
import { CHARACTERS } from './characters.js';

test('only configured and tested fighter classes are available for selection', () => {
  assert.deepEqual(PLAYABLE_CHARACTER_IDS, ['pedro', 'paula']);
  for (const fighter of CHARACTER_ROSTER.filter(character => character.playable)) {
    assert.ok(CHARACTERS[fighter.id], `${fighter.id} needs combat data`);
    assert.ok(['pedro', 'paula'].includes(fighter.id), `${fighter.id} needs a tested fighter class`);
  }
  assert.equal(CHARACTER_ROSTER.filter(character => !character.playable).length, 6);
});

test('every displayed fighter has its real portrait asset', async () => {
  for (const fighter of CHARACTER_ROSTER) {
    const portrait = new URL(`../../public/assets/${fighter.portrait}`, import.meta.url);
    const bytes = await readFile(portrait);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', fighter.id);
  }
});
