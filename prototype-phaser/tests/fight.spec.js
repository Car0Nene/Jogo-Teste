import { expect, test } from '@playwright/test';

async function getFightState(page) {
  return page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    if (!fight) return { active: false, ready: false, fighters: [] };
    const active = game.scene.isActive('FightScene');
    const fighters = fight.fighters || [];
    const ui = game.scene.getScene('UIScene');
    return {
      active,
      ready: active && fighters.length === 2 && Boolean(fight.stageData)
        && game.scene.isActive('UIScene') && Boolean(ui?.subStatus),
      status: fight.matchStatus,
      matchTime: fight.matchTime,
      stageId: fight.stageData?.id,
      backgroundVisible: fight.background?.visible || false,
      backgroundTexture: fight.background?.texture?.key,
      stageLabel: ui?.subStatus?.text,
      cameraZoom: fight.cameras.main.zoom,
      fighters: fighters.map(fighter => ({
        name: fighter.characterData.name,
        active: fighter.active,
        textureKey: fighter.textureKey,
        state: fighter.state,
        form: fighter.form,
        health: fighter.health,
        x: fighter.x,
        y: fighter.y,
        depthPosition: fighter.depthPosition,
        projectedGroundY: fighter.projectedGroundY,
        renderDepth: fighter.depth
      }))
    };
  });
}

async function openCharacterSelect(page) {
  await page.goto('/');
  await expect(page.locator('#start-button')).toBeEnabled();
  await page.locator('#start-button').click();
  await expect.poll(async () => page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.isActive('CharacterSelectScene');
  })).toBe(true);
}

async function startMatch(page, selection = {}) {
  await openCharacterSelect(page);
  await page.evaluate(async matchSelection => {
    const { game } = await import('/src/main.js');
    const scene = game.scene.getScene('CharacterSelectScene');
    Object.assign(scene.selection, matchSelection);
    scene.confirmSelection();
  }, selection);
  await expect.poll(async () => (await getFightState(page)).ready).toBe(true);
}

test('menu starts a visible fight scene with the arena and both fighters', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) {
      errors.push(message.text());
    }
  });

  await page.goto('/');
  await expect(page.locator('#start-screen')).toBeVisible();
  await startMatch(page);
  await expect.poll(async () => (await getFightState(page)).status, { timeout: 15_000 }).toBe('fight');
  await expect.poll(async () => (await getFightState(page)).fighters[0].form).toBe('transformed');
  const fight = await getFightState(page);
  expect(fight.backgroundVisible).toBe(true);
  expect(fight.backgroundTexture).toBe('bar');
  expect(fight.fighters).toHaveLength(2);
  expect(fight.fighters.map(fighter => fighter.name)).toEqual([
    'PEDRO · MONSTRÃO',
    'PAULA'
  ]);
  expect(fight.fighters.every(fighter => fighter.active && fighter.x > 0 && fighter.y > 0)).toBe(true);
  await page.keyboard.down('d');
  await page.waitForTimeout(250);
  await page.keyboard.up('d');
  const movedFight = await getFightState(page);
  expect(movedFight.fighters[0].x).toBeGreaterThan(fight.fighters[0].x);
  expect(errors).toEqual([]);
});

test('Pedro transformation switches from the verified transition frames to transformed idle', async ({ page }) => {
  await startMatch(page);
  await expect.poll(async () => (await getFightState(page)).fighters[0].form, { timeout: 10_000 })
    .toBe('transformed');
  const pedro = (await getFightState(page)).fighters[0];
  expect(pedro.state).not.toBe('transformation');
  const frame = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('FightScene').fighters[0].frame.name;
  });
  expect(['pedro/hulk_0', 'pedro/hulk_1', 'pedro/hulk_2']).toContain(frame);
});

test('fight remains playable when original character and stage images fail to load', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) {
      errors.push(message.text());
    }
  });
  await page.route('**/assets/fighters.webp', route => route.abort());
  await page.route('**/assets/bar.webp', route => route.abort());

  await startMatch(page);
  const fight = await getFightState(page);
  expect(fight.backgroundVisible).toBe(true);
  expect(fight.fighters).toHaveLength(2);
  expect(fight.fighters.every(fighter => fighter.textureKey === 'fallback-fighters')).toBe(true);
  expect(errors).toEqual([]);
});

