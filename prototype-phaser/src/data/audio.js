export const ANNOUNCER_CUES = Object.freeze({
  ready: { text: 'Ready?' },
  round_1: { clip: 'voice/arcade/round_1.ogg', text: 'Round One!' },
  round_2: { clip: 'voice/arcade/round_2.ogg', text: 'Round Two!' },
  round_3: { clip: 'voice/arcade/round_3.ogg', text: 'Round Three!' },
  final_round: { clip: 'voice/arcade/final_round.ogg', text: 'Final Round!' },
  fight: { clip: 'voice/arcade/fight.ogg', text: 'Fight!' },
  perfect: { text: 'Perfect!' },
  excellent: { text: 'Excellent!' },
  ko: { text: 'K.O.!' },
  time: { clip: 'voice/arcade/time.ogg', text: 'Time!' },
  time_over: { text: 'Time Over!' },
  you_win: { clip: 'voice/arcade/you_win.ogg', text: 'You Win!' },
  you_lose: { clip: 'voice/arcade/you_lose.ogg', text: 'You Lose!' },
  tie: { clip: 'voice/arcade/tie.ogg', text: 'Tie!' },
  combo: { clip: 'voice/arcade/combo.ogg', text: 'Combo!' }
});

export const CHARACTER_VOICES = Object.freeze({
  pedro: {
    combo: { clip: 'voice/characters/pedro-domingo.mp3', cooldownMs: 4000 },
    drink: { clip: 'voice/characters/pedro-cerveja.mp3', cooldownMs: 4000 },
    victory: { clip: 'voice/characters/pedro-fuma-bebe-vence.mp3', cooldownMs: 5000 }
  },
  paula: {
    intro: { clip: 'voice/characters/paula-bar-simone.mp3', cooldownMs: 5000 },
    special: { clip: 'voice/characters/paula-super-almoco.mp3', cooldownMs: 5000 }
  },
  juraci: {
    victory: { clip: 'voice/characters/juraci-mandando-na-cozinha.mp3', cooldownMs: 5000 }
  },
  carlos: {
    victory: { clip: 'voice/characters/carlos-pedido-de-pizza-com-amor.mp3', cooldownMs: 5000 }
  },
  daniel: {
    beach: { clip: 'voice/characters/daniel-praia.mp3', cooldownMs: 5000 },
    preparations: { clip: 'voice/characters/daniel-preparativos-praia.mp3', cooldownMs: 5000 }
  },
  franciely: {
    affirmative: { clip: 'voice/characters/franciely-isso.mp3', cooldownMs: 3000 },
    ferrinho: { clip: 'voice/characters/franciely-ferrinho.mp3', cooldownMs: 4000 },
    beach: { clip: 'voice/characters/franciely-desarma.mp3', cooldownMs: 4000 },
    build: { clip: 'voice/characters/franciely-montar.mp3', cooldownMs: 4000 },
    victory: { clip: 'voice/characters/franciely-cuidar-e-lutar.mp3', cooldownMs: 5000 }
  },
  gabi: {
    singing: { clip: 'voice/characters/gabi-canto.mp3', cooldownMs: 4000 },
    victory: { clip: 'voice/characters/gabi-amor-e-luta.mp3', cooldownMs: 5000 }
  },
  tainara: {
    work: { clip: 'voice/characters/tainara-trabalho.mp3', cooldownMs: 4000 },
    rice: { clip: 'voice/characters/tainara-poder-do-arroz.mp3', cooldownMs: 4000 },
    children: { clip: 'voice/characters/tainara-cuidado-em-dobro.mp3', cooldownMs: 5000 },
    workReply: { clip: 'voice/characters/tainara-daniel-indo-trabalhar.mp3', cooldownMs: 5000 }
  },
  dada: {
    reply: { clip: 'voice/characters/dada-aviso-chao-molhado.mp3', cooldownMs: 4000 }
  },
  cao: {
    lick: { clip: 'voice/characters/cao-lambida-poderosa.mp3', cooldownMs: 4000 },
    protect: { clip: 'voice/characters/cao-amigo-protetor.mp3', cooldownMs: 4000 }
  }
});

export const SPECIAL_AUDIO = Object.freeze({
  pedro: {
    preparationVoice: null,
    activationVoice: null,
    activationEffect: 'special',
    impactEffect: 'impact',
    completionVoice: null
  },
  paula: {
    preparationVoice: null,
    activationVoice: 'special',
    activationEffect: 'special',
    impactEffect: 'impact',
    completionVoice: null
  }
});
