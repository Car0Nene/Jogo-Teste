/**
 * Regras de combate puras (sem Three.js, som ou estado do motor): defesa alta/baixa, atordoamento,
 * escala de combo, dano e ganho de barra. O motor (GameEngine.applyHit) só aplica o resultado.
 * Separadas para serem testadas isoladamente e reaproveitadas (treino, IA, futuras hitboxes).
 */
import type { MoveSpec } from '../../data/fighters';
import { DEFAULT_HITSTUN } from '../../data/commands';

/** Fração do dano que passa pela defesa (dano de raspão). */
export const CHIP_RATIO = 0.22;
/** Empurrão em quem defende, relativo ao do golpe. */
export const BLOCK_PUSH_RATIO = 0.65;
/** Empurrão de volta em quem atacou um adversário defendendo (evita prender na parede). */
export const ATTACKER_PUSHBACK_RATIO = 0.45;
/** Distância máxima para o empurrão de volta valer. */
export const ATTACKER_PUSHBACK_RANGE = 2.4;
/** Atordoamento mínimo de qualquer golpe (s). */
export const MIN_STUN = 0.16;
/** Barra ganha por quem acerta / por quem tem o golpe defendido / por quem leva o golpe. */
export const METER_GAIN = { hit: 15, blocked: 7, defender: 8 } as const;
/** Escala de combo: a partir do 3º acerto, −10% por golpe, piso de 55%. */
export const COMBO_SCALE_STEP = 0.1;
export const COMBO_SCALE_FLOOR = 0.55;

export interface DefenderGuardState {
  state: string;
  y: number;
  /** segundos em que a defesa está desligada (ex.: durante certos especiais) */
  noGuardTimer: number;
  /** segurando para trás (direção oposta ao adversário) */
  holdingBack: boolean;
  /** segurando para baixo */
  holdingDown: boolean;
  /** boneco do treino configurado para defender tudo */
  dummyBlocksAll: boolean;
}

export interface GuardResult {
  blocked: boolean;
  /** defendeu agachado um golpe baixo (anima a defesa baixa) */
  lowGuard: boolean;
}

const CANNOT_GUARD = new Set(['attack', 'hitstun', 'knockdown']);

/**
 * Defesa: em pé (estado de defesa, já atordoado defendendo, ou segurando para trás no chão livre).
 * Golpe baixo só é defendido agachado. Boneco "defende tudo" defende qualquer golpe se estiver livre.
 */
export function resolveGuard(d: DefenderGuardState, move?: Pick<MoveSpec, 'low'>): GuardResult {
  const grounded = d.y <= 0.02;
  const standingGuard =
    d.noGuardTimer <= 0 &&
    (d.state === 'guard' || d.state === 'blockstun' || (grounded && !CANNOT_GUARD.has(d.state) && d.holdingBack));
  const crouching = d.holdingDown || d.state === 'crouch';
  const blocked =
    (standingGuard && (!move?.low || crouching || d.dummyBlocksAll)) ||
    (d.dummyBlocksAll && d.noGuardTimer <= 0 && grounded && !CANNOT_GUARD.has(d.state));
  return { blocked, lowGuard: blocked && Boolean(move?.low) };
}

/** Atordoamento (s) de quem recebe: o do golpe em acerto ou defesa, com piso. */
export function stunDuration(blocked: boolean, move?: Pick<MoveSpec, 'hitstun' | 'blockstun'>): number {
  return Math.max(MIN_STUN, (blocked ? move?.blockstun : move?.hitstun) || DEFAULT_HITSTUN);
}

/** Multiplicador de dano pelo tamanho do combo (comboCount = acertos já dados antes deste). */
export function comboScale(comboCount: number): number {
  return Math.max(COMBO_SCALE_FLOOR, 1 - Math.max(0, comboCount - 1) * COMBO_SCALE_STEP);
}

/** Dano final do golpe. defMult = defesa da forma de quem apanha (FORMS[form].def). */
export function hitDamage(rawDamage: number, defMult: number, comboCount: number, blocked: boolean): number {
  const scale = blocked ? CHIP_RATIO : comboScale(comboCount);
  return Math.round(rawDamage * defMult * scale);
}
