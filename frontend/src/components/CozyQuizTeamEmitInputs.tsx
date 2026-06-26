/**
 * CozyQuizTeamEmitInputs — emit-basierte Inputs pro Question-Type.
 *
 * Im Gegensatz zu CozyQuizTeamQuestionInputs nehmen diese Components nicht
 * nur einen `onSubmit`-Callback, sondern haben direkten Socket-Zugriff via
 * `emit` + `roomCode` + `myTeamId` + `state` — weil sie mehrstufige Server-
 * Interaktionen handhaben (HotPotato-Turns, Bluff write/review/vote/reveal,
 * OnlyConnect Lock-States, Imposter Round-Robin, PinIt Coordinates).
 *
 * Components:
 * - HotPotatoInput — Team-Text mit Server-Deadline + Lock + Slot-Wait
 * - BluffInput — 4-Phasen-State-Machine (write/review/vote/reveal)
 * - OnlyConnectInput — 4-Hints + 1 Guess pro Team mit Lock-Recovery
 * - ImposterInput — Round-Robin Drum-Wheel mit Touch-Swipe
 * - MapClickHandler + PinItInput — Leaflet-Map + Custom-Pin
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 2.2).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { QQStateUpdate, QQTeam } from '../../../shared/quarterQuizTypes';
import { useExpiry } from '../hooks/useExpiry';
import { safeEmit } from '../utils/qqTeamAckBus';
import { StandardInput, SubmitBtn } from './CozyQuizTeamInputs';
import { AnimatedDots } from './CozyQuizTeamPrimitives';
import { QQEmojiIcon } from './QQIcon';
import { isCountryFlagGlyph, getCountryFlagUrl } from './QQTeamAvatar';
import { QQ_COLORS } from '../../../shared/qqColors';

// ── Hot Potato team input with countdown ──────────────────────────────────────
export function HotPotatoInput({ state: s, myTeamId, emit, roomCode, catColor, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang?: 'de' | 'en';
}) {
  const isMyTurn = s.hotPotatoActiveTeamId === myTeamId;
  const eliminated = s.hotPotatoEliminated.includes(myTeamId);
  // B1 (2026-04-29): Im 'no strikes'-Modell (Commit c4d0404e) bleibt das Team
  // nach falschem/duplikaten Submit aktiv und darf weiter tippen — Backend
  // setzt nur lastAnswer als Feedback. Wir zeigen das als Hinweis-Chip ueber
  // dem Input statt SubmittedBadge, sonst sperrt sich der Spieler selbst aus.
  // Bei Treffer rotiert das Backend via qqHotPotatoNext und cleart lastAnswer
  // (isMyTurn wird false -> Komponente blendet sich raus).
  const lastAttempt = isMyTurn ? (s.hotPotatoLastAnswer || '') : '';
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Countdown timer synced to server deadline
  useEffect(() => {
    if (!s.hotPotatoTurnEndsAt) { setSecondsLeft(null); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((s.hotPotatoTurnEndsAt! - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [s.hotPotatoTurnEndsAt]);

  // Auto-focus when it becomes your turn.
  // preventScroll: true verhindert, dass Mobile-Browser den Header weg-scrollen.
  useEffect(() => {
    if (isMyTurn) {
      setVal('');
      setTimeout(() => ref.current?.focus({ preventScroll: true }), 120);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [isMyTurn]);

  // B7: Auto-Submit beim HotPotato-Turn-Ende — sonst geht eingetippte Antwort
  // verloren (Backend eliminiert das Team bei Timer-Ablauf). Fire 250ms vor
  // Deadline, damit der Submit ankommt bevor der Eliminate-Callback feuert.
  const expired = useExpiry(isMyTurn ? (s.hotPotatoTurnEndsAt ?? null) : null);
  const valRef = useRef(val); valRef.current = val;
  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [s.hotPotatoActiveTeamId, s.hotPotatoTurnEndsAt]);
  useEffect(() => {
    if (expired && isMyTurn && !firedRef.current) {
      firedRef.current = true;
      const text = valRef.current.trim();
      if (text.length >= 1) {
        // 2026-05-11 (Audit P0): Submit-Vibe Burst [30,40,80] — Pub-tauglich.
        if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
        safeEmit(emit, 'qq:hotPotatoAnswer', { roomCode, teamId: myTeamId, answer: text });
        setVal('');
      }
    }
  }, [expired, isMyTurn, emit, roomCode, myTeamId]);

  if (eliminated) return null;
  if (!isMyTurn) return null;

  // 2026-05-06 (Wolf-Wunsch 'Slot-Machine vor erstem HP-Zug'): Solange der
  // Slot dreht, ist zwar isMyTurn=true, aber Antwortfeld wird ausgeblendet.
  if ((s as any).hotPotatoSlotState === 'rolling') {
    return (
      <div style={{
        marginTop: 4, padding: '14px 16px', borderRadius: 12,
        background: 'rgba(236,72,153,0.10)',
        border: `1.5px dashed ${catColor}`,
        textAlign: 'center', color: QQ_COLORS.brandPinkSoft, fontSize: 14, fontWeight: 800,
        animation: 'tcpulse 1.5s ease-in-out infinite',
      }}>
        🎰 {lang === 'de' ? 'Slot dreht — gleich geht es los!' : 'Slot is spinning — get ready!'}
      </div>
    );
  }

  async function submit() {
    if (!val.trim() || expired) return;
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    await safeEmit(emit, 'qq:hotPotatoAnswer', { roomCode, teamId: myTeamId, answer: val.trim() });
    setVal('');
    setTimeout(() => ref.current?.focus({ preventScroll: true }), 60);
  }

  const urgency = secondsLeft !== null && secondsLeft <= 5;
  const enterAnswerPlaceholder = lang === 'de' ? 'Antwort eingeben…' : 'Enter answer…';

  return (
    <div style={{ marginTop: 4 }}>
      {/* Countdown bar */}
      {secondsLeft !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 8, padding: '6px 12px', borderRadius: 8,
          background: urgency ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${urgency ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
          transition: 'all 0.3s',
        }}>
          <span style={{
            fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
            color: urgency ? '#f87171' : QQ_COLORS.slate400,
            animation: urgency ? 'tcpulse 0.6s ease-in-out infinite' : 'none',
          }}>
            {secondsLeft}s
          </span>
        </div>
      )}
      {/* B1: Letzte nicht akzeptierte Antwort als Hinweis-Chip — Team darf
          weiter tippen (continuous typing seit c4d0404e). */}
      {lastAttempt && (
        <div style={{
          marginBottom: 8, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)',
          fontSize: 13, fontWeight: 700, color: QQ_COLORS.red300, textAlign: 'center',
          animation: 'tcpulse 0.4s ease-out',
        }}>
          {lang === 'de' ? `Nicht akzeptiert: „${lastAttempt}" — versuch's nochmal!` : `Not accepted: "${lastAttempt}" — try again!`}
        </div>
      )}
      <StandardInput
        ref={ref}
        value={val}
        onChange={setVal}
        onEnter={() => val.trim() && submit()}
        catColor={catColor}
        placeholder={enterAnswerPlaceholder}
        ariaLabel={lang === 'de' ? 'Antwort eingeben' : 'Enter your answer'}
        disabled={expired}
        urgency={urgency}
      />
      <SubmitBtn onSubmit={submit} canSubmit={!expired && !!val.trim()} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Bluff: 3-Phasen-Team-Input (write/review/vote/reveal) ─────────────────────
