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
import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import type { QQTeam, QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { qqAwardPoints, qqCozyPoints, qqFinalTotal } from '../utils/qqFinalScore';
import { prefersReducedMotion } from '../utils/reducedMotion';
import { QQTeamAvatar } from './QQTeamAvatar';
import { useAvatarSet } from '../avatarSetContext';
import { isQuirkTileSet } from '../quirks2Avatars';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon } from './QQIcon';
import { qqLargestClusterCells, type ClusterKachel } from '../utils/qqLargestCluster';
import { qqTowerAwardBeats, type QQTowerAwardBeat } from '../../../shared/qqFinalReveal';
import { getActiveThemeId, BUEHNE_THEME_ID } from '../qqTheme';
import { holeBrettQuelle, vergissBrettQuelle } from '../qqBrettUebergabe';
import {
  playWoodKnock, playClimaxFinish, playFanfare, playTick, playReveal, playSpecialAwardReveal,
} from '../utils/sounds';

export type TowerTeam = { team: QQTeam; base: number };
/**
 * Das Brett, aus dem die Tuerme gebaut werden.
 * `kachelnProTeam` sind die Felder des GROESSTEN Gebiets - nur die fliegen,
 * siehe utils/qqLargestCluster.ts.
 */
export type TowerBrett = {
  groesse: number;
  kachelnProTeam: Record<string, ClusterKachel[]>;
  /** Belegte Felder, die zu KEINEM groessten Gebiet gehoeren. Sie fliegen nicht. */
  streu: Array<{ r: number; c: number; ownerId: string }>;
};
export type TowerAward = { key: string; label: string; labelEn?: string; emoji: string; teamId: string; bonus: number };

// Mapping State → Turm-Daten (Live-Wiring): base = Quiz-Cluster + Bet-Bonus
// (also OHNE Award-Punkte), Awards separat aus endAwards mit echten Werten
// (Underdog +2, Speedy/Meisterklauer +1). Underdog zuletzt (= +2-Climax, wie die
// bestehende Award-Dramaturgie). Score bleibt identisch zu qqFinalTotal — die
// Awards zaehlen weiter, nur ihre PRAESENTATION wandert in den Turm.
export function buildTowerFinaleData(s: QQStateUpdate): { teams: TowerTeam[]; awards: TowerAward[]; brett: TowerBrett } {
  const ap = qqAwardPoints(s);
  const cp = qqCozyPoints(s);
  // Der Sockel ist alles, was NICHT als eigener Baustein einfliegt: Brett und
  // Wetten-Bonus. Awards und CozyGame-Punkte kommen als Steine dazu, sonst
  // zaehlten sie doppelt.
  const teams: TowerTeam[] = s.teams.map(t => ({
    team: t,
    base: qqFinalTotal(s, t.id, ap) - (ap[t.id] ?? 0) - (cp[t.id] ?? 0),
  }));
  // 2026-08-25 (Wolf: „sie kommen bei der siegerehrung dazu wie die awards"):
  // die CozyGame-Punkte laufen zuerst ein, ein Beat je Team mit Siegen. Sie
  // sind der bekannte Teil - der Saal hat die Spiele gesehen -, die Awards
  // danach sind die Ueberraschung. Ein Award ist es NICHT: kein Bonus obendrauf,
  // nur die gewonnenen Siege als Bausteine.
  //
  // WELCHE Bausteine es sind und in welcher Reihenfolge, entscheidet
  // `qqTowerAwardBeats` in shared. Hier stand das frueher noch einmal, und
  // genau daran ist es auseinandergelaufen: der Turm baute CozyGame-Bausteine,
  // die das Step-Mapping nicht kannte, und die Kroenung schob sich vor die
  // Enthuellung des Siegers. Hier bleibt nur, wie ein Beat AUSSIEHT.
  const AUFSCHRIFT: Record<QQTowerAwardBeat['kind'], { label: string; labelEn: string; emoji: string }> = {
    cozy:          { label: 'CozyGames',       labelEn: 'CozyGames',       emoji: '🎡' },
    speedy:        { label: 'Speedy Gonzales', labelEn: 'Speedy Gonzales', emoji: '⚡' },
    meisterklauer: { label: 'Meisterklauer',   labelEn: 'Master Thief',    emoji: '🪙' },
    underdog:      { label: 'Underdog',        labelEn: 'Underdog',        emoji: '🍀' },
  };
  const awards: TowerAward[] = qqTowerAwardBeats(
    s.teams.map(t => t.id), s.endAwards, s.cozyGameWins,
  ).map(b => ({ key: b.key, teamId: b.teamId, bonus: b.bonus, ...AUFSCHRIFT[b.kind] }));
  const groesse = s.gridSize ?? 0;
  const kachelnProTeam = qqLargestClusterCells(s.grid, groesse);
  const imGebiet = new Set<string>();
  for (const liste of Object.values(kachelnProTeam)) for (const k of liste) imGebiet.add(`${k.r}:${k.c}`);
  const streu: TowerBrett['streu'] = [];
  for (let r = 0; r < groesse; r++) {
    for (let c = 0; c < groesse; c++) {
      const owner = s.grid?.[r]?.[c]?.ownerId;
      if (owner && !imGebiet.has(`${r}:${c}`)) streu.push({ r, c, ownerId: owner });
    }
  }
  const brett: TowerBrett = { groesse, kachelnProTeam, streu };
  return { teams, awards, brett };
}

const STAGE_W = 1760;
const STAGE_H = 990;
// ── Der Takt des Brettfalls ────────────────────────────────────────────────
// Modulweit, weil der Autoplay im Steuerpult ihn braucht: er muss wissen, wie
// lange Beat 0 laeuft, sonst schaltet er mitten hinein weiter. Vorher stand
// dort eine eigene Rechnung mit eigenen Zahlen, und genau so faellt beim
// naechsten Umbau der Zwischenstand wieder weg.
const WELLE = 460;         // Abstand zwischen zwei Brettzeilen
const FLUG = 950;          // Flugdauer einer Kachel
const SPALTEN_VERZUG = 48; // Versatz je Spalte innerhalb einer Zeile

/**
 * Wie lange der Beat 0 des Turm-Finales am Stueck laeuft: Brett steht,
 * Brett faellt, Sockel wachsen nach, Zwischenstand.
 *
 * `mitUebergabe` heisst: das Brett ist von der Tipp-Folie hereingefahren
 * (siehe `qqBrettUebergabe`), dann steht es laenger still, bevor es faellt.
 */
export function qqTurmBeatDauer(gridSize: number, mitUebergabe = true): number {
  const halt = mitUebergabe ? 1180 : 900;
  const landeVerzug = Math.ceil((FLUG + SPALTEN_VERZUG * 7) / WELLE);
  const wellen = Math.max(0, gridSize - 1) + landeVerzug + 1;
  // Der Sockelbau danach faengt dort an, wo das Brett aufgehoert hat; sein
  // Rest ist grosszuegig geschaetzt, er haengt am Vorsprung der Teams.
  return halt + wellen * WELLE + FLUG + 1500;
}

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

