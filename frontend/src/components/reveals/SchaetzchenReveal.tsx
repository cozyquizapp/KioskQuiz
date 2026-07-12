/**
 * SchaetzchenReveal — "Der Zahlenstrahl IST die Bühne" (Konzept A, 2026-07-12).
 *
 * DESIGN_BRIEF.md: Bühne statt Applikation. Ein emotionaler Zweck = Überraschung
 * → Feier ("die Antwort ist X — und WER hat's getroffen?"). KEINE Karten, kein
 * Dashboard. Der Zahlenstrahl spannt full-bleed über den ganzen Screen, die Tier-
 * Avatare stehen als Marker darauf, die riesige Antwort thront über dem Ziel, der
 * Gewinner dockt gefeiert an. Rangliste = die räumliche Position (näher = besser).
 *
 * Reveal als SEQUENZ (5 Beats): Bühne → Tipps steigen auf → Ziel+Count-up+Sweep →
 * Gewinner dockt an + Hintergrund reagiert → Sieger-Callout. animate-Skill (Emil
 * Kowalski): bespoke Keyframes + rAF, ease-out, reduced-motion respektiert.
 * [[project-design-system-audit-2026-07-12]]
 */

import { useState, useEffect, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqMegaFactionName, qqMegaFactionSlug } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId } from '../../qqTheme';

const MINT = QQ_COLORS.green300;

