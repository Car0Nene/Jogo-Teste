import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ControlMode,
  ControlScheme,
  DeviceProfileId,
  EnvSignals,
  InputKind,
  Orientation,
  PROFILE_CONFIGS,
  ProfileConfig,
  resolveControlScheme,
  resolveProfile,
  uiScaleFor,
} from './deviceProfile';

export interface PlatformState {
  profile: DeviceProfileId;
  orientation: Orientation;
  scheme: ControlScheme;
  config: ProfileConfig;
  uiScale: number;
  viewportW: number;
  viewportH: number;
}

function mq(query: string): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function readEnv(): EnvSignals {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  const uaMobile =
    nav.userAgentData?.mobile === true ||
    /Android.+Mobile|iPhone|iPod|Windows Phone|Mobile Safari/i.test(nav.userAgent || '') ||
    // iPadOS reports a desktop UA; multi-touch Mac platform identifies it.
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const vv = window.visualViewport;
  return {
    viewportW: Math.round(vv?.width ?? window.innerWidth),
    viewportH: Math.round(vv?.height ?? window.innerHeight),
    screenW: window.screen?.width ?? 0,
    screenH: window.screen?.height ?? 0,
    primaryCoarse: mq('(pointer: coarse)'),
    anyFine: mq('(any-pointer: fine)'),
    anyCoarse: mq('(any-pointer: coarse)'),
    maxTouchPoints: nav.maxTouchPoints || 0,
    uaMobile,
  };
}

/**
 * Detects the device profile and control scheme, keeps them stable (hysteresis),
 * and mirrors them on <html> (data-profile / data-orientation / data-control and
 * the --ff-ui-scale font-size multiplier) so CSS and React agree.
 *
 * `isGameKey` filters keyboard events: only real gameplay keys count as
 * "a keyboard is being used" (Enter/Escape on a touch device do not).
 */
export function useDeviceProfile(
  controlMode: ControlMode,
  isGameKey: (code: string) => boolean,
): PlatformState {
  const [env, setEnv] = useState<EnvSignals>(() => readEnv());
  const profileRef = useRef(resolveProfile(env));
  const [profileState, setProfileState] = useState(profileRef.current);
  const [lastInput, setLastInput] = useState<InputKind | null>(null);
  const isGameKeyRef = useRef(isGameKey);
  isGameKeyRef.current = isGameKey;

  // Re-read the environment on anything that can change it.
  useEffect(() => {
    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = readEnv();
        setEnv((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      });
    };
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    window.visualViewport?.addEventListener('resize', refresh);
    const queries = ['(pointer: coarse)', '(any-pointer: fine)', '(any-pointer: coarse)'].map((q) =>
      typeof window.matchMedia === 'function' ? window.matchMedia(q) : null,
    );
    queries.forEach((m) => m?.addEventListener?.('change', refresh));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      window.visualViewport?.removeEventListener('resize', refresh);
      queries.forEach((m) => m?.removeEventListener?.('change', refresh));
    };
  }, []);

  // Real input tracking: touch / mouse / gameplay key / gamepad.
  useEffect(() => {
    const note = (kind: InputKind) => setLastInput((prev) => (prev === kind ? prev : kind));
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') note('touch');
      else if (e.pointerType === 'mouse') note('mouse');
    };
    const onKey = (e: KeyboardEvent) => {
      if (isGameKeyRef.current(e.code)) note('key');
    };
    const onPad = () => note('gamepad');
    window.addEventListener('pointerdown', onPointer, { capture: true, passive: true });
    window.addEventListener('keydown', onKey, { capture: true, passive: true });
    window.addEventListener('gamepadconnected', onPad);
    return () => {
      window.removeEventListener('pointerdown', onPointer, { capture: true });
      window.removeEventListener('keydown', onKey, { capture: true });
      window.removeEventListener('gamepadconnected', onPad);
    };
  }, []);

  // Form factor with hysteresis (previous value feeds the next decision).
  useEffect(() => {
    const next = resolveProfile(env, profileRef.current);
    if (next.profile !== profileRef.current.profile || next.orientation !== profileRef.current.orientation) {
      profileRef.current = next;
      setProfileState(next);
    }
  }, [env]);

  const scheme = resolveControlScheme(controlMode, profileState.profile, lastInput);
  const uiScale = uiScaleFor(profileState.profile, env.viewportW, env.viewportH);

  // Mirror on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.profile = profileState.profile;
    root.dataset.orientation = profileState.orientation;
    root.dataset.control = scheme;
    root.style.setProperty('--ff-ui-scale', String(uiScale));
  }, [profileState, scheme, uiScale]);

  return useMemo(
    () => ({
      profile: profileState.profile,
      orientation: profileState.orientation,
      scheme,
      config: PROFILE_CONFIGS[profileState.profile],
      uiScale,
      viewportW: env.viewportW,
      viewportH: env.viewportH,
    }),
    [profileState, scheme, uiScale, env.viewportW, env.viewportH],
  );
}
