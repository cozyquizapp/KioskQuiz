import { useEffect, useRef, useState } from 'react';
import {
  AnyQuestion,
  AnswerEntry,
  Team,
  QuizTemplate,
  BingoBoard,
  SyncStatePayload
} from '@shared/quizTypes';
import {
  fetchQuizzes,
  useQuiz,
  startNextQuestion,
  fetchCurrentQuestion,
  fetchAnswers,
  fetchScoreboard,
  revealAnswers,
  overrideAnswer,
  startTimer,
  stopTimer,
  fetchTimer,
  kickTeam,
  fetchLanguage,
  setLanguage
} from '../api';
import { connectToRoom } from '../socket';
import AdminLayout from '../admin/AdminLayout';
import AdminRoomHeader from '../admin/AdminRoomHeader';
import { theme } from '../theme';

type Phase = 'setup' | 'live' | 'evaluating' | 'final';
type Tab = 'answers' | 'teams' | 'bingo';

type AnswerState = {
  answers: Record<string, AnswerEntry>;
  teams: Record<string, Team>;
  solution?: string;
};

type Props = { roomCode: string };

const chip = (color: string) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  border: `1px solid ${color}55`,
  background: `${color}22`,
  color
});

export default function AdminView({ roomCode }: Props) {
  const [quizzes, setQuizzes] = useState<QuizTemplate[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [quizLoaded, setQuizLoaded] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<AnyQuestion | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>({ answers: {}, teams: {} });
  const [teamBoards, setTeamBoards] = useState<Record<string, BingoBoard>>({});
  const [phase, setPhase] = useState<Phase>('setup');
  const [language, setLanguageState] = useState<'de' | 'en'>('de');
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [defaultTimer, setDefaultTimer] = useState(30);
  const [activeTab, setActiveTab] = useState<Tab>('answers');
  const [message, setMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);

  const answersCount = Object.keys(answerState.answers).length;
  const teamsCount = Object.keys(answerState.teams).length;
  const unreviewedCount = Object.values(answerState.answers).filter((a) => a.isCorrect === undefined).length;
  const finalReady = answersCount > 0 && unreviewedCount === 0;

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const qRes = await fetchQuizzes();
        setQuizzes(qRes.quizzes);
        if (qRes.quizzes.length > 0) {
          setSelectedQuiz(qRes.quizzes[0].id);
        }
        const timer = await fetchTimer(roomCode);
        setTimerEndsAt(timer.timer.endsAt ?? null);
        const langRes = await fetchLanguage(roomCode);
        setLanguageState(langRes.language);
      } catch (err) {
        setMessage((err as Error).message);
      }
    };
    load();
  }, [roomCode]);

  // Socket wiring
  useEffect(() => {
    if (socketRef.current) socketRef.current.disconnect();
    setConnectionStatus('connecting');
    const socket = connectToRoom(roomCode);
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.io?.on?.('reconnect_attempt', () => setConnectionStatus('connecting'));

    socket.on('syncState', (payload: SyncStatePayload) => {
      if (payload.language) setLanguageState(payload.language);
      if (payload.question) {
        setCurrentQuestion(payload.question);
        setPhase('live');
      } else {
        setCurrentQuestion(null);
        setPhase('setup');
      }
      if (payload.timerEndsAt) setTimerEndsAt(payload.timerEndsAt);
    });

    socket.on('answerReceived', () => {
      loadAnswers().catch(() => undefined);
    });
    socket.on('teamsReady', ({ teams }) => {
      setAnswerState((prev) => ({ ...prev, teams: teams.reduce((acc: Record<string, Team>, t: Team) => ({ ...acc, [t.id]: t }), {}) }));
    });
    socket.on('timerStarted', ({ endsAt }) => setTimerEndsAt(endsAt));
    socket.on('timerStopped', () => setTimerEndsAt(null));

    socket.on('evaluation:started', () => {
      setPhase('evaluating');
      setTimerEndsAt(null);
      loadAnswers().catch(() => undefined);
    });
    socket.on('answersEvaluated', ({ solution }: { solution?: string }) => {
      setPhase('evaluating');
      setTimerEndsAt(null);
      setAnswerState((prev) => ({ ...prev, solution }));
      loadAnswers().catch(() => undefined);
    });
    socket.on('evaluation:revealed', () => {
      setPhase('final');
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode]);

  const loadAnswers = async () => {
    const data = await fetchAnswers(roomCode);
    setAnswerState(data);
  };

  const loadCurrentQuestion = async () => {
    const res = await fetchCurrentQuestion(roomCode);
    setCurrentQuestion(res.question);
  };

  const loadBoards = async () => {
    const score = await fetchScoreboard(roomCode);
    setTeamBoards(score.boards || {});
    setAnswerState((prev) => ({ ...prev, teams: score.teams.reduce((acc: Record<string, Team>, t: Team) => ({ ...acc, [t.id]: t }), {}) }));
  };

  const handleUseQuiz = async () => {
    if (!selectedQuiz) return;
    await useQuiz(roomCode, selectedQuiz);
    setQuizLoaded(true);
    const q = quizzes.find((x) => x.id === selectedQuiz);
    setRemaining(q?.questionIds.length ?? 0);
    await loadCurrentQuestion();
  };

  const handleNextQuestion = async () => {
    try {
      const res = await startNextQuestion(roomCode);
      setRemaining(res.remaining ?? remaining);
      setCurrentQuestion(null);
      setPhase('live');
      setTimerEndsAt(null);
      await loadCurrentQuestion();
      await loadAnswers();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleReveal = async () => {
    try {
      await revealAnswers(roomCode);
      setPhase('final');
      await loadAnswers();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleOverride = async (teamId: string, isCorrect: boolean) => {
    try {
      await overrideAnswer(roomCode, teamId, isCorrect);
      await loadAnswers();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleTimerStart = async () => {
    const res = await startTimer(roomCode, defaultTimer);
    setTimerEndsAt(res.endsAt);
  };

  const handleTimerStop = async () => {
    await stopTimer(roomCode);
    setTimerEndsAt(null);
  };

  const handleKick = async (teamId: string) => {
    await kickTeam(roomCode, teamId);
    await loadBoards();
  };

  const readyBadge = `${answersCount}/${teamsCount} Antworten | Offen: ${unreviewedCount}`;

  const renderAnswers = () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(answerState.answers).map(([teamId, ans]) => (
        <div
          key={teamId}
          style={{
            padding: 10,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 10
          }}
        >
          <div>
            <div style={{ fontWeight: 800 }}>{answerState.teams[teamId]?.name ?? 'Team'}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, display: 'grid', gap: 4 }}>
              <span>{String(ans.value ?? '')}</span>
              {ans.deviation !== undefined && ans.deviation !== null && (
                <span>
                  Δ {Math.round(ans.deviation)}
                  {ans.bestDeviation !== undefined && ans.bestDeviation !== null ? ` | Bestes Team: ${Math.round(ans.bestDeviation)}` : ''}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid #22c55e',
                background: ans.isCorrect === true ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.12)',
                color: '#22c55e',
                fontWeight: 800,
                opacity: ans.isCorrect === true ? 1 : 0.8,
                cursor: 'pointer'
              }}
              onClick={() => handleOverride(teamId, true)}
            >
              ✔
            </button>
            <button
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid #ef4444',
                background: ans.isCorrect === false ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                fontWeight: 800,
                opacity: ans.isCorrect === false ? 1 : 0.8,
                cursor: 'pointer'
              }}
              onClick={() => handleOverride(teamId, false)}
            >
              ✖
            </button>
            <button
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.04)',
                color: '#cbd5e1',
                fontWeight: 800,
                cursor: 'default'
              }}
              disabled
            >
              ?
            </button>
          </div>
        </div>
      ))}
      {Object.keys(answerState.teams)
        .filter((id) => !answerState.answers[id])
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
            <div style={{ fontWeight: 800 }}>{answerState.teams[id]?.name ?? 'Team'}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Noch keine Antwort</div>
          </div>
        ))}
      {answerState.solution && (
        <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
          Lösung: {answerState.solution}
        </div>
      )}
    </div>
  );

  const renderTeams = () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.values(answerState.teams).map((t) => (
        <div
          key={t.id}
          style={{
            padding: 10,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: t.isReady ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 800 }}>{t.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t.isReady ? 'bereit' : 'wartet'}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={chip(t.isReady ? '#22c55e' : '#94a3b8')}>{t.isReady ? 'Ready' : 'Not ready'}</span>
            <button
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e2e8f0',
                fontWeight: 700
              }}
              onClick={() => handleKick(t.id)}
            >
              Entfernen
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderBingo = () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(teamBoards).map(([teamId, board]) => (
        <div key={teamId} style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontWeight: 800 }}>{answerState.teams[teamId]?.name ?? teamId}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{board.filter((c) => c.marked).length}/25 Felder markiert</div>
        </div>
      ))}
      {Object.keys(teamBoards).length === 0 && <p style={{ color: 'var(--muted)', margin: 0 }}>Keine Boards.</p>}
    </div>
  );

  const remainingSeconds = timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)) : 0;
  const timerActive = Boolean(timerEndsAt);

  return (
    <AdminLayout>
      <AdminRoomHeader
        roomCode={roomCode}
        language={language}
        phase={phase}
        remainingQuestions={remaining}
        timerEndsAt={timerEndsAt}
        timerActive={timerActive}
        extraBadges={[readyBadge]}
      />

      {message && <p style={{ color: '#f97316', fontWeight: 700 }}>{message}</p>}

      <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
        <div style={{ padding: 14, borderRadius: theme.radius, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              style={{ padding: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
            >
              <option value="">Quiz wählen</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
            <button
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#22c55e33', color: '#e2e8f0', fontWeight: 800 }}
              onClick={handleUseQuiz}
              disabled={!selectedQuiz}
            >
              Quiz laden
            </button>
            <button
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#6366f133', color: '#e2e8f0', fontWeight: 800 }}
              onClick={handleNextQuestion}
              disabled={!quizLoaded}
            >
              {phase === 'setup' ? 'Quiz starten' : 'Nächste Frage'}
            </button>
            <button
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#f59e0b33', color: '#e2e8f0', fontWeight: 800 }}
              onClick={handleTimerStart}
            >
              Timer starten
            </button>
            <button
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#ef444433', color: '#e2e8f0', fontWeight: 800 }}
              onClick={handleTimerStop}
              disabled={!timerActive}
            >
              Timer stoppen
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ color: 'var(--muted)', fontSize: 12 }}>Timer (s)</label>
              <input
                type="number"
                min={5}
                value={defaultTimer}
                onChange={(e) => setDefaultTimer(Number(e.target.value))}
                style={{ width: 80, padding: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>Sprache</span>
              <button
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: language === 'de' ? '#22c55e33' : 'rgba(255,255,255,0.04)', color: '#e2e8f0' }}
                onClick={() => setLanguage(roomCode, 'de').then(() => setLanguageState('de'))}
              >
                DE
              </button>
              <button
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: language === 'en' ? '#22c55e33' : 'rgba(255,255,255,0.04)', color: '#e2e8f0' }}
                onClick={() => setLanguage(roomCode, 'en').then(() => setLanguageState('en'))}
              >
                EN
              </button>
            </div>
            <button
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: finalReady ? '#22c55e33' : 'rgba(255,255,255,0.08)', color: '#e2e8f0', fontWeight: 800 }}
              onClick={handleReveal}
              disabled={!finalReady || phase === 'final'}
            >
              Finale Ergebnisse senden
            </button>
            {timerActive && (
              <span style={{ ...chip('#f59e0b'), background: '#f59e0b22' }}>{remainingSeconds}s</span>
            )}
          </div>
          <div style={{ marginTop: 10, color: '#e2e8f0' }}>
            <div style={{ fontWeight: 800 }}>{currentQuestion?.question ?? 'Keine Frage aktiv'}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{currentQuestion?.category}</div>
            {answerState.solution && phase === 'final' && (
              <div style={{ marginTop: 6, color: '#22c55e', fontWeight: 700 }}>Lösung: {answerState.solution}</div>
            )}
          </div>
        </div>

        <div style={{ padding: 14, borderRadius: theme.radius, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button
              style={{ ...tabStyle(activeTab === 'answers') }}
              onClick={() => setActiveTab('answers')}
            >
              Antworten
            </button>
            <button
              style={{ ...tabStyle(activeTab === 'teams') }}
              onClick={() => {
                setActiveTab('teams');
                loadBoards().catch(() => undefined);
              }}
            >
              Teams
            </button>
            <button
              style={{ ...tabStyle(activeTab === 'bingo') }}
              onClick={() => {
                setActiveTab('bingo');
                loadBoards().catch(() => undefined);
              }}
            >
              Bingo
            </button>
          </div>

          {activeTab === 'answers' && renderAnswers()}
          {activeTab === 'teams' && renderTeams()}
          {activeTab === 'bingo' && renderBingo()}
        </div>
      </div>
    </AdminLayout>
  );
}

const tabStyle = (active: boolean) => ({
  padding: '8px 12px',
  borderRadius: 10,
  border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
  background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
  color: '#e2e8f0',
  fontWeight: 800
});
