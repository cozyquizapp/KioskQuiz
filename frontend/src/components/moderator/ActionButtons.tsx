import React from 'react';
import { QuizTemplate, Language } from '@shared/quizTypes';
import { startTimer, stopTimer, useQuiz, fetchTimer } from '../../api';
import { ViewPhase } from './types';

const adminTokenKey = (roomCode: string) => `admin-token-${roomCode}`;

const ensureAdminSession = async (roomCode: string): Promise<string | null> => {
  if (!roomCode || typeof window === 'undefined') return null;
  const key = adminTokenKey(roomCode);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  try {
    const res = await fetch(`/api/rooms/${roomCode}/admin-session`, { method: 'GET' });
    if (!res.ok) {
      // Silent fail for 405/404 - server may not support admin-session
      return null;
    }
    const { token } = await res.json();
    if (token) {
      sessionStorage.setItem(key, token);
      return token as string;
    }
  } catch (err) {
    // Silent fail - proceed without token
  }
  return null;
};

type ActionState = {
  quiz: boolean;
  next: boolean;
  lock: boolean;
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
  onNext?: () => Promise<void> | void;
  onLock?: () => Promise<void> | void;
  onReveal?: () => Promise<void> | void;
  language?: Language;
  onSetLanguage?: (lang: Language) => Promise<void>;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  viewPhase,
  changeViewPhase,
  actionWrap,
  inputStyle,
  selectedQuiz,
  setSelectedQuiz,
  quizzes,
  roomCode,
  timerSeconds,
  actionState,
  setActionState,
  doAction,
  setToast,
  primaryColor,
  onNext,
  onLock,
  onReveal,
  language = 'de',
  onSetLanguage,
}) => {
  if (viewPhase === 'pre') {
    const langLabels: Record<Language, string> = { de: 'Deutsch', en: 'English', both: 'Beide' };
    return (
      <section style={{ marginTop: 10, ...actionWrap, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Step 1: Quiz */}
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ui-chip-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>1 · Quiz wählen</div>
          <select
            value={selectedQuiz}
            onChange={(e) => {
              setSelectedQuiz(e.target.value);
              localStorage.setItem('moderatorSelectedQuiz', e.target.value);
            }}
            style={{
              ...inputStyle,
              background: primaryColor ? `${primaryColor}11` : 'var(--ui-input-bg)',
              color: 'var(--ui-input-text)',
              border: primaryColor ? `1px solid ${primaryColor}55` : '1px solid var(--ui-input-border)'
            }}
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
        {/* Step 2: Language */}
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ui-chip-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>2 · Sprache</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['de', 'en', 'both'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onSetLanguage?.(lang)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  height: 40,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: language === lang
                    ? '2px solid rgba(99,229,255,0.8)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: language === lang
                    ? 'rgba(99,229,255,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  color: language === lang ? '#63e5ff' : 'var(--ui-input-text)',
                  boxShadow: 'none',
                  padding: '0 8px',
                }}
              >
                {langLabels[lang]}
              </button>
            ))}
          </div>
        </div>
        {/* Step 3: Start */}
        <button
          style={{
            ...inputStyle,
            background: primaryColor
              ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`
              : 'var(--ui-button-success)',
            color: 'var(--ui-button-on-light)',
            cursor: 'pointer',
            height: 56,
            fontSize: 16,
            fontWeight: 800,
            opacity: actionState.quiz ? 0.7 : 1,
            border: '1px solid rgba(52,211,153,0.55)',
            boxShadow: 'none',
          }}
          onClick={() =>
            doAction(async () => {
              setActionState((s) => ({ ...s, quiz: true }));
              if (!selectedQuiz) throw new Error('Bitte ein Quiz wählen');
              await ensureAdminSession(roomCode);
              await useQuiz(roomCode, selectedQuiz);
              localStorage.setItem('moderatorSelectedQuiz', selectedQuiz);
              if (onSetLanguage) await onSetLanguage(language);
              changeViewPhase('lobby');
            }, 'Quiz gestartet').finally(() => setActionState((s) => ({ ...s, quiz: false })))
          }
          disabled={actionState.quiz || !selectedQuiz}
        >
          {actionState.quiz ? 'Startet …' : '3 · Spiel starten →'}
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
            background: 'var(--ui-button-success)',
            color: 'var(--ui-button-on-light)',
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
            background: 'var(--ui-button-neutral)',
            color: 'var(--ui-button-on-dark)',
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
        <div style={{ ...inputStyle, background: 'rgba(255,255,255,0.04)', color: 'var(--ui-input-text)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          Wichtig: Alle Teams bereit machen, Regeln ansagen.
        </div>
        <button
          style={{
            ...inputStyle,
            background: 'var(--ui-button-info)',
            color: 'var(--ui-button-on-light)',
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
            background: 'var(--ui-button-success)',
            color: 'var(--ui-button-on-light)',
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
          background: 'var(--ui-button-primary)',
          color: 'var(--ui-button-on-light)',
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          border: '1px solid rgba(99,229,255,0.5)',
          boxShadow: 'none'
        }}
        onClick={() => {
          setActionState((s) => ({ ...s, next: true }));
          doAction(async () => {
            if (onNext) {
              await onNext();
            } else {
              // TODO(LEGACY): Remove REST fallback once host:next is standard everywhere.
              await fetch(`/api/rooms/${roomCode}/next-question`, { method: 'POST' });
              await startTimer(roomCode, timerSeconds);
              setTimeout(() => {
                fetchTimer(roomCode)
                  .then((t) => {
                    if (!t?.timer?.endsAt) setToast('Timer nicht aktiv? Bitte prüfen.');
                  })
                  .catch(() => setToast('Timer-Status unbekannt'));
              }, 800);
            }
          }, 'Naechste Frage gestartet').finally(() => setActionState((s) => ({ ...s, next: false })));
        }}
        disabled={actionState.next}
      >
        {actionState.next ? 'Startet ...' : 'Naechste Frage starten'}
      </button>
      <button
        style={{
          ...inputStyle,
          background: 'var(--ui-button-success)',
          color: 'var(--ui-button-on-light)',
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          opacity: 1,
          border: '1px solid rgba(52,211,153,0.55)',
          boxShadow: 'none'
        }}
        title="Timer starten"
        aria-label="Timer starten"
        onClick={() => {
          setActionState((s) => ({ ...s, timerStart: true }));
          doAction(async () => {
            await startTimer(roomCode, timerSeconds);
          }, 'Timer gestartet').finally(() => setActionState((s) => ({ ...s, timerStart: false })));
        }}
        disabled={actionState.timerStart}
      >
        {actionState.timerStart ? 'Startet ...' : 'Timer starten'}
      </button>
      <button
        style={{
          ...inputStyle,
          background: 'var(--ui-button-danger)',
          color: 'var(--ui-button-on-light)',
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          opacity: 1,
          border: '1px solid rgba(239,68,68,0.55)',
          boxShadow: 'none'
        }}
        title="Timer stoppen"
        aria-label="Timer stoppen"
        onClick={() => {
          setActionState((s) => ({ ...s, timerStop: true }));
          doAction(async () => {
            await stopTimer(roomCode);
          }, 'Timer gestoppt').finally(() => setActionState((s) => ({ ...s, timerStop: false })));
        }}
        disabled={actionState.timerStop}
      >
        {actionState.timerStop ? 'Stoppt ...' : 'Timer stoppen'}
      </button>
      <button
        style={{
          ...inputStyle,
          background: 'var(--ui-button-warning)',
          color: '#1f1305',
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          opacity: 1,
          border: '1px solid rgba(251,191,36,0.55)',
          boxShadow: 'none'
        }}
        title="Aufloesung senden"
        aria-label="Aufloesung senden"
        onClick={() => {
          setActionState((s) => ({ ...s, reveal: true }));
          doAction(async () => {
            if (onReveal) {
              await onReveal();
            } else {
              // TODO(LEGACY): remove REST fallback once host:reveal used überall
              await fetch(`/api/rooms/${roomCode}/reveal`, { method: 'POST' });
            }
          }, 'Aufloesung gesendet').finally(() => setActionState((s) => ({ ...s, reveal: false })));
        }}
        disabled={actionState.reveal}
      >
        {actionState.reveal ? 'Sendet ...' : 'Aufloesen / Senden'}
      </button>
      <button
        style={{
          ...inputStyle,
          background: 'var(--ui-button-warning)',
          color: '#1f1305',
          cursor: 'pointer',
          height: 56,
          fontSize: 15,
          opacity: 1,
          border: '1px solid rgba(245,158,11,0.55)',
          boxShadow: 'none'
        }}
        title="Antworten sperren"
        aria-label="Antworten sperren"
        onClick={() => {
          setActionState((s) => ({ ...s, lock: true }));
          doAction(async () => {
            if (onLock) {
              await onLock();
            } else {
              // TODO(LEGACY): fallback stopTimer approximates locking
              await stopTimer(roomCode);
            }
          }, 'Antworten gesperrt').finally(() => setActionState((s) => ({ ...s, lock: false })));
        }}
        disabled={actionState.lock}
      >
        {actionState.lock ? 'Sperrt ...' : 'Antworten sperren'}
      </button>
    </section>
  );
};

export default ActionButtons;
