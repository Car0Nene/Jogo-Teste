export class IntroSystem {
  constructor(scene) {
    this.scene = scene;
  }

  async play(generation, isCurrent) {
    const scene = this.scene;
    scene.cameraSystem.setMode('intro');
    scene.game.events.emit('prototype:match-status', 'intro');
    for (const fighter of scene.fighters) {
      fighter.setAlpha(0);
      scene.tweens.add({ targets: fighter, alpha: 1, duration: 420, ease: 'Sine.easeOut' });
      if (fighter.characterData.id === 'pedro') fighter.transform?.();
    }

    const startedAt = Date.now();
    await scene.audio?.playAnnouncer('ready', { maxDurationMs: 1200 });
    if (!isCurrent(generation)) return;

    if (scene.stageConfig.id === 'bar'
      && scene.fighters.some(fighter => fighter.characterData.id === 'paula')) {
      await scene.audio?.playCharacterVoice('paula', 'intro', { maxDurationMs: 4000 });
    }
    if (!isCurrent(generation)) return;

    scene.game.events.emit('prototype:match-status', 'round');
    await scene.audio?.playAnnouncer('round_1', { maxDurationMs: 2200 });
    if (!isCurrent(generation)) return;

    await scene.audio?.playAnnouncer('fight', { maxDurationMs: 1800 });
    if (!isCurrent(generation)) return;

    const remaining = 2600 - (Date.now() - startedAt);
    if (remaining > 0) await new Promise(resolve => scene.time.delayedCall(remaining, resolve));
    if (isCurrent(generation)) scene.matchFlow.beginFight(generation);
  }
}
