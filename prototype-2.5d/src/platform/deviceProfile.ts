/**
 * Device profiles (Desktop / Tablet / Mobile) — pure logic, no DOM, no React.
 *
 * Two independent questions are answered here:
 *  1. Which *form factor* is this? (desktop | tablet | mobile). Decided from
 *     the device's input capabilities and physical screen, never from the
 *     current window width, so resizing a desktop window never flips profile.
 *  2. Which *control scheme* should be shown? (touch | keyboard). Decided from
 *     the form factor, the last input the player really used, and an optional
 *     manual override.
 *
 * Both use hysteresis so that borderline values never cause flicker.
 */

export type DeviceProfileId = 'desktop' | 'tablet' | 'mobile';
export type ControlMode = 'auto' | 'touch' | 'keyboard';
export type ControlScheme = 'touch' | 'keyboard';
export type InputKind = 'touch' | 'mouse' | 'key' | 'gamepad';
export type Orientation = 'portrait' | 'landscape';

export interface EnvSignals {
  /** Window inner size in CSS px (usable area). */
  viewportW: number;
  viewportH: number;
  /** Physical screen size in CSS px (0 when the browser does not report it). */
  screenW: number;
  screenH: number;
  /** `(pointer: coarse)` — the *primary* pointer is a finger. */
  primaryCoarse: boolean;
  /** `(any-pointer: fine)` — a mouse/trackpad exists somewhere. */
  anyFine: boolean;
  /** `(any-pointer: coarse)` — a touch screen exists somewhere. */
  anyCoarse: boolean;
  maxTouchPoints: number;
  /** navigator.userAgentData.mobile or a mobile UA string. */
  uaMobile: boolean;
}

export interface ProfileState {
  profile: DeviceProfileId;
  orientation: Orientation;
}

export interface ControlState {
  scheme: ControlScheme;
}

/** Short side (CSS px) at which a touch device becomes a tablet, with hysteresis. */
export const TABLET_ENTER_SHORT_SIDE = 640;
export const TABLET_LEAVE_SHORT_SIDE = 560;
/** Orientation hysteresis: aspect must pass this margin before flipping. */
const ORIENTATION_MARGIN = 0.06;

export function isTouchPrimary(env: EnvSignals): boolean {
  if (env.primaryCoarse) return true;
  if (env.uaMobile) return true;
  // Touch-only hardware that does not expose `pointer: coarse` as primary.
  return env.anyCoarse && !env.anyFine && env.maxTouchPoints > 0;
}

function shortSideOf(env: EnvSignals): number {
  const screenShort = Math.min(env.screenW, env.screenH);
  if (screenShort > 0) return screenShort;
  return Math.min(env.viewportW, env.viewportH);
}

export function resolveProfile(env: EnvSignals, prev?: ProfileState): ProfileState {
  const orientation = resolveOrientation(env, prev?.orientation);
  if (!isTouchPrimary(env)) {
    // Laptops (even with touch screens or tiny windows) stay desktop.
    return { profile: 'desktop', orientation };
  }
  const short = shortSideOf(env);
  const wasTablet = prev?.profile === 'tablet';
  const threshold = wasTablet ? TABLET_LEAVE_SHORT_SIDE : TABLET_ENTER_SHORT_SIDE;
  return { profile: short >= threshold ? 'tablet' : 'mobile', orientation };
}

export function resolveOrientation(env: EnvSignals, prev?: Orientation): Orientation {
  const ratio = env.viewportW / Math.max(1, env.viewportH);
  if (!prev) return ratio >= 1 ? 'landscape' : 'portrait';
  if (prev === 'landscape') return ratio < 1 - ORIENTATION_MARGIN ? 'portrait' : 'landscape';
  return ratio > 1 + ORIENTATION_MARGIN ? 'landscape' : 'portrait';
}

/**
 * Chooses the on-screen control scheme.
 *  - A manual override always wins.
 *  - Touch-primary devices use touch controls until a gamepad or gameplay key
 *    is used (external controller / keyboard attached); touching again brings
 *    the touch controls back.
 *  - Desktops use the keyboard, and only show touch controls after a real
 *    touch (hybrid laptops) until a key / gamepad is used again.
 */
export function resolveControlScheme(
  mode: ControlMode,
  profile: DeviceProfileId,
  lastInput: InputKind | null,
): ControlScheme {
  if (mode === 'touch') return 'touch';
  if (mode === 'keyboard') return 'keyboard';
  if (profile === 'desktop') return lastInput === 'touch' ? 'touch' : 'keyboard';
  return lastInput === 'key' || lastInput === 'gamepad' ? 'keyboard' : 'touch';
}

/* ------------------------------------------------------------------ */
/* Per-profile presentation configuration                               */
/* ------------------------------------------------------------------ */