export function BluffInput({ state: s, myTeamId, emit, roomCode, catColor, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang: 'de' | 'en';
}) {
  const phase = s.bluffPhase;
  const myBluff = (s.bluffSubmissions ?? {})[myTeamId] ?? '';
  const myVote = (s.bluffVotes ?? {})[myTeamId];
  const myPoints = (s.bluffPoints ?? {})[myTeamId];
  const [val, setVal] = useState(myBluff);
  const [submitted, setSubmitted] = useState(!!myBluff);

  // Sync state from server (e.g. when other teams join)
  useEffect(() => {
    if (myBluff && !submitted) {
      setSubmitted(true);
      setVal(myBluff);
    }
  }, [myBluff, submitted]);

  // B7: Auto-Submit beim Ablauf der Write-Phase (falls Text vorhanden).
  const writeExpired = useExpiry(phase === 'write' ? (s.bluffWriteEndsAt ?? null) : null);
  const valRef = useRef(val); valRef.current = val;
  const submittedRef = useRef(submitted); submittedRef.current = submitted;
  const firedRef = useRef(false);
  useEffect(() => {
    if (writeExpired && !firedRef.current && !submittedRef.current) {
      firedRef.current = true;
      const text = valRef.current.trim();
      if (text.length >= 1) {
        safeEmit(emit, 'qq:bluffSubmit', { roomCode, teamId: myTeamId, text });
        setSubmitted(true);
      }
    }
  }, [writeExpired, emit, roomCode, myTeamId]);

  const submit = () => {
    if (submitted || writeExpired) return;
    const text = val.trim();
    if (text.length < 1) return;
    safeEmit(emit, 'qq:bluffSubmit', { roomCode, teamId: myTeamId, text });
    setSubmitted(true);
  };

  const vote = (optId: string) => {
    if (myVote) return;
    safeEmit(emit, 'qq:bluffVote', { roomCode, teamId: myTeamId, optionId: optId });
  };

  // ── Write Phase ─────────────────────────────────────────────────────────
  if (phase === 'write' || !phase) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 16,
          background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)',
          fontSize: 13, color: QQ_COLORS.brandPinkSoft, fontWeight: 700, lineHeight: 1.4,
        }}>
          {lang === 'de'
            ? '🎭 Erfindet eine plausibel klingende Falsch-Antwort. Andere Teams werden dafür stimmen — wer reinfällt, bringt euch Punkte!'
            : '🎭 Make up a plausible-sounding wrong answer. Other teams will vote — fooling them earns you points!'}
        </div>
        <StandardInput
          value={val}
          onChange={setVal}
          onEnter={submit}
          catColor={catColor}
          placeholder={lang === 'de' ? 'Erfundene Antwort…' : 'Your made-up answer…'}
          disabled={submitted || writeExpired}
          maxLength={200}
          submitted={submitted}
        />
        <SubmitBtn
          onSubmit={submit}
          canSubmit={!writeExpired && val.trim().length >= 1}
          submitted={submitted}
          catColor={catColor}
          label={lang === 'de' ? '✓ Bluff abgeben' : '✓ Submit bluff'}
          submittedLabel={lang === 'de' ? 'Eingereicht — andere warten' : 'Submitted — waiting on others'}
          lang={lang}
        />
        {submitted && (
          <div style={{ fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center', fontWeight: 700, lineHeight: 1.4 }}>
            {lang === 'de' ? 'Sobald alle eingereicht haben, geht\'s zum Voting.' : 'Once everyone\'s in, voting starts.'}
          </div>
        )}
      </div>
    );
  }

  // ── Review Phase ────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 16,
        background: 'rgba(244,114,182,0.10)', border: '1px solid rgba(244,114,182,0.3)',
        textAlign: 'center', fontSize: 14, color: QQ_COLORS.brandPinkSoft, fontWeight: 700,
      }}>
        {lang === 'de' ? '👮 Moderator prüft die Bluffs… gleich geht\'s weiter.' : '👮 Moderator reviewing bluffs… one moment.'}
      </div>
    );
  }

  // ── Vote Phase ──────────────────────────────────────────────────────────
  if (phase === 'vote') {
    // Per-Team Subset: jedes Team sieht real + 3 zufaellige andere Bluffs.
    // Fallback auf globalen Pool falls Subset noch nicht da ist (race).
    const opts = (s.bluffOptionsByTeam ?? {})[myTeamId] ?? s.bluffOptions ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 16,
          background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)',
          fontSize: 13, color: QQ_COLORS.brandPinkSoft, fontWeight: 700, lineHeight: 1.4,
        }}>
          {lang === 'de'
            ? `🗳 Welche Antwort ist die ECHTE? (${myVote ? '✓ Gewählt' : 'Bitte wählen'})`
            : `🗳 Which answer is REAL? (${myVote ? '✓ Voted' : 'Pick one'})`}
        </div>
        {opts.map((opt, i) => {
          const isOwn = opt.source === 'team' && opt.contributors.includes(myTeamId);
          const chosen = myVote === opt.id;
          const disabled = isOwn || !!myVote;
          return (
            <button
              key={opt.id}
              onClick={() => !disabled && vote(opt.id)}
              disabled={disabled}
              style={{
                padding: '14px 16px', borderRadius: 16, border: 'none',
                textAlign: 'left',
                background: chosen ? `${catColor}30`
                  : isOwn ? 'rgba(255,255,255,0.02)'
                  : 'rgba(255,255,255,0.05)',
                border_: undefined,
                outline: chosen ? `2px solid ${catColor}` : `1px solid ${isOwn ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)'}`,
                color: isOwn ? QQ_COLORS.slate600 : QQ_COLORS.slate100,
                fontFamily: 'inherit', fontSize: 16, fontWeight: 900,
                cursor: disabled ? 'default' : 'pointer',
                opacity: isOwn ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.18s',
                animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.07}s both`,
              } as any}
            >
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: chosen ? catColor : 'rgba(255,255,255,0.08)',
                color: chosen ? '#fff' : QQ_COLORS.slate400,
                fontSize: 13, fontWeight: 900,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <span style={{ flex: 1, wordBreak: 'break-word' }}>{opt.text}</span>
              {isOwn && (
                <span style={{ fontSize: 10, color: QQ_COLORS.slate600, fontWeight: 900 }}>
                  {lang === 'de' ? 'dein Bluff' : 'your bluff'}
                </span>
              )}
            </button>
          );
        })}
        {myVote && (
          <div style={{ fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center', fontWeight: 700 }}>
            {lang === 'de' ? 'Stimme abgegeben — wartet auf den Rest.' : 'Voted — waiting on others.'}
          </div>
        )}
      </div>
    );
  }

  // ── Reveal Phase ────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const total = myPoints?.total ?? 0;
    const breakdown: string[] = [];
    if ((myPoints?.foundReal ?? 0) > 0) breakdown.push(lang === 'de' ? `+${myPoints!.foundReal} Echt erkannt` : `+${myPoints!.foundReal} found real`);
    if ((myPoints?.blufferBonus ?? 0) > 0) breakdown.push(lang === 'de' ? `+${myPoints!.blufferBonus} Reingefallen` : `+${myPoints!.blufferBonus} fooled others`);
    if ((myPoints?.truthAccident ?? 0) > 0) breakdown.push(lang === 'de' ? `+${myPoints!.truthAccident} Zufall die Wahrheit getippt!` : `+${myPoints!.truthAccident} accidental truth!`);
    return (
      <div style={{
        padding: '16px 18px', borderRadius: 16,
        background: total > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
        border: total > 0 ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(255,255,255,0.10)',
        display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, color: QQ_COLORS.slate400, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {lang === 'de' ? 'Eure Teilpunkte' : 'Your points'}
        </div>
        <div style={{
          fontSize: 32, fontWeight: 900,
          color: total > 0 ? QQ_COLORS.green300 : QQ_COLORS.slate400,
        }}>{total}</div>
        {breakdown.length > 0 && (
          <div style={{ fontSize: 12, color: QQ_COLORS.slate300, lineHeight: 1.5 }}>
            {breakdown.join(' · ')}
          </div>
        )}
        <div style={{ fontSize: 11, color: QQ_COLORS.slate500, marginTop: 4 }}>
          {lang === 'de' ? 'Schau auf den Beamer — Auflösung läuft.' : 'Check the beamer — reveal in progress.'}
        </div>
      </div>
    );
  }

  return null;
}

// 2026-05-09 v2 (Wolf-Reform): Connect 4 vereinfacht.
// - Alle 4 Hints sofort sichtbar (kein progressives Freischalten mehr).
// - 1 Tipp pro Team. Richtig → Aktion. Falsch → gelockt.
// - Reihenfolge der Aktionen nach Speed (submittedAt) wie sonst auch.
export function OnlyConnectInput({ state: s, myTeamId, emit, roomCode, catColor, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang: 'de' | 'en';
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../shared/quarterQuizTypes').QQBunteTueteOnlyConnect;
  const hintsAll = (lang === 'en' && bt.hintsEn?.length === 4 ? bt.hintsEn : bt.hints) ?? [];
  const isLocked = (s.onlyConnectLockedTeams ?? []).includes(myTeamId);
  const isMyWin = (s.onlyConnectGuesses ?? []).some(g => g.teamId === myTeamId && g.correct);
  const alreadyAnswered = isMyWin || isLocked;
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!alreadyAnswered) ref.current?.focus({ preventScroll: true }); }, [alreadyAnswered]);

  const expired = useExpiry(s.timerEndsAt ?? null);
  const valRef = useRef(val); valRef.current = val;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current && !alreadyAnswered) {
      firedRef.current = true;
      const text = valRef.current.trim();
      if (text.length >= 1) {
        safeEmit(emit, 'qq:onlyConnectGuess', { roomCode, teamId: myTeamId, text });
        setVal('');
      }
    }
  }, [expired, alreadyAnswered, emit, roomCode, myTeamId]);

  const submit = () => {
    if (alreadyAnswered || expired) return;
    const text = val.trim();
    if (text.length < 1) return;
    safeEmit(emit, 'qq:onlyConnectGuess', { roomCode, teamId: myTeamId, text });
    setVal('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!alreadyAnswered && (
        <div style={{
          fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center', fontWeight: 700,
          lineHeight: 1.4, padding: '0 4px',
        }}>
          {lang === 'de'
            ? 'Was verbindet diese 4 Begriffe? 1 Tipp pro Team.'
            : 'What connects these 4 terms? 1 guess per team.'}
        </div>
      )}

      {/* 4 Hint-Slots — ALLE sofort sichtbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[0, 1, 2, 3].map(i => {
          const hintColor = i === 0 ? QQ_COLORS.brandPink : i === 1 ? QQ_COLORS.green500 : i === 2 ? QQ_COLORS.blue400 : QQ_COLORS.violet400;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 10,
              background: `${hintColor}18`,
              border: `1px solid ${hintColor}55`,
              fontFamily: 'inherit', textAlign: 'left',
              width: '100%', minHeight: 44,
              animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.06}s both`,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 900,
                color: hintColor,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                width: 32, textAlign: 'center', flexShrink: 0,
              }}>{lang === 'de' ? `H${i+1}` : `C${i+1}`}</span>
              <span style={{
                fontSize: 16, fontWeight: 900, color: QQ_COLORS.slate100, flex: 1,
              }}>{hintsAll[i]}</span>
            </div>
          );
        })}
      </div>

      {isMyWin && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
          fontSize: 14, fontWeight: 900, color: QQ_COLORS.slate300,
        }}>
          {lang === 'de' ? '✓ Tipp eingegangen — wartest auf Auflösung' : '✓ Tip submitted — waiting for reveal'}
        </div>
      )}
      {isLocked && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
          fontSize: 13, fontWeight: 900, color: QQ_COLORS.slate400,
        }}>
          {lang === 'de' ? 'Tipp abgegeben — wartest auf Auflösung' : 'Tip submitted — waiting for reveal'}
        </div>
      )}

      {!alreadyAnswered && (
        <>
          <StandardInput
            ref={ref}
            value={val}
            onChange={setVal}
            onEnter={submit}
            catColor={catColor}
            placeholder={lang === 'de' ? 'Verbindung tippen…' : 'Your guess…'}
            disabled={expired}
          />
          <SubmitBtn
            onSubmit={submit}
            canSubmit={!expired && val.trim().length >= 1}
            submitted={false}
            catColor={catColor}
            label={lang === 'de' ? '✓ Tipp abgeben' : '✓ Submit guess'}
            lang={lang}
          />
          <div style={{ fontSize: 11, color: QQ_COLORS.slate500, textAlign: 'center', fontWeight: 700 }}>
            {lang === 'de' ? '1 Versuch — schnellste richtige Antwort gewinnt zuerst' : '1 try — fastest correct answer wins first'}
          </div>
        </>
      )}
    </div>
  );
}

