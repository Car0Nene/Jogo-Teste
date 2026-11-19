import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Pause } from 'lucide-react';
import { FIGHTERS } from '../data/fighters';
import { DEFAULT_KEY_BINDINGS, formatKeyCode, HudScale, Player1KeyBindings } from '../data/settings';
import { GameMode, HudFighterSnapshot, HudSnapshot } from '../engine/GameEngine';
import { FighterPortrait } from './FighterBadgeSvg';
import { DanielVictoryScene } from './DanielVictoryScene';

interface FightHudProps {
  hud: HudSnapshot;
  gameMode: GameMode;
  muted: boolean;
  hudScale?: HudScale;
  keyBindings?: Player1KeyBindings;
  onToggleMute: () => void;
  onPause: () => void;
  onSkipIntro: () => void;
  onVirtualHold: (player: 0 | 1, action: string, active: boolean) => void;
  onVirtualPress: (player: 0 | 1, action: 'light' | 'heavy' | 'special' | 'subSpecial' | 'jump') => void;
  onRematch: () => void;
  onBackToSelect: () => void;
}

function FighterMeterBlock({
  f,
  align,
}: {
  f: HudFighterSnapshot;
  align: 'left' | 'right';
}) {
  const spec = FIGHTERS[f.id];
  const hpPct = Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100));
  const trailPct = Math.max(hpPct, Math.min(100, (f.trailHp / f.maxHp) * 100));
  const isRight = align === 'right';

  return (
    <div className={`flex-1 max-w-[440px] flex flex-col gap-1.5 ${isRight ? 'items-end' : 'items-start'}`}>
      {/* Name, rounds & form */}
      <div className={`w-full flex items-center justify-between gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2.5 ${isRight ? 'flex-row-reverse' : ''}`}>
          <FighterPortrait id={f.id} size="md" />
          <div className={isRight ? 'text-right' : 'text-left'}>
            <div className="font-display font-extrabold text-xl tracking-wide text-white leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              {f.name}
            </div>
            {f.formLabel ? (
              <div className="text-[11px] font-semibold text-amber-300 mt-0.5 tabular-nums">
                {f.formLabel} · {f.formTimeLeft}s
              </div>
            ) : (
              <div className="text-[11px] text-stone-300/80 mt-0.5">{spec.roleTitle}</div>
            )}
          </div>
        </div>

        {/* Round pips */}
        <div className="flex items-center gap-1.5">
          {[0, 1].map((idx) => (
            <span
              key={idx}
              className={`w-3.5 h-3.5 rounded-sm border transition-colors ${
                f.roundsWon > idx
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                  : 'bg-stone-900/80 border-white/25'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Health bar with trailing damage */}
      <div className="w-full h-5 bg-stone-950/90 border border-white/20 rounded-sm overflow-hidden relative shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
        <div
          className={`absolute top-0 bottom-0 bg-red-500/80 transition-all duration-150 ${
            isRight ? 'right-0' : 'left-0'
          }`}
          style={{ width: `${trailPct}%` }}
        />
        <div
          className={`absolute top-0 bottom-0 transition-all duration-75 ${
            hpPct > 30
              ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500'
              : 'bg-gradient-to-b from-rose-400 via-red-500 to-red-700'
          } ${isRight ? 'right-0' : 'left-0'}`}
          style={{ width: `${hpPct}%` }}
        />
        <span
          className={`absolute top-1/2 -translate-y-1/2 text-[11px] font-mono-num font-bold text-stone-950/90 px-2 ${
            isRight ? 'left-0' : 'right-0'
          }`}
        >
          {f.hp}
        </span>
      </div>

      {/* Special Meter */}
      <div className={`w-[78%] flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 h-2.5 bg-stone-950/90 border border-white/15 rounded-sm overflow-hidden relative">
          <div
            className={`h-full transition-all duration-100 ${
              f.meter >= 100
                ? 'bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300'
                : f.meter >= 50
                ? 'bg-sky-400'
                : 'bg-stone-500'
            } ${isRight ? 'ml-auto' : ''}`}
            style={{ width: `${f.meter}%` }}
          />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
        </div>
        <span className="font-mono-num text-[11px] font-bold text-stone-200 tabular-nums w-9 text-center">
          {f.meter}%
        </span>
      </div>

      {/* Combo & Bark */}
      {f.comboCount >= 2 && (
        <div className="font-display font-extrabold italic text-2xl text-amber-300 drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
          {f.comboCount} HITS!
        </div>
      )}
      {f.bark && (
        <div className="bg-stone-950/90 border border-amber-300/40 text-amber-100 text-xs font-semibold px-3 py-1.5 rounded-md shadow-md max-w-[260px]">
          “{f.bark}”
        </div>
      )}
    </div>
  );
}

function VirtualJoystick({
  onHold,
  onPress,
}: {
  onHold: (action: string, active: boolean) => void;
  onPress: (action: 'jump') => void;
}) {
  const activePointer = useRef<number | null>(null);
  const activeActions = useRef<string[]>([]);
  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;
  const [stick, setStick] = useState({ x: 0, y: 0 });

  useEffect(() => () => {
    activeActions.current
      .filter((action) => action !== 'up')
      .forEach((action) => onHoldRef.current(action, false));
  }, []);

  const releaseActions = () => {
    activeActions.current.filter((action) => action !== 'up').forEach((action) => onHoldRef.current(action, false));
    activeActions.current = [];
    activePointer.current = null;
    setStick({ x: 0, y: 0 });
  };

  const updateStick = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width / 2 - 12;
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / length);
    const x = dx * scale;
    const y = dy * scale;
    setStick({ x, y });

    const nextActions: string[] = [];
    if (x < -radius * 0.22) nextActions.push('left');
    if (x > radius * 0.22) nextActions.push('right');
    if (y < -radius * 0.35) nextActions.push('up');
    if (y > radius * 0.35) nextActions.push('down');
    activeActions.current
      .filter((action) => !nextActions.includes(action))
      .filter((action) => action !== 'up')
      .forEach((action) => onHoldRef.current(action, false));
    nextActions
      .filter((action) => !activeActions.current.includes(action))
      .forEach((action) => action === 'up' ? onPress('jump') : onHoldRef.current(action, true));
    activeActions.current = nextActions;
  };

  return (
    <div
      role="group"
      aria-label="Analógico virtual: mover, pular e agachar"
      data-active-actions={activeActions.current.join(',')}
      className="ff-virtual-joystick relative h-[88px] w-[88px] shrink-0 place-items-center rounded-full border border-white/20 bg-stone-950/85 shadow-lg touch-none select-none"
      onPointerDown={(event) => {
        event.preventDefault();
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateStick(event);
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) updateStick(event);
      }}
      onPointerUp={(event) => {
        if (activePointer.current === event.pointerId) releaseActions();
      }}
      onPointerCancel={releaseActions}
      onLostPointerCapture={releaseActions}
    >
      <span className="absolute text-[9px] text-stone-400" style={{ top: 5 }}>PULAR</span>
      <span className="absolute text-[9px] text-stone-400" style={{ bottom: 5 }}>AGACHAR</span>
      <span className="absolute text-xs text-stone-400" style={{ left: 7 }}>◀</span>
      <span className="absolute text-xs text-stone-400" style={{ right: 7 }}>▶</span>
      <span
        aria-hidden="true"
        className="h-10 w-10 rounded-full border border-amber-200/60 bg-amber-400/90 shadow-[0_2px_12px_rgba(251,191,36,0.35)] pointer-events-none"
        style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }}
      />
    </div>
  );
}

