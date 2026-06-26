/**
 * CozyQuizTeamInputs — geteilte Input-Primitives fuer alle Question-Type-
 * Eingabefelder in der Team-Phone-View.
 *
 * Components:
 * - StandardInput — einheitliches Input-Styling (Border/BG/Glow je nach value/
 *   submitted/urgency). forwardRef fuer Auto-Focus von außen.
 * - SubmitBtn — sticky Submit-Button am Viewport-Bottom. Layout-stabil
 *   (Padding/Schrift fix, nur Border/Glow togglet bei canSubmit).
 * - SubmittedBadge — gruene Bestaetigungs-Card mit Antwort-Preview,
 *   Pending-Teams-Avatar-Row, optional Rank-Anzeige.
 *
 * Verwendet von AnswerInput / HotPotato / TextInput / Mucho / AllIn / Top5 /
 * Bluff / OnlyConnect / FixIt / PinIt / Imposter.
 *
 * CSS-Klassen `qq-team-input` + `qq-team-submit-btn` leben in main.css und
 * sind global gesetzt.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 1.3).
 */
import { forwardRef, useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon } from './QQIcon';

// ── Standard text input (shared) ──────────────────────────────────────────────
// Polish 2026-05-01: einheitliches Input-Styling fuer alle Phone-Eingabefelder
// (TextInput, HotPotato, Top5, Bluff write, OnlyConnect). Fixe Werte:
// padding 14×16, border 2px, radius 14, fontSize 18, fontWeight 700.
export type StandardInputProps = {
  value: string;
  onChange: (v: string) => void;
  catColor: string;
  placeholder?: string;
  disabled?: boolean;
  onEnter?: () => void;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search';
  pattern?: string;
  ariaLabel?: string;
  autoComplete?: string;
  maxLength?: number;
  submitted?: boolean;   // gruener Erfolgs-Tint (Bluff write)
  urgency?: boolean;     // roter Urgency-Tint wenn leer (HotPotato)
};
export const StandardInput = forwardRef<HTMLInputElement, StandardInputProps>(({
  value, onChange, catColor, placeholder, disabled, onEnter,
  type, inputMode, pattern, ariaLabel, autoComplete, maxLength,
  submitted, urgency,
}, ref) => {
  const borderColor = submitted
    ? '#22C55E'
    : value
      ? `${catColor}55`
      : urgency
        ? 'rgba(239,68,68,0.3)'
        : 'rgba(255,255,255,0.1)';
  const bg = submitted
    ? 'rgba(34,197,94,0.10)'
    : value
      ? `${catColor}10`
      : 'rgba(255,255,255,0.05)';
  return (
    <input
      ref={ref}
      className="qq-team-input"
      type={type ?? 'text'}
      inputMode={inputMode}
      pattern={pattern}
      value={value}
      disabled={disabled}
      onChange={e => { if (!disabled) onChange(e.target.value); }}
      onKeyDown={e => { if (!disabled && e.key === 'Enter' && onEnter) onEnter(); }}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      autoComplete={autoComplete ?? 'off'}
      maxLength={maxLength}
      style={{
        borderColor,
        background: bg,
        boxShadow: value && !submitted ? `0 0 0 3px ${catColor}22` : 'none',
        opacity: disabled && !submitted ? 0.6 : 1,
      } as CSSProperties}
    />
  );
});
StandardInput.displayName = 'StandardInput';

