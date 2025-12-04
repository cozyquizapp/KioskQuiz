import { AnswerEntry } from '@shared/quizTypes';

export type AnswersState = {
  answers: Record<string, (AnswerEntry & { answer?: unknown })>;
  teams: Record<string, { name: string; isReady?: boolean }>;
  solution?: string;
};

export type ViewPhase = 'pre' | 'lobby' | 'intro' | 'quiz';
