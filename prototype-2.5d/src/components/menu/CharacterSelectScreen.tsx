import React, { useEffect, useState } from 'react';
import { assetUrl } from '../../assetUrl';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCw,
  Settings,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FIGHTERS, FIGHTER_LIST, FighterId } from '../../data/fighters';
import { STAGE_LIST } from '../../data/stages';
import { castKey, hasClip, soundEngine } from '../../engine/audio';
import { CpuDifficulty, GameMode } from '../../engine/GameEngine';
import { AnimatedFighterCanvas, FighterPortrait } from '../FighterBadgeSvg';
import { SpecialSpritePreview } from './SpecialSpritePreview';

interface CharacterSelectScreenProps {
  gameMode: GameMode;
  onChangeGameMode: (mode: GameMode) => void;
  difficulty: CpuDifficulty;
  onChangeDifficulty: (d: CpuDifficulty) => void;
  p1Id: FighterId;
  p2Id: FighterId;
  onSelectP1: (id: FighterId) => void;
  onSelectP2: (id: FighterId) => void;
  showcaseOrbit: boolean;
  onToggleOrbit: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onBack: () => void;
  onProceedToStages: () => void;
}

/** Fala de seleção: a original de cada um (as gravações da família) tem prioridade. */
const VOICE_SELECT_CLIP: Record<FighterId, string> = {
  juraci: 'cozinha',
  carlos: 'pizzaAmor',
  pedro: 'fumaBebe',
  daniel: 'praia',
  franciely: 'cuidar',
  gabi: 'amor',
  paula: 'lunch',
  tainara: 'arroz',
  davi: 'videogame',
};
const selectClip = (id: FighterId) => (hasClip(id, VOICE_SELECT_CLIP[id]) ? VOICE_SELECT_CLIP[id] : castKey('select'));

