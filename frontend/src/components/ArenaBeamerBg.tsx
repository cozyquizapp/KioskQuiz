// 2026-07-14 (Wolf Arena-Background-Set): zentrale Beamer-Hintergrund-Logik fuer
// CozyArena. Ein Kolosseum, das pro Screen/Kategorie umfaerbt. Mapping mit Wolf
// abgestimmt (siehe Memory project-arena-background-set).
//
// Ansatz: das Arena-Bild + ein Scrim werden direkt in die zentrale `bg`-Variable
// des Beamers (QQBeamerPage) GEBACKEN — als CSS-background der Root/Stage. Damit
// deckt es die volle Buehne (wie der dunkle Default-BG), ohne Stacking-Risiko und
// ohne Aenderung an jeder einzelnen View. Gegated auf qqIsMega + kein Skin + kein
// Custom-Theme-BG. Nicht-Arena + Skins bleiben exakt beim alten Look.
import React, { useState, useEffect } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { qqIsMega, QQ_QUESTIONS_PER_PHASE } from '../../../shared/quarterQuizTypes';
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
// Kategorie -> Asset. ALLE Bunte-Tuete-Sub-Kinds (auch CozyGuessr/Map + Schwarm)
// bekommen das rote cat-buntetuete — Wolf 2026-07-14: „in cozyguessr auch den
// roten (gehoert doch zu bunte tuete)".
function qqCategoryAsset(s: QQStateUpdate): string {
  const cat = (s.currentQuestion as any)?.category as string | undefined;
  if (!cat) return 'arena-main';
  return ARENA_CAT_ASSET[cat] ?? 'arena-main';
}

/** Arena-Backgrounds aktiv? Moderator-Toggle (Default an). false → schlichter
 *  dunkler Default-BG statt Kolosseum. Zentral, damit Beamer/Lobby/Welcome
 *  denselben Gate nutzen. */
export function qqArenaBgEnabled(s: QQStateUpdate): boolean {
  return (s as any).arenaBackgrounds !== false;
}

