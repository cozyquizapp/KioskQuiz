/**
 * CozyQuizTeamQuestionCard — der Frage-/Reveal-Kern der Team-Phone-View.
 *
 * QuestionCard rendert in QUESTION_ACTIVE die aktuelle Frage + den passenden
 * Input (via interner AnswerInput-Routing-Helper), und in QUESTION_REVEAL die
 * Reveal-Sequenz mit eigener Antwort, Sieger-Banner, Top5/Order/Map-Listen,
 * etc. — alles gegated auf `solutionVisible` damit Phone nicht vor Beamer
 * spoilert.
 *
 * AnswerInput ist der zentrale Routing-Helper: er pickt je nach Kategorie /
 * Bunte-Tuete-Kind das passende Input-Component (TextInput / MuchoInput /
 * AllInInput / Top5Input / FixItInput / PinItInput / HotPotatoInput /
 * BluffInput / OnlyConnectInput / ImposterInput) und reicht emit/state durch.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 3.2).
 */
import { useEffect, useState } from 'react';
import {
  QQStateUpdate,
  QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS, QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';
import { QQ_CAT_ACCENT } from '../qqShared';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQIcon, QQEmojiIcon, qqCatSlug, qqSubSlug } from './QQIcon';
import {
  CozyCard, TeamTimerBar,
} from './CozyQuizTeamPrimitives';
import { SubmittedBadge } from './CozyQuizTeamInputs';
import {
  TextInput, MuchoInput, AllInInput, Top5Input, FixItInput, CrowdTopInput,
} from './CozyQuizTeamQuestionInputs';
import {
  HotPotatoInput, BluffInput, OnlyConnectInput,
  ImposterInput, PinItInput,
} from './CozyQuizTeamEmitInputs';
import { safeEmit } from '../utils/qqTeamAckBus';
import { QQ_COLORS } from '../../../shared/qqColors';
import { qqCapOption } from '../cozyQuizShared';
import { isThemed } from '../qqTheme';

