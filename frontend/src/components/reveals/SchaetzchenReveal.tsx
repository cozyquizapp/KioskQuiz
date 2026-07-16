/**
 * SchaetzchenReveal v3 — "STRAHL OBEN, RANGLISTE DARUNTER" (Redesign 2026-07-16, Wolf).
 *
 * v2 (Chip-Lanes mit Connector-Linien am Strahl) war unuebersichtlich — alles
 * ueberschnitt sich. Neu:
 *  - TOP-BAND: EIN Zahlenstrahl mit farbigen Ticks an den echten Tipp-Positionen
 *    (Farbe = Team) + Gold-Wahrheits-Marker + Antwort-Tafel zentriert am Zielwert.
 *    KEINE Werte/Chips/Connectors mehr am Strahl — nur die Ticks.
 *  - BOTTOM-BAND: 2-spaltige Rangliste (4×2 bei 8 Teams), column-major. Jede Zeile:
 *    Rang · Wappen (Team-Farb-Ring, verbindet zum Tick) · Name · Tipp · signiertes
 *    Delta (▲/▼) · Punkte (nur Arena). Sieger gold hervorgehoben, kein Extra-Verdikt/
 *    Krone (Arena = anteilige Punkte).
 *  - Skalen-Endlabels "← zu niedrig / zu hoch →" links/rechts am Strahl.
 *
 * Beats: 0 Ticks/Liste steigen · 1 Beam + Count-up · 2 Nicht-Sieger dimmen · 3 Sieger-Pop.
 * Motion nur ueber transform/opacity, reduced-motion respektiert, Count-up mit
 * Hidden-Tab-Guard. Zahlen-Parsing (dt. Tausender/Dezimal) unveraendert.
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
  // 2026-07-15 (Wolf 'schau wo die wappen sind, wo das bild endet, wo der strahl
  // ist'): In der Arena liegt hinter der Bühne das Kolosseum-Bild (cover). Dessen
  // Schale endet deutlich vor dem Bildrand — volle Breite (Schiene/Ticks/Wappen bis
  // ~95%) schob Content in den dunklen Rand bzw. schnitt das rechte Wappen ab.
  // Darum die gesamte Strahl-Bühne in ein zentrales Band ziehen, das auf der Schale
  // sitzt. Nur Arena (der dunkle Default-BG braucht das nicht).
  const CONTENT_INSET = isMega ? 11 : 0; // % Rand je Seite
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

  // Redesign 2026-07-16 (Wolf 'Strahl oben + Liste darunter, design-optimiert'):
  // KEINE Chip-Lanes/Connectors mehr am Strahl. Der Strahl traegt nur farbige
  // Ticks an den echten Tipp-Positionen (Farbe = Team) + Wahrheits-Marker. Wer
  // welcher Tick ist, steht in der 2-spaltigen Rangliste im unteren Band (die
  // Team-Farbe verbindet Tick ↔ Listeneintrag).
  const ticks = useMemo(
    () => rankedFinal.map(r => ({ r, x: axisPct(r.num) })),
    [rankedFinal, axisPct],
  );

  const rankOf = useMemo(() => new Map(rankedFinal.map((r, i) => [r.teamId, i + 1])), [rankedFinal]);
  const wx = winner ? axisPct(winner.num) : 50;

  // ── Dramaturgie: 0 Chips · 1 Beam+Count-up · 2 Dimmen · 3 Sieger ──
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 3 : 0);
  const N = Math.max(1, ticks.length);
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
      ticks.forEach((_, i) => { ts.push(setTimeout(() => { try { playAvatarCascadeNote(i, N + 2); } catch {} }, 400 + i * 90)); });
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

      {/* Bühne: Top-Band = Strahl (nur farbige Ticks + Wahrheit), Bottom-Band =
          2-spaltige Rangliste. Redesign 2026-07-16 (Wolf), Chip-Lanes/Connectors raus. */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        {ticks.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700,
          }}>{lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}</div>
        ) : (() => {
          // 2-Spalten-Rangliste (4×2 bei 8). Column-major: linke Spalte Rang 1..half,
          // rechte den Rest → jede Spalte ist eine zusammenhaengende Rangfolge. Bei
          // wenigen Teams (≤4) eine Spalte (sonst zu leer).
          const two = N > 4;
          const half = Math.ceil(N / 2);
          const cols = two ? [rankedFinal.slice(0, half), rankedFinal.slice(half)] : [rankedFinal];

          const renderRow = (r: typeof rankedFinal[number]) => {
            const rank = rankOf.get(r.teamId) ?? 99;
            const isWin = r.teamId === winner?.teamId;
            const diff = r.num - target;
            const exact = diff === 0;
            const dimmed = housedark && !(isWin && lit);
            const badgeBg = rank === 1 ? QQ_COLORS.amber400 : rank === 2 ? QQ_COLORS.slate300 : rank === 3 ? QQ_COLORS.orange700 : 'rgba(255,255,255,0.10)';
            const badgeFg = rank <= 3 ? QQ_COLORS.bgPage : 'var(--qq-text-muted)';
            return (
              <div key={r.teamId} style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1cqw, 16px)',
                padding: 'clamp(5px,0.7cqh,10px) clamp(9px,1.1cqw,18px)',
                borderRadius: 'clamp(12px, 1.2cqw, 20px)',
                background: isWin && lit
                  ? `linear-gradient(90deg, ${GOLD}2e, ${GOLD}12)`
                  : 'rgba(12,10,30,0.55)',
                border: `2px solid ${isWin && lit ? GOLD + 'cc' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isWin && lit ? `0 0 26px ${GOLD}44` : 'none',
                filter: dimmed ? `brightness(${DIM}) saturate(0.82)` : 'none',
                transform: isWin && lit ? 'scale(1.02)' : 'scale(1)',
                transition: 'filter 0.5s ease, transform 0.5s var(--qq-celebrate), background 0.4s ease, border-color 0.4s ease',
                animation: !reduce ? `qqStr2Rise 0.5s var(--qq-enter) ${0.3 + (rank - 1) * 0.07}s both` : 'none',
                minWidth: 0,
              }}>
                {/* Rang-Badge */}
                <span style={{
                  flexShrink: 0, width: 'clamp(24px,2.4cqw,40px)', height: 'clamp(24px,2.4cqw,40px)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(13px,1.3cqw,22px)', fontWeight: 700,
                  color: badgeFg, background: badgeBg, boxShadow: rank <= 3 ? '0 3px 8px rgba(0,0,0,0.4)' : 'none',
                }}>{rank}</span>
                {/* Wappen mit Team-Farb-Ring (verbindet zum Tick) */}
                <div style={{
                  flexShrink: 0, borderRadius: '50%',
                  boxShadow: isWin && lit ? `0 0 0 2.5px ${GOLD}, 0 0 20px ${GOLD}77` : `0 0 0 2px ${r.team.color}, 0 0 12px ${r.team.color}55`,
                }}>
                  <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size="clamp(38px, 4.2cqw, 62px)" />
                </div>
                {/* Name */}
                <span style={{
                  flex: 1, minWidth: 0, fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(15px, 1.5cqw, 27px)', fontWeight: 700, color: 'var(--qq-card-text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{r.team.name}</span>
                {/* Tipp-Wert */}
                <span style={{
                  flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(17px, 1.8cqw, 32px)',
                  fontWeight: 700, color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                }}>{fmt(r.num)}{unitStr ? <span style={{ fontSize: '0.6em', fontWeight: 900, opacity: 0.6, marginLeft: 2 }}>{unitStr}</span> : null}</span>
                {/* Signiertes Delta */}
                <span style={{
                  flexShrink: 0, minWidth: 'clamp(52px,5cqw,90px)', textAlign: 'right',
                  fontSize: 'clamp(11px, 1.15cqw, 20px)', fontWeight: 900, whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  color: exact ? MINT : 'var(--qq-text-muted)',
                }}>{exact ? '✨' : (diff > 0 ? `▲ +${fmt(diff)}` : `▼ −${fmt(Math.abs(diff))}`)}</span>
                {/* Punkte (nur Arena) */}
                {isMega && (
                  <span style={{
                    flexShrink: 0, minWidth: 'clamp(42px,4cqw,72px)', textAlign: 'right',
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 1.7cqw, 30px)', fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: isWin && lit ? GOLD_BRIGHT : 'var(--qq-accent)',
                  }}>{ptsOfAvatar(r.team.avatarId)}<span style={{ fontSize: '0.55em', fontWeight: 900, opacity: 0.7, marginLeft: 2 }}>P</span></span>
                )}
              </div>
            );
          };

          return (
          <>
            {/* ── TOP-BAND: Strahl mit farbigen Ticks + Wahrheit ── */}
            <div style={{
              position: 'relative', flexShrink: 0, height: 'clamp(150px, 30cqh, 320px)',
              marginLeft: `${CONTENT_INSET}%`, marginRight: `${CONTENT_INSET}%`,
            }}>
              {/* Licht-Sweep */}
              <div aria-hidden style={{
                position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', opacity: 0,
                background: 'linear-gradient(105deg, transparent 38%, rgba(255,244,214,0.13) 50%, transparent 62%)',
                animation: struck && !reduce ? 'qqStr2Sweep 0.9s var(--qq-enter) both' : 'none',
              }} />

              {/* Antwort-Tafel (immer zentriert: Wahrheit sitzt auf 50%) */}
              <div aria-hidden style={{
                position: 'absolute', left: `${tx}%`, top: 0, transform: 'translateX(-50%)',
                zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: struck ? 1 : 0, transition: 'opacity 0.35s var(--qq-enter)',
              }}>
                <span style={{
                  fontSize: 'clamp(9px, 0.95cqw, 14px)', fontWeight: 900, color: 'var(--qq-text-muted)',
                  letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4,
                }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
                <div style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(3px,0.5cqw,9px)',
                  padding: 'clamp(6px,0.9cqh,13px) clamp(14px,1.6cqw,26px)', borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(30,24,58,0.94), rgba(10,8,24,0.94))',
                  boxShadow: `0 0 0 2px ${GOLD}8c, 0 0 52px 10px ${GOLD}61, inset 0 1px 0 rgba(255,255,255,0.10)`,
                  animation: struck && !reduce ? 'qqStr2Strike 0.5s var(--qq-celebrate) both' : 'none',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5.2cqw, 92px)', fontWeight: 700,
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
                position: 'absolute', left: `${tx}%`, top: '46%', height: '30%', width: 'clamp(5px,0.62cqw,12px)', zIndex: 3,
                transform: `translateX(-50%) scaleY(${struck ? 1 : 0})`, transformOrigin: 'top center', borderRadius: 8,
                background: `linear-gradient(180deg, ${GOLD_BRIGHT} 0%, ${GOLD_BRIGHT} 65%, ${GOLD}1f 100%)`,
                boxShadow: `0 0 40px 7px ${GOLD}80`,
                transition: reduce ? 'none' : 'transform 0.7s var(--qq-enter)',
              }} />

              {/* Skalen-Endlabels */}
              <div aria-hidden style={{
                position: 'absolute', left: 0, top: '70%', zIndex: 2,
                fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>← {lang === 'en' ? 'too low' : 'zu niedrig'}</div>
              <div aria-hidden style={{
                position: 'absolute', right: 0, top: '70%', zIndex: 2,
                fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>{lang === 'en' ? 'too high' : 'zu hoch'} →</div>

              {/* Mess-Schiene */}
              <div aria-hidden style={{
                position: 'absolute', left: 0, right: 0, top: '80%', height: 5, borderRadius: 5, zIndex: 2,
                background: `linear-gradient(90deg, transparent, ${GOLD}4d 10%, rgba(255,244,214,0.55) 50%, ${GOLD}4d 90%, transparent)`,
                boxShadow: `0 0 22px ${GOLD}40`,
              }} />

              {/* Pink-Messstrecke Sieger → Wahrheit */}
              {winner && winner.delta > 0 && (
                <div aria-hidden style={{
                  position: 'absolute', top: '80%', zIndex: 3, height: 5, borderRadius: 5,
                  left: `${Math.min(wx, tx)}%`, width: `${Math.abs(tx - wx)}%`,
                  transform: `translateY(-50%) scaleX(${lit ? 1 : 0})`,
                  transformOrigin: wx <= tx ? 'left center' : 'right center',
                  background: 'linear-gradient(90deg, var(--qq-accent), rgba(var(--qq-accent-rgb),0.25))',
                  boxShadow: '0 0 16px rgba(var(--qq-accent-rgb),0.6)',
                  transition: reduce ? 'none' : 'transform 0.55s var(--qq-carry)',
                }} />
              )}

              {/* Wahrheits-Marker (Gold-Diamant) auf der Schiene */}
              <div aria-hidden style={{
                position: 'absolute', left: `${tx}%`, top: '80%', width: 'clamp(12px,1.3cqw,22px)', height: 'clamp(12px,1.3cqw,22px)',
                transform: `translate(-50%, -50%) rotate(45deg) scale(${struck ? 1 : 0})`, zIndex: 6,
                background: GOLD_BRIGHT, borderRadius: 3, boxShadow: `0 0 18px 4px ${GOLD}aa`,
                transition: reduce ? 'none' : 'transform 0.5s var(--qq-celebrate) 0.2s',
              }} />

              {/* Farbige Ticks an den echten Tipp-Positionen (nur Ticks, keine Werte) */}
              {ticks.map(({ r, x }) => {
                const isWin = r.teamId === winner?.teamId;
                return (
                  <div key={'tick-' + r.teamId} aria-hidden style={{
                    position: 'absolute', left: `${x}%`, top: isWin ? '70%' : '73%',
                    width: isWin ? 'clamp(5px,0.6cqw,10px)' : 'clamp(3px,0.4cqw,7px)', height: isWin ? '20%' : '14%',
                    borderRadius: 4, transform: 'translateX(-50%)', zIndex: isWin ? 5 : 3, background: r.team.color,
                    boxShadow: `0 0 12px ${r.team.color}${isWin ? 'ee' : '99'}`,
                    opacity: housedark && !isWin ? 0.32 : 1, transition: 'opacity 0.4s ease',
                  }} />
                );
              })}
            </div>

            {/* ── BOTTOM-BAND: 2-spaltige Rangliste ── */}
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', gap: 'clamp(10px, 1.6cqw, 28px)',
              marginTop: 'clamp(8px, 1.6cqh, 22px)', alignItems: 'stretch',
              paddingLeft: `${CONTENT_INSET}%`, paddingRight: `${CONTENT_INSET}%`,
            }}>
              {cols.map((col, ci) => (
                <div key={ci} style={{
                  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
                  gap: 'clamp(5px, 0.8cqh, 12px)', justifyContent: 'center',
                }}>
                  {col.map(renderRow)}
                </div>
              ))}
            </div>
          </>
          );
        })()}
      </div>
    </div>
  );
}
