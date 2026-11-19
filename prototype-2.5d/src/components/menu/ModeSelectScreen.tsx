import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Dumbbell,
  Lock,
  Swords,
  Users,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { GameMode } from '../../engine/GameEngine';

interface ModeSelectScreenProps {
  onBack: () => void;
  onSelectMode: (mode: GameMode) => void;
  onOpenExtras: () => void;
}

export function ModeSelectScreen({
  onBack,
  onSelectMode,
  onOpenExtras,
}: ModeSelectScreenProps) {
  const [storyNotice, setStoryNotice] = React.useState(false);

  const cards = [
    {
      id: 'arcade',
      title: 'ARCADE',
      tag: '1P × CPU',
      accent: 'border-amber-400/50 hover:border-amber-400',
      badgeColor: 'text-amber-300',
      desc: 'Enfrente a família controlada pela CPU com 3 níveis de dificuldade e diálogos clássicos pré-luta.',
      cta: 'Escolher Lutadores',
      available: true,
      icon: <Swords className="w-7 h-7 text-amber-400" />,
      onClick: () => {
        soundEngine.playUi('select');
        onSelectMode('cpu');
      },
    },
    {
      id: 'versus',
      title: 'VERSUS',
      tag: '1P × 2P LOCAL',
      accent: 'border-sky-400/50 hover:border-sky-400',
      badgeColor: 'text-sky-300',
      desc: 'Duelo local frente a frente no mesmo teclado ou controle. Melhor de 3 rounds valendo o título da casa.',
      cta: 'Iniciar Duelo Local',
      available: true,
      icon: <Users className="w-7 h-7 text-sky-400" />,
      onClick: () => {
        soundEngine.playUi('select');
        onSelectMode('versus');
      },
    },
    {
      id: 'story',
      title: 'MODO HISTÓRIA',
      tag: 'EM BREVE · INDISPONÍVEL',
      accent: 'border-stone-600/50',
      badgeColor: 'text-rose-300',
      desc: 'Campanha narrativa por capítulos da família. Este modo ainda não foi implementado e permanece bloqueado.',
      cta: 'Indisponível no Momento',
      available: false,
      icon: <Lock className="w-7 h-7 text-stone-400" />,
      onClick: () => {
        soundEngine.playUi('hover');
        setStoryNotice(true);
      },
    },
    {
      id: 'training',
      title: 'TREINO',
      tag: 'PRÁTICA LIVRE',
      accent: 'border-emerald-400/50 hover:border-emerald-400',
      badgeColor: 'text-emerald-300',
      desc: 'Pratique combos, encadeamentos e especiais com regeneração contínua de energia e barra especial.',
      cta: 'Entrar no Treino',
      available: true,
      icon: <Dumbbell className="w-7 h-7 text-emerald-400" />,
      onClick: () => {
        soundEngine.playUi('select');
        onSelectMode('training');
      },
    },
    {
      id: 'extras',
      title: 'EXTRAS',
      tag: 'ENCICLOPÉDIA & GALERIA',
      accent: 'border-fuchsia-400/50 hover:border-fuchsia-400',
      badgeColor: 'text-fuchsia-300',
      desc: 'Veja lista de golpes, falas originais, os cenários em alta definição e o suporte exclusivo Cão do Daniel.',
      cta: 'Abrir Extras',
      available: true,
      icon: <BookOpen className="w-7 h-7 text-fuchsia-400" />,
      onClick: () => {
        soundEngine.playUi('confirm');
        onOpenExtras();
      },
    },
  ];

  return (
    <div className="ff-mode-select-screen fixed inset-0 z-20 bg-[#09070e]/92 flex flex-col justify-between gap-2 p-[clamp(8px,2vmin,32px)] overflow-hidden animate-screen-in">
      <header className="max-w-[1280px] w-full mx-auto flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            soundEngine.playUi('hover');
            onBack();
          }}
          className="px-4 py-2.5 min-h-[44px] bg-[#161221] hover:bg-[#221c33] border border-white/15 hover:border-amber-400/60 text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-2 cursor-pointer ff-chamfer-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Menu Principal
        </button>

        <div className="text-right">
          <div className="text-[11px] font-mono-num uppercase tracking-[0.2em] text-amber-300">
            FAMÍLIA FIGHTER
          </div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white leading-none">
            SELEÇÃO DE MODO DE JOGO
          </h1>
        </div>
      </header>

      <main className="max-w-[1280px] w-full flex-1 min-h-0 mx-auto flex flex-col justify-center py-1">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={c.onClick}
              className={`ff-mode-card group flex flex-col justify-between text-left p-3 sm:p-5 min-h-[clamp(128px,20dvh,210px)] bg-gradient-to-b from-[#171222] to-[#0f0c16] border transition-all duration-150 cursor-pointer ff-chamfer ${
                c.available
                  ? `${c.accent} hover:-translate-y-1 shadow-xl`
                  : `${c.accent} opacity-75`
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 bg-[#0b0911] border border-white/10 flex items-center justify-center">
                    {c.icon}
                  </div>
                  <span className={`font-mono-num text-[11px] font-bold tracking-wider ${c.badgeColor}`}>
                    {c.tag}
                  </span>
                </div>

                <h2 className="font-display font-extrabold text-xl sm:text-3xl text-white mt-2 sm:mt-4 leading-none">
                  {c.title}
                </h2>
                <p className="ff-mode-card-description text-xs sm:text-sm text-stone-300 mt-1 sm:mt-2 leading-snug sm:leading-relaxed">
                  {c.desc}
                </p>
              </div>

              <div
                className={`mt-5 pt-3 border-t border-white/10 text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
                  c.available ? 'text-amber-300 group-hover:text-amber-200' : 'text-stone-400'
                }`}
              >
                <span>{c.cta}</span>
                <span>{c.available ? '→' : 'BLOQUEADO'}</span>
              </div>
            </button>
          ))}
        </div>

        {storyNotice && (
          <div
            role="status"
            className="mt-4 px-4 py-3 bg-[#1c1118] border border-rose-500/45 text-rose-200 text-sm text-center ff-chamfer-sm"
          >
            O Modo História está marcado como indisponível nesta build. Escolha Arcade, Versus, Treino ou Extras.
          </div>
        )}
      </main>

      <footer className="max-w-[1280px] w-full mx-auto text-xs text-stone-400 text-center">
        Escolha um modo disponível para avançar à seleção de lutadores e cenários.
      </footer>
    </div>
  );
}
