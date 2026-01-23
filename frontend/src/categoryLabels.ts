import { QuizCategory, Language } from '@shared/quizTypes';

type Lang = Exclude<Language, 'both'>;

export const categoryLabels: Record<QuizCategory, Record<Lang, string>> = {
  Schaetzchen: { de: 'Schätzchen', en: 'Close Call' },
  'Mu-Cho': { de: 'Mu-Cho', en: 'Mu-Cho' },
  Stimmts: { de: 'Bluff', en: 'Bluff' },
  Cheese: { de: 'Cheese', en: 'Cheese' },
  GemischteTuete: { de: 'Bunte Tuete', en: 'Mixed Bag' }
};
