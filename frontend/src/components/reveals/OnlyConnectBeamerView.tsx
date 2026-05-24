/**
 * OnlyConnectBeamerView — Bunte-Tüte "onlyConnect" / 4-gewinnt Sub-Mechanic.
 *
 * Beamer-Layout fuer active + reveal Phase. Alle 4 Hints sofort sichtbar,
 * 1 Tipp pro Team, Reveal mit Loesung + Winner-Card analog CHEESE.
 *
 * 2026-05-24 (Refactor #5.5): aus CozyQuizQuestionView.tsx extrahiert.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { TeamNameLabel } from '../TeamNameLabel';
import { Fireflies } from '../CozyQuizAmbient';
import { BeamerTimer } from '../CozyQuizBeamerTimer';
import { formatRevealedAnswer } from '../../cozyQuizShared';
import {
  playAvatarCascadeNote, playClimaxFinish, playRevealHighlight,
  playTick, playWinnerCardReveal,
} from '../../utils/sounds';

// 2026-05-09 v2 (Wolf-Reform): Connect 4 — alle 4 Hints sofort sichtbar,
// 1 Tipp pro Team, Reveal mit Lösung + Winner-Card wie CHEESE.
export function OnlyConnectBeamerView({ state: s, lang, revealed }: {
  state: QQStateUpdate; lang: 'de' | 'en'; revealed: boolean;
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../../shared/quarterQuizTypes').QQBunteTueteOnlyConnect;
  const hintsAll = (lang === 'en' && bt.hintsEn?.length === 4 ? bt.hintsEn : bt.hints) ?? [];
  const answer = formatRevealedAnswer(lang, bt.answer, bt.answerEn);
  const lockedSet = new Set(s.onlyConnectLockedTeams ?? []);
  const accent = '#F87171';
  // 2026-05-09 v2: alle Hints sofort sichtbar; correctSorted nach submittedAt
  // (= Speed) — Reihenfolge der Action-Vergabe analog Standard-Mechaniken.
  const correctSorted = (s.onlyConnectGuesses ?? [])
    .filter(g => g.correct)
    .slice()
    .sort((a, b) => a.submittedAt - b.submittedAt);
  const winnerSet = new Set(s.currentQuestionWinners ?? []);

  // 2026-05-09 v2: Reveal-Choreo CHEESE-style — Lösung-Card slammt zuerst (0.4s),
  // dann Winner-Cards gestaffelt (0.85s + 0.18s pro Team). Sound entsprechend.
  const SOLUTION_DELAY = 0.4;
  const WINNER_BASE = 0.85;
  const WINNER_STEP = 0.18;
  useEffect(() => {
    if (!revealed || s.sfxMuted) return;
    const handles: number[] = [];
    const cascadeTotal = Math.max(2, correctSorted.length + 1);
    handles.push(window.setTimeout(() => {
      try { playRevealHighlight(); } catch {}
    }, Math.max(0, SOLUTION_DELAY * 1000 - 60)));
    correctSorted.forEach((_g, idx) => {
      const delayMs = (WINNER_BASE + idx * WINNER_STEP) * 1000 - 60;
      handles.push(window.setTimeout(() => {
        try { playAvatarCascadeNote(idx + 1, cascadeTotal); } catch {}
      }, Math.max(0, delayMs)));
    });
    return () => handles.forEach(h => window.clearTimeout(h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, correctSorted.length, s.sfxMuted]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 2cqh, 24px)',
      padding: 'clamp(20px, 2.5cqh, 36px) clamp(24px, 3cqw, 48px) clamp(16px, 2cqh, 28px)',
      position: 'relative',
    }}>
      <Fireflies color={`${accent}55`} />

      {/* Header — Pille links, Timer rechts (Wolf 2026-05-04: Hinweis-Counter
          umgezogen ueber die Frage, Timer war vorher gar nicht sichtbar). */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, position: 'relative', zIndex: 5,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 22px', borderRadius: 999,
          background: `${accent}22`, border: `2px solid ${accent}44`,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) both',
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.2cqw, 30px)', lineHeight: 1 }}>🧩</span>
          <span style={{
            fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
            color: accent, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{lang === 'de' ? '4 gewinnt' : 'Connect 4'}</span>
        </div>
        {/* 2026-05-06 (Konsistenz-Audit S2#4): 'Auflösung'-Pille entfernt —
            keine andere Standard-Kategorie zeigt sie, der Reveal-Modus
            ist eh durch Avatar-Cascade + Lösung-Card visuell klar. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!revealed && s.timerEndsAt && (
            <BeamerTimer endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accent={accent} />
          )}
        </div>
      </div>

      {/* Frage oben mittig */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both',
      }}>
        <div style={{
          fontSize: 'clamp(26px, 3cqw, 44px)', fontWeight: 900,
          color: '#F1F5F9', lineHeight: 1.2, maxWidth: 1400, margin: '0 auto',
        }}>
          {lang === 'en' && q.textEn ? q.textEn : (q.text || (lang === 'de' ? 'Was verbindet diese Hinweise?' : 'What connects these clues?'))}
        </div>
      </div>

      {/* 2026-05-09 v2 (Wolf-Reform): 2×2 Hint-Grid mittig zentriert. Alle 4
          Hints sofort sichtbar (kein progressives Reveal, keine Avatare auf
          Hints). Im Reveal-Modus stays the grid sichtbar als Kontext, Lösung
          + Winner-Card kommen darunter. */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 5,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))',
          gap: 'clamp(14px, 1.8cqw, 28px)',
          maxWidth: 1100, width: '100%',
        }}>
          {[0, 1, 2, 3].map(i => {
            const hintText = hintsAll[i] ?? `Hinweis ${i + 1}`;
            const hintColor = i === 0 ? '#EC4899' : i === 1 ? '#22C55E' : i === 2 ? '#60A5FA' : '#A78BFA';
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(20px, 3cqh, 36px) clamp(20px, 2cqw, 32px)',
                borderRadius: 18,
                background: `linear-gradient(180deg, ${hintColor}28, ${hintColor}10)`,
                border: `2px solid ${hintColor}88`,
                boxShadow: `0 0 18px ${hintColor}33`,
                minHeight: 'clamp(120px, 16cqh, 180px)',
                textAlign: 'center', gap: 10,
                animation: `contentReveal 0.5s var(--qq-ease-out-cubic) ${0.15 + i * 0.10}s both`,
              }}>
                <div style={{
                  fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
                  color: hintColor,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{lang === 'de' ? `Hinweis ${i + 1}` : `Clue ${i + 1}`}</div>
                <div style={{
                  fontSize: 'clamp(24px, 2.8cqw, 44px)', fontWeight: 900,
                  color: '#F1F5F9', lineHeight: 1.15,
                }}>{hintText}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reveal: ZWEI getrennte Cards nebeneinander.
          2026-05-06 (Wolf 'lösungscard und gewinnercard trennen — lösungscard
          grün umrandet wie sonst auch, gewinnercard in der Farbe des Gewinners
          → vollständig konsistent mit Rest der App'):
          Vorher 1× zusammengelegte Gold-Card (Lösung+Sieger). Jetzt:
          - Lösungs-Card: grün umrandet + grüner Glow (analog MUCHO/ZvZ-
            Lock-Step-Highlight wo die korrekte Option grün wird).
          - Sieger-Card: in der Farbe des Gewinner-Teams.
          Beide Cards bleiben im Question-Mode mit visibility:hidden gerendert,
          damit der Layout-Space reserviert ist (kein Sprung beim Reveal). */}
      {(() => {
        // 2026-05-09 v2: Winner-Order = correctSorted (= submitted-time-order),
        // gefiltert auf winnerSet (Backend-Truth). Speed = Reihenfolge.
        const orderedWinnerIds = correctSorted
          .map(g => g.teamId)
          .filter(id => winnerSet.has(id));
        const winnerTeams = revealed
          ? orderedWinnerIds
              .map(id => s.teams.find(t => t.id === id))
              .filter((t): t is NonNullable<typeof t> => !!t)
          : [];
        const primaryWinner = winnerTeams[0] ?? null;
        const winnerColor = primaryWinner?.color ?? '#EC4899';
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: winnerTeams.length > 0 ? '1fr 1fr' : '1fr',
            gap: 'clamp(12px, 1.6cqw, 22px)',
            position: 'relative', zIndex: 5,
            alignItems: 'stretch',
            visibility: revealed ? 'visible' : 'hidden',
            opacity: revealed ? 1 : 0,
            transition: 'opacity 0.5s ease 0.15s',
          }}>
            {/* Lösungs-Card — grün umrandet (analog Lock-Step-Highlight in
                MUCHO/ZvZ wo die korrekte Option grün wird). */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(16px, 2cqh, 28px)',
              borderRadius: 24,
              minHeight: 'clamp(140px, 18cqh, 220px)',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))',
              border: '2.5px solid rgba(34,197,94,0.55)',
              boxShadow: '0 0 40px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
              animation: revealed ? `revealAnswerBam 0.6s var(--qq-ease-out-cubic) ${SOLUTION_DELAY}s both` : undefined,
            }}>
              <div style={{
                fontSize: 'clamp(36px, 4.4cqw, 72px)', fontWeight: 900,
                color: '#86efac', textShadow: '0 0 30px rgba(34,197,94,0.45)',
                textAlign: 'center', lineHeight: 1.1,
              }}>
                {answer}
              </div>
            </div>

            {/* Sieger-Card — kompakter Stil analog CHEESE/MUCHO/ZvZ:
                nur Avatare nebeneinander mit Zeit-Pill darunter, KEINE Team-
                Namen. Schnellster bekommt Pink-Gold-Ring.
                2026-05-09 v3 (Wolf-Bug 'connect 4 winnercard viiiel zu groß +
                unten abgeschnitten'): vorher Avatar+Team-Name horizontal mit
                flexWrap auf mehrere Zeilen → Card konnte höher als Container
                wachsen. Jetzt fix kompakte Höhe wie Lösung-Card. */}
            {winnerTeams.length > 0 && (() => {
              // t0 = Question-Start, berechnet aus timer (oder Fallback erste Submission)
              const t0 = s.timerEndsAt && s.timerDurationSec
                ? s.timerEndsAt - s.timerDurationSec * 1000
                : correctSorted[0]?.submittedAt ?? null;
              const guessByTeam = new Map(correctSorted.map(g => [g.teamId, g]));
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 'clamp(14px, 1.8cqw, 28px)', flexWrap: 'wrap',
                  padding: 'clamp(16px, 2cqh, 28px)',
                  borderRadius: 24,
                  minHeight: 'clamp(140px, 18cqh, 220px)',
                  background: `linear-gradient(135deg, ${winnerColor}26, ${winnerColor}08)`,
                  border: `2.5px solid ${winnerColor}aa`,
                  boxShadow: `0 0 40px ${winnerColor}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
                  animation: revealed ? `revealAnswerBam 0.6s var(--qq-ease-out-cubic) ${SOLUTION_DELAY + 0.15}s both` : undefined,
                }}>
                  {winnerTeams.map((tm, idx) => {
                    const guess = guessByTeam.get(tm.id);
                    const timeSec = t0 != null && guess
                      ? Math.max(0, (guess.submittedAt - t0) / 1000)
                      : null;
                    const isFastest = idx === 0;
                    const avatarSize = isFastest
                      ? 'clamp(72px, 7.5cqw, 104px)'
                      : 'clamp(60px, 6.4cqw, 88px)';
                    return (
                      <div key={tm.id} style={{
                        position: 'relative',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        // 2026-05-13 (Wolf 'man hoert sound aber keine action dazu'):
                        // phasePop (Scale 0.94→1, sehr subtil) → revealWinnerIn
                        // (translateY 30→0 + Scale 0.9→1.02→1, bouncy, dramatisch).
                        // Cascade-Sound (Pentatonik-Note) trifft jetzt auf sichtbaren
                        // Pop-In statt nur dezenten FadeIn.
                        animation: `revealWinnerIn 0.6s var(--qq-ease-bounce) ${WINNER_BASE + idx * WINNER_STEP}s both`,
                      }}>
                        <QQTeamAvatar
                          avatarId={tm.avatarId} teamEmoji={tm.emoji}
                          size={avatarSize}
                          style={{
                            border: isFastest ? '4px solid #EC4899' : 'none',
                            boxShadow: isFastest
                              ? `0 0 0 3px ${tm.color}, 0 0 22px rgba(236,72,153,0.6), 0 6px 14px rgba(0,0,0,0.55)`
                              : `0 0 0 3px ${tm.color}, 0 0 14px ${tm.color}88, 0 6px 14px rgba(0,0,0,0.55)`,
                            background: '#0A0814',
                            flexShrink: 0,
                          }}
                        />
                        {timeSec != null && (
                          <span style={{
                            position: 'absolute',
                            left: '50%', bottom: -8,
                            transform: 'translate(-50%, 50%)',
                            padding: '3px 11px', borderRadius: 999,
                            background: isFastest ? 'rgba(236,72,153,0.95)' : 'rgba(15,23,42,0.95)',
                            border: isFastest ? '1.5px solid rgba(236,72,153,1)' : `1.5px solid ${tm.color}`,
                            color: isFastest ? '#0A0814' : '#e2e8f0',
                            fontWeight: 900,
                            fontSize: 'clamp(12px, 1.3cqw, 17px)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            lineHeight: 1.1,
                          }}>
                            {timeSec.toFixed(1)}s
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Team-Status-Reihe (analog CHEESE/4×4) — NUR im Active-Pfad zeigen.
          Wolf 2026-05-05: beim Reveal ausgeblendet, da locked/X-Teams öffentlich
          ausgestellt wurden (Anti-Public-Shaming). Sieger sind im Reveal-Card
          oben rechts; auf welchem Hinweis sie es hatten siehst du an den
          Hint-Cards mit Gold-Ring. */}
      {/* 2026-05-09 v2 (Wolf-Reform): Submit-Status-Reihe — pre-reveal pro Team
          Avatar mit grünem Glow wenn submitted (Bluff-Pattern, konsistent zum
          Rest). Anti-Spoiler-Bedenken weggefallen (Wolf 2026-05-17: alle 4
          Hinweise gleichzeitig sichtbar). */}
      {!revealed && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(10px, 1.6cqw, 22px)', flexWrap: 'wrap',
        position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) 0.2s both',
      }}>
        {s.teams.map((tm) => {
          const isLocked = lockedSet.has(tm.id);
          const isWinner = winnerSet.has(tm.id);
          const hasSubmitted = isLocked || isWinner;
          return (
            <div key={tm.id} title={tm.name} style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              opacity: hasSubmitted ? 1 : 0.55,
              filter: hasSubmitted
                ? 'drop-shadow(0 0 10px rgba(34,197,94,0.55)) drop-shadow(0 0 3px rgba(34,197,94,0.4))'
                : 'grayscale(0.4)',
              transition: 'opacity 0.4s ease, filter 0.4s ease',
            }}>
              <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(48px, 5cqw, 72px)'} style={{
                background: '#0A0814',
                boxShadow: hasSubmitted
                  ? `0 0 0 3px #22C55E, 0 4px 10px rgba(0,0,0,0.55)`
                  : `0 0 0 2px ${tm.color}55, 0 4px 10px rgba(0,0,0,0.55)`,
                transition: 'box-shadow 0.45s ease',
              }} />
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
