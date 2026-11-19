import React, { useEffect, useRef, useState } from 'react';
import { TouchControlSettings } from '../../platform/deviceProfile';

/** Pointer capture can throw for synthetic / already-released pointers. */
function capture(el: Element, pointerId: number) {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    /* ignore */
  }
}

type TapAction = 'light' | 'heavy' | 'special' | 'subSpecial' | 'jump';

interface TouchControlsProps {
  settings: TouchControlSettings;
  specialReady: boolean;
  onHold: (action: string, active: boolean) => void;
  onPress: (action: TapAction) => void;
}

/**
 * Touch-first controls. Every control owns its own pointer (pointer capture),
 * so a thumb on the stick and another on an attack button never interfere:
 * movement + attack at the same time, plus any combination of buttons.
 */
function Stick({
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

  const releaseAll = () => {
    activeActions.current
      .filter((action) => action !== 'up')
      .forEach((action) => onHoldRef.current(action, false));
    activeActions.current = [];
    activePointer.current = null;
    setStick({ x: 0, y: 0 });
  };

  // Never leave a direction stuck if the HUD unmounts mid-touch.
  useEffect(() => () => {
    activeActions.current
      .filter((action) => action !== 'up')
      .forEach((action) => onHoldRef.current(action, false));
  }, []);

  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width / 2 - 12;
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, radius / length);
    const x = dx * k;
    const y = dy * k;
    setStick({ x, y });

    const next: string[] = [];
    if (x < -radius * 0.22) next.push('left');
    if (x > radius * 0.22) next.push('right');
    if (y < -radius * 0.35) next.push('up');
    if (y > radius * 0.35) next.push('down');
    activeActions.current
      .filter((a) => !next.includes(a) && a !== 'up')
      .forEach((a) => onHoldRef.current(a, false));
    next
      .filter((a) => !activeActions.current.includes(a))
      .forEach((a) => (a === 'up' ? onPress('jump') : onHoldRef.current(a, true)));
    activeActions.current = next;
  };

  return (
    <div
      role="group"
      aria-label="Analógico virtual: mover, pular e agachar"
      data-active-actions={activeActions.current.join(',')}
      className="relative shrink-0 grid place-items-center rounded-full border border-white/25 bg-stone-950/70 shadow-lg touch-none select-none"
      style={{ width: 'calc(7.25rem * var(--ff-tc))', height: 'calc(7.25rem * var(--ff-tc))' }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        activePointer.current = event.pointerId;
        capture(event.currentTarget, event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) update(event);
      }}
      onPointerUp={(event) => {
        if (activePointer.current === event.pointerId) releaseAll();
      }}
      onPointerCancel={releaseAll}
      onLostPointerCapture={releaseAll}
    >
      <span className="absolute text-[0.55rem] font-bold tracking-wide text-stone-400" style={{ top: 6 }}>PULAR</span>
      <span className="absolute text-[0.55rem] font-bold tracking-wide text-stone-400" style={{ bottom: 6 }}>AGACHAR</span>
      <span className="absolute text-xs text-stone-400" style={{ left: 8 }}>◀</span>
      <span className="absolute text-xs text-stone-400" style={{ right: 8 }}>▶</span>
      <span
        aria-hidden="true"
        className="rounded-full border border-amber-200/60 bg-amber-400/90 shadow-[0_2px_12px_rgba(251,191,36,0.35)] pointer-events-none"
        style={{
          width: 'calc(3.1rem * var(--ff-tc))',
          height: 'calc(3.1rem * var(--ff-tc))',
          transform: `translate(${stick.x}px, ${stick.y}px)`,
        }}
      />
    </div>
  );
}

function TouchButton({
  label,
  className,
  disabled,
  onDown,
  onUp,
}: {
  label: string;
  className: string;
  disabled?: boolean;
  onDown: () => void;
  /** Present for hold buttons (Defesa); absent for tap buttons. */
  onUp?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const down = useRef(false);

  const release = () => {
    if (!down.current) return;
    down.current = false;
    setPressed(false);
    onUp?.();
  };

  useEffect(() => () => {
    if (down.current) onUp?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      data-pressed={pressed}
      className={`ff-touch-btn rounded-xl border border-white/25 font-bold text-xs shadow-md transition-[filter,transform] duration-75 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        if (disabled) return;
        if (onUp) {
          // Hold button (Defesa): pressed until this pointer is released.
          if (down.current) return;
          down.current = true;
          setPressed(true);
          capture(event.currentTarget, event.pointerId);
          onDown();
        } else {
          // Tap button: every touch is a fresh press, even rapid re-taps.
          setPressed(true);
          onDown();
          window.setTimeout(() => setPressed(false), 90);
        }
      }}
      onPointerUp={onUp ? release : undefined}
      onPointerCancel={onUp ? release : undefined}
      onLostPointerCapture={onUp ? release : undefined}
      // Keyboard / assistive-tech activation (a real pointer click has detail > 0).
      onClick={(event) => {
        if (event.detail === 0 && !disabled) {
          onDown();
          onUp?.();
        }
      }}
    >
      {label}
    </button>
  );
}

export function TouchControls({ settings, specialReady, onHold, onPress }: TouchControlsProps) {
  const style = {
    '--ff-touch-scale': settings.scale,
    opacity: settings.opacity,
  } as React.CSSProperties;

  const stick = <Stick onHold={onHold} onPress={onPress} />;
  const buttons = (
    <div
      className="grid grid-cols-3 gap-2 content-end"
      style={{ gridAutoRows: 'calc(3.4rem * var(--ff-tc))' }}
    >
      <TouchButton label="Leve" className="bg-sky-600 text-white" onDown={() => onPress('light')} />
      <TouchButton label="Forte" className="bg-orange-600 text-white" onDown={() => onPress('heavy')} />
      <TouchButton label="Pular" className="bg-stone-700 text-white" onDown={() => onPress('jump')} />
      <TouchButton
        label="Especial"
        disabled={!specialReady}
        className="bg-amber-400 text-stone-950 disabled:bg-stone-800 disabled:text-stone-500"
        onDown={() => onPress('special')}
      />
      <TouchButton
        label="Sub ↓"
        disabled={!specialReady}
        className="bg-rose-600 text-white disabled:bg-stone-800 disabled:text-stone-500"
        onDown={() => onPress('subSpecial')}
      />
      <TouchButton
        label="Defesa"
        className="bg-indigo-600 text-white"
        onDown={() => onHold('guard', true)}
        onUp={() => onHold('guard', false)}
      />
    </div>
  );

  return (
    <div
      className={`ff-touch-controls w-full flex items-end justify-between gap-3 pointer-events-auto ${
        settings.leftHanded ? 'flex-row-reverse' : ''
      }`}
      style={style}
    >
      {stick}
      {buttons}
    </div>
  );
}
