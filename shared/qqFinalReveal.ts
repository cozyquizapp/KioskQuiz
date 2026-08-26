/**
 * Final-Reveal Step-Decode — Single Source of Truth.
 *
 * Step-Mapping (Stand 2026-07-19 v5 — Turm-Finale V2, Wolf 'awards ganz in den
 * turm, kein extra award-screen mehr'):
 *   0                       = title (Wolf-Bouncer + 'Die Auflösung')
 *   1..betSlotsCount        = bet-slot 0..B-1 (1 Stack-Action pro Bonus-Punkt,
 *                              Team picked Cell auf Phone — bleibt interaktiv)
 *   B+1..B+1+towerMaxBeat   = race-final BEATS (Turm-Finale V2, siehe unten)
 *   > B+1+towerMaxBeat      = → THANKS (Mod-Space triggert Phase-Wechsel)
 *
 * Turm-Finale V2 (CozyQuizTowerFinaleV2.tsx) spielt sich über BEATS ab, die der
 * Moderator (Hybrid-Steuerung) per Space durchtaktet — 1 finalRevealStep = 1 beat:
 *   beat 0                  = Basis-Türme wachsen + Zwischenstand
 *   beat 1..A               = A Award-Zeremonien (je Turm-Wachstum, A = Award-
 *                              Empfänger; Underdog +2 Punkte aber trotzdem 1 beat)
 *   beat A+1                = Top-3 gleiten in die Mitte
 *   beat A+2..A+1+top       = Reveal Platz 3→2→1 + Krone (top = min(3, Teams))
 *
 * Award-Reihenfolge-Refactor (2026-07-19): die früheren separaten Award-Slots
 * (eigener Screen + Grid-Stamp-Placement) sind ENTFALLEN. Awards leben jetzt als
 * goldene Bausteine IM Turm (Punkte via endAwards/awardPoints, Grid-Stamp raus).
 */

export type QQFinalStep =
  | { kind: 'title' }
  | { kind: 'bet'; slotIndex: number }
  | { kind: 'race-final'; beat: number };

/** Minimal-Shape der Award-Empfänger (entkoppelt vom vollen QQEndAwards-Typ). */
export type QQAwardRecipients = {
  speedy?: string | null;
  meisterklauer?: string | null;
  underdog?: string | null;
} | null | undefined;

/** Ein Tipp-Auftritt in der Aufloesung: erst die Nullrunde, dann je ein Team. */
export type QQBetSlotPlan =
  | { kind: 'zero-group'; teamIds: string[] }
  | { kind: 'positive'; teamId: string; bonus: number };

/**
 * Welche Tipp-Folien kommen, in welcher Reihenfolge.
 *
 * ⚠️ DIESE FUNKTION IST DIE EINZIGE QUELLE fuer die Anzahl der Tipp-Folien.
 * Aus ihr faellt das `betSlotsCount`, das `qqDecodeFinalStep` braucht - und
 * damit die Grenze, ab der der Turm uebernimmt. Wer sie hier aendert, aendert
 * sie ueberall; wer sie woanders nachbaut, bekommt zwei Wahrheiten und eine
 * Buehne, die an der falschen Stelle umschaltet.
 *
 * 2026-08-26 herausgezogen (Wolf: „nach letztem reveal und punkte vergabe
 * wechselt die view abrupt und unclean"). Vorher stand die Regel nur im
 * useMemo der Aufloesungs-Ansicht. Die Buehne konnte deshalb nicht wissen, WO
 * eine Szene endet und die naechste beginnt - und hat den Uebergang von der
 * letzten Tipp-Karte in den Turm ohne Wechsel geschnitten, weil die PHASE
 * dabei dieselbe bleibt.
 *
 * Regel (Wolf 2026-05-10, „BetReveal Variante D"): Teams ohne Tipp kommen gar
 * nicht vor. Alle Teams mit Tipp und null Bonus teilen sich EINE Folie. Danach
 * je ein Team mit Bonus, aufsteigend, bei Gleichstand nach Namen.
 */
