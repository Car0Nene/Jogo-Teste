import { STYLE_TUNING, tuneMove } from './balance';
/**
 * Estrutura de golpes: fonte única dos comandos de cada lutador.
 *
 * O motor resolve cada botão por aqui (direção + botão → golpe), a Lista de Golpes da pausa e o
 * modo treino leem a mesma tabela, e os ícones de cada plataforma (teclado, Xbox, PlayStation,
 * toque) saem de um só lugar. Assim, mudar um comando muda o jogo, a lista e os desafios juntos.
 */
import { FIGHTERS, type FighterId, type MoveSpec } from './fighters';
import { DEFAULT_KEY_BINDINGS, formatKeyCode, type Player1KeyBindings } from './settings';

/** Botões de ação (apertar). */
export type CommandButton = 'light' | 'heavy' | 'special' | 'jump' | 'taunt';
/** Direção relativa a quem luta: "frente" é sempre na direção do adversário. */
export type CommandDir = 'neutral' | 'forward' | 'back' | 'down' | 'air';
/** Entrada simples: direção (segurada) + botão (apertado). */
export interface CommandInput {
  dir: CommandDir;
  button: CommandButton;
}

export type CommandGroup = 'basic' | 'command' | 'chain' | 'special' | 'system';
export const GROUP_LABEL: Record<CommandGroup, string> = {
  basic: 'Golpes básicos',
  command: 'Golpes de comando',
  chain: 'Sequências (combo)',
  special: 'Especiais (barra)',
  system: 'Sistema',
};

/** Propriedade de defesa: médio (defende em pé ou agachado), baixo (só agachado). */
export type HitLevel = 'mid' | 'low' | 'air' | 'unblockable' | 'none';

export interface CommandEntry {
  id: string;
  group: CommandGroup;
  name: string;
  /** um ou mais passos; cada passo é direção + botão */
  inputs: CommandInput[];
  /** custo de barra (0 = livre) */
  meter: number;
  level: HitLevel;
  note: string;
  /** dados de frame (60 fps) quando é um golpe com acerto */
  frames?: { startup: number; active: number; recovery: number; damage: number; onBlock: number; onHit: number };
}

export const FPS = 60;
export const DEFAULT_HITSTUN = 0.28;
const f = (s: number) => Math.round(s * FPS);

/** Vantagem em frames depois do golpe (positivo = quem bateu age primeiro). */
export function frameAdvantage(m: MoveSpec, onBlock: boolean): number {
  const stun = onBlock ? m.blockstun || DEFAULT_HITSTUN : m.hitstun || DEFAULT_HITSTUN;
  return f(stun) - f(m.active) - f(m.recovery) + 1;
}

export function moveFrames(m: MoveSpec): NonNullable<CommandEntry['frames']> {
  return {
    startup: f(m.startup) + 1,
    active: f(m.active),
    recovery: f(m.recovery),
    damage: m.damage,
    onBlock: frameAdvantage(m, true),
    onHit: m.knockdown ? 99 : frameAdvantage(m, false),
  };
}

/**
 * Golpes baixos derivados dos golpes do lutador (mesmo ritmo, alcance menor, acertam embaixo).
 * Só são defendidos agachado (baixo + trás).
 */
const lowCache = new Map<FighterId, { light: MoveSpec; heavy: MoveSpec }>();
export function lowMoves(id: FighterId): { light: MoveSpec; heavy: MoveSpec } {
  const hit = lowCache.get(id);
  if (hit) return hit;
  const mv = FIGHTERS[id].moves;
  const light: MoveSpec = {
    ...mv.light,
    label: 'Soco Baixo',
    damage: Math.round(mv.light.damage * 0.85),
    range: mv.light.range * 0.92,
    anim: 'crouch',
    chainTo: undefined,
    low: true,
  };
  const heavy: MoveSpec = {
    ...mv.heavy,
    label: 'Rasteira',
    startup: mv.heavy.startup + 0.03,
    recovery: mv.heavy.recovery + 0.08,
    damage: Math.round(mv.heavy.damage * 0.9),
    range: mv.heavy.range * 1.05,
    lunge: (mv.heavy.lunge ?? 1.2) + 0.6,
    knockdown: true,
    anim: 'crouch',
    chainTo: undefined,
    low: true,
  };
  const out = { light, heavy };
  const lt = STYLE_TUNING[id]?.lows;
  if (lt) {
    // estilo próprio nos golpes baixos (ex.: Paula, pressão baixa)
    Object.assign(light, tuneMove(light, lt.lowLight));
    Object.assign(heavy, tuneMove(heavy, lt.lowHeavy));
  }
  lowCache.set(id, out);
  return out;
}

const step = (dir: CommandDir, button: CommandButton): CommandInput => ({ dir, button });

