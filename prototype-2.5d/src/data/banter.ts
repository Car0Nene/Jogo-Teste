import type { FighterId } from './fighters';

/** Provocação a dois na abertura: cada fala é um clipe (key registrada em audio.ts) com a duração em segundos. */
export interface BanterLine { who: FighterId; key: string; dur: number }
export const BANTER: Array<{ a: FighterId; b: FighterId; lines: BanterLine[] }> = [
  { a: 'juraci', b: 'carlos', lines: [{ who: 'juraci', key: 'vsCarlos', dur: 2.43 }, { who: 'carlos', key: 'vsJuraci', dur: 2.40 }] },
  { a: 'paula', b: 'pedro', lines: [{ who: 'paula', key: 'vsPedro', dur: 2.87 }, { who: 'pedro', key: 'tiaPaula', dur: 2.80 }] },
  { a: 'franciely', b: 'carlos', lines: [{ who: 'franciely', key: 'vsCarlos', dur: 2.35 }, { who: 'carlos', key: 'vsFranciely', dur: 1.99 }] },
  { a: 'tainara', b: 'daniel', lines: [{ who: 'tainara', key: 'vsDaniel', dur: 3.71 }, { who: 'daniel', key: 'trabalhar', dur: 2.80 }] },
  { a: 'juraci', b: 'paula', lines: [{ who: 'juraci', key: 'vsPaula', dur: 2.85 }, { who: 'paula', key: 'vsJuraci', dur: 2.87 }] },
  { a: 'davi', b: 'carlos', lines: [{ who: 'davi', key: 'vsCarlos', dur: 2.53 }, { who: 'carlos', key: 'vsDavi', dur: 1.52 }] },
  { a: 'gabi', b: 'franciely', lines: [{ who: 'gabi', key: 'vsFranciely', dur: 2.17 }, { who: 'franciely', key: 'vsGabi', dur: 1.70 }] },
  { a: 'tainara', b: 'pedro', lines: [{ who: 'tainara', key: 'vsPedro', dur: 2.93 }, { who: 'pedro', key: 'cerveja', dur: 2.09 }] },
  { a: 'carlos', b: 'pedro', lines: [{ who: 'carlos', key: 'vsPedro', dur: 2.59 }, { who: 'pedro', key: 'instigando', dur: 1.28 }] },
  { a: 'daniel', b: 'pedro', lines: [{ who: 'daniel', key: 'acai', dur: 5.36 }, { who: 'pedro', key: 'dirigir', dur: 3.47 }] },
  { a: 'pedro', b: 'gabi', lines: [{ who: 'pedro', key: 'vozGabi', dur: 2.64 }, { who: 'gabi', key: 'invejosos', dur: 4.28 }] },
];

export function findBanter(p1: FighterId, p2: FighterId) {
  return BANTER.find((x) => (x.a === p1 && x.b === p2) || (x.a === p2 && x.b === p1)) ?? null;
}