export interface CameraFraming {
  fov: number;
  /** Base camera distance and how much it grows with fighter separation. */
  baseDistance: number;
  spanFactor: number;
  /** Extra world width kept visible around the two fighters. */
  marginLandscape: number;
  marginPortrait: number;
  /** World height (units) that must stay visible between HUD bands. */
  visibleHeight: number;
  minDistance: number;
  maxDistance: number;
}

export interface ProfileConfig {
  id: DeviceProfileId;
  camera: CameraFraming;
  /** Maximum device-pixel-ratio the renderer may use. */
  maxPixelRatio: number;
  /** Default graphics quality when the player has never chosen one. */
  defaultQuality: 'low' | 'medium' | 'high';
  /** Whether menus use the dense, touch-first composition. */
  compactUi: boolean;
}

export const PROFILE_CONFIGS: Record<DeviceProfileId, ProfileConfig> = {
  desktop: {
    id: 'desktop',
    camera: {
      fov: 38,
      baseDistance: 6.8,
      spanFactor: 0.68,
      marginLandscape: 2.8,
      marginPortrait: 3.2,
      visibleHeight: 4.7,
      minDistance: 7.2,
      maxDistance: 60,
    },
    maxPixelRatio: 2,
    defaultQuality: 'high',
    compactUi: false,
  },
  tablet: {
    id: 'tablet',
    camera: {
      fov: 38,
      baseDistance: 6.6,
      spanFactor: 0.66,
      marginLandscape: 2.5,
      marginPortrait: 2.6,
      visibleHeight: 4.6,
      minDistance: 7,
      maxDistance: 60,
    },
    maxPixelRatio: 2,
    defaultQuality: 'medium',
    compactUi: false,
  },
  mobile: {
    id: 'mobile',
    camera: {
      fov: 38,
      baseDistance: 6.4,
      spanFactor: 0.62,
      marginLandscape: 2.2,
      marginPortrait: 2.1,
      visibleHeight: 4.4,
      minDistance: 6.8,
      maxDistance: 60,
    },
    maxPixelRatio: 2,
    defaultQuality: 'medium',
    compactUi: true,
  },
};

/**
 * Root UI scale (applied as html font-size multiplier, not transform).
 * Desktop grows on large monitors so the game never looks small on 1440p+;
 * it never shrinks below 1 so the dense menus keep fitting short windows.
 */
export function uiScaleFor(profile: DeviceProfileId, viewportW: number, viewportH: number): number {
  const short = Math.min(viewportW, viewportH);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  if (profile === 'desktop') {
    // Height-driven, but a very narrow window must not grow the UI.
    const byHeight = viewportH / 720;
    const byWidth = viewportW / 1000;
    return round2(clamp(Math.min(byHeight, byWidth), 1, 1.5));
  }
  if (profile === 'tablet') return round2(clamp(short / 700, 1, 1.25));
  return 1;
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Touch control customisation                                          */
/* ------------------------------------------------------------------ */

export interface TouchControlSettings {
  /** 0.7 – 1.4 */
  scale: number;
  /** 0.35 – 1 */
  opacity: number;
  /** Swap sides (joystick right, buttons left). */
  leftHanded: boolean;
}

export const DEFAULT_TOUCH_CONTROLS: TouchControlSettings = {
  scale: 1,
  opacity: 0.85,
  leftHanded: false,
};

export function sanitizeTouchControls(raw: unknown): TouchControlSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<TouchControlSettings>;
  const num = (v: unknown, lo: number, hi: number, d: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d;
  return {
    scale: num(r.scale, 0.7, 1.4, DEFAULT_TOUCH_CONTROLS.scale),
    opacity: num(r.opacity, 0.35, 1, DEFAULT_TOUCH_CONTROLS.opacity),
    leftHanded: typeof r.leftHanded === 'boolean' ? r.leftHanded : DEFAULT_TOUCH_CONTROLS.leftHanded,
  };
}

/* ------------------------------------------------------------------ */
/* Camera framing math (pure, unit-testable)                            */
/* ------------------------------------------------------------------ */

export interface FramingInput {
  span: number;
  aspect: number;
  /** Fraction (0..1) of the viewport height covered by HUD at top/bottom. */
  topInset: number;
  bottomInset: number;
}

/**
 * Distance the camera must keep so that both fighters fit horizontally
 * (including margin) and the combat band fits vertically between HUD bands.
 */
export function framingDistance(cfg: CameraFraming, input: FramingInput): number {
  const tanHalf = Math.tan((cfg.fov * 0.5 * Math.PI) / 180);
  const margin = input.aspect < 1 ? cfg.marginPortrait : cfg.marginLandscape;
  const desiredWidth = input.span + margin;
  const fitW = desiredWidth / (2 * Math.max(0.01, tanHalf * input.aspect));
  const freeBand = Math.max(0.3, 1 - input.topInset - input.bottomInset);
  const fitH = cfg.visibleHeight / (2 * tanHalf * freeBand);
  const base = cfg.baseDistance + input.span * cfg.spanFactor;
  return Math.max(cfg.minDistance, Math.min(cfg.maxDistance, Math.max(base, fitW, fitH)));
}
