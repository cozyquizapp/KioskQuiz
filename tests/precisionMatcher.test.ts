import { describe, it, expect } from 'vitest';
import { matchPrecisionAnswer } from '../shared/precisionMatcher';

const ladder = [
  { label: 'Exact', points: 10, acceptedAnswers: ['Berlin'], fuzzyMatch: true },
  { label: 'Close', points: 5, acceptedAnswers: ['Germany'], numericRange: { min: 80, max: 90 } },
  { label: 'Any', points: 1, acceptedAnswers: ['Europe'] },
];

describe('matchPrecisionAnswer', () => {
  it('returns no match for empty answer', () => {
    const r = matchPrecisionAnswer('', ladder);
    expect(r.matched).toBe(false);
    expect(r.method).toBe('none');
  });

  it('matches exact answer (case-insensitive)', () => {
    const r = matchPrecisionAnswer('berlin', ladder);
    expect(r.matched).toBe(true);
    expect(r.points).toBe(10);
    expect(r.method).toBe('exact');
  });

  it('matches lower-priority answer', () => {
    const r = matchPrecisionAnswer('Europe', ladder);
    expect(r.matched).toBe(true);
    expect(r.points).toBe(1);
  });

  it('returns no match when disabled', () => {
    const r = matchPrecisionAnswer('Berlin', ladder, false);
    expect(r.matched).toBe(false);
    expect(r.method).toBe('none');
  });

  it('handles fuzzy near-match', () => {
    const r = matchPrecisionAnswer('Berlinn', ladder);
    // Should fuzzy match to Berlin (1 extra char, 86% similarity > 85% threshold)
    expect(r.matched).toBe(true);
    expect(r.method).toBe('fuzzy');
  });
});
