// Zentrale Typdefinitionen fÃ¼r Fragen, Mechaniken und RÃ¤ume

export type QuizCategory =
  | 'Schaetzchen'
  | 'Mu-Cho'
  | 'Stimmts'
  | 'Cheese'
  | 'GemischteTuete';

export type MixedMechanicId =
  | 'sortieren'
  | 'praezise-antwort'
  | 'wer-bietet-mehr'
  | 'eine-falsch'
  | 'three-clue-race'
  | 'vier-woerter-eins';

export type MixedMechanicDetails =
  | {
      type: 'sortieren';
      items: string[];
      direction: 'north-south' | 'west-east' | 'chronological';
    }
  | {
      type: 'praezise-antwort';
      targetHint?: string;
    }
  | {
      type: 'wer-bietet-mehr';
      topic: string;
      minCount?: number;
    }
  | {
      type: 'eine-falsch';
      statements: string[];
      falseIndex: number;
    }
  | {
      type: 'three-clue-race';
      clues: string[];
      scoring?: { first?: number; second?: number; third?: number };
    }
  | {
      type: 'vier-woerter-eins';
      words: string[];
      solution: string;
    };

export type MechanicType =
  | 'estimate'
  | 'multipleChoice'
  | 'trueFalse'
  | 'imageQuestion'
  | 'sortItems'
  | 'betting'
  | 'custom';

export type DecorationKey =
  | 'moon'
  | 'earth'
  | 'cheese'
  | 'target'
  | 'ruler'
  | 'measuringCup'
  | 'dice'
  | 'questionBag'
  | 'camera'
  | 'filmStrip'
  | 'lightbulb'
  | 'book'
  | 'stopwatch';
// erweiterbar

export interface MediaBlock {
  type: 'image' | 'audio' | 'video';
  url: string;
  alt?: string;
}

export interface BaseQuestion {
  id: string;
  category: QuizCategory;
  mechanic: MechanicType;
  question: string;
  questionEn?: string;
  points: number;
  createdAt?: number; // Unix ms; optional für Sortierung "zuletzt hinzugefügt"
  media?: MediaBlock;
  imageUrl?: string;
  mixedMechanic?: MixedMechanicId; // nur relevant fÃ¼r Gemischte TÃ¼te
  mixedMechanicDetails?: MixedMechanicDetails | null;
  decorationLeft?: DecorationKey | null;
  decorationRight?: DecorationKey | null;
  funFact?: string | null; // Moderationsnotiz / interessanter Fakt
  usedIn?: string[]; // Liste von Quizzes/Vorlagen, in denen die Frage genutzt wurde
  lastUsedAt?: string | null; // ISO-String des letzten Einsatzes
  catalogId?: string; // optionaler Katalog/Tag
  tags?: string[];
  mediaSlots?: { count: number; urls?: string[] }; // z. B. Mixed Bag: Anzahl Bilder
}

export interface EstimateQuestion extends BaseQuestion {
  mechanic: 'estimate';
  targetValue: number;
  unit?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  mechanic: 'multipleChoice';
  options: string[];
  optionsEn?: string[];
  correctIndex: number;
}

export interface TrueFalseQuestion extends BaseQuestion {
  mechanic: 'trueFalse';
  isTrue: boolean;
}

export interface ImageQuestion extends BaseQuestion {
  mechanic: 'imageQuestion';
  answer: string;
  answerEn?: string;
}

export interface SortItemsQuestion extends BaseQuestion {
  mechanic: 'sortItems';
  items: string[];
  itemsEn?: string[];
  correctOrder: string[];
  correctOrderEn?: string[];
  hint?: string;
  hintEn?: string;
}

export interface BettingQuestion extends BaseQuestion {
  mechanic: 'betting'; // Punkte verteilen auf drei Optionen
  options: string[]; // genau 3
  optionsEn?: string[];
  correctIndex: number;
  pointsPool?: number; // default 10
}

export type AnyQuestion =
  | EstimateQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | ImageQuestion
  | SortItemsQuestion
  | BettingQuestion;

export interface Team {
  id: string;
  name: string;
  score: number;
  isReady?: boolean;
}

export interface SlotTransitionMeta {
  categoryId: QuizCategory;
  categoryLabel: string;
  categoryIcon: string;
  questionIndex: number;
  totalQuestionsInCategory: number;
  mechanicId?: MixedMechanicId;
  mechanicLabel?: string;
  mechanicShortLabel?: string;
  mechanicIcon?: string;
}

export interface RoomState {
  roomCode: string;
  teams: Record<string, Team>;
  currentQuestionId: string | null;
  answers: Record<string, AnswerEntry>;
  quizId?: string | null;
  remainingQuestionIds: string[];
  teamBoards: Record<string, BingoBoard>;
  timerEndsAt: number | null;
  language?: Language;
}

export type QuizMode = 'ordered' | 'random';

export interface QuizMeta {
  description?: string;
  defaultTimer?: number;
  showTimer?: boolean;
  timerMode?: 'bar' | 'numeric' | 'both';
  allowTeamAnswers?: boolean;
  defaultAnswerType?: 'text' | 'number' | 'multipleChoice';
  useBingo?: boolean;
  notes?: string;
}

export interface CategoryConfig {
  key: QuizCategory;
  displayName: string;
  shortLabel?: string;
  color?: string;
  icon?: string;
  order?: number;
}

export type Language = 'de' | 'en' | 'both';

export interface QuizTemplate {
  id: string;
  name: string;
  mode: QuizMode;
  questionIds: string[]; // genau 25 IDs, 5 pro Kategorie
  meta?: QuizMeta;
  categories?: Record<QuizCategory, CategoryConfig>;
}

export interface BingoCell {
  category: QuizCategory;
  marked: boolean;
}

export type BingoBoard = BingoCell[]; // LÃ¤nge 25

export interface AnswerResult {
  teamId: string;
  isCorrect: boolean;
}

export interface TimerState {
  endsAt: number | null; // Unix ms
  running: boolean;
}

export interface AnswerEntry {
  value: unknown;
  isCorrect?: boolean;
  deviation?: number | null; // fÃ¼r SchÃ¤tzfragen
  bestDeviation?: number | null;
}

export interface QuestionMeta {
  globalIndex: number;
  globalTotal: number;
  categoryIndex: number;
  categoryTotal: number;
  categoryKey: QuizCategory;
  categoryName: string;
}

// Client-/Server-UI-ZustÃ¤nde
export type ScreenState = 'lobby' | 'slot' | 'question' | 'finished';
export type QuestionPhase = 'idle' | 'slot' | 'answering' | 'evaluated' | 'revealed';

export type SyncStatePayload = {
  screen: ScreenState;
  language: Language;
  questionPhase: QuestionPhase;
  timerEndsAt: number | null;
  question: AnyQuestion | null;
  questionMeta: QuestionMeta | null;
  slotMeta?: SlotTransitionMeta | null;
};

// Event-Payloads (optional gemeinsame Nutzung)
export type BeamerShowSlotTransitionPayload = SlotTransitionMeta;

export type BeamerShowQuestionPayload = {
  question: AnyQuestion;
  meta?: {
    globalIndex: number;
    globalTotal: number;
    categoryIndex: number;
    categoryTotal: number;
    categoryKey: string;
    categoryName: string;
  } | null;
};

export type TeamShowQuestionPayload = {
  question: AnyQuestion | null;
  totalTime?: number;
};

export type AdminNextQuestionPayload = { roomCode: string };
export type TeamReadyPayload = { roomCode: string; teamId: string; isReady: boolean };