export function qqBetSlotPlan(
  teams: readonly { id: string; name: string }[],
  aufloesung: Readonly<Record<string, { targetTeamId?: string | null; totalBonus?: number }>> | null | undefined,
): QQBetSlotPlan[] {
  const mitTipp = teams.filter(t => aufloesung?.[t.id]?.targetTeamId);
  const bonus = (id: string) => aufloesung?.[id]?.totalBonus ?? 0;
  const plan: QQBetSlotPlan[] = [];
  const nullen = mitTipp.filter(t => bonus(t.id) === 0);
  if (nullen.length > 0) plan.push({ kind: 'zero-group', teamIds: nullen.map(t => t.id) });
  const positive = mitTipp
    .filter(t => bonus(t.id) > 0)
    .sort((a, c) => (bonus(a.id) !== bonus(c.id) ? bonus(a.id) - bonus(c.id) : a.name.localeCompare(c.name)));
  for (const t of positive) plan.push({ kind: 'positive', teamId: t.id, bonus: bonus(t.id) });
  return plan;
}

/**
 * Welche SZENE zeigt die Buehne bei diesem Stand der Aufloesung?
 *
 * Die Wechsel-Ebene der Buehne haengt am Phasenwechsel. Innerhalb von
 * FINAL_REVEAL wechselt die Ansicht aber dreimal komplett - Titel, Tipps,
 * Turm - ohne dass die Phase sich ruehrt. Dieser Schluessel macht die drei
 * unterscheidbar, damit dazwischen ueberblendet wird statt geschnitten.
 */
export function qqFinalSzene(step: number, betSlotsCount: number): string {
  return `FINAL_REVEAL:${qqDecodeFinalStep(step, betSlotsCount).kind}`;
}

/** Decode the current step index into a typed phase + sub-info. */
export function qqDecodeFinalStep(step: number, betSlotsCount: number): QQFinalStep {
  if (step <= 0) return { kind: 'title' };
  if (step <= betSlotsCount) {
    return { kind: 'bet', slotIndex: step - 1 };
  }
  // race-final: beat 0 startet direkt nach dem letzten Bet-Slot.
  return { kind: 'race-final', beat: step - betSlotsCount - 1 };
}

/** Ein Baustein-Beat im Turm: ein Empfaenger, ein Beat, so viele Punkte. */
export type QQTowerAwardBeat = {
  key: string;
  kind: 'cozy' | 'speedy' | 'meisterklauer' | 'underdog';
  teamId: string;
  /** Punkte, die dieser Beat in den Turm legt. Underdog gibt 2, bleibt 1 Beat. */
  bonus: number;
};

/**
 * Welche Bausteine wachsen im Turm, in welcher Reihenfolge.
 *
 * ⚠️ DIESE LISTE IST DIE EINZIGE QUELLE. Der Beamer baut daraus seine
 * Zeremonie, das Steuerpult und das Backend zaehlen daraus ihre Beats. Wer sie
 * an zwei Stellen rechnet, bekommt genau den Fehler, der hier zweimal drin war:
 *
 *  - 2026-05-24 lagen Step-Decode und Max-Step auseinander (deshalb zog dieser
 *    ganze Bereich ueberhaupt nach shared).
 *  - 2026-08-25, also derselbe Fehler noch einmal: die CozyGame-Siege kamen als
 *    eigene Bausteine dazu (Wolf: „sie kommen bei der siegerehrung dazu wie die
 *    awards"), aber gezaehlt wurden weiter nur die drei Endawards. Der Turm
 *    brauchte also mehr Beats, als das Step-Mapping vorsah, und die Kroenung
 *    schob sich davor: gemessen fiel im Autoplay die Enthuellung des Siegers
 *    weg. Je mehr CozyGames gespielt wurden, desto mehr Schluss fehlte.
 *
 * `teamIds` sind die Teams, die JETZT im Raum sind. Ohne diese Einschraenkung
 * zaehlen ausgetretene Teams mit: `cozyGameWins` traegt im Testbetrieb
 * hunderte alter Bot-Kennungen, und jede davon waere ein Beat, den niemand
 * spielt.
 */
export function qqTowerAwardBeats(
  teamIds: readonly string[],
  endAwards: QQAwardRecipients,
  cozyGameWins?: Record<string, number> | null,
): QQTowerAwardBeat[] {
  const beats: QQTowerAwardBeat[] = [];
  // Zuerst die CozyGames: der Saal hat die Spiele gesehen, das ist der bekannte
  // Teil. Die Awards danach sind die Ueberraschung.
  for (const id of teamIds) {
    const n = cozyGameWins?.[id] ?? 0;
    if (n > 0) beats.push({ key: `cozy-${id}`, kind: 'cozy', teamId: id, bonus: n });
  }
  const dabei = (id: string | null | undefined): id is string => !!id && teamIds.includes(id);
  if (dabei(endAwards?.speedy)) beats.push({ key: 'speedy', kind: 'speedy', teamId: endAwards!.speedy!, bonus: 1 });
  if (dabei(endAwards?.meisterklauer)) beats.push({ key: 'meisterklauer', kind: 'meisterklauer', teamId: endAwards!.meisterklauer!, bonus: 1 });
  if (dabei(endAwards?.underdog)) beats.push({ key: 'underdog', kind: 'underdog', teamId: endAwards!.underdog!, bonus: 2 });
  return beats;
}

