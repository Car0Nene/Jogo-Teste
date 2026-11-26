// 2D HD Semi-Realistic Sprite Atlas + Pedro HD + Cameo Dog
import { FighterId } from './fighters';
import { HD_ANIMS, HD_FORM_ANIMS } from './hdAnimAtlas';

// Frame tuple: [x, y, w, h, anchorX, anchorY, atlasTier?]
// atlasTier: 0 = fighters.webp, 1 = pedro-hd.webp, 2 = fighters-hd.webp, 3/4 = per-fighter HD atlases, 5 = Davi's atlas
export type SpriteFrame =
  | [number, number, number, number, number, number]
  | [number, number, number, number, number, number, number];
export type SpriteAnimMap = Record<string, SpriteFrame[]>;

export const ATLAS_SCALE = 1.4;
export const ATLAS_HD_SCALE = 4.2;
export const ATLAS_HD2_SCALE = 1.42;
export const ATLAS_HD3_SCALE = 2.68;
export const ATLAS_HD4_SCALE = 2.68;
export const DAVI_ATLAS_SCALE = 1.42;

export const CHAR_SPRITE_SCALE: Record<FighterId, number> = {
  juraci: 1.16,
  carlos: 1.24,
  pedro: 1.22,
  daniel: 1.21,
  franciely: 1.18,
  gabi: 1.19,
  paula: 1.20,
  tainara: 1.23,
  davi: 0.96,
};

export const SELECT_POSES: Record<FighterId, { anim: string; frame: number }> = {
  juraci: { anim: 'win', frame: 0 },
  carlos: { anim: 'win', frame: 0 },
  pedro: { anim: 'heavy', frame: 2 },
  daniel: { anim: 'win', frame: 0 },
  franciely: { anim: 'win', frame: 0 },
  gabi: { anim: 'win', frame: 0 },
  paula: { anim: 'heavy', frame: 1 },
  tainara: { anim: 'win', frame: 0 },
  davi: { anim: 'win', frame: 0 },
};

// Base 8 HD poses extracted per character [idle, walk, guard, light, heavy, jump, crouch, win]
const JURACI_HD: SpriteFrame[] = [
  [8, 8, 161, 350, 78.9, 350, 3],
  [177, 9, 174, 349, 97.7, 349, 3],
  [359, 8, 172, 350, 79.5, 350, 3],
  [539, 15, 225, 343, 89.4, 343, 3],
  [8, 390, 258, 341, 93.5, 341, 3],
  [274, 422, 169, 309, 84.5, 309, 3],
  [451, 430, 179, 301, 81.2, 301, 3],
  [638, 366, 147, 365, 86.2, 365, 3],
];

const CARLOS_HD: SpriteFrame[] = [
  [8, 9, 177, 352, 90.5, 352, 3],
  [193, 8, 198, 353, 109.1, 353, 3],
  [399, 15, 201, 346, 103.1, 346, 3],
  [608, 22, 270, 339, 110.5, 339, 3],
  [8, 383, 302, 355, 94.4, 355, 3],
  [318, 402, 236, 336, 118.0, 336, 3],
  [562, 428, 249, 310, 129.8, 310, 3],
  [819, 369, 196, 369, 106.8, 369, 3],
];

const DANIEL_HD: SpriteFrame[] = [
  [8, 10, 213, 347, 109.5, 347, 3],
  [229, 8, 194, 349, 110.2, 349, 3],
  [431, 14, 208, 343, 103.0, 343, 3],
  [647, 17, 280, 340, 108.5, 340, 3],
  [8, 379, 310, 357, 92.7, 357, 3],
  [326, 456, 252, 280, 126.0, 280, 3],
  [586, 442, 317, 294, 140.7, 294, 3],
  [911, 365, 209, 371, 107.9, 371, 3],
];

const FRANCIELY_HD: SpriteFrame[] = [
  [8, 8, 172, 358, 86.7, 358, 3],
  [188, 9, 176, 357, 92.0, 357, 3],
  [372, 15, 186, 351, 96.2, 351, 3],
  [566, 13, 251, 353, 100.7, 353, 3],
  [8, 382, 269, 358, 81.4, 358, 3],
  [285, 412, 170, 328, 85.0, 328, 3],
  [463, 430, 201, 310, 94.6, 310, 3],
  [672, 374, 193, 366, 100.3, 366, 3],
];

