import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene.js';
import { FightScene } from '../scenes/FightScene.js';
import { UIScene } from '../scenes/UIScene.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#171323',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1250 },
      debug: false
    }
  },
  scene: [BootScene, CharacterSelectScene, FightScene, UIScene]
};
