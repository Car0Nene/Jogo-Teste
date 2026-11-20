import React, { useEffect, useState } from 'react';
import {
  Gamepad2,
  Keyboard,
  Maximize2,
  Minimize2,
  Monitor,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SETTINGS,
  formatKeyCode,
  GameSettings,
  GraphicsQuality,
  HudScale,
  Player1KeyBindings,
  ResolutionScale,
} from '../../data/settings';
import { soundEngine } from '../../engine/audio';
import { InterfaceSettings } from './InterfaceSettings';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

type TabId = 'audio' | 'display' | 'controls';

const KEY_LABELS: Array<{ key: keyof Player1KeyBindings; label: string }> = [
  { key: 'left', label: 'Mover Esquerda' },
  { key: 'right', label: 'Mover Direita' },
  { key: 'up', label: 'Pular' },
  { key: 'down', label: 'Agachar / Sub-Especial' },
  { key: 'guard', label: 'Defesa' },
  { key: 'light', label: 'Golpe Leve' },
  { key: 'heavy', label: 'Golpe Forte' },
  { key: 'special', label: 'Especial' },
];

export function SettingsModal({
  settings,
  onUpdate,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}: SettingsModalProps) {
  const [tab, setTab] = useState<TabId>('audio');
  const [rebindingKey, setRebindingKey] = useState<keyof Player1KeyBindings | null>(null);
  const [connectedPad, setConnectedPad] = useState<string | null>(null);

  // Poll connected gamepad info live when controls tab is open
  useEffect(() => {
    const checkPads = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) {
        setConnectedPad(null);
        return;
      }
      const gp = navigator.getGamepads()?.[0];
      setConnectedPad(gp && gp.connected ? gp.id : null);
    };
    checkPads();
    const id = window.setInterval(checkPads, 700);
    window.addEventListener('gamepadconnected', checkPads);
    window.addEventListener('gamepaddisconnected', checkPads);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('gamepadconnected', checkPads);
      window.removeEventListener('gamepaddisconnected', checkPads);
    };
  }, []);

  // Capture key press for remapping
  useEffect(() => {
    if (!rebindingKey) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setRebindingKey(null);
        return;
      }
      soundEngine.playUi('select');
      onUpdate({
        ...settings,
        keyBindings: {
          ...settings.keyBindings,
          [rebindingKey]: e.code,
        },
      });
      setRebindingKey(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [rebindingKey, settings, onUpdate]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !rebindingKey) {
        onClose();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose, rebindingKey]);

  const setVolume = (
    field: 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'voiceVolume',
    pct: number
  ) => {
    onUpdate({
      ...settings,
      [field]: Math.max(0, Math.min(1, pct / 100)),
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4 animate-screen-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações do Jogo"
        className="w-full max-w-[780px] max-h-[90vh] flex flex-col bg-[#100d18] border-2 border-amber-400/50 shadow-2xl ff-chamfer overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#171223] border-b border-white/10">
          <div>
            <div className="text-[10px] font-mono-num uppercase tracking-[0.22em] text-amber-300">
              FAMÍLIA FIGHTER
            </div>
            <h2 className="font-display font-extrabold text-3xl text-white leading-none">
              CONFIGURAÇÕES
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUi('hover');
              onClose();
            }}
            aria-label="Fechar configurações"
            className="w-10 h-10 bg-[#0d0a14] border border-white/15 hover:border-amber-400 flex items-center justify-center text-stone-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-[#0c0913] px-4 pt-2 gap-1">
          {(
            [
              { id: 'audio', label: 'Áudio', icon: <Volume2 className="w-4 h-4" /> },
              { id: 'display', label: 'Vídeo & Tela', icon: <Monitor className="w-4 h-4" /> },
              { id: 'controls', label: 'Controles', icon: <Gamepad2 className="w-4 h-4" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                soundEngine.playUi('hover');
                setTab(t.id);
              }}
              className={`px-4 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                tab === t.id
                  ? 'border-amber-400 text-amber-300 bg-[#151120]'
                  : 'border-transparent text-stone-400 hover:text-stone-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {tab === 'audio' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#161221] border border-white/10 p-4">
                <div>
                  <div className="text-sm font-bold text-white">Som Geral</div>
                  <div className="text-xs text-stone-400">
                    Silenciar música, efeitos e vozes instantaneamente
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ ...settings, muted: !settings.muted });
                  }}
                  className={`px-4 py-2 min-h-[42px] font-bold text-xs uppercase flex items-center gap-2 border cursor-pointer ${
                    settings.muted
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                      : 'bg-amber-400 border-amber-300 text-stone-950'
                  }`}
                >
                  {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {settings.muted ? 'Silenciado' : 'Ativo'}
                </button>
              </div>

              {(
                [
                  { id: 'masterVolume', label: 'Volume Master', val: settings.masterVolume },
                  { id: 'musicVolume', label: 'Volume da Música', val: settings.musicVolume },
                  { id: 'sfxVolume', label: 'Efeitos Sonoros (SFX)', val: settings.sfxVolume },
                  { id: 'voiceVolume', label: 'Vozes & Narrador', val: settings.voiceVolume },
                ] as const
              ).map((slider) => {
                const pct = Math.round(slider.val * 100);
                return (
                  <label key={slider.id} className="block bg-[#161221] border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-stone-100">{slider.label}</span>
                      <span className="font-mono-num text-sm font-bold text-amber-300">
                        {pct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) => setVolume(slider.id, Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </label>
                );
              })}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUi('confirm');
                    soundEngine.playAnnouncer('fight');
                  }}
                  className="px-4 py-2 min-h-[40px] bg-[#1b1628] hover:bg-[#272038] border border-white/15 text-xs font-bold uppercase text-amber-200 cursor-pointer"
                >
                  Testar Áudio do Narrador
                </button>
              </div>
            </div>
          )}

          {tab === 'display' && (
            <div className="space-y-4">
              {/* Fullscreen */}
              <div className="flex items-center justify-between bg-[#161221] border border-white/10 p-4">
                <div>
                  <div className="text-sm font-bold text-white">Tela Cheia</div>
                  <div className="text-xs text-stone-400">
                    Expandir o jogo para preencher toda a tela do monitor
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="px-4 py-2 min-h-[42px] bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  {isFullscreen ? 'Sair da Tela Cheia' : 'Ativar Tela Cheia'}
                </button>
              </div>

              {/* Graphics Quality */}
              <div className="bg-[#161221] border border-white/10 p-4">
                <div className="text-sm font-bold text-white">Qualidade Gráfica 2.5D</div>
                <div className="text-xs text-stone-400 mb-3">
                  Controla sombras em tempo real, partículas atmosféricas e nitidez de iluminação
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'low', label: 'Baixa' },
                      { id: 'medium', label: 'Média' },
                      { id: 'high', label: 'Alta' },
                    ] as Array<{ id: GraphicsQuality; label: string }>
                  ).map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUi('hover');
                        onUpdate({ ...settings, graphicsQuality: q.id });
                      }}
                      className={`py-2.5 min-h-[42px] text-xs font-extrabold uppercase border cursor-pointer ${
                        settings.graphicsQuality === q.id
                          ? 'bg-amber-400 text-stone-950 border-amber-300'
                          : 'bg-[#0e0b16] text-stone-300 border-white/15 hover:border-white/35'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Resolution Scale */}
              <div className="bg-[#161221] border border-white/10 p-4">
                <div className="text-sm font-bold text-white">Resolução de Renderização</div>
                <div className="text-xs text-stone-400 mb-3">
                  Ajuste a escala de pixels da arena 3D para desempenho ou nitidez máxima
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 0.75, label: '0.75× (Desempenho)' },
                      { id: 1, label: '1.0× (Nativa)' },
                      { id: 1.5, label: '1.5× (Alta Definição)' },
                    ] as Array<{ id: ResolutionScale; label: string }>
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUi('hover');
                        onUpdate({ ...settings, resolutionScale: r.id });
                      }}
                      className={`py-2.5 min-h-[42px] text-xs font-extrabold uppercase border cursor-pointer ${
                        settings.resolutionScale === r.id
                          ? 'bg-amber-400 text-stone-950 border-amber-300'
                          : 'bg-[#0e0b16] text-stone-300 border-white/15 hover:border-white/35'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* HUD Scale */}
              <div className="bg-[#161221] border border-white/10 p-4">
                <div className="text-sm font-bold text-white">Escala da Interface de Luta (HUD)</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {([0.9, 1, 1.1] as HudScale[]).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => {
                        soundEngine.playUi('hover');
                        onUpdate({ ...settings, hudScale: sc });
                      }}
                      className={`py-2 min-h-[40px] text-xs font-mono-num font-bold border cursor-pointer ${
                        settings.hudScale === sc
                          ? 'bg-amber-400 text-stone-950 border-amber-300'
                          : 'bg-[#0e0b16] text-stone-300 border-white/15'
                      }`}
                    >
                      {Math.round(sc * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'display' && (
            <div className="mt-5">
              <InterfaceSettings settings={settings} onUpdate={onUpdate} />
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-4">
              {/* Gamepad Detection */}
              <div className="bg-[#161221] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    Controle / Gamepad
                  </div>
                  <div className="text-xs text-stone-300 mt-1">
                    {connectedPad
                      ? `Conectado: ${connectedPad}`
                      : 'Nenhum controle detectado. Conecte via USB/Bluetooth e aperte um botão.'}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    Padrão: Analógico/D-Pad Mover · A/✕ Leve · X/□ Forte · Y/△ Especial · B/○ Pular · L1/R1 Defesa
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({ ...settings, gamepadEnabled: !settings.gamepadEnabled })
                  }
                  className={`px-4 py-2 min-h-[40px] text-xs font-bold uppercase border shrink-0 cursor-pointer ${
                    settings.gamepadEnabled
                      ? 'bg-amber-400 text-stone-950 border-amber-300'
                      : 'bg-[#0e0b16] text-stone-400 border-white/15'
                  }`}
                >
                  {settings.gamepadEnabled ? 'Gamepad Ativo' : 'Gamepad Desativado'}
                </button>
              </div>

              {/* P1 Keyboard Remapper */}
              <div className="bg-[#161221] border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-amber-400" />
                    Teclado · Jogador 1 (1P)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUi('confirm');
                      onUpdate({
                        ...settings,
                        keyBindings: { ...DEFAULT_KEY_BINDINGS },
                      });
                    }}
                    className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrão
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {KEY_LABELS.map((item) => {
                    const editing = rebindingKey === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setRebindingKey(item.key)}
                        className={`flex items-center justify-between px-3 py-2.5 min-h-[42px] border text-xs cursor-pointer ${
                          editing
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'bg-[#0e0b16] border-white/10 hover:border-white/30 text-stone-200'
                        }`}
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="font-mono-num font-bold px-2 py-0.5 bg-[#1b1628] border border-white/15 text-amber-300">
                          {editing ? 'Pressione uma tecla...' : formatKeyCode(settings.keyBindings[item.key])}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* P2 Reference */}
              <div className="bg-[#161221] border border-white/10 p-4 text-xs text-stone-300">
                <strong className="text-sky-300">Jogador 2 (Versus Local):</strong> ←/→ Mover · ↑ Pular · ↓ Agachar · U ou Num1 Leve · P ou Num2 Forte · Num3 ou / Especial · O ou Num4 Defesa
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#151120] border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUi('confirm');
              onUpdate({
                ...DEFAULT_SETTINGS,
                keyBindings: { ...DEFAULT_KEY_BINDINGS },
              });
            }}
            className="text-xs font-semibold text-stone-400 hover:text-stone-100 cursor-pointer"
          >
            Redefinir Tudo
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUi('select');
              onClose();
            }}
            className="px-6 py-2 min-h-[42px] bg-amber-400 hover:bg-amber-300 text-stone-950 font-display font-extrabold text-lg tracking-wider cursor-pointer ff-chamfer-sm"
          >
            SALVAR E FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}