export function FightHud({
  hud,
  gameMode,
  muted,
  hudScale = 1,
  keyBindings = DEFAULT_KEY_BINDINGS,
  onToggleMute,
  onPause,
  onSkipIntro,
  onVirtualHold,
  onVirtualPress,
  onRematch,
  onBackToSelect,
}: FightHudProps) {
  const kL = formatKeyCode(keyBindings.left);
  const kR = formatKeyCode(keyBindings.right);
  const kU = formatKeyCode(keyBindings.up);
  const kD = formatKeyCode(keyBindings.down);
  const kG = formatKeyCode(keyBindings.guard);
  const kLight = formatKeyCode(keyBindings.light);
  const kHeavy = formatKeyCode(keyBindings.heavy);
  const kSp = formatKeyCode(keyBindings.special);
  const winnerId = hud.winnerIndex === 0 ? hud.p1.id : hud.winnerIndex === 1 ? hud.p2.id : null;

  return (
    <div
      className="ff-hud-controls fixed inset-0 z-20 pointer-events-none flex flex-col justify-between origin-center"
      style={hudScale !== 1 ? { transform: `scale(${hudScale})` } : undefined}
    >
      {/* Top Perimeter Combat Cluster */}
      <div className="w-full max-w-[1360px] mx-auto flex items-start justify-between gap-3 md:gap-6">
        <FighterMeterBlock f={hud.p1} align="left" />

        {/* Center Clock & Utility Controls */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="bg-stone-950/90 border border-amber-300/30 rounded-md px-4 py-1.5 text-center shadow-lg min-w-[82px]">
            <div className="text-[10px] font-semibold tracking-wider text-amber-300/90 uppercase">
              {gameMode === 'training' ? 'Treino' : `Round ${hud.roundNumber}`}
            </div>
            <div className="font-mono-num font-bold text-2xl md:text-3xl text-white leading-tight">
              {gameMode === 'training' ? '∞' : String(hud.timer).padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Ativar som' : 'Silenciar'}
              className="w-8 h-8 rounded-md bg-stone-950/85 border border-white/15 hover:border-amber-300/60 flex items-center justify-center text-stone-200 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onPause}
              aria-label="Pausar"
              className="w-8 h-8 rounded-md bg-stone-950/85 border border-white/15 hover:border-amber-300/60 flex items-center justify-center text-stone-200 transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        <FighterMeterBlock f={hud.p2} align="right" />
      </div>

      {/* Center Stage Announcements (Banner / Intro Dialogue / Match Over) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {hud.phase === 'intro' && hud.introLine && (
          <div className="mt-auto mb-4 pointer-events-auto bg-stone-950/92 border border-amber-300/40 rounded-lg px-5 py-3.5 max-w-xl w-full shadow-2xl animate-banner-pop flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold tracking-wide text-amber-300">
                {hud.introLine.name}
              </div>
              <div className="text-sm md:text-base font-medium text-stone-100 mt-0.5">
                “{hud.introLine.text}”
              </div>
            </div>
            <button
              type="button"
              onClick={onSkipIntro}
              className="px-3 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Pular
            </button>
          </div>
        )}

        {(hud.phase === 'banner' || hud.phase === 'ko' || (hud.phase === 'fighting' && hud.bannerText)) && (
          <div className="animate-banner-pop text-center">
            <div className="font-display font-extrabold italic text-5xl md:text-7xl tracking-wider text-amber-300 drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)]">
              {hud.bannerText}
            </div>
          </div>
        )}

        {hud.phase === 'matchOver' && (
          <div className="pointer-events-auto bg-stone-950/95 border border-amber-400/50 rounded-xl px-4 py-4 text-center shadow-2xl animate-banner-pop max-w-2xl w-full flex flex-col items-center sm:px-8 sm:py-6">
            {winnerId === 'daniel' ? (
              <DanielVictoryScene />
            ) : winnerId ? (
              <FighterPortrait
                id={winnerId}
                size="xl"
                className="mb-3"
              />
            ) : null}
            <div className="text-xs font-semibold text-amber-300 tracking-wider uppercase">
              Fim da Luta
            </div>
            <div className="font-display font-extrabold italic text-4xl md:text-5xl text-white mt-1">
              {hud.bannerText}
            </div>
            <p className="text-xs text-stone-300 mt-2">
              {hud.winnerIndex === 0 ? FIGHTERS[hud.p1.id].quote : FIGHTERS[hud.p2.id].quote}
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={onRematch}
                className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Revanche
              </button>
              <button
                type="button"
                onClick={onBackToSelect}
                className="px-5 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 border border-white/15 font-semibold text-sm transition-colors cursor-pointer"
              >
                Trocar Lutadores
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compact Bottom Controls Strip (Interactive + Keyboard Hint) */}
      <div className="w-full max-w-[1160px] mx-auto flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Virtual joystick on touch devices, directional pad on desktop. */}
        <div className="flex items-center gap-1.5 bg-stone-950/85 border border-white/10 rounded-lg px-2.5 py-1.5">
          <VirtualJoystick
            onHold={(action, active) => onVirtualHold(0, action, active)}
            onPress={(action) => onVirtualPress(0, action)}
          />
          <div className="ff-directional-buttons flex items-center gap-1.5">
          <button
            type="button"
            onPointerDown={() => onVirtualHold(0, 'left', true)}
            onPointerUp={() => onVirtualHold(0, 'left', false)}
            onPointerCancel={() => onVirtualHold(0, 'left', false)}
            onPointerLeave={() => onVirtualHold(0, 'left', false)}
            className="w-11 h-11 rounded bg-stone-800 hover:bg-stone-700 active:bg-amber-400 active:text-stone-950 text-sm font-bold cursor-pointer touch-none"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onVirtualPress(0, 'jump')}
            className="w-11 h-11 rounded bg-stone-800 hover:bg-stone-700 active:bg-amber-400 active:text-stone-950 text-sm font-bold cursor-pointer touch-none"
          >
            ▲
          </button>
          <button
            type="button"
            onPointerDown={() => onVirtualHold(0, 'down', true)}
            onPointerUp={() => onVirtualHold(0, 'down', false)}
            onPointerCancel={() => onVirtualHold(0, 'down', false)}
            onPointerLeave={() => onVirtualHold(0, 'down', false)}
            aria-label="Agachar"
            className="px-2.5 h-11 rounded bg-stone-800 hover:bg-stone-700 text-xs font-semibold cursor-pointer touch-none"
          >
            Agachar
          </button>
          <button
            type="button"
            onPointerDown={() => onVirtualHold(0, 'right', true)}
            onPointerUp={() => onVirtualHold(0, 'right', false)}
            onPointerCancel={() => onVirtualHold(0, 'right', false)}
            onPointerLeave={() => onVirtualHold(0, 'right', false)}
            className="w-11 h-11 rounded bg-stone-800 hover:bg-stone-700 active:bg-amber-400 active:text-stone-950 text-sm font-bold cursor-pointer touch-none"
          >
            ▶
          </button>
          </div>
          <button
            type="button"
            onPointerDown={() => onVirtualHold(0, 'guard', true)}
            onPointerUp={() => onVirtualHold(0, 'guard', false)}
            onPointerCancel={() => onVirtualHold(0, 'guard', false)}
            onPointerLeave={() => onVirtualHold(0, 'guard', false)}
            className="px-2.5 h-11 rounded bg-stone-800 hover:bg-stone-700 text-xs font-semibold cursor-pointer touch-none"
          >
            Defesa
          </button>
        </div>

        <div className="hidden lg:block text-xs text-stone-300/85 bg-stone-950/75 border border-white/10 rounded-lg px-3.5 py-2">
          {kL}/{kR} Mover · {kU}/Espaço Pular · {kD} Agachar · {kLight} Leve · {kHeavy} Forte · {kSp} Especial · {kD}+{kSp} Sub-Especial · {kG} Defesa
        </div>

        <div className="flex items-center gap-1.5 bg-stone-950/85 border border-white/10 rounded-lg px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => onVirtualPress(0, 'light')}
            className="px-3 min-h-11 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer touch-none"
          >
            Leve ({kLight})
          </button>
          <button
            type="button"
            onClick={() => onVirtualPress(0, 'heavy')}
            className="px-3 min-h-11 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer touch-none"
          >
            Forte ({kHeavy})
          </button>
          <button
            type="button"
            onClick={() => onVirtualPress(0, 'special')}
            disabled={hud.p1.meter < 50}
            className="px-3 min-h-11 rounded bg-amber-400 hover:bg-amber-300 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 text-xs font-extrabold cursor-pointer touch-none"
          >
            Especial ({kSp})
          </button>
          <button
            type="button"
            onClick={() => onVirtualPress(0, 'subSpecial')}
            disabled={hud.p1.meter < 50}
            className="px-2.5 min-h-11 rounded bg-rose-600 hover:bg-rose-500 disabled:bg-stone-800 disabled:text-stone-500 text-white text-xs font-bold cursor-pointer touch-none"
          >
            ↓+{kSp}
          </button>
        </div>
      </div>
    </div>
  );
}