// ── Imposter: Round-Robin (only active team picks) ────────────────────────────
export function ImposterInput({ question: q, catColor, state: s, myTeamId, emit, roomCode, lang }: {
  question: any; catColor: string; state: QQStateUpdate; myTeamId: string;
  emit: any; roomCode: string; lang: 'de' | 'en';
}) {
  const bt = q.bunteTuete;
  const stmts: string[] = (lang === 'en' && bt?.statementsEn?.some((st: string) => st) ? bt.statementsEn : bt?.statements) ?? [];
  // Filter out already-chosen correct statements
  const available = stmts
    .map((text: string, i: number) => ({ text, idx: i }))
    .filter(x => x.text && !s.imposterChosenIndices.includes(x.idx));

  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const touchStartY = useRef(0);

  const isMyTurn = s.imposterActiveTeamId === myTeamId;

  // Reset submitted whenever the active team changes (new turn)
  useEffect(() => {
    setSubmitted(false);
  }, [s.imposterActiveTeamId]);
  const isEliminated = s.imposterEliminated.includes(myTeamId);
  const activeTeam = s.teams.find(t => t.id === s.imposterActiveTeamId);

  const clamped = Math.max(0, Math.min(idx, available.length - 1));
  const current = available[clamped];
  const canUp = clamped > 0;
  const canDown = clamped < available.length - 1;
  const SLOT_H = 100;

  async function handleConfirm() {
    if (!current || submitted || !isMyTurn) return;
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    setSubmitted(true);
    await safeEmit(emit, 'qq:imposterChoose', { roomCode, teamId: myTeamId, statementIndex: current.idx });
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 30) setIdx(i => Math.min(i + 1, available.length - 1));
    if (delta < -30) setIdx(i => Math.max(i - 1, 0));
  };

  const waitingLabel = lang === 'de' ? '🕵️ Warten auf Start…' : '🕵️ Waiting for start…';
  const eliminatedLabel = lang === 'de' ? '❌ Falsche Aussage gewählt — du bist raus' : '❌ Wrong statement — you are out';
  const chosenLabel = lang === 'de' ? '✓ Gewählt — warte auf nächstes Team…' : '✓ Chosen — waiting for next team…';
  const allChosenLabel = lang === 'de' ? 'Alle Aussagen gewählt' : 'All statements chosen';
  const chooseLabel = lang === 'de' ? 'Wählen' : 'Choose';

  // Not yet started
  if (!s.imposterActiveTeamId && !isEliminated) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(255,255,255,0.04)', color: QQ_COLORS.slate500, fontSize: 14, fontWeight: 700 }}>
        {waitingLabel}
      </div>
    );
  }
  // Eliminated
  if (isEliminated) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 15, fontWeight: 900 }}>
        {eliminatedLabel}
      </div>
    );
  }
  // Waiting for other team
  if (!isMyTurn) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: QQ_COLORS.slate500, fontSize: 14, fontWeight: 700 }}>
        <QQEmojiIcon emoji="🕵️"/> {activeTeam?.name ?? '?'} {lang === 'en' ? 'is choosing' : 'wählt gerade'}<AnimatedDots />
        <div style={{ fontSize: 13, color: QQ_COLORS.slate500, marginTop: 4 }}>{available.length} {lang === 'en' ? `statement${available.length !== 1 ? 's' : ''} left` : `Aussage${available.length !== 1 ? 'n' : ''} übrig`}</div>
      </div>
    );
  }
  // Already submitted this turn
  if (submitted) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: QQ_COLORS.green400, fontSize: 15, fontWeight: 900 }}>
        {chosenLabel}
      </div>
    );
  }

  if (!available.length) return <div style={{ color: QQ_COLORS.slate500, fontSize: 14, textAlign: 'center', padding: 12 }}>{allChosenLabel}</div>;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: QQ_COLORS.slate500, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
        <QQEmojiIcon emoji="🕵️"/> {lang === 'en' ? 'Your turn — which is false?' : 'Du bist dran — welche ist falsch?'}
      </div>

      {/* Drum wheel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          borderRadius: 16, height: SLOT_H * 3, overflow: 'hidden', position: 'relative',
          background: 'rgba(10,15,35,0.97)', border: '1px solid rgba(148,163,184,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          userSelect: 'none', touchAction: 'none',
        }}
      >
        {/* Top slot (blurred) */}
        <div
          onClick={() => canUp && setIdx(i => i - 1)}
          style={{
            height: SLOT_H, padding: '0 40px 0 16px', display: '-webkit-box', alignItems: 'center',
            filter: 'blur(2px)', opacity: 0.3, cursor: canUp ? 'pointer' : 'default',
            fontSize: 14, color: QQ_COLORS.slate400, overflow: 'hidden',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          } as any}
        >
          {canUp ? available[clamped - 1]?.text : ''}
        </div>

        {/* Center slot (active) */}
        <div key={clamped} style={{
          height: SLOT_H, padding: '0 48px 0 16px', display: 'flex', alignItems: 'center',
          background: 'rgba(148,45,89,0.18)',
          borderTop: '1px solid rgba(148,45,89,0.5)',
          borderBottom: '1px solid rgba(148,45,89,0.5)',
          fontSize: 'clamp(14px,3.8vw,17px)', fontWeight: 900, color: '#ffe4f2',
          lineHeight: 1.35,
          animation: 'tcwheelslide 0.22s ease both',
        }}>
          {current?.text}
        </div>

        {/* Bottom slot (blurred) */}
        <div
          onClick={() => canDown && setIdx(i => i + 1)}
          style={{
            height: SLOT_H, padding: '0 40px 0 16px', display: 'flex', alignItems: 'center',
            filter: 'blur(2px)', opacity: 0.3, cursor: canDown ? 'pointer' : 'default',
            fontSize: 14, color: QQ_COLORS.slate400, overflow: 'hidden',
          }}
        >
          {canDown ? available[clamped + 1]?.text : ''}
        </div>

        {/* Arrow buttons */}
        {canUp && <div onClick={() => setIdx(i => i - 1)} style={{ position: 'absolute', top: 8, right: 12, color: QQ_COLORS.slate500, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>▲</div>}
        {canDown && <div onClick={() => setIdx(i => i + 1)} style={{ position: 'absolute', bottom: 8, right: 12, color: QQ_COLORS.slate500, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>▼</div>}
      </div>

      {/* Counter */}
      <div style={{ textAlign: 'center', fontSize: 13, color: QQ_COLORS.slate500, fontWeight: 700, marginTop: 6 }}>
        {clamped + 1} / {available.length}
      </div>

      <SubmitBtn onSubmit={handleConfirm} canSubmit={!!current && !submitted} submitted={submitted} catColor="#942d59" label={chooseLabel} lang={lang} />
    </div>
  );
}

// ── Pin It: simple coordinate input (Leaflet-Map + Custom-Pin) ────────────────
export function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export function PinItInput({ question: q, catColor, onSubmit, lang = 'de', timerEndsAt, myTeam }: { question: any; catColor: string; onSubmit: (v: string) => void; lang?: 'de' | 'en'; timerEndsAt?: number | null; myTeam?: QQTeam | null }) {
  const bt = q?.bunteTuete;
  // 2026-05-05 (Wolf 'Map zeigt aktuell das Zielgebiet vorgezoomt = Hinweis,
  // bitte neutrale Ansicht'): Default-Center jetzt mittig auf der Welt (0,0)
  // statt auf bt.lat/lng (= Loesungs-Position!). Zoom 2 = Welt-Uebersicht.
  // Falls die Frage explizit `bt.zoom` setzt, wird das honoriert (z.B. wenn
  // Mod absichtlich auf eine Region beschraenken will).
  const centerLat = 20;       // grob Mittel-Welt-Latitude
  const centerLng = 0;        // Greenwich
  const zoom = bt?.zoom ?? 2; // Welt-Level
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // 2026-05-07 (Wolf 'map+pin etwas haesslich'): Custom-Pin im Beamer-Stil.
  // 2026-05-13 (Wolf 'cozy guessr statt der pins ein DE in den kreis,
  // kannst du da auch die flaggen nehmen? der pin muss auch nichts zwangsweise
  // rund sein, kann auch flaggenform haben und dann unten die spitze (nadel)
  // wie bisher'): Bei Country-Flag-Emojis (Eurovision-Edition) rendern wir
  // den Body als Rechteck mit Twemoji-Flag-<img> statt nativem Glyph (Windows
  // Edge/Chrome zeigt 🇩🇪 sonst als "DE"-Text), und passen die Form an die
  // Flaggen-Proportionen 4:3 an. Bei Nicht-Flag-Emojis bleibt der Kreis.
  const teamColor = myTeam?.color ?? catColor;
  const teamEmoji = (myTeam as any)?.emoji ?? '📍';
  const isFlag = isCountryFlagGlyph(teamEmoji);
  const customPinIcon = useMemo(() => {
    if (isFlag) {
      // Flaggen-Pin: 44×33 Rechteck (4:3) + Nadel-Spitze drunter. Total 44×64.
      const flagUrl = getCountryFlagUrl(teamEmoji);
      return L.divIcon({
        className: 'qq-team-pin-mobile',
        html: `<div style="
          position: relative; width: 44px; height: 64px;
          animation: qqTeamPinDrop 0.5s cubic-bezier(0.34, 1.5, 0.64, 1) both;
          transform-origin: 50% 100%;
          filter: drop-shadow(0 5px 7px rgba(0,0,0,0.55));
        ">
          <div style="
            position: absolute; left: 50%; top: 32px;
            transform: translateX(-50%);
            width: 0; height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 32px solid #1A1A1A;
            z-index: 1;
          "></div>
          <div style="
            position: absolute; left: 0; top: 0;
            width: 44px; height: 33px; border-radius: 4px;
            background: ${teamColor};
            border: 2px solid #1A1A1A;
            box-shadow: 0 0 18px ${teamColor}66, inset 0 -3px 5px rgba(0,0,0,0.18), inset 0 2px 3px rgba(255,255,255,0.22);
            overflow: hidden;
            display: flex; align-items: center; justify-content: center;
            z-index: 2;
            box-sizing: border-box;
          "><img src="${flagUrl}" alt="" style="width: 36px; height: 27px; object-fit: cover; border-radius: 2px; display: block;" /></div>
        </div>`,
        iconSize: [44, 64] as any,
        iconAnchor: [22, 60] as any,
      });
    }
    // Normaler Emoji-Pin: Kreis mit Glyph (wie bisher).
    return L.divIcon({
      className: 'qq-team-pin-mobile',
      html: `<div style="
        position: relative; width: 48px; height: 64px;
        animation: qqTeamPinDrop 0.5s cubic-bezier(0.34, 1.5, 0.64, 1) both;
        transform-origin: 50% 100%;
        filter: drop-shadow(0 5px 7px rgba(0,0,0,0.55));
      ">
        <div style="
          position: absolute; left: 50%; top: 32px;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 32px solid #1A1A1A;
          z-index: 1;
        "></div>
        <div style="
          position: absolute; left: 4px; top: 0;
          width: 40px; height: 40px; border-radius: 50%;
          background: ${teamColor};
          border: 2px solid #1A1A1A;
          box-shadow: 0 0 18px ${teamColor}66, inset 0 -3px 5px rgba(0,0,0,0.18), inset 0 2px 3px rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          z-index: 2;
          font-size: 24px; line-height: 1;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
        ">${teamEmoji}</div>
      </div>`,
      iconSize: [48, 64] as any,
      iconAnchor: [24, 60] as any,
    });
  }, [teamColor, teamEmoji, isFlag]);

  // B7: Auto-Submit on Timer-End wenn Pin gesetzt; sonst nur Lock.
  const expired = useExpiry(timerEndsAt ?? null);
  const pinRef = useRef(pin); pinRef.current = pin;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      const p = pinRef.current;
      if (p && !submitted) {
        setSubmitted(true);
        onSubmit(`${p[0]},${p[1]}`);
      }
    }
  }, [expired, submitted, onSubmit]);

  function handleSubmit() {
    if (!pin || expired) return;
    setSubmitted(true);
    onSubmit(`${pin[0]},${pin[1]}`);
  }

  const tapLabel = lang === 'de' ? '📍 Tippe auf die Karte um einen Pin zu setzen' : '📍 Tap the map to place a pin';
  const noPinLabel = lang === 'de' ? 'Noch kein Pin gesetzt' : 'No pin placed yet';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div style={{ fontSize: 12, color: QQ_COLORS.slate500, textAlign: 'center', fontWeight: 700 }}>
        {tapLabel}
      </div>
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        border: `2px solid ${pin ? catColor : 'rgba(255,255,255,0.12)'}`,
        height: 'clamp(280px, 48vh, 480px)',
        position: 'relative',
        boxShadow: pin
          ? `0 0 22px ${catColor}33, inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.4)`
          : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.4)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          {/* 2026-05-07 (Wolf): CartoDB Voyager statt Default-OSM. */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" />
          <MapClickHandler onPick={(lat, lng) => { if (!expired) setPin([lat, lng]); }} />
          {pin && <Marker position={pin} icon={customPinIcon} />}
        </MapContainer>
      </div>
      {pin
        ? <div style={{ fontSize: 12, color: catColor, textAlign: 'center', fontWeight: 900 }}><QQEmojiIcon emoji="📍"/> {pin[0].toFixed(4)}, {pin[1].toFixed(4)}</div>
        : <div style={{ fontSize: 11, color: QQ_COLORS.slate600, textAlign: 'center' }}>{noPinLabel}</div>
      }
      <SubmitBtn onSubmit={handleSubmit} canSubmit={!expired && !!pin} submitted={submitted} catColor={catColor} />
    </div>
  );
}
