import { AnyQuestion, Team, QuizTemplate, AnswerEntry, Language, CozyQuizDraft } from '@shared/quizTypes';

export const API_BASE = (() => {
  const envBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (envBase) return envBase;
  const { protocol, hostname, port, origin } = window.location;
  // Dev: localhost/127.* mit Port 5173 -> backend auf 4000
  const isLocal = hostname === 'localhost' || hostname.startsWith('127.');
  if (isLocal) return `${protocol}//${hostname}:4000/api`;
  // Prod: gleicher Origin + /api
  return `${origin}/api`;
})();

// Helper: Füge Admin-Token zu Admin-Requests hinzu
const getAdminToken = (roomCode: string): string | null => {
  return sessionStorage.getItem(`admin-token-${roomCode}`);
};

const addAdminTokenIfPresent = (url: string, roomCode: string): string => {
  const token = getAdminToken(roomCode);
  if (token) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
  return url;
};

export interface JoinResponse {
  team: Team;
  roomCode: string;
}

export const joinRoom = async (roomCode: string, teamName: string, teamId?: string, avatarId?: string): Promise<JoinResponse> => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamName, teamId, avatarId })
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

export const fetchHealth = async (): Promise<{ ok: boolean }> => {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend nicht erreichbar');
  return res.json();
};

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
  if (!res.ok) {
    let detail = 'Antwort konnte nicht gesendet werden';
    try {
      const data = await res.json();
      if (data && typeof data.error === 'string') {
        detail = data.error;
      }
    } catch {
      // ignore JSON parse errors; keep generic message
    }
    throw new Error(detail);
  }
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
  const url = addAdminTokenIfPresent(`${API_BASE}/rooms/${roomCode}/resolve`, roomCode);
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Auswertung fehlgeschlagen');
  return res.json();
};

export const resolveGeneric = async (roomCode: string) => {
  const url = addAdminTokenIfPresent(`${API_BASE}/rooms/${roomCode}/resolve`, roomCode);
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Auswertung fehlgeschlagen');
  return res.json();
};

export const revealAnswers = async (roomCode: string) => {
  const url = addAdminTokenIfPresent(`${API_BASE}/rooms/${roomCode}/reveal`, roomCode);
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Aufdecken fehlgeschlagen');
  return res.json();
};

export const fetchScoreboard = async (roomCode: string) => {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/scoreboard`);
  if (!res.ok) throw new Error('Scoreboard konnte nicht geladen werden');
  return res.json() as Promise<{ teams: Team[] }>;
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
  if (!res.ok) throw new Error('Quiz konnte nicht gel├Âscht werden');
  return res.json();
};

export const useQuiz = async (roomCode: string, quizId: string) => {
  const url = addAdminTokenIfPresent(`${API_BASE}/rooms/${roomCode}/use-quiz`, roomCode);
  const res = await fetch(url, {
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
  if (!res.ok) throw new Error('N├ñchste Frage konnte nicht gestartet werden');
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
  payload: { mixedMechanic?: string | null; answer?: unknown; catalogId?: string | null; mediaSlots?: { count?: number; urls?: string[] } | null }
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
  if (!res.ok) throw new Error('Layout konnte nicht zur├╝ckgesetzt werden');
  return res.json() as Promise<{ ok: boolean }>;
};

// Fragen laden (mit Usage/Images)
export const fetchQuestions = async (): Promise<{ questions: AnyQuestion[] }> => {
  const res = await fetch(`${API_BASE}/questions`);
  if (!res.ok) throw new Error('Fragen konnten nicht geladen werden');
  return res.json();
};

// Neue Frage anlegen (nur f├╝r Admin/Creator)
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
export const fetchLeaderboard = async (): Promise<{ runs: any[]; allTime?: { topTeams: any[]; funnyAnswers: any[]; lastUpdated?: number } }> => {
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

// Studio Drafts (Quiz-Definitionen)
export const fetchStudioDrafts = async (): Promise<{ ok: boolean; drafts: any[] }> => {
  const res = await fetch(`${API_BASE}/studio/quizzes`);
  if (!res.ok) throw new Error('Drafts konnten nicht geladen werden');
  return res.json();
};

export const fetchStudioDraft = async (draftId: string): Promise<{ ok: boolean; draft: any }> => {
  const res = await fetch(`${API_BASE}/studio/quizzes/${draftId}`);
  if (!res.ok) throw new Error('Draft konnte nicht geladen werden');
  return res.json();
};

export const publishStudioDraft = async (draft: any): Promise<{ ok: boolean; id?: string }> => {
  const res = await fetch(`${API_BASE}/studio/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft)
  });
  if (!res.ok) throw new Error('Draft konnte nicht gespeichert werden');
  return res.json();
};

