/**
 * CozyQuizTeamLifecycle — Lifecycle-/Status-Views fuer die /team-Phone-View.
 *
 * Components:
 * - IdentityBanner — Fullscreen-Willkommen-Card direkt nach Join (Team-Color-Glow,
 *   auto-dismiss nach ~2.6s via Parent-Timer)
 * - YourTurnAlert — Fullscreen-Pulse (Hot Potato / Imposter Trigger)
 * - MidGameRejoinView — wenn /team waehrend laufendem Quiz geladen wird:
 *   Reconnect-CTA (Team noch im Room) oder "warte auf Pause"-Hint
 * - WaitingScreen — Skeleton + Connection-Status, vor dem ersten State-Update
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 3.5).
 */
import React, { useEffect, useState } from 'react';
import type { QQTeam } from '../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQEmojiIcon } from './QQIcon';
import { MobileFireflies } from './CozyQuizTeamPrimitives';
import { TEAM_CSS, darkPage, grainOverlay, COZY_CARD_BG } from './qqTeamStyles';

// ── IdentityBanner ──────────────────────────────────────────────────────────
// Welcome-Card direkt nach erfolgreichem Join. Voll-opaker Backdrop + Team-
// Color-Glow + Avatar + Team-Name. Auto-Dismiss nach ~2.6s via Parent-Timer.
export function IdentityBanner({ team, lang }: { team: QQTeam; lang: 'de' | 'en' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      // Voll opaker Backdrop + sanfter Team-Color-Glow obendrauf — verhindert
      // dass die TeamView-UI durchscheint und mit dem Welcome-Banner verschwimmt.
      background: `radial-gradient(ellipse at 50% 50%, ${team.color}33 0%, transparent 70%), rgba(13,10,6,0.96)`,
      backdropFilter: 'blur(10px) saturate(1.1)',
      WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
      animation: 'tcIdentityOut 0.45s ease 2.15s both',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        // 2026-05-04 (UI-Audit P0-3): responsive padding statt fix '32px 44px'
        // damit's auf 320px-iPhone-SE-Schirm nicht ueberlaeuft.
        padding: 'clamp(20px, 5vw, 32px) clamp(28px, 7vw, 44px)',
        maxWidth: 'min(360px, 90vw)',
        borderRadius: 24,
        // Card jetzt opak: dunkler Card-Background mit dezentem Team-Color-Tint,
        // damit der Inhalt klar gegen den Hintergrund steht.
        background: `linear-gradient(180deg, rgba(28,22,16,0.96), rgba(15,12,8,0.96)), linear-gradient(180deg, ${team.color}1f, ${team.color}10)`,
        backgroundBlendMode: 'normal, normal',
        border: `2.5px solid ${team.color}`,
        boxShadow: `0 18px 56px rgba(0,0,0,0.65), 0 0 80px ${team.color}55, inset 0 1px 0 rgba(255,255,255,0.12)`,
        animation: 'tcIdentityIn 0.7s var(--qq-ease-bounce) both',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
          color: `${team.color}dd`, textTransform: 'uppercase',
        }}>
          {lang === 'de' ? 'Willkommen!' : 'Welcome!'}
        </div>
        <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={96} style={{
          filter: `drop-shadow(0 0 24px ${team.color}aa)`,
          animation: 'tcfloat 2.6s ease-in-out infinite',
        }} />
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.04em',
        }}>
          {lang === 'de' ? 'Ihr seid' : 'You are'}
        </div>
        <div style={{
          fontSize: 40, fontWeight: 900, color: team.color, letterSpacing: '-0.01em',
          textShadow: `0 0 30px ${team.color}aa`, textAlign: 'center',
          lineHeight: 1.05, wordBreak: 'break-word', maxWidth: 360,
        }}>
          {team.name}
        </div>
      </div>
    </div>
  );
}

