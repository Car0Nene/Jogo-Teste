import React, { useEffect } from 'react';
import { assetUrl } from '../../assetUrl';
import { ArrowLeft, Music, Sparkles, Swords } from 'lucide-react';
import { FIGHTERS, FighterId } from '../../data/fighters';
import { STAGE_LIST, STAGES, StageId } from '../../data/stages';
import { soundEngine, STAGE_MUSIC } from '../../engine/audio';
import { FighterPortrait } from '../FighterBadgeSvg';

interface StageSelectScreenProps {
  stageId: StageId;
  onSelectStage: (id: StageId) => void;
  p1Id: FighterId;
  p2Id: FighterId;
  onBack: () => void;
  onStartMatch: () => void;
}

const TRACK_LABELS: Record<string, string> = {
  theme: 'Bolo da Juraci (Tema Família)',
  ff2: 'Família Fighter 2 (Batida Noturna)',
  ff3: 'Família Fighter 3 (Clima Tropical)',
};

export function StageSelectScreen({
  stageId,
  onSelectStage,
  p1Id,
  p2Id,
  onBack,
  onStartMatch,
}: StageSelectScreenProps) {
  const stage = STAGES[stageId];
  const p1 = FIGHTERS[p1Id];
  const p2 = FIGHTERS[p2Id];
  const trackName = TRACK_LABELS[STAGE_MUSIC[stageId]] ?? 'Tema Original';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const idx = STAGE_LIST.findIndex((s) => s.id === stageId);
        const step = e.code === 'ArrowRight' ? 1 : -1;
        const next = STAGE_LIST[(idx + step + STAGE_LIST.length) % STAGE_LIST.length].id;
        soundEngine.playUi('hover');
        onSelectStage(next);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundEngine.playUi('select');
        onStartMatch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="fixed inset-0 z-20 bg-[#09070e]/92 flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-y-auto animate-screen-in">
      {/* Header */}
      <header className="max-w-[1280px] w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUi('hover');
              onBack();
            }}
            className="px-4 py-2.5 min-h-[44px] bg-[#161221] hover:bg-[#221c33] border border-white/15 hover:border-amber-400/60 text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-2 cursor-pointer ff-chamfer-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Trocar Lutadores
          </button>

          <div className="border-l-2 border-amber-400 pl-3">
            <div className="text-[10px] font-mono-num uppercase tracking-[0.2em] text-amber-300">
              PASSO 2 DE 2
            </div>
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white leading-none">
              SELEÇÃO DE CENÁRIO
            </h1>
          </div>
        </div>

        {/* Selected Matchup Reminder */}
        <div className="flex items-center gap-3 bg-[#130f1d] border border-white/15 px-3.5 py-2 ff-chamfer-sm">
          <div className="flex items-center gap-2">
            <FighterPortrait id={p1.id} size="sm" />
            <span className="font-display font-extrabold text-lg text-amber-300">{p1.name}</span>
          </div>
          <span className="font-display font-extrabold italic text-stone-400 text-base">VS</span>
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-lg text-sky-300">{p2.name}</span>
            <FighterPortrait id={p2.id} size="sm" />
          </div>
        </div>
      </header>

      {/* Main Stage Spotlight (KOF XV style large preview + stage cards) */}
      <main className="max-w-[1280px] w-full mx-auto my-auto py-4 flex flex-col gap-4">
        <div className="relative w-full h-[270px] sm:h-[340px] md:h-[380px] overflow-hidden border-2 border-amber-400/60 bg-[#0b0912] shadow-2xl ff-chamfer">
          <img
            src={assetUrl(`/assets/stages/${stage.id}.webp`)}
            alt={stage.name}
            className="w-full h-full object-cover object-center transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08060d] via-[#08060d]/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08060d]/85 via-transparent to-transparent" />

          {/* Spotlight Info */}
          <div className="absolute bottom-5 left-5 right-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-num uppercase tracking-[0.18em] text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{stage.timeOfDay}</span>
                {(stage.id === 'bar' || stage.id === 'praia') && (
                  <span className="text-stone-200">· ARENA PRINCIPAL</span>
                )}
              </div>
              <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-white leading-none mt-1">
                {stage.name.toUpperCase()}
              </h2>
              <p className="text-sm sm:text-base text-stone-200 mt-1.5 max-w-xl">
                {stage.subtitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-stone-300 mt-2">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span>Trilha: {trackName}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUi('select');
                onStartMatch();
              }}
              className="px-8 py-3.5 min-h-[52px] bg-gradient-to-r from-amber-400 via-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-display font-extrabold text-2xl tracking-wider shadow-[0_8px_28px_rgba(251,191,36,0.4)] transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 shrink-0 ff-chamfer-sm"
            >
              <Swords className="w-6 h-6" />
              INICIAR COMBATE
            </button>
          </div>
        </div>

        {/* 5-Stage Selection Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {STAGE_LIST.map((st) => {
            const active = st.id === stageId;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  soundEngine.playUi('hover');
                  onSelectStage(st.id);
                }}
                className={`group relative overflow-hidden border-2 text-left transition-all cursor-pointer ff-chamfer-sm ${
                  active
                    ? 'border-amber-400 -translate-y-1 shadow-[0_6px_22px_rgba(251,191,36,0.28)]'
                    : 'border-white/15 hover:border-white/40 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="h-24 sm:h-28 overflow-hidden bg-stone-900">
                  <img
                    src={assetUrl(`/assets/stages/${st.id}.webp`)}
                    alt={st.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div
                  className={`p-2.5 ${
                    active ? 'bg-amber-400 text-stone-950' : 'bg-[#120e1b] text-stone-100'
                  }`}
                >
                  <div className="font-display font-extrabold text-base leading-none truncate">
                    {st.name}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      active ? 'text-stone-900 font-semibold' : 'text-stone-400'
                    }`}
                  >
                    {st.timeOfDay}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="max-w-[1280px] w-full mx-auto text-xs text-stone-400 flex items-center justify-between">
        <span>←/→ Alternar cenário · Enter Iniciar Combate</span>
        <span>Todos os 5 cenários integrados em 2.5D</span>
      </footer>
    </div>
  );
}
