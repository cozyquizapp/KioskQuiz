// 2026-07-14 (Wolf Arena-Background-Set): zentrale Beamer-Hintergrund-Logik fuer
// CozyArena. Ein Kolosseum, das pro Screen/Kategorie umfaerbt. Mapping mit Wolf
// abgestimmt (siehe Memory project-arena-background-set).
//
// Ansatz: das Arena-Bild + ein Scrim werden direkt in die zentrale `bg`-Variable
// des Beamers (QQBeamerPage) GEBACKEN — als CSS-background der Root/Stage. Damit
// deckt es die volle Buehne (wie der dunkle Default-BG), ohne Stacking-Risiko und
// ohne Aenderung an jeder einzelnen View. Gegated auf qqIsMega + kein Skin + kein
// Custom-Theme-BG. Nicht-Arena + Skins bleiben exakt beim alten Look.
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { qqIsMega } from '../../../shared/quarterQuizTypes';
import { isThemed } from '../qqTheme';

// Kategorie-Key -> Asset. Wolf: CHEESE heisst „Schau mal", 10v10 heisst „All In".
const ARENA_CAT_ASSET: Record<string, string> = {
  MUCHO: 'cat-mucho',
  SCHAETZCHEN: 'cat-schaetzchen',
  BUNTE_TUETE: 'cat-buntetuete',
  ZEHN_VON_ZEHN: 'cat-allin',
  CHEESE: 'schau-mal',
};

/**
 * Asset-Slug fuer die aktuelle Phase (ohne .webp) oder null (kein Arena-BG:
 * kein Mega-Modus, aktiver Skin, Custom-Draft-BG). LOBBY liefert bewusst null —
 * die Lobby hat ihre eigene, fein getunte BG-Behandlung (arena-main + Scrim +
 * dunklere Cards), die hier nicht doppelt drueberliegen soll.
 */
export function qqArenaBeamerBgSlug(s: QQStateUpdate): string | null {
  if (!qqIsMega(s) || isThemed()) return null;
  if (s.theme?.lobbyBackgroundUrl) return null; // Custom Draft-BG hat Vorrang
  const cat = (s.currentQuestion as any)?.category as string | undefined;
  const catAsset = cat && ARENA_CAT_ASSET[cat] ? ARENA_CAT_ASSET[cat] : 'arena-main';
  switch (s.phase) {
    case 'LOBBY':          return null; // Lobby rendert ihren BG selbst
    case 'RULES':          return 'arena-exterior';
    case 'TEAMS_REVEAL':   return 'arena-aerial';
    case 'PHASE_INTRO':    return 'cat-transition';
    case 'QUESTION_ACTIVE':
    case 'QUESTION_REVEAL':
    case 'TIEBREAKER_QUESTION': return catAsset;
    case 'PLACEMENT':      return 'standings';
    case 'PAUSED':         return 'pause';
    case 'FINAL_BETTING':
    case 'FINAL_REVEAL':   return 'epic-moment';
    case 'GAME_OVER':      return 'award-ceremony';
    case 'THANKS':         return 'arena-aerial';
    default:               return 'arena-main';
  }
}

// Scrim ueber dem Bild (kein separates Opacity, Shorthand-tauglich). Dunkelt das
// Kolosseum auf „Andeutung" und sichert Text-Kontrast (color-contrast). Ober-/
// Unterband + Vignette, Mitte heller. DIM = aktive Frage (Wolf: „Frage ruhiger").
const SCRIM_FULL =
  'linear-gradient(180deg, rgba(8,6,16,0.58) 0%, rgba(8,6,16,0.36) 26%, ' +
  'rgba(8,6,16,0.38) 64%, rgba(8,6,16,0.62) 100%), ' +
  'radial-gradient(ellipse at 50% 44%, rgba(8,6,16,0.16) 0%, rgba(8,6,16,0.48) 100%)';
const SCRIM_DIM =
  'linear-gradient(180deg, rgba(8,6,16,0.74) 0%, rgba(8,6,16,0.6) 30%, ' +
  'rgba(8,6,16,0.62) 66%, rgba(8,6,16,0.8) 100%), ' +
  'radial-gradient(ellipse at 50% 42%, rgba(8,6,16,0.42) 0%, rgba(8,6,16,0.7) 100%)';

/**
 * Fertiger CSS-`background`-String (Scrim + Kolosseum-Bild + dunkler Fallback)
 * fuer die zentrale Beamer-`bg`, oder null wenn kein Arena-BG gilt. In
 * QQBeamerPage VOR den anderen bg-Fallbacks einsetzen.
 */
export function qqArenaRootBg(s: QQStateUpdate): string | null {
  const slug = qqArenaBeamerBgSlug(s);
  if (!slug) return null;
  const dim = s.phase === 'QUESTION_ACTIVE'; // dichter Text/Optionen → staerker
  const scrim = dim ? SCRIM_DIM : SCRIM_FULL;
  return `${scrim}, url(/arena-bg/${slug}.webp) center / cover no-repeat, #0A0814`;
}