// ── YourTurnAlert — fullscreen pulse for Hot Potato / Imposter ──────────────
export function YourTurnAlert({ kind, team, lang }: { kind: 'hotPotato' | 'imposter'; team: QQTeam; lang: 'de' | 'en' }) {
  const emoji = kind === 'hotPotato' ? '🥔' : '🕵️';
  const title = lang === 'de' ? 'JETZT BIST DU DRAN!' : 'YOUR TURN NOW!';
  return (
    <div
      aria-live="assertive"
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        animation: 'tcYourTurnPulse 1.5s ease both',
        ['--turn-color' as string]: team.color,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        animation: 'tcYourTurnGlow 0.7s ease-in-out infinite',
      }} />
      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        padding: '28px 42px', borderRadius: 24,
        background: `${team.color}22`,
        border: `3px solid ${team.color}`,
        boxShadow: `0 0 60px ${team.color}aa, inset 0 0 30px ${team.color}33`,
      }}>
        <div style={{ fontSize: 72, lineHeight: 1, animation: 'tcwobble 0.35s ease-in-out infinite' }}><QQEmojiIcon emoji={emoji}/></div>
        <div style={{
          fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '0.04em',
          textShadow: `0 0 16px ${team.color}`,
          textAlign: 'center',
        }}>
          {title}
        </div>
      </div>
    </div>
  );
}

