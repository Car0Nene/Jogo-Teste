import { assetUrl } from '../assetUrl';

export type FighterId =
  | 'juraci'
  | 'carlos'
  | 'pedro'
  | 'daniel'
  | 'franciely'
  | 'gabi'
  | 'paula'
  | 'tainara';

export type FormId =
  | 'normal'
  | 'gordao'
  | 'crente'
  | 'hulk'
  | 'praia'
  | 'brava'
  | 'paulaFury'
  | 'ricePower';

export interface MoveSpec {
  id: 'light' | 'medium' | 'heavy' | 'air' | 'combo' | 'special' | 'subSpecial';
  label: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  range: number;
  minRange: number;
  hitstun: number;
  blockstun: number;
  push: number;
  hitstop: number;
  lunge?: number;
  heavy?: boolean;
  knockdown?: boolean;
  chainTo?: 'medium' | 'heavy' | 'combo';
}

export interface FighterAppearance {
  skin: number;
  shirt: number;
  shirtSecondary?: number;
  pants: number;
  shoes: number;
  hair: number;
  hairStyle:
    | 'hairnet'
    | 'pompadour'
    | 'longParted'
    | 'fade'
    | 'curlyPuff'
    | 'longWavy'
    | 'ponytail'
    | 'longStraight';
  skirtStyle?: 'floralMidi' | 'midiFlare' | 'miniSlit';
  shortsStyle?: 'denimShorts' | 'bikini';
  jeansStyle?: 'ripped';
  shoeStyle?: 'sneakers' | 'heels' | 'flipFlops' | 'sandals';
  croppedMidriff?: boolean;
  bareArms?: boolean;
  bareLegs?: boolean;
  armTattoo?: boolean;
  crossbodyBag?: boolean;
  bikiniTriangles?: boolean;
  glasses?: 'rect' | 'redShades';
  beard?: boolean;
  mustache?: 'thick' | 'trim';
  necklace?: number;
  beadedNecklace?: boolean;
  watch?: boolean;
  earrings?: 'stud' | 'drop' | 'hoop';
  chestTattoo?: boolean;
  bikiniStraps?: number;
  yellowStripes?: boolean;
  sheerSleeves?: number;
  plumLips?: boolean;
  spatula?: boolean;
  wrinkles?: boolean;
  build: 'grandma' | 'athletic' | 'muscular' | 'lean' | 'curvy';
  heightScale: number;
}

export interface FighterSpec {
  id: FighterId;
  name: string;
  roleTitle: string;
  quote: string;
  desc: string;
  portraitUrl: string;
  powerLevel: number;
  accentHex: string;
  auraColor: number;
  walkSpeed: number;
  backSpeed: number;
  jumpVel: number;
  gravity: number;
  specialName: string;
  subSpecialName: string;
  specialSummary: string;
  subSpecialSummary: string;
  appearance: FighterAppearance;
  moves: {
    light: MoveSpec;
    medium: MoveSpec;
    heavy: MoveSpec;
    air: MoveSpec;
    combo?: MoveSpec;
  };
}

export interface FormSpec {
  id: FormId;
  label: string;
  atk: number;
  def: number;
  speed: number;
  push: number;
  reach: number;
  torsoScale: [number, number, number];
  muscleScale: number;
  skinOverride?: number;
  colorHex: string;
  auraHex: number;
}

