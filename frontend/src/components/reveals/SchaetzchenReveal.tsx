/**
 * SchaetzchenReveal v4 — "NUR STRAHL" (Redesign 2026-07-16, Wolf).
 *
 * v2 (Chip-Lanes+Connectors) war Chaos, v3 (Strahl + 2-spalt. Liste) war verwirrend
 * (Lese-Reihenfolge unklar). v4: NUR der Zahlenstrahl, KEINE Liste.
 *  - Antwort-Tafel oben zentriert (Wahrheit = 50%, Gold, Count-up).
 *  - Mess-Schiene mittig + Gold-Wahrheits-Diamant + Skalen-Endlabels.
 *  - Jede Fraktion: Wappen direkt an ihrer Tipp-Position, in ZWEI Lanes (oben/unten
 *    am Strahl → halbe Dichte), sanft entzerrt (nur bei Overlap minimal geschoben),
 *    kurzer Stiel zur Schiene, Wert + signiertes Delta (+ Punkte in Arena) am Wappen.
 *  - Sieger: Gold-Ring + Pop + Gold-Messstrecke zur Wahrheit. Schätzchen-Identität
 *    ist Gold/Gelb (kein Pink).
 *
 * Beats: 0 Wappen steigen · 1 Beam + Count-up · 2 Nicht-Sieger dimmen · 3 Sieger-Pop.
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
const DIM = 0.5; // brightness() der nicht-Sieger beim Saal-Dimmen (Wolf: Sieger klarer heben)

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
  // 2026-07-18 (Wolf „warum gewinnt jetzt das team? das wird hier nicht
  // ersichtlich"): wenn der Sieg NICHT ueber Naehe/Punkte entschieden wurde,
  // sondern ueber den Abschick-Zeitpunkt (Punkte-Gleichstand UND gleicher Abstand
  // zur Wahrheit, z.B. alle spot-on = alle 100P), dann wirkt der Sieger willkuerlich.
  // In dem Fall kennzeichnen wir ihn als „am schnellsten" (Speed-Tiebreak sichtbar).
  const winnerBySpeed = useMemo(() => {
    const w = rankedFinal[0], second = rankedFinal[1];
    if (!w || !second) return false;
    const sameDist = w.delta === second.delta;
    const samePts = !isMega || ptsOfAvatar(w.team.avatarId) === ptsOfAvatar(second.team.avatarId);
    return sameDist && samePts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedFinal, isMega, factionScores]);
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

  // Redesign 2026-07-16 v4 (Wolf 'nur Strahl, keine Liste'): die Wappen sitzen
  // direkt am Strahl an ihrer Tipp-Position, in ZWEI Lanes (abwechselnd ober-/
  // unterhalb → halbe Dichte pro Reihe), sanft entzerrt (nur bei Overlap minimal
  // auseinandergeschoben, dann auf den echten Schwerpunkt zentriert). KEIN
  // Connector-Chaos: Tick UND Wappen sitzen auf derselben (ggf. minimal
  // verschobenen) Position, der Wert steht am Wappen. Keine Rangliste mehr.
  const spread = (arr: Array<{ x: number; cx: number; r?: { teamId: string } }>) => {
    if (arr.length < 2) return;
    const LO = 5, HI = 95; // % Mindestabstand der Wappen-Mitten in einer Lane
    // 2026-07-17 (Wolf bild 9): der Sieger ist ~2x so gross → braucht rechts/links
    // deutlich mehr Luft (20%) als die kleinen Wappen untereinander (12%), sonst
    // ueberlappt sein Gold-Ring den Nachbarn im dichten Cluster.
    const winId = winner?.teamId;
    arr.sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < arr.length; i++) {
      const nearWin = arr[i].r?.teamId === winId || arr[i - 1].r?.teamId === winId;
      const min = nearWin ? 20 : 12;
      if (arr[i].cx < arr[i - 1].cx + min) arr[i].cx = arr[i - 1].cx + min;
    }
    const meanReal = arr.reduce((s, c) => s + c.x, 0) / arr.length;
    const meanCx = arr.reduce((s, c) => s + c.cx, 0) / arr.length;
    const shift = meanReal - meanCx;
    for (const c of arr) c.cx += shift;
    const minCx = Math.min(...arr.map(c => c.cx));
    const maxCx = Math.max(...arr.map(c => c.cx));
    if (minCx < LO) { const d = LO - minCx; for (const c of arr) c.cx += d; }
    else if (maxCx > HI) { const d = maxCx - HI; for (const c of arr) c.cx -= d; }
  };
  const placed = useMemo(() => {
    // nach Tippwert sortiert, abwechselnd obere/untere Lane, jede Lane separat entzerrt.
    // 2026-07-17 (Wolf bild 9): der Sieger IMMER in die obere Lane (Hero oben, wie im
    // sauberen Fall) → er kollidiert nicht mehr mit einem kleinen Nachbarn unten.
    const winId = winner?.teamId;
    let k = 0;
    const sorted = [...rankedFinal]
      .sort((a, b) => a.num - b.num)
      .map((r) => {
        const isWin = r.teamId === winId;
        return { r, x: axisPct(r.num), cx: axisPct(r.num), above: isWin ? true : (k++ % 2 === 1) };
      });
    const above = sorted.filter(c => c.above);
    spread(sorted.filter(c => !c.above));
    spread(above);
    // 2026-07-18 (Wolf 'Sieger liegt am weitesten weg vom Zielstreifen'): bei
    // dicht/identisch geclusterten Tipps (z.B. alle spot-on) streute spread den
    // Sieger ans Lane-Extrem — obwohl er der beste ist, wirkte er als "weit weg".
    // Fix: den Sieger auf seine ECHTE Tipp-Position (axisPct) verankern (spot-on
    // = Ziel-Mitte), die restliche obere Lane relativ mitschieben, dann clampen.
    const win = above.find(c => c.r.teamId === winId);
    if (win) {
      const dx = axisPct(winner!.num) - win.cx;
      if (dx) {
        for (const c of above) c.cx += dx;
        const lo = Math.min(...above.map(c => c.cx)), hi = Math.max(...above.map(c => c.cx));
        if (lo < 5) { const d = 5 - lo; for (const c of above) c.cx += d; }
        else if (hi > 95) { const d = hi - 95; for (const c of above) c.cx -= d; }
      }
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedFinal, axisPct, winner]);

  const wx = winner ? axisPct(winner.num) : 50;

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

      {/* Bühne: NUR Strahl (Wolf 2026-07-16 v4). Wappen sitzen in zwei Lanes direkt
          am Strahl an ihrer Tipp-Position, Wert+Delta am Wappen. Keine Liste. */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1 }}>
        {placed.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700,
          }}>{lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}</div>
        ) : (() => {
          const RAIL = 54; // % Höhe: die Mess-Schiene, Wappen darüber/darunter
          const winnerCx = placed.find(p => p.r.teamId === winner?.teamId)?.cx ?? wx;
          return (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${CONTENT_INSET}%`, right: `${CONTENT_INSET}%` }}>
            {/* Licht-Sweep */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', opacity: 0,
              background: 'linear-gradient(105deg, transparent 38%, rgba(255,244,214,0.13) 50%, transparent 62%)',
              animation: struck && !reduce ? 'qqStr2Sweep 0.9s var(--qq-enter) both' : 'none',
            }} />

            {/* Antwort-Tafel oben zentriert (Wahrheit = 50%) */}
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
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4.8cqw, 84px)', fontWeight: 700,
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
              position: 'absolute', left: `${tx}%`, top: '24%', height: `${RAIL - 24}%`, width: 'clamp(5px,0.62cqw,12px)', zIndex: 1,
              transform: `translateX(-50%) scaleY(${struck ? 1 : 0})`, transformOrigin: 'top center', borderRadius: 8,
              background: `linear-gradient(180deg, ${GOLD_BRIGHT} 0%, ${GOLD_BRIGHT} 65%, ${GOLD}1f 100%)`,
              boxShadow: `0 0 40px 7px ${GOLD}80`,
              transition: reduce ? 'none' : 'transform 0.7s var(--qq-enter)',
            }} />

            {/* Skalen-Endlabels (auf Schienen-Höhe) */}
            <div aria-hidden style={{
              position: 'absolute', left: 0, top: `${RAIL - 6}%`, zIndex: 2,
              fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>← {lang === 'en' ? 'too low' : 'zu niedrig'}</div>
            <div aria-hidden style={{
              position: 'absolute', right: 0, top: `${RAIL - 6}%`, zIndex: 2,
              fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>{lang === 'en' ? 'too high' : 'zu hoch'} →</div>

            {/* Mess-Schiene */}
            <div aria-hidden style={{
              position: 'absolute', left: 0, right: 0, top: `${RAIL}%`, height: 5, borderRadius: 5, zIndex: 2,
              transform: 'translateY(-50%)',
              background: `linear-gradient(90deg, transparent, ${GOLD}4d 10%, rgba(255,244,214,0.55) 50%, ${GOLD}4d 90%, transparent)`,
              boxShadow: `0 0 22px ${GOLD}40`,
            }} />

            {/* Gold-Messstrecke Sieger → Wahrheit (Schätzchen-Identität = Gold) */}
            {winner && winner.delta > 0 && (
              <div aria-hidden style={{
                position: 'absolute', top: `${RAIL}%`, zIndex: 3, height: 5, borderRadius: 5,
                left: `${Math.min(winnerCx, tx)}%`, width: `${Math.abs(tx - winnerCx)}%`,
                transform: `translateY(-50%) scaleX(${lit ? 1 : 0})`,
                transformOrigin: winnerCx <= tx ? 'left center' : 'right center',
                background: `linear-gradient(90deg, ${GOLD}, ${GOLD}40)`,
                boxShadow: `0 0 16px ${GOLD}99`,
                transition: reduce ? 'none' : 'transform 0.55s var(--qq-carry)',
              }} />
            )}

            {/* Wahrheits-Marker (Gold-Diamant) auf der Schiene */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: `${RAIL}%`, width: 'clamp(13px,1.4cqw,24px)', height: 'clamp(13px,1.4cqw,24px)',
              transform: `translate(-50%, -50%) rotate(45deg) scale(${struck ? 1 : 0})`, zIndex: 6,
              background: GOLD_BRIGHT, borderRadius: 3, boxShadow: `0 0 18px 4px ${GOLD}aa`,
              transition: reduce ? 'none' : 'transform 0.5s var(--qq-celebrate) 0.2s',
            }} />

            {/* Wappen an ihrer Tipp-Position, zwei Lanes (oben/unten am Strahl) */}
            {placed.map(({ r, cx, above }, i) => {
              const isWin = r.teamId === winner?.teamId;
              const dimmed = housedark && !(isWin && lit);
              const diff = r.num - target;
              const exact = diff === 0;
              // Wolf 2026-07-16 (bild 5 'unklar wer Sieger, alle gleich gross'):
              // Sieger deutlich groesser als der Rest → unuebersehbar, welches Wappen
              // gewonnen hat (Sieger = Punkte-Sieger, nicht zwingend der naechste Tipp).
              const av = isWin ? 'clamp(68px, 8.2cqw, 134px)' : 'clamp(38px, 4.3cqw, 68px)';
              return (
                <div key={r.teamId} style={{
                  position: 'absolute', left: `${cx}%`,
                  ...(above ? { bottom: `${100 - RAIL + 1}%` } : { top: `${RAIL + 1}%` }),
                  transform: 'translateX(-50%)', zIndex: isWin && lit ? 8 : 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(2px,0.4cqh,6px)',
                  filter: dimmed ? `brightness(${DIM}) saturate(0.82)` : 'none',
                  transition: 'filter 0.5s var(--qq-enter)',
                  animation: !reduce ? `qqStr2Rise 0.5s var(--qq-enter) ${0.35 + i * 0.08}s both` : 'none',
                }}>
                  {/* untere Lane: kurzer Stiel NACH OBEN zur Schiene steht vor dem Wappen;
                      obere Lane: Wert zuerst, dann Wappen, dann Stiel nach unten. Reihenfolge
                      via column-reverse fuer die obere Lane, damit das Wappen der Schiene am
                      naechsten ist. */}
                  {above && (
                    <span aria-hidden style={{ order: 3, width: 2, height: 'clamp(6px,1.2cqh,16px)', background: r.team.color, opacity: 0.6, borderRadius: 2 }} />
                  )}
                  {/* Wappen (Sieger: gross, dicker Gold-Doppelring + Krone drueber).
                      2026-07-17 (Wolf bild 9 „quetscht"): beim Sieger IMMER Wappen
                      zuerst (order 1) → Krone oben frei, Wert-Label darunter (kein
                      Kollaps von Label+Krone mehr). */}
                  <div style={{
                    order: isWin ? 1 : (above ? 2 : 1),
                    position: 'relative',
                    borderRadius: '50%',
                    transform: isWin && lit ? 'scale(1.14)' : 'scale(1)',
                    transition: 'transform 0.5s var(--qq-celebrate)',
                    boxShadow: isWin && lit ? `0 0 0 5px ${GOLD}, 0 0 0 9px ${GOLD}55, 0 0 48px 7px ${GOLD}aa` : `0 0 0 2px ${r.team.color}, 0 0 14px ${r.team.color}66`,
                  }}>
                    {isWin && lit && (
                      <span aria-hidden style={{
                        position: 'absolute', top: '-52%', left: '50%', transform: 'translateX(-50%)',
                        fontSize: 'clamp(22px, 2.8cqw, 48px)', lineHeight: 1, zIndex: 9,
                        filter: `drop-shadow(0 0 14px ${GOLD}) drop-shadow(0 3px 6px rgba(0,0,0,0.5))`,
                      }}><QQEmojiIcon emoji="👑" /></span>
                    )}
                    <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={av} />
                  </div>
                  {/* Wert + Delta (+ Punkte in Arena) — beim Sieger IMMER unter dem Wappen. */}
                  <div style={{
                    order: isWin ? 2 : (above ? 1 : 2), marginTop: isWin ? 'clamp(4px,0.7cqh,10px)' : 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.05,
                    background: 'rgba(12,10,30,0.66)', borderRadius: 'clamp(8px,0.9cqw,14px)',
                    padding: 'clamp(2px,0.4cqh,5px) clamp(6px,0.8cqw,12px)',
                    border: `1.5px solid ${isWin && lit ? GOLD + 'aa' : 'rgba(255,255,255,0.12)'}`,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 'clamp(14px,1.5cqw,26px)', fontWeight: 700,
                      color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    }}>{fmt(r.num)}</span>
                    <span style={{
                      fontSize: 'clamp(10px,1cqw,16px)', fontWeight: 900, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                      color: exact ? MINT : 'var(--qq-text-muted)',
                    }}>
                      {exact ? (lang === 'en' ? '✨ spot on' : '✨ getroffen') : (diff > 0 ? `▲ +${fmt(diff)}` : `▼ −${fmt(Math.abs(diff))}`)}
                      {isMega && <span style={{ color: isWin && lit ? GOLD_BRIGHT : GOLD, marginLeft: 6 }}>· {ptsOfAvatar(r.team.avatarId)}P</span>}
                    </span>
                    {/* „am schnellsten": nur beim Sieger, nur wenn der Sieg per
                        Abschick-Zeitpunkt entschieden wurde (Gleichstand). Macht den
                        sonst willkuerlich wirkenden Sieger nachvollziehbar.
                        TODO Wolf-Symbol: ⚡ gegen geliefertes „am schnellsten"-Icon tauschen. */}
                    {isWin && lit && winnerBySpeed && (
                      <span style={{
                        marginTop: 'clamp(2px,0.35cqh,5px)',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 'clamp(9px,0.95cqw,15px)', fontWeight: 900, whiteSpace: 'nowrap',
                        letterSpacing: '0.02em', color: GOLD_BRIGHT,
                        textShadow: `0 0 10px ${GOLD}aa`,
                      }}>
                        <span aria-hidden style={{ filter: `drop-shadow(0 0 6px ${GOLD}cc)` }}>⚡</span>
                        {lang === 'en' ? 'fastest' : 'am schnellsten'}
                      </span>
                    )}
                  </div>
                  {/* untere Lane: Stiel nach OBEN zur Schiene (order 0 = ganz oben) */}
                  {!above && (
                    <span aria-hidden style={{ order: 0, width: 2, height: 'clamp(6px,1.2cqh,16px)', background: r.team.color, opacity: 0.6, borderRadius: 2 }} />
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
