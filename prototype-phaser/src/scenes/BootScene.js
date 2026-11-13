import Phaser from 'phaser';
import { CHARACTERS, SPECIAL_PROJECTILE_FRAME } from '../data/characters.js';
import { CHARACTER_ROSTER } from '../data/roster.js';
import { STAGES } from '../data/stages.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.atlas('fighters', 'assets/fighters.webp', 'assets/fighters.json');
    for (const character of CHARACTER_ROSTER) {
      this.load.image(`portrait-${character.id}`, `assets/${character.portrait}`);
    }
    for (const stage of Object.values(STAGES)) {
      for (const layer of stage.layers) this.load.image(layer.textureKey, layer.image);
    }
    this.load.on('loaderror', file => {
      console.warn(`Asset não carregado (${file.key}); um fallback visual será usado quando possível.`, file.src);
    });
    this.load.once('complete', () => {
      const texture = this.textures.get('fighters');
      const requiredFrames = [
        CHARACTERS.pedro.animations.idle.frames[0],
        CHARACTERS.paula.animations.idle.frames[0],
        SPECIAL_PROJECTILE_FRAME
      ];
      const missing = requiredFrames.filter(frame => !texture || !texture.has(frame));
      if (missing.length) {
        console.warn('Frames ausentes no atlas; personagens usarão fallback visual.', missing);
        this.createFallbackAtlas();
        this.registry.set('fighterTextureKey', 'fallback-fighters');
      } else {
        this.registry.set('fighterTextureKey', 'fighters');
      }
      for (const stage of Object.values(STAGES)) {
        if (!stage.layers.some(layer => this.textures.exists(layer.textureKey))) {
          console.warn(`Arte do cenário ${stage.name} indisponível; será usada uma arena temporária.`);
        }
      }
    });
  }

  createFallbackAtlas() {
    const key = 'fallback-fighters';
    const frameKeys = new Set([SPECIAL_PROJECTILE_FRAME]);
    for (const character of Object.values(CHARACTERS)) {
      for (const animation of Object.values(character.animations)) {
        for (const frame of animation.frames) frameKeys.add(frame);
      }
    }

    const cellWidth = 128;
    const cellHeight = 176;
    const columns = 8;
    const rows = Math.ceil(frameKeys.size / columns);
    const texture = this.textures.createCanvas(key, columns * cellWidth, rows * cellHeight);
    if (!texture) throw new Error('Não foi possível gerar fallback para os sprites.');
    const context = texture.getContext();

    [...frameKeys].forEach((frameKey, index) => {
      const x = index % columns * cellWidth;
      const y = Math.floor(index / columns) * cellHeight;
      const isPaula = frameKey.startsWith('paula/');
      const centerX = x + cellWidth / 2;
      const footY = y + cellHeight - 5;
      context.save();
      context.translate(centerX, footY);
      context.fillStyle = isPaula ? '#d83c89' : '#303040';
      context.strokeStyle = isPaula ? '#ffbadb' : '#69d783';
      context.lineWidth = 5;
      context.beginPath();
      context.ellipse(0, -42, 34, 55, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = isPaula ? '#f5c2a8' : '#b56e46';
      context.beginPath();
      context.arc(0, -108, 25, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#17131a';
      context.fillRect(-21, -16, 15, 16);
      context.fillRect(7, -16, 15, 16);
      context.restore();

      if (frameKey === SPECIAL_PROJECTILE_FRAME) {
        context.fillStyle = '#a4ff39';
        context.shadowColor = '#7dff30';
        context.shadowBlur = 18;
        context.beginPath();
        context.ellipse(centerX + 8, footY - 92, 48, 16, -0.15, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
      texture.add(frameKey, 0, x, y, cellWidth, cellHeight);
    });
    texture.refresh();
  }

  create() {
    this.game.events.emit('prototype:ready');
  }
}
