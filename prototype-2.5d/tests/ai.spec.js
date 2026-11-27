import { expect, test } from '@playwright/test';

/**
 * IA da CPU: joga pelo mesmo caminho do jogador e tem personalidade.
 * Simula a luta em passos fixos (sem depender do FPS do navegador de teste).
 */
async function simulate(page, { cpu, p1 = 'carlos', difficulty = 'hard', seconds = 30, p1Script = 'idle' }) {
  return page.evaluate(
    async ({ cpu, p1, difficulty, seconds, p1Script }) => {
      const e = window.__ffEngine;
      e.startMatch(p1, cpu, 'quintal', 'cpu', difficulty);
      e.skipIntro();
      const log = [];
      const orig = e.applyHit.bind(e);
      e.applyHit = (att, def, ...rest) => {
        const move = rest[5];
        const hp = def.hp;
        const st = def.state;
        const t = def.stateTimer;
        orig(att, def, ...rest);
        // só conta golpe que de fato pegou (acerto ou defesa); chamadas recusadas (ex.: caído) não contam
        if (def.hp !== hp || def.state !== st || def.stateTimer !== t) log.push({ att: att.index, blocked: def.state === 'blockstun', low: Boolean(move?.low) });
      };
      const [f1, f2] = e.fighters;
      let distSum = 0;
      let n = 0;
      let maxCombo = 0;
      const dt = 1 / 60;
      for (let i = 0; i < seconds * 60; i++) {
        // ninguém morre: o teste é de comportamento
        f1.hp = Math.max(f1.hp, 600);
        f2.hp = Math.max(f2.hp, 600);
        e.roundTimer = 99;
        if (p1Script === 'lowSpam' && e.matchPhase === 'fighting') {
          // P1 cola e vive de rasteira
          const d = f2.x - f1.x;
          e.triggerVirtualHold(0, 'right', d > 1.6 && Math.abs(d) > 1.6);
          e.triggerVirtualHold(0, 'down', Math.abs(d) <= 1.8);
          if (i % 40 === 0 && Math.abs(d) <= 2.0) e.triggerVirtualPress(0, 'heavy');
        }
        e.step(dt);
        if (e.matchPhase === 'fighting') {
          distSum += Math.abs(f2.x - f1.x);
          n++;
          maxCombo = Math.max(maxCombo, f2.comboCount);
        }
      }
      e.applyHit = orig;
      return { log, avgDist: distSum / Math.max(1, n), maxCombo, debug: e.getCpuAiDebug() };
    },
    { cpu, p1, difficulty, seconds, p1Script }
  );
}

test('CPU fighting AI: blocks lows, adapts, combos and has per-character style', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__ffEngine);

  // 1) contra quem vive de rasteira, a CPU defende agachada (antes era impossível) e aprende
  const vsLows = await simulate(page, { cpu: 'franciely', p1Script: 'lowSpam', seconds: 40 });
  const p1Lows = vsLows.log.filter((h) => h.att === 0 && h.low);
  expect(p1Lows.length).toBeGreaterThan(5);
  const blockedLows = p1Lows.filter((h) => h.blocked).length;
  expect(blockedLows, JSON.stringify(vsLows.debug)).toBeGreaterThan(0);
  expect(vsLows.debug.habits.lows).toBeGreaterThan(3);
  // adaptação: depois de tanta rasteira, a leitura de golpe baixo sobe bem acima do perfil base
  expect(vsLows.debug.lowRead).toBeGreaterThan(vsLows.debug.baseLowRead + 0.2);
  // e uma boa parte das rasteiras é defendida agachada
  expect(blockedLows / p1Lows.length).toBeGreaterThan(0.25);

  // 2) a CPU ataca de verdade: acerta, usa golpes baixos e encadeia combo
  const carlos = await simulate(page, { cpu: 'carlos', seconds: 30 });
  const cpuHits = carlos.log.filter((h) => h.att === 1);
  expect(cpuHits.length).toBeGreaterThan(5);
  const paula = await simulate(page, { cpu: 'paula', seconds: 30 });
  expect(paula.log.filter((h) => h.att === 1 && h.low).length).toBeGreaterThan(0);
  expect(Math.max(carlos.maxCombo, paula.maxCombo)).toBeGreaterThanOrEqual(2);

  // 3) personalidade: a vó zoneadora fica bem mais longe que o Rei do Combo
  const juraci = await simulate(page, { cpu: 'juraci', seconds: 30 });
  expect(juraci.debug.style).toContain('Zoneadora');
  expect(juraci.avgDist).toBeGreaterThan(carlos.avgDist + 0.8);

  expect(errors).toEqual([]);
});