export function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  const unitStr = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
  const looksLikeYear = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
  const isYearUnit = !!q.isYearAnswer || /jahr|year/i.test(unitStr) || (target != null && looksLikeYear(target));
  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (isYearUnit) return String(Math.round(n));
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

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

  const isMega = !!(s as any).nestedTeams || new Set(s.teams.map(t => t.avatarId)).size < s.teams.length;
  const rankedFinal = useMemo(() => {
    if (!isMega) return ranked;
    const bestByAvatar = new Map<string, typeof ranked[number]>();
    for (const r of ranked) {
      const prev = bestByAvatar.get(r.team.avatarId);
      if (!prev || r.delta < prev.delta) bestByAvatar.set(r.team.avatarId, r);
    }
    return [...bestByAvatar.values()]
      .map(r => ({ ...r, team: { ...r.team, name: qqMegaFactionName(r.team.avatarId, lang), emoji: qqMegaFactionSlug(r.team.avatarId) ?? r.team.emoji } }))
      .sort((a, b) => a.delta - b.delta || a.submittedAt - b.submittedAt);
  }, [ranked, isMega, lang]);

  const winner = rankedFinal[0] ?? null;
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId();

  // Zahlenstrahl-Skala.
  const scale = useMemo(() => {
    const vals = rankedFinal.map(r => r.num).concat([target]);
    if (vals.length === 0) return { lo: 0, hi: 1, pos: () => 50 };
    const lo0 = Math.min(...vals), hi0 = Math.max(...vals);
    const span = Math.max(hi0 - lo0, Math.abs(target) * 0.04 || 1);
    const pad = span * 0.16;
    const lo = lo0 - pad, hi = hi0 + pad;
    return { lo, hi, pos: (v: number) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50) };
  }, [rankedFinal, target]);

  // Marker abwechselnd ober-/unterhalb der Linie (nach x-Position) gegen Überlappung.
  const placeAbove = useMemo(() => {
    const map: Record<string, boolean> = {};
    [...rankedFinal].sort((a, b) => a.num - b.num).forEach((r, i) => { map[r.teamId] = i % 2 === 0; });
    return map;
  }, [rankedFinal]);

  const offWord = lang === 'en' ? 'off' : 'daneben';
  const winnerStatus = winner
    ? (winner.delta === 0 ? { text: lang === 'en' ? 'exact' : 'genau', color: MINT, exact: true }
      : { text: lang === 'en' ? 'closest' : 'am nächsten', color: 'var(--qq-accent)', exact: false })
    : null;

  // ── Dramaturgie (5 Beats) ──
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 4 : 0);
  const [countVal, setCountVal] = useState<number>(reduce ? target : 0);
  useEffect(() => {
    if (reduce) return;
    const sfx = !s.sfxMuted;
    const ts: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setBeat(1), 350),
      setTimeout(() => setBeat(2), 1550),
      setTimeout(() => setBeat(3), 2850),
      setTimeout(() => setBeat(4), 3650),
    ];
    if (sfx) {
      rankedFinal.forEach((_, i) => {
        ts.push(setTimeout(() => { try { playAvatarCascadeNote(rankedFinal.length - 1 - i, rankedFinal.length + 1); } catch {} }, 350 + (rankedFinal.length - i) * 75));
      });
      ts.push(setTimeout(() => { try { playClimaxFinish(); } catch {} }, 1650));
    }
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (beat < 2 || reduce) { if (reduce) setCountVal(target); return; }
    let raf = 0; const t0 = performance.now(); const dur = 950;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setCountVal(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step); else setCountVal(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);
  const heroShown = reduce ? fmt(target) : (beat < 2 ? '' : (countVal >= target ? fmt(target) : fmt(Math.round(countVal))));

  const heroX = Math.min(80, Math.max(20, scale.pos(target))); // Hero-Zahl vor Rand-Clipping schützen
  const targetX = scale.pos(target);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(18px, 2.4cqh, 32px) clamp(24px, 3.4cqw, 60px) clamp(14px, 1.8cqh, 26px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes qqSweep{0%{transform:translateX(-130%) skewX(-14deg);opacity:0}18%{opacity:.5}100%{transform:translateX(360%) skewX(-14deg);opacity:0}}
        @keyframes qqDock{0%{transform:scale(1)}45%{transform:scale(1.4)}100%{transform:scale(1)}}
        @keyframes qqRing{0%{transform:translate(-50%,-50%) scale(.5);opacity:.6}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}
        @keyframes qqHeroPop{0%{transform:scale(.5);opacity:0}62%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes qqRise{0%{transform:translateY(26px) scale(.4);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
      `}</style>

      {/* Hintergrund reagiert auf die Siegerfarbe (Beat 3) */}
      {winner && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(60% 62% at ${targetX}% 58%, ${winner.delta === 0 ? MINT : winner.team.color}22, transparent 66%)`,
          opacity: beat >= 3 ? 1 : 0, transition: 'opacity 1s var(--qq-enter)',
        }} />
      )}
      {/* Licht-Sweep im Reveal-Moment (Beat 2) */}
      {beat === 2 && !reduce && (
        <div aria-hidden style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%', zIndex: 6, pointerEvents: 'none',
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.16), rgba(var(--qq-accent-rgb),0.12), transparent)',
          animation: 'qqSweep 0.95s var(--qq-enter) both',
        }} />
      )}

      {/* ── Kopf: Eyebrow + Frage (kompakt, oben) ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, maxWidth: '62%' }}>
        <div style={{
          fontSize: 'clamp(12px, 1.1cqw, 17px)', fontWeight: 900, color: 'var(--qq-accent)',
          letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 'clamp(5px, 0.7cqh, 10px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <QQEmojiIcon emoji="🎯" /> {lang === 'en' ? 'Guess It · Reveal' : 'Schätzchen · Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 110 ? 'clamp(20px, 2.2cqw, 36px)' : 'clamp(24px, 2.6cqw, 44px)',
          fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.01em', color: 'var(--qq-card-text)',
          animation: 'langFadeIn 0.4s ease both',
        }}>{qText}</div>
      </div>

      {/* ── Bühne: der Zahlenstrahl ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1 }}>
        {rankedFinal.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700,
          }}>{lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}</div>
        ) : (
          <>
            {/* Nähe-Zone (warmer Glow um das Ziel) */}
            <div aria-hidden style={{
              position: 'absolute', top: '30%', bottom: '20%', left: 0, right: 0, pointerEvents: 'none',
              background: `radial-gradient(20% 130% at ${targetX}% 50%, rgba(59,224,165,0.16), transparent 60%)`,
              opacity: beat >= 2 ? 1 : 0, transition: 'opacity 0.8s var(--qq-enter)',
            }} />

            {/* Verbindungs-Beam Zahl ↔ Linie */}
            <div aria-hidden style={{
              position: 'absolute', left: `${targetX}%`, top: '34%', height: '24%', width: 2, transform: 'translateX(-1px)',
              background: `linear-gradient(${MINT}, transparent)`, opacity: beat >= 2 ? 0.5 : 0,
              transition: 'opacity 0.6s var(--qq-enter)',
            }} />

            {/* Riesige Antwort (Hero, über dem Ziel, Count-up bei Beat 2) */}
            <div style={{
              position: 'absolute', top: '30%', left: `${heroX}%`, transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4,
              opacity: beat >= 2 ? 1 : 0, whiteSpace: 'nowrap',
            }}>
              <span style={{
                fontSize: 'clamp(11px, 1cqw, 16px)', fontWeight: 900, color: 'var(--qq-accent)',
                letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 'clamp(2px,0.4cqh,6px)',
              }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(6px,0.8cqw,12px)' }}>
                {beat === 2 && !reduce && (
                  <span aria-hidden style={{
                    position: 'absolute', top: '48%', left: '48%', width: '1.1em', height: '1.1em',
                    borderRadius: '50%', border: '3px solid var(--qq-accent)',
                    animation: 'qqRing 0.85s var(--qq-enter) 0.1s both', pointerEvents: 'none',
                  }} />
                )}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(74px, 11cqw, 210px)', fontWeight: 700, lineHeight: 0.82,
                  letterSpacing: '-0.02em', color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 0 70px rgba(var(--qq-accent-rgb),0.5), 0 6px 26px rgba(0,0,0,0.45)',
                  animation: beat >= 2 && !reduce ? 'qqHeroPop 0.55s var(--qq-celebrate) both' : 'none',
                }}>{heroShown}</span>
                {unitStr && (
                  <span style={{ fontSize: 'clamp(14px, 1.5cqw, 26px)', fontWeight: 800, color: 'var(--qq-text-muted)' }}>{unitStr}</span>
                )}
              </span>
            </div>

            {/* Die Linie */}
            <div aria-hidden style={{
              position: 'absolute', left: 0, right: 0, top: '58%', height: 5, borderRadius: 4,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
              transformOrigin: 'left center', transform: `scaleX(${beat >= 0 ? 1 : 0})`,
            }} />
            {/* Ziel-Tick */}
            <div style={{
              position: 'absolute', left: `${targetX}%`, top: '52%', height: '12%', width: 3, borderRadius: 2,
              transformOrigin: 'center', transform: `translateX(-1.5px) scaleY(${beat >= 2 ? 1 : 0})`,
              opacity: beat >= 2 ? 1 : 0, transition: 'transform 0.5s var(--qq-celebrate), opacity 0.4s',
              background: MINT, boxShadow: `0 0 20px ${MINT}`,
            }}>
              <span style={{
                position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
                fontSize: 'clamp(10px, 0.95cqw, 14px)', fontWeight: 900, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: MINT, whiteSpace: 'nowrap',
              }}>{lang === 'en' ? 'Target' : 'Ziel'}</span>
            </div>
            {/* Skala-Enden */}
            <div aria-hidden style={{
              position: 'absolute', left: 0, right: 0, top: 'calc(58% + 18px)',
              display: 'flex', justifyContent: 'space-between',
              fontSize: 'clamp(10px, 0.9cqw, 13px)', fontWeight: 800, color: 'var(--qq-text-muted)',
              fontVariantNumeric: 'tabular-nums', opacity: 0.55,
            }}><span>{fmt(scale.lo)}</span><span>{fmt(scale.hi)}</span></div>

            {/* Nicht-Sieger-Marker: Avatare abwechselnd ober-/unterhalb (Beat 1) */}
            {rankedFinal.map((r, idx) => {
              if (idx === 0) return null; // Sieger separat
              const above = placeAbove[r.teamId];
              const av = 'clamp(44px, 4.6cqw, 78px)';
              return (
                <div key={r.teamId} style={{
                  position: 'absolute', left: `${scale.pos(r.num)}%`, top: '58%',
                  transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  opacity: beat >= 1 ? undefined : 0,
                  animation: beat >= 1 && !reduce ? `qqRise 0.5s var(--qq-celebrate) ${(rankedFinal.length - idx) * 0.07}s both` : 'none',
                  zIndex: 2,
                }}>
                  {/* Ober-/Unterhalb: Avatar + Wert, mit Stem zur Linie */}
                  <div style={{ display: 'flex', flexDirection: above ? 'column' : 'column-reverse', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex', flexDirection: above ? 'column' : 'column-reverse', alignItems: 'center', gap: 2,
                      marginBottom: above ? 'clamp(6px,0.8cqh,12px)' : 0, marginTop: above ? 0 : 'clamp(6px,0.8cqh,12px)',
                    }}>
                      <div style={{ borderRadius: '50%', boxShadow: `0 0 13px ${r.team.color}77` }}>
                        <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={av} />
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.4cqw, 22px)', fontWeight: 700,
                        color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                      }}>{fmt(r.num)}</span>
                    </div>
                    {/* Stem + Punkt auf der Linie */}
                    <div style={{ width: 2, height: 'clamp(10px,1.4cqh,20px)', background: `${r.team.color}88` }} />
                    <div style={{
                      width: 'clamp(12px,1.2cqw,17px)', height: 'clamp(12px,1.2cqw,17px)', borderRadius: '50%',
                      background: r.team.color, border: '2px solid rgba(16,12,32,0.85)', boxShadow: `0 0 10px ${r.team.color}`,
                      marginTop: above ? 0 : 0, transform: above ? 'translateY(-6px)' : 'translateY(6px)',
                    }} />
                  </div>
                </div>
              );
            })}

            {/* Sieger — dockt gefeiert an (gross, auf der Linie, Beat 1 + Dock Beat 3) */}
            {winner && (
              <div style={{
                position: 'absolute', left: `${scale.pos(winner.num)}%`, top: '58%',
                transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(6px,0.9cqh,12px)',
                opacity: beat >= 1 ? undefined : 0,
                animation: beat >= 1 && !reduce ? 'qqRise 0.55s var(--qq-celebrate) 0.05s both' : 'none',
                zIndex: 5,
              }}>
                <div style={{
                  borderRadius: '50%',
                  boxShadow: `0 0 30px ${winnerStatus?.exact ? MINT : winner.team.color}, 0 6px 18px rgba(0,0,0,0.4)`,
                  animation: beat >= 3 && !reduce ? 'qqDock 0.6s var(--qq-celebrate) both' : 'none',
                }}>
                  <QQTeamAvatar avatarId={winner.team.avatarId} teamEmoji={winner.team.emoji} size={'clamp(84px, 9.5cqw, 156px)'} />
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  opacity: beat >= 3 ? 1 : 0, transform: beat >= 3 ? 'none' : 'translateY(6px)',
                  transition: 'opacity 0.5s var(--qq-enter), transform 0.5s var(--qq-enter)',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 1.9cqw, 30px)', fontWeight: 700,
                    color: 'var(--qq-card-text)', whiteSpace: 'nowrap', textShadow: `0 0 18px ${(winnerStatus?.exact ? MINT : winner.team.color)}66`,
                  }}>{winner.team.name}</span>
                  {winnerStatus && (
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.5cqw, 23px)', fontWeight: 700,
                      color: winnerStatus.color, whiteSpace: 'nowrap',
                      padding: 'clamp(3px,0.5cqh,6px) clamp(11px,1.2cqw,17px)', borderRadius: 'var(--qq-pill-radius)',
                      background: winnerStatus.exact ? 'rgba(59,224,165,0.20)' : 'rgba(var(--qq-accent-rgb),0.18)',
                      border: `1.5px solid ${winnerStatus.exact ? 'rgba(59,224,165,0.55)' : 'rgba(var(--qq-accent-rgb),0.5)'}`,
                    }}>{winnerStatus.exact ? '✨ ' : ''}{winnerStatus.text}{winner.delta > 0 ? ` · ${fmt(winner.delta)} ${offWord}` : ''}</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
