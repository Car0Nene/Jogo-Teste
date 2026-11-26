import type { FighterId } from './fighters';

/**
 * Falas engraçadas dos áudios reais da família (pasta "Audios novo"), por momento da luta.
 * Cada valor é uma chave de clipe registrada em audio.ts (pasta /assets/voice/familia/).
 */
export type FunTrigger =
  | 'intro' // começo do round
  | 'taunt' // botão Provocar e conversa no meio da luta
  | 'ko' // quando ESTE lutador é nocauteado
  | 'win' // quando ESTE lutador vence
  | 'lowHp' // vida abaixo de 25% (uma vez por round)
  | 'timeLow' // faltando 10 segundos
  | 'knockdownOpp' // derrubou o adversário
  | 'transform'; // entrou na transformação do especial

export interface FunLineSet {
  lines: Partial<Record<FunTrigger, string[]>>;
  /** falas contra um adversário específico (usadas na abertura, na provocação e na vitória) */
  vs?: Partial<Record<FighterId, string[]>>;
  /** fala de vitória só contra um adversário específico */
  winVs?: Partial<Record<FighterId, string[]>>;
}

export const FUN_LINES: Partial<Record<FighterId, FunLineSet>> = {
  pedro: {
    lines: {
      intro: ['bora', 'cerveja'],
      taunt: ['instigando', 'barraquinha', 'pontoAgora', 'cerveja'],
      ko: ['dormindo'],
      lowHp: ['sufoco'],
      timeLow: ['naoDaTempo', 'daTempo'],
      knockdownOpp: ['barraquinha', 'instigando'],
      transform: ['peso'],
    },
    vs: {
      daniel: ['dirigir', 'ritmoPraia'],
      paula: ['tiaPaula', 'musicaPaula'],
      gabi: ['vozGabi'],
      carlos: ['lancaMusica'],
    },
  },
  daniel: {
    lines: {
      taunt: ['trabalhar'],
      transform: ['eleicao'],
    },
    vs: { pedro: ['acai', 'coxinha'] },
    winVs: { pedro: ['coxinha'] },
  },
  gabi: {
    lines: { taunt: ['invejosos'], win: ['invejosos'] },
  },
  juraci: {
    // mensagem de voz inteira: a vó contando fofoca no meio da luta
    lines: { taunt: ['fofoca'], intro: ['fofoca'] },
  },
  paula: {
    lines: { win: ['amem'], intro: ['amem'], taunt: ['bebe'], knockdownOpp: ['bebe'] },
  },
};

/** Legendas (o texto na tela é sempre o que o áudio fala). */
export const FUN_TEXT: Record<string, string> = {
  '/assets/voice/familia/pedro/dormindo.mp3': 'Eu tô dormindo agora.',
  '/assets/voice/familia/pedro/instigando.mp3': 'Fica instigando eu?',
  '/assets/voice/familia/pedro/barraquinha.mp3': 'Já comprou a barraquinha dele pra dormir, fi?',
  '/assets/voice/familia/pedro/peso.mp3': 'Bastante lá no serviço, carregando peso.',
  '/assets/voice/familia/pedro/cerveja.mp3': 'Tu pode beber uma cerveja hoje?',
  '/assets/voice/familia/pedro/bora.mp3': 'Tá, bora, chega por nós!',
  '/assets/voice/familia/pedro/sufoco.mp3': 'Dani do céu! Olha, eu tô passando sufoco nessa firma aí, mano!',
  '/assets/voice/familia/pedro/naoDaTempo.mp3': 'Hoje ainda, filho? Chegar lá acho que não dá tempo não.',
  '/assets/voice/familia/pedro/daTempo.mp3': 'Dá tempo de pegar isso daí, dá, ó!',
  '/assets/voice/familia/pedro/dirigir.mp3': 'Se você soubesse dirigir, né, Dan? Vinha pegar nós, mas não quer aprender!',
  '/assets/voice/familia/pedro/tiaPaula.mp3': 'Mano, a tia Paula tá gastando demais final de semana, mano!',
  '/assets/voice/familia/pedro/musicaPaula.mp3': 'Essa música aí, a Paula devia até fazer o almoço hoje.',
  '/assets/voice/familia/pedro/vozGabi.mp3': 'Tá parecendo a voz da Lorena, fi, da Gabi!',
  '/assets/voice/familia/pedro/lancaMusica.mp3': 'Carlos, lança uma música aí, fi!',
  '/assets/voice/familia/pedro/ritmoPraia.mp3': 'Tá no ritmo da praia não? Ninguém viu?',
  '/assets/voice/familia/pedro/pontoAgora.mp3': 'Tô abrindo de saída, tô indo pro ponto agora!',
  '/assets/voice/familia/daniel/eleicao.mp3': 'Acabou a eleição, o clima é praia! Quero saber de nada, quero viajar, tô agoniado, quero viajar!',
  '/assets/voice/familia/daniel/acai.mp3': 'Ô Pedro, você falou que se o Lula ganhasse você ia pagar açaí pra geral? Não!',
  '/assets/voice/familia/daniel/trabalhar.mp3': 'Você não vai parar de trabalhar só pra receber a sua família, fi?',
  '/assets/voice/familia/daniel/coxinha.mp3': 'Aê, Pedrão, vai dormir de coxinha hoje!',
  '/assets/voice/familia/gabi/invejosos.mp3': 'Vocês são todos invejosos, tá? Que vocês não têm essa voz aqui!',
  '/assets/voice/familia/juraci/fofoca.mp3': 'Só Deus, fofo! Aí a tia Luísa falou assim: "Ah, eu vou arrumar pra ele." Aí a Luísa falou: "Saca, Fran, viu?" É, depois você fala pra ele, mostra pra ele como que tava, tá bom? Deus abençoe!',
  '/assets/voice/familia/paula/amem.mp3': 'Amém. Deus abençoe.',
  '/assets/voice/familia/paula/bebe.mp3': 'E o bebê, tá bem?',
};
