import React, { useEffect, useRef, useState } from 'react';

type PressAction = 'light' | 'heavy' | 'special' | 'subSpecial' | 'jump';

interface TouchControlsProps {
  meter: number;
  specialCost: number;
  scale: number;
  opacity: number;
  lefty: boolean;
  onHold: (action: string, active: boolean) => void;
  onPress: (action: PressAction) => void;
}

/**
 * Analógico virtual. Mantém o contrato usado pelos testes: role="group",
 * rótulo "Analógico virtual…" e data-active-actions com as direções ativas.
 */
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
    const radius = bounds.width / 2 - 14;
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
      .forEach((action) => (action === 'up' ? onPress('jump') : onHoldRef.current(action, true)));
    activeActions.current = nextActions;
  };

  return (
    <div
      role="group"
      aria-label="Analógico virtual: mover, pular e agachar"
      data-active-actions={activeActions.current.join(',')}
      className="ff-virtual-joystick ff-touch-stick"
      onPointerDown={(event) => {
        event.preventDefault();
        if (activePointer.current !== null) return;
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
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="ff-stick-label" style={{ top: 6 }}>PULAR</span>
      <span className="ff-stick-label" style={{ bottom: 6 }}>AGACHAR</span>
      <span className="ff-stick-label" style={{ left: 9 }}>◀</span>
      <span className="ff-stick-label" style={{ right: 9 }}>▶</span>
      <span aria-hidden="true" className="ff-stick-knob" style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
    </div>
  );
}

interface ButtonSpec {
  act: PressAction | 'guard';
  label: string;
  aria: string;
  area: string;
  tone: string;
  needsMeter?: boolean;
}

const BUTTONS: ButtonSpec[] = [
  { act: 'subSpecial', label: '↓+ESP', aria: 'Sub-especial (baixo + especial)', area: 'sub', tone: 'ff-tone-rose', needsMeter: true },
  { act: 'guard', label: 'Defesa', aria: 'Defesa', area: 'guard', tone: 'ff-tone-green' },
  { act: 'special', label: 'Especial', aria: 'Especial', area: 'special', tone: 'ff-tone-gold', needsMeter: true },
  { act: 'jump', label: 'Pulo', aria: 'Pulo', area: 'jump', tone: 'ff-tone-violet' },
  { act: 'heavy', label: 'Forte', aria: 'Forte', area: 'heavy', tone: 'ff-tone-orange' },
  { act: 'light', label: 'Leve', aria: 'Leve', area: 'light', tone: 'ff-tone-sky' },
];

/**
 * Controles de toque do celular/tablet. Cada dedo é acompanhado pelo pointerId:
 * dá para andar com um polegar e atacar/defender com o outro, segurar Defesa e
 * apertar outro botão, e deslizar o dedo de um botão para o vizinho.
 */
export function TouchControls({ meter, specialCost, scale, opacity, lefty, onHold, onPress }: TouchControlsProps) {
  const pointers = useRef(new Map<number, HTMLButtonElement>());
  const [down, setDown] = useState<Set<string>>(new Set());
  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;

  // soltar tudo ao desmontar (fim da luta, pausa, troca de orientação)
  useEffect(() => () => onHoldRef.current('guard', false), []);

  const syncDown = () => setDown(new Set([...pointers.current.values()].map((b) => b.dataset.act || '')));

  const press = (button: HTMLButtonElement) => {
    const act = button.dataset.act as ButtonSpec['act'];
    if (button.getAttribute('aria-disabled') === 'true') return;
    if (navigator.vibrate) navigator.vibrate(8);
    if (act === 'guard') onHold('guard', true);
    else onPress(act);
  };
  const release = (button: HTMLButtonElement) => {
    if (button.dataset.act === 'guard' && ![...pointers.current.values()].some((b) => b.dataset.act === 'guard')) {
      onHold('guard', false);
    }
  };
  const buttonAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    return (el?.closest?.('.ff-touch-actions button[data-act]') as HTMLButtonElement | null) ?? null;
  };

  return (
    <div
      className={`ff-touch-controls ${lefty ? 'is-lefty' : ''}`}
      style={{ '--touch-scale': scale, '--touch-opacity': opacity } as React.CSSProperties}
    >
      <div className="ff-touch-panel" aria-hidden="true" />
      <div className="ff-touch-stick-wrap">
        <VirtualJoystick onHold={onHold} onPress={() => onPress('jump')} />
      </div>
      <div
        className="ff-touch-actions"
        onPointerDown={(event) => {
          const button = buttonAt(event.clientX, event.clientY);
          if (!button) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, button);
          press(button);
          syncDown();
        }}
        onPointerMove={(event) => {
          const current = pointers.current.get(event.pointerId);
          if (!current) return;
          const next = buttonAt(event.clientX, event.clientY);
          if (next && next !== current) {
            // deslizar para o botão vizinho aciona o novo (estilo arcade)
            pointers.current.set(event.pointerId, next);
            release(current);
            press(next);
            syncDown();
          }
        }}
        onPointerUp={(event) => {
          const button = pointers.current.get(event.pointerId);
          if (!button) return;
          pointers.current.delete(event.pointerId);
          release(button);
          syncDown();
        }}
        onPointerCancel={(event) => {
          const button = pointers.current.get(event.pointerId);
          pointers.current.delete(event.pointerId);
          if (button) release(button);
          syncDown();
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {BUTTONS.map((b) => {
          const cost = b.act === 'special' ? specialCost : 50;
          const locked = Boolean(b.needsMeter && meter < cost);
          return (
            <button
              key={b.act}
              type="button"
              data-act={b.act}
              aria-label={b.aria}
              aria-disabled={locked}
              title={locked ? `Requer ${cost}% de energia` : undefined}
              className={`ff-touch-btn ${b.tone} ${down.has(b.act) ? 'is-down' : ''} ${locked ? 'is-locked' : ''} ${b.act === 'special' && meter >= 100 ? 'is-ready' : ''}`}
              style={{ gridArea: b.area, ...(b.act === 'special' ? { '--meter': `${Math.min(100, meter)}%` } : {}) } as React.CSSProperties}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
