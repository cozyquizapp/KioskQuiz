/**
 * CozyQuizTeamOverlays — Modals, Dialogs, Toasts und dekorative Overlays
 * fuer die Team-Phone-View.
 *
 * Components:
 * - HelpModal — Quick-Rules-Dialog mit 5 Icon-Karten
 * - LeaveQuizConfirm — destructive-Confirm fuer Quiz-Verlassen
 * - ReactionPad — 6-Emoji-Tap-Bar (mit Backend rate-limit, lokaler 250ms-Cooldown)
 * - MobileEurovisionHearts — 5 dekorative Hearts-Overlays fuer Eurovision-Theme
 * - AckErrorToast — Pink-Toast oben fuer Server-Ack-Errors (lauscht auf
 *   qq-team-ack-error window-Events von qqTeamAckBus)
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 1.4).
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { haptic } from '../utils/haptics';
import { ACK_ERROR_EVENT, type AckErrorEventDetail } from '../utils/qqTeamAckBus';

// ─────────────────────────────────────────────────────────────────────────
// HelpModal — Quick-Rules-Dialog mit 5 Icon-Karten.
// ─────────────────────────────────────────────────────────────────────────
export function HelpModal({ lang, onClose, largeMode }: { lang: 'de' | 'en'; onClose: () => void; largeMode?: boolean }) {
  // 2026-07-03 (Wolf-Audit): Cozy Arena hat kein Brett/Joker/Klauen/Stapeln →
  // eigener Regel-Satz (Fraktions-Punkte, Tempo), sonst der klassische Grid-Satz.
  const arenaItems = lang === 'de' ? [
    { icon: '🎯', title: 'Spielziel', body: 'Sammelt als Fraktion die meisten Punkte — je mehr Handys richtig und je schneller, desto mehr.' },
    { icon: '🌶️', title: 'Kategorien', body: 'Schätzchen · MUCHO · Bunte Tüte · 10 von 10 · Cheese — jede mit eigener Frage-Mechanik.' },
    { icon: '⚡', title: 'Tempo zählt', body: 'Schnelle richtige Antworten bringen eurer Fraktion mehr Punkte.' },
    { icon: '🏆', title: 'Sieger', body: 'Die Fraktion mit den meisten Punkten am Ende gewinnt.' },
  ] : [
    { icon: '🎯', title: 'Goal', body: 'Score the most points as a faction — more phones correct and faster means more points.' },
    { icon: '🌶️', title: 'Categories', body: 'Close Call · Mu-Cho · Lucky Bag · All In · Picture This — each with its own question mechanic.' },
    { icon: '⚡', title: 'Speed matters', body: 'Fast correct answers earn your faction more points.' },
    { icon: '🏆', title: 'Winner', body: 'The faction with the most points at the end wins.' },
  ];
  const gridItems = lang === 'de' ? [
    { icon: '🎯', title: 'Spielziel', body: 'Beantworte Fragen richtig — pro richtige Antwort darfst du eine Zelle auf dem Brett setzen.' },
    { icon: '🌶️', title: 'Kategorien', body: 'Schätzchen · MUCHO · Bunte Tüte · 10 von 10 · Cheese — jede mit eigener Frage-Mechanik.' },
    { icon: '⭐', title: 'Joker', body: '2 Joker pro Spiel. Verdienst du, wenn du eine bestimmte Reihe-Form auf dem Brett bildest. Setzt eine Bonus-Zelle.' },
    { icon: '🔄', title: 'Stehlen + Stapeln', body: 'Felder eines Gegners können geklaut werden. Stapel-Felder (★) zählen doppelt im Endscore und sind unklaubar.' },
    { icon: '🏆', title: 'Sieger', body: 'Wer am Ende die meisten Felder + Stapel-Bonusse hat, gewinnt.' },
  ] : [
    { icon: '🎯', title: 'Goal', body: 'Answer questions correctly — each correct answer lets you place a cell on the board.' },
    // 2026-05-10 (Wolf-Audit Klasse 2): EN-Card hatte DE-Kategorienamen drin.
    // Jetzt EN-Brand-Namen aus QQ_CATEGORY_LABELS — bleiben hardcoded da Help-Text statisch.
    { icon: '🌶️', title: 'Categories', body: 'Close Call · Mu-Cho · Lucky Bag · All In · Picture This — each with its own question mechanic.' },
    { icon: '⭐', title: 'Jokers', body: '2 jokers per game. Earned by forming a specific row pattern on the board. Places a bonus cell.' },
    { icon: '🔄', title: 'Steal + Stack', body: 'Opponent cells can be stolen. Stacked cells (★) count double at end-score and are un-stealable.' },
    { icon: '🏆', title: 'Winner', body: 'Most cells + stack bonuses at the end wins.' },
  ];
  const items = largeMode ? arenaItems : gridItems;
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1100,
          animation: 'tcMenuBackdrop 0.2s ease both',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1101,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px',
        pointerEvents: 'none',
      }}>
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width: '100%', maxWidth: 420,
            padding: '22px 20px',
            borderRadius: 24,
            background: 'rgba(31, 26, 46, 0.94)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(236,72,153,0.32)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
            pointerEvents: 'auto',
            animation: 'tcoptIn 0.28s cubic-bezier(0.32,1.4,0.5,1) both',
            maxHeight: '85vh', overflowY: 'auto',
          }}
        >
          <div style={{
            fontSize: 12, fontWeight: 900, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            marginBottom: 14,
          }}>
            {lang === 'de' ? 'Kurz-Regeln' : 'Quick rules'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((it, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: 22, lineHeight: 1.1, flexShrink: 0 }}>{it.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#F1F5F9', marginBottom: 3 }}>{it.title}</div>
                  <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.45 }}>{it.body}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '100%', marginTop: 16,
              padding: '14px', borderRadius: 14,
              border: '1px solid rgba(236,72,153,0.4)',
              background: 'rgba(236,72,153,0.12)',
              color: '#F9A8D4', fontFamily: 'inherit', fontWeight: 900, fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {lang === 'de' ? 'Verstanden' : 'Got it'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LeaveQuizConfirm — kleine Confirm-Card oben in der Mitte.
// ─────────────────────────────────────────────────────────────────────────
export function LeaveQuizConfirm({
  lang, onCancel, onConfirm,
}: {
  lang: 'de' | 'en';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div
        onClick={onCancel}
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1100,
          animation: 'tcMenuBackdrop 0.2s ease both',
        }}
      />
      {/* Flex-Wrapper fuer Viewport-Zentrierung (vermeidet transform-Conflict
          mit der tcoptIn-Animation, die selbst translateY/scale anwendet). */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1101,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px',
        pointerEvents: 'none',
      }}>
      <div
        role="alertdialog"
        aria-modal="true"
        style={{
          width: '100%', maxWidth: 380,
          padding: '24px 22px',
          borderRadius: 24,
          background: 'rgba(31, 26, 46, 0.92)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(239,68,68,0.35)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
          pointerEvents: 'auto',
          animation: 'tcoptIn 0.28s cubic-bezier(0.32,1.4,0.5,1) both',
        }}
      >
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🚪</div>
        <div style={{
          fontSize: 19, fontWeight: 900, textAlign: 'center', color: '#F1F5F9',
          marginBottom: 8, letterSpacing: '-0.01em',
        }}>
          {lang === 'de' ? 'Quiz wirklich verlassen?' : 'Really leave the quiz?'}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600, textAlign: 'center', color: '#94A3B8',
          marginBottom: 22, lineHeight: 1.4,
        }}>
          {lang === 'de'
            ? 'Dein Team wird abgemeldet. Du kannst danach mit einem neuen Setup wieder beitreten.'
            : 'Your team will be logged out. You can rejoin with a fresh setup afterwards.'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '14px', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              color: '#E2E8F0', fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {lang === 'de' ? 'Abbrechen' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '14px', borderRadius: 14,
              border: '1px solid rgba(239,68,68,0.55)',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.85), rgba(185,28,28,0.85))',
              color: '#FEF2F2', fontFamily: 'inherit', fontWeight: 900, fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
            }}
          >
            {lang === 'de' ? 'Verlassen' : 'Leave'}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ReactionPad — 6 Emojis tap-bar, fliegen am Beamer als Mini-Bursts.
