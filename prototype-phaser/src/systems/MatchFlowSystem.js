import { IntroSystem } from './IntroSystem.js';
import { ResultSystem } from './ResultSystem.js';

const INTRO_MAX_WAIT_MS = 12_000;

export class MatchFlowSystem {
  constructor(scene) {
    this.scene = scene;
    this.intro = new IntroSystem(scene);
    this.result = new ResultSystem(scene);
    this.generation = 0;
  }

  startIntro() {
    this.cancel();
    const generation = ++this.generation;
    const scene = this.scene;
    scene.matchStatus = 'intro';
    scene.introTime = 0;
    scene.matchTime = scene.matchTimeLimit;
    scene.clearProjectiles();
    scene.audio?.stopVoices();
    scene.audio?.startMusic(scene.stageConfig.music);
    scene.introStartedAt = Date.now();
    scene.introTimeout = setTimeout(() => this.beginFight(generation), INTRO_MAX_WAIT_MS);
    void this.intro.play(generation, value => this.isCurrent(value)).catch(error => {
      scene.audio?.warnOnce('fight-intro', 'A apresentação de áudio falhou; a luta continuará.', error);
      this.beginFight(generation);
    });
  }

  beginFight(generation = this.generation) {
    const scene = this.scene;
    if (!this.isCurrent(generation) || scene.matchStatus !== 'intro') return false;
    clearTimeout(scene.introTimeout);
    scene.audio?.stopVoices();
    scene.cameraSystem.setMode('normal');
    scene.matchStatus = 'fight';
    scene.game.events.emit('prototype:match-status', 'fight');
    return true;
  }

  finish(winner, reason = 'ko') {
    const scene = this.scene;
    if (scene.matchStatus === 'ended' || scene.matchStatus === 'menu') return false;
    clearTimeout(scene.introTimeout);
    const generation = ++this.generation;
    scene.matchStatus = 'ended';
    for (const fighter of scene.fighters) {
      if (fighter === winner) fighter.setOutcome('victory');
      else if (fighter.state !== 'ko') fighter.setOutcome('defeat');
    }
    scene.physics.world.pause();
    scene.game.events.emit('prototype:match-status', 'ended');
    scene.game.events.emit('prototype:match-ended', { winnerId: winner?.characterData.id || null, reason });
    scene.game.events.emit('prototype:paused', false);
    void this.result.present(generation, winner, reason, value => this.isCurrent(value)).catch(error => {
      scene.audio?.warnOnce('fight-result', 'A locução do resultado falhou.', error);
    });
    return true;
  }

  isCurrent(generation) {
    return generation === this.generation
      && ['intro', 'ended'].includes(this.scene.matchStatus);
  }

  cancel() {
    clearTimeout(this.scene.introTimeout);
    this.generation += 1;
    this.scene.audio?.stopVoices();
  }

  destroy() {
    this.cancel();
  }
}
