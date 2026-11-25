import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FIGHTER_LIST } from '../../data/fighters';
import { soundEngine } from '../../engine/audio';

const SEEN_KEY = 'ff-intro-seen';

/** A abertura aparece uma vez por sessão; testes automatizados pulam direto para o menu. */
export function shouldShowBootIntro(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
    if (new URLSearchParams(window.location.search).has('nointro')) return false;
    return sessionStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

/**
 * Abertura do jogo: cartela de apresentação, desfile rápido do elenco,
 * entrada do logo com clarão e "Pressione qualquer tecla".
 * Qualquer tecla, clique ou toque fecha (e libera o áudio do navegador).
 */
export function BootIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'studio' | 'cast' | 'logo' | 'press' | 'out'>('studio');
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* sem storage: só não lembra */
    }
    soundEngine.playUi('select');
    setPhase('out');
    window.setTimeout(onDone, 420);
  }, [onDone]);

  useEffect(() => {
    const t = [
      window.setTimeout(() => setPhase('cast'), 1500),
      window.setTimeout(() => {
        setPhase('logo');
        soundEngine.playSpecial();
      }, 3900),
      window.setTimeout(() => setPhase('press'), 5000),
    ];
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // captura antes do menu: a tecla que fecha a abertura não pode escolher um modo
      e.preventDefault();
      e.stopImmediatePropagation();
      finish();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [finish]);

  const showLogo = phase === 'logo' || phase === 'press' || phase === 'out';

  return (
    <div
      className={`ff-boot ${phase === 'out' ? 'is-out' : ''}`}
      role="dialog"
      aria-label="Abertura do Família Fighter"
      onPointerDown={finish}
    >
      {phase === 'studio' && (
        <div className="ff-boot-studio">
          <span>Uma produção da família</span>
          <strong>CAR0NENE GAMES</strong>
        </div>
      )}

      {phase === 'cast' && (
        <div className="ff-boot-cast" aria-hidden>
          {FIGHTER_LIST.map((f, i) => (
            <div
              key={f.id}
              className="ff-boot-cast-cut"
              style={{ animationDelay: `${i * 0.26}s`, ['--ff-accent' as string]: f.accentHex }}
            >
              <img src={f.portraitUrl} alt="" draggable={false} />
              <span>{f.name}</span>
            </div>
          ))}
        </div>
      )}

      {showLogo && (
        <div className="ff-boot-logo">
          <div className="ff-boot-flash" />
          <h1>
            <span>FAMÍLIA</span>
            <span>FIGHTER</span>
          </h1>
          <p>A briga mais amada da família</p>
          {phase !== 'logo' && <div className="ff-boot-press">Pressione qualquer tecla</div>}
        </div>
      )}

      <button type="button" className="ff-boot-skip" onClick={finish}>
        Pular
      </button>
    </div>
  );
}
