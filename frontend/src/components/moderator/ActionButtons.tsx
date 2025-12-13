import React from 'react';
import { QuizTemplate } from '@shared/quizTypes';
import { startNextQuestion, startTimer, stopTimer, revealAnswers, useQuiz, fetchTimer } from '../../api';
import { ViewPhase } from './types';

type ActionState = {
  quiz: boolean;
  next: boolean;
  timerStart: boolean;
  timerStop: boolean;
  reveal: boolean;
};

type ActionButtonsProps = {
  viewPhase: ViewPhase;
  changeViewPhase: (phase: ViewPhase) => void;
  actionWrap: React.CSSProperties;
  inputStyle: React.CSSProperties;
  currentQuizName?: string;
  selectedQuiz: string;
  setSelectedQuiz: (id: string) => void;
  quizzes: QuizTemplate[];
  roomCode: string;
  timerSeconds: number;
  actionState: ActionState;
  setActionState: React.Dispatch<React.SetStateAction<ActionState>>;
  doAction: (fn: () => Promise<any>, msg?: string) => Promise<void>;
  setToast: (msg: string | null) => void;
  primaryColor?: string;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  viewPhase,
  changeViewPhase,
  actionWrap,
  inputStyle,
  currentQuizName,
  selectedQuiz,
  setSelectedQuiz,
  quizzes,
  roomCode,
  timerSeconds,
  actionState,
  setActionState,
  doAction,
  setToast,
  primaryColor
}) => {
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
              background: primaryColor ? `${primaryColor}11` : '#0f172a',
              color: '#f8fafc',
              border: primaryColor ? `1px solid ${primaryColor}55` : '1px solid rgba(255,255,255,0.16)'
            }}
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                {q.name}
              </option>
            ))}
          </select>
          <button
            style={{
              ...inputStyle,
              background: primaryColor
                ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`
                : 'linear-gradient(135deg, #63e5ff, #60a5fa)',
              color: '#0b1020',
              cursor: 'pointer',
              opacity: actionState.quiz ? 0.7 : 1,
              border: primaryColor ? `1px solid ${primaryColor}88` : '1px solid rgba(99,229,255,0.5)',
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
        <div style={{ fontWeight: 700, color: '#cbd5e1' }}>{currentQuizName ? `Gewählt: ${currentQuizName}` : 'Kein Quiz gewählt'}</div>
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
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          opacity: 1,
          border: '1px solid rgba(52,211,153,0.55)',
          boxShadow: 'none'
        }}
        title="Timer starten"
        aria-label="Timer starten"
        onClick={() =>
          doAction(async () => {
            setActionState((s) => ({ ...s, timerStart: true }));
            await startTimer(roomCode, timerSeconds);
          }, 'Timer gestartet').finally(() => setActionState((s) => ({ ...s, timerStart: false })))
        }
        disabled={actionState.timerStart}
      >
        {actionState.timerStart ? 'Startet ...' : 'Timer starten'}
      </button>
      <button
        style={{
          ...inputStyle,
          background: 'linear-gradient(135deg, #fca5a5, #f87171)',
          color: '#0b1020',
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          opacity: 1,
          border: '1px solid rgba(239,68,68,0.55)',
          boxShadow: 'none'
        }}
        title="Timer stoppen"
        aria-label="Timer stoppen"
        onClick={() =>
          doAction(async () => {
            setActionState((s) => ({ ...s, timerStop: true }));
            await stopTimer(roomCode);
          }, 'Timer gestoppt').finally(() => setActionState((s) => ({ ...s, timerStop: false })))
        }
        disabled={actionState.timerStop}
      >
        {actionState.timerStop ? 'Stoppt ...' : 'Timer stoppen'}
      </button>
      <button
        style={{
          ...inputStyle,
          background: 'linear-gradient(135deg, #fcd34d, #fbbf24)',
          color: '#0b1020',
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          opacity: 1,
          border: '1px solid rgba(251,191,36,0.55)',
          boxShadow: 'none'
        }}
        title="Aufloesung senden"
        aria-label="Aufloesung senden"
        onClick={() =>
          doAction(async () => {
            setActionState((s) => ({ ...s, reveal: true }));
            await revealAnswers(roomCode);
          }, 'Aufloesung gesendet').finally(() => setActionState((s) => ({ ...s, reveal: false })))
        }
        disabled={actionState.reveal}
      >
        {actionState.reveal ? 'Sendet ...' : 'Aufloesen / Senden'}
      </button>
    </section>
  );
};

export default ActionButtons;
