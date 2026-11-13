import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.js';
import { AudioSystem } from './systems/AudioSystem.js';
import './style.css';

export const game = new Phaser.Game(gameConfig);
const audio = new AudioSystem();
game.registry.set('audioSystem', audio);

const startButton = document.querySelector('#start-button');
const startScreen = document.querySelector('#start-screen');
const gameTools = document.querySelector('#game-tools');
const touchControls = document.querySelector('#touch-controls');
const pauseButton = document.querySelector('#pause-button');
const resultActions = document.querySelector('#result-actions');

game.events.on('prototype:ready', () => {
  startButton.disabled = false;
  startButton.textContent = 'JOGAR';
  document.querySelector('#load-status').textContent = 'Escolha seus lutadores e uma arena.';
});

startButton.addEventListener('click', () => {
  audio.unlock();
  game.scene.start('CharacterSelectScene');
  startScreen.hidden = true;
  resultActions.hidden = true;
});

document.querySelector('#restart-button').addEventListener('click', () => {
  resultActions.hidden = true;
  game.events.emit('prototype:restart');
});

document.querySelector('#result-restart-button').addEventListener('click', () => {
  resultActions.hidden = true;
  game.events.emit('prototype:restart');
});

document.querySelector('#result-menu-button').addEventListener('click', () => {
  game.events.emit('prototype:return-menu');
});

pauseButton.addEventListener('click', () => {
  game.events.emit('prototype:toggle-pause');
});

document.querySelector('#music-button').addEventListener('click', event => {
  const enabled = audio.toggleMusic();
  event.currentTarget.textContent = `MÚSICA: ${enabled ? 'ON' : 'OFF'}`;
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
});

document.querySelector('#effects-button').addEventListener('click', event => {
  const enabled = audio.toggleEffects();
  event.currentTarget.textContent = `EFEITOS: ${enabled ? 'ON' : 'OFF'}`;
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
});

document.querySelector('#character-voice-button').addEventListener('click', event => {
  const enabled = audio.toggleCharacterVoices();
  event.currentTarget.textContent = `VOZES: ${enabled ? 'ON' : 'OFF'}`;
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
});

document.querySelector('#announcer-button').addEventListener('click', event => {
  const enabled = audio.toggleAnnouncer();
  event.currentTarget.textContent = `NARRADOR: ${enabled ? 'ON' : 'OFF'}`;
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
});

game.events.on('prototype:paused', paused => {
  if (paused) audio.pause();
  else audio.resume();
});

game.events.on('prototype:paused', paused => {
  pauseButton.textContent = paused ? 'RETOMAR' : 'PAUSAR';
  pauseButton.setAttribute('aria-label', paused ? 'Retomar partida' : 'Pausar partida');
});

game.events.on('prototype:ended', () => {
  pauseButton.textContent = 'PAUSAR';
  pauseButton.setAttribute('aria-label', 'Pausar partida');
});

game.events.on('prototype:match-confirmed', () => {
  startScreen.hidden = true;
  gameTools.hidden = false;
  resultActions.hidden = true;
  touchControls.hidden = !window.matchMedia('(pointer: coarse)').matches;
});

game.events.on('prototype:match-ended', () => {
  resultActions.hidden = false;
  touchControls.hidden = true;
});

game.events.on('prototype:match-reset', () => {
  resultActions.hidden = true;
  touchControls.hidden = !window.matchMedia('(pointer: coarse)').matches;
});

game.events.on('prototype:menu-returned', () => {
  startScreen.hidden = false;
  gameTools.hidden = true;
  resultActions.hidden = true;
  touchControls.hidden = true;
});

window.addEventListener('beforeunload', () => {
  audio.destroy();
  game.destroy(true);
}, { once: true });
