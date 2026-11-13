const DEFAULTS = Object.freeze({
  preferredDistance: 112,
  retreatDistance: 72,
  attackDistance: 128,
  depthTolerance: 0.22,
  blockDistance: 150,
  reactionChance: 0.32,
  thinkMinimum: 0.18,
  thinkRange: 0.16,
  blockDuration: 0.28
});

export class PaulaAI {
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.thinkTime = 0;
    this.blockTime = 0;
    this.retreatTime = 0;
  }

  update(paula, pedro, delta, random = Math.random) {
    const seconds = delta / 1000;
    this.thinkTime -= seconds;
    this.blockTime = Math.max(0, this.blockTime - seconds);
    this.retreatTime = Math.max(0, this.retreatTime - seconds);
    const distance = Math.abs(pedro.x - paula.x);
    const direction = Math.sign(pedro.x - paula.x);
    const depthDifference = pedro.depthPosition - paula.depthPosition;
    const controls = {
      left: false,
      right: false,
      jump: false,
      depth: depthDifference > 0.045,
      depthBack: depthDifference < -0.045,
      block: this.blockTime > 0
    };
    let attack = null;

    if (paula.dead || ['hit', 'ko', 'transformation', 'victory', 'defeat'].includes(paula.state)) {
      return { controls, attack: null };
    }

    if (this.thinkTime <= 0) {
      const roll = random();
      this.thinkTime = this.options.thinkMinimum + random() * this.options.thinkRange;
      const playerMove = pedro.attack?.move;
      const playerThreatens = pedro.attack
        && pedro.attack.time >= playerMove.startup * 0.65
        && pedro.attack.time <= playerMove.startup + playerMove.active
        && distance <= this.options.blockDistance;

      if (playerThreatens && roll < this.options.reactionChance) {
        this.blockTime = this.options.blockDuration;
        controls.block = true;
      } else if (
        paula.state !== 'attack'
        && paula.state !== 'special'
        && distance <= this.options.attackDistance
        && Math.abs(depthDifference) <= this.options.depthTolerance
      ) {
        attack = roll < 0.68 ? 'punch' : 'kick';
      } else if (distance < this.options.retreatDistance && roll < 0.38) {
        this.retreatTime = this.options.thinkMinimum + random() * this.options.thinkRange;
      }
    }

    if (!controls.block && !['attack', 'special', 'block'].includes(paula.state)) {
      if (distance > this.options.preferredDistance) {
        controls.left = direction < 0;
        controls.right = direction > 0;
      } else if (distance < this.options.retreatDistance || this.retreatTime > 0) {
        controls.left = direction > 0;
        controls.right = direction < 0;
      }
    }

    return { controls, attack };
  }
}
