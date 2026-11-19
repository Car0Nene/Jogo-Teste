import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FIGHTERS, FighterId } from './data/fighters';
import {
  formatKeyCode,
  GameSettings,
  loadSettings,
  saveSettings,
} from './data/settings';
import { STAGES, StageId } from './data/stages';
import { soundEngine } from './engine/audio';
import {
  CpuDifficulty,
  GameEngine,
  GameMode,
  HudSnapshot,
} from './engine/GameEngine';
import { FightHud } from './components/FightHud';
import { PROFILE_CONFIGS } from './platform/deviceProfile';
import { useDeviceProfile } from './platform/useDeviceProfile';
import { AmbientParticles } from './components/menu/AmbientParticles';
import { CharacterSelectScreen } from './components/menu/CharacterSelectScreen';
import { ExtrasScreen } from './components/menu/ExtrasScreen';
import { MainMenu } from './components/menu/MainMenu';
import { MatchIntroOverlay } from './components/menu/MatchIntroOverlay';
import { ModeSelectScreen } from './components/menu/ModeSelectScreen';
import { SettingsModal } from './components/menu/SettingsModal';
import { StageSelectScreen } from './components/menu/StageSelectScreen';
import { accountService } from './services/account';
import { AccountModal } from './components/AccountModal';

type AppScreen = 'title' | 'modes' | 'select' | 'stage' | 'vs' | 'fight' | 'extras';

/** Defaults for a player who never saved settings, chosen from the device class. */
function profileDefaults(): Partial<GameSettings> {
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return coarse ? { graphicsQuality: PROFILE_CONFIGS.mobile.defaultQuality } : {};
}

