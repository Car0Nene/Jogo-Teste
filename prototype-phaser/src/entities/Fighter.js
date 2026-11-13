import Phaser from 'phaser';
import { FighterStateMachine } from './FighterStateMachine.js';

const ATTACK_STATES = new Set(['attack', 'special']);
const LOCKED_STATES = new Set(['hit', 'block', 'transformation']);
const TERMINAL_STATES = new Set(['victory', 'defeat', 'ko']);

export class Fighter extends Phaser.GameObjects.Sprite {
  constructor(scene, { data, x, facing, depthPosition = 0.5, player = false }) {
    const textureKey = scene.registry.get('fighterTextureKey') || 'fighters';
    super(scene, x, 0, textureKey, data.animations.idle.frames[0]);
    this.scene = scene;
    this.characterData = data;
    this.textureKey = textureKey;
    this.animations = data.animations;
    this.facing = facing;
    this.depthPosition = depthPosition;
    this.depthVelocity = 0;
    this.depthScale = 1;
    this.player = player;
    this.health = data.stats.maxHealth;
    this.stateMachine = new FighterStateMachine();
    this.state = this.stateMachine.state;
    this.stateTime = 0;
    this.attack = null;
    this.cooldowns = Object.fromEntries(Object.keys(data.moves).map(kind => [kind, 0]));
    this.knockback = 0;
    this.stunTime = 0;
    this.invulnerabilityTime = 0;
    this.comboCount = 0;
    this.comboTime = 0;
    this.flashTime = 0;
    this.dead = false;
    this.form = data.initialForm || 'normal';
    this.pendingForm = null;
    this.comboHandler = count => this.scene.game.events.emit('prototype:combo', count);

    scene.add.existing(this);
    this.setScale(data.scale);
    this.setDepth(scene.stageData.groundY);

    const body = scene.add.rectangle(x, 0, data.body.width, data.body.height, 0xffffff, 0);
    body.setVisible(false);
    scene.physics.add.existing(body);
    this.physicsBody = body.body;
    this.physicsBody.setAllowGravity(true);
    this.physicsBody.setCollideWorldBounds(true);
    this.physicsBody.setBounce(0);
    this.physicsBody.setMaxVelocity(data.stats.runSpeed || data.stats.moveSpeed, 820);
    this.physicsBody.setDragX(data.stats.friction);
    this.physicsBody.setAccelerationX(0);
    this.physicsBody.setSize(data.body.width, data.body.height);
    this.groundCollider = scene.physics.add.collider(body, scene.ground);
    this.bodyObject = body;

    this.applyFrame(data.animations.idle.frames[0]);
  }

  transition(nextState, options) {
    if (!this.stateMachine.transition(nextState, options)) return false;
    this.state = this.stateMachine.state;
    this.stateTime = 0;
    if (!ATTACK_STATES.has(nextState)) this.attack = null;
    return true;
  }

  applyFrame(frameKey) {
    if (!frameKey || !this.scene.textures.get(this.textureKey)?.has(frameKey)) return false;
    this.setFrame(frameKey);
    const frame = this.frame;
    if (frame.customPivot) this.setOrigin(frame.pivotX, frame.pivotY);
    else this.setOrigin(0.5, 1);
    return true;
  }

  beginAttack(kind) {
    if (this.dead || TERMINAL_STATES.has(this.state) || LOCKED_STATES.has(this.state)) return false;
    const move = this.characterData.moves[kind];
    if (!move || this.cooldowns[kind] > 0) return false;

    let cancel = false;
    if (ATTACK_STATES.has(this.state)) {
      const currentMove = this.attack?.move;
      const window = currentMove?.cancelWindow;
      cancel = Boolean(
        this.attack?.hit
        && currentMove.cancels?.includes(kind)
        && window
        && this.attack.time >= window.start
        && this.attack.time <= window.end
      );
      if (!cancel) return false;
    }

    const nextState = kind === 'special' ? 'special' : 'attack';
    if (!this.transition(nextState, { cancel })) return false;
    this.attack = { kind, move, time: 0, hit: false, projectileSpawned: false };
    this.cooldowns[kind] = move.cooldown;
    this.physicsBody.setAccelerationX(0);
    this.physicsBody.setVelocityX(0);
    if (kind === 'special') {
      this.scene.audio?.playSpecialPreparation?.(this.characterData.id);
      this.scene.cameras.main.shake(170, 0.006);
    } else {
      this.scene.audio?.playEffect(move.sound || kind);
    }
    return true;
  }

  beginTransformation(form = 'transformed') {
    const targetForm = this.characterData.forms?.[form];
    if (!targetForm || form === this.form || this.dead || !this.transition('transformation')) return false;
    this.pendingForm = form;
    this.transformationDuration = targetForm.duration;
    this.invulnerabilityTime = targetForm.duration;
    this.physicsBody.setAccelerationX(0);
    this.physicsBody.setVelocity(0, this.physicsBody.velocity.y);
    this.scene.showTransformation?.(this);
    return true;
  }

