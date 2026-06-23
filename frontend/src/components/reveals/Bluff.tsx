/**
 * Bluff (Bunte-Tüte sub-mechanic) — Beamer-View-Familie.
 *
 * 7 Sub-Components fuer die 4 Bluff-Phasen (write → review → vote → reveal):
 *  - BluffBeamerView       — Top-Level-Router, mountet die richtige Sub-View je Phase
 *  - BluffRevealHero       — Reveal mit Punkte-Cascade + Konfetti
 *  - BluffTimer            — Inline-Timer fuer Write+Vote-Phasen
 *  - BluffWriteScreen      — Teams tippen Fake-Antworten
 *  - BluffReviewScreen     — Mod-Review der Bluff-Submissions
 *  - BluffVoteWaitingScreen — Teams voten auf Options (sicht-warten)
 *  - BluffVoteScreen       — Voting-Phase
 *
 * 2026-05-24 (Refactor #5.6): aus CozyQuizQuestionView.tsx extrahiert.
 * Groesster Reveal-Block der App (~900 Zeilen, 7 Sub-Components).
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { TeamNameLabel } from '../TeamNameLabel';
import { ConfettiOverlay } from '../CozyQuizConfettiOverlay';
import { Fireflies } from '../CozyQuizAmbient';
import { BeamerTimer } from '../CozyQuizBeamerTimer';
import { formatRevealedAnswer } from '../../cozyQuizShared';
import { getServerNow } from '../../utils/serverTime';
import {
  playAvatarCascadeNote, playClimaxFinish, playRevealHighlight,
  playWoodKnock, playWinnerCardReveal, playFanfare, playTick,
} from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';

// BluffBeamerView — Top-Level-Router fuer die 3 Phasen + Reveal:
//   write:  Frage + "Teams schreiben Bluffs" + Submission-Counter + Avatare ✓
//   review: Frage + Bluffs in einer Liste + ✕-Buttons (Moderator filtert)
//   vote:   Frage + Optionen mit Vote-Counter pro Option
//   reveal: Echte Antwort hervorgehoben + per-Option Avatare die gewaehlt haben
//           + per-Bluff-Box wer den Bluff geschrieben hat + Punktevergabe
export function BluffBeamerView({ state: s, lang, revealed }: {
  state: QQStateUpdate; lang: 'de' | 'en'; revealed: boolean;
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../../shared/quarterQuizTypes').QQBunteTueteBluff;
  const phase = s.bluffPhase;
  const accent = QQ_COLORS.brandPinkMid; // pink
  // realText 2026-05-05 entfernt — die Echte-Antwort wird in der neuen
  // Bluff-Tabelle als gruene Real-Card mit ✓ echt-Pille gezeigt, separate
  // Hero-Card war redundant.

  const submitCount = Object.keys(s.bluffSubmissions ?? {}).filter(id => s.bluffSubmissions[id]?.trim()).length;
  const totalActive = s.teams.filter(t => t.connected).length;
  const voteCount = Object.keys(s.bluffVotes ?? {}).length;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 2cqh, 24px)',
      padding: 'clamp(20px, 2.5cqh, 36px) clamp(24px, 3cqw, 48px) clamp(16px, 2cqh, 28px)',
      position: 'relative',
      // 2026-05-09 (Wolf 'gewinnercard bei bluff unten abgeschnitten'): outer
      // braucht min-height: 0 + overflow: hidden, sonst expandiert das innere
      // BluffVoteScreen-grid über die verfügbare Höhe und drückt die Sieger-
      // Card raus aus dem Beamer-Viewport.
      minHeight: 0, overflow: 'hidden',
    }}>
      <Fireflies color={`${accent}55`} />

      {/* 2026-05-19 (Wolf 'bluff hat anderen timer als die anderen kategorien
          keinen runden rechts oben'): Runder BeamerTimer-Ring rechts oben, wie
          bei Standard-Quiz + CHEESE-Reveal. Vorher: inline-Pille im Header
          (BluffTimer, jetzt deprecated). Position-fixed, dark Backdrop-Kreis
          fuer Kontrast. */}
      {!revealed && (phase === 'write' || phase === 'vote') && (() => {
        const ends = phase === 'write' ? s.bluffWriteEndsAt : s.bluffVoteEndsAt;
        if (!ends) return null;
        const duration = phase === 'write'
          ? (s.bluffWriteDurationSec ?? 60)
          : (s.bluffVoteDurationSec ?? 30);
        return (
          <div style={{
            position: 'fixed', top: 'var(--qq-safe-margin)', right: 'var(--qq-safe-margin)', zIndex: 70,
            animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.2s both',
            padding: 12, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(13,10,6,0.82) 55%, rgba(13,10,6,0.55) 78%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 22px rgba(0,0,0,0.45)',
          }}>
            <BeamerTimer endsAt={ends} durationSec={duration} accent={accent} />
          </div>
        );
      })()}

      {/* Header */}
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
          <span style={{ fontSize: 'clamp(20px, 2.2cqw, 30px)', lineHeight: 1 }}>🎭</span>
          <span style={{
            fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
            color: accent, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{lang === 'de' ? 'Bluff' : 'Bluff'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!revealed && phase && (
            <div style={{
              padding: '8px 16px', borderRadius: 999,
              background: 'var(--qq-surface)', border: '1.5px solid var(--qq-hairline)',
              fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900, color: 'var(--qq-text-muted)',
            }}>
              {/* 2026-05-05 (Wolf 'emojis vom style nicht passend, schwarz-weiss'):
                  📝 → ✍️ (bunte writing hand), 🗳 → 🎯 (bullseye, „triff
                  die echte"), 👮 → 🕵️ (Detective, passt thematisch zum
                  Bluff-Detection besser als Polizei-Emoji). */}
              {phase === 'write' && (lang === 'de' ? `✍️ Bluffs schreiben (${submitCount}/${totalActive})` : `✍️ Writing (${submitCount}/${totalActive})`)}
              {phase === 'review' && (lang === 'de' ? `🕵️ Moderator-Check` : `🕵️ Moderator check`)}
              {phase === 'vote' && (lang === 'de' ? `🎯 Abstimmen (${voteCount}/${totalActive})` : `🎯 Voting (${voteCount}/${totalActive})`)}
              {phase === 'reveal' && (lang === 'de' ? `🎉 Auflösung` : `🎉 Reveal`)}
            </div>
          )}
        </div>
      </div>

      {/* Frage — 2026-05-09 (Wolf-Konzept-D): kleiner als zuvor, damit Real-Card-
          Hero in der Mitte mehr Platz bekommt. Pre-Reveal bleibt sie groß
          (Frage ist da das Hauptelement), Reveal scaled sie down. */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both',
      }}>
        <div style={{
          fontSize: phase === 'reveal'
            ? 'clamp(22px, 2.4cqw, 38px)'
            : 'clamp(34px, 4cqw, 64px)',
          fontWeight: 900,
          color: 'var(--qq-card-text)', lineHeight: 1.2, maxWidth: 1100, margin: '0 auto',
          transition: 'font-size 0.5s ease',
        }}>
          {lang === 'en' && q.textEn ? q.textEn : q.text}
        </div>
      </div>

      {/* 2026-05-17 (Wolf 'bluff layout-struktur wirkt unruhig durch 3 phasen-
          wechsel'): Stabiler Frame mit Cross-Fade zwischen Phasen-Contents.
          Vorher: jede Phase rendert direkt unter Question-Card → harter Cut
          beim Wechsel write→review→vote→reveal. Jetzt: keyed Wrapper mit
          qqBluffPhaseFadeIn-Animation → smooth transition + flex:1-Frame
          gibt jedem Phase-Content den gleichen verfügbaren Platz. */}
      <style>{`
        @keyframes qqBluffPhaseFadeIn {
          0%   { opacity: 0; transform: translateY(10px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0)    scale(1);     }
        }
      `}</style>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: 0, position: 'relative', zIndex: 4,
      }}>
        <div
          key={`bluff-phase-${phase}`}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            minHeight: 0,
            animation: 'qqBluffPhaseFadeIn 0.45s cubic-bezier(0.2, 0.85, 0.3, 1) both',
          }}
        >
          {phase === 'write' && <BluffWriteScreen state={s} accent={accent} lang={lang} />}
          {phase === 'review' && <BluffReviewScreen state={s} accent={accent} lang={lang} />}
          {phase === 'vote' && <BluffVoteWaitingScreen state={s} accent={accent} lang={lang} />}
          {/* 2026-05-09 (Konzept-D Refactor): Reveal-Layout neu:
              1) Hero-Real-Card mittig (RIESIG, dominantes Element)
              2) Sieger-Banner direkt drunter (compact, eine Reihe)
              3) Mini-Bluff-Pills horizontal unten
              Alles in einer einzigen `BluffRevealHero`-Komponente. */}
          {phase === 'reveal' && <BluffRevealHero state={s} lang={lang} />}
        </div>
      </div>

    </div>
  );
}