// Kleine Hash-Helper-Funktion (nur fuer deterministische Trost-Message-Auswahl, kein Crypto).
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ── Main AnswerInput router ───────────────────────────────────────────────────
function AnswerInput({ state: s, myTeamId, emit, roomCode, catColor, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang: 'de' | 'en';
}) {
  const q = s.currentQuestion;
  const myAnswer = s.answers.find(a => a.teamId === myTeamId);

  // 2026-05-05 (Wolf-Bug 'CHEESE Timer-Ablauf, dann kommt Eingabefeld wieder
  // kurz'): sticky-Flag im Frontend. Sobald `timerExpired===true` einmal
  // gesehen wurde und ich noch nicht geantwortet hatte, bleibt der „Zeit
  // vorbei"-Banner sichtbar bis zur naechsten Frage.
  const [stickyExpired, setStickyExpired] = useState(false);
  useEffect(() => {
    if ((s as any).timerExpired === true && !myAnswer && s.phase === 'QUESTION_ACTIVE') {
      setStickyExpired(true);
    }
  }, [(s as any).timerExpired, !!myAnswer, s.phase]);
  useEffect(() => {
    setStickyExpired(false);
  }, [q?.text]); // reset bei neuer Frage

  async function submitText(text: string) {
    if (!text.trim()) return;
    // 2026-05-11 (Audit P0): Submit-Vibe Burst [30,40,80] — Pub-tauglich.
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    await safeEmit(emit, 'qq:submitAnswer', { roomCode, teamId: myTeamId, answer: text.trim() });
  }

  // 2026-05-02 (Wolfs Bug 'Timer abgelaufen ohne Antwort - Phone zeigt nichts'):
  // Wenn der Timer regulaer abgelaufen ist + ich noch nicht geantwortet habe,
  // zeige einen 'leider zu langsam'-Banner statt des offen bleibenden Inputs.
  // 2026-05-06 (Wolf-Bug 'bei Cheese zu spaet, danach kommt Eingabefeld nochmal'):
  // Phase-Gate erweitert auf QUESTION_REVEAL.
  if (!myAnswer && (stickyExpired || (s as any).timerExpired === true)
      && (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL')) {
    return (
      <div style={{
        padding: '20px 22px', borderRadius: 16, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.06))',
        border: '2px solid rgba(239,68,68,0.45)',
        boxShadow: '0 0 30px rgba(239,68,68,0.18), 0 6px 18px rgba(0,0,0,0.4)',
        animation: 'tcreveal 0.3s ease both',
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>⏰</span>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#f87171' }}>
          {lang === 'de' ? 'Zeit vorbei!' : 'Time\'s up!'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: QQ_COLORS.red300, maxWidth: 260, lineHeight: 1.4 }}>
          {lang === 'de'
            ? 'Diesmal wart ihr leider zu langsam. Beim nächsten Mal — wir glauben an euch.'
            : 'You were a bit too slow this time. Next round you got this!'}
        </div>
      </div>
    );
  }

  if (myAnswer) {
    let displayText = myAnswer.text;
    // MUCHO: answer is option index ("0","1",...) — resolve to actual option text
    if (q && q.category === 'MUCHO' && q.options) {
      const idx = parseInt(myAnswer.text, 10);
      if (!isNaN(idx) && q.options[idx]) {
        const optText = qqCapOption(lang === 'en' && q.optionsEn?.[idx] ? q.optionsEn[idx] : q.options[idx]);
        displayText = `${['A','B','C','D'][idx] ?? idx + 1}. ${optText}`;
      }
    }
    // 2026-05-23 (Live-Test-Bug #K): ZEHN_VON_ZEHN-Bets sind als „n,n,n" gespeichert
    // — vorher pur als „1,10,15" angezeigt was unklar war. Jetzt Punkte-Verteilung
    // pro Option lesbar: „1: 1 · 2: 10 · 3: 15" mit Original-Optionstext im Reveal.
    // 2026-07-08 Konsistenz #6: 1/2/3 statt A/B/C — Buttons + Beamer nutzen Zahlen.
    if (q && q.category === 'ZEHN_VON_ZEHN' && q.options) {
      const parts = myAnswer.text.split(',').map(s => s.trim());
      const labels = ['1','2','3','4'];
      const formatted = parts.map((p, i) => {
        const pts = parseInt(p, 10);
        if (isNaN(pts) || pts === 0) return null;
        return `${labels[i] ?? i + 1}: ${pts}`;
      }).filter(Boolean).join(' · ');
      if (formatted) displayText = formatted;
    }
    // CozyGuessr map: raw coordinates are meaningless to players
    if (q && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map') {
      displayText = lang === 'de' ? '📍 Pin auf Karte gesetzt' : '📍 Pin placed on map';
    }
    // E2: Liste der Teams, die noch keine Antwort abgegeben haben.
    const answeredIds = new Set(s.answers.map(a => a.teamId));
    const pendingTeams = s.teams.filter(t => !answeredIds.has(t.id));
    // E1: Rang = Position der eigenen Antwort in submit-order (1-based).
    const sortedAnswers = [...s.answers].sort((a, b) => a.submittedAt - b.submittedAt);
    const myRank = sortedAnswers.findIndex(a => a.teamId === myTeamId) + 1;
    // 2026-05-23 (Wolf-Live-Test #O): Revoke nur waehrend QUESTION_ACTIVE +
    // Timer noch nicht abgelaufen + nicht HotPotato (eigene UX-Flow).
    // Bei Map-Submits ist Revoke unkritisch, bei OnlyConnect/Bluff/Imposter
    // ist die Submission tiefer in der Mechanik verzahnt — fuer die wenigsten
    // Teams ein use-case, also nur fuer „normale" Submits (Mucho/Schaetzchen/
    // Cheese/ZvZ/Top5/Order/Map) anbieten.
    const subKind = (q?.bunteTuete as any)?.kind;
    const isComplexBT = q?.category === 'BUNTE_TUETE'
      && (subKind === 'bluff' || subKind === 'onlyConnect' || subKind === 'oneOfEight' || subKind === 'hotPotato');
    const canRevoke = s.phase === 'QUESTION_ACTIVE'
      && !(s as any).timerExpired
      && !isComplexBT;
    return <SubmittedBadge
      text={displayText}
      lang={lang}
      answeredCount={s.answers.length}
      totalTeams={s.teams.length}
      pendingTeams={pendingTeams}
      myRank={myRank > 0 ? myRank : undefined}
      onRevoke={canRevoke ? () => {
        if (navigator.vibrate) navigator.vibrate(20);
        safeEmit(emit, 'qq:revokeAnswer', { roomCode, teamId: myTeamId });
      } : undefined}
    />;
  }
  if (!q) return null;

  const enterAnswerPlaceholder = lang === 'de' ? 'Antwort eingeben…' : 'Enter answer…';

  // Hot Potato — team text input (only active team, not eliminated)
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') {
    return <HotPotatoInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />;
  }

  // Route by category
  // B7: alle Standard-Inputs bekommen `timerEndsAt` fuer Auto-Submit on Expire.
  const tEnd = s.timerEndsAt ?? null;
  if (q.category === 'MUCHO') return <MuchoInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
  if (q.category === 'ZEHN_VON_ZEHN') return <AllInInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
  if (q.category === 'SCHAETZCHEN') {
    const unit = lang === 'en' && q.unitEn ? q.unitEn : q.unit;
    // 2026-05-07 (Wolf): Jahreszahl-Mode → eigener Placeholder, kein Unit.
    const placeholder = q.isYearAnswer
      ? (lang === 'de' ? 'Jahr (z.B. 1989)' : 'Year (e.g. 1989)')
      : unit
      ? (lang === 'de' ? `Deine Schätzung (${unit})` : `Your estimate (${unit})`)
      : (lang === 'de' ? 'Deine Schätzung' : 'Your estimate');
    // 2026-05-23 (Mobile-Audit #8): integerOnly bei Jahres-Fragen — verhindert
    // Dezimalpunkt-Eingabe auf Android-Keyboards.
    return <TextInput catColor={catColor} onSubmit={submitText} numeric integerOnly={!!q.isYearAnswer} placeholder={placeholder} lang={lang} timerEndsAt={tEnd} />;
  }
  if (q.category === 'CHEESE') return <TextInput catColor={catColor} onSubmit={submitText} placeholder={enterAnswerPlaceholder} lang={lang} timerEndsAt={tEnd} />;
  if (q.category === 'BUNTE_TUETE') {
    const kind = q.bunteTuete?.kind;
    if (kind === 'top5') return <Top5Input catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
    if (kind === 'crowdTop') return <CrowdTopInput catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
    if (kind === 'crowdEstimate') {
      const ce = q.bunteTuete as any;
      const unit = lang === 'en' && ce.unitEn ? ce.unitEn : ce.unit;
      const ph = unit
        ? (lang === 'de' ? `Deine Schätzung (${unit})` : `Your estimate (${unit})`)
        : (lang === 'de' ? 'Deine Schätzung' : 'Your estimate');
      return <TextInput catColor={catColor} onSubmit={submitText} numeric placeholder={ph} lang={lang} timerEndsAt={tEnd} />;
    }
    if (kind === 'oneOfEight') return <ImposterInput question={q} catColor={catColor} state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />;
    if (kind === 'order') return <FixItInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
    if (kind === 'map') return <PinItInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} myTeam={s.teams.find(tm => tm.id === myTeamId) ?? null} />;
    if (kind === 'onlyConnect') return <OnlyConnectInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />;
    if (kind === 'bluff') return <BluffInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />;
  }
  // Fallback
  return <TextInput catColor={catColor} onSubmit={submitText} placeholder={enterAnswerPlaceholder} lang={lang} timerEndsAt={tEnd} />;
}