/** Anzahl Award-Beats im Turm. Siehe `qqTowerAwardBeats` - dort steht, warum
 *  das nicht noch einmal gerechnet werden darf. */
// `teamIds` ist mit Absicht PFLICHT und steht mit Absicht vorne: so faellt jede
// Aufrufstelle, die den Raum nicht mitgibt, beim Uebersetzen auf. Mit einem
// Vorgabewert waere der Zaehler stillschweigend auf null gefallen.
export function qqTowerAwardCount(
  teamIds: readonly string[],
  endAwards: QQAwardRecipients,
  cozyGameWins?: Record<string, number> | null,
): number {
  return qqTowerAwardBeats(teamIds, endAwards, cozyGameWins).length;
}

/**
 * Der Rennplan des Turm-Finales: bis zu welchem TAKT in jeder Etappe gebaut
 * werden darf. `ziele[k]` gehoert der Etappe k, und Etappe k gehoert dem Team
 * auf Platz n-k - also von hinten nach vorne. `ziele[0]` ist immer 0.
 *
 * 2026-08-25, zweite Fassung (Wolf: „ne die teams fallen zu frueh runter, das
 * ist keine siegerehrung, die fallen einfach durch andere teams runter, wir
 * brauchen viel mehr zeit dafuer, das ist ein event, eventuell werden preise
 * vergeben, das darf nicht so runterrattern, machs steuerbar, turmbau bis
 * letztes team alle kacheln hat, dann badge auf screen team x ist platz y,
 * dann erst weiter, schritt fuer schritt").
 *
 * Die erste Fassung hatte vier feste Etappen, in denen mehrere Teams
 * gleichzeitig ausschieden. Jetzt hat JEDES Team seine eigene Etappe: gebaut
 * wird, bis genau ein Team fertig ist, dann steht sein Platz auf der Buehne,
 * und erst der naechste Beat des Moderators laesst es abtreten und baut
 * weiter.
 *
 * Ein Takt ist ein Tipp-Baustein. Jedes Team, das noch welche hat, setzt pro
 * Takt einen.
 *
 * ⚠️ Das steht hier und nicht im Beamer, weil das Steuerpult dieselbe Rechnung
 * fuer die Autoplay-Dauern braucht. Zwei Rechnungen mit eigenen Zahlen sind
 * genau der Fehler, der beim Award-Zaehler schon einmal passiert ist: der Turm
 * baute Bausteine, die das Step-Mapping nicht kannte.
 *
 * `rangfolge` ist die Endreihenfolge der Team-Ids, Sieger zuerst
 * (qqFinalSortedTeams). `tipp` ist der Wett-Bonus je Team.
 */
/**
 * In welcher Etappe wird Platz `rank` (0-basiert, 0 = Sieger) geehrt?
 *
 * 2026-08-25 (Wolf: „ich komme gerade nicht in coolify rein"). Bis dahin galt
 * fest „eine Etappe je Team". Das stimmt aber nur, wenn der Server auch so
 * viele Beats hergibt. Gibt er weniger - weil er aelter ist, oder weil sich die
 * Rechnung irgendwann wieder aendert -, dann brach die Zeremonie mittendrin ab
 * und der Saal sah die halbe Siegerehrung nicht.
 *
 * Mit dem Budget passt sie sich an: der Sieger bekommt immer die LETZTE Etappe,
 * darunter je einer, und was dann noch uebrig ist, faellt in die erste. Bei
 * `budget = n` ist das wieder genau eine Etappe je Team.
 *
 * Beispiel, 8 Teams, Budget 5:
 *   Etappe 1: Plaetze 8 bis 5   ·   2: Platz 4   ·   3: Platz 3
 *   Etappe 4: Platz 2           ·   5: der Sieger
 */