export const FORMS: Record<FormId, FormSpec> = {
  normal: {
    id: 'normal',
    label: '',
    atk: 1,
    def: 1,
    speed: 1,
    push: 1,
    reach: 1,
    torsoScale: [1, 1, 1],
    muscleScale: 1,
    colorHex: '#e5e7eb',
    auraHex: 0xffffff,
  },
  gordao: {
    id: 'gordao',
    label: 'GORDÃO +FORÇA',
    atk: 1.28,
    def: 0.88,
    speed: 0.84,
    push: 1.35,
    reach: 1.12,
    torsoScale: [1.34, 1.04, 1.38],
    muscleScale: 1.15,
    colorHex: '#ffb347',
    auraHex: 0xff9628,
  },
  crente: {
    id: 'crente',
    label: 'MODO FÉ +DEFESA',
    atk: 1.05,
    def: 0.55,
    speed: 1.04,
    push: 1.05,
    reach: 1.02,
    torsoScale: [1.04, 1.02, 1.04],
    muscleScale: 1.04,
    colorHex: '#fff1a3',
    auraHex: 0xffe478,
  },
  hulk: {
    id: 'hulk',
    label: 'MONSTRÃO HEINEKEN',
    atk: 1.34,
    def: 0.78,
    speed: 0.92,
    push: 1.35,
    reach: 1.16,
    torsoScale: [1.28, 1.12, 1.24],
    muscleScale: 1.28,
    skinOverride: 0x39b856,
    colorHex: '#63ff84',
    auraHex: 0x45ff6b,
  },
  praia: {
    id: 'praia',
    label: 'NATAL PRAIA!',
    atk: 1.14,
    def: 0.95,
    speed: 1.32,
    push: 1.1,
    reach: 1.05,
    torsoScale: [1, 1, 1],
    muscleScale: 1.05,
    colorHex: '#ff70d0',
    auraHex: 0xff5ec4,
  },
  brava: {
    id: 'brava',
    label: 'IRRITADA + FOME',
    atk: 1.35,
    def: 0.9,
    speed: 1.16,
    push: 1.22,
    reach: 1.06,
    torsoScale: [1.05, 1.02, 1.05],
    muscleScale: 1.08,
    colorHex: '#ff5e5e',
    auraHex: 0xff3b3b,
  },
  paulaFury: {
    id: 'paulaFury',
    label: 'FÚRIA DO BAR SIMONE',
    atk: 1.38,
    def: 0.82,
    speed: 1.1,
    push: 1.25,
    reach: 1.1,
    torsoScale: [1.08, 1.04, 1.08],
    muscleScale: 1.1,
    colorHex: '#ff4ca0',
    auraHex: 0xff3a9b,
  },
  ricePower: {
    id: 'ricePower',
    label: 'PODER DO ARROZ',
    atk: 1.32,
    def: 0.88,
    speed: 1.1,
    push: 1.12,
    reach: 1.06,
    torsoScale: [1.04, 1.02, 1.04],
    muscleScale: 1.06,
    colorHex: '#ffe999',
    auraHex: 0xffe488,
  },
};