// ── QuestionCard ──────────────────────────────────────────────────────────────
export function QuestionCard({ state: s, myTeamId, emit, roomCode, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; lang: 'de' | 'en';
}) {
  const q = s.currentQuestion;
  // Critical-Glow: letzte 3s auf dem Question-Card — rot pulsierend.
  const [isCritical, setIsCritical] = useState(false);
  useEffect(() => {
    if (!s.timerEndsAt || s.phase !== 'QUESTION_ACTIVE') { setIsCritical(false); return; }
    const iv = setInterval(() => {
      const secs = Math.ceil(Math.max(0, (s.timerEndsAt! - Date.now()) / 1000));
      setIsCritical(secs >= 1 && secs <= 3);
      if (secs === 0) clearInterval(iv);
    }, 120);
    return () => clearInterval(iv);
  }, [s.timerEndsAt, s.phase]);

  if (!q) return null;
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catAccent = QQ_CAT_ACCENT[q.category] ?? catColor;
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  // Wolfs Feedback 2026-05-01: Phone darf Reveal nicht vor Beamer zeigen
  // (sonst kennen Teams die Antwort schon, Spannung weg).
  const phaseIsReveal = s.phase === 'QUESTION_REVEAL';
  const [revealUnlocked, setRevealUnlocked] = useState(false);
  useEffect(() => {
    if (phaseIsReveal) {
      // Lock-Duration matcht Beamer-Cascade-Dauer pro Kategorie.
      // 2026-05-05 (Wolf-Test): Base-Werte um +1500ms erhoeht damit Beamer-
      // Cascade garantiert vor Phone-Reveal abgelaufen ist.
      const btKind = q.bunteTuete?.kind ?? '';
      const teamCount = Math.max(1, s.teams.length);
      const lockMs = (() => {
        if (q.category === 'MUCHO') return Math.min(12500, 3000 + teamCount * 250);
        if (q.category === 'ZEHN_VON_ZEHN') return Math.min(13500, 4000 + teamCount * 800);
        if (q.category === 'CHEESE') return Math.min(12500, 3000 + teamCount * 850);
        if (q.category === 'SCHAETZCHEN') return Math.min(12500, 3500 + Math.min(5, teamCount) * 1600);
        if (q.category === 'BUNTE_TUETE' && btKind === 'top5') return Math.min(15500, 4000 + Math.min(5, teamCount) * 2400);
        if (q.category === 'BUNTE_TUETE' && btKind === 'order') return Math.min(13500, 3000 + Math.min(5, teamCount) * 2000);
        if (q.category === 'BUNTE_TUETE' && btKind === 'onlyConnect') return 5500;
        if (q.category === 'BUNTE_TUETE' && btKind === 'bluff') return 5500;
        // Map-Reveal hat lange Cascade — Target-Pin-Drop + Team-Pin-Drops
        // gestaffelt + Polylines-Tweening + mapRevealStep schrittweise.
        if (q.category === 'BUNTE_TUETE' && btKind === 'map') return Math.min(16000, 5500 + teamCount * 1200);
        return 5000; // single-winner default (hotPotato, oneOfEight)
      })();
      const t = setTimeout(() => setRevealUnlocked(true), lockMs);
      return () => clearTimeout(t);
    } else {
      setRevealUnlocked(false);
    }
  }, [phaseIsReveal, q.category, q.bunteTuete?.kind, s.teams.length]);
  const isRevealed = phaseIsReveal && revealUnlocked;
  // 2026-05-06 (Wolf 'in mucho kommt loesung auf /team teilweise immernoch
  // vor reveal auf beamer'): solutionVisible gated alle Loesung-zeigenden
  // Bloecke auf den TATSAECHLICHEN Beamer-Reveal-Step.
  const solutionVisible = (() => {
    if (!isRevealed) return false;
    if (q.category === 'MUCHO') {
      // 2026-05-07 (Wolf 'Mucho-Reveal kommt auf /team deutlich frueher'):
      // berechne Lock-Step aus tatsaechlicher Anzahl nicht-leerer Optionen.
      const nonEmpty = (q.options ?? []).filter((_: unknown, i: number) =>
        s.answers.some(a => a.text === String(i))
      ).length;
      const lockStep = Math.max(2, nonEmpty + 1);
      return (s.muchoRevealStep ?? 0) >= lockStep;
    }
    if (q.category === 'ZEHN_VON_ZEHN') return (s.zvzRevealStep ?? 0) >= 2;
    if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'map') {
      // Map-Reveal: erst nach Closeup-Zoom ist Beamer-Reveal komplett.
      const validCount = s.answers.filter(a => {
        const parts = String(a.text ?? '').split(',');
        return Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[1]));
      }).length;
      return (s.mapRevealStep ?? 0) >= 1 + validCount + 1;
    }
    return true;
  })();
  const iWon = s.correctTeamId === myTeamId;
  const iSubmitted = !!s.answers.find(a => a.teamId === myTeamId);
  const isCheese = q.category === 'CHEESE';
  // hasCheeseImg wird aktuell nicht im Body genutzt — bewusst behalten als
  // Hook fuer zukuenftige Cheese-Reveal-Bilder. Strangler-Fig 1:1.
  void (isCheese && q.image?.url);

  // Phase-specific card styling — accent color for glow matching beamer
  const cardBorder = isRevealed
    ? (iWon ? QQ_COLORS.green500 : QQ_COLORS.red500)
    : catAccent;

  const yourTurnLabel = lang === 'de' ? '🥔 Du bist dran!' : '🥔 Your turn!';
  const outLabel = lang === 'de' ? '❌ Du bist raus' : '❌ You are out';

  return (
    <div style={{
      borderRadius: 24,
      animation: isCritical && !isRevealed ? 'tcCriticalGlow 0.7s ease-in-out infinite' : undefined,
    }}>
    <CozyCard key={q.id} borderColor={cardBorder} pulse={!isRevealed}>
      {/* Category pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
        padding: '6px 16px', borderRadius: 999,
        background: `${catAccent}18`, border: `2px solid ${catAccent}44`,
        color: catAccent, fontSize: 15, fontWeight: 900, letterSpacing: '0.04em',
        boxShadow: `0 0 16px ${catAccent}22`,
      }}>
        {(() => {
          // 2026-05-11 (Wolf): Bunte-Tuete-Sub-Icon statt 🎁.
          const btKind = q.category === 'BUNTE_TUETE' ? q.bunteTuete?.kind : undefined;
          const subSlug = btKind ? qqSubSlug(btKind) : null;
          const slug = btKind ? subSlug : qqCatSlug(q.category as string);
          const fallback = btKind ? QQ_BUNTE_TUETE_LABELS[btKind].emoji : catLabel.emoji;
          return slug
            ? <QQIcon slug={slug} size={20} alt={catLabel.de} />
            : <span style={{ fontSize: 16 }}><QQEmojiIcon emoji={fallback}/></span>;
        })()}
        {(() => {
          const btKind = q.category === 'BUNTE_TUETE' ? q.bunteTuete?.kind : undefined;
          if (btKind) {
            return lang === 'en' ? QQ_BUNTE_TUETE_LABELS[btKind].en : QQ_BUNTE_TUETE_LABELS[btKind].de;
          }
          return lang === 'en' ? catLabel.en : catLabel.de;
        })()}
      </div>

      {/* Timer bar */}
      {s.timerEndsAt && !isRevealed && (
        <TeamTimerBar endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accentColor={catColor} />
      )}

      {/* Question text */}
      <div style={{
        fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 900, lineHeight: 1.3,
        color: isThemed() ? 'var(--qq-card-text)' : '#F8FAFC', marginBottom: 14,
      }}>
        {lang === 'en' && q.textEn ? q.textEn : q.text}
      </div>

      {/* Answer input (active only) */}
      {!isRevealed && s.hotPotatoActiveTeamId === myTeamId && (
        <div style={{
          padding: '12px 16px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.4)',
          fontSize: 18, fontWeight: 900, color: '#f87171',
          animation: 'tcpulse 1.5s ease-in-out infinite',
          marginBottom: 8,
        }}>
          {yourTurnLabel}
        </div>
      )}
      {!isRevealed && s.hotPotatoActiveTeamId && s.hotPotatoActiveTeamId !== myTeamId && (
        <div style={{
          padding: '8px 14px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 14, color: QQ_COLORS.slate500, marginBottom: 8,
        }}>
          <QQEmojiIcon emoji="🥔"/> {s.teams.find(tm => tm.id === s.hotPotatoActiveTeamId)?.name ?? '?'} {lang === 'en' ? 'is up' : 'ist dran'}
        </div>
      )}
      {!isRevealed && s.hotPotatoEliminated.includes(myTeamId) && (
        <div style={{
          padding: '8px 14px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(239,68,68,0.1)', fontSize: 14, color: '#f87171', marginBottom: 8,
        }}>
          {outLabel}
        </div>
      )}
      {!isRevealed && (
        // 2026-05-23 (Mobile-Audit #2): key={q.id} forciert React-Remount der
        // gesamten Input-Subtree wenn die Frage wechselt. Sonst persistiert
        // lokaler useState in TextInput/MuchoInput/AllInInput/etc. über
        // Question-Wechsel hinweg (z.B. 2 SCHAETZCHEN hintereinander) und
        // zeigt stale Eingaben aus der vorherigen Frage.
        <AnswerInput key={s.currentQuestion?.id ?? 'no-q'} state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />
      )}

      {/* Team answer progress (shown when not yet submitted & others answering) */}
      {!isRevealed && !s.answers.find(a => a.teamId === myTeamId) && s.answers.length > 0 && s.teams.length > 1 && (
        <div style={{
          marginTop: 6, textAlign: 'center', fontSize: 13, color: QQ_COLORS.slate400, fontWeight: 700,
          animation: 'tcreveal 0.3s ease both',
        }}>
          {s.answers.length}/{s.teams.length} Teams {lang === 'de' ? 'haben schon geantwortet' : 'already answered'}
        </div>
      )}

      {/* Revealed answer */}
      {solutionVisible && s.revealedAnswer && (
        <div style={{
          marginTop: 8, padding: '12px 16px', borderRadius: 16,
          background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)',
          fontSize: 20, fontWeight: 900, color: QQ_COLORS.green400,
          animation: 'tcreveal 0.4s ease both',
        }}>
          ✓ {s.revealedAnswer}
          {lang === 'en' && q.answerEn && q.answerEn !== s.revealedAnswer && (
            <div style={{ fontFamily: 'inherit', fontSize: 14, color: 'rgba(74,222,128,0.5)', marginTop: 4 }}>
              {q.answerEn}
            </div>
          )}
        </div>
      )}

      {solutionVisible && s.correctTeamId && !!(s.pendingFor || s.pendingAction) && (() => {
        const winnerTeam = s.teams.find(t => t.id === s.correctTeamId);
        const cat = q.category;
        const isEn = lang === 'en';
        const muchoSpeedWin = cat === 'MUCHO' && q.correctOptionIndex != null
          && s.answers.filter(a => a.text === String(q.correctOptionIndex)).length > 1;
        if (iWon) {
          const winMsg = cat === 'SCHAETZCHEN'
            ? (isEn ? '🎯 You were closest! Choose a field.' : '🎯 Ihr wart am nächsten dran! Wählt ein Feld.')
            : cat === 'CHEESE'
              ? (isEn ? '📸 Correct! Choose a field.' : '📸 Erkannt! Wählt ein Feld.')
              : cat === 'BUNTE_TUETE'
                ? (isEn ? '🎁 You win this round! Choose a field.' : '🎁 Ihr gewinnt die Runde! Wählt ein Feld.')
                : cat === 'ZEHN_VON_ZEHN'
                  ? (isEn ? '💰 Most points on the right answer! Choose a field.' : '💰 Die meisten Punkte auf die richtige Antwort! Wählt ein Feld.')
                  : muchoSpeedWin
                    ? (isEn ? '⚡ Fastest & correct! Choose a field.' : '⚡ Am schnellsten & richtig! Wählt ein Feld.')
                    : (isEn ? '🎉 Correct! You may choose a field.' : '🎉 Richtig! Ihr dürft ein Feld wählen.');
          return (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 16,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
              fontSize: 15, fontWeight: 900, color: QQ_COLORS.green400, textAlign: 'center',
              animation: 'tcwinBounce 0.6s var(--qq-ease-bounce) both',
              boxShadow: '0 0 20px rgba(34,197,94,0.25)',
            }}>
              {winMsg}
            </div>
          );
        } else if (winnerTeam) {
          // Eigene Antwort auf Korrektheit pruefen.
          const myAnswer = s.answers.find(a => a.teamId === myTeamId);
          // 2026-05-02 (Phone-Beamer-Audit): Backend-Truth via currentQuestionWinners.
          const winnerIdSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
          const iWasAlsoCorrect = winnerIdSet.has(myTeamId);

          // Rang unter allen richtigen Antworten (1 = schnellstes richtiges Team = Gewinner)
          let myRank = 0;
          if (iWasAlsoCorrect && myAnswer) {
            const correctSorted = s.answers
              .filter(a => winnerIdSet.has(a.teamId))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            myRank = correctSorted.findIndex(a => a.teamId === myTeamId) + 1;
          }

          const loseMsg = iWasAlsoCorrect
            ? (myRank >= 2
                ? (isEn
                    ? `✓ Also correct! You place #${myRank} — coming up right after.`
                    : `✓ Auch richtig! Ihr platziert als Nr. ${myRank} — gleich seid ihr dran.`)
                : (isEn
                    ? `✓ Correct! Placement coming up right after ${winnerTeam.name}.`
                    : `✓ Richtig! Ihr setzt gleich nach ${winnerTeam.name}.`))
            : cat === 'SCHAETZCHEN'
              ? (isEn ? `😔 ${winnerTeam.name} was closer.` : `😔 Leider war ${winnerTeam.name} näher dran.`)
              : (isEn ? `😔 ${winnerTeam.name} got it right.` : `😔 ${winnerTeam.name} hatte Recht.`);
          return (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 16,
              background: iWasAlsoCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${iWasAlsoCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
              fontSize: 14, fontWeight: 900, color: iWasAlsoCorrect ? QQ_COLORS.green400 : QQ_COLORS.slate500, textAlign: 'center',
              animation: 'tcreveal 0.4s ease 0.2s both',
            }}>
              {loseMsg}
            </div>
          );
        }
        return null;
      })()}

      {/* Eigene Antwort (Schaetzchen / Mucho / Cheese) — "Was hatten wir nochmal?". */}
      {solutionVisible
        && (q.category === 'SCHAETZCHEN' || q.category === 'MUCHO' || q.category === 'CHEESE') && (() => {
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        let displayText = myAns.text;
        let isCorrect: boolean | null = null;
        let rankAmongCorrect: number | null = null;
        if (q.category === 'MUCHO' && q.options) {
          const idx = parseInt(myAns.text, 10);
          if (!isNaN(idx) && q.options[idx]) {
            const optText = qqCapOption(lang === 'en' && q.optionsEn?.[idx] ? q.optionsEn[idx] : q.options[idx]);
            displayText = `${['A','B','C','D'][idx] ?? idx + 1}. ${optText}`;
          }
          isCorrect = q.correctOptionIndex != null && myAns.text === String(q.correctOptionIndex);
          if (isCorrect && q.correctOptionIndex != null) {
            const correctSorted = s.answers
              .filter(a => a.text === String(q.correctOptionIndex))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            rankAmongCorrect = correctSorted.findIndex(a => a.teamId === myTeamId) + 1;
          }
        } else if (q.category === 'SCHAETZCHEN') {
          isCorrect = myAns.teamId === s.correctTeamId;
        } else if (q.category === 'CHEESE') {
          // CHEESE: Backend ist Single Source of Truth.
          const winners = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
          isCorrect = winners.includes(myTeamId);
          if (isCorrect) {
            const correctSorted = s.answers
              .filter(a => winners.includes(a.teamId))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            rankAmongCorrect = correctSorted.findIndex(a => a.teamId === myTeamId) + 1;
          }
        }
        // Status-Text: bei SCHAETZCHEN-Falsch entschaerfen.
        const ordinalDe = (n: number) => `${n}.`;
        const ordinalEn = (n: number) => {
          const s2 = n % 100;
          if (s2 >= 11 && s2 <= 13) return `${n}th`;
          const last = n % 10;
          if (last === 1) return `${n}st`;
          if (last === 2) return `${n}nd`;
          if (last === 3) return `${n}rd`;
          return `${n}th`;
        };
        let statusText: string | null = null;
        if (isCorrect === true) {
          if (q.category === 'SCHAETZCHEN') {
            statusText = lang === 'en' ? 'Closest estimate!' : 'Beste Schätzung!';
          } else if (rankAmongCorrect && rankAmongCorrect > 0) {
            statusText = lang === 'en'
              ? `Correct — ${ordinalEn(rankAmongCorrect)} fastest team`
              : `Richtig — ${ordinalDe(rankAmongCorrect)} schnellstes Team`;
          } else {
            statusText = lang === 'en' ? 'Correct!' : 'Richtig!';
          }
        } else if (isCorrect === false) {
          if (q.category === 'SCHAETZCHEN') {
            // 2026-05-03 (Wolf-Bug 'doppelter Rueckmeldungstext'): bei SCHAETZCHEN
            // wird "Ein anderes Team war naeher" schon in der Sieger-Card oben
            // gezeigt (loseMsg). Hier keinen Doublet.
            statusText = null;
          } else {
            statusText = lang === 'en' ? 'Not correct' : 'Nicht richtig';
          }
        }
        return (
          <div style={{
            marginTop: 10,
            padding: '10px 14px', borderRadius: 16,
            background: isCorrect === true ? 'rgba(34,197,94,0.10)'
              : isCorrect === false ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isCorrect === true ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
            animation: 'tcreveal 0.35s ease 0.15s both',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.slate400, letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {lang === 'en' ? 'Your answer' : 'Eure Antwort'}
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 900, color: isCorrect === true ? QQ_COLORS.green400 : QQ_COLORS.slate200, wordBreak: 'break-word' }}>
                {displayText || '—'}
              </span>
              {isCorrect !== null && (
                <span style={{ fontSize: 18, fontWeight: 900, color: isCorrect ? QQ_COLORS.green400 : '#f87171', flexShrink: 0 }}>
                  {isCorrect ? '✓' : '✗'}
                </span>
              )}
            </div>
            {statusText && (
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: isCorrect ? QQ_COLORS.green300 : QQ_COLORS.slate400,
                paddingLeft: 2,
              }}>
                {statusText}
              </div>
            )}
          </div>
        );
      })()}

      {/* All-In: Punkteverteilung der eigenen Tipps */}
      {solutionVisible && q.category === 'ZEHN_VON_ZEHN' && q.options && (() => {
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        const parts = String(myAns.text ?? '').split(',').map(x => parseInt(x.trim(), 10));
        if (parts.length !== q.options.length || parts.some(Number.isNaN)) return null;
        const correctIdx = q.correctOptionIndex;
        const earned = correctIdx != null ? (parts[correctIdx] ?? 0) : 0;
        const maxPts = Math.max(...parts, 1);
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: QQ_COLORS.slate400, marginBottom: 2, letterSpacing: 0.3, display: 'flex', justifyContent: 'space-between' }}>
              <span>💰 {lang === 'en' ? 'Your bets' : 'Eure Punkte'}</span>
              <span style={{ color: earned > 0 ? QQ_COLORS.green400 : QQ_COLORS.slate400 }}>
                {lang === 'en' ? `+${earned} pts` : `+${earned} Pkt`}
              </span>
            </div>
            {q.options.map((opt, i) => {
              const pts = parts[i] ?? 0;
              const isCorrect = i === correctIdx;
              // 2026-07-08 Konsistenz #5: alle Optionen in Kategorie-Akzent wie Beamer.
              const color = catColor;
              const pct = (pts / maxPts) * 100;
              return (
                <div key={i} style={{
                  position: 'relative', overflow: 'hidden',
                  padding: '8px 10px', borderRadius: 8,
                  background: isCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  {/* Bar */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`, background: `${color}22`,
                    transition: 'width 0.6s ease',
                  }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>
                      {isCorrect ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: isCorrect ? QQ_COLORS.green400 : QQ_COLORS.slate200 }}>
                      {qqCapOption(opt)}
                    </span>
                    <span style={{
                      fontWeight: 900, fontSize: 14,
                      color: pts === 0 ? QQ_COLORS.slate600 : isCorrect ? QQ_COLORS.green400 : color,
                      minWidth: 28, textAlign: 'right',
                    }}>
                      {pts}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Reihenfolge: eigene Sortierung mit ✓/✗ pro Position */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
        const btt = q.bunteTuete as any;
        const items: string[] = btt.items ?? [];
        const correctOrder: number[] = btt.correctOrder ?? items.map((_: any, i: number) => i);
        const correctSeq = correctOrder.map((idx: number) => (items[idx] ?? '').trim());
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        const mine = String(myAns.text ?? '').split('|').map(x => x.trim()).filter(Boolean);
        const myHits: boolean[] = s.orderHitsByTeam?.[myTeamId] ?? mine.map(() => false);
        const hits = myHits.filter(Boolean).length;
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: QQ_COLORS.slate400, marginBottom: 2, letterSpacing: 0.3, display: 'flex', justifyContent: 'space-between' }}>
              <span><QQEmojiIcon emoji="📊"/> {lang === 'en' ? 'Your order' : 'Eure Reihenfolge'}</span>
              <span style={{ color: hits === correctSeq.length ? QQ_COLORS.green400 : QQ_COLORS.slate400 }}>
                {hits}/{correctSeq.length} {lang === 'en' ? 'correct' : 'richtig'}
              </span>
            </div>
            {mine.map((g, i) => {
              const correct = correctSeq[i] ?? '';
              const ok = !!myHits[i];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: ok ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.25)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  <span style={{ fontSize: 12, width: 22, textAlign: 'center', fontWeight: 900, color: QQ_COLORS.slate500 }}>#{i+1}</span>
                  <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{ok ? '✓' : '✗'}</span>
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: ok ? QQ_COLORS.green400 : '#f87171' }}>{g}</span>
                  {!ok && correct && (
                    <span style={{ fontSize: 12, color: QQ_COLORS.slate400, fontWeight: 700 }}>
                      → {correct}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Top-5: eigene Antworten mit ✓/✗ + Team-Badges wer es auch hatte */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'top5' && (() => {
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        const mine = String(myAns.text ?? '').split('|').map(x => x.trim()).filter(Boolean);
        const myHits = s.top5HitsByTeam?.[myTeamId] ?? [];
        // Andere Teams die einen bestimmten correctIdx auch getroffen haben:
        const teamsForCorrectIdx = (idx: number): Array<{ id: string; color: string; avatarId: string; name: string }> => {
          const out: Array<{ id: string; color: string; avatarId: string; name: string }> = [];
          for (const a of s.answers) {
            if (a.teamId === myTeamId) continue;
            const otherHits = s.top5HitsByTeam?.[a.teamId] ?? [];
            if (otherHits.includes(idx)) {
              const tm = s.teams.find(t => t.id === a.teamId);
              if (tm) out.push({ id: tm.id, color: tm.color, avatarId: tm.avatarId, name: tm.name });
            }
          }
          return out;
        };
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: QQ_COLORS.slate400, marginBottom: 2, letterSpacing: 0.3, display: 'flex', justifyContent: 'space-between' }}>
              <span>📝 {lang === 'en' ? 'Your answers' : 'Eure Tipps'}</span>
              <span style={{ color: myHits.length > 0 ? QQ_COLORS.green400 : QQ_COLORS.slate400 }}>
                {myHits.length}/{mine.length} {lang === 'en' ? 'hit' : 'Treffer'}
              </span>
            </div>
            {mine.map((g, i) => {
              const isHit = i < myHits.length;
              const correctIdxForThis = isHit ? myHits[i] : -1;
              const others = correctIdxForThis >= 0 ? teamsForCorrectIdx(correctIdxForThis) : [];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: isHit ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${isHit ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.25)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{isHit ? '✓' : '✗'}</span>
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: isHit ? QQ_COLORS.green400 : '#f87171' }}>{g}</span>
                  {others.length > 0 && (
                    <div style={{ display: 'flex', gap: 3 }}>
                      {others.map(o => (
                        <QQTeamAvatar key={o.id} avatarId={o.avatarId} size={22} title={o.name} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* CozyGuessr: Distanz-Ranking */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map' && (() => {
        const btt = q.bunteTuete as any;
        const tLat: number = btt.lat; const tLng: number = btt.lng;
        const scored = [...s.answers].map(a => {
          const parts = String(a.text ?? '').split(',');
          const lat = Number(parts[0]); const lng = Number(parts[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...a, distKm: null as number | null };
          const R = 6371;
          const dLat = (lat - tLat) * Math.PI / 180;
          const dLng = (lng - tLng) * Math.PI / 180;
          const aa = Math.sin(dLat/2)**2 + Math.cos(tLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
          return { ...a, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa)) };
        }).sort((a, b) => (a.distKm === null ? 1 : b.distKm === null ? -1 : a.distKm - b.distKm));
        if (scored.length === 0) return null;
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: QQ_COLORS.slate400, marginBottom: 2, letterSpacing: 0.3 }}>
              <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest to target' : 'Am nächsten dran'}
            </div>
            {scored.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isMe = a.teamId === myTeamId;
              const medal = i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `#${i+1}`;
              const dist = a.distKm == null ? '—' : a.distKm < 1 ? `${Math.round(a.distKm * 1000)} m` : `${a.distKm.toFixed(1)} km`;
              return (
                <div key={a.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: isMe ? `${team?.color ?? QQ_COLORS.blue500}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isMe ? (team?.color ?? QQ_COLORS.blue500) + '88' : 'rgba(255,255,255,0.08)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  <span style={{ fontSize: 14, width: 28, textAlign: 'center', fontWeight: 900 }}>{medal}</span>
                  {team && <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={18} />}
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: team?.color ?? QQ_COLORS.slate200 }}>{team?.name ?? a.teamId}</span>
                  <span style={{ fontWeight: 900, fontSize: 13, color: i === 0 ? QQ_COLORS.green400 : QQ_COLORS.slate400, fontFamily: 'inherit' }}><QQEmojiIcon emoji="📍"/> {dist}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Hot Potato: Eure-Runde-Zusammenfassung beim Reveal */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (() => {
        const eliminated = s.hotPotatoEliminated.includes(myTeamId);
        return (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 16,
            background: eliminated ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${eliminated ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.35)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'tcreveal 0.35s ease 0.15s both',
          }}>
            <span style={{ fontSize: 20 }}>{eliminated ? <QQEmojiIcon emoji="🥔"/> : <QQEmojiIcon emoji="🏆"/>}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 900, color: eliminated ? '#f87171' : QQ_COLORS.green400 }}>
              {eliminated
                ? (lang === 'de' ? 'Ausgeschieden' : 'Eliminated')
                : (lang === 'de' ? 'Überlebt!' : 'Survived!')}
            </span>
          </div>
        );
      })()}

      {/* Imposter: Eure-Runde-Zusammenfassung beim Reveal */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'oneOfEight' && (() => {
        const eliminated = s.imposterEliminated.includes(myTeamId);
        return (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 16,
            background: eliminated ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${eliminated ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.35)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'tcreveal 0.35s ease 0.15s both',
          }}>
            <span style={{ fontSize: 20 }}>{eliminated ? <QQEmojiIcon emoji="🕵️"/> : '✓'}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 900, color: eliminated ? '#f87171' : QQ_COLORS.green400 }}>
              {eliminated
                ? (lang === 'de' ? 'Imposter erwischt — ausgeschieden' : 'Caught the imposter — eliminated')
                : (lang === 'de' ? 'Wahre Aussage gewählt' : 'Picked a true statement')}
            </span>
          </div>
        );
      })()}

      {/* Nobody got it right */}
      {solutionVisible && !s.correctTeamId && (
        <div style={{
          marginTop: 8, padding: '10px 14px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          fontSize: 14, fontWeight: 900, color: '#f87171',
          animation: 'tcreveal 0.4s ease 0.2s both',
        }}>
          {s.answers.length === 0
            ? (lang === 'de' ? '⏱ Keine Antworten eingegangen' : '⏱ No answers received')
            : (lang === 'de' ? '❌ Keiner hatte Recht' : '❌ Nobody got it right')}
        </div>
      )}

      {/* Result-Message — bei Falsch eine Trost-Message (kein Shaming). */}
      {solutionVisible && !iWon && iSubmitted && (() => {
        const winners = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
        const myWinPosition = winners.indexOf(myTeamId);
        // 2026-05-05 (Wolf-Bug 'doppelt gemoppelt'): Auch-richtig-Box entfernt.
        if (myWinPosition > 0) return null;
        // Falsch — B10 (2026-04-29): 2-zeilige Trost-Mitteilung.
        // 2026-05-03 (Wolf-Bug): bei SCHAETZCHEN gibt's kein objektiv 'falsch'.
        const isSchaetz = q.category === 'SCHAETZCHEN';
        const msgs = lang === 'de'
          ? ['Nächstes Mal schafft ihr es!', 'Knapp daneben — bleibt dran!', 'Fast erwischt — weiter so!', 'Nicht aufgeben — der nächste Punkt wartet!', 'Schade — aber gleich kommt eure Chance!']
          : ["You'll get it next time!", 'So close — stay in it!', 'Almost there — keep going!', "Don't give up — your point is waiting!", 'Tough one — your chance is coming!'];
        const pick = msgs[Math.abs(hashString(q.id)) % msgs.length];
        const headline = isSchaetz
          ? (lang === 'de' ? '🤏 Knapp daneben' : '🤏 Not quite in range')
          : (lang === 'de' ? '😕 Leider falsch' : '😕 Sadly wrong');
        return (
          <div style={{
            marginTop: 8, padding: '12px 16px', borderRadius: 16, textAlign: 'center',
            background: 'rgba(148,163,184,0.10)',
            border: '1px dashed rgba(148,163,184,0.35)',
            animation: 'tcTrostIn 0.5s ease 0.45s both',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: QQ_COLORS.red300 }}>
              {headline}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: QQ_COLORS.slate300 }}>
              <QQEmojiIcon emoji="✨"/> {pick}
            </div>
          </div>
        );
      })()}
    </CozyCard>
    </div>
  );
}
