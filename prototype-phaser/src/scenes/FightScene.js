import Phaser from 'phaser';
import { CHARACTERS, SPECIAL_PROJECTILE_FRAME } from '../data/characters.js';
import { DEFAULT_STAGE_ID, getStage } from '../data/stages.js';
import { Pedro } from '../entities/Pedro.js';
import { Paula } from '../entities/Paula.js';
import { PaulaAI } from '../entities/PaulaAI.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { MatchFlowSystem } from '../systems/MatchFlowSystem.js';
import { StageSystem } from '../systems/StageSystem.js';

const MATCH_SECONDS = 60;
const FIGHTER_CLASSES = { pedro: Pedro, paula: Paula };

export class FightScene extends Phaser.Scene {
  constructor() {
    super('FightScene');
  }

  create() {
    this.audio = this.registry.get('audioSystem');
    this.matchSelection = this.registry.get('prototypeSelection') || {
      playerId: 'pedro',
      opponentId: 'paula',
      stageId: this.registry.get('prototypeStageId') || DEFAULT_STAGE_ID
    };
    this.matchSelection = {
      playerId: FIGHTER_CLASSES[this.matchSelection.playerId] ? this.matchSelection.playerId : 'pedro',
      opponentId: FIGHTER_CLASSES[this.matchSelection.opponentId] ? this.matchSelection.opponentId : 'paula',
      stageId: this.matchSelection.stageId
    };
    this.registry.set('prototypeSelection', this.matchSelection);
    this.stageConfig = getStage(this.matchSelection.stageId);
    this.matchTime = MATCH_SECONDS;
    this.matchTimeLimit = MATCH_SECONDS;
    this.matchStatus = 'setup';
    this.introTime = 0;
    this.paused = false;
    this.combat = new CombatSystem();
    this.paulaAI = new PaulaAI({ depthTolerance: this.stageConfig.depth.hitTolerance });
    this.matchFlow = new MatchFlowSystem(this);
    this.fighters = [];
    this.projectiles = [];
    this.stageSystem = new StageSystem(this, this.stageConfig);
    this.stageData = this.stageSystem.create();
    this.shadows = new Map();
    this.createShadowGraphics();
    this.createFighters();
    this.cameraSystem = new CameraSystem(this, this.stageData.camera);
    this.inputSystem = new InputSystem(this);
    this.onViewportResize = gameSize => this.handleViewportResize(gameSize.width, gameSize.height);
    this.scale.on('resize', this.onViewportResize, this);
    this.scene.launch('UIScene');
    this.onRestart = () => this.restartMatch();
    this.onTogglePause = () => this.togglePause();
    this.onReturnMenu = () => this.returnToMenu();
    this.game.events.on('prototype:restart', this.onRestart);
    this.game.events.on('prototype:toggle-pause', this.onTogglePause);
    this.game.events.on('prototype:return-menu', this.onReturnMenu);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.startIntro();
  }

  createShadowGraphics() {
    for (let slot = 0; slot < 2; slot++) {
      const { width, height, alpha } = this.stageData.shadow;
      const shadow = this.add.ellipse(0, 0, width, height, 0x09070c, alpha);
      shadow.setDepth(0);
      this.shadows.set(slot, shadow);
    }
  }

  createFighters() {
    const floorY = this.stageData.groundY;
    const [pedroSpawn, paulaSpawn] = this.stageData.spawns;
    const PlayerClass = FIGHTER_CLASSES[this.matchSelection.playerId];
    const OpponentClass = FIGHTER_CLASSES[this.matchSelection.opponentId];
    this.fighters = [
      new PlayerClass(this, {
        data: CHARACTERS[this.matchSelection.playerId],
        x: this.stageData.worldWidth * pedroSpawn.x,
        facing: 1,
        depthPosition: pedroSpawn.depth,
        player: true
      }),
      new OpponentClass(this, {
        data: CHARACTERS[this.matchSelection.opponentId],
        x: this.stageData.worldWidth * paulaSpawn.x,
        facing: -1,
        depthPosition: paulaSpawn.depth,
        player: false
      })
    ];
    this.physics.world.gravity.y = 1250;
    for (const fighter of this.fighters) {
      fighter.physicsBody.setVelocity(0, 0);
      fighter.physicsBody.setGravityY(0);
      fighter.physicsBody.setBounce(0);
      fighter.physicsBody.setCollideWorldBounds(true);
      fighter.bodyObject.y = floorY - fighter.characterData.body.height / 2;
      fighter.physicsBody.reset(
        fighter.bodyObject.x - fighter.characterData.body.width / 2,
        floorY - fighter.characterData.body.height
      );
      fighter.physicsBody.setGravityY(1250);
      fighter.syncVisual();
    }
    this.resolveBodySeparation();
  }

