/**
 * qqRooms-Tests — 2026-05-24.
 *
 * Fokus: Drift-anfällige Pure-Functions die in den 5 Refactors zentralisiert
 * wurden, plus die kanonische Backend-Sortierung. Tests dienen als Regression-
 * Check für die Folge-Refactors (#3 Folgemodule + #5 Folge-Reveals + Hex-
 * Tokenisierung).
 *
 * Strategie: minimale Room-Mocks (as any) — wir testen nur Pure-Logic-Funktionen
 * ohne Socket/DB/Timer-Side-Effects.
 */
import { describe, it, expect } from 'vitest';
import { qqDecodeFinalStep, qqFinalMaxStep } from '../shared/qqFinalReveal';
import { qqSortedTeamIds, qqGoBackSlide, qqBetSlotsCount } from '../backend/src/quarterQuiz/qqRooms';

// ── Test-Helpers ─────────────────────────────────────────────────────────────

function makeTeam(id: string, opts: { largestConnected?: number; totalCells?: number; name?: string } = {}) {
  return {
    id,
    name: opts.name ?? id.toUpperCase(),
    color: '#94A3B8',
    avatarId: 'cozyWolf',
    largestConnected: opts.largestConnected ?? 0,
    totalCells: opts.totalCells ?? 0,
  };
}

