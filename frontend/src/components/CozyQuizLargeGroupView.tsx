// ── CozyQuizLargeGroupView — Groß-Gruppen-Modus Beamer (Akt 2 + Akt 3) ───────
// Teil des largeGroupMode (bis 25 Teams, Bar-Race statt Grid). Doku:
// memory project_large_group_mode. Die 3 Akte des Groß-Gruppen-Loops:
//   Akt 1 = QUESTION_ACTIVE → bestehende QuestionView (unverändert wiederverwendet)
//   Akt 2 = QUESTION_REVEAL  → ebenfalls die normale QuestionView (LargeGroupRevealView
//            wurde 2026-07-02 entfernt, 2026-07-08 der tote Code endgültig gelöscht)
//   Akt 3 = PLACEMENT        → LargeGroupStandingsView (hier): Bar-Race-Gesamtwertung
//
// Punkte-Modell (spiegelt Backend qqLargeGroupAwardPoints): jede Richtige +1,
// Top-5-schnellste zusätzlich +5/4/3/2/1. Reihenfolge aus currentQuestionWinners
// (fastest zuerst). Score-Feld = largestConnected (= Punkte im Groß-Modus).

import { useMemo, useRef, useLayoutEffect, useState, useEffect } from 'react';
import type { QQStateUpdate, QQTeam, QQMegaRankEntry, QQMegaAwards } from '../../../shared/quarterQuizTypes';
import { QQ_AVATARS, qqMegaFactionName, qqMegaFactionSlug, qqMegaFactionMotto } from '../../../shared/quarterQuizTypes';
import { playArenaLeadChange } from '../utils/sounds';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon, QQIcon } from './QQIcon';
import { qqSortedTeams, qqSortedGroups } from '../qqShared';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';

const MEDALS = ['🥇', '🥈', '🥉'];
const STANDINGS_ROW_H = 88;
const STANDINGS_MAX = 10;

const KEYFRAMES = `
@keyframes brPodIn { from { opacity: 0; transform: translateY(18px) scale(0.95); } to { opacity: 1; transform: none; } }
@keyframes brAlsoIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes brRankIn { from { opacity: 0; transform: translateX(-26px); } to { opacity: 1; transform: none; } }
@keyframes brPtsPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
@keyframes brFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes brBarGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
/* 2026-07-12 (Wolf 'episches Event-Rennen'): Renn-Dynamik. */
@keyframes qqCometPulse { 0%,100% { transform: translate(50%,-50%) scale(1); opacity: 1; } 50% { transform: translate(50%,-50%) scale(1.4); opacity: 0.82; } }
@keyframes qqCrownBounce { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-6px) rotate(5deg); } }
@keyframes qqLeaderGlow { 0%,100% { box-shadow: inset 0 0 0 1.5px var(--lc, #fff), 0 0 24px -6px var(--lc, #fff); } 50% { box-shadow: inset 0 0 0 2px var(--lc, #fff), 0 0 44px 2px var(--lc, #fff); } }
@keyframes qqRowIn { from { opacity: 0; transform: translateX(-34px); } to { opacity: 1; transform: none; } }
@keyframes qqValuePop { 0% { transform: scale(1); } 40% { transform: scale(1.22); } 100% { transform: scale(1); } }
`;

// Zahl weich hochzählen (Renn-Drama). performance.now ist im Browser ok.
function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// Farbe/Label je avatarId (= Farb-Slot) aus dem kanonischen Avatar-Set.
interface AvaMeta { label: string; labelEn: string; color: string }
const AVA_BY_ID = new Map<string, AvaMeta>(
  QQ_AVATARS.map(a => [a.id, { label: a.label, labelEn: a.labelEn, color: a.color }] as [string, AvaMeta]),
);

