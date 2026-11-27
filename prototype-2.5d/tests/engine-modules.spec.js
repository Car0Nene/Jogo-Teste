import { expect, test } from '@playwright/test';

/**
 * Módulos extraídos do motor: câmera (ninguém sai do quadro) e efeitos de impacto (pool e limpeza).
 */
test('fight camera keeps both fighters in frame and effects clean up', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => import('three'));
    const { frameFight } = await import('/src/engine/camera/fightCamera.ts');
    const { HitEffects } = await import('/src/engine/fx/HitEffects.ts');
    const framing = { minDistance: 9, sideMargin: 3.2, top: 0.18, bottom: 0.2 };
    const out = [];
    for (const [w, h] of [[1280, 720], [844, 390], [390, 844]]) {
      for (const [x1, x2, y] of [[-2.4, 2.4, 0], [-7.4, 7.4, 0], [-7.4, -6.2, 3], [5, 7.4, 2.5]]) {
        const shot = frameFight({ x1, x2, maxY: y, framing, viewW: w, viewH: h, fovDeg: 38 });
        const cam = new THREE.PerspectiveCamera(38, w / h, 0.1, 200);
        cam.position.set(shot.x, shot.y, shot.z);
        cam.lookAt(shot.lookX, shot.lookY, shot.lookZ);
        cam.updateMatrixWorld();
        // cabeça e pés dos dois lutadores, na tela (NDC −1..1)
        const pts = [[x1, y], [x1, y + 2.9], [x2, 0], [x2, 2.9]].map(([px, py]) => new THREE.Vector3(px, py, 0).project(cam));
        out.push({ w, h, x1, x2, inside: pts.every((p) => Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1) });
      }
    }
    const scene = new THREE.Scene();
    const fx = new HitEffects(scene);
    fx.spawnSparks(0, 1, 0xffffff, 12);
    fx.spawnBurst(0, 1);
    const during = scene.children.length;
    for (let i = 0; i < 60; i++) fx.update(1 / 60);
    const after = scene.children.length;
    fx.spawnSparks(0, 1, 0xffffff, 5, true);
    fx.clear();
    return { out, during, after, cleared: scene.children.length };
  });
  for (const o of r.out) expect(o.inside, JSON.stringify(o)).toBe(true);
  expect(r.during).toBe(13);
  expect(r.after).toBe(0);
  expect(r.cleared).toBe(0);
});
