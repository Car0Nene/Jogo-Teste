/**
 * Identidade de combate por personagem (camada de equilíbrio).
 *
 * Os golpes básicos dos 9 partiam de quase a mesma tabela (mesmo início, mesmo dano ±5%). Aqui cada
 * um ganha um ponto forte e paga por ele com um ponto fraco — coerente com o estilo da IA
 * (engine/ai/FighterAI.ts) e com a personalidade da família. Valores em QUADROS (1/60 s) e
 * multiplicadores; a tabela-base continua em fighters.ts.
 *
 * Regra de equilíbrio: nenhum golpe básico fica "mais" na defesa (vantagem > 0) e nenhum leve
 * passa de −4 na defesa. tests/balance.spec.js garante isso.
 */
import type { FighterId, MoveSpec } from './fighters';

type MoveKey = 'light' | 'medium' | 'heavy' | 'air';
type LowKey = 'lowLight' | 'lowHeavy';

export interface MoveTuning {
  /** quadros a mais (+) ou a menos (−) */
  startup?: number;
  active?: number;
  recovery?: number;
  blockstun?: number;
  hitstun?: number;
  /** multiplicador */
  damage?: number;
  /** metros a mais (+) ou a menos (−) */
  range?: number;
}

export interface StyleTuning {
  summary: string;
  moves?: Partial<Record<MoveKey, MoveTuning>>;
  lows?: Partial<Record<LowKey, MoveTuning>>;
}

export const STYLE_TUNING: Record<FighterId, StyleTuning> = {
  carlos: {
    summary: 'Rei do Combo: golpes leves e médios mais rápidos para emendar; o forte bate menos e alcança menos.',
    moves: {
      light: { startup: -1, recovery: -1 },
      medium: { recovery: -1 },
      heavy: { damage: 0.92, range: -0.1 },
    },
  },
  pedro: {
    summary: 'Brigão: o forte é lento, longo e pesado; o médio sai mais devagar.',
    moves: {
      light: { damage: 1.05 },
      medium: { startup: 1 },
      heavy: { startup: 2, recovery: 2, damage: 1.15, range: 0.2 },
    },
  },
  juraci: {
    summary: 'Zoneadora: alcance maior nos golpes (chinelo e assadeira), menos dano no corpo a corpo.',
    moves: {
      light: { range: 0.2 },
      medium: { damage: 0.95 },
      heavy: { range: 0.3, damage: 0.9 },
    },
  },
  daniel: {
    summary: 'Bate e volta: golpe aéreo melhor (mais tempo ativo e dano), forte mais fraco.',
    moves: {
      air: { active: 2, damage: 1.1 },
      heavy: { damage: 0.95 },
    },
  },
  franciely: {
    summary: 'Contra-ataque: médio e forte mais rápidos e o forte dói mais, mas fica bem exposta se errar.',
    moves: {
      light: { damage: 0.95 },
      medium: { startup: -1 },
      heavy: { startup: -1, damage: 1.08, recovery: 3 },
    },
  },
  gabi: {
    summary: 'Média distância: médio e forte alcançam mais; forte bate um pouco menos.',
    moves: {
      medium: { range: 0.25 },
      heavy: { range: 0.25, damage: 0.94 },
    },
  },
  paula: {
    summary: 'Pressão baixa: rasteira mais rápida e soco baixo mais seguro e longo; forte em pé mais fraco.',
    moves: {
      heavy: { damage: 0.95 },
    },
    lows: {
      lowLight: { range: 0.2, blockstun: 1 },
      lowHeavy: { startup: -2 },
    },
  },
  tainara: {
    summary: 'Equilibrada: médio deixa o rival preso um pouco mais na defesa (boa pressão), sem outros extremos.',
    moves: {
      medium: { blockstun: 1 },
    },
  },
  davi: {
    summary: 'Imprevisível: leve e médio rápidos, chute aéreo mais longo; o forte bate menos.',
    moves: {
      light: { startup: -1 },
      medium: { startup: -1 },
      heavy: { damage: 0.9 },
      air: { range: 0.15 },
    },
  },
};

const FRAME = 1 / 60;

/** Aplica um ajuste a um golpe (devolve um novo objeto). */
export function tuneMove(m: MoveSpec, t?: MoveTuning): MoveSpec {
  if (!t) return m;
  const fr = (v: number, d = 0) => Math.max(FRAME, v + d * FRAME);
  return {
    ...m,
    startup: fr(m.startup, t.startup),
    active: fr(m.active, t.active),
    recovery: fr(m.recovery, t.recovery),
    blockstun: fr(m.blockstun, t.blockstun),
    hitstun: fr(m.hitstun, t.hitstun),
    damage: Math.round(m.damage * (t.damage ?? 1)),
    range: m.range + (t.range ?? 0),
  };
}

/** Aplica a identidade de cada um aos golpes básicos (chamado uma vez, ao carregar os dados). */
export function applyStyleTuning(fighters: Record<FighterId, { moves: Record<string, MoveSpec | undefined> }>) {
  for (const [id, style] of Object.entries(STYLE_TUNING) as [FighterId, StyleTuning][]) {
    const moves = fighters[id]?.moves;
    if (!moves || !style.moves) continue;
    for (const [key, t] of Object.entries(style.moves) as [MoveKey, MoveTuning][]) {
      const m = moves[key];
      if (m) moves[key] = tuneMove(m, t);
    }
  }
}
