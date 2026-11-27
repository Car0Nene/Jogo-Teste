/**
 * IA de luta do Família Fighter.
 *
 * A CPU joga pelo MESMO caminho de entrada do jogador: "segura" direções/defesa (holds) e "aperta"
 * botões (presses). Assim ela usa tudo o que existe no sistema de golpes — golpes baixos (↓+botão),
 * defesa agachada contra golpes baixos, sub-especial (↓+Especial), golpe cômico (Frente+Leve),
 * cadeias de combo (Leve → Leve → Forte) — sem regras especiais escondidas no motor.
 *
 * Camadas:
 *  1. Percepção com tempo de reação (fila de estímulos com atraso por dificuldade): a CPU só "vê"
 *     o golpe do jogador depois do tempo de reação, e pode errar a leitura alto/baixo.
 *  2. Defesa: defende em pé ou agachada, anti-aéreo, foge de projétil.
 *  3. Ataque: punição de golpe errado, combos, pokes baixos, especiais conforme distância e barra.
 *  4. Movimentação (footsies): cada personagem tem sua distância preferida e seu jeito.
 *  5. Adaptação: conta os hábitos do jogador (golpes baixos, pulos, especiais) e ajusta a defesa.
 *
 * Personalidade (AI_PROFILES): cada membro da família luta do seu jeito.
 */
import type { FighterId, FormId, MoveSpec } from '../../data/fighters';
import type { PressAction } from '../GameEngine';

export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type HoldAction = 'left' | 'right' | 'up' | 'down' | 'guard';

export interface AiProfile {
  /** apelido do estilo (debug/treino) */
  style: string;
  /** faixa de distância em que gosta de ficar */
  range: [number, number];
  /** 0..1: vontade de partir para cima */
  aggression: number;
  /** 0..1: chance de defender quando percebe um golpe */
  guard: number;
  /** 0..1: chance de ler certo um golpe baixo (antes da adaptação) */
  lowRead: number;
  /** 0..1: anti-aéreo contra pulo */
  antiAir: number;
  /** 0..1: chance de continuar a cadeia de combo quando o golpe conecta */
  combo: number;
  /** 0..1: preferência por golpes baixos quando ataca de perto */
  lows: number;
  /** 0..1: pulos de aproximação */
  jumpIn: number;
  /** 0..1: punição de golpe errado */
  punish: number;
  /** quando usar o especial cheio (100): 'far' = projétil de longe, 'near' = colado, 'buff' = transformação em qualquer distância segura */
  special: 'far' | 'near' | 'buff';
  /** idem para o sub-especial (50) */
  sub: 'far' | 'near' | 'buff' | 'mid';
  /** 0..1: provocações quando está seguro */
  taunt: number;
  /** 0..1: golpe cômico (Frente+Leve) */
  gag: number;
  /** traço de personalidade extra */
  trait?: 'lazy' | 'furyWhenHurt' | 'buffEarly';
}

