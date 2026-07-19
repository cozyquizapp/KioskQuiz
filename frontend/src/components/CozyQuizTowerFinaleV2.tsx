/**
 * CozyQuizTowerFinaleV2 — Turm-Finale, Neubau (Wolf 2026-07-19 "mach den turmbau
 * neu, du kannst das nicer").
 *
 * Idee bleibt: jedes Team baut aus seinen eroberten Grid-Feldern einen Turm,
 * Turmhoehe = Punkte, hoechster Turm gewinnt — im Grid-Story bleiben.
 *
 * Wolf-Feedback (V1-Review):
 *  - GUT: die Bloecke sahen aus wie echte Grid-Felder — Avatar IN jedem Feld,
 *    bei jedem neu gebauten Block. → bleibt/kommt zurueck.
 *  - RAUS: der "Final-Tanz" (Avatare fliegen zwischen den Tuermen). → weg.
 *  - FEHLTE: Spannung. → Spannungs-Motor "Sichtbares Ausscheiden + Atempause".
 *
 * Spannungs-Motor (Wolf-Wahl):
 *  1. Alle Tuerme wachsen synchron, Avatar in jedem Feld (voller Grid-Look).
 *  2. Ein Turm "oben" → bekommt seinen Platz + dimmt. Das Feld verengt sich
 *     sichtbar (kuerzeste zuerst) bis nur der Sieger uebrig ist.
 *  3. Sieger haelt einen Baustein zurueck → ATEMPAUSE (alles dimmt, Herzschlag).
 *  4. Der letzte Baustein landet → Krone + Fanfare.
 *
 * "Nicer" bleibt: EINE ruhige Atmosphaere (Vignette + Boden-Glow) statt
 * God-Rays/Aurora/RGB-Split; prefers-reduced-motion respektiert.
 *
 * Moderator: Space/Enter/-> startet, kann den Bau vorspulen, loest die Kroenung.
 * Vorschau-Route /race-finale (Toggle "Tuerme V2").
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { QQTeam } from '../../../shared/quarterQuizTypes';
import { prefersReducedMotion } from '../utils/reducedMotion';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon } from './QQIcon';
import {
  playWoodKnock, playReveal, playClimaxFinish, playFanfare, playTick,
} from '../utils/sounds';

type TowerEntry = { team: QQTeam; total: number; score?: number; bonus?: number; awards?: number };

const STAGE_W = 1760;
const STAGE_H = 990;

// Feste vertikale Zonen (im 1760x990-Koordinatenraum) → hoechster Turm laeuft
// nie in Titel/Sockel.
const TITLE_H = 118;
const CROWN_H = 96;    // Kopfraum: kletternder Avatar + Krone/Badge
const BASE_H = 96;     // Zaehler + Name unter dem Turm
const BOTTOM = 34;
const GAP = 3;
const AV = 54;
const TOWER_ZONE = STAGE_H - TITLE_H - CROWN_H - BASE_H - BOTTOM;
const INK = '#0F0817';

export function TowerFinaleV2({ finalRanking, lang }: {
  finalRanking: TowerEntry[]; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const reduce = prefersReducedMotion();
  const N = finalRanking.length;

  const rankById = useMemo(() => {
    const m: Record<string, number> = {};
    finalRanking.forEach((e, i) => { m[e.team.id] = i; });
    return m;
  }, [finalRanking]);

  const heightOf = useCallback((e: TowerEntry) => Math.max(1, Math.round(e.total)), []);
  const maxH = useMemo(() => Math.max(1, ...finalRanking.map(heightOf)), [finalRanking, heightOf]);
  const winner = finalRanking[0];
  const hWinner = heightOf(winner);
  const nonWinnerMaxH = useMemo(
    () => (N > 1 ? Math.max(1, ...finalRanking.slice(1).map(heightOf)) : 0),
    [finalRanking, heightOf, N],
  );
  // Der Sieger haelt seinen obersten Baustein bis zur Kroenung zurueck.
  const winnerHold = Math.max(1, hWinner - 1);
  const buildStopTick = Math.max(nonWinnerMaxH, winnerHold);

  // Rang-NEUTRALE Anordnung (kein "Sieger mittig"-Spoiler), gleichmaessig verteilt.
  const ordered = useMemo(() => {
    const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i) * 2654435761) >>> 0; return h; };
    return [...finalRanking].sort((a, b) => hash(a.team.id) - hash(b.team.id));
  }, [finalRanking]);

  // ── Choreo ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'intro' | 'building' | 'held' | 'crowned'>(reduce ? 'crowned' : 'intro');
  const [tick, setTick] = useState(reduce ? maxH : 0);

  const advance = useCallback(() => {
    setPhase(p => {
      if (p === 'intro') return 'building';
      if (p === 'held') return 'crowned';
      return p;
    });
    // Bau vorspulen: Space waehrend des Bauens springt ans Bau-Ende.
    setTick(t => (phase === 'building' ? buildStopTick : t));
  }, [phase, buildStopTick]);

  useEffect(() => {
    if (reduce) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault(); advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, reduce]);

  // Intro haelt (showiger) → Bau startet automatisch.
  useEffect(() => {
    if (phase !== 'intro') return;
    const h = window.setTimeout(() => setPhase('building'), 3200);
    return () => window.clearTimeout(h);
  }, [phase]);

  // Synchroner Bau; kuerzeste Tuerme kappen zuerst (= sichtbares Ausscheiden).
  useEffect(() => {
    if (phase !== 'building') return;
    if (tick >= buildStopTick) {
      const h = window.setTimeout(() => setPhase('held'), 520);
      return () => window.clearTimeout(h);
    }
    // Beim Kappen eines Turms haelt der Bau kurz an (showiger Ausscheide-Moment),
    // sonst laeuft er im ruhigen, schweren Takt weiter.
    const nextTick = tick + 1;
    const someoneCaps = finalRanking.some(e => rankById[e.team.id] !== 0 && heightOf(e) === nextTick);
    const h = window.setTimeout(() => {
      setTick(t => {
        const nx = t + 1;
        const caps = finalRanking.some(e => rankById[e.team.id] !== 0 && heightOf(e) === nx);
        try { caps ? playTick() : playWoodKnock(); } catch { /* noop */ }
        return nx;
      });
    }, someoneCaps ? 640 : 360);
    return () => window.clearTimeout(h);
  }, [phase, tick, buildStopTick, finalRanking, heightOf, rankById]);

  useEffect(() => {
    if (phase === 'held') { try { playReveal(); } catch { /* noop */ } }
    if (phase === 'crowned') { try { playClimaxFinish(); } catch { /* noop */ } try { playFanfare(); } catch { /* noop */ } }
  }, [phase]);

  const crowned = phase === 'crowned';
  const held = phase === 'held';

  // ── Geometrie ─────────────────────────────────────────────────────────────
  const blockH = Math.max(15, Math.min(46, Math.floor((TOWER_ZONE - (maxH - 1) * GAP) / maxH)));
  const blockW = blockH;
  const SIDE_PAD = 90;
  const usable = STAGE_W - SIDE_PAD * 2;
  const colW = Math.max(blockW, Math.min(150, Math.floor(usable / N) - 16));
  const colGap = N > 1 ? Math.max(8, Math.floor((usable - N * colW) / (N - 1))) : 0;
  const avInBlock = Math.round(blockW * 0.82);

  const shownOf = (e: TowerEntry) => {
    const h = heightOf(e);
    if (rankById[e.team.id] === 0) return crowned ? h : Math.min(tick, winnerHold);
    return Math.min(tick, h);
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
          : 'radial-gradient(90% 130% at 50% 100%, rgba(168,85,247,0.10), transparent 70%)',
        transition: 'background 0.8s ease',
      }} />
      {/* Atempause/Kroenung: sanfter Bildschirm-Dim (spotlightet die hellen Tuerme). */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'radial-gradient(120% 100% at 50% 62%, transparent 34%, rgba(6,3,12,0.62) 100%)',
        opacity: held || crowned ? 1 : 0, transition: 'opacity 0.7s ease',
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
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#F9C87A', animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both' }}>{de ? 'Sieger' : 'Winner'}</div>
            <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.02, color: '#F8FAFC', textShadow: `0 2px 24px ${winner.team.color}66`, animation: reduce ? 'none' : 'qqT2WinnerIn 0.6s cubic-bezier(0.2,0.8,0.3,1) both' }}>{winner.team.name}</div>
          </>
        ) : held ? (
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.05, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2Breathe 1.7s ease-in-out infinite' }}>{de ? 'Der letzte Baustein entscheidet…' : 'The last brick decides…'}</div>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05, color: '#F8FAFC', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease both' }}>{de ? 'Wer baut den höchsten Turm?' : 'Who builds the tallest tower?'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', color: '#B9AEDA', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease 0.1s both' }}>{de ? 'Jedes eroberte Feld ist ein Baustein' : 'Every conquered field is a brick'}</div>
          </>
        )}
      </div>

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
        {ordered.map(entry => {
          const rank = rankById[entry.team.id];
          const isWinner = rank === 0;
          const h = heightOf(entry);
          const shown = shownOf(entry);
          const capped = isWinner ? crowned : shown >= h;
          const colr = entry.team.color;
          const towerPx = shown * blockH + Math.max(0, shown - 1) * GAP;
          const badge = rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;

          // Sichtbares Ausscheiden: gekappte Nicht-Sieger dimmen. In Atempause/
          // Kroenung dimmen alle ausser dem Sieger noch staerker.
          let colOpacity = 1;
          if (held || crowned) colOpacity = isWinner ? 1 : 0.28;
          else if (capped && !isWinner) colOpacity = 0.5;

          return (
            <div key={entry.team.id} style={{
              width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
              opacity: colOpacity, transition: 'opacity 0.5s ease',
              animation: (isWinner && held && !reduce) ? 'qqT2Heartbeat 1.5s ease-in-out infinite' : 'none',
            }}>
              {/* Turm-Saeule */}
              <div style={{ position: 'relative', width: blockW, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: GAP }}>
                {/* Boden-Aura */}
                <div aria-hidden style={{
                  position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
                  width: Math.round(blockW * 2.1), height: 26, borderRadius: '50%',
                  background: `radial-gradient(ellipse, ${colr}${crowned && isWinner ? '55' : '30'}, transparent 70%)`,
                  filter: 'blur(6px)', zIndex: 0, pointerEvents: 'none', transition: 'background 0.4s ease',
                }} />

                {/* Kletternder Avatar oben (traegt Krone/Platz-Badge) */}
                <div style={{
                  position: 'absolute', left: '50%', bottom: towerPx + 7, zIndex: 5,
                  width: AV, height: AV, transform: 'translateX(-50%)',
                  transition: reduce ? 'none' : 'bottom 0.44s cubic-bezier(0.34, 1.4, 0.6, 1)',
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
                    <QQTeamAvatar avatarId={entry.team.avatarId} teamEmoji={entry.team.emoji} size={AV} flat />
                  </div>
                </div>

                {/* Feld-Kacheln — Team-Farbe + Bevel + Avatar drin (Grid-Look). */}
                {Array.from({ length: shown }).map((_, bi) => {
                  const isTopBlock = bi === shown - 1;
                  const isCrownBlock = isWinner && crowned && isTopBlock; // der entscheidende letzte Baustein
                  return (
                    <div key={bi} style={{
                      width: blockW, height: blockH, borderRadius: 4, position: 'relative', zIndex: 1,
                      background: `linear-gradient(180deg, ${colr} 0%, ${colr} 60%, rgba(0,0,0,0.24) 100%)`,
                      boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.26), 0 1px 2px rgba(0,0,0,0.3)${(crowned && isWinner) ? `, 0 0 14px ${colr}66` : ''}`,
                      border: `1px solid ${colr}`,
                      transformOrigin: 'bottom center',
                      animation: (isTopBlock && !reduce) ? (isCrownBlock ? 'qqT2CrownBlock 0.8s cubic-bezier(0.3,1.5,0.4,1) both' : 'qqT2Drop 0.46s cubic-bezier(0.3,1.35,0.5,1) both') : 'none',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {/* Erobertes Feld zeigt seinen Besitzer — wie im Grid. */}
                      <QQTeamAvatar avatarId={entry.team.avatarId} teamEmoji={entry.team.emoji} size={avInBlock} flat />
                      {/* Dezenter Setz-Impuls auf dem neuesten Block. */}
                      {isTopBlock && !reduce && !(crowned && !isWinner) && (
                        <div aria-hidden style={{
                          position: 'absolute', inset: -1, borderRadius: 5, pointerEvents: 'none',
                          boxShadow: `0 0 ${isCrownBlock ? 22 : 12}px ${colr}${isCrownBlock ? 'ee' : 'aa'}`,
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
                  fontSize: 30, fontWeight: 900, lineHeight: 1, color: capped ? colr : '#E2D6FF',
                  fontVariantNumeric: 'tabular-nums', textShadow: capped ? `0 0 14px ${colr}66` : 'none', transition: 'color 0.3s ease',
                }}>
                  <span key={shown} style={{ display: 'inline-block', animation: (shown > 0 && !crowned && !reduce) ? 'qqT2NumPop 0.3s ease-out' : 'none' }}>{shown}</span>
                </div>
                <TeamNameLabel
                  name={entry.team.name} maxLines={2} shrinkAfter={12} color="#F1F5F9" fontWeight={800}
                  fontSize="clamp(12px, 1cqw, 16px)" style={{ maxWidth: colW + 8, textAlign: 'center', lineHeight: 1.05 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Moderator-Hinweis */}
      {held && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
          fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#8B84A0', textTransform: 'uppercase',
          animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both',
        }}>{de ? 'Leertaste → Krönung' : 'Space → crown'}</div>
      )}
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
@keyframes qqT2Drift { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 0.18; } 88% { opacity: 0.18; } 100% { transform: translateY(-800px) translateX(24px); opacity: 0; } }
`;

export default TowerFinaleV2;