const GABI_HD: SpriteFrame[] = [
  [8, 8, 187, 347, 93.8, 347, 3],
  [203, 9, 186, 346, 102.5, 346, 3],
  [397, 9, 188, 346, 92.3, 346, 3],
  [593, 18, 256, 337, 103.1, 337, 3],
  [8, 386, 281, 346, 102.2, 346, 3],
  [297, 392, 187, 340, 93.5, 340, 3],
  [492, 437, 220, 295, 106.6, 295, 3],
  [720, 363, 172, 369, 84.0, 369, 3],
];

const PAULA_HD: SpriteFrame[] = [
  [8, 8, 198, 351, 76.9, 351, 3],
  [214, 10, 196, 349, 84.9, 349, 3],
  [418, 12, 178, 347, 84.4, 347, 3],
  [604, 19, 289, 340, 87.1, 340, 3],
  [8, 383, 279, 348, 99.9, 348, 3],
  [295, 394, 227, 337, 113.5, 337, 3],
  [530, 434, 194, 297, 87.7, 297, 3],
  [732, 367, 151, 364, 85.4, 364, 3],
];

const TAINARA_HD: SpriteFrame[] = [
  [8, 9, 167, 338, 76.7, 338, 3],
  [183, 8, 153, 339, 84.6, 339, 3],
  [344, 22, 182, 325, 89.2, 325, 3],
  [534, 26, 235, 321, 100.9, 321, 3],
  [8, 381, 271, 325, 97.4, 325, 3],
  [287, 397, 212, 309, 106.0, 309, 3],
  [507, 442, 246, 264, 103.6, 264, 3],
  [761, 355, 183, 351, 88.6, 351, 3],
];

// Dedicated HD 2.5D Special & Transformation poses (<id>-specials-hd.webp, tier = 4)
const JURACI_SP = {
  cake_up: [8, 8, 192, 546, 96, 546, 4] as SpriteFrame,
  cake_throw: [208, 225, 291, 329, 158.2, 329, 4] as SpriteFrame,
  pan_stance: [507, 211, 211, 343, 153.3, 343, 4] as SpriteFrame,
  spoon_ready: [726, 211, 243, 343, 112.2, 343, 4] as SpriteFrame,
  call_dada: [8, 569, 199, 343, 61.6, 343, 4] as SpriteFrame,
  win_alt: [215, 562, 148, 350, 83.4, 350, 4] as SpriteFrame,
  hurt: [371, 604, 269, 308, 105.8, 308, 4] as SpriteFrame,
};

const CARLOS_SP = {
  gordao_pizza: [8, 8, 175, 370, 81, 370, 4] as SpriteFrame,
  gordao_stance: [191, 15, 303, 363, 164.2, 363, 4] as SpriteFrame,
  gordao_punch: [502, 22, 434, 356, 170.6, 356, 4] as SpriteFrame,
  crente_pray: [8, 493, 200, 292, 90.5, 292, 4] as SpriteFrame,
  crente_halo: [216, 386, 373, 399, 202.1, 399, 4] as SpriteFrame,
  flying_kick: [597, 493, 424, 292, 212, 292, 4] as SpriteFrame, // espelhado no atlas: o original chutava para a esquerda
};

const DANIEL_SP = {
  praia_idle: [8, 8, 235, 366, 120.5, 366, 4] as SpriteFrame,
  praia_palm: [251, 32, 349, 342, 127.3, 342, 4] as SpriteFrame,
  praia_kick: [608, 18, 323, 356, 116.2, 356, 4] as SpriteFrame,
  dance1: [8, 382, 209, 349, 116.5, 349, 4] as SpriteFrame,
  dance2: [225, 382, 305, 349, 158, 349, 4] as SpriteFrame,
  hurt: [538, 403, 216, 328, 107.7, 328, 4] as SpriteFrame,
};

const FRANCIELY_SP = {
  brava1: [8, 8, 209, 358, 102.6, 358, 4] as SpriteFrame,
  brava2: [225, 15, 237, 351, 119.5, 351, 4] as SpriteFrame,
  mama1: [470, 8, 206, 358, 60.5, 358, 4] as SpriteFrame,
  mama2: [8, 374, 287, 358, 99.2, 358, 4] as SpriteFrame,
  win_alt: [303, 374, 120, 358, 53.8, 358, 4] as SpriteFrame,
  hurt: [431, 403, 283, 329, 122.5, 329, 4] as SpriteFrame,
};

