import { QuizCategory } from './quizTypes';

export type CategoryConfig = {
  label: string;
  labelEn?: string;
  icon: string;
  color: string;
  short?: string;
};

export const CATEGORY_CONFIG: Record<QuizCategory, CategoryConfig> = {
  Schaetzchen: {
    label: 'Schaetzchen',
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
    label: 'Stimmts?',
    labelEn: 'Fake Finder',
    icon: '/categories/stimmts_logo.png',
    color: '#72ac78',
    short: 'ST'
  },
  Cheese: {
    label: 'Cheese',
    labelEn: 'Cheese',
    icon: '/categories/cheese_logo.png',
    color: '#e2a9f1',
    short: 'CH'
  },
  GemischteTuete: {
    label: 'Gemischte Tuete',
    labelEn: 'Mixed Bag',
    icon: '/categories/buntetuete_logo.png',
    color: '#d85f58',
    short: 'GT'
  }
};