  handleViewportResize(width, height) {
    if (!this.stageSystem || !this.fighters.length) return;
    const previousWorldWidth = this.stageData.worldWidth;
    const snapshots = this.fighters.map(fighter => ({
      fighter,
      xRatio: fighter.physicsBody.center.x / previousWorldWidth,
      jumpHeight: fighter.jumpHeight,
      velocityX: fighter.physicsBody.velocity.x,
      velocityY: fighter.physicsBody.velocity.y
    }));
    this.stageSystem.resize(width, height);
    for (const { fighter, xRatio, jumpHeight, velocityX, velocityY } of snapshots) {
      const { horizontalBounds, groundY } = this.stageData;
      const body = fighter.physicsBody;
      const centerX = Phaser.Math.Clamp(
        xRatio * this.stageData.worldWidth,
        horizontalBounds.left + body.width / 2,
        horizontalBounds.right - body.width / 2
      );
      body.reset(centerX - body.width / 2, groundY - body.height - jumpHeight);
      body.setVelocity(velocityX, velocityY);
      fighter.syncVisual();
    }
    this.cameraSystem?.resize();
    this.resolveBodySeparation();
    this.updateVisuals(0);
  }

  startIntro() {
    if (!this.fighters.length) return;
    this.matchFlow.startIntro();
  }

  beginFight(generation = this.matchFlow.generation) {
    return this.matchFlow.beginFight(generation);
  }

  restartMatch() {
    this.matchFlow.cancel();
    this.paused = false;
    this.physics.world.resume();
    this.fighters.forEach(fighter => fighter.destroy());
    this.fighters = [];
    this.clearProjectiles();
    this.matchTime = MATCH_SECONDS;
    this.paulaAI = new PaulaAI({ depthTolerance: this.stageConfig.depth.hitTolerance });
    this.createFighters();
    this.game.events.emit('prototype:match-reset');
    this.startIntro();
    this.game.events.emit('prototype:paused', false);
  }

  togglePause() {
    if (this.matchStatus === 'ended' || this.matchStatus === 'intro') return;
    this.paused = !this.paused;
    if (this.paused) this.physics.world.pause();
    else this.physics.world.resume();
    this.game.events.emit('prototype:paused', this.paused);
  }

  update(_time, delta) {
    if (this.matchStatus === 'ended') {
      for (const fighter of this.fighters) fighter.update(delta);
      this.cameraSystem?.update(this.fighters, delta);
      const { actions } = this.inputSystem.poll();
      if (actions.restart) this.restartMatch();
      return;
    }
    if (this.paused) {
      const { actions } = this.inputSystem.poll();
      if (actions.pause) this.togglePause();
      else if (actions.restart) this.restartMatch();
      return;
    }
    if (this.matchStatus === 'intro') {
      this.introTime += delta;
      for (const fighter of this.fighters) fighter.update(delta);
      this.updateVisuals(delta);
      return;
    }

    const player = this.fighters[0];
    const opponent = this.fighters[1];
    const { input, actions } = this.inputSystem.poll();
    if (actions.pause) this.togglePause();
    if (this.paused) return;
    if (actions.restart) {
      this.restartMatch();
      return;
    }

    player.facing = opponent.x >= player.x ? 1 : -1;
    opponent.facing = player.x >= opponent.x ? 1 : -1;
    if (actions.punch) player.beginAttack('punch');
    if (actions.kick) player.beginAttack('kick');
    if (actions.special) player.beginAttack('special');

    this.updatePaulaAI(opponent, player, delta);
    this.resolveBodySeparation();
    for (const fighter of this.fighters) fighter.update(delta, fighter.player ? input : fighter.aiControls);
    this.resolveBodySeparation();
    this.combat.update(this.fighters);
    this.updateProjectiles(delta);
    this.updateVisuals(delta);
    this.matchTime = Math.max(0, this.matchTime - delta / 1000);
    if (this.matchTime <= 0 && this.matchStatus === 'fight') {
      const winner = player.health > opponent.health
        ? player
        : player.health < opponent.health
          ? opponent
          : null;
      this.finishMatch(winner, 'time_over');
    }
  }

