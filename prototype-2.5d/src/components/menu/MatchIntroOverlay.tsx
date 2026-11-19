import React, { useEffect } from 'react';
import { assetUrl } from '../../assetUrl';
import { FIGHTERS, FighterId } from '../../data/fighters';
import { STAGES, StageId } from '../../data/stages';
import { soundEngine } from '../../engine/audio';
import { GameMode } from '../../engine/GameEngine';

interface MatchIntroOverlayProps {
  p1Id: FighterId;
  p2Id: FighterId;
  stageId: StageId;
  gameMode: GameMode;
  onComplete: () => void;
}

export function MatchIntroOverlay({
  p1Id,
  p2Id,
  stageId,
  gameMode,
  onComplete,
}: MatchIntroOverlayProps) {
  const p1 = FIGHTERS[p1Id];
  const p2 = FIGHTERS[p2Id];
  const stage = STAGES[stageId];

  useEffect(() => {
    soundEngine.playRoundBell();
    const timer = window.setTimeout(() => {
      onComplete();
    }, 2100);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        window.clearTimeout(timer);
        onComplete();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onComplete]);

  return (
    <div
      onClick={onComplete}
      role="dialog"
      aria-label="Apresentação da luta"
      className="fixed inset-0 z-30 bg-[#07050b] flex flex-col justify-between overflow-hidden cursor-pointer animate-screen-in"
    >
      {/* Selected Stage Backdrop */}
      <img
        src={assetUrl(`/assets/stages/${stage.id}.webp`)}
        alt={stage.name}
        className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050b] via-[#07050b]/45 to-[#07050b]/85" />

      {/* Top Arena Banner */}
      <div className="relative z-10 text-center pt-6 px-4">
        <div className="text-xs font-mono-num uppercase tracking-[0.26em] text-amber-300">
          {gameMode === 'training' ? 'TREINO LIVRE' : gameMode === 'versus' ? 'VERSUS LOCAL' : 'MODO ARCADE'}
        </div>
        <div className="font-display font-extrabold text-3xl sm:text-4xl text-white mt-0.5">
          {stage.name.toUpperCase()} · {stage.timeOfDay.toUpperCase()}
        </div>
      </div>

      {/* P1 vs P2 Dramatic Portraits */}
      <div className="relative z-10 max-w-[1160px] w-full mx-auto px-4 sm:px-8 my-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
        {/* P1 Fighter Card */}
        <div className="bg-[#120e1b]/95 border-2 border-amber-400 p-3 sm:p-4 ff-chamfer shadow-2xl">
          <div className="h-[190px] sm:h-[250px] overflow-hidden border border-white/15 bg-[#09070d]">
            <img
              src={p1.portraitUrl}
              alt={p1.name}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-mono-num font-bold text-amber-300">1P · DESAFIANTE</div>
              <div className="font-display font-extrabold text-4xl text-white leading-none">
                {p1.name}
              </div>
              <div className="text-xs text-stone-300 mt-0.5">{p1.roleTitle}</div>
            </div>
            <div className="font-mono-num text-xs text-amber-200 font-bold">
              PODER {p1.powerLevel}
            </div>
          </div>
        </div>

        {/* Center VS Crest */}
        <div className="flex flex-col items-center justify-center animate-vs-slash py-1">
          <div className="font-display font-extrabold italic text-6xl sm:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-rose-500 drop-shadow-[0_6px_22px_rgba(251,191,36,0.5)] leading-none select-none">
            VS
          </div>
        </div>

        {/* P2 Fighter Card */}
        <div className="bg-[#120e1b]/95 border-2 border-sky-400 p-3 sm:p-4 ff-chamfer shadow-2xl text-right">
          <div className="h-[190px] sm:h-[250px] overflow-hidden border border-white/15 bg-[#09070d]">
            <img
              src={p2.portraitUrl}
              alt={p2.name}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="mt-3 flex items-end justify-between flex-row-reverse">
            <div>
              <div className="text-[11px] font-mono-num font-bold text-sky-300">
                {gameMode === 'versus' ? '2P · RIVAL' : 'CPU · RIVAL'}
              </div>
              <div className="font-display font-extrabold text-4xl text-white leading-none">
                {p2.name}
              </div>
              <div className="text-xs text-stone-300 mt-0.5">{p2.roleTitle}</div>
            </div>
            <div className="font-mono-num text-xs text-sky-200 font-bold">
              PODER {p2.powerLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Skip Hint */}
      <div className="relative z-10 text-center pb-5 px-4 text-xs text-stone-400">
        Preparando arena · Pressione Enter, Espaço ou clique para avançar
      </div>
    </div>
  );
}
