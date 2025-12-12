import { AnyQuestion, Team, QuizTemplate, BingoBoard, AnswerEntry, Language } from '@shared/quizTypes';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export interface JoinResponse {
  team: Team;
  roomCode: string;
  board?: BingoBoard;
}

export const joinRoom = async (roomCode: string, teamName: string, teamId?: string): Promise<JoinResponse> => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamName, teamId })
  });
  if (!res.ok) throw new Error('Beitritt fehlgeschlagen');
  return res.json();
};

export const startQuestion = async (roomCode: string, questionId: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/start-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId })
  });
  if (!res.ok) throw new Error('Start fehlgeschlagen');
  return res.json();
};

export interface QuestionMeta {
  globalIndex: number;
  globalTotal: number;
  categoryIndex: number;
  categoryTotal: number;
  categoryKey: string;
  categoryName: string;
}

export const fetchCurrentQuestion = async (
  roomCode: string
): Promise<{ question: AnyQuestion | null; meta?: QuestionMeta | null }> => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/current-question`);
  if (!res.ok) throw new Error('Laden der Frage fehlgeschlagen');
  return res.json();
};

export const submitAnswer = async (roomCode: string, teamId: string, answer: unknown) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, answer })
  });
  if (!res.ok) throw new Error('Antwort konnte nicht gesendet werden');
  return res.json();
};

export const fetchAnswers = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/answers`);
  if (!res.ok) throw new Error('Antworten konnten nicht geladen werden');
  return res.json() as Promise<{
    answers: Record<string, AnswerEntry>;
    teams: Record<string, Team>;
    solution?: string;
  }>;
};

export const resolveEstimate = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Auswertung fehlgeschlagen');
  return res.json();
};

export const resolveGeneric = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Auswertung fehlgeschlagen');
  return res.json();
};

// Neue API: Aufdecken / reveal
export const revealAnswers = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/reveal`, { method: 'POST' });
  if (!res.ok) throw new Error('Aufdecken fehlgeschlagen');
  return res.json();
};

export const fetchScoreboard = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/scoreboard`);
  if (!res.ok) throw new Error('Scoreboard konnte nicht geladen werden');
  return res.json() as Promise<{ teams: Team[]; boards?: Record<string, BingoBoard> }>;
};

export const kickTeam = async (roomCode: string, teamId: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/teams/${teamId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Team konnte nicht entfernt werden');
  return res.json();
};

// Quiz Templates
export const fetchQuizzes = async (): Promise<{ quizzes: QuizTemplate[] }> => {
  const res = await fetch(`${API_BASE}/quizzes`);
  if (!res.ok) throw new Error('Quizzes konnten nicht geladen werden');
  return res.json();
};

export const deleteQuiz = async (quizId: string) => {
  const res = await fetch(`${API_BASE}/quizzes/${quizId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Quiz konnte nicht gelöscht werden');
  return res.json();
};

export const useQuiz = async (roomCode: string, quizId: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/use-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizId })
  });
  if (!res.ok) throw new Error('Quiz konnte nicht gesetzt werden');
  return res.json();
};

export const startNextQuestion = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/next-question`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Nächste Frage konnte nicht gestartet werden');
  return res.json();
};

// Bingo
export const fetchBingoBoard = async (roomCode: string, teamId: string): Promise<{ board: BingoBoard }> => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/board/${teamId}`);
  if (!res.ok) throw new Error('Bingo-Board konnte nicht geladen werden');
  return res.json();
};

export const markBingoCell = async (roomCode: string, teamId: string, cellIndex: number) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/bingo/mark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, cellIndex })
  });
  if (!res.ok) throw new Error('Feld konnte nicht markiert werden');
  return res.json();
};

// Manuelle Korrektur einer Antwort
export const overrideAnswer = async (roomCode: string, teamId: string, isCorrect: boolean) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/answers/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, isCorrect })
  });
  if (!res.ok) throw new Error('Korrektur fehlgeschlagen');
  return res.json();
};

// Timer
export const startTimer = async (roomCode: string, seconds: number) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/timer/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds })
  });
  if (!res.ok) throw new Error('Timer konnte nicht gestartet werden');
  return res.json();
};

export const stopTimer = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/timer/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Timer konnte nicht gestoppt werden');
  return res.json();
};

export const fetchTimer = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/timer`);
  if (!res.ok) throw new Error('Timer-Status konnte nicht geladen werden');
  return res.json();
};

// Sprache
export const fetchLanguage = async (roomCode: string): Promise<{ language: Language }> => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/language`);
  if (!res.ok) throw new Error('Sprache konnte nicht geladen werden');
  return res.json();
};

export const setLanguage = async (roomCode: string, language: Language) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/language`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language })
  });
  if (!res.ok) throw new Error('Sprache konnte nicht gespeichert werden');
  return res.json();
};

