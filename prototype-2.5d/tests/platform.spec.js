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
  await page.getByRole('button', { name: /ESCOLHER CEN/ }).click();
  await page.getByRole('button', { name: /INICIAR COMBATE/ }).click();
  await page.getByRole('dialog').click();

  const lightAttack = page.getByRole('button', { name: /Leve/ });
  await expect(lightAttack).toBeVisible();
  if (testInfo.project.name.startsWith('mobile')) {
    await lightAttack.tap();
  } else {
    await lightAttack.click();
    await page.keyboard.press('j');
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(pageErrors).toEqual([]);
  expect(missingAssets).toEqual([]);
});
