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
import { qqKachelFlaeche } from '../qqKachel';
import type { QQTeam, QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { qqAwardPoints, qqCozyPoints, qqFinalTotal } from '../utils/qqFinalScore';
import { prefersReducedMotion } from '../utils/reducedMotion';
import { QQTeamAvatar } from './QQTeamAvatar';
import { useAvatarSet } from '../avatarSetContext';
import { isQuirkTileSet } from '../quirks2Avatars';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon, QQIcon, type QQIconSlug } from './QQIcon';
import { qqLargestClusterCells, type ClusterKachel } from '../utils/qqLargestCluster';
import { qqTowerAwardBeats, qqTurmRennplan, type QQTowerAwardBeat } from '../../../shared/qqFinalReveal';
import { getActiveThemeId, BUEHNE_THEME_ID } from '../qqTheme';
import { holeBrettQuelle, vergissBrettQuelle } from '../qqBrettUebergabe';
import {
  playWoodKnock, playClimaxFinish, playFanfare, playTick, playReveal, playSpecialAwardReveal,
} from '../utils/sounds';

/**
 * Ein Turm in Teilen. `base` ist der Sockel, der aus dem BRETT kommt (das
 * groesste zusammenhaengende Gebiet), `tipp` sind die Bausteine aus der
 * Final-Wette.
 *
 * 2026-08-25 (Wolf: „aber es ist weird erst tuerme zu haben, dann wieder auf
 * 0? ... wenn dann wuerde ich immer nur eine kachel bauen, solange bis das
 * letzte team raus ist (fliegt raus)"). Bis hierher steckte der Tipp-Bonus mit
 * im Sockel und fiel nach dem Brettfall stumm nach, und ganz am Ende fielen
 * die drei Spitzentuerme auf null zurueck, um noch einmal zu klettern. Beides
 * ist raus: der Tipp ist jetzt der Einsatz IM RENNEN und faellt zuletzt.
 *
 * Warum ausgerechnet der Tipp: durchgerechnet ueber 4000 Abende
 * (scratchpad/rennen.mjs) dreht er in 41 Prozent der Abende den Sieg, und in
 * 69 Prozent trennt Sieger und Zweiten am Ende hoechstens ein Baustein. Was
 * zuletzt faellt, soll das sein, was auch entscheidet.
 */
export type TowerTeam = { team: QQTeam; base: number; tipp: number };
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
export type TowerAward = {
  key: string; label: string; labelEn?: string; slug: QQIconSlug; zoom?: number;
  teamId: string; bonus: number;
  /** Die Frage, mit der die Zeremonie aufgeht. Wolf: „Wer war der Underdog
   *  heute, dann rollt das rad die teams wackeln durch". Ohne die Frage ist die
   *  Karte nur eine Bekanntgabe; mit ihr ist es ein Moment, in dem der Saal
   *  raten kann. */
  frage: string; frageEn: string;
};

