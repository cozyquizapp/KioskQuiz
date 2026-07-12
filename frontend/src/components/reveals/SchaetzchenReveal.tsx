/**
 * SchaetzchenReveal — "Der Zahlenstrahl IST die Bühne, und er LEBT" (Konzept A, 2026-07-12).
 *
 * DESIGN_BRIEF.md: Bühne statt Applikation. Ein emotionaler Zweck = Überraschung
 * → Feier ("die Antwort ist X — und WER hat's getroffen?"). KEINE Karten, kein
 * Dashboard. Der Zahlenstrahl spannt full-bleed über den ganzen Screen, die Tier-
 * Avatare LEBEN darauf (schweben leicht), die riesige Antwort thront über dem Ziel,
 * der Gewinner rastet gefeiert am Ziel ein. Rangliste = die räumliche Position.
 *
 * Hero-STAFFELSTAB (Wolf-Feedback 2026-07-12): erst ist die Zahl der Hero (Count-up,
 * Beat 2), dann schrumpft sie zum Anker über dem Ziel und der GEWINNER wird der Hero
 * (Beat 3) — nacheinander, nicht gleichzeitig. Der Zahlenstrahl ist ein Spielobjekt:
 * Marker schweben, Sieger rastet ein (Dock), Ziel sendet einen Lichtimpuls über die
 * Linie, Fireflies reagieren auf den Einschlag, Nicht-Sieger treten zurück.
 *
 * Reveal als SEQUENZ (5 Beats): Bühne → Tipps steigen auf (leben) → Ziel+Count-up+
 * Sweep → Zahl schrumpft/Gewinner rastet ein+Impuls+Fireflies → Sieger-Callout.
 * animate-Skill (Emil Kowalski): bespoke Keyframes + rAF, ease-out, reduced-motion.
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

// Ambient-Fireflies (fixe Positionen für ruhiges, kontrolliertes Flimmern über der Bühne).
const FIREFLIES = [
  { x: 14, y: 20, s: 5, d: 0, dur: 7.2 }, { x: 33, y: 11, s: 4, d: 1.4, dur: 8.6 },
  { x: 52, y: 17, s: 6, d: 0.6, dur: 7.9 }, { x: 71, y: 13, s: 4, d: 2.1, dur: 9.1 },
  { x: 85, y: 23, s: 5, d: 0.9, dur: 8.0 }, { x: 22, y: 40, s: 4, d: 1.8, dur: 8.8 },
  { x: 61, y: 35, s: 5, d: 0.3, dur: 7.5 }, { x: 90, y: 43, s: 4, d: 2.6, dur: 9.4 },
  { x: 45, y: 46, s: 5, d: 1.1, dur: 8.2 },
];
// Firefly-Burst am Einschlag des Siegers (Richtungen in px).
const BURST = [
  { dx: -72, dy: -46 }, { dx: -30, dy: -66 }, { dx: 32, dy: -62 },
  { dx: 72, dy: -40 }, { dx: -58, dy: 22 }, { dx: 58, dy: 26 },
];

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
      // Tipps steigen auf: aufsteigende Kaskade.
      rankedFinal.forEach((_, i) => {
        ts.push(setTimeout(() => { try { playAvatarCascadeNote(rankedFinal.length - 1 - i, rankedFinal.length + 1); } catch {} }, 350 + (rankedFinal.length - i) * 75));
      });
      // Antwort landet (Ende Count-up): heller Ping. Sieger rastet ein (Dock): grosser Climax.
      ts.push(setTimeout(() => { try { playAvatarCascadeNote(0, rankedFinal.length + 2); } catch {} }, 2450));
      ts.push(setTimeout(() => { try { playClimaxFinish(); } catch {} }, 2850));
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
  const won = beat >= 3; // Hero-Staffelstab übergeben: ab hier ist der GEWINNER der Hero, die Zahl der Anker.

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(18px, 2.4cqh, 32px) clamp(24px, 3.4cqw, 60px) clamp(14px, 1.8cqh, 26px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes qqSweep{0%{transform:translateX(-130%) skewX(-14deg);opacity:0}18%{opacity:.5}100%{transform:translateX(360%) skewX(-14deg);opacity:0}}
        @keyframes qqDock{0%{transform:scale(1)}30%{transform:scale(1.34) rotate(-3deg)}52%{transform:scale(0.96) rotate(1.5deg)}72%{transform:scale(1.08)}100%{transform:scale(1)}}
        @keyframes qqRing{0%{transform:translate(-50%,-50%) scale(.5);opacity:.6}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}
        @keyframes qqHeroPop{0%{transform:scale(.5);opacity:0}62%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes qqRise{0%{transform:translateY(26px) scale(.4);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
        @keyframes qqFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes qqFloatWin{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes qqFly{0%{transform:translate(0,0);opacity:0}20%{opacity:.65}50%{transform:translate(12px,-18px);opacity:.4}80%{opacity:.55}100%{transform:translate(-8px,-34px);opacity:0}}
        @keyframes qqBurst{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}25%{opacity:1}100%{transform:translate(calc(-50% + var(--bx)),calc(-50% + var(--by))) scale(1);opacity:0}}
        @keyframes qqLinePulse{0%{transform:translateX(-50%) scaleX(0);opacity:.9}100%{transform:translateX(-50%) scaleX(1);opacity:0}}
      `}</style>

      {/* Hintergrund reagiert auf die Siegerfarbe (Beat 3) */}
      {winner && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(60% 62% at ${targetX}% 58%, ${winner.delta === 0 ? MINT : winner.team.color}22, transparent 66%)`,
          opacity: won ? 1 : 0, transition: 'opacity 1s var(--qq-enter)',
        }} />
      )}

      {/* Ambient-Fireflies über der Bühne (leben, füllen die Fläche ohne Widget) */}
      {!reduce && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          {FIREFLIES.map((f, i) => (
            <span key={i} style={{
              position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: f.s, height: f.s, borderRadius: '50%',
              background: i % 3 === 0 ? 'rgba(255,214,150,0.9)' : 'rgba(var(--qq-accent-rgb),0.85)',
              boxShadow: i % 3 === 0 ? '0 0 8px rgba(255,214,150,0.7)' : '0 0 8px rgba(var(--qq-accent-rgb),0.7)',
              animation: `qqFly ${f.dur}s ease-in-out ${f.d}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Licht-Sweep im Reveal-Moment (Beat 2) */}
      {beat === 2 && !reduce && (
        <div aria-hidden style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%', zIndex: 6, pointerEvents: 'none',
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.16), rgba(var(--qq-accent-rgb),0.12), transparent)',
          animation: 'qqSweep 0.95s var(--qq-enter) both',
        }} />
      )}

      {/* ── Kopf: Eyebrow + Frage (tritt im Reveal zurück → Broadcast, macht Platz für die Antwort) ── */}
      <div style={{
        flexShrink: 0, position: 'relative', zIndex: 2, maxWidth: '62%', transformOrigin: 'left top',
        transform: won ? 'scale(0.9) translateY(-4px)' : 'none', opacity: won ? 0.66 : 1,
        transition: 'transform 0.6s var(--qq-enter), opacity 0.6s var(--qq-enter)',
      }}>
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

            {/* Lichtimpuls: das Ziel sendet beim Einschlag eine Welle über die Linie (Beat 3) */}
            {won && !reduce && (
              <div aria-hidden style={{
                position: 'absolute', left: `${targetX}%`, top: '58%', width: '78%', height: 5, borderRadius: 4,
                transform: 'translate(-50%,-50%)', transformOrigin: 'center', zIndex: 3, pointerEvents: 'none',
                background: `linear-gradient(90deg, transparent, ${MINT}, rgba(255,255,255,0.9), ${MINT}, transparent)`,
                boxShadow: `0 0 22px ${MINT}`, animation: 'qqLinePulse 0.7s var(--qq-enter) both',
              }} />
            )}

            {/* Riesige Antwort — Hero bei Beat 2 (Count-up), schrumpft ab Beat 3 zum ANKER über dem Ziel */}
            <div style={{
              position: 'absolute', top: '30%', left: `${heroX}%`,
              transform: `translate(-50%, -50%) scale(${won ? 0.5 : 1})`, transformOrigin: 'center center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4,
              opacity: beat >= 2 ? 1 : 0, whiteSpace: 'nowrap',
              transition: 'transform 0.6s var(--qq-enter)',
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
                  textShadow: won ? '0 4px 16px rgba(0,0,0,0.4)' : '0 0 70px rgba(var(--qq-accent-rgb),0.5), 0 6px 26px rgba(0,0,0,0.45)',
                  transition: 'text-shadow 0.6s var(--qq-enter)',
                  animation: beat === 2 && !reduce ? 'qqHeroPop 0.55s var(--qq-celebrate) both' : 'none',
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
              background: MINT, boxShadow: `0 0 20px ${MINT}`, zIndex: 3,
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

            {/* Nicht-Sieger-Marker: Avatare leben (schweben), treten beim Einschlag des Siegers zurück (Beat 1/3) */}
            {rankedFinal.map((r, idx) => {
              if (idx === 0) return null; // Sieger separat
              const above = placeAbove[r.teamId];
              const av = 'clamp(44px, 4.6cqw, 78px)';
              return (
                <div key={r.teamId} aria-hidden={false} style={{
                  position: 'absolute', left: `${scale.pos(r.num)}%`, top: '58%',
                  transform: 'translate(-50%, -50%)', zIndex: 2,
                  opacity: won ? 0.82 : 1, filter: won ? 'brightness(0.82) saturate(0.9)' : 'none',
                  transition: 'opacity 0.5s var(--qq-enter), filter 0.5s var(--qq-enter)',
                }}>
                  {/* Rise-Hülle (einmalig) */}
                  <div style={{
                    opacity: beat >= 1 ? undefined : 0,
                    animation: beat >= 1 && !reduce ? `qqRise 0.5s var(--qq-celebrate) ${(rankedFinal.length - idx) * 0.07}s both` : 'none',
                  }}>
                    {/* Float-Hülle (lebt weiter, gestaffelt gegen Gleichtakt) */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      animation: !reduce ? `qqFloat ${3.2 + (idx % 3) * 0.5}s ease-in-out ${0.7 + (rankedFinal.length - idx) * 0.07 + (idx % 4) * 0.3}s infinite` : 'none',
                    }}>
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
                          transform: above ? 'translateY(-6px)' : 'translateY(6px)',
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Firefly-Burst am Einschlag des Siegers (Beat 3) */}
            {won && !reduce && (
              <div aria-hidden style={{ position: 'absolute', left: `${scale.pos(winner!.num)}%`, top: '58%', zIndex: 6, pointerEvents: 'none' }}>
                {BURST.map((b, i) => (
                  <span key={i} style={{
                    position: 'absolute', left: 0, top: 0, width: 7, height: 7, borderRadius: '50%',
                    ['--bx' as any]: `${b.dx}px`, ['--by' as any]: `${b.dy}px`,
                    background: winnerStatus?.exact ? MINT : winner!.team.color,
                    boxShadow: `0 0 12px ${winnerStatus?.exact ? MINT : winner!.team.color}`,
                    animation: `qqBurst 0.8s var(--qq-enter) ${i * 0.03}s both`,
                  }} />
                ))}
              </div>
            )}

            {/* Sieger — lebt, rastet dann gefeiert am Ziel ein (gross, Hero ab Beat 3) */}
            {winner && (
              <div style={{
                position: 'absolute', left: `${scale.pos(winner.num)}%`, top: '58%',
                transform: 'translate(-50%, -50%)', zIndex: 5,
              }}>
                {/* Rise-Hülle (einmalig) */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(6px,0.9cqh,12px)',
                  opacity: beat >= 1 ? undefined : 0,
                  animation: beat >= 1 && !reduce ? 'qqRise 0.55s var(--qq-celebrate) 0.05s both' : 'none',
                }}>
                  {/* Float-Hülle bis zum Einrasten (danach ruhig, weil Dock übernimmt) */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(6px,0.9cqh,12px)',
                    animation: !reduce && !won ? 'qqFloatWin 3s ease-in-out 0.7s infinite' : 'none',
                  }}>
                    <div style={{
                      borderRadius: '50%',
                      boxShadow: `0 0 ${won ? 44 : 30}px ${winnerStatus?.exact ? MINT : winner.team.color}, 0 6px 18px rgba(0,0,0,0.4)`,
                      transition: 'box-shadow 0.5s var(--qq-enter)',
                      animation: won && !reduce ? 'qqDock 0.62s var(--qq-celebrate) both' : 'none',
                    }}>
                      <QQTeamAvatar avatarId={winner.team.avatarId} teamEmoji={winner.team.emoji} size={'clamp(84px, 9.5cqw, 156px)'} />
                    </div>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      opacity: won ? 1 : 0, transform: won ? 'none' : 'translateY(6px)',
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
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