export function CharacterSelectScreen({
  gameMode,
  onChangeGameMode,
  difficulty,
  onChangeDifficulty,
  p1Id,
  p2Id,
  onSelectP1,
  onSelectP2,
  showcaseOrbit,
  onToggleOrbit,
  muted,
  onToggleMute,
  onOpenSettings,
  onBack,
  onProceedToStages,
}: CharacterSelectScreenProps) {
  const [pickSlot, setPickSlot] = useState<'p1' | 'p2'>('p1');
  const [p1Locked, setP1Locked] = useState(false);
  const [p2Locked, setP2Locked] = useState(false);

  const p1Spec = FIGHTERS[p1Id];
  const p2Spec = FIGHTERS[p2Id];
  const showDanielDog = p1Id === 'daniel' || p2Id === 'daniel';

  const handlePick = (id: FighterId, autoConfirm = false) => {
    soundEngine.playUi(autoConfirm ? 'select' : 'hover');
    if (pickSlot === 'p1') {
      onSelectP1(id);
      if (autoConfirm) {
        setP1Locked(true);
        soundEngine.playClip(id, selectClip(id), 250, true);
        setPickSlot('p2');
      }
    } else {
      onSelectP2(id);
      if (autoConfirm) {
        setP2Locked(true);
        soundEngine.playClip(id, selectClip(id), 250, true);
      }
    }
  };

  const confirmActiveSlot = () => {
    const activeId = pickSlot === 'p1' ? p1Id : p2Id;
    soundEngine.playUi('select');
    soundEngine.playClip(activeId, selectClip(activeId), 250, true);
    if (pickSlot === 'p1') {
      setP1Locked(true);
      setPickSlot('p2');
    } else {
      setP2Locked(true);
      onProceedToStages();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onBack();
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const cur = pickSlot === 'p1' ? p1Id : p2Id;
        const idx = FIGHTER_LIST.findIndex((f) => f.id === cur);
        const step = e.code === 'ArrowRight' ? 1 : -1;
        const next = FIGHTER_LIST[(idx + step + FIGHTER_LIST.length) % FIGHTER_LIST.length].id;
        handlePick(next, false);
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (p1Locked && p2Locked) {
          onProceedToStages();
        } else {
          confirmActiveSlot();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Preload stage thumbnails gently when hovering near advance
  useEffect(() => {
    for (const st of STAGE_LIST) {
      const img = new Image();
      img.src = assetUrl(`/assets/stages/${st.id}.webp`);
    }
  }, []);

  return (
    <div className="ff-character-select-screen ff-select-arcade fixed inset-0 z-10 flex flex-col justify-between gap-2 overflow-hidden overscroll-none p-[clamp(6px,1.1vmin,16px)] pointer-events-none animate-screen-in">
      {/* Top Header Strip */}
      <header className="ff-character-select-header flex flex-wrap items-center justify-between gap-2 pointer-events-auto shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUi('hover');
              onBack();
            }}
            className="px-3.5 py-2 min-h-[44px] bg-[#120e1b]/95 hover:bg-[#1e172c] border border-white/15 hover:border-amber-400/60 text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-1.5 cursor-pointer ff-chamfer-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="hidden sm:block border-l-2 border-amber-400 pl-3">
            <div className="text-[10px] font-mono-num uppercase tracking-[0.2em] text-amber-300">
              PASSO 1 DE 2
            </div>
            <h1 className="font-display font-extrabold text-2xl text-white leading-none">
              ESCOLHA OS LUTADORES
            </h1>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#100d18]/95 border border-white/15 p-1 ff-chamfer-sm">
          {(['cpu', 'versus', 'training'] as GameMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                soundEngine.playUi('hover');
                onChangeGameMode(m);
              }}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-bold uppercase tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
                gameMode === m
                  ? 'bg-amber-400 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {m === 'cpu' ? 'Arcade' : m === 'versus' ? '1P × 2P' : 'Treino'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleOrbit}
            className={`px-3 py-2 min-h-[44px] border text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer ff-chamfer-sm ${
              showcaseOrbit
                ? 'bg-amber-400 text-stone-950 border-amber-300'
                : 'bg-[#120e1b]/95 text-stone-100 border-white/15 hover:border-amber-400/60'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Girar 3D</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Configurações"
            className="w-11 h-11 bg-[#120e1b]/95 border border-white/15 hover:border-amber-400/60 flex items-center justify-center text-stone-100 cursor-pointer ff-chamfer-sm"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
            className="w-11 h-11 bg-[#120e1b]/95 border border-white/15 hover:border-amber-400/60 flex items-center justify-center text-stone-100 cursor-pointer ff-chamfer-sm"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Fighter portraits frame the centered arcade-style roster. */}
      <div className="ff-character-panels flex-1 min-h-0 grid items-center justify-items-center gap-2 sm:gap-4 pointer-events-none">
        {/* P1 PANEL */}
        <section
          aria-label="Lutador Jogador 1"
          onClick={() => {
            setPickSlot('p1');
            setP1Locked(false);
          }}
          className={`ff-character-panel ff-character-panel-p1 relative isolate pointer-events-auto w-full max-w-[320px] min-w-0 overflow-visible bg-[#0e0b16]/75 border-2 p-2 sm:p-3 transition-all cursor-pointer shadow-2xl ${
            pickSlot === 'p1'
              ? 'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.22)]'
              : 'border-white/15 hover:border-white/35'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono-num font-bold">
            <span className="text-amber-300">1P · JOGADOR</span>
            <span className="text-stone-300">PODER {p1Spec.powerLevel}</span>
          </div>

          <div className="ff-character-portrait relative overflow-visible bg-transparent">
            <img
              src={p1Spec.portraitUrl}
              alt={p1Spec.name}
              className="w-full h-full object-contain object-bottom drop-shadow-[0_12px_20px_rgba(0,0,0,0.65)]"
            />
            {p1Spec.alternatePortraitUrl && (
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-amber-300/50 bg-stone-950/85 p-1 pr-2 shadow-lg">
                <img
                  src={p1Spec.alternatePortraitUrl}
                  alt={`${p1Spec.name} ${p1Spec.alternatePortraitLabel ?? 'visual alternativo'}`}
                  className="h-10 w-8 rounded-sm object-cover object-top"
                />
                <span className="text-[9px] font-extrabold tracking-wide text-amber-200">
                  {p1Spec.alternatePortraitLabel}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09070d] via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-end justify-between">
              <div>
                <h2 className="font-display font-extrabold text-3xl text-white leading-none">
                  {p1Spec.name}
                </h2>
                <div className="text-[11px] text-amber-200/90">{p1Spec.roleTitle}</div>
              </div>
              {p1Locked && (
                <span className="animate-confirm-stamp bg-amber-400 text-stone-950 text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3 h-3" /> Pronto
                </span>
              )}
            </div>
          </div>

          <div className="ff-character-canvas-wrap mt-1.5 border border-white/10 bg-[#08060c] overflow-hidden">
            <AnimatedFighterCanvas id={p1Spec.id} className="ff-character-animated" />
          </div>

          <p className="ff-character-quote text-[11px] italic text-amber-200/90 mt-1 truncate">{p1Spec.quote}</p>
          <div className="ff-character-specials mt-1 pt-1 border-t border-white/10 space-y-0.5 text-[11px] text-stone-300">
            <div className="truncate">
              <strong className="text-amber-300">L ·</strong> {p1Spec.specialName}
            </div>
            <div className="truncate">
              <strong className="text-amber-300">↓+L ·</strong> {p1Spec.subSpecialName}
            </div>
          </div>
        </section>

          <section className="ff-character-roster pointer-events-auto" aria-label="Escolha seu lutador">
            <div className="ff-character-roster-heading">
              <span className="ff-character-roster-rule" />
              <span>SELECIONE SEU LUTADOR</span>
              <span className="ff-character-roster-rule" />
            </div>
            <div className="ff-character-roster-grid">
              {FIGHTER_LIST.map((f) => {
                const isP1 = p1Id === f.id;
                const isP2 = p2Id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    data-fighter={f.id}
                    onClick={() => handlePick(f.id, true)}
                    aria-label={`Selecionar ${f.name}`}
                    aria-pressed={(pickSlot === 'p1' && isP1) || (pickSlot === 'p2' && isP2)}
                    className={`ff-character-roster-card ${
                      isP1 && isP2 ? 'is-p1 is-p2' : isP1 ? 'is-p1' : isP2 ? 'is-p2' : ''
                    }`}
                  >
                    {isP1 && <span className="ff-roster-cursor ff-roster-cursor-p1">1P</span>}
                    {isP2 && (
                      <span className="ff-roster-cursor ff-roster-cursor-p2">
                        {gameMode === 'versus' ? '2P' : 'CPU'}
                      </span>
                    )}
                    <FighterPortrait id={f.id} size="md" className="ff-roster-portrait" />
                    <span className="ff-character-roster-name">{f.name}</span>
                  </button>
                );
              })}
              {/* moldura em cruz (estilo arcade): casas vazias decorativas em volta do elenco */}
              {Array.from({ length: 12 }, (_, i) => (
                <span key={`e${i}`} className="ff-roster-empty" aria-hidden />
              ))}
            </div>
            <div className="ff-character-versus" aria-label={`${p1Spec.name} contra ${p2Spec.name}`}>
              <span>{p1Spec.name}</span>
              <strong>VS</strong>
              <span>{p2Spec.name}</span>
            </div>
            {showDanielDog && (
              <div className="ff-character-support" aria-label="Suporte do Daniel">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <img src={assetUrl('/assets/sprites/doguinho.webp')} alt="Doguinho, o cão do Daniel" className="h-9 w-auto shrink-0 object-contain" />
                <span>O Doguinho, cão do Daniel, ajuda na luta</span>
              </div>
            )}
          </section>

        {/* P2 / CPU PANEL */}
        <section
          aria-label="Lutador Rival"
          onClick={() => {
            setPickSlot('p2');
            setP2Locked(false);
          }}
          className={`ff-character-panel ff-character-panel-p2 relative isolate pointer-events-auto w-full max-w-[320px] min-w-0 overflow-visible bg-[#0e0b16]/75 border-2 p-2 sm:p-3 text-right transition-all cursor-pointer shadow-2xl ${
            pickSlot === 'p2'
              ? 'border-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.22)]'
              : 'border-white/15 hover:border-white/35'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono-num font-bold">
            <span className="text-stone-300">PODER {p2Spec.powerLevel}</span>
            <span className="text-sky-300">
              {gameMode === 'versus' ? '2P · RIVAL' : 'CPU · RIVAL'}
            </span>
          </div>

          <div className="ff-character-portrait relative overflow-visible bg-transparent">
            <img
              src={p2Spec.portraitUrl}
              alt={p2Spec.name}
              className="w-full h-full object-contain object-bottom drop-shadow-[0_12px_20px_rgba(0,0,0,0.65)]"
            />
            {p2Spec.alternatePortraitUrl && (
              <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-amber-300/50 bg-stone-950/85 p-1 pr-2 shadow-lg">
                <img
                  src={p2Spec.alternatePortraitUrl}
                  alt={`${p2Spec.name} ${p2Spec.alternatePortraitLabel ?? 'visual alternativo'}`}
                  className="h-10 w-8 rounded-sm object-cover object-top"
                />
                <span className="text-[9px] font-extrabold tracking-wide text-amber-200">
                  {p2Spec.alternatePortraitLabel}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09070d] via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-end justify-between flex-row-reverse">
              <div className="text-right">
                <h2 className="font-display font-extrabold text-3xl text-white leading-none">
                  {p2Spec.name}
                </h2>
                <div className="text-[11px] text-sky-200/90">{p2Spec.roleTitle}</div>
              </div>
              {p2Locked && (
                <span className="animate-confirm-stamp bg-sky-400 text-stone-950 text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3 h-3" /> Pronto
                </span>
              )}
            </div>
          </div>

          <div className="ff-character-canvas-wrap mt-1.5 border border-white/10 bg-[#08060c] overflow-hidden">
            <AnimatedFighterCanvas id={p2Spec.id} mirror className="ff-character-animated" />
          </div>

          <p className="ff-character-quote text-[11px] italic text-sky-200/90 mt-1 truncate">{p2Spec.quote}</p>
          <div className="ff-character-specials mt-1 pt-1 border-t border-white/10 space-y-0.5 text-[11px] text-stone-300">
            <div className="truncate">
              {p2Spec.specialName} <strong className="text-sky-300">· L</strong>
            </div>
            <div className="truncate">
              {p2Spec.subSpecialName} <strong className="text-sky-300">· ↓+L</strong>
            </div>
          </div>
        </section>
      </div>

      {/* Compact controls and proceed action */}
      <div className="ff-character-dock flex flex-col items-center pointer-events-auto shrink-0">
        <div className="w-full max-w-[1060px] bg-[#0d0a15]/95 border border-white/15 p-2 sm:p-3 shadow-2xl ff-chamfer flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Active Slot Cursor Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUi('hover');
                    setPickSlot('p1');
                    setP1Locked(false);
                  }}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-extrabold uppercase tracking-wide border cursor-pointer ${
                    pickSlot === 'p1'
                      ? 'bg-amber-400 text-stone-950 border-amber-300'
                      : 'bg-[#171222] text-stone-300 border-white/10'
                  }`}
                >
                  Cursor 1P {p1Locked ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUi('hover');
                    setPickSlot('p2');
                    setP2Locked(false);
                  }}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-extrabold uppercase tracking-wide border cursor-pointer ${
                    pickSlot === 'p2'
                      ? 'bg-sky-400 text-stone-950 border-sky-300'
                      : 'bg-[#171222] text-stone-300 border-white/10'
                  }`}
                >
                  Cursor {gameMode === 'versus' ? '2P' : 'CPU'} {p2Locked ? '✓' : ''}
                </button>
              </div>

              {/* CPU Difficulty */}
              {gameMode === 'cpu' && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-stone-400 font-semibold mr-1">CPU:</span>
                  {(['easy', 'normal', 'hard'] as CpuDifficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        soundEngine.playUi('hover');
                        onChangeDifficulty(d);
                      }}
                      className={`px-2.5 py-1 min-h-[32px] font-bold uppercase cursor-pointer ${
                        difficulty === d
                          ? 'bg-stone-100 text-stone-950'
                          : 'bg-[#171222] text-stone-300 hover:text-white'
                      }`}
                    >
                      {d === 'easy' ? 'Fácil' : d === 'normal' ? 'Normal' : 'Difícil'}
                    </button>
                  ))}
                </div>
              )}

              {/* Daniel Dog Support Quick Info (mobile/tablet) */}
              {showDanielDog && (
                <div className="xl:hidden text-[11px] font-semibold text-pink-300">
                  Suporte ativo: Cão do Daniel
                </div>
              )}
            </div>

            {/* Footer Action Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="text-xs text-stone-400">
                Clique em um lutador para confirmar o cursor atual ou use ←/→ e Enter.
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUi('select');
                  onProceedToStages();
                }}
                className="px-7 py-2.5 min-h-[46px] bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-display font-extrabold text-xl tracking-wider shadow-[0_6px_22px_rgba(251,191,36,0.35)] transition-transform active:scale-95 cursor-pointer flex items-center gap-2 ml-auto ff-chamfer-sm"
              >
                ESCOLHER CENÁRIO
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
