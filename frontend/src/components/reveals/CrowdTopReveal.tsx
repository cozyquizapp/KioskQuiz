/**
 * CrowdTopReveal v2 — Umfrage-Reveal auf dem "MYSTERY-TAFEL"-Pattern (2026-07-14).
 *
 * Wie Top5Reveal v2: die Tafel läuft volle Breite (die alte Sieger-Karte links
 * stand die ganze Kaskade als geblurrte Leerfläche rum), verdeckte Slots sind
 * sichtbare Mystery-Rows („· · ·"), das Sieger-Banner poppt erst nach der
 * letzten Row unten rein. Umfrage-Spezifika:
 *  - Stimmen-Balken als Row-Hintergrund (Anteil an der Top-Antwort)
 *  - Board-Punkte pro Rang sichtbar (Platz 1 = 100 P … Platz 5 = 20 P) —
 *    zeigt, wie die Handy-Punkte zustande kommen
 *  - „🎤 aus der Menge"-Tag für autoSurfaced-Slots, „+N weitere Antworten"
 *
 * Daten-Logik (qqCrowdTopBoard, winnerTeams per-capita) unverändert aus v1.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate, QQBunteTueteCrowdTop } from '../../../../shared/quarterQuizTypes';
import { qqCrowdTopBoard } from '../../../../shared/qqCrowdTop';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { FactionCountAvatars } from '../QQFactionCrest';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playRevealHighlight, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { isThemed, themedWindow } from '../../qqTheme';

export function CrowdTopReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const isMega = !!(s as any).nestedTeams || !!(s as any).largeGroupMode;
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
  const maxVotes = Math.max(1, ...slots.map(sl => sl.count));

  const teamsById = useMemo(() => {
    const m = new Map<string, QQStateUpdate['teams'][number]>();
    for (const t of s.teams) m.set(t.id, t);
    return m;
  }, [s.teams]);
  const teamsFor = (ids: string[]) => ids.map(id => teamsById.get(id)).filter((t): t is NonNullable<typeof t> => !!t);

  // Rundensieger per-capita (wie v1).
  const winnerTeams = useMemo(() => {
    const pts = board.boardPointsByTeam;
    if (isMega) {
      const agg = new Map<string, { pts: number; total: number }>();
      for (const t of s.teams) {
        const e = agg.get(t.avatarId) ?? { pts: 0, total: 0 };
        e.total += 1; e.pts += pts[t.id] ?? 0;
        agg.set(t.avatarId, e);
      }
      let best = 0;
      for (const e of agg.values()) { const r = e.total ? e.pts / e.total : 0; if (r > best) best = r; }
      if (best <= 0) return [];
      const winAv = new Set([...agg].filter(([, e]) => (e.total ? e.pts / e.total : 0) === best).map(([av]) => av));
      return s.teams.filter(t => winAv.has(t.avatarId));
    }
    let best = 0;
    for (const t of s.teams) { const p = pts[t.id] ?? 0; if (p > best) best = p; }
    if (best <= 0) return [];
    return s.teams.filter(t => (pts[t.id] ?? 0) === best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, s.teams, isMega]);

  // Kaskade #n…#1 + Sieger-Beat.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const [winnerLit, setWinnerLit] = useState(false);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 2400, INITIAL_DELAY_MS = 600;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const isLast = i === n - 1;
      timers.push(setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          try { playAvatarCascadeNote(i, n + 1); } catch {}
          if (isLast) { try { playRevealHighlight(); } catch {} }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS));
    }
    timers.push(setTimeout(() => {
      setWinnerLit(true);
      if (!s.sfxMuted) { try { playClimaxFinish(); } catch {} }
    }, INITIAL_DELAY_MS + n * STEP_MS + 200));
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const revealedCount = n - revealedMinIdx;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(16px, 2.2cqh, 30px) clamp(20px, 3cqw, 48px) clamp(14px, 2cqh, 26px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both', minHeight: 0,
    }}>
      <style>{`
        @keyframes qqCT2Flip{0%{transform:rotateX(72deg);opacity:0}100%{transform:rotateX(0);opacity:1}}
        @keyframes qqCT2Rise{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes qqCT2Bar{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
      `}</style>

      {/* Kopf */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'clamp(14px,2cqw,32px)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'clamp(11px, 1.05cqw, 16px)', fontWeight: 900, color: 'var(--qq-accent)', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
            <QQEmojiIcon emoji="🗳️" /> {lang === 'en' ? 'Survey · Reveal' : 'Umfrage · Auflösung'}
          </div>
          <div key={lang} style={{
            fontSize: qText.length > 120 ? 'clamp(20px, 2cqw, 32px)' : 'clamp(22px, 2.3cqw, 37px)',
            fontWeight: 900, lineHeight: 1.12, color: 'var(--qq-card-text)', marginTop: 'clamp(4px,0.8cqh,10px)',
            animation: 'langFadeIn 0.4s ease both', textWrap: 'pretty' as any,
          }}>{qText}</div>
        </div>
        <div style={{ fontSize: 'clamp(12px, 1.1cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {revealedCount} / {n} {lang === 'en' ? 'revealed' : 'aufgedeckt'}
        </div>
      </div>

      {/* Tafel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.3cqh, 15px)', marginTop: 'clamp(10px,2cqh,22px)', minHeight: 0, perspective: 1200 }}>
        {slots.map((slot, idx) => {
          const rank = idx + 1;
          const isRevealed = idx >= revealedMinIdx;
          const hitters = teamsFor(slot.teamIds);
          // 2026-07-14 (Integration): exakt wie Backend (`100 × slot.points / 5`,
          // qqRooms.ts crowdTop-Branch). slot.points = Rang-Rohpunkte 5/4/3/2/1
          // (QQ_CROWDTOP_BOARD_POINTS) → ×20 = 100/80/60/40/20, unabhängig von n.
          const pts = slot.points * 20;
          const badgeBg = rank === 1 ? 'linear-gradient(135deg,#fbcfe8,#ec4899)'
            : rank === 2 ? 'linear-gradient(135deg,#f1f5f9,#94a3b8)'
            : rank === 3 ? 'linear-gradient(135deg,#fdba74,#b45309)'
            : 'linear-gradient(135deg,#64748b,#334155)';
          if (!isRevealed) {
            return (
              <div key={idx} style={{
                flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center',
                gap: 'clamp(12px,1.4cqw,22px)', padding: '0 clamp(14px,1.6cqw,24px)', borderRadius: 18,
                minHeight: 'clamp(52px,6.5cqh,84px)', background: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(148,163,184,0.14)',
              }}>
                <div style={{
                  width: 'clamp(44px,4.4cqw,66px)', height: 'clamp(44px,4.4cqw,66px)', borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(20px,2cqw,32px)', fontWeight: 900, color: 'var(--qq-card-text)',
                  background: 'linear-gradient(135deg,#334155,#1e293b)',
                }}>#{rank}</div>
                <div style={{ fontSize: 'clamp(20px,2.3cqw,34px)', fontWeight: 900, color: '#475569', letterSpacing: '0.5em' }}>· · ·</div>
                <div />
                <div style={{
                  fontSize: 'clamp(13px,1.35cqw,21px)', fontWeight: 900, color: '#475569',
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>{pts} P</div>
              </div>
            );
          }
          return (
            <div key={idx} style={{
              flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center',
              gap: 'clamp(12px,1.4cqw,22px)', padding: '0 clamp(14px,1.6cqw,24px)', borderRadius: 18,
              minHeight: 'clamp(52px,6.5cqh,84px)', position: 'relative', overflow: 'hidden',
              transformOrigin: 'center bottom',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.11), rgba(22,163,74,0.04))',
              border: '2px solid rgba(34,197,94,0.4)',
              animation: 'qqCT2Flip 0.55s var(--qq-ease-out-cubic) both',
              ...(themedWindow({ ok: true }) ?? {}),
            }}>
              {/* Stimmen-Balken als Hintergrund */}
              <div aria-hidden style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(slot.count / maxVotes) * 100}%`,
                background: 'linear-gradient(90deg, rgba(236,72,153,0.13), rgba(236,72,153,0.02))',
                transformOrigin: 'left center', animation: 'qqCT2Bar 0.7s var(--qq-ease-out-cubic) 0.2s both',
                pointerEvents: 'none',
              }} />
              <div style={{
                width: 'clamp(44px,4.4cqw,66px)', height: 'clamp(44px,4.4cqw,66px)',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 14, background: badgeBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(20px,2cqw,32px)', fontWeight: 900, color: '#0a0814',
                textShadow: '0 1px 2px rgba(255,255,255,0.2)', zIndex: 1,
                boxShadow: rank === 1 ? '0 0 20px rgba(236,72,153,0.5)' : '0 3px 8px rgba(0,0,0,0.35)',
              }}>#{rank}</div>
              <div style={{ minWidth: 0, zIndex: 1 }}>
                <div style={{
                  fontSize: 'clamp(20px,2.3cqw,34px)', fontWeight: 900, lineHeight: 1.1,
                  color: QQ_COLORS.green300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{slot.label}</div>
                {slot.autoSurfaced && (
                  <div style={{ fontSize: 'clamp(10px,0.95cqw,14px)', fontWeight: 800, color: 'var(--qq-text-muted)', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    🎤 {lang === 'en' ? 'from the crowd' : 'aus der Menge'}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, zIndex: 1 }}>
                {isMega
                  ? <FactionCountAvatars teams={hitters} de={lang === 'de'} size={'clamp(46px, 4.6cqw, 70px)'} />
                  : hitters.slice(0, 6).map((tm, hi) => (
                    <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} teamEmoji={tm.emoji}
                      size={'clamp(46px, 4.6cqw, 70px)'} title={tm.name}
                      style={{
                        boxShadow: `0 0 9px ${tm.color}44`,
                        animation: `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.25 + hi * 0.09}s both`,
                      }} />
                  ))}
                {!isMega && hitters.length > 6 && (
                  <span style={{ fontSize: 'clamp(12px,1.1cqw,17px)', fontWeight: 900, color: 'var(--qq-text-muted)' }}>+{hitters.length - 6}</span>
                )}
              </div>
              {/* Stimmen + Board-Punkte */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, zIndex: 1, minWidth: 'clamp(56px,6.4cqw,100px)' }}>
                <span style={{ fontSize: 'clamp(11px,1.1cqw,17px)', fontWeight: 900, color: 'var(--qq-text-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  ×{slot.count}
                </span>
                <span style={{
                  fontSize: 'clamp(13px,1.35cqw,21px)', fontWeight: 900, color: '#fbcfe8',
                  padding: 'clamp(2px,0.25cqh,4px) clamp(7px,0.8cqw,13px)', borderRadius: 'var(--qq-pill-radius)',
                  background: 'rgba(236,72,153,0.14)', border: '1.5px solid rgba(236,72,153,0.4)',
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>{pts} P</span>
              </div>
            </div>
          );
        })}

        {board.otherCount > 0 && (
          <div style={{
            flexShrink: 0, textAlign: 'center', fontSize: 'clamp(11px,1.05cqw,16px)', fontWeight: 800,
            color: 'var(--qq-text-muted)', opacity: revealedMinIdx === 0 ? 1 : 0, transition: 'opacity 0.6s ease 0.3s',
          }}>+ {board.otherCount} {lang === 'en' ? 'other answers from the crowd' : 'weitere Antworten aus der Menge'}</div>
        )}

        {n === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900, color: 'var(--qq-text-muted)' }}>
            {lang === 'en' ? 'No answers.' : 'Keine Antworten.'}
          </div>
        )}
      </div>

      {/* Sieger-Banner (reserviert, poppt am Ende) */}
      <div style={{ flexShrink: 0, height: 'clamp(70px,11cqh,120px)', marginTop: 'clamp(8px,1.6cqh,18px)', position: 'relative' }}>
        {winnerLit ? (
          winnerTeams.length === 0 ? (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(18px,2cqw,30px)', fontWeight: 900, color: '#f87171',
              background: 'rgba(248,113,113,0.08)', border: '2px solid rgba(248,113,113,0.3)',
              animation: 'qqCT2Rise 0.5s var(--qq-ease-bounce) both',
            }}>{lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}</div>
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(12px,1.4cqw,24px)', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.16), rgba(250,204,21,0.08))',
              border: '2.5px solid rgba(236,72,153,0.6)', boxShadow: '0 0 48px rgba(236,72,153,0.22)',
              animation: 'qqCT2Rise 0.55s var(--qq-ease-bounce) both', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 'clamp(11px,1.05cqw,16px)', fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                <QQEmojiIcon emoji="🏆" /> {lang === 'en' ? 'Round winner' : 'Rundensieger'}
              </span>
              {isMega ? (
                <FactionCountAvatars teams={winnerTeams} de={lang === 'de'} size={'clamp(60px,7.6cqh,104px)'} />
              ) : (
                <>
                  {winnerTeams.slice(0, 4).map(tm => (
                    <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} teamEmoji={tm.emoji}
                      size={'clamp(56px,7cqh,96px)'} title={tm.name}
                      style={{ boxShadow: `0 0 9px ${tm.color}44`, animation: 'celebShake 0.6s ease 0.5s both' }} />
                  ))}
                  {winnerTeams.length > 4 && (
                    <span style={{ fontSize: 'clamp(16px,1.8cqw,28px)', fontWeight: 900, color: 'var(--qq-text-muted)' }}>+{winnerTeams.length - 4}</span>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 20, border: '2px dashed rgba(148,163,184,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            fontSize: 'clamp(10px,1.05cqw,16px)', fontWeight: 900, color: '#475569', letterSpacing: '0.16em', textTransform: 'uppercase',
            padding: '0 clamp(12px,2cqw,32px)',
          }}>{lang === 'en' ? 'Rank 1 = 100 P · last = 20 P — who reads the crowd?' : 'Platz 1 = 100 P · letzter = 20 P — wer trifft die Menge?'}</div>
        )}
      </div>
    </div>
  );
}
