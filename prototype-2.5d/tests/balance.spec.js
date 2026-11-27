import { expect, test } from '@playwright/test';

/**
 * Equilíbrio e identidade: tabela de quadros dos golpes básicos.
 * - nenhum golpe básico "mais" na defesa; leve no máximo −4 na defesa
 * - cada personagem tem um perfil de golpes diferente dos outros
 * - regras puras de combate (defesa alta/baixa, dano, escala de combo)
 */
test('frame data rules and per-character identity', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { FIGHTERS } = await import('/src/data/fighters.ts');
    const { moveFrames, lowMoves } = await import('/src/data/commands.ts');
    const rules = await import('/src/engine/combat/rules.ts');
    const table = {};
    for (const [id, f] of Object.entries(FIGHTERS)) {
      const low = lowMoves(id);
      const mv = { light: f.moves.light, medium: f.moves.medium, heavy: f.moves.heavy, air: f.moves.air, lowLight: low.light, lowHeavy: low.heavy };
      table[id] = Object.fromEntries(Object.entries(mv).map(([k, m]) => [k, { ...moveFrames(m), range: Math.round(m.range * 100) / 100 }]));
    }
    const g = (o, move) => rules.resolveGuard({ state: 'idle', y: 0, noGuardTimer: 0, holdingBack: false, holdingDown: false, dummyBlocksAll: false, ...o }, move);
    const guard = {
      standHigh: g({ holdingBack: true }, { low: false }).blocked,
      standLow: g({ holdingBack: true }, { low: true }).blocked,
      crouchLow: g({ holdingBack: true, holdingDown: true }, { low: true }),
      attacking: g({ state: 'attack', holdingBack: true }, {}).blocked,
      noGuard: g({ holdingBack: true, noGuardTimer: 1 }, {}).blocked,
      dummy: g({ dummyBlocksAll: true }, { low: true }).blocked,
    };
    const dmg = [rules.hitDamage(100, 1, 0, false), rules.hitDamage(100, 1, 4, false), rules.hitDamage(100, 1, 20, false), rules.hitDamage(100, 1, 0, true)];
    return { table, guard, dmg };
  });

  for (const [id, mv] of Object.entries(r.table)) {
    for (const [k, fd] of Object.entries(mv)) {
      expect(fd.onBlock, `${id}.${k} na defesa`).toBeLessThanOrEqual(0);
      expect(fd.startup, `${id}.${k} início`).toBeGreaterThanOrEqual(3);
    }
    expect(mv.light.onBlock, `${id}.light`).toBeGreaterThanOrEqual(-4);
    expect(mv.lowLight.onBlock, `${id}.lowLight`).toBeGreaterThanOrEqual(-4);
  }
  // identidade: nenhum par de personagens com a mesma assinatura de golpes básicos
  const sig = (mv) => ['light', 'medium', 'heavy', 'air', 'lowLight', 'lowHeavy'].map((k) => `${mv[k].startup}/${mv[k].recovery}/${mv[k].damage}/${mv[k].range}/${mv[k].onBlock}`).join('|');
  const sigs = Object.entries(r.table).map(([id, mv]) => [id, sig(mv)]);
  expect(new Set(sigs.map((s) => s[1])).size, JSON.stringify(sigs)).toBe(sigs.length);
  // estilos coerentes com a IA
  expect(r.table.juraci.heavy.range).toBeGreaterThan(r.table.carlos.heavy.range);
  expect(r.table.pedro.heavy.damage).toBeGreaterThan(r.table.carlos.heavy.damage);
  expect(r.table.carlos.light.startup).toBeLessThan(r.table.pedro.light.startup);
  expect(r.table.paula.lowHeavy.startup).toBeLessThan(r.table.tainara.lowHeavy.startup);

  // regras puras
  expect(r.guard).toEqual({ standHigh: true, standLow: false, crouchLow: { blocked: true, lowGuard: true }, attacking: false, noGuard: false, dummy: true });
  expect(r.dmg).toEqual([100, 70, 55, 22]);
});
