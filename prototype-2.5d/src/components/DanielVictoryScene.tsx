import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { assetUrl } from '../assetUrl';

export function DanielVictoryScene() {
  const [muted, setMuted] = useState(true);
  const [videoUnavailable, setVideoUnavailable] = useState(false);

  return (
    <section aria-label="Cena de vitória imaginada por Daniel" className="w-full">
      <div className="relative overflow-hidden rounded-lg border border-pink-300/35 bg-black shadow-[0_0_30px_rgba(236,72,153,0.2)]">
        {videoUnavailable ? (
          <img
            src={assetUrl('/assets/portraits/daniel.webp')}
            alt="Daniel imaginando a vitória"
            className="ff-daniel-victory-video mx-auto block object-contain"
          />
        ) : (
          <video
            autoPlay
            loop
            muted={muted}
            playsInline
            controls
            poster={assetUrl('/assets/videos/daniel-victory-poster.webp')}
            onError={() => setVideoUnavailable(true)}
            className="ff-daniel-victory-video mx-auto block object-contain"
          >
            <source src={assetUrl('/assets/videos/daniel-victory-imagined.mp4')} type="video/mp4" />
          </video>
        )}
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-pink-300/40 bg-stone-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-200 sm:left-3 sm:top-3 sm:text-xs">
          Na imaginação do Daniel
        </div>
      </div>
      <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
        <p className="text-left text-[10px] text-stone-400 sm:text-xs">
          {videoUnavailable ? 'Exibindo o retrato enquanto o vídeo não carrega.' : 'Cena especial de vitória'}
        </p>
        {!videoUnavailable && (
          <button
            type="button"
            aria-label={muted ? 'Ativar áudio do vídeo' : 'Silenciar vídeo'}
            onClick={() => setMuted((value) => !value)}
            className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-stone-900 px-2.5 text-[10px] font-semibold text-stone-100 hover:border-pink-300/60 sm:text-xs"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {muted ? 'Ativar som' : 'Silenciar'}
          </button>
        )}
      </div>
    </section>
  );
}
