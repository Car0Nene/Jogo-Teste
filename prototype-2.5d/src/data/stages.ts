export type StageId = 'padaria' | 'quintal' | 'festa' | 'bar' | 'praia';

export interface StageSpec {
  id: StageId;
  name: string;
  subtitle: string;
  timeOfDay: string;
  skyTop: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  keyColor: number;
  keyIntensity: number;
  keyPos: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  rimColor: number;
  rimIntensity: number;
  charTint: number;
  charEnvIntensity: number;
  shadowOpacity: number;
  accentHex: string;
}

export const STAGES: Record<StageId, StageSpec> = {
  padaria: {
    id: 'padaria',
    name: 'Padaria da Juju',
    subtitle: 'Bolos da Juju · Feito com amor',
    timeOfDay: 'Manhã Dourada',
    skyTop: 0x4aa3e8,
    skyHorizon: 0xffe4b8,
    fogColor: 0xf4dcc0,
    fogDensity: 0.014,
    keyColor: 0xfff0d4,
    keyIntensity: 2.3,
    keyPos: [8, 13, 10],
    hemiSky: 0x9ed8ff,
    hemiGround: 0x8b5233,
    hemiIntensity: 0.92,
    rimColor: 0xffb86b,
    rimIntensity: 0.85,
    charTint: 0xfff5ea,
    charEnvIntensity: 0.58,
    shadowOpacity: 0.44,
    accentHex: '#f43f5e',
  },
  quintal: {
    id: 'quintal',
    name: 'Quintal da Família',
    subtitle: 'Mangueira, varal & fim de tarde',
    timeOfDay: 'Entardecer Quente',
    skyTop: 0x3b4d8c,
    skyHorizon: 0xff9a62,
    fogColor: 0xd98a6c,
    fogDensity: 0.016,
    keyColor: 0xffba7a,
    keyIntensity: 2.15,
    keyPos: [-9, 10, 9],
    hemiSky: 0xffbfa0,
    hemiGround: 0x5c3a24,
    hemiIntensity: 0.88,
    rimColor: 0xffd36e,
    rimIntensity: 0.92,
    charTint: 0xffe6d0,
    charEnvIntensity: 0.48,
    shadowOpacity: 0.46,
    accentHex: '#f59e0b',
  },
  festa: {
    id: 'festa',
    name: 'Festa Junina',
    subtitle: 'Fogueira, barracas & bandeirinhas',
    timeOfDay: 'Noite Estrelada',
    skyTop: 0x0b071d,
    skyHorizon: 0x2c1654,
    fogColor: 0x1b1033,
    fogDensity: 0.018,
    keyColor: 0xffc66e,
    keyIntensity: 1.65,
    keyPos: [4, 11, 8],
    hemiSky: 0x523a8a,
    hemiGround: 0x3a2014,
    hemiIntensity: 0.82,
    rimColor: 0xff7b29,
    rimIntensity: 1.2,
    charTint: 0xe6d6ea,
    charEnvIntensity: 0.34,
    shadowOpacity: 0.48,
    accentHex: '#fb923c',
  },
  bar: {
    id: 'bar',
    name: 'Bar da Simone',
    subtitle: 'Aqui a resenha é garantida!',
    timeOfDay: 'Noite de Neon',
    skyTop: 0x100826,
    skyHorizon: 0x451754,
    fogColor: 0x221235,
    fogDensity: 0.015,
    keyColor: 0xffd8ec,
    keyIntensity: 1.75,
    keyPos: [-4, 11, 9],
    hemiSky: 0x8054b2,
    hemiGround: 0x382436,
    hemiIntensity: 0.88,
    rimColor: 0x38bdf8,
    rimIntensity: 1.05,
    charTint: 0xe3d8f2,
    charEnvIntensity: 0.36,
    shadowOpacity: 0.48,
    accentHex: '#ec4899',
  },
  praia: {
    id: 'praia',
    name: 'Praia · Calçadão',
    subtitle: 'Partiu Praia! Sol, mar & Natal',
    timeOfDay: 'Pôr do Sol Tropical',
    skyTop: 0x2574d4,
    skyHorizon: 0xffb38a,
    fogColor: 0xeed4bc,
    fogDensity: 0.012,
    keyColor: 0xffe4b8,
    keyIntensity: 2.35,
    keyPos: [10, 12, 9],
    hemiSky: 0x8ad6ff,
    hemiGround: 0xc29354,
    hemiIntensity: 0.94,
    rimColor: 0x38bdf8,
    rimIntensity: 0.85,
    charTint: 0xffecd4,
    charEnvIntensity: 0.54,
    shadowOpacity: 0.44,
    accentHex: '#06b6d4',
  },
};

export const STAGE_LIST: StageSpec[] = [
  STAGES.padaria,
  STAGES.quintal,
  STAGES.festa,
  STAGES.bar,
  STAGES.praia,
];
