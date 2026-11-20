// Família Fighter — plataforma: detecção do aparelho e perfis de apresentação.
//
// Duas perguntas separadas:
//   1) QUE APARELHO É ESTE? (classe estável: desktop | mobile | tablet)
//      Decidida pelas capacidades reais (ponteiro, hover, toque, sistema), nunca
//      pela largura da janela. Notebook pequeno continua desktop; celular ligado a
//      um monitor continua mobile.
//   2) COMO ESTÁ JOGANDO AGORA? (entrada ativa: keyboard | touch | gamepad)
//      Muda com o uso, com histerese para não alternar à toa.
//
// Os perfis só descrevem APRESENTAÇÃO (câmera, HUD, controles e qualidade). O combate
// (GameEngine: física, hitboxes, dano, IA) não lê nada daqui.
import { useSyncExternalStore } from 'react';

export type DeviceClass = 'desktop' | 'mobile' | 'tablet';
export type UiKind = 'desktop' | 'touch';
export type InputMode = 'keyboard' | 'touch' | 'gamepad';
export type Orientation = 'landscape' | 'portrait';
export type UiOverride = 'auto' | DeviceClass;

/** Enquadramento da luta, em frações da área do canvas. */
export interface FightFraming {
  /** espaço reservado em cima (HUD) e embaixo (controles) — os lutadores ficam no meio */
  top: number;
  bottom: number;
  /** folga lateral somada à distância entre os lutadores (unidades do mundo) */
  sideMargin: number;
  /** distância mínima da câmera (aproximação máxima) */
  minDistance: number;
}

export interface PlatformProfile {
  id: DeviceClass;
  ui: UiKind;
  label: string;
  /** enquadramento da luta por orientação */
  framing: Record<Orientation, FightFraming>;
  /** HUD da luta: completo (PC/tablet) ou compacto (celular) */
  hud: 'full' | 'compact';
  /** escala base dos controles de toque */
  touchScale: number;
  /** densidade máxima do canvas e limite de pixels (protege 4K e celulares 3x) */
  quality: { dprCap: number; maxPixels: number };
}

export const DesktopProfile: PlatformProfile = Object.freeze({
  id: 'desktop',
  ui: 'desktop',
  label: 'Computador',
  framing: {
    landscape: { top: 0.15, bottom: 0.09, sideMargin: 2.6, minDistance: 7.2 },
    portrait: { top: 0.14, bottom: 0.12, sideMargin: 3.4, minDistance: 7.2 },
  },
  hud: 'full',
  touchScale: 1,
  quality: { dprCap: 2, maxPixels: 8.3e6 },
}) as PlatformProfile;

export const TabletProfile: PlatformProfile = Object.freeze({
  id: 'tablet',
  ui: 'touch',
  label: 'Tablet',
  framing: {
    landscape: { top: 0.14, bottom: 0.16, sideMargin: 2.7, minDistance: 6.8 },
    portrait: { top: 0.13, bottom: 0.36, sideMargin: 3.2, minDistance: 6.8 },
  },
  hud: 'full',
  touchScale: 1.15,
  quality: { dprCap: 2, maxPixels: 5.5e6 },
}) as PlatformProfile;

export const MobileProfile: PlatformProfile = Object.freeze({
  id: 'mobile',
  ui: 'touch',
  label: 'Celular',
  framing: {
    // deitado: lutadores maiores, um pouco acima dos botões dos cantos
    landscape: { top: 0.17, bottom: 0.14, sideMargin: 2.3, minDistance: 6.2 },
    // em pé: arena entre o HUD (em cima) e o painel de controles (embaixo)
    portrait: { top: 0.13, bottom: 0.42, sideMargin: 2.0, minDistance: 6.2 },
  },
  hud: 'compact',
  touchScale: 1,
  quality: { dprCap: 2, maxPixels: 3.2e6 },
}) as PlatformProfile;

export const PROFILES: Record<DeviceClass, PlatformProfile> = {
  desktop: DesktopProfile,
  tablet: TabletProfile,
  mobile: MobileProfile,
};

export interface PlatformState {
  deviceClass: DeviceClass;
  profile: PlatformProfile;
  override: UiOverride;
  inputMode: InputMode;
  orientation: Orientation;
  layout: string;
  viewport: { w: number; h: number };
  gamepads: number;
  standalone: boolean;
}

// ----------------------------------------------------------------------
// Capacidades
// ----------------------------------------------------------------------
const mq = (query: string) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null);

function classify(): DeviceClass {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  const touchPoints = navigator.maxTouchPoints || 0;
  const iPadOS = /Macintosh/.test(ua) && touchPoints > 1; // iPadOS se apresenta como Mac
  const phoneUA = typeof uaData?.mobile === 'boolean' ? uaData.mobile : /iPhone|iPod|Android.+Mobile|Windows Phone|Mobi/i.test(ua);
  const tabletUA = iPadOS || /iPad|Tablet|Silk|Kindle|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  // lado menor da TELA física: não muda ao girar nem ao redimensionar a janela
  const screenShort = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  if (phoneUA) return screenShort >= 600 ? 'tablet' : 'mobile';
  if (tabletUA) return screenShort < 500 ? 'mobile' : 'tablet';
  const touch = touchPoints > 0 || 'ontouchstart' in window;
  const anyFine = Boolean(mq('(any-pointer: fine)')?.matches);
  const anyHover = Boolean(mq('(any-hover: hover)')?.matches);
  const coarse = Boolean(mq('(pointer: coarse)')?.matches);
  if (touch && coarse && !anyFine && !anyHover) return screenShort < 600 ? 'mobile' : 'tablet';
  return 'desktop'; // mouse/trackpad presente (inclui notebook com tela de toque)
}

