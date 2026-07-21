/**
 * CrowdEstimateReveal v2 — Schwarm-Reveal auf dem "EIN STRAHL"-Pattern (2026-07-14).
 *
 * Übernimmt das SchaetzchenReveal-v2-Layout: EIN Zahlenstrahl mit farbigen
 * Ticks an den Fraktions-Medianen, darunter EINE entzerrte Chip-Reihe mit
 * Connector-Linien (keine Überlappung bei engen Medianen). Dazu Schwarm-
 * Spezifika: grünes „nah genug = Punkte"-Band, 🌊 Gesamt-Median-Marker,
 * und pro Chip eine PUNKTE-PILL (0–100) mit Mini-Balken — zeigt, wie die
 * Handy-Punkte (Nähe → linear auf 0) zustande kommen.
 *
 * Beats: 0 Chips · 1 Wahrheit+Count-up · 2 Band+Schwarm+Punkte · 3 Dimmen · 4 Sieger.
 * Aggregation unverändert via shared qqSwarm (Backend-identisch).
 *
 * Punkte-Anzeige (Wolf 2026-07-14): EXAKT wie das Backend via shared
 * qqDistanceFactionScores (per Handy, Ø über verbundene Handys, K=3) — Punkte +
 * Ranking + Sieger matchen 1:1 das Standing. qqSwarm-Median nur noch fuer die
 * Tick-Position auf dem Zahlenstrahl.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate, QQBunteTueteCrowdEstimate } from '../../../../shared/quarterQuizTypes';
import { qqSwarm } from '../../../../shared/qqSwarm';
import { qqDistanceFactionScores, qqParseEstimate } from '../../../../shared/qqDistanceScore';
import { qqMegaFactionName } from '../../../../shared/quarterQuizTypes';
import { qqFactionAvatarEmoji } from '../../qqShared';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playRevealHighlight, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId } from '../../qqTheme';

const GOLD = '#EAB308', GOLD_BRIGHT = '#FDE68A', SWARM_BLUE = '#38bdf8';

export function CrowdEstimateReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const isMega = !!(s as any).nestedTeams || !!(s as any).largeGroupMode;
  const def = q.bunteTuete as QQBunteTueteCrowdEstimate;
  const unit = (lang === 'en' && def.unitEn ? def.unitEn : def.unit) ?? '';

  const swarm = qqSwarm(
    s.answers.map(a => ({ teamId: a.teamId, text: a.text })),
    def.targetValue,
    (tid) => s.teams.find(t => t.id === tid)?.avatarId,
    def.unit,
  );
  const { target, range, globalMedian, factions } = swarm;

  const isYear = Number.isInteger(target) && Math.abs(target) >= 1500 && Math.abs(target) <= 2100 && !unit;
  const fmt = (n: number) => isYear ? String(Math.round(n)) : Math.round(n).toLocaleString('de-DE');
  // Exakte Backend-Punkte (per Handy, Ø über verbundene Handys) — matcht das
  // Standing 1:1 (Wolf 2026-07-14). qqSwarm-Median dient nur noch der Tick-Position.
  const factionScores = useMemo(
    () => qqDistanceFactionScores(
      s.answers.map(a => ({ teamId: a.teamId, text: a.text })),
      def.targetValue, def.unit, s.teams as any, qqParseEstimate,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.answers, s.teams, def.targetValue, def.unit],
  );
  const ptsOfAvatar = (av: string) => Math.round(factionScores.get(av)?.points ?? 0);
  useActiveThemeId();

  // Achse auf die Wahrheit zentriert (wie Schätzchen v2), Domäne inkl. Band+Schwarm.
  const axisPct = useMemo(() => {
    let half = Math.max(1, range);
    for (const f of factions) half = Math.max(half, Math.abs(f.median - target));
    if (Number.isFinite(globalMedian)) half = Math.max(half, Math.abs(globalMedian - target));
    const span = half * 1.18 || 1;
    return (v: number) => Math.max(4, Math.min(96, 50 + ((v - target) / span) * 43));
  }, [factions, target, range, globalMedian]);
  const tx = axisPct(target);
  const sx = Number.isFinite(globalMedian) ? axisPct(globalMedian) : 50;

  // Chips nach Median sortieren + in ZWEI Lanes (abwechselnd ober-/unterhalb des
  // Strahls, Wolf 2026-07-14) — jede Lane separat entzerrt = mehr horizontaler Platz.
  // Entzerren mit MINIMALER Verschiebung + auf den echten Cluster zentriert, damit
  // die Wappen an ihrer Tick-Position bleiben (Wolf 2026-07-14). Kein Aufspreizen.
  const spread = (arr: Array<{ x: number; cx: number }>) => {
    if (arr.length < 2) return;
    const LO = 6, HI = 94, MIN = 12.5;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].cx < arr[i - 1].cx + MIN) arr[i].cx = arr[i - 1].cx + MIN;
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
  // Arena (mega): Ranking nach Backend-PUNKTEN → Sieger = Standing-Sieger.
  // Normal-CozyQuiz (non-mega): „nächster gewinnt" → nach Median-Distanz.
  const ranked = useMemo(
    () => isMega
      ? [...factions].sort((a, b) => (ptsOfAvatar(b.avatarId) - ptsOfAvatar(a.avatarId)) || (a.dist - b.dist))
      : [...factions].sort((a, b) => a.dist - b.dist),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [factions, factionScores, isMega],
  );
  const rankOf = useMemo(() => new Map(ranked.map((f, i) => [f.avatarId, i + 1])), [ranked]);
  const winner = ranked[0] ?? null;

  const placed = useMemo(() => {
    const sorted = [...factions].sort((a, b) => a.median - b.median)
      .map((f, i) => ({ f, x: axisPct(f.median), cx: axisPct(f.median), above: i % 2 === 1 }));
    if (!sorted.length) return sorted;
    const upper = sorted.filter(c => c.above);
    const lower = sorted.filter(c => !c.above);
    spread(lower);
    spread(upper);
    // 2026-07-18 (Wolf schwarm.png „der gewinner ist gar nicht in der naehe des
    // zielwerts"): spread() schob den Sieger bei dichtem Cluster ans Lane-Extrem.
    // Fix wie beim Schaetzchen: die Lane des Siegers so verschieben, dass sein
    // Wappen auf der ECHTEN Median-Position (axisPct) sitzt, Rest relativ mit,
    // dann clampen.
    const winAv = winner?.avatarId;
    const lane = upper.some(c => c.f.avatarId === winAv) ? upper : lower;
    const win = lane.find(c => c.f.avatarId === winAv);
    if (win) {
      const dx = axisPct(win.f.median) - win.cx;
      if (dx) {
        for (const c of lane) c.cx += dx;
        const lo = Math.min(...lane.map(c => c.cx)), hi = Math.max(...lane.map(c => c.cx));
        if (lo < 6) { const d = 6 - lo; for (const c of lane) c.cx += d; }
        else if (hi > 94) { const d = hi - 94; for (const c of lane) c.cx -= d; }
      }
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factions, axisPct, winner]);

  // Beats: 0 Chips · 1 Wahrheit · 2 Band+Schwarm+Punkte · 3 Dimmen · 4 Sieger
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 4 : 0);
  const N = Math.max(1, placed.length);
  useEffect(() => {
    if (reduce) return;
    const tBeam = 400 + N * 90 + 350;
    const tBand = tBeam + 1100, tDark = tBand + 1300, tWin = tDark + 550;
    const ts = [
      setTimeout(() => { setBeat(1); if (!s.sfxMuted) { try { playRevealHighlight(); } catch {} } }, tBeam),
      setTimeout(() => setBeat(2), tBand),
      setTimeout(() => setBeat(3), tDark),
      setTimeout(() => { setBeat(4); if (!s.sfxMuted) { try { playClimaxFinish(); } catch {} } }, tWin),
    ];
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count-up der Wahrheit.
  const [shown, setShown] = useState<number>(reduce ? target : 0);
  const rafRef = useRef<number | null>(null);
  const startCount = beat >= 1;
  useEffect(() => {
    if (!startCount) return;
    if (reduce || isYear || (typeof document !== 'undefined' && document.hidden)) { setShown(target); return; }
    const start = performance.now(), dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setShown(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick); else setShown(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startCount, target, reduce, isYear]);

  const struck = beat >= 1, banded = beat >= 2, housedark = beat >= 3, lit = beat >= 4;
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const swarmDist = Math.abs(globalMedian - target);
  const swarmClose = Number.isFinite(swarmDist) && swarmDist <= range;
  const bandL = axisPct(target - range), bandR = axisPct(target + range);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(14px, 2cqh, 26px) clamp(20px, 3cqw, 52px) clamp(10px, 1.4cqh, 20px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both', minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes qqCE2Rise{0%{transform:translateY(24px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes qqCE2Strike{0%{transform:scale(1.07)}100%{transform:scale(1)}}
        @keyframes qqCE2Drop{0%{transform:translate(-50%,-16px);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
      `}</style>

      {/* Kopf */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 6 }}>
        <div style={{ fontSize: 'clamp(11px, 1.05cqw, 16px)', fontWeight: 900, color: SWARM_BLUE, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <QQEmojiIcon emoji="🧠" /> {lang === 'en' ? 'Hive Mind · Reveal' : 'Schwarmintelligenz · Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 90 ? 'clamp(16px, 1.8cqw, 29px)' : 'clamp(18px, 2.3cqw, 37px)',
          fontWeight: 900, lineHeight: 1.12, color: 'var(--qq-card-text)', maxWidth: '62%',
          marginTop: 'clamp(3px,0.5cqh,7px)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden', animation: 'langFadeIn 0.4s ease both', textWrap: 'pretty' as any,
        }}>{qText}</div>
      </div>

      {/* Bühne */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1 }}>
        {placed.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700 }}>
            {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
          </div>
        ) : (
          <>
            {/* Antwort-Tafel auf dem Beam */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: '6%', transform: 'translateX(-50%)', zIndex: 7,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              opacity: struck ? 1 : 0, transition: 'opacity 0.35s var(--qq-enter)',
            }}>
              <span style={{ fontSize: 'clamp(9px, 0.95cqw, 14px)', fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 5 }}>
                {lang === 'en' ? 'Answer' : 'Antwort'}
              </span>
              <div style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(3px,0.5cqw,9px)',
                padding: 'clamp(7px,1.1cqh,15px) clamp(15px,1.7cqw,28px)', borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(30,24,58,0.94), rgba(10,8,24,0.94))',
                boxShadow: `0 0 0 2px ${GOLD}8c, 0 0 52px 10px ${GOLD}61, inset 0 1px 0 rgba(255,255,255,0.10)`,
                animation: struck && !reduce ? 'qqCE2Strike 0.5s var(--qq-celebrate) both' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6cqw, 104px)', fontWeight: 700,
                  lineHeight: 0.92, color: GOLD_BRIGHT, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                  textShadow: `0 0 30px ${GOLD}8c`,
                }}>{fmt(shown)}</span>
                {unit && <span style={{ fontSize: 'clamp(13px, 1.6cqw, 26px)', fontWeight: 900, color: GOLD }}>{unit}</span>}
              </div>
            </div>

            {/* Wahrheits-Beam */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: '24%', height: '24%', width: 'clamp(5px,0.62cqw,12px)', zIndex: 3,
              transform: `translateX(-50%) scaleY(${struck ? 1 : 0})`, transformOrigin: 'top center', borderRadius: 8,
              background: `linear-gradient(180deg, ${GOLD_BRIGHT} 0%, ${GOLD_BRIGHT} 65%, ${GOLD}1f 100%)`,
              boxShadow: `0 0 40px 7px ${GOLD}80`, transition: reduce ? 'none' : 'transform 0.7s var(--qq-enter)',
            }} />

            {/* „nah genug"-Band */}
            <div aria-hidden style={{
              position: 'absolute', top: '45%', height: '6%', borderRadius: 10, zIndex: 1,
              left: `${bandL}%`, width: `${Math.max(0, bandR - bandL)}%`,
              background: 'linear-gradient(90deg, rgba(34,197,94,0.06), rgba(34,197,94,0.24), rgba(34,197,94,0.06))',
              border: '1px solid rgba(34,197,94,0.4)',
              opacity: banded ? 1 : 0, transition: 'opacity 0.6s ease',
            }} />
            <div aria-hidden style={{
              position: 'absolute', left: `${(bandL + bandR) / 2}%`, top: '52%', transform: 'translateX(-50%)', zIndex: 2,
              fontSize: 'clamp(9px,0.95cqw,15px)', fontWeight: 900, color: QQ_COLORS.green400,
              letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              opacity: banded ? 1 : 0, transition: 'opacity 0.6s ease',
            }}>{lang === 'en' ? 'close enough = points' : 'nah genug = Punkte'}</div>

            {/* Skalen-Endlabels */}
            <div aria-hidden style={{ position: 'absolute', left: '1%', top: '41%', zIndex: 2, fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              ← {lang === 'en' ? 'too low' : 'zu niedrig'}
            </div>
            <div aria-hidden style={{ position: 'absolute', right: '1%', top: '41%', zIndex: 2, fontSize: 'clamp(10px, 1.05cqw, 17px)', fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {lang === 'en' ? 'too high' : 'zu hoch'} →
            </div>

            {/* Mess-Schiene */}
            <div aria-hidden style={{
              position: 'absolute', left: '1%', right: '1%', top: '48%', height: 5, borderRadius: 5, zIndex: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD}4d 10%, rgba(255,244,214,0.55) 50%, ${GOLD}4d 90%, transparent)`,
              boxShadow: `0 0 22px ${GOLD}40`,
            }} />

            {/* Schwarm-Median-Marker */}
            {Number.isFinite(globalMedian) && (
              <div style={{
                position: 'absolute', left: `${sx}%`, top: '28.5%', zIndex: 5, transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: banded ? 1 : 0,
                animation: banded && !reduce ? 'qqCE2Drop 0.55s var(--qq-celebrate) both' : 'none',
              }}>
                <div style={{ fontSize: 'clamp(12px,1.2cqw,19px)', fontWeight: 900, color: SWARM_BLUE, whiteSpace: 'nowrap', textShadow: `0 0 14px ${SWARM_BLUE}80` }}>
                  🌊 {lang === 'en' ? 'Swarm' : 'Schwarm'} {fmt(globalMedian)}
                </div>
                <div style={{ width: 3, height: '16cqh', maxHeight: '16%', minHeight: 20, background: `linear-gradient(180deg, ${SWARM_BLUE}, ${SWARM_BLUE}26)`, borderRadius: 2, marginTop: 4, boxShadow: `0 0 12px ${SWARM_BLUE}8c` }} />
              </div>
            )}

            {/* Ticks an den Fraktions-Medianen */}
            {placed.map(({ f, x }) => {
              const rep = s.teams.find(t => t.avatarId === f.avatarId);
              const col = rep?.color ?? '#94a3b8';
              const isWin = f.avatarId === winner?.avatarId;
              return (
                <div key={'tick-' + f.avatarId} aria-hidden style={{
                  position: 'absolute', left: `${x}%`, top: '44.5%', width: 'clamp(3px,0.4cqw,7px)', height: '7%',
                  borderRadius: 4, transform: 'translateX(-50%)', zIndex: 3, background: col,
                  boxShadow: `0 0 12px ${col}99`, opacity: housedark && !isWin ? 0.35 : 1, transition: 'opacity 0.4s ease',
                }} />
              );
            })}

            {/* Connectors */}
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}>
              {placed.map(({ f, x, cx, above }) => {
                const rep = s.teams.find(t => t.avatarId === f.avatarId);
                const col = rep?.color ?? '#94a3b8';
                const isWin = f.avatarId === winner?.avatarId;
                const dimmed = housedark && !(isWin && lit);
                const y1 = above ? 46 : 52;
                const y2 = above ? 43.5 : 57.5;
                return (
                  <line key={'ln-' + f.avatarId} x1={x} y1={y1} x2={cx} y2={y2}
                    stroke={dimmed ? 'rgba(148,163,184,0.18)' : col + '66'}
                    strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
                );
              })}
            </svg>

            {/* Saallicht */}
            <div aria-hidden style={{
              position: 'absolute', inset: '-6%', pointerEvents: 'none', zIndex: 4,
              background: 'radial-gradient(120% 90% at 50% 55%, transparent 34%, rgba(6,4,14,0.9) 100%)',
              opacity: housedark ? 1 : 0, transition: 'opacity 0.7s var(--qq-enter)',
            }} />

            {/* Chip-Reihe (zwei Lanes: oben/unten am Strahl, je separat entzerrt) */}
            {placed.map(({ f, cx, above }, i) => {
              const rep = s.teams.find(t => t.avatarId === f.avatarId);
              const col = rep?.color ?? '#94a3b8';
              const name = isMega ? qqMegaFactionName(f.avatarId, lang) : (rep?.name ?? f.avatarId);
              const isWin = f.avatarId === winner?.avatarId;
              const rank = rankOf.get(f.avatarId) ?? 99;
              const dimmed = housedark && !(isWin && lit);
              const diff = f.median - target;
              const pts = ptsOfAvatar(f.avatarId);
              const scored = pts > 0;
              const laneW = `${92 / Math.max(3, Math.ceil(N / 2))}cqw`;
              return (
                <div key={f.avatarId} style={{
                  position: 'absolute', left: `${cx}%`,
                  ...(above ? { bottom: '56%' } : { top: '57%' }),
                  width: laneW, minWidth: 'clamp(64px,8cqw,150px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transform: 'translateX(-50%)', zIndex: isWin && lit ? 8 : 3,
                  animation: !reduce ? `qqCE2Rise 0.5s var(--qq-enter) ${0.35 + i * 0.09}s both` : 'none',
                }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(3px,0.6cqh,9px)',
                    transformOrigin: above ? 'center bottom' : 'center top',
                    transform: isWin && lit ? 'scale(1.14)' : 'scale(1)',
                    filter: dimmed ? 'brightness(0.62) saturate(0.8)' : 'none',
                    transition: 'filter 0.5s var(--qq-enter), transform 0.5s var(--qq-celebrate)',
                  }}>
                    <div style={{
                      position: 'relative', borderRadius: '50%',
                      boxShadow: isWin && lit ? `0 0 0 3px ${SWARM_BLUE}e6, 0 0 42px ${SWARM_BLUE}99, 0 8px 22px rgba(0,0,0,0.45)` : `0 0 14px ${col}44`,
                      transition: 'box-shadow 0.4s ease',
                    }}>
                      <QQTeamAvatar avatarId={f.avatarId} teamEmoji={qqFactionAvatarEmoji(f.avatarId, rep?.emoji, isMega)} size="clamp(44px, 5.6cqw, 100px)" />
                      {rank <= 3 && (
                        <div style={{
                          position: 'absolute', top: '-8%', left: '-10%',
                          minWidth: 'clamp(18px,1.9cqw,32px)', height: 'clamp(18px,1.9cqw,32px)', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontSize: 'clamp(11px,1.05cqw,18px)', fontWeight: 700,
                          color: QQ_COLORS.bgPage,
                          background: rank === 1 ? QQ_COLORS.amber400 : rank === 2 ? QQ_COLORS.slate300 : QQ_COLORS.orange700,
                          boxShadow: '0 3px 8px rgba(0,0,0,0.4)', opacity: lit ? 1 : 0, transition: 'opacity 0.4s ease',
                        }}>{rank}</div>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 1.3cqw, 21px)', fontWeight: 700,
                      color: 'var(--qq-card-text)', whiteSpace: 'nowrap', maxWidth: laneW,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{name}</span>
                    {/* Median + Delta */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(3px,0.45cqw,8px)',
                      padding: 'clamp(3px,0.5cqh,6px) clamp(8px,0.95cqw,15px)', borderRadius: 'var(--qq-pill-radius)',
                      background: 'rgba(12,10,30,0.72)', border: '1.5px solid rgba(255,255,255,0.14)',
                    }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.7cqw, 28px)', fontWeight: 700, color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(f.median)}</span>
                      <span style={{ fontSize: 'clamp(9px, 1cqw, 16px)', fontWeight: 900, color: 'var(--qq-text-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {diff === 0 ? '✨' : diff > 0 ? `▲ +${fmt(diff)}` : `▼ −${fmt(Math.abs(diff))}`}
                      </span>
                    </div>
                    {/* Punkte-Pill (nur Arena/mega — 0–100 ist ein Arena-Konzept): so kam die Wertung zustande */}
                    {isMega && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 'clamp(3px,0.5cqw,8px)',
                      padding: 'clamp(2px,0.45cqh,6px) clamp(8px,0.95cqw,15px)', borderRadius: 'var(--qq-pill-radius)',
                      background: scored ? 'rgba(34,197,94,0.14)' : 'rgba(148,163,184,0.08)',
                      border: `1.5px solid ${scored ? 'rgba(34,197,94,0.45)' : 'rgba(148,163,184,0.18)'}`,
                      opacity: banded ? 1 : 0, transition: `opacity 0.45s ease ${i * 0.06}s`,
                    }}>
                      <span style={{
                        width: `${Math.max(4, (pts / 100) * 34)}px`, height: 'clamp(4px,0.7cqh,9px)', borderRadius: 5,
                        background: scored ? QQ_COLORS.green400 : '#475569',
                      }} />
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(11px, 1.25cqw, 20px)', fontWeight: 700,
                        color: scored ? QQ_COLORS.green300 : 'var(--qq-text-muted)',
                        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                      }}>{pts} P</span>
                    </div>
                    )}
                    {/* 2026-07-18 (Wolf schwarm.png „texte ueberlappen"): die
                        inline „🏆 vorne · X P"-Verdikt-Pille war redundant (Rang-1-
                        Badge + Ring + Punkte-Pille markieren den Sieger bereits) und
                        kollidierte unten mit dem Schwarm-Callout. Entfernt → Parität
                        mit dem Schaetzchen-Reveal, das auch keine Verdikt-Pille hat. */}
                  </div>
                </div>
              );
            })}

            {/* Schwarm-Callout */}
            {lit && swarmClose && (
              <div style={{
                position: 'absolute', left: '50%', bottom: '1%', transform: 'translateX(-50%)', zIndex: 9,
                padding: 'clamp(4px,0.7cqh,9px) clamp(12px,1.5cqw,24px)', borderRadius: 'var(--qq-pill-radius)',
                fontSize: 'clamp(11px,1.15cqw,18px)', fontWeight: 900, color: '#7dd3fc', whiteSpace: 'nowrap',
                background: 'rgba(56,189,248,0.14)', border: '1.5px solid rgba(56,189,248,0.45)',
                animation: !reduce ? 'qqCE2Rise 0.5s var(--qq-enter) 0.2s both' : 'none',
              }}>🌊 {lang === 'en' ? `The crowd nailed it: swarm median only Δ ${fmt(swarmDist)} off` : `Die Masse lag goldrichtig: Schwarm-Median nur Δ ${fmt(swarmDist)} daneben`}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
