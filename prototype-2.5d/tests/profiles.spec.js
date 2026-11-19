import { expect, test } from '@playwright/test';

/**
 * Device-profile matrix: every case opens the real game, enters a fight and
 * checks profile detection, control scheme, HUD bounds, touch-target size,
 * orientation change during a match and (for touch) simultaneous input.
 */
const CASES = [
  { name: 'desktop 1366x768', vp: [1366, 768], touch: false, profile: 'desktop', orientation: 'landscape' },
  { name: 'desktop 1920x1080', vp: [1920, 1080], touch: false, profile: 'desktop', orientation: 'landscape' },
  { name: 'desktop 2560x1440', vp: [2560, 1440], touch: false, profile: 'desktop', orientation: 'landscape' },
  { name: 'desktop ultrawide 3440x1440', vp: [3440, 1440], touch: false, profile: 'desktop', orientation: 'landscape' },
  { name: 'desktop small window 800x600', vp: [800, 600], touch: false, profile: 'desktop', orientation: 'landscape' },
  { name: 'phone 360x640', vp: [360, 640], touch: true, profile: 'mobile', orientation: 'portrait' },
  { name: 'phone 375x667', vp: [375, 667], touch: true, profile: 'mobile', orientation: 'portrait' },
  { name: 'phone 390x844', vp: [390, 844], touch: true, profile: 'mobile', orientation: 'portrait' },
  { name: 'phone 412x915', vp: [412, 915], touch: true, profile: 'mobile', orientation: 'portrait' },
  { name: 'phone 430x932', vp: [430, 932], touch: true, profile: 'mobile', orientation: 'portrait' },
  { name: 'phone landscape 844x390', vp: [844, 390], touch: true, profile: 'mobile', orientation: 'landscape' },
  { name: 'phone landscape 915x412', vp: [915, 412], touch: true, profile: 'mobile', orientation: 'landscape' },
  { name: 'tablet portrait 820x1180', vp: [820, 1180], touch: true, profile: 'tablet', orientation: 'portrait' },
  { name: 'tablet landscape 1180x820', vp: [1180, 820], touch: true, profile: 'tablet', orientation: 'landscape' },
];

async function enterFight(page) {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Menu Principal' })).toBeVisible();
  await page.getByRole('button', { name: /ARCADE/ }).click();
  await page.getByRole('button', { name: /ESCOLHER CEN/ }).click();
  await page.getByRole('button', { name: /INICIAR COMBATE/ }).click();
  await expect(page.locator('.ff-match-intro')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ff-match-intro')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
}

async function hudReport(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hud = document.querySelector('.ff-hud-controls');
    const outside = [];
    const small = [];
    for (const el of hud.querySelectorAll('button, [role="group"]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) {
        outside.push(`${el.getAttribute('aria-label') || el.textContent} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.right)},${Math.round(r.bottom)}`);
      }
      if (el.tagName === 'BUTTON' && (r.width < 40 || r.height < 40) && !el.disabled) {
        small.push(`${el.getAttribute('aria-label') || el.textContent} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    const kids = [...hud.children];
    const top = kids[0].getBoundingClientRect();
    const bottom = kids[kids.length - 1].getBoundingClientRect();
    const html = document.documentElement;
    return {
      profile: html.dataset.profile,
      orientation: html.dataset.orientation,
      control: html.dataset.control,
      outside,
      small,
      topBottomOverlap: top.bottom > bottom.top + 1,
      scrollOk: html.scrollWidth <= window.innerWidth && html.scrollHeight <= window.innerHeight + 1,
    };
  });
}

for (const c of CASES) {
  test.describe(c.name, () => {
    test.use({
      viewport: { width: c.vp[0], height: c.vp[1] },
      hasTouch: c.touch,
      isMobile: c.touch,
      deviceScaleFactor: c.touch ? 2 : 1,
    });

    test('profile, controls and HUD fit', async ({ page }, testInfo) => {
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await enterFight(page);

      const report = await hudReport(page);
      expect(report.profile).toBe(c.profile);
      expect(report.orientation).toBe(c.orientation);
      expect(report.control).toBe(c.touch ? 'touch' : 'keyboard');
      expect(report.outside).toEqual([]);
      expect(report.topBottomOverlap).toBe(false);
      expect(report.scrollOk).toBe(true);
      if (c.touch) expect(report.small).toEqual([]);

      await testInfo.attach('fight', { body: await page.screenshot(), contentType: 'image/png' });

      if (c.touch) {
        // Movement + attack at the same time (two independent pointers).
        const stick = page.getByRole('group', { name: /Analógico virtual/ });
        const lightBtn = page.getByRole('button', { name: /^Leve/ });
        await stick.evaluate((el) => {
          const r = el.getBoundingClientRect();
          el.dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true, pointerId: 11, pointerType: 'touch', isPrimary: true,
              clientX: r.right - 8, clientY: r.top + r.height / 2,
            }),
          );
        });
        await expect(stick).toHaveAttribute('data-active-actions', /right/);
        await lightBtn.evaluate((el) => {
          const r = el.getBoundingClientRect();
          el.dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true, pointerId: 12, pointerType: 'touch',
              clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
            }),
          );
        });
        await expect(stick).toHaveAttribute('data-active-actions', /right/);
        await stick.evaluate((el) =>
          el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 11, pointerType: 'touch' })),
        );
        await expect(stick).toHaveAttribute('data-active-actions', '');
      }

      // Rotate / resize during the match: profile must stay, layout must refit.
      await page.setViewportSize({ width: c.vp[1], height: c.vp[0] });
      const flipped = c.orientation === 'portrait' ? 'landscape' : 'portrait';
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.orientation)).toBe(flipped);
      const rotated = await hudReport(page);
      expect(rotated.profile).toBe(c.profile);
      expect(rotated.outside).toEqual([]);
      expect(rotated.topBottomOverlap).toBe(false);
      await testInfo.attach('fight-rotated', { body: await page.screenshot(), contentType: 'image/png' });

      expect(pageErrors).toEqual([]);
    });
  });
}

test('manual control mode override is honoured', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await enterFight(page);
  expect(await page.evaluate(() => document.documentElement.dataset.control)).toBe('keyboard');
  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: /Controles/ }).click();
  await page.getByRole('button', { name: 'Toque', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.control)).toBe('touch');
});
