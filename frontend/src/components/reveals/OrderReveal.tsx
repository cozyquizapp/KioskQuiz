/**
 * OrderReveal — Bunte-Tüte "order" Sub-Mechanic, Reveal-Phase.
 *
 * Top5-Style 2-Spalten-Layout. Vergleicht Team-Submissions mit korrekter
 * Reihenfolge via orderHitsByTeam (Backend-Truth).
 *
 * 2026-05-24 (Refactor #5.3): aus CozyQuizQuestionView.tsx extrahiert.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { TeamNameLabel } from '../TeamNameLabel';
import {
  playAvatarCascadeNote, playClimaxFinish, playRevealHighlight,
} from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';

// ═══════════════════════════════════════════════════════════════════════════════
// OrderReveal — Bunte-Tüte "order" reveal, Top5-Style mit 2-Spalten-Layout
// ═══════════════════════════════════════════════════════════════════════════════
export function OrderReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = q.bunteTuete as any;
  const itemsDE: string[] = (btt.items ?? []) as string[];
  const itemsEN: string[] = (btt.itemsEn ?? []) as string[];
  const itemValues: string[] = (btt.itemValues ?? []) as string[];
  const correctOrder: number[] = (btt.correctOrder ?? []) as number[];
  const items = lang === 'en' && itemsEN.length ? itemsEN : itemsDE;
  const n = correctOrder.length;

  const criteriaTxt = lang === 'en' && btt.criteriaEn ? btt.criteriaEn : btt.criteria;

  // 2026-05-02: Backend-Truth via orderHitsByTeam (per-team boolean[] per
  // Position, similarityScore>=0.8 fuzzy matched). Frontend nutzt das direkt;
  // parseAnswers wird nur noch fuer den Item-Display benoetigt.
  const orderHits = s.orderHitsByTeam ?? {};
  const parsedAnswers = useMemo(() => {
    const deLc = itemsDE.map(s => (s ?? '').trim().toLowerCase());
    const enLc = itemsEN.map(s => (s ?? '').trim().toLowerCase());
    return s.answers.map(a => {
      const parts = String(a.text ?? '').split('|').map(p => p.trim()).filter(Boolean);
      const order: number[] = parts.map(p => {
        const asNum = Number(p);
        if (Number.isFinite(asNum) && asNum >= 0 && asNum < itemsDE.length) return asNum;
        const pLc = p.toLowerCase();
        const di = deLc.indexOf(pLc);
        if (di >= 0) return di;
        const ei = enLc.indexOf(pLc);
        if (ei >= 0) return ei;
        return -1;
      });
      return { teamId: a.teamId, order };
    });
  }, [s.answers, itemsDE, itemsEN]);

  // Pro Position: welche Teams haben hier richtig (Backend-Truth)?
  const perPosition = useMemo(() => {
    return correctOrder.map((correctIdx, posIdx) => {
      const hitters = s.answers
        .filter(a => (orderHits[a.teamId] ?? [])[posIdx] === true)
        .map(a => s.teams.find(t => t.id === a.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correctIdx, hitters };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, correctOrder, s.teams, JSON.stringify(orderHits)]);

  // Treffer pro Team (Anzahl korrekter Positionen, Backend-Truth).
  const teamScore = useMemo(() => {
    return s.answers.map(a => ({
      teamId: a.teamId,
      hits: (orderHits[a.teamId] ?? []).filter(Boolean).length,
    })).sort((x, y) => y.hits - x.hits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, JSON.stringify(orderHits)]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // 2026-05-03 (Wolf-Bug Cascade-Race): siehe Schaetzchen. Race-Fix.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 2000;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 2026-05-13 (Wolf 'sound cascaden nicht passend') — Order-Fix analog zu
    // Top5: Sound nur fuer Positionen mit Hittern. Visual-Reveal-Stepping
    // (revealedMinIdx) bleibt ueber alle n Positionen, nur die Cascade-Notes
    // ueberspringen leere Reihen.
    let hitAccum = 0;
    const hitOrderMap: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      const tIdx = n - 1 - j;
      const hasHit = (perPosition[tIdx]?.hitters.length ?? 0) > 0;
      hitOrderMap[j] = hasHit ? hitAccum++ : -1;
    }
    const totalHits = hitAccum;
    const cascadeTotal = totalHits + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const hitOrder = hitOrderMap[i];
      const hasHitters = hitOrder >= 0;
      const isLastHit = hasHitters && hitOrder === totalHits - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted && hasHitters) {
          try { playAvatarCascadeNote(hitOrder, cascadeTotal); } catch {}
          if (isLastHit) {
            try { playRevealHighlight(); } catch {}
          }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 1.8cqh, 22px)',
      padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 3cqw, 48px) clamp(54px, 7cqh, 80px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both',
      minHeight: 0,
    }}>
      {/* ── Top: Frage ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 'clamp(16px, 2cqh, 26px) clamp(24px, 2.8cqw, 42px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: QQ_COLORS.brandPink,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          🎁 {lang === 'en' ? 'Lucky Bag — Order' : 'Bunte Tüte — Reihenfolge'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(26px, 2.7cqw, 40px)' : 'clamp(30px, 3.2cqw, 52px)',
          fontWeight: 900, lineHeight: 1.18, color: QQ_COLORS.slate100,
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
        {criteriaTxt && (
          <div style={{
            marginTop: 8, fontSize: 'clamp(14px, 1.4cqw, 20px)', fontWeight: 700,
            color: QQ_COLORS.brandPinkSoft, fontStyle: 'italic',
          }}>
            ↕ {criteriaTxt}
          </div>
        )}
      </div>

      {/* ── Mitte: Antwort-Liste full-width, von oben nach unten ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: 0,
      }}>
        {/* Antwort-Liste — bottom-up enthuellt */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2cqh, 14px)',
          justifyContent: 'space-between',
          minHeight: 0,
        }}>
          {perPosition.map(({ correctIdx, hitters }, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const hasHits = hitters.length > 0;
            // 2026-05-07 (Audit P1): siehe Top5 — pro Reihe Stagger-Delay,
            // damit synchron-flippende Reihen kaskadieren statt synchron poppen.
            const rowDelay = (perPosition.length - 1 - idx) * 0.18;
            const rankGradient = rank === 1
              ? 'linear-gradient(135deg,#EC4899,#EC4899)'
              : rank === 2
                ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
                : rank === 3
                  ? 'linear-gradient(135deg,#F97316,#B45309)'
                  : 'linear-gradient(135deg,#475569,#334155)';
            const itemText = items[correctIdx] ?? '';
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 'clamp(10px, 1.2cqw, 18px)',
                  padding: 'clamp(10px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
                  borderRadius: 16,
                  background: hasHits
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))'
                    : 'rgba(148,163,184,0.06)',
                  border: hasHits
                    ? '2px solid rgba(34,197,94,0.4)'
                    : '2px solid rgba(148,163,184,0.15)',
                  visibility: isVisible ? 'visible' : 'hidden',
                  animation: isVisible
                    ? `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) ${rowDelay}s both, top5RowGlow 1.2s ease ${0.3 + rowDelay}s both`
                    : 'none',
                  flex: 1,
                  minHeight: 'clamp(64px, 8cqh, 92px)',
                }}
              >
                <div style={{
                  width: 'clamp(52px, 5cqw, 72px)', height: 'clamp(52px, 5cqw, 72px)',
                  borderRadius: 16,
                  background: rankGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900, color: '#fff',
                  flexShrink: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  animation: isVisible ? `top5RankPop 0.55s var(--qq-ease-bounce) ${0.1 + rowDelay}s both` : 'none',
                  boxShadow: rank === 1 ? '0 0 20px rgba(236,72,153,0.5)' : 'none',
                }}>
                  #{rank}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 'clamp(8px, 1cqw, 14px)',
                  flexWrap: 'wrap', minWidth: 0,
                }}>
                  <div style={{
                    fontSize: 'clamp(20px, 2.3cqw, 34px)', fontWeight: 900,
                    color: hasHits ? QQ_COLORS.green300 : QQ_COLORS.slate300,
                    lineHeight: 1.2,
                    minWidth: 0, wordBreak: 'break-word',
                  }}>
                    {hasHits ? '✓ ' : ''}{itemText}
                  </div>
                  {itemValues[correctIdx] && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '3px 12px', borderRadius: 999,
                      background: hasHits ? 'rgba(34,197,94,0.22)' : 'rgba(148,163,184,0.16)',
                      border: hasHits ? '1.5px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(148,163,184,0.3)',
                      color: hasHits ? QQ_COLORS.green300 : QQ_COLORS.slate300,
                      fontWeight: 900,
                      fontSize: 'clamp(14px, 1.5cqw, 22px)',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {itemValues[correctIdx]}
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  flexShrink: 0,
                }}>
                  {hasHits ? (
                    hitters.map((tm, hi) => (
                      <QQTeamAvatar
                        key={tm.id}
                        avatarId={tm.avatarId} teamEmoji={tm.emoji}
                        size={'clamp(36px, 3.8cqw, 54px)'}
                        title={tm.name}
                        style={{
                          boxShadow: `0 0 14px ${tm.color}55`,
                          animation: isVisible
                            ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09 + rowDelay}s both`
                            : 'none',
                        }}
                      />
                    ))
                  ) : (
                    <div style={{
                      width: 'clamp(36px, 3.8cqw, 54px)', height: 'clamp(36px, 3.8cqw, 54px)',
                      borderRadius: '50%',
                      background: 'rgba(148,163,184,0.15)',
                      border: '2px dashed rgba(148,163,184,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(20px, 2.2cqw, 28px)', fontWeight: 900, color: QQ_COLORS.slate400,
                      animation: isVisible
                        ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + rowDelay}s both`
                        : 'none',
                    }}>
                      ✕
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sieger-Footer — horizontale Pill-Reihe, skaliert bis 8 Teams */}
        <div style={{
          marginTop: 'clamp(10px, 1.4cqh, 18px)',
          padding: 'clamp(10px, 1.4cqh, 16px) clamp(14px, 1.8cqw, 24px)',
          borderRadius: 16,
          background: winners.length > 0
            ? 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(236,72,153,0.04))'
            : 'rgba(148,163,184,0.06)',
          border: winners.length > 0
            ? '2px solid rgba(236,72,153,0.35)'
            : '2px solid rgba(148,163,184,0.15)',
          display: 'flex', alignItems: 'center',
          gap: 'clamp(12px, 1.6cqw, 22px)',
          flexShrink: 0, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.18,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(8px) saturate(0.4)',
          transition: 'opacity 0.6s ease, filter 0.6s ease',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            flexShrink: 0, minWidth: 0,
            paddingRight: 'clamp(8px, 1cqw, 16px)',
            borderRight: '2px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: QQ_COLORS.brandPink,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              <QQEmojiIcon emoji="🏆"/> {winners.length > 1
                ? (lang === 'en' ? 'Round winners' : 'Rundensieger')
                : (lang === 'en' ? 'Round winner' : 'Rundensieger')}
            </div>
            {winners.length > 0 && (
              <div style={{
                fontSize: 'clamp(13px, 1.2cqw, 18px)', fontWeight: 900, color: QQ_COLORS.slate300,
                whiteSpace: 'nowrap',
              }}>
                {winners[0].hits}/{n} {lang === 'en' ? 'correct' : 'richtig'}
              </div>
            )}
          </div>

          {winners.length === 0 ? (
            <div style={{
              fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 900, color: '#f87171',
            }}>
              {lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}
            </div>
          ) : (() => {
            const wn = winners.length;
            // Avatar + Name als Pill, skaliert je nach Anzahl Sieger
            const avatarSize = wn <= 2 ? 'clamp(54px, 5.6cqw, 78px)'
              : wn <= 4 ? 'clamp(46px, 4.8cqw, 66px)'
              : wn <= 6 ? 'clamp(40px, 4.2cqw, 56px)'
              : 'clamp(36px, 3.8cqw, 50px)';
            const nameSize = wn <= 2 ? 'clamp(20px, 2.2cqw, 32px)'
              : wn <= 4 ? 'clamp(17px, 1.9cqw, 26px)'
              : wn <= 6 ? 'clamp(15px, 1.7cqw, 22px)'
              : 'clamp(14px, 1.5cqw, 19px)';
            const pillGap = wn <= 4 ? 'clamp(10px, 1.2cqw, 18px)' : 'clamp(8px, 0.9cqw, 12px)';
            return (
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                gap: pillGap,
                flex: 1, minWidth: 0,
              }}>
                {winners.map((w, wi) => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'clamp(6px, 0.8cqw, 12px)',
                      padding: 'clamp(4px, 0.6cqh, 8px) clamp(10px, 1.1cqw, 16px) clamp(4px, 0.6cqh, 8px) clamp(4px, 0.5cqh, 6px)',
                      borderRadius: 999,
                      background: `linear-gradient(135deg, ${tm.color}26, ${tm.color}0a)`,
                      border: `2px solid ${tm.color}55`,
                      animation: revealedMinIdx === 0
                        ? `revealWinnerIn 0.55s var(--qq-ease-bounce) ${0.2 + wi * 0.08}s both`
                        : 'none',
                      minWidth: 0,
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avatarSize} style={{
                        flexShrink: 0,
                        boxShadow: `0 0 14px ${tm.color}55`,
                      }} />
                      <TeamNameLabel
                        name={tm.name}
                        maxLines={2}
                        shrinkAfter={14}
                        fontSize={nameSize}
                        color={tm.color}
                        fontWeight={900}
                        style={{ lineHeight: 1.1, minWidth: 0 }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