  completeTransformation() {
    const form = this.pendingForm;
    if (!form) return;
    this.form = form;
    this.animations = { ...this.animations, ...this.characterData.forms[form].animations };
    this.pendingForm = null;
    this.transition('idle');
  }

  takeDamage(amount, knockback, fromDirection, move = {}) {
    if (this.dead || this.state === 'ko' || this.invulnerabilityTime > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.flashTime = 0.2;
    this.knockback = knockback * fromDirection;
    this.physicsBody.setAccelerationX(0);
    this.physicsBody.setVelocityX(this.knockback);
    this.stunTime = move.hitStun || 0.28;
    this.invulnerabilityTime = this.characterData.stats.hitInvulnerability || 0;
    this.transition(this.health <= 0 ? 'ko' : 'hit');
    if (move.effect !== 'special') this.scene.audio?.playEffect(move.hitSound || 'impact');
    this.scene.showImpact(this.x, this.y - this.characterData.body.height * 0.65, false, move.effect || 'impact');
    this.updateFrame();
    if (this.health <= 0) {
      this.dead = true;
      this.physicsBody.setVelocityX(0);
      const winner = this.scene.fighters.find(fighter => fighter !== this);
      this.scene.finishMatch(winner);
    }
    return true;
  }

  receiveBlock(move, fromDirection) {
    if (this.dead || TERMINAL_STATES.has(this.state)) return false;
    this.stunTime = move.blockStun || 0.16;
    this.physicsBody.setAccelerationX(0);
    this.physicsBody.setVelocityX(fromDirection * Math.min(move.knockback * 0.35, 115));
    if (this.state !== 'block') this.transition('block');
    this.scene.audio?.playEffect('block');
    return true;
  }

  registerComboHit() {
    this.comboCount += 1;
    this.comboTime = 1.25;
    if (this.player && this.scene.matchStatus === 'fight' && this.comboCount === 2) {
      void this.scene.audio?.playCharacterVoice?.(this.characterData.id, 'combo');
    }
    if (this.player && this.scene.matchStatus === 'fight' && this.comboCount === 3) {
      void this.scene.audio?.playAnnouncer?.('combo');
    }
    this.comboHandler(this.comboCount);
  }

  setOutcome(outcome) {
    if (this.state === 'ko') return false;
    const changed = this.transition(outcome);
    if (changed) {
      this.physicsBody.setAccelerationX(0);
      this.physicsBody.setVelocityX(0);
      this.updateFrame();
    }
    return changed;
  }

  update(delta, controls = {}) {
    const seconds = delta / 1000;
    this.stateTime += seconds;
    this.flashTime = Math.max(0, this.flashTime - seconds);
    this.invulnerabilityTime = Math.max(0, this.invulnerabilityTime - seconds);
    this.comboTime = Math.max(0, this.comboTime - seconds);
    if (this.comboTime === 0) this.comboCount = 0;
    for (const kind of Object.keys(this.cooldowns)) {
      this.cooldowns[kind] = Math.max(0, this.cooldowns[kind] - seconds);
    }

    if (TERMINAL_STATES.has(this.state)) {
      this.physicsBody.setAccelerationX(0);
      this.physicsBody.setVelocityX(0);
      this.updateFrame();
      this.syncVisual();
      return;
    }

    if (this.state === 'transformation') {
      this.physicsBody.setAccelerationX(0);
      this.physicsBody.setVelocityX(0);
      if (this.stateTime >= this.transformationDuration) this.completeTransformation();
      this.updateFrame();
      this.syncVisual();
      return;
    }

    if (this.attack) {
      this.attack.time += seconds;
      const { move, time } = this.attack;
      if (this.attack.kind === 'special' && !this.attack.activationSoundPlayed && time >= move.startup) {
        this.attack.activationSoundPlayed = true;
        const configured = this.scene.audio?.playSpecialActivation?.(this.characterData.id);
        if (!configured) {
          this.scene.audio?.playEffect?.(move.sound || 'special');
        }
      }
      if (move.projectile && time >= move.startup && !this.attack.projectileSpawned) {
        this.attack.projectileSpawned = true;
        this.scene.spawnSpecialProjectile(this, move);
      }
      if (time >= move.startup + move.active + move.recovery) {
        if (this.attack.kind === 'special') {
          this.scene.audio?.playSpecialCompletion?.(this.characterData.id);
        }
        this.attack = null;
        this.transition('idle', { complete: true });
      }
    }

    if (this.state === 'hit' || this.state === 'block') {
      this.stunTime = Math.max(0, this.stunTime - seconds);
      if (this.stunTime > 0) {
        this.physicsBody.setAccelerationX(0);
        this.updateFrame();
        this.syncVisual();
        return;
      }
      this.transition('idle');
    }

    const grounded = this.physicsBody.blocked.down || this.physicsBody.touching.down;
    const attacking = ATTACK_STATES.has(this.state);
    if (!attacking) {
      const depthDirection = controls.block || controls.crouch
        ? 0
        : Number(controls.depth) - Number(controls.depthBack);
      this.updateDepthPosition(seconds, depthDirection);
      if (controls.block && grounded) {
        this.physicsBody.setAccelerationX(0);
        this.physicsBody.setVelocityX(0);
        this.transition('block');
      } else if (controls.crouch && grounded) {
        this.physicsBody.setAccelerationX(0);
        this.transition('crouch');
      } else {
        if (this.state === 'block' || this.state === 'crouch') this.transition('idle');
        const direction = Number(controls.right) - Number(controls.left);
        if (direction) {
          const running = Boolean(controls.run && this.animations.run && this.characterData.stats.runSpeed);
          const maxSpeed = running ? this.characterData.stats.runSpeed : this.characterData.stats.moveSpeed;
          this.physicsBody.setMaxVelocity(maxSpeed, 820);
          this.physicsBody.setAccelerationX(direction * this.characterData.stats.acceleration);
          if (grounded) this.transition(running ? 'run' : 'walk');
        } else {
          this.physicsBody.setAccelerationX(0);
          if (Math.abs(this.physicsBody.velocity.x) < 30) this.physicsBody.setVelocityX(0);
          if (grounded && !LOCKED_STATES.has(this.state)) this.transition('idle');
        }

        if (controls.jump && grounded) {
          this.physicsBody.setVelocityY(-this.characterData.stats.jumpSpeed);
          this.transition('jump');
          this.scene.audio?.playEffect('jump');
        }
      }
    }

    if (!grounded && !attacking && !LOCKED_STATES.has(this.state)) {
      this.transition(this.physicsBody.velocity.y < 0 ? 'jump' : 'fall');
    }
    if (Math.abs(this.physicsBody.velocity.x) < 30) this.knockback = 0;
    this.updateFrame();
    this.syncVisual();
  }

  updateDepthPosition(seconds, direction) {
    const { depth } = this.scene.stageData;
    const acceleration = direction ? depth.acceleration : depth.friction;
    const targetDirection = direction || -Math.sign(this.depthVelocity);
    this.depthVelocity += targetDirection * acceleration * seconds;
    this.depthVelocity = Phaser.Math.Clamp(this.depthVelocity, -depth.moveSpeed, depth.moveSpeed);
    if (!direction && Math.abs(this.depthVelocity) < 0.01) this.depthVelocity = 0;

    this.depthPosition += this.depthVelocity * seconds;
    if (this.depthPosition <= depth.min || this.depthPosition >= depth.max) {
      this.depthPosition = Phaser.Math.Clamp(this.depthPosition, depth.min, depth.max);
      this.depthVelocity = 0;
    }
  }

  updateFrame() {
    let animationName = this.state;
    if (animationName === 'attack' && this.attack) animationName = this.attack.kind;
    const animation = this.animations[animationName]
      || this.animations[this.characterData.animationFallbacks?.[animationName]]
      || this.animations.idle;
    if (!animation?.frames?.length) return;

    const frames = animation.frames;
    let index = Math.floor(this.stateTime * animation.fps) % frames.length;
    if (ATTACK_STATES.has(this.state) && this.attack) {
      const { move, time } = this.attack;
      if (time < move.startup) index = 0;
      else if (time < move.startup + move.active) {
        const activeProgress = (time - move.startup) / Math.max(move.active, 0.001);
        index = Math.min(frames.length - 1, Math.floor(activeProgress * frames.length));
      } else {
        index = frames.length - 1;
      }
    } else if (this.state === 'jump' && this.physicsBody.velocity.y >= 0) {
      const fallAnimation = this.animations.fall;
      if (fallAnimation?.frames.length) {
        this.applyFrame(fallAnimation.frames[Math.floor(this.stateTime * fallAnimation.fps) % fallAnimation.frames.length]);
        this.setFlipX(this.facing < 0);
        return;
      }
    } else if (this.state === 'ko' || this.state === 'defeat') {
      index = frames.length - 1;
    }

    this.applyFrame(frames[index]);
    this.setFlipX(this.facing < 0);
    if (this.flashTime > 0 && Math.floor(this.flashTime * 28) % 2 === 0) this.setTintFill(0xffffff);
    else this.clearTint();
  }

  syncVisual() {
    const body = this.physicsBody;
    const { horizontalBounds } = this.scene.stageData;
    this.x = Phaser.Math.Clamp(
      body.center.x,
      horizontalBounds.left + body.width / 2,
      horizontalBounds.right - body.width / 2
    );
    const floorY = this.projectedGroundY;
    this.y = floorY - this.jumpHeight;
    this.depthScale = this.scene.stageSystem.scaleAtDepth(this.depthPosition);
    this.setScale(this.characterData.scale * this.depthScale);
    this.setDepth(floorY);
    this.bodyObject.setDepth(-100);
    this.scene.updateShadow(this, this.x, floorY);
  }

  get projectedGroundY() {
    return this.scene.stageSystem.projectDepth(this.depthPosition);
  }

  get jumpHeight() {
    return Math.max(0, this.scene.stageData.groundY - this.physicsBody.bottom);
  }

  destroy(fromScene) {
    this.groundCollider?.destroy();
    this.bodyObject?.destroy();
    super.destroy(fromScene);
  }
}
