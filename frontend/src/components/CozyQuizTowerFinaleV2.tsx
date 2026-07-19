/**
 * CozyQuizTowerFinaleV2 — Turm-Finale, Neubau (Wolf 2026-07-19).
 *
 * Konzept: jedes Team baut aus seinen eroberten Grid-Feldern einen Turm,
 * Turmhoehe = Punkte, hoechster gewinnt — im Grid-Story bleiben.
 *
 * Dramaturgie (Wolf-Wahl A+C):
 *  - Akt 1 (base): Tuerme wachsen aus Quiz-Punkten. NICHT-Top-3 zeigen ihre
 *    Avatare in jedem Feld (Grid-Look). Die TOP-3 bauen ANONYM (grau, "?") —
 *    man weiss noch nicht wer wer ist.
 *  - Akt 2 (award): die 3 End-Awards (je +1, echter Wert laut QQEndAwards)
 *    werden GROSS zelebriert (Vollbild-Award-Karte), dann waechst der Turm um
 *    einen goldenen Baustein. Geht ein Award an einen Top-3-Turm, bleibt der
 *    Empfaenger anonym ("geht an einen der Spitzentuerme"). Der LETZTE Award
 *    kippt einen Gleichstand live (C).
 *  - Akt 3 (reveal): die 3 hoechsten (noch anonymen) Tuerme GLEITEN in die
 *    Mitte, der Rest tritt gedimmt zurueck. Enthuellung Platz 3 -> 2 -> 1 mit
 *    Avatar-Flip + Namens-Slam, Atempause vor #1, dann Krone.
 *
 * "Nicer": EINE ruhige Atmosphaere (Vignette + Boden-Glow); reduced-motion
 * respektiert. Auto-Play + Space zum Vorspulen. Vorschau /race-finale.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { QQTeam, QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { qqAwardPoints, qqFinalTotal } from '../utils/qqFinalScore';
import { prefersReducedMotion } from '../utils/reducedMotion';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon } from './QQIcon';
import {
  playWoodKnock, playClimaxFinish, playFanfare, playTick, playReveal, playSpecialAwardReveal,
} from '../utils/sounds';

export type TowerTeam = { team: QQTeam; base: number };
export type TowerAward = { key: string; label: string; labelEn?: string; emoji: string; teamId: string; bonus: number };

// Mapping State → Turm-Daten (Live-Wiring): base = Quiz-Cluster + Bet-Bonus
// (also OHNE Award-Punkte), Awards separat aus endAwards mit echten Werten
// (Underdog +2, Speedy/Meisterklauer +1). Underdog zuletzt (= +2-Climax, wie die
// bestehende Award-Dramaturgie). Score bleibt identisch zu qqFinalTotal — die
// Awards zaehlen weiter, nur ihre PRAESENTATION wandert in den Turm.
export function buildTowerFinaleData(s: QQStateUpdate): { teams: TowerTeam[]; awards: TowerAward[] } {
  const ap = qqAwardPoints(s);
  const teams: TowerTeam[] = s.teams.map(t => ({ team: t, base: qqFinalTotal(s, t.id, ap) - (ap[t.id] ?? 0) }));
  const a = s.endAwards;
  const awards: TowerAward[] = [];
  if (a?.speedy) awards.push({ key: 'speedy', label: 'Speedy Gonzales', labelEn: 'Speedy Gonzales', emoji: '⚡', teamId: a.speedy, bonus: 1 });
  if (a?.meisterklauer) awards.push({ key: 'meisterklauer', label: 'Meisterklauer', labelEn: 'Master Thief', emoji: '🪙', teamId: a.meisterklauer, bonus: 1 });
  if (a?.underdog) awards.push({ key: 'underdog', label: 'Underdog', labelEn: 'Underdog', emoji: '🍀', teamId: a.underdog, bonus: 2 });
  return { teams, awards };
}

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
const MYST = '#4A4560';
const MYST_EDGE = '#655C82';

export function TowerFinaleV2({ teams, awards, lang, liveBeat }: {
  teams: TowerTeam[]; awards: TowerAward[]; lang: 'de' | 'en';
  // Hybrid-Live-Steuerung: wenn gesetzt, gaten die Auto-Play-Uebergaenge an den
  // Beat-Grenzen auf diesen (Moderator-getriebenen) Wert. Beats:
  //   0 = Aufbau + Zwischenstand · 1..A = Award i · A+1 = Glide (Top 3) ·
  //   A+2..A+4 = Enthuellung Platz 3/2/1. Ohne Prop = Auto-Play (Preview).
  liveBeat?: number;
}) {
  const de = lang === 'de';
  const reduce = prefersReducedMotion();
  const N = teams.length;
  const live = liveBeat != null;

  const baseOf = useCallback((id: string) => teams.find(t => t.team.id === id)?.base ?? 0, [teams]);
  const teamById = useCallback((id: string) => teams.find(t => t.team.id === id)?.team, [teams]);
  const bonusByTeam = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of awards) m[a.teamId] = (m[a.teamId] ?? 0) + a.bonus;
    return m;
  }, [awards]);
  const totalOf = useCallback((id: string) => baseOf(id) + (bonusByTeam[id] ?? 0), [baseOf, bonusByTeam]);

  const finalRanking = useMemo(() => [...teams].sort((a, b) =>
    (totalOf(b.team.id) - totalOf(a.team.id)) || (b.base - a.base) || a.team.name.localeCompare(b.team.name),
  ), [teams, totalOf]);
  const rankById = useMemo(() => {
    const m: Record<string, number> = {};
    finalRanking.forEach((e, i) => { m[e.team.id] = i; });
    return m;
  }, [finalRanking]);
  const winner = finalRanking[0];

  const maxTotal = useMemo(() => Math.max(1, ...teams.map(t => totalOf(t.team.id))), [teams, totalOf]);

  const ordered = useMemo(() => {
    const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i) * 2654435761) >>> 0; return h; };
    return [...teams].sort((a, b) => hash(a.team.id) - hash(b.team.id));
  }, [teams]);
  const orderIndex = useMemo(() => {
    const m: Record<string, number> = {};
    ordered.forEach((t, i) => { m[t.team.id] = i; });
    return m;
  }, [ordered]);

  // ── Choreo ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'intro' | 'base' | 'baseHold' | 'award' | 'reveal'>(reduce ? 'reveal' : 'intro');
  const [baseTick, setBaseTick] = useState(reduce ? maxTotal : 0);
  const [awardIdx, setAwardIdx] = useState(reduce ? awards.length : 0);
  const [awardStage, setAwardStage] = useState<'card' | 'grow'>('card');
  const [awardTick, setAwardTick] = useState(0);
  const [revealStep, setRevealStep] = useState(reduce ? 3 : 0); // 0 = niemand, 1..3 = Platz 3..1
  const [glided, setGlided] = useState(reduce); // Top-3 in der Mitte (nach Recede-Beat)

  const hasAwards = awards.length > 0;
  const curAward = awards[awardIdx];
  const maxBase = useMemo(() => Math.max(1, ...teams.map(t => t.base)), [teams]);

  // revealt: NICHT-Top-3 immer sichtbar; Top-3 erst in der Enthuellung.
  const revealed = useCallback((rank: number) =>
    rank > 2 ? true : (phase === 'reveal' && revealStep >= (3 - rank)),
  [phase, revealStep]);

  // Space spult vor.
  const skip = useCallback(() => {
    if (phase === 'intro') { setPhase('base'); return; }
    if (phase === 'baseHold') { setAwardIdx(0); setAwardStage('card'); setAwardTick(0); setPhase(hasAwards ? 'award' : 'reveal'); return; }
    if (phase === 'award') {
      if (awardStage === 'card') { setAwardStage('grow'); setAwardTick(0); return; }
      if (!curAward || awardTick >= curAward.bonus) {
        if (awardIdx + 1 >= awards.length) setPhase('reveal');
        else { setAwardIdx(i => i + 1); setAwardStage('card'); setAwardTick(0); }
      } else setAwardTick(curAward ? curAward.bonus : 0);
      return;
    }
    if (phase === 'reveal') {
      if (!glided) { setGlided(true); return; }
      setRevealStep(s => Math.min(3, s + 1));
    }
  }, [phase, hasAwards, awardStage, awardIdx, awardTick, curAward, awards.length, glided]);

  useEffect(() => {
    // Live: der Moderator steuert ueber den Socket-Step (liveBeat), nicht ueber
    // lokale Tasten am Beamer.
    if (reduce || live) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); skip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip, reduce, live]);

  useEffect(() => { if (phase !== 'intro') return; const h = window.setTimeout(() => setPhase('base'), 3000); return () => window.clearTimeout(h); }, [phase]);

  useEffect(() => {
    if (phase !== 'base') return;
    if (baseTick >= maxBase) { const h = window.setTimeout(() => setPhase('baseHold'), 500); return () => window.clearTimeout(h); }
    const h = window.setTimeout(() => { setBaseTick(t => t + 1); try { playWoodKnock(); } catch { /* noop */ } }, 340);
    return () => window.clearTimeout(h);
  }, [phase, baseTick, maxBase]);

  useEffect(() => {
    if (phase !== 'baseHold') return;
    if (live && (liveBeat ?? 0) < 1) return; // Hybrid: warte auf Moderator-Beat 1
    const h = window.setTimeout(() => { setAwardIdx(0); setAwardStage('card'); setAwardTick(0); setPhase(hasAwards ? 'award' : 'reveal'); }, live ? 300 : 2200);
    return () => window.clearTimeout(h);
  }, [phase, hasAwards, live, liveBeat]);

  // Award-Zeremonie: grosse Karte → Turm waechst → Pause → naechster.
  useEffect(() => {
    if (phase !== 'award' || !curAward) return;
    if (awardStage === 'card') {
      try { playSpecialAwardReveal(); } catch { /* noop */ }
      const h = window.setTimeout(() => { setAwardStage('grow'); setAwardTick(0); }, 2100);
      return () => window.clearTimeout(h);
    }
    // grow
    if (awardTick >= curAward.bonus) {
      // Hybrid: der naechste Award / die Enthuellung wartet auf den Moderator-Beat.
      if (live && (liveBeat ?? 0) < awardIdx + 2) return;
      const h = window.setTimeout(() => {
        if (awardIdx + 1 >= awards.length) setPhase('reveal');
        else { setAwardIdx(i => i + 1); setAwardStage('card'); setAwardTick(0); }
      }, live ? 200 : 1500);
      return () => window.clearTimeout(h);
    }
    const h = window.setTimeout(() => { setAwardTick(t => t + 1); try { playTick(); } catch { /* noop */ } }, awardTick === 0 ? 650 : 460);
    return () => window.clearTimeout(h);
  }, [phase, curAward, awardStage, awardTick, awardIdx, awards.length, live, liveBeat]);

  // Enthuellung: Recede-Beat (Plaetze 4..N dimmen) → Glide in die Mitte →
  // Platz 3 → 2 → Atempause → 1.
  useEffect(() => {
    if (phase !== 'reveal') return;
    // Glide (Recede → Mitte) laeuft innerhalb des Glide-Beats automatisch.
    if (!glided) { const h = window.setTimeout(() => setGlided(true), 1600); return () => window.clearTimeout(h); }
    if (revealStep >= 3) { try { playClimaxFinish(); } catch { /* noop */ } try { playFanfare(); } catch { /* noop */ } return; }
    // Hybrid: jede Platz-Enthuellung wartet auf den naechsten Moderator-Beat.
    if (live && (liveBeat ?? 0) < awards.length + 2 + revealStep) return;
    const delay = live ? 200 : (revealStep === 0 ? 1300 : revealStep === 2 ? 2800 : 2200); // vor #1 laenger (Atempause)
    const h = window.setTimeout(() => { setRevealStep(s => s + 1); try { playReveal(); } catch { /* noop */ } }, delay);
    return () => window.clearTimeout(h);
  }, [phase, glided, revealStep, live, liveBeat, awards.length]);

  const inReveal = phase === 'reveal';
  const crowned = inReveal && revealStep >= 3;

  // ── Geometrie ─────────────────────────────────────────────────────────────
  const blockH = Math.max(15, Math.min(46, Math.floor((TOWER_ZONE - (maxTotal - 1) * GAP) / maxTotal)));
  const blockW = blockH;
  const SIDE_PAD = 90;
  const usable = STAGE_W - SIDE_PAD * 2;
  const colW = Math.max(blockW, Math.min(150, Math.floor(usable / N) - 16));
  const colGap = N > 1 ? Math.max(8, Math.floor((usable - N * colW) / (N - 1))) : 0;
  const avInBlock = Math.round(blockW * 0.82);
  const rowWidth = N * colW + (N - 1) * colGap;
  const startX = (STAGE_W - rowWidth) / 2;
  const baseX = (i: number) => startX + i * (colW + colGap);
  // Podium in der Mitte: Sieger zentral, 2. links, 3. rechts.
  const PGAP = 46;
  const centerX = STAGE_W / 2 - colW / 2;
  const podiumX = (rank: number) => rank === 0 ? centerX : rank === 1 ? centerX - (colW + PGAP) : centerX + (colW + PGAP);

  const appliedBefore = useCallback((id: string) => {
    let s = 0; for (let i = 0; i < awardIdx; i++) if (awards[i].teamId === id) s += awards[i].bonus; return s;
  }, [awardIdx, awards]);

  const shownOf = (id: string) => {
    const base = baseOf(id);
    if (phase === 'intro') return 0;
    if (phase === 'base') return Math.min(baseTick, base);
    if (phase === 'baseHold') return base;
    if (phase === 'award') {
      const add = curAward && awardStage === 'grow' && curAward.teamId === id ? Math.min(awardTick, curAward.bonus) : 0;
      return base + appliedBefore(id) + (curAward && curAward.teamId === id && awardStage === 'card' ? 0 : 0) + add;
    }
    return totalOf(id);
  };

  // Award-Empfaenger anonym? (Top-3 + noch nicht enthuellt)
  const awardRecipMystery = curAward ? !revealed(rankById[curAward.teamId]) : false;
  const recipTeam = curAward ? teamById(curAward.teamId) : undefined;

  // Spannungs-Flash (C): waehrend ein Award-Baustein faellt, vergleiche die Hoehe
  // des Empfaengers mit dem hoechsten ANDEREN Spitzenturm → Gleichstand / Fuehrung.
  let standingFlash: 'tie' | 'lead' | null = null;
  if (phase === 'award' && curAward && awardStage === 'grow' && awardTick > 0) {
    const recipShown = shownOf(curAward.teamId);
    let otherTopMax = 0;
    for (const t of teams) if (t.team.id !== curAward.teamId && rankById[t.team.id] <= 2) otherTopMax = Math.max(otherTopMax, shownOf(t.team.id));
    if (otherTopMax > 0 && recipShown === otherTopMax) standingFlash = 'tie';
    else if (otherTopMax > 0 && recipShown === otherTopMax + 1) standingFlash = 'lead';
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(120% 100% at 50% 8%, #1B1230 0%, #140C22 42%, ${INK} 100%)`,
      fontFamily: "var(--qq-font, 'Nunito', system-ui, sans-serif)",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Atmosphaere */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(130% 90% at 50% 120%, rgba(236,72,153,0.14), transparent 55%)' }} />
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 240, pointerEvents: 'none',
        background: crowned ? `radial-gradient(80% 130% at 50% 100%, ${winner.team.color}3a, transparent 70%)` : 'radial-gradient(90% 130% at 50% 100%, rgba(168,85,247,0.10), transparent 70%)',
        transition: 'background 0.8s ease',
      }} />
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'radial-gradient(120% 100% at 50% 60%, transparent 30%, rgba(6,3,12,0.66) 100%)',
        opacity: inReveal ? 1 : 0, transition: 'opacity 0.7s ease',
      }} />
      {!reduce && Array.from({ length: 6 }).map((_, i) => {
        const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        return <div key={i} aria-hidden style={{ position: 'absolute', bottom: -10, left: `${8 + r(1) * 84}%`, width: 3 + r(2) * 4, height: 3 + r(2) * 4, borderRadius: '50%', background: '#EC4899', opacity: 0.1 + r(3) * 0.1, filter: 'blur(1px)', animation: `qqT2Drift ${13 + r(4) * 9}s linear ${-r(5) * 18}s infinite` }} />;
      })}

      {/* Titelband */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: TITLE_H, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center', padding: '0 40px' }}>
        {crowned ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: GOLD, animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both' }}>{de ? 'Sieger' : 'Winner'}</div>
            <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.02, color: '#F8FAFC', textShadow: `0 2px 24px ${winner.team.color}66`, animation: reduce ? 'none' : 'qqT2WinnerIn 0.6s cubic-bezier(0.2,0.8,0.3,1) both' }}>{winner.team.name}</div>
          </>
        ) : inReveal && glided && revealStep === 2 ? (
          <div style={{ fontSize: 32, fontWeight: 900, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2Breathe 1.6s ease-in-out infinite' }}>{de ? 'Und der Sieger ist…' : 'And the winner is…'}</div>
        ) : inReveal && !glided ? (
          <div style={{ fontSize: 32, fontWeight: 900, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2Breathe 1.7s ease-in-out infinite' }}>{de ? 'Die Top 3 stehen fest…' : 'The Top 3 are set…'}</div>
        ) : inReveal ? (
          <div style={{ fontSize: 34, fontWeight: 900, color: '#F8FAFC' }}>{de ? 'Die Top 3' : 'The Top 3'}</div>
        ) : phase === 'baseHold' ? (
          <>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both' }}>{de ? 'Zwischenstand' : 'Standings'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#B9AEDA' }}>{de ? 'Jetzt zählen noch die Awards…' : 'Now the awards count…'}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease both' }}>{de ? 'Wer baut den höchsten Turm?' : 'Who builds the tallest tower?'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#B9AEDA', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease 0.1s both' }}>{de ? 'Jedes eroberte Feld ist ein Baustein' : 'Every conquered field is a brick'}</div>
          </>
        )}
      </div>

      {/* Spannungs-Flash (C): Gleichstand / In Fuehrung, waehrend der Award-Baustein faellt */}
      {standingFlash && (
        <div key={standingFlash} style={{
          position: 'absolute', top: TITLE_H + 8, left: '50%', transform: 'translateX(-50%)', zIndex: 13,
          padding: '10px 28px', borderRadius: 999, whiteSpace: 'nowrap',
          fontSize: 26, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: standingFlash === 'tie' ? '#1B1206' : '#0A2412',
          background: standingFlash === 'tie' ? GOLD : '#34D27B',
          boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 26px ${standingFlash === 'tie' ? GOLD : '#34D27B'}66`,
          animation: reduce ? 'none' : 'qqT2FlashPop 0.5s cubic-bezier(0.2,1.3,0.4,1) both',
        }}>{standingFlash === 'tie' ? (de ? '⚖ Gleichstand!' : '⚖ Tied!') : (de ? '▲ In Führung!' : '▲ In the lead!')}</div>
      )}

      {/* Boden-Linie */}
      <div aria-hidden style={{ position: 'absolute', left: SIDE_PAD - 30, right: SIDE_PAD - 30, bottom: BASE_H + BOTTOM - 1, height: 1, zIndex: 3, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 12%, rgba(255,255,255,0.14) 88%, transparent)' }} />

      {/* Tuerme (absolut positioniert → Glide in die Mitte moeglich) */}
      {ordered.map(({ team }) => {
        const id = team.id;
        const rank = rankById[id];
        const isWinner = rank === 0;
        const isTop3 = rank <= 2;
        const base = baseOf(id);
        const shown = shownOf(id);
        const total = totalOf(id);
        const show = revealed(rank);
        const myst = isTop3 && !show;
        const colr = myst ? MYST : team.color;
        const edge = myst ? MYST_EDGE : team.color;
        const towerPx = shown * blockH + Math.max(0, shown - 1) * GAP;
        const badge = rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
        const i = orderIndex[id];

        // Position + Glide (sequenziert: Nicht-Top-3 erst raus, dann Top-3 rein).
        let tx = 0, ty = 0, opacity = 1, z = 4;
        if (inReveal) {
          if (isTop3) { if (glided) { tx = podiumX(rank) - baseX(i); } z = isWinner ? 7 : 6; }
          else {
            // Recede-Beat: kurz mit Platz dimmen, dann beim Glide voll ausblenden.
            if (glided) { opacity = 0; ty = 40; } else { opacity = 0.4; }
            z = 3;
          }
        }
        // Badge: Nicht-Top-3 nur im Recede-Beat (vor Glide); Top-3 sobald enthuellt.
        const showBadge = inReveal && (rank > 2 ? !glided : show);
        const capped = inReveal;

        return (
          <div key={id} style={{
            position: 'absolute', bottom: BOTTOM, left: baseX(i), width: colW, zIndex: z,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transform: `translateX(${tx}px) translateY(${ty}px)`, opacity,
            transition: reduce ? 'none' : `transform 0.75s cubic-bezier(0.4,0,0.2,1)${isTop3 ? ' 0.35s' : ''}, opacity 0.5s ease`,
            animation: (isWinner && inReveal && revealStep === 2 && !reduce) ? 'qqT2Heartbeat 1.5s ease-in-out infinite' : 'none',
          }}>
            <div style={{ position: 'relative', width: blockW, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: GAP }}>
              <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)', width: Math.round(blockW * 2.1), height: 26, borderRadius: '50%', background: `radial-gradient(ellipse, ${colr}${crowned && isWinner ? '55' : '30'}, transparent 70%)`, filter: 'blur(6px)', zIndex: 0, pointerEvents: 'none', transition: 'background 0.4s ease' }} />

              {/* Kletternder Avatar (Krone/Badge) */}
              <div style={{ position: 'absolute', left: '50%', bottom: towerPx + 7, zIndex: 5, width: AV, height: AV, transform: 'translateX(-50%)', transition: reduce ? 'none' : 'bottom 0.44s cubic-bezier(0.34,1.4,0.6,1)' }}>
                {isWinner && crowned && (
                  <span aria-hidden style={{ position: 'absolute', left: '50%', bottom: AV - 10, transform: 'translateX(-50%)', fontSize: 44, lineHeight: 1, pointerEvents: 'none', zIndex: 8, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(249,200,122,0.8))', animation: reduce ? 'none' : 'qqT2CrownDrop 0.7s cubic-bezier(0.3,1.5,0.5,1) both, qqT2CrownFloat 2.6s ease-in-out 0.8s infinite' }}><QQEmojiIcon emoji="👑" size="1em" /></span>
                )}
                {!isWinner && showBadge && (
                  <div style={{ position: 'absolute', left: '50%', bottom: AV - 6, transform: 'translateX(-50%)', zIndex: 8, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, whiteSpace: 'nowrap', animation: reduce ? 'none' : 'qqT2BadgeIn 0.5s cubic-bezier(0.3,1.5,0.5,1) both' }}>
                    {badge && <span aria-hidden style={{ fontSize: 28, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))' }}><QQEmojiIcon emoji={badge} size={28} /></span>}
                    <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.05em', color: '#F8FAFC', background: 'rgba(15,8,23,0.94)', border: `2px solid ${myst ? MYST_EDGE : colr}`, borderRadius: 999, padding: '2px 9px', boxShadow: '0 3px 10px rgba(0,0,0,0.5)' }}>{de ? `PLATZ ${rank + 1}` : `#${rank + 1}`}</span>
                  </div>
                )}
                <div style={{ width: AV, height: AV, borderRadius: '50%', background: colr, border: `3px solid ${edge}`, boxShadow: myst ? '0 3px 8px rgba(0,0,0,0.45)' : `0 0 14px ${colr}77, 0 3px 8px rgba(0,0,0,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', animation: (isTop3 && show && !reduce) ? 'qqT2Reveal 0.6s ease-out both' : 'none' }}>
                  {myst
                    ? <span aria-hidden style={{ fontSize: 30, fontWeight: 900, color: '#B9AEDA', animation: reduce ? 'none' : 'qqT2Q 1.8s ease-in-out infinite' }}>?</span>
                    : <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={AV} flat />}
                </div>
              </div>

              {/* Kacheln */}
              {Array.from({ length: shown }).map((_, bi) => {
                const isTopBlock = bi === shown - 1;
                const isAwardBlock = bi >= base;
                const isCrownBlock = isWinner && crowned && isTopBlock;
                return (
                  <div key={bi} style={{
                    width: blockW, height: blockH, borderRadius: 4, position: 'relative', zIndex: 1,
                    background: isAwardBlock ? `linear-gradient(180deg, #FCE3B0 0%, ${GOLD} 55%, ${GOLD_DEEP} 100%)` : `linear-gradient(180deg, ${colr} 0%, ${colr} 60%, rgba(0,0,0,0.24) 100%)`,
                    boxShadow: isAwardBlock ? `inset 0 1.5px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(120,80,10,0.4), 0 0 14px ${GOLD}88, 0 1px 2px rgba(0,0,0,0.3)` : `inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.26), 0 1px 2px rgba(0,0,0,0.3)${(crowned && isWinner) ? `, 0 0 14px ${colr}66` : ''}`,
                    border: `1px solid ${isAwardBlock ? GOLD_DEEP : edge}`,
                    transformOrigin: 'bottom center',
                    transition: 'background 0.45s ease, border-color 0.45s ease',
                    animation: (isTopBlock && !reduce) ? (isCrownBlock ? 'qqT2CrownBlock 0.8s cubic-bezier(0.3,1.5,0.4,1) both' : 'qqT2Drop 0.46s cubic-bezier(0.3,1.35,0.5,1) both') : 'none',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isAwardBlock
                      ? <span aria-hidden style={{ fontSize: Math.round(blockW * 0.6), lineHeight: 1, color: '#7A5A1E', filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.4))' }}>★</span>
                      : myst ? null : <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={avInBlock} flat />}
                    {isTopBlock && !reduce && !(inReveal && !isTop3) && (
                      <div aria-hidden style={{ position: 'absolute', inset: -1, borderRadius: 5, pointerEvents: 'none', boxShadow: `0 0 ${isCrownBlock ? 22 : isAwardBlock ? 18 : 12}px ${(isAwardBlock ? GOLD : colr)}${isCrownBlock ? 'ee' : 'aa'}`, animation: `qqT2Spark ${isCrownBlock ? 0.7 : 0.5}s ease-out both` }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sockel */}
            <div style={{ height: BASE_H, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, gap: 4 }}>
              <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: capped && !myst ? colr : '#E2D6FF', fontVariantNumeric: 'tabular-nums', textShadow: capped && !myst ? `0 0 14px ${colr}66` : 'none', transition: 'color 0.3s ease' }}>
                <span key={shown} style={{ display: 'inline-block', animation: (shown > 0 && !crowned && !reduce) ? 'qqT2NumPop 0.3s ease-out' : 'none' }}>{shown}</span>
              </div>
              {myst
                ? <div style={{ fontSize: 16, fontWeight: 900, color: '#6B6480', letterSpacing: '0.12em' }}>???</div>
                : <TeamNameLabel name={team.name} maxLines={2} shrinkAfter={12} color="#F1F5F9" fontWeight={800} fontSize="clamp(12px, 1cqw, 16px)" style={{ maxWidth: colW + 8, textAlign: 'center', lineHeight: 1.05 }} />}
            </div>
          </div>
        );
      })}

      {/* Grosse Award-Zeremonie (Akt 2, Stage 'card') */}
      {phase === 'award' && curAward && awardStage === 'card' && recipTeam && (
        <AwardCelebration award={curAward} recip={recipTeam} mystery={awardRecipMystery} de={de} reduce={reduce} />
      )}
    </div>
  );
}

