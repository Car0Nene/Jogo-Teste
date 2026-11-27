import { expect, test } from '@playwright/test';

/**
 * Online casual de ponta a ponta entre duas abas (modo local: BroadcastChannel no lugar do Supabase,
 * WebRTC de verdade entre as abas): sala com código, escolha, conexão direta, vídeo, comandos do 2P,
 * placar do convidado, revanche e volta à sala.
 */
test('online casual: host and guest connect, fight, rematch and return to room', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  test.setTimeout(150_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors = [];
  for (const p of [host, guest]) p.on('pageerror', (e) => errors.push(e.message));

  await host.goto('/?local=1');
  await host.getByRole('button', { name: /ONLINE/ }).first().click();
  await expect(host.getByTestId('online-screen')).toBeVisible();
  await host.getByTestId('online-nick').fill('Carlão');
  await host.getByTestId('online-create').click();
  const code = (await host.getByTestId('online-room-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z]{4}$/);

  await guest.goto('/?local=1');
  await guest.getByRole('button', { name: /ONLINE/ }).first().click();
  await guest.getByTestId('online-nick').fill('Pedrão');
  // a sala aparece no saguão para quem está online
  await expect(guest.getByText(`Esperando na sala ${code}`)).toBeVisible({ timeout: 15_000 });
  await guest.getByTestId('online-code').fill(code);
  await guest.getByTestId('online-join').click();
  await expect(guest.getByTestId('online-room-code')).toHaveText(code, { timeout: 15_000 });

  await expect(host.getByTestId('online-link')).toContainText('Conexão direta OK', { timeout: 30_000 });
  await expect(guest.getByTestId('online-link')).toContainText('Conexão direta OK', { timeout: 30_000 });

  await host.getByTestId('online-fighter-carlos').click();
  await guest.getByTestId('online-fighter-pedro').click();
  await expect(host.getByText('Pedrão', { exact: true }).first()).toBeVisible();
  await guest.getByTestId('online-ready').click();
  await expect(host.getByTestId('online-start')).toBeEnabled({ timeout: 10_000 });
  await host.getByTestId('online-start').click();

  // o convidado vê a tela do anfitrião e o próprio placar
  await expect(guest.getByTestId('online-guest-view')).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => guest.evaluate(() => (document.querySelector('[data-testid="online-guest-view"] video')?.srcObject?.getVideoTracks?.().length ?? 0)), { timeout: 20_000 })
    .toBeGreaterThan(0);
  await expect(guest.locator('.ff-hud-top')).toBeVisible({ timeout: 30_000 });

  const hostEngine = (fn) => host.evaluate(fn);
  await expect.poll(() => hostEngine(() => window.__ffEngine?.getGameMode()), { timeout: 30_000 }).toBe('online');
  expect(await hostEngine(() => [window.__ffEngine.fighters[0].id, window.__ffEngine.fighters[1].id])).toEqual(['carlos', 'pedro']);

  // Enter do convidado pula a apresentação na luta do anfitrião
  await expect.poll(() => hostEngine(() => window.__ffEngine.matchPhase), { timeout: 20_000 }).toBe('intro');
  await guest.bringToFront();
  await guest.keyboard.press('Enter');
  await expect.poll(() => hostEngine(() => window.__ffEngine.matchPhase), { timeout: 20_000 }).not.toBe('intro');
  await expect.poll(() => hostEngine(() => window.__ffEngine.matchPhase), { timeout: 20_000 }).toBe('fighting');

  // segurar → no convidado move o 2P no anfitrião
  const x0 = await hostEngine(() => window.__ffEngine.fighters[1].x);
  await guest.keyboard.down('ArrowRight');
  await expect.poll(() => hostEngine(() => window.__ffEngine.fighters[1].x), { timeout: 10_000 }).toBeGreaterThan(x0 + 0.3);
  await guest.keyboard.up('ArrowRight');
  // golpe do convidado
  await guest.keyboard.press('KeyF');
  await expect.poll(() => hostEngine(() => window.__ffEngine.fighters[1].state), { timeout: 5_000 }).toBe('attack');

  // fim de luta: vitória do anfitrião (1P) → o convidado vê o resultado e os dois pedem revanche
  await hostEngine(() => {
    const e = window.__ffEngine;
    e.fighters[0].roundsWon = 2;
    e.advanceAfterRound();
  });
  await expect(guest.getByTestId('hud-rematch')).toBeVisible({ timeout: 10_000 });
  await guest.getByTestId('hud-rematch').click();
  await expect(guest.getByTestId('hud-rematch')).toHaveText(/Esperando/);
  await expect(host.getByTestId('hud-rematch')).toHaveText(/topou/, { timeout: 10_000 });
  await host.getByTestId('hud-rematch').click();
  await expect.poll(() => hostEngine(() => window.__ffEngine.matchPhase), { timeout: 15_000 }).toBe('intro');
  await expect(guest.getByTestId('online-guest-view')).toBeVisible();

  // o convidado encerra pelo menu → os dois voltam para a sala
  await guest.keyboard.press('Escape');
  await guest.getByRole('button', { name: 'Encerrar e voltar à sala' }).click();
  await expect(host.getByTestId('online-screen')).toBeVisible({ timeout: 15_000 });
  await expect(guest.getByTestId('online-screen')).toBeVisible({ timeout: 15_000 });
  await expect(guest.getByTestId('online-room-code')).toHaveText(code);

  // o anfitrião sai: o convidado é avisado
  await host.getByRole('button', { name: 'Sair da sala' }).click();
  await expect(guest.getByText(/fechou a sala/)).toBeVisible({ timeout: 15_000 });

  expect(errors).toEqual([]);
  await context.close();
});
