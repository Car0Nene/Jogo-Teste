import { Fighter } from './Fighter.js';

export class Pedro extends Fighter {
  constructor(scene, options) {
    super(scene, { ...options, player: options.player ?? true });
  }

  transform() {
    return this.beginTransformation('transformed');
  }
}
