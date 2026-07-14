/**
 * SchaetzchenReveal v2 — "EIN STRAHL, EINE REIHE" (Redesign 2026-07-14).
 *
 * Fixes gegenüber v1 (User-Feedback):
 *  - Lesbarkeit: Werte deutlich größer, signierte Deltas (▲ +3 / ▼ −7) direkt am Chip
 *  - Kein Ober/Unter-Layout mehr: EIN Zahlenstrahl mit farbigen Ticks an den echten
 *    Tipp-Positionen, darunter EINE entzerrte Chip-Reihe mit Connector-Linien
 *    (gestrichelt) zu den Ticks — enge Tipps überlappen nie
 *  - Skalen-Endlabels "← zu niedrig / zu hoch →" ersetzen die implizite Ober/Unter-Codierung
 *  - Antwort-Tafel sitzt AUF dem Gold-Beam am Zielwert (Held bleibt räumlich verankert)
 *  - Sieger geht nicht unter: stärkeres Saal-Dimmen, Pop (scale 1.16) + Gold-Ring,
 *    Verdikt-Pill direkt am Sieger-Chip, Rang-Badges 1/2/3, Pink-Messstrecke zur Wahrheit
 *
 * Beats: 0 Chips steigen · 1 Beam + Count-up · 2 Saal dimmt · 3 Sieger-Pop + Verdikt.
 * Motion nur über transform/opacity, reduced-motion respektiert, Count-up mit
 * Hidden-Tab-Guard. Zahlen-Parsing (dt. Tausender/Dezimal) unverändert aus v1.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqMegaFactionName, qqMegaFactionSlug, qqIsMega } from '../../../../shared/quarterQuizTypes';
import { qqDistanceFactionScores, qqSchaetzchenParse } from '../../../../shared/qqDistanceScore';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId } from '../../qqTheme';

const MINT = QQ_COLORS.green300;
const GOLD = '#EAB308';
const GOLD_BRIGHT = '#FDE68A';
const DIM = 0.62; // brightness() der nicht-Sieger beim Saal-Dimmen

// Tipp-Zahl robust parsen: deutsche Tausender-Punkte + Dezimalkomma korrekt.
function parseGuess(raw: unknown): number {
  let t = String(raw ?? '').trim().replace(/[^\d.,-]/g, '');
  const hasDot = t.includes('.'), hasComma = t.includes(',');
  if (hasDot && hasComma) {
    t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (hasComma) {
    const p = t.split(',');
    t = (p.length === 2 && p[1].length !== 3) ? p[0] + '.' + p[1] : t.replace(/,/g, '');
  } else if (hasDot) {
    const p = t.split('.');
    if (!(p.length === 2 && p[1].length !== 3)) t = t.replace(/\./g, '');
  }
  return Number(t);
}

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
        const num = parseGuess(a.text);
        const team = s.teams.find(t => t.id === a.teamId);
        if (!team || !Number.isFinite(num)) return null;
        return { teamId: a.teamId, num, team, delta: Math.abs(num - target), submittedAt: a.submittedAt };
      })
      .filter((x): x is { teamId: string; num: number; team: NonNullable<ReturnType<typeof s.teams.find>>; delta: number; submittedAt: number } => !!x)
      .sort((a, b) => a.delta - b.delta || a.submittedAt - b.submittedAt);
  }, [s.answers, s.teams, target]);

  // CozyArena: pro Fraktion auf den besten Tipp bündeln.
  const isMega = qqIsMega(s);
  // Arena-Wertung EXAKT wie Backend (per Handy, Ø über verbundene Handys) — nur
  // mega. Marker bleibt der beste Tipp (Visual), aber Ranking/Sieger = Punkte, so
  // matcht der Sieger 1:1 das Standing (Wolf 2026-07-14). qqSchaetzchenParse =
  // exakt der Backend-Parser fuer SCHAETZCHEN.
  const factionScores = useMemo(
    () => isMega
      ? qqDistanceFactionScores(s.answers.map(a => ({ teamId: a.teamId, text: a.text })), target, q.unit, s.teams as any, qqSchaetzchenParse)
      : new Map(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMega, s.answers, s.teams, target, q.unit],
  );
  const ptsOfAvatar = (av: string) => Math.round((factionScores.get(av) as any)?.points ?? 0);
  const rankedFinal = useMemo(() => {
    if (!isMega) return ranked;
    const bestByAvatar = new Map<string, typeof ranked[number]>();
    for (const r of ranked) {
      const prev = bestByAvatar.get(r.team.avatarId);
      if (!prev || r.delta < prev.delta) bestByAvatar.set(r.team.avatarId, r);
    }
    return [...bestByAvatar.values()]
      .map(r => ({ ...r, team: { ...r.team, name: qqMegaFactionName(r.team.avatarId, lang), emoji: qqMegaFactionSlug(r.team.avatarId) ?? r.team.emoji } }))
      // Ranking nach Backend-Punkten (nicht bester Tipp) → Sieger = Standing-Sieger.
      .sort((a, b) => (ptsOfAvatar(b.team.avatarId) - ptsOfAvatar(a.team.avatarId)) || a.delta - b.delta || a.submittedAt - b.submittedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, isMega, lang, factionScores]);

  const winner = rankedFinal[0] ?? null;
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId();

  // Achse auf die Wahrheit zentriert, Ausreißer geclamped.
  const axisPct = useMemo(() => {
    let half = 1;
    for (const r of rankedFinal) half = Math.max(half, Math.abs(r.num - target));
    const span = half * 1.18 || 1;
    return (v: number) => Math.max(5, Math.min(95, 50 + ((v - target) / span) * 43));
  }, [rankedFinal, target]);
  const tx = axisPct(target);

  // Chips nach Tippwert sortieren, dann in ZWEI Lanes verteilen (abwechselnd ober-
  // und unterhalb des Strahls — Wolf 2026-07-14: „mehr Platz zur Verteilung, klarer
  // welches Team wo steht"). Jede Lane wird SEPARAT entzerrt → halb so viele Chips
  // pro Reihe = viel mehr horizontaler Raum, weniger Kollision. Tick bleibt an der
  // echten Position, Connector verbindet zur (ggf. verschobenen) Chip-Spalte.
  const spread = (arr: Array<{ cx: number }>) => {
    if (!arr.length) return;
    const LO = 6, HI = 94, MIN = Math.min(17, (HI - LO) / Math.max(1, arr.length - 1));
    let last = LO - MIN;
    arr.forEach(c => { c.cx = Math.max(c.cx, last + MIN); last = c.cx; });
    const overflow = arr[arr.length - 1].cx - HI;
    if (overflow > 0) {
      let prev = HI + MIN;
      for (let i = arr.length - 1; i >= 0; i--) { arr[i].cx = Math.min(arr[i].cx, prev - MIN); prev = arr[i].cx; }
    }
  };
  const placed = useMemo(() => {
    const sorted = [...rankedFinal]
      .sort((a, b) => a.num - b.num)
      .map((r, i) => ({ r, x: axisPct(r.num), cx: axisPct(r.num), above: i % 2 === 1 }));
    if (!sorted.length) return sorted;
    spread(sorted.filter(c => !c.above)); // untere Lane
    spread(sorted.filter(c => c.above));  // obere Lane
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedFinal, axisPct]);

  const rankOf = useMemo(() => new Map(rankedFinal.map((r, i) => [r.teamId, i + 1])), [rankedFinal]);
  const wx = winner ? axisPct(winner.num) : 50;

  const offWord = lang === 'en' ? 'off' : 'daneben';
  const winnerExact = !!winner && winner.delta === 0;

  // ── Dramaturgie: 0 Chips · 1 Beam+Count-up · 2 Dimmen · 3 Sieger ──
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 3 : 0);
  const N = Math.max(1, placed.length);
  useEffect(() => {
    if (reduce) return;
    const sfx = !s.sfxMuted;
    const tBeam = 400 + N * 90 + 350;
    const tDark = tBeam + 1200;
    const tWin = tDark + 550;
    const ts: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setBeat(1), tBeam),
      setTimeout(() => setBeat(2), tDark),
      setTimeout(() => setBeat(3), tWin),
    ];
    if (sfx) {
      placed.forEach((_, i) => { ts.push(setTimeout(() => { try { playAvatarCascadeNote(i, N + 2); } catch {} }, 400 + i * 90)); });
      ts.push(setTimeout(() => { try { playClimaxFinish(); } catch {} }, tWin));
    }
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count-up (Hidden-Tab-Guard; Jahre nicht hochzählen).
  const [shown, setShown] = useState<number>(reduce ? target : 0);
  const doCount = !isYearUnit;
  const rafRef = useRef<number | null>(null);
  const startCount = beat >= 1;
  useEffect(() => {
    if (!startCount) return;
    if (reduce || !doCount || (typeof document !== 'undefined' && document.hidden)) { setShown(target); return; }
    const start = performance.now(); const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(target * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick); else setShown(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startCount, target, reduce, doCount]);

  const struck = beat >= 1;
  const housedark = beat >= 2;
  const lit = beat >= 3;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(14px, 2cqh, 26px) clamp(20px, 3cqw, 52px) clamp(10px, 1.4cqh, 20px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes qqStr2Rise{0%{transform:translateY(24px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes qqStr2Strike{0%{transform:scale(1.07)}100%{transform:scale(1)}}
        @keyframes qqStr2Sweep{0%{transform:translateX(-60%);opacity:0}25%{opacity:1}100%{transform:translateX(60%);opacity:0}}
        @keyframes qqStr2Conf{0%{transform:translateY(0) rotate(0) scale(.4);opacity:0}20%{opacity:1}100%{transform:translateY(-11cqh) rotate(220deg);opacity:0}}
      `}</style>

      {/* Kopf */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 6 }}>
        <div style={{
          fontSize: 'clamp(11px, 1.05cqw, 16px)', fontWeight: 900, color: 'var(--qq-accent)',
          letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 'clamp(3px, 0.5cqh, 7px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <QQEmojiIcon emoji="🎯" /> {lang === 'en' ? 'Guess It · Reveal' : 'Schätzchen · Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 90 ? 'clamp(16px, 1.8cqw, 29px)' : 'clamp(18px, 2.3cqw, 37px)',
          fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.01em', color: 'var(--qq-card-text)',
          maxWidth: '62%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          animation: 'langFadeIn 0.4s ease both', textWrap: 'pretty',
        }}>{qText}</div>
      </div>

      {/* Bühne */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1 }}>
        {placed.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700,
          }}>{lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}</div>
        ) : (
          <>
            {/* Licht-Sweep */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', opacity: 0,
              background: 'linear-gradient(105deg, transparent 38%, rgba(255,244,214,0.13) 50%, transparent 62%)',
              animation: struck && !reduce ? 'qqStr2Sweep 0.9s var(--qq-enter) both' : 'none',
            }} />

            {/* Antwort-Tafel AUF dem Beam am Zielwert */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: '6%', transform: 'translateX(-50%)',
              zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center',
              opacity: struck ? 1 : 0, transition: 'opacity 0.35s var(--qq-enter)',
            }}>
              <span style={{
                fontSize: 'clamp(9px, 0.95cqw, 14px)', fontWeight: 900, color: 'var(--qq-text-muted)',
                letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 5,
              }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
              <div style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(3px,0.5cqw,9px)',
                padding: 'clamp(7px,1.1cqh,15px) clamp(15px,1.7cqw,28px)', borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(30,24,58,0.94), rgba(10,8,24,0.94))',
                boxShadow: `0 0 0 2px ${GOLD}8c, 0 0 52px 10px ${GOLD}61, inset 0 1px 0 rgba(255,255,255,0.10)`,
                animation: struck && !reduce ? 'qqStr2Strike 0.5s var(--qq-celebrate) both' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 6.4cqw, 112px)', fontWeight: 700,
                  lineHeight: 0.92, color: GOLD_BRIGHT, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                  textShadow: `0 0 30px ${GOLD}8c`,
                }}>{fmt(shown)}</span>
                {unitStr && (
                  <span style={{ fontSize: 'clamp(13px, 1.6cqw, 26px)', fontWeight: 900, color: GOLD }}>{unitStr}</span>
                )}
              </div>
            </div>

            {/* Wahrheits-Beam (Tafel → Schiene) */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: '24%', height: '24%', width: 'clamp(5px,0.62cqw,12px)', zIndex: 3,
              transform: `translateX(-50%) scaleY(${struck ? 1 : 0})`, transformOrigin: 'top center', borderRadius: 8,
              background: `linear-gradient(180deg, ${GOLD_BRIGHT} 0%, ${GOLD_BRIGHT} 65%, ${GOLD}1f 100%)`,
              boxShadow: `0 0 40px 7px ${GOLD}80`,
              transition: reduce ? 'none' : 'transform 0.7s var(--qq-enter)',
            }} />

            {/* Skalen-Endlabels — ersetzen Ober/Unter-Codierung */}
            <div aria-hidden style={{
              position: 'absolute', left: '1%', top: '41%', zIndex: 2,
              fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>← {lang === 'en' ? 'too low' : 'zu niedrig'}</div>
            <div aria-hidden style={{
              position: 'absolute', right: '1%', top: '41%', zIndex: 2,
              fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>{lang === 'en' ? 'too high' : 'zu hoch'} →</div>

            {/* Mess-Schiene */}
            <div aria-hidden style={{
              position: 'absolute', left: '1%', right: '1%', top: '48%', height: 5, borderRadius: 5, zIndex: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD}4d 10%, rgba(255,244,214,0.55) 50%, ${GOLD}4d 90%, transparent)`,
              boxShadow: `0 0 22px ${GOLD}40`,
            }} />

            {/* Pink-Messstrecke Sieger → Wahrheit */}
            {winner && winner.delta > 0 && (
              <div aria-hidden style={{
                position: 'absolute', top: '48%', zIndex: 3, height: 5, borderRadius: 5,
                left: `${Math.min(wx, tx)}%`, width: `${Math.abs(tx - wx)}%`,
                transform: `translateY(-50%) scaleX(${lit ? 1 : 0})`,
                transformOrigin: wx <= tx ? 'left center' : 'right center',
                background: 'linear-gradient(90deg, var(--qq-accent), rgba(var(--qq-accent-rgb),0.25))',
                boxShadow: '0 0 16px rgba(var(--qq-accent-rgb),0.6)',
                transition: reduce ? 'none' : 'transform 0.55s var(--qq-carry)',
              }} />
            )}

            {/* Ticks an den echten Tipp-Positionen */}
            {placed.map(({ r, x }) => {
              const isWin = r.teamId === winner?.teamId;
              return (
                <div key={'tick-' + r.teamId} aria-hidden style={{
                  position: 'absolute', left: `${x}%`, top: '44.5%', width: 'clamp(3px,0.4cqw,7px)', height: '7%',
                  borderRadius: 4, transform: 'translateX(-50%)', zIndex: 3, background: r.team.color,
                  boxShadow: `0 0 12px ${r.team.color}99`,
                  opacity: housedark && !isWin ? 0.35 : 1, transition: 'opacity 0.4s ease',
                }} />
              );
            })}

            {/* Connectors Tick → Chip (oben: hoch, unten: runter) */}
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}>
              {placed.map(({ r, x, cx, above }) => {
                const isWin = r.teamId === winner?.teamId;
                const dimmed = housedark && !(isWin && lit);
                const y1 = above ? 46 : 52;
                const y2 = above ? 43.5 : 57.5;
                return (
                  <line key={'ln-' + r.teamId} x1={x} y1={y1} x2={cx} y2={y2}
                    stroke={dimmed ? 'rgba(148,163,184,0.18)' : r.team.color + '66'}
                    strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
                );
              })}
            </svg>

            {/* Saallicht dimmt */}
            <div aria-hidden style={{
              position: 'absolute', inset: '-6%', pointerEvents: 'none', zIndex: 4,
              background: 'radial-gradient(120% 90% at 50% 55%, transparent 34%, rgba(6,4,14,0.9) 100%)',
              opacity: housedark ? 1 : 0, transition: 'opacity 0.7s var(--qq-enter)',
            }} />

            {/* Chip-Reihe (zwei Lanes: oben/unten am Strahl, je separat entzerrt) */}
            {placed.map(({ r, cx, above }, i) => {
              const isWin = r.teamId === winner?.teamId;
              const rank = rankOf.get(r.teamId) ?? 99;
              const dimmed = housedark && !(isWin && lit);
              const diff = r.num - target;
              const exact = diff === 0;
              // Chips duerfen breiter sein — pro Lane nur ~halb so viele.
              const laneW = `${92 / Math.max(3, Math.ceil(N / 2))}cqw`;
              return (
                <div key={r.teamId} style={{
                  position: 'absolute', left: `${cx}%`,
                  ...(above ? { bottom: '56%' } : { top: '57%' }),
                  width: laneW, minWidth: 'clamp(64px,8cqw,150px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transform: 'translateX(-50%)', zIndex: isWin && lit ? 8 : 3,
                  animation: !reduce ? `qqStr2Rise 0.5s var(--qq-enter) ${0.35 + i * 0.09}s both` : 'none',
                }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px,0.7cqh,10px)',
                    transformOrigin: above ? 'center bottom' : 'center top',
                    transform: isWin && lit ? 'scale(1.16)' : 'scale(1)',
                    filter: dimmed ? `brightness(${DIM}) saturate(0.8)` : 'none',
                    transition: 'filter 0.5s var(--qq-enter), transform 0.5s var(--qq-celebrate)',
                  }}>
                    <div style={{
                      position: 'relative', borderRadius: '50%',
                      boxShadow: isWin && lit
                        ? `0 0 0 3px ${GOLD}e6, 0 0 42px ${GOLD}a6, 0 8px 22px rgba(0,0,0,0.45)`
                        : `0 0 14px ${r.team.color}44`,
                      transition: 'box-shadow 0.4s ease',
                    }}>
                      <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size="clamp(48px, 6cqw, 108px)" />
                      {/* Rang-Badge 1/2/3 */}
                      {rank <= 3 && (
                        <div style={{
                          position: 'absolute', top: '-8%', left: '-10%',
                          minWidth: 'clamp(18px,1.9cqw,32px)', height: 'clamp(18px,1.9cqw,32px)', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontSize: 'clamp(11px,1.05cqw,18px)', fontWeight: 700,
                          color: QQ_COLORS.bgPage,
                          background: rank === 1 ? QQ_COLORS.amber400 : rank === 2 ? QQ_COLORS.slate300 : QQ_COLORS.orange700,
                          boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                          opacity: lit ? 1 : 0, transition: 'opacity 0.4s ease',
                        }}>{rank}</div>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 1.25cqw, 20px)',
                      fontWeight: 700, color: 'var(--qq-card-text)', whiteSpace: 'nowrap',
                      maxWidth: laneW, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{r.team.name}</span>
                    {/* Wert + signiertes Delta */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(3px,0.45cqw,8px)',
                      padding: 'clamp(3px,0.55cqh,7px) clamp(8px,1cqw,16px)', borderRadius: 'var(--qq-pill-radius)',
                      background: isWin && lit ? 'rgba(var(--qq-accent-rgb),0.24)' : 'rgba(12,10,30,0.72)',
                      border: `1.5px solid ${isWin && lit ? 'var(--qq-accent)' : 'rgba(255,255,255,0.14)'}`,
                      transition: 'background 0.4s ease, border-color 0.4s ease',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 1.85cqw, 31px)',
                        fontWeight: 700, color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                      }}>{fmt(r.num)}</span>
                      <span style={{
                        fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                        color: exact ? MINT : (isWin && lit ? GOLD_BRIGHT : 'var(--qq-text-muted)'),
                      }}>{exact ? '✨ exakt' : (diff > 0 ? `▲ +${fmt(diff)}` : `▼ −${fmt(Math.abs(diff))}`)}</span>
                    </div>
                    {/* Verdikt direkt am Sieger */}
                    {isWin && lit && (
                      <div style={{
                        marginTop: 'clamp(2px,0.3cqh,5px)', padding: 'clamp(3px,0.5cqh,6px) clamp(9px,1.1cqw,17px)',
                        borderRadius: 'var(--qq-pill-radius)', whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(11px, 1.15cqw, 19px)', fontWeight: 700,
                        color: exact ? MINT : 'var(--qq-accent)',
                        background: exact ? 'rgba(134,239,172,0.18)' : 'rgba(var(--qq-accent-rgb),0.2)',
                        border: `1.5px solid ${exact ? 'rgba(134,239,172,0.55)' : 'rgba(var(--qq-accent-rgb),0.55)'}`,
                        animation: !reduce ? 'qqStr2Rise 0.45s var(--qq-enter) 0.1s both' : 'none',
                      }}>{exact
                        ? (lang === 'en' ? '✨ spot on' : '✨ getroffen')
                        : isMega
                          ? `🏆 ${lang === 'en' ? 'leads' : 'vorne'} · ${ptsOfAvatar(r.team.avatarId)} P`
                          : `🏆 ${lang === 'en' ? 'closest' : 'am nächsten'} · ${fmt(winner!.delta)} ${offWord}`}</div>
                    )}
                  </div>
                  {/* Konfetti am Sieger */}
                  {isWin && lit && !reduce && (
                    <div aria-hidden style={{ position: 'absolute', top: 0, left: '50%', zIndex: 9, pointerEvents: 'none' }}>
                      {Array.from({ length: 10 }, (_, ci) => (
                        <span key={ci} style={{
                          position: 'absolute', left: 0, top: 0,
                          transform: `rotate(${-160 + ci * 32 + (ci % 2 ? 8 : -8)}deg)`, transformOrigin: '0 0',
                        }}>
                          <span style={{
                            display: 'block', width: 8, height: 12, borderRadius: 2,
                            background: ci % 2 === 0 ? (exact ? MINT : r.team.color) : 'var(--qq-accent)',
                            animation: `qqStr2Conf 0.9s var(--qq-enter) ${ci * 0.03}s both`,
                          }} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
