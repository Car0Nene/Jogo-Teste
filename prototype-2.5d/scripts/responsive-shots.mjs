// Capturas de todas as telas em desktop, celular (em pé/deitado) e tablet.
//
// Uso (com `npm run dev -- --host 127.0.0.1 --port 4173` rodando):
//   node scripts/responsive-shots.mjs [pasta-de-saida]
//   ONLY=d1920,m844l node scripts/responsive-shots.mjs
//
// Percorre menu → lutador → cenário → apresentação → luta → pausa e confere:
// perfil detectado, erros de console, alvos de toque pequenos e elementos fora da tela.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const out = resolve(process.argv[2] || join(tmpdir(), 'ff25d-shots'));
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// nome, largura, altura, toque, dpr, userAgent, perfil esperado
const DEVICES = [
  ['d1366', 1366, 768, false, 1, null, 'desktop'],
  ['d1920', 1920, 1080, false, 1, null, 'desktop'],
  ['d2560', 2560, 1440, false, 1, null, 'desktop'],
  ['d3440uw', 3440, 1440, false, 1, null, 'desktop'],
  ['d1280x600', 1280, 600, false, 1, null, 'desktop'],
  ['m360p', 360, 640, true, 3, ANDROID, 'mobile'],
  ['m375p', 375, 667, true, 2, IPHONE, 'mobile'],
  ['m390p', 390, 844, true, 3, IPHONE, 'mobile'],
  ['m412p', 412, 915, true, 2.6, ANDROID, 'mobile'],
  ['m430p', 430, 932, true, 3, IPHONE, 'mobile'],
  ['m667l', 667, 375, true, 2, IPHONE, 'mobile'],
  ['m844l', 844, 390, true, 3, IPHONE, 'mobile'],
  ['m932l', 932, 430, true, 3, IPHONE, 'mobile'],
  ['t768p', 768, 1024, true, 2, TABLET, 'tablet'],
  ['t1180l', 1180, 820, true, 2, TABLET, 'tablet'],
];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;

async function problemsOnScreen(page, tag) {
  return page.evaluate((label) => {
    const out = [];
    const vw = innerWidth;
    const vh = innerHeight;
    const coarse = document.documentElement.dataset.ui === 'touch';
    for (const el of document.querySelectorAll('button, [role="group"], select, input')) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') continue;
      if (el.closest('[data-scrollable], .overflow-y-auto, .overflow-auto')) continue;
      const name = (el.getAttribute('aria-label') || el.textContent || el.className || '').trim().slice(0, 24);
      if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) continue; // fora de vista por rolagem
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(`${label}: cortado "${name}"`);
      if (coarse && el.tagName === 'BUTTON' && (r.width < 40 || r.height < 40)) out.push(`${label}: toque pequeno "${name}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  }, tag);
}

const browser = await chromium.launch({ args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'] });
const summary = [];
for (const [name, w, h, touch, dpr, ua, expected] of DEVICES) {
  if (only && !only.includes(name)) continue;
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: touch, hasTouch: touch, userAgent: ua || undefined });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const problems = [];
  const shot = async (tag) => {
    await page.screenshot({ path: join(out, `${name}-${tag}.png`) });
    problems.push(...(await problemsOnScreen(page, tag)));
  };
  try {
    await page.goto(BASE);
    await page.getByRole('navigation', { name: 'Menu Principal' }).waitFor();
    await page.waitForTimeout(1200);
    const profile = await page.evaluate(() => document.documentElement.dataset.platform || 'n/a');
    if (profile !== 'n/a' && profile !== expected) problems.push(`perfil ${profile}, esperado ${expected}`);
    await shot('01-menu');
    await page.getByRole('button', { name: /ARCADE/ }).click();
    await page.locator('.ff-character-select-screen').waitFor();
    await page.waitForTimeout(700);
    await shot('02-lutador');
    await page.getByRole('button', { name: /ESCOLHER CEN/ }).click();
    await page.locator('.ff-stage-select-screen').waitFor();
    await page.waitForTimeout(600);
    await shot('03-cenario');
    await page.getByRole('button', { name: /INICIAR COMBATE/ }).click();
    await page.waitForTimeout(900);
    await shot('04-apresentacao');
    await page.keyboard.press('Enter');
    await page.locator('.ff-match-intro').waitFor({ state: 'detached' });
    await page.waitForTimeout(2500);
    await shot('05-luta');
    const skip = page.getByRole('button', { name: 'Pular' });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.waitForTimeout(2500);
    await shot('06-luta-b');
    await page.getByRole('button', { name: 'Pausar' }).click();
    await page.waitForTimeout(400);
    await shot('07-pausa');
    console.log(`${name.padEnd(10)} perfil=${profile.padEnd(8)} ${errors.length ? `ERROS: ${errors.join(' | ')}` : 'sem erros'}${problems.length ? `\n    - ${[...new Set(problems)].join('\n    - ')}` : ''}`);
    summary.push({ name, profile, errors, problems });
  } catch (error) {
    console.log(`${name.padEnd(10)} FALHOU: ${error.message.split('\n')[0]}`);
    await page.screenshot({ path: join(out, `${name}-falha.png`) }).catch(() => {});
    summary.push({ name, failed: error.message });
  }
  await context.close();
}
await browser.close();
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`capturas em ${out}`);
