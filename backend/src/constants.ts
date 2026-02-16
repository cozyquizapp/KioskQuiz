export const SLOT_DURATION_MS = 3500;
export const QUESTION_INTRO_MS = 1200;
export const BLITZ_VISIBLE_THEME_COUNT = Number(process.env.BLITZ_VISIBLE_THEME_COUNT || 5);
export const BLITZ_CATEGORY_SHOWCASE_MS = Number(process.env.BLITZ_CATEGORY_SHOWCASE_MS || 10000); // 10s for slower, clearer slot machine animation
export const BLITZ_ROUND_INTRO_MS = Number(process.env.BLITZ_ROUND_INTRO_MS || 2000);
export const DEFAULT_QUESTION_TIME = 30; // Sekunden
export const ROOM_IDLE_CLEANUP_MS = 30 * 60 * 1000; // 30 Minuten
export const DEBUG = process.env.NODE_ENV !== 'production';
