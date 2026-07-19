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
import type { QQStateUpdate, QQTeam, QQMegaRankEntry, QQMegaAwards, QQMegaAwardKey } from '../../../shared/quarterQuizTypes';
import { QQ_AVATARS, QQ_QUESTIONS_PER_PHASE, qqMegaFactionName, qqMegaFactionSlug, qqMegaFactionMotto, qqMegaAwardKeys, QQ_MEGA_AWARD_BONUS } from '../../../shared/quarterQuizTypes';
import { playArenaLeadChange, playSpecialAwardReveal, playRaceWinner, playWolfHowl } from '../utils/sounds';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQGemFill } from './QQGemFill';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon, QQIcon } from './QQIcon';
import type { QQIconSlug } from './QQIcon';
import { qqSortedTeams, qqSortedGroups } from '../qqShared';
import { COZY_ARENA_CREST_SLUGS } from '../cozyArenaCrests';
import { prefersReducedMotion } from '../utils/reducedMotion';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';

const MEDALS = ['🥇', '🥈', '🥉'];
const STANDINGS_ROW_H = 88;
const STANDINGS_MAX = 10;

// ── Die gemalte Tafel im standing.webp-BG ────────────────────────────────────
// 2026-07-17 (Wolf „keine Ueberschrift mehr, aber perfekt auf den bg passen —
// da ist eine Tafel zu sehen"). Vorher schoben qrWrap/standWrap ihren zentrierten
// Block per asymmetrischem Padding ins ungefaehre „Rahmen-Band" (geschaetzt, laut
// altem Kommentar „~18-66% Hoehe" — real war es 6-79%, der Block sass ~9% zu tief).
//
// Jetzt AUSGEMESSEN: Pixel-Scan von standing.webp (1462x1076) → Tafel-Innenflaeche
// im Bild x 272..1192, y 174..778. Zusammen mit ARENA_BG_FOCUS['standing']
// ('51% 31% / 110%') ergibt das auf der 1760x990-Buehne die Werte unten.
//
// ⚠️ Der Zapfen (Edelstein-Ornament) haengt oben MITTIG in die Tafel hinein, bis
// y=245 im Bild = 19.1% der Buehne (Wolf: „da sitzt etwas mittig, das nicht
// ueberdecken"). Darum beginnt der Inhalt erst darunter — der Rahmen ist oben
// NICHT rechteckig.
//
// ⚠️ Gilt fuer 16:9 (das BG liegt auf dem Fenster, nicht auf der Stage).
// Gegenstueck: ARENA_BG_FOCUS['standing'] in ArenaBeamerBg — beide zusammen aendern!
const MEGA_BOARD = {
  insetX: '15.4%',   // Tafel-Innenkante links/rechts
  top: '19.1%',      // UNTER dem Zapfen (Tafel-Oberkante waere 9.6%)
  bottom: '9.6%',    // Tafel-Innenkante unten
};
/** Nutzbare Tafel-Hoehe in Stage-px (990 - Zapfen-Band - Unterkante) = 706. */
const MEGA_BOARD_H = Math.round(990 * (1 - 0.191 - 0.096));

const KEYFRAMES = `
@keyframes brPodIn { from { opacity: 0; transform: translateY(18px) scale(0.95); } to { opacity: 1; transform: none; } }
@keyframes brAlsoIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
/* 2026-07-17 (Motion-Wertigkeits-Pass, Rezept aus Regel-Auftritt): Wertungs-Zeilen
   SETZEN sich aus der Tiefe an ihren Platz (translateY+scale) statt von links
   reinzurutschen (translateX = generisches Web-Slide). Rang-Sequenz-Dramatik
   (0.32s Stagger + brPtsPop) bleibt — nur der Bewegungs-Charakter wird wertiger. */
@keyframes brRankIn { from { opacity: 0; transform: translateY(15px) scale(0.975); } to { opacity: 1; transform: none; } }
@keyframes brPtsPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
@keyframes brFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes brBarGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
/* 2026-07-12 (Wolf 'episches Event-Rennen'): Renn-Dynamik. */
@keyframes qqCometPulse { 0%,100% { transform: translate(50%,-50%) scale(1); opacity: 1; } 50% { transform: translate(50%,-50%) scale(1.4); opacity: 0.82; } }
@keyframes qqCrownBounce { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-6px) rotate(5deg); } }
@keyframes qqLeaderGlow { 0%,100% { box-shadow: inset 0 0 0 1.5px var(--lc, #fff), 0 0 24px -6px var(--lc, #fff); } 50% { box-shadow: inset 0 0 0 2px var(--lc, #fff), 0 0 44px 2px var(--lc, #fff); } }
@keyframes qqRowIn { from { opacity: 0; transform: translateX(-34px); } to { opacity: 1; transform: none; } }
@keyframes qqValuePop { 0% { transform: scale(1); } 40% { transform: scale(1.22); } 100% { transform: scale(1); } }
/* 2026-07-12 (Showdown 2b): Finale-Multiplikator-Banner atmet. */
@keyframes qqFinalePulse { 0%,100% { transform: scale(1); box-shadow: 0 0 30px -4px #EC4899, inset 0 1px 0 rgba(255,255,255,0.3); } 50% { transform: scale(1.035); box-shadow: 0 0 52px 2px #EC4899, inset 0 1px 0 rgba(255,255,255,0.4); } }
`;

// Finale-Multiplikator spiegelbildlich zur Backend-Wertung (qqMegaEventScore):
// letzte Phase ×2, allerletzte Frage ×3. Aus questionIndex + totalPhases ableitbar
// (gleiche Phasen-Struktur wie im Backend), daher kein extra State-Feld noetig.
function qqFinaleMult(state: QQStateUpdate): 1 | 2 | 3 {
  const qpp = QQ_QUESTIONS_PER_PHASE;
  const qi = state.questionIndex ?? 0;
  // gamePhaseIndex = AUTORITATIVE aktuelle Runde (Backend, qqRooms:2518). Vorher
  // wurde die Runde aus questionIndex/5 re-abgeleitet → bei !=5 Fragen pro Runde
  // (Wolf: 2-Runden-Draft) falsche Runde → Finale-×2/×3-Banner zuendete nie.
  if (((state as any).gamePhaseIndex ?? 1) !== (state.totalPhases ?? 3)) return 1;
  return (qi % qpp) === (qpp - 1) ? 3 : 2;
}

// Der fruehere „×2/×3"-FinaleBanner (mitten im Reveal) ist entfernt — die
// Finale-Ansage laeuft jetzt im Runden-Intro (CozyQuizPhaseIntroView,
// Wolf 2026-07-16). qqFinaleMult bleibt: die Score-Unterzeile braucht die Basis.

// Zahl weich hochzählen (Renn-Drama). performance.now ist im Browser ok.
function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) { setV(target); return; }
    // reduced-motion: kein RAF-Tween, Endwert sofort.
    if (prefersReducedMotion()) { setV(target); from.current = target; return; }
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