// ── Akt 3: per-Frage-Wertung (Beat A) → Bar-Race-Gesamtwertung (Beat B) ───────
export function LargeGroupStandingsView({ state }: { state: QQStateUpdate }) {
  const de = state.language !== 'en';
  const ranking = state.megaQuestionRanking ?? [];
  const hasRanking = !!state.nestedTeams && ranking.length > 0;

  // 2-Beat-Reveal: zuerst „Wertung dieser Frage" (transparent, wer wie viele
  // Handys richtig hatte → Punkte), dann der Gesamtstand.
  // 2026-07-12 (Mod-Pacing): NICHT mehr per 4,2s-Auto-Timer, sondern vom
  // Moderator gesteuert (Backend-Flag megaStandingsRevealed). Erster Weiter im
  // PLACEMENT flippt das Flag → Standings; zweiter schaltet zur Frage. Gibt dem
  // Solo-Host Redezeit. Ohne Ranking (hasRanking=false) direkt Gesamtstand.
  const beat: 'question' | 'standings' = hasRanking && !state.megaStandingsRevealed ? 'question' : 'standings';

  if (beat === 'question' && hasRanking) {
    return <MegaQuestionRanking state={state} ranking={ranking} de={de} />;
  }
  return <CumulativeStandings state={state} de={de} />;
}

// ── Beat A: Punkte-Verteilung dieser Frage (Modell B, niedrigschwellig) ───────
function MegaQuestionRanking({ state, ranking, de }: { state: QQStateUpdate; ranking: QQMegaRankEntry[]; de: boolean }) {
  const rows = useMemo(() => [...ranking].sort((a, b) => a.rank - b.rank), [ranking]);
  return (
    <div style={S.qrWrap}>
      <style>{KEYFRAMES}</style>
      <div style={S.qrLabel}>{de ? 'Wertung dieser Frage' : 'This question’s scoring'}</div>
      <div style={S.qrList}>
        {rows.map((r, i) => {
          const ava = AVA_BY_ID.get(r.avatarId);
          const color = ava?.color ?? '#EC4899';
          const name = qqMegaFactionName(r.avatarId, de ? 'de' : 'en');
          const medal = i < 3 && r.points > 0 ? MEDALS[i] : null;
          const scored = r.points > 0;
          return (
            <div key={r.avatarId} style={{ ...S.qrRow, animation: 'brRankIn 0.5s ease both', animationDelay: `${i * 0.32}s`, opacity: scored ? 1 : 0.5 }}>
              <span style={S.qrRank}>{medal ? <QQEmojiIcon emoji={medal} /> : i + 1}</span>
              <QQTeamAvatar avatarId={r.avatarId as QQTeam['avatarId']} teamEmoji={qqMegaFactionSlug(r.avatarId)} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <Dots correct={r.correct} total={r.total} color={color} de={de} avgSec={r.avgSec ?? null} baseDelay={i * 0.32} />
              </div>
              <span style={{
                ...S.qrPts, color: scored ? color : 'rgba(255,255,255,0.4)',
                animation: scored ? 'brPtsPop 0.5s ease both' : undefined, animationDelay: `${i * 0.32 + 0.25}s`,
              }}>
                {scored ? `+${r.points}` : '±0'}
              </span>
            </div>
          );
        })}
      </div>
      <div style={S.qrFoot}>{de ? '⚡ Je mehr eurer Handys richtig liegen, desto mehr Punkte (bis 100 pro Frage).' : '⚡ The more of your phones are right, the more points (up to 100 per question).'}</div>
    </div>
  );
}