export const FIGHTERS: Record<FighterId, FighterSpec> = {
  juraci: {
    id: 'juraci',
    name: 'JURACI',
    roleTitle: 'Mestra da Padaria',
    quote: '"Bolos são minha vida!"',
    desc: 'Rápida e esperta. Dispara o Super Bolo de Cenoura ou chama o Dadá para lavar a louça e molhar a arena.',
    portraitUrl: assetUrl('/src/assets/images/portrait_juraci_clean_1795100421391.jpg'),
    powerLevel: 820,
    accentHex: '#ec4899',
    auraColor: 0xff4da6,
    walkSpeed: 4.5,
    backSpeed: 3.6,
    jumpVel: 12.2,
    gravity: 32,
    specialName: 'Super Bolo de Cenoura',
    subSpecialName: 'Chama o Dadá!',
    specialSummary: 'Bolo voador com cobertura de chocolate que derruba.',
    subSpecialSummary: 'Dadá aparece de rodo: "Já vou, irmã!" e escorrega o rival.',
    appearance: {
      skin: 0xd48b54,
      shirt: 0xe91e78,
      pants: 0x263259,
      shoes: 0xf43f8e,
      hair: 0x6b676e,
      hairStyle: 'hairnet',
      skirtStyle: 'floralMidi',
      shoeStyle: 'sneakers',
      bareLegs: true,
      earrings: 'hoop',
      necklace: 0xf5c542,
      wrinkles: true,
      build: 'grandma',
      heightScale: 0.96,
    },
    moves: {
      light: { id: 'light', label: 'Tapa Rápido', startup: 0.06, active: 0.09, recovery: 0.12, damage: 42, minRange: 0.2, range: 1.55, hitstun: 0.26, blockstun: 0.15, push: 2.2, hitstop: 0.045, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Golpe de Assadeira', startup: 0.09, active: 0.1, recovery: 0.17, damage: 64, minRange: 0.2, range: 1.8, hitstun: 0.32, blockstun: 0.18, push: 2.8, hitstop: 0.06, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Chute da Cozinha', startup: 0.14, active: 0.11, recovery: 0.26, damage: 92, minRange: 0.2, range: 2.15, hitstun: 0.42, blockstun: 0.22, push: 4.4, hitstop: 0.08, lunge: 1.6, heavy: true },
      air: { id: 'air', label: 'Voadora da Vó', startup: 0.07, active: 0.22, recovery: 0.1, damage: 58, minRange: 0.1, range: 1.7, hitstun: 0.32, blockstun: 0.18, push: 2.4, hitstop: 0.055 },
    },
  },
  carlos: {
    id: 'carlos',
    name: 'CARLOS',
    roleTitle: 'Rei do Combo & Pizza',
    quote: '"Tô firme! Tô forte!"',
    desc: 'Forte e versátil. Alterna entre Gordão (+força) e Modo Fé (+defesa) e encaixa o Combo do Chute.',
    portraitUrl: assetUrl('/src/assets/images/portrait_carlos_clean_1795100404700.jpg'),
    powerLevel: 880,
    accentHex: '#f59e0b',
    auraColor: 0xffb347,
    walkSpeed: 4.3,
    backSpeed: 3.4,
    jumpVel: 12.4,
    gravity: 32.5,
    specialName: 'Gordão / Modo Fé',
    subSpecialName: 'Combo do Chute',
    specialSummary: 'Come bolo ou pizza para ganhar força brutal, ou recebe batismo de luz.',
    subSpecialSummary: 'Onda sagrada de impacto à curta distância.',
    appearance: {
      skin: 0xd99b66,
      shirt: 0x16181f,
      shirtSecondary: 0xf4b400,
      pants: 0x4e7ab5,
      shoes: 0x16181f,
      hair: 0x151518,
      hairStyle: 'pompadour',
      shortsStyle: 'denimShorts',
      shoeStyle: 'sneakers',
      bareLegs: true,
      glasses: 'redShades',
      necklace: 0xf5c542,
      watch: true,
      yellowStripes: true,
      build: 'athletic',
      heightScale: 1.03,
    },
    moves: {
      light: { id: 'light', label: 'Jab Estiloso', startup: 0.06, active: 0.09, recovery: 0.12, damage: 44, minRange: 0.2, range: 1.55, hitstun: 0.26, blockstun: 0.15, push: 2.2, hitstop: 0.045, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Cruzado Firme', startup: 0.1, active: 0.1, recovery: 0.17, damage: 66, minRange: 0.2, range: 1.85, hitstun: 0.32, blockstun: 0.18, push: 2.8, hitstop: 0.06, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Chute Alto', startup: 0.15, active: 0.11, recovery: 0.25, damage: 88, minRange: 0.2, range: 2.2, hitstun: 0.42, blockstun: 0.22, push: 4.1, hitstop: 0.08, lunge: 1.5, heavy: true, chainTo: 'combo' },
      combo: { id: 'combo', label: 'Combo Final do Chute', startup: 0.12, active: 0.12, recovery: 0.32, damage: 112, minRange: 0.2, range: 2.35, hitstun: 0.5, blockstun: 0.26, push: 4.8, hitstop: 0.095, lunge: 2.1, heavy: true, knockdown: true },
      air: { id: 'air', label: 'Chute Aéreo', startup: 0.07, active: 0.22, recovery: 0.1, damage: 60, minRange: 0.1, range: 1.75, hitstun: 0.32, blockstun: 0.18, push: 2.4, hitstop: 0.055 },
    },
  },
  pedro: {
    id: 'pedro',
    name: 'PEDRO',
    roleTitle: 'O Monstrão da Resenha',
    quote: '"Fuma, bebe e vence!"',
    desc: 'Bebe uma Heineken e se transforma no Monstrão Verde! Já transformado, dispara rajada com aura verde.',
    portraitUrl: assetUrl('/src/assets/images/portrait_pedro_clean_1795100403773.jpg'),
    powerLevel: 950,
    accentHex: '#22c55e',
    auraColor: 0x45ff6b,
    walkSpeed: 4.4,
    backSpeed: 3.5,
    jumpVel: 12.2,
    gravity: 32,
    specialName: 'Monstrão / Aura Verde',
    subSpecialName: 'Fumaça de Cigarro',
    specialSummary: 'Vira Monstrão verde ou dispara Heineken com aura esmeralda.',
    subSpecialSummary: 'Nuvem densa de fumaça que faz o oponente tossir.',
    appearance: {
      skin: 0xb67044,
      shirt: 0x14151a,
      pants: 0x14151a,
      shoes: 0x121216,
      hair: 0x191213,
      hairStyle: 'longParted',
      skirtStyle: 'miniSlit',
      shoeStyle: 'heels',
      bareArms: true,
      bareLegs: true,
      crossbodyBag: true,
      beard: true,
      necklace: 0xf4c430,
      build: 'muscular',
      heightScale: 1.05,
    },
    moves: {
      light: { id: 'light', label: 'Direto Pesado', startup: 0.07, active: 0.09, recovery: 0.12, damage: 44, minRange: 0.2, range: 1.62, hitstun: 0.26, blockstun: 0.16, push: 2.3, hitstop: 0.05, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Cotovelada', startup: 0.1, active: 0.1, recovery: 0.17, damage: 64, minRange: 0.2, range: 1.86, hitstun: 0.32, blockstun: 0.18, push: 2.9, hitstop: 0.065, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Chutão do Monstrão', startup: 0.15, active: 0.12, recovery: 0.27, damage: 94, minRange: 0.2, range: 2.25, hitstun: 0.44, blockstun: 0.22, push: 4.5, hitstop: 0.085, lunge: 1.6, heavy: true },
      air: { id: 'air', label: 'Joelhada Voadora', startup: 0.07, active: 0.22, recovery: 0.1, damage: 60, minRange: 0.1, range: 1.75, hitstun: 0.32, blockstun: 0.18, push: 2.4, hitstop: 0.06 },
    },
  },
  daniel: {
    id: 'daniel',
    name: 'DANIEL',
    roleTitle: 'Agente Natal Praia',
    quote: '"Partiu praia?"',
    desc: 'Ágil e imprevisível. Ativa o Modo Natal Praia com velocidade máxima e conta com seu Cão protetor!',
    portraitUrl: assetUrl('/src/assets/images/portrait_daniel_clean_1795100404522.jpg'),
    powerLevel: 760,
    accentHex: '#ec4899',
    auraColor: 0xff6fd8,
    walkSpeed: 4.9,
    backSpeed: 3.9,
    jumpVel: 12.8,
    gravity: 32,
    specialName: 'Modo Natal Praia!',
    subSpecialName: 'Dancinha Musical',
    specialSummary: 'Impulso veloz de verão + assistência do Cão fiel.',
    subSpecialSummary: 'Onda rítmica de notas musicais que atinge à distância.',
    appearance: {
      skin: 0xd99b6a,
      shirt: 0xd99b6a,
      pants: 0xff1e8a,
      shoes: 0xff1e8a,
      hair: 0x1b191c,
      hairStyle: 'fade',
      shortsStyle: 'bikini',
      shoeStyle: 'flipFlops',
      bareArms: true,
      bareLegs: true,
      chestTattoo: true,
      armTattoo: true,
      bikiniStraps: 0xff1e8a,
      bikiniTriangles: true,
      beadedNecklace: true,
      build: 'lean',
      heightScale: 1.0,
    },
    moves: {
      light: { id: 'light', label: 'Soco Praia', startup: 0.055, active: 0.085, recovery: 0.11, damage: 40, minRange: 0.2, range: 1.55, hitstun: 0.25, blockstun: 0.15, push: 2.2, hitstop: 0.045, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Giro Tropical', startup: 0.09, active: 0.09, recovery: 0.16, damage: 60, minRange: 0.2, range: 1.85, hitstun: 0.31, blockstun: 0.18, push: 2.8, hitstop: 0.06, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Chute Calçadão', startup: 0.13, active: 0.11, recovery: 0.25, damage: 88, minRange: 0.2, range: 2.2, hitstun: 0.42, blockstun: 0.22, push: 4.2, hitstop: 0.08, lunge: 1.8, heavy: true },
      air: { id: 'air', label: 'Salto Acrobático', startup: 0.065, active: 0.22, recovery: 0.1, damage: 56, minRange: 0.1, range: 1.7, hitstun: 0.32, blockstun: 0.18, push: 2.3, hitstop: 0.055 },
    },
  },
  franciely: {
    id: 'franciely',
    name: 'FRANCIELY',
    roleTitle: 'Força & Cuidado',
    quote: '"Cuidar também é lutar!"',
    desc: 'Fica irritada e com fome sem motivo para ganhar dano extremo, ou dispara um Jato de Leite certeiro.',
    portraitUrl: assetUrl('/src/assets/images/portrait_franciely_clean_1795100404868.jpg'),
    powerLevel: 930,
    accentHex: '#3b82f6',
    auraColor: 0xff4646,
    walkSpeed: 4.4,
    backSpeed: 3.5,
    jumpVel: 12.2,
    gravity: 32,
    specialName: 'Irritada + Fome',
    subSpecialName: 'Jato de Leite',
    specialSummary: 'Aura rubra de fúria materna com +35% de ataque.',
    subSpecialSummary: 'Projétil rápido que empurra e trava o adversário.',
    appearance: {
      skin: 0xc9824e,
      shirt: 0x1d5fc4,
      pants: 0x353b48,
      shoes: 0xf8fafc,
      hair: 0x1c1417,
      hairStyle: 'curlyPuff',
      croppedMidriff: true,
      shoeStyle: 'sneakers',
      glasses: 'rect',
      earrings: 'stud',
      build: 'curvy',
      heightScale: 0.98,
    },
    moves: {
      light: { id: 'light', label: 'Palma Ágil', startup: 0.06, active: 0.09, recovery: 0.12, damage: 42, minRange: 0.2, range: 1.55, hitstun: 0.26, blockstun: 0.16, push: 2.2, hitstop: 0.045, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Gancho Firme', startup: 0.09, active: 0.1, recovery: 0.17, damage: 62, minRange: 0.2, range: 1.82, hitstun: 0.32, blockstun: 0.18, push: 2.8, hitstop: 0.06, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Chute da Fran', startup: 0.14, active: 0.11, recovery: 0.26, damage: 90, minRange: 0.2, range: 2.18, hitstun: 0.42, blockstun: 0.22, push: 4.3, hitstop: 0.08, lunge: 1.6, heavy: true },
      air: { id: 'air', label: 'Voadora Rápida', startup: 0.07, active: 0.22, recovery: 0.1, damage: 56, minRange: 0.1, range: 1.7, hitstun: 0.32, blockstun: 0.18, push: 2.3, hitstop: 0.055 },
    },
  },
  gabi: {
    id: 'gabi',
    name: 'GABI',
    roleTitle: 'Estrela do Super L',
    quote: '"Faz o L, ama o Lula!"',
    desc: 'Dispara um Super L gigante com chuva de brigadeiros! Com meia barra, encanta com Canto Musical.',
    portraitUrl: assetUrl('/src/assets/images/portrait_gabi_clean_1795100405141.jpg'),
    powerLevel: 840,
    accentHex: '#ef4444',
    auraColor: 0xff3b3b,
    walkSpeed: 4.6,
    backSpeed: 3.6,
    jumpVel: 12.4,
    gravity: 32,
    specialName: 'Super L + Brigadeiros',
    subSpecialName: 'Canto Musical',
    specialSummary: 'Dispara um L gigante e faz chover brigadeiros de chocolate!',
    subSpecialSummary: 'Notas musicais luminosas varrem o adversário.',
    appearance: {
      skin: 0xd18a52,
      shirt: 0x17171c,
      pants: 0x6b9ac4,
      shoes: 0x16161a,
      hair: 0x171014,
      hairStyle: 'longWavy',
      jeansStyle: 'ripped',
      shoeStyle: 'sneakers',
      croppedMidriff: true,
      bareArms: true,
      mustache: 'thick',
      earrings: 'stud',
      build: 'curvy',
      heightScale: 0.99,
    },
    moves: {
      light: { id: 'light', label: 'Golpe do L', startup: 0.06, active: 0.09, recovery: 0.12, damage: 42, minRange: 0.2, range: 1.56, hitstun: 0.26, blockstun: 0.15, push: 2.2, hitstop: 0.045, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Giro de Cabelo', startup: 0.09, active: 0.1, recovery: 0.17, damage: 62, minRange: 0.2, range: 1.84, hitstun: 0.32, blockstun: 0.18, push: 2.8, hitstop: 0.06, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Chute Estrela', startup: 0.14, active: 0.11, recovery: 0.26, damage: 90, minRange: 0.2, range: 2.2, hitstun: 0.42, blockstun: 0.22, push: 4.3, hitstop: 0.08, lunge: 1.6, heavy: true },
      air: { id: 'air', label: 'Chute Aéreo', startup: 0.07, active: 0.22, recovery: 0.1, damage: 56, minRange: 0.1, range: 1.72, hitstun: 0.32, blockstun: 0.18, push: 2.3, hitstop: 0.055 },
    },
  },
  paula: {
    id: 'paula',
    name: 'PAULA',
    roleTitle: 'Dona da Espátula',
    quote: '"Aqui em casa quem manda sou eu!"',
    desc: 'Vestido magenta e espátula de aço na mão. Dispara avalanche de Super Almoço ou desperta a Fúria do Bar Simone.',
    portraitUrl: assetUrl('/src/assets/images/portrait_paula_clean_1795100420739.jpg'),
    powerLevel: 890,
    accentHex: '#d946ef',
    auraColor: 0xff4ca0,
    walkSpeed: 4.35,
    backSpeed: 3.4,
    jumpVel: 12.2,
    gravity: 32,
    specialName: 'Super Almoço',
    subSpecialName: 'Fúria Bar Simone',
    specialSummary: 'Avalanche de pratos e comida voando na direção do rival!',
    subSpecialSummary: 'Desperta a Fúria do Bar Simone com +38% de poder.',
    appearance: {
      skin: 0xdca06f,
      shirt: 0xc01d83,
      pants: 0xa81670,
      shoes: 0x6b3e26,
      hair: 0x3b231d,
      hairStyle: 'ponytail',
      skirtStyle: 'midiFlare',
      shoeStyle: 'sandals',
      bareLegs: true,
      earrings: 'drop',
      spatula: true,
      build: 'curvy',
      heightScale: 1.0,
    },
    moves: {
      light: { id: 'light', label: 'Tapinha de Espátula', startup: 0.06, active: 0.09, recovery: 0.12, damage: 42, minRange: 0.2, range: 1.62, hitstun: 0.26, blockstun: 0.15, push: 2.3, hitstop: 0.045, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Varredura de Espátula', startup: 0.1, active: 0.1, recovery: 0.18, damage: 64, minRange: 0.2, range: 1.95, hitstun: 0.34, blockstun: 0.18, push: 3.0, hitstop: 0.065, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Espatulada Suprema', startup: 0.15, active: 0.11, recovery: 0.27, damage: 94, minRange: 0.2, range: 2.25, hitstun: 0.43, blockstun: 0.22, push: 4.4, hitstop: 0.085, lunge: 1.5, heavy: true },
      air: { id: 'air', label: 'Espátula Aérea', startup: 0.07, active: 0.22, recovery: 0.1, damage: 58, minRange: 0.1, range: 1.75, hitstun: 0.32, blockstun: 0.18, push: 2.3, hitstop: 0.055 },
    },
  },
  tainara: {
    id: 'tainara',
    name: 'TAINARA',
    roleTitle: 'Guardiã do Arroz',
    quote: '"Com arroz eu fico invencível!"',
    desc: 'Ativa o Poder do Arroz dourado para elevar força e velocidade, ou chama Cuidado em Dobro com as crianças.',
    portraitUrl: assetUrl('/src/assets/images/portrait_tainara_clean_1795100404936.jpg'),
    powerLevel: 870,
    accentHex: '#38bdf8',
    auraColor: 0xffe488,
    walkSpeed: 4.55,
    backSpeed: 3.55,
    jumpVel: 12.3,
    gravity: 32,
    specialName: 'Poder do Arroz',
    subSpecialName: 'Cuidado em Dobro',
    specialSummary: 'Aura dourada de arroz energizado (+32% ataque e velocidade).',
    subSpecialSummary: 'Pequenos aliados correm pela arena em ataque coletivo!',
    appearance: {
      skin: 0xd08956,
      shirt: 0x5ab1f2,
      sheerSleeves: 0x99d2ff,
      pants: 0x4ba0e3,
      shoes: 0x62b8f5,
      hair: 0x141013,
      hairStyle: 'longStraight',
      skirtStyle: 'midiFlare',
      shoeStyle: 'heels',
      bareLegs: true,
      earrings: 'hoop',
      plumLips: true,
      build: 'curvy',
      heightScale: 1.0,
    },
    moves: {
      light: { id: 'light', label: 'Golpe Elegante', startup: 0.06, active: 0.09, recovery: 0.12, damage: 41, minRange: 0.2, range: 1.58, hitstun: 0.26, blockstun: 0.15, push: 2.2, hitstop: 0.045, chainTo: 'medium' },
      medium: { id: 'medium', label: 'Rasteira Rápida', startup: 0.1, active: 0.1, recovery: 0.18, damage: 62, minRange: 0.2, range: 1.9, hitstun: 0.33, blockstun: 0.18, push: 2.9, hitstop: 0.065, chainTo: 'heavy' },
      heavy: { id: 'heavy', label: 'Chute Dourado', startup: 0.14, active: 0.11, recovery: 0.26, damage: 92, minRange: 0.2, range: 2.22, hitstun: 0.43, blockstun: 0.22, push: 4.3, hitstop: 0.085, lunge: 1.5, heavy: true },
      air: { id: 'air', label: 'Chute em Voo', startup: 0.07, active: 0.22, recovery: 0.1, damage: 58, minRange: 0.1, range: 1.75, hitstun: 0.32, blockstun: 0.18, push: 2.3, hitstop: 0.055 },
    },
  },
};

