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
  // 2026-05-07 v8 (Wolf-Klarstellung mit Screenshot 'nur herz ist okay, nicht
  // das mit der 7 und dem herz'): bg-1.png hat das 70-Jubilaeums-Logo
  // eingebrannt — das war Wolfs '7'! Korrektur: bg-1 raus, 4.png (heart-only,
  // KEIN 7) ist OK. 4 ist Wolfs 'das links nur herz'.
  //   Lobby     = 5.png   (sanfter Pink-Gradient, weisser CozyQuiz-Wordmark)
  //   Pause     = 3.png   (Pink/Blau-Swirl, Pink-Title hat Contrast)
  //   PhaseIntro = 4.png  (heart-only, Wolf-approved fuer den Halbfinale-Title)
  // bg-1.png + bg-2.jpg bleiben im /themes-Ordner aber ungenutzt (beide
  // haben '70'/'Vienna 2026'-Text).
  lobbyBackgroundUrl: '/themes/5.png',
  pauseBackgroundUrl: '/themes/3.png',
  phaseIntroBackgroundUrl: '/themes/4.png',
  // 2026-05-07 v4 (Wolf 'wie geil waere ein 10sec intro video — video ist drin'):
  // Welcome-Video laeuft hinter dem CozyQuiz-Wordmark in der QuizIntroOverlay.
  // Browser-autoplay-policy: muted by default. Filename hat ein Leerzeichen,
  // muss URL-encoded werden ('%20').
  welcomeVideoUrl: '/themes/intro%20vid.mp4',
  // 2026-05-07 v9 (Wolf 'hab dir in mobile ein paar bgs reingepackt'): 6
  // portrait-PNGs in /themes/mobile/. mobile/5 = soft Pink/Lila-Gradient,
  // ruhig genug fuer 3h Quiz ohne abzulenken. Alternativen:
  //   mobile/1 = Pink/Blau-Swirl (matches Beamer-3.png)
  //   mobile/2 = Pink/Magenta-Wellen (sehr soft)
  //   mobile/3 = Heart-Portrait
  //   mobile/4 = Pink/Blau dynamisch
  //   mobile/6 = transparenter Outline-Logo (nicht als BG, evtl. Overlay)
  mobileBackgroundUrl: '/themes/mobile/5.png',
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
