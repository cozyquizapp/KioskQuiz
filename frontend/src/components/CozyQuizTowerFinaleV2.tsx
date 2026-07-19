/**
 * CozyQuizTowerFinaleV2 — Turm-Finale, Neubau (Wolf 2026-07-19 "mach den turmbau
 * neu, du kannst das nicer").
 *
 * Idee bleibt: jedes Team baut aus seinen eroberten Grid-Feldern einen Turm,
 * Turmhoehe = Punkte, hoechster Turm gewinnt — im Grid-Story bleiben.
 *
 * "Nicer" = Premium-Richtung des Elevation-Passes ("Premium schlaegt fruehere
 * Deko"):
 *  - Bloecke sind MATERIALEHRLICHE Feld-Kacheln (solide Team-Farbe + Bevel),
 *    NICHT 12x dasselbe Avatar-Gesicht. Der Avatar klettert EINMAL oben mit.
 *  - Zentrierte, gleichmaessig verteilte Komposition (kein Pyramiden-Spoiler,
 *    aber auch kein Sieger-am-Rand).
 *  - EINE ruhige Atmosphaere (Vignette + weicher Boden-Glow) statt God-Rays,
 *    Aurora, RGB-Split, Shockwave-Stapel.
 *  - Verfeinerte Motion: Block setzt aus der Tiefe (ease-out + Micro-Overshoot),
 *    Count-Up tabular, Krone faellt ruhig. prefers-reduced-motion respektiert.
 *
 * Moderator-gesteuert (Space/Enter/-> bzw. Streamdeck): kuerzester Turm zuerst
 * enthuellt, Sieger zuletzt gekroent. Vorschau-Route /race-finale (Toggle "V2").
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
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

// Feste vertikale Zonen (im 1760x990-Koordinatenraum, per Stage-Transform
// mitskaliert) → hoechster Turm laeuft nie in Titel/Sockel.
const TITLE_H = 118;   // Titelband oben
const CROWN_H = 96;    // Kopfraum: kletternder Avatar + Krone/Badge
const BASE_H = 96;     // Zaehler + Name unter dem Turm
const BOTTOM = 34;     // Bodenabstand
const GAP = 3;         // Abstand zwischen Kacheln
const AV = 54;         // Avatar-Groesse (klettert oben mit)
const TOWER_ZONE = STAGE_H - TITLE_H - CROWN_H - BASE_H - BOTTOM;

const NEUTRAL = '#3A3550';       // anonyme (noch geheime) Top-3-Kacheln
const NEUTRAL_EDGE = '#514A6B';
const INK = '#0F0817';

export function TowerFinaleV2({ finalRanking, lang }: {
  finalRanking: TowerEntry[]; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const reduce = prefersReducedMotion();
  const N = finalRanking.length;

  // Rang pro Team (0 = Sieger).
  const rankById = useMemo(() => {
    const m: Record<string, number> = {};
    finalRanking.forEach((e, i) => { m[e.team.id] = i; });
    return m;
  }, [finalRanking]);

  const heightOf = useCallback((e: TowerEntry) => Math.max(1, Math.round(e.total)), []);
  const maxH = useMemo(() => Math.max(1, ...finalRanking.map(heightOf)), [finalRanking, heightOf]);

  // Rang-NEUTRALE Anordnung (kein "Sieger steht mittig"-Spoiler) — deterministisch
  // per ID-Hash gemischt, gleichmaessig verteilt (keine Pyramide).
  const ordered = useMemo(() => {
    const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i) * 2654435761) >>> 0; return h; };
    return [...finalRanking].sort((a, b) => hash(a.team.id) - hash(b.team.id));
  }, [finalRanking]);

  // Enthuellungs-Reihenfolge: kuerzester Turm zuerst (= letzter Platz), Sieger
  // zuletzt. Bei Gleichstand stabil ueber den Rang.
  const revealOrder = useMemo(
    () => [...finalRanking].sort((a, b) => (heightOf(a) - heightOf(b)) || (rankById[b.team.id] - rankById[a.team.id])),
    [finalRanking, heightOf, rankById],
  );
  const revealIdxById = useMemo(() => {
    const m: Record<string, number> = {};
    revealOrder.forEach((e, i) => { m[e.team.id] = i; });
    return m;
  }, [revealOrder]);

  // ── Choreo-State ──────────────────────────────────────────────────────────
  // intro → building (Tuerme wachsen synchron) → card (STOP, Platz-Enthuellung)
  // → building → … → Sieger: crowned.
  const [phase, setPhase] = useState<'intro' | 'building' | 'card' | 'crowned'>(reduce ? 'crowned' : 'intro');
  const [tick, setTick] = useState(reduce ? maxH : 0);
  const [revealedCount, setRevealedCount] = useState(reduce ? N : 0);

  const currentReveal = revealOrder[Math.min(revealedCount, N - 1)];
  const isWinnerNext = revealedCount >= N - 1;
  const buildTarget = isWinnerNext ? maxH : (currentReveal ? heightOf(currentReveal) : maxH);

  const advance = useCallback(() => {
    setPhase(p => {
      if (p === 'intro') return 'building';
      if (p === 'card') { setRevealedCount(c => c + 1); return 'building'; }
      return p;
    });
  }, []);

  // Moderator-Steuerung.
  useEffect(() => {
    if (reduce) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, reduce]);

  // Intro haelt kurz, dann startet der erste Turm automatisch.
  useEffect(() => {
    if (phase !== 'intro') return;
    const h = window.setTimeout(() => setPhase('building'), 2400);
    return () => window.clearTimeout(h);
  }, [phase]);

  // Synchrones Bauen bis Zielhoehe → STOP (Karte bzw. Kroenung).
  useEffect(() => {
    if (phase !== 'building') return;
    if (tick >= buildTarget) {
      const next = isWinnerNext ? 'crowned' : 'card';
      const h = window.setTimeout(() => setPhase(next), 240);
      return () => window.clearTimeout(h);
    }
    const h = window.setTimeout(() => {
      setTick(t => t + 1);
      try { playWoodKnock(); } catch { /* noop */ }
    }, 210);
    return () => window.clearTimeout(h);
  }, [phase, tick, buildTarget, isWinnerNext]);

  useEffect(() => {
    if (phase === 'card') { try { playReveal(); } catch { /* noop */ } }
    if (phase === 'crowned') { try { playClimaxFinish(); } catch { /* noop */ } try { playFanfare(); } catch { /* noop */ } }
  }, [phase]);

  const crowned = phase === 'crowned';
  const winner = finalRanking[0];

  // ── Geometrie ─────────────────────────────────────────────────────────────
  // Quadratische Kacheln wie das Grid-Feld; Hoehe aus dem vertikalen Budget.
  const blockH = Math.max(15, Math.min(46, Math.floor((TOWER_ZONE - (maxH - 1) * GAP) / maxH)));
  const blockW = blockH;
  // Spaltenbreite: Kachel + Luft fuer den Namen; gleichmaessig ueber 1760 verteilt.
  const SIDE_PAD = 90;
  const usable = STAGE_W - SIDE_PAD * 2;
  const colW = Math.max(blockW, Math.min(150, Math.floor(usable / N) - 16));
  const colGap = N > 1 ? Math.max(8, Math.floor((usable - N * colW) / (N - 1))) : 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(120% 100% at 50% 8%, #1B1230 0%, #140C22 42%, ${INK} 100%)`,
      fontFamily: "var(--qq-font, 'Nunito', system-ui, sans-serif)",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Ruhige Atmosphaere: Vignette + weicher Boden-Glow (unter dem Sieger
          waermer, wenn gekroent). EINE Schicht statt Effekt-Stapel. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(130% 90% at 50% 120%, rgba(236,72,153,0.14), transparent 55%)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, pointerEvents: 'none',
        background: crowned
          ? `radial-gradient(80% 130% at 50% 100%, ${winner.team.color}3a, transparent 70%)`
          : 'radial-gradient(90% 130% at 50% 100%, rgba(168,85,247,0.10), transparent 70%)',
        transition: 'background 0.8s ease',
      }} />
      {/* Wenige, sehr dezente Glut-Partikel (Leben, kein Feuerwerk). */}
      {!reduce && Array.from({ length: 6 }).map((_, i) => {
        const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        return (
          <div key={i} aria-hidden style={{
            position: 'absolute', bottom: -10, left: `${8 + r(1) * 84}%`,
            width: 3 + r(2) * 4, height: 3 + r(2) * 4, borderRadius: '50%',
            background: '#EC4899', opacity: 0.12 + r(3) * 0.12, filter: 'blur(1px)',
            animation: `qqT2Drift ${13 + r(4) * 9}s linear ${-r(5) * 18}s infinite`,
          }} />
        );
      })}

      {/* Titelband */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: TITLE_H,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4, zIndex: 6, textAlign: 'center', padding: '0 40px',
      }}>
        {crowned ? (
          <>
            <div style={{
              fontSize: 15, fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase',
              color: '#F9C87A', animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both',
            }}>{de ? 'Sieger' : 'Winner'}</div>
            <div style={{
              fontSize: 46, fontWeight: 900, lineHeight: 1.02, color: '#F8FAFC',
              textShadow: `0 2px 24px ${winner.team.color}66`,
              animation: reduce ? 'none' : 'qqT2WinnerIn 0.6s cubic-bezier(0.2,0.8,0.3,1) both',
            }}>{winner.team.name}</div>
          </>
        ) : (
          <>
            <div style={{
              fontSize: 34, fontWeight: 900, lineHeight: 1.05, color: '#F8FAFC',
              animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease both',
            }}>{de ? 'Wer baut den höchsten Turm?' : 'Who builds the tallest tower?'}</div>
            <div style={{
              fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', color: '#B9AEDA',
              animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease 0.1s both',
            }}>{de ? 'Jedes eroberte Feld ist ein Baustein' : 'Every conquered field is a brick'}</div>
          </>
        )}
      </div>

      {/* Boden-Linie: alle Tuerme stehen auf derselben Kante. */}
      <div aria-hidden style={{
        position: 'absolute', left: SIDE_PAD - 30, right: SIDE_PAD - 30,
        bottom: BASE_H + BOTTOM - 1, height: 1, zIndex: 2,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 12%, rgba(255,255,255,0.14) 88%, transparent)',
      }} />

      {/* Turm-Reihe */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: BOTTOM,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        gap: colGap, zIndex: 3,
      }}>
        {ordered.map(entry => {
          const rank = rankById[entry.team.id];
          const h = heightOf(entry);
          const shown = Math.min(tick, h);
          const capped = shown >= h;
          const isWinner = rank === 0;
          const isTop3 = rank <= 2;
          const revealIdx = revealIdxById[entry.team.id];
          // Enthuellt, sobald die eigene Karte an der Reihe war (oder Kroenung).
          const identityShown =
            revealIdx < revealedCount ||
            (revealIdx === revealedCount && (phase === 'card' || crowned));
          // Nur Top-3 bleiben geheim; der Rest ist von Anfang an sichtbar.
          const anon = isTop3 && !identityShown;
          const colr = anon ? NEUTRAL : entry.team.color;
          const edge = anon ? NEUTRAL_EDGE : entry.team.color;
          const towerPx = shown * blockH + Math.max(0, shown - 1) * GAP;
          const badge = rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;

          return (
            <div key={entry.team.id} style={{
              width: colW, display: 'flex', flexDirection: 'column', alignItems: 'center',
              flexShrink: 0,
            }}>
              {/* Turm-Saeule (waechst nach oben) */}
              <div style={{
                position: 'relative', width: blockW, display: 'flex', flexDirection: 'column-reverse',
                alignItems: 'center', gap: GAP,
              }}>
                {/* Boden-Aura unter dem Turm */}
                <div aria-hidden style={{
                  position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
                  width: Math.round(blockW * 2.1), height: 26, borderRadius: '50%',
                  background: `radial-gradient(ellipse, ${colr}${crowned && isWinner ? '55' : '33'}, transparent 70%)`,
                  filter: 'blur(6px)', zIndex: 0, pointerEvents: 'none',
                  transition: 'background 0.4s ease',
                }} />

                {/* Kletternder Avatar — EINMAL oben auf dem Turm. */}
                <div style={{
                  position: 'absolute', left: '50%', bottom: towerPx + 7, zIndex: 5,
                  width: AV, height: AV, transform: 'translateX(-50%)',
                  transition: reduce ? 'none' : 'bottom 0.32s cubic-bezier(0.34, 1.4, 0.6, 1)',
                }}>
                  {/* Krone/Badge poppt, sobald der Turm fertig + enthuellt ist. */}
                  {isWinner && identityShown && crowned && (
                    <span aria-hidden style={{
                      position: 'absolute', left: '50%', bottom: AV - 10, transform: 'translateX(-50%)',
                      fontSize: 44, lineHeight: 1, pointerEvents: 'none', zIndex: 8,
                      filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(249,200,122,0.8))',
                      animation: reduce ? 'none' : 'qqT2CrownDrop 0.7s cubic-bezier(0.3,1.5,0.5,1) both, qqT2CrownFloat 2.6s ease-in-out 0.8s infinite',
                    }}><QQEmojiIcon emoji="👑" size="1em" /></span>
                  )}
                  {!isWinner && identityShown && (capped || crowned) && (
                    <div style={{
                      position: 'absolute', left: '50%', bottom: AV - 6, transform: 'translateX(-50%)',
                      zIndex: 8, pointerEvents: 'none', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 1, whiteSpace: 'nowrap',
                      animation: reduce ? 'none' : 'qqT2BadgeIn 0.5s cubic-bezier(0.3,1.5,0.5,1) both',
                    }}>
                      {badge && <span aria-hidden style={{ fontSize: 28, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))' }}><QQEmojiIcon emoji={badge} size={28} /></span>}
                      <span style={{
                        fontSize: 13, fontWeight: 900, letterSpacing: '0.05em', color: '#F8FAFC',
                        background: 'rgba(15,8,23,0.94)', border: `2px solid ${entry.team.color}`,
                        borderRadius: 999, padding: '2px 9px',
                        boxShadow: `0 3px 10px rgba(0,0,0,0.5)`,
                      }}>{de ? `PLATZ ${rank + 1}` : `#${rank + 1}`}</span>
                    </div>
                  )}
                  <div style={{
                    width: AV, height: AV, borderRadius: '50%',
                    background: anon ? NEUTRAL : entry.team.color,
                    border: `3px solid ${anon ? NEUTRAL_EDGE : entry.team.color}`,
                    boxShadow: anon
                      ? '0 3px 8px rgba(0,0,0,0.45)'
                      : `0 0 14px ${entry.team.color}77, 0 3px 8px rgba(0,0,0,0.45)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    animation: (isTop3 && identityShown && !reduce) ? 'qqT2Reveal 0.6s ease-out both' : 'none',
                  }}>
                    {anon
                      ? <span aria-hidden style={{ fontSize: 28, fontWeight: 900, color: '#B9AEDA', animation: reduce ? 'none' : 'qqT2Q 1.8s ease-in-out infinite' }}>?</span>
                      : <QQTeamAvatar avatarId={entry.team.avatarId} teamEmoji={entry.team.emoji} size={AV} flat />}
                  </div>
                </div>

                {/* Feld-Kacheln — solide Team-Farbe mit Bevel (materialehrlich wie
                    das Grid-Feld). Nur der oberste (neueste) Block droppt. */}
                {Array.from({ length: shown }).map((_, bi) => {
                  const isTopBlock = bi === shown - 1;
                  return (
                    <div key={bi} style={{
                      width: blockW, height: blockH, borderRadius: 4,
                      background: `linear-gradient(180deg, ${colr} 0%, ${colr} 62%, rgba(0,0,0,0.22) 100%)`,
                      boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.3)${(crowned && isWinner) ? `, 0 0 14px ${entry.team.color}66` : ''}`,
                      border: `1px solid ${edge}`,
                      transformOrigin: 'bottom center',
                      animation: (isTopBlock && !reduce) ? 'qqT2Drop 0.34s cubic-bezier(0.3,1.35,0.5,1) both' : 'none',
                      transition: 'background 0.3s ease, border-color 0.3s ease',
                      position: 'relative', zIndex: 1,
                    }}>
                      {/* Dezenter Setz-Impuls auf dem neuesten Block (kein Bloom-Stack). */}
                      {isTopBlock && !crowned && !reduce && (
                        <div aria-hidden style={{
                          position: 'absolute', inset: -1, borderRadius: 5,
                          boxShadow: `0 0 12px ${colr}aa`, pointerEvents: 'none',
                          animation: 'qqT2Spark 0.5s ease-out both',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sockel: Zaehler + Name (feste Hoehe → alle Boeden auf Linie) */}
              <div style={{
                height: BASE_H, flexShrink: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, gap: 4,
              }}>
                <div style={{
                  fontSize: 30, fontWeight: 900, lineHeight: 1,
                  color: capped && !anon ? entry.team.color : '#E2D6FF',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: capped && !anon ? `0 0 14px ${entry.team.color}66` : 'none',
                  transition: 'color 0.3s ease',
                }}>
                  <span key={shown} style={{ display: 'inline-block', animation: (shown > 0 && !crowned && !reduce) ? 'qqT2NumPop 0.3s ease-out' : 'none' }}>{shown}</span>
                </div>
                {anon
                  ? <div style={{ fontSize: 16, fontWeight: 900, color: '#6B6480', letterSpacing: '0.12em' }}>???</div>
                  : <TeamNameLabel
                      name={entry.team.name}
                      maxLines={2}
                      shrinkAfter={12}
                      color="#F1F5F9"
                      fontWeight={800}
                      fontSize="clamp(12px, 1cqw, 16px)"
                      style={{ maxWidth: colW + 8, textAlign: 'center', lineHeight: 1.05 }}
                    />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Platz-Enthuellungs-Karte (aus der Quelle skaliert, premium ruhig). */}
      {phase === 'card' && currentReveal && (
        <CardReveal entry={currentReveal} rank={rankById[currentReveal.team.id]} de={de} reduce={reduce} />
      )}

      {/* Moderator-Hinweis */}
      {!crowned && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#6B6480',
          textTransform: 'uppercase', zIndex: 20,
        }}>{phase === 'card' ? (de ? 'Weiter →' : 'Next →') : ''}</div>
      )}
    </div>
  );
}

// Vordergrund-Karte "Team X — Platz N" (bzw. SIEGER bei Platz 1 uebernimmt das
// Titelband). Ruhig: eine Karte, weiche Skalierung, kein Neon-Rahmen.
function CardReveal({ entry, rank, de, reduce }: { entry: TowerEntry; rank: number; de: boolean; reduce: boolean }) {
  const color = entry.team.color;
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 15, pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        padding: '30px 46px', borderRadius: 22,
        background: 'linear-gradient(180deg, rgba(28,20,44,0.97), rgba(18,12,30,0.97))',
        border: `1px solid ${color}66`,
        boxShadow: `0 24px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset`,
        animation: reduce ? 'none' : 'qqT2CardIn 0.42s cubic-bezier(0.2,0.9,0.3,1) both',
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: color, border: `3px solid ${color}`,
          boxShadow: `0 0 26px ${color}88`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <QQTeamAvatar avatarId={entry.team.avatarId} teamEmoji={entry.team.emoji} size={96} flat />
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#F8FAFC', textAlign: 'center', lineHeight: 1.05, maxWidth: 560 }}>{entry.team.name}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color }}>
          {de ? `Mit ${entry.total} Punkten auf Platz ${rank + 1}` : `${entry.total} points — place ${rank + 1}`}
        </div>
      </div>
    </div>
  );
}

const KEYFRAMES = `
@keyframes qqT2FadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes qqT2WinnerIn { 0% { opacity: 0; transform: translateY(14px) scale(0.96); } 60% { transform: translateY(0) scale(1.02); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2Drop { 0% { opacity: 0; transform: translateY(-22px) scaleY(0.7); } 70% { transform: translateY(0) scaleY(1.06); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2Spark { 0% { opacity: 0.9; } 100% { opacity: 0; } }
@keyframes qqT2NumPop { 0% { transform: scale(1); } 40% { transform: scale(1.28); } 100% { transform: scale(1); } }
@keyframes qqT2Reveal { 0% { transform: scale(0.6) rotate(-8deg); opacity: 0; } 60% { transform: scale(1.12) rotate(3deg); } 100% { transform: none; opacity: 1; } }
@keyframes qqT2Q { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes qqT2CrownDrop { 0% { transform: translateX(-50%) translateY(-30px) scale(0.5); opacity: 0; } 70% { transform: translateX(-50%) translateY(4px) scale(1.15); } 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } }
@keyframes qqT2CrownFloat { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-5px); } }
@keyframes qqT2BadgeIn { 0% { transform: translateX(-50%) translateY(8px) scale(0.7); opacity: 0; } 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } }
@keyframes qqT2CardIn { 0% { opacity: 0; transform: translateY(16px) scale(0.94); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2Drift { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: var(--o, 0.2); } 88% { opacity: var(--o, 0.2); } 100% { transform: translateY(-780px) translateX(24px); opacity: 0; } }
`;

export default TowerFinaleV2;