// Mapping State → Turm-Daten (Live-Wiring): base = Quiz-Cluster + Bet-Bonus
// (also OHNE Award-Punkte), Awards separat aus endAwards mit echten Werten
// (Underdog +2, Speedy/Meisterklauer +1). Underdog zuletzt (= +2-Climax, wie die
// bestehende Award-Dramaturgie). Score bleibt identisch zu qqFinalTotal — die
// Awards zaehlen weiter, nur ihre PRAESENTATION wandert in den Turm.
export function buildTowerFinaleData(s: QQStateUpdate): { teams: TowerTeam[]; awards: TowerAward[]; brett: TowerBrett } {
  const ap = qqAwardPoints(s);
  const cp = qqCozyPoints(s);
  // Der Sockel ist genau das, was aus dem Brett fliegt: das groesste Gebiet.
  // Alles andere kommt als eigener Baustein dazu - CozyGames und Awards in
  // ihren Zeremonien, der Tipp-Bonus zuletzt im Rennen. Zusammen ergibt das
  // wieder qqFinalTotal, nichts zaehlt doppelt.
  const teams: TowerTeam[] = s.teams.map(t => {
    const gesamt = qqFinalTotal(s, t.id, ap);
    const tipp = s.finalBetResolution?.[t.id]?.totalBonus ?? 0;
    return { team: t, base: gesamt - (ap[t.id] ?? 0) - (cp[t.id] ?? 0) - tipp, tipp };
  });
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
  // ⚠️ Das Zeichen steht als SLUG hier, nicht als Emoji.
  //
  // 2026-08-25 (Wolf: „die awardemojis muessen glaub ich ueberarbeitet werden,
  // sie passen nicht zueinander?"). Es war kein Geschmacksproblem. Karte und
  // Baustein haben ihr Bild ueber ein EMOJI gesucht, und die Rueckwaerts-Suche
  // ist nicht eindeutig: „⚡" haengt an vier Slugs (action-steal, stamp-speedy,
  // award-speedy, fx-lightning), „🪙" an zweien. Gezeigt wurde also nicht das
  // Award-Zeichen, sondern irgendeines davon. Und „🍀" hat ueberhaupt keine
  // Zuordnung - der Underdog erschien als rohes Systemzeichen, vom Betriebs-
  // system gemalt, neben zwei Bildern aus dem gelieferten Satz. Genau das
  // sieht man als „passt nicht zueinander".
  //
  // `zoom` gleicht aus, wie viel Leinwand ein Motiv belegt. Gemessen mit
  // scripts/award-zeichen-messen.mjs: die drei Award-Zeichen fuellen 87 Prozent
  // ihrer laengsten Kante, das Rad nur 74. Bei gleicher Kachelgroesse stuende
  // es also 15 Prozent kleiner in der Reihe. Die Datei bleibt unangetastet -
  // ausgeglichen wird ausschliesslich in der Darstellung.
  const AUFSCHRIFT: Record<QQTowerAwardBeat['kind'], { label: string; labelEn: string; slug: QQIconSlug; zoom: number; frage: string; frageEn: string }> = {
    // Das Rad, nicht die CozyGames-Wortmarke: `cg-cozygames` ist gar kein
    // gefuehrter Slug, und das Rad ist ohnehin das Zeichen, das der Saal aus
    // der Auslosung kennt.
    cozy:          { label: 'CozyGames',       labelEn: 'CozyGames',       slug: 'fx-wheel', zoom: 1.18,
                     frage: 'Wer hat heute bei den CozyGames gepunktet?', frageEn: 'Who scored in the CozyGames today?' },
    speedy:        { label: 'Speedy Gonzales', labelEn: 'Speedy Gonzales', slug: 'award-speedy', zoom: 1,
                     frage: 'Wer war heute am schnellsten?', frageEn: 'Who was fastest today?' },
    meisterklauer: { label: 'Meisterklauer',   labelEn: 'Master Thief',    slug: 'award-thief', zoom: 1,
                     frage: 'Wer hat heute am meisten geklaut?', frageEn: 'Who stole the most today?' },
    underdog:      { label: 'Underdog',        labelEn: 'Underdog',        slug: 'award-underdog', zoom: 1,
                     frage: 'Wer war heute der Underdog?', frageEn: 'Who was the underdog today?' },
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

// ── Der Takt der Award-Zeremonie ──────────────────────────────────────────
// 2026-08-25 (Wolf: „ich finde auch immernoch die awards zu wenig zelebriert
// ich haette gerne sowas wie: Wer war der Underdog heute, dann rollt das rad
// die teams wackeln durch, bis langsam das team stehen bleibt +x und dann den
// turm, das soll zelebriert werden, nicht gerusht" und „auch gerne groesser
// als bisher oder epischer").
//
// Vorher war die Karte ein Aushang: Zeichen, Name des Awards, und die Marke
// ratterte 1,6 s. Danach blieb eine Sekunde. Zusammen 3,2 s fuer den Moment,
// in dem der Abend jemanden auszeichnet.
//
// Jetzt sind es drei Takte, und der erste ist der wichtigste: die FRAGE steht
// allein da, ohne Antwort. Erst dann rollt das Rad.
/** Die Frage steht allein: „Wer war heute der Underdog?" */
const AWARD_FRAGE = 2000;
// Die Takte des Rades. Sie werden laenger, das ist das ganze Geheimnis: ein
// gleichmaessiges Durchblaettern liest sich als Ladebalken, ein bremsendes als
// Entscheidung. Modulweit, weil AWARD_ROLLT daraus GERECHNET wird - beim ersten
// Anlauf stand hier eine gerundete Zahl, und die war 162 ms zu kurz.
const AWARD_ROLL_TAKTE = [95, 95, 98, 104, 112, 124, 140, 162, 192, 232, 288, 360, 460, 600];
/** Das Rad rollt und wird langsamer. */
const AWARD_ROLLT = AWARD_ROLL_TAKTE.reduce((a, b) => a + b, 0);
/** Das Team steht, +X springt heraus, der Saal darf klatschen. */
const AWARD_STEHT = 1900;
/** Wie lange die Award-Karte insgesamt steht, bevor der Baustein waechst. */
const AWARD_KARTE = AWARD_FRAGE + AWARD_ROLLT + AWARD_STEHT;
/** Ein Tick je Punkt, der erste etwas laenger. */
const AWARD_TICK_ERST = 650;
const AWARD_TICK = 460;

/** Wie lange ein Award-Beat am Stueck laeuft. Das Steuerpult holt sich die
 *  Zahl hier ab, statt sie ein zweites Mal zu schaetzen. */
export function qqTurmAwardBeatDauer(bonus: number): number {
  return AWARD_KARTE + AWARD_TICK_ERST + Math.max(0, bonus - 1) * AWARD_TICK + AWARD_NACHKLANG;
}

/** Wie lange EIN Baustein im Rennen braucht, wenn danach noch `uebrig` Steine
 *  bis zum Etappenziel kommen. Zum Ende hin wird gebremst: genau da entscheidet
 *  sich, wer stehenbleibt. Dieselbe Treppe steht im Renn-Effekt. */
function rennSchritt(uebrig: number): number {
  return uebrig <= 1 ? 900 : uebrig === 2 ? 620 : uebrig === 3 ? 460 : 300;
}
// Der Abgang: Abstand zwischen zwei ausscheidenden Tuermen, und wie lange die
// Platz-Pille steht, bevor ihr Turm absinkt. Modulweit, weil die Dauer-Rechnung
// fuers Steuerpult sie braucht - der Beat muss laenger sein als die Zeremonie,
// die in ihm stattfindet.
// ⚠️ ABGANG_TAKT muss GROESSER sein als die Standzeit des Bandes
// (ABGANG_ANSAGE + ABGANG_BAND_AUS), sonst stehen zwei Ansagen uebereinander.
// Genau so aufgenommen: bei 1498 ms lagen „PLATZ 7 Wolfsrudel" und der Name
// des naechsten Teams uebereinander auf demselben Band.
const ABGANG_TAKT = 1200;
const ABGANG_ANSAGE = 900;
/** Wie lange das Band nach der Standzeit noch hinausfaehrt. */
const ABGANG_BAND_AUS = 250;
const ABGANG_SINKT = 1000;
/**
 * Wie lange die Platz-Ansage MINDESTENS steht, auch wenn der Moderator schon
 * weitergeklickt hat.
 *
 * 2026-08-26 (Wolf: „kein schoenes window mit dein team wurde 8 was
 * stehenbleibt"). Vorher waren es an dieser Stelle 200 ms - der Klick des
 * Moderators kam ja fast immer vor dem Etappenende, und dann fiel die Ansage
 * dem Vormerken zum Opfer. Ein Team, das den Abend ueber gespielt hat,
 * bekommt seinen Platz jetzt so lange, wie ein Applaus dauert.
 *
 * Steht der Moderator noch nicht weiter, bleibt die Ansage ohnehin unbegrenzt
 * stehen (siehe `wartetAuf` im Renn-Effekt) - er kann reden und einen Preis
 * uebergeben. Diese Zahl ist nur die Untergrenze.
 */
const EHRUNG_STAND = ABGANG_ANSAGE + ABGANG_SINKT + 900;
/** Nachklang nach einer Award-Vergabe, bevor der naechste Takt beginnt. */
const AWARD_NACHKLANG = 1500;
/**
 * Wie lange ein Renn-Beat am Stueck laeuft, von Takt `von` bis Takt `bis`, mit
 * `abgaenge` Tuermen, die am Ende gleichzeitig leer werden.
 *
 * Das Steuerpult holt sich die Dauer hier, statt sie nachzubauen: der Beamer
 * bremst zum Etappenende hin und verabschiedet danach jedes Team einzeln. Ein
 * Autoplay mit fester Zahl liefe ihm davon - und dann faende genau das nicht
 * statt, worum Wolf gebeten hat („der letzte platz soll nicht in 1 sekunde
 * abgehandelt sein").
 */
export function qqTurmRennBeatDauer(von: number, bis: number, abgaenge = 1): number {
  let ms = 0;
  for (let uebrig = Math.max(0, bis - von); uebrig >= 1; uebrig--) ms += rennSchritt(uebrig);
  const zeremonie = Math.max(0, abgaenge - 1) * ABGANG_TAKT + EHRUNG_STAND;
  return ms + zeremonie + 600;
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
// 2026-08-25: hier standen zwei Grautoene, MYST und MYST_EDGE. Sie waren die
// Farbe der anonymen Spitzentuerme. Die Anonymitaet ist raus - alle Tuerme
// tragen ihre Teamfarbe, von der ersten Kachel an. Was stattdessen zubleibt,
// ist die ZAHL der drei Finalisten; siehe `zahlOffen` weiter unten.

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
  const tippOf = useCallback((id: string) => teams.find(t => t.team.id === id)?.tipp ?? 0, [teams]);
  /** Stand VOR dem Rennen: Brett-Gebiet plus alle Award-Bausteine. */
  const sockelOf = useCallback((id: string) => baseOf(id) + (bonusByTeam[id] ?? 0), [baseOf, bonusByTeam]);
  const totalOf = useCallback((id: string) => sockelOf(id) + tippOf(id), [sockelOf, tippOf]);
  // 2026-08-23 (Wolf: „die kacheln fuer sonderpreise ist ein stern? ist das
  // extra?"). Der Stern war Absicht, aber die schwaechere Loesung: er sagt nur
  // DASS es ein Award war, nicht WELCHER. Die drei Awards haben eigene Zeichen
  // im gelieferten Set - Blitz, Muenze, Kleeblatt - und die stehen zwei Minuten
  // vorher gross auf der Award-Karte. Wer sie dort gesehen hat, erkennt sie im
  // Turm wieder, und die Tuerme erzaehlen dann, WOFUER die Punkte kamen.
  // Ein Award mit bonus 2 (Underdog) belegt zwei Bausteine, deshalb aufgefaltet.
  const awardZeichenProTeam = useMemo(() => {
    const m: Record<string, Array<{ slug: QQIconSlug; zoom: number }>> = {};
    for (const a of awards) {
      const liste = m[a.teamId] ?? (m[a.teamId] = []);
      for (let i = 0; i < a.bonus; i++) liste.push({ slug: a.slug, zoom: a.zoom ?? 1 });
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
  // ── Das Rennen ────────────────────────────────────────────────────────────
  // 2026-08-25 (Wolf: „aber es ist weird erst tuerme zu haben, dann wieder auf
  // 0? oder? ... wenn dann wuerde ich immer nur eine kachel bauen, solange bis
  // das letzte team raus ist (fliegt raus) dann weiter bauen, nacheinander
  // fliegen die raus die nicht mitkommen? am ende sind nur 2 uebrig").
  //
  // Er hat recht, und es war der letzte harte Schnitt im Finale: die drei
  // Spitzentuerme fielen beim Glide auf null zurueck und bauten sich noch
  // einmal auf. Ein Turm, der gerade gebaut wurde und dann wieder bei null
  // steht, nimmt seine eigene Aussage zurueck.
  //
  // Jetzt gibt es keinen Ruecksetzer mehr. Alle acht Tuerme stehen auf ihrem
  // Sockel (Brett + Awards), und dann faellt Takt fuer Takt EIN Tipp-Baustein
  // bei jedem, der noch welche hat. Wer leer ist und ueberholt wird, fliegt
  // raus. Am Ende stehen zwei, dann einer.
  //
  // Nachgerechnet ueber 4000 Abende (scratchpad/rennen.mjs): das Rennen laeuft
  // im Schnitt 4,3 Takte, es gibt dabei 1,8 echte Ueberholvorgaenge, und die
  // Teams scheiden ueber alle Takte verteilt aus (0,5 / 1,2 / 2,0 / 2,0 / 0,9).
  // Die naheliegende Variante - alle bei null anfangen lassen - waere 11,9
  // Takte lang gewesen, davon die ersten 6,5 ohne ein einziges Ausscheiden.
  const [rennTick, setRennTick] = useState(reduce ? Number.MAX_SAFE_INTEGER : 0);

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
  // ⚠️ Fuer die Plaetze 1 bis 3 gilt `platzSteht` weiter unten: die Pille
  // faellt erst, wenn der Turm auch wirklich stehenbleibt. Hier bleibt nur der
  // Fall „gehoert nicht zum Podest".
  const revealed = useCallback((rank: number) =>
    rank > 2 ? true : (phase === 'reveal' && revealStep >= (3 - rank)),
  [phase, revealStep]);

  // 2026-08-25 (Wolf: „alle tuerme in farbe, mach das. Aber wir brauchen den
  // spannungsmoment am ende").
  //
  // Bis hierher bauten die Spitzenreiter ANONYM: graue Tuerme, „???" statt
  // Name, und der Award ging an „Einen der Spitzentuerme". Das hat mehr
  // gekostet als gebracht. Die HOEHE verraet die Reihenfolge ohnehin - grau
  // versteckte also nicht, wer vorn liegt, sondern nur, wer es ist. Und das
  // ist ausgerechnet der Teil, der Spass macht: die Kacheln fliegen in
  // Teamfarbe ein, wer hinschaut weiss es sowieso, und die Award-Zeremonie
  // verlor ihre Pointe fuer genau die drei interessantesten Teams.
  //
  // Statt der Identitaet bleibt jetzt die ZAHL zu (`zahlOffen` weiter unten).
  // Wer oben mitspielt, ist offen - wie weit oben, sagt erst der Schluss.
  // Das ist auch die ehrlichere Luecke: zwischen Platz eins und drei liegen
  // meist ein, zwei Bausteine, und die zaehlt auf zehn Metern niemand mit.

  // ── Der Rennplan ──────────────────────────────────────────────────────────
  // Ein Team ist FERTIG, wenn seine Tipp-Bausteine aufgebraucht sind, also nach
  // `tipp` Takten. Danach kann es nur noch zusehen. Wann es RAUSFLIEGT, haengt
  // an seinem Platz, nicht am Takt: die Plaetze 4 und tiefer verlassen die
  // Buehne im ersten Renn-Beat, sobald sie fertig sind (einer nach dem
  // anderen, das ist die Staffelung, die Wolf beschrieben hat). Platz 3 und
  // Platz 2 gehen erst, wenn ihr Beat sie freigibt - sonst waere die Pille mit
  // dem Platz weg, bevor sie jemand gelesen hat.
  //
  // ⚠️ finalRanking, NICHT ordered - `ordered` ist die Spalten-Anordnung auf der
  // Buehne (hash-gemischt, damit die Reihenfolge nichts verraet).
  // `rennZiele[k]` ist das Takt-Ziel der Etappe k, und Etappe k gehoert dem Team
  // auf Platz N-k. Etappe 1 ist also der LETZTE Platz, Etappe N der Sieger.
  const rennZiele = useMemo(() => qqTurmRennplan(
    finalRanking.map(x => x.team.id),
    Object.fromEntries(teams.map(t => [t.team.id, t.tipp])),
  ), [finalRanking, teams]);

  /** Bis zu welchem Takt darf in dieser Etappe gebaut werden? */
  const rennZielFuer = useCallback((step: number) =>
    rennZiele[Math.max(0, Math.min(rennZiele.length - 1, step))] ?? 0,
  [rennZiele]);

  /** Welcher Platz (0-basiert) wird in Etappe `step` geehrt? */
  const platzInEtappe = useCallback((step: number) => N - step, [N]);

  // 2026-08-25, an der Aufnahme gemessen (scripts/rennen-messen.mjs): die Pille
  // „PLATZ 3" stand schon bei 1074 ms da, waehrend der Beat, der Platz 3
  // ueberhaupt erst entscheidet, noch lief. Der Grund war, dass sie nur am
  // Beat hing (`revealStep`) und nicht daran, ob der Turm auch STEHT. Damit
  // sagte die Buehne das Ergebnis an, bevor die Bausteine es zeigten - genau
  // der Verrat, den das Rennen abschaffen soll.
  /**
   * Steht der Platz dieses Rangs fest, also: ist sein Turm fertig UND ist seine
   * Etappe erreicht? Die Etappe des Rangs r ist N-r: der letzte Platz kommt
   * zuerst, der Sieger zuletzt.
   */
  const platzSteht = useCallback((rank: number) => {
    if (phase !== 'reveal') return false;
    const meineEtappe = N - rank;
    return revealStep >= meineEtappe && rennTick >= rennZielFuer(meineEtappe);
  }, [phase, revealStep, rennTick, rennZielFuer, N]);

  /**
   * Steht dieser Turm noch auf der Buehne?
   *
   * 2026-08-25, zweite Fassung (Wolf: „ne die teams fallen zu frueh runter, das
   * ist keine siegerehrung, die fallen einfach durch andere teams runter ...
   * machs steuerbar, turmbau bis letztes team alle kacheln hat, dann badge auf
   * screen team x ist platz y, dann erst weiter, schritt fuer schritt").
   *
   * Vorher ging ein Turm, sobald seine Bausteine aufgebraucht waren - mehrere
   * gleichzeitig, mitten im laufenden Bau der anderen. Jetzt bleibt er
   * stehen, solange seine Etappe LAEUFT, und tritt erst ab, wenn der Moderator
   * weiterschaltet. Ein Beat, ein Team, ein Platz.
   */
  const nochDrin = useCallback((id: string) => {
    const rank = rankById[id];
    if (rank == null) return true;
    if (rank === 0) return true;                 // der Sieger bleibt immer
    // Solange die eigene Etappe laeuft, bleibt der Turm stehen. Erst der
    // naechste Beat des Moderators laesst ihn abtreten. Damit ist die Buehne am
    // Anfang jedes Beats bereits geraeumt, und beim letzten steht der Sieger
    // allein da, egal wie schnell weitergeschaltet wird - das war der Fehler,
    // den Wolf an derselben Stelle gemeldet hat („aber bei step 13 war noch gar
    // nicht der siegerturm alleine da?").
    return revealStep <= N - rank;
  }, [rankById, revealStep, N]);

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
      // Erst das laufende Rennen zu Ende bringen, dann erst den naechsten Platz
      // freigeben. Sonst friert ein schnelles Vorspulen die Tuerme auf halber
      // Hoehe ein und das Schlussbild zeigt falsche Staende.
      const target = rennZielFuer(Math.max(1, revealStep));
      if (revealStep === 0) { setRevealStep(1); return; }
      if (rennTick < target) { setRennTick(target); return; }
      setRevealStep(x => Math.min(N, x + 1));
    }
  }, [phase, hasAwards, awardStage, awardIdx, awardTick, curAward, awards.length, rennTick, revealStep, rennZielFuer, letzteWelle, LANDE_VERZUG, N]);

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
  // ── Der Moderator ist die Uhr ─────────────────────────────────────────────
  // 2026-08-25 (Wolf: „ich kann den finalen turmbaum nicht anschauen, er
  // skippt bei 13/16 steps").
  //
  // Aufgenommen: bei Beat 7 stand die Siegerfolie, waehrend der Turm noch bei
  // den Awards war. Podest, Duell und Enthuellung fielen ersatzlos weg.
  //
  // Der Grund war einseitig gebaut: der Turm WARTETE auf den Moderator
  // (`liveBeat < X` → nichts tun), aber er holte nie auf, wenn er hinterherlag.
  // Jede Stufe braucht ihre feste Zeit - eine Award-Karte allein 3,2 s -, und
  // wer schneller klickt, laeuft dem Turm einfach davon. Die Folien-Umschaltung
  // auf die Kroenung haengt dagegen NUR am Beat, die kommt puenktlich.
  //
  // Jetzt gilt in beide Richtungen: liegt der Moderator vor der Stufe, wartet
  // der Turm. Liegt er dahinter, faehrt der Turm die Stufe im Schnelldurchlauf
  // zu Ende. Die Choreografie bleibt vollstaendig, sie wird nur gestaucht.
  /** Wartet diese Stufe noch auf ihren Beat? */
  const wartetAuf = useCallback((beat: number) => live && (liveBeat ?? 0) < beat, [live, liveBeat]);
  /** Ist der Moderator schon WEITER als diese Stufe? Dann aufholen.
   *
   * 2026-08-26 (Wolf: „die einzelnen teams die rausfliegen werden eine
   * millisekunde gefeiert ... das ist alles etwas ueberhastet und kein episches
   * finale. das muss event maximiert werden BUEHNE das ist der MOMENT des
   * abends").
   *
   * Hier stand `> beat`, und das war der ganze Fehler. Einen Beat voraus ist
   * der Moderator IMMER, sobald er waehrend einer laufenden Etappe schon
   * weiterklickt - und das ist der normale Griff am Steuerpult, nicht die
   * Ausnahme. Jeder dieser Klicks hat die gerade laufende Zeremonie auf null
   * gerafft: die Award-Karte von 6,3 s auf 0,6 s, die Platz-Ansage von ihrer
   * Standzeit auf 200 ms. Deshalb war alles „eine Millisekunde".
   *
   * Ein Klick heisst jetzt VORMERKEN: die laufende Etappe spielt zu Ende,
   * danach geht es ohne Warten weiter. Erst wer ZWEI Beats voraus ist, hat
   * bewusst uebersprungen - oder der Beamer ist mitten im Finale dazugekommen
   * und muss aufholen. Nur dann wird gerafft.
   */
  const laeuftHinterher = useCallback((beat: number) => live && (liveBeat ?? 0) > beat + 1, [live, liveBeat]);

  useEffect(() => {
    if (phase !== 'brett') return;
    // Der Brettfall gehoert zu Beat 0. Ist der Moderator schon weiter, wird er
    // in einem Rutsch fertig gefallen statt Welle fuer Welle.
    if (laeuftHinterher(0) && brettWelle <= letzteWelle + LANDE_VERZUG) {
      setBrettWelle(letzteWelle + LANDE_VERZUG + 1);
      return;
    }
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
  }, [phase, brettWelle, letzteWelle, LANDE_VERZUG, BRETT_HALT, teams, gelandet, laeuftHinterher]);

  useEffect(() => {
    if (phase !== 'base') return;
    // Auch der Sockelbau gehoert zu Beat 0.
    if (laeuftHinterher(0) && baseTick < maxBase) { setBaseTick(maxBase); return; }
    if (baseTick >= maxBase) { const h = window.setTimeout(() => setPhase('baseHold'), live ? 200 : 500); return () => window.clearTimeout(h); }
    const h = window.setTimeout(() => { setBaseTick(t => t + 1); try { playWoodKnock(); } catch { /* noop */ } }, 340);
    return () => window.clearTimeout(h);
  }, [phase, baseTick, maxBase, laeuftHinterher, live]);

  useEffect(() => {
    if (phase !== 'baseHold') return;
    if (wartetAuf(1)) return; // Hybrid: warte auf Moderator-Beat 1
    const h = window.setTimeout(() => { setAwardIdx(0); setAwardStage('card'); setAwardTick(0); setPhase(hasAwards ? 'award' : 'reveal'); }, live ? (laeuftHinterher(1) ? 0 : 300) : 2200);
    return () => window.clearTimeout(h);
  }, [phase, hasAwards, live, wartetAuf, laeuftHinterher]);

  // Award-Zeremonie: grosse Karte → Turm waechst → Pause → naechster.
  useEffect(() => {
    if (phase !== 'award' || !curAward) return;
    // Award i gehoert zu Beat i+1.
    const meinBeat = awardIdx + 1;
    const eile = laeuftHinterher(meinBeat);
    if (awardStage === 'card') {
      try { playSpecialAwardReveal(); } catch { /* noop */ }
      const h = window.setTimeout(() => { setAwardStage('grow'); setAwardTick(0); }, eile ? 600 : AWARD_KARTE);
      return () => window.clearTimeout(h);
    }
    // grow
    if (eile && awardTick < curAward.bonus) { setAwardTick(curAward.bonus); return; }
    if (awardTick >= curAward.bonus) {
      // Hybrid: der naechste Award / die Enthuellung wartet auf den Moderator-Beat.
      if (wartetAuf(meinBeat + 1)) return;
      const h = window.setTimeout(() => {
        if (awardIdx + 1 >= awards.length) setPhase('reveal');
        else { setAwardIdx(i => i + 1); setAwardStage('card'); setAwardTick(0); }
      }, live && eile ? 0 : AWARD_NACHKLANG);
      return () => window.clearTimeout(h);
    }
    const h = window.setTimeout(() => { setAwardTick(t => t + 1); try { playTick(); } catch { /* noop */ } }, awardTick === 0 ? AWARD_TICK_ERST : AWARD_TICK);
    return () => window.clearTimeout(h);
  }, [phase, curAward, awardStage, awardTick, awardIdx, awards.length, live, wartetAuf, laeuftHinterher]);

  // ── Die Siegerehrung, ein Beat je Team ────────────────────────────────────
  // 2026-08-25, zweite Fassung (Wolf: „ne die teams fallen zu frueh runter, das
  // ist keine siegerehrung, die fallen einfach durch andere teams runter, wir
  // brauchen viel mehr zeit dafuer, das ist ein event, eventuell werden preise
  // vergeben, das darf nicht so runterrattern, machs steuerbar, turmbau bis
  // letztes team alle kacheln hat, dann badge auf screen team x ist platz y,
  // dann erst weiter, schritt fuer schritt").
  //
  // Etappe k gehoert dem Team auf Platz N-k, also von hinten nach vorne:
  //   A+1   gebaut wird, bis der LETZTE Platz fertig ist → sein Band steht
  //   A+2   er tritt ab, weiter bauen bis der vorletzte fertig ist → sein Band
  //   ...
  //   A+N   der Sieger, allein auf der Buehne, letzter Baustein, Krone
  // (A+N+1 ist die eigene Siegerfolie, die haengt nicht mehr am Turm.)
  //
  // Der Beat endet NICHT von selbst, solange der Moderator taktet. Genau das
  // ist der Punkt: an jeder Etappe kann er stehenbleiben, reden und einen Preis
  // uebergeben.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const rennBeat = awards.length + 1;
    // Etappe 0 gibt es nicht mehr: die Ehrung beginnt sofort mit dem letzten
    // Platz. Ohne das stuende ein Beat lang ein fertiges Bild ohne Aussage.
    if (revealStep === 0) { setRevealStep(1); return; }
    const meinBeat = rennBeat + revealStep - 1;
    const target = rennZielFuer(revealStep);
    // Liegt der Moderator schon hinter dieser Etappe, wird gebaut statt
    // getickt: die Bausteine stehen sofort.
    if (laeuftHinterher(meinBeat) && rennTick < target) { setRennTick(target); return; }
    // 1) Noch nicht am Etappenziel → naechsten Baustein setzen.
    if (rennTick < target) {
      // Bremsen zum Etappenende hin: die letzten drei Bausteine bekommen
      // spuerbar mehr Zeit. Genau da bleibt einer stehen.
      // Dieselbe Treppe steckt in `qqTurmRennBeatDauer` fuers Steuerpult.
      const step = rennSchritt(target - rennTick);
      const h = window.setTimeout(() => {
        setRennTick(t => t + 1);
        try { playWoodKnock(); } catch { /* noop */ }
      }, step);
      return () => window.clearTimeout(h);
    }
    // 2) Der Sieger steht. Fanfare, und hier endet die Choreo.
    if (revealStep >= N) {
      try { playClimaxFinish(); } catch { /* noop */ } try { playFanfare(); } catch { /* noop */ }
      return;
    }
    // 3) Etappenziel erreicht → das Band mit Platz und Namen steht.
    // Live wartet der naechste Schritt auf den Moderator, und zwar OHNE
    // Zeitdruck. In der Vorschau laeuft er nach einer Lesepause weiter.
    if (wartetAuf(meinBeat + 1)) return;
    const hold = live && laeuftHinterher(meinBeat) ? 0 : EHRUNG_STAND;
    const h = window.setTimeout(() => { setRevealStep(x => x + 1); try { playReveal(); } catch { /* noop */ } }, hold);
    return () => window.clearTimeout(h);
  }, [phase, revealStep, rennTick, rennZielFuer, live, awards.length, N, wartetAuf, laeuftHinterher]);

  const inReveal = phase === 'reveal';
  // Gekroent wird erst, wenn der letzte Baustein liegt. Vorher waere die Krone
  // die Ansage des Ergebnisses, und der Stein danach nur noch Nachtrag.
  const crowned = platzSteht(0);

  // ── Messpunkt fuer die Werkzeuge ──────────────────────────────────────────
  // 2026-08-26 (Wolf: „optimier bitte mal den messaufbau").
  //
  // Die Skripte haben den Zustand des Finales bisher aus dem Bildschirmtext
  // geraten und dann blind nachgeklickt - dabei sind in einem Durchlauf drei
  // Ehrungen uebersprungen worden, und die Messung mass am Ende ihr eigenes
  // Klicken statt der Buehne. Wer den Takt eines Ablaufs pruefen will, muss
  // sehen, bei welchem Takt der Ablauf steht.
  //
  // Nur lesen, nie schreiben: das hier steuert nichts, es berichtet. Kosten
  // sind ein Objekt je Render, kein Effekt und kein Zustand.
  (globalThis as unknown as { __qqTurm?: unknown }).__qqTurm = {
    phase, revealStep, rennTick, awardIdx, awardStage, awardTick,
    liveBeat: liveBeat ?? null, live,
    // Bei welchem Beat steht die Buehne gerade selbst? Damit sieht ein
    // Werkzeug, ob der Moderator vorgemerkt hat (ein Beat voraus) oder
    // uebersprungen (zwei und mehr, dann wird gerafft).
    eigenerBeat: phase === 'reveal' ? awards.length + revealStep
      : phase === 'award' ? awardIdx + 1
      : 0,
    teams: N, awards: awards.length, crowned,
  };

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

  // ── Wo die Tuerme stehen, waehrend das Feld schrumpft ─────────────────────
  // 2026-08-25 (Wolf: „3. platz turm soll absinken, sonst weiss man schon, dass
  // mittlerer turm gewinnt", und dann: „nacheinander fliegen die raus die nicht
  // mitkommen? am ende sind nur 2 uebrig").
  //
  // Frueher war die Anordnung Sieger-Mitte, Zweiter-links, Dritter-rechts, und
  // sie stand VOR dem Klettern fest - wer die Regel kannte, wusste ab dem Glide
  // Bescheid. Dann kam eine Zwischenstufe mit fester Dreier- und Zweierbank.
  //
  // Jetzt braucht es gar keine Sonderfaelle mehr: die verbleibenden Tuerme
  // stehen IMMER mittig verteilt, egal ob es acht sind oder zwei. Fliegt einer
  // raus, ruecken die anderen in die Luecke. Das ist eine einzige, durchgehende
  // Bewegung ueber das ganze Rennen statt drei geschnittener Zustaende, und die
  // Stellung verraet bis zum letzten Baustein nichts.
  const verbleibend = useMemo(
    () => ordered.map(t => t.team.id).filter(id => nochDrin(id)),
    [ordered, nochDrin],
  );
  /** Mittig verteilt, in Buehnenreihenfolge. Zu dritt und zu zweit rueckt die
   *  Reihe enger zusammen (PGAP), damit sie als Podest liest und nicht als
   *  Rest einer Achterreihe. */
  // ── Der Abgang ────────────────────────────────────────────────────────────
  // Seit der zweiten Fassung braucht es hier keine Staffelung mehr: jedes Team
  // hat seinen eigenen Beat, das Band mit Platz und Namen stand den ganzen Beat
  // ueber, und beim Weiterschalten sinkt genau EIN Turm. Die frueheren
  // ABGANG_TAKT-Verzoegerungen (mehrere Abgaenge in einem Beat, 620 ms
  // auseinander) sind damit gegenstandslos.

  const platzX = (id: string) => {
    const n = verbleibend.length;
    const i = verbleibend.indexOf(id);
    // Wer gerade abtritt, bleibt stehen, wo er stand - er faellt nach unten
    // weg, er soll nicht auch noch seitlich rutschen.
    if (i < 0 || n === 0) return baseX(orderIndex[id]);
    const luecke = n <= 3 ? PGAP : colGap;
    const breite = n * colW + (n - 1) * luecke;
    return (STAGE_W - breite) / 2 + i * (colW + luecke);
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
  // 2026-08-26: die Flaeche steht jetzt in frontend/src/qqKachel.ts. Sie war
  // hier zu Hause und wurde deshalb ueberall sonst NICHT benutzt - der Turm
  // hatte Bausteine, die Teamkacheln daneben etwas anderes. Wolf: „Kacheln
  // immer mit 3D-Effekt".
  const kachelFlaeche = (farbe: string, rand: string) => qqKachelFlaeche({ farbe, rand });

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
    // Das Rennen: jeder baut von SEINEM Sockel aus weiter, einen Baustein je
    // Takt. Das `min` sorgt dafuer, dass ein Turm bei seiner Zielhoehe von
    // selbst stehenbleibt, waehrend die anderen weiterwachsen - genau daran
    // sieht man, wer nicht mehr mitkommt.
    return Math.min(totalOf(id), sockelOf(id) + rennTick);
  };

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
        // Der Titel folgt der Etappe, nicht dem Beat: er sagt, was gerade
        // auf der Buehne passiert, und ist damit nachzaehlbar.
        //
        // 2026-08-25 (Wolf: „was soll das heissen? wir haben die tipps doch
        // vorher?"). Hier stand „Und jetzt die Tipps / Wer nicht mitkommt,
        // fliegt raus". Beides war falsch: die Tipps sind auf den Folien davor
        // laengst aufgeloest, hier fallen nur noch ihre BAUSTEINE, und seit der
        // zweiten Fassung fliegt auch niemand mehr im Bauen raus.
        ) : inReveal && revealStep >= N ? (
          <div style={{ fontSize: istBuehne ? 44 : 32, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2Breathe 1.6s ease-in-out infinite' }}>{de ? 'Und der Sieger ist…' : 'And the winner is…'}</div>
        ) : inReveal && verbleibend.length === 2 ? (
          <>
            <div style={{ fontSize: istBuehne ? 44 : 32, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2Breathe 1.6s ease-in-out infinite' }}>{de ? 'Nur noch zwei' : 'Just two left'}</div>
            <div style={{ fontSize: istBuehne ? 28 : 16, fontWeight: 700, color: istBuehne ? 'var(--qq-text-muted)' : '#B9AEDA' }}>{de ? 'Ein Baustein entscheidet' : 'One block decides it'}</div>
          </>
        ) : inReveal ? (
          <>
            <div style={{ fontSize: istBuehne ? 44 : 32, fontWeight: 900, color: 'var(--qq-text)', animation: reduce ? 'none' : 'qqT2Breathe 1.7s ease-in-out infinite' }}>{de ? 'Die Siegerehrung' : 'The awards'}</div>
            <div style={{ fontSize: istBuehne ? 28 : 16, fontWeight: 700, color: istBuehne ? 'var(--qq-text-muted)' : '#B9AEDA' }}>{de ? 'Von hinten nach vorne' : 'From last place up'}</div>
          </>
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

          {/* Die verstreuten Kacheln: sichtbar, aber sie fliegen nicht mit.
              Sie gehen in DERSELBEN Welle wie die Kacheln ihrer Zeile.
              2026-08-25 (Wolf: „am anfang wenn die kacheln auf die tuerme fallen
              werden nicht alle gezeigt"). Gezaehlt: bei 1780 ms verschwanden 45
              von 64 Kacheln auf einen Schlag, weil alle verstreuten Felder
              denselben festen Verzug hatten. Uebrig blieben die neunzehn, die
              fliegen - und genau so sah es aus, als fehlten Kacheln.
              Zeilenweise erzaehlt dieselbe Bewegung jetzt die Regel mit: in
              jeder Zeile steigt das zusammenhaengende Gebiet auf, der Rest
              sinkt weg. */}
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
                animation: `qqT2StreuAus 0.62s ease ${BRETT_HALT + ((gGroesse - 1) - k.r) * WELLE + k.c * SPALTEN_VERZUG}ms both`,
              }}>
                {t && <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={Math.round(brettZelle * 0.8)} flat />}
              </div>
            );
          })}

          {/* Die fliegenden Kacheln */}
          {Object.entries(flugplan).flatMap(([id, liste]) => {
            const t = teamById(id);
            if (!t) return [];
            // 2026-08-25: die Kacheln der Spitzenreiter verloren hier im Flug
            // ihre Teamfarbe, damit die Tuerme oben anonym bleiben konnten.
            // Die Anonymitaet ist raus (siehe oben), also fliegt jede Kachel in
            // der Farbe, in der sie am Brett lag.
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
        // Der Sieger wird erst mit dem LETZTEN Baustein gekroent, nicht schon
        // zu Beginn seines Beats - sonst stuende die Krone da, waehrend der
        // Stein, der sie verdient, noch faellt.
        const show = rank <= 2 ? platzSteht(rank) : revealed(rank);
        const colr = team.color;
        const edge = team.color;
        // 2026-08-25: hier stand `zahlOffen`, das die Zahl der drei Spitzen-
        // tuerme bis zur Enthuellung auf „???" hielt. Das war die Spannung, die
        // es brauchte, SOLANGE alle Tuerme fertig dastanden. Im Rennen erzeugt
        // die Bewegung sie selbst: eine Zahl, die mitklettert und dann
        // stehenbleibt, sagt genau das, was der Saal wissen soll - dieser hier
        // ist fertig. Verdeckt waere sie nur noch eine fehlende Information.
        const towerPx = shown * blockH + Math.max(0, shown - 1) * GAP;
        const badge = rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
        const i = orderIndex[id];

        // Stellung und Abtritt. Beides folgt jetzt EINER Regel: wer noch drin
        // ist, steht mittig in der Reihe der Verbleibenden; wer raus ist, sinkt
        // ab. Siehe `verbleibend` / `platzX` oben.
        const abtritt = inReveal && !nochDrin(id);
        let tx = 0, ty = 0, opacity = 1, z = 4;
        if (inReveal) {
          tx = platzX(id) - baseX(i);
          // Absinken: nach unten weg UND ausblenden. Nur nach unten reicht
          // nicht - ein Turm kann siebenhundert Pixel hoch sein, der waere
          // mit einer sichtbaren Strecke nie ganz aus dem Bild. Die
          // Richtung erzaehlt „er geht", die Deckkraft raeumt ihn weg.
          if (abtritt) { ty = 340; opacity = 0; }
          z = isWinner ? 7 : isTop3 ? 6 : 4;
        }
        // Jeder bekommt seine Pille: das Podest, sobald sein Platz feststeht,
        // und jedes ausscheidende Team beim Abgang. Siehe `abgangVerzug` oben.
        const showBadge = inReveal && (rank <= 2 ? show : abtritt);
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
              // Das Band stand den ganzen Beat ueber, gelesen ist es also
              // laengst. Der Turm sinkt jetzt sofort, wenn weitergeschaltet wird.
              ? 'transform 1s cubic-bezier(0.34,0,0.5,0.9), opacity 0.5s ease 0.5s'
              // Die Verbleibenden ruecken mit 250 ms Verzug nach: erst sieht
              // man den Abtritt, dann das Zusammenruecken. Zwei Aussagen
              // hintereinander lesen sich, gleichzeitig verwischen sie.
              : 'transform 0.75s cubic-bezier(0.4,0,0.2,1) 0.25s, opacity 0.5s ease',
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
              animation: (isWinner && inReveal && revealStep >= N && !crowned && !reduce) ? 'qqT2Heartbeat 1.5s ease-in-out infinite' : 'none',
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
                    {/* 2026-08-25: auf der Buehne 30px statt 20px, wenn die
                        Pille einen Abgang begleitet. Wolf: „es soll schon sowas
                        kommen wie team x auf platz 8, weisst du damit die teams
                        sich nicht komplett uebersehen fuehlen?" - eine Ansage,
                        die aus zehn Metern nicht zu lesen ist, ist keine. Die
                        Podest-Pillen bleiben, wo sie waren; die stehen lange
                        genug und haben den Turm daneben als Aussage. */}
                    <span style={{ fontSize: istBuehne ? 22 : 13, fontWeight: 900, letterSpacing: '0.05em', color: 'var(--qq-text)', background: 'rgba(15,8,23,0.94)', border: `2px solid ${colr}`, borderRadius: 999, padding: istBuehne ? '4px 14px' : '2px 9px' }}>{de ? `PLATZ ${rank + 1}` : `#${rank + 1}`}</span>
                  </div>
                )}
                {!istBuehne && (
                <div style={{ width: AV_OBEN, height: AV_OBEN, borderRadius: quirkSet ? '18%' : '50%', background: colr, border: `3px solid ${edge}`, boxShadow: istBuehne ? 'none' : `0 0 14px ${colr}77`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', animation: (isTop3 && show && !reduce) ? 'qqT2Reveal 0.6s ease-out both' : 'none' }}>
                  <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={AV_OBEN} flat />
                </div>
                )}
              </div>

              {/* Kacheln */}
              {Array.from({ length: shown }).map((_, bi) => {
                const isTopBlock = bi === shown - 1;
                // ⚠️ Der Stapel hat seit dem Rennen DREI Abschnitte, nicht zwei:
                // unten das Brett-Gebiet (0 bis base), darueber die Awards, ganz
                // oben die Tipp-Bausteine aus dem Rennen. `bi >= base` allein
                // hat die Tipp-Bausteine mit als Awards gezaehlt und ihnen das
                // Award-Zeichen aufgedruckt.
                const isAwardBlock = bi >= base && bi < base + (bonusByTeam[id] ?? 0);
                const isCrownBlock = isWinner && crowned && isTopBlock;
                return (
                  <div key={bi} style={{
                    width: blockW, height: blockH, position: 'relative', zIndex: 1,
                    ...kachelFlaeche(colr, edge),
                    // 2026-08-25 (Wolf: „wenn du die awards auf die tuerme
                    // packst, machs in der teamfarbe nur dem mit awards emoji").
                    // Bis hierher war der Award-Baustein GOLD. Das kam aus der
                    // Zeit, als die Tuerme grau bauten und Gold der einzige
                    // Farbtraeger war. Seit alle Tuerme ihre Teamfarbe tragen,
                    // reisst ein goldener Stein den Stapel mitten durch: er
                    // gehoert optisch nicht mehr zum Turm, obwohl er der
                    // wertvollste Stein darin ist. Jetzt traegt jeder Baustein
                    // die Teamfarbe, und der Award sagt sich ueber sein ZEICHEN.
                    // Der Hof AUSSERHALB des Bausteins bleibt weg (2026-08-23):
                    // der Schein weichte auf Projektionsdistanz die Kante auf,
                    // und die Kante ist es, die den Stapel als Stapel lesbar
                    // macht. Die inneren Lichtkanten bleiben, die sitzen drin.
                    transformOrigin: 'bottom center',
                    transition: 'background 0.45s ease, border-color 0.45s ease',
                    // 2026-08-24: waehrend „Das Brett faellt" bringt die
                    // fliegende Kachel ihre eigene Bewegung mit und liegt beim
                    // Aufsetzen exakt hier. Der Fall-Effekt des Bausteins wuerde
                    // dieselbe Kachel ein zweites Mal fallen lassen - und weil
                    // qqT2Drop bei opacity 0 beginnt, saehe man dabei die
                    // fliegende Kachel durch den Baustein hindurch.
                    // ⚠️ 2026-08-26 (Wolf: „die kacheln kommen alle an und dann
                    // blitzen sie kurz noch einmal, nachdem alle auf ihrer
                    // position sind").
                    //
                    // Hier stand `phase !== 'brett'`. Die Absicht war richtig
                    // und steht im Absatz darueber: waehrend der Brettfall
                    // laeuft, bringt die fliegende Kachel ihre eigene Bewegung
                    // mit, der Baustein soll nicht ein zweites Mal fallen.
                    //
                    // Der Ausdruck taugt dafuer aber nicht. Er ist an die PHASE
                    // gebunden, und die kippt fuer ALLE Tuerme in derselben
                    // Sekunde. In diesem Moment wechselt die Bedingung fuer
                    // jeden obersten Baustein von falsch auf wahr, React montiert
                    // ihn neu, und acht Tuerme fallen und blitzen gleichzeitig -
                    // obwohl gerade nichts gelandet ist.
                    //
                    // Richtig ist die Herkunft des Bausteins, nicht der Zeitpunkt:
                    // die Bausteine unter `base` sind das Brett-Gebiet, die sind
                    // GEFLOGEN. Alles darueber (Awards, Rennen) wird gesetzt und
                    // darf fallen. `bi >= base` sagt das direkt und haengt an
                    // nichts, das sich fuer alle gleichzeitig aendert.
                    animation: (isTopBlock && bi >= base && !reduce && phase !== 'brett')
                      ? (isCrownBlock ? 'qqT2CrownBlock 0.8s cubic-bezier(0.3,1.5,0.4,1) both' : 'qqT2Drop 0.46s cubic-bezier(0.3,1.35,0.5,1) both')
                      : 'none',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isAwardBlock
                      ? (istBuehne
                          ? (() => {
                              const z = awardZeichenProTeam[id]?.[bi - base] ?? { slug: 'award-speedy' as QQIconSlug, zoom: 1 };
                              return <QQIcon slug={z.slug} size={Math.round(blockW * 0.66 * z.zoom)} />;
                            })()
                          : <span aria-hidden style={{ fontSize: Math.round(blockW * 0.6), lineHeight: 1, color: 'rgba(12,8,4,0.62)' }}>★</span>)
                      : <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={avInBlock} flat />}
                    {/* Der Lande-Blitz bleibt: er ist transient und sagt
                        „dieser Baustein ist GERADE gefallen". Ein Schein mit
                        Bedeutung bleibt, einer der nur schmueckt geht. */}
                    {isTopBlock && bi >= base && !reduce && phase !== 'brett' && !(inReveal && !isTop3) && (
                      <div aria-hidden style={{ position: 'absolute', inset: -1, borderRadius: 5, pointerEvents: 'none', boxShadow: `0 0 ${istBuehne ? 10 : (isCrownBlock ? 22 : 12)}px ${colr}${isCrownBlock ? 'ee' : 'aa'}`, animation: `qqT2Spark ${isCrownBlock ? 0.7 : 0.5}s ease-out both` }} />
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
              <div style={{ fontSize: istBuehne ? 42 : 30, fontWeight: 900, lineHeight: 1, color: istBuehne ? 'var(--qq-text)' : (capped ? colr : '#E2D6FF'), fontVariantNumeric: 'tabular-nums', textShadow: (capped && !istBuehne) ? `0 0 14px ${colr}66` : 'none', transition: 'color 0.3s ease' }}>
                <span key={shown} style={{ display: 'inline-block', animation: (shown > 0 && !crowned && !reduce) ? 'qqT2NumPop 0.3s ease-out' : 'none' }}>{shown}</span>
              </div>
              {/* 2026-08-24, gemessen: die Teamnamen im Sockel standen zwischen
                  22,5 und 25px, das „???" der noch anonymen Tuerme bei 24px.
                  Unter einem 140px breiten Baustein-Turm ist das der kleinste
                  Text der Folie - ausgerechnet der Name, um den es geht.
                  minFontSize haelt ihn auch bei langen Namen ueber dem Boden;
                  zwei Zeilen sind erlaubt und darunter ist Platz. */}
              {<TeamNameLabel name={team.name} maxLines={2} shrinkAfter={12} color="#F6EFE6" fontWeight={800} minFontSize={istBuehne ? '26px' : undefined} fontSize={istBuehne ? 'clamp(22px, 1.8cqw, 30px)' : 'clamp(12px, 1cqw, 16px)'} style={{ maxWidth: colW + 8, textAlign: 'center', lineHeight: 1.05 }} />}
            </div>
          </div>
        );
      })}

      {/* ── Das Band mit Platz und Namen ────────────────────────────────
          2026-08-25 (Wolf: „teams die plaetze niedriger als top 3 haben, fallen
          einfach runter ohne eigene siegerehrung" und danach „das darf nicht so
          runterrattern ... dann badge auf screen team x ist platz y, dann erst
          weiter").

          Es gehoert der LAUFENDEN Etappe und bleibt stehen, bis der Moderator
          weiterschaltet. Vorher lief es als Animation mit fester Dauer ab und
          war nach anderthalb Sekunden weg, egal wie lange der Beat noch stand -
          bei einem Abend, an dem hier Preise uebergeben werden, ist das genau
          verkehrt herum. */}
      {inReveal && (() => {
        const rank = platzInEtappe(revealStep);
        if (rank < 1 || rank >= N) return null;      // 0 ist der Sieger, der bekommt die Krone
        const eintrag = finalRanking[rank];
        if (!eintrag || !platzSteht(rank)) return null;
        const t = eintrag.team;
        return (
          <div key={`ansage-${t.id}`} data-qq-ansage={t.id} style={{
            position: 'absolute', left: 0, right: 0, top: TITLE_H + 26, zIndex: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
            pointerEvents: 'none',
            animation: reduce ? 'none' : 'qqT2AnsageBand 0.55s cubic-bezier(0.2,1.2,0.35,1) both',
          }}>
            <span style={{
              fontSize: istBuehne ? 36 : 20, fontWeight: 900, letterSpacing: '0.06em',
              color: '#12100E', background: t.color, borderRadius: 999,
              padding: istBuehne ? '9px 28px' : '4px 14px', whiteSpace: 'nowrap',
            }}>{de ? `PLATZ ${rank + 1}` : `#${rank + 1}`}</span>
            <TeamNameLabel
              name={t.name}
              fontSize={istBuehne ? '66px' : '32px'}
              minFontSize={istBuehne ? '40px' : '20px'}
              color="var(--qq-text)"
              fontWeight={900}
              maxLines={1}
              shrinkAfter={13}
              style={{ maxWidth: 1000, lineHeight: 1.05 }}
            />
          </div>
        );
      })()}

      {/* Grosse Award-Zeremonie (Akt 2, Stage 'card') */}
      {phase === 'award' && curAward && awardStage === 'card' && recipTeam && (
        <AwardCelebration award={curAward} recip={recipTeam} alle={teams.map(t => t.team)} de={de} reduce={reduce} />
      )}
    </div>
  );
}

// 2026-08-25: der Parameter `mystery` ist raus. Er hat den Empfaenger als
// „Einen der Spitzentuerme" verschleiert, solange die Top 3 anonym bauten -
// und damit ausgerechnet den drei interessantesten Teams ihre Zeremonie
// genommen. Die Anonymitaet gibt es nicht mehr (siehe CozyQuizTowerFinaleV2,
// `zahlOffen`), also steht hier immer ein Name.
function AwardCelebration({ award, recip, alle, de, reduce }: { award: TowerAward; recip: QQTeam; alle: QQTeam[]; de: boolean; reduce: boolean }) {
  const label = de ? award.label : (award.labelEn ?? award.label);
  const frage = de ? award.frage : award.frageEn;
  // ── Drei Takte statt einem ────────────────────────────────────────────────
  // 2026-08-25 (Wolf: „Wer war der Underdog heute, dann rollt das rad die teams
  // wackeln durch, bis langsam das team stehen bleibt +x und dann den turm, das
  // soll zelebriert werden, nicht gerusht").
  //
  //   frage  Die Frage steht allein da. Der Saal kann raten. Das ist der Takt,
  //          der vorher komplett fehlte - die alte Karte zeigte Frage und
  //          Antwort im selben Bild, und damit gab es nichts zu raten.
  //   rollt  Ein Streifen aus Teammarken laeuft durch das Fenster und wird
  //          langsamer. Nicht eine Marke, die ihr Bild tauscht: ein Streifen,
  //          der sich BEWEGT - das ist der Unterschied zwischen einem Rad und
  //          einem Ladebalken.
  //   steht  Das Team rastet in der Mitte ein, sein Name steht gross darunter,
  //          und +X springt heraus.
  //
  // Die Verzoegerungen werden laenger, das ist das ganze Geheimnis: ein
  // gleichmaessiges Durchblaettern liest sich als Ladebalken, ein bremsendes
  // als Entscheidung.
  const ROLL_TAKTE = AWARD_ROLL_TAKTE;
  const [takt, setTakt] = useState<'frage' | 'rollt' | 'steht'>(reduce ? 'steht' : 'frage');
  const [pos, setPos] = useState(0);
  const istBuehne = getActiveThemeId() === BUEHNE_THEME_ID;
  // Cozy Quirks: eckige Kachel -> Marken quadratisch (keine runde Coin).
  const quirkSet = isQuirkTileSet(useAvatarSet());

  // Der Streifen. `folge` ist die Reihe, durch die das Rad laeuft, und der
  // Startpunkt ist so gewaehlt, dass nach GENAU `ROLL_TAKTE.length` Schritten
  // der Empfaenger in der Mitte steht. Ohne diese Rechnung muesste am Ende
  // jemand von Hand einrasten, und man saehe den Sprung.
  const FENSTER = 5;
  const MITTE = 2;
  const folge = alle.length > 0 ? alle : [recip];
  const zielPos = ((folge.findIndex(t => t.id === recip.id) - MITTE) % folge.length + folge.length) % folge.length;
  const startPos = ((zielPos - ROLL_TAKTE.length) % folge.length + folge.length) % folge.length;

  useEffect(() => {
    if (reduce) { setTakt('steht'); setPos(zielPos); return; }
    setTakt('frage');
    setPos(startPos);
    let weg = false;
    let handle = 0;
    let i = 0;
    const rollen = () => {
      if (weg) return;
      if (i >= ROLL_TAKTE.length) {
        setTakt('steht');
        try { playReveal(); } catch { /* noop */ }
        return;
      }
      setPos(p => p + 1);
      try { playTick(); } catch { /* noop */ }
      handle = window.setTimeout(rollen, ROLL_TAKTE[i]);
      i++;
    };
    handle = window.setTimeout(() => {
      if (weg) return;
      setTakt('rollt');
      rollen();
    }, AWARD_FRAGE);
    return () => { weg = true; window.clearTimeout(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [award.key, recip.id, reduce]);

  const steht = takt === 'steht';
  // ── Groessen ──────────────────────────────────────────────────────────────
  // 2026-08-25, an der Aufnahme (scripts/award-zeremonie-messen.mjs) korrigiert.
  // Zwei Dinge stimmten nicht, und das zweite war das schlimmere:
  //
  // 1. Die Karte stand als Dialog auf der Buehne, rund ein Viertel der Breite.
  //    Wolf: „auch gerne groesser als bisher oder epischer".
  // 2. Der TEAMNAME war kleiner als der Award-Name. Die Frage lautet „Wer war
  //    heute der Underdog?" - die Antwort darauf ist der Teamname, und der war
  //    mit 46px die kleinste Zeile der Karte, unter einem 74px-„Underdog".
  //    Jetzt ist der Name die groesste Zeile, und die Frage macht ihm Platz:
  //    sie steht ueber dem Rad und blendet aus, wenn der Name kommt.
  //
  // Nachgerechnet gegen die 990px Buehnenhoehe:
  // 56 Rand + 26 Zeile „Award" + 150 Zeichen + 80 Award-Name + 56 Frage +
  // 172 Rad + 104 Teamname + 5*18 Abstaende + 56 Rand = 790px. Passt mit Luft.
  // 2026-08-25 (Wolf: „siegerteam wird abgeschnitten im kasten"). Nachgemessen
  // mit einer Kennung am Kasten: 847 von 990 Bildpunkten, oben 72 und unten 71
  // Rand. Das passt rechnerisch, aber es hat keine Reserve - ein Teamname, der
  // auf zwei Zeilen bricht, oder das CozyGames-Rad (das mit zoom 1.18 als
  // einziges Zeichen 184 statt 150 hoch wird) kippen die Karte ueber die Kante.
  // Jetzt rund 790 hoch, also gut hundert Bildpunkte Luft oben und unten.
  const ZEICHEN = istBuehne ? 140 : 76;
  const MARKE = istBuehne ? 138 : 62;
  const MARKE_KLEIN = Math.round(MARKE * 0.62);
  const zelle = MARKE + 22;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 60% at 50% 45%, rgba(249,200,122,0.10), rgba(6,3,12,0.72) 70%)', animation: reduce ? 'none' : 'qqT2FadeUp 0.4s ease both' }} />
      <div data-qq-awardkarte style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: istBuehne ? 15 : 12,
        padding: istBuehne ? '46px 84px' : '30px 48px', borderRadius: 30,
        minWidth: istBuehne ? 1000 : undefined,
        background: 'linear-gradient(180deg, rgba(40,29,13,0.98), rgba(24,17,8,0.98))',
        border: `2px solid ${GOLD_DEEP}`,
        boxShadow: istBuehne
          ? 'inset 0 1px 0 rgba(246, 239, 230,0.08), 0 24px 60px rgba(0,0,0,0.55)'
          : `0 0 46px ${GOLD}40, inset 0 1px 0 rgba(246, 239, 230,0.08)`,
        animation: reduce ? 'none' : 'qqT2AwardIn 0.55s cubic-bezier(0.2,1.2,0.35,1) both',
      }}>
        <span aria-hidden style={{ fontSize: istBuehne ? 22 : 15, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>Award</span>

        {/* Das Zeichen. Keine Filter darauf, das ist der gelieferte Satz - nur
            eine Bewegung der HUELLE, wenn das Rad rollt. */}
        <div aria-hidden style={{
          lineHeight: 0,
          animation: reduce ? 'none' : (takt === 'rollt' ? 'qqT2AwardWippe 0.9s ease-in-out infinite' : 'qqT2AwardPop 0.7s cubic-bezier(0.3,1.5,0.4,1) both'),
        }}><QQIcon slug={award.slug} size={Math.round(ZEICHEN * (award.zoom ?? 1))} /></div>

        <div style={{ fontSize: istBuehne ? 76 : 40, fontWeight: 900, color: 'var(--qq-text)', lineHeight: 1.02, textAlign: 'center', textShadow: istBuehne ? 'none' : `0 2px 20px ${GOLD}44` }}>{label}</div>

        {/* Die Frage bleibt stehen, den ganzen Weg.
            Erster Entwurf liess sie ausblenden, sobald das Team steht. An der
            Aufnahme fiel zweierlei auf: sie blendete gar nicht aus, weil die
            Einblend-Animation mit `both` die Deckkraft festhaelt (dieselbe
            Falle wie eine transform-Animation ueber einem Inline-Transform) -
            und sie soll es auch gar nicht. Frage und Antwort untereinander
            ergeben den Satz, um den Wolf gebeten hat: „Wer war heute der
            Underdog? - Nicht Zuhause." Wer sie wegnimmt, laesst einen Namen
            ohne Grund stehen. Die Zeile bleibt deshalb, ohne Deckkraft-Spiel. */}
        <div style={{
          fontSize: istBuehne ? 38 : 20, fontWeight: 800, color: 'var(--qq-text-muted)', textAlign: 'center',
          minHeight: istBuehne ? 50 : 26,
          animation: reduce ? 'none' : 'qqT2FadeUp 0.5s ease 0.25s both',
        }}>{frage}</div>

        {/* ── Das Rad ──────────────────────────────────────────────────────
            Ein Fenster ueber einem Streifen aus Teammarken. Der Streifen faehrt
            bei jedem Takt um eine Zelle weiter; die Bewegung selbst macht die
            CSS-Animation, die an `pos` haengt und deshalb bei jedem Takt neu
            startet. Die Marken links und rechts stehen kleiner und dunkler da:
            so liest man, dass die Mitte die Entscheidung ist. */}
        <div style={{
          position: 'relative', width: zelle * FENSTER, height: MARKE + 12,
          overflow: 'hidden',
          maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
        }}>
          <div key={pos} style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            ['--qq-radzelle' as string]: `${zelle}px`,
            animation: (reduce || steht) ? 'none' : 'qqT2RadRuck 0.16s cubic-bezier(0.2,0.7,0.3,1) both',
          }}>
            {Array.from({ length: FENSTER }).map((_, k) => {
              const t = folge[(pos + k) % folge.length];
              const mitte = k === MITTE;
              const seite = mitte ? MARKE : MARKE_KLEIN;
              // 2026-08-25 (Wolf: „rand um gewinnendes team ist komisch").
              // Es waren zwei Raender uebereinander: die Marke trug einen
              // 3px-Rand in der EIGENEN Farbe - also gar keinen sichtbaren
              // Rand, sondern nur eine dickere Flaeche - und darueber lag beim
              // Sieger ein 30px weicher Schein in derselben Farbe. Bei einem
              // gelben Team ergab das einen ausgefransten gelben Hof um eine
              // gelbe Kachel. Jetzt: kein Rand in Teamfarbe, kein Schein, nur
              // der goldene Ring, der vorher schon als Fenster ueber der Mitte
              // lag. Dieselbe Aussage, nur scharf.
              //
              // ⚠️ Dieser Kommentar steht hier oben und NICHT zwischen den
              // Tags. Zwischen JSX-Tags ist „//" kein Kommentar, sondern TEXT:
              // genau so stand er am 2026-08-25 als Fliesstext im Rad, quer
              // ueber allen fuenf Teammarken. Kommentare im JSX-Rumpf nur als
              // geschweifte Klammer mit Sternchen.
              return (
                <div key={k} style={{ width: zelle, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {/* 2026-08-26 (Wolf: „hier auch immernoch bug um gewinner
                      team"). Nach dem ersten Anlauf vom 2026-08-25 war es eine
                      KACHEL ZU VIEL: die Zelle malte die Teamfarbe selbst und
                      setzte die Marke `flat` darauf, aber das gelieferte Motiv
                      bringt seine eigene Kachel mit. Zwei Flaechen derselben
                      Farbe uebereinander, deren Kanten sich um ein paar
                      Bildpunkte unterscheiden - das las sich als doppelter
                      Rand, und der goldene Ring kam als dritte Kante dazu.

                      Jetzt traegt die Marke ihre eigene Kachel (seit heute mit
                      derselben 3D-Flaeche wie die Bausteine im Turm), die Zelle
                      ist nur noch Platz und Ring. Eine Kachel, eine Kante. */}
                  <div style={{
                    width: seite, height: seite, borderRadius: quirkSet ? '18%' : '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    outline: mitte && steht ? `4px solid ${GOLD}` : 'none',
                    outlineOffset: mitte && steht ? 6 : 0,
                    animation: (mitte && steht && !reduce) ? 'qqT2AwardPop 0.5s cubic-bezier(0.34,1.5,0.5,1) both' : 'none',
                  }}>
                    <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={seite} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Der Rahmen ueber der Mitte sagt, wo die Entscheidung faellt,
              solange noch keine gefallen ist. */}
          {!steht && (
            <div aria-hidden style={{
              position: 'absolute', left: zelle * MITTE, top: 0, width: zelle, height: '100%',
              border: `3px solid ${GOLD}`, borderRadius: 18, pointerEvents: 'none',
              animation: reduce ? 'none' : 'qqT2Breathe 1.4s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Der Name. Feste Hoehe, damit die Karte beim Einrasten nicht springt. */}
        {/* Die Antwort. Groesser als die Frage darueber und groesser als der
            Award-Name - sie ist der Grund, warum die ganze Karte da ist. */}
        {/* 2026-08-25 (Wolf: „der award winning window, verschiebt seine hoehe
            waehrend der motion, das sieht nicht gut aus").
            Der Platz war mit minHeight 104 reserviert, gerechnet fuer EINE
            Zeile. „Frag-Mich-Was-Leichtes" bricht auf zwei, und bei 92px sind
            das 184 - die Karte wuchs also genau in dem Moment, in dem das Team
            einrastet. Jetzt eine FESTE Hoehe fuer zwei Zeilen, und der Name
            schrumpft hinein, statt die Karte zu schieben. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          height: istBuehne ? 132 : 40, flexShrink: 0,
        }}>
          {steht && (
            <>
              <TeamNameLabel
                name={recip.name}
                fontSize={istBuehne ? '84px' : '26px'}
                minFontSize={istBuehne ? '48px' : '18px'}
                color={istBuehne ? 'var(--qq-text)' : recip.color}
                fontWeight={900}
                maxLines={2}
                shrinkAfter={11}
                style={{ maxWidth: 820, textAlign: 'center', lineHeight: 1.04, animation: reduce ? 'none' : 'qqT2WinnerIn 0.5s cubic-bezier(0.2,0.8,0.3,1) both' }}
              />
              <span style={{
                fontSize: istBuehne ? 52 : 18, fontWeight: 900, color: '#1B1206', background: GOLD,
                borderRadius: 999, padding: istBuehne ? '8px 30px' : '2px 10px',
                animation: reduce ? 'none' : 'qqT2AwardPop 0.55s cubic-bezier(0.3,1.6,0.4,1) 0.22s both',
              }}>+{award.bonus}</span>
            </>
          )}
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
/* Der Ring, der beim Einrasten nach aussen laeuft. Er sagt „hier ist es
   stehengeblieben" und ist danach weg. */
@keyframes qqT2AwardRaste {
  0%   { opacity: 0.9; transform: translate(-50%,-50%) scale(0.5); }
  100% { opacity: 0;   transform: translate(-50%,-50%) scale(2.2); }
}
/* Das Rad rueckt eine Zelle weiter. Der Streifen kommt von rechts herein und
   faehrt auf null - so BEWEGT sich das Rad, statt nur sein Bild zu tauschen.
   Die Zelle ist ueber eine CSS-Variable gesetzt, weil ihre Breite an der
   Markengroesse haengt und die auf der Buehne eine andere ist. */
/* Das Band beim Ausscheiden: herein, stehen, hinaus. Die Standzeit in der
   Mitte ist die Zeit, in der der Turm darunter noch steht. */
@keyframes qqT2AnsageBand {
  0%   { opacity: 0; transform: translateY(16px) scale(0.94); }
  12%  { opacity: 1; transform: none; }
  74%  { opacity: 1; transform: none; }
  100% { opacity: 0; transform: translateY(-14px); }
}
@keyframes qqT2RadRuck {
  0%   { transform: translateX(var(--qq-radzelle, 130px)); }
  100% { transform: translateX(0); }
}
/* Waehrend das Rad rollt, wippt das Award-Zeichen leicht mit. Bewusst nur eine
   transform-Bewegung auf der HUELLE: die gelieferte PNG bleibt unangetastet,
   kein Filter, keine Deckkraft, keine Farbrechnung.
   (Und kein Backtick in diesem Kommentar - er wuerde das Template beenden.) */
@keyframes qqT2AwardWippe {
  0%, 100% { transform: rotate(-3.5deg) scale(1); }
  50%      { transform: rotate(3.5deg) scale(1.04); }
}
@keyframes qqT2AwardPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
@keyframes qqT2FlashPop { 0% { transform: translateX(-50%) scale(0.7); opacity: 0; } 60% { transform: translateX(-50%) scale(1.1); } 100% { transform: translateX(-50%) scale(1); opacity: 1; } }
@keyframes qqT2Drift { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 0.18; } 88% { opacity: 0.18; } 100% { transform: translateY(-800px) translateX(24px); opacity: 0; } }
`;

export default TowerFinaleV2;
