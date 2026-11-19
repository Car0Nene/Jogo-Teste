import { expect, test } from '@playwright/test';

test('loads the game and accepts fight controls at this viewport', async ({ page }, testInfo) => {
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

  await page.getByRole('button', { name: /ARCADE/ }).click();

  const characterScreen = page.locator('.ff-character-select-screen');
  await expect(characterScreen).toBeVisible();
  expect(await characterScreen.evaluate((screen) => screen.scrollHeight <= screen.clientHeight)).toBeTruthy();

  const fighters = [
    ['Juraci', 'juraci'],
    ['Carlos', 'carlos'],
    ['Pedro', 'pedro'],
    ['Daniel', 'daniel'],
    ['Franciely', 'franciely'],
    ['Gabi', 'gabi'],
    ['Paula', 'paula'],
    ['Tainara', 'tainara'],
  ];
  for (const [name, portrait] of fighters) {
    await page.getByRole('button', { name: new RegExp(name, 'i') }).click();
    const image = page.locator(`img[src*="/assets/portraits/${portrait}.webp"]`).first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  }

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
  await page.getByRole('dialog').click();

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
  } else {
    await expect(page.getByRole('button', { name: 'Agachar' })).toBeVisible();
    await lightAttack.click();
    await page.keyboard.press('j');
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(pageErrors).toEqual([]);
  expect(missingAssets).toEqual([]);
});
