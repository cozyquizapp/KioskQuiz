/**
 * SchaetzchenReveal — Auflösung für Schätzchen-Kategorie (North Star Design).
 *
 * 2026-07-12 (Design-System North Star, Richtung C · Studio × CozyArena-DNA):
 * Neuaufbau der Praesentation gegen die "vibe-coded"-Befunde:
 *  - EIN Hero (die Antwort), kein doppeltes Riesen-Zahl-Duell.
 *  - Zahlenstrahl als Signatur-Viz: macht die Naehe SICHTBAR statt "Δ 3".
 *  - EINE Status-Sprache: "genau" / "N daneben".
 *  - Getierte Rangliste (Leader/Podium/Tail) ueber Elevation+Opacity, nicht Glow-Salat.
 *  - Ruhige Typo-Hierarchie (grosse Groessensprünge), ein Akzent, viel Luft.
 * Logik (ranked/rankedFinal/fmt/Cascade/Sound/i18n) unveraendert uebernommen.
 * Die hier eingefuehrten Bausteine (Zahlenstrahl, Rangzeile, Status) werden im
 * naechsten Schritt in geteilte Primitives extrahiert. [[project-design-system-audit-2026-07-12]]
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqMegaFactionName, qqMegaFactionSlug } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId } from '../../qqTheme';

// Semantik-Farben (eine Handschrift): Mint = "genau/exakt", Pink = Akzent.
const MINT = QQ_COLORS.green300;

export function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  // Jahreszahlen ohne Tausenderpunkt formatieren (sonst sieht 1500 wie 1.5 aus).
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

  // Parse + Distanz. Sort: bester (geringste |Δ|) zuerst, bei Tie schnellste Abgabe.
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

  // CozyArena: 1 Marker pro Fraktion = der BESTE (naechste) Tipp der Fraktion.
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

  const top5 = rankedFinal.slice(0, 5);
  const n = top5.length;
  const winner = rankedFinal[0] ?? null;

  // ── Dramaturgie: Reveal als SEQUENZ, nicht Endzustand (award-Feedback 2026-07-12).
  //   Beat 0: Bühne (Header + leerer Zahlenstrahl)
  //   Beat 1: Fraktions-Tipps steigen auf die Bühne (Spannung: wo ist die Antwort?)
  //   Beat 2: ZIEL leuchtet auf + Antwort zählt hoch + Licht-Sweep (der "Boah"-Moment)
  //   Beat 3: Gewinner dockt an die Antwort an, Hintergrund reagiert auf Siegerfarbe
  //   Beat 4: Rangliste enthüllt sich (Cascade) ── "ihr habt gerade gewonnen".
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 4 : 0);
  const [countVal, setCountVal] = useState<number>(reduce ? target : 0);
  useEffect(() => {
    if (reduce) return;
    const ts = [
      setTimeout(() => setBeat(1), 350),
      setTimeout(() => setBeat(2), 1550),
      setTimeout(() => setBeat(3), 2800),
      setTimeout(() => setBeat(4), 3600),
    ];
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Count-up der Hero-Zahl bei Beat 2 (ease-out, rAF).
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

  // Cascade #5 -> #1 (Sound je Row) — startet erst bei Beat 4 (nach dem Hero-Moment).
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 1500;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0 || beat < 4) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cascadeTotal = n + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const isTopRow = i === n - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          try { playAvatarCascadeNote(i, cascadeTotal); } catch {}
          if (isTopRow) { try { playClimaxFinish(); } catch {} }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, beat]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId(); // Re-render bei Skin-Wechsel

  // ── Zahlenstrahl-Skala: Spannweite aus allen Tipps + Ziel, mit Rand. ──
  const scale = useMemo(() => {
    const vals = rankedFinal.map(r => r.num).concat([target]);
    const lo0 = Math.min(...vals), hi0 = Math.max(...vals);
    const span = Math.max(hi0 - lo0, Math.abs(target) * 0.04 || 1);
    const pad = span * 0.14;
    const lo = lo0 - pad, hi = hi0 + pad;
    return { lo, hi, pos: (v: number) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50) };
  }, [rankedFinal, target]);

  const offWord = lang === 'en' ? 'off' : 'daneben';
  const statusOf = (delta: number, isWinner: boolean): { text: string; color: string } => {
    if (delta === 0) return { text: lang === 'en' ? 'exact' : 'genau', color: MINT };
    if (isWinner) return { text: lang === 'en' ? 'closest' : 'am nächsten', color: 'var(--qq-accent)' };
    return { text: `${fmt(delta)} ${offWord}`, color: 'var(--qq-text-muted)' };
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 1.8cqh, 22px)',
      padding: 'clamp(16px, 2cqh, 26px) clamp(22px, 3.2cqw, 52px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      {/* Choreografie-Keyframes (self-contained) */}
      <style>{`
        @keyframes qqSweep{0%{transform:translateX(-130%) skewX(-14deg);opacity:0}18%{opacity:.5}100%{transform:translateX(360%) skewX(-14deg);opacity:0}}
        @keyframes qqDock{0%{transform:scale(1)}45%{transform:scale(1.55)}100%{transform:scale(1)}}
        @keyframes qqRing{0%{transform:translate(-50%,-50%) scale(.5);opacity:.55}100%{transform:translate(-50%,-50%) scale(2.1);opacity:0}}
        @keyframes qqHeroPop{0%{transform:scale(.55);opacity:0}62%{transform:scale(1.09)}100%{transform:scale(1);opacity:1}}
      `}</style>
      {/* Hintergrund reagiert auf die Siegerfarbe (Beat 3) */}
      {winner && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(58% 60% at 74% 62%, ${winner.delta === 0 ? MINT : winner.team.color}26, transparent 68%)`,
          opacity: beat >= 3 ? 1 : 0, transition: 'opacity 0.9s var(--qq-enter)',
        }} />
      )}
      {/* Licht-Sweep im Reveal-Moment (Beat 2, einmalig) */}
      {beat === 2 && !reduce && (
        <div aria-hidden style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%', zIndex: 5, pointerEvents: 'none',
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.16), rgba(var(--qq-accent-rgb),0.12), transparent)',
          animation: 'qqSweep 0.95s var(--qq-enter) both',
        }} />
      )}
      {/* ── Header: Eyebrow + Frage ── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontSize: 'clamp(12px, 1.1cqw, 17px)', fontWeight: 900, color: 'var(--qq-accent)',
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 'clamp(6px, 0.8cqh, 12px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <QQEmojiIcon emoji="🎯" /> {lang === 'en' ? 'Guess It · Reveal' : 'Schätzchen · Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(24px, 2.6cqw, 42px)' : 'clamp(30px, 3.2cqw, 54px)',
          fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.01em', color: 'var(--qq-card-text)',
          animation: 'langFadeIn 0.4s ease both', maxWidth: '30ch',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Body: links Antwort + Zahlenstrahl, rechts Rangliste ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
        gap: 'clamp(18px, 2.6cqw, 40px)', minHeight: 0,
      }}>
        {/* Linke Spalte: EIN warmes Cozy-Panel — Hero-Antwort + Story-Zahlenstrahl */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          borderRadius: 'clamp(20px, 1.8cqw, 30px)',
          // Cozy-DNA: warme, pink-getönte Karte mit Tiefe (kein kaltes Flat-Panel).
          background: 'linear-gradient(165deg, rgba(var(--qq-accent-rgb),0.10) 0%, rgba(30,20,48,0.55) 45%, rgba(16,12,32,0.6) 100%)',
          border: '1px solid rgba(var(--qq-accent-rgb),0.22)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)',
          padding: 'clamp(22px, 2.8cqh, 40px) clamp(24px, 2.6cqw, 44px)',
          minHeight: 0, minWidth: 0, position: 'relative', overflow: 'hidden',
        }}>
          {/* Warmer Brand-Glow hinter der Hero-Zahl (DNA-Wärme) */}
          <div style={{
            position: 'absolute', top: '-8%', left: '4%', width: '52%', height: '58%',
            background: 'radial-gradient(circle at 30% 30%, rgba(var(--qq-accent-rgb),0.28), transparent 68%)',
            filter: 'blur(6px)', pointerEvents: 'none',
          }} />

          {/* Hero-Antwort — erscheint bei Beat 2 (Count-up + Ring-Puls) */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 'clamp(10px, 1.2cqw, 18px)', flexShrink: 0, position: 'relative', zIndex: 1,
            opacity: beat >= 2 ? 1 : 0,
          }}>
            <span style={{
              fontSize: 'clamp(11px, 1cqw, 16px)', fontWeight: 900, color: 'var(--qq-accent)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {beat === 2 && !reduce && (
                <span aria-hidden style={{
                  position: 'absolute', top: '50%', left: '50%', width: '1.15em', height: '1.15em',
                  borderRadius: '50%', border: '3px solid var(--qq-accent)',
                  animation: 'qqRing 0.85s var(--qq-enter) 0.1s both', pointerEvents: 'none',
                }} />
              )}
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(66px, 9.6cqw, 178px)', fontWeight: 700, lineHeight: 0.86,
                letterSpacing: '-0.02em', color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 60px rgba(var(--qq-accent-rgb),0.5), 0 4px 24px rgba(0,0,0,0.4)',
                animation: beat >= 2 && !reduce ? 'qqHeroPop 0.5s var(--qq-celebrate) both' : 'none',
              }}>{heroShown}</span>
            </span>
            {unitStr && (
              <span style={{
                fontSize: 'clamp(15px, 1.6cqw, 26px)', fontWeight: 800, color: 'var(--qq-text-muted)',
                opacity: beat >= 2 ? 1 : 0, transition: 'opacity 0.4s',
              }}>{unitStr}</span>
            )}
          </div>

          {/* Caption — erscheint mit dem Sieger-Andocken (Beat 3) */}
          <div style={{
            fontSize: 'clamp(14px, 1.4cqw, 22px)', fontWeight: 700, color: 'var(--qq-card-text)',
            opacity: beat >= 3 ? 0.9 : 0, transform: beat >= 3 ? 'none' : 'translateY(6px)',
            transition: 'opacity 0.5s var(--qq-enter), transform 0.5s var(--qq-enter)',
            marginTop: 'clamp(8px, 1cqh, 14px)', flexShrink: 0, position: 'relative', zIndex: 1,
          }}>
            {winner
              ? (winner.delta === 0
                  ? <><b style={{ color: MINT }}>{winner.team.name}</b> {lang === 'en' ? 'nailed it exactly.' : 'traf exakt.'}</>
                  : <><b style={{ color: 'var(--qq-accent)' }}>{winner.team.name}</b> {lang === 'en' ? `was closest (${fmt(winner.delta)} off).` : `war am nächsten (${fmt(winner.delta)} daneben).`}</>)
              : (lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.')}
          </div>

          {/* Zahlenstrahl — Signatur-Viz (gross, füllt das Panel) */}
          {rankedFinal.length > 0 && (
            <div style={{ flex: 1, position: 'relative', margin: 'clamp(28px, 3.5cqh, 56px) clamp(10px, 1.2cqw, 24px) clamp(30px, 3.4cqh, 52px)', minHeight: 'clamp(120px, 16cqh, 220px)', zIndex: 1 }}>
              {/* Warme Nähe-Zone um das Ziel (Wärme + Bedeutung) */}
              <div style={{
                position: 'absolute', top: '20%', bottom: '20%', left: 0, right: 0, pointerEvents: 'none',
                background: `radial-gradient(ellipse 22% 120% at ${scale.pos(target)}% 50%, rgba(59,224,165,0.16), transparent 60%)`,
              }} />
              {/* Track */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '55%', height: 5, borderRadius: 4,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
              }} />
              {/* Ziel-Tick — leuchtet bei Beat 2 auf (wächst hoch) */}
              <div style={{
                position: 'absolute', top: '30%', height: '38%', width: 3, borderRadius: 2,
                left: `${scale.pos(target)}%`, transformOrigin: 'center bottom',
                transform: `translateX(-1.5px) scaleY(${beat >= 2 ? 1 : 0})`,
                opacity: beat >= 2 ? 1 : 0,
                transition: 'transform 0.55s var(--qq-celebrate), opacity 0.4s var(--qq-enter)',
                background: MINT, boxShadow: `0 0 20px ${MINT}, 0 0 6px ${MINT}`,
              }}>
                <span style={{
                  position: 'absolute', top: 'clamp(-26px, -2.4cqh, -20px)', left: '50%', transform: 'translateX(-50%)',
                  fontSize: 'clamp(11px, 1cqw, 15px)', fontWeight: 900, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: MINT, whiteSpace: 'nowrap',
                }}>{lang === 'en' ? 'Target' : 'Ziel'}</span>
              </div>
              {/* Marker je Fraktion */}
              {rankedFinal.map((r, idx) => {
                const isW = idx === 0;
                const isExactW = isW && r.delta === 0;
                const mColor = isExactW ? MINT : r.team.color;
                const below = idx % 2 === 1; // alternierend gegen Label-Kollision
                const dotSize = isW ? 'clamp(20px, 1.9cqw, 30px)' : 'clamp(14px, 1.35cqw, 21px)';
                return (
                  <div key={r.teamId} style={{
                    position: 'absolute', top: '55%', left: `${scale.pos(r.num)}%`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    // Tipps steigen bei Beat 1 gestaffelt auf die Bühne.
                    opacity: beat >= 1 ? undefined : 0,
                    animation: beat >= 1 && !reduce ? `top5AvatarPop 0.5s var(--qq-celebrate) ${(rankedFinal.length - idx) * 0.07}s both` : 'none',
                    zIndex: isW ? 3 : 2,
                  }}>
                    <div style={{
                      width: dotSize, height: dotSize, borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${mColor} 70%, #fff), ${mColor})`,
                      border: '2.5px solid rgba(16,12,32,0.85)',
                      boxShadow: `0 0 ${isW ? 24 : 13}px ${mColor}, 0 3px 8px rgba(0,0,0,0.4)`,
                      // Gewinner dockt bei Beat 3 an (Scale-Puls), danach sanftes Dauer-Glühen.
                      animation: isW && beat >= 3 && !reduce
                        ? `qqDock 0.6s var(--qq-celebrate) both${isExactW ? ', top5RowGlow 1.6s ease 0.6s infinite' : ''}`
                        : (isExactW ? 'top5RowGlow 1.6s ease infinite' : 'none'),
                    }} />
                    <span style={{
                      position: 'absolute', top: below ? 'calc(100% + 6px)' : 'auto', bottom: below ? 'auto' : 'calc(100% + 6px)',
                      fontSize: isW ? 'clamp(14px, 1.35cqw, 20px)' : 'clamp(12px, 1.15cqw, 17px)',
                      fontWeight: 900, color: isW ? mColor : 'var(--qq-card-text)',
                      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                      textShadow: isW ? `0 0 12px ${mColor}66` : 'none',
                    }}>{fmt(r.num)}</span>
                  </div>
                );
              })}
              {/* Skala-Enden */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 'calc(55% + 20px)',
                display: 'flex', justifyContent: 'space-between',
                fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 800, color: 'var(--qq-text-muted)',
                fontVariantNumeric: 'tabular-nums', opacity: 0.6,
              }}>
                <span>{fmt(scale.lo)}</span><span>{fmt(scale.hi)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Rangliste — getiert, warm, eine Status-Sprache, Cascade */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'clamp(9px, 1.2cqh, 15px)',
          minHeight: 0, minWidth: 0,
        }}>
          {top5.map((r, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const isTop = rank === 1;
            const isExact = r.delta === 0;
            const st = statusOf(r.delta, isTop);
            const accentRGB = isExact ? '59,224,165' : 'var(--qq-accent-rgb)';
            const accentCol = isExact ? MINT : 'var(--qq-accent)';
            const tier = isTop ? 'lead' : rank <= 3 ? 'podium' : 'tail';
            return (
              <div key={r.teamId} style={{
                display: 'grid', gridTemplateColumns: 'auto auto 1fr auto',
                alignItems: 'center', gap: 'clamp(12px, 1.4cqw, 20px)',
                padding: isTop ? 'clamp(15px,1.9cqh,24px) clamp(18px,2cqw,28px)' : 'clamp(11px,1.4cqh,18px) clamp(15px,1.7cqw,24px)',
                borderRadius: 'clamp(16px, 1.5cqw, 22px)',
                // Vibrant & Block-based (ui-ux-pro-max): jede Fraktion als Farb-Block.
                // Leader glüht bold in Mint/Pink, Rest in ihrer Fraktionsfarbe getönt.
                background: isTop
                  ? `linear-gradient(150deg, rgba(${accentRGB},0.30), rgba(${accentRGB},0.08) 70%, rgba(20,14,36,0.7))`
                  : `linear-gradient(150deg, ${r.team.color}2e, ${r.team.color}0d)`,
                border: isTop ? `2px solid rgba(${accentRGB},0.75)` : `1.5px solid ${r.team.color}66`,
                boxShadow: isTop
                  ? `0 16px 40px rgba(0,0,0,0.45), 0 0 44px rgba(${accentRGB},0.35), inset 0 1px 0 rgba(255,255,255,0.1)`
                  : `0 8px 22px rgba(0,0,0,0.3), 0 0 16px ${r.team.color}22`,
                opacity: isVisible ? (tier === 'tail' ? 0.78 : 1) : 0,
                transform: isVisible ? 'none' : 'translateY(10px) scale(0.98)',
                transition: 'opacity 0.5s var(--qq-enter), transform 0.5s var(--qq-celebrate)',
                minHeight: 0, flex: '1 1 0', position: 'relative',
              }}>
                {/* Rang als Farb-Block (Block-based, verspielt) */}
                <span style={{
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  width: isTop ? 'clamp(38px,3.8cqw,56px)' : 'clamp(30px,3cqw,44px)', aspectRatio: '1',
                  borderRadius: 'clamp(11px,1.1cqw,15px)',
                  background: isTop ? accentCol : r.team.color,
                  color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: isTop ? 'clamp(19px,2cqw,30px)' : 'clamp(15px,1.55cqw,23px)',
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: `0 5px 14px ${isTop ? accentCol : r.team.color}77`,
                }}>{rank}</span>
                {/* Wappen — gefeiert (Glow-Ring in Fraktionsfarbe) */}
                <div style={{
                  flexShrink: 0, borderRadius: '50%', padding: 2,
                  boxShadow: `0 0 ${isTop ? 22 : 13}px ${r.team.color}${isTop ? 'bb' : '77'}`,
                }}>
                  <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji}
                    size={isTop ? 'clamp(48px,4.8cqw,70px)' : 'clamp(38px,3.8cqw,54px)'} />
                </div>
                {/* Name + Tipp */}
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: isTop ? 'clamp(19px,2cqw,31px)' : 'clamp(16px,1.75cqw,25px)', fontWeight: isTop ? 700 : 600,
                    color: 'var(--qq-card-text)', lineHeight: 1.05,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.team.name}</span>
                  <span style={{
                    fontSize: 'clamp(12px,1.25cqw,18px)', fontWeight: 800, color: 'var(--qq-card-text)',
                    opacity: 0.7, fontVariantNumeric: 'tabular-nums',
                  }}>{lang === 'en' ? 'guess' : 'Tipp'} {fmt(r.num)}</span>
                </div>
                {/* Status (eine Sprache, Fredoka) */}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isTop ? 'clamp(16px,1.7cqw,25px)' : 'clamp(13px,1.4cqw,20px)', fontWeight: 700,
                  color: st.color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                  padding: isExact ? 'clamp(4px,0.6cqh,7px) clamp(12px,1.3cqw,18px)' : '0',
                  borderRadius: 'var(--qq-pill-radius)',
                  background: isExact ? 'rgba(59,224,165,0.20)' : 'transparent',
                  border: isExact ? '1.5px solid rgba(59,224,165,0.55)' : 'none',
                  textShadow: isExact ? `0 0 14px ${MINT}66` : 'none',
                }}>{isExact ? '✨ ' : ''}{st.text}</span>
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
