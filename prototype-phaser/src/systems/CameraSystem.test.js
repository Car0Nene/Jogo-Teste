import test from 'node:test';
import assert from 'node:assert/strict';
import { getTargetZoom } from './CameraSystem.js';

const config = {
  baseZoom: 1,
  minZoom: 0.72,
  maxZoom: 1,
  fullZoomDistanceRatio: 0.62
};

test('camera holds its configured zoom while both fighters fit comfortably', () => {
  assert.equal(getTargetZoom(400, 960, config), 1);
});

test('camera smoothly targets a wider framing as fighters separate', () => {
  const zoom = getTargetZoom(1000, 960, config);
  assert.ok(zoom < 1);
  assert.ok(zoom >= config.minZoom);
  assert.equal(getTargetZoom(4000, 960, config), config.minZoom);
});
