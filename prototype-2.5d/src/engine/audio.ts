import { StageId } from '../data/stages';
import { assetUrl } from '../assetUrl';

export type MusicTrackId = 'theme' | 'ff2' | 'ff3';

export type AnnouncerKey =
  | 'round_1'
  | 'round_2'
  | 'round_3'
  | 'final_round'
  | 'fight'
  | 'combo'
  | 'time'
  | 'you_win'
  | 'you_lose'
  | 'tie';

export const STAGE_MUSIC: Record<StageId, MusicTrackId> = {
  padaria: 'theme',
  quintal: 'ff3',
  festa: 'ff2',
  bar: 'ff2',
  praia: 'ff3',
};

const TRACK_PATHS: Record<MusicTrackId, string> = {
  theme: assetUrl('/assets/music/bolo-da-juraci'),
  ff2: assetUrl('/assets/music/family-fighter-2'),
  ff3: assetUrl('/assets/music/family-fighter-3'),
};

/** Efeitos de impacto reais (ElevenLabs Sound Effects), em public/assets/sfx/<nome>.mp3. */
const SFX_SAMPLES = ['hit_light', 'hit_heavy', 'kick', 'block', 'whoosh_light', 'whoosh_heavy', 'fall'] as const;
type SfxSample = (typeof SFX_SAMPLES)[number];

const CLIPS: Record<string, Record<string, string>> = {
  davi: {
    outra: assetUrl('/assets/voice/davi-outra.wav'),
    preguica: assetUrl('/assets/voice/davi-preguica.wav'),
    videogame: assetUrl('/assets/voice/davi-videogame.wav'),
  },
  franciely: {
    isso: assetUrl('/assets/voice/franciely-isso.mp3'),
    ferrinho: assetUrl('/assets/voice/franciely-ferrinho.mp3'),
    desarma: assetUrl('/assets/voice/franciely-desarma.mp3'),
    montar: assetUrl('/assets/voice/franciely-montar.mp3'),
    cuidar: assetUrl('/assets/voice/generated/franciely-cuidar-e-lutar.mp3'),
  },
  pedro: {
    combo: assetUrl('/assets/voice/pedro-domingo.mp3'),
    drink: assetUrl('/assets/voice/pedro-cerveja.mp3'),
    fumaBebe: assetUrl('/assets/voice/generated/pedro-fuma-bebe-vence.mp3'),
  },
  daniel: {
    praia: assetUrl('/assets/voice/daniel-praia.mp3'),
    preparativos: assetUrl('/assets/voice/generated/daniel-preparativos-praia.mp3'),
  },
  gabi: {
    sing: assetUrl('/assets/voice/gabi-canto.mp3'),
    amor: assetUrl('/assets/voice/generated/gabi-amor-e-luta.mp3'),
  },
  dada: {
    reply: assetUrl('/assets/voice/generated/dada-aviso-chao-molhado.mp3'),
  },
  juraci: {
    cozinha: assetUrl('/assets/voice/generated/juraci-mandando-na-cozinha.mp3'),
  },
  carlos: {
    pizzaAmor: assetUrl('/assets/voice/generated/carlos-pedido-de-pizza-com-amor.mp3'),
  },
  paula: {
    lunch: assetUrl('/assets/voice/generated/paula-super-almoco.mp3'),
    bar: assetUrl('/assets/voice/generated/paula-bar-simone.mp3'),
  },
  tainara: {
    trabalho: assetUrl('/assets/voice/tainara-trabalho.mp3'),
    cuidado: assetUrl('/assets/voice/generated/tainara-cuidado-em-dobro.mp3'),
    arroz: assetUrl('/assets/voice/generated/tainara-poder-do-arroz.mp3'),
    danielTrabalhar: assetUrl('/assets/voice/generated/tainara-daniel-indo-trabalhar.mp3'),
  },
  cao: {
    lick: assetUrl('/assets/voice/generated/cao-lambida-poderosa.mp3'),
    protect: assetUrl('/assets/voice/generated/cao-amigo-protetor.mp3'),
  },
  narrator: {
    victory: assetUrl('/assets/voice/narrator/vitoria-na-luta.mp3'),
  },
};

/** Falas do elenco por momento da luta (ElevenLabs, normalizadas em -16 LUFS). */
export type CastVoiceEvent = 'select' | 'intro' | 'special' | 'subSpecial' | 'win' | 'ko';