export const FIGHTER_LIST: FighterSpec[] = [
  FIGHTERS.juraci,
  FIGHTERS.carlos,
  FIGHTERS.pedro,
  FIGHTERS.daniel,
  FIGHTERS.franciely,
  FIGHTERS.gabi,
  FIGHTERS.paula,
  FIGHTERS.tainara,
];

export interface DialogueExchange {
  speaker: 'p1' | 'p2';
  text: string;
}

const INTRO_MATCHUPS: Record<string, DialogueExchange[][]> = {
  'juraci>carlos': [
    [
      { speaker: 'p1', text: 'Carlos! Saiu da dieta de novo?' },
      { speaker: 'p2', text: 'Vó, é só um pedacinho de bolo...' },
      { speaker: 'p1', text: 'Então vai ter que merecer!' },
    ],
    [
      { speaker: 'p1', text: 'Quem mexeu no meu bolo de cenoura?' },
      { speaker: 'p2', text: 'Eu não fui... foi o Pedro!' },
      { speaker: 'p1', text: 'Tá com cobertura no bigode, menino!' },
    ],
  ],
  'carlos>juraci': [
    [
      { speaker: 'p1', text: 'Vó, cadê aquele bolo de cenoura?' },
      { speaker: 'p2', text: 'Só depois de lavar a louça!' },
      { speaker: 'p1', text: 'Então vamos resolver na luta!' },
    ],
  ],
  'juraci>pedro': [
    [
      { speaker: 'p1', text: 'Pedro, apaga esse cigarro na minha padaria!' },
      { speaker: 'p2', text: 'Só mais uma tragada, vó...' },
      { speaker: 'p1', text: 'Vai é levar bolada!' },
    ],
  ],
  'pedro>juraci': [
    [
      { speaker: 'p1', text: 'Vó, a senhora viu minha Heineken?' },
      { speaker: 'p2', text: 'Joguei fora, Pedro!' },
      { speaker: 'p1', text: 'Aí a senhora pegou pesado!' },
    ],
  ],
  'carlos>pedro': [
    [
      { speaker: 'p1', text: 'Pedro, de novo indo pro Bar da Simone?' },
      { speaker: 'p2', text: 'Depois que eu te derrubar, gato!' },
    ],
  ],
  'pedro>carlos': [
    [
      { speaker: 'p1', text: 'Carlos, me paga uma Heineken?' },
      { speaker: 'p2', text: 'Só se ganhar de mim!' },
    ],
  ],
  'juraci>daniel': [
    [
      { speaker: 'p1', text: 'Daniel, vai lutar de biquíni?' },
      { speaker: 'p2', text: 'Partiu praia, vó!' },
      { speaker: 'p1', text: 'Partiu é levar bolo!' },
    ],
  ],
  'daniel>pedro': [
    [
      { speaker: 'p1', text: 'Pedro, depois a gente vai pro bar?' },
      { speaker: 'p2', text: 'Se a sua esposa deixar...' },
    ],
  ],
  'franciely>carlos': [
    [
      { speaker: 'p1', text: 'CARLOS!' },
      { speaker: 'p2', text: 'Eu não fiz nada, amor!' },
      { speaker: 'p1', text: 'Ainda! Mas vai fazer!' },
    ],
  ],
  'carlos>franciely': [
    [
      { speaker: 'p1', text: 'Amor, calma, vamos conversar...' },
      { speaker: 'p2', text: 'Conversar? Tô com FOME!' },
    ],
  ],
  'gabi>juraci': [
    [
      { speaker: 'p1', text: 'Vó, trouxe brigadeiro pra senhora!' },
      { speaker: 'p2', text: 'Ai, que menina boa!' },
      { speaker: 'p1', text: 'Mas antes... vamos lutar!' },
    ],
  ],
  'paula>pedro': [
    [
      { speaker: 'p1', text: 'Pedro, eu esperei no Bar da Simone!' },
      { speaker: 'p2', text: 'Calma, Paula, guarda essa espátula!' },
    ],
  ],
  'tainara>daniel': [
    [
      { speaker: 'p1', text: 'Daniel, vai trabalhar ou vai pra praia?' },
      { speaker: 'p2', text: 'Partiu praia, amor! Já volto!' },
    ],
  ],
};

