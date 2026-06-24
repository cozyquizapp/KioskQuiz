/**
 * SchaetzchenReveal — Top5-Style Auflösung für Schätzchen-Kategorie.
 *
 * Layout: oben Frage (volle Breite), darunter links Lösung+Gewinner-Cards,
 * rechts Top-5 Teams (max 5, nach Distanz sortiert). Bottom-up-Cascade
 * #5 → #4 → … → #1 mit Sound pro Row.
 *
 * 2026-05-24 (Refactor #5 von 5 — CozyQuizQuestionView-Splitting): aus
 * der 6.467-Zeilen God-File CozyQuizQuestionView.tsx extrahiert.
 * Pattern fuer weitere Extraktionen (Top5, Order, Bluff, OnlyConnect,
 * CozyGuessr) sieht so aus: 1 File pro Kategorie-Reveal in components/
 * reveals/, importiert aus CozyQuizQuestionView.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { TeamNameLabel } from '../TeamNameLabel';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { isThemed, useActiveThemeId, getSolveCardStyle, getEmptyCardStyle, themedWindow } from '../../qqTheme';

export function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  // Jahreszahlen (Unit enthaelt "Jahr"/"year" ODER Wert sieht wie Jahr aus)
  // OHNE Tausenderpunkt formatieren — sonst stehen Werte wie 1500 als '1.500'
  // da, was wie 1.5 aussieht und falsch ist.
  const unitStr = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
  const looksLikeYear = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
  // 2026-05-07: explizites isYearAnswer-Flag mit Vorrang.
  const isYearUnit = !!q.isYearAnswer || /jahr|year/i.test(unitStr) || (target != null && looksLikeYear(target));

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (isYearUnit) return String(Math.round(n));
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // Parse + Distanz. Sort: bester (geringste |Δ|) zuerst, bei Delta-Tie → schnellste Einreichung gewinnt.
  const ranked = useMemo(() => {
    return s.answers
      .map(a => {
        const num = Number(String(a.text).replace(/[^0-9.,\-]/g, '').replace(',', '.'));
        const team = s.teams.find(t => t.id === a.teamId);
        if (!team || !Number.isFinite(num)) return null;
        return { teamId: a.teamId, num, team, delta: Math.abs(num - target), submittedAt: a.submittedAt };
      })
      .filter((x): x is { teamId: string; num: number; team: NonNullable<ReturnType<typeof s.teams.find>>; delta: number; submittedAt: number } => !!x)
      .sort((a, b) => a.delta - b.delta || a.submittedAt - b.submittedAt);
  }, [s.answers, s.teams, target]);

  // Max 5 Teams rechts; Bottom-up Enthüllung (#5 → #4 → … → #1).
  const top5 = ranked.slice(0, 5);
  const n = top5.length;
  const winner = ranked[0] ?? null;

  // 2026-05-23 (Live-Test-Bug #E): Tie-Group-Logik wie bei CozyGuessrReveal —
  // bei gleichem Δ (z.B. 2002 vs 2004 für Target 2003) zeigt der schnellere
  // ein „⚡ zuerst"-Marker, die langsameren ein „+x.x s". Sonst wurde der
  // 2.-Platz-Reveal als „verdient" wahrgenommen, obwohl's reiner Speed-Tiebreak war.
  const tieGroups: Record<string, number> = {};
  const tieEarliest: Record<string, number> = {};
  ranked.forEach(r => {
    const k = String(r.delta);
    tieGroups[k] = (tieGroups[k] ?? 0) + 1;
    if (tieEarliest[k] == null || r.submittedAt < tieEarliest[k]) tieEarliest[k] = r.submittedAt;
  });

  // 2026-05-03 (Wolf-Bug 'Schaetzchen Cascade-Sound aber alle Avatare gleichzeitig'):
  // Initial-State auf n-fest-init brach bei Race: wenn Component mountet bevor
  // Answers eintreffen → n=0 → revealedMinIdx=0 → alle Rows sofort sichtbar
  // (idx>=0 immer true). Sound wurde aber im setTimeout-Closure mit neuem n
  // korrekt cascadet → nur visuell defekt. Fix: useEffect-deps=[n] + StartedRef
  // damit Cascade einmalig startet sobald n erstmals >0 wird.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 1600;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n); // alle Rows initial verstecken
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cascadeTotal = n + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const isTopRow = i === n - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          try { playAvatarCascadeNote(i, cascadeTotal); } catch {}
          if (isTopRow) {
            // 2026-05-17 P4: Top-Row bekommt ClimaxFinish-Akkord wie MUCHO/
            // ZVZ/CHEESE als Krönung.
            // 2026-05-23 (Wolf 'komischer sound bei schätzchen reveal'):
            // playRevealHighlight() entfernt — feuerte simultan mit
            // playClimaxFinish() in unterschiedlicher Tonart (G-Dur vs
            // C-Dur) → Akkord-Crash. ClimaxFinish reicht als Climax allein.
            try { playClimaxFinish(); } catch {}
          }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId(); // Re-render bei Skin-Wechsel (Showroom-Preview)
  const themed = isThemed();
  const solve = getSolveCardStyle();
  const empty = getEmptyCardStyle();

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(12px, 1.6cqh, 20px)',
      padding: 'clamp(14px, 1.8cqh, 24px) clamp(20px, 3cqw, 48px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both',
      minHeight: 0,
    }}>
      {/* ── Zeile 1: Frage über ganze Breite (Top-5-Style) ── */}
      <div style={{
        background: themed ? 'var(--qq-card-bg)' : 'var(--qq-surface)',
        border: themed ? 'var(--qq-card-border)' : '2px solid var(--qq-hairline)',
        borderRadius: themed ? 'var(--qq-card-radius)' : 24,
        padding: 'clamp(14px, 1.8cqh, 22px) clamp(22px, 2.6cqw, 42px)',
        boxShadow: themed ? 'var(--qq-card-shadow)' : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: themed ? 'var(--qq-accent)' : QQ_COLORS.yellow500,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
        }}>
          <QQEmojiIcon emoji="🎯"/> {lang === 'en' ? 'Guess It — Reveal' : 'Schätzchen — Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(26px, 2.6cqw, 40px)' : 'clamp(30px, 3.2cqw, 52px)',
          fontWeight: 900, lineHeight: 1.18, color: 'var(--qq-card-text)',
          textAlign: 'center', minWidth: 0,
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Zeile 2: Grid — links Lösung + Gewinner, rechts Top 5 ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 'clamp(16px, 2.4cqw, 32px)',
        minHeight: 0,
      }}>
        {/* Linke Spalte: 2 separate Cards — Lösung (gruen umrandet) oben,
            Gewinner (in Teamfarbe umrandet) unten. */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 'clamp(10px, 1.4cqh, 18px)',
          minHeight: 0, minWidth: 0,
        }}>
          {/* Loesung — obere Card. Grün als Semantik, aber im Karten-Stil des
              aktiven Skins (getSolveCardStyle: Cozy-Glow / Mono-Hard-Shadow /
              Soft-Pop-soft / Neo-Block). */}
          <div style={{
            flex: '1 1 0', minHeight: 0,
            borderRadius: solve.radius,
            background: solve.bg,
            border: solve.border,
            boxShadow: solve.shadow,
            animation: 'revealAnswerBam 0.6s var(--qq-ease-out-cubic) 0.2s both',
            padding: 'clamp(14px, 1.8cqh, 24px) clamp(18px, 2cqw, 30px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Shimmer-Sweep */}
            <div style={{
              position: 'absolute', top: 0, width: '60%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
              animation: 'revealShimmer 0.9s ease 0.55s both',
              pointerEvents: 'none',
            }} />
            <div style={{
              fontSize: 'clamp(12px, 1.2cqw, 18px)', fontWeight: 900, color: solve.fg,
              letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.82,
              position: 'relative', zIndex: 1,
            }}>
              {lang === 'en' ? 'Answer' : 'Lösung'}
            </div>
            <div style={{
              fontSize: 'clamp(64px, 8cqw, 140px)',
              fontWeight: 900, color: solve.fg, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              textShadow: themed ? 'none' : '0 0 40px rgba(34,197,94,0.5)',
              position: 'relative', zIndex: 1,
            }}>
              {fmt(target)}
            </div>
          </div>

          {/* Winner — untere Card, in Teamfarbe umrandet */}
          {winner && (
            <div style={{
              flex: '1 1 0', minHeight: 0,
              borderRadius: 24,
              border: `3px solid ${winner.team.color}`,
              background: `linear-gradient(180deg, ${winner.team.color}26, ${winner.team.color}08)`,
              boxShadow: `0 0 44px ${winner.team.color}44, inset 0 0 26px ${winner.team.color}11`,
              padding: 'clamp(14px, 1.8cqh, 24px) clamp(18px, 2.2cqw, 32px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px, 1.2cqh, 16px)',
              minWidth: 0,
              opacity: revealedMinIdx === 0 ? 1 : 0.12,
              filter: revealedMinIdx === 0 ? 'none' : 'blur(18px) saturate(0.4)',
              transition: 'opacity 0.7s ease, filter 0.7s ease',
              position: 'relative',
            }}>
              <span style={{
                fontSize: 'clamp(10px, 0.9cqw, 13px)', fontWeight: 900,
                color: winner.team.color, letterSpacing: '0.1em', textTransform: 'uppercase',
                opacity: 0.92, whiteSpace: 'nowrap',
              }}>
                <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest' : 'Am nächsten dran'}
              </span>

              <div style={{
                fontSize: 'clamp(64px, 8cqw, 140px)',
                fontWeight: 900, color: winner.team.color, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 40px ${winner.team.color}55`,
                animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s var(--qq-ease-bounce) 0.3s both' : 'none',
              }}>
                {fmt(winner.num)}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 'clamp(10px, 1.2cqw, 18px)',
                flexWrap: 'wrap', minWidth: 0,
              }}>
                <QQTeamAvatar avatarId={winner.team.avatarId} teamEmoji={winner.team.emoji} size={'clamp(48px, 5cqw, 72px)'} style={{
                  flexShrink: 0,
                  boxShadow: `0 0 22px ${winner.team.color}88`,
                  animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                }} />
                <div style={{
                  padding: 'clamp(6px, 0.9cqh, 10px) clamp(14px, 1.8cqw, 22px)',
                  borderRadius: 16,
                  background: `${winner.team.color}22`,
                  border: `2px solid ${winner.team.color}66`,
                  boxShadow: `0 0 18px ${winner.team.color}33`,
                  maxWidth: 'min(50cqw, 480px)',
                  textShadow: `0 0 22px ${winner.team.color}55`,
                }}>
                  <TeamNameLabel
                    name={winner.team.name}
                    withTeamPrefix
                    maxLines={2}
                    shrinkAfter={18}
                    fontSize="clamp(20px, 2.2cqw, 36px)"
                    color={winner.team.color}
                    fontWeight={900}
                    style={{ textAlign: 'center', lineHeight: 1.1 }}
                  />
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 6,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: winner.delta === 0 ? 'rgba(34,197,94,0.22)' : `${winner.team.color}22`,
                  border: winner.delta === 0 ? '2px solid rgba(34,197,94,0.6)' : `2px solid ${winner.team.color}55`,
                  fontSize: 'clamp(16px, 1.7cqw, 26px)', fontWeight: 900,
                  color: winner.delta === 0 ? QQ_COLORS.green300 : 'var(--qq-card-text)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                }}>
                  {winner.delta === 0
                    ? (lang === 'en' ? '✨ exact!' : '✨ genau!')
                    : `Δ ${fmt(winner.delta)}`}
                </div>
              </div>
            </div>
          )}
          {!winner && (
            <div style={{
              flex: '1 1 0', minHeight: 0,
              borderRadius: empty.radius,
              background: empty.bg,
              border: empty.border,
              boxShadow: empty.shadow,
              padding: 'clamp(14px, 1.8cqh, 24px) clamp(18px, 2.2cqw, 32px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900, color: empty.fg,
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
        </div>

        {/* Rechte Spalte: Top 5 Ranking (bottom-up enthüllt) */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2cqh, 14px)',
          minHeight: 0, minWidth: 0,
        }}>
          {top5.map((r, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const isTop = rank === 1;
            const isInRangeWinner = !isTop && (s.currentQuestionWinners ?? []).includes(r.teamId);
            const rankGradient = rank === 1
              ? (themed ? 'linear-gradient(135deg,var(--qq-accent),var(--qq-accent))' : 'linear-gradient(135deg,#EC4899,#EC4899)')
              : rank === 2
                ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
                : rank === 3
                  ? 'linear-gradient(135deg,#F97316,#B45309)'
                  : (themed ? 'var(--qq-surface)' : 'linear-gradient(135deg,#475569,#334155)');
            return (
              <div
                key={r.teamId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto 1fr auto',
                  alignItems: 'center',
                  gap: 'clamp(10px, 1.2cqw, 18px)',
                  padding: 'clamp(10px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
                  // Cozy-Look: Team-Tint fuer Top/in-range. Im Skin ueberschreibt
                  // themedWindow() den ganzen Frame einheitlich (DRY-Helper).
                  borderRadius: 16,
                  background: isTop
                    ? `linear-gradient(135deg, ${r.team.color}22, ${r.team.color}08)`
                    : isInRangeWinner
                      ? `linear-gradient(135deg, ${r.team.color}1a, ${r.team.color}05)`
                      : 'rgba(148,163,184,0.06)',
                  border: isTop
                    ? `2px solid ${r.team.color}55`
                    : isInRangeWinner
                      ? `2px solid ${r.team.color}55`
                      : '2px solid rgba(148,163,184,0.15)',
                  boxShadow: isTop
                    ? `0 0 28px ${r.team.color}33`
                    : isInRangeWinner ? `0 0 18px ${r.team.color}22` : 'none',
                  visibility: isVisible ? 'visible' : 'hidden',
                  animation: isVisible
                    ? `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) both, top5RowGlow 1.2s ease 0.3s both`
                    : 'none',
                  flex: 1,
                  minHeight: 'clamp(72px, 9cqh, 110px)',
                  ...(themedWindow({ emphasis: isTop || isInRangeWinner }) ?? {}),
                }}
              >
                <div style={{
                  width: 'clamp(52px, 5cqw, 72px)', height: 'clamp(52px, 5cqw, 72px)',
                  borderRadius: themed ? 'var(--qq-card-radius)' : 16,
                  background: rankGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900,
                  // rank1 themed: weiss auf Akzent (lesbar fuer alle Akzent-Farben);
                  // sonst card-text (cozy=weiss; themed rank4/5 dunkel auf heller Surface).
                  color: rank === 1 && themed ? '#fff' : 'var(--qq-card-text)',
                  flexShrink: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  animation: isVisible ? 'top5RankPop 0.55s var(--qq-ease-bounce) 0.1s both' : 'none',
                  boxShadow: rank === 1 ? (themed ? '0 0 20px rgba(var(--qq-accent-rgb),0.5)' : '0 0 20px rgba(236,72,153,0.5)') : 'none',
                }}>
                  #{rank}
                </div>
                <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={'clamp(44px, 4.4cqw, 62px)'} style={{
                  boxShadow: `0 0 14px ${r.team.color}55`,
                  flexShrink: 0,
                  animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.35s both` : 'none',
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      fontSize: 'clamp(16px, 1.7cqw, 24px)', fontWeight: 900,
                      color: isTop || isInRangeWinner ? r.team.color : 'var(--qq-text-muted)',
                      lineHeight: 1.1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{r.team.name}</span>
                    {isInRangeWinner && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999,
                        background: `${r.team.color}26`,
                        border: `1.5px solid ${r.team.color}55`,
                        fontSize: 'clamp(11px, 1.1cqw, 15px)', fontWeight: 900,
                        color: r.team.color,
                        whiteSpace: 'nowrap',
                      }}>
                        🎯 {lang === 'en' ? 'in range · +1' : 'in Range · +1'}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 'clamp(24px, 2.6cqw, 40px)', fontWeight: 900,
                    color: isTop ? (themed ? 'var(--qq-accent)' : QQ_COLORS.brandPinkSoft) : 'var(--qq-card-text)', marginTop: 4,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: isTop ? (themed ? 'none' : '0 0 16px rgba(236,72,153,0.35)') : 'none',
                  }}>
                    {fmt(r.num)}
                  </div>
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0,
                }}>
                  <div style={{
                    padding: '8px 18px', borderRadius: 999,
                    background: isTop ? 'rgba(250,204,21,0.22)' : (themed ? 'var(--qq-surface)' : 'rgba(15,23,42,0.7)'),
                    border: isTop ? '2px solid rgba(250,204,21,0.55)' : '1.5px solid rgba(148,163,184,0.3)',
                    fontSize: 'clamp(18px, 1.9cqw, 28px)', fontWeight: 900,
                    color: isTop ? (themed ? 'var(--qq-accent)' : QQ_COLORS.brandPinkSoft) : 'var(--qq-card-text)',
                    fontVariantNumeric: 'tabular-nums',
                    animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.45s both` : 'none',
                  }}>
                    {r.delta === 0 ? '🎯 0' : `Δ ${fmt(r.delta)}`}
                  </div>
                  {/* 2026-05-23 (Live-Test #E): Tie-Marker */}
                  {(() => {
                    const k = String(r.delta);
                    const isTied = (tieGroups[k] ?? 0) > 1;
                    if (!isTied) return null;
                    const deltaMs = r.submittedAt - (tieEarliest[k] ?? r.submittedAt);
                    const label = deltaMs === 0
                      ? (lang === 'de' ? '⚡ zuerst' : '⚡ first')
                      : `+${(deltaMs / 1000).toFixed(1)} s`;
                    return (
                      <span style={{
                        fontWeight: 900, fontSize: 'clamp(11px, 1.05cqw, 14px)',
                        padding: '2px 8px', borderRadius: 999,
                        background: deltaMs === 0 ? 'rgba(34,197,94,0.18)' : 'rgba(148,163,184,0.18)',
                        border: deltaMs === 0 ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(148,163,184,0.35)',
                        color: deltaMs === 0 ? QQ_COLORS.green300 : 'var(--qq-text-muted)',
                        whiteSpace: 'nowrap',
                      }}>{label}</span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
          {top5.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--qq-text-muted)', fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 700,
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
