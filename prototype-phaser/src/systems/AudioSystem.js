import { ANNOUNCER_CUES, CHARACTER_VOICES, SPECIAL_AUDIO } from '../data/audio.js';

const BASE_URL = import.meta.env?.BASE_URL || './';
const AUDIO_CHANNELS = ['music', 'sfx', 'characterVoice', 'announcer'];
const VOICE_LIMITS = { character: 2, announcer: 1 };

export class AudioSystem {
  constructor() {
    this.context = null;
    this.effectsBus = null;
    this.noiseBuffer = null;
    this.music = null;
    this.musicTrack = 'music/family-fighter-2.mp3';
    this.requestedMusic = null;
    this.musicGeneration = 0;
    this.musicPlayers = new Set();
    this.voicePlayers = { character: new Set(), announcer: new Set() };
    this.voiceCooldowns = new Map();
    this.activeUtterance = null;
    this.fadeTimers = new Set();
    this.volumes = { music: 0.28, sfx: 0.75, characterVoice: 0.82, announcer: 0.95 };
    this.muted = { music: false, sfx: false, characterVoice: false, announcer: false };
    this.warned = new Set();
  }

  asset(path) {
    return new URL(`${BASE_URL}assets/${path}`, window.location.href).href;
  }

  unlock() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      if (!this.context) {
        this.context = new AudioContext();
        this.effectsBus = this.context.createGain();
        this.effectsBus.gain.value = this.muted.sfx ? 0 : this.volumes.sfx;
        this.effectsBus.connect(this.context.destination);
        this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const samples = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') {
        this.context.resume().catch(error => {
          this.warnOnce('context-resume', 'AudioContext não pôde ser retomado.', error);
        });
      }
      return true;
    } catch (error) {
      this.warnOnce('context-create', 'Áudio sintetizado indisponível; a luta continuará sem efeitos.', error);
      return false;
    }
  }

  startMusic(track = this.musicTrack, { fadeMs = 400 } = {}) {
    if (typeof track !== 'string' || !track) throw new TypeError('A faixa de música precisa ter um caminho.');
    this.musicTrack = track;
    if (this.requestedMusic === track) return Promise.resolve(true);

    this.requestedMusic = track;
    const generation = ++this.musicGeneration;
    let player;
    try {
      player = new window.Audio(this.asset(track));
    } catch (error) {
      if (this.requestedMusic === track) this.requestedMusic = null;
      this.warnOnce(`music-create:${track}`, `Música indisponível: ${track}`, error);
      return Promise.resolve(false);
    }
    player.loop = true;
    player.preload = 'auto';
    player.volume = 0;
    this.musicPlayers.add(player);

    if (this.muted.music) {
      this.fadeMusicOut(this.music, fadeMs);
      this.music = player;
      return Promise.resolve(true);
    }

    let playPromise;
    try {
      playPromise = player.play();
    } catch (error) {
      playPromise = Promise.reject(error);
    }
    return Promise.resolve(playPromise).then(() => {
      if (generation !== this.musicGeneration) {
        this.disposeMusicPlayer(player);
        return false;
      }
      const previous = this.music;
      this.music = player;
      if (this.muted.music) {
        player.pause();
        player.volume = 0;
      } else {
        this.fadeMusicIn(player, fadeMs);
      }
      if (previous && previous !== player) this.fadeMusicOut(previous, fadeMs);
      return true;
    }).catch(error => {
      this.disposeMusicPlayer(player);
      if (generation === this.musicGeneration) this.requestedMusic = null;
      this.warnOnce(`music-play:${track}`, `Não foi possível reproduzir a música ${track}; a luta continuará.`, error);
      return false;
    });
  }

  fadeMusicIn(player, duration) {
    this.fade(player, this.muted.music ? 0 : this.volumes.music, duration);
  }

  fadeMusicOut(player, duration) {
    if (!player) return;
    this.fade(player, 0, duration, () => {
      this.disposeMusicPlayer(player);
      if (this.music === player) this.music = null;
    });
  }

  fade(player, target, duration, onComplete) {
    if (!player) return;
    if (duration <= 0) {
      player.volume = target;
      onComplete?.();
      return;
    }
    const initial = player.volume;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      player.volume = initial + (target - initial) * progress;
      if (progress === 1) {
        clearInterval(timer);
        this.fadeTimers.delete(timer);
        onComplete?.();
      }
    }, 16);
    this.fadeTimers.add(timer);
  }

  disposeMusicPlayer(player) {
    if (!player) return;
    player.pause();
    player.removeAttribute('src');
    player.load();
    this.musicPlayers.delete(player);
  }

  stopMusic({ fadeMs = 0 } = {}) {
    this.musicGeneration++;
    this.requestedMusic = null;
    const players = [...this.musicPlayers];
    this.music = null;
    for (const player of players) {
      if (fadeMs > 0) this.fadeMusicOut(player, fadeMs);
      else this.disposeMusicPlayer(player);
    }
  }

  toggleMusic() {
    return this.setMuted('music', !this.muted.music);
  }

  toggleEffects() {
    return this.setMuted('sfx', !this.muted.sfx);
  }

  toggleCharacterVoices() {
    return this.setMuted('characterVoice', !this.muted.characterVoice);
  }

  toggleAnnouncer() {
    return this.setMuted('announcer', !this.muted.announcer);
  }

  setMuted(channel, muted) {
    this.assertChannel(channel);
    this.muted[channel] = Boolean(muted);
    if (channel === 'sfx' && this.effectsBus) {
      this.effectsBus.gain.value = this.muted.sfx ? 0 : this.volumes.sfx;
    } else if (channel === 'music') {
      if (this.muted.music) {
        for (const player of this.musicPlayers) {
          player.pause();
          player.volume = 0;
        }
      } else if (this.music) {
        this.music.volume = this.volumes.music;
        this.playMusicElement(this.music);
      }
    } else {
      const category = channel === 'characterVoice' ? 'character' : 'announcer';
      for (const entry of this.voicePlayers[category]) {
        entry.player.volume = this.muted[channel] ? 0 : this.volumes[channel];
      }
      if (channel === 'announcer' && this.activeUtterance) {
        if (this.muted.announcer) this.activeUtterance.finish(false);
        else {
          this.activeUtterance.utterance.volume = this.volumes.announcer;
          this.activeUtterance.synthesis?.resume();
        }
      }
    }
    return !this.muted[channel];
  }

  setVolume(channel, volume) {
    this.assertChannel(channel);
    if (!Number.isFinite(volume)) throw new TypeError('O volume precisa ser um número finito.');
    this.volumes[channel] = Math.max(0, Math.min(1, volume));
    if (channel === 'sfx' && this.effectsBus) {
      this.effectsBus.gain.value = this.muted.sfx ? 0 : this.volumes.sfx;
    } else if (channel === 'music' && this.music) {
      this.music.volume = this.muted.music ? 0 : this.volumes.music;
    } else if (channel === 'characterVoice' || channel === 'announcer') {
      const category = channel === 'characterVoice' ? 'character' : 'announcer';
      for (const entry of this.voicePlayers[category]) {
        entry.player.volume = this.muted[channel] ? 0 : this.volumes[channel];
      }
      if (channel === 'announcer' && this.activeUtterance) {
        this.activeUtterance.utterance.volume = this.muted.announcer ? 0 : this.volumes.announcer;
      }
    }
    return this.volumes[channel];
  }

  assertChannel(channel) {
    if (!AUDIO_CHANNELS.includes(channel)) throw new RangeError(`Canal de áudio desconhecido: ${channel}`);
  }

  playMusicElement(player) {
    try {
      const result = player.play();
      result?.catch(error => this.warnOnce('music-resume', 'A música aguarda uma interação do usuário.', error));
    } catch (error) {
      this.warnOnce('music-resume', 'A música não pôde ser retomada.', error);
    }
  }

  resumeVoiceElement(entry) {
    try {
      const result = entry.player.play();
      result?.catch(error => {
        this.warnOnce(`voice-resume:${entry.key}`, `A fala ${entry.key} não pôde ser retomada.`, error);
      });
    } catch (error) {
      this.warnOnce(`voice-resume:${entry.key}`, `A fala ${entry.key} não pôde ser retomada.`, error);
    }
  }

  playEffect(name) {
    if (this.muted.sfx) return false;
    const patterns = {
      punch: [170, 105, 0.09, 'triangle'],
      kick: [115, 58, 0.14, 'sawtooth'],
      hit: [135, 45, 0.16, 'square'],
      block: [660, 300, 0.08, 'triangle'],
      special: [220, 880, 0.42, 'sawtooth'],
      impact: [92, 40, 0.22, 'square'],
      jump: [240, 460, 0.1, 'triangle']
    };
    const pattern = patterns[name];
    if (!pattern) return false;

    try {
      this.unlock();
      if (!this.context || !this.effectsBus) return false;
      const [startFrequency, endFrequency, duration, type] = pattern;
      const start = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(name === 'impact' ? 0.65 : 0.3, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(this.effectsBus);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
      if (name === 'hit' || name === 'special' || name === 'impact') {
        this.playNoise(name === 'special' ? 0.32 : 0.08);
      }
      return true;
    } catch (error) {
      this.warnOnce(`sfx:${name}`, `Não foi possível gerar o efeito ${name}.`, error);
      return false;
    }
  }

  playNoise(duration) {
    if (!this.context || !this.noiseBuffer || !this.effectsBus) return;
    const start = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter).connect(gain).connect(this.effectsBus);
    source.start(start);
    source.stop(start + duration);
  }

  playCharacterVoice(characterId, event, options = {}) {
    const voice = CHARACTER_VOICES[characterId]?.[event];
    if (!voice || this.muted.characterVoice) return Promise.resolve(false);
    return this.playVoiceFile(voice.clip, 'character', {
      key: `${characterId}:${event}`,
      priority: options.priority ?? 20,
      cooldownMs: options.cooldownMs ?? voice.cooldownMs ?? 2500,
      maxDurationMs: options.maxDurationMs ?? 12000,
      interruptionPolicy: options.interruptionPolicy ?? 'drop-new'
    }).then(result => result.played);
  }

  playSpecialPreparation(characterId) {
    const special = SPECIAL_AUDIO[characterId];
    if (!special) return false;
    if (special.preparationVoice) {
      void this.playCharacterVoice(characterId, special.preparationVoice, { priority: 30 });
    }
    return true;
  }

  playSpecialActivation(characterId) {
    const special = SPECIAL_AUDIO[characterId];
    if (!special) return false;
    if (special.activationVoice) {
      void this.playCharacterVoice(characterId, special.activationVoice, { priority: 30 });
    }
    if (special.activationEffect) this.playEffect(special.activationEffect);
    return true;
  }

  playSpecialImpact(characterId) {
    const special = SPECIAL_AUDIO[characterId];
    if (!special) return false;
    if (special.impactEffect) this.playEffect(special.impactEffect);
    return true;
  }

  playSpecialCompletion(characterId) {
    const special = SPECIAL_AUDIO[characterId];
    if (!special) return false;
    if (special.completionVoice) {
      void this.playCharacterVoice(characterId, special.completionVoice, { priority: 30 });
    }
    return true;
  }

  stopVoices() {
    for (const entries of Object.values(this.voicePlayers)) {
      for (const entry of [...entries]) entry.finish({ played: false, reason: 'cancelled' });
    }
    this.activeUtterance?.finish(false);
  }

  armTimeout(entry, callback, duration) {
    clearTimeout(entry.timeout);
    entry.remainingMs = duration;
    entry.deadline = Date.now() + duration;
    entry.timeout = setTimeout(callback, duration);
  }

  playAnnouncer(key, options = {}) {
    const cue = ANNOUNCER_CUES[key];
    if (!cue) {
      this.warnOnce(`announcer-key:${key}`, `Locução arcade desconhecida: ${key}`);
      return Promise.resolve(false);
    }
    if (this.muted.announcer) return Promise.resolve(false);

    const text = options.fallbackText || cue.text;
    const maxDurationMs = options.maxDurationMs ?? 2400;
    if (!cue.clip) return this.speakAnnouncer(text, { maxDurationMs, priority: options.priority ?? 100 });

    return this.playVoiceFile(cue.clip, 'announcer', {
      key,
      priority: options.priority ?? 100,
      cooldownMs: options.cooldownMs ?? 500,
      maxDurationMs,
      interruptionPolicy: options.interruptionPolicy ?? 'replace-same-priority'
    }).then(result => {
      if (result.played) return true;
      if (['error', 'play-rejected', 'timeout'].includes(result.reason)) {
        return this.speakAnnouncer(text, { maxDurationMs, priority: options.priority ?? 100 });
      }
      return false;
    });
  }

  playVoiceFile(path, category, {
    key = path,
    priority = 0,
    cooldownMs = 0,
    maxDurationMs = 12000,
    interruptionPolicy = 'drop-new'
  } = {}) {
    if (category !== 'character' && category !== 'announcer') {
      return Promise.resolve({ played: false, reason: 'invalid-channel' });
    }
    if (this.muted[category === 'character' ? 'characterVoice' : 'announcer']) {
      return Promise.resolve({ played: false, reason: 'muted' });
    }
    const cooldownKey = `${category}:${key}`;
    const now = Date.now();
    const lastPlayed = this.voiceCooldowns.get(cooldownKey);
    if (lastPlayed !== undefined && now - lastPlayed < cooldownMs) {
      return Promise.resolve({ played: false, reason: 'cooldown' });
    }
    if (category === 'announcer' && this.activeUtterance) {
      if (priority < this.activeUtterance.priority) {
        return Promise.resolve({ played: false, reason: 'priority' });
      }
      this.activeUtterance.finish(false);
    }
    const active = this.voicePlayers[category];
    if (active.size >= VOICE_LIMITS[category]) {
      const candidates = [...active].sort((a, b) => a.priority - b.priority || a.startedAt - b.startedAt);
      const victim = candidates[0];
      const canInterrupt = interruptionPolicy === 'replace-oldest'
        || (interruptionPolicy === 'replace-lower' && priority > victim.priority)
        || (interruptionPolicy === 'replace-same-priority' && priority >= victim.priority);
      if (!canInterrupt) return Promise.resolve({ played: false, reason: 'capacity' });
      victim.finish({ played: false, reason: 'interrupted' });
    }

    let player;
    try {
      player = new window.Audio(this.asset(path));
    } catch (error) {
      this.warnOnce(`voice-create:${key}`, `Não foi possível criar o áudio de voz ${key}.`, error);
      return Promise.resolve({ played: false, reason: 'error' });
    }
    player.preload = 'auto';
    player.playsInline = true;
    player.volume = this.volumes[category === 'character' ? 'characterVoice' : 'announcer'];
    const channel = category === 'character' ? 'characterVoice' : 'announcer';
    if (this.muted[channel]) player.volume = 0;

    return new Promise(resolve => {
      const entry = {
        player,
        key,
        channel,
        priority,
        startedAt: now,
        finish: result => {
          if (entry.finished) return;
          entry.finished = true;
          clearTimeout(entry.timeout);
          player.onended = null;
          player.onerror = null;
          active.delete(entry);
          player.pause();
          player.removeAttribute('src');
          player.load();
          resolve(result);
        }
      };
      active.add(entry);
      this.voiceCooldowns.set(cooldownKey, now);
      player.onended = () => entry.finish({ played: true, reason: 'ended' });
      player.onerror = () => {
        this.warnOnce(`voice-load:${key}`, `Fala indisponível: ${path}`);
        entry.finish({ played: false, reason: 'error' });
      };
      this.armTimeout(entry, () => {
        this.warnOnce(`voice-timeout:${key}`, `Fala excedeu o limite de reprodução: ${key}`);
        entry.finish({ played: false, reason: 'timeout' });
      }, maxDurationMs);
      try {
        const playPromise = player.play();
        playPromise?.catch(error => {
          this.warnOnce(`voice-play:${key}`, `Não foi possível reproduzir a fala ${key}.`, error);
          entry.finish({ played: false, reason: 'play-rejected' });
        });
      } catch (error) {
        this.warnOnce(`voice-play:${key}`, `Não foi possível reproduzir a fala ${key}.`, error);
        entry.finish({ played: false, reason: 'play-rejected' });
      }
    });
  }

  speak(text) {
    return this.speakAnnouncer(text);
  }

  speakAnnouncer(text, { maxDurationMs = 2400, priority = 100, cooldownMs = 500 } = {}) {
    const synthesis = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (!text || this.muted.announcer) {
      return Promise.resolve(false);
    }
    if (!synthesis || typeof Utterance !== 'function') {
      this.warnOnce('speech-unavailable', 'Este navegador não oferece síntese de fala; locuções sem gravação ficarão silenciosas.');
      return Promise.resolve(false);
    }
    const cooldownKey = `announcer:speech:${text}`;
    const now = Date.now();
    const lastPlayed = this.voiceCooldowns.get(cooldownKey);
    if (lastPlayed !== undefined && now - lastPlayed < cooldownMs) {
      return Promise.resolve(false);
    }

    const activeFile = [...this.voicePlayers.announcer].sort(
      (a, b) => a.priority - b.priority || a.startedAt - b.startedAt
    )[0];
    if (activeFile) {
      if (priority < activeFile.priority) return Promise.resolve(false);
      activeFile.finish({ played: false, reason: 'interrupted' });
    }
    if (this.activeUtterance) {
      if (priority < this.activeUtterance.priority) return Promise.resolve(false);
      this.activeUtterance.finish(false);
    }
    const utterance = new Utterance(String(text));
    this.voiceCooldowns.set(cooldownKey, now);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.volume = this.muted.announcer ? 0 : this.volumes.announcer;

    return new Promise(resolve => {
      const entry = {
        synthesis,
        utterance,
        priority,
        finish: played => {
          if (entry.finished) return;
          entry.finished = true;
          clearTimeout(entry.timeout);
          utterance.onend = null;
          utterance.onerror = null;
          if (this.activeUtterance === entry) this.activeUtterance = null;
          if (!played) synthesis.cancel();
          resolve(played);
        }
      };
      this.activeUtterance = entry;
      utterance.onend = () => entry.finish(true);
      utterance.onerror = event => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          this.warnOnce(`speech:${text}`, `Síntese arcade indisponível: ${event.error}`);
        }
        entry.finish(false);
      };
      this.armTimeout(entry, () => {
        this.warnOnce(`speech-timeout:${text}`, `Síntese excedeu o limite de reprodução: ${text}`);
        entry.finish(false);
      }, maxDurationMs);
      try {
        synthesis.speak(utterance);
      } catch (error) {
        this.warnOnce(`speech-start:${text}`, 'Não foi possível iniciar a síntese do narrador.', error);
        entry.finish(false);
      }
    });
  }

  pause() {
    for (const player of this.musicPlayers) player.pause();
    for (const entries of Object.values(this.voicePlayers)) {
      for (const entry of entries) {
        entry.player.pause();
        entry.remainingMs = Math.max(0, entry.deadline - Date.now());
        clearTimeout(entry.timeout);
      }
    }
    if (this.activeUtterance) {
      this.activeUtterance.synthesis.pause?.();
      this.activeUtterance.remainingMs = Math.max(0, this.activeUtterance.deadline - Date.now());
      clearTimeout(this.activeUtterance.timeout);
    }
    if (this.context?.state === 'running') {
      this.context.suspend().catch(error => this.warnOnce('context-suspend', 'AudioContext não pôde ser pausado.', error));
    }
  }

  resume() {
    if (this.context?.state === 'suspended') {
      this.context.resume().catch(error => this.warnOnce('context-resume', 'AudioContext não pôde ser retomado.', error));
    }
    if (!this.muted.music && this.music) this.playMusicElement(this.music);
    for (const entries of Object.values(this.voicePlayers)) {
      for (const entry of entries) {
        if (!this.muted[entry.channel]) this.resumeVoiceElement(entry);
        this.armTimeout(entry, () => {
          this.warnOnce(`voice-timeout:${entry.key}`, `Fala excedeu o limite de reprodução: ${entry.key}`);
          entry.finish({ played: false, reason: 'timeout' });
        }, entry.remainingMs);
      }
    }
    if (!this.muted.announcer && this.activeUtterance) {
      this.activeUtterance.synthesis.resume?.();
      const entry = this.activeUtterance;
      this.armTimeout(entry, () => {
        this.warnOnce('speech-timeout:resume', 'Síntese do narrador excedeu o limite de reprodução.');
        entry.finish(false);
      }, entry.remainingMs);
    }
  }

  warnOnce(key, message, error) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(message, error || '');
  }

  destroy() {
    this.stopMusic();
    for (const timer of this.fadeTimers) clearInterval(timer);
    this.fadeTimers.clear();
    for (const entries of Object.values(this.voicePlayers)) {
      for (const entry of [...entries]) entry.finish({ played: false, reason: 'destroyed' });
    }
    this.activeUtterance?.finish(false);
    if (this.context && this.context.state !== 'closed') {
      this.context.close().catch(error => this.warnOnce('context-close', 'AudioContext não pôde ser fechado.', error));
    }
  }
}