export const AI_PROFILES: Record<FighterId, AiProfile> = {
  // Vó esperta: mantém distância, joga bolo, chama o Dadá quando chegam perto, defende bem.
  juraci: { style: 'Zoneadora da Padaria', range: [3.2, 5.6], aggression: 0.35, guard: 0.8, lowRead: 0.6, antiAir: 0.7, combo: 0.5, lows: 0.25, jumpIn: 0.05, punish: 0.6, special: 'far', sub: 'mid', taunt: 0.15, gag: 0.35 },
  // Rei do Combo: cola, encadeia tudo, vira Gordão de perto.
  carlos: { style: 'Rei do Combo', range: [1.1, 2.0], aggression: 0.85, guard: 0.55, lowRead: 0.45, antiAir: 0.45, combo: 0.9, lows: 0.35, jumpIn: 0.2, punish: 0.75, special: 'buff', sub: 'near', taunt: 0.1, gag: 0.3 },
  // Monstrão da resenha: brigão, golpe forte, fumaça de perto, defesa relaxada, provoca muito.
  pedro: { style: 'Brigão da Resenha', range: [1.3, 2.2], aggression: 0.75, guard: 0.42, lowRead: 0.35, antiAir: 0.5, combo: 0.6, lows: 0.2, jumpIn: 0.15, punish: 0.55, special: 'buff', sub: 'mid', taunt: 0.35, gag: 0.4 },
  // Agente praia: entra e sai, pula bastante, notas musicais de média/longe, arrancada para encurtar.
  daniel: { style: 'Bate e Volta', range: [2.4, 3.8], aggression: 0.6, guard: 0.55, lowRead: 0.5, antiAir: 0.4, combo: 0.6, lows: 0.3, jumpIn: 0.4, punish: 0.6, special: 'near', sub: 'far', taunt: 0.2, gag: 0.3 },
  // Força & Cuidado: contra-ataque — defende muito e pune; fica irritada (buff) quando apanha.
  franciely: { style: 'Contra-ataque', range: [1.8, 2.8], aggression: 0.4, guard: 0.85, lowRead: 0.7, antiAir: 0.75, combo: 0.7, lows: 0.3, jumpIn: 0.08, punish: 0.9, special: 'buff', sub: 'mid', taunt: 0.05, gag: 0.25, trait: 'furyWhenHurt' },
  // Estrela do Super L: média distância, L gigante de longe, canto varrendo, gosta de aparecer.
  gabi: { style: 'Estrela de Média Distância', range: [2.6, 4.4], aggression: 0.5, guard: 0.65, lowRead: 0.5, antiAir: 0.6, combo: 0.55, lows: 0.25, jumpIn: 0.15, punish: 0.6, special: 'far', sub: 'mid', taunt: 0.3, gag: 0.35 },
  // Dona da Espátula: rasteiras e pressão baixa, avalanche de comida de longe, fúria quando perde.
  paula: { style: 'Pressão Baixa', range: [1.4, 2.4], aggression: 0.65, guard: 0.6, lowRead: 0.55, antiAir: 0.5, combo: 0.65, lows: 0.6, jumpIn: 0.1, punish: 0.65, special: 'far', sub: 'buff', taunt: 0.15, gag: 0.3, trait: 'furyWhenHurt' },
  // Guardiã do Arroz: equilibrada e sólida, liga o poder cedo, solta os aliados de média distância.
  tainara: { style: 'Equilibrada', range: [1.8, 3.0], aggression: 0.55, guard: 0.72, lowRead: 0.6, antiAir: 0.6, combo: 0.7, lows: 0.35, jumpIn: 0.12, punish: 0.7, special: 'buff', sub: 'mid', taunt: 0.1, gag: 0.3, trait: 'buffEarly' },
  // Craque do videogame: ágil e imprevisível, pula muito… e às vezes bate a preguiça.
  davi: { style: 'Imprevisível (e com preguiça)', range: [1.6, 3.2], aggression: 0.7, guard: 0.5, lowRead: 0.45, antiAir: 0.5, combo: 0.75, lows: 0.3, jumpIn: 0.35, punish: 0.6, special: 'near', sub: 'buff', taunt: 0.1, gag: 0.3, trait: 'lazy' },
};

interface DifficultyTuning {
  /** tempo de reação (s) para perceber golpe/pulo */
  reaction: number;
  /** variação aleatória da reação */
  jitter: number;
  /** multiplica as chances de defesa/leitura/anti-aéreo/punição */
  skill: number;
  /** intervalo entre decisões de ataque/movimento */
  think: number;
  /** multiplica a agressividade */
  aggro: number;
}

const TUNING: Record<AiDifficulty, DifficultyTuning> = {
  easy: { reaction: 0.42, jitter: 0.18, skill: 0.45, think: 0.42, aggro: 0.6 },
  normal: { reaction: 0.26, jitter: 0.1, skill: 0.78, think: 0.24, aggro: 0.85 },
  hard: { reaction: 0.15, jitter: 0.05, skill: 1.0, think: 0.13, aggro: 1.0 },
};

export interface AiFighterView {
  id: FighterId;
  x: number;
  y: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  meter: number;
  form: FormId;
  state: string;
  move: MoveSpec | null;
  moveElapsed: number;
  moveHitConnected: boolean;
  noGuardTimer: number;
  /** tem golpe cômico próprio; true se é corpo a corpo (bundada/selfie) */
  gag: { melee: boolean } | null;
}

