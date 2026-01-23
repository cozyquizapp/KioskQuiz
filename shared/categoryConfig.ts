import { QuizCategory } from './quizTypes';

export type CategoryConfig = {
  label: string;
  labelEn?: string;
  icon: string;
  color: string;
  short?: string;
};

export const CATEGORY_CONFIG: Record<QuizCategory, CategoryConfig> = {
  Schätzchen: {
    label: 'Schätzchen',
    labelEn: 'Close Call',
    icon: '/categories/schaetzchen_logo.png',
    color: '#f3c367',
    short: 'SZ'
  },
  'Mu-Cho': {
    label: 'Mu-Cho',
    labelEn: 'Mu-Cho',
    icon: '/categories/mucho_logo.png',
    color: '#9fbfd3',
    short: 'MC'
  },
  Stimmts: {
    label: 'Bluff',
    labelEn: 'Bluff',
    icon: '/categories/punktlandung_logo.png',
    color: '#72ac78',
    short: 'BL'
  },
  Cheese: {
    label: 'Cheese',
    labelEn: 'Cheese',
    icon: '/categories/cheese_logo.png',
    color: '#e2a9f1',
    short: 'CH'
  },
  GemischteTuete: {
    label: 'Bunte Tuete',
    labelEn: 'Mixed Bag',
    icon: '/categories/buntetuete_logo.png',
    color: '#d85f58',
    short: 'GT'
  }
};
