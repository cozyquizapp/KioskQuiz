// Utility für Precision/Ladder Auto-Matching

import type { BunteTuetePrecisionStep } from './quizTypes';

export interface MatchResult {
  matched: boolean;
  stepIndex: number; // Welche Ladder-Stufe matched (-1 wenn keine)
  points: number;
  confidence: number; // 0-1: Wie sicher ist der Match?
  method: 'exact' | 'numeric' | 'regex' | 'fuzzy' | 'none';
}

/**
 * Normalisiert eine Antwort für Vergleich
 */
function normalizeAnswer(answer: string, caseSensitive: boolean = false): string {
  let normalized = answer.trim();
  if (!caseSensitive) {
    normalized = normalized.toLowerCase();
  }
  // Entferne Sonderzeichen außer Zahlen und Buchstaben
  normalized = normalized.replace(/[^\w\säöüß]/gi, '');
  return normalized;
}

/**
 * Prüft ob numerische Antwort in Range liegt
 */
function matchNumericRange(answer: string, min: number, max: number): boolean {
  const num = parseFloat(answer.replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return false;
  return num >= min && num <= max;
}

/**
 * Fuzzy String Matching (Levenshtein Distance)
 */
function fuzzyMatch(str1: string, str2: string, threshold: number = 0.8): boolean {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return true;
  
  const distance = levenshteinDistance(longer, shorter);
  const similarity = (longer.length - distance) / longer.length;
  
  return similarity >= threshold;
}

/**
 * Berechnet Levenshtein Distance zwischen zwei Strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitution
          matrix[i][j - 1] + 1,     // Insertion
          matrix[i - 1][j] + 1      // Deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Versucht automatisch eine Antwort einer Ladder-Stufe zuzuordnen
 */
export function matchPrecisionAnswer(
  teamAnswer: string,
  ladder: BunteTuetePrecisionStep[],
  autoMatchEnabled: boolean = true
): MatchResult {
  if (!autoMatchEnabled) {
    return {
      matched: false,
      stepIndex: -1,
      points: 0,
      confidence: 0,
      method: 'none'
    };
  }

  const answer = teamAnswer.trim();
  if (!answer) {
    return {
      matched: false,
      stepIndex: -1,
      points: 0,
      confidence: 0,
      method: 'none'
    };
  }

  // Gehe Ladder von oben nach unten durch (höchste Punkte zuerst)
  const sortedLadder = ladder
    .map((step, idx) => ({ step, idx }))
    .sort((a, b) => b.step.points - a.step.points);

  for (const { step, idx } of sortedLadder) {
    const caseSensitive = step.caseSensitive ?? false;

    // 1. Exakter Match mit acceptedAnswers
    const normalizedAnswer = normalizeAnswer(answer, caseSensitive);
    for (const accepted of step.acceptedAnswers) {
      const normalizedAccepted = normalizeAnswer(accepted, caseSensitive);
      if (normalizedAnswer === normalizedAccepted) {
        return {
          matched: true,
          stepIndex: idx,
          points: step.points,
          confidence: 1.0,
          method: 'exact'
        };
      }
    }

    // 2. Numerischer Range-Match
    if (step.numericRange) {
      if (matchNumericRange(answer, step.numericRange.min, step.numericRange.max)) {
        return {
          matched: true,
          stepIndex: idx,
          points: step.points,
          confidence: 0.95,
          method: 'numeric'
        };
      }
    }

    // 3. Regex Pattern Match
    if (step.regexPattern) {
      try {
        const regex = new RegExp(step.regexPattern, caseSensitive ? '' : 'i');
        if (regex.test(answer)) {
          return {
            matched: true,
            stepIndex: idx,
            points: step.points,
            confidence: 0.9,
            method: 'regex'
          };
        }
      } catch (e) {
        console.error('Invalid regex pattern:', step.regexPattern);
      }
    }

    // 4. Fuzzy Match (nur wenn aktiviert)
    if (step.fuzzyMatch) {
      for (const accepted of step.acceptedAnswers) {
        if (fuzzyMatch(normalizedAnswer, normalizeAnswer(accepted, caseSensitive), 0.85)) {
          return {
            matched: true,
            stepIndex: idx,
            points: step.points,
            confidence: 0.8,
            method: 'fuzzy'
          };
        }
      }
    }
  }

  // Kein Match gefunden
  return {
    matched: false,
    stepIndex: -1,
    points: 0,
    confidence: 0,
    method: 'none'
  };
}

/**
 * Batch-Matching für alle Team-Antworten
 */
export function matchAllTeamAnswers(
  teamAnswers: Record<string, string>, // teamId -> answer
  ladder: BunteTuetePrecisionStep[],
  autoMatchEnabled: boolean = true
): Record<string, MatchResult> {
  const results: Record<string, MatchResult> = {};
  
  for (const [teamId, answer] of Object.entries(teamAnswers)) {
    results[teamId] = matchPrecisionAnswer(answer, ladder, autoMatchEnabled);
  }
  
  return results;
}

/**
 * Hilfsfunktion für Moderator: Zeigt welche Teams manuell bewertet werden müssen
 */
export function getTeamsNeedingReview(
  matchResults: Record<string, MatchResult>,
  confidenceThreshold: number = 0.9
): string[] {
  return Object.entries(matchResults)
    .filter(([_, result]) => !result.matched || result.confidence < confidenceThreshold)
    .map(([teamId, _]) => teamId);
}
