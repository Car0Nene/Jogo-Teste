export const FIGHTER_STATES = Object.freeze([
  'idle',
  'walk',
  'run',
  'jump',
  'fall',
  'crouch',
  'attack',
  'hit',
  'block',
  'special',
  'transformation',
  'victory',
  'defeat',
  'ko'
]);

const TERMINAL_STATES = new Set(['victory', 'defeat', 'ko']);
const ATTACK_STATES = new Set(['attack', 'special']);
const FREE_STATES = new Set(['idle', 'walk', 'run', 'jump', 'fall', 'crouch', 'block']);

export class FighterStateMachine {
  constructor(initialState = 'idle') {
    if (!FIGHTER_STATES.includes(initialState)) {
      throw new Error(`Unknown fighter state: ${initialState}`);
    }
    this.state = initialState;
  }

  canTransition(nextState, { cancel = false, complete = false } = {}) {
    if (!FIGHTER_STATES.includes(nextState)) return false;
    if (nextState === this.state) return true;
    if (this.state === 'ko' || TERMINAL_STATES.has(this.state)) return false;
    if (this.state === 'transformation') return nextState === 'idle' || nextState === 'ko';
    if (nextState === 'ko' || TERMINAL_STATES.has(nextState)) return true;
    if (this.state === 'hit') return nextState === 'idle';
    if (ATTACK_STATES.has(this.state)) {
      if (complete && nextState === 'idle') return true;
      return cancel && ATTACK_STATES.has(nextState);
    }
    if (nextState === 'hit') return true;
    return FREE_STATES.has(this.state);
  }

  transition(nextState, options) {
    if (!this.canTransition(nextState, options)) return false;
    const changed = this.state !== nextState;
    if (!changed && !options?.cancel && !options?.complete) return false;
    this.state = nextState;
    return true;
  }
}
