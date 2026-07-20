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
import { qqDecodeFinalStep, qqFinalMaxStep, qqTowerAwardCount, qqTowerMaxBeat } from '../shared/qqFinalReveal';
import { qqSortedTeamIds, qqGoBackSlide, qqBetSlotsCount, updateTerritories } from '../backend/src/quarterQuiz/qqRooms';
import { buildEmptyGrid } from '../backend/src/quarterQuiz/qqBfs';

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

describe('qqDecodeFinalStep — v5 (2026-07-19, Turm-Finale V2: title → bets → race-final beats)', () => {
  it('step 0 → title', () => {
    expect(qqDecodeFinalStep(0, 0).kind).toBe('title');
    expect(qqDecodeFinalStep(-5, 0).kind).toBe('title');
  });

  it('steps 1..B → bet slots (B = betSlotsCount)', () => {
    const slot0 = qqDecodeFinalStep(1, 3);
    expect(slot0.kind).toBe('bet');
    if (slot0.kind === 'bet') expect(slot0.slotIndex).toBe(0);

    const slot2 = qqDecodeFinalStep(3, 3);
    expect(slot2.kind).toBe('bet');
    if (slot2.kind === 'bet') expect(slot2.slotIndex).toBe(2);
  });

  it('steps > B → race-final beats (beat 0 direkt nach letztem Bet-Slot)', () => {
    const b0 = qqDecodeFinalStep(4, 3);
    expect(b0.kind).toBe('race-final');
    if (b0.kind === 'race-final') expect(b0.beat).toBe(0);
    const b1 = qqDecodeFinalStep(5, 3);
    if (b1.kind === 'race-final') expect(b1.beat).toBe(1);
    const bBig = qqDecodeFinalStep(100, 3);
    if (bBig.kind === 'race-final') expect(bBig.beat).toBe(96);
  });

  it('mit 0 Bet-Slots: step 1 → race-final beat 0, step 4 → beat 3', () => {
    const b0 = qqDecodeFinalStep(1, 0);
    expect(b0.kind).toBe('race-final');
    if (b0.kind === 'race-final') expect(b0.beat).toBe(0);
    const b3 = qqDecodeFinalStep(4, 0);
    if (b3.kind === 'race-final') expect(b3.beat).toBe(3);
  });
});

describe('qqTowerAwardCount (jeder Award-Empfänger = 1 Turm-Beat)', () => {
  it('zählt nur gesetzte Empfänger', () => {
    expect(qqTowerAwardCount(null)).toBe(0);
    expect(qqTowerAwardCount({})).toBe(0);
    expect(qqTowerAwardCount({ speedy: 't1' })).toBe(1);
    expect(qqTowerAwardCount({ speedy: 't1', meisterklauer: 't2' })).toBe(2);
    expect(qqTowerAwardCount({ speedy: 't1', meisterklauer: 't2', underdog: 't3' })).toBe(3);
    // Underdog gibt +2 PUNKTE, aber trotzdem nur 1 beat.
    expect(qqTowerAwardCount({ underdog: 't3' })).toBe(1);
  });
});

describe('qqTowerMaxBeat = A + min(3, Teams) + 1 (Aufbau · Awards · Glide · Reveals)', () => {
  it('3 Awards, 8 Teams → 7', () => expect(qqTowerMaxBeat(3, 8)).toBe(7));
  it('0 Awards, 2 Teams → 3', () => expect(qqTowerMaxBeat(0, 2)).toBe(3));
  it('3 Awards, 1 Team → 5 (top = min(3,1) = 1)', () => expect(qqTowerMaxBeat(3, 1)).toBe(5));
});

describe('qqFinalMaxStep = B + 1 + qqTowerMaxBeat(A, Teams)', () => {
  it('0 bets, 3 awards, 8 teams → 8', () => expect(qqFinalMaxStep(0, 3, 8)).toBe(8));
  it('3 bets, 3 awards, 8 teams → 11', () => expect(qqFinalMaxStep(3, 3, 8)).toBe(11));
  it('8 bets, 3 awards, 8 teams → 16', () => expect(qqFinalMaxStep(8, 3, 8)).toBe(16));
  it('3 bets, 0 awards, 8 teams → 8 (Awards weggefallen komprimiert)', () => expect(qqFinalMaxStep(3, 0, 8)).toBe(8));
});