// Punkte-Dots: gefüllt = richtige Sub-Teams, hohl = Rest. Bei >5 nur Zahl.
// 2026-07-12: dahinter dezent die Ø-Antwortzeit der richtigen Handys — macht
// den Speed-Tiebreak transparent (warum +6 vs +1 bei gleicher Trefferquote).
function Dots({ correct, total, color, de, avgSec, baseDelay = 0 }: { correct: number; total: number; color: string; de: boolean; avgSec?: number | null; baseDelay?: number }) {
  const showDots = total > 0 && total <= 5;
  const timeStr = (avgSec != null && correct > 0)
    ? (de ? `${avgSec.toFixed(1).replace('.', ',')}s` : `${avgSec.toFixed(1)}s`)
    : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      {showDots && (
        <span style={{ display: 'inline-flex', gap: 5 }}>
          {Array.from({ length: total }, (_, i) => {
            const filled = i < correct;
            return (
              <span key={i} style={{
                width: 15, height: 15, borderRadius: '50%',
                background: filled ? color : 'transparent',
                border: `2px solid ${filled ? color : 'rgba(255,255,255,0.28)'}`,
                boxShadow: filled ? `0 0 8px ${color}88` : 'none',
                // Gefuellte Dots rasten gestaffelt ein (reduced-motion:
                // animation:none → sofort sichtbar). Hohle Dots bleiben ruhig.
                animation: filled ? `qqDotFill 0.4s var(--qq-ease-bounce) ${(baseDelay + 0.3 + i * 0.09).toFixed(2)}s both` : undefined,
              }} />
            );
          })}
        </span>
      )}
      <span style={{ fontSize: 17, fontWeight: 800, opacity: 0.7 }}>
        {correct}/{total} {de ? 'Handys richtig' : 'phones correct'}
      </span>
      {timeStr && (
        <span style={{ fontSize: 16, fontWeight: 800, opacity: 0.6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden style={{ opacity: 0.7 }}>·</span>
          <span aria-hidden>⚡</span>{de ? `Ø ${timeStr}` : `avg ${timeStr}`}
        </span>
      )}
    </div>
  );
}

// Modul-Snapshot der letzten Rang-Verteilung. Ueberlebt den Per-Frage-Remount
// (Beamer keyed die Standings pro questionIndex → jede StandingsRow startet
// frisch, prevTop.current waere immer null → FLIP + Lead-Flash feuerten NIE,
// Wolf sah keinen Positionswechsel). Der Snapshot seedet die neue Mount-Instanz
// mit dem VORHERIGEN Rang → der FLIP animiert genau den Ueberhol-Sprung dieser
// Frage. Modul-global ist ok: nur EIN Beamer/Standings gleichzeitig.
let qqPrevStandRanks: Map<string, number> | null = null;

// ── Beat B: Bar-Race-Gesamtwertung ───────────────────────────────────────────
function CumulativeStandings({ state, de }: { state: QQStateUpdate; de: boolean }) {
  // Genestet (Idee 2): 8 Eltern-Team-Balken (nach avatarId gruppiert, Punkte
  // summiert) statt bis zu 24 Sub-Team-Balken. Sonst: reale Teams.
  const sorted = state.nestedTeams ? qqSortedGroups(state) : qqSortedTeams(state);
  const shown = sorted.slice(0, STANDINGS_MAX);
  const rest = sorted.length - shown.length;
  const maxVal = Math.max(1, ...shown.map(t => t.largestConnected));

  // 2026-07-08 (Audit B2): responsive Zeilenhoehe. Bei 9-10 Fraktionen wuerde die
  // feste 88px-Hoehe (10*88=880 + Label/Rest ≈ 964px) den zentrierten Block ueber
  // den 16:9-Rahmen schieben → oberste Kronen-Zeile + unterste Zeilen verschwinden.
  // rowH schrumpft ab ~9 Zeilen, so bleibt alles im Viewport (≤8 bleibt bei 88).
  const rowH = Math.min(STANDINGS_ROW_H, Math.floor(780 / Math.max(1, shown.length)));

  // Rang pro Team-ID (für FLIP-artige Reorder-Animation via translateY).
  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    shown.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [shown.map(t => t.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modell B: per-Frage-Ergebnis pro Farbe (avatarId) → +Punkte + ✓-Zahl an der Row.
  const qByAvatar = useMemo(() => {
    const m = new Map<string, QQMegaRankEntry>();
    for (const r of (state.megaQuestionRanking ?? [])) m.set(r.avatarId, r);
    return m;
  }, [state.megaQuestionRanking]);

  // Vorherige Rang-Verteilung LESEN, bevor der Snapshot ueberschrieben wird —
  // die frisch gemountete StandingsRow bekommt so ihren Alt-Rang zum Animieren.
  const prevRanksSnapshot = qqPrevStandRanks;
  useEffect(() => { qqPrevStandRanks = new Map(rankOf); }, [rankOf]);

  return (
    <div style={{ ...S.standWrap, animation: 'brFadeIn 0.5s ease both' }}>
      <style>{KEYFRAMES}</style>
      <div style={S.standLabel}>{de ? 'Gesamtwertung' : 'Standings'}</div>
      <div style={{ position: 'relative', height: shown.length * rowH, width: '100%', maxWidth: 1100 }}>
        {shown.map(t => (
          <StandingsRow key={t.id} team={t} rank={rankOf.get(t.id) ?? 0} seedRank={prevRanksSnapshot?.get(t.id)} maxVal={maxVal} de={de} qEntry={qByAvatar.get(t.avatarId)} rowH={rowH} />
        ))}
      </div>
      {rest > 0 && (
        <div style={S.standRest}>+ {rest} {de ? 'weitere Fraktionen' : 'more factions'}</div>
      )}
    </div>
  );
}

function StandingsRow({ team, rank, seedRank, maxVal, de, qEntry, rowH }: { team: QQTeam; rank: number; seedRank?: number; maxVal: number; de: boolean; qEntry?: QQMegaRankEntry; rowH: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // prevTop mit dem Vorrunden-Rang seeden (via seedRank aus qqPrevStandRanks) —
  // sonst waere er nach dem Per-Frage-Remount immer null und der FLIP feuerte
  // nie. So gleitet die Zeile von ihrer alten auf die neue Position.
  const prevTop = useRef<number | null>(seedRank != null ? seedRank * rowH : null);
  const targetTop = rank * rowH;
  const val = team.largestConnected;
  const isLeader = rank === 0 && val > 0;
  // Der Leader-Spotlight-Scale muss in die FLIP-Transform gefaltet werden:
  // sonst ueberschreibt das imperativ gesetzte translateY() das scale(1.035)
  // genau auf der Zeile, die gerade an die Spitze zieht — der Ueberhol-Moment
  // (neuer Fuehrender wird groesser) verpuffte, weil transform nur EINEN Wert
  // haelt und der letzte Schreiber (JS-FLIP) gewinnt.
  const leaderScale = isLeader ? ' scale(1.035)' : '';
  // FLIP: sanftes Gleiten bei Rang-Wechsel (Überholmoment).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prevTop.current != null && prevTop.current !== targetTop) {
      const dy = prevTop.current - targetTop;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)${leaderScale}`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'transform 0.7s cubic-bezier(0.34,1.05,0.5,1)';
        el.style.transform = `translateY(0)${leaderScale}`;
      }));
    }
    prevTop.current = targetTop;
  }, [targetTop, leaderScale]);

  const pct = (val / maxVal) * 100;
  const medal = rank < 3 && val > 0 ? MEDALS[rank] : null;
  const displayVal = useCountUp(val); // Zahl zählt beim Standings-Reveal hoch
  const valPopKey = `${val}`; // Re-Pop bei Wert-Änderung

  // Führungswechsel-Blitz (Wolf-Idee „Bar-Race Führungswechsel = Glow-Blitz"):
  // wenn eine Fraktion von Rang >0 auf Rang 0 (Krone) springt, kurz aufleuchten.
  // Kein Flash beim ersten Mount (prevRank null) → nur echte Overtakes.
  // Auch mit dem Vorrunden-Rang seeden → der ⚔️-Fuehrungswechsel-Blitz feuert
  // jetzt beim echten Ueberholen (vorher nie, weil prevRank nach Remount null war).
  const prevRank = useRef<number | null>(seedRank ?? null);
  const [leadFlash, setLeadFlash] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (prevRank.current != null && prevRank.current > 0 && rank === 0 && val > 0) {
      setLeadFlash(true);
      // Ueberhol-Cue (ersetzbarer Slot 'arenaLeadChange', Fallback = scoreUp).
      // Nur die eine Row die auf Rang 0 springt feuert → kein Doppel-Sound.
      try { playArenaLeadChange(); } catch {}
      t = setTimeout(() => setLeadFlash(false), 1200);
    }
    prevRank.current = rank;
    return () => { if (t) clearTimeout(t); };
  }, [rank, val]);

  return (
    <div ref={ref} style={{
      ...S.standRow, height: rowH - 12, top: targetTop,
      // Leader-Spotlight: leicht größer, hellerer Grund + atmender Farb-Glow.
      ...(isLeader ? {
        transform: 'scale(1.035)', zIndex: 3,
        background: `linear-gradient(90deg, ${team.color}22, rgba(255,255,255,0.06))`,
        // CSS-Var für den Glow-Keyframe.
        ['--lc' as any]: team.color,
        animation: 'qqLeaderGlow 2.4s ease-in-out infinite',
      } : {}),
    }}>
      {leadFlash && (
        <>
          <span aria-hidden style={{
            position: 'absolute', inset: '-4px -8px', borderRadius: 18,
            boxShadow: `0 0 26px 6px ${team.color}, inset 0 0 20px ${team.color}88`,
            pointerEvents: 'none', animation: 'qqLeadFlash 1.2s ease-out both',
          }} />
          <span aria-hidden style={{
            position: 'absolute', left: -6, top: -14, zIndex: 4,
            fontSize: 22, fontWeight: 900, letterSpacing: '0.02em',
            color: team.color, whiteSpace: 'nowrap',
            textShadow: `0 2px 10px ${team.color}, 0 0 4px rgba(0,0,0,0.6)`,
            pointerEvents: 'none', animation: 'qqLeadCallout 1.2s ease-out both',
          }}>⚔️ {de ? 'Führung!' : 'Lead!'}</span>
        </>
      )}
      <span style={S.standRank}>{isLeader
        ? <span style={{ display: 'inline-flex', animation: 'qqCrownBounce 1.6s ease-in-out infinite', filter: `drop-shadow(0 3px 8px ${team.color}aa)` }}><QQEmojiIcon emoji="👑" /></span>
        : rank + 1}</span>
      <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={62} />
      <div style={{ width: 260, minWidth: 0 }}>
        <TeamNameLabel name={team.name} fontSize={30} color={team.color} fontWeight={900} maxLines={1} shrinkAfter={16} />
        {/* Modell B: was diese Farbe DIESE Frage geholt hat — +Punkte + ✓-Zahl. */}
        {qEntry && (
          <div style={{ marginTop: 2, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ color: qEntry.points > 0 ? team.color : 'rgba(255,255,255,0.35)' }}>
              {qEntry.points > 0 ? `+${qEntry.points}` : '±0'}
            </span>
            <span style={{ opacity: 0.55, fontSize: 15 }}>{qEntry.correct}/{qEntry.total} {de ? 'richtig' : 'correct'}</span>
          </div>
        )}
      </div>
      <div style={{
        ...S.standBarTrack,
        // Renn-Lane-Optik: dezente „Finish-Line"-Ticks im Track.
        backgroundImage: 'repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), rgba(255,255,255,0.05) calc(10% - 1px), rgba(255,255,255,0.05) 10%)',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
          background: `linear-gradient(90deg, ${team.color}cc, ${team.color})`,
          borderRadius: 999,
          boxShadow: `0 0 18px ${team.color}88, inset 0 1px 0 rgba(255,255,255,0.25)`,
          transition: 'width 0.8s cubic-bezier(0.34,1.05,0.5,1)',
        }}>
          {/* Komet-Spitze: heller, pulsierender Kopf an der Balken-Front. */}
          {val > 0 && (
            <span aria-hidden style={{
              position: 'absolute', right: 0, top: '50%',
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              boxShadow: `0 0 12px 3px ${team.color}, 0 0 26px 8px ${team.color}88`,
              animation: 'qqCometPulse 1.4s ease-in-out infinite',
            }} />
          )}
        </div>
      </div>
      <span key={valPopKey} style={{ ...S.standVal, color: team.color, display: 'inline-block', animation: 'qqValuePop 0.5s ease both' }}>{displayVal}</span>
      <span style={S.standUnit}>{medal ? <QQEmojiIcon emoji={medal} /> : de ? 'Pkt' : 'pts'}</span>
    </div>
  );
}

// ── Mega-Faktions-Awards (Spielende): 3 Award-Chips (⚡🎯🔥) ───────────────────
// Wiederverwendet in Beamer-GameOver + Summary + Recap. avatarId → Farbe/Label
// aus QQ_AVATARS; Award-Icon als 3D-Fluent-PNG (fx-lightning/fx-target/fx-fire).
export function MegaAwardsStrip({ awards, de }: { awards: QQMegaAwards; de: boolean }) {
  const items = ([
    { slug: 'award-speedy' as const, label: de ? 'Schnellstes Team' : 'Fastest team', av: awards.fastest },
    { slug: 'award-sharpshooter' as const, label: de ? 'Treffsicherstes Team' : 'Sharpest team', av: awards.sharpshooter },
    { slug: 'award-underdog' as const, label: de ? 'Beste Aufholjagd' : 'Best comeback', av: awards.comeback },
  ]).filter(x => !!x.av);
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map((it, i) => {
        const ava = AVA_BY_ID.get(it.av!);
        const color = ava?.color ?? '#EC4899';
        const name = qqMegaFactionName(it.av!, de ? 'de' : 'en');
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}44` }}>
            <QQIcon slug={it.slug} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{it.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <QQTeamAvatar avatarId={it.av as QQTeam['avatarId']} teamEmoji={qqMegaFactionSlug(it.av!)} size={28} />
                <span style={{ fontSize: 18, fontWeight: 900, color }}>{name}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── GameOver: Sieger-Hero + Top-10-Standings (kein Grid, keine 25er-Kaskade) ──
export function LargeGroupGameOverView({ state }: { state: QQStateUpdate }) {
  const de = state.language !== 'en';
  const sorted = state.nestedTeams ? qqSortedGroups(state) : qqSortedTeams(state);
  const winner = sorted[0];
  const shown = sorted.slice(0, 10);
  const rest = sorted.length - shown.length;
  const maxVal = Math.max(1, ...shown.map(t => t.largestConnected));
  const wColor = winner?.color ?? '#EC4899';

  // 2026-07-04 (Wolf 'arena-artiges Finale'): Sieger-Kroenung als Bookend zum
  // Einzug — erst dramatische Kroenung der Sieger-Fraktion (Wappen gross,
  // Farbflut, Slogan, Konfetti), dann Uebergang in die Standings. Spielt einmal.
  const [goPhase, setGoPhase] = useState<'crown' | 'full'>(winner ? 'crown' : 'full');
  useEffect(() => {
    if (!winner) { setGoPhase('full'); return; }
    const id = window.setTimeout(() => setGoPhase('full'), 5200);
    return () => window.clearTimeout(id);
  }, [winner?.id]);
  const motto = winner ? qqMegaFactionMotto(winner.avatarId, de ? 'de' : 'en') : '';

  if (goPhase === 'crown' && winner) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0A0814', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(10px, 1.6cqh, 24px)', color: '#f4f6ff' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 80% 62% at 50% 42%, ${wColor}3a 0%, transparent 62%)`, animation: 'qqCrownFlood 0.8s ease both' }} />
        <ConfettiOverlay eurovisionMode={state.theme?.eurovisionMode} />
        <div style={{ position: 'relative', zIndex: 5, fontSize: 'clamp(13px, 1.6cqw, 26px)', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e9c46a' }}>
          {de ? 'Champions der Arena' : 'Arena Champions'}
        </div>
        <div style={{ position: 'relative', zIndex: 5, animation: 'qqCrownIn 0.7s cubic-bezier(0.2,1.3,0.4,1) both' }}>
          <img src="/icons/fx-trophy.png" alt="" aria-hidden draggable={false} style={{ position: 'absolute', top: '-9%', left: '50%', transform: 'translateX(-50%)', width: 'clamp(50px, 5.2cqw, 88px)', height: 'auto', zIndex: 6, animation: 'finaleTrophyFloat 3.4s ease-in-out infinite', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }} />
          <div style={{ borderRadius: '50%', boxShadow: `0 0 80px ${wColor}77, 0 0 150px ${wColor}44` }}>
            <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji} size={'clamp(160px, 20cqw, 320px)'} />
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 0.8cqh, 12px)' }}>
          <TeamNameLabel name={winner.name} maxLines={1} shrinkAfter={14} color={wColor} fontWeight={900} fontSize="clamp(40px, 6.4cqw, 104px)" fontSizeLong="clamp(30px, 4.6cqw, 74px)" style={{ textAlign: 'center', textShadow: `0 0 50px ${wColor}66` }} />
          <div aria-hidden style={{ height: 'clamp(3px, 0.42cqh, 6px)', width: 'clamp(70px, 12cqw, 210px)', borderRadius: 999, background: wColor, transformOrigin: 'center', boxShadow: `0 0 16px ${wColor}99`, animation: 'qqCrownUnderline 0.5s cubic-bezier(0.2,1,0.4,1) 0.45s both' }} />
        </div>
        {motto && (
          <div style={{ position: 'relative', zIndex: 5, fontSize: 'clamp(18px, 2.5cqw, 40px)', fontWeight: 800, fontStyle: 'italic', color: '#cbd5e1', animation: 'qqCrownFadeUp 0.6s ease 0.5s both' }}>
            „{motto}"
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 5, fontWeight: 900, fontSize: 'clamp(20px, 2.4cqw, 38px)', color: wColor, animation: 'qqCrownFadeUp 0.6s ease 0.72s both' }}>
          {winner.largestConnected} {de ? 'Punkte' : 'points'}
        </div>
        <style>{`
          @keyframes qqCrownIn { 0% { opacity: 0; transform: translateY(40px) scale(0.6); } 60% { opacity: 1; } 100% { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes qqCrownUnderline { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
          @keyframes qqCrownFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes qqCrownFlood { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ ...S.goWrap, animation: 'brFadeIn 0.5s ease both' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 22%, ${wColor}33 0%, transparent 60%)` }} />
      <ConfettiOverlay eurovisionMode={state.theme?.eurovisionMode} />

      <div style={S.goLabel}>{de ? 'Spielende' : 'Game Over'}</div>

      {winner && (
        <div style={S.goHero}>
          <img src="/icons/fx-trophy.png" alt="" aria-hidden draggable={false} style={{ width: 'clamp(60px, 6cqw, 96px)', height: 'auto', animation: 'finaleTrophyFloat 3.4s ease-in-out infinite' }} />
          <div style={{ position: 'relative', borderRadius: '50%', boxShadow: `0 0 60px ${wColor}66, 0 0 120px ${wColor}40` }}>
            <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji} size={'clamp(110px, 11cqw, 170px)'} />
          </div>
          <TeamNameLabel name={winner.name} maxLines={1} shrinkAfter={12} color={wColor} fontWeight={900} fontSize="clamp(30px, 3.4cqw, 52px)" fontSizeLong="clamp(22px, 2.4cqw, 36px)" style={{ textAlign: 'center' }} />
          <div style={{ ...S.goWinPts, color: wColor }}>{winner.largestConnected} {de ? 'Punkte' : 'points'}</div>
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', maxWidth: 1000, height: shown.length * 62, marginTop: 8 }}>
        {shown.map((t, i) => {
          const pct = (t.largestConnected / maxVal) * 100;
          const medal = i < 3 && t.largestConnected > 0 ? MEDALS[i] : null;
          return (
            <div key={t.id} style={{ ...S.goRow, top: i * 62 }}>
              <span style={S.goRank}>{i === 0 && t.largestConnected > 0 ? <QQEmojiIcon emoji="👑" /> : i + 1}</span>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={44} />
              <div style={{ width: 220, minWidth: 0 }}>
                <TeamNameLabel name={t.name} fontSize={24} color={t.color} fontWeight={900} maxLines={1} shrinkAfter={16} />
              </div>
              <div style={S.goBarTrack}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}dd)`, borderRadius: 999 }} />
              </div>
              <span style={{ ...S.goVal, color: t.color }}>{t.largestConnected}</span>
              <span style={S.goUnit}>{medal ? <QQEmojiIcon emoji={medal} /> : (de ? 'Pkt' : 'pts')}</span>
            </div>
          );
        })}
      </div>
      {rest > 0 && <div style={S.goRest}>+ {rest} {de ? 'weitere Fraktionen' : 'more factions'}</div>}

      {state.megaAwards && (
        <div style={{ marginTop: 18, position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={S.goLabel}>{de ? 'Fraktions-Awards' : 'Faction awards'}</div>
          <MegaAwardsStrip awards={state.megaAwards} de={de} />
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, padding: '0 64px', color: '#f4f6ff' },
  correctBanner: { display: 'flex', alignItems: 'baseline', fontSize: 40, fontWeight: 800 },
  correctCount: { marginLeft: 'auto', fontSize: 26, fontWeight: 800, opacity: 0.6 },
  emptyReveal: { textAlign: 'center', fontSize: 40, fontWeight: 800, opacity: 0.7, padding: '60px 0' },

  // Akt 2 nested „Auflösung"
  megaReveal: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '30px 0 10px' },
  megaRevealBig: { fontSize: 46, fontWeight: 900, textAlign: 'center' },
  megaRevealTrack: { width: 'min(720px, 80%)', height: 26, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' },
  megaRevealHint: { fontSize: 22, fontWeight: 700, opacity: 0.5 },

  // Akt 3 Beat A „Wertung dieser Frage"
  qrWrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 56px', color: '#f4f6ff', animation: 'brFadeIn 0.4s ease both', overflow: 'hidden' },
  qrLabel: { fontSize: 24, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.6, fontWeight: 900 },
  qrList: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 940 },
  qrRow: { display: 'flex', alignItems: 'center', gap: 20, padding: '10px 22px', borderRadius: 16, background: 'rgba(255,255,255,0.05)' },
  qrRank: { width: 52, textAlign: 'center', fontWeight: 900, fontSize: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  qrPts: { fontWeight: 900, fontSize: 42, minWidth: 116, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  qrFoot: { fontSize: 20, fontWeight: 700, opacity: 0.5, textAlign: 'center', marginTop: 4 },
  podium: { display: 'flex', flexDirection: 'column', gap: 14 },
  podRow: { display: 'flex', alignItems: 'center', gap: 22, padding: '10px 22px', borderRadius: 18, background: 'rgba(255,255,255,0.05)' },
  podMedal: { fontSize: 44, width: 56, textAlign: 'center', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  podPts: { fontWeight: 900, fontSize: 46, minWidth: 90, textAlign: 'right' },
  alsoWrap: { marginTop: 10 },
  alsoLabel: { fontSize: 20, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800 },
  alsoRow: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  alsoChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  goWrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 48px', color: '#f4f6ff', position: 'relative', overflow: 'hidden' },
  goLabel: { fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.55, fontWeight: 800, position: 'relative', zIndex: 5 },
  goHero: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 5 },
  goWinPts: { fontWeight: 900, fontSize: 'clamp(16px, 1.7cqw, 24px)' },
  goRow: { position: 'absolute', left: 0, right: 0, height: 54, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', borderRadius: 14, background: 'rgba(255,255,255,0.045)' },
  goRank: { width: 48, textAlign: 'center', fontWeight: 900, fontSize: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  goBarTrack: { flex: 1, height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 999, position: 'relative', overflow: 'hidden' },
  goVal: { width: 74, textAlign: 'right', fontWeight: 900, fontSize: 32, fontVariantNumeric: 'tabular-nums' },
  goUnit: { width: 52, textAlign: 'left', fontSize: 18, fontWeight: 700, opacity: 0.55, display: 'inline-flex', alignItems: 'center' },
  goRest: { fontSize: 20, fontWeight: 700, opacity: 0.5, position: 'relative', zIndex: 5 },
  standWrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 48px', color: '#f4f6ff', overflow: 'hidden' },
  standLabel: { fontSize: 22, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.55, fontWeight: 800 },
  standRest: { fontSize: 22, fontWeight: 700, opacity: 0.5 },
  standRow: { position: 'absolute', left: 0, right: 0, height: STANDINGS_ROW_H - 12, display: 'flex', alignItems: 'center', gap: 20, padding: '0 22px', borderRadius: 16, background: 'rgba(255,255,255,0.045)' },
  standRank: { width: 60, textAlign: 'center', fontWeight: 900, fontSize: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  standBarTrack: { flex: 1, height: 32, background: 'rgba(255,255,255,0.06)', borderRadius: 999, position: 'relative', overflow: 'visible' },
  standVal: { width: 132, textAlign: 'right', fontWeight: 900, fontSize: 40, fontVariantNumeric: 'tabular-nums' },
  standUnit: { width: 60, textAlign: 'left', fontSize: 22, fontWeight: 700, opacity: 0.55, display: 'inline-flex', alignItems: 'center' },
};
