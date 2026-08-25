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
export function qqTurmRennplan(
  rangfolge: readonly string[],
  tipp: Readonly<Record<string, number>>,
): number[] {
  const n = rangfolge.length;
  const t = (id: string | undefined) => (id ? (tipp[id] ?? 0) : 0);
  const ziele: number[] = [0];
  let bisher = 0;
  // Etappe k gehoert dem Team auf Platz n-k, also von hinten nach vorne.
  for (let k = 1; k <= n; k++) {
    // Monoton halten: eine Etappe darf nie weniger Takte zulassen als die
    // davor, sonst schruempfte ein Turm beim Weiterschalten.
    bisher = Math.max(bisher, t(rangfolge[n - k]));
    ziele.push(bisher);
  }
  return ziele;
}

/**
 * Hoechster gueltiger Turm-Beat (0-basiert): 0 Aufbau · 1..A Awards ·
 * A+1..A+N Siegerehrung, ein Beat je Team von hinten nach vorne, der letzte
 * ist die Kroenung (siehe `qqTurmRennplan`) · A+N+1 SIEGERFOLIE.
 * N = Teams. → maxBeat = A + N + 1.
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
 */
export function qqTowerMaxBeat(awardCount: number, teamCount: number): number {
  return awardCount + Math.max(1, teamCount) + 1;
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
