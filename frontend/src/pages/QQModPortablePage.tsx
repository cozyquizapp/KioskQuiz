// 2026-05-09 (Wolf): /mopo — Mobile-Mod-Page für iPhone während Live-Quiz.
// Großer Space-Button am unteren Rand (sticky bottom) + kompakte Mod-Facts
// (aktuelle Frage, richtige Antwort, kategorie-spezifische Hilfen). Setup
// + Konfig läuft weiter über /moderator am Laptop.
//
// Bewusst minimal: Wolf braucht im Pub keine Quick-Settings, nur einen
// drückbaren Knopf + die Frage-Hilfe.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQQSocket } from '../hooks/useQQSocket';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';

const QQ_ROOM = 'default';

export default function QQModPortablePage() {
  const roomCode = QQ_ROOM;
  const { state, connected, emit, reconnect } = useQQSocket(roomCode);

  // QQ-Body-Class für CozyQuiz-Styling
  useEffect(() => {
    document.body.classList.add('qq-active');
    return () => { document.body.classList.remove('qq-active'); };
  }, []);

  // Join als Moderator
  useEffect(() => {
    emit('qq:joinModerator', { roomCode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconnect bei Connection-Loss
  useEffect(() => {
    if (!connected) {
      const t = window.setTimeout(() => reconnect(), 1500);
      return () => window.clearTimeout(t);
    }
  }, [connected, reconnect]);

  const handleSpace = () => {
    if (!state) return;
    if (navigator.vibrate) navigator.vibrate(20);
    // Phase-spezifische Action — wir mappen die wichtigsten Phasen.
    // Für Edge-Cases (Connections sub-phases, Comeback-Choice) drückt Wolf am Laptop.
    const p = state.phase;
    if (p === 'RULES') {
      // Folge-Slide oder Finish bei letzter
      const totalSlides = (state.connectionsEnabled !== false) ? 10 : 9;
      if ((state.rulesSlideIndex ?? 0) >= totalSlides - 1) {
        emit('qq:rulesFinish', { roomCode });
      } else {
        emit('qq:rulesNext', { roomCode });
      }
      return;
    }
    if (p === 'PAUSED')           { emit('qq:resume', { roomCode }); return; }
    if (p === 'PHASE_INTRO')      { emit('qq:activateQuestion', { roomCode }); return; }
    if (p === 'QUESTION_ACTIVE')  { emit('qq:revealAnswer', { roomCode }); return; }
    if (p === 'QUESTION_REVEAL')  { emit('qq:nextQuestion', { roomCode }); return; }
    if (p === 'PLACEMENT')        { emit('qq:nextQuestion', { roomCode }); return; }
    if (p === 'TEAMS_REVEAL')     { emit('qq:rulesStart', { roomCode }); return; }
    if (p === 'COMEBACK_CHOICE')  { emit('qq:nextQuestion', { roomCode }); return; }
    if (p === 'CONNECTIONS_4X4')  { emit('qq:nextQuestion', { roomCode }); return; }
    if (p === 'FINAL_BETTING')    { emit('qq:finishFinalBetting', { roomCode }); return; }
    if (p === 'FINAL_REVEAL')     { emit('qq:nextQuestion', { roomCode }); return; }
    if (p === 'GAME_OVER')        { emit('qq:nextQuestion', { roomCode }); return; }
    // Fallback
    emit('qq:nextQuestion', { roomCode });
  };

  if (!state) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
          {connected ? '⏳ Lade State…' : '🔌 Verbindung…'}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header — minimal, Brand */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(15,12,9,0.92)',
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        borderBottom: '1px solid rgba(236,72,153,0.25)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 900, color: '#F472B6',
          textTransform: 'uppercase', letterSpacing: '0.14em',
        }}>🐺 MoPo</span>
        <span style={{
          fontSize: 11, fontWeight: 800, color: connected ? '#86EFAC' : '#F87171',
        }}>{connected ? '● live' : '● offline'}</span>
        <span style={{ flex: 1 }} />
        <Link to="/moderator" style={{
          fontSize: 10, color: '#94A3B8', textDecoration: 'none',
          padding: '4px 8px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.12)',
        }}>Laptop →</Link>
      </div>

      {/* Phase + Round/Question Indicator */}
      <PhaseHeader state={state} />

      {/* Body — Mod-Facts */}
      <div style={{
        flex: 1,
        padding: '14px 14px 140px',  // bottom-pad lässt Platz für Sticky-Button
        overflow: 'auto',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <ModFactsCompact state={state} />
      </div>

      {/* Sticky Bottom: Big Space-Button */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 10,
        background: 'linear-gradient(180deg, transparent 0%, rgba(15,12,9,0.95) 30%, rgba(15,12,9,1) 100%)',
        padding: '12px 14px max(20px, env(safe-area-inset-bottom)) 14px',
      }}>
        <button
          type="button"
          onClick={handleSpace}
          style={{
            width: '100%', minHeight: 88,
            padding: '18px 22px', borderRadius: 22,
            background: 'linear-gradient(135deg, #EC4899, #A21247)',
            border: '2.5px solid #F472B6',
            boxShadow: '0 10px 28px rgba(0,0,0,0.55), 0 0 32px rgba(236,72,153,0.45), inset 0 2px 0 rgba(255,255,255,0.18)',
            color: '#fff', fontFamily: 'inherit',
            fontSize: 22, fontWeight: 900, letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontSize: 28 }}>▶</span>
          <span>{getActionLabel(state.phase)}</span>
        </button>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at top, #1A1330 0%, #060A12 70%)',
  color: '#F1F5F9',
  fontFamily: "'Nunito', system-ui, sans-serif",
  display: 'flex', flexDirection: 'column',
  // iPhone Safe-Area
  paddingTop: 'env(safe-area-inset-top)',
};

function getActionLabel(phase: QQStateUpdate['phase']): string {
  switch (phase) {
    case 'LOBBY': return 'Setup am Laptop';
    case 'TEAMS_REVEAL': return 'Regel-Intro';
    case 'RULES': return 'Nächste Regel';
    case 'PHASE_INTRO': return 'Frage starten';
    case 'QUESTION_ACTIVE': return 'Antwort zeigen';
    case 'QUESTION_REVEAL': return 'Weiter →';
    case 'PLACEMENT': return 'Nächste Frage';
    case 'PAUSED': return 'Pause beenden';
    case 'COMEBACK_CHOICE': return 'Comeback weiter';
    case 'CONNECTIONS_4X4': return '4×4 weiter';
    case 'FINAL_BETTING': return 'Tipps schließen';
    case 'FINAL_REVEAL': return 'Reveal weiter';
    case 'GAME_OVER': return 'Zur Thanks-Page';
    case 'THANKS': return 'Quiz-Ende';
    default: return 'Weiter →';
  }
}

function PhaseHeader({ state: s }: { state: QQStateUpdate }) {
  const totalPhases = s.totalPhases ?? 4;
  const round = s.gamePhaseIndex;
  const qInPhase = (s.questionIndex % 5) + 1;
  // Phase-Label
  const phaseLabel: Record<QQStateUpdate['phase'], string> = {
    LOBBY: 'Lobby',
    TEAMS_REVEAL: 'Teams-Vorstellung',
    RULES: 'Regeln',
    PHASE_INTRO: 'Runden-Intro',
    QUESTION_ACTIVE: '⏱ Frage läuft',
    QUESTION_REVEAL: '✓ Auflösung',
    PLACEMENT: '📍 Setzen',
    PAUSED: '⏸ Pause',
    COMEBACK_CHOICE: '🔄 Comeback',
    CONNECTIONS_4X4: '🧩 4×4 Finale',
    FINAL_BETTING: '🎰 Final-Tipp',
    FINAL_REVEAL: '🏆 Final-Reveal',
    GAME_OVER: '🏆 Game-Over',
    THANKS: '👋 Thanks',
  };
  const phaseColor: Record<string, string> = {
    QUESTION_ACTIVE: '#F472B6',
    QUESTION_REVEAL: '#22C55E',
    PLACEMENT: '#06B6D4',
    PAUSED: '#94A3B8',
    FINAL_BETTING: '#EC4899',
    FINAL_REVEAL: '#FBBF24',
  };
  const accent = phaseColor[s.phase] ?? '#94A3B8';
  const showRound = ['PHASE_INTRO', 'QUESTION_ACTIVE', 'QUESTION_REVEAL', 'PLACEMENT'].includes(s.phase);
  return (
    <div style={{
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(15,12,9,0.60)',
    }}>
      <span style={{
        padding: '4px 12px', borderRadius: 999,
        background: `${accent}22`,
        border: `1.5px solid ${accent}66`,
        fontSize: 12, fontWeight: 900, color: accent,
        letterSpacing: '0.06em',
      }}>{phaseLabel[s.phase] ?? s.phase}</span>
      {showRound && (
        <span style={{
          fontSize: 12, fontWeight: 800, color: '#94A3B8',
        }}>R{round}/{totalPhases} · F{qInPhase}/5</span>
      )}
    </div>
  );
}

// ─── Mod-Facts kompakt ──────────────────────────────────────────────────────
function ModFactsCompact({ state: s }: { state: QQStateUpdate }) {
  const q = s.currentQuestion;
  const phase = s.phase;
  const isQuizPhase = phase === 'QUESTION_ACTIVE' || phase === 'QUESTION_REVEAL' || phase === 'PLACEMENT';
  if (!q || !isQuizPhase) {
    return (
      <div style={{
        padding: 18, borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#94A3B8', fontSize: 14, lineHeight: 1.5,
        textAlign: 'center',
      }}>
        {phaseHelpText(phase)}
      </div>
    );
  }
  const lang: 'de' | 'en' = s.language === 'en' ? 'en' : 'de';
  const text = (lang === 'en' && q.textEn) ? q.textEn : q.text;
  const answer = (lang === 'en' && q.answerEn) ? q.answerEn : q.answer;

  // Kategorie-spezifische Extras
  const extras: { label: string; value: string }[] = [];
  if (q.category === 'SCHAETZCHEN' && q.targetValue != null) {
    const unit = (lang === 'en' && q.unitEn) ? q.unitEn : (q.unit ?? '');
    extras.push({ label: 'Wert', value: `${q.targetValue}${unit ? ' ' + unit : ''}` });
  }
  if (q.category === 'MUCHO' && q.options && q.correctOptionIndex != null) {
    const opts = (lang === 'en' && q.optionsEn) ? q.optionsEn : q.options;
    extras.push({
      label: `Option ${'ABCD'[q.correctOptionIndex] ?? q.correctOptionIndex + 1}`,
      value: opts[q.correctOptionIndex] ?? '?',
    });
  }
  if (q.category === 'ZEHN_VON_ZEHN' && q.options && q.correctOptionIndex != null) {
    const opts = (lang === 'en' && q.optionsEn) ? q.optionsEn : q.options;
    extras.push({
      label: `Option ${q.correctOptionIndex + 1}`,
      value: opts[q.correctOptionIndex] ?? '?',
    });
  }
  const bt = q.bunteTuete;
  if (bt) {
    if (bt.kind === 'top5') {
      const ans = (lang === 'en' && bt.answersEn) ? bt.answersEn : bt.answers;
      extras.push({ label: 'Top 5', value: ans.join(' · ') });
    }
    if (bt.kind === 'order') {
      const items = (lang === 'en' && bt.itemsEn) ? bt.itemsEn : bt.items;
      const sorted = bt.correctOrder.map(i => items[i]).join(' → ');
      extras.push({ label: 'Reihenfolge', value: sorted });
    }
    if (bt.kind === 'hotPotato') {
      const valid = (q.answer || '').split(/[,;]/).map(a => a.trim()).filter(Boolean);
      extras.push({ label: `Antworten (${valid.length})`, value: valid.join(' · ') });
    }
    if (bt.kind === 'onlyConnect') {
      const hints = (lang === 'en' && bt.hintsEn) ? bt.hintsEn : bt.hints;
      extras.push({ label: 'Hinweise', value: hints.map((h, i) => `${i + 1}. ${h}`).join(' · ') });
    }
    if (bt.kind === 'bluff') {
      const real = (lang === 'en' && bt.realAnswerEn) ? bt.realAnswerEn : bt.realAnswer;
      extras.push({ label: 'Echte Antwort', value: real });
    }
  }

  // Sub-Kind-Label
  const subKindLabel: Record<string, string> = {
    top5: 'Top 5', order: 'Reihenfolge', hotPotato: 'Hot Potato',
    onlyConnect: '4 gewinnt', bluff: 'Bluff', map: 'CozyGuessr',
  };
  const subKind = bt?.kind ?? '';

  return (
    <>
      {/* Frage-Card */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 900, color: '#F472B6',
          textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span>{q.category}{subKind ? ` · ${subKindLabel[subKind] ?? subKind}` : ''}</span>
        </div>
        <div style={{
          fontSize: 17, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.35,
        }}>
          {text}
        </div>
      </div>

      {/* Antwort-Card — prominent */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'rgba(34,197,94,0.10)',
        border: '2px solid rgba(34,197,94,0.45)',
        boxShadow: '0 0 22px rgba(34,197,94,0.18)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 900, color: '#86EFAC',
          textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6,
        }}>✓ Antwort</div>
        <div style={{
          fontSize: 22, fontWeight: 900, color: '#22C55E', lineHeight: 1.25,
          letterSpacing: '-0.01em',
        }}>
          {answer}
        </div>
      </div>

      {/* Extras (Kategorie-spezifisch) */}
      {extras.map((e, i) => (
        <div key={i} style={{
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 900, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4,
          }}>{e.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#CBD5E1', lineHeight: 1.4 }}>
            {e.value}
          </div>
        </div>
      ))}

      {/* Hinweis falls kein Extras + nicht Quiz-Phase */}
      {phase === 'PLACEMENT' && (
        <div style={{
          padding: 10, borderRadius: 10,
          background: 'rgba(6,182,212,0.10)',
          border: '1px solid rgba(6,182,212,0.30)',
          fontSize: 12, color: '#67E8F9', textAlign: 'center', fontWeight: 700,
        }}>
          Team setzt Felder — Space wenn fertig
        </div>
      )}
    </>
  );
}

function phaseHelpText(phase: QQStateUpdate['phase']): string {
  switch (phase) {
    case 'LOBBY': return 'Setup auf /moderator (Laptop)';
    case 'TEAMS_REVEAL': return 'Teams werden vorgestellt — Space für Regeln';
    case 'RULES': return 'Regel-Slides — Space für nächste';
    case 'PHASE_INTRO': return 'Runde wird angekündigt — Space startet Frage';
    case 'PAUSED': return 'Pause — Space resumed';
    case 'COMEBACK_CHOICE': return 'Comeback-Team wählt Aktion';
    case 'CONNECTIONS_4X4': return '4×4 Finale — Spieler raten Gruppen';
    case 'FINAL_BETTING': return 'Teams tippen auf /team — Space schließt Phase';
    case 'FINAL_REVEAL': return '🏆 End-Reveal-Choreo — Space pro Step';
    case 'GAME_OVER': return 'Spiel zu Ende — Space → Thanks';
    case 'THANKS': return '👋 Quiz vorbei — Recap läuft';
    default: return 'Warte auf Phase…';
  }
}
