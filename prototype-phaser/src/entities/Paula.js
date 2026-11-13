import { Fighter } from './Fighter.js';

export class Paula extends Fighter {
  constructor(scene, options) {
    super(scene, { ...options, player: options.player ?? false });
  }
}