// ── MidGameRejoinView ──────────────────────────────────────────────────────
// 2026-05-06 (Wolf 'das quiz laeuft schon — option mit wieder einsteigen'):
// Mid-Game-Reconnect-Page. Wird angezeigt wenn /team waehrend laufendem Quiz
// geladen wird (phase != LOBBY) und der Spieler noch nicht joined ist.
//   - Team noch im Room → Avatar + Name + Big-Button "Wieder einsteigen"
//   - Team NICHT im Room → Hinweis "Du bist nicht angemeldet, warte auf
//     naechstes Quiz / Pause"
// Verhindert dass Spieler nach Browser-Wechsel den vollen SetupFlow mit
// Avatar-Editor sehen — der waere sinnlos, weil das Quiz schon laeuft.
export function MidGameRejoinView({ roomCode, connected, lang, existingTeam, onResume, onFlagClick, flagFlip }: {
  roomCode: string;
  connected: boolean;
  lang: 'de' | 'en';
  existingTeam: QQTeam | null;
  onResume: () => void;
  onFlagClick: () => void;
  flagFlip: boolean;
}) {
  return (
    <div style={darkPage}>
      <style>{TEAM_CSS}</style>
      <div style={grainOverlay} />
      <MobileFireflies color="#F9A8D444" />
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        {/* Sprache-Flag oben rechts */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={onFlagClick}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 28, padding: 6, borderRadius: 999,
              transition: 'transform 0.2s ease',
              transform: flagFlip ? 'rotateY(90deg)' : 'rotateY(0)',
            }}
            aria-label="language"
            title={lang === 'de' ? 'Sprache wechseln' : 'Switch language'}
          >
            {lang === 'de' ? '🇩🇪' : '🇬🇧'}
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 8, animation: 'tcfloat 3s ease-in-out infinite', display: 'inline-block' }}>🎮</div>
          <div style={{
            fontSize: 28, fontWeight: 900, color: '#F1F5F9',
            marginBottom: 4,
          }}>
            {lang === 'de' ? 'Quiz läuft schon!' : 'Quiz already running!'}
          </div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: '#94a3b8' }}>
            {lang === 'de' ? 'Raum' : 'Room'}: {roomCode}
          </div>
        </div>

        {/* Verbindungs-Status (kompakt) */}
        <div style={{
          textAlign: 'center', marginBottom: 18,
          fontSize: 12, fontWeight: 700,
          color: connected ? '#22C55E' : '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22C55E' : '#EF4444',
            boxShadow: connected ? '0 0 6px #22C55E' : '0 0 6px #EF4444',
            animation: 'tcpulse 1.5s infinite',
          }} />
          {connected
            ? (lang === 'de' ? 'Verbunden' : 'Connected')
            : (lang === 'de' ? 'Verbinde…' : 'Connecting…')}
        </div>

        {existingTeam ? (
          // ── Team noch im Room: Reconnect-CTA ────────────────────────────
          <div style={{
            background: COZY_CARD_BG, borderRadius: 24, padding: '24px 20px',
            border: `2px solid ${existingTeam.color}55`,
            boxShadow: `0 0 32px ${existingTeam.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {lang === 'de' ? 'Du warst dabei als' : 'You were playing as'}
            </div>
            <QQTeamAvatar
              avatarId={existingTeam.avatarId}
              teamEmoji={existingTeam.emoji}
              size={120}
              style={{ boxShadow: `0 0 32px ${existingTeam.color}66` }}
            />
            <div style={{
              fontSize: 22, fontWeight: 900, color: existingTeam.color,
              textAlign: 'center', maxWidth: '100%',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {existingTeam.name}
            </div>
            <button
              onClick={onResume}
              disabled={!connected}
              style={{
                width: '100%', padding: '16px 18px', borderRadius: 14,
                border: 'none',
                background: connected
                  ? `linear-gradient(135deg, ${existingTeam.color}, ${existingTeam.color}dd)`
                  : 'rgba(100,116,139,0.4)',
                color: '#fff', fontSize: 17, fontWeight: 900,
                letterSpacing: '0.05em',
                cursor: connected ? 'pointer' : 'not-allowed',
                boxShadow: connected ? `0 4px 14px ${existingTeam.color}66` : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {lang === 'de' ? '→ Wieder einsteigen' : '→ Rejoin'}
            </button>
          </div>
        ) : (
          // ── Team NICHT im Room: nicht teilnahmeberechtigt ───────────────
          <div style={{
            background: COZY_CARD_BG, borderRadius: 24, padding: '28px 20px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 36 }}>⏳</div>
            <div style={{
              fontSize: 18, fontWeight: 800, color: '#F1F5F9', textAlign: 'center',
            }}>
              {lang === 'de'
                ? 'Du bist nicht angemeldet'
                : 'You are not registered'}
            </div>
            <div style={{
              fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5,
            }}>
              {lang === 'de'
                ? 'Das Quiz hat schon angefangen. Warte auf eine Pause oder die nächste Lobby — dann kannst du als neues Team einsteigen.'
                : 'The quiz has already started. Wait for a break or the next lobby — then you can join as a new team.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PreparingScreen ─────────────────────────────────────────────────────────
// 2026-07-03 (Wolf): bevor der Moderator das Format wählt (formatSelected===false)
// weiß /team noch nicht, ob es CozyQuiz (freie Avatar-Wahl) oder Cozy Arena
// (feste Fraktionen/Wappen) wird — deshalb KEIN Avatar-Setup zeigen, sondern
// „Quiz wird vorbereitet". Sobald der Mod wählt, schaltet /team automatisch
// auf den passenden Join-Flow um (Re-Render über State-Update).
export function PreparingScreen({ roomCode, connected, lang = 'de', onFlagClick, flagFlip }: {
  roomCode: string; connected: boolean; lang?: 'de' | 'en';
  onFlagClick: () => void; flagFlip: boolean;
}) {
  return (
    <div style={darkPage}>
      <style>{TEAM_CSS}</style>
      <div style={grainOverlay} />
      <MobileFireflies color="#F9A8D444" />
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        {/* Sprache-Flag oben rechts */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={onFlagClick}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 28, padding: 6, borderRadius: 999,
              transition: 'transform 0.2s ease',
              transform: flagFlip ? 'rotateY(90deg)' : 'rotateY(0)',
            }}
            aria-label="language"
            title={lang === 'de' ? 'Sprache wechseln' : 'Switch language'}
          >
            {lang === 'de' ? '🇩🇪' : '🇬🇧'}
          </button>
        </div>

        {/* Header — Brand-Hero wie auf dem Beamer (NeutralWelcomeView):
            CozyWolf-Logo im pinken Ring + Wortmarke in Akzent-Pink mit Glow.
            Statisches pink.png statt AnimatedCozyWolf, damit das /team-Bundle
            NICHT das 16k-Zeilen-QQBeamerPage-Modul mitzieht. */}
        <div style={{ textAlign: 'center', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 132, height: 132, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            background: 'radial-gradient(circle at 50% 35%, rgba(236,72,153,0.20), rgba(236,72,153,0.04))',
            border: '3px solid #EC4899',
            boxShadow: '0 0 30px rgba(236,72,153,0.45), inset 0 0 22px rgba(236,72,153,0.15)',
            animation: 'tcfloat 3.4s ease-in-out infinite',
          }}>
            <img
              src="/avatars/cozywolf/pink.png" alt="CozyWolf"
              style={{ width: 98, height: 98, objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))' }}
            />
          </div>
          <div style={{
            fontFamily: 'var(--font-brand)',
            fontSize: 40, fontWeight: 400, color: '#EC4899',
            letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
            textShadow: '0 2px 12px rgba(0,0,0,0.55), 0 0 26px rgba(236,72,153,0.55)',
          }}>COZYQUIZ</div>
        </div>

        {/* „Wird vorbereitet"-Card */}
        <div style={{
          background: COZY_CARD_BG, borderRadius: 24, padding: '30px 22px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{ display: 'flex', gap: 7 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: '#F9A8D4',
                animation: `tcpulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#F1F5F9', textAlign: 'center', lineHeight: 1.2 }}>
            {lang === 'de' ? 'Quiz wird vorbereitet …' : 'Preparing the quiz …'}
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
            {lang === 'de'
              ? 'Gleich geht’s los! Sobald alles startklar ist, kannst du hier deinem Team beitreten. Bitte kurz warten.'
              : 'Almost there! As soon as everything’s ready, you can join your team here. Please wait a moment.'}
          </div>
        </div>

        {/* Verbindungs-Status */}
        <div style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 13, fontWeight: 700,
          color: connected ? '#22C55E' : '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22C55E' : '#EF4444',
            boxShadow: connected ? '0 0 6px #22C55E' : '0 0 6px #EF4444',
            animation: 'tcpulse 1.5s infinite',
          }} />
          {connected
            ? (lang === 'de' ? 'Verbunden' : 'Connected')
            : (lang === 'de' ? 'Verbinde…' : 'Connecting…')}
        </div>
      </div>
    </div>
  );
}