export function qqArenaBeamerBgSlug(s: QQStateUpdate): string | null {
  if (!qqIsMega(s) || isThemed()) return null;
  if (!qqArenaBgEnabled(s)) return null; // Moderator hat Arena-BGs ausgeschaltet
  if (s.theme?.lobbyBackgroundUrl) return null; // Custom Draft-BG hat Vorrang
  switch (s.phase) {
    case 'LOBBY':
      // Echte Lobby (setupDone) bringt ihren eigenen BG mit. Alle Pre-Game-
      // Screens davor (Neutral-Welcome „Setting up", Pre-Game „Starting soon")
      // brauchen den Arena-BG (Wolf: „hier fehlt noch bg").
      if (s.setupDone) return null;
      return 'lobby-waiting';
    case 'RULES':          return 'arena-exterior';
    // 2026-07-17 (Wolf, neuer BG): Team-Vorstellung → arena-teams-sky (offene Mitte,
    // KEINE gemalten Fraktions-Banner, nur Kronen-Wimpel in den Ecken). Loest das
    // „doppelt gemoppelt" von bild 2: der Vordergrund-Roster ist jetzt die EINZIGE
    // Wappen-Reihe, nichts im BG doppelt sie. (Vorher arena-main = Kolosseum mit
    // gemalten Bannern → Doppelung mit dem Roster.)
    case 'TEAMS_REVEAL':   return 'arena-teams-sky';
    // Runden-Intro (Wolf 2026-07-14): Schritt 1+2 der Journey (introStep 0 =
    // Gesamt-Übersicht, 1 = Runden-Cluster) zeigen das `rundenintro`-Bild; erst
    // wenn die Kategorie enthüllt wird (introStep >= 2) kommt das Kategorie-BG.
    // Nur bei der ERSTEN Frage einer Runde gibt es die Journey — Fragen 2–5
    // springen direkt auf die Kategorie (kein Runden-Intro).
    case 'PHASE_INTRO': {
      const firstOfRound = (s.questionIndex % QQ_QUESTIONS_PER_PHASE) === 0;
      const step = s.introStep ?? 0;
      if (firstOfRound && step <= 1) return 'rundenintro';
      return qqCategoryAsset(s);
    }
    case 'QUESTION_ACTIVE':
    case 'QUESTION_REVEAL':
    case 'TIEBREAKER_QUESTION': return qqCategoryAsset(s);
    // 2026-07-16 (Wolf-Livetest): die scoring.webp-Tafel passte NICHT auf den
    // Wertungs-Beat (Liste sass nicht im Board-Rahmen). Standings-BG (standing)
    // sitzt bestaetigt gut → BEIDE PLACEMENT-Beats nutzen jetzt denselben Board-
    // Frame. scoring.webp bleibt ungenutzt liegen. (Frueher: scoring/standing
    // je nach megaStandingsRevealed.)
    case 'PLACEMENT':      return 'standing';
    case 'PAUSED':         return 'pause';
    case 'FINAL_BETTING':
    case 'FINAL_REVEAL':   return 'epic-moment';
    case 'GAME_OVER':      return 'award-ceremony';
    // Thanks: arena-aerial war zu dunkel (Wolf) → helles Feier-Bild, passt zum
    // „Thanks for Playing" + Sieger-Anzeige.
    case 'THANKS':         return 'award-ceremony';
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
  'linear-gradient(180deg, rgba(8,6,16,0.66) 0%, rgba(8,6,16,0.46) 30%, ' +
  'rgba(8,6,16,0.48) 66%, rgba(8,6,16,0.7) 100%), ' +
  'radial-gradient(ellipse at 50% 44%, rgba(8,6,16,0.24) 0%, rgba(8,6,16,0.56) 100%)';

/**
 * Fertiger CSS-`background`-String (Scrim + Kolosseum-Bild + dunkler Fallback)
 * fuer die zentrale Beamer-`bg`, oder null wenn kein Arena-BG gilt. In
 * QQBeamerPage VOR den anderen bg-Fallbacks einsetzen.
 */
// Per-Asset Fokus-Override: '<position> / <size>' statt Default 'center / cover'.
// Manche Bilder haben ihren visuellen Mittelpunkt NICHT in der Bildmitte — mit
// reinem cover (kein Crop bei 16:9) sitzt der Fokus dann off-center. Hier leicht
// reinzoomen (size > 100%) schafft Crop-Raum, die Position schiebt den Fokus in
// die Bildmitte. Werte am Beamer feinjustierbar (Wolf 2026-07-16).
const ARENA_BG_FOCUS: Record<string, string> = {
  // rundenintro: der Boden-Kristall („Diamant in der Mitte") sitzt bei ~50%/71%,
  // also unter der Bildmitte. Leicht reinzoomen + nach unten schieben (mehr Boden
  // zeigen) rueckt den Kristall naeher an die Screen-Mitte.
  // 2026-07-17 (Wolf bild 1 „nicht symmetrisch mittig" — AUSGEMESSEN, nicht geraten):
  // Der Progress-Tree ist geometrisch exakt mittig (Rand L=R=231px). Ursache war der
  // BG: der helle Vortex-Streifen sitzt im Bild bei 50.96% (Pixel-Scan von
  // rundenintro.webp 1672x941), bei `center`/116%-Zoom landete er on-screen bei
  // ~899px statt 880 (= 20px rechts). Horizontale Position center→57% holt den
  // Vortex exakt auf Screen-Mitte (verifiziert: on-screen 880px). Formel:
  // screenX(vortex)=(1-1.16)*P + 0.5096*1.16 = 0.5 → P=0.57.
  rundenintro: '57% 66% / 116%',
  // standing (Wolf 2026-07-17 „perfekt auf den bg passen, da ist eine Tafel"):
  // AUSGEMESSEN, nicht geschaetzt. standing.webp ist 1462x1076 (AR 1.359) — auf
  // 16:9 croppt `cover` oben/unten weg und die gemalte Tafel landete klein und
  // zu hoch. Werte per Pixel-Scan des Assets ermittelt (Tafel-Innenflaeche liegt
  // im Bild bei x 272..1192, y 174..778):
  //   110% Zoom  → Tafel fuellt die Buehne (x 15.4..84.6%, y 9.6..90.4%)
  //   Position Y 31% → Tafel-Mitte auf Buehnen-Mitte (sonst sitzt sie zu hoch)
  // Ergebnis: unter dem Zapfen bleiben exakt 706px = 8 Zeilen a 88px
  // (STANDINGS_ROW_H). Wolf-Idee „BG zoomen = mehr Flaeche" — genau das hier.
  // ⚠️ Gilt fuer 16:9 (der BG liegt auf dem Fenster, nicht auf der 1760x990-Stage).
  // Gegenstueck: MEGA_BOARD in CozyQuizLargeGroupView — beide zusammen aendern!
  standing: '51% 31% / 110%',
};

/** Fertiger CSS-`background`-String fuer einen Asset-Slug (Scrim + Bild + Fallback). */
export function qqArenaBgFor(slug: string, dim = false): string {
  const scrim = dim ? SCRIM_DIM : SCRIM_FULL;
  const focus = ARENA_BG_FOCUS[slug] ?? 'center / cover';
  return `${scrim}, url(/arena-bg/${slug}.webp) ${focus} no-repeat, #0A0814`;
}

export function qqArenaRootBg(s: QQStateUpdate): string | null {
  const slug = qqArenaBeamerBgSlug(s);
  if (!slug) return null;
  return qqArenaBgFor(slug, s.phase === 'QUESTION_ACTIVE');
}

// prefers-reduced-motion — live (Beamer-Fenster kann die Einstellung wechseln).
function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduce;
}

/**
 * Ambient-Loop-Video für den `arena-main`-Hintergrund (Wolf-Video: Fackeln
 * flackern, Fahnen wehen). Absolut positionierte, stumme, endlos loopende Ebene
 * mit `/arena-bg/arena-main.webp` als Poster/Fallback. Bei `prefers-reduced-motion`
 * rendert nichts → der Aufrufer zeigt weiter das statische WebP darunter.
 * Der Aufrufer setzt Position (relative Container), Scrim + z-Stacking selbst;
 * hier nur die Bild-Ebene (zIndex 0, pointer-events aus, aria-hidden).
 */
export function ArenaMainVideo({ opacity = 1, style }: { opacity?: number; style?: React.CSSProperties }) {
  const reduce = usePrefersReducedMotion();
  const base: React.CSSProperties = {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
    opacity,
    pointerEvents: 'none',
    zIndex: 0,
    ...style,
  };
  // reduced-motion → statisches WebP (kein Video), damit die Ebene trotzdem einen
  // Hintergrund liefert (der Aufrufer rendert kein separates Bild mehr darunter).
  if (reduce) {
    return (
      <div aria-hidden style={{
        ...base,
        backgroundImage: 'url(/arena-bg/arena-main.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />
    );
  }
  return (
    <video
      aria-hidden
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/arena-bg/arena-main.webp"
      style={base}
    >
      {/* webm zuerst (kleiner, ~1,9 MB); mp4-Fallback (~2,7 MB) fuer Safari. */}
      <source src="/arena-bg/arena-main.webm" type="video/webm" />
      <source src="/arena-bg/arena-main.mp4" type="video/mp4" />
    </video>
  );
}
