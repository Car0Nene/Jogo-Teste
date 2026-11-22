import React, { useState } from 'react';
import { assetUrl } from '../../assetUrl';
import { ArrowLeft, Map, Shield, Sparkles, Swords, Volume2 } from 'lucide-react';
import { FIGHTERS, FIGHTER_LIST, FighterId } from '../../data/fighters';
import { STAGE_LIST } from '../../data/stages';
import { soundEngine } from '../../engine/audio';
import { AnimatedFighterCanvas, FighterPortrait } from '../FighterBadgeSvg';
import { SpecialSpritePreview } from './SpecialSpritePreview';

interface ExtrasScreenProps {
  onBack: () => void;
}

type ExtrasTab = 'fighters' | 'support' | 'stages';

const SAMPLE_CLIP: Record<FighterId, { key: string; label: string }> = {
  juraci: { key: 'cozinha', label: 'Ouvir Fala da Cozinha' },
  carlos: { key: 'pizzaAmor', label: 'Ouvir Pedido de Pizza' },
  pedro: { key: 'fumaBebe', label: 'Ouvir Bordão do Pedro' },
  daniel: { key: 'praia', label: 'Ouvir Partiu Praia' },
  franciely: { key: 'cuidar', label: 'Ouvir Cuidar e Lutar' },
  gabi: { key: 'amor', label: 'Ouvir Amor e Luta' },
  paula: { key: 'bar', label: 'Ouvir Bar da Simone' },
  tainara: { key: 'arroz', label: 'Ouvir Poder do Arroz' },
  davi: { key: 'videogame', label: 'Ouvir Vamos Jogar Videogame' },
};

