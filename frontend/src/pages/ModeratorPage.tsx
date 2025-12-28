import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentQuestion,
  fetchQuestions,
  startTimer,
  stopTimer,
  setLanguage,
  fetchQuizzes,
  useQuiz,
  overrideAnswer,
  kickTeam,
  fetchAnswers,
  fetchTimer,
  fetchScoreboard,
  postQuestionStats,
  postRunStats,
  fetchLeaderboard,
  fetchHealth,
  listPublishedQuizzes
} from '../api';
import { AnswerEntry, AnyQuestion, QuizTemplate, Language } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryIcons } from '../categoryAssets';
import { useQuizSocket } from '../hooks/useQuizSocket';
import TimerCard from '../components/moderator/TimerCard';
import AnswerList from '../components/moderator/AnswerList';
import TeamsList from '../components/moderator/TeamsList';
import ActionButtons from '../components/moderator/ActionButtons';
import StatusDot from '../components/moderator/StatusDot';
import LeaderboardPanel from '../components/moderator/LeaderboardPanel';
import { loadPlayDraft } from '../utils/draft';
import { connectControlSocket } from '../socket';

type AnswersState = {
  answers: Record<string, (AnswerEntry & { answer?: unknown })>;
  teams: Record<string, { name: string; isReady?: boolean }>;
  solution?: string;
};

type Phase = 'setup' | 'question' | 'evaluating' | 'final';
type ViewPhase = 'pre' | 'lobby' | 'intro' | 'quiz';
type LeaderboardRun = { quizId: string; date: string; winners: string[]; scores?: Record<string, number> };

const card: React.CSSProperties = {
  background: 'rgba(10,14,24,0.92)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 14px 32px rgba(0,0,0,0.32)',
  backdropFilter: 'blur(10px)',
  overflow: 'hidden'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#0f172a',
  color: '#e5e7eb',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  fontWeight: 600
};

const timerButtonStyle: React.CSSProperties = {
  ...inputStyle,
  width: 90,
  padding: '8px 10px',
  overflow: 'hidden',
  borderRadius: 12
};

const statChip: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 9999,
  padding: '6px 10px',
  fontSize: 12,
  color: '#cbd5e1',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  lineHeight: 1
};

const actionWrap: React.CSSProperties = {
  background: 'rgba(12,16,26,0.82)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  padding: 12,
  boxShadow: '0 12px 26px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(10px)',
  overflow: 'hidden'
};

const pillStyle = (tone: 'setup' | 'live' | 'eval' | 'final'): React.CSSProperties => {
  const map = {
    setup: { bg: 'rgba(99,229,255,0.12)', border: 'rgba(99,229,255,0.4)', color: '#7dd3fc' },
    live: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.4)', color: '#86efac' },
    eval: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)', color: '#fcd34d' },
    final: { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.4)', color: '#7dd3fc' }
  } as const;
  const p = map[tone];
  return {
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.06em',
    background: p.bg,
    border: `1px solid ${p.border}`,
    color: p.color,
    textTransform: 'uppercase'
  };
};

const pill = (text: string, tone: 'setup' | 'live' | 'eval' | 'final') => <span style={pillStyle(tone)}>{text}</span>;

