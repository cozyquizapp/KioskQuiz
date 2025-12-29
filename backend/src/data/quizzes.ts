import { QuizTemplate, QuizCategory, QuizBlitzTheme } from '../../../shared/quizTypes';
import { questions } from './questions';

// Hilfsfunktion: hole 5 Fragen pro Kategorie, mische optional
const pickFivePerCategory = (): Record<QuizCategory, string[]> => {
  const byCat: Record<QuizCategory, string[]> = {
    Schaetzchen: [],
    'Mu-Cho': [],
    Stimmts: [],
    Cheese: [],
    GemischteTuete: []
  };

  questions.forEach((q) => {
    byCat[q.category].push(q.id);
  });

  (Object.keys(byCat) as QuizCategory[]).forEach((cat) => {
    if (byCat[cat].length < 5) {
      throw new Error(`Nicht genug Fragen für Kategorie ${cat} (mind. 5 benötigt)`);
    }
    byCat[cat] = byCat[cat].slice(0, 5);
  });

  return byCat;
};

const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const sampleBlitzPool: QuizBlitzTheme[] = [
  {
    id: 'blitz-cities',
    title: 'Städte-Silhouetten',
    items: [
      { id: 'blitz-cities-1', prompt: 'Skyline mit Eiffelturm', answer: 'Paris', aliases: ['Stadt der Liebe'] },
      { id: 'blitz-cities-2', prompt: 'Wolkenkratzer mit Empire State Building', answer: 'New York', aliases: ['NYC'] },
      { id: 'blitz-cities-3', prompt: 'Opernhaus am Hafen', answer: 'Sydney' },
      { id: 'blitz-cities-4', prompt: 'Kolosseum im Sonnenuntergang', answer: 'Rom' },
      { id: 'blitz-cities-5', prompt: 'Brandenburger Tor bei Nacht', answer: 'Berlin' }
    ]
  },
  {
    id: 'blitz-snacks',
    title: 'Snack Attack',
    items: [
      { id: 'blitz-snacks-1', prompt: 'Stapeln aus dünnen Kartoffelscheiben', answer: 'Chips', aliases: ['Kartoffelchips'] },
      { id: 'blitz-snacks-2', prompt: 'Schokoladencreme im Glas mit Löffel', answer: 'Nutella' },
      { id: 'blitz-snacks-3', prompt: 'Frisch gebackene Brezn', answer: 'Brezel', aliases: ['Brezn'] },
      { id: 'blitz-snacks-4', prompt: 'Popcorn im Kinoeimer', answer: 'Popcorn' },
      { id: 'blitz-snacks-5', prompt: 'Gebäck mit rosa Zuckerguss', answer: 'Donut', aliases: ['Doughnut'] }
    ]
  },
  {
    id: 'blitz-songs',
    title: 'Song Lyrics',
    items: [
      { id: 'blitz-songs-1', prompt: '"Is this the real life, is this just fantasy?"', answer: 'Bohemian Rhapsody', aliases: ['Queen'] },
      { id: 'blitz-songs-2', prompt: '"Cause baby you\'re a firework"', answer: 'Firework', aliases: ['Katy Perry'] },
      { id: 'blitz-songs-3', prompt: '"We don\'t talk about..."', answer: 'Bruno', aliases: ['Encanto'] },
      { id: 'blitz-songs-4', prompt: '"Shake it off, shake it off"', answer: 'Shake It Off' },
      { id: 'blitz-songs-5', prompt: '"I\'m gonna swing from the chandelier"', answer: 'Chandelier' }
    ]
  }
];

const samplePotatoThemes = [
  'Street-Food-Klassiker',
  'Streaming-Highlights',
  '80er-Hits',
  'Urlaubsregionen in Europa',
  'Gameshow-Legenden'
];

const cloneBlitzPoolForQuiz = (quizId: string): QuizBlitzTheme[] =>
  sampleBlitzPool.map((theme, themeIdx) => ({
    id: `${quizId}-${theme.id}`,
    title: theme.title,
    items: theme.items.map((item, itemIdx) => ({
      id: `${quizId}-${theme.id}-${itemIdx + 1}`,
      prompt: item.prompt,
      mediaUrl: item.mediaUrl,
      answer: item.answer,
      aliases: item.aliases
    }))
  }));

const cozyQuiz60QuestionIds: string[] = [
  'q-est-1',
  'q-mc-1',
  'q-tf-1',
  'q-img-1',
  'q-mc-2',
  'q-est-2',
  'q-bunte-top5-1',
  'q-img-2',
  'q-mc-3',
  'q-tf-2',
  'q-est-3',
  'q-mc-4',
  'q-img-3',
  'q-bunte-precision-1',
  'q-tf-3',
  'q-img-4',
  'q-bunte-oneofeight-1',
  'q-est-4',
  'q-bunte-order-1',
  'q-img-5'
];

const buildCozyQuiz60 = (mode: 'ordered' | 'random'): QuizTemplate => {
  const orderedList = mode === 'ordered' ? [...cozyQuiz60QuestionIds] : shuffle(cozyQuiz60QuestionIds);
  const templateId = mode === 'ordered' ? 'cozy-quiz-60' : 'cozy-quiz-60-random';
  return {
    id: templateId,
    name: mode === 'ordered' ? 'Cozy Quiz 60' : 'Cozy Quiz 60 (Random)',
    mode,
    questionIds: orderedList,
    meta: {
      description: '20-Fragen-Template für Cozy Quiz 60',
      defaultTimer: 60,
      language: 'both'
    },
    blitz: { pool: cloneBlitzPoolForQuiz(templateId) },
    potatoPool: samplePotatoThemes
  };
};

const buildQuiz = (id: string, name: string, mode: 'ordered' | 'random'): QuizTemplate => {
  const cat = pickFivePerCategory();
  const ordered = [
    ...cat.Schaetzchen,
    ...cat['Mu-Cho'],
    ...cat.Stimmts,
    ...cat.Cheese,
    ...cat.GemischteTuete
  ];
  const questionIds = mode === 'random' ? shuffle(ordered) : ordered;
  return {
    id,
    name,
    mode,
    questionIds,
    blitz: { pool: cloneBlitzPoolForQuiz(id) },
    potatoPool: samplePotatoThemes
  };
};

export const defaultQuizzes: QuizTemplate[] = [
  buildCozyQuiz60('ordered'),
  buildCozyQuiz60('random'),
  buildQuiz('quiz-1-ordered', 'Quiz 1 (Legacy geordnet)', 'ordered'), // TODO(LEGACY): Altbestand, migrieren
  buildQuiz('quiz-1-random', 'Quiz 1 (Legacy randomisiert)', 'random')
];

export const quizById = new Map(defaultQuizzes.map((q) => [q.id, q]));
