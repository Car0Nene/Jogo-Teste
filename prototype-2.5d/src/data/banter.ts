import type { FighterId } from './fighters';

/** Provocação a dois na abertura: cada fala é um clipe (key registrada em audio.ts) com a duração em segundos. */
export interface BanterLine { who: FighterId; key: string; dur: number }
export const BANTER: Array<{ a: FighterId; b: FighterId; weight?: number; lines: BanterLine[] }> = [
  // reações da família (vozes clonadas): entre as mulheres todo mundo é "fofa"
  { a: 'pedro', b: 'daniel', weight: 2, lines: [{ who: 'pedro', key: 'bt_daniel', dur: 1.96 }, { who: 'daniel', key: 'bt_pedro', dur: 1.67 }] },
  { a: 'juraci', b: 'pedro', weight: 2, lines: [{ who: 'juraci', key: 'bt_pedro', dur: 2.72 }, { who: 'pedro', key: 'bt_juraci', dur: 1.18 }] },
  { a: 'pedro', b: 'paula', weight: 2, lines: [{ who: 'pedro', key: 'bt_paula', dur: 1.49 }, { who: 'paula', key: 'bt_pedro', dur: 4.78 }] },
  { a: 'carlos', b: 'franciely', weight: 2, lines: [{ who: 'carlos', key: 'bt_franciely', dur: 2.43 }, { who: 'franciely', key: 'bt_carlos', dur: 4.55 }] },
  { a: 'daniel', b: 'tainara', weight: 2, lines: [{ who: 'daniel', key: 'bt_tainara', dur: 2.48 }, { who: 'tainara', key: 'bt_daniel', dur: 1.31 }] },
  { a: 'gabi', b: 'franciely', weight: 2, lines: [{ who: 'gabi', key: 'bt_franciely', dur: 7.47 }, { who: 'franciely', key: 'bt_gabi', dur: 2.98 }] },
  { a: 'juraci', b: 'paula', weight: 2, lines: [{ who: 'juraci', key: 'bt_paula', dur: 1.8 }, { who: 'paula', key: 'bt_juraci', dur: 2.69 }] },
  { a: 'juraci', b: 'franciely', weight: 2, lines: [{ who: 'juraci', key: 'bt_franciely', dur: 2.59 }, { who: 'franciely', key: 'bt_juraci', dur: 1.7 }] },
  { a: 'juraci', b: 'gabi', weight: 2, lines: [{ who: 'juraci', key: 'bt_gabi', dur: 2.51 }, { who: 'gabi', key: 'bt_juraci', dur: 2.51 }] },
  { a: 'juraci', b: 'tainara', weight: 2, lines: [{ who: 'juraci', key: 'bt_tainara', dur: 2.04 }, { who: 'tainara', key: 'bt_juraci', dur: 2.04 }] },
  { a: 'paula', b: 'franciely', weight: 2, lines: [{ who: 'paula', key: 'bt_franciely', dur: 2.85 }, { who: 'franciely', key: 'bt_paula', dur: 1.59 }] },
  { a: 'paula', b: 'gabi', weight: 2, lines: [{ who: 'paula', key: 'bt_gabi', dur: 2.87 }, { who: 'gabi', key: 'bt_paula', dur: 1.93 }] },
  { a: 'paula', b: 'tainara', weight: 2, lines: [{ who: 'paula', key: 'bt_tainara', dur: 2.32 }, { who: 'tainara', key: 'bt_paula', dur: 1.99 }] },
  { a: 'franciely', b: 'tainara', weight: 2, lines: [{ who: 'franciely', key: 'bt_tainara', dur: 3.32 }, { who: 'tainara', key: 'bt_franciely', dur: 1.62 }] },
  { a: 'gabi', b: 'tainara', weight: 2, lines: [{ who: 'gabi', key: 'bt_tainara', dur: 2.95 }, { who: 'tainara', key: 'bt_gabi', dur: 2.43 }] },
  { a: 'juraci', b: 'carlos', lines: [{ who: 'juraci', key: 'vsCarlos', dur: 2.43 }, { who: 'carlos', key: 'vsJuraci', dur: 2.40 }] },
  { a: 'paula', b: 'pedro', lines: [{ who: 'paula', key: 'vsPedro', dur: 2.87 }, { who: 'pedro', key: 'tiaPaula', dur: 2.80 }] },
  { a: 'franciely', b: 'carlos', lines: [{ who: 'franciely', key: 'vsCarlos', dur: 2.35 }, { who: 'carlos', key: 'vsFranciely', dur: 1.99 }] },
  { a: 'tainara', b: 'daniel', lines: [{ who: 'tainara', key: 'vsDaniel', dur: 2.77 }, { who: 'daniel', key: 'trabalhar', dur: 2.80 }] },
  { a: 'juraci', b: 'paula', lines: [{ who: 'juraci', key: 'vsPaula', dur: 2.85 }, { who: 'paula', key: 'vsJuraci', dur: 2.87 }] },
  { a: 'davi', b: 'carlos', lines: [{ who: 'davi', key: 'vsCarlos', dur: 2.66 }, { who: 'carlos', key: 'vsDavi', dur: 1.52 }] },
  { a: 'gabi', b: 'franciely', lines: [{ who: 'gabi', key: 'vsFranciely', dur: 2.17 }, { who: 'franciely', key: 'vsGabi', dur: 1.70 }] },
  { a: 'tainara', b: 'pedro', lines: [{ who: 'tainara', key: 'vsPedro', dur: 2.46 }, { who: 'pedro', key: 'cerveja', dur: 2.09 }] },
  { a: 'carlos', b: 'pedro', lines: [{ who: 'carlos', key: 'vsPedro', dur: 2.59 }, { who: 'pedro', key: 'instigando', dur: 1.28 }] },
  { a: 'daniel', b: 'pedro', lines: [{ who: 'daniel', key: 'acai', dur: 5.36 }, { who: 'pedro', key: 'dirigir', dur: 3.47 }] },
  { a: 'pedro', b: 'gabi', lines: [{ who: 'pedro', key: 'vozGabi', dur: 2.64 }, { who: 'gabi', key: 'invejosos', dur: 4.28 }] },
];

/** Provocação da dupla; quando há mais de uma, sorteia (as reações novas têm peso maior). */
export function findBanter(p1: FighterId, p2: FighterId, rnd: () => number = Math.random) {
  const all = BANTER.filter((x) => (x.a === p1 && x.b === p2) || (x.a === p2 && x.b === p1));
  if (!all.length) return null;
  const total = all.reduce((n, x) => n + (x.weight ?? 1), 0);
  let r = rnd() * total;
  for (const x of all) {
    r -= x.weight ?? 1;
    if (r < 0) return x;
  }
  return all[all.length - 1];
}