const ModeratorPage: React.FC = () => {
  const draftTheme = loadPlayDraft()?.theme;
  const getStoredRoom = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('moderatorRoom') || '';
  };
  const [roomCode, setRoomCode] = useState<string>(() => getStoredRoom());
  const [roomInput, setRoomInput] = useState<string>(() => getStoredRoom());
  const [language, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('moderatorLanguage');
    return saved === 'de' || saved === 'en' || saved === 'both' ? (saved as Language) : 'de';
  });
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [meta, setMeta] = useState<{ globalIndex?: number; globalTotal?: number; categoryKey?: string } | null>(null);
  const [answers, setAnswers] = useState<AnswersState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const saved = localStorage.getItem('moderatorTimerSeconds');
    return saved ? Number(saved) || 30 : 30;
  });
  const [statsView, setStatsView] = useState<'runs' | 'question'>('runs');
  const [health, setHealth] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [phase, setPhase] = useState<Phase>('setup');
  const [viewPhase, setViewPhase] = useState<ViewPhase>('pre');
  const [userViewPhase, setUserViewPhase] = useState<ViewPhase | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRun[]>([]);
  const [potatoThemeInput, setPotatoThemeInput] = useState('');
  const [potatoBanDrafts, setPotatoBanDrafts] = useState<Record<string, string>>({});
  const [potatoAnswerInput, setPotatoAnswerInput] = useState('');
  const [potatoWinnerDraft, setPotatoWinnerDraft] = useState('');
  const [potatoTick, setPotatoTick] = useState(0);
  const lastReportedQuestionId = React.useRef<string | null>(null);
  const [slotHoldMs, setSlotHoldMs] = useState(2400);
  const [slotExitMs, setSlotExitMs] = useState(1200);
  const [actionState, setActionState] = useState<{
    quiz: boolean;
    next: boolean;
    lock: boolean;
    timerStart: boolean;
    timerStop: boolean;
    reveal: boolean;
  }>({ quiz: false, next: false, lock: false, timerStart: false, timerStop: false, reveal: false });
  const [quizzes, setQuizzes] = useState<QuizTemplate[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [creatingSession, setCreatingSession] = useState(false);
  const controlSocketRef = React.useRef<ReturnType<typeof connectControlSocket> | null>(null);
  const {
    currentQuestion: socketQuestion,
    questionMeta: socketMeta,
    answers: socketAnswers,
    teams: socketTeams,
    solution: socketSolution,
    questionPhase: socketQuestionPhase,
    scores: socketScores,
    potato,
    emit: socketEmit
  } = useQuizSocket(roomCode);
  const changeViewPhase = (phase: ViewPhase) => {
    setUserViewPhase(phase);
    setViewPhase(phase);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('roomCode');
    if (code) {
      setRoomCode(code.toUpperCase());
      setRoomInput(code.toUpperCase());
    }
  }, []);

  useEffect(() => {
    const socket = connectControlSocket();
    controlSocketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  // Load initial question + question list (for meta)
  useEffect(() => {
    const savedQuiz = localStorage.getItem('moderatorSelectedQuiz');
    const savedLang = localStorage.getItem('moderatorLanguage');
    if (savedLang === 'de' || savedLang === 'en' || savedLang === 'both') setLang(savedLang);
    if (savedQuiz) setSelectedQuiz((prev) => prev || savedQuiz);
    const loadQuizzes = async () => {
      try {
        const [res, pub] = await Promise.all([fetchQuizzes(), listPublishedQuizzes().catch(() => ({ quizzes: [] }))]);
        const merged: QuizTemplate[] = [
          ...(res.quizzes || []),
          ...(pub.quizzes || []).map((q) => ({ id: q.id, name: `${q.name} (Published)`, mode: 'ordered', questionIds: q.questionIds }))
        ];
        setQuizzes(merged);
        if (merged.length) {
          setSelectedQuiz((prev) => {
            if (prev) return prev;
            const fallback = savedQuiz && merged.find((q) => q.id === savedQuiz)?.id;
            return fallback || merged[0].id;
          });
        }
      } catch {
        // ignore
      }
    };
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    localStorage.setItem('moderatorRoom', roomCode);
    const load = async () => {
      try {
        const res = await fetchCurrentQuestion(roomCode);
        setQuestion(res.question);
        setMeta(res.meta ?? null);
        const hasQuestion = Boolean(res.question);
        setPhase(hasQuestion ? 'question' : 'setup');
        setViewPhase(userViewPhase ?? (hasQuestion ? 'quiz' : 'pre'));
        await fetchQuestions(); // just to warm cache
      } catch (err) {
        setToast((err as Error).message);
      }
    };
    load();
  }, [roomCode, userViewPhase]);

  // Socket updates: separate effects to avoid re-running on every render
  useEffect(() => {
    if (socketQuestion === undefined) return;
    const nextQuestion = socketQuestion ?? null;
    setQuestion(nextQuestion);
    const hasQuestion = Boolean(nextQuestion);
    setPhase(hasQuestion ? 'question' : 'setup');
    if (hasQuestion) {
      setViewPhase(userViewPhase ?? 'quiz');
    } else if (!userViewPhase) {
      setViewPhase('pre');
    }
  }, [socketQuestion, userViewPhase]);

  useEffect(() => {
    if (socketMeta !== undefined) {
      setMeta(socketMeta ?? null);
    }
  }, [socketMeta]);

  useEffect(() => {
    if (socketAnswers || socketTeams || socketSolution) {
      setAnswers((prev) => ({
        answers: socketAnswers ?? prev?.answers ?? {},
        teams: socketTeams ?? prev?.teams ?? {},
        solution: socketSolution ?? prev?.solution
      }));
    }
  }, [socketAnswers, socketTeams, socketSolution]);

  useEffect(() => {
    if (socketQuestionPhase === 'evaluated') setPhase('evaluating');
    if (socketQuestionPhase === 'revealed') setPhase('final');
  }, [socketQuestionPhase]);

  // Auto-Stats bei Reveal
  useEffect(() => {
    if (phase !== 'final' || !question) return;
    if (lastReportedQuestionId.current === question.id) return;
    lastReportedQuestionId.current = question.id;
    const total = Object.keys(answers?.answers || {}).length;
    const correct = Object.values(answers?.answers || {}).filter((a: any) => a?.isCorrect).length;
    postQuestionStats({ questionId: question.id, total, correct }).catch(() => undefined);
  }, [phase, question, answers]);

  // Sync Beamer to lobby when Moderator switches to lobby
  useEffect(() => {
    if (viewPhase === 'lobby' && roomCode) {
      socketEmit?.('beamer:show-rules', roomCode);
    }
  }, [viewPhase, roomCode, socketEmit]);

  useEffect(() => {
    fetchLeaderboard()
      .then((res) => setLeaderboard(res.runs || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => setPotatoTick((tick) => tick + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const doAction = async (fn: () => Promise<any>, msg?: string) => {
    try {
      await fn();
      if (msg) setToast(msg);
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleRoomConnect = () => {
    const code = roomInput.trim().toUpperCase();
    if (!code) {
      setToast('Roomcode fehlt');
      return;
    }
    setRoomCode(code);
    localStorage.setItem('moderatorRoom', code);
  };

  const handleCreateSession = () => {
    if (!selectedQuiz) {
      setToast('Bitte zuerst ein Quiz auswählen');
      return;
    }
    const socket = controlSocketRef.current;
    if (!socket) return;
    setCreatingSession(true);
    socket.emit(
      'host:createSession',
      { quizId: selectedQuiz, language },
      (resp?: { ok: boolean; roomCode?: string; error?: string }) => {
        setCreatingSession(false);
        if (!resp?.ok || !resp.roomCode) {
          setToast(resp?.error || 'Session konnte nicht erstellt werden');
          return;
        }
        setRoomCode(resp.roomCode);
        setRoomInput(resp.roomCode);
        localStorage.setItem('moderatorRoom', resp.roomCode);
      }
    );
  };

  const sendHostCommand = (
    eventName: 'host:next' | 'host:lock' | 'host:reveal',
    onSuccess?: () => void
  ) => {
    if (!roomCode) {
      setToast('Kein aktiver Roomcode');
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      return;
    }
    const keyMap = {
      'host:next': 'next',
      'host:lock': 'lock',
      'host:reveal': 'reveal'
    } as const;
    const key = keyMap[eventName];
    setActionState((prev) => ({ ...prev, [key]: true }));
    socketEmit(eventName, { roomCode }, (resp?: { ok: boolean; error?: string }) => {
      setActionState((prev) => ({ ...prev, [key]: false }));
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        return;
      }
      onSuccess?.();
    });
  };

  const handleNextQuestion = () => {
    sendHostCommand('host:next', async () => {
      await loadCurrentQuestion();
      await loadAnswers();
    });
  };

  const handleLockQuestion = () => {
    sendHostCommand('host:lock', async () => {
      await loadAnswers();
    });
  };

  const handleReveal = () => {
    sendHostCommand('host:reveal', async () => {
      await loadAnswers();
    });
  };

  const emitPotatoEvent = (
    eventName:
      | 'host:startPotato'
      | 'host:banPotatoTheme'
      | 'host:confirmPotatoThemes'
      | 'host:potatoStartRound'
      | 'host:potatoSubmitTurn'
      | 'host:potatoStrikeActive'
      | 'host:potatoNextTurn'
      | 'host:potatoEndRound'
      | 'host:potatoNextRound'
      | 'host:potatoFinish',
    payload?: Record<string, unknown>,
    onSuccess?: () => void
  ) => {
    if (!roomCode) {
      setToast('Roomcode fehlt');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    socketEmit(eventName, { roomCode, ...(payload || {}) }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        setTimeout(() => setToast(null), 2200);
        return;
      }
      onSuccess?.();
    });
  };

  const handlePotatoStart = () => {
    const text = potatoThemeInput.trim();
    emitPotatoEvent(
      'host:startPotato',
      text ? { themesText: text } : {},
      () => setPotatoThemeInput('')
    );
  };

  const handlePotatoBan = (teamId: string) => {
    const selection = (potatoBanDrafts[teamId] || '').trim();
    if (!selection) {
      setToast('Bitte zuerst ein Thema auswählen');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    emitPotatoEvent('host:banPotatoTheme', { teamId, theme: selection }, () =>
      setPotatoBanDrafts((prev) => ({ ...prev, [teamId]: '' }))
    );
  };

  const handlePotatoConfirmThemes = () => emitPotatoEvent('host:confirmPotatoThemes');
  const handlePotatoStartRound = () => emitPotatoEvent('host:potatoStartRound');
  const handlePotatoNextRound = () => emitPotatoEvent('host:potatoNextRound');
  const handlePotatoFinish = () => emitPotatoEvent('host:potatoFinish');
  const handlePotatoNextTurn = () => emitPotatoEvent('host:potatoNextTurn');
  const handlePotatoStrike = () => emitPotatoEvent('host:potatoStrikeActive');
  const handlePotatoEndRound = () =>
    emitPotatoEvent(
      'host:potatoEndRound',
      potatoWinnerDraft ? { winnerId: potatoWinnerDraft } : {},
      () => setPotatoWinnerDraft('')
    );

  const handlePotatoSubmit = (verdict: 'correct' | 'strike') => {
    if (verdict === 'correct') {
      const trimmed = potatoAnswerInput.trim();
      if (!trimmed) {
        setToast('Antwort fehlt');
        setTimeout(() => setToast(null), 2000);
        return;
      }
      emitPotatoEvent(
        'host:potatoSubmitTurn',
        { verdict, answer: trimmed },
        () => setPotatoAnswerInput('')
      );
      return;
    }
    emitPotatoEvent('host:potatoSubmitTurn', { verdict });
  };

  const answersCount = Object.keys(answers?.answers || {}).length;
  const teamsCount = Object.keys(answers?.teams || {}).length;
  const unreviewedCount = Object.values(answers?.answers || {}).filter((a) => (a as any).isCorrect === undefined).length;
  const scoreboard = useMemo(
    () => (socketScores ? [...socketScores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) : []),
    [socketScores]
  );
  const teamLookup = useMemo(() => {
    const map: Record<string, { name: string; score: number }> = {};
    scoreboard.forEach((entry) => {
      map[entry.id] = { name: entry.name, score: entry.score ?? 0 };
    });
    Object.entries(answers?.teams || {}).forEach(([id, team]) => {
      map[id] = { name: team?.name ?? map[id]?.name ?? 'Team', score: map[id]?.score ?? (team as any)?.score ?? 0 };
    });
    return map;
  }, [answers, scoreboard]);
  const potatoDeadline = potato?.deadline ?? null;
  const potatoTimeLeft = useMemo(() => {
    if (!potatoDeadline) return null;
    return Math.max(0, Math.ceil((potatoDeadline - Date.now()) / 1000));
  }, [potatoDeadline, potatoTick]);
  const potatoRoundsTotal = potato?.selectedThemes?.length ?? 0;

  const numericStats = useMemo(() => {
    if (!answers) return null;
    const values = Object.values(answers.answers)
      .map((a) => {
        const raw = (a as any).answer ?? (a as any).value;
        return typeof raw === 'number' ? raw : Number(raw);
      })
      .filter((v) => !Number.isNaN(v));
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = sorted.reduce((s, v, _, arr) => s + v / arr.length, 0);
    return { min, max, median, avg: Math.round(avg * 100) / 100, count: values.length };
  }, [answers]);

  const topTexts = useMemo(() => {
    if (!answers) return [];
    const freq: Record<string, number> = {};
    Object.values(answers.answers).forEach((a) => {
      const raw = (a as any).answer ?? (a as any).value;
      if (typeof raw === 'string') {
        const key = raw.trim() || '(leer)';
        freq[key] = (freq[key] || 0) + 1;
      }
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [answers]);

  const answerStats = useMemo(() => {
    if (!answers) return null;
    const total = Object.keys(answers.answers).length;
    const correct = Object.values(answers.answers).filter((a: any) => a?.isCorrect === true).length;
    const perOption: Record<string, number> = {};
    if (question?.mechanic === 'multipleChoice' && (question as any)?.options) {
      Object.values(answers.answers).forEach((a: any) => {
        const raw = a?.answer ?? a?.value;
        const key = raw !== undefined ? String(raw) : '—';
        perOption[key] = (perOption[key] || 0) + 1;
      });
    }
    return { total, correct, perOption };
  }, [answers, question]);

  const catKey = (question as any)?.category as keyof typeof categoryColors;
  const catColor = categoryColors[catKey] ?? '#6dd5fa';
  const catIcon = categoryIcons[catKey];
  const readyCount = useMemo(() => {
    const teams = Object.values(answers?.teams || {});
    const ready = teams.filter((t: any) => t?.isReady).length;
    return { ready, total: teams.length };
  }, [answers]);
  const currentQuizName = quizzes.find((q) => q.id === selectedQuiz)?.name;
  const phaseChip = (() => {
    const label =
      phase === 'question' ? 'Live' : phase === 'evaluating' ? 'Bewertung' : phase === 'final' ? 'Aufgeloest' : 'Bereit';
    const tone: 'setup' | 'live' | 'eval' | 'final' =
      phase === 'question' ? 'live' : phase === 'evaluating' ? 'eval' : phase === 'final' ? 'final' : 'setup';
    return pill(`Phase: ${label}`, tone);
  })();

  const phaseLabel =
    viewPhase === 'pre'
      ? 'Vor Quiz'
      : viewPhase === 'lobby'
      ? 'Lobby'
      : viewPhase === 'intro'
      ? 'Intro'
      : 'Quiz';

  const endQuizAndReport = async () => {
    try {
      const res = await fetchScoreboard(roomCode);
      const teams = res.teams || [];
      const sorted = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0));
      const winners = sorted.slice(0, 3).map((t) => t.name);
      const scores: Record<string, number> = {};
      sorted.forEach((t) => {
        scores[t.name] = t.score || 0;
      });
      await postQuestionStats({ questionId: '__quiz_end__', total: teams.length, correct: teams.length }); // marker
      await postRunStats({
        quizId: selectedQuiz || roomCode,
        date: new Date().toISOString(),
        winners,
        scores
      });
      fetchLeaderboard()
        .then((res) => setLeaderboard(res.runs || []))
        .catch(() => undefined);
      setToast('Quiz-Stats gespeichert');
    } catch (err) {
      setToast('Quiz-Stats konnten nicht gespeichert werden');
    } finally {
      setTimeout(() => setToast(null), 2000);
    }
  };

  const renderActions = () => (
    <ActionButtons
      viewPhase={viewPhase}
      changeViewPhase={changeViewPhase}
      actionWrap={actionWrap}
      inputStyle={inputStyle}
      currentQuizName={currentQuizName}
      selectedQuiz={selectedQuiz}
      setSelectedQuiz={setSelectedQuiz}
      quizzes={quizzes}
      roomCode={roomCode}
      timerSeconds={timerSeconds}
      actionState={actionState}
      setActionState={setActionState}
      doAction={doAction}
      setToast={setToast}
      primaryColor={draftTheme?.color}
      onNext={handleNextQuestion}
      onLock={handleLockQuestion}
      onReveal={handleReveal}
    />
  );

  const renderPotatoControls = () => {
    const shouldShow =
      Boolean(roomCode) && (potato || (meta?.globalIndex ?? 0) >= 19 || scoreboard.length > 0);
    if (!shouldShow) return null;
    const phase = potato?.phase ?? 'IDLE';
    const selectedThemes = potato?.selectedThemes ?? [];
    const banLimits = potato?.banLimits ?? {};
    const bans = potato?.bans ?? {};
    const pool = potato?.pool ?? [];
    const lives = potato?.lives ?? {};
    const turnOrder = potato?.turnOrder ?? [];
    const usedAnswers = potato?.usedAnswers ?? [];
    const isRoundEnd = phase === 'ROUND_END';
    const isPlaying = phase === 'PLAYING';
    const isBanning = phase === 'BANNING';
    const roundsPlayed = potato?.roundIndex ?? -1;
    const firstRoundPending = isRoundEnd && roundsPlayed < 0;
    const allRoundsComplete =
      isRoundEnd && potatoRoundsTotal > 0 && roundsPlayed >= potatoRoundsTotal - 1;
    const activeTeamName = potato?.activeTeamId ? teamLookup[potato.activeTeamId]?.name || potato.activeTeamId : null;
    const lastWinnerName = potato?.lastWinnerId ? teamLookup[potato.lastWinnerId]?.name || potato.lastWinnerId : null;
    return (
      <section style={{ ...card, marginTop: 12 }}>
        {/* TODO(DESIGN_LATER): polish potato admin layout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 14 }}>Finale · Heisse Kartoffel</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Phase: {phase}{' '}
              {potatoRoundsTotal > 0 && `| Runde ${(roundsPlayed >= 0 ? roundsPlayed + 1 : 0)}/${potatoRoundsTotal}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {potatoTimeLeft !== null && isPlaying && (
              <span
                style={{
                  ...statChip,
                  borderColor: 'rgba(248,113,113,0.45)',
                  color: '#fecaca',
                  background: 'rgba(248,113,113,0.12)'
                }}
              >
                Restzeit {potatoTimeLeft}s
              </span>
            )}
            {selectedThemes.length > 0 && (
              <span style={{ ...statChip, background: 'rgba(255,255,255,0.08)' }}>
                Themen: {selectedThemes.join(', ')}
              </span>
            )}
      </div>
    </div>

        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          {!potato && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>
                Nach Frage 20 kannst du hier die Heisse Kartoffel starten. Optional kannst du eigene Themen (eine pro Zeile)
                einfügen, sonst nutzen wir das Standard-Set.
              </div>
              <textarea
                value={potatoThemeInput}
                onChange={(e) => setPotatoThemeInput(e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="Optional: Eigene Themen pro Zeile"
              />
              <button
                style={{
                  ...inputStyle,
                  background: 'linear-gradient(135deg, #fbbf24, #fb923c)',
                  border: '1px solid rgba(251,146,60,0.5)',
                  color: '#1f1305',
                  cursor: 'pointer'
                }}
                onClick={handlePotatoStart}
              >
                FINAL: HEISSE KARTOFFEL STARTEN
              </button>
            </div>
          )}

          {potato && isBanning && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Bans setzen · {pool.length} Themen noch frei</div>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  fontSize: 12,
                  color: '#cbd5e1'
                }}
              >
                {pool.map((theme) => (
                  <span key={theme} style={statChip}>
                    {theme}
                  </span>
                ))}
                {pool.length === 0 && <span style={{ color: '#94a3b8' }}>Keine Themen mehr verfügbar</span>}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {scoreboard.map((team) => {
                  const limit = banLimits[team.id] ?? 0;
                  if (limit <= 0) {
                    return (
                      <div
                        key={team.id}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          padding: 10,
                          opacity: 0.6
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{team.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Keine Bans für dieses Team</div>
                      </div>
                    );
                  }
                  const used = bans[team.id]?.length ?? 0;
                  const exhausted = used >= limit;
                  return (
                    <div
                      key={team.id}
                      style={{
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12,
                        padding: 10,
                        display: 'grid',
                        gap: 6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{team.name}</div>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {used}/{limit} genutzt
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                        Bans: {bans[team.id]?.join(', ') || '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <select
                          value={potatoBanDrafts[team.id] ?? ''}
                          onChange={(e) =>
                            setPotatoBanDrafts((prev) => ({ ...prev, [team.id]: e.target.value }))
                          }
                          disabled={exhausted || pool.length === 0}
                          style={{ ...inputStyle, flex: '1 1 220px', minWidth: 180 }}
                        >
                          <option value="">Thema wählen</option>
                          {pool.map((theme) => (
                            <option key={`${team.id}-${theme}`} value={theme}>
                              {theme}
                            </option>
                          ))}
                        </select>
                        <button
                          style={{
                            ...inputStyle,
                            width: 'auto',
                            background: exhausted ? 'rgba(15,23,42,0.35)' : 'rgba(37,99,235,0.2)',
                            border: '1px solid rgba(96,165,250,0.5)',
                            color: '#bfdbfe',
                            cursor: exhausted ? 'not-allowed' : 'pointer'
                          }}
                          disabled={exhausted}
                          onClick={() => handlePotatoBan(team.id)}
                        >
                          Bann setzen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                style={{
                  ...inputStyle,
                  width: 'auto',
                  background: 'rgba(59,130,246,0.18)',
                  border: '1px solid rgba(59,130,246,0.4)',
                  color: '#bfdbfe',
                  cursor: 'pointer'
                }}
                onClick={handlePotatoConfirmThemes}
              >
                Themen auslosen und Reihenfolge festlegen
              </button>
            </div>
          )}

          {potato && isPlaying && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                Runde {Math.max(1, roundsPlayed + 1)} / {Math.max(1, potatoRoundsTotal)} · Thema:{' '}
                {potato.currentTheme || 'n/a'}
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                Aktives Team: {activeTeamName || '—'} · Used Answers: {usedAnswers.length}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {turnOrder.map((teamId) => (
                  <span
                    key={teamId}
                    style={{
                      ...statChip,
                      background: teamId === potato.activeTeamId ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                      borderColor: teamId === potato.activeTeamId ? 'rgba(129,140,248,0.45)' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {teamLookup[teamId]?.name || teamId} · Leben {lives[teamId] ?? '-'}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={potatoAnswerInput}
                  onChange={(e) => setPotatoAnswerInput(e.target.value)}
                  placeholder="Antwort des Teams"
                  style={{ ...inputStyle, flex: '1 1 220px', minWidth: 200 }}
                />
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'rgba(34,197,94,0.18)',
                    border: '1px solid rgba(34,197,94,0.45)',
                    color: '#bbf7d0',
                    cursor: 'pointer'
                  }}
                  onClick={() => handlePotatoSubmit('correct')}
                >
                  Antwort OK
                </button>
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'rgba(239,68,68,0.18)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: '#fecdd3',
                    cursor: 'pointer'
                  }}
                  onClick={() => handlePotatoSubmit('strike')}
                >
                  Strike
                </button>
                <button
                  style={{ ...inputStyle, width: 'auto' }}
                  onClick={handlePotatoNextTurn}
                >
                  Nächster Zug
                </button>
                <button
                  style={{ ...inputStyle, width: 'auto', background: 'rgba(248,113,113,0.18)' }}
                  onClick={handlePotatoStrike}
                >
                  Leben -1
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={potatoWinnerDraft}
                  onChange={(e) => setPotatoWinnerDraft(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 200px', minWidth: 180 }}
                >
                  <option value="">Sieger wählen (optional)</option>
                  {turnOrder.map((teamId) => (
                    <option key={`winner-${teamId}`} value={teamId}>
                      {teamLookup[teamId]?.name || teamId}
                    </option>
                  ))}
                </select>
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #fcd34d, #f97316)',
                    color: '#1f1305',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoEndRound}
                >
                  Runde abschließen (+3 Punkte)
                </button>
              </div>
              {usedAnswers.length > 0 && (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Letzte Antworten: {usedAnswers.slice(-5).join(', ')}
                </div>
              )}
            </div>
          )}

          {potato && isRoundEnd && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                {firstRoundPending
                  ? 'Bans erledigt · Themes bereit.'
                  : allRoundsComplete
                  ? 'Alle Runden abgeschlossen.'
                  : `Runde ${roundsPlayed + 1} beendet.`}
              </div>
              {lastWinnerName && (
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>Sieger Runde: {lastWinnerName}</div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedThemes.map((theme, idx) => {
                  const done = idx <= roundsPlayed;
                  return (
                    <span
                      key={`theme-${theme}-${idx}`}
                      style={{
                        ...statChip,
                        background: done ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                        borderColor: done ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {theme}
                    </span>
                  );
                })}
                {selectedThemes.length === 0 && (
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Noch keine Themen ausgewählt</span>
                )}
              </div>
              {firstRoundPending && (
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #93c5fd, #3b82f6)',
                    color: '#0b1020',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoStartRound}
                >
                  Runde 1 starten
                </button>
              )}
              {!firstRoundPending && !allRoundsComplete && (
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #6ee7b7, #3b82f6)',
                    color: '#0b1020',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoNextRound}
                >
                  Nächste Runde starten
                </button>
              )}
              {allRoundsComplete && (
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #fcd34d, #f97316)',
                    color: '#1f1305',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoFinish}
                >
                  Finale abschließen · weiter zu Awards
                </button>
              )}
            </div>
          )}

          {potato && potato.phase === 'DONE' && (
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>
              Heisse Kartoffel abgeschlossen. Warte auf Awards oder wechsle zum Scoreboard.
            </div>
          )}
        </div>

        {scoreboard.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Scoreboard</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {scoreboard.map((entry, idx) => (
                <div
                  key={`potato-score-${entry.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.3)'
                  }}
                >
                  <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
                  <span>{entry.name}</span>
                  <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: draftTheme?.background
          ? `url(${draftTheme.background}) center/cover fixed`
          : 'url(/background.png) center/cover fixed, radial-gradient(circle at 18% 18%, rgba(99, 102, 241, 0.2), transparent 34%), radial-gradient(circle at 78% 8%, rgba(56, 189, 248, 0.16), transparent 36%), linear-gradient(180deg, #0b0f1a 0%, #0c111c 100%)',
        color: '#e2e8f0',
        padding: 12,
        maxWidth: 1100,
        margin: '0 auto',
        fontFamily: draftTheme?.font ? `${draftTheme.font}, "Inter", sans-serif` : undefined
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          paddingBottom: 8,
          background: 'linear-gradient(180deg, rgba(10,13,20,0.9) 0%, rgba(10,13,20,0.74) 100%)',
          backdropFilter: 'blur(14px)'
        }}
      >
        {viewPhase === 'pre' && (
          <header
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 8
            }}
          >
            <div style={card}>
              <div
                style={{
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img
                    src="/logo.png"
                    alt="Cozy Kiosk Quiz"
                    style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', boxShadow: 'none' }}
                  />
                  <span style={{ fontWeight: 900, fontSize: 16 }}>Cozy Kiosk Quiz</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {readyCount.total > 0 && (
                    <span style={{ ...statChip, background: 'rgba(52,211,153,0.14)', borderColor: 'rgba(52,211,153,0.32)', color: '#86efac' }}>
                      Bereit {readyCount.ready}/{readyCount.total}
                    </span>
                  )}
                  {pill(phaseLabel, 'setup')}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Aktueller Roomcode</div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 24,
                    letterSpacing: '0.3em',
                    border: '1px dashed rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    textAlign: 'center'
                  }}
                >
                  {roomCode || '----'}
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {/* TODO(DESIGN_LATER): Replace this utilitarian block with proper setup UI */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                    placeholder="Roomcode eingeben"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    style={{
                      ...inputStyle,
                      width: 'auto',
                      background: 'rgba(255,255,255,0.08)',
                      cursor: 'pointer'
                    }}
                    onClick={handleRoomConnect}
                  >
                    Verbinden
                  </button>
                </div>
                <button
                  style={{
                    ...inputStyle,
                    background: 'linear-gradient(135deg, #fde68a, #f97316)',
                    color: '#1f1105',
                    cursor: creatingSession ? 'wait' : 'pointer',
                    opacity: creatingSession ? 0.7 : 1
                  }}
                  disabled={creatingSession || !selectedQuiz}
                  onClick={handleCreateSession}
                >
                  {creatingSession ? 'Session wird erstellt ...' : 'Neue Session starten'}
                </button>
              </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={language}
                onChange={(e) => {
                  const val = e.target.value as Language;
                    setLang(val);
                    localStorage.setItem('moderatorLanguage', val);
                  }}
                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">Englisch</option>
                  <option value="both">Beides</option>
                </select>
                <button
                  style={{
                    ...inputStyle,
                    background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
                    color: '#0b1020',
                    cursor: 'pointer',
                    border: '1px solid rgba(99,229,255,0.5)',
                    boxShadow: '0 18px 38px rgba(96,165,250,0.35)'
                  }}
                  onClick={() => {
                    if (!roomCode) {
                      setToast('Roomcode fehlt');
                      return;
                    }
                    doAction(() => setLanguage(roomCode, language), 'Sprache gesetzt');
                  }}
                >
                  Sprache setzen
                </button>
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background:
                      health === 'ok'
                        ? 'rgba(34,197,94,0.16)'
                        : health === 'fail'
                        ? 'rgba(239,68,68,0.16)'
                        : 'rgba(255,255,255,0.05)',
                    border:
                      health === 'ok'
                        ? '1px solid rgba(34,197,94,0.5)'
                        : health === 'fail'
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                    color: health === 'ok' ? '#bbf7d0' : health === 'fail' ? '#fecdd3' : '#e2e8f0',
                    cursor: 'pointer'
                  }}
                  onClick={async () => {
                    try {
                      await fetchHealth();
                      setHealth('ok');
                      setToast('Backend erreichbar');
                    } catch (err) {
                      setHealth('fail');
                      setToast('Backend nicht erreichbar');
                    } finally {
                      setTimeout(() => setToast(null), 1800);
                    }
                  }}
                >
                  {health === 'ok' ? 'Health: OK' : health === 'fail' ? 'Health: Fehler' : 'Health-Check'}
                </button>
                {readyCount.total > 0 && (
                  <div
                    style={{
                      ...inputStyle,
                      width: 'auto',
                      background: 'rgba(52,211,153,0.12)',
                      border: '1px solid rgba(52,211,153,0.35)',
                      color: '#bbf7d0',
                      padding: '10px 12px',
                      fontWeight: 700
                    }}
                  >
                    Bereit {readyCount.ready}/{readyCount.total}
                  </div>
                )}
              </div>
            </div>
            <TimerCard
              cardStyle={card}
              buttonStyle={timerButtonStyle}
              timerSeconds={timerSeconds}
              onChange={(val) => {
                setTimerSeconds(val);
                if (Number.isFinite(val)) localStorage.setItem('moderatorTimerSeconds', String(val));
              }}
              onStart={() => doAction(() => startTimer(roomCode, timerSeconds), 'Timer gestartet')}
              onStop={() => doAction(() => stopTimer(roomCode), 'Timer gestoppt')}
            />
          </header>
        )}

        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['pre', 'lobby', 'intro', 'quiz'] as ViewPhase[]).map((p) => (
            <button
              key={p}
              style={{
                ...inputStyle,
                background: viewPhase === p ? 'linear-gradient(135deg, #63e5ff, #60a5fa)' : 'rgba(255,255,255,0.05)',
                color: viewPhase === p ? '#0b1020' : '#e2e8f0',
                cursor: 'pointer',
                width: 'auto',
                minWidth: 78,
                padding: '8px 10px',
                border: viewPhase === p ? '1px solid rgba(99,229,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'none'
              }}
              onClick={() => changeViewPhase(p)}
            >
              {p === 'pre' ? 'Vor Quiz' : p === 'lobby' ? 'Lobby' : p === 'intro' ? 'Intro' : 'Quiz'}
            </button>
          ))}
          {currentQuizName && (
            <span style={{ ...statChip, background: 'rgba(99,229,255,0.14)', borderColor: 'rgba(99,229,255,0.32)', color: '#7dd3fc' }}>
              Quiz: {currentQuizName}
            </span>
          )}
          {leaderboard.slice(0, 1).map((run, idx) => (
            <span
              key={idx}
              style={{ ...statChip, background: 'rgba(52,211,153,0.14)', borderColor: 'rgba(52,211,153,0.32)', color: '#bbf7d0' }}
              title={`Letzter Run: ${new Date(run.date).toLocaleString()} | Gewinner: ${run.winners?.join(', ') || 'n/a'}`}
            >
              Letzter Run: {run.quizId} {run.winners?.[0] ? `(${run.winners[0]})` : 'n/a'}
            </span>
          ))}
        </div>

        {renderActions()}
      </div>

      {/* Stats Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 10 }}>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 800 }}>Stats</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['runs', 'question'] as const).map((key) => (
                <button
                  key={key}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    minWidth: 90,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    background: statsView === key ? 'linear-gradient(135deg, #63e5ff, #60a5fa)' : 'rgba(255,255,255,0.05)',
                    color: statsView === key ? '#0b1020' : '#e2e8f0',
                    border: statsView === key ? '1px solid rgba(99,229,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'none'
                  }}
                  onClick={() => setStatsView(key)}
                >
                  {key === 'runs' ? 'Runs' : 'Frage'}
                </button>
              ))}
            </div>
          </div>

          {statsView === 'runs' ? (
            <LeaderboardPanel runs={leaderboard} />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {numericStats && (
                  <span style={statChip}>Min {numericStats.min} | Max {numericStats.max} | Median {numericStats.median} | Avg {numericStats.avg}</span>
                )}
                <span style={statChip}>{answersCount}/{teamsCount} Antworten</span>
                {topTexts.length > 0 && <span style={statChip}>Top: {topTexts.map(([k, v]) => `${k} (${v})`).join(', ')}</span>}
              </div>
              {answerStats ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#cbd5e1', fontSize: 12 }}>
                  <span style={statChip}>Richtig {answerStats.correct}/{answerStats.total}</span>
                  {Object.keys(answerStats.perOption || {}).length > 0 && (
                    <span style={{ ...statChip, display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(answerStats.perOption).map(([opt, count]) => (
                        <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ padding: '2px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700 }}>{opt}</span>
                          <span>{count}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Noch keine Antworten eingegangen.</div>
              )}
            </div>
          )}
      </div>
    </div>

    {renderPotatoControls()}

    {/* Fehler/Info Banner oben, besser sichtbar auf Mobile */}
    {toast && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 14px',
            borderRadius: 12,
            background: toast.toLowerCase().includes('fehl') || toast.toLowerCase().includes('error') ? 'rgba(239,68,68,0.14)' : 'rgba(15,23,42,0.9)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            zIndex: 30,
            maxWidth: '90%',
            textAlign: 'center'
          }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* Frage-Karte / Quiz view */}
      {viewPhase === 'quiz' && (
        <>
          <section style={{ ...card, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {question && (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#0f141d',
                    border: `2px solid ${catColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {catIcon && <img src={catIcon} alt="" style={{ width: 24, height: 24 }} />}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800 }}>{question?.question ?? 'Keine Frage aktiv'}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {question ? `${meta?.globalIndex}/${meta?.globalTotal ?? '?'} | ${question.category}` : 'Warten auf Frage'}
                </div>
              </div>
            </div>

            {question && (
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--muted)', fontSize: 12 }}>
                  {numericStats && (
                    <span style={statChip}>Min {numericStats.min} | Max {numericStats.max} | Median {numericStats.median} | Avg {numericStats.avg}</span>
                  )}
                  <span style={statChip}>{phaseChip}</span>
                  {topTexts.length > 0 && <span style={statChip}>Top: {topTexts.map(([k, v]) => `${k} (${v})`).join(', ')}</span>}
                  <span style={statChip}>{answersCount}/{teamsCount} Antworten</span>
                  {teamsCount > 0 && answersCount < teamsCount && (
                    <span style={{ ...statChip, borderColor: 'rgba(251,191,36,0.5)', color: '#fbbf24', background: 'rgba(251,191,36,0.12)', fontWeight: 700 }}>
                      Warten auf {teamsCount - answersCount} Team(s)
                    </span>
                  )}
                </div>
                {answerStats && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#cbd5e1', fontSize: 12 }}>
                    <span style={statChip}>Richtig {answerStats.correct}/{answerStats.total}</span>
                    {Object.keys(answerStats.perOption || {}).length > 0 && (
                      <span style={{ ...statChip, display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(answerStats.perOption).map(([opt, count]) => (
                          <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ padding: '2px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700 }}>{opt}</span>
                            <span>{count}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <AnswerList
            answers={answers}
            answersCount={answersCount}
            teamsCount={teamsCount}
            unreviewedCount={unreviewedCount}
            statChip={statChip}
            inputStyle={inputStyle}
            onOverride={(teamId, isCorrect) =>
              doAction(async () => {
                await overrideAnswer(roomCode, teamId, isCorrect);
                setAnswers((prev) =>
                  prev
                    ? {
                        ...prev,
                        answers: {
                          ...prev.answers,
                          [teamId]: { ...(prev.answers[teamId] || {}), isCorrect }
                        }
                      }
                    : prev
                );
              }, isCorrect ? 'Als richtig markiert' : 'Als falsch markiert')
            }
          />
        </>
      )}

      {/* Lobby view: nur Teams und Start */}
      {viewPhase === 'lobby' && (
        <TeamsList
          answers={answers}
          inputStyle={inputStyle}
          onRefresh={() =>
            doAction(async () => {
              const res = await fetchAnswers(roomCode);
              setAnswers({
                answers: res.answers ?? {},
                teams: res.teams ?? {},
                solution: res.solution
              });
            }, 'Teams aktualisiert')
          }
          onKickAll={() =>
            doAction(async () => {
              const ids = Object.keys(answers?.teams || {});
              await Promise.all(ids.map((id) => kickTeam(roomCode, id).catch(() => undefined)));
              setAnswers((prev) =>
                prev
                  ? {
                      ...prev,
                      teams: {},
                      answers: {}
                    }
                  : prev
              );
            }, 'Teams entfernt')
          }
          onKickTeam={(teamId) =>
            doAction(async () => {
              await kickTeam(roomCode, teamId);
              setAnswers((prev) =>
                prev
                  ? {
                      ...prev,
                      teams: Object.fromEntries(Object.entries(prev.teams).filter(([id]) => id !== teamId)),
                      answers: Object.fromEntries(Object.entries(prev.answers).filter(([id]) => id !== teamId))
                    }
                  : prev
              );
            }, 'Team entfernt')
          }
        />
      )}

      {/* Intro view: Regeln + Teams */}
      {viewPhase === 'intro' && (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Regeln kurz</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#cbd5e1', lineHeight: 1.5 }}>
            <li>Alle Teams beitreten und "Team ist bereit" klicken.</li>
            <li>Timer startet mit Frage, Antworten rechtzeitig abschicken.</li>
            <li>Schaetzfragen: am naechsten dran gewinnt.</li>
            <li>Bilder & Cheese: genau hinsehen.</li>
          </ul>
          <div style={{ marginTop: 12, fontWeight: 800 }}>Teams</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {Object.values(answers?.teams || {}).map((team) => (
              <span
                key={team.name}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#e2e8f0',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <StatusDot filled={Boolean(team?.isReady)} tooltip={team?.isReady ? 'Angemeldet' : 'Nicht angemeldet'} />
                {team.name}
              </span>
            ))}
            {Object.keys(answers?.teams || {}).length === 0 && <span style={{ color: 'var(--muted)' }}>Noch keine Teams</span>}
          </div>
        </section>
      )}
      {/* Quick Exit */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <button
          style={{
            ...inputStyle,
            background: 'linear-gradient(135deg, #1f2937, #0f172a)',
            color: '#f8fafc',
            width: 'auto',
            padding: '10px 14px',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: 'none'
          }}
          onClick={() => {
            changeViewPhase('pre');
            setQuestion(null);
            setMeta(null);
            setAnswers(null);
            setToast('Zurueck zum Start');
            setTimeout(() => setToast(null), 1500);
          }}
        >
          Quiz beenden (ohne Stats)
        </button>
        <button
          style={{
            ...inputStyle,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#0b1020',
            width: 'auto',
            padding: '10px 14px',
            cursor: 'pointer',
            border: '1px solid rgba(34,197,94,0.5)',
            boxShadow: '0 18px 38px rgba(22,163,74,0.35)'
          }}
          onClick={endQuizAndReport}
        >
          Quiz beenden & Stats loggen
        </button>
      </div>
    </main>
  );
};

export default ModeratorPage;