function readViewport() {
  if (typeof window === 'undefined') return { w: 1280, h: 720 };
  return { w: Math.max(1, document.documentElement.clientWidth || innerWidth), h: Math.max(1, innerHeight) };
}

// ----------------------------------------------------------------------
// Estado (store externo para o React)
// ----------------------------------------------------------------------
const OVERRIDE_KEY = 'familia-fighter-ui-mode';
const listeners = new Set<() => void>();
let deviceClass: DeviceClass = typeof window === 'undefined' ? 'desktop' : classify();
let override: UiOverride = (() => {
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(OVERRIDE_KEY) : null;
    return saved === 'desktop' || saved === 'mobile' || saved === 'tablet' ? saved : 'auto';
  } catch {
    return 'auto';
  }
})();
let inputMode: InputMode = deviceClass === 'desktop' ? 'keyboard' : 'touch';
let gamepads = 0;
let lastInputSwitch = 0;
let state: PlatformState = compute();

function compute(): PlatformState {
  const id = override === 'auto' ? deviceClass : override;
  const profile = PROFILES[id];
  const viewport = readViewport();
  // proporção da janela (não o sensor): uma janela de PC estreita fica "em pé"
  const orientation: Orientation = viewport.h > viewport.w * 1.05 ? 'portrait' : 'landscape';
  return {
    deviceClass,
    profile,
    override,
    inputMode,
    orientation,
    layout: profile.id === 'desktop' ? 'desktop' : `${profile.id}-${orientation}`,
    viewport,
    gamepads,
    standalone: Boolean(mq('(display-mode: standalone), (display-mode: fullscreen)')?.matches),
  };
}

function apply() {
  const next = compute();
  const changed =
    next.profile !== state.profile || next.orientation !== state.orientation || next.inputMode !== state.inputMode ||
    next.viewport.w !== state.viewport.w || next.viewport.h !== state.viewport.h || next.gamepads !== state.gamepads ||
    next.override !== state.override || next.deviceClass !== state.deviceClass;
  if (!changed) return;
  state = next;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.platform = state.profile.id;
    root.dataset.ui = state.profile.ui;
    root.dataset.orientation = state.orientation;
    root.dataset.layout = state.layout;
    root.dataset.input = state.inputMode;
  }
  listeners.forEach((fn) => fn());
}

function setInput(mode: InputMode, force = false) {
  if (mode === inputMode) return;
  const now = performance.now();
  if (!force && now - lastInputSwitch < 400) return; // histerese
  lastInputSwitch = now;
  inputMode = mode;
  apply();
}

if (typeof window !== 'undefined') {
  // marca o documento já no carregamento (o CSS depende disso)
  const root = document.documentElement;
  root.dataset.platform = state.profile.id;
  root.dataset.ui = state.profile.ui;
  root.dataset.orientation = state.orientation;
  root.dataset.layout = state.layout;
  root.dataset.input = state.inputMode;

  let frame = 0;
  let settle = 0;
  const queue = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply();
      // alguns navegadores só informam a área final depois da animação de rotação
      window.clearTimeout(settle);
      settle = window.setTimeout(apply, 260);
    });
  };
  window.addEventListener('resize', queue);
  window.addEventListener('orientationchange', queue);
  screen.orientation?.addEventListener?.('change', queue);
  document.addEventListener('fullscreenchange', queue);

  // hardware mudou (tablet ganhou mouse/teclado, por exemplo): reavalia a classe
  let reclassifyTimer = 0;
  const reclassify = () => {
    window.clearTimeout(reclassifyTimer);
    reclassifyTimer = window.setTimeout(() => {
      const next = classify();
      if (next !== deviceClass) {
        deviceClass = next;
        apply();
      }
    }, 500);
  };
  for (const query of ['(any-pointer: fine)', '(any-hover: hover)', '(pointer: coarse)']) mq(query)?.addEventListener?.('change', reclassify);

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') setInput('touch');
    else if (event.pointerType === 'mouse' && inputMode === 'touch' && deviceClass === 'desktop') setInput('keyboard');
  }, { capture: true, passive: true });
  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || /^(F\d+|Tab|Meta|Control|Alt|Shift)$/.test(event.key)) return;
    setInput('keyboard');
  }, { capture: true, passive: true });
  window.addEventListener('gamepadconnected', () => { gamepads++; apply(); });
  window.addEventListener('gamepaddisconnected', () => {
    gamepads = Math.max(0, gamepads - 1);
    if (!gamepads && inputMode === 'gamepad') setInput(deviceClass === 'desktop' ? 'keyboard' : 'touch', true);
    else apply();
  });
}

// ----------------------------------------------------------------------
// API
// ----------------------------------------------------------------------
export const platform = {
  get state() { return state; },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  setOverride(mode: UiOverride) {
    override = mode;
    try { window.localStorage.setItem(OVERRIDE_KEY, mode); } catch { /* modo privado */ }
    apply();
  },
  /** chamado pelo motor quando um controle é usado */
  noteGamepad() { setInput('gamepad', true); },
  setInput,
};

/** Hook React: re-renderiza quando perfil, orientação, entrada ou tamanho mudam. */
export function usePlatform(): PlatformState {
  return useSyncExternalStore(platform.subscribe, () => state, () => state);
}
