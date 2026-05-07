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
  // 2026-05-07 v6 (Wolf 'die bgs mit herz und 7 durch die ohne herz und 7,
  // sieht cleaner aus'): heart-containing BGs (bg-1.png, 4.png) raus, nur
  // noch die abstrakten clean-Varianten:
  //   Lobby     = 5.png   (sanfter Pink-Magenta-Gradient)
  //   Pause     = 3.png   (Pink/Blau-Swirl, dynamisch)
  //   PhaseIntro = 3.png  (gleicher Swirl als Halbfinale-Reveal-Hintergrund)
  // 4.png bleibt im /themes-Ordner liegen, aktuell ungenutzt.
  lobbyBackgroundUrl: '/themes/5.png',
  pauseBackgroundUrl: '/themes/3.png',
  phaseIntroBackgroundUrl: '/themes/3.png',
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