function isGameplayKey(code: string, kb: GameSettings['keyBindings']): boolean {
  return (
    Object.values(kb).includes(code) ||
    code === 'Space' ||
    code.startsWith('Arrow') ||
    code.startsWith('Numpad')
  );
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings(profileDefaults()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const recordedMatchRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [screen, setScreen] = useState<AppScreen>('title');
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('normal');
  const [p1Id, setP1Id] = useState<FighterId>('pedro');
  const [p2Id, setP2Id] = useState<FighterId>('paula');
  const [stageId, setStageId] = useState<StageId>('bar');
  const [showcaseOrbit, setShowcaseOrbit] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const platform = useDeviceProfile(settings.controlMode, (code) =>
    isGameplayKey(code, settingsRef.current.keyBindings),
  );

  const platformRef = useRef(platform);
  platformRef.current = platform;

  // Per-profile presentation: camera framing + pixel-ratio ceiling.
  useEffect(() => {
    engineRef.current?.setViewProfile(platform.config.camera, platform.config.maxPixelRatio);
  }, [platform.config]);

  useEffect(() => { void accountService.initialize(); }, []);

  // Sync persisted settings to soundEngine & GameEngine
  const applySettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    soundEngine.setVolumes({
      masterVolume: next.masterVolume,
      musicVolume: next.musicVolume,
      sfxVolume: next.sfxVolume,
      voiceVolume: next.voiceVolume,
      muted: next.muted,
    });
    engineRef.current?.applyGraphicsSettings(next.graphicsQuality, next.resolutionScale);
    engineRef.current?.setKeyBindings(next.keyBindings);
    engineRef.current?.setGamepadEnabled(next.gamepadEnabled);
  }, []);

  // Mount isolated Three.js canvas once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const engine = new GameEngine(el, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    const initial = loadSettings(profileDefaults());
    engine.setViewProfile(platformRef.current.config.camera, platformRef.current.config.maxPixelRatio);
    soundEngine.setVolumes({
      masterVolume: initial.masterVolume,
      musicVolume: initial.musicVolume,
      sfxVolume: initial.sfxVolume,
      voiceVolume: initial.voiceVolume,
      muted: initial.muted,
    });
    engine.applyGraphicsSettings(initial.graphicsQuality, initial.resolutionScale);
    engine.setKeyBindings(initial.keyBindings);
    engine.setGamepadEnabled(initial.gamepadEnabled);
    soundEngine.startMusic('theme', 1);

    return () => {
      soundEngine.stopAllVoices();
      soundEngine.stopMusic();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Track Fullscreen changes cleanly
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const root = containerRef.current ?? document.documentElement;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Sync stage, fighters & showcase orbit with 3D background engine
  useEffect(() => {
    engineRef.current?.setStage(stageId);
  }, [stageId]);

  useEffect(() => {
    engineRef.current?.setFighters(p1Id, p2Id);
  }, [p1Id, p2Id]);

  useEffect(() => {
    engineRef.current?.setShowcaseOrbit(showcaseOrbit);
  }, [showcaseOrbit]);

  const openTitle = useCallback(() => {
    setShowcaseOrbit(false);
    setPaused(false);
    setScreen('title');
    engineRef.current?.setScreenMode('title');
  }, []);

  const goToSelect = useCallback((mode: GameMode = 'cpu') => {
    setGameMode(mode);
    setShowcaseOrbit(false);
    setPaused(false);
    setScreen('select');
    engineRef.current?.setScreenMode('select');
  }, []);

  const goToStages = useCallback(() => {
    setShowcaseOrbit(false);
    setScreen('stage');
    engineRef.current?.setScreenMode('select');
  }, []);

  const launchMatchIntro = useCallback(() => {
    setShowcaseOrbit(false);
    setPaused(false);
    setScreen('vs');
  }, []);

  const beginFightEngine = useCallback(() => {
    recordedMatchRef.current = null;
    setShowcaseOrbit(false);
    setPaused(false);
    setScreen('fight');
    engineRef.current?.startMatch(p1Id, p2Id, stageId, gameMode, difficulty);
  }, [p1Id, p2Id, stageId, gameMode, difficulty]);

  useEffect(() => {
    if (screen !== 'fight' || gameMode !== 'cpu' || hud?.phase !== 'matchOver' || recordedMatchRef.current) return;
    recordedMatchRef.current = `${Date.now()}-${hud.p1.id}-${hud.winnerIndex}`;
    void accountService.recordMatch(hud.winnerIndex === 0 ? 'win' : hud.winnerIndex === 1 ? 'loss' : 'draw', hud.p1.id);
  }, [screen, gameMode, hud]);

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      engineRef.current?.setPaused(next);
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    applySettings({ ...settings, muted: !settings.muted });
  }, [settings, applySettings]);

  // Global Fight Pause key listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      if (screen === 'fight') {
        if (e.code === 'Escape' || (e.code === 'KeyP' && gameMode !== 'versus')) {
          e.preventDefault();
          togglePause();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, gameMode, settingsOpen, togglePause]);

  const p1Spec = FIGHTERS[p1Id];
  const p2Spec = FIGHTERS[p2Id];
  const stageSpec = STAGES[stageId];
  const kb = settings.keyBindings;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#09070e]">
      {/* Isolated 2.5D Three.js Stage + Fighters Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Atmospheric Ember Particles for Main Menu & Modes */}
      {(screen === 'title' || screen === 'modes') && (
        <AmbientParticles
          enabled={settings.graphicsQuality !== 'low'}
          accentColor={stageSpec.accentHex}
        />
      )}

      {/* MAIN MENU */}
      {screen === 'title' && !settingsOpen && (
        <MainMenu
          stageId={stageId}
          onChangeStage={setStageId}
          muted={settings.muted}
          onToggleMute={toggleMute}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onStartMode={goToSelect}
          onOpenModes={() => setScreen('modes')}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenExtras={() => setScreen('extras')}
          onOpenAccount={() => { setAccountOpen(true); void accountService.open(); }}
        />
      )}

      {/* GAME MODE SELECTION */}
      {screen === 'modes' && !settingsOpen && (
        <ModeSelectScreen
          onBack={openTitle}
          onSelectMode={goToSelect}
          onOpenExtras={() => setScreen('extras')}
        />
      )}

      {/* CHARACTER SELECTION */}
      {screen === 'select' && !settingsOpen && (
        <CharacterSelectScreen
          gameMode={gameMode}
          onChangeGameMode={setGameMode}
          difficulty={difficulty}
          onChangeDifficulty={setDifficulty}
          p1Id={p1Id}
          p2Id={p2Id}
          onSelectP1={setP1Id}
          onSelectP2={setP2Id}
          showcaseOrbit={showcaseOrbit}
          onToggleOrbit={() => setShowcaseOrbit((v) => !v)}
          muted={settings.muted}
          onToggleMute={toggleMute}
          onOpenSettings={() => setSettingsOpen(true)}
          onBack={openTitle}
          onProceedToStages={goToStages}
        />
      )}

      {/* STAGE SELECTION */}
      {screen === 'stage' && !settingsOpen && (
        <StageSelectScreen
          stageId={stageId}
          onSelectStage={setStageId}
          p1Id={p1Id}
          p2Id={p2Id}
          onBack={() => goToSelect(gameMode)}
          onStartMatch={launchMatchIntro}
        />
      )}

      {/* MATCH INTRODUCTION VS SPLASH */}
      {screen === 'vs' && (
        <MatchIntroOverlay
          p1Id={p1Id}
          p2Id={p2Id}
          stageId={stageId}
          gameMode={gameMode}
          onComplete={beginFightEngine}
        />
      )}

      {/* EXTRAS GALLERY */}
      {screen === 'extras' && !settingsOpen && (
        <ExtrasScreen onBack={openTitle} />
      )}

      {/* FIGHTING HUD */}
      {screen === 'fight' && hud && (
        <FightHud
          hud={hud}
          gameMode={gameMode}
          muted={settings.muted}
          hudScale={settings.hudScale}
          keyBindings={settings.keyBindings}
          profile={platform.profile}
          orientation={platform.orientation}
          scheme={platform.scheme}
          touchControls={settings.touchControls}
          onInsets={(top, bottom) => engineRef.current?.setViewInsets(top, bottom)}
          onToggleMute={toggleMute}
          onPause={togglePause}
          onSkipIntro={() => engineRef.current?.skipIntro()}
          onVirtualHold={(p, act, down) => engineRef.current?.triggerVirtualHold(p, act, down)}
          onVirtualPress={(p, act) => engineRef.current?.triggerVirtualPress(p, act)}
          onRematch={beginFightEngine}
          onBackToSelect={() => goToSelect(gameMode)}
        />
      )}

      {/* PAUSE MODAL */}
      {screen === 'fight' && paused && !settingsOpen && (
        <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4 animate-screen-in">
          <div className="bg-[#100d18] border-2 border-amber-400/50 p-6 max-w-md w-full shadow-2xl ff-chamfer">
            <h2 className="font-display font-extrabold text-4xl text-white text-center leading-none">
              JOGO PAUSADO
            </h2>
            <p className="text-xs text-stone-400 text-center mt-1">
              {p1Spec.name} vs {p2Spec.name} · {stageSpec.name}
            </p>

            <div className="mt-4 bg-[#171222] border border-white/10 p-3 text-xs text-stone-300 space-y-1.5">
              {platform.scheme === 'touch' ? (
                <div>
                  <strong className="text-amber-300">Toque:</strong> analógico à esquerda move, pula (↑) e agacha (↓) · botões à direita atacam, usam especial e defendem. Ajuste tamanho e posição em Configurações.
                </div>
              ) : (
              <div>
                <strong className="text-amber-300">1P:</strong> {formatKeyCode(kb.left)}/{formatKeyCode(kb.right)} Mover · {formatKeyCode(kb.up)}/Espaço Pular · {formatKeyCode(kb.down)} Agachar · {formatKeyCode(kb.light)} Leve · {formatKeyCode(kb.heavy)} Forte · {formatKeyCode(kb.special)} Especial · ↓+{formatKeyCode(kb.special)} Sub · {formatKeyCode(kb.guard)} Defesa
              </div>
              )}
              {gameMode === 'versus' && platform.scheme !== 'touch' && (
                <div>
                  <strong className="text-sky-300">2P:</strong> ←/→ Mover · ↑ Pular · ↓ Agachar · U/Num1 Leve · P/Num2 Forte · Num3 Especial · O/Num4 Defesa
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={togglePause}
                className="col-span-2 py-2.5 min-h-[44px] bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm cursor-pointer ff-chamfer-sm"
              >
                Continuar Luta
              </button>
              <button
                type="button"
                onClick={beginFightEngine}
                className="py-2.5 min-h-[42px] bg-[#1a1526] hover:bg-[#251e36] border border-white/10 text-stone-100 font-semibold text-sm cursor-pointer"
              >
                Reiniciar Round
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="py-2.5 min-h-[42px] bg-[#1a1526] hover:bg-[#251e36] border border-white/10 text-amber-300 font-semibold text-sm cursor-pointer"
              >
                Configurações
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  goToSelect(gameMode);
                }}
                className="py-2.5 min-h-[42px] bg-[#1a1526] hover:bg-[#251e36] border border-white/10 text-stone-100 font-semibold text-sm cursor-pointer"
              >
                Trocar Lutadores
              </button>
              <button
                type="button"
                onClick={openTitle}
                className="py-2.5 min-h-[42px] bg-[#14101d] hover:bg-[#20192e] border border-white/10 text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Menu Principal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdate={applySettings}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          detectedLabel={{ desktop: 'Computador', tablet: 'Tablet', mobile: 'Celular' }[platform.profile]}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