// ════════════════════════════════════════════════════════════════════════════
// updateTerritories — Bet-Stamp-Doppelzaehlung (2026-07-19 Finale-Score-Audit)
// ════════════════════════════════════════════════════════════════════════════
// Empirisch bewiesen: sobald Final-Reveal-Bet-Stamps auf dem Grid lagen, stieg
// largestConnected um totalBonus → qqFinalTotal (= largestConnected + totalBonus
// + awardPoints) zaehlte den Wett-Bonus DOPPELT (Sieger-kippbar). Fix: Stamps
// bleiben rein visuell, zaehlen NICHT mehr in die Wertung. Dieser Test sperrt das.
describe('updateTerritories — revealStamps zaehlen NICHT in largestConnected (Anti-Doppelzaehlung)', () => {
  function gridRoom() {
    const grid = buildEmptyGrid(3);
    grid[0][0].ownerId = 't1';
    grid[0][1].ownerId = 't1';
    grid[1][0].ownerId = 't1'; // zusammenhaengende Region aus 3 Feldern
    return makeRoom({
      gridSize: 3,
      grid,
      largeGroupMode: false,
      teams: { t1: makeTeam('t1'), t2: makeTeam('t2') },
      joinOrder: ['t1', 't2'],
    });
  }

  it('largestConnected = reine Grid-Region, unabhaengig von Bet-Stamps', () => {
    const room = gridRoom();
    updateTerritories(room);
    expect(room.teams.t1.largestConnected).toBe(3);

    // Bet-Stamps drauflegen (so wie qqFinalRevealPlaceStack es tut)
    room.grid[0][0].revealStamps = [{ kind: 'bet', teamId: 't1' }, { kind: 'bet', teamId: 't1' }];
    room.grid[0][1].revealStamps = [{ kind: 'sympathy', teamId: 't1' }];
    updateTerritories(room);

    // Vor dem Fix waere largestConnected jetzt 3 + 3 Stamps = 6 gewesen.
    expect(room.teams.t1.largestConnected).toBe(3);
    expect(room.teams.t1.totalCells).toBe(3);
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

// ════════════════════════════════════════════════════════════════════════════
// Fund 3 Teil 1 — Phasen-Snapshot: "Einen Schritt zurück" heilt eine
// versehentliche PHASEN-Weiterschaltung (Space zu frueh → Frage aktiv).
// qqGoBackSlide dekrementiert sonst nur Sub-Steps INNERHALB einer Phase.
// ════════════════════════════════════════════════════════════════════════════

describe('qqGoBackSlide — Phasen-Snapshot (Fund 3 Teil 1)', () => {
  it('QUESTION_ACTIVE mit _phaseSnapshot: Back restauriert PHASE_INTRO + introStep', () => {
    // Szenario: Mod stand im letzten PHASE_INTRO-Sub-Step, Space aktivierte die
    // Frage versehentlich. Der Snapshot wurde beim Kreuzen der Phasengrenze
    // genommen. Back muss die Phase zurueckholen, nicht nur einen Sub-Step.
    const room = makeRoom({
      phase: 'QUESTION_ACTIVE',
      introStep: 0,
      _phaseSnapshot: { phase: 'PHASE_INTRO', introStep: 2, questionHistoryLen: 0 },
      questionHistory: [{ id: 'q1' }], // qqActivateQuestion hat geflusht
    });
    qqGoBackSlide(room);
    expect(room.phase).toBe('PHASE_INTRO');
    expect(room.introStep).toBe(2);
    // History-Flush zurueckgerollt auf den Snapshot-Stand
    expect(room.questionHistory).toHaveLength(0);
    // Snapshot ist Single-Slot und danach verbraucht (kein Doppel-Zurueck)
    expect(room._phaseSnapshot).toBeFalsy();
  });

  it('QUESTION_ACTIVE OHNE _phaseSnapshot: no-op (kein Blind-Ruecksprung)', () => {
    // Ohne Snapshot darf Back NIE die Phase aendern — sonst kaeme man aus einer
    // regulaer laufenden Frage unkontrolliert heraus.
    const room = makeRoom({ phase: 'QUESTION_ACTIVE', introStep: 0 });
    qqGoBackSlide(room);
    expect(room.phase).toBe('QUESTION_ACTIVE');
  });

  it('Snapshot wird nur EINMAL verbraucht (zweites Back ist no-op)', () => {
    const room = makeRoom({
      phase: 'QUESTION_ACTIVE',
      _phaseSnapshot: { phase: 'PHASE_INTRO', introStep: 1, questionHistoryLen: 0 },
      questionHistory: [],
    });
    qqGoBackSlide(room); // restauriert PHASE_INTRO, introStep=1
    expect(room.phase).toBe('PHASE_INTRO');
    expect(room.introStep).toBe(1);
    qqGoBackSlide(room); // jetzt normaler PHASE_INTRO-Back: introStep 1→0
    expect(room.introStep).toBe(0);
    expect(room.phase).toBe('PHASE_INTRO');
  });
});