// ── WaitingScreen ──────────────────────────────────────────────────────────
// 2026-05-06 (Wolf 'kein autoconnect, leerer Screen'): nach 8s ohne State
// bieten wir einen manuellen Reload-Button + Hinweis. Backend wacht aus dem
// Schlaf manchmal in 30s+ auf — damit der Spieler sieht 'es passiert was',
// nicht nur Skelett.
export function WaitingScreen({ roomCode, connected, lang = 'de' }: { roomCode: string; connected: boolean; lang?: 'de' | 'en' }) {
  const [showStuckHint, setShowStuckHint] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowStuckHint(true), 8000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div style={darkPage}>
      <style>{TEAM_CSS}{`
        @keyframes tcShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      <div style={grainOverlay} />
      <MobileFireflies color="#F9A8D444" />
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        {/* Header skeleton */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 42, marginBottom: 8, animation: 'tcfloat 3s ease-in-out infinite', display: 'inline-block' }}>🎮</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9', letterSpacing: '0.04em' }}>COZYQUIZ</div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: '#64748b', margin: '8px 0' }}>
            {lang === 'de' ? 'Raum' : 'Room'}: {roomCode}
          </div>
        </div>
        {/* Skeleton card */}
        <div style={{
          background: COZY_CARD_BG, borderRadius: 24, padding: '24px 18px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: i === 1 ? 18 : 14, borderRadius: 8,
              marginBottom: i < 3 ? 12 : 0,
              width: i === 1 ? '70%' : i === 2 ? '100%' : '55%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
              backgroundSize: '200% 100%',
              animation: `tcShimmer 1.8s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
        {/* Connection status */}
        <div style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 13, fontWeight: 700,
          color: connected ? '#22C55E' : '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22C55E' : '#EF4444',
            boxShadow: connected ? '0 0 6px #22C55E' : '0 0 6px #EF4444',
            animation: 'tcpulse 1.5s infinite',
          }} />
          {connected
            ? (lang === 'de' ? '● Verbunden, lade Spielzustand…' : '● Connected, loading game state…')
            : (lang === 'de' ? '○ Verbinde…' : '○ Connecting…')}
        </div>
        {/* Stuck-Hint nach 8s — manueller Reload + Mitspieler-Hinweis */}
        {showStuckHint && (
          <div style={{
            marginTop: 20, padding: '14px 16px', borderRadius: 14,
            background: 'rgba(236,72,153,0.08)',
            border: '1.5px dashed rgba(236,72,153,0.4)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: '#FBCFE8', fontWeight: 700, marginBottom: 8 }}>
              {lang === 'de'
                ? 'Dauert lange? Server schlaeft eventuell — bitte warten oder neu laden.'
                : 'Taking long? Server may be waking up — wait or reload.'}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 18px', borderRadius: 10,
                border: '1px solid rgba(236,72,153,0.5)',
                background: 'rgba(236,72,153,0.15)',
                color: '#FBCFE8', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {lang === 'de' ? '↻ Neu laden' : '↻ Reload'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
