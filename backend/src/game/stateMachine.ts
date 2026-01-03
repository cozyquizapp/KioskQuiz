import { CozyGameState } from '../../../shared/quizTypes';
export type { CozyGameState } from '../../../shared/quizTypes';

export type GameStateAction =
  | { type: 'START_SESSION' }
  | { type: 'HOST_NEXT' }
  | { type: 'HOST_LOCK' }
  | { type: 'HOST_REVEAL' }
  | { type: 'FORCE'; next: CozyGameState };

export const INITIAL_GAME_STATE: CozyGameState = 'LOBBY';

type TransitionKey = Exclude<GameStateAction['type'], 'FORCE'>;

const transitionTable: Record<CozyGameState, Partial<Record<TransitionKey, CozyGameState>>> = {
  LOBBY: {
    START_SESSION: 'LOBBY',
    HOST_NEXT: 'QUESTION_INTRO'
  },
  INTRO: {
    HOST_NEXT: 'QUESTION_INTRO'
  },
  QUESTION_INTRO: {
    HOST_NEXT: 'Q_ACTIVE'
  },
  Q_ACTIVE: {
    HOST_LOCK: 'Q_LOCKED',
    HOST_REVEAL: 'Q_REVEAL'
  },
  Q_LOCKED: {
    HOST_REVEAL: 'Q_REVEAL'
  },
  Q_REVEAL: {
    HOST_NEXT: 'SCOREBOARD'
  },
  SCOREBOARD: {
    HOST_NEXT: 'QUESTION_INTRO'
  },
  BLITZ: {
    HOST_NEXT: 'SCOREBOARD_PAUSE'
  },
  SCOREBOARD_PAUSE: {
    HOST_NEXT: 'QUESTION_INTRO'
  },
  POTATO: {
    HOST_NEXT: 'AWARDS'
  },
  AWARDS: {
    HOST_NEXT: 'LOBBY'
  }
};

export const isQuestionInputOpen = (state: CozyGameState) => state === 'Q_ACTIVE';
export const isRevealState = (state: CozyGameState) => state === 'Q_REVEAL';

export function applyGameAction(current: CozyGameState, action: GameStateAction): CozyGameState {
  if (action.type === 'FORCE') {
    return action.next;
  }
  if (action.type === 'START_SESSION') {
    return INITIAL_GAME_STATE;
  }
  const next = transitionTable[current]?.[action.type];
  return next ?? current;
}

export function canApplyAction(current: CozyGameState, action: GameStateAction['type']) {
  if (action === 'FORCE') return true;
  if (action === 'START_SESSION') return true;
  return Boolean(transitionTable[current]?.[action]);
}
