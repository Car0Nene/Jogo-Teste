import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AudioSystem } from './AudioSystem.js';

class FakeParam {
  value = 0;
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeNode {
  connect(node) { return node; }
  start() { FakeAudioContext.startedNodes += 1; }
  stop() {}
}

class FakeAudioContext {
  static startedNodes = 0;
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam() }); }
  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createOscillator() {
    return Object.assign(new FakeNode(), { frequency: new FakeParam() });
  }
  createBufferSource() { return new FakeNode(); }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { frequency: new FakeParam() });
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

class FakeAudio {
  static instances = [];
  static failNext = false;
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.paused = true;
    this.playCalls = 0;
    FakeAudio.instances.push(this);
  }
  play() {
    this.paused = false;
    this.playCalls += 1;
    if (FakeAudio.failNext) {
      FakeAudio.failNext = false;
      queueMicrotask(() => this.onerror?.());
    }
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() {}
  finish() { this.onended?.(); }
}

class FakeUtterance {
  constructor(text) { this.text = text; }
}

const originalWindow = globalThis.window;

beforeEach(() => {
  FakeAudio.instances = [];
  FakeAudio.failNext = false;
  FakeAudioContext.startedNodes = 0;
  globalThis.window = {
    location: { href: 'http://localhost/' },
    Audio: FakeAudio,
    AudioContext: FakeAudioContext,
    speechSynthesis: {
      utterances: [],
      speak(utterance) { this.utterances.push(utterance); },
      cancel() {},
      pause() {},
      resume() {}
    },
    SpeechSynthesisUtterance: FakeUtterance
  };
});

afterEach(() => {
  globalThis.window = originalWindow;
});

test('music track changes do not duplicate playback and effects can overlap independently', async () => {
  const audio = new AudioSystem();
  await audio.startMusic('music/family-fighter-2.mp3', { fadeMs: 0 });
  await audio.startMusic('music/family-fighter-2.mp3', { fadeMs: 0 });
  assert.equal(FakeAudio.instances.length, 1);
  await audio.startMusic('music/family-fighter-3.mp3', { fadeMs: 0 });
  assert.equal(FakeAudio.instances.length, 2);
  assert.equal(FakeAudio.instances[0].paused, true);

  assert.equal(audio.playEffect('punch'), true);
  assert.equal(audio.playEffect('kick'), true);
  assert.equal(FakeAudioContext.startedNodes, 2);
  audio.setMuted('sfx', true);
  assert.equal(audio.playEffect('punch'), false);
  assert.equal(audio.muted.music, false);
  audio.destroy();
});

test('voice instances overlap within limits, deduplicate repeats, and honor priority policies', async () => {
  const audio = new AudioSystem();
  const low = audio.playVoiceFile('voice/characters/one.mp3', 'character', {
    key: 'low', priority: 10, cooldownMs: 0, maxDurationMs: 1000
  });
  const high = audio.playVoiceFile('voice/characters/two.mp3', 'character', {
    key: 'high', priority: 20, cooldownMs: 0, maxDurationMs: 1000
  });
  const rejected = await audio.playVoiceFile('voice/characters/three.mp3', 'character', {
    key: 'rejected', priority: 15, cooldownMs: 0, interruptionPolicy: 'drop-new'
  });
  assert.equal(rejected.reason, 'capacity');

  const replacement = audio.playVoiceFile('voice/characters/four.mp3', 'character', {
    key: 'replacement', priority: 30, cooldownMs: 0, maxDurationMs: 1000, interruptionPolicy: 'replace-lower'
  });
  assert.deepEqual(await low, { played: false, reason: 'interrupted' });
  assert.equal(audio.voicePlayers.character.size, 2);

  const announcer = audio.playAnnouncer('fight', { maxDurationMs: 1000 });
  assert.equal(audio.voicePlayers.announcer.size, 1);
  assert.equal(audio.voicePlayers.character.size, 2);
  const replacementAnnouncer = audio.playAnnouncer('tie', { maxDurationMs: 1000 });
  assert.equal(await announcer, false);
  FakeAudio.instances.find(player => player.src.includes('/tie.ogg')).finish();
  assert.equal(await replacementAnnouncer, true);

  FakeAudio.instances.filter(player => player.src.includes('/two.mp3') || player.src.includes('/four.mp3'))
    .forEach(player => player.finish());
  await Promise.all([high, replacement]);
  const PedroVoice = audio.playCharacterVoice('pedro', 'combo');
  const duplicate = await audio.playCharacterVoice('pedro', 'combo');
  assert.equal(duplicate, false);
  FakeAudio.instances.find(player => player.src.includes('pedro-domingo')).finish();
  assert.equal(await PedroVoice, true);
  audio.destroy();
});

test('recorded-announcer failure falls back to English speech synthesis and completes by events', async () => {
  const audio = new AudioSystem();
  FakeAudio.failNext = true;
  const announcement = audio.playAnnouncer('fight', { maxDurationMs: 1000 });
  await new Promise(resolve => setImmediate(resolve));
  const utterance = window.speechSynthesis.utterances[0];
  assert.equal(utterance.text, 'Fight!');
  assert.equal(utterance.lang, 'en-US');
  assert.equal(await audio.playAnnouncer('fight'), false);
  assert.equal(typeof utterance.onend, 'function');
  utterance.onend();
  assert.equal(await announcement, true);
  audio.destroy();
});

test('pause/resume preserves music and voice instances; independent mutes remain scoped', async () => {
  const audio = new AudioSystem();
  await audio.startMusic('music/family-fighter-2.mp3', { fadeMs: 0 });
  const voice = audio.playCharacterVoice('paula', 'intro');
  const music = audio.music;
  const spoken = FakeAudio.instances.find(player => player.src.includes('paula-bar-simone'));
  audio.pause();
  assert.equal(music.paused, true);
  assert.equal(spoken.paused, true);
  audio.resume();
  assert.equal(music.paused, false);
  assert.equal(spoken.paused, false);
  audio.toggleAnnouncer();
  assert.equal(audio.muted.announcer, true);
  assert.equal(audio.muted.characterVoice, false);
  spoken.finish();
  await voice;
  audio.destroy();
});

test('unknown volume channels and non-finite volume inputs are reported', () => {
  const audio = new AudioSystem();
  assert.throws(() => audio.setVolume('voice', 0.5), /Canal de áudio desconhecido/);
  assert.throws(() => audio.setVolume('music', Number.NaN), /número finito/);
  audio.destroy();
});

test('special audio separates preparation, activation, and impact without inventing Pedro vocals', () => {
  const audio = new AudioSystem();
  assert.equal(audio.playSpecialPreparation('pedro'), true);
  assert.equal(audio.playSpecialActivation('pedro'), true);
  assert.equal(FakeAudioContext.startedNodes, 2);
  assert.equal(audio.playSpecialImpact('pedro'), true);
  assert.equal(FakeAudioContext.startedNodes, 4);
  assert.equal(audio.playSpecialActivation('unknown'), false);
  audio.destroy();
});
