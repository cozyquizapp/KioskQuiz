/**
 * CrowdTopReveal — „Top-Antworten" (Family Feud) Reveal-Phase.
 *
 * Zweispaltige Show-Seite: links Rundensieger (Nenner der beliebtesten Antwort),
 * rechts die Tafel die sequentiell #5→#1 aufdeckt. Pro Slot: Rang, Antwort,
 * Stimmen-Zähler, Nenner-Avatare (Fraktions-Cluster in Cozy Arena). Unten
 * „N weitere Antworten".
 *
 * Die Tafel wird aus s.answers + q via shared qqCrowdTopBoard berechnet —
 * dieselbe Funktion, die im Backend wertet → Anzeige und Punkte divergieren nie.
 *
 * 2026-07-04 (Cozy Arena Voting, Stufe 4).
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate, QQBunteTueteCrowdTop } from '../../../../shared/quarterQuizTypes';
import { qqCrowdTopBoard } from '../../../../shared/qqCrowdTop';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { FactionCountAvatars } from '../QQFactionCrest';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playRevealHighlight } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { isThemed, themedWindow } from '../../qqTheme';

export function CrowdTopReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const isMega = !!(s as any).nestedTeams || new Set(s.teams.map(t => t.avatarId)).size < s.teams.length;
  const def = q.bunteTuete as QQBunteTueteCrowdTop;

  const board = useMemo(
    () => qqCrowdTopBoard(
      s.answers.map(a => ({ teamId: a.teamId, text: a.text, submittedAt: a.submittedAt })),
      def,
      { lang },
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(s.answers.map(a => [a.teamId, a.text])), JSON.stringify(def?.answers), lang],
  );
  const slots = board.slots;
  const n = slots.length;

  const teamsById = useMemo(() => {
    const m = new Map<string, QQStateUpdate['teams'][number]>();
    for (const t of s.teams) m.set(t.id, t);
    return m;
  }, [s.teams]);
  const teamsFor = (ids: string[]) => ids.map(id => teamsById.get(id)).filter((t): t is NonNullable<typeof t> => !!t);

  // Rundensieger = Nenner der beliebtesten Antwort (Board-Platz 1).
  const winnerTeams = teamsFor(slots[0]?.teamIds ?? []);

  // Sequentielles Reveal #n…#1 (bottom-up), wie Top5.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 2400;
  const INITIAL_DELAY_MS = 600;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const isLast = i === n - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          try { playAvatarCascadeNote(i, n + 1); } catch {}
          if (isLast) { try { playRevealHighlight(); } catch {} }
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
          🗳️ {lang === 'en' ? 'Survey — Reveal' : 'Umfrage — Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(26px, 2.7cqw, 40px)' : 'clamp(30px, 3.2cqw, 52px)',
          fontWeight: 900, lineHeight: 1.18, color: 'var(--qq-card-text)',
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Bottom: Sieger (links) + Tafel (rechts) ────────────── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
        gap: 'clamp(16px, 2.5cqw, 36px)',
        minHeight: 0,
      }}>
        {/* Sieger-Karte */}
        {(() => {
          const singleColor = winnerTeams.length === 1 ? winnerTeams[0].color ?? null : null;
          const has = winnerTeams.length > 0;
          return (
            <div style={{
              height: '100%',
              background: !has ? 'transparent'
                : singleColor ? `linear-gradient(135deg, ${singleColor}1f, ${singleColor}07)`
                : 'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(236,72,153,0.04))',
              border: !has ? 'none' : singleColor ? `3px solid ${singleColor}88` : '3px solid rgba(236,72,153,0.55)',
              borderRadius: 24,
              padding: 'clamp(18px, 2.4cqh, 32px) clamp(14px, 1.8cqw, 28px)',
              boxShadow: !has ? 'none' : singleColor ? `0 0 48px ${singleColor}33, 0 8px 24px rgba(0,0,0,0.4)` : '0 0 48px rgba(236,72,153,0.22), 0 8px 24px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, minHeight: 0,
              opacity: revealedMinIdx === 0 ? 1 : 0.12,
              filter: revealedMinIdx === 0 ? 'none' : 'blur(18px) saturate(0.4)',
              transition: 'opacity 0.7s ease, filter 0.7s ease',
            }}>
              <div style={{
                fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: 'var(--qq-text-muted)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Top answer named by' : 'Top-Antwort genannt von'}
              </div>
              {!has ? (
                <div style={{ fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900, color: '#f87171' }}>
                  {lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 'clamp(22px, 2.5cqw, 40px)', fontWeight: 900, color: singleColor ?? '#EC4899', lineHeight: 1.1 }}>
                    „{slots[0].label}"
                  </div>
                  {isMega
                    ? <FactionCountAvatars teams={winnerTeams} de={lang === 'de'} size={'clamp(84px, 8.6cqw, 130px)'} showName />
                    : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                        {winnerTeams.map(tm => (
                          <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(72px, 7cqw, 112px)'} title={tm.name}
                            style={{ boxShadow: `0 0 16px ${tm.color}55` }} />
                        ))}
                      </div>
                    )}
                </>
              )}
            </div>
          );
        })()}

        {/* Tafel (bottom-up reveal, füllt Spalte) */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2cqh, 14px)',
          justifyContent: 'space-between', minHeight: 0, height: '100%',
        }}>
          {slots.map((slot, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const hitters = teamsFor(slot.teamIds);
            const rowDelay = (n - 1 - idx) * 0.18;
            const rankGradient = rank === 1
              ? 'linear-gradient(135deg,#EC4899,#EC4899)'
              : rank === 2 ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
              : rank === 3 ? 'linear-gradient(135deg,#F97316,#B45309)'
              : 'linear-gradient(135deg,#475569,#334155)';
            return (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center',
                gap: 'clamp(10px, 1.2cqw, 18px)',
                padding: 'clamp(10px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))',
                border: '2px solid rgba(34,197,94,0.4)',
                visibility: isVisible ? 'visible' : 'hidden',
                animation: isVisible
                  ? `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) ${rowDelay}s both, top5RowGlow 1.2s ease ${0.3 + rowDelay}s both`
                  : 'none',
                flex: 1, minHeight: 'clamp(64px, 8cqh, 92px)',
                ...(themedWindow({ ok: true }) ?? {}),
              }}>
                {/* Rang + Stimmen */}
                <div style={{
                  width: 'clamp(52px, 5cqw, 72px)', minHeight: 'clamp(52px, 5cqw, 72px)',
                  borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16, background: rankGradient,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--qq-card-text)', flexShrink: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  padding: '6px 0',
                  animation: isVisible ? `top5RankPop 0.55s var(--qq-ease-bounce) ${0.1 + rowDelay}s both` : 'none',
                  boxShadow: rank === 1 ? '0 0 20px rgba(236,72,153,0.5)' : 'none',
                }}>
                  <div style={{ fontSize: 'clamp(22px, 2.6cqw, 36px)', fontWeight: 900, lineHeight: 1 }}>#{rank}</div>
                  <div style={{ fontSize: 'clamp(11px, 1.1cqw, 15px)', fontWeight: 900, opacity: 0.9, marginTop: 2 }}>×{slot.count}</div>
                </div>

                {/* Antwort */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 'clamp(20px, 2.3cqw, 34px)', fontWeight: 900,
                    color: QQ_COLORS.green300, lineHeight: 1.2, wordBreak: 'break-word',
                  }}>
                    {slot.label}
                  </div>
                  {slot.autoSurfaced && (
                    <div style={{ fontSize: 'clamp(10px, 1cqw, 13px)', fontWeight: 800, color: 'var(--qq-text-muted)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      🎤 {lang === 'en' ? 'from the crowd' : 'aus der Menge'}
                    </div>
                  )}
                </div>

                {/* Nenner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {isMega
                    ? <FactionCountAvatars teams={hitters} de={lang === 'de'} size={'clamp(52px, 5.4cqw, 78px)'} />
                    : hitters.slice(0, 6).map((tm, hi) => (
                      <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} teamEmoji={tm.emoji}
                        size={'clamp(52px, 5.4cqw, 78px)'} title={tm.name}
                        style={{
                          boxShadow: `0 0 16px ${tm.color}55`,
                          animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09 + rowDelay}s both` : 'none',
                        }} />
                    ))}
                </div>
              </div>
            );
          })}

          {/* „N weitere Antworten" */}
          {board.otherCount > 0 && (
            <div style={{
              textAlign: 'center', fontSize: 'clamp(13px, 1.4cqw, 20px)', fontWeight: 800,
              color: 'var(--qq-text-muted)', padding: '4px 0',
              opacity: revealedMinIdx === 0 ? 1 : 0,
              transition: 'opacity 0.6s ease 0.3s',
            }}>
              + {board.otherCount} {lang === 'en' ? 'other answers' : 'weitere Antworten'}
            </div>
          )}

          {n === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900, color: 'var(--qq-text-muted)' }}>
              {lang === 'en' ? 'No answers.' : 'Keine Antworten.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
