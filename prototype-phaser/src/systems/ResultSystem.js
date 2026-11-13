export class ResultSystem {
  constructor(scene) {
    this.scene = scene;
  }

  async present(generation, winner, reason, isCurrent) {
    const scene = this.scene;
    const loser = winner ? scene.fighters.find(fighter => fighter !== winner) : null;
    scene.cameraSystem.setMode('result', winner);

    scene.game.events.emit('prototype:result-phase', {
      phase: 'opening',
      title: reason === 'time_over' ? 'TIME OVER!' : 'K.O.!',
      subtitle: reason === 'time_over' ? 'TIME OVER' : 'KNOCKOUT'
    });
    await scene.audio?.playAnnouncer(reason === 'time_over' ? 'time_over' : 'ko', { maxDurationMs: 1800 });
    if (!isCurrent(generation)) return;

    if (!winner) {
      scene.game.events.emit('prototype:result-phase', {
        phase: 'draw',
        title: 'DRAW!',
        subtitle: 'A MATCH DRAW'
      });
      await scene.audio?.playAnnouncer('tie', { maxDurationMs: 2500 });
      if (!isCurrent(generation)) return;
    } else {
      const achievement = winner.health === winner.characterData.stats.maxHealth ? 'perfect' : 'excellent';
      await scene.audio?.playAnnouncer(achievement, { maxDurationMs: 1800 });
      if (!isCurrent(generation)) return;

      scene.game.events.emit('prototype:result-phase', {
        phase: 'decision',
        title: winner.player ? 'YOU WIN!' : 'YOU LOSE!',
        subtitle: `WINNER: ${winner.characterData.name} · LOSER: ${loser?.characterData.name || ''}`
      });
      await scene.audio?.playAnnouncer(winner.player ? 'you_win' : 'you_lose', { maxDurationMs: 2500 });
      if (!isCurrent(generation)) return;
      await scene.audio?.playCharacterVoice(winner.characterData.id, 'victory', { maxDurationMs: 3500 });
      if (!isCurrent(generation)) return;
    }

    scene.game.events.emit('prototype:result-complete', { winnerId: winner?.characterData.id || null, reason });
  }
}
