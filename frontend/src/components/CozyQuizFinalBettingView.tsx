/**
 * CozyQuizFinalBettingView — Tip-Phase vor dem Finale.
 *
 * Pro Team: einmaliger Tipp auf ein anderes (oder eigenes) Team. Bonus = N
 * Final-Kategorie-Wins. Sympathie +1 bei mutual tip. Kein Verlust.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 4).
 * 2 externe Importer (QQBuiltinSlide + BetTestPage).
 */
import { useEffect, useMemo, useRef } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip, COZY_CARD_BG } from '../cozyQuizShared';
import { QQTeamAvatar } from './QQTeamAvatar';
import { playGoodLuckFanfare, playTeamJoin } from '../utils/sounds';

export function FinalBettingView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const de = lang === 'de';
  const submittedIds = Object.entries(s.finalBettingSubmitted ?? {}).filter(([_, v]) => v).map(([id]) => id);
  const totalTeams = s.teams.length;
  const submittedCount = submittedIds.length;

  // 2026-05-24 (Wolf-Live-Test): Erklärslide direkt vor Bets als „Introseite".
  // Mod-Space dismissed (NICHT Auto-Timer — Wolf will den normalen Space-Flow).
  // Backend-Flag s.finalBettingIntroDone wird in qqStartFinalBetting auf false
  // gesetzt und durch qqFinishFinalBettingIntro (qq:finishFinalBettingIntro-Event)
  // auf true gesetzt. Default true für alte Spiele ohne das Feld.
  const introDone = (s as any).finalBettingIntroDone !== false;

  // 2026-05-19 (Wolf-Audit P0.1 'place your tip ist ohne sound'):
  // Phase-Entry-Fanfare beim Mount + sanfter Tick pro neu eingegangenem Tipp.
  // GoodLuck-Fanfare hat Music-Ducking → laeuft sauber ueber dem Background.
  const fanfareFiredRef = useRef(false);
  useEffect(() => {
    if (fanfareFiredRef.current || s.sfxMuted) return;
    fanfareFiredRef.current = true;
    try { playGoodLuckFanfare(); } catch {}
  }, [s.sfxMuted]);
  const prevSubmittedRef = useRef<number>(submittedCount);
  useEffect(() => {
    if (s.sfxMuted) { prevSubmittedRef.current = submittedCount; return; }
    if (submittedCount > prevSubmittedRef.current) {
      try { playTeamJoin(); } catch {}
    }
    prevSubmittedRef.current = submittedCount;
  }, [submittedCount, s.sfxMuted]);

  // 2026-05-24: Intro-Slide (Erklär-Phase) vor der eigentlichen Betting-View.
  // 2026-05-24 v2 (Wolf 'passt nicht zum rest der app'): Hero-Emoji bobbt mit
  // qqCatNameWave wie in PhaseIntroView, Title bekommt per-letter Wave-Stagger,
  // 'Gleich seid ihr dran'-Bottom-Hint raus.
  if (!introDone) {
    const titleText = de ? 'So funktioniert\'s' : 'How it works';
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'max(var(--qq-safe-margin), 8cqh) max(var(--qq-safe-margin), 6cqw)',
        background: COZY_CARD_BG,
        position: 'relative',
        minHeight: 0, overflow: 'hidden',
        gap: 'clamp(28px, 4cqh, 56px)',
      }}>
        {/* Top-Label */}
        <div style={{
          fontSize: 'clamp(14px, 1.3cqw, 22px)', fontWeight: 900, color: '#F9A8D4',
          textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.85,
          animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.1s both',
        }}>{de ? '🪙 Final-Tipp' : '🪙 Final tip'}</div>

        {/* Hero-Emoji mit Bob-Animation (analog PhaseIntroView Category-Icon).
            2026-05-25 (Wolf '🎰 ist schon ZehnVonZehn, Münze konsistent für
            Bet'): 🎰 → 🪙 damit Bet-Symbol nicht mit ZvZ-Slot-Machine kollidiert. */}
        <div style={{
          fontSize: 'clamp(72px, 8cqw, 160px)', lineHeight: 1,
          textAlign: 'center',
          animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.2s both, qqCatNameWave 2.8s ease-in-out 1.4s infinite',
        }}>🪙</div>

        {/* Title mit per-letter Wave (analog PhaseIntroView Cat-Name) */}
        <div style={{
          fontSize: 'clamp(40px, 5cqw, 84px)', fontWeight: 900, color: '#F1F5F9',
          lineHeight: 1.05, letterSpacing: '-0.025em', textAlign: 'center',
          textShadow: '0 0 36px rgba(236,72,153,0.45)',
          animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.35s both',
        }}>
          {Array.from(titleText).map((ch, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                whiteSpace: ch === ' ' ? 'pre' : undefined,
                animation: 'qqCatNameWave 2.8s ease-in-out infinite',
                animationDelay: `${1.4 + i * 0.07}s`,
              }}
            >{ch}</span>
          ))}
        </div>

        {/* Erklär-Lines (gleiche Struktur wie Rules-Slides) */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(16px, 2cqh, 28px)',
          maxWidth: 1200,
        }}>
          <div style={{
            fontSize: 'clamp(22px, 2.4cqw, 38px)', color: '#CBD5E1', fontWeight: 700,
            textAlign: 'center', lineHeight: 1.4,
            animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.55s both',
          }}>
            {de
              ? 'Vor dem Finale tippt jedes Team auf ein anderes (oder eigenes) Team'
              : 'Before the finale every team tips on another (or own) team'}
          </div>
          <div style={{
            fontSize: 'clamp(22px, 2.4cqw, 38px)', color: '#FBCFE8', fontWeight: 900,
            textAlign: 'center', lineHeight: 1.4,
            animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.75s both',
          }}>
            {de
              ? '🎯 Pro gewonnene Final-Kategorie eures Tipps = +1 Bonus'
              : '🎯 Per final-category win of your tip = +1 bonus'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      // 2026-05-12 (Wolf 'safe-margin im ganzen quiz'): floor auf Safe-Margin.
      padding: 'max(var(--qq-safe-margin), 8cqh) max(var(--qq-safe-margin), 6cqw)',
      background: COZY_CARD_BG,
      position: 'relative',
      minHeight: 0, overflow: 'hidden',
    }}>
      {/* 2026-05-09 (Wolf): FinalBettingView komplett refactored auf
          Tipp-Variante. Vorher: alte Cell-Picker-Beschreibung (irreführend).
          Jetzt: 3 prominente Bullets + großes Submit-Status. */}
      <div style={{
        fontSize: 'clamp(14px, 1.3cqw, 22px)', fontWeight: 900, color: '#F9A8D4',
        textTransform: 'uppercase', letterSpacing: '0.18em',
        marginBottom: 18, opacity: 0.85,
      }}>{de ? '🪙 Final-Tipp' : '🪙 Final tip'}</div>

      <div style={{
        fontSize: 'clamp(48px, 6.5cqw, 110px)', fontWeight: 900, color: '#F1F5F9',
        lineHeight: 1, letterSpacing: '-0.025em', textAlign: 'center',
        marginBottom: 12,
      }}>{de ? 'Tippt jetzt!' : 'Place your tip!'}</div>

      <div style={{
        fontSize: 'clamp(22px, 2.4cqw, 38px)', color: '#CBD5E1', fontWeight: 700,
        textAlign: 'center', maxWidth: 1100, lineHeight: 1.3, marginBottom: 40,
      }}>
        {de
          ? 'Welches Team holt in der Final-Runde am meisten Punkte?'
          : 'Which team will score the most in the final round?'}
      </div>

      {/* Submit-Status — kompakter, ohne Häkchen, ohne Team-Namen.
          2026-05-11 (Wolf 'super inkonsistent'): grüner Glow-Circle wie sonst
          überall in der App, kein ✓-Häkchen, kein Team-Name unter dem Avatar. */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
        padding: 'clamp(28px, 4cqh, 48px) clamp(40px, 5cqw, 72px)',
        borderRadius: 32,
        background: 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(162,18,71,0.06))',
        border: '2px solid rgba(236,72,153,0.32)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{
          fontSize: 'clamp(14px, 1.1cqw, 20px)', fontWeight: 900, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>{de ? 'Tipps abgegeben' : 'Tips submitted'}</div>
        <div style={{
          fontSize: 'clamp(64px, 8cqw, 150px)', fontWeight: 900,
          color: submittedCount === totalTeams ? '#22C55E' : '#F472B6',
          letterSpacing: '-0.04em', lineHeight: 1,
          textShadow: `0 0 32px ${submittedCount === totalTeams ? 'rgba(34,197,94,0.55)' : 'rgba(236,72,153,0.45)'}`,
        }}>
          {submittedCount} / {totalTeams}
        </div>
        {/* Avatar-Reihe ohne Namen, mit grünem Glow für submitted Teams.
            Identisch zum „submitted"-Pattern im restlichen Quiz. */}
        <div style={{ display: 'flex', gap: 'clamp(16px, 2cqw, 28px)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
          {s.teams.map(t => {
            const done = !!s.finalBettingSubmitted?.[t.id];
            const avatarSize: number = Math.max(64, Math.min(96, Math.round(700 / totalTeams)));
            return (
              <div key={t.id} style={{
                width: avatarSize + 12, height: avatarSize + 12,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'rgba(34,197,94,0.18)' : 'transparent',
                border: done ? '3px solid #22C55E' : '3px solid rgba(255,255,255,0.10)',
                boxShadow: done ? '0 0 24px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.25)' : 'none',
                opacity: done ? 1 : 0.45,
                transition: 'all 0.45s ease',
              }}>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avatarSize} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 2026-05-09 (Wolf-Wunsch v2): Recap-Slide nach jeder Final-Frage. Großes
// Overlay, episch-funkelnd. Zeigt Wins pro Team + Highlight für just-Winner
