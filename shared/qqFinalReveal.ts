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

/** Anzahl Award-Empfänger = Anzahl Award-Beats im Turm (jeder Award = 1 beat,
 *  auch Underdog obwohl der +2 Punkte gibt). Muss exakt zu buildTowerFinaleData
 *  (CozyQuizTowerFinaleV2.tsx) passen — dort werden dieselben 3 Felder gepusht. */
export function qqTowerAwardCount(endAwards: QQAwardRecipients): number {
  if (!endAwards) return 0;
  let n = 0;
  if (endAwards.speedy) n += 1;
  if (endAwards.meisterklauer) n += 1;
  if (endAwards.underdog) n += 1;
  return n;
}

/** Höchster gültiger Turm-Beat (0-basiert): 0 Aufbau · 1..A Awards · A+1 Glide ·
 *  A+2..A+1+top Reveals. top = min(3, Teams). → maxBeat = A + top + 1. */
export function qqTowerMaxBeat(awardCount: number, teamCount: number): number {
  const top = Math.min(3, Math.max(0, teamCount));
  return awardCount + top + 1;
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