const CAST_IDS = ['juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi'];
const CAST_FILES: Record<CastVoiceEvent, string> = {
  select: 'select',
  intro: 'intro',
  special: 'special',
  subSpecial: 'sub_special',
  win: 'win',
  ko: 'ko',
};

for (const id of CAST_IDS) {
  const clips = (CLIPS[id] ??= {});
  for (const [event, file] of Object.entries(CAST_FILES)) {
    clips[`cast_${event}`] = assetUrl(`/assets/voice/elenco/${id}/${file}.mp3`);
  }
}

/** Chave da fala do elenco para usar em playClip(id, castKey(evento)). */
export const castKey = (event: CastVoiceEvent) => `cast_${event}`;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private masterVolume = 0.9;
  private musicVolume = 0.75;
  private sfxVolume = 0.85;
  private voiceVolume = 0.95;
  private opusSupported: boolean | null = null;

  private musicPlayers: Partial<Record<MusicTrackId, HTMLAudioElement>> = {};
  private currentTrack: MusicTrackId | null = null;
  private trackLevel = 1;
  private musicPaused = false;
  private activeVoices = new Set<HTMLAudioElement>();
  private currentAnnouncer: HTMLAudioElement | null = null;
  private currentDaviVoice: HTMLAudioElement | null = null;
  private lastVoiceTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => this.resumeBlocked();
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  public setVolumes(opts: {
    masterVolume?: number;
    musicVolume?: number;
    sfxVolume?: number;
    voiceVolume?: number;
    muted?: boolean;
  }) {
    if (typeof opts.masterVolume === 'number') this.masterVolume = Math.max(0, Math.min(1, opts.masterVolume));
    if (typeof opts.musicVolume === 'number') this.musicVolume = Math.max(0, Math.min(1, opts.musicVolume));
    if (typeof opts.sfxVolume === 'number') this.sfxVolume = Math.max(0, Math.min(1, opts.sfxVolume));
    if (typeof opts.voiceVolume === 'number') this.voiceVolume = Math.max(0, Math.min(1, opts.voiceVolume));
    if (typeof opts.muted === 'boolean') {
      this.setMuted(opts.muted);
    }
    this.applyMusicVolume();
    this.applySfxVolume();
  }

  private applySfxVolume() {
    if (!this.sfxGain || !this.ctx) return;
    const target = this.muted ? 0 : this.masterVolume * this.sfxVolume;
    this.sfxGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
  }

  private getSfxDest(): AudioNode | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    if (!this.sfxGain) {
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this.muted ? 0 : this.masterVolume * this.sfxVolume;
      this.sfxGain.connect(ctx.destination);
    }
    return this.sfxGain;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private canPlayOpus(): boolean {
    if (this.opusSupported !== null) return this.opusSupported;
    try {
      const probe = document.createElement('audio');
      this.opusSupported = Boolean(probe.canPlayType('audio/mp4; codecs="opus"'));
    } catch {
      this.opusSupported = false;
    }
    return this.opusSupported;
  }

  private getOrCreateTrack(track: MusicTrackId): HTMLAudioElement {
    const existing = this.musicPlayers[track];
    if (existing) return existing;

    const el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    const ext = this.canPlayOpus() ? 'm4a' : 'mp3';
    el.src = `${TRACK_PATHS[track]}.${ext}`;
    el.addEventListener('error', () => {
      if (el.src.endsWith('.m4a')) {
        el.src = `${TRACK_PATHS[track]}.mp3`;
        el.load();
        if (this.currentTrack === track && !this.musicPaused && !this.muted) {
          el.play().catch(() => {});
        }
      }
    });
    this.musicPlayers[track] = el;
    return el;
  }

  private applyMusicVolume() {
    if (!this.currentTrack) return;
    const el = this.musicPlayers[this.currentTrack];
    if (!el) return;
    const eff = this.muted ? 0 : 0.42 * this.trackLevel * this.masterVolume * this.musicVolume;
    el.volume = Math.max(0, Math.min(1, eff));
  }

  private resumeBlocked() {
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
    if (this.currentTrack && !this.musicPaused && !this.muted) {
      const el = this.musicPlayers[this.currentTrack];
      if (el && el.paused) {
        this.applyMusicVolume();
        el.play().catch(() => {});
      }
    }
  }

  startMusic(track: MusicTrackId = 'theme', level = 1) {
    if (typeof window === 'undefined') return;
    this.trackLevel = level;
    if (this.currentTrack === track) {
      this.applyMusicVolume();
      const el = this.musicPlayers[track];
      if (el && el.paused && !this.musicPaused && !this.muted) {
        el.play().catch(() => {});
      }
      return;
    }

    if (this.currentTrack) {
      const prev = this.musicPlayers[this.currentTrack];
      if (prev) prev.pause();
    }

    this.currentTrack = track;
    this.musicPaused = false;
    const el = this.getOrCreateTrack(track);
    try {
      el.currentTime = 0;
    } catch {
      // Ignore if metadata not yet loaded
    }
    this.applyMusicVolume();
    if (!this.muted) {
      el.play().catch(() => {});
    }
  }

  pauseMusic(paused: boolean) {
    this.musicPaused = paused;
    if (!this.currentTrack) return;
    const el = this.musicPlayers[this.currentTrack];
    if (!el) return;
    if (paused || this.muted) {
      el.pause();
    } else {
      this.applyMusicVolume();
      el.play().catch(() => {});
    }
  }

  stopMusic() {
    if (this.currentTrack) {
      const el = this.musicPlayers[this.currentTrack];
      if (el) el.pause();
    }
    this.currentTrack = null;
    this.musicPaused = false;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopAllVoices();
      if (this.currentTrack) {
        this.musicPlayers[this.currentTrack]?.pause();
      }
    } else {
      this.resumeBlocked();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  stopAllVoices() {
    if (this.currentAnnouncer) {
      this.currentAnnouncer.pause();
      this.currentAnnouncer.src = '';
      this.currentAnnouncer = null;
    }
    for (const v of this.activeVoices) {
      v.pause();
      v.src = '';
    }
    this.activeVoices.clear();
    this.currentDaviVoice = null;
  }

  private playVoiceFile(url: string, volume = 0.85, isAnnouncer = false): HTMLAudioElement | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (this.currentDaviVoice && this.activeVoices.has(this.currentDaviVoice)) return null;
    const scaledVol = Math.max(0, Math.min(1, volume * this.masterVolume * this.voiceVolume));
    if (scaledVol <= 0.005) return null;

    if (isAnnouncer && this.currentAnnouncer) {
      this.currentAnnouncer.pause();
      this.currentAnnouncer.src = '';
      this.activeVoices.delete(this.currentAnnouncer);
      this.currentAnnouncer = null;
    }

    const el = new Audio(url);
    el.preload = 'auto';
    el.volume = scaledVol;
    this.activeVoices.add(el);
    if (isAnnouncer) this.currentAnnouncer = el;

    const cleanup = () => {
      if (this.currentAnnouncer === el) this.currentAnnouncer = null;
      if (!this.activeVoices.delete(el)) return;
      el.onended = null;
      el.onerror = null;
    };
    el.onended = cleanup;
    el.onerror = cleanup;
    setTimeout(cleanup, 12000);
    el.play().catch(cleanup);
    return el;
  }

  private preloaded = new Set<string>();

  /** Baixa antes da luta as falas dos lutadores, para tocarem sem atraso. */
  preloadFighterVoices(ids: string[]) {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    for (const id of ids) {
      for (const url of Object.values(CLIPS[id] ?? {})) {
        if (this.preloaded.has(url)) continue;
        this.preloaded.add(url);
        fetch(url).catch(() => this.preloaded.delete(url));
      }
    }
  }

  playAnnouncer(key: AnnouncerKey) {
    this.playVoiceFile(assetUrl(`/assets/voice/arcade/${key}.ogg`), 0.94, true);
  }

  playClip(who: string, key: string, throttleMs = 700, replacePrevious = false) {
    const url = CLIPS[who]?.[key];
    if (!url) return;
    if (this.currentDaviVoice && this.activeVoices.has(this.currentDaviVoice)) return;
    const now = performance.now();
    if (who !== 'narrator' && now - this.lastVoiceTime < throttleMs) return;
    if (who === 'davi' && this.activeVoices.size > 0) return;
    this.lastVoiceTime = now;
    if (replacePrevious) {
      for (const v of this.activeVoices) {
        if (v !== this.currentAnnouncer) {
          v.pause();
          v.src = '';
          this.activeVoices.delete(v);
        }
      }
    }
    const voice = this.playVoiceFile(url, who === 'narrator' ? 0.92 : 0.86, who === 'narrator');
    if (who === 'davi') this.currentDaviVoice = voice;
  }

  playUi(type: 'hover' | 'confirm' | 'select' = 'confirm') {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === 'hover' ? 'sine' : 'triangle';
    const startFreq = type === 'hover' ? 520 : type === 'select' ? 620 : 440;
    const endFreq = type === 'hover' ? 640 : type === 'select' ? 880 : 660;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private samples = new Map<SfxSample, AudioBuffer>();
  private samplesLoading: Promise<void> | null = null;
  private hitAlt = false;

  /** Baixa e decodifica os efeitos de impacto (uma vez). Chamado no início da luta. */
  preloadSfx(): Promise<void> {
    if (this.samplesLoading) return this.samplesLoading;
    const ctx = this.ensureContext();
    if (!ctx || typeof fetch !== 'function') return Promise.resolve();
    this.samplesLoading = Promise.all(
      SFX_SAMPLES.map(async (name) => {
        try {
          const res = await fetch(assetUrl(`/assets/sfx/${name}.mp3`));
          if (!res.ok) return;
          this.samples.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // sem a amostra, fica o som sintetizado
        }
      })
    ).then(() => undefined);
    return this.samplesLoading;
  }

  /** Toca uma amostra; devolve false se ela ainda não está pronta (aí usa-se o sintetizado). */
  private playSample(name: SfxSample, gain = 1, rate = 1): boolean {
    const buf = this.samples.get(name);
    const ctx = this.ctx;
    const dest = this.getSfxDest();
    if (!buf || !ctx || !dest) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.95 + Math.random() * 0.1);
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(dest);
    src.start();
    return true;
  }

  playHit(heavy = false, blocked = false) {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    this.hitAlt = !this.hitAlt;
    const sample: SfxSample = blocked ? 'block' : heavy ? 'hit_heavy' : this.hitAlt ? 'hit_light' : 'kick';
    if (this.playSample(sample, blocked ? 0.8 : heavy ? 1 : 0.85)) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = blocked ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(blocked ? 260 : heavy ? 175 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(blocked ? 110 : 42, now + (heavy ? 0.18 : 0.11));
    gain.gain.setValueAtTime(blocked ? 0.14 : heavy ? 0.32 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.2 : 0.12));
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.21);

    const dur = heavy ? 0.14 : 0.08;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.35));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = blocked ? 'highpass' : 'bandpass';
    filter.frequency.value = blocked ? 1400 : heavy ? 700 : 1050;
    const ngain = ctx.createGain();
    ngain.gain.setValueAtTime(blocked ? 0.12 : heavy ? 0.26 : 0.16, now);
    ngain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(filter).connect(ngain).connect(dest);
    noise.start(now);
  }

  playSwing(heavy = false) {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    if (this.playSample(heavy ? 'whoosh_heavy' : 'whoosh_light', 0.55)) return;
    const now = ctx.currentTime;
    const dur = heavy ? 0.16 : 0.09;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(heavy ? 360 : 620, now);
    filter.frequency.exponentialRampToValueAtTime(heavy ? 180 : 300, now + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter).connect(gain).connect(dest);
    src.start(now);
  }

  playJump() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playSpecial() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const freqs = [330, 440, 554.37, 659.25];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t0 = now + idx * 0.04;
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 1.4, t0 + 0.22);
      gain.gain.setValueAtTime(0.07, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(gain).connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  playDaviSpecial(kind: 'hearts' | 'purple' | 'final') {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const freqs = kind === 'hearts' ? [440, 554, 660] : kind === 'purple' ? [160, 240, 360] : [220, 330, 660];
    freqs.forEach((frequency, index) => {
      const start = ctx.currentTime + index * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'final' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(frequency * (kind === 'final' ? 0.55 : 1.6), start + 0.25);
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(gain).connect(dest);
      osc.start(start);
      osc.stop(start + 0.31);
    });
  }

  playTransform() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.36);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  playSplash() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const dur = 0.28;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.45));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter).connect(gain).connect(dest);
    src.start(now);
  }

  playBite() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.07);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playBless() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [784, 988, 1175, 1568].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + i * 0.06;
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.1, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.36);
      osc.connect(gain).connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.38);
    });
  }

  playCountdown() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.07);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playRoundBell() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [523, 784].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + i * 0.12;
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.15, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc.connect(gain).connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  playFightBell() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [392, 523, 784].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + i * 0.09;
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.17, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(gain).connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  playKO() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    if (this.samples.has('fall')) setTimeout(() => this.playSample('fall', 0.9), 380);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.65);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  playVictory() {
    const ctx = this.ensureContext();
    const dest = this.getSfxDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.09;
      osc.frequency.setValueAtTime(n, t0);
      gain.gain.setValueAtTime(0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      osc.connect(gain).connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }
}

export const soundEngine = new SoundEngine();