// ── Kategorie-abhaengige Score-Unterzeile (2026-07-12 Audit) ─────────────────
// Bisher stand ueberall „X/Y Handys richtig" — irrefuehrend, weil es die 0-100-
// Punkte nicht erklaert: bei 10v10 (Wett-Einsatz) und Distanz (Naehe, nicht
// Anzahl → „+40 mit 0/4 richtig" war widerspruechlich). Jetzt pro Kategorie eine
// Unterzeile, die GENAU die Punkte erklaert. base = 0-100-Score vor Finale-Mult.
type QQScoreCat = { cat?: string; kind?: string };
function qqScoreCatOf(state: QQStateUpdate): QQScoreCat {
  const q = state.currentQuestion;
  return { cat: q?.category, kind: (q?.bunteTuete as { kind?: string } | undefined)?.kind };
}
function qqScoreSub(sc: QQScoreCat, e: QQMegaRankEntry, finaleMult: number, de: boolean): { label: string; showDots: boolean } {
  const base = finaleMult > 1 ? Math.round(e.points / finaleMult) : e.points;
  const isDist = sc.cat === 'SCHAETZCHEN' || (sc.cat === 'BUNTE_TUETE' && (sc.kind === 'crowdEstimate' || sc.kind === 'map'));
  if (isDist) return { label: de ? `Ø ${base}% dran` : `Ø ${base}% close`, showDots: false };
  if (sc.cat === 'ZEHN_VON_ZEHN') { const x = Math.round(base / 10); return { label: de ? `Ø ${x}/10 auf richtig` : `Ø ${x}/10 on correct`, showDots: false }; }
  // crowdTop (Top-Antworten): Board-Punkte 5/4/3/2/1 → pro Handy 100/80/60/40/20 %
  // Naehe zur Bestantwort (#1 = 100 %, off-board = 0). base = exakt die Punkte →
  // Label-% = Punkte, maximal nachvollziehbar, keine Extra-Rundung. Keine Dots
  // (ist kein Zaehl-Wert — „4/4 auf der Tafel" verschwieg, dass Platz 1 > Platz 5).
  if (sc.cat === 'BUNTE_TUETE' && sc.kind === 'crowdTop') return { label: de ? `Ø ${base}% zur Bestantwort` : `Ø ${base}% toward best`, showDots: false };
  return { label: de ? `${e.correct}/${e.total} Handys richtig` : `${e.correct}/${e.total} phones correct`, showDots: true };
}

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
  const sc = qqScoreCatOf(state);
  const fm = qqFinaleMult(state);
  // 2026-07-16 (Design-Audit): Beat A hatte feste Groessen (Avatar 64, Font 30) →
  // bei 7-8 Fraktionen drohte unten Abschneiden. Jetzt dichter gestuft (analog zum
  // responsiven rowH der CumulativeStandings), damit alle Zeilen ins Board passen.
  const dense = rows.length > 6;
  const avSz = dense ? 50 : 64;
  const nameFs = dense ? 25 : 30;
  return (
    <div style={S.qrWrap}>
      <style>{KEYFRAMES}</style>
      {/* Finale-×2/×3 wird jetzt im Runden-Intro angesagt (Wolf 2026-07-16),
          nicht mehr als Banner mitten im Reveal. */}
      {/* 2026-07-17 (Wolf): Ueberschrift „Wertung dieser Frage" raus — die gemalte
          Tafel im BG rahmt den Inhalt schon, ein Label darin ist Doppelung. */}
      <div style={{ ...S.qrList, gap: dense ? 7 : 10 }}>
        {rows.map((r, i) => {
          const ava = AVA_BY_ID.get(r.avatarId);
          const color = ava?.color ?? '#EC4899';
          const name = qqMegaFactionName(r.avatarId, de ? 'de' : 'en');
          const medal = i < 3 && r.points > 0 ? MEDALS[i] : null;
          const scored = r.points > 0;
          const sub = qqScoreSub(sc, r, fm, de);
          return (
            <div key={r.avatarId} style={{ ...S.qrRow, ...(dense ? { padding: '7px 22px', gap: 14 } : {}), animation: 'brRankIn 0.5s var(--qq-enter) both', animationDelay: `${i * 0.32}s`, opacity: scored ? 1 : 0.5 }}>
              <span style={S.qrRank}>{medal ? <QQEmojiIcon emoji={medal} /> : i + 1}</span>
              <QQTeamAvatar avatarId={r.avatarId as QQTeam['avatarId']} teamEmoji={qqMegaFactionSlug(r.avatarId)} size={avSz} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: nameFs, fontWeight: 900, color, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <Dots correct={r.correct} total={r.total} color={color} de={de} avgSec={r.avgSec ?? null} baseDelay={i * 0.32} label={sub.label} showDots={sub.showDots} />
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
    </div>
  );
}

// Punkte-Dots: gefüllt = richtige Sub-Teams, hohl = Rest. Bei >5 nur Zahl.
// 2026-07-12: dahinter dezent die Ø-Antwortzeit der richtigen Handys — macht
// den Speed-Tiebreak transparent (warum +6 vs +1 bei gleicher Trefferquote).
function Dots({ correct, total, color, de, avgSec, baseDelay = 0, label, showDots }: { correct: number; total: number; color: string; de: boolean; avgSec?: number | null; baseDelay?: number; label: string; showDots: boolean }) {
  // 2026-07-18 (Wolf 'bild 10' — einheitlich): statt Punkte-Dots derselbe
  // Kolosseum-Diamant wie im CHEESE-Reveal (fuellt sich = Anteil richtig). Kein
  // 5er-Cap noetig (Diamant ist eine Fuellung, keine Zaehl-Reihe). Zahl steht
  // ohnehin im Label daneben.
  const dotsVisible = showDots && total > 0;
  const timeStr = (avgSec != null && correct > 0)
    ? (de ? `${avgSec.toFixed(1).replace('.', ',')}s` : `${avgSec.toFixed(1)}s`)
    : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      {dotsVisible && (
        <QQGemFill correct={correct} total={total} color={color} size={'clamp(17px,1.6cqw,24px)'} />
      )}
      <span style={{ fontSize: 'clamp(17px, 1.6cqw, 24px)', fontWeight: 800, opacity: 0.75 }}>
        {label}
      </span>
      {timeStr && (
        <span style={{ fontSize: 'clamp(15px, 1.4cqw, 21px)', fontWeight: 800, opacity: 0.65, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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

  // 2026-07-08 (Audit B2): responsive Zeilenhoehe, damit bei 9-10 Fraktionen keine
  // Zeile aus dem Rahmen faellt.
  // 2026-07-17: Budget ist jetzt die AUSGEMESSENE Tafel-Hoehe (MEGA_BOARD_H = 706px)
  // statt der geschaetzten 780 — vorher konnten 9-10 Zeilen unten aus der gemalten
  // Tafel laufen. Bei den 8 Arena-Fraktionen greift der Cap nicht (706/8 = 88 =
  // STANDINGS_ROW_H), die Standard-Zeilenhoehe bleibt also unveraendert.
  const rowH = Math.min(STANDINGS_ROW_H, Math.floor(MEGA_BOARD_H / Math.max(1, shown.length)));

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

  const sc = qqScoreCatOf(state);
  const fm = qqFinaleMult(state);

  return (
    <div style={{ ...S.standWrap, animation: 'brFadeIn 0.5s ease both' }}>
      <style>{KEYFRAMES}</style>
      {/* Finale-×2/×3 jetzt im Runden-Intro (Wolf 2026-07-16), nicht mehr hier. */}
      {/* 2026-07-17 (Wolf): Ueberschrift „Gesamtwertung" raus — s. qrWrap. */}
      <div style={{ position: 'relative', height: shown.length * rowH, width: '100%' }}>
        {shown.map(t => (
          <StandingsRow key={t.id} team={t} rank={rankOf.get(t.id) ?? 0} seedRank={prevRanksSnapshot?.get(t.id)} maxVal={maxVal} de={de} qEntry={qByAvatar.get(t.avatarId)} rowH={rowH} sc={sc} fm={fm} />
        ))}
      </div>
      {rest > 0 && (
        <div style={S.standRest}>+ {rest} {de ? 'weitere Fraktionen' : 'more factions'}</div>
      )}
    </div>
  );
}

function StandingsRow({ team, rank, seedRank, maxVal, de, qEntry, rowH, sc, fm }: { team: QQTeam; rank: number; seedRank?: number; maxVal: number; de: boolean; qEntry?: QQMegaRankEntry; rowH: number; sc: QQScoreCat; fm: number }) {
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
  //
  // 2026-07-13 (Delight-Pass, Todo „Leader-Spotlight-scale geht im FLIP
  // verloren"): `transform` wird jetzt AUSSCHLIESSLICH hier imperativ gesetzt,
  // NIE mehr im React-Inline-Style (s. unten). Grund: `useCountUp(val)`
  // re-rendert die Row jeden Frame waehrend der 0.7s-Glide; hatte React ein
  // `transform: scale(1.035)` im Style, schrieb es das translateY() mitten in
  // der Bewegung zurueck (translateY fehlt → Row schnappt sofort ans Ziel, die
  // Glide UND der Scale-Pop gehen verloren). Ohne transform-Key im React-Style
  // fasst React den Wert nie an → die imperative Schicht bleibt alleiniger
  // Besitzer und ueberlebt jeden Re-Render.
  const leaderScale = isLeader ? ' scale(1.035)' : '';
  // FLIP: sanftes Gleiten bei Rang-Wechsel (Überholmoment). Bei Rang-Wechsel
  // gleitet die Zeile; ohne Wechsel wird nur der Ruhe-Transform gesetzt (Scale
  // fuer den Leader, sonst leer) — damit ein stehen-bleibender Fuehrender seinen
  // Spotlight-Scale behaelt, obwohl React ihn nicht mehr setzt.
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
    } else {
      // Kein Rang-Wechsel: Ruhe-Transform ohne Uebergang setzen.
      el.style.transition = 'none';
      el.style.transform = leaderScale ? `translateY(0)${leaderScale}` : '';
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
      // Leader-Spotlight: hellerer Grund + atmender Farb-Glow. Der Scale (1.035)
      // wird BEWUSST NICHT hier gesetzt, sondern imperativ im FLIP-useLayoutEffect
      // oben — sonst clobbert React den translateY-Glide bei jedem Countup-Frame.
      ...(isLeader ? {
        zIndex: 3,
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
          }}><QQEmojiIcon emoji="🚀" /> {de ? 'Führung!' : 'Lead!'}</span>
        </>
      )}
      {/* Arena: keine Krone im Standing (anteilige Punkte, kein klassischer Sieger).
          Fuehrung wird nur ueber Glow/Scale/„Fuehrung!"-Callout markiert. */}
      <span style={S.standRank}>{rank + 1}</span>
      <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={62} />
      <div style={{ width: 260, minWidth: 0 }}>
        <TeamNameLabel name={team.name} fontSize={30} color={team.color} fontWeight={900} maxLines={1} shrinkAfter={16} />
        {/* Modell B: was diese Farbe DIESE Frage geholt hat — +Punkte + ✓-Zahl. */}
        {qEntry && (
          <div style={{ marginTop: 2, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ color: qEntry.points > 0 ? team.color : 'rgba(255,255,255,0.35)' }}>
              {qEntry.points > 0 ? `+${qEntry.points}` : '±0'}
            </span>
            <span style={{ opacity: 0.55, fontSize: 15 }}>{qqScoreSub(sc, qEntry, fm, de).label}</span>
          </div>
        )}
      </div>
      {/* 2026-07-17 (Geschmacks-Pass, Material-Rezept): der Balken war ein flacher
          Web-Slider (weisser Komet-Ball am Ende = „zieh mich"-Signal). Jetzt eine in
          Stein eingelassene RILLE (warmer, versenkter Kanal via inset-Schatten) mit
          einer Edelstein-Fuellung (Fraktionsfarbe + Facetten-Glanz oben + dunkle
          Kante unten). Kein neues Gold (gesperrt ausser Kroenung), Ball raus. Die
          Zahl steht rechts NEBEN dem Balken (standVal), also frisst die dunklere
          Kante keinen Text-Kontrast. */}
      <div style={{
        ...S.standBarTrack,
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
          // Edelstein statt Neon-Fill: horizontaler Farbverlauf traegt die Farbe,
          // der vertikale Anteil gibt Rundung (heller Grat oben, satter Fuss unten).
          background: `linear-gradient(180deg, ${team.color} 0%, ${team.color} 42%, ${team.color}c8 100%)`,
          borderRadius: 999,
          // Facetten-Tiefe: heller Grat oben, dunkle Schattenkante unten + weicher
          // Farbschein nach aussen (im Kanal gehalten, kein greller Web-Glow).
          boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.4), inset 0 -3px 4px rgba(0,0,0,0.28), 0 0 12px ${team.color}55`,
          transition: 'width 0.8s cubic-bezier(0.34,1.05,0.5,1)',
        }} />
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
    // 2026-07-15 (Wolf): 2 neue Awards passend zur Per-Capita-Wertung.
    { slug: 'group' as const, label: de ? 'Vollzählig' : 'Full house', av: awards.participation },
    { slug: 'anker' as const, label: de ? 'Beständig' : 'Most steady', av: awards.steady },
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

// ── Award-Beat-Metadaten (Icon/Titel/Sieger-Fraktion/Stat) je Award-Key ──────
// Reihenfolge & Vorhandensein liefert qqMegaAwardKeys (Single Source of Truth,
// shared) — hier nur die Darstellungs-Details pro Beat der Siegerehrung.
function megaAwardBeat(key: QQMegaAwardKey, awards: QQMegaAwards, de: boolean): { slug: QQIconSlug; title: string; av: string; stat: string } {
  const st = awards.stats ?? {};
  switch (key) {
    case 'fastest':
      return { slug: 'award-speedy', title: de ? 'Schnellstes Team' : 'Fastest team', av: awards.fastest!, stat: de ? `${st.fastest ?? 0}× die schnellste Fraktion` : `${st.fastest ?? 0}× fastest faction` };
    case 'sharpshooter':
      return { slug: 'award-sharpshooter', title: de ? 'Treffsicherstes Team' : 'Sharpest team', av: awards.sharpshooter!, stat: de ? `${st.sharpshooter ?? 0}% Trefferquote` : `${st.sharpshooter ?? 0}% accuracy` };
    case 'comeback':
      return { slug: 'award-underdog', title: de ? 'Beste Aufholjagd' : 'Best comeback', av: awards.comeback!, stat: de ? `+${st.comeback ?? 0} Plätze aufgeholt` : `+${st.comeback ?? 0} places climbed` };
    case 'participation':
      return { slug: 'group', title: de ? 'Vollzählig' : 'Full house', av: awards.participation!, stat: de ? `${st.participation ?? 0}% mitgemacht` : `${st.participation ?? 0}% turnout` };
    case 'steady':
      return { slug: 'anker', title: de ? 'Beständig' : 'Most steady', av: awards.steady!, stat: de ? `Ø ${st.steady ?? 0} Punkte, kaum Schwankung` : `avg ${st.steady ?? 0} pts, low swing` };
  }
}

// Funken-Positionen um die einfahrende Sieger-Fraktion (Award-Beat).
const AWARD_SPARKS = [
  { top: '-8%', left: '10%',  delay: 0.0, dur: 2.8, size: 'clamp(12px,1.4cqw,20px)' },
  { top: '22%', left: '-8%',  delay: 0.6, dur: 3.2, size: 'clamp(10px,1.2cqw,16px)' },
  { top: '78%', left: '-4%',  delay: 1.2, dur: 2.6, size: 'clamp(10px,1.1cqw,15px)' },
  { top: '88%', left: '82%',  delay: 0.3, dur: 3.0, size: 'clamp(12px,1.4cqw,20px)' },
  { top: '8%',  left: '96%',  delay: 0.9, dur: 2.8, size: 'clamp(11px,1.3cqw,18px)' },
];

// Zeremonie-Keyframes (einmal je Branch via <style> injiziert). Reduced-Motion
// via data-qq-ceremony-Scope entschärft alle Loops/Entrances.
const CEREMONY_KEYFRAMES = `
@keyframes qqCrownIn { 0% { opacity:0; transform:translateY(40px) scale(0.6);} 60%{opacity:1;} 100%{opacity:1;transform:translateY(0) scale(1);} }
@keyframes qqCrownUnderline { from{transform:scaleX(0);opacity:0;} to{transform:scaleX(1);opacity:1;} }
@keyframes qqCrownFadeUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
@keyframes qqCrownFlood { from{opacity:0;} to{opacity:1;} }
@keyframes qqAwardBgSettle { 0%{transform:scale(1.05);filter:brightness(1.14);} 100%{transform:scale(1);filter:brightness(1);} }
/* Fahnen-Wehen (Wolf bild 13): sanftes Neigen um die Aufhaengung. */
@keyframes qqBannerSway { 0%,100%{transform:rotate(-1.4deg);} 50%{transform:rotate(1.4deg);} }
/* Glut: Funke steigt an der Fahne auf und verglueht. */
@keyframes qqEmberRise { 0%{transform:translate(-50%,0) scale(1);opacity:0;} 18%{opacity:0.85;} 100%{transform:translate(-50%,-3.2cqw) scale(0.35);opacity:0;} }
@keyframes qqAwardIconPop { 0%{opacity:0;transform:translateY(24px) scale(0.5) rotate(-8deg);} 60%{opacity:1;transform:scale(1.12) rotate(3deg);} 100%{opacity:1;transform:scale(1) rotate(0);} }
@keyframes qqAwardShine { from{transform:translateX(-130%);} to{transform:translateX(130%);} }
@keyframes qqAwardDriveIn { from{opacity:0;transform:translateX(64px);} to{opacity:1;transform:translateX(0);} }
@keyframes qqBannerUnfurl { from{transform:translateX(-50%) scaleY(0);opacity:0.35;} to{transform:translateX(-50%) scaleY(1);opacity:1;} }
@keyframes qqLaurelDrop { from{opacity:0;transform:translateY(-34px) scale(0.6);} to{opacity:1;transform:translateY(0) scale(1);} }
@keyframes qqTorchFlicker { 0%,100%{transform:scale(1) rotate(-3deg);opacity:0.9;} 50%{transform:scale(1.1) rotate(3deg);opacity:1;} }
/* Banner-Entzuendung (Wolf 2026-07-16): Arena dunkelt, die 8 Wandbanner dimmen,
   nur das Sieger-Banner entzuendet sich (grau+dunkel -> voll Farbe+Glow+groesser),
   dann schlaegt "CHAMPIONS DER ARENA" ein. filter deckt auch den box-shadow-Glow
   ab, daher faehrt der Glow mit dem brightness-Ramp hoch. */
@keyframes qqArenaDim { from{opacity:0;} to{opacity:1;} }
@keyframes qqBannerIgnite { 0%{filter:grayscale(0.85) brightness(0.4);opacity:0.5;transform:scale(1);} 55%{filter:grayscale(0) brightness(1.25);transform:scale(1.2);} 100%{filter:none;opacity:1;transform:scale(1.14);} }
@keyframes qqChampSlam { 0%{opacity:0;transform:scale(1.7);letter-spacing:0.5em;} 60%{opacity:1;transform:scale(0.96);} 100%{opacity:1;transform:scale(1);letter-spacing:0.2em;} }
@keyframes qqBannerFlame { 0%,100%{transform:translateX(-50%) scale(1) rotate(-4deg);opacity:0.92;} 50%{transform:translateX(-50%) scale(1.18) rotate(4deg);opacity:1;} }
@keyframes qqShockRing { 0%{transform:translate(-50%,-50%) scale(0);opacity:0.85;} 100%{transform:translate(-50%,-50%) scale(16);opacity:0;} }
@keyframes qqFlashPulse { 0%{opacity:0;} 12%{opacity:0.9;} 100%{opacity:0;} }
@keyframes qqTensionPulse { 0%,100%{opacity:0.7;transform:translate(-50%,-50%) scale(1);} 50%{opacity:1;transform:translate(-50%,-50%) scale(1.05);} }
@keyframes qqPodRise { from{transform:translateY(118%);opacity:0;} to{transform:translateY(0);opacity:1;} }
@media (prefers-reduced-motion: reduce) {
  [data-qq-ceremony] * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
`;

// ── Kolosseum-Krönung: Banner-Roulette → Blink → Treppchen (Wolf 2026-07-16) ──
// Beim Wechsel auf den Krönungs-Step läuft die Sequenz automatisch ab: Arena
// dunkelt → die Erleuchtung springt zufällig über die 8 Wandbanner (schnell →
// auslaufend) → blinkt auf dem Sieger → Flash + Lock → das Treppchen (Top 3)
// steigt auf, „Champions der Arena" schlägt gold ein, Konfetti. Timing via
// setTimeout-Kette (Cleanup bei Unmount). Reduced-Motion: direkt Lock + Podium.
// Sound (Fanfare + Wolf-Howl) erst beim Einrasten, nicht beim Step-Wechsel.
function MegaCrownCeremony({ state, sorted, winner, wColor, de }: {
  state: QQStateUpdate; sorted: any[]; winner: any; wColor: string; de: boolean;
}) {
  const reduce = prefersReducedMotion();
  // 8 Banner in STABILER Fraktions-Reihenfolge (nicht nach Rang → die Position
  // verrät den Sieger nicht, das Roulette bleibt spannend).
  const avaOrder = (id: string) => { const i = QQ_AVATARS.findIndex(a => a.id === id); return i < 0 ? 99 : i; };
  const banners = useMemo(() => [...sorted].slice(0, 8).sort((a, b) => avaOrder(a.avatarId) - avaOrder(b.avatarId)), [sorted]);
  const champIdx = banners.findIndex(t => t.id === winner.id);
  const top3 = sorted.slice(0, 3);

  const [litIdx, setLitIdx] = useState<number | null>(null);
  const [blinkOn, setBlinkOn] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showPodium, setShowPodium] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    const muted = (state as any).sfxMuted;
    const lockFx = () => {
      if (muted) return;
      try { playRaceWinner(); at(700, () => { try { playWolfHowl(); } catch {} }); } catch {}
    };

    if (reduce || champIdx < 0) {
      setLitIdx(champIdx); setLocked(true);
      at(400, () => setShowPodium(true));
      if (!muted) { try { playRaceWinner(); } catch {} }
      return () => timers.forEach(clearTimeout);
    }

    // Roulette: zufällige Sprünge, erst schnell dann auslaufend, landet auf Sieger.
    let t = 600, delay = 44, prev = -1;
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      const last = i === steps - 1;
      let idx: number;
      if (last) idx = champIdx;
      else { do { idx = Math.floor(Math.random() * banners.length); } while (idx === prev); }
      prev = idx;
      at(t, () => setLitIdx(idx));
      t += delay; delay *= 1.115;
    }
    // Blink auf dem Sieger, dann Lock + Flash.
    const holdOn = t + 280;
    const seq = [false, true, false, true, false, true];
    const bd = 165;
    at(holdOn - 1, () => setBlinking(true));
    seq.forEach((on, k) => at(holdOn + k * bd, () => setBlinkOn(on)));
    const lockAt = holdOn + seq.length * bd;
    at(lockAt, () => { setBlinking(false); setLocked(true); lockFx(); });
    at(lockAt + 1350, () => setShowPodium(true));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wolf 2026-07-16 (Final-Reveal): das Roulette ist DER Moment → gross + zentral,
  // NICHT die kleine Leiste oben. `big` (= vor dem Treppchen) blaest Banner + den
  // Champion-Pop auf; sobald das Treppchen kommt, schrumpfen sie zur Kopf-Leiste.
  const bannerNode = (t: any, i: number, big: boolean) => {
    const isChamp = i === champIdx;
    let lit = false, scale = 1;
    if (locked && isChamp) { lit = true; scale = big ? 1.42 : 1.16; }
    else if (blinking && isChamp) { lit = blinkOn; scale = blinkOn ? (big ? 1.34 : 1.2) : 1; }
    else if (litIdx === i && !locked) { lit = true; scale = big ? 1.22 : 1.1; }
    const fc = t.color;
    // Sanftes Wehen (Wolf bild 13 „Fahnen wirken statisch"): jede Fahne neigt sich
    // leicht um die Aufhaengung (top center), out-of-sync per Index → lebt wie im
    // Wind, ohne vom Roulette abzulenken. Sway sitzt auf dem WRAPPER (rotate), die
    // Roulette-Skalierung bleibt auf dem inneren Element (getrennte transforms).
    const swayDur = (3.4 + (i % 3) * 0.55).toFixed(2);
    const swayDelay = (i * 0.31).toFixed(2);
    return (
      <div key={t.id} style={{
        transformOrigin: 'top center',
        animation: `qqBannerSway ${swayDur}s ease-in-out ${swayDelay}s infinite`,
        willChange: 'transform',
      }}>
        <div style={{
          position: 'relative',
          width: big ? 'clamp(64px, 8cqw, 132px)' : 'clamp(38px, 4.4cqw, 72px)',
          height: big ? 'clamp(112px, 13.6cqw, 224px)' : 'clamp(66px, 7.8cqw, 118px)',
          clipPath: 'polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%)',
          background: `linear-gradient(180deg, ${fc} 0%, ${fc}bb 80%, ${fc}66 100%)`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '0.7cqw',
          transformOrigin: 'top center', transform: `scale(${scale})`,
          filter: lit ? 'none' : 'grayscale(0.85) brightness(0.42)', opacity: lit ? 1 : 0.5,
          boxShadow: (locked && isChamp) ? `0 0 34px ${fc}, 0 0 78px ${fc}99` : (lit ? `0 0 20px ${fc}, 0 0 42px ${fc}88` : 'none'),
          transition: 'filter .08s linear, opacity .08s linear, transform .16s ease, box-shadow .2s ease, width .5s var(--qq-ease-smooth), height .5s var(--qq-ease-smooth)',
        }}>
          <QQTeamAvatar avatarId={t.avatarId} teamEmoji={qqMegaFactionSlug(t.avatarId)} size={big ? 'clamp(42px, 5.2cqw, 88px)' : 'clamp(24px, 2.9cqw, 46px)'} />
          {/* Glut: dezente Funken steigen an jeder Fahne auf (nur big-Phase). */}
          {big && lit && <span aria-hidden style={{ position: 'absolute', left: '50%', bottom: '8%', width: '0.5cqw', height: '0.5cqw', borderRadius: '50%', background: '#ffd591', boxShadow: `0 0 6px 2px ${fc}`, animation: `qqEmberRise ${(2.6 + (i % 4) * 0.4).toFixed(2)}s ease-out ${(i * 0.2).toFixed(2)}s infinite`, pointerEvents: 'none' }} />}
          {locked && isChamp && (
            <>
              <span aria-hidden style={{ position: 'absolute', top: '-2.2cqw', left: '50%', transform: 'translateX(-50%)', fontSize: 'clamp(16px, 2.1cqw, 32px)', lineHeight: 1, zIndex: 5, animation: 'qqBannerFlame 1.3s ease-in-out infinite' }}><QQEmojiIcon emoji="🔥" /></span>
              <span aria-hidden style={{ position: 'absolute', top: '42%', left: '50%', width: '2cqw', height: '2cqw', borderRadius: '50%', border: `0.35cqw solid ${fc}`, transform: 'translate(-50%,-50%) scale(0)', animation: 'qqShockRing 0.9s ease-out both', pointerEvents: 'none' }} />
            </>
          )}
        </div>
      </div>
    );
  };

  const podium = (t: any, place: 0 | 1 | 2) => {
    const isWin = place === 0;
    const blockH = place === 0 ? '24cqh' : place === 1 ? '17cqh' : '12cqh';
    const crestSz = isWin ? 'clamp(92px, 13.2cqw, 214px)' : 'clamp(62px, 9.6cqw, 152px)';
    const rankNum = place === 0 ? 1 : place === 1 ? 2 : 3;
    const delay = place === 1 ? '0s' : place === 2 ? '.12s' : '.3s';
    const ease = isWin ? 'cubic-bezier(.2,1.28,.35,1)' : 'cubic-bezier(.23,1,.32,1)';
    return (
      <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5cqh', animation: `qqPodRise ${isWin ? 0.84 : 0.7}s ${ease} ${delay} both`, willChange: 'transform, opacity' }}>
        {isWin && <img src="/icons/fx-trophy.png" alt="" aria-hidden draggable={false} style={{ width: 'clamp(34px, 3.4cqw, 60px)', height: 'auto', animation: 'finaleTrophyFloat 3.4s ease-in-out infinite', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.55))' }} />}
        <div style={{ position: 'relative', borderRadius: '50%', boxShadow: isWin ? `0 0 46px ${t.color}, 0 0 92px ${t.color}66` : `0 0 26px ${t.color}`, border: isWin ? '0.35cqw solid #f6d98a' : 'none' }}>
          <QQTeamAvatar avatarId={t.avatarId} teamEmoji={qqMegaFactionSlug(t.avatarId)} size={crestSz} />
        </div>
        <TeamNameLabel name={qqMegaFactionName(t.avatarId, de ? 'de' : 'en')} maxLines={1} shrinkAfter={12} color={t.color} fontWeight={900} fontSize={isWin ? 'clamp(22px, 3.2cqw, 48px)' : 'clamp(15px, 2cqw, 30px)'} fontSizeLong={isWin ? 'clamp(16px, 2.4cqw, 36px)' : 'clamp(12px, 1.6cqw, 22px)'} style={{ textShadow: '0 2px 8px rgba(0,0,0,.6)' }} />
        <div style={{ fontWeight: 900, color: t.color, fontVariantNumeric: 'tabular-nums', fontSize: isWin ? 'clamp(16px, 2.4cqw, 34px)' : 'clamp(13px, 1.7cqw, 24px)' }}>{t.largestConnected}</div>
        <div style={{ width: '15cqw', maxWidth: 240, height: blockH, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '1cqh', background: isWin ? 'linear-gradient(180deg, #4a381c, #1a1109)' : 'linear-gradient(180deg, #2b2540, #171223)', borderTop: isWin ? '0.35cqw solid #f6d98a' : place === 1 ? '0.3cqw solid #9ca3c4' : '0.3cqw solid #b08d6a' }}>
          <span style={{ fontWeight: 900, fontSize: 'clamp(20px, 3cqw, 44px)', color: 'rgba(255,255,255,0.82)' }}>{rankNum}</span>
        </div>
      </div>
    );
  };

  return (
    <div key="crown" data-qq-ceremony style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', color: '#f4f6ff' }}>
      {/* 2026-07-18 (Wolf bild 13): eigener Krönungs-BG „epic-moment" (zentraler
          Licht-Ausbruch, KEINE gemalten Banner → die Roulette-Fahnen fuellen den
          Screen ohne Kollision). Nur die Krönung; Award-Beats/Endstand behalten
          ihre BGs. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(/arena-bg/epic-moment.webp)', backgroundSize: 'cover', backgroundPosition: 'center', animation: 'brFadeIn 0.6s ease both' }} />
      {/* Arena dunkelt — auf dem busy epic-moment-BG staerker, damit Banner-Reihe +
          Text lesbar bleiben (der zentrale Licht-Ausbruch scheint gedaempft durch). */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse 96% 86% at 50% 46%, rgba(0,0,0,0.32), rgba(0,0,0,0.82))', animation: 'qqArenaDim 0.8s ease both' }} />
      {/* Kopf-Scrim: dunkelt das obere Band, wo die Roulette-Fahnen haengen. */}
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '40%', zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(6,4,14,0.62) 0%, rgba(6,4,14,0.18) 62%, transparent 100%)' }} />
      {showPodium && <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: `radial-gradient(ellipse 72% 56% at 50% 64%, ${wColor}44, transparent 62%)`, animation: 'qqArenaDim 1s ease both' }} />}
      {/* Fackeln flankieren */}
      <span aria-hidden style={{ position: 'absolute', left: '8%', bottom: '10%', fontSize: 'clamp(26px, 3.4cqw, 58px)', lineHeight: 1, zIndex: 3, animation: 'qqTorchFlicker 1.5s ease-in-out infinite' }}><QQEmojiIcon emoji="🔥" /></span>
      <span aria-hidden style={{ position: 'absolute', right: '8%', bottom: '10%', fontSize: 'clamp(26px, 3.4cqw, 58px)', lineHeight: 1, zIndex: 3, animation: 'qqTorchFlicker 1.5s ease-in-out 0.4s infinite' }}><QQEmojiIcon emoji="🔥" /></span>

      {/* Rod + 8 Wandbanner. Wolf 2026-07-16: vor dem Treppchen gross & etwas tiefer
          (zentraler Reveal-Moment), danach schrumpfen sie zur schlanken Kopf-Leiste. */}
      <div aria-hidden style={{ position: 'absolute', top: showPodium ? '4cqh' : '12cqh', left: '50%', transform: 'translateX(-50%)', width: '80cqw', maxWidth: 1320, height: 3, zIndex: 3, background: 'linear-gradient(90deg, transparent, rgba(214,190,120,0.5), transparent)', transition: 'top .5s var(--qq-ease-smooth)' }} />
      <div style={{ position: 'absolute', top: showPodium ? '4cqh' : '12cqh', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'flex-start', gap: showPodium ? 'clamp(6px, 1.3cqw, 18px)' : 'clamp(12px, 2.2cqw, 34px)', zIndex: 4, transition: 'top .5s var(--qq-ease-smooth), gap .5s var(--qq-ease-smooth)' }}>
        {banners.map((t, i) => bannerNode(t, i, !showPodium))}
      </div>

      {/* Weiß-Flash beim Einrasten */}
      {locked && <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 9, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.2) 42%, transparent 60%)', animation: 'qqFlashPulse 0.55s ease both' }} />}

      {/* Spannungstext während Roulette/Blink → beim Lock der GROSSE Sieger-Name
          (Wolf 2026-07-16: „es ist doch DER Reveal-Moment"). */}
      {!showPodium && (
        <div style={{ position: 'absolute', left: '50%', top: locked ? '62%' : '52%', transform: 'translate(-50%,-50%)', zIndex: 5, maxWidth: '86%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: 'var(--font-arena)',
          fontSize: locked ? 'clamp(30px, 5.2cqw, 96px)' : 'clamp(22px, 3.4cqw, 54px)', fontWeight: 900,
          color: locked ? wColor : '#f6d98a', letterSpacing: locked ? '-0.01em' : '0.04em',
          textShadow: locked ? `0 3px 14px rgba(0,0,0,0.85), 0 0 40px ${wColor}77` : '0 2px 10px rgba(0,0,0,0.8), 0 0 26px rgba(233,196,106,0.4)',
          animation: locked ? 'qqChampSlam 0.6s cubic-bezier(.2,1.28,.35,1) both' : 'qqTensionPulse 1.1s ease-in-out infinite', pointerEvents: 'none',
          transition: 'top .5s var(--qq-ease-smooth)' }}>
          {locked ? qqMegaFactionName(winner.avatarId, de ? 'de' : 'en') : (de ? 'Wer krönt sich?' : 'Who takes the crown?')}
        </div>
      )}

      {/* Treppchen + „Champions der Arena" + Konfetti */}
      {showPodium && (
        <>
          <ConfettiOverlay eurovisionMode={state.theme?.eurovisionMode} />
          {/* 2026-07-18 (Wolf bild 14 „Text ueberlappt mit dem Pokal"): Titel hoeher
              gesetzt (war 27cqh → traf den Pokal an der Spitze der Sieger-Saeule bei
              ~33cqh). Jetzt 18cqh mit klarem Abstand ueber dem Pokal. */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '18cqh', zIndex: 7, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ animation: 'qqChampSlam 0.7s cubic-bezier(.2,1.28,.35,1) 0.5s both', fontFamily: 'var(--font-arena)', fontSize: 'clamp(24px, 3.2cqw, 56px)', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f6d98a', textShadow: '0 2px 10px rgba(0,0,0,0.85), 0 0 26px rgba(233,196,106,0.45)', whiteSpace: 'nowrap' }}>
              {de ? 'Champions der Arena' : 'Arena Champions'}
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '2cqh', zIndex: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(8px, 1.4cqw, 24px)' }}>
            {top3[1] && podium(top3[1], 1)}
            {top3[0] && podium(top3[0], 0)}
            {top3[2] && podium(top3[2], 2)}
          </div>
        </>
      )}
      <style>{CEREMONY_KEYFRAMES}</style>
    </div>
  );
}

// ── GameOver-Siegerehrung: Award-Beats → Kolosseum-Krönung → Endstand ────────
// 2026-07-15 (Wolf): moderator-gesteuerte Zeremonie statt Auto-Timer. Steps
// (state.awardCeremonyStep, Backend qqAwardStep): 0..(n-1) = Special-Award-Beats
// (n = qqMegaAwardKeys), n = Krönung, n+1 = Endstand. Nur largeGroupMode.
export function LargeGroupGameOverView({ state }: { state: QQStateUpdate }) {
  const de = state.language !== 'en';
  const sorted = state.nestedTeams ? qqSortedGroups(state) : qqSortedTeams(state);
  const winner = sorted[0];
  const shown = sorted.slice(0, 10);
  const rest = sorted.length - shown.length;
  const maxVal = Math.max(1, ...shown.map(t => t.largestConnected));
  // Endstand-Zeilen-Pitch mit Cap (Audit-Fund 2026-07-19): war fest 62px OHNE Cap,
  // anders als CumulativeStandings:266. Reine Sicherheits-Bremse — die 8 Arena-
  // Fraktionen (nestedTeams) bleiben bei 62 (8*62=496 = akzeptiertes Baseline, Wolf
  // abgenommen), NUR der 9-10-Zeilen-Edge (nicht-genestet) komprimiert, damit unten
  // nichts aus der Bühne/dem Frosted-Panel läuft. Am Beamer ggf. GO_LIST_BUDGET tunen.
  const GO_ROW_H = 62;
  const GO_LIST_BUDGET = 8 * GO_ROW_H; // 496px = Höhe der akzeptierten 8-Zeilen-Liste
  const rowPitch = Math.min(GO_ROW_H, Math.floor(GO_LIST_BUDGET / Math.max(1, shown.length)));
  const wColor = winner?.color ?? '#EC4899';
  const motto = winner ? qqMegaFactionMotto(winner.avatarId, de ? 'de' : 'en') : '';

  // Zeremonie-Step (geklemmt spiegelbildlich zum Backend).
  const awardKeys = qqMegaAwardKeys(state.megaAwards);
  const nAwards = awardKeys.length;
  const crownStep = nAwards;
  const standingsStep = nAwards + 1;
  const step = Math.max(0, Math.min(standingsStep, state.awardCeremonyStep ?? 0));

  // Sound je Beat: Award-Reveal-Sting pro Award, Champion-Fanfare + Wolf-Howl
  // bei der Krönung. Nur bei tatsächlichem Step-Wechsel + nicht gemutet.
  const lastBeatRef = useRef<number>(-1);
  useEffect(() => {
    if (step === lastBeatRef.current) return;
    const prev = lastBeatRef.current;
    lastBeatRef.current = step;
    if ((state as any).sfxMuted) return;
    if (prev < 0) return; // Mount: kein Sound (Reload-Schutz)
    try {
      // Krönungs-Fanfare läuft jetzt in MegaCrownCeremony beim Einrasten des
      // Roulettes (nicht beim Step-Wechsel) → hier nur noch der Award-Sting.
      if (step < crownStep) playSpecialAwardReveal();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── BG-Roulette der Special-Award-Beats (Wolf bild 12 „der Hintergrund koennte
  //    durchwechseln und auf dem richtigen Gewinner-Team stehen bleiben"): die
  //    Fraktions-Szene-BGs wechseln beim Reveal schnell durch (deceleriert) und
  //    rasten ~1s synchron zur Wappen-Enthuellung auf der Award-Gewinner-Fraktion
  //    ein (Award-Sieger-Farbflut blueht dann auf). Hook laeuft unbedingt (auch in
  //    Kroenung/Endstand — Ergebnis dort ungenutzt). ──────────────────────────────
  const awardBeatBg = (step < crownStep && state.megaAwards)
    ? megaAwardBeat(awardKeys[step], state.megaAwards, de) : null;
  const awardWinSlug = awardBeatBg ? (qqMegaFactionSlug(awardBeatBg.av) ?? COZY_ARENA_CREST_SLUGS[0]) : null;
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [awardBgSlug, setAwardBgSlug] = useState<string>(COZY_ARENA_CREST_SLUGS[0]);
  const [awardBgLocked, setAwardBgLocked] = useState<boolean>(false);
  useEffect(() => {
    if (!awardWinSlug) return;
    if (reduceMotion) { setAwardBgSlug(awardWinSlug); setAwardBgLocked(true); return; }
    setAwardBgLocked(false);
    setAwardBgSlug(COZY_ARENA_CREST_SLUGS[step % COZY_ARENA_CREST_SLUGS.length]);
    const N = 12; // Wechsel, wachsende Intervalle (ease-out) → Landung ~1.0s
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    for (let k = 0; k < N; k++) {
      const p = k / (N - 1);
      t += 45 + p * p * 165; // 45 → ~210ms
      const slug = k === N - 1 ? awardWinSlug : COZY_ARENA_CREST_SLUGS[(k + step + 1) % COZY_ARENA_CREST_SLUGS.length];
      timers.push(setTimeout(() => { setAwardBgSlug(slug); if (k === N - 1) setAwardBgLocked(true); }, t));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, awardWinSlug]);

  // ── Beat 0..n-1: Special-Award-Spotlight ───────────────────────────────────
  if (step < crownStep && state.megaAwards) {
    const beat = megaAwardBeat(awardKeys[step], state.megaAwards, de);
    const color = AVA_BY_ID.get(beat.av)?.color ?? '#EC4899';
    const name = qqMegaFactionName(beat.av, de ? 'de' : 'en');
    return (
      <div key={`award-${step}`} data-qq-ceremony style={{ ...S.goWrap, justifyContent: 'center', gap: 'clamp(8px, 1.5cqh, 20px)' }}>
        {/* 2026-07-16 (Wolf bild 6 'neuer background'): jeder Award-Beat zeigt den
            eigenen Arena-Hintergrund der Gewinner-Fraktion + Scrim statt des generischen
            Feuerwerk-BGs — pro Award anders, farblich passend zur enthuellten Fraktion.
            2026-07-16 (Wolf 'ich mache neue Breitbild-Award-BGs'): ZWEI Layer — oben das
            dedizierte 16:9-Award-BG (`award-<slug>.webp`), darunter als Fallback das
            bestehende `faction-<slug>.webp` (auch auf der Handy-Seite genutzt). Fehlt das
            Award-BG (noch nicht geliefert), 404t Layer 1 transparent → Fallback scheint
            durch. Sobald Wolf die award-*.webp liefert, greifen sie automatisch. */}
        {/* Roulette-BG (Wolf bild 12): waehrend des Spins schnelle harte Wechsel
            durch die Fraktions-Szenen (der Scrim daempft das Flackern), beim
            Einrasten auf dem Sieger ein weicher Settle-Puls. Zwei Layer: dediziertes
            award-<slug>.webp (falls vorhanden) ueber faction-<slug>.webp. */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `url(/arena-bg/award-${awardBgSlug}.webp), url(/arena-bg/faction-${awardBgSlug}.webp)`, backgroundSize: 'cover, cover', backgroundPosition: 'center, center', backgroundRepeat: 'no-repeat, no-repeat', filter: awardBgLocked ? 'none' : 'brightness(1.07)', animation: awardBgLocked ? 'qqAwardBgSettle 0.6s var(--qq-ease-out-cubic) both' : undefined }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(8,6,16,0.64) 0%, rgba(8,6,16,0.44) 30%, rgba(8,6,16,0.5) 66%, rgba(8,6,16,0.8) 100%)' }} />
        {/* Sieger-Farbflut blueht erst beim Einrasten auf. */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 72% 60% at 50% 46%, ${color}33 0%, transparent 62%)`, opacity: awardBgLocked ? 1 : 0, transition: 'opacity 0.55s ease' }} />
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Label in Silber — Gold bleibt exklusiv der Champion-Krönung. */}
          <div style={{ fontSize: 'clamp(12px, 1.4cqw, 20px)', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c7cede' }}>
            {(de ? 'Auszeichnung' : 'Special award')} {step + 1} / {nAwards}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {awardKeys.map((_, i) => (
              <span key={i} aria-hidden style={{ width: i === step ? 24 : 9, height: 9, borderRadius: 999, background: i === step ? color : (i < step ? `${color}99` : 'rgba(255,255,255,0.18)'), transition: 'width .3s ease, background .3s ease' }} />
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 5, animation: 'qqAwardIconPop 0.6s cubic-bezier(0.2,1.3,0.4,1) both' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, display: 'inline-flex' }}>
            <QQIcon slug={beat.slug} size={'clamp(72px, 8.8cqw, 138px)'} />
            <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 34%, rgba(255,255,255,0.5) 50%, transparent 66%)', transform: 'translateX(-130%)', animation: 'qqAwardShine 1.1s ease 0.5s both' }} />
          </div>
        </div>
        {/* Titel + Leistung ZUERST — dann (nach kurzer Pause) die Enthüllung. */}
        <div style={{ position: 'relative', zIndex: 5, fontFamily: 'var(--font-arena)', fontSize: 'clamp(24px, 3.6cqw, 54px)', fontWeight: 900, textAlign: 'center', color: '#f4f6ff', animation: 'qqCrownFadeUp 0.5s ease 0.2s both' }}>{beat.title}</div>
        <div style={{ position: 'relative', zIndex: 5, fontSize: 'clamp(15px, 1.9cqw, 28px)', fontWeight: 800, color: '#cbd5e1', animation: 'qqCrownFadeUp 0.5s ease 0.42s both' }}>{beat.stat}</div>
        {/* Enthüllung: das Banner der Gewinnerfraktion entrollt sich (gleiche
            Banner-Geste wie in der Krönung), Wappen + Name fahren ein. */}
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.6cqw, 24px)', animation: 'qqAwardDriveIn 0.7s cubic-bezier(0.2,1,0.4,1) 1.05s both' }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <div aria-hidden style={{ position: 'absolute', top: '-8%', left: '50%', width: 'clamp(64px, 6.8cqw, 116px)', height: 'clamp(84px, 10.5cqh, 150px)', transform: 'translateX(-50%)', background: `linear-gradient(180deg, ${color}f0, ${color}88 82%, ${color}44)`, clipPath: 'polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%)', transformOrigin: 'top center', animation: 'qqBannerUnfurl 0.7s cubic-bezier(0.2,1,0.3,1) 1.0s both', boxShadow: `0 12px 40px ${color}55`, zIndex: -1 }} />
            <div style={{ position: 'relative', borderRadius: '50%', boxShadow: `0 0 44px ${color}88, 0 0 90px ${color}44` }}>
              <QQTeamAvatar avatarId={beat.av as QQTeam['avatarId']} teamEmoji={qqMegaFactionSlug(beat.av)} size={'clamp(66px, 7.4cqw, 116px)'} />
              {AWARD_SPARKS.map((sp, i) => (
                <span key={i} aria-hidden style={{ position: 'absolute', top: sp.top, left: sp.left, fontSize: sp.size, lineHeight: 1, color, textShadow: `0 0 10px ${color}, 0 0 4px rgba(255,255,255,0.6)`, animation: `finaleSparklePop ${sp.dur}s ease-in-out ${1.5 + sp.delay}s infinite`, pointerEvents: 'none', zIndex: 6 }}>✦</span>
              ))}
            </div>
          </div>
          <TeamNameLabel name={name} maxLines={1} shrinkAfter={14} color={color} fontWeight={900} fontSize="clamp(26px, 3.6cqw, 56px)" fontSizeLong="clamp(19px, 2.7cqw, 42px)" style={{ textShadow: `0 0 40px ${color}66` }} />
        </div>
        {/* Award-Bonus (Wolf 2026-07-16): jede Auszeichnung gibt der Fraktion Punkte
            (zaehlen zum Endstand + zur Kroenung). Pille in Fraktionsfarbe (Gold bleibt
            der Champion-Kroenung vorbehalten), erscheint nach der Enthuellung. */}
        <div style={{ position: 'relative', zIndex: 5, animation: 'qqCrownFadeUp 0.5s ease 1.5s both' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 'clamp(4px,0.6cqh,9px) clamp(14px,1.5cqw,24px)', borderRadius: 999, background: `${color}26`, border: `2px solid ${color}99`, color: '#fff', fontWeight: 900, fontSize: 'clamp(17px, 2.1cqw, 32px)', boxShadow: `0 0 24px ${color}44`, fontVariantNumeric: 'tabular-nums' }}>
            +{QQ_MEGA_AWARD_BONUS} {de ? 'Punkte' : 'points'}
          </span>
        </div>
        <style>{CEREMONY_KEYFRAMES}</style>
      </div>
    );
  }

  // ── Beat n: Kolosseum-Krönung (Höhepunkt) ──────────────────────────────────
  // Banner-Roulette → Blink → Treppchen (eigener Component wegen Timing-State).
  if (step === crownStep && winner) {
    return <MegaCrownCeremony state={state} sorted={sorted} winner={winner} wColor={wColor} de={de} />;
  }

  // ── Beat n+1: Endstand (Bar-Race-Standings) ────────────────────────────────
  return (
    <div data-qq-ceremony style={{ ...S.goWrap, animation: 'brFadeIn 0.5s ease both' }}>
      {/* 2026-07-18 (Wolf bild 15 „Tabelle nicht gut erkennbar"): Scrim ueber der
          busy award-ceremony-Halle → „Spielende"-Titel, Hero und Tabelle lesbar. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(6,4,14,0.58) 0%, rgba(6,4,14,0.34) 26%, rgba(6,4,14,0.52) 62%, rgba(6,4,14,0.74) 100%)' }} />
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

      {/* Kontrast-Panel (Wolf bild 15): Frosted-Glass hinter der Tabelle → die
          Zeilen sitzen auf konsistentem dunklem Grund statt ueber der busy Halle. */}
      <div style={{
        position: 'relative', zIndex: 5, width: '100%', maxWidth: 1080, marginTop: 6,
        background: 'rgba(10,8,22,0.60)', borderRadius: 26, border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' as any,
        padding: 'clamp(12px,1.6cqh,22px) clamp(18px,2.2cqw,38px)',
      }}>
      <div style={{ position: 'relative', width: '100%', height: shown.length * rowPitch }}>
        {shown.map((t, i) => {
          const pct = (t.largestConnected / maxVal) * 100;
          const medal = i < 3 && t.largestConnected > 0 ? MEDALS[i] : null;
          return (
            <div key={t.id} style={{ ...S.goRow, top: i * rowPitch }}>
              {/* Endstand-Liste: keine Krone (#1 traegt schon 🥇 in der Einheit-
                  Spalte; der Champion wird im Kroenungs-Beat + Hero gefeiert). */}
              <span style={S.goRank}>{i + 1}</span>
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
      {rest > 0 && <div style={{ ...S.goRest, marginTop: 8 }}>+ {rest} {de ? 'weitere Fraktionen' : 'more factions'}</div>}
      </div>
      {/* Fraktions-Award-Leiste raus (Wolf 2026-07-16): die Awards werden in den
          Award-Beats der Zeremonie einzeln zelebriert → im Endstand redundant +
          von weitem unlesbar. MegaAwardsStrip bleibt für Summary/Recap. */}
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

  // Akt 3 Beat A „Wertung dieser Frage" — sitzt IN der gemalten Tafel (MEGA_BOARD).
  // 2026-07-17: Padding-Nudges raus, Ueberschrift raus (Wolf). Die Tafel selbst ist
  // die Ueberschrift; der Inhalt fuellt sie jetzt exakt statt ungefaehr.
  qrWrap: { position: 'absolute', left: MEGA_BOARD.insetX, right: MEGA_BOARD.insetX, top: MEGA_BOARD.top, bottom: MEGA_BOARD.bottom, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f4f6ff', animation: 'brFadeIn 0.4s ease both', overflow: 'hidden' },
  qrList: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%' },
  qrRow: { display: 'flex', alignItems: 'center', gap: 20, padding: '10px 22px', borderRadius: 16, background: 'rgba(10,8,24,0.55)' },
  qrRank: { width: 52, textAlign: 'center', fontWeight: 900, fontSize: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  qrPts: { fontWeight: 900, fontSize: 42, minWidth: 116, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  podium: { display: 'flex', flexDirection: 'column', gap: 14 },
  podRow: { display: 'flex', alignItems: 'center', gap: 22, padding: '10px 22px', borderRadius: 18, background: 'rgba(255,255,255,0.05)' },
  podMedal: { fontSize: 44, width: 56, textAlign: 'center', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  podPts: { fontWeight: 900, fontSize: 46, minWidth: 90, textAlign: 'right' },
  alsoWrap: { marginTop: 10 },
  alsoLabel: { fontSize: 20, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800 },
  alsoRow: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  alsoChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  goWrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 48px', color: '#f4f6ff', position: 'relative', overflow: 'hidden' },
  goLabel: { fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9, fontWeight: 900, color: '#e7e2f4', textShadow: '0 2px 8px rgba(0,0,0,0.85)', position: 'relative', zIndex: 5 },
  goHero: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 5 },
  goWinPts: { fontWeight: 900, fontSize: 'clamp(16px, 1.7cqw, 24px)', textShadow: '0 2px 10px rgba(0,0,0,0.8)' },
  goRow: { position: 'absolute', left: 0, right: 0, height: 54, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', borderRadius: 14, background: 'rgba(255,255,255,0.045)' },
  goRank: { width: 48, textAlign: 'center', fontWeight: 900, fontSize: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  goBarTrack: { flex: 1, height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 999, position: 'relative', overflow: 'hidden' },
  goVal: { width: 74, textAlign: 'right', fontWeight: 900, fontSize: 32, fontVariantNumeric: 'tabular-nums' },
  goUnit: { width: 52, textAlign: 'left', fontSize: 18, fontWeight: 700, opacity: 0.55, display: 'inline-flex', alignItems: 'center' },
  goRest: { fontSize: 20, fontWeight: 700, opacity: 0.5, position: 'relative', zIndex: 5 },
  // Gesamtstand: exakt dieselbe Tafel-Box wie qrWrap (ein Muster, zwei Beats).
  standWrap: { position: 'absolute', left: MEGA_BOARD.insetX, right: MEGA_BOARD.insetX, top: MEGA_BOARD.top, bottom: MEGA_BOARD.bottom, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#f4f6ff', overflow: 'hidden' },
  standRest: { fontSize: 22, fontWeight: 700, opacity: 0.5 },
  standRow: { position: 'absolute', left: 0, right: 0, height: STANDINGS_ROW_H - 12, display: 'flex', alignItems: 'center', gap: 20, padding: '0 22px', borderRadius: 16, background: 'rgba(10,8,24,0.55)' },
  standRank: { width: 60, textAlign: 'center', fontWeight: 900, fontSize: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  standBarTrack: { flex: 1, height: 32, background: 'rgba(255,255,255,0.06)', borderRadius: 999, position: 'relative', overflow: 'visible' },
  standVal: { width: 132, textAlign: 'right', fontWeight: 900, fontSize: 40, fontVariantNumeric: 'tabular-nums' },
  standUnit: { width: 60, textAlign: 'left', fontSize: 22, fontWeight: 700, opacity: 0.55, display: 'inline-flex', alignItems: 'center' },
};
