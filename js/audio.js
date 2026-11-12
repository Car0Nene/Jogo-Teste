// Áudio: efeitos e trilhas sintetizados, músicas gravadas e vozes humanas licenciadas/gravadas.
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

  const state = { sound: true, music: true, voice: true, arcadeAnnouncer: false, volume: 1, effectsVolume: 0.7, musicVolume: 0.55, voiceVolume: 0.85 };

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
    sfxBus.gain.value = 0.55 * state.effectsVolume;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.16 * state.musicVolume;
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
    dash: () => { noise(0.1, 0.3, 2600, 0, 'bandpass'); tone(260, 0.12, 'triangle', 0.2, 110); },
    perfect: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.34, 'triangle', 0.2, null, i * 0.08)),
    countdown: () => { tone(880, 0.075, 'square', 0.2, 660); },
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

  // ---------- Músicas gravadas ----------
  // Cada faixa tem o original (Opus dentro de .m4a) e um MP3 de reserva para navegadores
  // que não tocam Opus (ex.: Safari antigo). O arquivo é baixado inteiro via fetch (resposta
  // normal 200) para o service worker guardar e a música funcionar offline.
  const TRACKS = {
    theme: 'assets/music/bolo-da-juraci',   // "Bolo da Juraci"
    ff2: 'assets/music/family-fighter-2',   // Family Fighter (música 2)
    ff3: 'assets/music/family-fighter-3'    // Family Fighter (música 3)
  };
  const OPUS_MP4 = 'audio/mp4; codecs="opus"';
  let opusOk = null;
  function trackUrl(name) {
    if (opusOk === null) {
      try { opusOk = Boolean(document.createElement('audio').canPlayType(OPUS_MP4)); } catch { opusOk = false; }
    }
    return `${TRACKS[name]}.${opusOk ? 'm4a' : 'mp3'}`;
  }

  const players = {};          // nome → { el, loading }
  let currentTrack = null;     // faixa gravada tocando agora
  let trackLevel = 1;          // 1 = menus; menor durante a luta
  let musicPaused = false;

  function loadTrack(name) {
    if (players[name]) return players[name].loading;
    const entry = { el: null, loading: null };
    players[name] = entry;
    const tryLoad = url => fetch(url).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    });
    entry.loading = tryLoad(trackUrl(name))
      .catch(() => tryLoad(`${TRACKS[name]}.mp3`)) // reserva
      .then(blob => {
        const el = new window.Audio(URL.createObjectURL(blob));
        el.loop = true;
        el.preload = 'auto';
        entry.el = el;
        return el;
      })
      .catch(error => {
        console.warn(`Música "${name}" indisponível; usando trilha 8-bit.`, error);
        return null;
      });
    return entry.loading;
  }

  function applyTrackVolume() {
    const el = currentTrack && players[currentTrack] && players[currentTrack].el;
    if (el) el.volume = Math.max(0, Math.min(1, state.volume * state.musicVolume * 0.75 * trackLevel));
  }

  function stopChiptune() {
    clearInterval(musicTimer);
    musicTimer = 0;
    currentSong = null;
  }

  function startChiptune(song) {
    stopChiptune();
    if (!SONGS[song]) song = 'padaria';
    try {
      if (!ensure()) return;
      currentSong = song;
      musicStep = 0;
      nextNoteTime = ctx.currentTime + 0.1;
      if (!musicPaused) musicTimer = setInterval(scheduler, 90);
    } catch (error) {
      console.warn('Falha ao iniciar a música.', error);
    }
  }

  // song: nome de faixa gravada (theme/ff2/ff3) ou de cenário para a trilha 8-bit.
  // level: volume relativo (1 nos menus, ~0.6 na luta para golpes e falas aparecerem).
  function startMusic(song = 'theme', level = 1) {
    trackLevel = level;
    if (!state.music) { stopMusic(); return; }
    if (TRACKS[song]) {
      if (currentTrack === song) { applyTrackVolume(); return; } // já tocando: só ajusta volume
      stopMusic();
      currentTrack = song;
      musicPaused = false;
      loadTrack(song).then(el => {
        if (currentTrack !== song) return;
        if (!el) { currentTrack = null; startChiptune('padaria'); return; }
        applyTrackVolume();
        try { el.currentTime = 0; } catch { /* ok */ }
        if (!musicPaused) el.play().catch(() => { /* aguardando o primeiro toque/tecla */ });
      });
      return;
    }
    stopMusic();
    startChiptune(song);
  }

  function stopMusic() {
    stopChiptune();
    if (currentTrack && players[currentTrack] && players[currentTrack].el) players[currentTrack].el.pause();
    currentTrack = null;
    musicPaused = false;
  }

  function pauseMusic(paused) {
    musicPaused = Boolean(paused);
    const el = currentTrack && players[currentTrack] && players[currentTrack].el;
    if (el) {
      if (musicPaused) el.pause(); else el.play().catch(() => {});
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

  // Navegadores só deixam tocar som depois de um gesto: retoma no primeiro toque/tecla.
  function resumeBlocked() {
    const el = currentTrack && players[currentTrack] && players[currentTrack].el;
    if (el && el.paused && !musicPaused && state.music) el.play().catch(() => {});
  }
  window.addEventListener('pointerdown', resumeBlocked);
  window.addEventListener('keydown', resumeBlocked);

  function configure(options) {
    Object.assign(state, options);
    if (master) master.gain.value = state.volume;
    if (sfxBus) sfxBus.gain.value = 0.55 * state.effectsVolume;
    if (musicBus) musicBus.gain.value = 0.16 * state.musicVolume;
    applyTrackVolume();
    if (!state.music) stopMusic();
    if (!state.voice) {
      stopSpeech();
    }
  }

  const ANNOUNCER = {
    fight: 'fight.ogg', round_1: 'round_1.ogg', round_2: 'round_2.ogg', round_3: 'round_3.ogg',
    final_round: 'final_round.ogg', time: 'time.ogg',
    you_win: 'you_win.ogg', you_lose: 'you_lose.ogg', tie: 'tie.ogg', combo: 'combo.ogg'
  };
  const activeVoicePlayers = new Set();

  // Cada fala tem seu próprio player: falas simultâneas não interrompem umas às outras.
  function playVoicePlayer(player) {
    if (!state.voice) return false;
    player.volume = Math.min(1, state.voiceVolume);
    activeVoicePlayers.add(player);
    const release = () => {
      activeVoicePlayers.delete(player);
      player.onended = null;
      player.onerror = null;
    };
    player.onended = release;
    player.onerror = release;
    player.play().catch(release);
    return true;
  }

  function playAnnouncer(key) {
    const file = ANNOUNCER[key];
    if (!file || !state.voice || !state.arcadeAnnouncer) return false;
    try {
      const url = `assets/voice/arcade/${file}`;
      const player = new window.Audio(url);
      return playVoicePlayer(player);
    } catch { return false; }
  }

  // ---------- Falas gravadas ----------
  // Áudios originais em art-source/audio; os MP3 publicados foram nivelados e preparados para o jogo.
  const CLIPS = {
    franciely: {
      isso: { url: 'assets/voice/franciely-isso.mp3', text: 'É isso!' },
      ferrinho: { url: 'assets/voice/franciely-ferrinho.mp3', text: 'Ferrinho por ferrinho!' },
      desarma: { url: 'assets/voice/franciely-desarma.mp3', text: 'Na praia a gente só desarma!' },
      montar: { url: 'assets/voice/franciely-montar.mp3', text: 'Aí, essa tem que montar ferrinho por ferrinho!' },
      cuidar: { url: 'assets/voice/generated/franciely-cuidar-e-lutar.mp3', text: 'Carlos! Ainda não acabou! Cuidar também é lutar!' }
    },
    pedro: {
      combo: { url: 'assets/voice/pedro-domingo.mp3', text: 'Domingo, domingo! Bora, bora, bora!', duration: 3.64 },
      drink: { url: 'assets/voice/pedro-cerveja.mp3', text: 'Eu posso tomar cerveja hoje?', duration: 1.85 },
      fumaBebe: { url: 'assets/voice/generated/pedro-fuma-bebe-vence.mp3', text: 'Fuma, bebe e vence! Simone, desce uma gelada!' }
    },
    daniel: {
      praia: { url: 'assets/voice/daniel-praia.mp3', text: 'Praia, praia! Eu vou fazer as malas!', duration: 3.86 },
      preparativos: { url: 'assets/voice/generated/daniel-preparativos-praia.mp3', text: 'Praia, praia! Eu vou fazer as malas!' }
    },
    esposa: {
      trabalho: { url: 'assets/voice/tainara-trabalho.mp3', text: 'Daniel deve estar sem internet, foi trabalhar hoje.', duration: 3.74 },
      respostaCompleta: { url: 'assets/voice/generated/tainara-daniel-indo-trabalhar.mp3', text: 'Daniel deve estar sem internet, foi trabalhar hoje. Nem pensar, Daniel!' }
    },
    gabi: {
      sing: { url: 'assets/voice/gabi-canto.mp3', text: '♪ Gabi canta ♪', duration: 3.95 },
      amor: { url: 'assets/voice/generated/gabi-amor-e-luta.mp3', text: 'Porque amor também é luta! Vinícius, eu venci!' }
    },
    dada: {
      reply: { url: 'assets/voice/generated/dada-aviso-chao-molhado.mp3', text: 'Já vou, irmã! Cuidado que o chão tá molhado!' }
    },
    juraci: {
      cozinha: { url: 'assets/voice/generated/juraci-mandando-na-cozinha.mp3', text: 'Quem manda nesta cozinha sou eu! Agora vai lavar a louça!' }
    },
    carlos: {
      pizzaAmor: { url: 'assets/voice/generated/carlos-pedido-de-pizza-com-amor.mp3', text: 'Foi mal, vó! Te amo! Depois dessa, mereço uma pizza!' }
    },
    paula: {
      lunch: { url: 'assets/voice/generated/paula-super-almoco.mp3', text: 'Super almoço! Prato feito, com direito a sobremesa!' },
      bar: { url: 'assets/voice/generated/paula-bar-simone.mp3', text: 'Pedro! Bar Simone! Pedro? Ah, agora eu fiquei brava!' }
    },
    tainara: {
      rice: { url: 'assets/voice/generated/tainara-poder-do-arroz.mp3', text: 'Poder do arroz! Com arroz eu fico invencível!' },
      children: { url: 'assets/voice/generated/tainara-cuidado-em-dobro.mp3', text: 'Crianças, comigo! Cuidado em dobro! Agora é bagunça boa!' }
    },
    cao: {
      lick: { url: 'assets/voice/generated/cao-lambida-poderosa.mp3', text: 'Au au! Lambida poderosa! Sai da frente, humano!' },
      protect: { url: 'assets/voice/generated/cao-amigo-protetor.mp3', text: 'Au! Eu protejo o Daniel! Amigo protetor!' }
    },
    narrator: {
      victory: { url: 'assets/voice/narrator/vitoria-na-luta.mp3', text: 'Vitória na luta!', duration: 2.7 }
    }
  };
  // Toca o trecho e devolve o texto (para o balão); null se não existir.
  function playClip(who, key) {
    const clip = CLIPS[who] && CLIPS[who][key];
    if (!clip) return null;
    if (state.voice) {
      try {
        // Um elemento novo permite ocorrências simultâneas do mesmo clipe.
        const el = new window.Audio(clip.url);
        playVoicePlayer(el);
      } catch { /* sem áudio */ }
    }
    return clip.text;
  }
  const hasClip = (who, key) => Boolean(CLIPS[who] && CLIPS[who][key]);
  const clipDuration = (who, key) => CLIPS[who] && CLIPS[who][key] ? CLIPS[who][key].duration || 0 : 0;

  function debugMusic() {
    const el = currentTrack && players[currentTrack] && players[currentTrack].el;
    return { track: currentTrack, chiptune: currentSong, paused: el ? el.paused : null, time: el ? Math.round(el.currentTime * 10) / 10 : null, volume: el ? Math.round(el.volume * 100) / 100 : null };
  }

  // Não usar SpeechSynthesis do navegador: a qualidade varia muito e soava robotizada.
  // As falas continuam legendadas; só os clipes gravados/licenciados produzem voz.
  function speak() {}
  function stopSpeech() {
    for (const player of activeVoicePlayers) {
      try { player.pause(); player.currentTime = 0; } catch { /* ok */ }
      player.onended = null;
      player.onerror = null;
    }
    activeVoicePlayers.clear();
  }

  window.FFAudio = { play, startMusic, stopMusic, pauseMusic, configure, unlock: ensure, speak, stopSpeech, playClip, hasClip, clipDuration, playAnnouncer, debugMusic };
})();
