/**
 * CozyQuizScoreBar — Standings-Liste pro Team mit Score + Rank-Tracking.
 *
 * Sortiert nach largestConnected (Quartier-Groesse). Score-Aenderungen feuern
 * Pop-Floater („+1"-Bubble), Rank-Aenderungen feuern FLIP-Reorder-Animation
 * (smooth row-swap statt Snap).
 *
 * 2026-06-28 (Claude-Design-Handoff #2): Joker komplett aus dem Scoreboard
 * raus (Stern-Flug + Impact-Pulse). „Der Joker ist ein Grid-Moment, kein
 * Scoreboard-Stat" — die Tabelle zeigt nur Rang + Team + Punkte. Joker bekommt
 * seinen Jackpot-Moment jetzt im Grid (CozyQuizGridDisplay).
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 2).
 * 2+ interne Caller (PlacementView, ggf. ConnectionsBeamerView).
 */
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { compareTeamsForRanking } from '../utils/qqTeamRanking';
import { QQEmojiIcon, QQIcon, type QQIconSlug } from './QQIcon';
import { QQTeamAvatar } from './QQTeamAvatar';
import { cozy3dCrownTopPx } from '../cozy3dAvatars';
import { TeamNameLabel } from './TeamNameLabel';
import { QQ_COLORS } from '../../../shared/qqColors';
import { isThemed } from '../qqTheme';