// ── Submit button (shared) ────────────────────────────────────────────────────
// 2026-05-12 (Audit P0 #11): Sticky-Submit. Bei langen Input-Layouts (Top5,
// Order, Bluff mit 4+ Optionen) konnte der Submit-Button unter den Fold
// rutschen → Spieler scrollten in den letzten Sekunden, knapp vor Auto-
// Submit. Jetzt: Button bleibt am unteren Viewport-Rand sichtbar.
export function SubmitBtn({ onSubmit, canSubmit, submitted, catColor, label, submittedLabel, lang = 'de' }: {
  onSubmit: () => void; canSubmit: boolean; submitted: boolean; catColor: string; label?: string; submittedLabel?: string; lang?: 'de' | 'en';
}) {
  const defaultLabel = lang === 'de' ? 'Jetzt antworten!' : 'Answer now!';
  const defaultSubmittedLabel = lang === 'de' ? 'Abgegeben' : 'Submitted';
  // Doppel-Tap-Schutz: nach dem Klick SOFORT optimistisch sperren (sonst feuert
  // ein schneller Doppel-Tap qq:submitAnswer 2× im Latenz-Fenster bis zum
  // stateUpdate — gerade auf Pub-WLAN). Falls kein Update kommt (Submit
  // fehlgeschlagen), nach kurzer Zeit wieder freigeben. Reset pro Frage via
  // key-Remount des Inputs (s.currentQuestion.id).
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    if (!clicked) return;
    const t = setTimeout(() => setClicked(false), 2500);
    return () => clearTimeout(t);
  }, [clicked]);
  const locked = submitted || clicked;
  const handle = () => { if (!canSubmit || locked) return; setClicked(true); onSubmit(); };
  const bg = locked ? '#16a34a' : canSubmit ? `${catColor}30` : 'rgba(255,255,255,0.04)';
  const border = locked ? '#16a34a' : canSubmit ? catColor : 'rgba(255,255,255,0.08)';
  const color = locked ? '#fff' : canSubmit ? '#F1F5F9' : '#334155';
  return (
    <div style={{
      position: 'sticky',
      bottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      zIndex: 5,
      pointerEvents: 'auto',
    }}>
      <button
        className="qq-team-submit-btn"
        onClick={handle}
        disabled={!canSubmit || locked}
        style={{
          // 2026-05-02 (App-Designer-Audit P2): Padding+Schrift fix halten —
          // sonst ruckelt der Button-Layout 4-6px hoch wenn canSubmit togglet,
          // genau in dem Moment wo der Daumen Richtung Submit streicht.
          padding: '16px',
          borderColor: border,
          background: bg,
          color,
          cursor: canSubmit && !locked ? 'pointer' : 'default',
          fontSize: 18,
          width: '100%',
          opacity: canSubmit || locked ? 1 : 0.6,
          boxShadow: canSubmit && !locked ? `0 4px 0 ${catColor}55, 0 0 24px ${catColor}33` : locked ? '0 4px 0 #15803d, 0 0 16px rgba(34,197,94,0.25)' : 'none',
          animation: locked ? 'tcsuccess 0.45s var(--qq-ease-bounce) both' : canSubmit ? 'tcbtnpop 0.35s var(--qq-ease-bounce) both' : 'none',
        }}
      >
        {locked
          ? <><span style={{ animation: 'tccheckpop 0.4s var(--qq-ease-bounce) both', display: 'inline-block', fontSize: 20 }}>✓</span> {submittedLabel ?? defaultSubmittedLabel}</>
          : label ?? defaultLabel}
      </button>
    </div>
  );
}