test('a confirmed hit can cancel into a cooldown-protected combo and restart resets the round', async ({ page }) => {
  await startMatch(page);
  await expect.poll(async () => (await getFightState(page)).ready).toBe(true);
  await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    fight.beginFight(fight.matchFlow.generation);
  });
  await expect.poll(async () => (await getFightState(page)).status, { timeout: 15_000 }).toBe('fight');
  await expect.poll(async () => (await getFightState(page)).fighters[0].form).toBe('transformed');

  const result = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    const [pedro, paula] = fight.fighters;
    const floorY = fight.stageData.groundY;
    for (const [fighter, x] of [[pedro, 360], [paula, 420]]) {
      fighter.depthPosition = 0.55;
      fighter.depthVelocity = 0;
      fighter.physicsBody.reset(
        x - fighter.characterData.body.width / 2,
        floorY - fighter.characterData.body.height
      );
      fighter.syncVisual();
      fighter.invulnerabilityTime = 0;
    }
    paula.transition('idle', { complete: true });
    paula.stunTime = 0;
    paula.attack = null;
    const healthBefore = paula.health;
    const started = pedro.beginAttack('punch');
    pedro.attack.time = pedro.attack.move.startup + 0.03;
    fight.combat.update(fight.fighters);
    const healthAfterHit = paula.health;
    pedro.attack.time = 0.24;
    const canceledIntoKick = pedro.beginAttack('kick');
    const kickOnCooldown = pedro.cooldowns.kick > 0;
    return { healthBefore, healthAfterHit, started, canceledIntoKick, kickOnCooldown, comboCount: pedro.comboCount };
  });

  expect(result.started).toBe(true);
  expect(result.healthAfterHit).toBeLessThan(result.healthBefore);
  expect(result.canceledIntoKick).toBe(true);
  expect(result.kickOnCooldown).toBe(true);
  expect(result.comboCount).toBe(1);

  await page.locator('#restart-button').click();
  await expect.poll(async () => (await getFightState(page)).fighters.map(fighter => fighter.health))
    .toEqual([1000, 1000]);
  const restarted = await getFightState(page);
  expect(restarted.matchTime).toBeGreaterThan(58);
  expect(restarted.fighters[0].form).toBe('normal');
});

test('the arena remains fitted to a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startMatch(page);

  const dimensions = await page.locator('#game-root canvas').boundingBox();
  expect(dimensions.width).toBeLessThanOrEqual(390);
  expect(dimensions.height).toBeLessThanOrEqual(844);
  expect(dimensions.height).toBeGreaterThan(500);
  const hud = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const ui = game.scene.getScene('UIScene');
    return {
      statusWidth: ui.statusText.width,
      leftNameWidth: ui.leftName.width,
      clockX: ui.clockText.x,
      width: ui.scale.width
    };
  });
  expect(hud.statusWidth).toBeLessThan(hud.width);
  expect(hud.leftNameWidth).toBeLessThan(hud.clockX - 28);
});