  updatePaulaAI(opponent, player, delta) {
    const decision = this.paulaAI.update(opponent, player, delta);
    opponent.aiControls = decision.controls;
    if (decision.attack) opponent.beginAttack(decision.attack);
  }

  resolveBodySeparation() {
    const [left, right] = [...this.fighters].sort((a, b) => a.physicsBody.center.x - b.physicsBody.center.x);
    if (Math.abs(left.depthPosition - right.depthPosition) > this.stageData.depth.collisionTolerance) return;
    const minimum = (
      left.characterData.body.width * left.depthScale
      + right.characterData.body.width * right.depthScale
    ) * 0.65;
    const distance = right.physicsBody.center.x - left.physicsBody.center.x;
    if (Math.abs(distance) >= minimum) return;
    const direction = distance >= 0 ? 1 : -1;
    const correction = (minimum - Math.abs(distance)) / 2;
    left.physicsBody.x -= direction * correction;
    right.physicsBody.x += direction * correction;
    const { horizontalBounds } = this.stageData;
    left.physicsBody.x = Phaser.Math.Clamp(
      left.physicsBody.x,
      horizontalBounds.left,
      horizontalBounds.right - left.physicsBody.width
    );
    right.physicsBody.x = Phaser.Math.Clamp(
      right.physicsBody.x,
      horizontalBounds.left,
      horizontalBounds.right - right.physicsBody.width
    );
    left.physicsBody.updateCenter();
    right.physicsBody.updateCenter();
  }

  spawnSpecialProjectile(owner, move) {
    const textureKey = this.registry.get('fighterTextureKey') || 'fighters';
    if (!this.textures.get(textureKey).has(SPECIAL_PROJECTILE_FRAME)) {
      this.addFallbackProjectile(owner, move);
      return;
    }
    const frame = this.textures.getFrame(textureKey, SPECIAL_PROJECTILE_FRAME);
    const projectile = this.add.image(owner.x + owner.facing * 80, owner.y - 74, textureKey, SPECIAL_PROJECTILE_FRAME);
    projectile.setScale(0.72);
    projectile.setDepth(owner.projectedGroundY + 1);
    if (frame?.customPivot) projectile.setOrigin(frame.pivotX, frame.pivotY);
    else projectile.setOrigin(0.5, 0.5);
    projectile.setFlipX(owner.facing < 0);
    this.projectiles.push({
      sprite: projectile,
      owner,
      direction: owner.facing,
      speed: 610,
      move,
      depthPosition: owner.depthPosition,
      life: 0.72,
      hit: false
    });
  }

  addFallbackProjectile(owner, move) {
    const graphic = this.add.circle(owner.x + owner.facing * 60, owner.y - 70, 32, 0x75ff3b, 0.9);
    graphic.setStrokeStyle(5, 0xc3ff71, 0.9);
    graphic.setDepth(owner.projectedGroundY + 1);
    this.projectiles.push({
      sprite: graphic,
      owner,
      direction: owner.facing,
      speed: 500,
      move,
      depthPosition: owner.depthPosition,
      life: 0.72,
      hit: false
    });
  }

