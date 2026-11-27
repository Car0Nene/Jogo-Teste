/**
 * Modo História "Almoço de Domingo": quadrinhos animados (arte Kling) com falas nas vozes
 * clonadas da família, intercalados com lutas. Cada capítulo = cenas + uma luta.
 *
 * A família: Juraci e Dadá são os avós; Pedro é filho deles e casado com a Paula (Juraci é
 * SOGRA da Paula). Pedro é pai da Gabi e do Davi e padrasto da Franciely. Carlos é marido da
 * Franciely; Daniel é marido da Tainara, prima da garotada; Gabi namora o Vinícius.
 */
import type { FighterId } from './fighters';
import type { StageId } from './stages';

export type StorySpeaker = FighterId | 'narrador';

export interface StoryLine {
  who: StorySpeaker;
  text: string;
  /** arquivo em /assets/voice/story/<clip>.mp3 */
  clip: string;
}

export interface StoryPanel {
  /** imagem em /assets/story/<img>.webp */
  img: string;
  /** movimento de câmera sobre o quadro */
  motion: 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight' | 'shake';
  lines: StoryLine[];
}

export interface StoryChapter {
  id: string;
  title: string;
  subtitle: string;
  /** vídeo de abertura em /assets/story/<video>.mp4, antes da cartela */
  video?: string;
  panels: StoryPanel[];
  /** luta do capítulo (P1 é o jogador); sem luta = epílogo */
  fight?: { p1: FighterId; p2: FighterId; stage: StageId };
}

export const STORY_TITLE = 'Almoço de Domingo';

export const SPEAKER_NAME: Record<StorySpeaker, string> = {
  narrador: '',
  juraci: 'Vó Juraci',
  carlos: 'Carlos',
  pedro: 'Pedro',
  daniel: 'Daniel',
  franciely: 'Franciely',
  gabi: 'Gabi',
  paula: 'Paula',
  tainara: 'Tainara',
  davi: 'Davi',
};

const L = (who: StorySpeaker, clip: string, text: string): StoryLine => ({ who, clip, text });

