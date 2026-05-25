/**
 * Final-Reveal Step-Decode — Single Source of Truth.
 *
 * Step-Mapping (Stand 2026-05-25 v4 — Wolf 'awards nach bets als climax'):
 *   0                       = title (Wolf-Bouncer + 'Die Auflösung')
 *   1..betSlotsCount        = bet-slot 0..B-1 (1 Stack-Action pro Bonus-Punkt,
 *                              Team picked Cell auf Phone)
 *   B+1..B+3                = award-slot 0/1/2 (Speedy/Meisterklauer/Underdog)
 *                              Underdog last weil +2 Stacks = dramatic climax
 *   B+4                     = race-final (Eurovision-Endstand mit Crescendo)
 *   B+5                     = → THANKS (Mod-Space triggert Phase-Wechsel)
 *
 * Reihenfolge-Refactor (Wolf 'awards-last als plot-twist'): Bets kommen jetzt
 * VOR Awards. Awards (3 Cards) als emotionaler Climax kurz vorm Race-Final.
 * Underdog (+2 Stacks) als letzter Award = größter Drama-Spike.
 */

export type QQFinalStep =
  | { kind: 'title' }
  | { kind: 'bet'; slotIndex: number }
  | { kind: 'award'; awardIndex: 0 | 1 | 2 }
  | { kind: 'race-final' };

const AWARD_COUNT = 3;

/** Decode the current step index into a typed phase + sub-info. */
export function qqDecodeFinalStep(step: number, betSlotsCount: number): QQFinalStep {
  if (step <= 0) return { kind: 'title' };
  if (step <= betSlotsCount) {
    return { kind: 'bet', slotIndex: step - 1 };
  }
  if (step <= betSlotsCount + AWARD_COUNT) {
    return { kind: 'award', awardIndex: (step - 1 - betSlotsCount) as 0 | 1 | 2 };
  }
  return { kind: 'race-final' };
}

/** Highest valid step index. step > max → transition to THANKS. */
export function qqFinalMaxStep(betSlotsCount: number): number {
  return betSlotsCount + AWARD_COUNT + 1;
}
