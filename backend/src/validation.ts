/**
 * Input Validation & Sanitization Layer
 * Prevents XSS, buffer overflow, and invalid data
 */

// Maximum lengths to prevent buffer overflow / DoS
const LIMITS = {
  TEAM_NAME: 100,
  ANSWER: 1000,
  QUIZ_ID: 200,
  ROOM_CODE: 50,
  QUESTION_ID: 200,
  FILE_URL: 2048,
  LANGUAGE: 10,
  GENERAL_STRING: 500
};

/**
 * Sanitize HTML/Script tags to prevent XSS
 * Removes dangerous characters while preserving readability
 */
export const sanitizeString = (input: unknown, maxLength: number = LIMITS.GENERAL_STRING): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Enforce max length (truncate, don't reject)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove HTML tags and dangerous characters
  // Replace: <, >, &, quotes, newlines, control chars
  sanitized = sanitized
    .replace(/[<>]/g, '')  // Remove angle brackets (prevents <script>, <img>, etc.)
    .replace(/&/g, '&amp;')  // Escape ampersand
    .replace(/'/g, '&#39;')  // Escape single quote
    .replace(/"/g, '&quot;')  // Escape double quote
    .replace(/\x00/g, '')  // Remove null bytes
    .replace(/[\x01-\x1F]/g, '');  // Remove control characters
  
  return sanitized;
};

/**
 * Validate team name: 1-100 chars, alphanumeric + spaces/hyphens
 */
export const validateTeamName = (input: unknown): { valid: boolean; value: string; error?: string } => {
  const sanitized = sanitizeString(input, LIMITS.TEAM_NAME);
  
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, value: '', error: 'Team name cannot be empty' };
  }
  
  // Allow letters, numbers, spaces, hyphens, umlauts
  if (!/^[a-zA-Z0-9äöüßÄÖÜ\s\-\.]+$/.test(sanitized)) {
    return { valid: false, value: sanitized, error: 'Team name contains invalid characters' };
  }
  
  return { valid: true, value: sanitized };
};

/**
 * Validate answer submission: 0-1000 chars, allow most chars but sanitize
 */
export const validateAnswer = (input: unknown): { valid: boolean; value: string } => {
  const sanitized = sanitizeString(input, LIMITS.ANSWER);
  // Answers can be empty (for some mechanics), but must be sanitized
  return { valid: true, value: sanitized };
};

/**
 * Validate quiz ID: must be alphanumeric + hyphens, max 200 chars
 * Also check if ID exists in quizzes map
 */
export const validateQuizId = (
  input: unknown,
  quizzesMap?: Map<string, any>
): { valid: boolean; value: string; error?: string } => {
  if (typeof input !== 'string') {
    return { valid: false, value: '', error: 'Quiz ID must be a string' };
  }
  
  let quizId = input.trim();
  
  if (quizId.length === 0 || quizId.length > LIMITS.QUIZ_ID) {
    return { valid: false, value: quizId, error: `Quiz ID must be 1-${LIMITS.QUIZ_ID} characters` };
  }
  
  // Alphanumeric + hyphens/underscores only (standard ID format)
  if (!/^[a-zA-Z0-9\-_]+$/.test(quizId)) {
    return { valid: false, value: quizId, error: 'Quiz ID contains invalid characters' };
  }
  
  // Check if quiz exists (if map provided)
  if (quizzesMap && !quizzesMap.has(quizId)) {
    return { valid: false, value: quizId, error: 'Quiz not found' };
  }
  
  return { valid: true, value: quizId };
};

/**
 * Validate room code: alphanumeric, 1-50 chars
 */
export const validateRoomCode = (input: unknown): { valid: boolean; value: string; error?: string } => {
  if (typeof input !== 'string') {
    return { valid: false, value: '', error: 'Room code must be a string' };
  }
  
  const code = input.trim().toUpperCase();
  
  if (code.length === 0 || code.length > LIMITS.ROOM_CODE) {
    return { valid: false, value: code, error: `Room code must be 1-${LIMITS.ROOM_CODE} characters` };
  }
  
  if (!/^[A-Z0-9]+$/.test(code)) {
    return { valid: false, value: code, error: 'Room code must be alphanumeric' };
  }
  
  return { valid: true, value: code };
};

/**
 * Validate language: allow 'de', 'en', or 'both'
 */
export const validateLanguage = (
  input: unknown
): { valid: boolean; value: 'de' | 'en' | 'both'; error?: string } => {
  if (input !== 'de' && input !== 'en' && input !== 'both') {
    return { valid: false, value: 'de', error: 'Language must be "de", "en", or "both"' };
  }
  return { valid: true, value: input as 'de' | 'en' | 'both' };
};

/**
 * Validate question ID: alphanumeric + hyphens, max 200 chars
 */
export const validateQuestionId = (input: unknown): { valid: boolean; value: string; error?: string } => {
  if (typeof input !== 'string') {
    return { valid: false, value: '', error: 'Question ID must be a string' };
  }
  
  const qId = input.trim();
  
  if (qId.length === 0 || qId.length > LIMITS.QUESTION_ID) {
    return { valid: false, value: qId, error: `Question ID must be 1-${LIMITS.QUESTION_ID} characters` };
  }
  
  if (!/^[a-zA-Z0-9\-_]+$/.test(qId)) {
    return { valid: false, value: qId, error: 'Question ID contains invalid characters' };
  }
  
  return { valid: true, value: qId };
};

/**
 * Validate number input (e.g., timer, points)
 * Ensures it's within reasonable bounds
 */
export const validateNumber = (
  input: unknown,
  min: number = 0,
  max: number = 99999
): { valid: boolean; value: number; error?: string } => {
  const num = typeof input === 'number' ? input : Number(input);
  
  if (Number.isNaN(num)) {
    return { valid: false, value: min, error: 'Must be a number' };
  }
  
  if (num < min || num > max) {
    return { valid: false, value: Math.max(min, Math.min(max, num)), error: `Must be between ${min} and ${max}` };
  }
  
  return { valid: true, value: num };
};

/**
 * Validate team ID: alphanumeric + hyphens, from UUID format
 */
export const validateTeamId = (input: unknown): { valid: boolean; value: string; error?: string } => {
  if (typeof input !== 'string') {
    return { valid: false, value: '', error: 'Team ID must be a string' };
  }
  
  const id = input.trim();
  
  // Allow UUID format or alphanumeric
  if (!/^[a-f0-9\-]+$/.test(id)) {
    return { valid: false, value: id, error: 'Team ID format invalid' };
  }
  
  return { valid: true, value: id };
};
