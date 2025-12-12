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
  fetchTimer,
  fetchScoreboard,
  postQuestionStats,
  postRunStats,
  fetchLeaderboard
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
  const [roomCode, setRoomCode] = useState('MAIN');
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
  const [phase, setPhase] = useState<Phase>('setup');
  const [viewPhase, setViewPhase] = useState<ViewPhase>('pre');
  const [userViewPhase, setUserViewPhase] = useState<ViewPhase | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRun[]>([]);
  const lastReportedQuestionId = React.useRef<string | null>(null);
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
    />
  );

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
              <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} style={inputStyle} />
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
        <LeaderboardPanel runs={leaderboard} />
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