export const STORY: StoryChapter[] = [
  {
    id: 'cap1',
    title: 'Capítulo 1',
    subtitle: 'Quem manda na cozinha',
    video: 'abertura',
    panels: [
      { img: 'p01', motion: 'zoomIn', lines: [L('narrador', 's01a', 'Domingo. Casa da vó Juraci. Cheiro de bolo no ar.'), L('juraci', 's01b', 'Bolo de cenoura supremo, com cobertura de brigadeiro! Mas o último pedaço é só de quem merecer.')] },
      { img: 'p02', motion: 'panRight', lines: [L('narrador', 's02a', 'Bastou essa frase pra família inteira virar inimiga.'), L('pedro', 's02b', 'Ô rapaz... esse bolo tem cara de ser meu.'), L('carlos', 's02c', 'Calma, sogrão. Ninguém encosta nesse bolo antes de mim.')] },
      { img: 'p03', motion: 'shake', lines: [L('paula', 's03a', 'Sogra, quem fez o almoço inteiro fui eu. O bolo é meu!'), L('juraci', 's03b', 'Nora, enquanto eu tiver chinelo, quem manda na cozinha sou eu.')] },
    ],
    fight: { p1: 'paula', p2: 'juraci', stage: 'padaria' },
  },
  {
    id: 'cap2',
    title: 'Capítulo 2',
    subtitle: 'O genro e o padrasto',
    panels: [
      { img: 'p04', motion: 'zoomIn', lines: [L('narrador', 's04a', 'Enquanto isso, chega o genro.'), L('carlos', 's04b', 'Trouxe pizza! Agora eu tenho direito ao bolo, né?'), L('pedro', 's04c', 'Genro que é genro paga a rodada primeiro, rapaz!')] },
      { img: 'p05', motion: 'shake', lines: [L('franciely', 's05a', 'Pedro, deixa o Carlos entrar, pelo amor de Deus!'), L('pedro', 's05b', 'Só depois de um round... ou dois!')] },
    ],
    fight: { p1: 'carlos', p2: 'pedro', stage: 'bar' },
  },
  {
    id: 'cap3',
    title: 'Capítulo 3',
    subtitle: 'Irmã é pra essas coisas',
    panels: [
      { img: 'p06', motion: 'zoomOut', lines: [L('gabi', 's06a', 'Uma selfie com o bolo pro Vinícius ver... perfeito!')] },
      { img: 'p07', motion: 'panLeft', lines: [L('franciely', 's07a', 'Gabi! Larga esse bolo agora! Vou contar até três!'), L('gabi', 's07b', 'Fran, relaxa. A estrela dessa família sou eu.')] },
    ],
    fight: { p1: 'franciely', p2: 'gabi', stage: 'quintal' },
  },
  {
    id: 'cap4',
    title: 'Capítulo 4',
    subtitle: 'Bolo na praia',
    panels: [
      { img: 'p08', motion: 'panRight', lines: [L('daniel', 's08a', 'Bolo na praia é tradição, amor! Deixa que eu levo!'), L('tainara', 's08b', 'Você leva o bolo e eu levo o arroz. Combinado?')] },
      { img: 'p09', motion: 'shake', lines: [L('tainara', 's09a', 'Daniel, solta! Cuidado que vai cair na areia!'), L('daniel', 's09b', 'Modo Natal Praia ativado!')] },
    ],
    fight: { p1: 'tainara', p2: 'daniel', stage: 'praia' },
  },
  {
    id: 'cap4b',
    title: 'Capítulo 5',
    subtitle: 'Pizza contra praia',
    panels: [
      { img: 'p14', motion: 'panLeft', lines: [L('narrador', 's14a', 'De volta ao quintal... o bolo chegou de prancha.'), L('carlos', 's14b', 'Daniel, esse bolo é da casa da vó. Passa pra cá!')] },
      { img: 'p15', motion: 'shake', lines: [L('daniel', 's15a', 'Calma, primo. Primeiro admira o físico... depois a gente conversa.'), L('carlos', 's15b', 'Pizza contra praia. Valendo o último pedaço!')] },
    ],
    fight: { p1: 'daniel', p2: 'carlos', stage: 'quintal' },
  },
  {
    id: 'cap5',
    title: 'Capítulo Final',
    subtitle: 'O verdadeiro culpado',
    panels: [
      { img: 'p10', motion: 'zoomIn', lines: [L('narrador', 's10a', 'Enquanto todo mundo brigava... alguém ficou quietinho na sala.'), L('davi', 's10b', 'Vocês tavam brigando... aí eu comi. Tava bom demais.')] },
      { img: 'p11', motion: 'shake', lines: [L('juraci', 's11a', 'Daviii! Vem cá, menino, que a vó vai te ensinar!')] },
    ],
    fight: { p1: 'juraci', p2: 'davi', stage: 'festa' },
  },
  {
    id: 'fim',
    title: 'Epílogo',
    subtitle: 'Todo domingo tem mais',
    panels: [
      { img: 'p12', motion: 'zoomOut', lines: [L('juraci', 's12a', 'Calma, gente. A vó sempre faz dois bolos!'), L('paula', 's12b', 'Sogrinha, você é demais.')] },
      { img: 'p13', motion: 'zoomIn', lines: [L('gabi', 's13a', 'Todo mundo junto! Família Fighter!'), L('narrador', 's13b', 'Fim. Ou até o próximo domingo.')] },
    ],
  },
];

const PROGRESS_KEY = 'ff-story-progress';
export function loadStoryProgress(): number {
  try {
    return Math.max(0, Math.min(STORY.length - 1, Number(localStorage.getItem(PROGRESS_KEY) || 0)));
  } catch {
    return 0;
  }
}
export function saveStoryProgress(chapter: number) {
  try {
    localStorage.setItem(PROGRESS_KEY, String(chapter));
  } catch {
    /* modo privado */
  }
}