test('Praia selection, 2.5D movement, ground-depth sorting, and camera framing work', async ({ page }) => {
  await startMatch(page, { stageId: 'praia' });
  await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    fight.beginFight(fight.matchFlow.generation);
  });
  await expect.poll(async () => (await getFightState(page)).status, { timeout: 15_000 }).toBe('fight');

  const initial = await getFightState(page);
  expect(initial.stageId).toBe('praia');
  expect(initial.backgroundTexture).toBe('praia');
  expect(initial.stageLabel).toBe('PRAIA');
  const before = initial.fighters[0].depthPosition;

  await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const [pedro] = game.scene.getScene('FightScene').fighters;
    pedro.transition('idle', { complete: true });
    pedro.attack = null;
    pedro.stunTime = 0;
    pedro.invulnerabilityTime = 3;
  });
  await page.keyboard.down('s');
  await page.waitForTimeout(600);
  await page.keyboard.up('s');
  const advanced = await getFightState(page);
  expect(advanced.fighters[0].depthPosition).toBeGreaterThan(before);
  expect(advanced.fighters[0].projectedGroundY).toBeGreaterThan(initial.fighters[0].projectedGroundY);

  const measured = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    const [pedro, paula] = fight.fighters;
    pedro.depthPosition = fight.stageData.depth.min + 0.01;
    pedro.depthVelocity = 0;
    pedro.updateDepthPosition(0.1, -1);
    const minDepthBound = pedro.depthPosition === fight.stageData.depth.min;
    pedro.depthPosition = fight.stageData.depth.max - 0.01;
    pedro.depthVelocity = 0;
    pedro.updateDepthPosition(0.1, 1);
    const maxDepthBound = pedro.depthPosition === fight.stageData.depth.max;
    pedro.depthPosition = 1;
    paula.depthPosition = 0;
    pedro.syncVisual();
    paula.syncVisual();
    const depthOrder = pedro.depth > paula.depth;
    const renderDepthBeforeJump = pedro.depth;
    pedro.transition('idle', { complete: true });
    pedro.attack = null;
    pedro.stunTime = 0;
    pedro.physicsBody.reset(
      pedro.physicsBody.x,
      fight.stageData.groundY - pedro.physicsBody.height
    );
    pedro.physicsBody.setVelocity(0, 0);
    await new Promise(resolve => setTimeout(resolve, 50));
    pedro.syncVisual();
    const groundedVisualY = pedro.y;
    pedro.physicsBody.setVelocityY(-pedro.characterData.stats.jumpSpeed);
    await new Promise(resolve => setTimeout(resolve, 180));
    pedro.syncVisual();
    const jumpKeepsGroundDepth = Math.abs(pedro.depth - renderDepthBeforeJump) < 0.01;
    const visualYAfterJump = pedro.y;
    const jumpMovesSpriteIndependently = visualYAfterJump < groundedVisualY;
    const { horizontalBounds } = fight.stageData;
    pedro.physicsBody.x = horizontalBounds.left;
    paula.physicsBody.x = horizontalBounds.right - paula.physicsBody.width;
    pedro.physicsBody.updateCenter();
    paula.physicsBody.updateCenter();
    pedro.syncVisual();
    paula.syncVisual();
    fight.cameraSystem.update(fight.fighters, 32);
    return {
      depthOrder,
      minDepthBound,
      maxDepthBound,
      fightersRespectHorizontalBounds: pedro.x >= horizontalBounds.left
        && paula.x <= horizontalBounds.right,
      jumpKeepsGroundDepth,
      jumpMovesSpriteIndependently,
      cameraZoom: fight.cameras.main.zoom,
    };
  });
  expect(measured.depthOrder).toBe(true);
  expect(measured.minDepthBound).toBe(true);
  expect(measured.maxDepthBound).toBe(true);
  expect(measured.fightersRespectHorizontalBounds).toBe(true);
  expect(measured.jumpKeepsGroundDepth).toBe(true);
  expect(measured.jumpMovesSpriteIndependently).toBe(true);
  expect(measured.cameraZoom).toBeLessThan(1);
});

test('selection enables only implemented fighters and carries the chosen pair and arena into combat', async ({ page }) => {
  await openCharacterSelect(page);
  const selection = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const scene = game.scene.getScene('CharacterSelectScene');
    const before = { ...scene.selection };
    scene.activeSlot = 0;
    scene.selectCharacter(scene.roster.find(character => character.id === 'paula'));
    scene.activeSlot = 1;
    scene.selectCharacter(scene.roster.find(character => character.id === 'pedro'));
    scene.changeStage(1);
    const lockedCharacter = scene.roster.find(character => character.id === 'juraci');
    scene.activeSlot = 0;
    scene.selectCharacter(lockedCharacter);
    const afterLockedAttempt = { ...scene.selection };
    scene.confirmSelection();
    return {
      before,
      afterLockedAttempt,
      playerId: game.registry.get('prototypeSelection').playerId,
      opponentId: game.registry.get('prototypeSelection').opponentId,
      stageId: game.registry.get('prototypeSelection').stageId
    };
  });
  expect(selection.before).toEqual({ playerId: 'pedro', opponentId: 'paula', stageId: 'bar' });
  expect(selection.afterLockedAttempt).toEqual({
    playerId: 'paula',
    opponentId: 'pedro',
    stageId: 'praia'
  });
  expect(selection.playerId).toBe('paula');
  expect(selection.opponentId).toBe('pedro');
  expect(selection.stageId).toBe('praia');
  await expect.poll(async () => (await getFightState(page)).ready).toBe(true);
  const fight = await getFightState(page);
  expect(fight.stageId).toBe('praia');
  expect(fight.fighters.map(fighter => fighter.name)).toEqual(['PAULA', 'PEDRO · MONSTRÃO']);
});

