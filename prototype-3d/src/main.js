import './styles.css';
import { GameEngine } from './core/GameEngine.js';

const mount = document.querySelector('#stage');
const hudContainer = document.querySelector('.hud');
const engine = new GameEngine({ mount, hudContainer });

const startButton = document.querySelector('#start');
const debugButton = document.querySelector('#debug');
const restartButton = document.querySelector('#restart');
const pauseButton = document.querySelector('#pause');
const resultPanel = document.querySelector('#result');
const resultAgain = document.querySelector('#again');
const resultMenu = document.querySelector('#menu');
const panel = document.querySelector('.panel');

window.__familyFighter3D = engine;

startButton.addEventListener('click', () => {
  panel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  engine.startMatch();
});

debugButton.addEventListener('click', () => {
  engine.toggleDebug();
});

restartButton.addEventListener('click', () => {
  resultPanel.classList.add('hidden');
  engine.startMatch();
  panel.classList.add('hidden');
});

resultAgain.addEventListener('click', () => {
  resultPanel.classList.add('hidden');
  panel.classList.add('hidden');
  engine.startMatch();
});

resultMenu.addEventListener('click', () => {
  resultPanel.classList.add('hidden');
  panel.classList.remove('hidden');
});

pauseButton.addEventListener('click', () => {
  const current = document.querySelector('#message').textContent;
  if (current.includes('PAUSADO')) {
    document.querySelector('#message').textContent = 'LUTA 3D PROVISÓRIA';
  } else {
    document.querySelector('#message').textContent = 'PAUSADO';
  }
});

window.addEventListener('resize', () => engine.resize());