const GABI_SP = {
  superl_up: [8, 8, 274, 376, 141, 376, 4] as SpriteFrame,
  superl_cast: [290, 43, 415, 341, 144.2, 341, 4] as SpriteFrame,
  mic1: [713, 36, 243, 348, 127.4, 348, 4] as SpriteFrame,
  mic2: [8, 399, 200, 348, 100.5, 348, 4] as SpriteFrame,
  hair_kick: [216, 392, 389, 355, 170.2, 355, 4] as SpriteFrame,
  hurt: [613, 420, 243, 327, 139, 327, 4] as SpriteFrame,
};

const PAULA_SP = {
  lunch1: [8, 8, 466, 357, 131.2, 357, 4] as SpriteFrame,
  lunch2: [482, 32, 416, 333, 131.1, 333, 4] as SpriteFrame,
  fury1: [906, 15, 211, 350, 95.7, 350, 4] as SpriteFrame,
  fury2: [8, 380, 270, 357, 127.4, 357, 4] as SpriteFrame,
  win_alt: [286, 373, 172, 364, 74.8, 364, 4] as SpriteFrame,
  hurt: [466, 408, 302, 329, 170.5, 329, 4] as SpriteFrame,
};

const TAINARA_SP = {
  rice1: [8, 15, 211, 346, 111.7, 346, 4] as SpriteFrame,
  rice2: [227, 22, 273, 339, 125.8, 339, 4] as SpriteFrame,
  cuidado1: [508, 22, 267, 339, 103.2, 339, 4] as SpriteFrame,
  cuidado2: [783, 8, 290, 353, 95.4, 353, 4] as SpriteFrame,
  skirt_kick: [8, 390, 317, 325, 109.5, 325, 4] as SpriteFrame,
  win_alt: [333, 369, 149, 346, 98.1, 346, 4] as SpriteFrame,
  hurt: [490, 403, 276, 312, 152.4, 312, 4] as SpriteFrame,
};

const PEDRO_SP = {
  drink: [8, 51, 192, 356, 94.8, 356, 4] as SpriteFrame,
  smoke: [208, 72, 318, 335, 102.2, 335, 4] as SpriteFrame,
  hulk_power1: [534, 30, 261, 377, 137.2, 377, 4] as SpriteFrame,
  hulk_power2: [803, 8, 271, 399, 143.4, 399, 4] as SpriteFrame,
  hulk_idle: [8, 415, 347, 384, 128.5, 384, 4] as SpriteFrame,
  hulk_punch: [363, 425, 403, 374, 129.4, 374, 4] as SpriteFrame,
  hulk_blast: [774, 422, 580, 377, 133.4, 377, 4] as SpriteFrame,
};

// Animações que o atlas completo (padrão Pedro) substitui. As demais chaves dos extras
// (especiais, formas, golpe forte característico, vitória alternativa) continuam valendo.
const FULL_ANIM_KEYS = new Set(['idle', 'walk', 'run', 'jump', 'crouch', 'guard', 'light', 'medium', 'heavy', 'win', 'hurt', 'knockdown', 'getup', 'flykick']);

function buildHdFighterAnims(p: SpriteFrame[], extras: SpriteAnimMap, id?: FighterId): SpriteAnimMap {
  const full = id ? HD_ANIMS[id] : undefined;
  if (full) {
    const signature = Object.fromEntries(Object.entries(extras).filter(([k]) => !FULL_ANIM_KEYS.has(k)));
    return { ...legacyHdAnims(p), ...full, ...signature };
  }
  return { ...legacyHdAnims(p), ...extras };
}

function legacyHdAnims(p: SpriteFrame[]): SpriteAnimMap {
  return {
    idle: [p[0]],
    walk: [p[1], p[0]],
    run: [p[1], p[5]],
    jump: [p[5]],
    crouch: [p[6]],
    guard: [p[2]],
    light: [p[0], p[3]],
    medium: [p[2], p[3]],
    heavy: [p[0], p[4]],
    hurt: [p[2]],
    win: [p[7]],
  };
}

