import React from 'react';
import { Smartphone } from 'lucide-react';
import { GameSettings } from '../../data/settings';
import { soundEngine } from '../../engine/audio';
import { platform, PROFILES, UiOverride, usePlatform } from '../../platform/platform';

interface InterfaceSettingsProps {
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
}

const UI_OPTIONS: Array<{ id: UiOverride; label: string }> = [
  { id: 'auto', label: 'Automática' },
  { id: 'desktop', label: 'Computador' },
  { id: 'mobile', label: 'Celular' },
  { id: 'tablet', label: 'Tablet' },
];

/** Escolha manual do perfil (se a detecção errar) e ajustes dos controles de toque. */
export function InterfaceSettings({ settings, onUpdate }: InterfaceSettingsProps) {
  const pf = usePlatform();
  const detected = PROFILES[pf.deviceClass].label.toLowerCase();

  return (
    <div className="bg-[#161221] border border-white/10 p-4 space-y-4">
      <div>
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-400" />
          Interface do Jogo
        </div>
        <div className="text-xs text-stone-400 mt-0.5">
          Detectado: {detected}. Escolha manualmente se a interface não combinar com o seu aparelho.
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3" role="radiogroup" aria-label="Interface do jogo">
          {UI_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={pf.override === opt.id}
              onClick={() => {
                soundEngine.playUi('select');
                platform.setOverride(opt.id);
              }}
              className={`py-2 min-h-[44px] text-xs font-bold uppercase border cursor-pointer ${
                pf.override === opt.id
                  ? 'bg-amber-400 text-stone-950 border-amber-300'
                  : 'bg-[#0e0b16] text-stone-300 border-white/10 hover:border-white/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="text-sm font-bold text-white">Controles de Toque</div>
        <label className="flex items-center gap-3 text-xs text-stone-300 min-h-[44px]">
          <span className="w-20 shrink-0">Tamanho</span>
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.05}
            value={settings.touchScale}
            onChange={(e) => onUpdate({ ...settings, touchScale: Number(e.target.value) })}
            className="flex-1 accent-amber-400"
            aria-label="Tamanho dos controles de toque"
          />
          <span className="w-10 text-right font-mono-num text-amber-300">{Math.round(settings.touchScale * 100)}%</span>
        </label>
        <label className="flex items-center gap-3 text-xs text-stone-300 min-h-[44px]">
          <span className="w-20 shrink-0">Opacidade</span>
          <input
            type="range"
            min={0.35}
            max={1}
            step={0.05}
            value={settings.touchOpacity}
            onChange={(e) => onUpdate({ ...settings, touchOpacity: Number(e.target.value) })}
            className="flex-1 accent-amber-400"
            aria-label="Opacidade dos controles de toque"
          />
          <span className="w-10 text-right font-mono-num text-amber-300">{Math.round(settings.touchOpacity * 100)}%</span>
        </label>
        <label className="flex items-center gap-3 text-xs text-stone-200 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={settings.touchLefty}
            onChange={(e) => onUpdate({ ...settings, touchLefty: e.target.checked })}
            className="w-5 h-5 accent-amber-400"
          />
          Modo canhoto (botões à esquerda, analógico à direita)
        </label>
        <p className="text-[11px] text-stone-500">
          Os controles aparecem quando você joga por toque e somem ao usar teclado ou controle.
        </p>
      </div>
    </div>
  );
}
