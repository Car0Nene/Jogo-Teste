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
    // card e retrato medidos no mesmo quadro (evita corrida com reflow de fonte/grade)
    await expect.poll(() => image.evaluate((img) => {
      const p = img.parentElement.getBoundingClientRect();
      const c = img.parentElement.parentElement.getBoundingClientRect();
      return p.left >= c.left - 1 && p.top >= c.top - 1 && p.right <= c.right + 1 && p.bottom <= c.bottom + 1;
    })).toBeTruthy();
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
  await expect.poll(() => introPortraits.first().evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
  await expect.poll(() => introPortraits.last().evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
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
    // IA da CPU (engine/ai/FighterAI.ts): Davi usa o especial de perto, se transforma de longe e bate sem barra
    const { FighterAI } = await import('/src/engine/ai/FighterAI.ts');
    const view = (o) => ({ id: 'davi', x: 0, y: 0, vy: 0, facing: 1, hp: 1000, maxHp: 1000, meter: 0, form: 'normal', state: 'idle', move: null, moveElapsed: 0, moveHitConnected: false, noGuardTimer: 0, gag: null, ...o });
    const choices = [];
    const out = { setHolds: () => {}, press: (a) => choices.push(a === 'subSpecial' ? 'transform' : a) };
    const decide = (meter, oppX) => {
      const ai = new FighterAI('davi', 'hard', () => 0);
      ai.update(0.3, { me: view({ meter }), opp: view({ id: 'pedro', x: oppX }), arenaHalfW: 7.4, incomingProjectile: null }, out);
    };
    decide(100, 1.5);
    decide(50, 2.8);
    decide(0, 1.5);
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

test('loads the HD move atlases and builds all detailed arenas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const fighterIds = ['juraci', 'carlos', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'pedro'];
    const atlasPaths = [
      ...fighterIds.map((id) => `/assets/sprites/${id}-specials-hd.webp`),
      ...fighterIds.filter((id) => id !== 'pedro').map((id) => `/assets/sprites/${id}-hd.webp`),
    ];
    const atlasAvailable = await Promise.all(
      atlasPaths.map(async (path) => (await fetch(path)).ok),
    );
    const { buildStage } = await import('/src/engine/stageBuilder.ts');
    const stageIds = ['padaria', 'quintal', 'festa', 'bar', 'praia'];
    const parallaxUpdated = stageIds.map((id) => {
      const stage = buildStage(id, 4);
      const initialX = stage.backdrop.position.x;
      stage.setParallax?.(4);
      const updatedX = stage.backdrop.position.x;
      stage.setParticlesEnabled(false);
      stage.update(1, 1 / 60);
      stage.dispose();
      return updatedX !== initialX;
    });

    return { atlasAvailable, parallaxUpdated };
  });

  expect(result.atlasAvailable).toEqual(Array(15).fill(true));
  expect(result.parallaxUpdated).toEqual(Array(5).fill(true));
});

test('cast voices exist and play on select, specials, KO and victory', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  const ids = ['juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi'];
  const files = ['select', 'intro', 'special', 'sub_special', 'win', 'ko'];
  for (const id of ids) {
    for (const file of files) {
      const res = await request.get(`/assets/voice/elenco/${id}/${file}.mp3`);
      expect(res.status(), `${id}/${file}`).toBe(200);
      expect((await res.body()).length, `${id}/${file}`).toBeGreaterThan(5000);
    }
  }
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { GameEngine } = await import('/src/engine/GameEngine.ts');
    const { soundEngine } = await import('/src/engine/audio.ts');
    const played = [];
    soundEngine.playClip = (who, key) => played.push(`${who}:${key}`);
    soundEngine.playSpecial = () => {};
    soundEngine.playBless = () => {};
    soundEngine.playKO = () => {};
    const engine = Object.create(GameEngine.prototype);
    Object.assign(engine, {
      matchPhase: 'fighting', gameMode: 'cpu', difficulty: 'normal', disposed: true,
      emitHud() {}, spawnSparks() {}, spawnProjectile() {}, spawnCameo() {}, setBark() {},
      activateTransform(f, form) { f.form = form; f.state = 'transform'; },
    });
    const make = (id) => ({
      id, index: 0, x: 0, y: 0, vx: 0, vy: 0, facing: 1, hp: 1000, meter: 100, form: 'normal',
      formTimer: 0, state: 'idle', stateTimer: 0, activeMove: null, moveElapsed: 0, roundsWon: 0,
      comboCount: 0, comboResetTimer: 0, bark: null, barkTimer: 0, nextCarlosForm: 'gordao',
      daviIdleTime: 0, daviVoiceCooldown: 0, daviSpecialCooldown: 0, hitInvuln: 0, slipTimer: 0,
    });
    const realRandom = Math.random;
    const out = {};
    for (const id of ['juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara']) {
      out[id] = [];
      for (const [roll, sub] of [[0.9, false], [0.9, true], [0.1, false]]) {
        Math.random = () => roll;
        played.length = 0;
        const f = make(id);
        engine.trySpecial(f, sub);
        out[id].push(played.join(','));
      }
    }
    Math.random = realRandom;
    played.length = 0;
    const carlos = make('carlos');
    carlos.nextCarlosForm = 'crente';
    engine.trySpecial(carlos, false);
    out.carlosFe = played.join(',');
    played.length = 0;
    engine.triggerKO(make('pedro'), make('tainara'));
    out.ko = played.join(',');
    return out;
  });
  // cada especial toca exatamente uma fala, e ela é do próprio lutador
  for (const id of ['juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara']) {
    for (const k of [0, 1]) {
      const clips = result[id][k].split(',').filter(Boolean);
      expect(clips.length, `${id} ${k ? 'sub-especial' : 'especial'}`).toBe(1);
    }
  }
  expect(result.carlos[0]).toBe('carlos:cast_special');
  expect(result.carlos[1]).toBe('carlos:cast_subSpecial');
  expect(result.juraci[0]).toBe('juraci:cast_special');
  expect(result.juraci[1]).toBe('juraci:cast_subSpecial');
  // segundo especial do Carlos é o Modo Fé: nunca a fala do Gordão
  expect(result.carlosFe).not.toContain('cast_special');
  // a fala de nocaute é sorteada entre a original e as variações (ko2/ko3)
  expect(result.ko).toMatch(/^tainara:cast_ko[23]?$/);
});