const daviFrames: SpriteFrame[] = [
  [8, 4, 135, 155, 67.5, 155, 5], [264, 4, 133, 155, 66.5, 155, 5],
  [520, 4, 154, 155, 77, 155, 5], [776, 4, 168, 155, 84, 155, 5],
  [8, 174, 101, 155, 50.5, 155, 5], [264, 174, 105, 155, 52.5, 155, 5],
  [520, 174, 86, 155, 43, 155, 5], [776, 174, 165, 155, 82.5, 155, 5],
  [8, 344, 144, 155, 72, 155, 5], [264, 344, 92, 155, 46, 155, 5],
  [520, 344, 131, 155, 65.5, 155, 5], [776, 344, 130, 155, 65, 155, 5],
  [8, 514, 134, 155, 67, 155, 5], [264, 514, 169, 155, 84.5, 155, 5],
  [520, 514, 141, 80, 70.5, 80, 5], [776, 514, 194, 80, 97, 80, 5],
  [8, 684, 206, 80, 103, 80, 5], [264, 684, 167, 155, 83.5, 155, 5],
  [520, 684, 167, 155, 83.5, 155, 5], [776, 684, 152, 155, 76, 155, 5],
  [8, 854, 114, 155, 57, 155, 5], [264, 854, 74, 155, 37, 155, 5],
];

const DAVI_ATLAS: SpriteAnimMap = {
  idle: [daviFrames[0], daviFrames[1]],
  walk: [daviFrames[8], daviFrames[9], daviFrames[10], daviFrames[11]],
  run: [daviFrames[8], daviFrames[9], daviFrames[10]],
  jump: [daviFrames[4], daviFrames[9], daviFrames[11]],
  crouch: [daviFrames[13], daviFrames[17]],
  guard: [daviFrames[0], daviFrames[12]],
  light: [daviFrames[1], daviFrames[2], daviFrames[3]],
  medium: [daviFrames[1], daviFrames[2], daviFrames[3]],
  heavy: [daviFrames[4], daviFrames[6], daviFrames[7]],
  special: [daviFrames[18], daviFrames[19]],
  daviPurple: [daviFrames[18], daviFrames[21]],
  hurt: [daviFrames[12], daviFrames[13]],
  knockdown: [daviFrames[14], daviFrames[15], daviFrames[16]],
  win: [daviFrames[20]],
};

