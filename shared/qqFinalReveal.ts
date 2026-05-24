/**
 * Final-Reveal Step-Decode — Single Source of Truth.
 *
 * 2026-05-24 (Refactor #1 von 5 — Struktur-Audit-Beschleuniger): Vorher war
 * dieselbe Decode-Logik in 3 Stellen dupliziert (qqRooms.ts qqFinalRevealMaxStep,
 * CozyQuizFinalRevealView.tsx decodeFinalStep, QQFinalRevealTestPage.tsx).
 * Jeder Race-Redesign musste 3× manuell synced werden → Drift-Bugs.
 *
 * Step-Mapping (Stand 2026-05-24 Race-Redesign Eurovision-Style):
 *   0                       = title
 *   1                       = awards-overview
 *   2                       = awards-reveal
 *   3..betSlotsCount+2      = bet (mit persistenter Leaderboard-Tabelle)
 *   betSlotsCount+3         = race-final
 *   betSlotsCount+4         = → THANKS (max+1, Mod-Space triggert Phase-Wechsel)
 */

export type QQFinalStep =
  | { kind: 'title' }
  | { kind: 'awards-overview' }
  | { kind: 'awards-reveal' }
  | { kind: 'bet'; slotIndex: number }
  | { kind: 'race-final' };

/** Decode the current step index into a typed phase + sub-info. */
export function qqDecodeFinalStep(step: number, betSlotsCount: number): QQFinalStep {
  if (step <= 0) return { kind: 'title' };
  if (step === 1) return { kind: 'awards-overview' };
  if (step === 2) return { kind: 'awards-reveal' };
  if (step <= 2 + betSlotsCount) return { kind: 'bet', slotIndex: step - 3 };
  return { kind: 'race-final' };
}

/** Highest valid step index. step > max → transition to THANKS. */
export function qqFinalMaxStep(betSlotsCount: number): number {
  return betSlotsCount + 4;
}
