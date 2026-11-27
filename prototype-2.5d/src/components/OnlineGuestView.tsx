import React, { useEffect, useRef, useState } from 'react';
import type { HudSnapshot } from '../engine/GameEngine';
import type { GameSettings } from '../data/settings';
import { GuestInput } from '../services/onlineInput';
import { onlineSession } from '../services/online';
import { FightHud } from './FightHud';

interface OnlineGuestViewProps {
  stream: MediaStream | null;
  hud: HudSnapshot | null;
  settings: GameSettings;
  pingMs: number | null;
  rematch: { me: boolean; peer: boolean };
  hostNick: string;
  onToggleMute: () => void;
  onMenu: () => void;
}

/** Tela do convidado: o vídeo da luta que o anfitrião transmite + o placar e os comandos locais. */
export function OnlineGuestView({ stream, hud, settings, pingMs, rematch, hostNick, onToggleMute, onMenu }: OnlineGuestViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<GuestInput | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => setNeedsTap(true));
  }, [stream]);

  useEffect(() => {
    const input = new GuestInput(settings.keyBindings, settings.gamepadEnabled, {
      holds: (set) => onlineSession.sendHolds(set),
      press: (a) => onlineSession.sendPress(a),
    });
    inputRef.current = input;
    return () => {
      input.dispose();
      inputRef.current = null;
    };
  }, [settings.keyBindings, settings.gamepadEnabled]);

  return (
    <div className="fixed inset-0 z-10 bg-black" data-testid="online-guest-view">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" autoPlay playsInline muted />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-300">Recebendo a imagem de {hostNick}…</div>
      )}
      {needsTap && (
        <button
          type="button"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 font-display text-3xl font-extrabold text-amber-300"
          onClick={() => {
            setNeedsTap(false);
            void videoRef.current?.play();
          }}
        >
          Toque para ver a luta
        </button>
      )}
      <div className="pointer-events-none absolute bottom-[86px] left-1/2 z-30 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-stone-300">
        Online · {pingMs !== null ? `${pingMs} ms` : '—'}
      </div>
      {hud && (
        <FightHud
          hud={hud}
          gameMode="online"
          muted={settings.muted}
          hudScale={settings.hudScale}
          keyBindings={settings.keyBindings}
          touchScale={settings.touchScale}
          touchOpacity={settings.touchOpacity}
          touchLefty={settings.touchLefty}
          meSlot="p2"
          rematchState={rematch}
          onToggleMute={onToggleMute}
          onPause={onMenu}
          onSkipIntro={() => onlineSession.sendPress('light')}
          onVirtualHold={(_p, act, down) => inputRef.current?.setTouchHold(act, down)}
          onVirtualPress={(_p, act) => inputRef.current?.touchPress(act)}
          onRematch={() => onlineSession.requestRematch()}
          onBackToSelect={() => onlineSession.endFight()}
        />
      )}
    </div>
  );
}