export interface AiWorld {
  me: AiFighterView;
  opp: AiFighterView;
  arenaHalfW: number;
  /** projétil do adversário vindo na minha direção: distância até mim (m) ou null */
  incomingProjectile: number | null;
}

export interface AiOutput {
  setHolds: (holds: ReadonlySet<HoldAction>) => void;
  press: (action: PressAction) => void;
}

type Stimulus =
  | { kind: 'attack'; at: number; low: boolean; reach: number }
  | { kind: 'jump'; at: number }
  | { kind: 'projectile'; at: number };

type Plan = 'neutral' | 'guardHigh' | 'guardLow' | 'antiAir' | 'retreat';

export class FighterAI {
  readonly profile: AiProfile;
  private tune: DifficultyTuning;
  private time = 0;
  private thinkTimer = 0.3;
  private queue: Stimulus[] = [];
  private plan: Plan = 'neutral';
  private planTimer = 0;
  private walk: -1 | 0 | 1 = 0;
  private wantCrouch = false;
  private comboStep = 0;
  private lazyTimer = 0;
  private lastOppState = '';
  private lastOppMove: MoveSpec | null = null;
  private wasAirborne = false;
  private lastMyState = '';
  private lastWasBlock = false;
  /** hábitos do jogador (adaptação) */
  private habits = { attacks: 0, lows: 0, jumps: 0, specials: 0 };
  private holds = new Set<HoldAction>();
  private lastHoldsKey = '';

  constructor(
    id: FighterId,
    difficulty: AiDifficulty,
    private rnd: () => number = Math.random
  ) {
    this.profile = AI_PROFILES[id];
    this.tune = TUNING[difficulty];
  }

  setDifficulty(d: AiDifficulty) {
    this.tune = TUNING[d];
  }

  /** novo round: esquece o plano, mantém o que aprendeu dos hábitos do jogador */
  resetRound() {
    this.queue = [];
    this.plan = 'neutral';
    this.planTimer = 0;
    this.walk = 0;
    this.wantCrouch = false;
    this.comboStep = 0;
    this.thinkTimer = 0.25;
    this.lastOppState = '';
    this.lastOppMove = null;
  }

  /** leitura de baixo ajustada pelo que o jogador costuma fazer */
  private lowReadChance(): number {
    const h = this.habits;
    const lowRatio = h.attacks >= 4 ? h.lows / h.attacks : 0.25;
    // se o jogador vive de rasteira, a CPU passa a esperar baixo
    return Math.min(0.97, (this.profile.lowRead + lowRatio * 0.6) * this.tune.skill);
  }

  private antiAirChance(): number {
    const jumpy = Math.min(1, this.habits.jumps / 8);
    return Math.min(0.95, (this.profile.antiAir + jumpy * 0.3) * this.tune.skill);
  }

  private chance(p: number) {
    return this.rnd() < p;
  }