export function pickIntroDialogue(p1: FighterId, p2: FighterId): DialogueExchange[] {
  const key = `${p1}>${p2}`;
  const pool = INTRO_MATCHUPS[key];
  if (pool && pool.length) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (p1 === p2) {
    return [
      { speaker: 'p1', text: 'Ué! Tá copiando meu estilo?' },
      { speaker: 'p2', text: 'Fica muito melhor em mim!' },
    ];
  }
  const n1 = FIGHTERS[p1].name;
  const n2 = FIGHTERS[p2].name;
  const generics: DialogueExchange[][] = [
    [
      { speaker: 'p1', text: `Família é tudo, ${n2}...` },
      { speaker: 'p2', text: '...mas hoje a vitória é minha!' },
    ],
    [
      { speaker: 'p2', text: `Vai encarar, ${n1}?` },
      { speaker: 'p1', text: 'Nasci para isso! Pode vir!' },
    ],
    [
      { speaker: 'p1', text: 'Depois da luta tem bolo da vó!' },
      { speaker: 'p2', text: 'Então vamos resolver logo!' },
    ],
  ];
  return generics[Math.floor(Math.random() * generics.length)];
}

export const FIGHTER_BARKS: Record<
  FighterId,
  { special: string[]; subSpecial: string[]; win: string[]; hit?: string[] }
