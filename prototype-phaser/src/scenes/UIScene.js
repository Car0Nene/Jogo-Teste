import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.fight = this.scene.get('FightScene');
    this.graphics = this.add.graphics().setScrollFactor(0).setDepth(20000);
    this.leftName = this.add.text(28, 20, '', this.nameStyle()).setScrollFactor(0).setDepth(20001);
    this.rightName = this.add.text(932, 20, '', this.nameStyle()).setOrigin(1, 0).setScrollFactor(0).setDepth(20001);
    this.clockText = this.add.text(480, 18, '60', {
      fontFamily: 'Arial, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#fff3d4',
      stroke: '#130e1a', strokeThickness: 6
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20001);
    this.meterText = this.add.text(28, 62, 'ESPECIAL: U', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#c9ff80',
      stroke: '#130e1a', strokeThickness: 4
    }).setScrollFactor(0).setDepth(20001);
    this.comboText = this.add.text(480, 96, '', {
      fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '20px', fontStyle: 'bold',
      color: '#ffe76c', stroke: '#251224', strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20001);
    this.statusText = this.add.text(480, 204, '', {
      fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '46px', fontStyle: 'bold',
      color: '#ffe76c', stroke: '#251224', strokeThickness: 9, align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20002);
    this.subStatus = this.add.text(480, 260, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#fff',
      stroke: '#251224', strokeThickness: 5, align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20002);
    this.pausedText = this.add.text(480, 300, 'PAUSADO', {
      fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '36px', fontStyle: 'bold',
      color: '#fff', stroke: '#150b20', strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20003).setVisible(false);
    this.onStatus = status => this.updateStatus(status);
    this.onEnded = result => this.showResult(result);
    this.onPaused = paused => this.pausedText.setVisible(paused);
    this.onResultPhase = result => this.showResultPhase(result);
    this.onReset = () => this.resetResult();
    this.game.events.on('prototype:match-status', this.onStatus);
    this.game.events.on('prototype:match-ended', this.onEnded);
    this.game.events.on('prototype:paused', this.onPaused);
    this.game.events.on('prototype:result-phase', this.onResultPhase);
    this.game.events.on('prototype:match-reset', this.onReset);
    this.displayedHealth = { player: 1, opponent: 1 };
    this.updateStatus(this.fight.matchStatus);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  nameStyle() {
    return {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#fff',
      stroke: '#130e1a', strokeThickness: 5
    };
  }

  updateStatus(status) {
    const stageName = this.fight.stageData.name.toUpperCase();
    const [player, opponent] = this.fight.fighters;
    if (status === 'intro') {
      this.statusText.setFontSize(46);
      this.statusText.setText('READY?');
      this.subStatus.setText(`${player.characterData.name}  VS  ${opponent.characterData.name} · ${stageName}`);
      this.statusText.setVisible(true);
      this.subStatus.setVisible(true);
    } else if (status === 'round') {
      this.statusText.setFontSize(46);
      this.statusText.setText('ROUND ONE!');
      this.subStatus.setText(stageName);
      this.statusText.setVisible(true);
      this.subStatus.setVisible(true);
    } else if (status === 'fight') {
      this.statusText.setFontSize(46);
      this.statusText.setText('FIGHT!');
      this.subStatus.setText(stageName);
      this.time.delayedCall(700, () => {
        if (this.fight?.matchStatus === 'fight') {
          this.statusText.setVisible(false);
          this.subStatus.setVisible(false);
        }
      });
    } else if (status === 'ended') {
      this.showResultPhase({ title: 'K.O.!', subtitle: 'KNOCKOUT' });
    }
  }

  showResult(result) {
    const winner = this.fight.fighters.find(fighter => fighter.characterData.id === result?.winnerId);
    this.showResultPhase({
      title: result?.reason === 'time_over' ? 'TIME OVER!' : 'K.O.!',
      subtitle: winner ? `${winner.characterData.name} WINS` : 'DRAW'
    });
  }

  showResultPhase(result) {
    this.statusText.setText(result.title);
    this.statusText.setFontSize(40);
    this.statusText.setVisible(true);
    this.subStatus.setText(result.subtitle);
    this.subStatus.setVisible(true);
    this.tweens.killTweensOf(this.statusText);
    this.statusText.setScale(0.82);
    this.tweens.add({
      targets: this.statusText,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut'
    });
  }

  resetResult() {
    this.displayedHealth = { player: 1, opponent: 1 };
    this.statusText.setVisible(false);
    this.subStatus.setVisible(false);
  }

  update(_time, delta) {
    const fight = this.fight;
    if (!fight || !fight.fighters?.length) return;
    const [player, opponent] = fight.fighters;
    const width = this.scale.width;
    const height = this.scale.height;
    const barWidth = Math.min(390, width * 0.39);
    const barHeight = 24;
    const leftX = 28;
    const rightX = width - 28 - barWidth;
    const barY = 44;
    const leftTarget = Phaser.Math.Clamp(player.health / player.characterData.stats.maxHealth, 0, 1);
    const rightTarget = Phaser.Math.Clamp(opponent.health / opponent.characterData.stats.maxHealth, 0, 1);
    const smoothing = 1 - Math.exp(-delta / 140);
    this.displayedHealth.player = Phaser.Math.Linear(this.displayedHealth.player, leftTarget, smoothing);
    this.displayedHealth.opponent = Phaser.Math.Linear(this.displayedHealth.opponent, rightTarget, smoothing);

    this.graphics.clear();
    this.drawHealthBar(leftX, barY, barWidth, barHeight, this.displayedHealth.player, false);
    this.drawHealthBar(rightX, barY, barWidth, barHeight, this.displayedHealth.opponent, true);
    this.leftName.setPosition(leftX, 20);
    this.leftName.setText(player.characterData.name);
    this.leftName.setFontSize(Phaser.Math.Clamp(width * 0.035, 11, 18));
    this.rightName.setPosition(width - 28, 20);
    this.rightName.setText(opponent.characterData.name);
    this.rightName.setFontSize(Phaser.Math.Clamp(width * 0.035, 11, 18));
    this.clockText.setPosition(width / 2, 18);
    this.clockText.setFontSize(Phaser.Math.Clamp(width * 0.045, 21, 30));
    this.statusText.setPosition(width / 2, height * 0.42);
    this.statusText.setFontSize(Phaser.Math.Clamp(width * 0.048, 20, 46));
    this.subStatus.setPosition(width / 2, height * 0.51);
    this.subStatus.setFontSize(Phaser.Math.Clamp(width * 0.02, 12, 19));
    this.pausedText.setPosition(width / 2, height * 0.57);
    this.pausedText.setFontSize(Phaser.Math.Clamp(width * 0.038, 18, 36));
    this.meterText.setText(`ESPECIAL: U  ·  ${player.cooldowns.special > 0 ? 'CARREGANDO' : 'PRONTO'}`);
    this.meterText.setFontSize(Phaser.Math.Clamp(width * 0.015, 10, 14));
    this.comboText.setPosition(width / 2, height * 0.19);
    this.comboText.setFontSize(Phaser.Math.Clamp(width * 0.03, 14, 20));
    this.comboText.setText(player.comboCount > 1 ? `${player.comboCount} HIT COMBO!` : '');
    this.clockText.setText(String(Math.ceil(fight.matchTime)).padStart(2, '0'));
  }

  drawHealthBar(x, y, width, height, ratio, reverse) {
    this.graphics.fillStyle(0x170e1b, 0.88);
    this.graphics.fillRoundedRect(x - 3, y - 3, width + 6, height + 6, 8);
    this.graphics.fillStyle(0x4d2536, 1);
    this.graphics.fillRoundedRect(x, y, width, height, 6);
    this.graphics.fillStyle(ratio > 0.35 ? 0x70db64 : 0xff584e, 1);
    const filled = width * ratio;
    this.graphics.fillRoundedRect(reverse ? x + width - filled : x, y, filled, height, 6);
    this.graphics.lineStyle(2, 0xffe9ae, 0.85);
    this.graphics.strokeRoundedRect(x, y, width, height, 6);
  }

  shutdown() {
    this.game.events.off('prototype:match-status', this.onStatus);
    this.game.events.off('prototype:match-ended', this.onEnded);
    this.game.events.off('prototype:paused', this.onPaused);
    this.game.events.off('prototype:result-phase', this.onResultPhase);
    this.game.events.off('prototype:match-reset', this.onReset);
  }
}