  update(dt: number, w: AiWorld, out: AiOutput) {
    this.time += dt;
    const { me, opp } = w;
    const p = this.profile;
    const dist = Math.abs(opp.x - me.x);
    const toOpp: 1 | -1 = opp.x >= me.x ? 1 : -1;
    const busy = ['hitstun', 'blockstun', 'knockdown', 'transform', 'victory'].includes(me.state);

    this.observe(w, dist);

    // levantou do chão / saiu do atordoamento com o adversário perto: defende o "wake-up"
    const recovered = (this.lastMyState === 'knockdown' || this.lastMyState === 'hitstun' || this.lastMyState === 'blockstun') && !busy;
    if (me.state === 'blockstun') this.lastWasBlock = true;
    else if (me.state === 'hitstun' || me.state === 'knockdown') this.lastWasBlock = false;
    this.lastMyState = me.state;
    // defendeu e o golpe dele ainda está na recuperação: pune na hora (contra-ataque)
    const oppStuck = opp.state === 'attack' && opp.move && opp.moveElapsed > opp.move.startup + opp.move.active;
    if (recovered && this.lastWasBlock && oppStuck && dist <= 2.2 && this.chance(p.punish * this.tune.skill)) {
      this.plan = 'neutral';
      out.press('light');
    } else if (recovered && dist < 3 && this.plan === 'neutral' && this.chance(p.guard * this.tune.skill)) {
      const expectLow = opp.state === 'crouch' ? 0.85 : this.lowReadChance() * 0.7;
      this.setPlan(this.chance(expectLow) ? 'guardLow' : 'guardHigh', 0.35 + this.rnd() * 0.25);
    }

    // ---------- preguiça do Davi: às vezes para de lutar um instante ----------
    if (p.trait === 'lazy' && this.lazyTimer <= 0 && !busy && dist > 3 && this.chance(dt * 0.05)) this.lazyTimer = 0.9 + this.rnd() * 0.8;
    if (this.lazyTimer > 0) {
      this.lazyTimer -= dt;
      this.emitHolds(out, new Set());
      return;
    }

    // ---------- estímulos percebidos (depois do tempo de reação) ----------
    while (this.queue.length && this.queue[0].at <= this.time) {
      const s = this.queue.shift()!;
      if (busy) continue;
      if (s.kind === 'attack') {
        // o golpe ainda vai chegar até mim?
        if (dist > s.reach + 0.6) continue;
        if (this.chance(p.guard * this.tune.skill)) {
          const readLow = s.low ? this.chance(this.lowReadChance()) : this.chance(0.08); // pode errar a leitura
          this.setPlan(readLow ? 'guardLow' : 'guardHigh', 0.45);
        }
      } else if (s.kind === 'jump') {
        if (dist < 4.2 && me.state !== 'attack' && this.chance(this.antiAirChance())) this.setPlan('antiAir', 0.35);
        else if (dist < 3.2 && this.chance(p.guard * this.tune.skill * 0.7)) this.setPlan('guardHigh', 0.55);
      } else if (s.kind === 'projectile') {
        const r = this.rnd();
        if (r < 0.45 * this.tune.skill && me.y <= 0.02) out.press('jump');
        else if (r < 0.9) this.setPlan('guardHigh', 0.6);
      }
    }

    this.planTimer -= dt;
    if (this.planTimer <= 0 && this.plan !== 'neutral') this.plan = 'neutral';
    // golpe do adversário já acabou: não fica preso defendendo
    // adversário se afastou: larga a guarda
    if ((this.plan === 'guardHigh' || this.plan === 'guardLow') && dist > 3.4 && w.incomingProjectile === null) this.plan = 'neutral';
    // percebeu (com reação) um golpe baixo vindo enquanto defendia em pé: tenta agachar a tempo
    if (this.plan === 'guardHigh' && opp.state === 'attack' && opp.move?.low && this.queue.length === 0 && this.chance(this.lowReadChance() * 0.5 * dt * 10)) this.plan = 'guardLow';

    // ---------- defesa ativa ----------
    if (this.plan === 'guardHigh' || this.plan === 'guardLow') {
      const holds = new Set<HoldAction>(['guard']);
      if (this.plan === 'guardLow') holds.add('down');
      this.emitHolds(out, holds);
      return;
    }
    if (this.plan === 'antiAir') {
      this.emitHolds(out, new Set());
      if (opp.y > 0.5 && dist < 2.4 && me.state !== 'attack') {
        out.press('heavy');
        this.plan = 'neutral';
      }
      return;
    }

    // ---------- combo: o golpe conectou, continua a cadeia ----------
    if (me.state === 'attack' && me.move) {
      if (me.moveHitConnected && me.move.chainTo && this.comboStep < 3 && this.chance(p.combo * this.tune.skill)) {
        out.press(me.move.chainTo === 'medium' ? 'light' : 'heavy');
        this.comboStep++;
      }
      this.emitHolds(out, this.wantCrouch ? new Set<HoldAction>(['down']) : new Set());
      return;
    }
    if (!busy) this.comboStep = 0;

    // ---------- decisões (ritmo por dificuldade) ----------
    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0 && !busy) {
      this.thinkTimer = this.tune.think * (0.75 + this.rnd() * 0.5);
      this.decide(w, dist, toOpp, out);
    }