export function ExtrasScreen({ onBack }: ExtrasScreenProps) {
  const [tab, setTab] = useState<ExtrasTab>('fighters');
  const [selectedId, setSelectedId] = useState<FighterId>('juraci');
  const fighter = FIGHTERS[selectedId];

  return (
    <div className="fixed inset-0 z-20 bg-[#09070e]/95 flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-y-auto animate-screen-in">
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
            Voltar
          </button>

          <div className="border-l-2 border-amber-400 pl-3">
            <div className="text-[10px] font-mono-num uppercase tracking-[0.2em] text-amber-300">
              ARQUIVO DA FAMÍLIA
            </div>
            <h1 className="font-display font-extrabold text-3xl text-white leading-none">
              EXTRAS & GALERIA
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#120e1b] border border-white/15 p-1 ff-chamfer-sm">
          {(
            [
              { id: 'fighters', label: 'Lutadores & Golpes', icon: <Swords className="w-4 h-4" /> },
              { id: 'support', label: 'Suporte (Cão do Daniel)', icon: <Shield className="w-4 h-4" /> },
              { id: 'stages', label: 'Cenários HD', icon: <Map className="w-4 h-4" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                soundEngine.playUi('hover');
                setTab(t.id);
              }}
              className={`px-3.5 py-2 min-h-[38px] text-xs font-bold uppercase flex items-center gap-2 transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-amber-400 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-[1280px] w-full mx-auto flex-1 py-6">
        {tab === 'fighters' && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {FIGHTER_LIST.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUi('hover');
                    setSelectedId(f.id);
                  }}
                  className={`flex items-center gap-3 p-2.5 border text-left transition-colors cursor-pointer ${
                    selectedId === f.id
                      ? 'bg-amber-400/15 border-amber-400 text-white'
                      : 'bg-[#120e1b] border-white/10 hover:border-white/30 text-stone-300'
                  }`}
                >
                  <FighterPortrait id={f.id} size="sm" />
                  <div className="min-w-0">
                    <div className="font-display font-extrabold text-lg leading-none">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-stone-400 truncate mt-0.5">{f.roleTitle}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-[#120e1b] border border-white/15 p-5 sm:p-6 ff-chamfer grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
              <div className="flex flex-col gap-3">
                <div className="h-[220px] border border-white/15 overflow-hidden bg-[#09070d]">
                  <img
                    src={fighter.portraitUrl}
                    alt={fighter.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="border border-white/10 bg-[#08060c] p-2">
                  <AnimatedFighterCanvas id={fighter.id} className="h-[115px]" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const clip = SAMPLE_CLIP[fighter.id];
                    soundEngine.playClip(fighter.id, clip.key, 150, true);
                  }}
                  className="px-4 py-2.5 min-h-[42px] bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  {SAMPLE_CLIP[fighter.id].label}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="font-mono-num text-xs text-amber-300 font-bold">
                    PODER {fighter.powerLevel} · {fighter.roleTitle}
                  </div>
                  <h2 className="font-display font-extrabold text-5xl text-white leading-none mt-1">
                    {fighter.name}
                  </h2>
                  <p className="text-sm italic text-amber-200 mt-1">{fighter.quote}</p>
                  <p className="text-sm text-stone-300 mt-2 leading-relaxed">{fighter.desc}</p>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <h3 className="text-xs font-mono-num uppercase tracking-widest text-stone-400">
                    LISTA DE GOLPES E ESPECIAIS
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0b0912] border border-white/10 p-3">
                      <div className="font-bold text-amber-300">Golpe Leve (J)</div>
                      <div className="text-stone-200 mt-0.5">{fighter.moves.light.label} · Dano {fighter.moves.light.damage}</div>
                    </div>
                    <div className="bg-[#0b0912] border border-white/10 p-3">
                      <div className="font-bold text-amber-300">Golpe Médio (Combo J→J)</div>
                      <div className="text-stone-200 mt-0.5">{fighter.moves.medium.label} · Dano {fighter.moves.medium.damage}</div>
                    </div>
                    <div className="bg-[#0b0912] border border-white/10 p-3">
                      <div className="font-bold text-amber-300">Golpe Forte (K)</div>
                      <div className="text-stone-200 mt-0.5">{fighter.moves.heavy.label} · Dano {fighter.moves.heavy.damage}</div>
                    </div>
                    <div className="bg-[#0b0912] border border-white/10 p-3">
                      <div className="font-bold text-amber-300">Golpe Aéreo (No ar + J/K)</div>
                      <div className="text-stone-200 mt-0.5">{fighter.moves.air.label} · Dano {fighter.moves.air.damage}</div>
                    </div>
                  </div>

                  <div className="bg-[#181224] border border-amber-400/35 p-3 text-xs">
                    <div className="font-bold text-amber-300">Especial (L · 100% Barra): {fighter.specialName}</div>
                    <div className="text-stone-200 mt-0.5">{fighter.specialSummary}</div>
                  </div>
                  <div className="bg-[#181224] border border-sky-400/35 p-3 text-xs">
                    <div className="font-bold text-sky-300">Sub-Especial (↓ + L · 50% Barra): {fighter.subSpecialName}</div>
                    <div className="text-stone-200 mt-0.5">{fighter.subSpecialSummary}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#120e1b] border-2 border-pink-400/50 p-5 ff-chamfer flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono-num uppercase tracking-wider text-pink-300 font-bold">
                  SUPORTE EXCLUSIVO · DANIEL
                </div>
                <h2 className="font-display font-extrabold text-3xl text-white mt-1">
                  CÃO DO DANIEL
                </h2>
                <div className="my-4 bg-[#09070e] border border-white/10 p-4 flex items-center justify-center gap-4">
                  <SpecialSpritePreview spriteId="dog_run" alt="Cão do Daniel correndo" className="w-28 h-24" />
                  <SpecialSpritePreview spriteId="dog_attack" alt="Cão do Daniel atacando" className="w-28 h-24" />
                </div>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Companheiro fiel que entra automaticamente em cena para proteger o Daniel e avançar sobre o adversário. É um personagem especial de suporte, não um lutador principal selecionável.
                </p>
              </div>
              <button
                type="button"
                onClick={() => soundEngine.playClip('cao', 'protect', 150, true)}
                className="mt-4 px-4 py-2.5 min-h-[42px] bg-pink-500 hover:bg-pink-400 text-stone-950 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                Ouvir Voz do Cão
              </button>
            </div>

            <div className="bg-[#120e1b] border border-white/15 p-5 ff-chamfer flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono-num uppercase tracking-wider text-amber-300 font-bold">
                  PARTICIPAÇÃO ESPECIAL · JURACI
                </div>
                <h2 className="font-display font-extrabold text-3xl text-white mt-1">
                  DADÁ DO RODO
                </h2>
                <div className="my-4 bg-[#09070e] border border-white/10 p-4 flex items-center justify-center">
                  <SpecialSpritePreview spriteId="dada" alt="Dadá" className="w-32 h-28" />
                </div>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Invocado pelo Sub-Especial da Juraci (“Chama o Dadá!”). Corre com seu rodo pela arena deixando o chão escorregadio!
                </p>
              </div>
              <button
                type="button"
                onClick={() => soundEngine.playClip('dada', 'reply', 150, true)}
                className="mt-4 px-4 py-2.5 min-h-[42px] bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                Ouvir Fala do Dadá
              </button>
            </div>

            <div className="bg-[#120e1b] border border-white/15 p-5 ff-chamfer flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono-num uppercase tracking-wider text-sky-300 font-bold">
                  PARTICIPAÇÃO ESPECIAL · TAINARA
                </div>
                <h2 className="font-display font-extrabold text-3xl text-white mt-1">
                  CRIANÇADA EM DOBRO
                </h2>
                <div className="my-4 bg-[#09070e] border border-white/10 p-4 flex items-center justify-center">
                  <SpecialSpritePreview spriteId="kid" alt="Criançada" className="w-32 h-28" />
                </div>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Ativado pelo Sub-Especial da Tainara (“Cuidado em Dobro”). Os pequenos invadem a arena derrubando o rival em velocidade máxima!
                </p>
              </div>
              <button
                type="button"
                onClick={() => soundEngine.playClip('tainara', 'cuidado', 150, true)}
                className="mt-4 px-4 py-2.5 min-h-[42px] bg-sky-400 hover:bg-sky-300 text-stone-950 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                Ouvir Fala da Tainara
              </button>
            </div>
          </div>
        )}

        {tab === 'stages' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAGE_LIST.map((st) => (
              <div
                key={st.id}
                className="bg-[#120e1b] border border-white/15 overflow-hidden ff-chamfer"
              >
                <div className="h-44 overflow-hidden">
                  <img
                    src={assetUrl(`/assets/stages/${st.id}.webp`)}
                    alt={st.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-[11px] font-mono-num uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {st.timeOfDay}
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-white mt-0.5">
                    {st.name}
                  </h3>
                  <p className="text-xs text-stone-300 mt-1">{st.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