export function qqTurmEhrungsBeat(rank: number, budget: number): number {
  return Math.max(1, budget - rank);
}

export function qqTurmRennplan(
  rangfolge: readonly string[],
  tipp: Readonly<Record<string, number>>,
  budget: number = rangfolge.length,
): number[] {
  const n = rangfolge.length;
  const b = Math.max(1, Math.min(n || 1, budget));
  const t = (id: string | undefined) => (id ? (tipp[id] ?? 0) : 0);
  const ziele: number[] = [0];
  let bisher = 0;
  for (let k = 1; k <= b; k++) {
    // Alle Plaetze, die in DIESER Etappe fertig sein muessen. Monoton halten:
    // eine Etappe darf nie weniger Takte zulassen als die davor, sonst
    // schruempfte ein Turm beim Weiterschalten.
    for (let r = 0; r < n; r++) {
      if (qqTurmEhrungsBeat(r, b) === k) bisher = Math.max(bisher, t(rangfolge[r]));
    }
    ziele.push(bisher);
  }
  return ziele;
}

/**
 * Hoechster gueltiger Turm-Beat (0-basiert): 0 Aufbau · 1..A Awards ·
 * A+1..A+N-1 Siegerehrung, ein Beat je ausscheidendem Team von hinten nach
 * vorne · A+N+1 der Sieger allein auf der Turmbuehne, letzter Baustein, Krone ·
 * A+N+2 SIEGERFOLIE. N = Teams. → maxBeat = A + N + 2.
 *
 * 2026-08-25, zweite Fassung. Vorher A + min(3, Teams) + 2: nur die Top 3
 * hatten einen eigenen Beat, alle anderen verschwanden gemeinsam in einem.
 * Wolf: „machs steuerbar ... schritt fuer schritt". Mit acht Teams sind das
 * fuenf Beats mehr, und genau die sind der Punkt: an jedem davon kann er
 * stehenbleiben, reden und einen Preis uebergeben.
 *
 * 2026-08-25 (Wolf: „4 ja eigene"). Der letzte Beat ist neu. Bis hierher ging
 * es vom Podest direkt auf die Danke-Folie, und der Sieger stand dort als
 * Zeile neben einem QR-Code - der groesste Moment des Abends als Fussnote
 * einer Verabschiedung. Jetzt haelt eine eigene Folie ihn fest, bevor das
 * Danke kommt.
 *
 * 2026-08-26 (Wolf: „das finale zwischen platz 1 und 2 ist etwas langweilig").
 * Ein Beat mehr. Gemessen mit scripts/finale-beats-probe.mjs, an dem Messpunkt,
 * den die Turmansicht selbst schreibt: bei acht Teams und einem Award stand das
 * Fenster fuer Platz 2 auf liveBeat 9, und der naechste Druck war schon die
 * Siegerfolie. Der Beat, den der Kopfkommentar der Turmansicht ausdruecklich
 * vorsieht - „A+N der Sieger, allein auf der Buehne, letzter Baustein, Krone" -
 * existierte nur als 3,6-Sekunden-Nachlauf am Beat von Platz 2. Wer vorher
 * weiterschaltete, und das tut jeder Moderator, hat ihn nie gesehen.
 *
 * Der groesste Moment des Abends haing damit an einer Wartezeit statt an einem
 * Tastendruck. Jetzt hat er einen eigenen Beat wie jeder andere Platz auch.
 */
export function qqTowerMaxBeat(awardCount: number, teamCount: number): number {
  return awardCount + Math.max(1, teamCount) + 2;
}

/**
 * Ist dieser Beat die Kroenung, also die eigene Siegerfolie?
 * Eine Funktion statt einer Rechnung an drei Stellen: Beamer, Steuerpult und
 * Backend muessen sich hier einig sein, sonst zeigt der eine noch den Turm,
 * waehrend der andere schon weiterschaltet.
 */
export function qqIstKroenungsBeat(
  beat: number,
  awardCount: number,
  teamCount: number,
): boolean {
  return beat >= qqTowerMaxBeat(awardCount, teamCount);
}

/** Highest valid step index. step > max → transition to THANKS.
 *  Layout: [0 title] + [B bet-slots] + [towerMaxBeat+1 race-final beats]. */
export function qqFinalMaxStep(
  betSlotsCount: number,
  awardCount: number,
  teamCount: number,
): number {
  return betSlotsCount + 1 + qqTowerMaxBeat(awardCount, teamCount);
}
