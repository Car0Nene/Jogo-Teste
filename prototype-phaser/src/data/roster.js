import { CHARACTERS } from './characters.js';

export const PLAYABLE_CHARACTER_IDS = Object.freeze(['pedro', 'paula']);

const FUTURE_CHARACTERS = [
  { id: 'juraci', name: 'JURACI' },
  { id: 'carlos', name: 'CARLOS' },
  { id: 'daniel', name: 'DANIEL' },
  { id: 'franciely', name: 'FRANCIELY' },
  { id: 'gabi', name: 'GABI' },
  { id: 'tainara', name: 'TAINARA' }
];

export const CHARACTER_ROSTER = Object.freeze([
  ...PLAYABLE_CHARACTER_IDS.map(id => ({
    id,
    name: CHARACTERS[id].name,
    portrait: `portraits/${id}.png`,
    playable: true
  })),
  ...FUTURE_CHARACTERS.map(character => ({
    ...character,
    portrait: `portraits/${character.id}.png`,
    playable: false
  }))
]);
