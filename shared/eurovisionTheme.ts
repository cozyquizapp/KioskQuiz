// 2026-05-07: Kanonischer Eurovision-Theme-Block — Single Source of Truth fuer
// Frontend-Template (eurovisionDraftTemplate.ts) UND Backend-Auto-Heal beim
// Draft-Read (server.ts). Wenn ein Draft mit 'Eurovision' im Title aber ohne
// `eurovisionMode: true` gelesen wird, mergt das Backend dieses Theme transparent
// und persistiert. Damit muss Wolf nie manuell repairen.
import type { QQTheme } from './quarterQuizTypes';

export const EUROVISION_THEME: QQTheme = {
  preset: 'custom',
  bgColor: '#1f0f3d',
  accentColor: '#FF2D7B',
  textColor: '#fde6f0',
  cardBg: '#2d1644',
  eurovisionMode: true,
  lobbyBackgroundUrl: '/themes/eurovision-bg-1.png',
  // 2026-05-07 (Wolf-Audit 'check ob nochmal BG mit Text unleserlich ist'):
  // bg-2.jpg hat 'EUROVISION SONG CONTEST VIENNA 2026' eingebrannt — kollidiert
  // mit den Beamer-Titeln (Halbfinale, Kurze Pause, Gleich geht's los). Alle
  // 3 Views (Lobby, Pause, PhaseIntro) nutzen jetzt das Herz-only bg-1.png.
  // Konsistent + garantiert lesbar. Wenn Wolf mehr Visual-Variety will, kann
  // ein zweites text-freies Asset spaeter ergaenzt werden.
  pauseBackgroundUrl: '/themes/eurovision-bg-1.png',
  phaseIntroBackgroundUrl: '/themes/eurovision-bg-1.png',
  logoUrl: '/themes/eurovision-logo.jpg',
  welcomeText: {
    de: 'Bonsoir Europe',
    en: 'Good evening Europe',
  },
  phaseNames: {
    de: ['Halbfinale 1', 'Halbfinale 2', 'Finale'],
    en: ['Semi-Final 1', 'Semi-Final 2', 'Grand Final'],
  },
  preferredAvatarSetId: 'esc',
};

/** Erkennt einen ESC-Draft am Title (case-insensitive) — Wolf hat keine
 *  separate Marker-Spalte, der Title ist die einzige Heuristik. */
export function isEurovisionDraftTitle(title: string | undefined): boolean {
  return typeof title === 'string' && /eurovision/i.test(title);
}

/** Prueft ob ein Draft-Theme-Block bereits den Eurovision-Marker traegt.
 *  Wenn nein → Auto-Heal noetig. */
export function hasEurovisionTheme(theme: any): boolean {
  return !!theme?.eurovisionMode;
}
