/**
 * Input Validation helpers für Frontend
 * Bietet UX-Feedback ohne Backend-Abhängigkeit
 */

export const TEAM_NAME_LIMITS = {
  minLength: 1,
  maxLength: 100,
  pattern: /^[a-zA-Z0-9äöüßÄÖÜ\s\-\.]+$/
};

export const ANSWER_LIMITS = {
  maxLength: 1000
};

/**
 * Validiere Team-Namen mit detailliertem Feedback
 */
export const validateTeamNameFront = (
  input: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    errors.push('Team name cannot be empty');
  } else if (trimmed.length > TEAM_NAME_LIMITS.maxLength) {
    errors.push(`Team name must be at most ${TEAM_NAME_LIMITS.maxLength} characters`);
  } else if (!TEAM_NAME_LIMITS.pattern.test(trimmed)) {
    errors.push('Team name contains invalid characters. Only letters, numbers, spaces, hyphens allowed');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Sanitize team name für Display
 */
export const sanitizeTeamNameFront = (input: string): string => {
  let sanitized = input.trim();
  if (sanitized.length > TEAM_NAME_LIMITS.maxLength) {
    sanitized = sanitized.substring(0, TEAM_NAME_LIMITS.maxLength);
  }
  return sanitized;
};

/**
 * Warn wenn Antwort zu lang wird
 */
export const getAnswerLengthWarning = (answer: string): string | null => {
  const length = answer.length;
  const threshold = ANSWER_LIMITS.maxLength * 0.8;
  
  if (length > ANSWER_LIMITS.maxLength) {
    return `Answer will be truncated to ${ANSWER_LIMITS.maxLength} characters`;
  }
  if (length > threshold) {
    return `Answer is getting long (${length}/${ANSWER_LIMITS.maxLength} characters)`;
  }
  return null;
};
