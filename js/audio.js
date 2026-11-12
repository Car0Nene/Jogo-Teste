// Áudio sintetizado (sem arquivos): efeitos sonoros e uma trilha chiptune simples.
(() => {
  'use strict';

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuffer = null;
  let musicTimer = 0;
  let musicStep = 0;
  let nextNoteTime = 0;
  let currentSong = null;
  let themeAudio = null;
  let musicPaused = false;

  const state = { sound: true, music: true, voice: true, volume: 0.7 };

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = state.volume;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.16;
    musicBus.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function tone(freq, dur, type = 'square', vol = 0.5, slideTo = null, when = 0, bus = sfxBus) {
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.5, filterFreq = 1800, when = 0, type = 'lowpass') {
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const SFX = {
    whoosh: () => noise(0.09, 0.25, 2600, 0, 'bandpass'),
    hitLight: () => { noise(0.08, 0.6, 1400); tone(180, 0.07, 'square', 0.35, 90); },
    hitHeavy: () => { noise(0.16, 0.8, 900); tone(120, 0.16, 'square', 0.45, 50); },
    block: () => { tone(880, 0.05, 'triangle', 0.35, 600); noise(0.04, 0.25, 4000, 0, 'highpass'); },
    special: () => { tone(330, 0.32, 'sawtooth', 0.3, 990); tone(495, 0.32, 'square', 0.15, 1480, 0.04); },
    transform: () => { [0, 0.08, 0.16, 0.24].forEach((w, i) => tone(392 * (1 + i * 0.26), 0.18, 'square', 0.22, null, w)); },
    fizzle: () => tone(200, 0.08, 'sine', 0.3, 120),
    horn: () => { tone(415, 0.18, 'square', 0.3); tone(415, 0.28, 'square', 0.3, null, 0.24); },
    crash: () => { noise(0.45, 0.9, 1200); tone(90, 0.3, 'sawtooth', 0.4, 40); },
    splash: () => { noise(0.3, 0.5, 2500, 0, 'highpass'); },
    bite: () => { noise(0.05, 0.4, 900, 0, 'bandpass'); tone(140, 0.05, 'square', 0.15, 90); },
    bless: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.5, 'sine', 0.18, null, i * 0.07)),
    jump: () => tone(300, 0.09, 'triangle', 0.25, 620),
    land: () => noise(0.06, 0.25, 500),
    ko: () => { tone(600, 0.9, 'sawtooth', 0.35, 60); noise(0.5, 0.5, 700); },
    round: () => { tone(523, 0.12, 'square', 0.3); tone(784, 0.25, 'square', 0.3, null, 0.13); },
    fight: () => { tone(392, 0.1, 'square', 0.35); tone(523, 0.1, 'square', 0.35, null, 0.1); tone(784, 0.35, 'square', 0.35, null, 0.2); },
    ui: () => tone(660, 0.05, 'square', 0.18),
    confirm: () => { tone(523, 0.06, 'square', 0.22); tone(1046, 0.1, 'square', 0.22, null, 0.06); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.25, null, i * 0.12))
  };

  function play(name) {
    if (!state.sound || !SFX[name]) return;
    try {
      if (!ensure()) return;
      SFX[name]();
    } catch (error) {
      console.warn('Falha ao tocar efeito sonoro.', error);
    }
  }

  // ---------- Música ----------
  // Notas em semitons relativos a A3 (220 Hz); null = pausa.
  const SONGS = {
    padaria: { bpm: 138, root: 0,
      bass: [0, null, 0, 7, 5, null, 5, 12, 3, null, 3, 10, 5, null, 7, null],
      lead: [12, 15, 19, 15, 17, null, 15, 12, 10, 12, 15, null, 14, 12, 10, 7] },
    quintal: { bpm: 124, root: -2,
      bass: [0, null, 7, null, 5, null, 12, null, 3, null, 10, null, 7, null, 2, null],
      lead: [12, null, 14, 15, 19, null, 17, 15, 14, null, 12, 10, 12, null, null, null] },
    bar: { bpm: 112, root: -5,
      bass: [0, null, 0, 3, 5, null, 5, 7, 3, null, 3, 5, 7, null, 10, 7],
      lead: [12, null, 15, 17, 15, null, 12, 10, 12, null, null, 15, 17, 19, 17, 15] },
    praia: { bpm: 128, root: 5,
      bass: [0, null, 7, 0, 5, null, 12, 5, 7, null, 14, 7, 5, null, 12, 4],
      lead: [16, 19, 21, 19, 16, null, 14, 12, 14, 16, 19, null, 21, 19, 16, 14] },
    festa: { bpm: 150, root: 3,
      bass: [0, 7, 0, 7, 5, 12, 5, 12, 7, 14, 7, 14, 5, 12, 7, 2],
      lead: [12, 16, 19, 16, 17, 21, 19, 17, 16, 19, 23, 19, 21, 19, 17, 16] }
  };

  const freq = semis => 220 * Math.pow(2, semis / 12);

  function scheduler() {
    if (!ctx || !currentSong) return;
    const song = SONGS[currentSong];
    const stepDur = 60 / song.bpm / 2;
    while (nextNoteTime < ctx.currentTime + 0.25) {
      const i = musicStep % 16;
      const bar = Math.floor(musicStep / 16) % 4;
      const shift = song.root + (bar === 2 ? 5 : bar === 3 ? 7 : 0);
      const when = nextNoteTime - ctx.currentTime;
      const b = song.bass[i];
      const l = song.lead[i];
      if (b !== null) tone(freq(b + shift - 12), stepDur * 0.9, 'triangle', 0.6, null, when, musicBus);
      if (l !== null && bar !== 1) tone(freq(l + shift), stepDur * 0.8, 'square', 0.22, null, when, musicBus);
      if (i % 4 === 0) {
        const t = ctx.currentTime + when;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(g).connect(musicBus);
        src.start(t);
        src.stop(t + 0.06);
      }
      nextNoteTime += stepDur;
      musicStep++;
    }
  }

  // Música principal real do projeto. O fallback sintetizado permanece disponível
  // para trilhas de cenário caso o usuário selecione o modo 8-bit.
  function startMusic(song) {
    stopMusic();
    if (!state.music) return;
    try {
      if (!ensure()) return;
      currentSong = song || 'theme';
      if (currentSong === 'theme' || currentSong === 'padaria') {
        themeAudio = new window.Audio('./assets/music/bolo-da-juraci.mp3');
        themeAudio.loop = true;
        themeAudio.preload = 'auto';
        themeAudio.volume = Math.max(0, Math.min(1, state.volume));
        const promise = themeAudio.play();
        if (promise && typeof promise.catch === 'function') {
          promise.catch(error => console.warn('A música precisa ser iniciada após interação do usuário.', error));
        }
        return;
      }
      if (!SONGS[currentSong]) currentSong = 'padaria';
      musicStep = 0;
      nextNoteTime = ctx.currentTime + 0.1;
      musicTimer = setInterval(scheduler, 90);
    } catch (error) {
      console.warn('Falha ao iniciar a música.', error);
    }
  }

  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = 0;
    if (themeAudio) {
      themeAudio.pause();
      try { themeAudio.currentTime = 0; } catch {}
      themeAudio.src = '';
      themeAudio = null;
    }
    currentSong = null;
    musicPaused = false;
  }

  function pauseMusic(paused) {
    musicPaused = Boolean(paused);
    if (themeAudio) {
      if (musicPaused) themeAudio.pause();
      else {
        const promise = themeAudio.play();
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      }
      return;
    }
    if (!ctx || !currentSong) return;
    clearInterval(musicTimer);
    musicTimer = 0;
    if (!musicPaused) {
      ensure();
      nextNoteTime = ctx.currentTime + 0.1;
      musicTimer = setInterval(scheduler, 90);
    }
  }

  function configure(options) {
    Object.assign(state, options);
    if (master) master.gain.value = state.volume;
    if (master) master.gain.value = state.volume;
    if (themeAudio) themeAudio.volume = Math.max(0, Math.min(1, state.volume));
    if (!state.music) stopMusic();
    if (!state.voice) stopSpeech();
  }

  // ---------- Falas em voz alta (síntese de voz do próprio navegador) ----------
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let ptVoices = [];
  function loadVoices() {
    if (!synth) return;
    ptVoices = synth.getVoices().filter(v => /^pt(-|_|$)/i.test(v.lang));
    ptVoices.sort((a, b) => Number(/BR/i.test(b.lang)) - Number(/BR/i.test(a.lang)));
  }
  if (synth) {
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
  }
  const FEMALE = /maria|francisca|thalita|vit[oó]ria|luciana|fernanda|joana|raquel|female|feminina|google/i;
  const MALE = /daniel|ant[oô]nio|ricardo|donato|felipe|fabio|male|masculina/i;
  const VOICE_STYLE = {
    juraci: { pitch: 1.25, rate: 1.08, prefer: FEMALE },
    carlos: { pitch: 0.85, rate: 1.12, prefer: MALE },
    pedro: { pitch: 1.05, rate: 1.0, prefer: MALE },
    daniel: { pitch: 1.1, rate: 1.18, prefer: MALE },
    franciely: { pitch: 1.15, rate: 1.15, prefer: FEMALE },
    gabi: { pitch: 1.3, rate: 1.1, prefer: FEMALE },
    esposa: { pitch: 1.2, rate: 1.05, prefer: FEMALE },
    dada: { pitch: 0.7, rate: 0.92, prefer: MALE }
  };

  function speak(text, who) {
    if (!synth || !state.voice || !text) return;
    try {
      const style = VOICE_STYLE[who] || { pitch: 1, rate: 1.05, prefer: null };
      const clean = String(text).replace(/[^\p{L}\p{N}\s!?.,…'-]/gu, ' ').trim();
      if (!clean) return;
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'pt-BR';
      const voice = (style.prefer && ptVoices.find(v => style.prefer.test(v.name))) || ptVoices[0];
      if (voice) utter.voice = voice;
      utter.pitch = style.pitch;
      utter.rate = style.rate;
      utter.volume = Math.min(1, state.volume + 0.15);
      synth.cancel(); // fala nova interrompe a anterior
      synth.speak(utter);
    } catch (error) {
      console.warn('Falha ao falar a frase.', error);
    }
  }
  function stopSpeech() {
    try { synth?.cancel(); } catch { /* sem suporte */ }
  }

  window.FFAudio = { play, startMusic, stopMusic, pauseMusic, configure, unlock: ensure, speak, stopSpeech };
})();
