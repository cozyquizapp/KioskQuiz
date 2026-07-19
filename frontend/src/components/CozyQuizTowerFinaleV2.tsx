/**
 * CozyQuizTowerFinaleV2 — Turm-Finale, Neubau (Wolf 2026-07-19).
 *
 * Konzept (Wolf): jedes Team baut aus seinen eroberten Grid-Feldern einen Turm,
 * Turmhoehe = Punkte, hoechster Turm gewinnt — im Grid-Story bleiben.
 *
 * 2-Akter mit Awards (Wolf-Idee "special awards zuerst vergeben, Tuerme steigen
 * deswegen nochmal"):
 *  - Akt 1 (base): Tuerme wachsen aus den erspielten Quiz-Punkten. Zwischenstand.
 *  - Akt 2 (award): die 3 End-Awards werden nacheinander vergeben. Jeder Award
 *    = +1 (echter Wert, QQEndAwards: "jeder Award gibt +1 Punkt im End-Score",
 *    als Story-Stamp-Feld). Der Turm waechst live um den Award-Baustein (golden,
 *    Stern statt Avatar). Ein knapper Vorsprung kann so KIPPEN (voller Wert).
 *  - Akt 3 (held → crowned): Atempause (Dim + Herzschlag), dann Kroenung.
 *
 * Wolf-Feedback aus V1/V2-Reviews eingearbeitet:
 *  - Avatare IN jedem Quiz-Block (echter Grid-Feld-Look). Award-Bloecke golden.
 *  - Final-Tanz raus.
 *  - Langsamer/showiger Takt.
 *  - Sichtbares Ausscheiden erst in Akt 3 (Reihenfolge ist vorher nicht final).
 *
 * "Nicer": EINE ruhige Atmosphaere (Vignette + Boden-Glow) statt Effekt-Stapel;
 * prefers-reduced-motion respektiert. Auto-Play + Space zum Vorspulen der Holds.
 * Vorschau-Route /race-finale (Toggle "Tuerme V2").
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { QQTeam } from '../../../shared/quarterQuizTypes';
import { prefersReducedMotion } from '../utils/reducedMotion';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon } from './QQIcon';
import {
  playWoodKnock, playReveal, playClimaxFinish, playFanfare, playTick, playSpecialAwardReveal,
} from '../utils/sounds';

export type TowerTeam = { team: QQTeam; base: number };
export type TowerAward = { key: string; label: string; labelEn?: string; emoji: string; teamId: string; bonus: number };

const STAGE_W = 1760;
const STAGE_H = 990;
const TITLE_H = 118;
const CROWN_H = 96;
const BASE_H = 96;
const BOTTOM = 34;
const GAP = 3;
const AV = 54;
const TOWER_ZONE = STAGE_H - TITLE_H - CROWN_H - BASE_H - BOTTOM;
const INK = '#0F0817';
const GOLD = '#F9C87A';
const GOLD_DEEP = '#E0A94E';

export function TowerFinaleV2({ teams, awards, lang }: {
  teams: TowerTeam[]; awards: TowerAward[]; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const reduce = prefersReducedMotion();
  const N = teams.length;

  const baseOf = useCallback((id: string) => teams.find(t => t.team.id === id)?.base ?? 0, [teams]);
  const bonusByTeam = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of awards) m[a.teamId] = (m[a.teamId] ?? 0) + a.bonus;
    return m;
  }, [awards]);
  const totalOf = useCallback((id: string) => baseOf(id) + (bonusByTeam[id] ?? 0), [baseOf, bonusByTeam]);

  const finalRanking = useMemo(() => {
    return [...teams].sort((a, b) =>
      (totalOf(b.team.id) - totalOf(a.team.id)) ||
      (b.base - a.base) ||
      a.team.name.localeCompare(b.team.name),
    );
  }, [teams, totalOf]);
  const rankById = useMemo(() => {
    const m: Record<string, number> = {};
    finalRanking.forEach((e, i) => { m[e.team.id] = i; });
    return m;
  }, [finalRanking]);
  const winner = finalRanking[0];

  const maxBase = useMemo(() => Math.max(1, ...teams.map(t => t.base)), [teams]);
  const maxTotal = useMemo(() => Math.max(1, ...teams.map(t => totalOf(t.team.id))), [teams, totalOf]);

  // Rang-NEUTRALE Anordnung (kein Spoiler), gleichmaessig verteilt.
  const ordered = useMemo(() => {
    const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i) * 2654435761) >>> 0; return h; };
    return [...teams].sort((a, b) => hash(a.team.id) - hash(b.team.id));
  }, [teams]);

  // ── Choreo ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'intro' | 'base' | 'baseHold' | 'award' | 'held' | 'crowned'>(reduce ? 'crowned' : 'intro');
  const [baseTick, setBaseTick] = useState(reduce ? maxBase : 0);
  const [awardIdx, setAwardIdx] = useState(reduce ? awards.length : 0);
  const [awardTick, setAwardTick] = useState(0);

  const hasAwards = awards.length > 0;
  const curAward = awards[awardIdx];
  const growthDone = !curAward || awardTick >= curAward.bonus;

  // Space spult die Holds vor (Auto-Play laeuft sonst von allein).
  const skip = useCallback(() => {
    setPhase(p => {
      if (p === 'intro') return 'base';
      if (p === 'baseHold') return hasAwards ? 'award' : 'held';
      if (p === 'held') return 'crowned';
      return p;
    });
  }, [hasAwards]);

  useEffect(() => {
    if (reduce) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); skip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip, reduce]);

  // intro → base
  useEffect(() => {
    if (phase !== 'intro') return;
    const h = window.setTimeout(() => setPhase('base'), 3000);
    return () => window.clearTimeout(h);
  }, [phase]);

  // base: Quiz-Tuerme wachsen synchron.
  useEffect(() => {
    if (phase !== 'base') return;
    if (baseTick >= maxBase) {
      const h = window.setTimeout(() => setPhase('baseHold'), 500);
      return () => window.clearTimeout(h);
    }
    const h = window.setTimeout(() => {
      setBaseTick(t => t + 1);
      try { playWoodKnock(); } catch { /* noop */ }
    }, 340);
    return () => window.clearTimeout(h);
  }, [phase, baseTick, maxBase]);

  // Zwischenstand-Hold → erster Award.
  useEffect(() => {
    if (phase !== 'baseHold') return;
    const h = window.setTimeout(() => { setAwardIdx(0); setAwardTick(0); setPhase(hasAwards ? 'award' : 'held'); }, 2000);
    return () => window.clearTimeout(h);
  }, [phase, hasAwards]);

  // Award-Reveal-Sound beim Banner-Auftritt.
  useEffect(() => {
    if (phase !== 'award') return;
    try { playSpecialAwardReveal(); } catch { /* noop */ }
  }, [phase, awardIdx]);

  // Award-Wachstum: Banner haelt kurz, dann waechst der Turm Baustein fuer Baustein.
  useEffect(() => {
    if (phase !== 'award' || !curAward) return;
    if (awardTick >= curAward.bonus) {
      // Wachstum fertig → naechster Award bzw. Kroenung.
      const h = window.setTimeout(() => {
        if (awardIdx + 1 >= awards.length) setPhase('held');
        else { setAwardIdx(i => i + 1); setAwardTick(0); }
      }, 1700);
      return () => window.clearTimeout(h);
    }
    const first = awardTick === 0;
    const h = window.setTimeout(() => {
      setAwardTick(t => t + 1);
      try { playTick(); } catch { /* noop */ }
    }, first ? 1150 : 440);
    return () => window.clearTimeout(h);
  }, [phase, curAward, awardTick, awardIdx, awards.length]);

  // held → crowned (Atempause).
  useEffect(() => {
    if (phase !== 'held') return;
    const h = window.setTimeout(() => setPhase('crowned'), 2400);
    return () => window.clearTimeout(h);
  }, [phase]);

  useEffect(() => {
    if (phase === 'crowned') { try { playClimaxFinish(); } catch { /* noop */ } try { playFanfare(); } catch { /* noop */ } }
  }, [phase]);

  const crowned = phase === 'crowned';
  const held = phase === 'held';
  const inAwards = phase === 'award';
  const finalPhase = held || crowned;

  // ── Geometrie (auf finale Maximalhoehe ausgelegt) ────────────────────────
  const blockH = Math.max(15, Math.min(46, Math.floor((TOWER_ZONE - (maxTotal - 1) * GAP) / maxTotal)));
  const blockW = blockH;
  const SIDE_PAD = 90;
  const usable = STAGE_W - SIDE_PAD * 2;
  const colW = Math.max(blockW, Math.min(150, Math.floor(usable / N) - 16));
  const colGap = N > 1 ? Math.max(8, Math.floor((usable - N * colW) / (N - 1))) : 0;
  const avInBlock = Math.round(blockW * 0.82);

  // Angezeigte Hoehe je Team je Phase.
  const appliedBefore = useCallback((id: string) => {
    let s = 0;
    for (let i = 0; i < awardIdx; i++) if (awards[i].teamId === id) s += awards[i].bonus;
    return s;
  }, [awardIdx, awards]);

  const shownOf = (id: string) => {
    const base = baseOf(id);
    if (phase === 'intro') return 0;
    if (phase === 'base') return Math.min(baseTick, base);
    if (phase === 'baseHold') return base;
    if (phase === 'award') {
      const add = curAward && curAward.teamId === id ? Math.min(awardTick, curAward.bonus) : 0;
      return base + appliedBefore(id) + add;
    }
    return totalOf(id); // held/crowned
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(120% 100% at 50% 8%, #1B1230 0%, #140C22 42%, ${INK} 100%)`,
      fontFamily: "var(--qq-font, 'Nunito', system-ui, sans-serif)",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Ruhige Atmosphaere */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(130% 90% at 50% 120%, rgba(236,72,153,0.14), transparent 55%)' }} />
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 240, pointerEvents: 'none',
        background: crowned
          ? `radial-gradient(80% 130% at 50% 100%, ${winner.team.color}3a, transparent 70%)`
          : inAwards
          ? 'radial-gradient(90% 130% at 50% 100%, rgba(249,200,122,0.12), transparent 70%)'
          : 'radial-gradient(90% 130% at 50% 100%, rgba(168,85,247,0.10), transparent 70%)',
        transition: 'background 0.8s ease',
      }} />
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'radial-gradient(120% 100% at 50% 62%, transparent 34%, rgba(6,3,12,0.62) 100%)',
        opacity: finalPhase ? 1 : 0, transition: 'opacity 0.7s ease',
      }} />
      {!reduce && Array.from({ length: 6 }).map((_, i) => {
        const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        return (
          <div key={i} aria-hidden style={{
            position: 'absolute', bottom: -10, left: `${8 + r(1) * 84}%`,
            width: 3 + r(2) * 4, height: 3 + r(2) * 4, borderRadius: '50%',
            background: '#EC4899', opacity: 0.1 + r(3) * 0.1, filter: 'blur(1px)',
            animation: `qqT2Drift ${13 + r(4) * 9}s linear ${-r(5) * 18}s infinite`,
          }} />
        );
      })}

      {/* Titelband */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: TITLE_H, zIndex: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4, textAlign: 'center', padding: '0 40px',
      }}>
        {crowned ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: GOLD, animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both' }}>{de ? 'Sieger' : 'Winner'}</div>
            <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.02, color: '#F8FAFC', textShadow: `0 2px 24px ${winner.team.color}66`, animation: reduce ? 'none' : 'qqT2WinnerIn 0.6s cubic-bezier(0.2,0.8,0.3,1) both' }}>{winner.team.name}</div>
          </>
        ) : held ? (
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.05, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2Breathe 1.7s ease-in-out infinite' }}>{de ? 'Und der höchste Turm gehört…' : 'And the tallest tower belongs to…'}</div>
        ) : phase === 'baseHold' ? (
          <>
            <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.05, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both' }}>{de ? 'Zwischenstand' : 'Standings'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#B9AEDA' }}>{de ? 'Jetzt zählen noch die Awards…' : 'Now the awards count…'}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease both' }}>{de ? 'Wer baut den höchsten Turm?' : 'Who builds the tallest tower?'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', color: '#B9AEDA', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease 0.1s both' }}>{de ? 'Jedes eroberte Feld ist ein Baustein' : 'Every conquered field is a brick'}</div>
          </>
        )}
      </div>

      {/* Award-Banner (Akt 2) */}
      {inAwards && curAward && (
        <div key={curAward.key} style={{
          position: 'absolute', top: TITLE_H + 6, left: '50%', transform: 'translateX(-50%)', zIndex: 12,
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 26px', borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(38,28,14,0.96), rgba(24,17,8,0.96))',
          border: `1.5px solid ${GOLD_DEEP}`, boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 24px ${GOLD}33`,
          animation: reduce ? 'none' : 'qqT2Banner 0.5s cubic-bezier(0.2,0.9,0.3,1) both',
        }}>
          <span aria-hidden style={{ fontSize: 34, lineHeight: 1 }}><QQEmojiIcon emoji={curAward.emoji} size={34} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>{de ? 'Award' : 'Award'} · +{curAward.bonus}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#F8FAFC', lineHeight: 1 }}>
              {(de ? curAward.label : (curAward.labelEn ?? curAward.label))}: <span style={{ color: teams.find(t => t.team.id === curAward.teamId)?.team.color ?? '#fff' }}>{teams.find(t => t.team.id === curAward.teamId)?.team.name}</span>
            </span>
          </div>
        </div>
      )}

      {/* Boden-Linie */}
      <div aria-hidden style={{
        position: 'absolute', left: SIDE_PAD - 30, right: SIDE_PAD - 30, bottom: BASE_H + BOTTOM - 1,
        height: 1, zIndex: 3,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 12%, rgba(255,255,255,0.14) 88%, transparent)',
      }} />

      {/* Turm-Reihe */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: BOTTOM, zIndex: 4,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: colGap,
      }}>
        {ordered.map(({ team }) => {
          const id = team.id;
          const rank = rankById[id];
          const isWinner = rank === 0;
          const base = baseOf(id);
          const shown = shownOf(id);
          const total = totalOf(id);
          const capped = finalPhase ? shown >= total : false;
          const colr = team.color;
          const towerPx = shown * blockH + Math.max(0, shown - 1) * GAP;
          const badge = rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
          const isAwardTarget = inAwards && curAward?.teamId === id && awardTick > 0;

          let colOpacity = 1;
          if (finalPhase) colOpacity = isWinner ? 1 : 0.28;

          return (
            <div key={id} style={{
              width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
              opacity: colOpacity, transition: 'opacity 0.5s ease',
              animation: (isWinner && held && !reduce) ? 'qqT2Heartbeat 1.5s ease-in-out infinite' : 'none',
            }}>
              <div style={{ position: 'relative', width: blockW, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: GAP }}>
                {/* Boden-Aura */}
                <div aria-hidden style={{
                  position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
                  width: Math.round(blockW * 2.1), height: 26, borderRadius: '50%',
                  background: `radial-gradient(ellipse, ${(isAwardTarget ? GOLD : colr)}${crowned && isWinner ? '55' : '30'}, transparent 70%)`,
                  filter: 'blur(6px)', zIndex: 0, pointerEvents: 'none', transition: 'background 0.4s ease',
                }} />

                {/* Kletternder Avatar (traegt Krone/Platz-Badge in Akt 3) */}
                <div style={{
                  position: 'absolute', left: '50%', bottom: towerPx + 7, zIndex: 5, width: AV, height: AV,
                  transform: 'translateX(-50%)', transition: reduce ? 'none' : 'bottom 0.44s cubic-bezier(0.34, 1.4, 0.6, 1)',
                }}>
                  {isWinner && crowned && (
                    <span aria-hidden style={{
                      position: 'absolute', left: '50%', bottom: AV - 10, transform: 'translateX(-50%)',
                      fontSize: 44, lineHeight: 1, pointerEvents: 'none', zIndex: 8,
                      filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(249,200,122,0.8))',
                      animation: reduce ? 'none' : 'qqT2CrownDrop 0.7s cubic-bezier(0.3,1.5,0.5,1) both, qqT2CrownFloat 2.6s ease-in-out 0.8s infinite',
                    }}><QQEmojiIcon emoji="👑" size="1em" /></span>
                  )}
                  {!isWinner && capped && (
                    <div style={{
                      position: 'absolute', left: '50%', bottom: AV - 6, transform: 'translateX(-50%)', zIndex: 8,
                      pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, whiteSpace: 'nowrap',
                      animation: reduce ? 'none' : 'qqT2BadgeIn 0.5s cubic-bezier(0.3,1.5,0.5,1) both',
                    }}>
                      {badge && <span aria-hidden style={{ fontSize: 28, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))' }}><QQEmojiIcon emoji={badge} size={28} /></span>}
                      <span style={{
                        fontSize: 13, fontWeight: 900, letterSpacing: '0.05em', color: '#F8FAFC',
                        background: 'rgba(15,8,23,0.94)', border: `2px solid ${colr}`, borderRadius: 999, padding: '2px 9px',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
                      }}>{de ? `PLATZ ${rank + 1}` : `#${rank + 1}`}</span>
                    </div>
                  )}
                  <div style={{
                    width: AV, height: AV, borderRadius: '50%', background: colr, border: `3px solid ${colr}`,
                    boxShadow: `0 0 14px ${colr}77, 0 3px 8px rgba(0,0,0,0.45)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={AV} flat />
                  </div>
                </div>

                {/* Kacheln: Quiz-Bloecke (Avatar) + Award-Bloecke (golden, Stern). */}
                {Array.from({ length: shown }).map((_, bi) => {
                  const isTopBlock = bi === shown - 1;
                  const isAwardBlock = bi >= base;
                  const isCrownBlock = isWinner && crowned && isTopBlock;
                  return (
                    <div key={bi} style={{
                      width: blockW, height: blockH, borderRadius: 4, position: 'relative', zIndex: 1,
                      background: isAwardBlock
                        ? `linear-gradient(180deg, #FCE3B0 0%, ${GOLD} 55%, ${GOLD_DEEP} 100%)`
                        : `linear-gradient(180deg, ${colr} 0%, ${colr} 60%, rgba(0,0,0,0.24) 100%)`,
                      boxShadow: isAwardBlock
                        ? `inset 0 1.5px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(120,80,10,0.4), 0 0 14px ${GOLD}88, 0 1px 2px rgba(0,0,0,0.3)`
                        : `inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.26), 0 1px 2px rgba(0,0,0,0.3)${(crowned && isWinner) ? `, 0 0 14px ${colr}66` : ''}`,
                      border: `1px solid ${isAwardBlock ? GOLD_DEEP : colr}`,
                      transformOrigin: 'bottom center',
                      animation: (isTopBlock && !reduce) ? (isCrownBlock ? 'qqT2CrownBlock 0.8s cubic-bezier(0.3,1.5,0.4,1) both' : 'qqT2Drop 0.46s cubic-bezier(0.3,1.35,0.5,1) both') : 'none',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isAwardBlock
                        ? <span aria-hidden style={{ fontSize: Math.round(blockW * 0.6), lineHeight: 1, color: '#7A5A1E', filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.4))' }}>★</span>
                        : <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={avInBlock} flat />}
                      {isTopBlock && !reduce && !(finalPhase && !isWinner) && (
                        <div aria-hidden style={{
                          position: 'absolute', inset: -1, borderRadius: 5, pointerEvents: 'none',
                          boxShadow: `0 0 ${isCrownBlock ? 22 : isAwardBlock ? 18 : 12}px ${(isAwardBlock ? GOLD : colr)}${isCrownBlock ? 'ee' : 'aa'}`,
                          animation: `qqT2Spark ${isCrownBlock ? 0.7 : 0.5}s ease-out both`,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sockel: Zaehler + Name */}
              <div style={{ height: BASE_H, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, gap: 4 }}>
                <div style={{
                  fontSize: 30, fontWeight: 900, lineHeight: 1,
                  color: isAwardTarget ? GOLD : capped ? colr : '#E2D6FF',
                  fontVariantNumeric: 'tabular-nums', textShadow: (capped || isAwardTarget) ? `0 0 14px ${(isAwardTarget ? GOLD : colr)}66` : 'none', transition: 'color 0.3s ease',
                }}>
                  <span key={shown} style={{ display: 'inline-block', animation: (shown > 0 && !crowned && !reduce) ? 'qqT2NumPop 0.3s ease-out' : 'none' }}>{shown}</span>
                </div>
                <TeamNameLabel
                  name={team.name} maxLines={2} shrinkAfter={12} color="#F1F5F9" fontWeight={800}
                  fontSize="clamp(12px, 1cqw, 16px)" style={{ maxWidth: colW + 8, textAlign: 'center', lineHeight: 1.05 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const KEYFRAMES = `
@keyframes qqT2FadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes qqT2WinnerIn { 0% { opacity: 0; transform: translateY(14px) scale(0.96); } 60% { transform: translateY(0) scale(1.02); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2Drop { 0% { opacity: 0; transform: translateY(-22px) scaleY(0.7); } 70% { transform: translateY(0) scaleY(1.06); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2CrownBlock { 0% { opacity: 0; transform: translateY(-40px) scale(0.8); } 55% { transform: translateY(3px) scale(1.14); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2Spark { 0% { opacity: 0.95; } 100% { opacity: 0; } }
@keyframes qqT2NumPop { 0% { transform: scale(1); } 40% { transform: scale(1.28); } 100% { transform: scale(1); } }
@keyframes qqT2CrownDrop { 0% { transform: translateX(-50%) translateY(-30px) scale(0.5); opacity: 0; } 70% { transform: translateX(-50%) translateY(4px) scale(1.15); } 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } }
@keyframes qqT2CrownFloat { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-5px); } }
@keyframes qqT2BadgeIn { 0% { transform: translateX(-50%) translateY(8px) scale(0.7); opacity: 0; } 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } }
@keyframes qqT2Breathe { 0%, 100% { transform: scale(1); opacity: 0.92; } 50% { transform: scale(1.03); opacity: 1; } }
@keyframes qqT2Heartbeat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
@keyframes qqT2Banner { 0% { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(0.94); } 100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
@keyframes qqT2Drift { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 0.18; } 88% { opacity: 0.18; } 100% { transform: translateY(-800px) translateX(24px); opacity: 0; } }
`;

export default TowerFinaleV2;