    // movimento contínuo
    const holds = new Set<HoldAction>();
    if (this.wantCrouch) holds.add('down');
    else if (this.walk !== 0) {
      const dir = this.walk === 1 ? toOpp : (-toOpp as 1 | -1);
      // não encosta na parede andando para trás
      const nearWall = Math.abs(me.x + dir * 0.6) > w.arenaHalfW - 0.4;
      if (!(this.walk === -1 && nearWall)) holds.add(dir === 1 ? 'right' : 'left');
    }
    this.emitHolds(out, holds);
  }

  /** registra o que o adversário começou a fazer, com atraso de reação */
  private observe(w: AiWorld, dist: number) {
    const { opp } = w;
    const react = () => this.time + this.tune.reaction + this.rnd() * this.tune.jitter;
    const startedAttack = opp.state === 'attack' && opp.move && (this.lastOppState !== 'attack' || opp.move !== this.lastOppMove);
    if (startedAttack && opp.move) {
      const m = opp.move;
      this.habits.attacks++;
      if (m.low) this.habits.lows++;
      if (m.id === 'special' || m.id === 'subSpecial') this.habits.specials++;
      // golpes rápidos chegam antes da reação: só defende se já estava defendendo
      if (dist < (m.range || 2) + 1.2) this.queue.push({ kind: 'attack', at: react(), low: Boolean(m.low), reach: m.range || 2 });
    }
    const airborne = opp.y > 0.15 && opp.vy > 0;
    if (airborne && !this.wasAirborne) {
      this.habits.jumps++;
      this.queue.push({ kind: 'jump', at: react() });
    }
    this.wasAirborne = opp.y > 0.05;
    if (w.incomingProjectile !== null && w.incomingProjectile < 5.5 && !this.queue.some((q) => q.kind === 'projectile')) {
      if (this.plan === 'neutral') this.queue.push({ kind: 'projectile', at: react() });
    }
    this.lastOppState = opp.state;
    this.lastOppMove = opp.move;
  }

  private setPlan(plan: Plan, dur: number) {
    this.plan = plan;
    this.planTimer = dur;
    this.walk = 0;
    this.wantCrouch = false;
  }

  private decide(w: AiWorld, dist: number, toOpp: 1 | -1, out: AiOutput) {
    const { me, opp } = w;
    const p = this.profile;
    const t = this.tune;
    const aggr = p.aggression * t.aggro;
    const hpRatio = me.hp / me.maxHp;
    const losing = me.hp < opp.hp - 120;
    this.wantCrouch = false;

    // 1) punição: o adversário errou e está em recuperação
    const oppRecovering =
      opp.state === 'attack' && opp.move && !opp.moveHitConnected && opp.moveElapsed > opp.move.startup + opp.move.active;
    if (oppRecovering && dist <= 2.3 && this.chance(p.punish * t.skill)) {
      out.press(this.chance(0.5) ? 'heavy' : 'light');
      return;
    }

    // 2) transformações / buffs (Carlos, Pedro, Franciely, Tainara, Paula sub, Davi sub)
    const buffSpecial = p.special === 'buff' && me.meter >= 100 && me.form === 'normal';
    const buffSub = p.sub === 'buff' && me.meter >= 50 && me.form === 'normal';
    const buffWanted =
      p.trait === 'furyWhenHurt' ? hpRatio < 0.55 || losing : p.trait === 'buffEarly' ? true : dist > 2.2 || this.chance(0.4);
    if ((buffSpecial || buffSub) && buffWanted && dist > 1.6 && opp.state !== 'attack' && this.chance(0.55 * t.skill + 0.2)) {
      out.press(buffSpecial ? 'special' : 'subSpecial');
      return;
    }

    // 3) especial cheio
    if (me.meter >= 100 && p.special !== 'buff') {
      const ok = p.special === 'far' ? dist > 3.0 : dist < 2.6;
      if (ok && this.chance(aggr * 0.65)) {
        out.press('special');
        return;
      }
    }
    // 4) sub-especial
    if (me.meter >= 50 && p.sub !== 'buff') {
      const ok = p.sub === 'far' ? dist > 3.0 : p.sub === 'near' ? dist < 2.0 : dist > 1.6 && dist < 4.8;
      if (ok && this.chance(aggr * 0.35)) {
        out.press('subSpecial');
        return;
      }
    }

    // 5) golpe cômico (Frente + Leve): se aproxima segurando frente e aperta leve
    if (me.gag && this.chance(p.gag * 0.12 * t.aggro)) {
      const inRange = me.gag.melee ? dist <= 2.3 : dist > 2.4 && dist < 7.2;
      if (inRange) {
        this.emitHolds(out, new Set<HoldAction>([toOpp === 1 ? 'right' : 'left']));
        out.press('light');
        return;
      }
    }

    // 5b) encurralado na parede com o adversário em cima: pula por cima ou empurra com golpe
    const cornered = Math.abs(me.x) > w.arenaHalfW - 0.9 && Math.sign(me.x) === -toOpp;
    if (cornered && dist < 2.6 && opp.state !== 'attack') {
      if (me.y <= 0.02 && this.chance(0.35 * t.skill)) {
        this.walk = 1;
        out.press('jump');
        return;
      }
      if (this.chance(0.4 * t.skill)) {
        out.press('light');
        return;
      }
    }

    // 6) perto: ataca (alto, baixo ou combo) ou se protege
    if (dist <= 2.1) {
      if (this.chance(aggr)) {
        const goLow = this.chance(p.lows);
        if (goLow) {
          // ↓ + botão: precisa estar segurando baixo no instante do aperto
          this.wantCrouch = true;
          this.emitHolds(out, new Set<HoldAction>(['down']));
          out.press(this.chance(0.55) ? 'light' : 'heavy');
        } else {
          out.press(this.chance(p.combo) ? 'light' : 'heavy');
        }
        this.walk = 0;
        return;
      }
      // sob pressão: defesa antecipada (golpes rápidos não dão tempo de reagir — no jogo de luta
      // se defende ANTES). Agachada se espera golpe baixo: adversário agachado ou com hábito de rasteira.
      if (this.chance(p.guard * t.skill)) {
        const expectLow = opp.state === 'crouch' ? 0.85 : this.lowReadChance() * 0.75;
        this.setPlan(this.chance(expectLow) ? 'guardLow' : 'guardHigh', 0.3 + this.rnd() * 0.3);
        return;
      }
      if (dist < p.range[0]) this.walk = -1;
      else this.walk = 0;
      return;
    }

    // 7) pulo de aproximação
    if (dist > 2.4 && dist < 4.2 && me.y <= 0.02 && this.chance(p.jumpIn * aggr * 0.5)) {
      this.walk = 1;
      out.press('jump');
      // golpe aéreo perto do pico
      return;
    }

    // 8) footsies: busca a distância preferida
    const [lo, hi] = p.range;
    if (dist > hi) this.walk = this.chance(Math.max(0.35, aggr)) ? 1 : 0;
    else if (dist < lo) this.walk = -1;
    else this.walk = this.chance(aggr * 0.5) ? 1 : this.chance(0.25) ? -1 : 0;

    // 9) provocação quando está longe e seguro
    if (dist > 4.5 && opp.state !== 'attack' && this.chance(p.taunt * 0.15)) out.press('taunt');
  }

  /** golpe aéreo: chamado pelo motor a cada quadro em que a CPU está no ar */
  airAttack(w: AiWorld, out: AiOutput) {
    const dist = Math.abs(w.opp.x - w.me.x);
    if (w.me.state !== 'attack' && w.me.vy < 2 && dist < 2.0 && this.chance(0.35)) out.press('light');
  }

  private emitHolds(out: AiOutput, holds: Set<HoldAction>) {
    const key = [...holds].sort().join(',');
    if (key === this.lastHoldsKey) return;
    this.lastHoldsKey = key;
    this.holds = holds;
    out.setHolds(holds);
  }

  /** debug/treino */
  getDebug() {
    return {
      plan: this.plan,
      walk: this.walk,
      crouch: this.wantCrouch,
      habits: { ...this.habits },
      style: this.profile.style,
      lowRead: this.lowReadChance(),
      baseLowRead: this.profile.lowRead * this.tune.skill,
    };
  }
}
