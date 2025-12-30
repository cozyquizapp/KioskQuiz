import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentQuestion,
  fetchQuestions,
  startNextQuestion,
  revealAnswers,
  startTimer,
  stopTimer,
  setLanguage,
  fetchQuizzes,
  useQuiz,
  overrideAnswer,
  kickTeam,
  fetchAnswers,
  fetchTimer
} from '../api';
import { AnswerEntry, AnyQuestion, QuizTemplate } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryIcons } from '../categoryAssets';
import { useQuizSocket } from '../hooks/useQuizSocket';

type AnswersState = {
  answers: Record<string, (AnswerEntry & { answer?: unknown })>;
  teams: Record<string, { name: string; isReady?: boolean }>;
  solution?: string;
};

type Phase = 'setup' | 'question' | 'evaluating' | 'final';
type ViewPhase = 'pre' | 'lobby' | 'intro' | 'quiz';

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

const statusDot = (filled: boolean, tooltip?: string) => (
  <span
    title={tooltip}
    aria-label={tooltip}
    style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: filled ? '#22c55e' : '#9ca3af',
      boxShadow: filled ? '0 0 0 2px rgba(34,197,94,0.2)' : '0 0 0 1px rgba(255,255,255,0.1)'
    }}
  />
);

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
  const [roomCode, setRoomCode] = useState('MAIN');
  const [language, setLang] = useState<'de' | 'en'>(() => {
    const saved = localStorage.getItem('moderatorLanguage');
    return saved === 'de' || saved === 'en' ? saved : 'de';
  });
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [meta, setMeta] = useState<{ globalIndex?: number; globalTotal?: number; categoryKey?: string } | null>(null);
  const [answers, setAnswers] = useState<AnswersState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const saved = localStorage.getItem('moderatorTimerSeconds');
    return saved ? Number(saved) || 30 : 30;
  });
  const [phase, setPhase] = useState<Phase>('setup');
  const [viewPhase, setViewPhase] = useState<ViewPhase>('pre');
  const [userViewPhase, setUserViewPhase] = useState<ViewPhase | null>(null);
  const [actionState, setActionState] = useState<{
    quiz: boolean;
    next: boolean;
    timerStart: boolean;
    timerStop: boolean;
    reveal: boolean;
  }>({ quiz: false, next: false, timerStart: false, timerStop: false, reveal: false });
  const [quizzes, setQuizzes] = useState<QuizTemplate[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const {
    currentQuestion: socketQuestion,
    questionMeta: socketMeta,
    answers: socketAnswers,
    teams: socketTeams,
    solution: socketSolution,
    questionPhase: socketQuestionPhase,
    emit: socketEmit
  } = useQuizSocket(roomCode);
  const changeViewPhase = (phase: ViewPhase) => {
    setUserViewPhase(phase);
    setViewPhase(phase);
  };

  // Load initial question + question list (for meta)
  useEffect(() => {
    const saved = localStorage.getItem('moderatorRoom');
    const savedQuiz = localStorage.getItem('moderatorSelectedQuiz');
    const savedLang = localStorage.getItem('moderatorLanguage');
    if (saved) setRoomCode(saved);
    if (savedQuiz) setSelectedQuiz(savedQuiz);
    if (savedLang === 'de' || savedLang === 'en') setLang(savedLang);
    // preload quizzes
    fetchQuizzes()
      .then((res) => {
        setQuizzes(res.quizzes || []);
        if (res.quizzes?.length && !selectedQuiz) {
          const fallback = savedQuiz && res.quizzes.find((q) => q.id === savedQuiz)?.id;
          setSelectedQuiz(fallback || res.quizzes[0].id);
        }
      })
      .catch(() => undefined);
  }, [selectedQuiz]);

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

  // Sync Beamer to lobby when Moderator switches to lobby
  useEffect(() => {
    if (viewPhase === 'lobby' && roomCode) {
      socketEmit?.('beamer:show-rules', roomCode);
    }
  }, [viewPhase, roomCode, socketEmit]);

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

  const answersCount = Object.keys(answers?.answers || {}).length;
  const teamsCount = Object.keys(answers?.teams || {}).length;
  const unreviewedCount = Object.values(answers?.answers || {}).filter((a) => (a as any).isCorrect === undefined).length;

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

  const renderActions = () => {
    // View-specific actions per requested phases
    if (viewPhase === 'pre') {
      return (
        <section
          style={{
            marginTop: 10,
            ...actionWrap,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 800 }}>Quiz Auswahl</div>
            <select
              value={selectedQuiz}
              onChange={(e) => {
                setSelectedQuiz(e.target.value);
                localStorage.setItem('moderatorSelectedQuiz', e.target.value);
              }}
              style={{
                ...inputStyle,
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.16)'
              }}
            >
              {quizzes.map((q) => (
                <option
                  key={q.id}
                  value={q.id}
                  style={{ background: '#0f172a', color: '#e2e8f0' }}
                >
                  {q.name}
                </option>
              ))}
            </select>
            <button
              style={{
                ...inputStyle,
                background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
                color: '#0b1020',
                cursor: 'pointer',
                opacity: actionState.quiz ? 0.7 : 1,
                border: '1px solid rgba(99,229,255,0.5)',
            boxShadow: 'none'
          }}
              onClick={() =>
                doAction(async () => {
                  setActionState((s) => ({ ...s, quiz: true }));
                  if (!selectedQuiz) throw new Error('Bitte ein Quiz waehlen');
                  await useQuiz(roomCode, selectedQuiz);
                  localStorage.setItem('moderatorSelectedQuiz', selectedQuiz);
                }, 'Quiz gesetzt').finally(() => setActionState((s) => ({ ...s, quiz: false })))
              }
              disabled={actionState.quiz}
            >
              {actionState.quiz ? 'Wird gesetzt ...' : 'Quiz setzen'}
            </button>
          </div>
          <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #34d399, #22c55e)',
              color: '#0b1020',
              cursor: 'pointer',
              height: 56,
              fontSize: 15,
              border: '1px solid rgba(52,211,153,0.55)',
              boxShadow: 'none'
            }}
            onClick={() => changeViewPhase('lobby')}
          >
            Zur Lobby wechseln
          </button>
            <div style={{ fontWeight: 700, color: '#cbd5e1' }}>
              {currentQuizName ? `Gewähltes Quiz: ${currentQuizName}` : 'Kein Quiz gewählt'}
            </div>
          <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
              color: '#0b1020',
              cursor: 'pointer',
              height: 56,
              fontSize: 15,
              border: '1px solid rgba(99,229,255,0.5)',
              boxShadow: 'none'
            }}
            onClick={() => doAction(() => fetch(`/api/rooms/${roomCode}/show-intro`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }), 'Intro gestartet')}
          >
            Intro zeigen
          </button>
        </section>
      );
    }

    if (viewPhase === 'lobby') {
      return (
        <section
          style={{
            marginTop: 10,
            ...actionWrap,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10
          }}
        >
          <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #34d399, #22c55e)',
              color: '#0b1020',
              cursor: 'pointer',
              height: 56,
              fontSize: 15,
              border: '1px solid rgba(52,211,153,0.55)',
              boxShadow: 'none'
            }}
            onClick={() => changeViewPhase('quiz')}
          >
            Zur Quiz-Ansicht
          </button>
          <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #1f2937, #0f172a)',
              color: '#f8fafc',
              cursor: 'pointer',
              height: 56,
              fontSize: 15,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'none'
            }}
            onClick={() => changeViewPhase('intro')}
          >
            Zu Intro / Regeln
          </button>
        </section>
      );
    }

    if (viewPhase === 'intro') {
      return (
        <section
          style={{
            marginTop: 10,
            ...actionWrap,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10
          }}
        >
          <div style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)', color: '#e2e8f0', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            Wichtig: Alle Teams bereit machen, Regeln ansagen.
          </div>
          <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
              color: '#0b1020',
              cursor: 'pointer',
              height: 56,
              fontSize: 15,
              border: '1px solid rgba(99,229,255,0.5)',
              boxShadow: 'none'
            }}
            onClick={() => doAction(() => fetch(`/api/rooms/${roomCode}/show-intro`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }), 'Intro gestartet')}
          >
            Intro auf Beamer
          </button>
          <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #34d399, #22c55e)',
              color: '#0b1020',
              cursor: 'pointer',
              height: 56,
              fontSize: 15,
              border: '1px solid rgba(52,211,153,0.55)',
              boxShadow: 'none'
            }}
            onClick={() => changeViewPhase('quiz')}
          >
            Zu den Fragen
          </button>
        </section>
      );
    }

    // quiz view (default when running questions)
    return (
        <section
          style={{
            marginTop: 10,
            ...actionWrap,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10
          }}
        >
        <button
          style={{
            ...inputStyle,
            background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
            color: '#0b1020',
            cursor: 'pointer',
            height: 56,
            fontSize: 15,
            border: '1px solid rgba(99,229,255,0.5)',
            boxShadow: 'none'
          }}
          onClick={() =>
            doAction(async () => {
              setActionState((s) => ({ ...s, next: true }));
              await startNextQuestion(roomCode);
              await startTimer(roomCode, timerSeconds);
              setTimeout(() => {
                fetchTimer(roomCode)
                  .then((t) => {
                    if (!t?.timer?.endsAt) setToast('Timer nicht aktiv? Bitte pruefen.');
                  })
                  .catch(() => setToast('Timer-Status unbekannt'));
              }, 800);
            }, 'Naechste Frage gestartet').finally(() => setActionState((s) => ({ ...s, next: false })))
          }
          disabled={actionState.next}
        >
          {actionState.next ? 'Startet ...' : 'Naechste Frage starten'}
        </button>
        <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #34d399, #22c55e)',
              color: '#0b1020',
              cursor: question && !actionState.timerStart ? 'pointer' : 'not-allowed',
              height: 56,
              fontSize: 15,
              opacity: question && !actionState.timerStart ? 1 : 0.55,
              border: '1px solid rgba(52,211,153,0.55)',
              boxShadow: 'none'
            }}
          title="Timer starten"
          aria-label="Timer starten"
          onClick={() =>
            question &&
            doAction(async () => {
              setActionState((s) => ({ ...s, timerStart: true }));
              await startTimer(roomCode, timerSeconds);
            }, 'Timer gestartet').finally(() => setActionState((s) => ({ ...s, timerStart: false })))
          }
          disabled={!question || actionState.timerStart}
        >
          {actionState.timerStart ? 'Startet ...' : 'Timer starten'}
        </button>
        <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #fca5a5, #f87171)',
              color: '#0b1020',
              cursor: question && !actionState.timerStop ? 'pointer' : 'not-allowed',
              height: 56,
              fontSize: 15,
              opacity: question && !actionState.timerStop ? 1 : 0.55,
              border: '1px solid rgba(239,68,68,0.55)',
              boxShadow: 'none'
            }}
          title="Timer stoppen"
          aria-label="Timer stoppen"
          onClick={() =>
            question &&
            doAction(async () => {
              setActionState((s) => ({ ...s, timerStop: true }));
              await stopTimer(roomCode);
            }, 'Timer gestoppt').finally(() => setActionState((s) => ({ ...s, timerStop: false })))
          }
          disabled={!question || actionState.timerStop}
        >
          {actionState.timerStop ? 'Stoppt ...' : 'Timer stoppen'}
        </button>
        <button
            style={{
              ...inputStyle,
              background: 'linear-gradient(135deg, #fcd34d, #fbbf24)',
              color: '#0b1020',
              cursor: question && !actionState.reveal ? 'pointer' : 'not-allowed',
              height: 56,
              fontSize: 15,
              opacity: question && !actionState.reveal ? 1 : 0.55,
              border: '1px solid rgba(251,191,36,0.55)',
              boxShadow: 'none'
            }}
          title="Aufloesung senden"
          aria-label="Aufloesung senden"
          onClick={() =>
            question &&
            doAction(async () => {
              setActionState((s) => ({ ...s, reveal: true }));
              await revealAnswers(roomCode);
            }, 'Aufloesung gesendet').finally(() => setActionState((s) => ({ ...s, reveal: false })))
          }
          disabled={!question || actionState.reveal}
        >
          {actionState.reveal ? 'Sendet ...' : 'Aufloesen / Senden'}
        </button>
      </section>
    );
  };

  return (
    <main
      style={{
        minHeight: '100vh',
            background:
          'url(/background.png) center/cover fixed, radial-gradient(circle at 18% 18%, rgba(99, 102, 241, 0.2), transparent 34%), radial-gradient(circle at 78% 8%, rgba(56, 189, 248, 0.16), transparent 36%), linear-gradient(180deg, #0b0f1a 0%, #0c111c 100%)',
        color: '#e2e8f0',
        padding: 12,
        maxWidth: 1100,
        margin: '0 auto'
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
                    src="/logo.png?v=2"
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
              <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} style={inputStyle} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={language}
                  onChange={(e) => {
                    const val = e.target.value as 'de' | 'en';
                    setLang(val);
                    localStorage.setItem('moderatorLanguage', val);
                  }}
                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">Englisch</option>
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
                  onClick={() => doAction(() => setLanguage(roomCode, language), 'Sprache gesetzt')}
                >
                  Sprache setzen
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
            <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Timer</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                value={timerSeconds}
                min={5}
                max={180}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTimerSeconds(val);
                if (Number.isFinite(val)) localStorage.setItem('moderatorTimerSeconds', String(val));
              }}
                style={{ ...timerButtonStyle, background: '#0f172a', color: '#e5e7eb' }}
              />
              <button
                style={{ ...timerButtonStyle, background: '#4ade80', color: '#0d0f14', cursor: 'pointer' }}
                onClick={() => doAction(() => startTimer(roomCode, timerSeconds), 'Timer gestartet')}
              >
                ▶ Starten
              </button>
              <button
                style={{ ...timerButtonStyle, background: '#f87171', color: '#0d0f14', cursor: 'pointer' }}
                onClick={() => doAction(() => stopTimer(roomCode), 'Timer gestoppt')}
              >
                ■ Stoppen
              </button>
            </div>
          </div>
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
        </div>

        {renderActions()}
      </div>

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
                  {question ? `${meta?.globalIndex}/${meta?.globalTotal || ''} | ${question.category}` : 'Warten auf Frage'}
                </div>
              </div>
            </div>

            {question && (
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--muted)', fontSize: 12 }}>
                  {numericStats && (
                    <span style={statChip}>Min {numericStats.min} • Max {numericStats.max} • Median {numericStats.median} • Ø {numericStats.avg}</span>
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
              </div>
            )}
          </section>

          {/* Antworten */}
          <section style={{ ...card, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <strong>Antworten</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {answersCount}/{teamsCount} | Offen: {unreviewedCount}
              </span>
              {answers?.solution && (
                <span style={{ ...statChip, background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }}>
                  Loesung: {answers.solution}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(answers?.answers || {}).map(([teamId, ans]) => (
                <div
                  key={teamId}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 10,
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {statusDot(Boolean(answers?.teams?.[teamId]?.isReady), (answers?.teams?.[teamId]?.isReady ? 'Angemeldet' : 'Nicht angemeldet'))}
                      <span>{answers?.teams?.[teamId]?.name ?? 'Team'}</span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>{String((ans as any).answer ?? (ans as any).value ?? '')}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                    {(ans as any).isCorrect === undefined
                      ? 'Offen'
                      : (ans as any).isCorrect
                      ? 'Richtig'
                      : 'Falsch'}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button
                        style={{
                          ...inputStyle,
                          background: 'rgba(34,197,94,0.16)',
                          color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.4)',
                          padding: '6px 10px',
                          width: 'auto',
                          minWidth: 52,
                          boxShadow: 'none'
                        }}
                        onClick={() =>
                          doAction(async () => {
                            await overrideAnswer(roomCode, teamId, true);
                            setAnswers((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    answers: {
                                      ...prev.answers,
                                      [teamId]: { ...(prev.answers[teamId] || {}), isCorrect: true }
                                    }
                                  }
                                : prev
                            );
                          }, 'Als richtig markiert')
                        }
                      >
                        ✓
                      </button>
                      <button
                        style={{
                          ...inputStyle,
                          background: 'rgba(239,68,68,0.16)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.4)',
                          padding: '6px 10px',
                          width: 'auto',
                          minWidth: 52,
                          boxShadow: 'none'
                        }}
                        onClick={() =>
                          doAction(async () => {
                            await overrideAnswer(roomCode, teamId, false);
                            setAnswers((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    answers: {
                                      ...prev.answers,
                                      [teamId]: { ...(prev.answers[teamId] || {}), isCorrect: false }
                                    }
                                  }
                                : prev
                            );
                          }, 'Als falsch markiert')
                        }
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(answers?.teams || {})
                .filter((id) => !answers?.answers?.[id])
                .map((id) => (
                  <div
                    key={id}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: '1px dashed rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{answers?.teams?.[id]?.name ?? 'Team'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Noch keine Antwort</div>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}

      {/* Lobby view: nur Teams und Start */}
      {viewPhase === 'lobby' && (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
            <div style={{ fontWeight: 800 }}>
              Aktive Teams {currentQuizName ? `(Quiz: ${currentQuizName})` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={{
                  ...inputStyle,
                  background: 'rgba(99,229,255,0.14)',
                  color: '#7dd3fc',
                  border: '1px solid rgba(99,229,255,0.45)',
                  width: 'auto',
                  padding: '8px 12px'
                }}
                onClick={() =>
                  doAction(async () => {
                    const res = await fetchAnswers(roomCode);
                    setAnswers({
                      answers: res.answers ?? {},
                      teams: res.teams ?? {},
                      solution: res.solution
                    });
                  }, 'Teams aktualisiert')
                }
              >
                Teams aktualisieren
              </button>
              {Object.keys(answers?.teams || {}).length > 0 && (
                <button
                  style={{
                    ...inputStyle,
                    background: 'rgba(239,68,68,0.16)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.45)',
                    width: 'auto',
                    padding: '8px 12px'
                  }}
                  onClick={() =>
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
                >
                  Alle entfernen
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(answers?.teams || {}).map(([teamId, team]) => (
              <div
                key={teamId}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {statusDot(Boolean(team?.isReady), team?.isReady ? 'Angemeldet' : 'Nicht angemeldet')}
                  {team?.name ?? 'Team'}
                </span>
                <button
                  style={{
                    ...inputStyle,
                    background: 'rgba(239,68,68,0.14)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.4)',
                    width: 'auto',
                    padding: '6px 10px'
                  }}
                  onClick={() =>
                    doAction(async () => {
                      await kickTeam(roomCode, teamId);
                      setAnswers((prev) =>
                        prev
                          ? {
                              ...prev,
                              teams: Object.fromEntries(
                                Object.entries(prev.teams).filter(([id]) => id !== teamId)
                              ),
                              answers: Object.fromEntries(
                                Object.entries(prev.answers).filter(([id]) => id !== teamId)
                              )
                            }
                          : prev
                      );
                    }, 'Team entfernt')
                  }
                >
                  Entfernen
                </button>
              </div>
            ))}
            {Object.keys(answers?.teams || {}).length === 0 && <div style={{ color: 'var(--muted)' }}>Noch keine Teams</div>}
          </div>
        </section>
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
                {statusDot(Boolean(team?.isReady), team?.isReady ? 'Angemeldet' : 'Nicht angemeldet')}
                {team.name}
              </span>
            ))}
            {Object.keys(answers?.teams || {}).length === 0 && <span style={{ color: 'var(--muted)' }}>Noch keine Teams</span>}
          </div>
        </section>
      )}

      {/* Quick Exit */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
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
            setToast('Zurück zum Start');
            setTimeout(() => setToast(null), 1500);
          }}
        >
          ⎋ Quiz beenden
        </button>
      </div>
    </main>
  );
};

export default ModeratorPage;