// Custom Quiz erstellen (Creator)
export const createCustomQuiz = async (
  name: string,
  questionIds: string[],
  extras?: { meta?: unknown; categories?: unknown }
) => {
  const res = await fetch(`${API_BASE}/quizzes/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, questionIds, ...extras })
  });
  if (!res.ok) throw new Error('Quiz konnte nicht gespeichert werden');
  return res.json();
};

// Frage-Bild hochladen
export const uploadQuestionImage = async (questionId: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  form.append('questionId', questionId);
  const res = await fetch(`${API_BASE}/upload/question-image`, {
    method: 'POST',
    body: form
  });
  if (!res.ok) throw new Error('Bild-Upload fehlgeschlagen');
  return res.json() as Promise<{ imageUrl: string }>;
};

export const deleteQuestionImage = async (questionId: string) => {
  const res = await fetch(`${API_BASE}/upload/question-image`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId })
  });
  if (!res.ok) throw new Error('Bild konnte nicht entfernt werden');
  return res.json();
};

// Frage-Metadaten (z. B. mixedMechanic, answer) setzen
export const setQuestionMeta = async (
  questionId: string,
  payload: { mixedMechanic?: string | null; answer?: unknown }
) => {
  const res = await fetch(`${API_BASE}/questions/${questionId}/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Metadaten konnten nicht gespeichert werden');
  return res.json() as Promise<{ ok: boolean; override?: unknown }>;
};

// Frage-Layout setzen (Offsets)
export const setQuestionLayout = async (
  questionId: string,
  payload: { imageOffsetX?: number; imageOffsetY?: number; logoOffsetX?: number; logoOffsetY?: number }
) => {
  const res = await fetch(`${API_BASE}/questions/${questionId}/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Layout konnte nicht gespeichert werden');
  return res.json() as Promise<{ ok: boolean; override?: unknown }>;
};

export const resetQuestionLayout = async (questionId: string) => {
  const res = await fetch(`${API_BASE}/questions/${questionId}/layout`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Layout konnte nicht zurückgesetzt werden');
  return res.json() as Promise<{ ok: boolean }>;
};

// Fragen laden (mit Usage/Images)
export const fetchQuestions = async (): Promise<{ questions: AnyQuestion[] }> => {
  const res = await fetch(`${API_BASE}/questions`);
  if (!res.ok) throw new Error('Fragen konnten nicht geladen werden');
  return res.json();
};

// Neue Frage anlegen (nur für Admin/Creator)
export const createQuestion = async (payload: Partial<AnyQuestion>) => {
  const res = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Frage konnte nicht angelegt werden');
  return res.json() as Promise<{ question: AnyQuestion }>;
};

export const updateQuestion = async (id: string, payload: Partial<AnyQuestion>) => {
  const res = await fetch(`${API_BASE}/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Frage konnte nicht aktualisiert werden');
  return res.json() as Promise<{ question: AnyQuestion }>;
};

// Quiz Layout (Presentation)
export const fetchQuizLayout = async (quizId: string): Promise<{ layout: any | null }> => {
  const res = await fetch(`${API_BASE}/quizzes/${quizId}/layout`);
  if (!res.ok) throw new Error('Layout konnte nicht geladen werden');
  return res.json();
};

export const saveQuizLayout = async (quizId: string, layout: any) => {
  const res = await fetch(`${API_BASE}/quizzes/${quizId}/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout)
  });
  if (!res.ok) throw new Error('Layout konnte nicht gespeichert werden');
  return res.json();
};

// Stats & Leaderboard
export const fetchLeaderboard = async (): Promise<{ runs: any[] }> => {
  const res = await fetch(`${API_BASE}/stats/leaderboard`);
  if (!res.ok) throw new Error('Leaderboard konnte nicht geladen werden');
  return res.json();
};

export const postRunStats = async (payload: { quizId: string; date: string; winners: string[]; scores?: Record<string, number> }) => {
  const res = await fetch(`${API_BASE}/stats/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Run-Stats konnten nicht gespeichert werden');
  return res.json();
};

export const postQuestionStats = async (payload: { questionId: string; correct?: number; total?: number; breakdown?: Record<string, number> }) => {
  const res = await fetch(`${API_BASE}/stats/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Frage-Stats konnten nicht gespeichert werden');
  return res.json();
};

export const fetchQuestionStat = async (questionId: string): Promise<{ stat: any | null }> => {
  const res = await fetch(`${API_BASE}/stats/question/${questionId}`);
  if (!res.ok) throw new Error('Frage-Stat konnte nicht geladen werden');
  return res.json();
};