test('keyboard navigation selects both fighters and the Praia arena', async ({ page }) => {
  await openCharacterSelect(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await getFightState(page)).ready).toBe(true);
  const fight = await getFightState(page);
  expect(fight.stageId).toBe('praia');
  expect(fight.fighters.map(fighter => fighter.name)).toEqual(['PAULA', 'PEDRO · MONSTRÃO']);
});

test('cinematic introduction announces Ready, Round One, and Fight before enabling combat', async ({ page }) => {
  await openCharacterSelect(page);
  await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    window.matchStatuses = [];
    game.events.on('prototype:match-status', status => window.matchStatuses.push(status));
    game.scene.getScene('CharacterSelectScene').confirmSelection();
  });
  await expect.poll(async () => page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('FightScene').cameras.main.zoom > 1.02;
  }), { timeout: 2000 }).toBe(true);
  const introZoom = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('FightScene').cameras.main.zoom;
  });
  await expect.poll(async () => (await getFightState(page)).status, { timeout: 15_000 }).toBe('fight');
  const sequence = await page.evaluate(() => window.matchStatuses);
  expect(sequence.filter(status => ['intro', 'round', 'fight'].includes(status)))
    .toEqual(['intro', 'round', 'fight']);
  const camera = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    return { mode: fight.cameraSystem.mode, zoom: fight.cameras.main.zoom };
  });
  expect(camera.mode).toBe('normal');
  expect(camera.zoom).toBeLessThan(introZoom);
});

test('KO result is idempotent, can restart, and returns to the title menu', async ({ page }) => {
  await startMatch(page);
  const resultCount = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    const audio = game.registry.get('audioSystem');
    audio.toggleAnnouncer();
    let count = 0;
    const phases = [];
    game.events.on('prototype:match-ended', () => count++);
    game.events.on('prototype:result-phase', result => phases.push(result.title));
    fight.finishMatch(fight.fighters[0]);
    fight.finishMatch(fight.fighters[1]);
    return { count, status: fight.matchStatus, phases };
  });
  expect(resultCount.count).toBe(1);
  expect(resultCount.status).toBe('ended');
  expect(resultCount.phases[0]).toBe('K.O.!');
  await expect(page.locator('#result-actions')).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('UIScene').statusText.text;
  })).toBe('YOU WIN!');

  await page.locator('#result-restart-button').click();
  await expect(page.locator('#result-actions')).toBeHidden();
  await expect.poll(async () => (await getFightState(page)).fighters.map(fighter => fighter.health))
    .toEqual([1000, 1000]);
  await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const fight = game.scene.getScene('FightScene');
    fight.beginFight(fight.matchFlow.generation);
    fight.finishMatch(fight.fighters[1]);
  });
  await expect.poll(async () => page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('UIScene').statusText.text;
  })).toBe('YOU LOSE!');
  await expect(page.locator('#result-menu-button')).toBeVisible();
  await page.locator('#result-menu-button').click();
  await expect(page.locator('#start-screen')).toBeVisible();
  await expect(page.locator('#game-tools')).toBeHidden();
});

test('time over with equal health is announced as a draw', async ({ page }) => {
  await startMatch(page);
  await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    game.registry.get('audioSystem').toggleAnnouncer();
    const fight = game.scene.getScene('FightScene');
    fight.beginFight(fight.matchFlow.generation);
    fight.fighters.forEach(fighter => { fighter.health = 500; });
    fight.matchTime = 0;
    fight.update(0, 16);
  });
  await expect.poll(async () => page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('UIScene').statusText.text;
  })).toBe('DRAW!');
  const result = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('UIScene').subStatus.text;
  });
  expect(result).toBe('A MATCH DRAW');
});