export function TowerFinaleV2({ teams, awards, brett, lang, liveBeat, tieBreakerWinnerId }: {
  teams: TowerTeam[]; awards: TowerAward[]; lang: 'de' | 'en';
  /** 2026-08-24 „Das Brett faellt": ohne diese Daten laeuft der alte Vorspann. */
  brett?: TowerBrett;
  // Hybrid-Live-Steuerung: wenn gesetzt, gaten die Auto-Play-Uebergaenge an den
  // Beat-Grenzen auf diesen (Moderator-getriebenen) Wert. Beats:
  //   0 = Aufbau + Zwischenstand · 1..A = Award i · A+1 = Glide (Top 3) ·
  //   A+2..A+4 = Enthuellung Platz 3/2/1. Ohne Prop = Auto-Play (Preview).
  liveBeat?: number;
  // 2026-07-27 (Audit): aufgeloester Stechen-Sieger — wird beim Ranking auf Rang 1
  // gezogen, damit Beamer-Turm und Handy-GameOver-Karte denselben Sieger kroenen.
  tieBreakerWinnerId?: string | null;
}) {
  const de = lang === 'de';
  const reduce = prefersReducedMotion();
  // 2026-08-23 (Uebergabe 2a): die Buehne wird benannt, nicht ueber isThemed()
  // umschrieben - darunter fallen auch Studio Mono, Soft Pop und Neo-Brutalism.
  const istBuehne = getActiveThemeId() === BUEHNE_THEME_ID;
  // Cozy Quirks: eckige Kachel → Avatar-Discs quadratisch (Team-Farbe = Kachel),
  // keine runde Coin um den Avatar. Sieger-Glow bleibt.
  const quirkSet = isQuirkTileSet(useAvatarSet());
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
  // 2026-08-23 (Wolf: „die kacheln fuer sonderpreise ist ein stern? ist das
  // extra?"). Der Stern war Absicht, aber die schwaechere Loesung: er sagt nur
  // DASS es ein Award war, nicht WELCHER. Die drei Awards haben eigene Zeichen
  // im gelieferten Set - Blitz, Muenze, Kleeblatt - und die stehen zwei Minuten
  // vorher gross auf der Award-Karte. Wer sie dort gesehen hat, erkennt sie im
  // Turm wieder, und die Tuerme erzaehlen dann, WOFUER die Punkte kamen.
  // Ein Award mit bonus 2 (Underdog) belegt zwei Bausteine, deshalb aufgefaltet.
  const awardZeichenProTeam = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const a of awards) {
      const liste = m[a.teamId] ?? (m[a.teamId] = []);
      for (let i = 0; i < a.bonus; i++) liste.push(a.emoji);
    }
    return m;
  }, [awards]);

  const finalRanking = useMemo(() => [...teams].sort((a, b) => {
    // 2026-07-27 (Audit): identische Sieger-Logik wie qqFinalSortedTeams (Handy):
    // Stechen-Sieger auf Rang 1, dann Gesamt-Score, dann totalCells, dann Name.
    // Vorher (base DESC → name) ignorierte tieBreakerWinnerId + wich vom Handy ab.
    if (tieBreakerWinnerId) {
      if (a.team.id === tieBreakerWinnerId && b.team.id !== tieBreakerWinnerId) return -1;
      if (b.team.id === tieBreakerWinnerId && a.team.id !== tieBreakerWinnerId) return 1;
    }
    return (totalOf(b.team.id) - totalOf(a.team.id))
      || ((b.team.totalCells ?? 0) - (a.team.totalCells ?? 0))
      || a.team.name.localeCompare(b.team.name);
  }), [teams, totalOf, tieBreakerWinnerId]);
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

  // ── „Das Brett faellt" ────────────────────────────────────────────────────
  //
  // 2026-08-23 mit Wolf besprochen und bewusst vertagt, damit die Flugbahn nicht
  // auf den alten Look gebaut wird; 2026-08-24 gebaut.
  //
  // Vorher verschwand das Brett in dem Moment, in dem das Finale begann, und
  // wurde durch acht abstrakte Saeulen ersetzt. Der Turm sagte „vier", aber
  // nicht mehr WELCHE vier - der Gegenstand, an dem der ganze Abend haengt,
  // wurde weggeraeumt, kurz bevor er sich auszahlt. Und der Vorspann davor
  // waren drei Sekunden leere Buehne.
  //
  // Jetzt: das Brett steht, die Kacheln loesen sich zeilenweise von unten nach
  // oben und fliegen in die Spalte ihres Teams, wo sie sich zum Turm stapeln.
  // Der Turm wird AUS dem Brett gebaut, nicht daneben.
  //
  // Es fliegen nur die Kacheln des GROESSTEN GEBIETS (qqLargestCluster). Das ist
  // keine Vereinfachung, sondern die Wahrheit: die Turmhoehe IST das groesste
  // zusammenhaengende Gebiet. Wuerden alle Kacheln fliegen, waere der Turm am
  // Ende niedriger als die Zahl der geflogenen Kacheln. So herum erzaehlt die
  // Bewegung sogar die Regel mit - die verstreuten Felder bleiben liegen und
  // verblassen, nur das zusammenhaengende Gebiet steigt auf.
  //
  // Bildrate: das war das einzige echte Risiko (bis zu 64 Kacheln). Deshalb
  // laufen die Fluege in WELLEN, eine Brettzeile pro Welle, und jede Kachel
  // fliegt als reine CSS-Transform mit eigener Verzoegerung. In der Luft sind
  // damit hoechstens zwei Zeilen gleichzeitig, also rund sechzehn Kacheln, und
  // der Browser komponiert sie auf der GPU statt sie neu zu setzen.
  // Kommt das Brett von der Tipp-Folie herangefahren? Das muss beim ERSTEN Bild
  // feststehen, nicht erst im Layout-Effekt: `BRETT_HALT` steckt in den
  // Verzoegerungen von rund siebzig CSS-Animationen. Wuerde sich der Wert nach
  // dem ersten Bild aendern, schriebe React neue Verzoegerungen, und alle
  // Animationen fingen sichtbar von vorne an.
  const [uebergabe] = useState(() => (prefersReducedMotion() ? null : holeBrettQuelle()));
  // Das Brett steht noch einmal still. Nach einer Uebergabe laenger: es ist
  // gerade erst angekommen, und ein Gegenstand, der im selben Moment ankommt
  // und zerfaellt, hat nie dagestanden.
  const BRETT_HALT = uebergabe ? 1180 : 900;
  // 2026-08-25 (Wolf: „koennten die kacheln noch etwas smoother fliegen
  // langsamer epischer und weniger linear? ... der absink moment aus dem grid
  // soll episch sein"). Der Takt ist deshalb langsamer geworden: eine Zeile
  // alle 460 statt 380 ms, ein Flug 950 statt 620 ms. Dazu faellt eine Zeile
  // nicht mehr am Stueck, sondern von links nach rechts durch (`SPALTEN_VERZUG`).
  //
  // ⚠️ Die drei Zahlen haengen zusammen. Der Baustein im Turm erscheint, wenn
  // `gelandet()` die Kachel zaehlt, also LANDE_VERZUG Wellen nach dem Start.
  // Diese Zeitspanne muss laenger sein als Flug PLUS Spaltenverzug, sonst steht
  // der Baustein da, waehrend die Kachel noch fliegt - man saehe sie doppelt.
  //   3 * 460 = 1380 ms  gegen  950 + 7 * 48 = 1286 ms.  Passt.
  const LANDE_VERZUG = Math.ceil((FLUG + SPALTEN_VERZUG * 7) / WELLE);
  // Die Uebergabe von der Tipp-Folie (siehe unten, `uebergabe`). Bewusst
  // dieselbe Dauer wie ein Kachelflug: es ist dieselbe Bewegung in gross, und
  // zwei verschiedene Tempi fuer denselben Gegenstand lesen sich als zwei
  // verschiedene Gegenstaende. Sie muss ausserdem VOR BRETT_HALT fertig sein,
  // sonst startet die erste Welle, waehrend das Brett noch faehrt - dann
  // fliegen die Kacheln in einen Turm, der gerade noch verschoben ist.
  const UEBERGABE = 620;

  // ── Choreo ────────────────────────────────────────────────────────────────
  const brettAktiv = !!brett && brett.groesse > 0 && Object.keys(brett.kachelnProTeam).length > 0 && !reduce;
  const [phase, setPhase] = useState<'intro' | 'brett' | 'base' | 'baseHold' | 'award' | 'reveal'>(
    reduce ? 'reveal' : (brettAktiv ? 'brett' : 'intro'));
  const [brettWelle, setBrettWelle] = useState(0);
  const [baseTick, setBaseTick] = useState(reduce ? maxTotal : 0);
  const [awardIdx, setAwardIdx] = useState(reduce ? awards.length : 0);
  const [awardStage, setAwardStage] = useState<'card' | 'grow'>('card');
  const [awardTick, setAwardTick] = useState(0);
  const [revealStep, setRevealStep] = useState(reduce ? 3 : 0); // 0 = niemand, 1..3 = Platz 3..1
  const [glided, setGlided] = useState(reduce); // Top-3 in der Mitte (nach Recede-Beat)
  // 2026-07-31 (Wolf 'das kopf an kopf unter der top 3 muss spannender
  // choreografiert werden'): die Top-3 fallen beim Glide auf null zurueck und
  // bauen GLEICHZEITIG neu auf. Namen und Farben sind dabei offen — das
  // Ratespiel „wer steckt hinter der grauen Saeule" war der schwache Teil.
  // Die Spannung kommt stattdessen daher, dass niemand die Zielhoehen kennt:
  // man sieht drei Tuerme klettern und weiss nicht, wann welcher stehenbleibt.
  // Wer zuerst stoppt, ist Dritter. Der Letzte waechst allein weiter.
  const [duelTick, setDuelTick] = useState(reduce ? Number.MAX_SAFE_INTEGER : 0);
  // Ist der Dritte schon abgetreten? Siehe die Geometrie der Finalisten weiter
  // unten. Bei abgeschalteter Bewegung tritt niemand ab: dort gibt es kein
  // Wettklettern, und ein verschwundener Turm waere dann nur ein fehlender.
  const [dritterWeg, setDritterWeg] = useState(false);

  /**
   * Der Flugplan. Pro Team seine Gebiets-Kacheln in LANDEREIHENFOLGE: unterste
   * Brettzeile zuerst, innerhalb einer Zeile von links nach rechts. Damit
   * landet die Kachel, die am Brett unten lag, auch im Turm unten - der Stapel
   * behaelt die Ordnung des Bretts, statt sie zu wuerfeln.
   */
  const flugplan = useMemo(() => {
    if (!brett) return {} as Record<string, Array<ClusterKachel & { welle: number; platz: number }>>;
    const m: Record<string, Array<ClusterKachel & { welle: number; platz: number }>> = {};
    for (const [id, kacheln] of Object.entries(brett.kachelnProTeam)) {
      const sortiert = [...kacheln].sort((x, y) => (y.r - x.r) || (x.c - y.c));
      m[id] = sortiert.map((k, i) => ({ ...k, welle: (brett.groesse - 1) - k.r, platz: i }));
    }
    return m;
  }, [brett]);

  /** Belegte Felder ausserhalb der groessten Gebiete - sie bleiben liegen. */
  const streuRest = brett?.streu ?? [];

  const letzteWelle = useMemo(() => {
    let m = 0;
    for (const liste of Object.values(flugplan)) for (const k of liste) m = Math.max(m, k.welle);
    return m;
  }, [flugplan]);

  /** Wie viele Kacheln dieses Teams sind schon GELANDET? */
  const gelandet = useCallback((id: string) => {
    const liste = flugplan[id];
    if (!liste) return 0;
    let n = 0;
    for (const k of liste) if (k.welle <= brettWelle - LANDE_VERZUG) n++;
    return n;
  }, [flugplan, brettWelle, LANDE_VERZUG]);

  const hasAwards = awards.length > 0;
  const curAward = awards[awardIdx];
  const maxBase = useMemo(() => Math.max(1, ...teams.map(t => t.base)), [teams]);

  // Platzierungs-Badge (🥉/🥈/Krone): erscheint, wenn dieser Turm stehenbleibt.
  const revealed = useCallback((rank: number) =>
    rank > 2 ? true : (phase === 'reveal' && revealStep >= (3 - rank)),
  [phase, revealStep]);

  // Identitaet (Farbe, Avatar, Name): fuer die Top-3 offen, sobald sie in der
  // Mitte stehen. Bewusst getrennt vom Badge — man soll wissen, WER klettert,
  // und nicht wissen, WIE HOCH.
  const identityShown = useCallback((rank: number) =>
    rank > 2 ? true : (phase === 'reveal' && glided),
  [phase, glided]);

  // Zielhoehen der drei Finalisten, aufsteigend: erst faellt Platz 3, dann 2.
  // ⚠️ finalRanking, NICHT ordered — `ordered` ist die Spalten-Anordnung auf der
  // Buehne (hash-gemischt, damit die Reihenfolge nichts verraet). Mit `ordered`
  // waeren hier drei zufaellige Teams gelandet und alle Tuerme haetten auf
  // derselben Hoehe gestoppt.
  const duelTargets = useMemo(() => {
    const t = finalRanking.slice(0, 3).map(x => totalOf(x.team.id)).sort((a, b) => a - b);
    return { third: t[0] ?? 0, second: t[1] ?? t[0] ?? 0, first: t[2] ?? t[1] ?? t[0] ?? 0 };
  }, [finalRanking, totalOf]);

  /** Bis wohin darf in diesem Beat geklettert werden? */
  const duelTargetFor = useCallback((step: number) =>
    step <= 0 ? duelTargets.third : step === 1 ? duelTargets.second : duelTargets.first,
  [duelTargets]);

  // Space spult vor.
  const skip = useCallback(() => {
    if (phase === 'intro') { setPhase('base'); return; }
    // Vorspulen ueberspringt den Brettfall nicht halb, sondern ganz: alles
    // landet, der Bau-Takt setzt dort an. Ein halb geflogenes Brett waere ein
    // Standbild mit Kacheln in der Luft.
    if (phase === 'brett') { setBrettWelle(letzteWelle + LANDE_VERZUG + 1); return; }
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
      if (!glided) { setGlided(true); setDuelTick(0); return; }
      // Erst das laufende Wettklettern zu Ende bringen, dann erst den naechsten
      // Platz freigeben. Sonst friert ein schnelles Vorspulen die Tuerme auf
      // halber Hoehe ein und das Schlussbild zeigt falsche Staende.
      const target = duelTargetFor(revealStep);
      if (duelTick < target) { setDuelTick(target); return; }
      setRevealStep(s => Math.min(3, s + 1));
    }
  }, [phase, hasAwards, awardStage, awardIdx, awardTick, curAward, awards.length, glided, duelTick, revealStep, duelTargetFor, letzteWelle, LANDE_VERZUG]);

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

  // Taktgeber der Brett-Wellen. Die erste Welle startet erst nach BRETT_HALT,
  // damit das volle Brett einen Moment steht, bevor es sich aufloest.
  useEffect(() => {
    if (phase !== 'brett') return;
    if (brettWelle > letzteWelle + LANDE_VERZUG) {
      // Alles gelandet. Der Rest des Sockels (Final-Tipp-Bonus, doppelt
      // zaehlende Klebefelder) faellt in der gewohnten Bau-Phase nach - sie
      // faengt dort an, wo das Brett aufgehoert hat, statt bei null.
      let hoechsteLandung = 0;
      for (const t of teams) hoechsteLandung = Math.max(hoechsteLandung, gelandet(t.team.id));
      setBaseTick(hoechsteLandung);
      setPhase('base');
      return;
    }
    const h = window.setTimeout(() => {
      setBrettWelle(w => w + 1);
      if (brettWelle <= letzteWelle) { try { playWoodKnock(); } catch { /* noop */ } }
    }, brettWelle === 0 ? BRETT_HALT : WELLE);
    return () => window.clearTimeout(h);
  }, [phase, brettWelle, letzteWelle, LANDE_VERZUG, BRETT_HALT, WELLE, teams, gelandet]);

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
  // Wettklettern bis Platz 3 steht → bis Platz 2 steht → Sieger allein → Krone.
  //
  // Die Beat-Zahl folgt `qqTowerMaxBeat` in shared, damit das Streamdeck-Mapping
  // des Moderators und der Beamer dieselbe Rechnung benutzen. Neu ist nur, was
  // INNERHALB eines Beats passiert: statt einen Namen umzudrehen klettern die
  // Tuerme, bis der naechste stehenbleibt.
  useEffect(() => {
    if (phase !== 'reveal') return;
    // Glide (Recede → Mitte) laeuft innerhalb des Glide-Beats automatisch.
    if (!glided) { const h = window.setTimeout(() => { setGlided(true); setDuelTick(0); }, 1600); return () => window.clearTimeout(h); }
    if (revealStep >= 3) {
      // Sicherheitsnetz: egal wie schnell vorgespult wurde, im Schlussbild
      // stehen die Tuerme auf ihrer echten Hoehe. Ohne das froren sie auf dem
      // Stand des letzten Ticks ein und alle drei zeigten dieselbe Zahl.
      if (duelTick < duelTargets.first) setDuelTick(duelTargets.first);
      try { playClimaxFinish(); } catch { /* noop */ } try { playFanfare(); } catch { /* noop */ }
      return;
    }

    const target = duelTargetFor(revealStep);
    // 1) Noch nicht am Etappenziel → naechsten Baustein setzen.
    if (duelTick < target) {
      const left = target - duelTick;
      // Bremsen zum Etappenende hin: die letzten drei Bausteine bekommen
      // spuerbar mehr Zeit. Genau da entscheidet sich, ob einer stehenbleibt.
      const step = left <= 1 ? 900 : left === 2 ? 620 : left === 3 ? 460 : 260;
      const h = window.setTimeout(() => {
        setDuelTick(t => t + 1);
        try { playWoodKnock(); } catch { /* noop */ }
      }, step);
      return () => window.clearTimeout(h);
    }
    // 2) Etappenziel erreicht → ein Turm bleibt stehen. Atempause, dann Badge.
    // Hybrid: im Live-Betrieb wartet der naechste Schritt auf den Moderator.
    if (live && (liveBeat ?? 0) < awards.length + 2 + revealStep) return;
    const hold = live ? 200 : (revealStep === 2 ? 1500 : 1100);
    const h = window.setTimeout(() => { setRevealStep(s => s + 1); try { playReveal(); } catch { /* noop */ } }, hold);
    return () => window.clearTimeout(h);
  }, [phase, glided, revealStep, duelTick, duelTargetFor, duelTargets, live, liveBeat, awards.length]);

  const inReveal = phase === 'reveal';
  const crowned = inReveal && revealStep >= 3;

  // Der Dritte steht, seine Pille ist zu lesen, dann geht er. Die 1100 ms sind
  // kein Zierrat: die Pille faehrt selbst 500 ms ein, und ein Turm, der im
  // selben Moment abtritt, in dem sein Platz erscheint, nimmt die Aussage mit.
  useEffect(() => {
    if (reduce) return;
    if (!(inReveal && glided && revealStep >= 1)) { if (dritterWeg) setDritterWeg(false); return; }
    if (dritterWeg) return;
    const h = window.setTimeout(() => setDritterWeg(true), 1100);
    return () => window.clearTimeout(h);
  }, [inReveal, glided, revealStep, dritterWeg, reduce]);

  // ── Geometrie ─────────────────────────────────────────────────────────────
  // 2026-08-23 (Uebergabe 2a, Wolf: „was meinst du mit dem zwischenstand").
  // Gemessen an der Aufnahme des Zwischenstand-Beats: zwischen Ueberschrift und
  // Turmspitze lagen 516 durchgehend leere Pixel, 52 Prozent der Buehnenhoehe.
  //
  // Ursache war EINE Zahl: die Bausteinhoehe war hart auf 46px gedeckelt. Der
  // Deckel bedeutet, dass der hoechste Turm die Zone auch am ENDE nicht fuellt,
  // sobald ein Team weniger als rund vierzehn Felder hat. Der Platz oben ist
  // dann keine Reserve zum Wachsen mehr, sondern einfach Leere.
  //
  // Neu, in dieser Reihenfolge, damit die Rechnung nicht mehr im Kreis laeuft
  // (vorher hing colW an blockW und blockW an blockH):
  //   1. Spaltenbreite allein aus der Teamzahl,
  //   2. Baustein so breit, wie die Spalte erlaubt,
  //   3. Bausteinseite so gross wie moeglich: begrenzt entweder von der
  //      Spaltenbreite oder davon, was die Zone bei maxTotal Bausteinen hergibt.
  //
  // 2026-08-23, direkt danach korrigiert (Wolf: „die tuerme sollen aus
  // quadratischen kacheln gebildet werden und nicht gequetschten kacheln").
  // Mein erster Wurf hatte hier einen Ziegel gebaut, breiter als hoch, um die
  // Zone auch bei wenigen Bausteinen zu fuellen. Das war die falsche Antwort auf
  // die richtige Frage: die Kacheln sind ueberall im Quiz quadratisch, auf dem
  // Brett und in jeder Teammarke, und ein Turm aus gequetschten Kacheln bricht
  // genau die Form, aus der er entstehen soll. Quadrat bleibt Quadrat, es wird
  // nur GROESSER - bei vier Bausteinen sind das 132px statt der frueheren 46,
  // und der Turm fuellt die Zone dabei besser als der Ziegel es tat.
  const SIDE_PAD = 90;
  const usable = STAGE_W - SIDE_PAD * 2;
  const colW = Math.max(56, Math.min(150, Math.floor(usable / N) - 16));
  // Der Sockel traegt Zahl und Teamname, der Kopf den Avatar auf der Turmspitze
  // und darueber die Platz-Pille. Beide sind auf der Buehne groesser als vorher,
  // und beide muessen VOR der Bausteinseite feststehen - sonst rechnet die Zone
  // mit alten Werten. Genau das ist beim ersten Anlauf passiert: die Zone stand
  // noch auf dem alten 96px-Sockel, der Turm wurde entsprechend zu hoch und der
  // Avatar auf der Spitze stand mitten im Titelband.
  const SOCKEL_H = istBuehne ? 134 : BASE_H;
  // Ohne den kletternden Avatar (siehe unten) braucht der Kopf nur noch Platz
  // fuer die Platz-Pille. Das kommt den Bausteinen zugute.
  const KOPF_H = istBuehne ? 84 : CROWN_H;
  const zoneH = STAGE_H - TITLE_H - KOPF_H - SOCKEL_H - BOTTOM;
  const blockSeite = Math.max(15, Math.min(
    colW - 10,
    Math.floor((zoneH - (maxTotal - 1) * GAP) / maxTotal),
  ));
  const blockW = blockSeite;
  const blockH = blockSeite;
  // Bleibt trotzdem Luft ueber dem hoechsten Turm (wenige Bausteine, breite
  // Ziegel), dann klebt die ganze Anordnung nicht mehr am unteren Rand, sondern
  // steht mittig im Feld unter dem Titelband. Der Wert haengt an maxTotal, also
  // am ENDstand inklusive Awards - er springt waehrend des Wachsens nicht.
  const maxTowerPx = maxTotal * blockH + Math.max(0, maxTotal - 1) * GAP;
  const freiUnterTitel = STAGE_H - TITLE_H;
  const BODEN = Math.max(BOTTOM, Math.round((freiUnterTitel - (maxTowerPx + SOCKEL_H)) / 2));
  const colGap = N > 1 ? Math.max(8, Math.floor((usable - N * colW) / (N - 1))) : 0;
  const avInBlock = Math.round(blockW * 0.82);
  // Der Avatar auf der Turmspitze war fest 54px und wirkte neben einem 132px
  // breiten Ziegel wie ein Knopf. Er folgt jetzt der Ziegelbreite.
  const AV_OBEN = Math.max(44, Math.min(96, Math.round(blockW * 0.72)));
  const rowWidth = N * colW + (N - 1) * colGap;
  const startX = (STAGE_W - rowWidth) / 2;
  const baseX = (i: number) => startX + i * (colW + colGap);
  // Podium in der Mitte: Sieger zentral, 2. links, 3. rechts.
  const PGAP = 46;
  const centerX = STAGE_W / 2 - colW / 2;

  // ── Wo die drei Finalisten stehen ─────────────────────────────────────────
  // 2026-08-25 (Wolf: „3. platz turm soll absinken, sonst weiss man schon, dass
  // mittlerer turm gewinnt, dann noch duell am ende, ist spannender").
  //
  // Er hat recht, und es war ein handfester Verrat: die Anordnung war
  // Sieger-Mitte, Zweiter-links, Dritter-rechts. Sie stand VOR dem
  // Wettklettern fest. Wer die Regel einmal gesehen hat, weiss ab dem Glide,
  // wer gewonnen hat - und das Klettern danach entscheidet nichts mehr, es
  // holt nur noch nach.
  //
  // Jetzt sagt die Stellung nichts. Die drei stehen in ihrer BUEHNENreihenfolge
  // nebeneinander, also so, wie sie ohnehin am Brett standen (`ordered` ist
  // hash-gemischt). Dann klettern sie. Wer zuerst stehenbleibt, ist Dritter,
  // bekommt seine Pille und SINKT AB - und die letzten zwei ruecken zum Duell
  // zusammen. Ab da ist es ein Zweikampf, und bis zum Schluss sagt keine
  // Position, wer ihn gewinnt.
  const finalisten = useMemo(
    () => finalRanking.slice(0, 3).map(x => x.team.id).sort((a, b) => orderIndex[a] - orderIndex[b]),
    [finalRanking, orderIndex],
  );
  /** Zu dritt: links, Mitte, rechts - nach Buehnenreihenfolge. */
  const dreierX = (id: string) => {
    const platz = finalisten.indexOf(id);
    return centerX + (platz - 1) * (colW + PGAP);
  };
  /** Zu zweit: symmetrisch um die Mitte, in derselben Links-rechts-Ordnung. */
  const dritterId = finalRanking[2]?.team.id ?? null;
  const duellX = (id: string) => {
    const uebrig = finalisten.filter(x => x !== dritterId);
    const platz = uebrig.indexOf(id);
    if (platz < 0) return dreierX(id);
    return centerX + (platz - 0.5) * (colW + PGAP);
  };

  // ── Geometrie des fallenden Bretts ────────────────────────────────────────
  // Das Brett steht oben unter dem Titelband, die Tuerme wachsen unten. Die
  // Kacheln fliegen also ueberwiegend nach UNTEN, und „faellt" ist keine
  // Metapher, sondern die tatsaechliche Richtung.
  // ── Wie ein Baustein aussieht ─────────────────────────────────────────────
  // 2026-08-25 (Wolf: „die kacheln der tuerme sehen etwas billig aus").
  // Er hat recht, und der Grund war schnell gefunden: die Kachel war eine
  // Flaeche in Teamfarbe mit einem dunklen Verlauf am Fuss und einer Haarlinie
  // als Rand. Das ist ein farbiges Rechteck, kein Baustein - es fehlt jede
  // Kante, an der Licht steht, und jede Fuge zum Nachbarn darunter.
  //
  // Bewusst OHNE Farbrechnung: die Lichter und Schatten liegen als
  // Schwarz-Weiss-Verlauf UEBER der Teamfarbe. Damit bleibt der Farbton exakt
  // der der Marke, egal welches Team, und es braucht kein `color-mix`.
  // Der Schatten nach unten ist der wichtigste Teil: er legt eine Fuge zwischen
  // zwei gestapelte Bausteine, und erst die Fuge macht aus zwei Rechtecken
  // einen Stapel.
  const kachelFlaeche = (farbe: string, rand: string) => ({
    borderRadius: 6,
    border: `1px solid ${rand}`,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 18%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.16) 78%, rgba(0,0,0,0.34) 100%), ' + farbe,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.38), inset 2px 0 0 rgba(255,255,255,0.07), inset -2px 0 0 rgba(0,0,0,0.18), 0 3px 4px rgba(0,0,0,0.42)',
  });

  const BRETT_LUECKE = 6;
  const BRETT_SEITE = 600;
  const brettOben = TITLE_H + 26;
  const brettLinks = Math.round((STAGE_W - BRETT_SEITE) / 2);
  const gGroesse = brett?.groesse ?? 0;
  const brettZelle = gGroesse > 0
    ? Math.floor((BRETT_SEITE - (gGroesse - 1) * BRETT_LUECKE) / gGroesse) : 0;
  /** Mittelpunkt einer Brettzelle auf der Buehne. */
  const brettMitte = (r: number, c: number) => ({
    x: brettLinks + c * (brettZelle + BRETT_LUECKE) + brettZelle / 2,
    y: brettOben + r * (brettZelle + BRETT_LUECKE) + brettZelle / 2,
  });
  /** Mittelpunkt des Bausteins, auf dem eine Kachel landen wird. */
  const turmMitte = (id: string, platz: number) => ({
    x: baseX(orderIndex[id]) + colW / 2,
    y: STAGE_H - (BODEN + SOCKEL_H + platz * (blockH + GAP)) - blockH / 2,
  });

  // ── Die Uebergabe von der Tipp-Aufloesung ─────────────────────────────────
  // 2026-08-25 (Wolf: „aber das finale von grid zu turm muss smoother werden,
  // diese motion sieht noch total altmodisch aus").
  //
  // Gemessen an der alten Aufnahme (0/120/240/400/600/900/1300/1800 ms): bei
  // 0 ms stand das Brett klein links neben der Tipp-Karte, bei 120 ms gross in
  // der Mitte. Ein Schnitt. Der Flug der Kacheln danach war in Ordnung, aber er
  // begann mit einem Gegenstand, den der Blick erst wiederfinden musste.
  //
  // Jetzt faehrt das Brett von seiner Tipp-Position an seinen Platz: FLIP, also
  // Endstand bauen, ins Erste zuruecksetzen, losfahren. Bewegt wird die HUELLE
  // ueber allen drei Ebenen (ruhendes Raster, verstreute Kacheln, Flugkacheln),
  // damit sie zusammenbleiben - eine Kachel, die einzeln faehrt, waere zwei
  // Bewegungen statt einer.
  //
  // Nur `transform`, keine Breite und keine Position: das komponiert die GPU,
  // und die vierundsechzig Felder darin werden dabei kein einziges Mal neu
  // gesetzt. Genau deshalb faehrt die Huelle und nicht das Raster selbst.
  const wurzelRef = useRef<HTMLDivElement | null>(null);
  const brettHuelleRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const huelle = brettHuelleRef.current;
    const wurzel = wurzelRef.current;
    if (!huelle || !wurzel) return;
    if (reduce || phase !== 'brett' || brettZelle <= 0) return;
    const q = uebergabe;
    if (!q) return;
    vergissBrettQuelle();
    // Bruchteile mal Layout-Breite ergibt wieder Buehnen-Pixel, unabhaengig
    // davon, auf welche Wandgroesse der Beamer den Rahmen gerade zieht.
    const bw = wurzel.offsetWidth;
    const bh = wurzel.offsetHeight;
    if (!bw || !bh) return;
    const vonX = q.x * bw;
    const vonY = q.y * bh;
    const faktor = (q.w * bw) / BRETT_SEITE;
    // Sicherheitsgurt gegen eine Messung aus einem ganz anderen Layout: ein
    // Brett, das um mehr als das Dreifache danebenliegt, faehrt lieber gar
    // nicht, als quer ueber die Buehne zu schiessen.
    if (!(faktor > 0.15 && faktor < 3)) return;
    const dx = vonX - faktor * brettLinks;
    const dy = vonY - faktor * brettOben;
    huelle.style.transformOrigin = '0 0';
    huelle.style.willChange = 'transform';
    huelle.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(${faktor.toFixed(4)})`;
    // Ein Bild spaeter losfahren. Ohne das rAF setzt der Browser Anfangs- und
    // Endwert in derselben Rechnung und es gibt gar keinen Uebergang.
    const bild = requestAnimationFrame(() => {
      huelle.style.transition = `transform ${UEBERGABE}ms cubic-bezier(0.22, 0.61, 0.24, 1)`;
      huelle.style.transform = 'none';
    });
    return () => cancelAnimationFrame(bild);
  }, [phase, brettZelle, brettLinks, brettOben, reduce, uebergabe]);

  const appliedBefore = useCallback((id: string) => {
    let s = 0; for (let i = 0; i < awardIdx; i++) if (awards[i].teamId === id) s += awards[i].bonus; return s;
  }, [awardIdx, awards]);

  const shownOf = (id: string) => {
    const base = baseOf(id);
    if (phase === 'intro') return 0;
    if (phase === 'brett') return Math.min(gelandet(id), base);
    if (phase === 'base') return Math.min(baseTick, base);
    if (phase === 'baseHold') return base;
    if (phase === 'award') {
      const add = curAward && awardStage === 'grow' && curAward.teamId === id ? Math.min(awardTick, curAward.bonus) : 0;
      return base + appliedBefore(id) + (curAward && curAward.teamId === id && awardStage === 'card' ? 0 : 0) + add;
    }
    // Reveal: sobald die Top-3 mittig stehen, klettern sie gemeinsam von null
    // hoch. `min` sorgt dafuer, dass ein Turm bei seiner Zielhoehe von selbst
    // stehenbleibt, waehrend die anderen weiterwachsen.
    if (phase === 'reveal' && glided && rankById[id] <= 2) {
      return Math.min(duelTick, totalOf(id));
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
    <div ref={wurzelRef} style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      // 2026-08-23 (2a): eigener Lila-Verlauf nur fuer diese eine Folie. Auf der
      // Buehne der Grund, den auch jede Frage traegt - das Finale ist der
      // Hoehepunkt desselben Abends, nicht ein anderes Programm.
      background: istBuehne ? 'var(--qq-bg)' : `radial-gradient(120% 100% at 50% 8%, #1B1230 0%, #140C22 42%, ${INK} 100%)`,
      fontFamily: "var(--qq-font, 'Nunito', system-ui, sans-serif)",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Atmosphaere */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(130% 90% at 50% 120%, rgba(var(--qq-accent-rgb),0.14), transparent 55%)' }} />
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
        return <div key={i} aria-hidden style={{ position: 'absolute', bottom: -10, left: `${8 + r(1) * 84}%`, width: 3 + r(2) * 4, height: 3 + r(2) * 4, borderRadius: '50%', background: 'var(--qq-accent)', opacity: 0.1 + r(3) * 0.1, filter: 'blur(1px)', animation: `qqT2Drift ${13 + r(4) * 9}s linear ${-r(5) * 18}s infinite` }} />;
      })}

      {/* Titelband */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: TITLE_H, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center', padding: '0 40px' }}>
        {crowned ? (
          <>
            {/* 2026-08-23 (2a): Gold ist auf der Buehne den Award-Bausteinen
                vorbehalten, dort heisst es etwas. Als Farbe fuer das Wort
                „Sieger" waere es eine fuenfte Farbe fuer eine Aussage, die das
                Wort selbst schon macht. */}
            <div style={{ fontSize: istBuehne ? 22 : 15, fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: istBuehne ? 'var(--qq-text-muted)' : GOLD, animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both' }}>{de ? 'Sieger' : 'Winner'}</div>
            <div style={{ fontSize: istBuehne ? 62 : 46, fontWeight: 900, lineHeight: 1.02, color: 'var(--qq-text)', textShadow: istBuehne ? 'none' : `0 2px 24px ${winner.team.color}66`, animation: reduce ? 'none' : 'qqT2WinnerIn 0.6s cubic-bezier(0.2,0.8,0.3,1) both' }}>{winner.team.name}</div>
          </>
        ) : inReveal && glided && revealStep === 2 ? (
          <div style={{ fontSize: istBuehne ? 44 : 32, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2Breathe 1.6s ease-in-out infinite' }}>{de ? 'Und der Sieger ist…' : 'And the winner is…'}</div>
        ) : inReveal && glided ? (
          <>
            <div style={{ fontSize: istBuehne ? 44 : 32, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2Breathe 1.6s ease-in-out infinite' }}>{de ? 'Kopf an Kopf' : 'Neck and neck'}</div>
            <div style={{ fontSize: istBuehne ? 28 : 16, fontWeight: 700, color: istBuehne ? 'var(--qq-text-muted)' : '#B9AEDA' }}>{de ? 'Wer bleibt zuerst stehen?' : 'Who stops first?'}</div>
          </>
        ) : inReveal && !glided ? (
          <div style={{ fontSize: istBuehne ? 44 : 32, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2Breathe 1.7s ease-in-out infinite' }}>{de ? 'Die Top 3 stehen fest…' : 'The Top 3 are set…'}</div>
        ) : inReveal ? (
          <div style={{ fontSize: istBuehne ? 46 : 34, fontWeight: 900, color: 'var(--qq-text)' }}>{de ? 'Die Top 3' : 'The Top 3'}</div>
        ) : phase === 'baseHold' ? (
          <>
            <div style={{ fontSize: istBuehne ? 44 : 32, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease both' }}>{de ? 'Zwischenstand' : 'Standings'}</div>
            <div style={{ fontSize: istBuehne ? 28 : 16, fontWeight: 700, color: istBuehne ? 'var(--qq-text-muted)' : '#B9AEDA' }}>{de ? 'Jetzt zählen noch die Awards…' : 'Now the awards count…'}</div>
          </>
        ) : phase === 'brett' ? (
          <>
            {/* Der Untertitel sagt jetzt die Regel, die man gerade SIEHT.
                „Jedes eroberte Feld ist ein Baustein" stimmte naemlich nie:
                es zaehlt das groesste zusammenhaengende Gebiet, und genau das
                fliegt auch. */}
            <div style={{ fontSize: istBuehne ? 46 : 34, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease both' }}>{de ? 'Wer baut den höchsten Turm?' : 'Who builds the tallest tower?'}</div>
            <div style={{ fontSize: istBuehne ? 28 : 16, fontWeight: 700, color: istBuehne ? 'var(--qq-text-muted)' : '#B9AEDA', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease 0.1s both' }}>{de ? 'Euer größtes Gebiet wird zum Turm' : 'Your largest area becomes the tower'}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: istBuehne ? 46 : 34, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease both' }}>{de ? 'Wer baut den höchsten Turm?' : 'Who builds the tallest tower?'}</div>
            <div style={{ fontSize: istBuehne ? 28 : 16, fontWeight: 700, color: istBuehne ? 'var(--qq-text-muted)' : '#B9AEDA', animation: reduce ? 'none' : 'qqT2FadeUp 0.6s ease 0.1s both' }}>{de ? 'Jedes eroberte Feld ist ein Baustein' : 'Every conquered cell is a brick'}</div>
          </>
        )}
      </div>

      {/* Spannungs-Flash (C): Gleichstand / In Fuehrung, waehrend der Award-Baustein faellt */}
      {standingFlash && (
        <div key={standingFlash} style={{
          position: 'absolute', top: TITLE_H + 8, left: '50%', transform: 'translateX(-50%)', zIndex: 13,
          padding: '10px 28px', borderRadius: 999, whiteSpace: 'nowrap',
          fontSize: istBuehne ? 34 : 26, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: standingFlash === 'tie' ? '#12100E' : '#0A2412',
          // Gleichstand faellt auf der Buehne auf den Akzent, nicht auf Gold:
          // Gold gehoert hier den Award-Bausteinen. Gruen bleibt fuer „in
          // Fuehrung", das ist eine der vier Farben und heisst „gut fuer dich".
          background: standingFlash === 'tie' ? (istBuehne ? 'var(--qq-stage-accent, var(--qq-accent))' : GOLD) : '#34D27B',
          boxShadow: istBuehne ? 'none' : `0 0 26px ${standingFlash === 'tie' ? GOLD : '#34D27B'}66`,
          animation: reduce ? 'none' : 'qqT2FlashPop 0.5s cubic-bezier(0.2,1.3,0.4,1) both',
          // Waage und Dreieck waren Schriftzeichen aus der Systemschrift und
          // wurden auf jedem Rechner anders gemalt. Der Text sagt es selbst.
        }}>{standingFlash === 'tie'
          ? (de ? 'Gleichstand!' : 'Tied!')
          : (de ? 'In Führung!' : 'In the lead!')}</div>
      )}

      {/* ── Das Brett faellt ─────────────────────────────────────────────────
          Zwei Ebenen: das ruhende Brett (Raster, verstreute Kacheln, Rahmen)
          und darueber die fliegenden Kacheln. Jede fliegende Kachel sitzt
          bereits an ihrem ZIEL im Turm und wird per Transform von ihrer
          Brettposition dorthin gefahren - so steht sie am Ende der Bewegung
          pixelgenau da, wo gleich der echte Baustein steht, und der Uebergang
          zwischen Flug und Turm ist unsichtbar. Der umgekehrte Weg (vom Start
          aus animieren und am Ziel abrunden) haette an der Uebergabe geruckelt. */}
      {phase === 'brett' && brett && brettZelle > 0 && (
        // Die Huelle traegt alle drei Ebenen und fuehrt die Uebergabe aus (siehe
        // `useLayoutEffect` weiter oben). Sie liegt deckungsgleich auf der
        // Buehne, also aendern sich die Koordinaten der Kinder nicht.
        <div ref={brettHuelleRef} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
          {/* Das ruhende Brett */}
          <div aria-hidden data-qq-brett="" style={{
            position: 'absolute', left: brettLinks, top: brettOben,
            width: BRETT_SEITE, height: BRETT_SEITE, zIndex: 2,
            display: 'grid',
            gridTemplateColumns: `repeat(${gGroesse}, ${brettZelle}px)`,
            gridAutoRows: `${brettZelle}px`, gap: BRETT_LUECKE,
          }}>
            {/* Das Raster loest sich ZEILENWEISE auf, den Kacheln hinterher.
                Vorher verschwand es am Stueck, und die Tuerme wuchsen eine
                Weile durch ein noch stehendes Brett hindurch. Jetzt raeumt sich
                die Flaeche von unten nach oben ab, in derselben Welle, in der
                die Kacheln aufsteigen. */}
            {Array.from({ length: gGroesse * gGroesse }, (_, i) => {
              const r = Math.floor(i / gGroesse);
              const welle = (gGroesse - 1) - r;
              return (
                <div key={i} style={{
                  borderRadius: 4,
                  border: '1px solid var(--qq-hairline)',
                  background: 'rgba(246,239,230,0.03)',
                  // Die Zeile raeumt sich, SOBALD ihre Kacheln weg sind, nicht
                  // erst eine Fuenftelsekunde spaeter. 2026-08-25 gemessen: der
                  // hoechste Turm waechst in den Brettbereich hinein, und jede
                  // Zeile, die laenger als noetig steht, ist eine Zeile, durch
                  // die er hindurchwaechst. Gemessen blieb danach genau eine
                  // Kachel Ueberdeckung uebrig, kurz, und der Turm liegt davor.
                  animation: `qqT2BrettAus 0.5s ease ${BRETT_HALT + welle * WELLE + 60}ms both`,
                }} />
              );
            })}
          </div>

          {/* Die verstreuten Kacheln: sichtbar, aber sie fliegen nicht mit. */}
          {streuRest.map(k => {
            const m = brettMitte(k.r, k.c);
            const t = teamById(k.ownerId);
            return (
              <div key={`streu-${k.r}-${k.c}`} aria-hidden data-qq-streu="" style={{
                position: 'absolute', zIndex: 3,
                left: Math.round(m.x - brettZelle / 2), top: Math.round(m.y - brettZelle / 2),
                width: brettZelle, height: brettZelle,
                ...(t ? kachelFlaeche(t.color, t.color) : { borderRadius: 6, border: '1px solid var(--qq-hairline)' }),
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                animation: `qqT2StreuAus 0.7s ease ${BRETT_HALT - 250}ms both`,
              }}>
                {t && <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={Math.round(brettZelle * 0.8)} flat />}
              </div>
            );
          })}

          {/* Die fliegenden Kacheln */}
          {Object.entries(flugplan).flatMap(([id, liste]) => {
            const t = teamById(id);
            if (!t) return [];
            // Die Spitzenreiter bauen anonym (siehe `myst` weiter unten). Ihre
            // Kacheln starten in Teamfarbe und verlieren sie IM FLUG - sonst
            // waere die ganze Anonymitaet der Top 3 hinfaellig, sobald das Brett
            // faellt, und der Farbwechsel am Boden waere ein Sprung.
            const anonym = rankById[id] <= 2;
            return liste.filter(k => k.welle > brettWelle - LANDE_VERZUG).map(k => {
              // Gelandete Kacheln werden abgeraeumt, sobald der echte Baustein
              // steht. 2026-08-24 an der Aufnahme gesehen: der Baustein verlaeuft
              // unten nach `rgba(0,0,0,0.24)`, ist dort also DURCHSICHTIG - die
              // liegengebliebene Flugkachel schien als Schmutzfleck durch die
              // grauen Tuerme der Spitzenreiter durch. Nebenbei bleibt der Baum
              // klein: in der Luft sind nur noch die Kacheln, die auch fliegen.
              const von = brettMitte(k.r, k.c);
              const zu = turmMitte(id, k.platz);
              const dx = Math.round(von.x - zu.x);
              const dy = Math.round(von.y - zu.y);
              const sc = (brettZelle / blockH).toFixed(3);
              // Innerhalb einer Zeile faellt es von links nach rechts durch.
              // Vorher loeste sich die ganze Zeile im selben Bild - acht Kacheln,
              // die wie ein Block abgehen. Eine Kaskade liest sich als Bewegung,
              // ein Block als Schnitt.
              const verzug = BRETT_HALT + k.welle * WELLE + k.c * SPALTEN_VERZUG;
              // Kleine Eigendrehung, aus Zeile und Spalte gerechnet statt
              // gewuerfelt: derselbe Abend sieht bei jeder Aufnahme gleich aus,
              // und man kann Bewegung ueberhaupt messen.
              const dreh = (((k.r * 7 + k.c * 13) % 5) - 2) * 3.5;
              return (
                // ZWEI Ebenen, und das ist der ganze Trick an der Flugbahn:
                // aussen die Waagerechte, innen die Senkrechte. Beide laufen
                // gleich lang, aber mit verschiedenen Kurven - waagerecht weich
                // auslaufend, senkrecht beschleunigend wie ein Fall. Zusammen
                // ergibt das einen Bogen. Eine einzelne Transform-Animation von
                // A nach B kann nur eine GERADE beschreiben, und genau die sah
                // „linear" aus.
                <div key={`flug-${id}-${k.platz}`} style={{
                  position: 'absolute', zIndex: 4,
                  left: Math.round(zu.x - blockW / 2),
                  top: Math.round(zu.y - blockH / 2),
                  width: blockW, height: blockH,
                  willChange: 'transform',
                  ['--qq-dx' as string]: `${dx}px`,
                  animation: `qqT2FlugX ${FLUG}ms cubic-bezier(0.22,0.55,0.24,1) ${verzug}ms both`,
                }}>
                  <div style={{
                    width: '100%', height: '100%',
                    willChange: 'transform',
                    ['--qq-dy' as string]: `${dy}px`,
                    ['--qq-sc' as string]: sc,
                    animation: `qqT2FlugY ${FLUG}ms cubic-bezier(0.5,0,0.6,1) ${verzug}ms both`,
                  }}>
                    {/* Dritte Ebene nur fuer die Eigendrehung. Sie MUSS getrennt
                        sein: die Drehung faengt bei null an, geht in der Luft
                        auf ihren Ausschlag und kommt zum Aufsetzen wieder auf
                        null. Steckte sie im Flug-Bild, waere ihr Anfangswert
                        auch der Ruhezustand - und dann liegen die Kacheln schon
                        auf dem BRETT schief herum. Genau so sah es aus. */}
                    <div style={{
                      width: '100%', height: '100%', position: 'relative',
                      ...kachelFlaeche(t.color, t.color),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      willChange: 'transform',
                      ['--qq-dreh' as string]: `${dreh}deg`,
                      animation: `qqT2FlugDreh ${FLUG}ms ease-in-out ${verzug}ms both`,
                    }}>
                      <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avInBlock} flat />
                      {anonym && (
                        <span aria-hidden style={{
                          position: 'absolute', inset: 0, borderRadius: 6,
                          background: `linear-gradient(180deg, ${MYST} 0%, ${MYST} 60%, rgba(0,0,0,0.24) 100%)`,
                          border: `1px solid ${MYST_EDGE}`,
                          animation: `qqT2Anonym ${FLUG}ms ease ${verzug}ms both`,
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      )}

      {/* Boden-Linie */}
      <div aria-hidden style={{ position: 'absolute', left: SIDE_PAD - 30, right: SIDE_PAD - 30, bottom: SOCKEL_H + BODEN - 1, height: 1, zIndex: 3, background: 'linear-gradient(90deg, transparent, rgba(246, 239, 230,0.14) 12%, rgba(246, 239, 230,0.14) 88%, transparent)' }} />

      {/* Tuerme (absolut positioniert → Glide in die Mitte moeglich) */}
      {ordered.map(({ team }) => {
        const id = team.id;
        const rank = rankById[id];
        const isWinner = rank === 0;
        const isTop3 = rank <= 2;
        const base = baseOf(id);
        const shown = shownOf(id);
        const total = totalOf(id);
        const show = revealed(rank);            // Platzierung steht fest (Badge)
        const ident = identityShown(rank);      // Farbe/Avatar/Name offen
        // Grau bleibt nur noch bis zum Glide. Waehrend des Wettkletterns sind
        // alle drei farbig — sonst wuerde der spannendste Moment zwischen
        // anonymen Saeulen stattfinden und niemand wuesste, fuer wen er jubelt.
        const myst = isTop3 && !ident;
        const colr = myst ? MYST : team.color;
        const edge = myst ? MYST_EDGE : team.color;
        const towerPx = shown * blockH + Math.max(0, shown - 1) * GAP;
        const badge = rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
        const i = orderIndex[id];

        // Position + Glide (sequenziert: Nicht-Top-3 erst raus, dann Top-3 rein).
        // Der Dritte tritt nach seiner Pille ab und die letzten zwei ruecken
        // zum Duell zusammen - siehe `dreierX` / `duellX` oben.
        const abtritt = inReveal && glided && dritterWeg && rank === 2;
        let tx = 0, ty = 0, opacity = 1, z = 4;
        if (inReveal) {
          if (isTop3) {
            if (glided) {
              tx = (dritterWeg && rank !== 2 ? duellX(id) : dreierX(id)) - baseX(i);
              // Absinken: nach unten weg UND ausblenden. Nur nach unten reicht
              // nicht - ein Turm kann siebenhundert Pixel hoch sein, der waere
              // mit einer sichtbaren Strecke nie ganz aus dem Bild. Die
              // Richtung erzaehlt „er geht", die Deckkraft raeumt ihn weg.
              if (abtritt) { ty = 340; opacity = 0; }
            }
            z = isWinner ? 7 : 6;
          }
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
          <div key={id}
            // Kennungen fuer die Messung: `scripts/duell-messen.mjs` liest damit
            // die Kaesten der Tuerme aus, statt sie auf einem Kontaktblatt
            // abzuschaetzen. Ob ein Turm absinkt oder nur ausblendet, sieht man
            // auf einem 300-Pixel-Bild naemlich nicht.
            data-qq-turm={id} data-qq-platz={rank}
            style={{
            position: 'absolute', bottom: BODEN, left: baseX(i), width: colW, zIndex: z,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transform: `translateX(${tx}px) translateY(${ty}px)`, opacity,
            // Der Abtritt hat eine eigene Kurve: beschleunigend statt weich
            // ausklingend. Etwas, das absinkt, wird schneller, nicht langsamer.
            // Die zwei Verbleibenden ruecken mit 250 ms Verzug nach, damit man
            // erst das Abtreten sieht und dann das Zusammenruecken - zwei
            // Aussagen hintereinander lesen sich, gleichzeitig verwischen sie.
            // Die Deckkraft faellt ERST NACH einer halben Sekunde. Beim ersten
            // Anlauf lief sie parallel, und weil die Kurve beschleunigt, war der
            // Turm schon fast durchsichtig, bevor er sich sichtbar bewegt hatte -
            // aus „er sinkt ab" wurde „er ist weg".
            //
            // Am Baum gemessen (`data-qq-turm`, siehe scripts/duell-messen.mjs):
            // beim zweiten Anlauf legte er in der sichtbaren Zeit 46 Bildpunkte
            // zurueck, keine fuenf Prozent der Buehnenhoehe. Das ist eine
            // Andeutung, kein Abgang. Jetzt sind es rund 190 Bildpunkte bei
            // voller Deckkraft, und erst danach raeumt das Verblassen den Rest.
            transition: reduce ? 'none' : abtritt
              ? 'transform 1s cubic-bezier(0.34,0,0.5,0.9), opacity 0.5s ease 0.5s'
              : `transform 0.75s cubic-bezier(0.4,0,0.2,1)${isTop3 ? (dritterWeg ? ' 0.25s' : ' 0.35s') : ''}, opacity 0.5s ease`,
            // 2026-08-25: waehrend das Brett heranfaehrt, stellen sich die
            // Sockel darunter auf, von links nach rechts. Vorher standen sie im
            // ersten Bild alle schon da - acht leere Kaesten, die aus dem Nichts
            // erscheinen, waehrend daneben etwas anderes passiert. Gestaffelt
            // gelesen sagt dieselbe Sekunde jetzt „hier wird gleich gebaut".
            // Der Versatz von 45ms je Spalte liegt in dem Bereich, den Material
            // fuer Listen empfiehlt; bei acht Spalten steht die letzte nach
            // 495ms, also noch bevor das Brett seinen Platz erreicht.
            // ⚠️ Hier darf NUR eine Animation stehen, die das Verschieben nicht
            // stoert. Eine laufende CSS-Animation auf `transform` ersetzt den
            // Inline-Transform vollstaendig - und der traegt hier die ganze
            // Choreo. Der Herzschlag des Siegers stand genau hier und hat
            // deshalb den Siegerturm zurueck in seine alte Spalte springen
            // lassen, sobald „Und der Sieger ist…" kam. Er sitzt jetzt eine
            // Ebene tiefer, auf dem Stapel selbst, wo er nichts ueberschreibt.
            // (Das Aufstellen der Sockel darf bleiben: in der Brett-Phase ist
            // die Verschiebung null, da gibt es nichts zu ueberschreiben.)
            animation: (phase === 'brett' && !reduce)
              ? `qqT2FadeUp 0.5s ease ${140 + i * 45}ms both`
              : 'none',
          }}>
            <div style={{
              position: 'relative', width: blockW, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: GAP,
              animation: (isWinner && inReveal && revealStep === 2 && !reduce) ? 'qqT2Heartbeat 1.5s ease-in-out infinite' : 'none',
            }}>
              <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)', width: Math.round(blockW * 2.1), height: 26, borderRadius: '50%', background: `radial-gradient(ellipse, ${colr}${crowned && isWinner ? '55' : '30'}, transparent 70%)`, filter: 'blur(6px)', zIndex: 0, pointerEvents: 'none', transition: 'background 0.4s ease' }} />

              {/* Kletternder Avatar (Krone/Badge) */}
              {/* 2026-08-23 (Wolf: „die oberste kachel ist anders gross - ist
                  das extra?"). Absicht war es, aber die Absicht kam nicht an:
                  das ist gar keine Kachel, sondern der kletternde Team-Avatar,
                  der die Turmspitze markiert. Frueher war er mit 54px GROESSER
                  als ein 46px-Baustein und damit klar etwas anderes. Seit die
                  Bausteine bis 132px gross sind, ist er kleiner und liest sich
                  als geschrumpfte oberste Kachel.
                  Auf der Buehne faellt er weg, denn er hat keine Aufgabe mehr:
                  JEDER Baustein traegt inzwischen Teamfarbe und Teammarke, die
                  Spitze ist ohnehin die Spitze, und die Platz-Pille haengt jetzt
                  direkt ueber dem obersten Baustein. Leicht rueckgaengig zu
                  machen - `AV_OBEN` und der Block hier stehen unveraendert. */}
              <div style={{ position: 'absolute', left: '50%', bottom: towerPx + 7, zIndex: 5, width: istBuehne ? blockW : AV_OBEN, height: istBuehne ? 0 : AV_OBEN, transform: 'translateX(-50%)', transition: reduce ? 'none' : 'bottom 0.44s cubic-bezier(0.34,1.4,0.6,1)' }}>
                {/* 2026-08-23 (Wolf: „die krone ist alt"). Sie war ausserdem
                    die einzige Stelle, an der der Sieger eine ANDERE Form bekam
                    als Platz 2 und 3 - die tragen eine Platz-Pille. Jetzt tragen
                    alle drei dieselbe Form, und der Sieger bekommt sie gefuellt
                    im Akzent mit dunkler Schrift. Das ist dieselbe Pille wie die
                    Kategorie-Pille auf jeder Frage, also Buehnen-Vokabular statt
                    Sonderfall. Wer gewonnen hat, sagen ausserdem Hoehe, Mitte
                    und die Sieger-Zeile im Titelband. */}
                {isWinner && crowned && istBuehne && (
                  <div style={{ position: 'absolute', left: '50%', bottom: istBuehne ? 8 : AV_OBEN - 6, transform: 'translateX(-50%)', zIndex: 8, pointerEvents: 'none', whiteSpace: 'nowrap', animation: reduce ? 'none' : 'qqT2BadgeIn 0.5s cubic-bezier(0.3,1.5,0.5,1) both' }}>
                    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.06em', color: '#12100E', background: 'var(--qq-stage-accent, var(--qq-accent))', borderRadius: 999, padding: '4px 16px' }}>{de ? 'PLATZ 1' : '#1'}</span>
                  </div>
                )}
                {isWinner && crowned && !istBuehne && (
                  <span aria-hidden style={{ position: 'absolute', left: '50%', bottom: istBuehne ? 8 : AV_OBEN - 10, transform: 'translateX(-50%)', fontSize: 44, lineHeight: 1, pointerEvents: 'none', zIndex: 8, filter: 'drop-shadow(0 0 16px rgba(249,200,122,0.8))', animation: reduce ? 'none' : 'qqT2CrownDrop 0.7s cubic-bezier(0.3,1.5,0.5,1) both, qqT2CrownFloat 2.6s ease-in-out 0.8s infinite' }}><QQEmojiIcon emoji="👑" size="1em" /></span>
                )}
                {!isWinner && showBadge && (
                  <div style={{ position: 'absolute', left: '50%', bottom: istBuehne ? 8 : AV_OBEN - 6, transform: 'translateX(-50%)', zIndex: 8, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, whiteSpace: 'nowrap', animation: reduce ? 'none' : 'qqT2BadgeIn 0.5s cubic-bezier(0.3,1.5,0.5,1) both' }}>
                    {/* 2026-08-23 (2a): Silber und Bronze waren rohe Systemzeichen
                        und eine fuenfte und sechste Farbe fuer etwas, das die
                        Pille direkt darunter schon in Worten sagt. */}
                    {badge && !istBuehne && <span aria-hidden style={{ fontSize: 28, lineHeight: 1 }}><QQEmojiIcon emoji={badge} size={28} /></span>}
                    <span style={{ fontSize: istBuehne ? 20 : 13, fontWeight: 900, letterSpacing: '0.05em', color: 'var(--qq-text)', background: 'rgba(15,8,23,0.94)', border: `2px solid ${myst ? MYST_EDGE : colr}`, borderRadius: 999, padding: istBuehne ? '4px 14px' : '2px 9px' }}>{de ? `PLATZ ${rank + 1}` : `#${rank + 1}`}</span>
                  </div>
                )}
                {!istBuehne && (
                <div style={{ width: AV_OBEN, height: AV_OBEN, borderRadius: quirkSet ? '18%' : '50%', background: colr, border: `3px solid ${edge}`, boxShadow: (myst || istBuehne) ? 'none' : `0 0 14px ${colr}77`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', animation: (isTop3 && show && !reduce) ? 'qqT2Reveal 0.6s ease-out both' : 'none' }}>
                  {myst
                    ? <span aria-hidden style={{ fontSize: Math.round(AV_OBEN * 0.55), fontWeight: 900, color: 'var(--qq-text-muted)', animation: reduce ? 'none' : 'qqT2Q 1.8s ease-in-out infinite' }}>?</span>
                    : <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={AV_OBEN} flat />}
                </div>
                )}
              </div>

              {/* Kacheln */}
              {Array.from({ length: shown }).map((_, bi) => {
                const isTopBlock = bi === shown - 1;
                const isAwardBlock = bi >= base;
                const isCrownBlock = isWinner && crowned && isTopBlock;
                return (
                  <div key={bi} style={{
                    width: blockW, height: blockH, position: 'relative', zIndex: 1,
                    ...kachelFlaeche(isAwardBlock ? GOLD : colr, isAwardBlock ? GOLD_DEEP : edge),
                    // 2026-08-23 (2a): Gold BLEIBT auf den Award-Bausteinen, das
                    // ist Mechanik (Wolf: „die goldenen bausteine sind die
                    // awards"). Nur der Hof AUSSERHALB des Bausteins geht - der
                    // 14px-Schein weichte auf Projektionsdistanz die Kante auf,
                    // und die Kante ist es, die den Stapel als Stapel lesbar
                    // macht. Die inneren Lichtkanten bleiben, die sitzen drin.
                    // Der Hof AUSSERHALB des Bausteins bleibt weg (2026-08-23,
                    // siehe oben), die Kanten sitzen jetzt IN der Kachel.
                    transformOrigin: 'bottom center',
                    transition: 'background 0.45s ease, border-color 0.45s ease',
                    // 2026-08-24: waehrend „Das Brett faellt" bringt die
                    // fliegende Kachel ihre eigene Bewegung mit und liegt beim
                    // Aufsetzen exakt hier. Der Fall-Effekt des Bausteins wuerde
                    // dieselbe Kachel ein zweites Mal fallen lassen - und weil
                    // qqT2Drop bei opacity 0 beginnt, saehe man dabei die
                    // fliegende Kachel durch den Baustein hindurch.
                    animation: (isTopBlock && !reduce && phase !== 'brett') ? (isCrownBlock ? 'qqT2CrownBlock 0.8s cubic-bezier(0.3,1.5,0.4,1) both' : 'qqT2Drop 0.46s cubic-bezier(0.3,1.35,0.5,1) both') : 'none',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isAwardBlock
                      ? (istBuehne
                          ? <QQEmojiIcon
                              emoji={awardZeichenProTeam[id]?.[bi - base] ?? '⚡'}
                              size={Math.round(blockW * 0.66)}
                            />
                          : <span aria-hidden style={{ fontSize: Math.round(blockW * 0.6), lineHeight: 1, color: '#7A5A1E', filter: 'drop-shadow(0 1px 1px rgba(246, 239, 230,0.4))' }}>★</span>)
                      : myst ? null : <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={avInBlock} flat />}
                    {/* Der Lande-Blitz bleibt: er ist transient und sagt
                        „dieser Baustein ist GERADE gefallen". Ein Schein mit
                        Bedeutung bleibt, einer der nur schmueckt geht. */}
                    {isTopBlock && !reduce && phase !== 'brett' && !(inReveal && !isTop3) && (
                      <div aria-hidden style={{ position: 'absolute', inset: -1, borderRadius: 5, pointerEvents: 'none', boxShadow: `0 0 ${istBuehne ? 10 : (isCrownBlock ? 22 : isAwardBlock ? 18 : 12)}px ${(isAwardBlock ? GOLD : colr)}${isCrownBlock ? 'ee' : 'aa'}`, animation: `qqT2Spark ${isCrownBlock ? 0.7 : 0.5}s ease-out both` }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sockel */}
            <div style={{ height: SOCKEL_H, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, gap: 4 }}>
              {/* 2026-08-23 (2a): die Zahl stand am Ende in Teamfarbe mit Schein.
                  Teamfarbe lebt auf der Kachel, nicht in der Schrift - und die
                  Kachel steht hier direkt darueber, den ganzen Turm hoch. */}
              <div style={{ fontSize: istBuehne ? 42 : 30, fontWeight: 900, lineHeight: 1, color: istBuehne ? 'var(--qq-text)' : (capped && !myst ? colr : '#E2D6FF'), fontVariantNumeric: 'tabular-nums', textShadow: (capped && !myst && !istBuehne) ? `0 0 14px ${colr}66` : 'none', transition: 'color 0.3s ease' }}>
                <span key={shown} style={{ display: 'inline-block', animation: (shown > 0 && !crowned && !reduce) ? 'qqT2NumPop 0.3s ease-out' : 'none' }}>{shown}</span>
              </div>
              {/* 2026-08-24, gemessen: die Teamnamen im Sockel standen zwischen
                  22,5 und 25px, das „???" der noch anonymen Tuerme bei 24px.
                  Unter einem 140px breiten Baustein-Turm ist das der kleinste
                  Text der Folie - ausgerechnet der Name, um den es geht.
                  minFontSize haelt ihn auch bei langen Namen ueber dem Boden;
                  zwei Zeilen sind erlaubt und darunter ist Platz. */}
              {myst
                ? <div style={{ fontSize: istBuehne ? 28 : 16, fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.12em' }}>???</div>
                : <TeamNameLabel name={team.name} maxLines={2} shrinkAfter={12} color="#F6EFE6" fontWeight={800} minFontSize={istBuehne ? '26px' : undefined} fontSize={istBuehne ? 'clamp(22px, 1.8cqw, 30px)' : 'clamp(12px, 1cqw, 16px)'} style={{ maxWidth: colW + 8, textAlign: 'center', lineHeight: 1.05 }} />}
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
  const istBuehne = getActiveThemeId() === BUEHNE_THEME_ID;
  // 2026-08-23 (2a): Gold BLEIBT auf dieser Karte. Sie kuendigt den goldenen
  // Baustein an, der gleich faellt, und Wolf hat bestaetigt: die goldenen
  // Bausteine SIND die Awards. Gold ist hier also Mechanik und nicht Schmuck.
  // Was geht, sind die vier Schein-Ebenen darum: 46px um die Karte, 22px hinter
  // dem Zeichen, 20px hinter der Ueberschrift, 16px um die Empfaenger-Marke.
  // Cozy Quirks: eckige Kachel → Empfänger-Badge quadratisch (keine runde Coin).
  const quirkSet = isQuirkTileSet(useAvatarSet());
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 60% at 50% 45%, rgba(249,200,122,0.10), rgba(6,3,12,0.62) 70%)', animation: reduce ? 'none' : 'qqT2FadeUp 0.4s ease both' }} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        padding: '34px 56px', borderRadius: 26,
        background: 'linear-gradient(180deg, rgba(40,29,13,0.98), rgba(24,17,8,0.98))',
        border: `2px solid ${GOLD_DEEP}`,
        boxShadow: istBuehne
          ? 'inset 0 1px 0 rgba(246, 239, 230,0.08), 0 24px 60px rgba(0,0,0,0.55)'
          : `0 0 46px ${GOLD}40, inset 0 1px 0 rgba(246, 239, 230,0.08)`,
        animation: reduce ? 'none' : 'qqT2AwardIn 0.55s cubic-bezier(0.2,1.2,0.35,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ fontSize: istBuehne ? 22 : 15, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>{de ? 'Award' : 'Award'}</span>
          <span style={{ fontSize: istBuehne ? 20 : 13, fontWeight: 900, color: '#1B1206', background: GOLD, borderRadius: 999, padding: istBuehne ? '4px 14px' : '2px 10px' }}>+{award.bonus}</span>
        </div>
        <div aria-hidden style={{ fontSize: 76, lineHeight: 1, filter: istBuehne ? 'drop-shadow(0 8px 18px rgba(0,0,0,0.5))' : `drop-shadow(0 0 22px ${GOLD}66)`, animation: reduce ? 'none' : 'qqT2AwardPop 0.7s cubic-bezier(0.3,1.5,0.4,1) both' }}><QQEmojiIcon emoji={award.emoji} size={76} /></div>
        <div style={{ fontSize: istBuehne ? 50 : 40, fontWeight: 900, color: 'var(--qq-text)', lineHeight: 1.02, textAlign: 'center', textShadow: istBuehne ? 'none' : `0 2px 20px ${GOLD}44` }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <div style={{ width: istBuehne ? 76 : 60, height: istBuehne ? 76 : 60, borderRadius: quirkSet ? '18%' : '50%', background: mystery ? MYST : recip.color, border: `3px solid ${mystery ? MYST_EDGE : recip.color}`, boxShadow: (mystery || istBuehne) ? 'none' : `0 0 16px ${recip.color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {mystery ? <span aria-hidden style={{ fontSize: 34, fontWeight: 900, color: istBuehne ? 'var(--qq-text-muted)' : '#B9AEDA' }}>?</span> : <QQTeamAvatar avatarId={recip.avatarId} teamEmoji={recip.emoji} size={istBuehne ? 76 : 60} flat />}
          </div>
          {/* Empfaengername in Creme: die Marke links davon traegt die Teamfarbe
              schon als volle Flaeche, und in Creme steht er bei jedem Team
              gleich gut lesbar da. */}
          <div style={{ fontSize: istBuehne ? 34 : 26, fontWeight: 900, color: istBuehne ? 'var(--qq-text)' : (mystery ? '#C9BEE6' : recip.color), maxWidth: 460 }}>
            {mystery ? (de ? 'Einer der Spitzentürme!' : 'One of the top towers!') : recip.name}
          </div>
        </div>
      </div>
    </div>
  );
}

// ⚠️ Dieser ganze Block ist EIN Template-Literal. Ein Backtick in einem
// Kommentar darin beendet es, und die Datei ist ab dort kaputt - der
// Uebersetzer zeigt dann auf eine Zeile weit unten, nicht auf die Ursache.
// Also: hier drin keine Codezeichen in Kommentaren.
const KEYFRAMES = `
@keyframes qqT2FadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes qqT2WinnerIn { 0% { opacity: 0; transform: translateY(14px) scale(0.96); } 60% { transform: translateY(0) scale(1.02); } 100% { opacity: 1; transform: none; } }
@keyframes qqT2Drop { 0% { opacity: 0; transform: translateY(-22px) scaleY(0.7); } 70% { transform: translateY(0) scaleY(1.06); } 100% { opacity: 1; transform: none; } }
/* „Das Brett faellt", 2026-08-24.
   Die Kachel sitzt bereits an ihrem Ziel im Turm; --qq-dx/--qq-dy tragen sie
   zurueck auf ihren Platz am Brett, --qq-sc auf Brett-Groesse. Von dort faehrt
   sie ueber die Nullstellung nach Hause. Nur transform und opacity - beides
   komponiert die GPU, deshalb halten auch sechzehn gleichzeitige Kacheln die
   Bildrate. Der kleine Ueberschwung bei 82 Prozent gibt dem Aufsetzen Gewicht. */
/* Die Waagerechte: weich auslaufend, sie ist am Anfang am schnellsten. */
@keyframes qqT2FlugX {
  0%   { transform: translateX(var(--qq-dx)); }
  100% { transform: none; }
}
/* Die Senkrechte: beschleunigend wie ein Fall, mit kurzem Aufsetzen am Ende.
   Dazu dreht sich die Kachel in ihre Lage und waechst von Brett- auf
   Bausteingroesse. Alles nur ueber transform, also auf der Rasterebene. */
@keyframes qqT2FlugY {
  0%   { transform: translateY(var(--qq-dy)) scale(var(--qq-sc)); }
  78%  { transform: translateY(-9px) scale(1.06); }
  90%  { transform: translateY(2px) scale(0.97); }
  100% { transform: none; }
}
/* Die Eigendrehung: aus der Ruhe heraus, in der Luft am groessten, beim
   Aufsetzen wieder gerade. */
@keyframes qqT2FlugDreh {
  0%   { transform: rotate(0deg); }
  42%  { transform: rotate(var(--qq-dreh)); }
  100% { transform: rotate(0deg); }
}
/* Die Spitzenreiter verlieren ihre Farbe im Flug, nicht erst am Boden. */
@keyframes qqT2Anonym { 0%, 34% { opacity: 0; } 100% { opacity: 1; } }
/* Verstreute Felder: sie gehoeren zu keinem groessten Gebiet und steigen
   deshalb nicht auf. Sie sinken ein Stueck und verblassen. */
@keyframes qqT2StreuAus { 0% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(16px) scale(0.86); } }
/* Eine leergefallene Brettzeile bleibt nicht stehen, sie hebt ab. 2026-08-25:
   die Tuerme wachsen in genau diesen Bereich hinein (gemessen bis 566
   Bildpunkte Ueberdeckung), und ein Raster, das dabei einfach nur ausblendet,
   liegt zu lange im Weg. */
@keyframes qqT2BrettAus {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(-26px) scale(0.97); }
}
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
