import React, { useEffect, useRef, useState } from 'react';
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
  const [phase, setPhase] = useState<'arena' | 'p1' | 'p2' | 'versus'>('arena');
  const p1 = FIGHTERS[p1Id];
  const p2 = FIGHTERS[p2Id];
  const stage = STAGES[stageId];

  // o pai pode recriar onComplete a cada render (placar online, ping…): os timers não podem reiniciar por isso
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;
  const finishedRef = useRef(false);
  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    doneRef.current();
  };

  useEffect(() => {
    soundEngine.playRoundBell();
    const p1Timer = window.setTimeout(() => setPhase('p1'), 360);
    const p2Timer = window.setTimeout(() => setPhase('p2'), 980);
    const versusTimer = window.setTimeout(() => setPhase('versus'), 1600);
    const timer = window.setTimeout(finish, 2500);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        window.clearTimeout(timer);
        window.clearTimeout(p1Timer);
        window.clearTimeout(p2Timer);
        window.clearTimeout(versusTimer);
        finish();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(p1Timer);
      window.clearTimeout(p2Timer);
      window.clearTimeout(versusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={finish}
      role="dialog"
      aria-label="Apresentação da luta"
      aria-live="polite"
      data-intro-phase={phase}
      className="ff-match-intro fixed inset-0 z-30 bg-[#07050b] flex flex-col justify-between overflow-hidden cursor-pointer animate-screen-in"
    >
      {/* Selected Stage Backdrop */}
      <img
        src={assetUrl(`/assets/stages/${stage.id}.webp`)}
        alt={stage.name}
        className="ff-intro-backdrop absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050b] via-[#07050b]/45 to-[#07050b]/85" />

      {/* Top Arena Banner */}
      <div className="ff-intro-heading relative z-10 text-center px-4">
        <div className="text-xs font-mono-num uppercase tracking-[0.26em] text-amber-300">
          {phase === 'arena' ? 'APRESENTANDO ARENA' : phase === 'versus' ? (gameMode === 'training' ? 'TREINO LIVRE' : gameMode === 'versus' ? 'VERSUS LOCAL' : gameMode === 'online' ? 'ONLINE CASUAL' : 'MODO ARCADE') : phase === 'p1' ? 'DESAFIANTE' : 'RIVAL'}
        </div>
        <div className="ff-intro-stage-title font-display font-extrabold text-3xl sm:text-4xl text-white mt-0.5">
          {stage.name.toUpperCase()} · {stage.timeOfDay.toUpperCase()}
        </div>
      </div>

      {/* P1 vs P2 Dramatic Portraits */}
      <div className="ff-intro-fighters relative z-10 max-w-[1160px] w-full mx-auto px-2 sm:px-8 my-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-6">
        {/* P1 Fighter Card */}
        <div className="ff-intro-card ff-intro-card-p1 bg-[#120e1b]/95 border-2 border-amber-400 p-2 sm:p-4 ff-chamfer shadow-2xl">
          <div className="ff-intro-portrait overflow-hidden border border-white/15 bg-[#09070d]">
            <img
              src={p1.portraitUrl}
              alt={p1.name}
              className="w-full h-full object-contain object-bottom"
            />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-mono-num font-bold text-amber-300">1P · DESAFIANTE</div>
              <div className="ff-intro-name font-display font-extrabold text-4xl text-white leading-none">
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
        <div className="ff-intro-vs flex flex-col items-center justify-center animate-vs-slash py-1">
          <div className="font-display font-extrabold italic text-6xl sm:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-rose-500 drop-shadow-[0_6px_22px_rgba(251,191,36,0.5)] leading-none select-none">
            VS
          </div>
        </div>

        {/* P2 Fighter Card */}
        <div className="ff-intro-card ff-intro-card-p2 bg-[#120e1b]/95 border-2 border-sky-400 p-2 sm:p-4 ff-chamfer shadow-2xl text-right">
          <div className="ff-intro-portrait overflow-hidden border border-white/15 bg-[#09070d]">
            <img
              src={p2.portraitUrl}
              alt={p2.name}
              className="w-full h-full object-contain object-bottom"
            />
          </div>
          <div className="mt-3 flex items-end justify-between flex-row-reverse">
            <div>
              <div className="text-[11px] font-mono-num font-bold text-sky-300">
                {gameMode === 'versus' || gameMode === 'online' ? '2P · RIVAL' : 'CPU · RIVAL'}
              </div>
              <div className="ff-intro-name font-display font-extrabold text-4xl text-white leading-none">
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
      <div className="relative z-10 text-center pb-3 px-4 text-xs text-stone-400">
        <span className="ff-intro-phase-label block mb-1">
          {phase === 'arena' ? stage.name : phase === 'p1' ? p1.name : phase === 'p2' ? p2.name : `${p1.name} VS ${p2.name}`}
        </span>
        Preparando arena · Pressione Enter, Espaço ou clique para avançar
      </div>
    </div>
  );
}