export function ScoreBar({ teams, activeTeamId, teamPhaseStats, correctTeamId, activeActionLabel, activeActionDesc, activeActionSlug, eurovisionMode, lang }: {
  teams: QQStateUpdate['teams'];
  activeTeamId?: string | null;
  teamPhaseStats?: QQStateUpdate['teamPhaseStats'];
  correctTeamId?: string | null;
  activeActionLabel?: string;
  activeActionDesc?: string;
  /** 2026-06-28 (Wolf): Aktions-Icon (place/steal/stack) am aktiven Team —
      distanz-lesbar als Icon statt des frueher entfernten Text-Verbs. */
  activeActionSlug?: QQIconSlug | null;
  /** 2026-05-07 (Wolf-ESC): wenn true, Joker-Pile nutzt EU-Star-Variante. */
  eurovisionMode?: boolean;
  /** 2026-05-23 (Live-Test #J): Lang fuer Feld/cell-Unit-Label. Default 'de'. */
  lang?: 'de' | 'en';
}) {
  const sorted = [...teams].sort((a, b) => b.largestConnected - a.largestConnected);
  // 2026-05-24 (Wolf-Live-Test #6): Tie-Detection pro Team. Wenn 2+ Teams
  // dieselbe largestConnected haben, bekommen sie ein „="-Badge an der
  // Rang-Position, damit der visuelle Gleichstand klar ist (statt Nr.1/Nr.2
  // wirkt's „1. = 2. ist eigentlich gleichauf").
  const tiedWithOther = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < sorted.length; j++) {
      if (i !== j && sorted[i].largestConnected === sorted[j].largestConnected) {
        tiedWithOther.add(sorted[i].id);
      }
    }
  }
  const prevScores = useRef<Record<string, number>>({});
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

  // Bei vielen Teams (≥6) kompakter, sonst passen 8 Zeilen nicht nebeneinander.
  // Balken ist raus — Info steckt in der Zahl. Dafür Name + Wert deutlich größer.
  // 2026-07-04 (Wolf 'Tabellen zu klein fuer Beamer/TV'): Namen/Werte hoch.
  // ≤5 Teams (Normalfall, Wolf spielt max 3-4) grosszuegig; 6-8 moderat, damit
  // die Zeilen weiter in die feste Grid-Hoehe passen (kein Overflow).
  const dense = sorted.length >= 6;
  const avatarSize = dense ? 68 : 92;
  const avatarBox = dense ? 82 : 108;
  const nameFs = dense ? 37 : 52;
  const valFs = dense ? 46 : 66;
  const unitFs = dense ? 19 : 26;

  // Medaillen-Style für Top 3 (nur wenn Wert > 0 und eindeutig).
  // 2026-05-24 (Wolf-Feedback): Bei Tie an der Spitze bekommen ALLE
  // gleichauf-Teams 👑 Krönchen statt einer 🥇 + andere ohne. Vermeidet die
  // Hierarchie-Illusion "1.+2." bei reinem Gleichstand. Tied-Plätze unter
  // dem ersten Platz behalten ihre Medaille (→ #2-Tie bleibt 🥈+🥈).
  const topScore = sorted.length > 0 ? sorted[0].largestConnected : 0;
  const isTieAtTop = sorted.length > 1
    && sorted[0].largestConnected > 0
    && sorted[1].largestConnected === sorted[0].largestConnected;
  const medalFor = (i: number, val: number, teamId: string): string | null => {
    if (val === 0) return null;
    if (isTieAtTop && val === topScore) return '👑';
    if (i === 0) return '🥇';
    if (i === 1 && sorted[1].largestConnected < sorted[0].largestConnected) return '🥈';
    if (i === 2 && sorted[2].largestConnected < (sorted[1]?.largestConnected ?? 0)) return '🥉';
    // Tied-Plätze auf 2. oder 3. → gleiche Medaille wie ihr Tied-Partner.
    if (tiedWithOther.has(teamId)) {
      if (val === sorted[1]?.largestConnected) return '🥈';
      if (val === sorted[2]?.largestConnected) return '🥉';
    }
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
      width: '100%', maxWidth: 720, height: '100%',
      paddingTop: dense ? 4 : 8, paddingBottom: dense ? 4 : 8,
    }}>
      {sorted.map((t, i) => {
        // 2026-05-25 (Wolf 'krone rechts haben alle gleichplatzierten 1.,
        // aber auf dem avatar nur der erste — konsistent waere wenn alle'):
        // isLeader greift jetzt auch fuer alle Tied-Top-Teams (vorher nur
        // i === 0 → erster im sorted-Array). Medal-Spalte (medalFor) gibt
        // bereits seit dem Tie-Fix '👑' an alle Top-Tied → Avatar-Crown
        // jetzt analog.
        const isTopTie = isTieAtTop && t.largestConnected === topScore;
        const isLeader = (i === 0 && t.largestConnected > 0) || isTopTie;
        const isActive = t.id === activeTeamId;
        const medal = medalFor(i, t.largestConnected, t.id);
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
          borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
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
              borderRadius: '50%',
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avatarSize} />
              {isLeader && (
                <span style={{
                  position: 'absolute',
                  // 2026-06-24 (Wolf 'Krone naeher am Kopf'): Offset reduziert
                  // (-16/-12 -> -8/-6) damit die Kronenbasis auf der Disc-Oberkante
                  // = auf dem Kopf sitzt statt darueber zu schweben.
                  // 2026-06-28 (Wolf 'Krone sitzt bei einigen Tieren nicht auf
                  // dem Kopf'): statt fix jetzt pro-Avatar berechnet — die
                  // gemessene Kopf-Oberkante (cozy3dCrownTopPx) verschiebt die
                  // Krone bei tief sitzenden Koepfen (Krabbe, Delfin, Wal, Orca,
                  // Fledermaus …) entsprechend runter. Front-Portraits bleiben
                  // praktisch unveraendert (frac 0 → ~-8/-6).
                  top: cozy3dCrownTopPx(t.emoji, avatarSize),
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-14deg)',
                  fontSize: dense ? 24 : 30,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}><QQEmojiIcon emoji="👑" size="1em" /></span>
              )}
              {/* Joker komplett aus der ScoreBar raus (2026-06-28, Claude-Design-
                  Handoff #2): kein Stern-Flug, kein Impact-Pulse, keine statische
                  Spalte. „Der Joker ist ein Grid-Moment, kein Scoreboard-Stat" —
                  der Joker-Jackpot lebt jetzt im Grid (CozyQuizGridDisplay). */}
              {/* 2026-06-28 (Wolf): Aktions-Icon am aktiven Team (place/steal/stack).
                  Distanz-lesbares Icon statt des frueher (2026-05-05) entfernten
                  Text-Verbs. Sitzt bottom-right am Avatar, mit Pop-In. */}
              {isActive && activeActionSlug && (
                <span aria-hidden style={{
                  position: 'absolute',
                  bottom: dense ? -8 : -10,
                  right: dense ? -10 : -14,
                  width: dense ? 34 : 44,
                  height: dense ? 34 : 44,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))',
                  animation: 'phasePop 0.45s var(--qq-ease-bounce) both',
                  zIndex: 11,
                }}>
                  <QQIcon slug={activeActionSlug} size={dense ? 34 : 44} />
                </span>
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
                  color: rankChanges[t.id] === 'up' ? QQ_COLORS.green500 : QQ_COLORS.red500,
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
                damit die Zahlen-Spalte rechts fuer ALLE Teams gleich ausgerichtet ist.
                2026-05-25 (Wolf 'ich sehe immernoch ein = in der grid tabelle'):
                '='-Tie-Badge entfernt. Tied-Top-Teams bekommen 👑 (medalFor),
                der Rest hat keinen extra Marker mehr. */}
            <span style={{
              width: dense ? 32 : 38,
              flexShrink: 0,
              textAlign: 'center',
              fontSize: dense ? 22 : 28, lineHeight: 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {medal ? <QQEmojiIcon emoji={medal}/> : null}
            </span>
            <span style={{
              // 2026-06-24 (Skin): Leader-Wert in Akzent (pop), Rest in Primaertext.
              // War brandPink/slate100 → auf hellen Skins washed bzw. unsichtbar.
              fontSize: valFs, color: isLeader ? (isThemed() ? 'var(--qq-accent)' : QQ_COLORS.brandPink) : (isThemed() ? 'var(--qq-text)' : QQ_COLORS.slate100), fontWeight: 900,
              textShadow: isLeader ? (isThemed() ? 'none' : '0 0 18px rgba(236,72,153,0.55)') : 'none',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              // Zahlen-Spalte breit genug fuer 2-stellige Werte (10+) — vorher
              // floss die '0' optisch ins Wort 'Felder' rein, weil die Spalte
              // (38/48px) bei zweistelliger Zahl ueberlief und der Text in den
              // Folge-Slot reinragte. Jetzt 56/72 → beide Stellen passen rein,
              // gap auf 10 sichert weiter Abstand zum Wort.
              width: dense ? 62 : 90,
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {t.largestConnected}
            </span>
            {/* Unit-Slot mit fester Breite → „Feld" (Singular) und „Felder" (Plural)
                starten beide an derselben linken Kante. Ohne das wackelt die
                Zahlen-Spalte rechts bei 1 Feld vs. 6 Felder. */}
            <span style={{
              opacity: 0.5, fontSize: unitFs, fontWeight: 700, color: isThemed() ? 'var(--qq-text-muted)' : QQ_COLORS.slate400,
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
        </div>
        );
      })}
    </div>
  );
}
