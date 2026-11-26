import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FastForward, X } from 'lucide-react';
import { assetUrl } from '../assetUrl';
import { FIGHTERS } from '../data/fighters';
import { SPEAKER_NAME, STORY_TITLE, type StoryChapter } from '../data/story';

/**
 * Quadrinho animado: cada quadro entra com um movimento de câmera (zoom, pan, tremida) e as falas
 * aparecem em balões, uma por vez, junto com a voz. Toque/Enter adianta a fala; "Pular" encerra a cena.
 */
export function StoryPlayer({
  chapter,
  volume,
  onDone,
  onExit,
}: {
  chapter: StoryChapter;
  volume: number;
  onDone: () => void;
  onExit: () => void;
}) {
  const [panel, setPanel] = useState(-1); // -1 = cartela do capítulo
  const [line, setLine] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  const stopAudio = () => {
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.pause();
    }
    audioRef.current = null;
  };

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimer();
    stopAudio();
    onDone();
  }, [onDone]);

  const advance = useCallback(() => {
    clearTimer();
    stopAudio();
    if (panel < 0) {
      setPanel(0);
      setLine(0);
      return;
    }
    const p = chapter.panels[panel];
    if (line + 1 < p.lines.length) setLine(line + 1);
    else if (panel + 1 < chapter.panels.length) {
      setPanel(panel + 1);
      setLine(0);
    } else finish();
  }, [panel, line, chapter, finish]);

  // cartela do capítulo
  useEffect(() => {
    if (panel !== -1) return;
    timerRef.current = window.setTimeout(advance, 1900);
    return clearTimer;
  }, [panel, advance]);

  // fala atual: toca a voz e segue sozinha quando termina
  useEffect(() => {
    if (panel < 0) return;
    const l = chapter.panels[panel]?.lines[line];
    if (!l) return;
    const a = new Audio(assetUrl(`/assets/voice/story/${l.clip}.mp3`));
    a.volume = Math.max(0, Math.min(1, volume));
    audioRef.current = a;
    const next = (ms: number) => {
      clearTimer();
      timerRef.current = window.setTimeout(advance, ms);
    };
    a.onended = () => next(450);
    // sem som (mudo/bloqueado): tempo de leitura
    const readMs = 1200 + l.text.length * 55;
    if (volume <= 0) next(readMs);
    else
      a.play().catch(() => {
        next(readMs);
      });
    return () => {
      clearTimer();
      a.onended = null;
      a.pause();
    };
  }, [panel, line, chapter, volume, advance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        finish();
      } else if (['Enter', 'Space', 'KeyJ', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, finish]);

  useEffect(() => () => { clearTimer(); stopAudio(); }, []);

  const p = panel >= 0 ? chapter.panels[panel] : null;
  const l = p?.lines[line];
  const accent = l && l.who !== 'narrador' ? FIGHTERS[l.who].accentHex : '#fbbf24';

  return (
    <div className="ff-story fixed inset-0 z-40 bg-black select-none" role="dialog" aria-label={`${STORY_TITLE}: ${chapter.title}`} onClick={advance}>
      {panel < 0 ? (
        <div className="ff-story-card absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="text-amber-300 font-bold tracking-[0.35em] text-xs uppercase">{STORY_TITLE}</div>
          <div className="font-display font-extrabold text-white text-5xl md:text-7xl mt-2">{chapter.title}</div>
          <div className="text-stone-300 text-lg md:text-2xl mt-2 italic">{chapter.subtitle}</div>
        </div>
      ) : (
        p && (
          <>
            <div key={panel} className={`ff-story-panel absolute inset-0 overflow-hidden motion-${p.motion}`}>
              <img src={assetUrl(`/assets/story/${p.img}.webp`)} alt="" draggable={false} className="w-full h-full object-cover" />
              <div className="ff-story-vignette absolute inset-0 pointer-events-none" />
            </div>
            {l && (
              <div key={`${panel}-${line}`} className={`ff-story-balloon ${l.who === 'narrador' ? 'is-narrator' : ''}`} style={{ ['--ff-accent' as string]: accent }} aria-live="polite">
                {l.who !== 'narrador' && <div className="ff-story-who">{SPEAKER_NAME[l.who]}</div>}
                <div className="ff-story-text">{l.text}</div>
              </div>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
              {chapter.panels.map((_, i) => (
                <i key={i} className={`block w-2 h-2 rounded-full ${i === panel ? 'bg-amber-300' : 'bg-white/30'}`} />
              ))}
            </div>
          </>
        )
      )}
      <div className="absolute top-3 right-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={finish} className="h-9 px-3 rounded-md bg-black/60 border border-white/20 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer" aria-label="Pular cena (Esc)">
          <FastForward className="w-4 h-4" /> Pular
        </button>
        <button type="button" onClick={onExit} className="w-9 h-9 rounded-md bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer" aria-label="Sair do modo história">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