export const SPRITE_ATLAS: Record<FighterId | 'cao', SpriteAnimMap> = {
  juraci: buildHdFighterAnims(JURACI_HD, {
    special: [JURACI_SP.cake_up, JURACI_SP.cake_throw],
    subSpecial: [JURACI_SP.call_dada, JURACI_SP.spoon_ready],
    medium: [JURACI_HD[2], JURACI_SP.pan_stance],
    win: [JURACI_HD[7], JURACI_SP.win_alt],
    hurt: [JURACI_SP.hurt],
  }, 'juraci'),
  carlos: buildHdFighterAnims(CARLOS_HD, {
    special: [CARLOS_HD[2], CARLOS_SP.flying_kick],
    gordao: [CARLOS_SP.gordao_pizza, CARLOS_SP.gordao_stance, CARLOS_SP.gordao_punch],
    crente: [CARLOS_SP.crente_pray, CARLOS_SP.crente_halo],
  }, 'carlos'),
  // Modo Natal Praia usa a arte HD normal (as poses antigas eram de baixa resolução e borravam)
  daniel: HD_ANIMS.daniel
    ? buildHdFighterAnims(DANIEL_HD, {}, 'daniel')
    : buildHdFighterAnims(DANIEL_HD, {
        dance: [DANIEL_SP.dance1, DANIEL_SP.dance2],
        praia: [DANIEL_SP.praia_idle, DANIEL_SP.praia_palm, DANIEL_SP.praia_kick],
        hurt: [DANIEL_SP.hurt],
      }, 'daniel'),
  franciely: buildHdFighterAnims(FRANCIELY_HD, {
    brava: [FRANCIELY_SP.brava1, FRANCIELY_SP.brava2],
    mama: [FRANCIELY_SP.mama1, FRANCIELY_SP.mama2],
    win: [FRANCIELY_HD[7], FRANCIELY_SP.win_alt],
    hurt: [FRANCIELY_SP.hurt],
  }, 'franciely'),
  gabi: buildHdFighterAnims(GABI_HD, {
    special: [GABI_SP.superl_up, GABI_SP.superl_cast],
    dance: [GABI_SP.mic1, GABI_SP.mic2],
    heavy: [GABI_HD[0], GABI_SP.hair_kick],
    hurt: [GABI_SP.hurt],
  }, 'gabi'),
  paula: buildHdFighterAnims(PAULA_HD, {
    special: [PAULA_SP.lunch1, PAULA_SP.lunch2],
    paulaFury: [PAULA_SP.fury1, PAULA_SP.fury2],
    win: [PAULA_HD[7], PAULA_SP.win_alt],
    hurt: [PAULA_SP.hurt],
  }, 'paula'),
  tainara: buildHdFighterAnims(TAINARA_HD, {
    special: [TAINARA_SP.cuidado1, TAINARA_SP.cuidado2],
    ricePower: [TAINARA_SP.rice1, TAINARA_SP.rice2],
    heavy: [TAINARA_HD[0], TAINARA_SP.skirt_kick],
    win: [TAINARA_HD[7], TAINARA_SP.win_alt],
    hurt: [TAINARA_SP.hurt],
  }, 'tainara'),
  pedro: {
    hulk: [PEDRO_SP.hulk_idle, PEDRO_SP.hulk_punch, PEDRO_SP.hulk_blast],
    escape: [[587,210,46,186,24.8,185.9],[1584,210,86,184,44.2,183.9],[931,402,79,183,40.8,182.9],[1234,0,76,192,31.8,191.8]],
    hulkPower: [PEDRO_SP.hulk_power1, PEDRO_SP.hulk_power2],
    idle: [[1054,637,226,545,111.1,545,1],[230,637,234,555,123.3,555,1],[0,637,226,557,106.9,557,1],[468,637,218,555,111.1,555,1]],
    jump: [[1558,1198,234,456,113.7,456,1],[927,1198,240,491,122.9,491,1],[689,1198,234,496,102.9,496,1],[2190,637,273,519,136,519,1]],
    drink: [PEDRO_SP.drink],
    smoke: [PEDRO_SP.smoke],
    walk: [[0,0,306,633,154.7,633,1],[606,0,230,631,107.1,631,1],[310,0,292,633,126.7,633,1]],
    heavy: [[167,1198,214,500,120.8,500,1],[0,1198,163,516,79.7,516,1],[2281,0,245,564,150.2,564,1]],
    light: [[385,1198,300,498,183,498,1],[1171,1198,383,487,166.9,487,1]],
    guard: [[1633,637,273,538,125.7,538,1],[1910,637,276,538,126,538,1]],
    hulkBlast: [PEDRO_SP.hulk_idle, PEDRO_SP.hulk_blast],
    run: [[1215,0,411,571,247.2,571,1],[840,0,371,585,209.8,585,1],[1887,0,390,568,232.3,568,1],[690,637,360,552,197.6,552,1]],
    medium: [[1630,0,253,569,116.3,569,1],[1284,637,345,541,111,541,1]],
    crouch: [[2178,1198,292,451,142.2,451,1],[1110,1718,263,381,122.1,381,1]],
    sweep: [[2028,1718,325,245,152.2,245,1],[0,2172,329,245,142.7,245,1],[333,2172,555,239,262.8,239,1]],
    flykick: [[229,1718,262,448,127.4,448,1],[1796,1198,378,455,133,455,1]],
    hurt: [[0,1718,225,450,107.7,450,1],[495,1718,204,404,104.5,404,1],[703,1718,204,404,95,404,1],[911,1718,195,399,103.8,399,1]],
    knockdown: [[495,1718,204,404,104.5,404,1],[911,1718,195,399,103.8,399,1],[1813,1718,211,250,121.7,250,1]],
    getup: [[1813,1718,211,250,121.7,250,1],[1377,1718,432,340,224.5,340,1]],
    win: [[2281,0,245,564,150.2,564,1],[1284,637,345,541,111,541,1]],
  },
  // Davi: animações base novas (feitas a partir da foto), especiais antigos mantidos
  davi: HD_ANIMS.davi
    ? { ...DAVI_ATLAS, ...HD_ANIMS.davi }
    : DAVI_ATLAS,
  cao: {"idle":[[1130,589,216,182,107.1,179.9]],"special":[[1350,589,251,182,132.1,182]],"win":[[1605,589,216,182,107.1,179.9]],"run":[[0,960,343,180,182.5,177.8]],"walk":[[1158,960,224,179,114.9,176.8]],"jump":[[1386,960,242,179,97.8,176.8]],"heavy":[[995,1326,239,175,117,174.7]],"medium":[[536,1859,239,170,133.6,169.5]],"light":[[370,2033,205,167,108.7,167.4]],"guard":[[0,2536,255,157,111.8,157]],"crouch":[[994,2536,267,156,135.1,156.1]]},
};

