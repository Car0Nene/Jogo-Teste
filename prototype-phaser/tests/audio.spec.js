import { expect, test } from '@playwright/test';

test('mapped voice and announcer files load metadata in Chromium', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const { ANNOUNCER_CUES, CHARACTER_VOICES } = await import('/src/data/audio.js');
    const files = [
      ...Object.values(ANNOUNCER_CUES).map(cue => cue.clip),
      ...Object.values(CHARACTER_VOICES).flatMap(voices => Object.values(voices).map(voice => voice.clip)),
      'music/family-fighter-2.mp3',
      'music/family-fighter-3.mp3'
    ].filter(Boolean);
    return Promise.all(files.map(src => new Promise(resolve => {
      const audio = new Audio(`/assets/${src}`);
      const timeout = setTimeout(() => resolve({ src, error: 'metadata timeout' }), 7000);
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve({ src, duration: audio.duration, readyState: audio.readyState });
        audio.removeAttribute('src');
        audio.load();
      };
      audio.onerror = () => {
        clearTimeout(timeout);
        resolve({ src, error: audio.error?.code || 'load error' });
      };
    })));
  });
  expect(results.filter(result => result.error)).toEqual([]);
  expect(results.every(result => Number.isFinite(result.duration) && result.duration > 0)).toBe(true);
});

test('music, announcer playback events, and category controls work after the start gesture', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-button')).toBeEnabled();
  await page.locator('#start-button').click();
  await expect.poll(async () => page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.isActive('CharacterSelectScene');
  })).toBe(true);
  await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    game.scene.getScene('CharacterSelectScene').confirmSelection();
  });
  await expect.poll(async () => page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    return game.scene.getScene('FightScene')?.matchStatus;
  }), { timeout: 12_000 }).toBe('fight');
  const playback = await page.evaluate(async () => {
    const { game } = await import('/src/main.js');
    const audio = game.registry.get('audioSystem');
    await audio.startMusic('music/family-fighter-3.mp3', { fadeMs: 0 });
    await audio.startMusic('music/family-fighter-3.mp3', { fadeMs: 0 });
    const musicCountBeforeSwitch = audio.musicPlayers.size;
    const announcerPlayed = await audio.playAnnouncer('tie', { maxDurationMs: 5000 });
    await audio.startMusic('music/family-fighter-2.mp3', { fadeMs: 0 });
    return {
      announcerPlayed,
      musicCountBeforeSwitch,
      musicTrack: audio.musicTrack,
      activeMusicCount: audio.musicPlayers.size,
      warnings: [...audio.warned],
      activeAnnouncers: audio.voicePlayers.announcer.size,
      characterVoiceEnabled: !audio.muted.characterVoice,
      narratorEnabled: !audio.muted.announcer
    };
  });
  expect(playback.announcerPlayed, JSON.stringify(playback)).toBe(true);
  expect(playback.musicCountBeforeSwitch).toBe(1);
  expect(playback.musicTrack).toBe('music/family-fighter-2.mp3');
  expect(playback.activeMusicCount).toBe(1);

  await page.locator('#character-voice-button').click();
  await page.locator('#announcer-button').click();
  await expect(page.locator('#character-voice-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#announcer-button')).toHaveAttribute('aria-pressed', 'false');
});