> = {
  juraci: {
    special: ['BOLO DE CENOURA!', 'Toma bolo quentinho!', 'Saiu do forno agora!'],
    subSpecial: ['DADÁÁÁ! Vem lavar essa louça!', 'Cuidado que o chão tá molhado!'],
    win: ['Quem manda nesta cozinha sou eu!', 'Agora vai lavar a louça!'],
  },
  carlos: {
    special: ['GORDÃÃÃO! Hmmm, delícia!', 'Batizado e abençoado! ALELUIA!'],
    subSpecial: ['COMBO DO CHUTE!', 'Tá vendo, vó? Treinei no quintal!'],
    win: ['Família é tudo... mas a vitória é minha!', 'Depois dessa, mereço uma pizza!'],
  },
  pedro: {
    special: ['MONSTRÃÃÃO! Heineken dá força!', 'Heineken com aura verde!'],
    subSpecial: ['Quer uma tragada?', 'Toma fumaça!'],
    win: ['Fuma, bebe e vence!', 'Ninguém segura o Monstrão!'],
  },
  daniel: {
    special: ['PARTIU PRAIA!', 'Modo Natal Praia ativado!'],
    subSpecial: ['Sente o ritmo do verão!', 'Olha o passinho!'],
    win: ['Agora sim, partiu praia!', 'Valeu, amigão!'],
  },
  franciely: {
    special: ['Tô IRRITADA e com FOME!', 'CARLOS! Cadê minha comida?!'],
    subSpecial: ['Jato de leite!', 'Cuidar também é lutar!'],
    win: ['Cuidar também é lutar!', 'Agora sim deu uma acalmada!'],
  },
  gabi: {
    special: ['FAZ O L! Chuva de brigadeiros!', 'Vó, segura a panela!'],
    subSpecial: ['Solta a voz!', 'Notas do coração!'],
    win: ['Amor e luta sempre vencem!', 'Quer um brigadeiro?'],
  },
  paula: {
    special: ['SUPER ALMOÇO NA MESA!', 'Come tudo sem reclamar!'],
    subSpecial: ['FÚRIA DO BAR SIMONE!', 'Aqui quem manda sou eu!'],
    win: ['Aqui em casa quem manda sou eu!', 'Respeita a espátula!'],
  },
  tainara: {
    special: ['PODER DO ARROZ!', 'Energia dourada no máximo!'],
    subSpecial: ['CUIDADO EM DOBRO! Vai criançada!', 'Ataque da família!'],
    win: ['Com arroz eu fico invencível!', 'Vitória garantida!'],
  },
};
