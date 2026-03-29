import { describe, it, expect } from 'vitest';
import {
  buildEmptyGrid,
  computeTerritories,
  detectNewJokers,
  markJokerCells,
  findLastPlace,
} from '../backend/src/quarterQuiz/qqBfs';

function makeGrid(size: number, claims: Array<[number, number, string]>) {
  const g = buildEmptyGrid(size);
  for (const [r, c, id] of claims) g[r][c].ownerId = id;
  return g;
}

describe('buildEmptyGrid', () => {
  it('creates NxN grid with null owners', () => {
    const g = buildEmptyGrid(4);
    expect(g).toHaveLength(4);
    expect(g[0]).toHaveLength(4);
    expect(g[2][3].ownerId).toBeNull();
    expect(g[2][3].jokerFormed).toBe(false);
  });
});

describe('computeTerritories', () => {
  it('returns empty for unclaimed grid', () => {
    const g = buildEmptyGrid(4);
    expect(computeTerritories(g, 4)).toEqual({});
  });

  it('counts single cell', () => {
    const g = makeGrid(4, [[0, 0, 'A']]);
    const t = computeTerritories(g, 4);
    expect(t.A).toEqual({ total: 1, largest: 1 });
  });

  it('counts connected territory', () => {
    const g = makeGrid(4, [[0, 0, 'A'], [0, 1, 'A'], [1, 0, 'A']]);
    const t = computeTerritories(g, 4);
    expect(t.A).toEqual({ total: 3, largest: 3 });
  });

  it('counts disconnected territories separately', () => {
    const g = makeGrid(4, [[0, 0, 'A'], [2, 2, 'A']]);
    const t = computeTerritories(g, 4);
    expect(t.A).toEqual({ total: 2, largest: 1 });
  });

  it('handles multiple teams', () => {
    const g = makeGrid(4, [[0, 0, 'A'], [0, 1, 'A'], [2, 2, 'B'], [2, 3, 'B'], [3, 3, 'B']]);
    const t = computeTerritories(g, 4);
    expect(t.A).toEqual({ total: 2, largest: 2 });
    expect(t.B).toEqual({ total: 3, largest: 3 });
  });
});

describe('detectNewJokers', () => {
  it('detects 2x2 block', () => {
    const g = makeGrid(4, [[0, 0, 'A'], [0, 1, 'A'], [1, 0, 'A'], [1, 1, 'A']]);
    const j = detectNewJokers(g, 4, 'A');
    expect(j).toEqual([{ r: 0, c: 0 }]);
  });

  it('does not detect incomplete block', () => {
    const g = makeGrid(4, [[0, 0, 'A'], [0, 1, 'A'], [1, 0, 'A']]);
    expect(detectNewJokers(g, 4, 'A')).toEqual([]);
  });

  it('ignores already-formed jokers', () => {
    const g = makeGrid(4, [[0, 0, 'A'], [0, 1, 'A'], [1, 0, 'A'], [1, 1, 'A']]);
    markJokerCells(g, 0, 0);
    expect(detectNewJokers(g, 4, 'A')).toEqual([]);
  });

  it('does not count mixed-team blocks', () => {
    const g = makeGrid(4, [[0, 0, 'A'], [0, 1, 'B'], [1, 0, 'A'], [1, 1, 'A']]);
    expect(detectNewJokers(g, 4, 'A')).toEqual([]);
  });
});

describe('findLastPlace', () => {
  it('returns last joined if no territories', () => {
    expect(findLastPlace({}, ['A', 'B', 'C'])).toBe('C');
  });

  it('finds team with smallest largest connected', () => {
    const t = { A: { total: 3, largest: 3 }, B: { total: 2, largest: 1 }, C: { total: 4, largest: 4 } };
    expect(findLastPlace(t, ['A', 'B', 'C'])).toBe('B');
  });

  it('breaks ties by total cells', () => {
    const t = { A: { total: 3, largest: 2 }, B: { total: 2, largest: 2 } };
    expect(findLastPlace(t, ['A', 'B'])).toBe('B');
  });

  it('breaks equal ties by join order (later = last)', () => {
    const t = { A: { total: 2, largest: 2 }, B: { total: 2, largest: 2 } };
    expect(findLastPlace(t, ['A', 'B'])).toBe('B');
  });
});