// Pedro: atlas antigo à mão (especiais/formas), animações base trocadas pelas novas feitas da foto
if (HD_ANIMS.pedro) Object.assign(SPRITE_ATLAS.pedro, HD_ANIMS.pedro);
// Carlos: o golpe do sub-especial (combo do chute) usa o chute da arte nova, não a pose antiga
if (HD_ANIMS.carlos?.medium) SPRITE_ATLAS.carlos.special = HD_ANIMS.carlos.medium;
// Daniel: a dancinha (Modo Natal Praia) usa o rebolado da arte nova da Super Bundada
if (HD_ANIMS.daniel?.bundada) SPRITE_ATLAS.daniel.dance = HD_ANIMS.daniel.bundada.slice(0, 4);

/**
 * Arte única: todo quadro de lutador vem do atlas novo (padrão Pedro, tier 6). As poses antigas de
 * especiais/formas (atlas de baixa resolução) eram trocadas no meio do golpe e o personagem "voltava"
 * para a versão velha. Cada pose característica aponta para a animação nova mais parecida.
 */
const MODERN_ART: Partial<Record<FighterId, Record<string, (a: SpriteAnimMap) => SpriteFrame[] | undefined>>> = {
  juraci: { special: (a) => a.medium, subSpecial: (a) => a.win },
  carlos: { gordao: () => HD_FORM_ANIMS['carlos@gordao']?.idle, crente: () => HD_FORM_ANIMS['carlos@crente']?.idle },
  franciely: { brava: (a) => a.heavy && [a.heavy[0], a.heavy[2]], mama: (a) => a.light },
  gabi: { special: (a) => a.medium, dance: (a) => a.win },
  paula: { special: (a) => a.medium, paulaFury: (a) => a.heavy && [a.heavy[0], a.heavy[2]] },
  tainara: { special: (a) => a.medium, ricePower: (a) => a.heavy && [a.heavy[0], a.heavy[2]] },
  pedro: {
    hulk: () => { const h = HD_FORM_ANIMS['pedro@hulk']; return h && [h.idle[0], h.light[2], h.heavy[2]]; },
    hulkBlast: () => HD_FORM_ANIMS['pedro@hulk']?.heavy,
    escape: (a) => a.run,
    sweep: (a) => a.crouch,
  },
  davi: { special: (a) => a.medium, daviPurple: (a) => a.idle && [a.idle[0], a.idle[1]] },
};
const isModern = (fr: SpriteFrame[]) => fr.length > 0 && fr.every((f) => f[6] === 6);
for (const id of Object.keys(HD_ANIMS) as FighterId[]) {
  const atlas = SPRITE_ATLAS[id];
  const hd = HD_ANIMS[id]!;
  for (const key of Object.keys(atlas)) {
    if (isModern(atlas[key])) continue;
    const frames = MODERN_ART[id]?.[key]?.(hd) ?? hd[key] ?? hd.heavy;
    if (frames && isModern(frames)) atlas[key] = frames;
  }
}

export const BASE_SPRITE_HEIGHT: Record<FighterId, number> = Object.fromEntries(
  (['juraci','carlos','pedro','daniel','franciely','gabi','paula','tainara','davi'] as FighterId[]).map((id) => {
    const heights = (SPRITE_ATLAS[id].idle || []).map((f) => f[3]).sort((a, b) => a - b);
    return [id, heights.length ? heights[Math.floor(heights.length / 2)] : 220];
  })
) as Record<FighterId, number>;
