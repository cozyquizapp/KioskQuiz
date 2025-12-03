import { QuizTemplate, QuizCategory } from '../../../shared/quizTypes';
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
  return { id, name, mode, questionIds };
};

export const defaultQuizzes: QuizTemplate[] = [
  buildQuiz('quiz-1-ordered', 'Quiz 1 (geordnet)', 'ordered'),
  buildQuiz('quiz-1-random', 'Quiz 1 (randomisiert)', 'random')
];

export const quizById = new Map(defaultQuizzes.map((q) => [q.id, q]));
