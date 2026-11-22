import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('loads the game and accepts fight controls at this viewport', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const pageErrors = [];
  const missingAssets = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === 'http://127.0.0.1:4173') {
      missingAssets.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Menu Principal' })).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
  // perfil escolhido pelas capacidades do aparelho, não pela largura da janela
  const expectedProfile = testInfo.project.name.startsWith('mobile') ? 'mobile' : 'desktop';
  await expect(page.locator('html')).toHaveAttribute('data-platform', expectedProfile);

  await page.getByRole('button', { name: /ARCADE/ }).click();

  const characterScreen = page.locator('.ff-character-select-screen');
  await expect(characterScreen).toBeVisible();
  expect(await characterScreen.evaluate((screen) => screen.scrollHeight <= screen.clientHeight)).toBeTruthy();
  await expect(page.locator('.ff-character-roster-card')).toHaveCount(9);
  for (const card of await page.locator('.ff-character-roster-card').all()) {
    await expect(card).toBeVisible();
  }
  const cardBoxes = await page.locator('.ff-character-roster-card').evaluateAll((cards) =>
    cards.map((card) => {
      const { left, right, top, bottom } = card.getBoundingClientRect();
      return { left, right, top, bottom };
    }),
  );
  for (let i = 0; i < cardBoxes.length; i++) {
    for (let j = i + 1; j < cardBoxes.length; j++) {
      const a = cardBoxes[i];
      const b = cardBoxes[j];
      expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBeTruthy();
    }
  }
  const rosterImages = page.locator('.ff-character-roster-card img');
  await expect(rosterImages).toHaveCount(9);
  for (const image of await rosterImages.all()) {
    await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
    expect(await image.evaluate((img) => {
      const style = getComputedStyle(img);
      return [style.objectFit, style.objectPosition];
    })).toEqual(['cover', '50% 0%']);
    const bounds = await image.locator('xpath=..').boundingBox();
    const cardBounds = await image.locator('xpath=../..').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(cardBounds.x - 1);
    expect(bounds.y).toBeGreaterThanOrEqual(cardBounds.y - 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width + 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(cardBounds.y + cardBounds.height + 1);
  }

  const fighters = [
    ['Juraci', 'juraci'],
    ['Carlos', 'carlos'],
    ['Pedro', 'pedro'],
    ['Daniel', 'daniel'],
    ['Franciely', 'franciely'],
    ['Gabi', 'gabi'],
    ['Paula', 'paula'],
    ['Tainara', 'tainara'],
    ['Davi', 'davi'],
  ];
  for (const [name, portrait] of fighters) {
    await page.getByRole('button', { name: new RegExp(name, 'i') }).click();
    const image = page.locator(`.ff-character-panel img[src*="/assets/portraits/${portrait}.webp"]`).first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
    expect(await image.evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
    const portraitFrame = image.locator('xpath=..');
    const panel = image.locator('xpath=../..');
    expect(await portraitFrame.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(
      await panel.evaluate((el) => el.getBoundingClientRect().width),
    );
    const portraitBounds = await image.boundingBox();
    expect(portraitBounds).not.toBeNull();
    expect(portraitBounds.x).toBeGreaterThanOrEqual(0);
    expect(portraitBounds.y).toBeGreaterThanOrEqual(0);
    expect(portraitBounds.x + portraitBounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    expect(portraitBounds.y + portraitBounds.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
  }

  await page.locator('.ff-character-panel-p1').click();
  await page.getByRole('button', { name: 'Selecionar DAVI' }).click();
  await page.getByRole('button', { name: 'Selecionar DAVI' }).click();
  await expect(page.locator('.ff-character-panel-p1 img[src*="/davi.webp"]')).toBeVisible();
  await expect(page.locator('.ff-character-panel-p2 img[src*="/davi.webp"]')).toBeVisible();

  await page.getByRole('button', { name: /Carlos/i }).click();
  const baptismPortrait = page.locator('img[src*="/assets/portraits/carlos-batizado.webp"]');
  await expect(baptismPortrait).toBeVisible();
  await expect.poll(() => baptismPortrait.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  const newMediaAvailable = await page.evaluate(async () => {
    const paths = [
      '/assets/videos/daniel-victory-imagined.mp4',
      '/assets/videos/daniel-victory-poster.webp',
    ];
    return Promise.all(paths.map(async (path) => (await fetch(path)).ok));
  });

  expect(newMediaAvailable).toEqual([true, true]);

  await page.getByRole('button', { name: /ESCOLHER CEN/ }).click();

  const stageScreen = page.locator('.ff-stage-select-screen');
  await expect(stageScreen).toBeVisible();
  expect(await stageScreen.evaluate((screen) => screen.scrollHeight <= screen.clientHeight)).toBeTruthy();

  for (const name of ['Padaria da Juju', 'Quintal da Família', 'Festa Junina', 'Bar da Simone', 'Praia']) {
    const stageButton = page.getByRole('button', { name: new RegExp(name, 'i') });
    await stageButton.click();
    const hero = page.locator('.ff-stage-select-main > div:first-child > img');
    await expect(hero).toHaveAttribute('alt', new RegExp(name, 'i'));
    expect(await hero.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  }

  await page.getByRole('button', { name: /INICIAR COMBATE/ }).click();
  const introPortraits = page.locator('.ff-match-intro .ff-intro-portrait img');
  await expect(introPortraits).toHaveCount(2);
  await expect.poll(() => introPortraits.first().evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  expect(await introPortraits.first().evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
  expect(await introPortraits.last().evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
  await page.keyboard.press('Enter');
  await expect(page.locator('.ff-match-intro')).toHaveCount(0);

  const lightAttack = page.getByRole('button', { name: /Leve/ });
  await expect(lightAttack).toBeVisible();
  if (testInfo.project.name.startsWith('mobile')) {
    const joystick = page.getByRole('group', { name: /Analógico virtual/ });
    await expect(joystick).toBeVisible();
    const bounds = await joystick.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 8, bounds.y + bounds.height / 2);
    await expect(joystick).toHaveAttribute('data-active-actions', /left/);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height - 5);
    await expect(joystick).toHaveAttribute('data-active-actions', /down/);
    await page.mouse.up();
    await expect(joystick).toHaveAttribute('data-active-actions', '');
    await lightAttack.tap();
    // controles de toque completos: pulo, defesa, especial e sub-especial
    for (const name of ['Pulo', 'Defesa', 'Forte', 'Especial']) {
      const control = page.getByRole('button', { name, exact: true });
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
    }
  } else {
    await expect(page.getByRole('button', { name: 'Agachar' })).toBeVisible();
    await lightAttack.click();
    await page.keyboard.press('j');
  }

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByText('JOGO PAUSADO')).toBeVisible();
  await page.getByRole('button', { name: 'Menu Principal' }).click();
  await expect(page.getByRole('navigation', { name: 'Menu Principal' })).toBeVisible();

  if (testInfo.project.name === 'desktop-chromium') {
    const fullscreen = page.getByRole('button', { name: 'Tela cheia' });
    await fullscreen.click();
    await expect(page.getByRole('button', { name: 'Sair da tela cheia' })).toBeVisible();
    await page.getByRole('button', { name: 'Sair da tela cheia' }).click();
  }

  const schema = await readFile(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
  const fighterConstraints = schema
    .split(/\r?\n/)
    .filter((line) => line.includes('selected_fighter') && /\bin\s*\(/i.test(line));
  expect(fighterConstraints).toHaveLength(5);
  for (const [, fighterId] of fighters) {
    expect(fighterConstraints.every((line) => line.includes(`'${fighterId}'`))).toBeTruthy();
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(pageErrors).toEqual([]);
  expect(missingAssets).toEqual([]);
});

test('Davi uses meter, timed transformation and damaging specials', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { GameEngine } = await import('/src/engine/GameEngine.ts');
    const { pickIntroDialogue } = await import('/src/data/fighters.ts');
    const engine = Object.create(GameEngine.prototype);
    engine.matchPhase = 'fighting';
    engine.gameMode = 'cpu';
    engine.difficulty = 'normal';
    engine.spawnSparks = () => {};
    engine.emitHud = () => {};
    engine.isHeld = () => false;
    const hits = [];
    engine.applyHit = (_a, _b, damage) => hits.push(damage);
    const fighter = {
      id: 'davi', index: 0, x: 0, y: 0, vx: 0, vy: 0, facing: 1,
      hp: 1000, meter: 50, form: 'normal', formTimer: 0, state: 'idle',
      stateTimer: 0, activeMove: null, activeMoveAnim: undefined, moveElapsed: 0,
      moveHitConnected: false, bufferedAttack: null, comboCount: 0,
      comboResetTimer: 0, bark: null, barkTimer: 0, daviIdleTime: 0,
      daviVoiceCooldown: 0, daviSpecialCooldown: 0, hitInvuln: 0, slipTimer: 0,
    };
    const opponent = { x: 1.5, y: 0, state: 'idle' };
    engine.trySpecial(fighter, false);
    const insufficient = [fighter.meter, fighter.form];
    engine.trySpecial(fighter, true);
    const transformed = [fighter.meter, fighter.form, fighter.formTimer];
    engine.stepFighter(fighter, opponent, 1.2, false);
    engine.stepFighter(fighter, opponent, 9, false);
    const expired = fighter.form;
    fighter.meter = 100;
    engine.trySpecial(fighter, false);
    const superMove = [fighter.meter, fighter.form, fighter.activeMove.label];
    fighter.meter = 100;
    engine.trySpecial(fighter, false);
    const cooldownMeter = fighter.meter;
    engine.stepFighter(fighter, opponent, 0.31, false);
    engine.stepFighter(fighter, opponent, 1, false);
    fighter.state = 'idle';
    fighter.meter = 100;
    engine.trySpecial(fighter, false);
    const finalMove = [fighter.meter, fighter.activeMove.label, fighter.bark];
    engine.stepFighter(fighter, opponent, 0.31, false);
    const dialogues = ['pedro', 'paula', 'franciely', 'gabi', 'juraci'].map((relative) => [
      pickIntroDialogue('davi', relative),
      pickIntroDialogue(relative, 'davi'),
    ]);
    const cpu = { id: 'davi', state: 'idle', meter: 100, form: 'normal', x: 0, aiThinkTimer: 0, aiAction: 'idle' };
    const player = { x: 1.5, state: 'idle' };
    const choices = [];
    engine.trySpecial = (_fighter, sub) => choices.push(sub ? 'transform' : 'special');
    engine.tryAttack = (_fighter, attack) => choices.push(attack);
    const random = Math.random;
    try {
      Math.random = () => 0;
      engine.updateCpuAi(cpu, player, 0.3);
      cpu.meter = 50;
      player.x = 4;
      engine.updateCpuAi(cpu, player, 0.3);
      cpu.meter = 0;
      player.x = 1.5;
      engine.updateCpuAi(cpu, player, 0.3);
    } finally {
      Math.random = random;
    }
    return { insufficient, transformed, expired, superMove, finalMove, cooldownMeter, hits, dialogues, choices };
  });

  expect(result.insufficient).toEqual([50, 'normal']);
  expect(result.transformed).toEqual([0, 'daviPurple', 10]);
  expect(result.expired).toBe('normal');
  expect(result.superMove).toEqual([0, 'daviPurple', 'Super Namorador']);
  expect(result.cooldownMeter).toBe(100);
  expect(result.finalMove).toEqual([0, 'Paixão Alviverde', 'Vamos jogar videogame.']);
  expect(result.hits).toHaveLength(2);
  expect(result.hits.every((damage) => damage > 0)).toBeTruthy();
  expect(result.choices).toEqual(['special', 'transform', 'light']);
  for (const [forward, reverse] of result.dialogues) {
    expect(reverse).toEqual(forward.map((line) => ({
      ...line, speaker: line.speaker === 'p1' ? 'p2' : 'p1',
    })));
  }
});

test('Davi voice is not interrupted or overlapped', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { soundEngine } = await import('/src/engine/audio.ts');
    soundEngine.stopAllVoices();
    const originalAudio = window.Audio;
    const created = [];
    class FakeAudio {
      constructor(url) {
        this.src = url;
        this.paused = false;
        created.push(this);
      }
      play() { return Promise.resolve(); }
      pause() { this.paused = true; }
    }
    try {
      window.Audio = FakeAudio;
      soundEngine.playClip('davi', 'outra', 0);
      soundEngine.playClip('pedro', 'combo', 0, true);
      soundEngine.playAnnouncer('fight');
      const duringVoice = [created.length, created[0].paused];
      created[0].onended();
      soundEngine.playClip('pedro', 'combo', 0);
      return { duringVoice, afterVoice: created.length };
    } finally {
      soundEngine.stopAllVoices();
      window.Audio = originalAudio;
    }
  });
  expect(result.duringVoice).toEqual([1, false]);
  expect(result.afterVoice).toBe(2);
});
