import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { DEFAULT_STAGE_ID, getStage, STAGES } from './stages.js';

test('Bar and Praia point to the inspected, unmodified panoramic assets', async () => {
  const expectedDimensions = { bar: [1536, 397], praia: [1672, 443] };
  for (const stage of Object.values(STAGES)) {
    const [width, height] = expectedDimensions[stage.id];
    assert.deepEqual(stage.source, { width, height });
    const imagePath = new URL(`../../public/${stage.layers[0].image}`, import.meta.url);
    await access(imagePath);
    const bytes = await readFile(imagePath);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('stage data provides bounded depth, camera, fighter spawns, and a known default', () => {
  assert.equal(DEFAULT_STAGE_ID, 'bar');
  assert.equal(getStage('praia').id, 'praia');
  assert.throws(() => getStage('unknown'), /Unknown stage/);
  for (const stage of Object.values(STAGES)) {
    assert.equal(stage.spawns.length, 2);
    assert.ok(stage.depth.frontYRatio > stage.depth.backYRatio);
    assert.ok(stage.camera.minZoom < stage.camera.baseZoom);
    assert.ok(stage.horizontalBounds.left < stage.horizontalBounds.right);
  }
});

test('Bar da Simone and Praia use their respective existing soundtrack files', async () => {
  assert.notEqual(getStage('bar').music, getStage('praia').music);
  for (const stage of Object.values(STAGES)) {
    await access(new URL(`../../public/assets/${stage.music}`, import.meta.url));
  }
});