  updateProjectiles(delta) {
    const seconds = delta / 1000;
    for (const projectile of this.projectiles) {
      projectile.life -= seconds;
      projectile.sprite.x += projectile.direction * projectile.speed * seconds;
      const target = this.fighters.find(fighter => fighter !== projectile.owner);
      if (!target || target.dead || projectile.hit
        || Math.abs(target.depthPosition - projectile.depthPosition) > this.stageData.depth.hitTolerance) continue;
      const targetBox = this.combat.hurtBox(target);
      const hitX = projectile.sprite.x + projectile.direction * 28;
      const projectileBox = {
        left: Math.min(projectile.sprite.x, hitX) - 25,
        right: Math.max(projectile.sprite.x, hitX) + 25,
        top: projectile.sprite.y - 42,
        bottom: projectile.sprite.y + 42
      };
      if (this.combat.overlaps(projectileBox, targetBox)) {
        projectile.hit = true;
        if (projectile.owner.attack) projectile.owner.attack.hit = true;
        const blocked = target.state === 'block' && target.facing !== projectile.direction;
        if (blocked) {
          target.receiveBlock(projectile.move, projectile.direction);
          this.showImpact(projectile.sprite.x, projectile.sprite.y, true);
        } else {
          if (target.takeDamage(projectile.move.damage, projectile.move.knockback, projectile.direction, projectile.move)) {
            if (projectile.owner.attack?.kind === 'special') {
              const configured = projectile.owner.scene.audio?.playSpecialImpact?.(
                projectile.owner.characterData.id
              );
              if (!configured) {
                projectile.owner.scene.audio?.playEffect?.(projectile.move.hitSound || 'impact');
              }
            }
            projectile.owner.registerComboHit();
          }
        }
        projectile.sprite.destroy();
      }
    }
    this.projectiles = this.projectiles.filter(projectile => {
      if (projectile.life <= 0 || !projectile.sprite.active) {
        projectile.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  clearProjectiles() {
    for (const projectile of this.projectiles) projectile.sprite.destroy();
    this.projectiles = [];
  }

  updateShadow(fighter, x, y) {
    const shadow = this.shadows.get(fighter.player ? 0 : 1);
    if (!shadow) return;
    const { jumpSquash, alpha } = this.stageData.shadow;
    const jumpRatio = Phaser.Math.Clamp(fighter.jumpHeight / 220, 0, 1);
    const depthScale = this.stageSystem.scaleAtDepth(fighter.depthPosition);
    shadow.setPosition(x, y + 6);
    shadow.setDepth(y - 1);
    shadow.setScale(depthScale * (1 + jumpRatio * 0.25), depthScale * (1 - jumpRatio * jumpSquash));
    shadow.setAlpha(alpha * (1 - jumpRatio * 0.48));
  }

  updateVisuals(delta) {
    for (const fighter of this.fighters) fighter.syncVisual();
    this.cameraSystem?.update(this.fighters, delta);
  }

  showImpact(x, y, blocked = false, effect = 'impact') {
    const color = blocked ? 0x87eaff : effect === 'special' ? 0x9cff45 : 0xffe27a;
    const radius = blocked ? 10 : effect === 'special' ? 21 : effect === 'heavy' ? 18 : 14;
    const ring = this.add.circle(x, y, radius, color, 0.65);
    ring.setStrokeStyle(4, 0xffffff, 0.9).setDepth(10000);
    this.tweens.add({
      targets: ring,
      scale: effect === 'special' ? 2.8 : 2.2,
      alpha: 0,
      duration: 230,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
    if (!blocked) this.cameras.main.shake(effect === 'special' ? 130 : 85, effect === 'special' ? 0.004 : 0.0025);
  }

  showTransformation(fighter) {
    const aura = this.add.circle(fighter.x, fighter.y - 78, 42, 0x8cff45, 0.28);
    aura.setStrokeStyle(6, 0xd7ff85, 0.95).setDepth(fighter.depth + 1);
    this.tweens.add({
      targets: aura,
      scale: 2.8,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => aura.destroy()
    });
    this.cameras.main.shake(220, 0.004);
    this.audio?.playEffect('special');
  }

  finishMatch(winner, reason = 'ko') {
    if (typeof winner === 'string') {
      winner = this.fighters.find(fighter => fighter.characterData.id === winner);
    }
    return this.matchFlow.finish(winner || null, reason);
  }

  returnToMenu() {
    this.matchFlow.cancel();
    this.audio?.stopMusic({ fadeMs: 350 });
    this.scene.stop('UIScene');
    this.matchStatus = 'menu';
    this.scene.stop();
    this.game.events.emit('prototype:menu-returned');
  }

  shutdown() {
    this.matchFlow?.destroy();
    this.inputSystem?.destroy();
    this.scale.off('resize', this.onViewportResize, this);
    clearTimeout(this.introTimeout);
    this.cameraSystem?.destroy();
    this.game.events.off('prototype:restart', this.onRestart);
    this.game.events.off('prototype:toggle-pause', this.onTogglePause);
    this.game.events.off('prototype:return-menu', this.onReturnMenu);
    this.clearProjectiles();
  }
}
