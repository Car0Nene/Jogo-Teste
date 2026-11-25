// Benchmark dos impactos: golpes, especiais, especiais simultâneos e luta longa.
// Mede pior frame após cada evento e o crescimento de memória da GPU (geometrias, texturas,
// programas de shader) — evidência de vazamento ou compilação tardia.
//   npm run dev -- --host 127.0.0.1 --port 4173   (em outro terminal)
//   node tools/bench-hits.mjs <rotulo> [p1] [p2]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const [label = 'run', p1 = 'carlos', p2 = 'pedro'] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.env.URL || 'http://127.0.0.1:4173/');
await page.getByRole('button', { name: /ARCADE/ }).click();
await page.locator('.ff-character-panel-p1').click();
await page.getByRole('button', { name: `Selecionar ${p1.toUpperCase()}` }).click();
await page.getByRole('button', { name: `Selecionar ${p2.toUpperCase()}` }).click();
await page.getByRole('button', { name: /ESCOLHER CEN/ }).click();
await page.getByRole('button', { name: /INICIAR COMBATE/ }).click();
await page.waitForTimeout(1200);
for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(400); }
await page.waitForFunction(() => window.__ffEngine?.matchPhase === 'fighting', null, { timeout: 30000 });

const result = await page.evaluate(async () => {
  const e = window.__ffEngine;
  const [f1, f2] = e.fighters;
  const info = () => ({
    geo: e.renderer.info.memory.geometries,
    tex: e.renderer.info.memory.textures,
    prog: e.renderer.info.programs?.length ?? 0,
    objs: (() => { let n = 0; e.scene.traverse(() => n++); return n; })(),
  });
  const frames = [];
  let last = performance.now();
  let running = true;
  const loop = (t) => { frames.push(t - last); last = t; if (running) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const wait = (n) => new Promise((r) => { const start = frames.length; const chk = () => frames.length - start >= n ? r() : requestAnimationFrame(chk); chk(); });
  const reset = () => {
    for (const f of [f1, f2]) { f.hp = 1000; f.state = 'idle'; f.stateTimer = 0; f.activeMove = null; f.form = 'normal'; f.formTimer = 0; f.hitInvuln = 0; f.vx = 0; f.vy = 0; f.y = 0; }
    f1.x = -0.8; f2.x = 0.8; e.matchPhase = 'fighting'; e.roundTimer = 99;
  };
  const events = [];
  const run = async (name, fn) => {
    reset();
    await wait(3);
    const before = info();
    const i0 = frames.length;
    const t0 = performance.now(); fn(); const cpu = performance.now() - t0;
    await wait(12);
    const win = frames.slice(i0, i0 + 12);
    const after = info();
    events.push({ evento: name, cpu_ms: +cpu.toFixed(2), pior_ms: +Math.max(...win).toFixed(1),
      geo: after.geo - before.geo, tex: after.tex - before.tex, prog: after.prog - before.prog, objs: after.objs - before.objs });
  };
  const start = info();
  for (let i = 0; i < 10; i++) await run(`golpe_${i + 1}${i % 3 === 2 ? '_forte' : ''}`, () => e.applyHit(f1, f2, 60, 2, 0.05, i % 3 === 2, false));
  for (let i = 0; i < 10; i++) await run(`especial_${i + 1}`, () => { f1.meter = 100; e.trySpecial(f1, i % 2 === 1); });
  for (let i = 0; i < 3; i++) await run(`duplo_${i + 1}`, () => { f1.meter = 100; f2.meter = 100; e.trySpecial(f1, false); e.trySpecial(f2, false); });
  // luta longa: um golpe a cada 6 frames por ~20 s
  reset();
  const lf0 = frames.length; const long0 = info();
  for (let i = 0; i < 200; i++) {
    if (i % 25 === 0) reset();
    if (i % 2 === 0) e.applyHit(f1, f2, 30, 1, 0.03, i % 6 === 0, false); else e.applyHit(f2, f1, 30, 1, 0.03, false, false);
    if (i % 40 === 0) { f1.meter = 100; e.trySpecial(f1, false); }
    await wait(6);
  }
  await wait(60);
  const longF = frames.slice(lf0).sort((a, b) => a - b);
  const q = (p) => +longF[Math.floor(p * (longF.length - 1))].toFixed(1);
  const end = info();
  running = false;
  return {
    gpu: e.renderer.info.render ? undefined : undefined,
    eventos: events,
    luta_longa: { frames: longF.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1),
      crescimento: { geo: end.geo - long0.geo, tex: end.tex - long0.tex, prog: end.prog - long0.prog, objs: end.objs - long0.objs } },
    total: { geo: end.geo - start.geo, tex: end.tex - start.tex, prog: end.prog - start.prog },
  };
});
writeFileSync(`/tmp/bench_${label}.json`, JSON.stringify(result, null, 2));
console.log(`== ${label}`);
console.log('evento            cpu_ms  pior_ms  +geo  +tex  +prog  +objs');
for (const r of result.eventos) console.log(`${r.evento.padEnd(17)} ${String(r.cpu_ms).padStart(6)} ${String(r.pior_ms).padStart(8)} ${String(r.geo).padStart(5)} ${String(r.tex).padStart(5)} ${String(r.prog).padStart(6)} ${String(r.objs).padStart(6)}`);
console.log('luta longa:', JSON.stringify(result.luta_longa));
console.log('total:', JSON.stringify(result.total));
await browser.close();