export interface CozyDraftSummary {
  id: string;
  title: string;
  language: Language;
  date: number | null;
  status: string;
  updatedAt: number;
  createdAt: number;
  questionCount: number;
  potatoCount: number;
  blitzThemes: number;
}

export const listCozyDrafts = async (): Promise<{ drafts: CozyDraftSummary[]; offline?: boolean }> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_BASE}/studio/cozy60`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!res.ok) throw new Error('Cozy-Drafts konnten nicht geladen werden');
    const data = await res.json();
    
    // Cache the result for offline fallback
    localStorage.setItem('cozy-drafts-backup', JSON.stringify(data));
    
    return { drafts: data.drafts, offline: false };
  } catch (err) {
    // Try to load from local cache
    const cached = localStorage.getItem('cozy-drafts-backup');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        return { drafts: data.drafts || [], offline: true };
      } catch {
        return { drafts: [], offline: true };
      }
    }
    // No cache available, return empty list in offline mode instead of throwing
    console.warn('Cozy-Drafts offline und kein Cache vorhanden');
    return { drafts: [], offline: true };
  }
};

export const createCozyDraft = async (meta?: Partial<CozyQuizDraft['meta']>): Promise<{ draft: CozyQuizDraft; warnings?: string[] }> => {
  const res = await fetch(`${API_BASE}/studio/cozy60`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meta })
  });
  if (!res.ok) throw new Error('Draft konnte nicht erstellt werden');
  return res.json();
};

export const fetchCozyDraft = async (draftId: string): Promise<{ draft: CozyQuizDraft; warnings?: string[] }> => {
  const res = await fetch(`${API_BASE}/studio/cozy60/${draftId}`);
  if (!res.ok) throw new Error('Draft konnte nicht geladen werden');
  return res.json();
};

export const duplicateCozyDraft = async (
  sourceDraftId: string,
  newTitle: string
): Promise<{ draft: CozyQuizDraft; warnings?: string[] }> => {
  const res = await fetch(`${API_BASE}/studio/cozy60/${sourceDraftId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newTitle })
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
    } catch {
      // ignore JSON parse errors
    }
    throw new Error('Draft konnte nicht dupliziert werden');
  }
  return res.json();
};

export const saveCozyDraft = async (
  draftId: string,
  payload: Partial<CozyQuizDraft>
): Promise<{ draft: CozyQuizDraft; warnings?: string[] }> => {
  const res = await fetch(`${API_BASE}/studio/cozy60/${draftId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Draft konnte nicht gespeichert werden');
  return res.json();
};

export const publishCozyDraft = async (
  draftId: string,
  payload?: { draft?: Partial<CozyQuizDraft>; quizId?: string }
): Promise<{ ok: boolean; draft: CozyQuizDraft; quizId: string; warnings?: string[] }> => {
  const res = await fetch(`${API_BASE}/studio/cozy60/${draftId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {})
  });
  if (!res.ok) throw new Error('Draft konnte nicht veroeffentlicht werden');
  return res.json();
};

// Published Quizzes (für Moderator/Beamer auswählbar)
export const publishQuiz = async (payload: {
  id: string;
  name: string;
  questionIds: string[];
  theme?: any;
  layout?: any;
  language?: string;
}) => {
  const res = await fetch(`${API_BASE}/quizzes/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Quiz konnte nicht veroeffentlicht werden');
  return res.json();
};

export const listPublishedQuizzes = async () => {
  const res = await fetch(`${API_BASE}/quizzes/published`);
  if (!res.ok) throw new Error('Veröffentlichte Quizzes konnten nicht geladen werden');
  return res.json() as Promise<{ quizzes: { id: string; name: string; questionIds: string[]; theme?: any; layout?: any; language?: string }[] }>;
};
