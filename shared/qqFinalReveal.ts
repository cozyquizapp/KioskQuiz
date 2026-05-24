/**
 * Final-Reveal Step-Decode — Single Source of Truth.
 *
 * 2026-05-24 (Refactor #1 von 5 — Struktur-Audit-Beschleuniger): Vorher war
 * dieselbe Decode-Logik in 3 Stellen dupliziert (qqRooms.ts qqFinalRevealMaxStep,
 * CozyQuizFinalRevealView.tsx decodeFinalStep, QQFinalRevealTestPage.tsx).
 * Jeder Race-Redesign musste 3× manuell synced werden → Drift-Bugs.
 *
 * Step-Mapping (Stand 2026-05-24 v3 — awards-overview entfernt):
 *   0                       = title
 *   1..3                    = award-slot 0/1/2 (Underdog / Meisterklauer / Speedy)
 *                              jeweils mit Card-Reveal + Tabellen-Climb,
 *                              Mod-Space pro Award.
 *   4..3+betSlotsCount      = bet-slot (mit persistenter Tabelle)
 *   betSlotsCount+4         = race-final (Eurovision-Finale Hero)
 *   betSlotsCount+5         = → THANKS (Mod-Space triggert Phase-Wechsel)
 *
 * 2026-05-24 v3 (Wolf 'diesen zwischenschritt braucht es nicht mehr'):
 * Awards-Overview-Slide raus — Title geht direkt zu Award-Slot 0.
 */

export type QQFinalStep =
  | { kind: 'title' }
  | { kind: 'award'; awardIndex: 0 | 1 | 2 }
  | { kind: 'bet'; slotIndex: number }
  | { kind: 'race-final' };

const AWARD_COUNT = 3;

/** Decode the current step index into a typed phase + sub-info. */
export function qqDecodeFinalStep(step: number, betSlotsCount: number): QQFinalStep {
  if (step <= 0) return { kind: 'title' };
  if (step <= AWARD_COUNT) {
    return { kind: 'award', awardIndex: (step - 1) as 0 | 1 | 2 };
  }
  if (step <= AWARD_COUNT + betSlotsCount) {
    return { kind: 'bet', slotIndex: step - 1 - AWARD_COUNT };
  }
  return { kind: 'race-final' };
}

/** Highest valid step index. step > max → transition to THANKS. */
export function qqFinalMaxStep(betSlotsCount: number): number {
  return betSlotsCount + AWARD_COUNT + 1;
}
