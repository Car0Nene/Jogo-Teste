import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Compass,
  Dumbbell,
  Gamepad2,
  Lock,
  Maximize2,
  Minimize2,
  Settings,
  Swords,
  Users,
  UserRound,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FIGHTER_LIST, FighterId } from '../../data/fighters';
import { STAGE_LIST, STAGES, StageId } from '../../data/stages';
import { soundEngine } from '../../engine/audio';
import { GameMode } from '../../engine/GameEngine';
import { TitleLockupSvg } from '../FighterBadgeSvg';

export type MainMenuAction =
  | { type: 'mode'; mode: GameMode }
  | { type: 'modesScreen' }
  | { type: 'storyUnavailable' }
  | { type: 'settings' }
  | { type: 'extras' };

interface MenuEntry {
  id: string;
  label: string;
  sublabel: string;
  available: boolean;
  icon: React.ReactNode;
  action: () => void;
}

interface MainMenuProps {
  stageId: StageId;
  onChangeStage: (id: StageId) => void;
  muted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onStartMode: (mode: GameMode) => void;
  onOpenModes: () => void;
  onOpenSettings: () => void;
  onOpenExtras: () => void;
  onOpenAccount: () => void;
}

export function MainMenu({
  stageId,
  onChangeStage,
  muted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  onStartMode,
  onOpenModes,
  onOpenSettings,
  onOpenExtras,
  onOpenAccount,
}: MainMenuProps) {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [featuredIdx, setFeaturedIdx] = useState(2); // Pedro featured initially
  const [unavailableToast, setUnavailableToast] = useState<string | null>(null);

  const stageSpec = STAGES[stageId];
  const featuredFighter = FIGHTER_LIST[featuredIdx % FIGHTER_LIST.length];

  // Rotate featured existing character portrait showcase smoothly
  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeaturedIdx((prev) => (prev + 1) % FIGHTER_LIST.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const menuEntries: MenuEntry[] = [
    {
      id: 'arcade',
      label: 'ARCADE',
      sublabel: '1P × CPU · Duelo clássico',
      available: true,
      icon: <Swords className="w-5 h-5" />,
      action: () => {
        soundEngine.playUi('select');
        onStartMode('cpu');
      },
    },
    {
      id: 'versus',
      label: 'VERSUS',
      sublabel: '1P × 2P Local · Arena direta',
      available: true,
      icon: <Users className="w-5 h-5" />,
      action: () => {
        soundEngine.playUi('select');
        onStartMode('versus');
      },
    },
    {
      id: 'story',
      label: 'STORY MODE',
      sublabel: 'INDISPONÍVEL · Em breve',
      available: false,
      icon: <Lock className="w-5 h-5" />,
      action: () => {
        soundEngine.playUi('hover');
        setUnavailableToast(
          'Story Mode ainda está em desenvolvimento e não está disponível nesta versão.'
        );
      },
    },
    {
      id: 'training',
      label: 'TRAINING',
      sublabel: 'Treino livre · Vida e barra contínuas',
      available: true,
      icon: <Dumbbell className="w-5 h-5" />,
      action: () => {
        soundEngine.playUi('select');
        onStartMode('training');
      },
    },
    {
      id: 'settings',
      label: 'SETTINGS',
      sublabel: 'Áudio, vídeo, tela e controles',
      available: true,
      icon: <Settings className="w-5 h-5" />,
      action: () => {
        soundEngine.playUi('confirm');
        onOpenSettings();
      },
    },
    {
      id: 'extras',
      label: 'EXTRAS',
      sublabel: 'Lutadores, Cão do Daniel e cenários',
      available: true,
      icon: <BookOpen className="w-5 h-5" />,
      action: () => {
        soundEngine.playUi('confirm');
        onOpenExtras();
      },
    },
  ];

  useEffect(() => {
    if (!unavailableToast) return;
    const t = window.setTimeout(() => setUnavailableToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [unavailableToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        soundEngine.playUi('hover');
        setFocusedIdx((i) => (i + 1) % menuEntries.length);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        soundEngine.playUi('hover');
        setFocusedIdx((i) => (i - 1 + menuEntries.length) % menuEntries.length);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        menuEntries[focusedIdx]?.action();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleSelectFeatured = (id: FighterId, index: number) => {
    soundEngine.playUi('hover');
    setFeaturedIdx(index);
    const clipMap: Record<FighterId, string> = {
      juraci: 'cozinha',
      carlos: 'pizzaAmor',
      pedro: 'combo',
      daniel: 'praia',
      franciely: 'isso',
      gabi: 'sing',
      paula: 'lunch',
      tainara: 'trabalho',
    };
    soundEngine.playClip(id, clipMap[id], 300, true);
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between pointer-events-none animate-screen-in">
      {/* Cinematic Directional Vignette & Lighting Scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#08060c]/92 via-[#08060c]/45 to-[#08060c]/85"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#08060c]/95 via-transparent to-[#08060c]/70"
      />

      {/* Top Command Utility Bar */}
      <header className="ff-menu-header relative z-10 flex items-center justify-between gap-4 px-5 py-4 md:px-10 md:py-6">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="border-l-2 border-amber-400 pl-3">
            <div className="text-[11px] font-mono-num tracking-[0.18em] text-amber-300 uppercase">
              ARENA EM DESTAQUE
            </div>
            <div className="text-sm font-semibold text-stone-100">
              {stageSpec.name} · {stageSpec.timeOfDay}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUi('confirm');
              onOpenModes();
            }}
            className="hidden sm:flex items-center gap-2 ml-3 px-4 py-2 min-h-[44px] bg-[#161220] hover:bg-[#221b30] border border-amber-400/40 text-xs font-bold tracking-wider uppercase text-amber-200 transition-colors cursor-pointer ff-chamfer-sm"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            Modos de Jogo
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onOpenAccount}
            className="h-11 px-3 bg-[#14101c] hover:bg-[#211b2d] border border-white/15 hover:border-amber-400/60 flex items-center justify-center gap-2 text-stone-100 text-[10px] sm:text-xs font-bold tracking-wide cursor-pointer ff-chamfer-sm"
          >
            <UserRound className="w-4 h-4 text-amber-300" />
            <span>MINHA CONTA</span>
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            className="w-11 h-11 bg-[#14101c] hover:bg-[#211b2d] border border-white/15 hover:border-amber-400/60 flex items-center justify-center text-stone-100 transition-colors cursor-pointer ff-chamfer-sm"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
            className="w-11 h-11 bg-[#14101c] hover:bg-[#211b2d] border border-white/15 hover:border-amber-400/60 flex items-center justify-center text-stone-100 transition-colors cursor-pointer ff-chamfer-sm"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Grid: Left AAA Command Rail | Right Featured Fighter Showcase */}
      <main className="ff-main-menu relative z-10 flex-1 flex items-center justify-between gap-6 px-5 md:px-10 py-2 overflow-y-auto md:overflow-visible">
        {/* Left Column: Logo + 6-Option Command Rail */}
        <div className="ff-menu-rail w-full max-w-[460px] flex flex-col gap-5 pointer-events-auto">
          <div className="ff-menu-logo max-w-[400px]">
            <TitleLockupSvg />
          </div>

          <nav aria-label="Menu Principal" className="ff-menu-nav flex flex-col gap-1.5">
            {menuEntries.map((entry, idx) => {
              const active = focusedIdx === idx;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onMouseEnter={() => {
                    if (focusedIdx !== idx) {
                      soundEngine.playUi('hover');
                      setFocusedIdx(idx);
                    }
                  }}
                  onFocus={() => setFocusedIdx(idx)}
                  onClick={entry.action}
                  className={`group relative flex items-center justify-between gap-3 px-4 py-2.5 min-h-[48px] border text-left transition-all duration-150 cursor-pointer ff-chamfer-sm ${
                    !entry.available
                      ? active
                        ? 'bg-[#1a1522]/90 border-stone-500/60 text-stone-300'
                        : 'bg-[#100d17]/85 border-white/10 text-stone-400'
                      : active
                      ? 'bg-gradient-to-r from-amber-400 via-amber-400 to-orange-500 border-amber-200 text-stone-950 translate-x-2 shadow-[0_6px_26px_rgba(251,191,36,0.35)]'
                      : 'bg-[#130f1c]/90 hover:bg-[#1c1629] border-white/15 text-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 flex items-center justify-center shrink-0 border ${
                        !entry.available
                          ? 'bg-stone-900 border-stone-700 text-stone-400'
                          : active
                          ? 'bg-stone-950/15 border-stone-950/25 text-stone-950'
                          : 'bg-[#1a1524] border-white/10 text-amber-400'
                      }`}
                    >
                      {entry.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-[11px] opacity-65">
                          0{idx + 1}
                        </span>
                        <span className="font-display font-extrabold text-xl md:text-2xl tracking-wide leading-none">
                          {entry.label}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          !entry.available
                            ? 'text-rose-300/90 font-semibold'
                            : active
                            ? 'text-stone-900 font-semibold'
                            : 'text-stone-400'
                        }`}
                      >
                        {entry.sublabel}
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      active ? 'translate-x-0.5 opacity-100' : 'opacity-30'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {unavailableToast && (
            <div
              role="status"
              className="px-4 py-2.5 bg-[#1b111a] border border-rose-500/50 text-rose-200 text-xs font-medium ff-chamfer-sm"
            >
              {unavailableToast}
            </div>
          )}
        </div>

        {/* Right Column: Existing Character Artwork Showcase Card */}
        <aside className="hidden lg:flex flex-col items-end gap-3 w-[340px] pointer-events-auto">
          <div className="w-full bg-[#110d19]/92 border border-white/15 p-4 ff-chamfer shadow-2xl">
            <div className="flex items-center justify-between text-[11px] font-mono-num text-amber-300 uppercase tracking-widest mb-2.5">
              <span>ELENCO ORIGINAL</span>
              <span>PODER {featuredFighter.powerLevel}</span>
            </div>

            <div className="relative w-full h-[210px] overflow-hidden border border-white/15 bg-[#09070e]">
              <img
                src={featuredFighter.portraitUrl}
                alt={featuredFighter.name}
                className="w-full h-full object-cover object-top transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09070e] via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3">
                <div className="font-display font-extrabold text-3xl text-white leading-none">
                  {featuredFighter.name}
                </div>
                <div className="text-xs text-amber-200/90 mt-0.5">
                  {featuredFighter.roleTitle}
                </div>
              </div>
            </div>

            <p className="text-xs italic text-stone-300 mt-2.5">
              {featuredFighter.quote}
            </p>

            {/* Quick portrait strip of all 8 original fighters */}
            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/10">
              {FIGHTER_LIST.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFeatured(f.id, i)}
                  title={f.name}
                  className={`relative h-12 overflow-hidden border transition-all cursor-pointer ${
                    featuredFighter.id === f.id
                      ? 'border-amber-400 scale-[1.03]'
                      : 'border-white/15 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={f.portraitUrl}
                    alt={f.name}
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Stage Preview Bar + Navigation Guide */}
      <footer className="ff-menu-footer relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-3.5 md:px-10 md:py-5 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-[#100d18]/92 border border-white/15 p-1.5 ff-chamfer-sm">
          {STAGE_LIST.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                soundEngine.playUi('hover');
                onChangeStage(st.id);
              }}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                stageId === st.id
                  ? 'bg-amber-400 text-stone-950 font-bold'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-300">
          <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>↑/↓ Navegar · Enter Confirmar · Suporte a Teclado, Mouse, Toque e Controle</span>
        </div>
      </footer>
    </div>
  );
}
