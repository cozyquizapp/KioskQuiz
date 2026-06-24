/**
 * Top5Reveal — Bunte Tüte top5 Sub-Mechanic, Reveal-Phase.
 *
 * Zweispaltige Show-Seite: links Frage + Gewinner-Block, rechts Top-5-Liste
 * die sequentiell 5→1 aufdeckt. Nach jeder Antwort erscheinen Avatare (oder
 * X-Kreis wenn niemand) mit Pop-Animation.
 *
 * 2026-05-24 (Refactor #5.2): aus CozyQuizQuestionView.tsx extrahiert.
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
import { isThemed, themedWindow } from '../../qqTheme';

/**
 * Top-5 Reveal: zweispaltige Show-Seite.
 * Links: Frage + Gewinner-Block. Rechts: Top-5-Liste die sequentiell 5→1 aufdeckt.
 * Nach jeder Antwort erscheinen Avatare (oder X-Kreis wenn niemand) mit Pop-Animation.
 */
export function Top5Reveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = q.bunteTuete as any;
  const correctListDE: string[] = (btt.answers ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctListEN: string[] = (btt.answersEn ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctList = lang === 'en' && correctListEN.length ? correctListEN : correctListDE;
  const n = correctList.length;

  // 2026-05-02: Backend-Truth via top5HitsByTeam. Backend matched mit
  // similarityScore>=0.8 (fuzzy). Frontend hat jetzt nur noch Anzeige-Logik,
  // keine eigene Match-Logik mehr. Backend's correctAll = correctDE.concat(correctEN);
  // Index ci -> DE-Slot, ci+correctDE.length -> EN-Slot.
  const hitsByTeam = s.top5HitsByTeam ?? {};

  // perAnswer in Original-Reihenfolge (Platz 1 = Index 0).
  const perAnswer = useMemo(() => {
    return correctList.map((correct, ci) => {
      const deIdx = ci;
      const enIdx = ci + correctListDE.length;
      const hitters = s.answers
        .filter(a => {
          const teamHits = hitsByTeam[a.teamId] ?? [];
          return teamHits.includes(deIdx) || teamHits.includes(enIdx);
        })
        .map(a => s.teams.find(t => t.id === a.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correct, hitters };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, s.teams, correctList, correctListDE.length, JSON.stringify(hitsByTeam)]);

  // Treffer pro Team — für Winner-Block. Aus Backend-Hits.
  const teamScore = useMemo(() => {
    return s.answers.map(a => ({
      teamId: a.teamId,
      hits: (hitsByTeam[a.teamId] ?? []).length,
    })).sort((x, y) => y.hits - x.hits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, JSON.stringify(hitsByTeam)]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // Sequentielles Reveal: Start mit -1 (noch nichts), dann 5, 4, 3, 2, 1 (Indizes: n-1 … 0).
  // 2026-05-03 (Wolf-Bug 'Cascade-Sound aber alle Avatare gleichzeitig'):
  // Race-Condition fix — siehe Schaetzchen. cascadeStartedRef verhindert
  // Re-Run bei n-Aenderung waehrend laufender Cascade.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 2400;
  const INITIAL_DELAY_MS = 600;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 2026-05-13 (Wolf 'sound cascaden nicht passend zu gesetzten avataren') —
    // Top5-Fix: Sound nur fuer Rows MIT Hittern. Vorher 5 Toene immer, auch
    // wenn nur 2 Rows Avatar-Drops hatten → Audio/Visual-Drift. hitOrderMap
    // mapped jeden Cascade-Step auf den Hit-Order-Index (oder -1 fuer leere).
    let hitAccum = 0;
    const hitOrderMap: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      const tIdx = n - 1 - j;
      const hasHit = (perAnswer[tIdx]?.hitters.length ?? 0) > 0;
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
      {/* ── Top row: Full-width question card ─────────────────── */}
      <div style={{
        background: isThemed() ? 'var(--qq-card-bg)' : 'var(--qq-surface)',
        border: isThemed() ? 'var(--qq-card-border)' : '2px solid var(--qq-hairline)',
        borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
        padding: 'clamp(16px, 2cqh, 26px) clamp(24px, 2.8cqw, 42px)',
        boxShadow: isThemed() ? 'var(--qq-card-shadow)' : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: 'var(--qq-accent)',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          🎁 {lang === 'en' ? 'Top 5 — Reveal' : 'Top 5 — Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(26px, 2.7cqw, 40px)' : 'clamp(30px, 3.2cqw, 52px)',
          fontWeight: 900, lineHeight: 1.18, color: 'var(--qq-card-text)',
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Bottom row: Winners (left) + Top-5 list (right) ───── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
        gap: 'clamp(16px, 2.5cqw, 36px)',
        minHeight: 0,
      }}>
        {/* Winner card — Team-Farben-Frame bei Einzelsieger, Gold bei mehreren. */}
        {(() => {
          const singleColor = winners.length === 1
            ? s.teams.find(t => t.id === winners[0].teamId)?.color ?? null
            : null;
          const cardBgGrad = winners.length === 0
            ? 'transparent'
            : singleColor
              ? `linear-gradient(135deg, ${singleColor}1f, ${singleColor}07)`
              : 'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(236,72,153,0.04))';
          const cardBorder = winners.length === 0
            ? 'none'
            : singleColor
              ? `3px solid ${singleColor}88`
              : '3px solid rgba(236,72,153,0.55)';
          const cardShadow = winners.length === 0
            ? 'none'
            : singleColor
              ? `0 0 48px ${singleColor}33, 0 8px 24px rgba(0,0,0,0.4)`
              : '0 0 48px rgba(236,72,153,0.22), 0 8px 24px rgba(0,0,0,0.4)';
          return (
        <div style={{
          height: '100%',
          background: cardBgGrad,
          border: cardBorder,
          borderRadius: 24,
          padding: 'clamp(18px, 2.4cqh, 32px) clamp(14px, 1.8cqw, 28px)',
          boxShadow: cardShadow,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 14, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.12,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(18px) saturate(0.4)',
          transition: 'opacity 0.7s ease, filter 0.7s ease',
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: 'var(--qq-text-muted)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <QQEmojiIcon emoji="🏆"/> {winners.length > 1
              ? (lang === 'en' ? 'Round winners' : 'Rundensieger')
              : (lang === 'en' ? 'Round winner' : 'Rundensieger')}
          </div>
          {winners.length === 0 ? (
            <div style={{ fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900, color: '#f87171' }}>
              {lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}
            </div>
          ) : (() => {
            // Skaliere Größen je nach Anzahl Sieger — wenig Sieger = deutlich größer.
            const wn = winners.length;
            // Ab 5 Siegern 2 Spalten (4-4 bei 8) damit unten nichts abgeschnitten wird
            const twoCol = wn >= 5;
            const avatarSize =
              wn === 1 ? 'clamp(130px, 14cqw, 210px)'
              : wn === 2 ? 'clamp(112px, 11.5cqw, 172px)'
              : wn === 3 ? 'clamp(96px, 9.8cqw, 144px)'
              : wn === 4 ? 'clamp(84px, 8.6cqw, 124px)'
              : wn <= 6 ? 'clamp(70px, 6.4cqw, 100px)'
              : 'clamp(64px, 5.8cqw, 92px)';
            const nameSize =
              wn === 1 ? 'clamp(40px, 4.6cqw, 76px)'
              : wn === 2 ? 'clamp(34px, 3.8cqw, 60px)'
              : wn === 3 ? 'clamp(30px, 3.4cqw, 52px)'
              : wn === 4 ? 'clamp(26px, 3cqw, 44px)'
              : wn <= 6 ? 'clamp(20px, 2.1cqw, 30px)'
              : 'clamp(18px, 1.95cqw, 28px)';
            const subSize =
              wn === 1 ? 'clamp(18px, 1.9cqw, 30px)'
              : wn === 2 ? 'clamp(16px, 1.7cqw, 26px)'
              : wn === 3 ? 'clamp(15px, 1.6cqw, 24px)'
              : wn === 4 ? 'clamp(14px, 1.5cqw, 22px)'
              : 'clamp(12px, 1.3cqw, 18px)';
            const rowGap = wn <= 2 ? 18 : wn === 3 ? 14 : wn === 4 ? 12 : 10;
            const itemGap = wn <= 2 ? 20 : wn === 3 ? 18 : wn === 4 ? 16 : twoCol ? 10 : 14;
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
                gap: twoCol ? `${rowGap}px 18px` : `${rowGap}px`,
                minHeight: 0, overflow: 'hidden',
              }}>
                {winners.map(w => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: itemGap, minWidth: 0,
                      animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s var(--qq-ease-bounce) 0.2s both' : 'none',
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avatarSize} style={{
                        flexShrink: 0,
                        animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                      }} />
                      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <TeamNameLabel
                          name={tm.name}
                          maxLines={2}
                          shrinkAfter={14}
                          fontSize={nameSize}
                          color={tm.color}
                          fontWeight={900}
                          style={{ lineHeight: 1.1 }}
                        />
                        <div style={{
                          fontSize: subSize, fontWeight: 900, color: 'var(--qq-text-muted)', marginTop: 2,
                        }}>
                          {w.hits}/{n} {lang === 'en' ? 'correct' : 'richtig'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
          );
        })()}

      {/* ── Right column: Top-5 List (bottom-up reveal, fills column) ─────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2cqh, 14px)',
        justifyContent: 'space-between',
        minHeight: 0, height: '100%',
      }}>
        {perAnswer.map(({ correct, hitters }, idx) => {
          const rank = idx + 1;
          const isVisible = idx >= revealedMinIdx;
          const hasHits = hitters.length > 0;
          // 2026-05-07 (Audit P1): Pro Reihe Stagger-Delay, damit bei schnellem
          // Mod-Klick (mehrere Reihen flippen synchron isVisible=true) die
          // Reihen kaskadieren statt synchron zu poppen. Bottom-up Reveal:
          // hoechster Index (rank 5) zuerst, niedrigster Index (rank 1) zuletzt.
          const rowDelay = (perAnswer.length - 1 - idx) * 0.18;
          const rankGradient = rank === 1
            ? 'linear-gradient(135deg,#EC4899,#EC4899)'
            : rank === 2
              ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
              : rank === 3
                ? 'linear-gradient(135deg,#F97316,#B45309)'
                : 'linear-gradient(135deg,#475569,#334155)';
          return (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 'clamp(10px, 1.2cqw, 18px)',
                padding: 'clamp(10px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
                // Cozy-Look (hasHits=gruen). Im Skin einheitlicher Frame via Helper.
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
                ...(themedWindow({ ok: hasHits }) ?? {}),
              }}
            >
              {/* Rank badge */}
              <div style={{
                width: 'clamp(52px, 5cqw, 72px)', height: 'clamp(52px, 5cqw, 72px)',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                background: rankGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900, color: 'var(--qq-card-text)',
                flexShrink: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                animation: isVisible ? `top5RankPop 0.55s var(--qq-ease-bounce) ${0.1 + rowDelay}s both` : 'none',
                boxShadow: rank === 1 ? '0 0 20px rgba(236,72,153,0.5)' : 'none',
              }}>
                #{rank}
              </div>

              {/* Answer text */}
              <div style={{
                fontSize: 'clamp(20px, 2.3cqw, 34px)', fontWeight: 900,
                color: hasHits ? QQ_COLORS.green300 : 'var(--qq-text-muted)',
                lineHeight: 1.2,
                minWidth: 0, wordBreak: 'break-word',
              }}>
                {hasHits ? '✓ ' : ''}{correct}
              </div>

              {/* Hitters / No-hit X */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
              }}>
                {hasHits ? (
                  hitters.map((tm, hi) => (
                    <QQTeamAvatar
                      key={tm.id}
                      avatarId={tm.avatarId} teamEmoji={tm.emoji}
                      size={'clamp(52px, 5.4cqw, 78px)'}
                      title={tm.name}
                      style={{
                        boxShadow: `0 0 16px ${tm.color}55`,
                        animation: isVisible
                          ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09 + rowDelay}s both`
                          : 'none',
                      }}
                    />
                  ))
                ) : (
                  <div style={{
                    width: 'clamp(52px, 5.4cqw, 78px)', height: 'clamp(52px, 5.4cqw, 78px)',
                    borderRadius: '50%',
                    background: 'rgba(148,163,184,0.15)',
                    border: '2px dashed rgba(148,163,184,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(20px, 2.2cqw, 28px)', fontWeight: 900, color: 'var(--qq-text-muted)',
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
      </div>
    </div>
  );
}
