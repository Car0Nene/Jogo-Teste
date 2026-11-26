import React, { useState } from 'react';
import { RotateCcw, Settings2, X } from 'lucide-react';
import type { FighterId } from '../data/fighters';
import type { Player1KeyBindings } from '../data/settings';
import { buttonGlyph } from '../data/commands';
import type { PressAction, TrainingDummy, TrainingOptions, TrainingSnapshot } from '../engine/GameEngine';
import { MoveList, useGlyphPlatform } from './MoveList';

const DUMMY_LABEL: Record<TrainingDummy, string> = {
  stand: 'Parado em pé',
  crouch: 'Agachado',
  jump: 'Pulando',
  guard: 'Defende tudo',
  guardAfterHit: 'Defende após o 1º golpe',
  cpu: 'Luta (CPU)',
};

const signed = (n: number) => (n >= 99 ? 'Derruba' : n > 0 ? `+${n}` : String(n));
const advClass = (n: number) => (n >= 0 ? 'text-emerald-300' : n >= -5 ? 'text-amber-300' : 'text-rose-300');

/**
 * Modo treino: dados do último golpe (frames, dano, vantagem), combo, histórico de entradas
 * e as opções do boneco. Tudo vem do motor pelo HUD; nada aqui altera o combate diretamente.
 */
export function TrainingPanel({
  t,
  fighterId,
  keyBindings,
  compact,
  onOptions,
  onReset,
}: {
  t: TrainingSnapshot;
  fighterId: FighterId;
  keyBindings?: Player1KeyBindings;
  compact: boolean;
  onOptions: (o: Partial<TrainingOptions>) => void;
  onReset: (clearStats?: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [platformId] = useGlyphPlatform();
  const glyph = (b: PressAction) =>
    b === 'subSpecial' ? `↓+${buttonGlyph('special', platformId, keyBindings)}` : buttonGlyph(b, platformId, keyBindings);
  const o = t.options;

  return (
    <>
      <div className="ff-training-tools pointer-events-auto fixed z-30 flex gap-1.5" style={{ top: compact ? 72 : 118, right: 12 }}>
        <button
          type="button"
          onClick={() => onReset()}
          className="h-8 px-2.5 rounded-md bg-stone-950/85 border border-white/15 hover:border-amber-300/60 text-stone-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          aria-label="Reiniciar posição (R)"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {compact ? '' : 'Posição'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-8 px-2.5 rounded-md bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
          aria-label="Opções do treino"
        >
          <Settings2 className="w-3.5 h-3.5" /> Treino
        </button>
      </div>

      {o.showData && (
        <aside
          className="ff-training-data pointer-events-none fixed z-20 bg-stone-950/80 border border-white/10 rounded-lg p-2 text-[11px] text-stone-200 font-mono"
          style={{ top: compact ? 72 : 118, left: 12, width: compact ? 150 : 190 }}
          aria-label="Dados do treino"
        >
          <div className="text-amber-300 font-bold font-sans text-[10px] uppercase tracking-wider">Último golpe</div>
          {t.lastMove ? (
            <>
              <div className="font-sans text-white font-semibold truncate">{t.lastMove.name}</div>
              <div>Início {t.lastMove.startup}f · Ativo {t.lastMove.active}f</div>
              <div>Recup. {t.lastMove.recovery}f · Dano {t.lastMove.damage}</div>
            </>
          ) : (
            <div className="text-stone-500">—</div>
          )}
          {t.lastResult && (
            <div className="mt-0.5">
              {t.lastResult.kind === 'hit' ? 'Acertou' : 'Defendido'}{' '}
              <b className={advClass(t.lastResult.advantage)}>{signed(t.lastResult.advantage)}</b>
            </div>
          )}
          <div className="mt-1.5 text-amber-300 font-bold font-sans text-[10px] uppercase tracking-wider">Combo</div>
          <div>
            {t.combo.hits} hits · {t.combo.damage} dano
          </div>
          <div className="text-stone-400">
            Recorde {t.best.hits} hits · {t.best.damage}
          </div>
          {!compact && (
            <>
              <div className="mt-1.5 text-amber-300 font-bold font-sans text-[10px] uppercase tracking-wider">Entradas</div>
              <ol className="space-y-px" data-testid="training-inputs">
                {t.inputs.slice(0, 8).map((i, n) => (
                  <li key={i.id} className={n === 0 ? 'text-white' : 'text-stone-400'}>
                    <span className="inline-block w-4 text-center">{i.dir}</span> {glyph(i.button)}
                  </li>
                ))}
              </ol>
            </>
          )}
        </aside>
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3 pointer-events-auto" role="dialog" aria-label="Opções do treino">
          <div className="bg-[#100d18] border-2 border-amber-400/50 p-4 w-full max-w-2xl ff-chamfer max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-2xl text-white">Treino</h2>
              <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center text-stone-300 hover:text-white cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-[220px_1fr] gap-4 mt-2">
              <div className="space-y-3 text-sm text-stone-200">
                <fieldset>
                  <legend className="text-[11px] uppercase tracking-wider font-bold text-amber-300 mb-1">Boneco</legend>
                  <div className="grid gap-1">
                    {(Object.keys(DUMMY_LABEL) as TrainingDummy[]).map((d) => (
                      <label key={d} className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer ${o.dummy === d ? 'border-amber-300/70 bg-amber-400/10' : 'border-white/10'}`}>
                        <input type="radio" name="ff-dummy" checked={o.dummy === d} onChange={() => onOptions({ dummy: d })} />
                        {DUMMY_LABEL[d]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-1">
                  <legend className="text-[11px] uppercase tracking-wider font-bold text-amber-300 mb-1">Opções</legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={o.refill} onChange={(e) => onOptions({ refill: e.target.checked })} /> Recarregar vida após o combo
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={o.infiniteMeter} onChange={(e) => onOptions({ infiniteMeter: e.target.checked })} /> Barra de especial infinita
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={o.showData} onChange={(e) => onOptions({ showData: e.target.checked })} /> Mostrar dados e entradas
                  </label>
                </fieldset>
                <div className="grid gap-1.5">
                  <button type="button" onClick={() => { onReset(); setOpen(false); }} className="py-2 bg-[#1a1526] hover:bg-[#251e36] border border-white/10 text-stone-100 font-semibold text-sm cursor-pointer">
                    Reiniciar posição (R / L3)
                  </button>
                  <button type="button" onClick={() => onReset(true)} className="py-2 bg-[#14101d] hover:bg-[#20192e] border border-white/10 text-stone-300 text-xs font-semibold cursor-pointer">
                    Zerar desafios e recordes
                  </button>
                </div>
              </div>
              <MoveList fighterId={fighterId} keyBindings={keyBindings} done={t.done} compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