// 2026-05-09 (Wolf-Konzept-D): Bluff-Reveal komplett neues Layout.
// - Hero-Real-Card riesig in der Mitte (echte Antwort als Star)
// - Sieger-Banner direkt drunter (Avatar + Name + Reinfälle-Pillen, kompakt)
// - Bluffs als horizontale Mini-Pills ganz unten (Author-Avatar + Bluff-Text + Voter-Dots)
export function BluffRevealHero({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const opts = s.bluffOptions ?? [];
  const realOpt = opts.find(o => o.source === 'real');
  const bluffOpts = opts.filter(o => o.source !== 'real');

  // Voters je Option für die Mini-Pills
  const votersByOption: Record<string, string[]> = {};
  for (const [teamId, optId] of Object.entries(s.bluffVotes ?? {})) {
    if (!votersByOption[optId]) votersByOption[optId] = [];
    votersByOption[optId].push(teamId);
  }

  // Sieger-Daten
  const winners = s.currentQuestionWinners ?? [];
  const winnerTeams = winners
    .map(id => s.teams.find(t => t.id === id))
    .filter(Boolean) as typeof s.teams;
  const winnerTeam = winnerTeams[0] ?? null;
  const isCoTie = winnerTeams.length > 1;
  const points = s.bluffPoints ?? {};
  const wPts = winnerTeam ? points[winnerTeam.id] : null;
  const breakdown: Array<{ icon: string; n: number; label: { de: string; en: string }; bg: string }> = [];
  if ((wPts?.foundReal ?? 0) > 0) breakdown.push({ icon: '✅', n: wPts!.foundReal, label: { de: 'echt', en: 'real' }, bg: 'rgba(34,197,94,0.20)' });
  if ((wPts?.blufferBonus ?? 0) > 0) breakdown.push({ icon: '🎭', n: wPts!.blufferBonus, label: { de: 'Reinfälle', en: 'fooled' }, bg: 'rgba(244,114,182,0.20)' });
  if ((wPts?.truthAccident ?? 0) > 0) breakdown.push({ icon: '✨', n: wPts!.truthAccident, label: { de: 'Glück', en: 'lucky' }, bg: 'rgba(236,72,153,0.22)' });

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 'clamp(16px, 2cqh, 28px)',
      width: '100%', position: 'relative', zIndex: 5,
      padding: '0 clamp(8px, 1.5cqw, 24px)',
    }}>
      {/* HERO: Real-Card mittig — riesig, grün, dominantes Element */}
      {realOpt && (
        <div style={{
          maxWidth: 'min(1300px, 92cqw)', width: '100%',
          padding: 'clamp(28px, 4cqh, 56px) clamp(36px, 4.5cqw, 72px)',
          borderRadius: 32,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.28) 0%, rgba(34,197,94,0.08) 100%)',
          border: '3px solid rgba(34,197,94,0.85)',
          boxShadow: '0 0 80px rgba(34,197,94,0.45), 0 14px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 1.4cqh, 18px)',
          animation: 'revealAnswerBam 0.7s var(--qq-ease-out-cubic) 0.15s both',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 16px', borderRadius: 999,
            background: 'rgba(34,197,94,0.35)', border: '1.5px solid #22C55E',
            fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
            color: QQ_COLORS.green300, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            ✓ {lang === 'de' ? 'Echte Antwort' : 'Real answer'}
          </div>
          <div style={{
            fontSize: 'clamp(36px, 5.6cqw, 88px)', fontWeight: 900,
            color: QQ_COLORS.green300, textAlign: 'center', lineHeight: 1.12,
            textShadow: '0 0 32px rgba(34,197,94,0.55)',
            letterSpacing: '-0.01em', maxWidth: '100%', wordBreak: 'break-word',
          }}>
            {realOpt.text}
          </div>
        </div>
      )}

      {/* SIEGER-BANNER direkt unter Hero — kompakt, eine Reihe */}
      {winnerTeam && (
        <div style={{
          maxWidth: 'min(1100px, 90cqw)',
          display: 'flex', alignItems: 'center', gap: 'clamp(14px, 1.8cqw, 24px)',
          padding: 'clamp(10px, 1.4cqh, 18px) clamp(20px, 2.4cqw, 36px)',
          borderRadius: 999,
          background: `linear-gradient(135deg, ${winnerTeam.color}33, ${winnerTeam.color}0d)`,
          border: `2.5px solid ${winnerTeam.color}cc`,
          boxShadow: `0 0 36px ${winnerTeam.color}66, 0 6px 18px rgba(0,0,0,0.5)`,
          animation: 'revealWinnerIn 0.55s var(--qq-ease-bounce) 0.5s both',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span style={{
            padding: '4px 12px', borderRadius: 999,
            background: `linear-gradient(135deg, ${winnerTeam.color}, ${winnerTeam.color}dd)`,
            fontSize: 'clamp(11px, 1.2cqw, 15px)', fontWeight: 900,
            color: '#0a1f0d', letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            🎉 {lang === 'de' ? 'Sieger' : 'Winner'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {winnerTeams.map((tm, idx) => (
              <QQTeamAvatar
                key={tm.id}
                avatarId={tm.avatarId}
                teamEmoji={tm.emoji}
                size={'clamp(44px, 4.6cqw, 64px)'}
                style={{
                  boxShadow: `0 0 16px ${tm.color}88, 0 0 0 2px rgba(15,23,42,0.6)`,
                  marginLeft: idx === 0 ? 0 : 'clamp(-10px, -1cqw, -6px)',
                  zIndex: winnerTeams.length - idx,
                }}
              />
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            {isCoTie ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {winnerTeams.map(tm => (
                  <TeamNameLabel
                    key={tm.id}
                    name={tm.name}
                    maxLines={1}
                    shrinkAfter={18}
                    color={tm.color}
                    fontWeight={900}
                    fontSize="clamp(15px, 1.6cqw, 22px)"
                    style={{ lineHeight: 1.15 }}
                  />
                ))}
              </div>
            ) : (
              <TeamNameLabel
                name={winnerTeam.name}
                maxLines={1}
                shrinkAfter={18}
                color={winnerTeam.color}
                fontWeight={900}
                fontSize="clamp(20px, 2.2cqw, 30px)"
                style={{ lineHeight: 1.1 }}
              />
            )}
          </div>
          {breakdown.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {breakdown.map((b, i) => (
                <span key={i} title={`${b.n} × ${b.label[lang]}`} style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: b.bg,
                  fontSize: 'clamp(13px, 1.4cqw, 17px)', fontWeight: 900, color: 'var(--qq-card-text)',
                  whiteSpace: 'nowrap',
                }}>
                  {b.icon} {b.n}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MINI-BLUFF-PILLS horizontal — Author-Avatar + Bluff-Text + Voter-Dots */}
      {bluffOpts.length > 0 && (
        <div style={{
          width: '100%', maxWidth: 'min(1500px, 96cqw)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8,
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
            color: 'var(--qq-text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase',
            opacity: 0.75,
          }}>
            🎭 {lang === 'de' ? 'Die Bluffs' : 'The bluffs'}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 'clamp(8px, 1cqw, 14px)',
            width: '100%',
          }}>
            {bluffOpts.map((opt, i) => {
              const contribIds = opt.source === 'team' ? opt.contributors : [];
              const authorTeam = contribIds[0] ? s.teams.find(t => t.id === contribIds[0]) : null;
              const extraAuthors = contribIds.length > 1 ? contribIds.length - 1 : 0;
              const voters = votersByOption[opt.id] ?? [];
              const cardColor = authorTeam?.color ?? QQ_COLORS.slate500;
              return (
                <div key={opt.id} style={{
                  display: 'inline-flex', alignItems: 'center',
                  gap: 'clamp(8px, 1cqw, 14px)',
                  padding: '8px 16px 8px 10px',
                  borderRadius: 999,
                  background: `${cardColor}1a`,
                  border: `1.5px solid ${cardColor}66`,
                  boxShadow: `0 4px 12px rgba(0,0,0,0.35), 0 0 12px ${cardColor}22`,
                  animation: `contentReveal 0.5s var(--qq-ease-out-cubic) ${0.7 + i * 0.08}s both`,
                  maxWidth: 'min(440px, 90cqw)',
                }}>
                  {/* Author-Avatar */}
                  {authorTeam && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                      position: 'relative',
                    }}>
                      <QQTeamAvatar
                        avatarId={authorTeam.avatarId} teamEmoji={authorTeam.emoji}
                        size={'clamp(28px, 2.8cqw, 38px)'}
                        style={{
                          boxShadow: `0 0 8px ${authorTeam.color}77, 0 0 0 2px rgba(15,23,42,0.55)`,
                        }}
                      />
                      {extraAuthors > 0 && (
                        <span style={{
                          position: 'absolute', right: -6, bottom: -4,
                          background: '#0A0814', border: `1.5px solid ${authorTeam.color}`,
                          borderRadius: 999, padding: '1px 5px',
                          fontSize: 9, fontWeight: 900, color: authorTeam.color,
                          lineHeight: 1.1,
                        }}>+{extraAuthors}</span>
                      )}
                    </div>
                  )}
                  {/* Bluff-Text */}
                  <span style={{
                    fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 800,
                    color: 'var(--qq-card-text)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    minWidth: 0, flex: 1,
                  }}>{opt.text}</span>
                  {/* Voter-Dots — kleine Avatare derer die für DIESEN Bluff gestimmt haben */}
                  {voters.length > 0 && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 0,
                      paddingLeft: 8, marginLeft: 4,
                      borderLeft: `1px dashed ${cardColor}55`,
                      flexShrink: 0,
                    }}>
                      {voters.slice(0, 4).map((vid, vi) => {
                        const tm = s.teams.find(t => t.id === vid);
                        if (!tm) return null;
                        return (
                          <QQTeamAvatar
                            key={vid}
                            avatarId={tm.avatarId} teamEmoji={tm.emoji}
                            size={'clamp(20px, 2cqw, 28px)'}
                            title={tm.name}
                            style={{
                              boxShadow: `0 0 0 1.5px ${tm.color}, 0 0 0 3px rgba(10,8,20,0.85)`,
                              marginLeft: vi === 0 ? 0 : -8,
                              zIndex: voters.length - vi,
                            }}
                          />
                        );
                      })}
                      {voters.length > 4 && (
                        <span style={{
                          marginLeft: 4,
                          fontSize: 11, fontWeight: 900, color: 'var(--qq-text-muted)',
                        }}>+{voters.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function BluffTimer({ endsAt, accent }: { endsAt: number; accent: string }) {
  // 2026-05-19: getServerNow statt Date.now (siehe utils/serverTime.ts).
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - getServerNow()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => setRemaining(Math.max(0, (endsAt - getServerNow()) / 1000)), 250);
    return () => clearInterval(iv);
  }, [endsAt]);
  const sec = Math.ceil(remaining);
  const urgent = sec <= 10;
  return (
    <div style={{
      padding: '8px 18px', borderRadius: 999,
      background: urgent ? 'rgba(239,68,68,0.22)' : `${accent}22`,
      border: `2px solid ${urgent ? QQ_COLORS.red500 : `${accent}55`}`,
      fontSize: 'clamp(18px, 2cqw, 26px)', fontWeight: 900,
      color: urgent ? QQ_COLORS.red300 : '#F8FAFC', fontVariantNumeric: 'tabular-nums',
      animation: urgent ? 'pulse 0.8s ease-in-out infinite alternate' : undefined,
    }}>
      ⏱ {sec}s
    </div>
  );
}

export function BluffWriteScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      position: 'relative', zIndex: 5,
    }}>
      <div style={{
        fontSize: 'clamp(60px, 8cqw, 110px)',
        animation: 'cfloat 4s ease-in-out infinite',
      }}>✍️</div>
      <div style={{
        fontSize: 'clamp(22px, 2.4cqw, 34px)', fontWeight: 900,
        color: QQ_COLORS.yellow300, textAlign: 'center', lineHeight: 1.3, maxWidth: 1000,
      }}>
        {lang === 'de'
          ? 'Erfindet eine plausible Falsch-Antwort auf eurem Handy!'
          : 'Make up a plausible wrong answer on your phone!'}
      </div>
      {/* Avatar-Reihe — wer hat schon submitted?
          2026-05-12 (Wolf 'footer-avatare einheitlich, glow weg, etwas
          groesser'): Sizes auf 80/88/96 wie der generische BT-Footer
          gehoben, drop-shadow-Glow raus — gruener Ring via boxShadow
          zeigt 'submitted' eindeutig. */}
      {(() => {
        const tc = s.teams.length;
        const av = tc > 6 ? 80 : tc > 4 ? 88 : 96;
        const gap = tc > 6 ? 12 : tc > 4 ? 15 : 18;
        return (
          <div style={{
            display: 'flex', gap, flexWrap: 'wrap',
            justifyContent: 'center', marginTop: 12,
          }}>
            {s.teams.map(tm => {
              const submitted = !!(s.bluffSubmissions ?? {})[tm.id]?.trim();
              // 2026-05-25 (Wolf 'green-ring pattern wie final-betting'):
              // Wrapper-Div mit 6px gap + light-green BG → dezenter dunkler
              // Separator zwischen Team-Farbe und Aussen-Ring (klappt auch bei
              // gruenen Teams). Aus boxShadow 0 0 0 3px migrate.
              return (
                <div key={tm.id} title={tm.name} style={{
                  width: av + 12, height: av + 12, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: submitted ? 'rgba(34,197,94,0.18)' : 'transparent',
                  border: submitted ? '3px solid #22C55E' : `3px solid ${tm.color}55`,
                  boxShadow: submitted ? '0 0 24px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.25)' : '0 4px 10px rgba(0,0,0,0.55)',
                  opacity: submitted ? 1 : 0.55,
                  filter: submitted ? 'none' : 'grayscale(0.4)',
                  transition: 'all 0.45s ease',
                }}>
                  <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={av} />
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

export function BluffReviewScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  void accent;
  const submissions = Object.entries(s.bluffSubmissions ?? {}).filter(([, t]) => t?.trim());
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      position: 'relative', zIndex: 5,
      padding: 'clamp(16px, 2cqh, 28px)',
    }}>
      <div style={{
        fontSize: 'clamp(18px, 2cqw, 26px)', fontWeight: 900,
        color: 'var(--qq-text-muted)', textAlign: 'center',
      }}>
        {lang === 'de'
          ? '🕵️ Moderator prüft die Bluffs… Bluffs werden für die Spieler nicht angezeigt.'
          : '🕵️ Moderator reviewing bluffs… not visible to players.'}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10, width: '100%', maxWidth: 1100,
      }}>
        {submissions.map(([teamId, text]) => {
          const tm = s.teams.find(t => t.id === teamId);
          const rejected = (s.bluffRejected ?? []).includes(teamId);
          return (
            <div key={teamId} style={{
              padding: '10px 14px', borderRadius: 16,
              background: rejected ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${rejected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
              opacity: rejected ? 0.6 : 1,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tm && <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={20} />}
                <span style={{
                  fontSize: 11, fontWeight: 900, color: tm?.color ?? QQ_COLORS.slate400,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>{tm?.name ?? teamId}</span>
                {rejected && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: QQ_COLORS.red300, fontWeight: 900 }}>
                    {lang === 'de' ? 'abgelehnt' : 'rejected'}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: rejected ? QQ_COLORS.red300 : QQ_COLORS.slate100,
                textDecoration: rejected ? 'line-through' : undefined,
                wordBreak: 'break-word',
              }}>{text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vote-Phase auf dem Beamer: KEINE Optionen anzeigen (jedes Team sieht ein
 * eigenes Random-4-Subset auf seinem Phone). Stattdessen großes Voting-
 * Spannungs-Banner + Avatare mit ✓-Status pro Submit.
 */
export function BluffVoteWaitingScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  const totalActive = s.teams.filter(t => t.connected).length;
  const voted = Object.keys(s.bluffVotes ?? {}).length;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      position: 'relative', zIndex: 5,
    }}>
      <div style={{
        fontSize: 'clamp(60px, 8cqw, 110px)',
        animation: 'cfloat 4s ease-in-out infinite',
      }}>🎯</div>
      <div style={{
        fontSize: 'clamp(22px, 2.4cqw, 34px)', fontWeight: 900,
        color: QQ_COLORS.yellow300, textAlign: 'center', lineHeight: 1.3, maxWidth: 1000,
      }}>
        {lang === 'de'
          ? 'Welche Antwort ist die echte? Tippt auf eurem Handy!'
          : 'Which answer is real? Tap on your phone!'}
      </div>
      <div style={{
        padding: '8px 22px', borderRadius: 999,
        background: `${accent}22`, border: `2px solid ${accent}55`,
        fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900, color: 'var(--qq-accent-soft)',
      }}>
        {lang === 'de' ? `${voted} / ${totalActive} Teams haben gewählt` : `${voted} / ${totalActive} teams voted`}
      </div>
      {/* Avatar-Reihe — wer hat schon gewählt? */}
      <div style={{
        display: 'flex', gap: 'clamp(12px, 1.6cqw, 22px)', flexWrap: 'wrap',
        justifyContent: 'center', marginTop: 12,
      }}>
        {s.teams.map(tm => {
          const voted = !!(s.bluffVotes ?? {})[tm.id];
          // 2026-05-25 (Wolf 'green-ring pattern wie final-betting'):
          // Wrapper-Pattern statt direct boxShadow, fuer konsistentem
          // Gap-Separator zwischen Team-Color und green Ring.
          const avSize = 'clamp(56px, 6cqw, 84px)';
          return (
            <div key={tm.id} title={tm.name} style={{
              padding: 6, borderRadius: '50%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: voted ? 'rgba(34,197,94,0.18)' : 'transparent',
              border: voted ? '3px solid #22C55E' : `3px solid ${tm.color}55`,
              boxShadow: voted ? '0 0 24px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.25)' : '0 4px 10px rgba(0,0,0,0.55)',
              opacity: voted ? 1 : 0.55,
              filter: voted ? 'none' : 'grayscale(0.4)',
              transition: 'all 0.45s ease',
            }}>
              <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avSize} />
            </div>
          );
        })}
      </div>
      <div style={{
        fontSize: 'clamp(11px, 1cqw, 13px)', fontWeight: 700,
        color: 'var(--qq-text-muted)', textAlign: 'center', marginTop: 8, opacity: 0.8,
        maxWidth: 700, lineHeight: 1.5,
      }}>
        {lang === 'de'
          ? 'Jedes Team sieht 4 zufällige Antworten — auch die echte. Kein Spickeln vom Beamer!'
          : 'Each team sees 4 random answers — including the real one. No peeking!'}
      </div>
    </div>
  );
}

export function BluffVoteScreen({ state: s, accent, lang, revealed }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en'; revealed: boolean;
}) {
  void accent;
  const opts = s.bluffOptions ?? [];
  // pro Option: welche Teams haben gewählt?
  const votersByOption: Record<string, string[]> = {};
  for (const [teamId, optId] of Object.entries(s.bluffVotes ?? {})) {
    if (!votersByOption[optId]) votersByOption[optId] = [];
    votersByOption[optId].push(teamId);
  }

  // 2026-05-05 v2 (Wolf-Konzept): Reveal-Layout = GRID mit den neuen Card-Stilen.
  // - 1/2/3 Spalten je nach Antwort-Anzahl
  // - Card-BG = Team-Farbe des Bluff-Authors (Real-Card = grün)
  // - Author-Avatar als halbtransparenter Watermark im BG
  // - Pro Card vertikal: [Letter+Antwort+Pille] obere Reihe, [Voter-Avatare] untere Reihe
  // - Sieger-Card kommt im Parent UNTER der Grid (siehe BluffBeamerView)
  if (revealed) {
    const cols = opts.length >= 6 ? 3 : opts.length >= 4 ? 2 : 1;
    return (
      <div style={{
        // 2026-05-09 (Wolf 'gewinnercard bluff abgeschnitten'): flex 1 1 0 +
        // min-height: 0 + overflow: hidden, damit das Grid bei wenig Platz
        // schrumpft und Sieger-Card unten sichtbar bleibt.
        flex: '1 1 0', minHeight: 0, overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 'clamp(10px, 1.4cqh, 18px)',
        maxWidth: cols === 3 ? 1500 : cols === 2 ? 1200 : 900,
        width: '100%', margin: '0 auto',
        position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.15s both',
      }}>
        {opts.map((opt, i) => {
          const isReal = opt.source === 'real';
          const voters = votersByOption[opt.id] ?? [];
          const contribIds = opt.source === 'team' ? opt.contributors : [];
          const authorTeam = !isReal && contribIds[0]
            ? s.teams.find(t => t.id === contribIds[0])
            : null;
          const extraAuthors = !isReal && contribIds.length > 1
            ? contribIds.length - 1
            : 0;
          const cardColor = isReal ? QQ_COLORS.green500 : (authorTeam?.color ?? QQ_COLORS.slate500);
          return (
            <div key={opt.id} style={{
              position: 'relative',
              overflow: 'hidden',
              padding: 'clamp(12px, 1.6cqh, 22px) clamp(16px, 2cqw, 28px)',
              borderRadius: 18,
              background: isReal
                ? `linear-gradient(135deg, ${cardColor}33 0%, ${cardColor}10 100%)`
                : `linear-gradient(135deg, ${cardColor}3a 0%, ${cardColor}10 100%)`,
              border: `2px solid ${cardColor}${isReal ? 'cc' : '99'}`,
              boxShadow: isReal
                ? `0 0 28px ${cardColor}33, 0 6px 16px rgba(0,0,0,0.4)`
                : `0 0 18px ${cardColor}28, 0 6px 14px rgba(0,0,0,0.4)`,
              display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 0.8cqh, 10px)',
              // 2026-05-05 (Wolf): minHeight reduziert (110-170 → 90-130) damit
              // leere Cards nicht so viel toten Platz unten haben — gewonnener
              // Raum geht an die Sieger-Card unten.
              minHeight: 'clamp(90px, 11cqh, 130px)',
              // 2026-05-07 (Audit P2): phasePop (scale-bounce) skalierte den
              // Watermark-Avatar mit, der schon halbtransparent ist und den
              // doppelten Bounce sichtbar machte. contentReveal (sanftes Slide+
              // Fade) ist jetzt quizweit konsistent (siehe OnlyConnect-Hints,
              // Wolf-Entscheidung 2026-05-06).
              animation: `contentReveal 0.55s var(--qq-ease-out-cubic) ${0.3 + i * 0.08}s both`,
            }}>
              {/* Author-Avatar als BG-Watermark — gross, halbtransparent, hinter
                  dem ganzen Card-Inhalt. Gibt das „Owner-Stempel"-Feeling. */}
              {!isReal && authorTeam && (
                // 2026-05-05 (Wolf-Polish 'emoji groesse + transparenz anpassen'):
                // 14cqw → 17cqw (groesser), opacity 0.18 → 0.14 (dezenter), blur
                // 1.5 → 0.5 (klarer aber durch opacity weiter im BG).
                <div aria-hidden style={{
                  position: 'absolute',
                  right: 'clamp(-16px, -2cqw, -36px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 'clamp(150px, 17cqw, 240px)',
                  height: 'clamp(150px, 17cqw, 240px)',
                  opacity: 0.14,
                  filter: 'blur(0.5px)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <QQTeamAvatar avatarId={authorTeam.avatarId} teamEmoji={authorTeam.emoji} size="100%" flat />
                </div>
              )}

              {/* Top-Row: Letter + Antwort + Pille */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.2cqw, 16px)',
                position: 'relative', zIndex: 2,
              }}>
                <span style={{
                  width: 'clamp(28px, 3cqw, 38px)', height: 'clamp(28px, 3cqw, 38px)',
                  borderRadius: '50%',
                  background: cardColor,
                  color: '#0a1f0d',
                  fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}>{String.fromCharCode(65 + i)}</span>

                <span style={{
                  flex: 1, minWidth: 0,
                  fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900,
                  color: isReal ? QQ_COLORS.green300 : '#F8FAFC',
                  wordBreak: 'break-word', lineHeight: 1.18,
                  textShadow: isReal
                    ? '0 0 14px rgba(34,197,94,0.4)'
                    : '0 1px 3px rgba(0,0,0,0.5)',
                }}>{opt.text}</span>

                {isReal ? (
                  <span style={{
                    padding: '4px 12px', borderRadius: 999,
                    background: 'rgba(34,197,94,0.3)', border: '1.5px solid #22C55E',
                    fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900, color: QQ_COLORS.green300,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    ✓ {lang === 'de' ? 'echt' : 'real'}
                  </span>
                ) : authorTeam ? (
                  <span style={{
                    padding: '4px 12px', borderRadius: 999,
                    background: `${authorTeam.color}28`, border: `1.5px solid ${authorTeam.color}aa`,
                    fontSize: 'clamp(10px, 1.05cqw, 13px)', fontWeight: 900, color: authorTeam.color,
                    whiteSpace: 'nowrap', flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    maxWidth: '60%',
                  }}>
                    <QQEmojiIcon emoji="🎭"/>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {authorTeam.name}{extraAuthors > 0 ? ` +${extraAuthors}` : ''}
                    </span>
                  </span>
                ) : null}
              </div>

              {/* Bottom-Row: Voter-Avatare die diese Antwort gewählt haben.
                  Reservierte Höhe damit Cards ohne Voters genauso hoch sind.
                  2026-05-06 v3 (Wolf 'avatare immernoch mini'): minHeight an
                  70-110px Avatar-Groesse angepasst. */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.1cqw, 18px)',
                flexWrap: 'wrap',
                position: 'relative', zIndex: 2,
                paddingTop: voters.length > 0 ? 'clamp(6px, 0.8cqh, 10px)' : 0,
                borderTop: voters.length > 0 ? '1px dashed rgba(255,255,255,0.16)' : 'none',
                minHeight: 'clamp(76px, 7.5cqw, 116px)',
              }}>
                {voters.length > 0 ? (
                  <>
                    <span style={{
                      // 2026-05-05 (Wolf 'Wählten/keine Stimmen etwas groesser'):
                      // 10-12px → 14-19px. Aus Pub-Distanz lesbar.
                      fontSize: 'clamp(14px, 1.4cqw, 19px)', fontWeight: 900,
                      color: 'var(--qq-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginRight: 6,
                    }}>
                      {lang === 'de' ? 'Wählten' : 'Voted'}
                    </span>
                    {voters.map((vid, vIdx) => {
                      const tm = s.teams.find(t => t.id === vid);
                      if (!tm) return null;
                      return (
                        <div key={vid} title={tm.name} style={{
                          position: 'relative',
                          animation: `phasePop 0.5s var(--qq-ease-bounce) ${0.45 + i * 0.08 + vIdx * 0.06}s both`,
                        }}>
                          {/* 2026-05-06 v3 (Wolf 'avatare auf den cards sind
                              immernoch mini auch nach 3 Bugfixes'): nochmal
                              deutlich groesser auf 70-110px. flex-wrap im
                              Parent erlaubt 2-Reihen-Layout bei vielen Voters. */}
                          <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(70px, 7cqw, 110px)'} style={{
                            boxShadow: isReal
                              ? `0 0 0 3px #22C55E, 0 0 22px rgba(34,197,94,0.6)`
                              : `0 0 0 2.5px ${tm.color}, 0 0 18px ${tm.color}77`,
                            opacity: 0.95,
                          }} />
                          {isReal && (
                            <span aria-hidden style={{
                              position: 'absolute', top: -5, right: -5,
                              width: 18, height: 18, borderRadius: '50%',
                              background: QQ_COLORS.green500, border: '2px solid #0A0814',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 900, color: 'var(--qq-card-text)', lineHeight: 1,
                            }}>✓</span>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <span style={{
                    // 2026-05-05 (Wolf): 10-12px → 14-18px.
                    fontSize: 'clamp(14px, 1.3cqw, 18px)', fontWeight: 700,
                    color: 'rgba(148,163,184,0.55)', letterSpacing: '0.06em',
                    fontStyle: 'italic',
                  }}>
                    {lang === 'de' ? 'keine Stimmen' : 'no votes'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vote-Phase (nicht-revealed): bleibt beim alten Grid-Layout.
  const cols = opts.length >= 6 ? 3 : opts.length >= 4 ? 2 : 1;
  return (
    <div style={{
      flex: 1, display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 'clamp(8px, 1cqw, 14px)',
      maxWidth: cols === 3 ? 1400 : 1100, width: '100%', margin: '0 auto',
      position: 'relative', zIndex: 5,
      animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.15s both',
    }}>
      {opts.map((opt, i) => {
        const voters = votersByOption[opt.id] ?? [];
        return (
          <div key={opt.id} style={{
            padding: 'clamp(12px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
            borderRadius: 16,
            background: 'var(--qq-surface)',
            border: '1.5px solid var(--qq-hairline)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--qq-surface)',
                color: 'var(--qq-text-muted)',
                fontSize: 13, fontWeight: 900,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <span style={{
                flex: 1, fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 900,
                color: 'var(--qq-card-text)', wordBreak: 'break-word',
              }}>{opt.text}</span>
            </div>
            {voters.length > 0 && (
              <div style={{
                fontSize: 11, fontWeight: 900, color: 'var(--qq-text-muted)',
                letterSpacing: '0.04em',
              }}>
                {voters.length} {lang === 'de' ? 'Stimme(n)' : 'vote(s)'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
