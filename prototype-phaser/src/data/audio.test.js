import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { ANNOUNCER_CUES, CHARACTER_VOICES, SPECIAL_AUDIO } from './audio.js';

test('every configured recording resolves to a copied, real audio asset', async () => {
  const clips = [
    ...Object.values(ANNOUNCER_CUES).map(cue => cue.clip),
    ...Object.values(CHARACTER_VOICES).flatMap(voices => Object.values(voices).map(voice => voice.clip))
  ].filter(Boolean);

  assert.ok(clips.length > 20);
  assert.equal(new Set(clips).size, clips.length);
  for (const clip of clips) {
    await access(new URL(`../../public/assets/${clip}`, import.meta.url));
  }
});

test('missing character move voices and Pedro special vocals stay explicitly unmapped', () => {
  assert.equal(CHARACTER_VOICES.pedro.special, undefined);
  assert.equal(CHARACTER_VOICES.pedro.transformation, undefined);
  assert.equal(CHARACTER_VOICES.pedro.punch, undefined);
  assert.equal(CHARACTER_VOICES.paula.block, undefined);
  assert.equal(SPECIAL_AUDIO.pedro.preparationVoice, null);
  assert.equal(SPECIAL_AUDIO.pedro.activationEffect, 'special');
  assert.equal(SPECIAL_AUDIO.pedro.impactEffect, 'impact');
});
