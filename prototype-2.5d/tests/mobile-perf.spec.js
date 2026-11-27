import { expect, test } from '@playwright/test';

/**
 * Celular: falas sem engasgo (Web Audio com buffers decodificados) e atlas leves.
 */
test('voices are pre-decoded and play through Web Audio without creating media players', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  await page.mouse.click(10, 10); // gesto: libera o AudioContext
  const r = await page.evaluate(async () => {
    const { soundEngine } = await import('/src/engine/audio.ts');
    soundEngine.setVolumes({ muted: false, masterVolume: 0.5, voiceVolume: 0.5 });
    soundEngine.preloadFighterVoices(['carlos', 'narrator']);
    const t0 = performance.now();
    while (soundEngine.voiceCacheInfo().queued > 0 && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 300));
    const info = soundEngine.voiceCacheInfo();
    const OriginalAudio = window.Audio;
    let created = 0;
    window.Audio = class extends OriginalAudio {
      constructor(...a) {
        super(...a);
        created++;
      }
    };
    try {
      const played = soundEngine.playClip('carlos', 'cast_special', 0);
      soundEngine.playAnnouncer('fight');
      soundEngine.stopAllVoices();
      return { info, created, played };
    } finally {
      window.Audio = OriginalAudio;
    }
  });
  expect(r.info.decoded).toBeGreaterThan(10);
  expect(r.info.bytes).toBeLessThan(48 * 1024 * 1024);
  expect(r.played).toBe(true);
  // com o buffer pronto, nenhuma fala abre <audio> (era o que engasgava no celular)
  expect(r.created).toBe(0);
});

test('mobile uses reduced atlases with correct frame mapping and frees unused ones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  test.setTimeout(90_000);
  const atlasRequests = [];
  page.on('request', (req) => {
    const u = req.url();
    if (/-anim-(hd|md)\.webp/.test(u)) atlasRequests.push(u.split('/').pop());
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ffEngine);
  const r = await page.evaluate(async () => {
    const e = window.__ffEngine;
    for (const [a, b] of [['carlos', 'pedro'], ['gabi', 'juraci'], ['davi', 'paula'], ['carlos', 'pedro']]) {
      e.startMatch(a, b, 'quintal', 'cpu', 'normal');
      await new Promise((res) => setTimeout(res, 1500));
    }
    e.skipIntro();
    await new Promise((res) => setTimeout(res, 800));
    const out = [];
    for (const f of e.fighters) {
      const uv = f.rig.spriteGeo.getAttribute('uv').array;
      out.push({ visible: f.rig.spriteMesh.visible, uv: Array.from(uv), src: f.rig.atlasHd6Tex?.userData?.srcSize ?? null });
    }
    return { out, tex: e.renderer.info.memory.textures };
  });
  expect(atlasRequests.some((u) => u.includes('-anim-md.webp'))).toBe(true);
  expect(atlasRequests.some((u) => u.includes('-anim-hd.webp'))).toBe(false);
  for (const f of r.out) {
    expect(f.visible).toBe(true);
    expect(f.src).not.toBeNull();
    for (const v of f.uv) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  }
});