// ── Submitted state ───────────────────────────────────────────────────────────
export function SubmittedBadge({ text, lang = 'de', answeredCount, totalTeams, pendingTeams, myRank, onRevoke }: {
  text: string; lang?: 'de' | 'en';
  answeredCount?: number; totalTeams?: number;
  pendingTeams?: Array<{ id: string; name: string; color: string; avatarId: string; emoji?: string }>;
  myRank?: number; // 1-based Reihenfolge des Abschickens
  /** 2026-05-23 (Wolf-Live-Test #O): Optional Revoke-Callback. Wenn gesetzt,
   *  zeigt ein „Antwort ändern"-Button. Backend cleared dann die Submission,
   *  Frontend zeigt wieder Input. Nur waehrend QUESTION_ACTIVE + Timer laeuft. */
  onRevoke?: () => void;
}) {
  return (
    <div style={{
      padding: '20px 22px', borderRadius: 16, textAlign: 'center',
      background: 'linear-gradient(135deg, rgba(34,197,94,0.22), rgba(34,197,94,0.08))',
      border: '2px solid rgba(34,197,94,0.55)',
      boxShadow: '0 0 40px rgba(34,197,94,0.2), 0 6px 20px rgba(0,0,0,0.4)',
      animation: 'tcreveal 0.3s ease both, tcsuccessGlow 1.6s ease-in-out 0.3s infinite',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* E1 Big Check + prominent label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 42, height: 42, borderRadius: '50%', background: '#22C55E',
          color: '#fff', fontSize: 24, fontWeight: 900, flexShrink: 0,
          boxShadow: '0 0 16px rgba(34,197,94,0.6)',
          animation: 'tccheckpop 0.5s cubic-bezier(0.34,1.6,0.64,1) both',
        }}>✓</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#86efac' }}>
            {lang === 'de' ? 'Angekommen!' : 'Received!'}
          </span>
          {myRank != null && totalTeams != null && totalTeams > 1 && (
            <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: 0.4 }}>
              #{myRank} {lang === 'de' ? 'von' : 'of'} {totalTeams}
            </span>
          )}
        </div>
      </div>
      {/* Answer-Preview */}
      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 17, fontWeight: 900, color: '#F1F5F9', lineHeight: 1.3,
        wordBreak: 'break-word',
      }}>
        „{text}"
      </div>
      {/* E2 Waiting-Avatar-Row: wer fehlt noch */}
      {pendingTeams && pendingTeams.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '8px 10px', borderRadius: 8,
          background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.12)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: 0.5 }}>
            {lang === 'de' ? 'Noch offen:' : 'Still open:'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {/* 2026-05-03 (App-Designer-Audit P3): Avatare 20->28px, Name 10->12px,
                maxWidth 70->96px, mehr Padding. Bei 8 Teams hat User in der
                Wartephase eine echte Chance zu erkennen wer noch fehlt. */}
            {pendingTeams.slice(0, 10).map(t => (
              <div key={t.id} title={t.name} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px 3px 3px', borderRadius: 999,
                background: 'rgba(0,0,0,0.4)',
                border: `1.5px solid ${t.color}88`,
                opacity: 0.9,
                animation: 'tcpulse 1.8s ease-in-out infinite',
              }}>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={28} />
                <TeamNameLabel
                  name={t.name}
                  maxLines={2}
                  shrinkAfter={12}
                  fontSize={12}
                  color={t.color}
                  fontWeight={800}
                  style={{ maxWidth: 130 }}
                />
              </div>
            ))}
            {pendingTeams.length > 10 && (
              <span style={{ fontSize: 10, color: '#64748b', alignSelf: 'center' }}>+{pendingTeams.length - 10}</span>
            )}
          </div>
        </div>
      )}
      {/* All answered indicator */}
      {answeredCount != null && totalTeams != null && totalTeams > 1 && answeredCount >= totalTeams && (
        <div style={{ fontSize: 13, fontWeight: 900, color: '#4ade80' }}>
          <QQEmojiIcon emoji="✅"/> {lang === 'de' ? 'Alle Teams fertig!' : 'All teams done!'}
        </div>
      )}
      {/* 2026-05-23 (Wolf-Live-Test #O): Antwort-Revoke-Button — Wunsch der
          Teilnehmenden. Nur sichtbar wenn onRevoke gesetzt + Timer noch laeuft. */}
      {onRevoke && (
        <button
          onClick={onRevoke}
          style={{
            marginTop: 4,
            padding: '8px 14px', minHeight: 36, borderRadius: 10,
            background: 'rgba(15,23,42,0.55)',
            border: '1px solid rgba(148,163,184,0.35)',
            color: '#cbd5e1', fontFamily: 'inherit',
            fontSize: 12, fontWeight: 800, letterSpacing: 0.3,
            cursor: 'pointer',
          }}
        >
          ↩ {lang === 'de' ? 'Antwort ändern' : 'Change answer'}
        </button>
      )}
    </div>
  );
}
