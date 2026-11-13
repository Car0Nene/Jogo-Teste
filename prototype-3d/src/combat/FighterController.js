const DEFAULT_KEYS = {
  left: 'a',
  right: 'd',
  jump: 'w',
  crouch: 's',
  punch: 'j',
  kick: 'k',
  special: 'l',
  block: 'shift',
};

export class FighterController {
  constructor({ fighter, isHuman = false, keys = DEFAULT_KEYS, opponent = null }) {
    this.fighter = fighter;
    this.isHuman = isHuman;
    this.keys = keys;
    this.opponent = opponent;
    this.aiTime = 0;
  }

  update(dt, keyState) {
    const fighter = this.fighter;
    if (!fighter || fighter.dead) return;

    if (this.isHuman) {
      this.applyHumanInput(keyState, dt);
      return;
    }

    this.applyCpuInput(dt);
  }

  applyHumanInput(keyState, dt) {
    const fighter = this.fighter;
    const left = keyState[this.keys.left] || false;
    const right = keyState[this.keys.right] || false;
    const jump = keyState[this.keys.jump] || false;
    const crouch = keyState[this.keys.crouch] || false;
    const block = keyState[this.keys.block] || false;
    const punch = keyState[this.keys.punch] || false;
    const kick = keyState[this.keys.kick] || false;
    const special = keyState[this.keys.special] || false;

    if (left && !right) fighter.direction = -1;
    if (right && !left) fighter.direction = 1;
    fighter.crouch = crouch && !fighter.attack;
    fighter.block = block && !fighter.attack;

    fighter.moveIntent = right - left;
    fighter.jumpRequested = jump && fighter.onGround;
    fighter.punchQueued = punch;
    fighter.kickQueued = kick;
    fighter.specialQueued = special;

    if (fighter.jumpRequested) fighter.vy = fighter.jumpSpeed;
    const speed = keyState.shift ? fighter.runSpeed : fighter.moveSpeed;
    fighter.vx = fighter.moveIntent * speed;
    if (fighter.attack) fighter.vx *= 0.24;

    if (fighter.punchQueued && !fighter.attack) fighter.startAttack('punch');
    if (fighter.kickQueued && !fighter.attack) fighter.startAttack('kick');
    if (fighter.specialQueued && !fighter.attack && fighter.energy >= 100) fighter.startAttack('special');

    fighter.recoverFromShake(dt);
  }

  applyCpuInput(dt) {
    const fighter = this.fighter;
    if (!this.opponent) return;
    const dx = this.opponent.x - fighter.x;
    const distance = Math.abs(dx);
    const shouldMove = Math.abs(dx) > 1.2;
    const shouldJump = Math.abs(dx) < 2.6 && fighter.onGround && this.aiTime > 0.6 && Math.random() < 0.025;
    const shouldBlock = distance < 1.6 && Math.random() < 0.08;

    fighter.moveIntent = dx > 0 ? 1 : -1;
    fighter.crouch = Math.abs(dx) < 1.1 && Math.random() < 0.03;
    fighter.block = shouldBlock && !fighter.attack;
    fighter.vx = shouldMove ? (Math.abs(dx) > 1.8 ? fighter.runSpeed * Math.sign(dx) : fighter.moveSpeed * Math.sign(dx)) : 0;

    if (shouldJump) fighter.vy = fighter.jumpSpeed;
    if (!fighter.attack && distance < 1.6 && this.aiTime > 0.35) {
      if (Math.random() < 0.55) fighter.startAttack('punch');
      else if (Math.random() < 0.7) fighter.startAttack('kick');
      else if (fighter.energy >= 100) fighter.startAttack('special');
    }

    this.aiTime += dt;
    fighter.recoverFromShake(dt);
  }
}