// Phone bekommt visuelles Feedback (Tap-Pop), Backend rate-limit
// (4 pro 5s pro Team) verhindert Spam. Cooldown lokal in setBlockedUntil
// gegen versehentliche Doppel-Taps.
// ─────────────────────────────────────────────────────────────────────────
const REACTION_EMOJIS = ['👏', '🔥', '😱', '😢', '🎉', '😂'] as const;

export function ReactionPad({
  emit, roomCode, myTeamId, accent, lang,
}: {
  emit: any; roomCode: string; myTeamId: string;
  accent: string; lang: 'de' | 'en';
}) {
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number>(0);

  function tap(emoji: string, i: number) {
    const now = Date.now();
    if (now < blockedUntil) return;
    setTappedIdx(i);
    setTimeout(() => setTappedIdx(null), 320);
    if (navigator.vibrate) navigator.vibrate(15);
    emit('qq:reaction', { roomCode, teamId: myTeamId, emoji });
    // Lokaler 250ms-Cooldown (Backend hat eigenes 5s-Window)
    setBlockedUntil(now + 250);
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      marginTop: 8, padding: '10px 12px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent}22`,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: '#94a3b8',
        letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75,
      }}>
        {lang === 'de' ? 'Reaktion senden' : 'Send a reaction'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {REACTION_EMOJIS.map((e, i) => (
          <button
            key={e}
            onClick={() => tap(e, i)}
            style={{
              width: 48, height: 48, borderRadius: 16,
              background: tappedIdx === i ? `${accent}33` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${tappedIdx === i ? accent : 'rgba(255,255,255,0.10)'}`,
              fontSize: 26, lineHeight: 1, cursor: 'pointer',
              transition: 'all 0.18s',
              transform: tappedIdx === i ? 'scale(1.18)' : 'scale(1)',
            }}
            aria-label={`React ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MobileEurovisionHearts — 5 dekorative Hearts hinter dem Content fuer das
// Eurovision-Theme. Mobile-tuned (kleiner, weniger Hearts, zIndex 0).
// 2026-05-07 (Wolf 'hearts auf /team waeren geil im eurovision').
// ─────────────────────────────────────────────────────────────────────────
const MOBILE_ESC_HEARTS = [
  { x: 8,  y: 14, size: 36, dur: 11, del: 0,   dx:  10, dy: -18, pulseDur: 2.6, pulseDel: 0   },
  { x: 86, y: 22, size: 30, dur: 13, del: 1.5, dx: -12, dy: -22, pulseDur: 2.9, pulseDel: 0.4 },
  { x: 12, y: 70, size: 40, dur: 12, del: 0.8, dx:  14, dy: -16, pulseDur: 3.1, pulseDel: 0.8 },
  { x: 88, y: 60, size: 32, dur: 10, del: 2.2, dx:  -8, dy: -20, pulseDur: 2.5, pulseDel: 0.2 },
  { x: 50, y: 90, size: 26, dur: 14, del: 3.0, dx:   8, dy: -24, pulseDur: 3.0, pulseDel: 1.1 },
] as const;

export function MobileEurovisionHearts() {
  return (
    <>
      <style>{`
        @keyframes qqEscPhoneHeartFloat {
          0%,100% { transform: translate(0,0) rotate(-3deg); }
          50%     { transform: translate(var(--escPhoneHdx,10px), var(--escPhoneHdy,-18px)) rotate(3deg); }
        }
        @keyframes qqEscPhoneHeartPulse {
          0%,100% { opacity: 0.18; }
          50%     { opacity: 0.38; }
        }
      `}</style>
      {MOBILE_ESC_HEARTS.map((h, i) => (
        <div key={i} aria-hidden style={{
          position: 'fixed',
          left: `${h.x}%`, top: `${h.y}%`,
          width: h.size, height: h.size,
          pointerEvents: 'none', zIndex: 0,
          ['--escPhoneHdx' as any]: `${h.dx}px`,
          ['--escPhoneHdy' as any]: `${h.dy}px`,
          animation: `qqEscPhoneHeartFloat ${h.dur}s ease-in-out ${h.del}s infinite`,
          willChange: 'transform',
        } as CSSProperties}>
          <img
            src="/themes/eurovision-heart-opt.png"
            alt=""
            draggable={false}
            style={{
              width: '100%', height: '100%', display: 'block',
              filter: 'drop-shadow(0 0 8px rgba(255,45,123,0.55)) drop-shadow(0 0 3px rgba(255,255,255,0.2))',
              animation: `qqEscPhoneHeartPulse ${h.pulseDur}s ease-in-out ${h.pulseDel}s infinite`,
              willChange: 'opacity',
            }}
          />
        </div>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AckErrorToast — zentrale Toast-Komponente die auf qq-team-ack-error-window-
// Events lauscht und 3 Sek lang einen Pink-Toast am oberen Rand zeigt.
// Triggered von safeEmit() (in QQTeamPage) bei !ack.ok via broadcastAckError.
// 2026-05-10 (Audit P0-1).
// ─────────────────────────────────────────────────────────────────────────
export function AckErrorToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const dismissRef = useRef<number | null>(null);
  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<AckErrorEventDetail>).detail;
      if (!detail?.message) return;
      setMsg(detail.message);
      if (dismissRef.current) window.clearTimeout(dismissRef.current);
      dismissRef.current = window.setTimeout(() => setMsg(null), 3200);
      try { haptic('wrong'); } catch {}
    }
    window.addEventListener(ACK_ERROR_EVENT, onEvt);
    return () => {
      window.removeEventListener(ACK_ERROR_EVENT, onEvt);
      if (dismissRef.current) window.clearTimeout(dismissRef.current);
    };
  }, []);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 'env(safe-area-inset-top, 0px)',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: 12,
      zIndex: 2000,
      padding: '12px 18px',
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(162,18,71,0.95))',
      color: '#fff',
      fontSize: 14, fontWeight: 800,
      fontFamily: 'inherit',
      boxShadow: '0 12px 32px rgba(0,0,0,0.45), 0 0 24px rgba(236,72,153,0.5)',
      border: '1.5px solid rgba(255,255,255,0.22)',
      maxWidth: 'calc(100vw - 32px)',
      textAlign: 'center',
      animation: 'tcAckToastIn 0.25s ease both',
      pointerEvents: 'none',
    }}>
      {msg}
    </div>
  );
}