/** Lista completa de golpes do lutador, na ordem da Lista de Golpes. */
export function commandListFor(id: FighterId): CommandEntry[] {
  const fd = FIGHTERS[id];
  const mv = fd.moves;
  const low = lowMoves(id);
  const out: CommandEntry[] = [
    { id: 'light', group: 'basic', name: mv.light.label, inputs: [step('neutral', 'light')], meter: 0, level: 'mid', note: 'Rápido. Começa as sequências.', frames: moveFrames(mv.light) },
    { id: 'heavy', group: 'basic', name: mv.heavy.label, inputs: [step('neutral', 'heavy')], meter: 0, level: 'mid', note: 'Avança e empurra longe.', frames: moveFrames(mv.heavy) },
    { id: 'air', group: 'basic', name: mv.air.label, inputs: [step('air', 'light')], meter: 0, level: 'air', note: 'No ar, Leve ou Forte.', frames: moveFrames(mv.air) },
    { id: 'lowLight', group: 'command', name: low.light.label, inputs: [step('down', 'light')], meter: 0, level: 'low', note: 'Acerta embaixo: só defende agachado.', frames: moveFrames(low.light) },
    { id: 'lowHeavy', group: 'command', name: low.heavy.label, inputs: [step('down', 'heavy')], meter: 0, level: 'low', note: 'Derruba. Só defende agachado.', frames: moveFrames(low.heavy) },
  ];
  if (mv.gag) {
    out.push({ id: 'gag', group: 'command', name: mv.gag.label, inputs: [step('forward', 'light')], meter: 0, level: 'mid', note: 'Golpe cômico do personagem.', frames: moveFrames(mv.gag) });
  }
  out.push(
    { id: 'chainMedium', group: 'chain', name: `${mv.light.label} → ${mv.medium.label}`, inputs: [step('neutral', 'light'), step('neutral', 'light')], meter: 0, level: 'mid', note: 'Aperte de novo quando o primeiro acertar.', frames: moveFrames(mv.medium) },
    {
      id: 'chainHeavy',
      group: 'chain',
      name: `${mv.medium.label} → ${mv.combo ? mv.combo.label : mv.heavy.label}`,
      inputs: [step('neutral', 'light'), step('neutral', 'light'), step('neutral', 'heavy')],
      meter: 0,
      level: 'mid',
      note: mv.combo ? 'Fecha a sequência com o golpe de assinatura.' : 'Fecha a sequência com o Forte.',
      frames: moveFrames(mv.combo ?? mv.heavy),
    },
    { id: 'special', group: 'special', name: fd.specialName, inputs: [step('neutral', 'special')], meter: 100, level: 'unblockable', note: 'Adversário fica sem defesa durante o especial.' },
    { id: 'subSpecial', group: 'special', name: fd.subSpecialName, inputs: [step('down', 'special')], meter: 50, level: 'mid', note: 'Versão curta: custa meia barra.' },
    { id: 'jump', group: 'system', name: 'Pulo', inputs: [step('neutral', 'jump')], meter: 0, level: 'none', note: 'Segure frente/trás para pular na direção.' },
    { id: 'guard', group: 'system', name: 'Defesa', inputs: [step('back', 'light')], meter: 0, level: 'none', note: 'Segure Trás (ou o botão Defesa). Agachado defende golpes baixos.' },
    { id: 'taunt', group: 'system', name: 'Provocar', inputs: [step('neutral', 'taunt')], meter: 0, level: 'none', note: 'Ganha um pouco de barra, mas fica aberto.' }
  );
  return out;
}

// ----------------------------------------------------------------------
// Ícones por plataforma
// ----------------------------------------------------------------------
export type GlyphPlatform = 'keyboard' | 'xbox' | 'playstation' | 'touch';

const PAD: Record<'xbox' | 'playstation', Record<CommandButton | 'guard', string>> = {
  xbox: { light: 'A', heavy: 'X', special: 'Y', jump: 'B', taunt: 'View', guard: 'LB/RB' },
  playstation: { light: '✕', heavy: '□', special: '△', jump: '○', taunt: 'Share', guard: 'L1/R1' },
};
const TOUCH: Record<CommandButton | 'guard', string> = {
  light: 'Leve', heavy: 'Forte', special: 'Especial', jump: 'Pulo', taunt: 'Provocar', guard: 'Defesa',
};

export function buttonGlyph(button: CommandButton | 'guard', platform: GlyphPlatform, kb: Player1KeyBindings = DEFAULT_KEY_BINDINGS): string {
  if (platform === 'xbox' || platform === 'playstation') return PAD[platform][button];
  if (platform === 'touch') return TOUCH[button];
  const code = button === 'jump' ? kb.up : button === 'taunt' ? 'KeyY' : kb[button];
  return formatKeyCode(code);
}

/** Direção: setas valem em todas as plataformas (em toque é o analógico virtual). */
export function dirGlyph(dir: CommandDir): string {
  return dir === 'forward' ? '→' : dir === 'back' ? '←' : dir === 'down' ? '↓' : dir === 'air' ? 'no ar' : '';
}

/** Texto do comando inteiro, ex.: "↓ + K" ou "J, J, K". */
export function commandText(entry: CommandEntry, platform: GlyphPlatform, kb?: Player1KeyBindings): string {
  if (entry.id === 'guard') return platform === 'touch' ? 'Defesa ou ←' : `← ou ${buttonGlyph('guard', platform, kb)}`;
  return entry.inputs
    .map((i) => {
      const b = buttonGlyph(i.button, platform, kb);
      const d = dirGlyph(i.dir);
      return i.dir === 'air' ? `${b} (no ar)` : d ? `${d} + ${b}` : b;
    })
    .join(', ');
}

/** Detecta a família do controle conectado pelo nome que o navegador informa. */
export function detectPadFamily(): 'xbox' | 'playstation' {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return 'xbox';
  const gp = Array.from(navigator.getGamepads()).find(Boolean);
  return gp && /054c|playstation|dualsense|dualshock|wireless controller/i.test(gp.id) ? 'playstation' : 'xbox';
}
