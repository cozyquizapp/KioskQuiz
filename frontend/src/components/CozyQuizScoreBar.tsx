/**
 * CozyQuizScoreBar — Standings-Liste pro Team mit Score, Joker-Pile, Rank-Tracking.
 *
 * Sortiert nach largestConnected (Quartier-Groesse). Score-Aenderungen feuern
 * Pop-Floater („+1"-Bubble), Rank-Aenderungen feuern Up/Down-Pfeil + FLIP-
 * Reorder-Animation (smooth row-swap statt Snap).
 *
 * Joker-Pile rechts pro Row: pro Joker ein gestapelter Star/EU-Heart.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 2).
 * 2+ interne Caller (PlacementView, ggf. ConnectionsBeamerView).
 */
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { JokerIcon } from './JokerIcon';
import { compareTeamsForRanking } from '../utils/qqTeamRanking';
import { QQEmojiIcon } from './QQIcon';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';

export function ScoreBar({ teams, activeTeamId, teamPhaseStats, correctTeamId, activeActionLabel, activeActionDesc, eurovisionMode, lang }: {
  teams: QQStateUpdate['teams'];
  activeTeamId?: string | null;
  teamPhaseStats?: QQStateUpdate['teamPhaseStats'];
  correctTeamId?: string | null;
  activeActionLabel?: string;
  activeActionDesc?: string;
  /** 2026-05-07 (Wolf-ESC): wenn true, Joker-Pile nutzt EU-Star-Variante. */
  eurovisionMode?: boolean;
  /** 2026-05-23 (Live-Test #J): Lang fuer Feld/cell-Unit-Label. Default 'de'. */
  lang?: 'de' | 'en';
}) {
  const sorted = [...teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const prevScores = useRef<Record<string, number>>({});
  const prevJokers = useRef<Record<string, number>>({});
  const prevRanks = useRef<Record<string, number>>({});
  const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
  const [floaters, setFloaters] = useState<{ id: string; teamId: string; diff: number }[]>([]);
  // F2: Rank-Change-Indikator (up/down Pfeil pro Team).
  const [rankChanges, setRankChanges] = useState<Record<string, 'up' | 'down'>>({});
  // FLIP-Animation für Row-Reorder (User-Wunsch 2026-04-28: 'Swap zu schnell,
  // smoother darstellen'). Snapshotted Positionen vor dem Re-Render → nach
  // dem Re-Render Inverse-Transform anwenden, dann zur Identität animieren.
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRowPositions = useRef<Record<string, number>>({});
  useLayoutEffect(() => {
    const els = rowRefs.current;
    Object.entries(els).forEach(([id, el]) => {
      if (!el) return;
      const newTop = el.offsetTop;
      const oldTop = prevRowPositions.current[id];
      if (oldTop != null && oldTop !== newTop) {
        const dy = oldTop - newTop;
        // Inverse-Transform sofort, ohne Transition, dann zur Identität animieren
        el.style.transition = 'none';
        el.style.transform = `translateY(${dy}px)`;
        // Zwei rAFs → erlaubt dem Browser den initialen Stil zu setzen,
        // bevor die Transition aktiviert wird (verhindert dass die Animation
        // weggesnappt wird).
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.7s cubic-bezier(0.34,1.05,0.5,1)';
            el.style.transform = 'translateY(0)';
          });
        });
      }
      prevRowPositions.current[id] = newTop;
    });
  });
  useEffect(() => {
    const next: Record<string, 'up' | 'down'> = {};
    sorted.forEach((t, i) => {
      const prevIdx = prevRanks.current[t.id];
      if (prevIdx != null && prevIdx !== i) {
        next[t.id] = prevIdx > i ? 'up' : 'down';
      }
      prevRanks.current[t.id] = i;
    });
    if (Object.keys(next).length > 0) {
      setRankChanges(next);
      setTimeout(() => setRankChanges({}), 1200);
    }
  }, [sorted.map(t => t.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  // B2: Teams mit gerade verdientem Joker — triggert Stern-Flug-Animation
  const [jokerEarners, setJokerEarners] = useState<Set<string>>(new Set());
  // C2: Streak-Counter pro Team (wie oft hintereinander correctTeamId).
  // Wechselt der correctTeamId auf ein neues nicht-null Team: dessen Counter++
  // und alle anderen → 0. Null (niemand richtig) tastet keine Counter.
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const prevCorrectRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = correctTeamId ?? null;
    if (!cur) return;
    if (cur === prevCorrectRef.current) return;
    prevCorrectRef.current = cur;
    setStreaks(s => {
      const next: Record<string, number> = {};
      for (const t of teams) next[t.id] = t.id === cur ? (s[t.id] ?? 0) + 1 : 0;
      return next;
    });
  }, [correctTeamId, teams]);

  useEffect(() => {
    const newPopped = new Set<string>();
    const newFloaters: typeof floaters = [];
    for (const t of teams) {
      const prev = prevScores.current[t.id] ?? 0;
      if (t.largestConnected > prev && prev > 0) {
        newPopped.add(t.id);
        newFloaters.push({ id: `${t.id}-${Date.now()}`, teamId: t.id, diff: t.largestConnected - prev });
      }
      prevScores.current[t.id] = t.largestConnected;
    }
    if (newPopped.size > 0) {
      setPoppedIds(newPopped);
      setFloaters(f => [...f, ...newFloaters]);
      setTimeout(() => setPoppedIds(new Set()), 500);
      setTimeout(() => setFloaters(f => f.filter(fl => !newFloaters.includes(fl))), 1200);
    }
  }, [teams]);

  // B2: jokersEarned tracking pro Team. Beim Anstieg: Stern fliegt auf Avatar.
  // 2026-05-19 (Wolf 'gedrehter joker taucht beim grid oeffnen auf'):
  // Beim ersten Mount-Run war prevJokers leer → before=0, now>0 fuer alle
  // Teams die in vorigen Runden Joker verdient hatten → falscher Stern-Flug
  // bei jedem ScoreBar-Remount (z.B. Grid-Reopen). isFirstRunRef skippt die
  // Animation beim allerersten Snapshot.
  const isFirstJokerRunRef = useRef(true);
  useEffect(() => {
    if (!teamPhaseStats) return;
    const newEarners = new Set<string>();
    for (const t of teams) {
      const now = teamPhaseStats[t.id]?.jokersEarned ?? 0;
      const before = prevJokers.current[t.id] ?? 0;
      if (!isFirstJokerRunRef.current && now > before) newEarners.add(t.id);
      prevJokers.current[t.id] = now;
    }
    isFirstJokerRunRef.current = false;
    if (newEarners.size > 0) {
      setJokerEarners(newEarners);
      setTimeout(() => setJokerEarners(new Set()), 1600);
    }
  }, [teams, teamPhaseStats]);

  // Bei vielen Teams (≥6) kompakter, sonst passen 8 Zeilen nicht nebeneinander.
  // Balken ist raus — Info steckt in der Zahl. Dafür Name + Wert deutlich größer.
  const dense = sorted.length >= 6;
  const avatarSize = dense ? 64 : 78;
  const avatarBox = dense ? 76 : 92;
  const nameFs = dense ? 34 : 42;
  const valFs = dense ? 42 : 54;
  const unitFs = dense ? 18 : 22;

  // Medaillen-Style für Top 3 (nur wenn Wert > 0 und eindeutig).
  const medalFor = (i: number, val: number): string | null => {
    if (val === 0) return null;
    if (i === 0) return '🥇';
    if (i === 1 && sorted[1].largestConnected < sorted[0].largestConnected) return '🥈';
    if (i === 2 && sorted[2].largestConnected < (sorted[1]?.largestConnected ?? 0)) return '🥉';
    return null;
  };

  // Bei 8 Teams: space-between, damit alle Zeilen in die Grid-Höhe passen.
  // Bei ≤6 Teams: mittig zentriert wie eine Rangliste, mit festem Row-Gap
  // statt auseinandergezogen — wirkt sonst wie fehlende Daten.
  const many = sorted.length >= 7;
  const rowGap = dense ? 18 : 26;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: many ? 'space-between' : 'center',
      gap: many ? 0 : rowGap,
      // 2026-05-05 (Wolf): maxWidth 560→640 — ScoreBar darf jetzt den
      // groesseren Container ausfuellen (Wrapper ist 620px).
      width: '100%', maxWidth: 640, height: '100%',
      paddingTop: dense ? 4 : 8, paddingBottom: dense ? 4 : 8,
    }}>
      {sorted.map((t, i) => {
        const isLeader = i === 0 && t.largestConnected > 0;
        const isActive = t.id === activeTeamId;
        const medal = medalFor(i, t.largestConnected);
        // 2026-05-05 (Wolf 'team color = team id'): t.color ist seit dem
        // Backend-Fix automatisch die Brett-Palette-Farbe → identisch zu
        // qqGetBoardColor. tColor-Local-Var bleibt fuer Klarheit.
        const tColor = t.color;
        return (
        <div
          key={t.id}
          ref={el => { rowRefs.current[t.id] = el; }}
          style={{
          display: 'flex', alignItems: 'center', gap: dense ? 14 : 18,
          animation: poppedIds.has(t.id) ? 'scorePop 0.5s ease both' : undefined,
          opacity: activeTeamId && !isActive ? 0.42 : 1,
          // 2026-05-05 (Wolf-Bug 'tabelle neben grid veraendert hoehe beim
          // setzen'): Padding/Border IMMER reservieren — vorher Padding 0 bei
          // inaktiv, 6-14px bei aktiv → Zeile wuchs/schrumpfte → Stack mit
          // justify-content:center verschob sich sichtbar. Jetzt: Box bleibt
          // konstant, nur Farben/Glow flippen beim Active-Wechsel.
          padding: dense ? '6px 10px' : '8px 14px',
          borderRadius: 16,
          background: isActive ? `linear-gradient(135deg, ${tColor}22, ${tColor}08)` : 'transparent',
          border: isActive ? `2px solid ${tColor}` : '2px solid transparent',
          boxShadow: isActive ? `0 0 28px ${tColor}55, 0 0 60px ${tColor}22, inset 0 0 12px ${tColor}18` : 'none',
          // transition: nur opacity/background/box-shadow/border-color — die
          // transform-transition wird im FLIP-Hook on-the-fly gesetzt.
          transition: 'opacity 0.3s ease, background 0.3s ease, box-shadow 0.4s ease, border-color 0.3s ease',
          position: 'relative', overflow: 'visible',
          willChange: 'transform',
        }}>
          {/* Hot-Seat-Spotlight wurde entfernt (Wolfs Wunsch) — der Box-Ring
              + Border am Container reichen als visueller Anker für das aktive
              Team. Animationen `hotSeatFlicker` / `hotSeatGlitter` bleiben in
              der CSS, falls später wieder gewünscht. */}
          <div style={{ width: avatarBox, textAlign: 'center', flexShrink: 0 }}>
            <span style={{
              position: 'relative', display: 'inline-block',
              // B2 Impact-Pulse: wenn Team gerade Joker verdient hat, Avatar pulsiert 1x
              animation: jokerEarners.has(t.id)
                ? 'jokerImpactPulse 0.7s var(--qq-ease-bounce) 0.85s both'
                : undefined,
              borderRadius: '50%',
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avatarSize} />
              {isLeader && (
                <span style={{
                  position: 'absolute',
                  top: dense ? -12 : -16,
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-14deg)',
                  fontSize: dense ? 24 : 30,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}>👑</span>
              )}
              {/* 2026-05-05 (Wolf-Bug): Joker-Slots waren als absolute Overlay
                  am Avatar (bottom-right). Verdeckten den Avatar + waren zu klein
                  zu erkennen. Jetzt ausgelagert in eine eigene Tabellen-Spalte
                  rechts neben den Felder-Werten — siehe weiter unten in dieser Row. */}
              {/* B2 Stern-Flug: fliegt von oben rein auf Avatar wenn gerade verdient */}
              {jokerEarners.has(t.id) && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0, left: '50%',
                    transform: 'translate(-50%, -30px)',
                    lineHeight: 1,
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 12px rgba(236,72,153,0.9)) drop-shadow(0 0 24px rgba(236,72,153,0.5))',
                    ['--jk-dx' as string]: '0px',
                    ['--jk-dy' as string]: '40px',
                    animation: 'jokerStarFly 0.9s cubic-bezier(0.34,1.5,0.64,1) both',
                    zIndex: 10,
                  }}
                ><JokerIcon i={i} size={dense ? 38 : 48} eurovisionMode={eurovisionMode}/></span>
              )}
              {/* C2 Streak: Feuer-Emoji links oben ab 3 richtigen in Folge. */}
              {(streaks[t.id] ?? 0) >= 3 && (
                <span aria-hidden style={{
                  position: 'absolute',
                  top: dense ? -10 : -14,
                  left: dense ? -6 : -8,
                  fontSize: dense ? 22 : 28,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 8px rgba(251,146,60,0.9)) drop-shadow(0 0 14px rgba(239,68,68,0.5))',
                  animation: 'streakFlameWobble 0.7s ease-in-out infinite',
                  zIndex: 9,
                }} title={`${streaks[t.id]}x in Folge`}><QQEmojiIcon emoji="🔥"/></span>
              )}
              {/* F2 Rank-Change-Pfeile entfernt 2026-04-28 (User-Wunsch:
                  "die kleinen pfeile sind weird"). Der Swap selber
                  läuft jetzt smooth via FLIP-Animation auf der Row (siehe
                  useLayoutEffect rowRefs unten) — das vermittelt die
                  Rang-Änderung visuell ohne extra Indikator. */}
              {false && rankChanges[t.id] && (
                <span aria-hidden style={{
                  position: 'absolute',
                  top: '50%',
                  right: dense ? -18 : -22,
                  transform: 'translateY(-50%)',
                  fontSize: dense ? 18 : 22, fontWeight: 900,
                  color: rankChanges[t.id] === 'up' ? '#22C55E' : '#EF4444',
                  pointerEvents: 'none',
                  filter: `drop-shadow(0 0 6px ${rankChanges[t.id] === 'up' ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.7)'})`,
                  animation: 'voterSlotDrop 1.2s var(--qq-ease-bounce) both',
                  zIndex: 9,
                }}>{rankChanges[t.id] === 'up' ? '▲' : '▼'}</span>
              )}
            </span>
          </div>
          {/* Name. 2026-05-05 (Wolf): Action-Pill ('Setzen/Klauen/Stapeln')
              entfernt — aus 8m Beamer-Distanz unlesbar. Active-Team-Glow +
              Border in der Container-Box reicht als Indikator. */}
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            <TeamNameLabel
              name={t.name}
              maxLines={2}
              shrinkAfter={14}
              fontSize={nameFs}
              color={tColor}
              fontWeight={900}
              style={{ textShadow: isActive ? `0 0 16px ${tColor}55` : 'none' }}
            />
          </div>
          {/* Wert — prominent rechts mit Medaille für Top 3 */}
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'baseline', gap: 10,
            flexShrink: 0,
          }}>
            {/* Medal-Slot mit fixer Breite — ohne Medaille trotzdem Platzhalter,
                damit die Zahlen-Spalte rechts fuer ALLE Teams gleich ausgerichtet ist. */}
            <span style={{
              width: dense ? 32 : 38,
              flexShrink: 0,
              textAlign: 'center',
              fontSize: dense ? 22 : 28, lineHeight: 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{medal ? <QQEmojiIcon emoji={medal}/> : null}</span>
            <span style={{
              fontSize: valFs, color: isLeader ? '#EC4899' : '#F1F5F9', fontWeight: 900,
              textShadow: isLeader ? '0 0 18px rgba(236,72,153,0.55)' : 'none',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              // Zahlen-Spalte breit genug fuer 2-stellige Werte (10+) — vorher
              // floss die '0' optisch ins Wort 'Felder' rein, weil die Spalte
              // (38/48px) bei zweistelliger Zahl ueberlief und der Text in den
              // Folge-Slot reinragte. Jetzt 56/72 → beide Stellen passen rein,
              // gap auf 10 sichert weiter Abstand zum Wort.
              width: dense ? 56 : 72,
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {t.largestConnected}
            </span>
            {/* Unit-Slot mit fester Breite → „Feld" (Singular) und „Felder" (Plural)
                starten beide an derselben linken Kante. Ohne das wackelt die
                Zahlen-Spalte rechts bei 1 Feld vs. 6 Felder. */}
            <span style={{
              opacity: 0.5, fontSize: unitFs, fontWeight: 700, color: '#94a3b8',
              flexShrink: 0,
              minWidth: dense ? 62 : 78,
              textAlign: 'left',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {lang === 'en'
                ? (t.largestConnected === 1 ? 'cell' : 'cells')
                : (t.largestConnected === 1 ? 'Feld' : 'Felder')}
            </span>
            {/* Float +N — knapp über der Zahl */}
            {floaters.filter(f => f.teamId === t.id).map(f => (
              <div key={f.id} style={{
                position: 'absolute', right: 0, top: -28,
                fontWeight: 900, fontSize: dense ? 22 : 28, color: tColor,
                animation: 'scoreFloat 1.0s ease-out both',
                pointerEvents: 'none',
                textShadow: `0 0 10px ${tColor}88`,
              }}>+{f.diff}</div>
            ))}
          </div>
          {/* Joker-Spalte — 2026-05-05 (Wolf 'die 2 Joker als Spalte statt
              auf dem Avatar'). Pro Team 2 Slots: verfuegbare leuchten gold,
              verbrauchte sind grayscale + opacity 0.32. Komplett verbraucht
              → keine Spalte mehr (saved space). */}
          {/* Joker-Spalte komplett entfernt 2026-05-05 (Wolf-Wahl 2E):
              statische Joker-Anzeige in der Tabelle wirkte aus Beamer-Distanz
              klein/unklar. Joker werden jetzt NUR noch als Burst-Animation
              sichtbar wenn verdient (jokerStarFly fliegt auf den Avatar) —
              siehe weiter unten in dieser Row. Tabelle bleibt aufgeraeumt. */}
        </div>
        );
      })}
    </div>
  );
}
