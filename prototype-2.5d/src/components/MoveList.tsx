import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { FighterId } from '../data/fighters';
import { FIGHTERS } from '../data/fighters';
import {
  commandListFor,
  commandText,
  detectPadFamily,
  GROUP_LABEL,
  type CommandEntry,
  type CommandGroup,
  type GlyphPlatform,
} from '../data/commands';
import type { Player1KeyBindings } from '../data/settings';
import { usePlatform } from '../platform/platform';

const PLATFORM_LABEL: Record<GlyphPlatform, string> = {
  keyboard: 'Teclado',
  xbox: 'Xbox',
  playstation: 'PlayStation',
  touch: 'Toque',
};

const LEVEL_LABEL: Record<CommandEntry['level'], string> = {
  mid: 'Médio',
  low: 'Baixo',
  air: 'Aéreo',
  unblockable: 'Sem defesa',
  none: '',
};

const signed = (n: number) => (n >= 99 ? 'Derruba' : n > 0 ? `+${n}` : String(n));
const advClass = (n: number) => (n >= 0 ? 'text-emerald-300' : n >= -5 ? 'text-amber-300' : 'text-rose-300');

/** Plataforma de ícones que combina com o que o jogador está usando agora. */
export function useGlyphPlatform(): [GlyphPlatform, (p: GlyphPlatform) => void] {
  const pf = usePlatform();
  const auto: GlyphPlatform = pf.inputMode === 'gamepad' ? detectPadFamily() : pf.inputMode === 'touch' ? 'touch' : 'keyboard';
  const [chosen, setChosen] = useState<GlyphPlatform | null>(null);
  return [chosen ?? auto, setChosen];
}

/**
 * Lista de Golpes: a mesma tabela que o motor usa para resolver os botões.
 * Mostra o comando nos ícones da plataforma escolhida, o nível de defesa e os dados de frame.
 */
export function MoveList({
  fighterId,
  keyBindings,
  done,
  compact = false,
}: {
  fighterId: FighterId;
  keyBindings?: Player1KeyBindings;
  /** comandos já feitos no treino (desafios) */
  done?: string[];
  compact?: boolean;
}) {
  const [platformId, setPlatformId] = useGlyphPlatform();
  const list = useMemo(() => commandListFor(fighterId), [fighterId]);
  const groups = useMemo(() => {
    const out = new Map<CommandGroup, CommandEntry[]>();
    for (const c of list) out.set(c.group, [...(out.get(c.group) ?? []), c]);
    return [...out.entries()];
  }, [list]);
  const doneSet = new Set(done ?? []);
  const trialTotal = list.length;
  const trialDone = list.filter((c) => doneSet.has(c.id)).length;

  return (
    <div className="ff-movelist text-left" data-fighter={fighterId}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-display font-extrabold text-white text-lg leading-none">
          Lista de Golpes · <span style={{ color: FIGHTERS[fighterId].accentHex }}>{FIGHTERS[fighterId].name}</span>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Ícones de">
          {(Object.keys(PLATFORM_LABEL) as GlyphPlatform[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === platformId}
              onClick={() => setPlatformId(p)}
              className={`px-2 py-1 text-[11px] font-semibold rounded border cursor-pointer ${p === platformId ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900 text-stone-300 border-white/10 hover:border-amber-300/50'}`}
            >
              {PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
      {done && (
        <div className="mt-2 text-xs text-stone-300">
          Desafios: <strong className="text-amber-300">{trialDone}/{trialTotal}</strong> — acerte cada golpe no boneco para marcar.
          <div className="h-1.5 mt-1 bg-stone-800 rounded overflow-hidden">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${(trialDone / trialTotal) * 100}%` }} />
          </div>
        </div>
      )}
      <div className={`mt-2 overflow-y-auto pr-1 space-y-3 ${compact ? 'max-h-[46vh]' : 'max-h-[52vh]'}`}>
        {groups.map(([g, items]) => (
          <section key={g}>
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-amber-300/90 mb-1">{GROUP_LABEL[g]}</h3>
            <ul className="space-y-1">
              {items.map((c) => (
                <li
                  key={c.id}
                  data-command={c.id}
                  className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-2 py-1.5 rounded border ${doneSet.has(c.id) ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/5 bg-white/[0.03]'}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white font-semibold flex items-center gap-1.5">
                      {doneSet.has(c.id) && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-label="feito" />}
                      <span className="truncate">{c.name}</span>
                      {c.meter > 0 && <span className="text-[10px] px-1 rounded bg-fuchsia-500/20 text-fuchsia-200">{c.meter}% barra</span>}
                      {LEVEL_LABEL[c.level] && <span className="text-[10px] px-1 rounded bg-sky-500/15 text-sky-200">{LEVEL_LABEL[c.level]}</span>}
                    </div>
                    {!compact && <div className="text-[11px] text-stone-400">{c.note}</div>}
                  </div>
                  <kbd className="self-center font-mono text-xs text-amber-200 bg-stone-950 border border-amber-300/30 rounded px-2 py-1 whitespace-nowrap">
                    {commandText(c, platformId, keyBindings)}
                  </kbd>
                  {c.frames && (
                    <div className="col-span-2 text-[10px] font-mono text-stone-400 flex gap-3 flex-wrap">
                      <span>Início {c.frames.startup}f</span>
                      <span>Ativo {c.frames.active}f</span>
                      <span>Recup. {c.frames.recovery}f</span>
                      <span>Dano {c.frames.damage}</span>
                      <span>
                        Defendido <b className={advClass(c.frames.onBlock)}>{signed(c.frames.onBlock)}</b>
                      </span>
                      <span>
                        Acerto <b className={advClass(c.frames.onHit)}>{signed(c.frames.onHit)}</b>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
