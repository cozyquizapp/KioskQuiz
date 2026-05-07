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
  // 2026-05-07 v3 (Wolf 'hier sind 3.png/4.png/5.png als text-freie BG-
  // Varianten'): jetzt visuelle Variety zurueck — alle drei text-frei, jeder
  // View bekommt eine eigene Stimmung:
  //   Lobby     = bg-1.png (Herz-only, dezent statisch)
  //   Pause     = 3.png    (Pink/Blau-Swirl, dynamisch)
  //   PhaseIntro = 4.png   (Vienna-Herz ohne Text — perfekt zur Halbfinale-Reveal)
  pauseBackgroundUrl: '/themes/3.png',
  phaseIntroBackgroundUrl: '/themes/4.png',
  // 2026-05-07 v4 (Wolf 'wie geil waere ein 10sec intro video — video ist drin'):
  // Welcome-Video laeuft hinter dem CozyQuiz-Wordmark in der QuizIntroOverlay.
  // Browser-autoplay-policy: muted by default. Filename hat ein Leerzeichen,
  // muss URL-encoded werden ('%20').
  welcomeVideoUrl: '/themes/intro%20vid.mp4',
  // 2026-05-07 v5 (Wolf 'pack gerne das logo ohne bg in die folien, gerne
  // groesser'): logo-ohne ist die transparente Outline-Variante (weiss auf
  // transparent), wirkt premium auf dunklem BG. Render-Stellen verzichten
  // jetzt auf borderRadius/boxShadow (kein Pill-Frame mehr) und werden
  // groesser dargestellt — siehe QuizIntroOverlay + PreGame-Eyebrow.
  logoUrl: '/themes/logo%20ohne.png',
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
