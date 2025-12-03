import {
  AnyQuestion,
  AnswerResult,
  EstimateQuestion,
  MultipleChoiceQuestion,
  SortItemsQuestion,
  TrueFalseQuestion
} from '../../../shared/quizTypes';

type Answers = Record<string, unknown>;

export interface MechanicHandler {
  evaluate: (question: AnyQuestion, answers: Answers) => AnswerResult[];
}

const normalizeStr = (val: unknown): string =>
  typeof val === 'string' ? val.trim().toLowerCase() : String(val ?? '').trim().toLowerCase();

const estimateHandler: MechanicHandler = {
  evaluate: (question: AnyQuestion, answers: Answers) => {
    const q = question as EstimateQuestion;
    let winner: { teamId: string; distance: number } | null = null;
    Object.entries(answers).forEach(([teamId, raw]) => {
      const parsed = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isNaN(parsed)) return;
      const distance = Math.abs(parsed - q.targetValue);
      if (!winner || distance < winner.distance) {
        winner = { teamId, distance };
      }
    });
    if (winner === null) {
      return [];
    }
    const { teamId } = winner;
    return [{ teamId, isCorrect: true }];
  }
};

const multipleChoiceHandler: MechanicHandler = {
  evaluate: (question: AnyQuestion, answers: Answers) => {
    const q = question as MultipleChoiceQuestion;
    const correctIndex = q.correctIndex;
    return Object.entries(answers).map(([teamId, raw]) => {
      const selected = typeof raw === 'number' ? raw : Number(raw);
      const isCorrect = selected === correctIndex;
      return { teamId, isCorrect };
    });
  }
};

const trueFalseHandler: MechanicHandler = {
  evaluate: (question: AnyQuestion, answers: Answers) => {
    const q = question as TrueFalseQuestion;
    return Object.entries(answers).map(([teamId, raw]) => {
      const val = normalizeStr(raw);
      const isCorrect =
        val === 'true' ? q.isTrue === true : val === 'false' ? q.isTrue === false : false;
      return { teamId, isCorrect };
    });
  }
};

const sortItemsHandler: MechanicHandler = {
  evaluate: (question: AnyQuestion, answers: Answers) => {
    const q = question as SortItemsQuestion;
    const target = q.correctOrder.map((s) => s.toLowerCase());
    return Object.entries(answers).map(([teamId, raw]) => {
      const list = String(raw ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const isCorrect = list.length === target.length && list.every((v, i) => v === target[i]);
      return { teamId, isCorrect };
    });
  }
};

const imageQuestionHandler: MechanicHandler = {
  evaluate: (question: AnyQuestion, answers: Answers) => {
    const correctAnswer = normalizeStr((question as any).answer);
    return Object.entries(answers).map(([teamId, raw]) => {
      const val = normalizeStr(raw);
      const isCorrect = val === correctAnswer;
      return { teamId, isCorrect };
    });
  }
};

export const mechanicHandlers: Record<string, MechanicHandler> = {
  estimate: estimateHandler,
  multipleChoice: multipleChoiceHandler,
  trueFalse: trueFalseHandler,
  sortItems: sortItemsHandler,
  imageQuestion: imageQuestionHandler
};