function makeRoom(overrides: Record<string, any> = {}): any {
  return {
    roomCode: 'TEST',
    phase: 'LOBBY',
    teams: {},
    joinOrder: [],
    tieBreakerWinnerId: null,
    finalBetResolution: {},
    rulesSlideIndex: 0,
    introStep: 0,
    finalRevealStep: 0,
    comebackIntroStep: 0,
    muchoRevealStep: 0,
    zvzRevealStep: 0,
    cheeseRevealStep: 0,
    mapRevealStep: 0,
    currentQuestion: null,
    lastActivityAt: 0,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// qqDecodeFinalStep + qqFinalMaxStep (shared/qqFinalReveal.ts)
// ════════════════════════════════════════════════════════════════════════════

describe('qqDecodeFinalStep — Award-Slots-Variante (2026-05-24 v3, awards-overview raus)', () => {
  it('step 0 → title', () => {
    expect(qqDecodeFinalStep(0, 0).kind).toBe('title');
    expect(qqDecodeFinalStep(-5, 0).kind).toBe('title');
  });

  it('steps 1/2/3 → award-slots 0/1/2 (Underdog/Meisterklauer/Speedy)', () => {
    const a0 = qqDecodeFinalStep(1, 3);
    expect(a0.kind).toBe('award');
    if (a0.kind === 'award') expect(a0.awardIndex).toBe(0);
    const a1 = qqDecodeFinalStep(2, 3);
    expect(a1.kind).toBe('award');
    if (a1.kind === 'award') expect(a1.awardIndex).toBe(1);
    const a2 = qqDecodeFinalStep(3, 3);
    expect(a2.kind).toBe('award');
    if (a2.kind === 'award') expect(a2.awardIndex).toBe(2);
  });

  it('steps 4..3+betSlotsCount → bet slots', () => {
    const slot0 = qqDecodeFinalStep(4, 3);
    expect(slot0.kind).toBe('bet');
    if (slot0.kind === 'bet') expect(slot0.slotIndex).toBe(0);

    const slot2 = qqDecodeFinalStep(6, 3);
    expect(slot2.kind).toBe('bet');
    if (slot2.kind === 'bet') expect(slot2.slotIndex).toBe(2);
  });

  it('step > 3+betSlotsCount → race-final (== Eurovision-Finale)', () => {
    expect(qqDecodeFinalStep(7, 3).kind).toBe('race-final');
    expect(qqDecodeFinalStep(100, 3).kind).toBe('race-final');
  });

  it('mit 0 Bet-Slots: 4 → race-final direkt (kein bet-Slot)', () => {
    expect(qqDecodeFinalStep(4, 0).kind).toBe('race-final');
  });
});

describe('qqFinalMaxStep', () => {
  it('= betSlotsCount + 4 (3 award-slots dazwischen)', () => {
    expect(qqFinalMaxStep(0)).toBe(4);
    expect(qqFinalMaxStep(3)).toBe(7);
    expect(qqFinalMaxStep(8)).toBe(12);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// qqBetSlotsCount (qqRooms.ts)
// ════════════════════════════════════════════════════════════════════════════

describe('qqBetSlotsCount', () => {
  it('zaehlt nur Teams mit targetTeamId', () => {
    const room = makeRoom({
      teams: {
        a: makeTeam('a'),
        b: makeTeam('b'),
        c: makeTeam('c'),
      },
      finalBetResolution: {
        a: { targetTeamId: 'b', totalBonus: 3 },
        b: { targetTeamId: null, totalBonus: 0 },
        c: { targetTeamId: 'a', totalBonus: 0 },
      },
    });
    // a hat Bet+3 → 1 positiv-Slot
    // c hat Bet+0 → Zero-Group-Slot (1)
    // b hat keinen Tipp → 0
    // → 1 positiv + 1 zero-group = 2
    expect(qqBetSlotsCount(room)).toBe(2);
  });

  it('alle Zero-Bets → 1 Zero-Group-Slot', () => {
    const room = makeRoom({
      teams: { a: makeTeam('a'), b: makeTeam('b') },
      finalBetResolution: {
        a: { targetTeamId: 'b', totalBonus: 0 },
        b: { targetTeamId: 'a', totalBonus: 0 },
      },
    });
    expect(qqBetSlotsCount(room)).toBe(1);
  });

  it('kein Bet abgegeben → 0 Slots', () => {
    const room = makeRoom({
      teams: { a: makeTeam('a') },
      finalBetResolution: {},
    });
    expect(qqBetSlotsCount(room)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// qqSortedTeamIds — kanonische Backend-Sortierung (Drift-Killer #2)
// ════════════════════════════════════════════════════════════════════════════

describe('qqSortedTeamIds', () => {
  it('sortiert nach largestConnected desc', () => {
    const room = makeRoom({
      teams: {
        a: makeTeam('a', { largestConnected: 3 }),
        b: makeTeam('b', { largestConnected: 7 }),
        c: makeTeam('c', { largestConnected: 5 }),
      },
      joinOrder: ['a', 'b', 'c'],
    });
    expect(qqSortedTeamIds(room)).toEqual(['b', 'c', 'a']);
  });

  it('Tie bei largestConnected → bricht via totalCells', () => {
    const room = makeRoom({
      teams: {
        a: makeTeam('a', { largestConnected: 5, totalCells: 8 }),
        b: makeTeam('b', { largestConnected: 5, totalCells: 12 }),
        c: makeTeam('c', { largestConnected: 5, totalCells: 5 }),
      },
      joinOrder: ['a', 'b', 'c'],
    });
    expect(qqSortedTeamIds(room)).toEqual(['b', 'a', 'c']);
  });

  it('Voll-Tie → joinOrder-stabil', () => {
    const room = makeRoom({
      teams: {
        x: makeTeam('x', { largestConnected: 4, totalCells: 4 }),
        y: makeTeam('y', { largestConnected: 4, totalCells: 4 }),
        z: makeTeam('z', { largestConnected: 4, totalCells: 4 }),
      },
      joinOrder: ['y', 'x', 'z'],
    });
    expect(qqSortedTeamIds(room)).toEqual(['y', 'x', 'z']);
  });

  it('tieBreakerWinnerId überschreibt alles', () => {
    const room = makeRoom({
      teams: {
        a: makeTeam('a', { largestConnected: 10, totalCells: 20 }),
        b: makeTeam('b', { largestConnected: 10, totalCells: 20 }),
      },
      joinOrder: ['a', 'b'],
      tieBreakerWinnerId: 'b',
    });
    expect(qqSortedTeamIds(room)).toEqual(['b', 'a']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// qqGoBackSlide — Back-Button (Wolf-Wunsch 2026-05-24)
// ════════════════════════════════════════════════════════════════════════════

describe('qqGoBackSlide', () => {
  it('RULES: rulesSlideIndex--, Minimum ist -2 (Willkommen)', () => {
    const room = makeRoom({ phase: 'RULES', rulesSlideIndex: 3 });
    qqGoBackSlide(room);
    expect(room.rulesSlideIndex).toBe(2);
    // Min-Bound
    room.rulesSlideIndex = -2;
    qqGoBackSlide(room);
    expect(room.rulesSlideIndex).toBe(-2);
  });

  it('PHASE_INTRO: introStep--, min 0', () => {
    const room = makeRoom({ phase: 'PHASE_INTRO', introStep: 2 });
    qqGoBackSlide(room);
    expect(room.introStep).toBe(1);
    qqGoBackSlide(room);
    qqGoBackSlide(room);
    qqGoBackSlide(room);
    expect(room.introStep).toBe(0);
  });

  it('FINAL_REVEAL: finalRevealStep--', () => {
    const room = makeRoom({ phase: 'FINAL_REVEAL', finalRevealStep: 5 });
    qqGoBackSlide(room);
    expect(room.finalRevealStep).toBe(4);
  });

  it('QUESTION_REVEAL MUCHO: muchoRevealStep--', () => {
    const room = makeRoom({
      phase: 'QUESTION_REVEAL',
      muchoRevealStep: 2,
      currentQuestion: { category: 'MUCHO' },
    });
    qqGoBackSlide(room);
    expect(room.muchoRevealStep).toBe(1);
  });

  it('QUESTION_REVEAL CHEESE: cheeseRevealStep--', () => {
    const room = makeRoom({
      phase: 'QUESTION_REVEAL',
      cheeseRevealStep: 1,
      currentQuestion: { category: 'CHEESE' },
    });
    qqGoBackSlide(room);
    expect(room.cheeseRevealStep).toBe(0);
  });

  it('QUESTION_REVEAL BUNTE_TUETE/map: mapRevealStep--', () => {
    const room = makeRoom({
      phase: 'QUESTION_REVEAL',
      mapRevealStep: 3,
      currentQuestion: { category: 'BUNTE_TUETE', bunteTuete: { kind: 'map' } },
    });
    qqGoBackSlide(room);
    expect(room.mapRevealStep).toBe(2);
  });

  it('PLACEMENT: no-op (Undo via Ctrl+Z)', () => {
    const room = makeRoom({ phase: 'PLACEMENT', finalRevealStep: 5 });
    qqGoBackSlide(room);
    // Keine Veraenderung — PLACEMENT hat keine Slide-Reihenfolge
    expect(room.finalRevealStep).toBe(5);
  });

  it('LOBBY: no-op', () => {
    const room = makeRoom({ phase: 'LOBBY', rulesSlideIndex: 0 });
    qqGoBackSlide(room);
    expect(room.rulesSlideIndex).toBe(0);
  });

  it('COMEBACK_CHOICE mit comebackIntroStep > 0: decrementiert', () => {
    const room = makeRoom({ phase: 'COMEBACK_CHOICE', comebackIntroStep: 2 });
    qqGoBackSlide(room);
    expect(room.comebackIntroStep).toBe(1);
  });

  it('COMEBACK_CHOICE mit comebackIntroStep = 0: no-op (Intro durch, Spieler-Choice)', () => {
    const room = makeRoom({ phase: 'COMEBACK_CHOICE', comebackIntroStep: 0 });
    qqGoBackSlide(room);
    expect(room.comebackIntroStep).toBe(0);
  });
});
