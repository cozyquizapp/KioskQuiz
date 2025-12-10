import { QuizCategory, Language } from '@shared/quizTypes';

type Lang = Exclude<Language, 'both'>;

export const categoryLabels: Record<QuizCategory, Record<Lang, string>> = {
  Schaetzchen: { de: 'Schaetzchen', en: 'Close Call' },
  'Mu-Cho': { de: 'Mu-Cho', en: 'Mu-Cho' },
  Stimmts: { de: "Stimmt's?", en: 'True or False?' },
  Cheese: { de: 'Cheese', en: 'Cheese' },
  GemischteTuete: { de: 'Gemischte Tuete', en: 'Mixed Bag' }
};