test('every adult fighter has the full Pedro-standard animation set and impact sounds load', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  const ids = ['carlos', 'juraci', 'daniel', 'franciely', 'gabi', 'paula', 'tainara'];
  const anims = ['idle', 'walk', 'run', 'light', 'medium', 'heavy', 'jump', 'flykick', 'crouch', 'guard', 'hurt', 'knockdown', 'getup', 'win'];
  await page.goto('/');
  const data = await page.evaluate(async () => {
    const { HD_ANIMS, HD_ANIM_VERSION } = await import('/src/data/hdAnimAtlas.ts');
    return { HD_ANIMS, HD_ANIM_VERSION };
  });
  for (const id of ids) {
    expect(data.HD_ANIM_VERSION[id], id).toBeTruthy();
    for (const a of anims) expect(data.HD_ANIMS[id]?.[a]?.length ?? 0, `${id}.${a}`).toBeGreaterThanOrEqual(2);
    const res = await request.get(`/assets/sprites/${id}-anim-hd.webp`);
    expect(res.status(), `${id} atlas`).toBe(200);
  }
  // nenhuma animação de lutador pode cair na arte antiga (só o atlas novo, tier 6)
  const legacy = await page.evaluate(async () => {
    const { SPRITE_ATLAS } = await import('/src/data/spriteAtlas.ts');
    const bad = [];
    for (const [id, m] of Object.entries(SPRITE_ATLAS)) {
      if (id === 'cao') continue;
      for (const [k, fr] of Object.entries(m)) if (!fr.length || fr.some((f) => f[6] !== 6)) bad.push(`${id}.${k}`);
    }
    return bad;
  });
  expect(legacy).toEqual([]);
  for (const sfx of ['hit_light', 'hit_heavy', 'kick', 'block', 'whoosh_light', 'whoosh_heavy', 'fall']) {
    const res = await request.get(`/assets/sfx/${sfx}.mp3`);
    expect(res.status(), sfx).toBe(200);
  }
});

test('move structure, low guard, training data and story assets', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { commandListFor, lowMoves } = await import('/src/data/commands.ts');
    const { STORY } = await import('/src/data/story.ts');
    const ids = ['juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi'];
    const lists = ids.map((id) => commandListFor(id).map((c) => c.id));
    const { BANTER } = await import('/src/data/banter.ts');
    const { clipText } = await import('/src/engine/audio.ts');
    const bt = BANTER.filter((b) => b.weight).flatMap((b) => b.lines.map((l) => [l.who, l.key, clipText(l.who, l.key) ?? '']));
    return { bt, lists, low: lowMoves('carlos').heavy, story: STORY.map((c) => ({ imgs: c.panels.map((p) => p.img), clips: c.panels.flatMap((p) => p.lines.map((l) => l.clip)) })) };
  });
  for (const l of r.lists) {
    for (const id of ['light', 'heavy', 'air', 'lowLight', 'lowHeavy', 'chainMedium', 'chainHeavy', 'special', 'subSpecial', 'guard']) expect(l).toContain(id);
  }
  expect(r.low.low).toBe(true);
  expect(r.low.knockdown).toBe(true);
  expect(r.bt.length).toBe(30);
  for (const [who, key, text] of r.bt) {
    expect(text, `${who}.${key}`).not.toBe('');
    expect((await request.get(`/assets/voice/elenco/${who}/${key.replace('bt_', 'bt-')}.mp3`)).status(), `${who}.${key}`).toBe(200);
  }
  expect((await request.get('/assets/story/abertura.mp4')).status()).toBe(200);
  for (const c of r.story) {
    for (const img of c.imgs) expect((await request.get(`/assets/story/${img}.webp`)).status(), img).toBe(200);
    for (const clip of c.clips) expect((await request.get(`/assets/voice/story/${clip}.mp3`)).status(), clip).toBe(200);
  }
});