function AwardCelebration({ award, recip, mystery, de, reduce }: { award: TowerAward; recip: QQTeam; mystery: boolean; de: boolean; reduce: boolean }) {
  const label = de ? award.label : (award.labelEn ?? award.label);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 60% at 50% 45%, rgba(249,200,122,0.10), rgba(6,3,12,0.62) 70%)', animation: reduce ? 'none' : 'qqT2FadeUp 0.4s ease both' }} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        padding: '34px 56px', borderRadius: 26,
        background: 'linear-gradient(180deg, rgba(40,29,13,0.98), rgba(24,17,8,0.98))',
        border: `2px solid ${GOLD_DEEP}`, boxShadow: `0 30px 90px rgba(0,0,0,0.6), 0 0 46px ${GOLD}40, inset 0 1px 0 rgba(255,255,255,0.08)`,
        animation: reduce ? 'none' : 'qqT2AwardIn 0.55s cubic-bezier(0.2,1.2,0.35,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>{de ? 'Award' : 'Award'}</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#1B1206', background: GOLD, borderRadius: 999, padding: '2px 10px' }}>+{award.bonus}</span>
        </div>
        <div aria-hidden style={{ fontSize: 76, lineHeight: 1, filter: `drop-shadow(0 6px 16px rgba(0,0,0,0.5)) drop-shadow(0 0 22px ${GOLD}66)`, animation: reduce ? 'none' : 'qqT2AwardPop 0.7s cubic-bezier(0.3,1.5,0.4,1) both' }}><QQEmojiIcon emoji={award.emoji} size={76} /></div>
        <div style={{ fontSize: 40, fontWeight: 900, color: '#F8FAFC', lineHeight: 1.02, textAlign: 'center', textShadow: `0 2px 20px ${GOLD}44` }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: mystery ? MYST : recip.color, border: `3px solid ${mystery ? MYST_EDGE : recip.color}`, boxShadow: mystery ? '0 3px 8px rgba(0,0,0,0.45)' : `0 0 16px ${recip.color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {mystery ? <span aria-hidden style={{ fontSize: 34, fontWeight: 900, color: '#B9AEDA' }}>?</span> : <QQTeamAvatar avatarId={recip.avatarId} teamEmoji={recip.emoji} size={60} flat />}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: mystery ? '#C9BEE6' : recip.color, maxWidth: 460 }}>
            {mystery ? (de ? 'Einer der Spitzentürme!' : 'One of the top towers!') : recip.name}
          </div>
        </div>
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
@keyframes qqT2Reveal { 0% { transform: scale(0.5) rotate(-8deg); opacity: 0; } 60% { transform: scale(1.14) rotate(3deg); } 100% { transform: none; opacity: 1; } }
@keyframes qqT2Q { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes qqT2CrownDrop { 0% { transform: translateX(-50%) translateY(-30px) scale(0.5); opacity: 0; } 70% { transform: translateX(-50%) translateY(4px) scale(1.15); } 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } }
@keyframes qqT2CrownFloat { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-5px); } }
@keyframes qqT2BadgeIn { 0% { transform: translateX(-50%) translateY(8px) scale(0.7); opacity: 0; } 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } }
@keyframes qqT2Breathe { 0%, 100% { transform: scale(1); opacity: 0.92; } 50% { transform: scale(1.03); opacity: 1; } }
@keyframes qqT2Heartbeat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
@keyframes qqT2AwardIn { 0% { opacity: 0; transform: translateY(20px) scale(0.9); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2AwardPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
@keyframes qqT2FlashPop { 0% { transform: translateX(-50%) scale(0.7); opacity: 0; } 60% { transform: translateX(-50%) scale(1.1); } 100% { transform: translateX(-50%) scale(1); opacity: 1; } }
@keyframes qqT2Drift { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 0.18; } 88% { opacity: 0.18; } 100% { transform: translateY(-800px) translateX(24px); opacity: 0; } }
`;

export default TowerFinaleV2;
