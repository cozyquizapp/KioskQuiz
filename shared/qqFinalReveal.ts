/**
 * Final-Reveal Step-Decode — Single Source of Truth.
 *
 * 2026-05-24 (Refactor #1 von 5 — Struktur-Audit-Beschleuniger): Vorher war
 * dieselbe Decode-Logik in 3 Stellen dupliziert (qqRooms.ts qqFinalRevealMaxStep,
 * CozyQuizFinalRevealView.tsx decodeFinalStep, QQFinalRevealTestPage.tsx).
 * Jeder Race-Redesign musste 3× manuell synced werden → Drift-Bugs.
 *
 * Step-Mapping (Stand 2026-05-24 v2 Award-Slots):
 *   0                       = title
 *   1                       = awards-overview (alle 3 BG-Cards)
 *   2..4                    = award-slot 0/1/2 (Underdog / Meisterklauer / Speedy)
 *                              jeweils mit Card-Reveal + Tabellen-Climb,
 *                              Mod-Space pro Award.
 *   5..4+betSlotsCount      = bet-slot (mit persistenter Tabelle)
 *   betSlotsCount+5         = race-final (Eurovision-Finale Hero)
 *   betSlotsCount+6         = → THANKS (Mod-Space triggert Phase-Wechsel)
 */

export type QQFinalStep =
  | { kind: 'title' }
  | { kind: 'awards-overview' }
  | { kind: 'award'; awardIndex: 0 | 1 | 2 }
  | { kind: 'bet'; slotIndex: number }
  | { kind: 'race-final' };

const AWARD_COUNT = 3;

/** Decode the current step index into a typed phase + sub-info. */
export function qqDecodeFinalStep(step: number, betSlotsCount: number): QQFinalStep {
  if (step <= 0) return { kind: 'title' };
  if (step === 1) return { kind: 'awards-overview' };
  if (step <= 1 + AWARD_COUNT) {
    return { kind: 'award', awardIndex: (step - 2) as 0 | 1 | 2 };
  }
  if (step <= 1 + AWARD_COUNT + betSlotsCount) {
    return { kind: 'bet', slotIndex: step - 2 - AWARD_COUNT };
  }
  return { kind: 'race-final' };
}

/** Highest valid step index. step > max → transition to THANKS. */
export function qqFinalMaxStep(betSlotsCount: number): number {
  return betSlotsCount + AWARD_COUNT + 2;
}
