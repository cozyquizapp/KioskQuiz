import { QuizCategory } from '@shared/quizTypes';

type Lang = 'de' | 'en';

export const categoryLabels: Record<QuizCategory, Record<Lang, string>> = {
  Schaetzchen: { de: 'Schätzchen', en: 'Close Call' },
  'Mu-Cho': { de: 'Mu-Cho', en: 'Mu-Cho' },
  Stimmts: { de: "Stimmt's?", en: 'True or False?' },
  Cheese: { de: 'Cheese', en: 'Cheese' },
  GemischteTuete: { de: 'Gemischte Tüte', en: 'Mixed Bag' }
};
