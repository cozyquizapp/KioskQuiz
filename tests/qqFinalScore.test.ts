/**
 * qqFinalScore / Stechen-Metrik-Tests — 2026-07-21 (Perfektionist-Audit).
 *
 * Zwei Gewinner-Mismatch-Funde:
 *  A) qqFinalSortedTeams (Frontend, Handy-GameOver-Karte) ignorierte
 *     tieBreakerWinnerId → nach einem Stechen zeigte das Handy den Grid-Fuehrer,
 *     der Beamer (qqSortedTeams → Backend-sortedTeamIds) den Stechen-Sieger.
 *  B) detectTieBreakerCandidates (Backend) rankte nur nach (largestConnected,
 *     totalCells) und ignorierte Wett-Bonus + Award-Punkte → im Wett-Pfad wurde
 *     ein Stechen erkannt, obwohl der Endscore bereits entschieden war.
 */
import { describe, it, expect } from 'vitest';
import { qqFinalSortedTeams } from '../frontend/src/utils/qqFinalScore';
import { detectTieBreakerCandidates } from '../backend/src/quarterQuiz/qqRooms';

function team(id: string, largestConnected: number, totalCells: number) {
  return { id, name: id, color: '#94A3B8', avatarId: 'fox', largestConnected, totalCells } as any;
}

// ── Fix A: qqFinalSortedTeams respektiert tieBreakerWinnerId ──────────────────
describe('qqFinalSortedTeams — tieBreakerWinnerId (Fix A)', () => {
  it('zieht den ausgestochenen Sieger auf Rang 1, auch bei Grid-Gleichstand', () => {
    const s = {
      teams: [team('A', 20, 20), team('B', 20, 20)],
      endAwards: null,
      finalBetResolution: null,
      tieBreakerWinnerId: 'B', // Stechen aufgeloest: B gewinnt
    } as any;
    expect(qqFinalSortedTeams(s)[0].id).toBe('B');
  });

  it('ohne Stechen unveraendert (hoeherer Score zuerst)', () => {
    const s = {
      teams: [team('A', 18, 18), team('B', 22, 22)],
      endAwards: null, finalBetResolution: null, tieBreakerWinnerId: null,
    } as any;
    expect(qqFinalSortedTeams(s)[0].id).toBe('B');
  });
});

// ── Fix B: detectTieBreakerCandidates nutzt die Endscore-Metrik ───────────────
function makeRoom(overrides: Record<string, any> = {}): any {
  return { teams: {}, tieBreakerCandidates: [], tieBreakerWinnerId: null, endAwards: null, finalBetResolution: null, ...overrides };
}

describe('detectTieBreakerCandidates — Endscore-Metrik (Fix B)', () => {
  it('kein Stechen, wenn Award-Punkte den Grid-Gleichstand aufloesen', () => {
    const room = makeRoom({
      teams: { A: team('A', 20, 20), B: team('B', 20, 20) },
      // A bekommt Meisterklauer (+1) UND Speedy (+1) → Endscore A=22, B=20.
      endAwards: { underdog: null, meisterklauer: 'A', speedy: 'A' },
    });
    detectTieBreakerCandidates(room);
    expect(room.tieBreakerCandidates).toEqual([]);
  });

  it('echter Gleichstand (keine Awards) erkennt weiterhin ein Stechen', () => {
    const room = makeRoom({ teams: { A: team('A', 20, 20), B: team('B', 20, 20) } });
    detectTieBreakerCandidates(room);
    expect([...room.tieBreakerCandidates].sort()).toEqual(['A', 'B']);
  });

  it('Wett-Bonus loest den Gleichstand ebenfalls auf', () => {
    const room = makeRoom({
      teams: { A: team('A', 15, 15), B: team('B', 15, 15) },
      finalBetResolution: { A: { totalBonus: 3 }, B: { totalBonus: 0 } },
    });
    detectTieBreakerCandidates(room);
    expect(room.tieBreakerCandidates).toEqual([]);
  });
});
