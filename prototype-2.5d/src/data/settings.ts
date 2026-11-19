import {
  ControlMode,
  DEFAULT_TOUCH_CONTROLS,
  sanitizeTouchControls,
  TouchControlSettings,
} from '../platform/deviceProfile';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ResolutionScale = 0.75 | 1 | 1.5;
export type HudScale = 0.9 | 1 | 1.1;

export interface Player1KeyBindings {
  left: string;
  right: string;
  up: string;
  down: string;
  guard: string;
  light: string;
  heavy: string;
  special: string;
}

export interface GameSettings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  voiceVolume: number; // 0..1
  muted: boolean;
  graphicsQuality: GraphicsQuality;
  resolutionScale: ResolutionScale;
  hudScale: HudScale;
  gamepadEnabled: boolean;
  keyBindings: Player1KeyBindings;
  /** 'auto' follows the detected device; otherwise forces touch or keyboard UI. */
  controlMode: ControlMode;
  touchControls: TouchControlSettings;
}

export const DEFAULT_KEY_BINDINGS: Player1KeyBindings = {
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyW',
  down: 'KeyS',
  guard: 'KeyI',
  light: 'KeyJ',
  heavy: 'KeyK',
  special: 'KeyL',
};

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.9,
  musicVolume: 0.75,
  sfxVolume: 0.85,
  voiceVolume: 0.95,
  muted: false,
  graphicsQuality: 'high',
  resolutionScale: 1,
  hudScale: 1,
  gamepadEnabled: true,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
  controlMode: 'auto',
  touchControls: { ...DEFAULT_TOUCH_CONTROLS },
};

const STORAGE_KEY = 'familia-fighter-settings-v1';

/** Defaults used until the player saves their own choice (e.g. per device profile). */
export function freshSettings(overrides: Partial<GameSettings> = {}): GameSettings {
  return {
    ...DEFAULT_SETTINGS,
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
    touchControls: { ...DEFAULT_TOUCH_CONTROLS },
    ...overrides,
  };
}

export function loadSettings(overrides: Partial<GameSettings> = {}): GameSettings {
  if (typeof window === 'undefined') return freshSettings(overrides);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSettings(overrides);
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      masterVolume: clamp01(parsed.masterVolume, DEFAULT_SETTINGS.masterVolume),
      musicVolume: clamp01(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
      voiceVolume: clamp01(parsed.voiceVolume, DEFAULT_SETTINGS.voiceVolume),
      muted: Boolean(parsed.muted),
      graphicsQuality:
        parsed.graphicsQuality === 'low' || parsed.graphicsQuality === 'medium' || parsed.graphicsQuality === 'high'
          ? parsed.graphicsQuality
          : overrides.graphicsQuality ?? DEFAULT_SETTINGS.graphicsQuality,
      resolutionScale:
        parsed.resolutionScale === 0.75 || parsed.resolutionScale === 1 || parsed.resolutionScale === 1.5
          ? parsed.resolutionScale
          : DEFAULT_SETTINGS.resolutionScale,
      hudScale:
        parsed.hudScale === 0.9 || parsed.hudScale === 1 || parsed.hudScale === 1.1
          ? parsed.hudScale
          : DEFAULT_SETTINGS.hudScale,
      gamepadEnabled: parsed.gamepadEnabled !== undefined ? Boolean(parsed.gamepadEnabled) : true,
      keyBindings: {
        ...DEFAULT_KEY_BINDINGS,
        ...(parsed.keyBindings || {}),
      },
      controlMode:
        parsed.controlMode === 'touch' || parsed.controlMode === 'keyboard' ? parsed.controlMode : 'auto',
      touchControls: sanitizeTouchControls(parsed.touchControls),
    };
  } catch {
    return freshSettings(overrides);
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

function clamp01(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}

export function formatKeyCode(code: string): string {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Espaço';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  return code;
}
