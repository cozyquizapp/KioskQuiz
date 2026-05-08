// DesignLabPage — /gekocht
// 2026-05-07: 5 Design-Richtungen fuer CozyQuiz-Refresh, durchklickbar.
// Jeweils 3 Mock-Views (Lobby / Frage / Pause), Color-Palette daneben,
// Auto-Cycle + manuelle Nav. Keine echte Game-Logik, keine Sockets — nur
// pure Visual-Layer. Standard-CozyQuiz bleibt komplett unbeeinflusst.
import React, { useEffect, useMemo, useRef, useState } from 'react';

// ─── Google-Fonts laden (one-shot, alle 5 Designs) ────────────────────────────
// 2026-05-08: Lab auf 5 Aurora-Varianten umgebaut — Brand-Tweak (Pink+Navy
// statt Stripe-Tech-Palette). Font-Set entsprechend reduziert auf was die
// 4 Aurora-Varianten brauchen + Bricolage Grotesque / Geist / Space Grotesk
// / DM Sans als neue Display/Body-Optionen.
const FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Inter:wght@400;500;700;800;900' +
  '&family=Nunito:wght@400;700;800;900' +
  '&family=Outfit:wght@300;500;700;900' +
  '&family=Plus+Jakarta+Sans:wght@400;500;700;800' +
  '&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800' +
  '&family=Space+Grotesk:wght@400;500;700' +
  '&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900' +
  '&family=Caveat:wght@400;700' +
  '&display=swap';
// Geist wird separat geladen (noch nicht auf Google Fonts) — nutzt das offizielle
// Vercel-CDN. Kein Font-Display-Risiko, da Lab/Showreel-only.
const GEIST_FONT_HREF = 'https://cdn.jsdelivr.net/npm/geist@1/dist/geist.css';

// ─── Realistic Dummy-Data ────────────────────────────────────────────────────
type MockTeam = { id: string; name: string; emoji: string; color: string; cells: number; connected: boolean };
const MOCK_TEAMS: MockTeam[] = [
  { id: 't1', name: 'Schlawiner-Squad',     emoji: '🦊', color: '#F59E0B', cells: 7, connected: true  },
  { id: 't2', name: 'Quiz-Banditen',        emoji: '🐻', color: '#EF4444', cells: 6, connected: true  },
  { id: 't3', name: 'Couchpotatoes',        emoji: '🥔', color: '#10B981', cells: 5, connected: true  },
  { id: 't4', name: 'Kekskrümel-Kommando',  emoji: '🍪', color: '#F97316', cells: 5, connected: true  },
  { id: 't5', name: 'Saalrocker',           emoji: '🎸', color: '#8B5CF6', cells: 4, connected: true  },
  { id: 't6', name: 'Wissens-Wölfe',        emoji: '🐺', color: '#3B82F6', cells: 3, connected: true  },
  { id: 't7', name: 'Schon-Wieder-Falsch',  emoji: '🤡', color: '#EC4899', cells: 2, connected: false },
  { id: 't8', name: 'Genie-Gang',           emoji: '🧠', color: '#14B8A6', cells: 2, connected: true  },
];

type CategoryKey = 'SCHAETZCHEN' | 'MUCHO' | 'BUNTE_TUETE' | 'ZEHN_VON_ZEHN' | 'CHEESE';
const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: 'SCHAETZCHEN',   label: 'Schätzchen',   emoji: '🎯' },
  { key: 'MUCHO',         label: 'Mu-Cho',       emoji: '🅰️' },
  { key: 'BUNTE_TUETE',   label: 'Bunte Tüte',   emoji: '🎁' },
  { key: 'ZEHN_VON_ZEHN', label: '10 von 10',    emoji: '🎰' },
  { key: 'CHEESE',        label: 'Schau mal!',   emoji: '📸' },
];

const MOCK_QUESTION = {
  category: 'SCHAETZCHEN' as CategoryKey,
  text: 'In welchem Jahr eröffnete der Kölner Dom seine Pforten erstmals für Besucher?',
  hint: 'Tipp: Während der Industrialisierung.',
  round: 2,
  totalRounds: 3,
  qInRound: 3,
};

// ─── Design-Config-Type ──────────────────────────────────────────────────────
type ColorSwatch = { name: string; hex: string };
type DesignConfig = {
  id: string;
  name: string;
  vibe: string;
  fonts: { display: string; body: string };
  palette: ColorSwatch[];
  bgBase: string;            // base solid color
  bgLayers: string;          // CSS background layers (gradients/patterns)
  bgPatternSvg?: string;     // optional inline-SVG pattern URL
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardRadius: number;
  cardBackdrop?: string;     // backdrop-filter
  textPrimary: string;
  textSecondary: string;
  accent: string;            // primary accent (titles, buttons)
  categoryColors: Record<CategoryKey, string>;
  fireflyColor: string;      // fireflies tint
  /** Optional: per-design tweak fuer wie das Header-Wordmark aussehen soll. */
  wordmark: { text: string; weight: number; tracking: string; transform?: string };
};

// ─── 5 Design-Richtungen ──────────────────────────────────────────────────────
// Refined nach Recherche (Linear/Vercel · Wes Anderson · Ghibli · Blade Runner ·
// Jeopardy 2024+). Wichtigste Aenderungen:
// - Lounge Glass -> Aurora Stage: Glass im Pub-Setting hat Kontrast-Probleme,
//   Mesh-Gradient (Stripe.com-Style) liefert gleichen Premium-Vibe ohne
//   Lesbarkeitsverlust auf 4K-Beamer.
// - Hand-drawn: Quicksand -> Nunito (weniger generisch, hast du eh schon),
//   Caveat als Display-Akzent fuer handgeschriebene Score/Team-Momente.
// - Noir: DM Serif Body -> Newsreader (DM Serif zu fragil bei Body-Sizes).
// - Game Show: Bowlby nur Wordmark, Body Archivo Black.
const DESIGNS: DesignConfig[] = [
  // ─── 1. AURORA STAGE (vormals Lounge Glass) ──────────────────────────────
  {
    id: 'aurora',
    name: 'Aurora Stage',
    vibe: 'Mesh-Gradient à la Stripe · solide Cards mit Glow-Border · premium dunkel',
    fonts: { display: "'Outfit', system-ui, sans-serif", body: "'Plus Jakarta Sans', system-ui, sans-serif" },
    palette: [
      { name: 'Void',     hex: '#08090E' },
      { name: 'Navy',     hex: '#0F172A' },
      { name: 'Surface',  hex: '#111827' },
      { name: 'Magenta',  hex: '#E879F9' },
      { name: 'Cyan',     hex: '#22D3EE' },
      { name: 'Lime',     hex: '#A3E635' },
      { name: 'Bone',     hex: '#F1F5F9' },
      { name: 'Muted',    hex: '#94A3B8' },
    ],
    bgBase: '#08090E',
    // Mesh-Gradient: 4 grosse weiche radial-blobs in unterschiedlichen Farben
    // ueberlagern sich → Aurora-Effekt à la Stripe.com / Paper.app.
    bgLayers:
      'radial-gradient(ellipse 70% 50% at 12% 18%, rgba(232,121,249,0.32), transparent 65%),' +
      'radial-gradient(ellipse 70% 50% at 88% 22%, rgba(34,211,238,0.28), transparent 65%),' +
      'radial-gradient(ellipse 80% 60% at 25% 90%, rgba(163,230,53,0.18), transparent 65%),' +
      'radial-gradient(ellipse 60% 50% at 80% 85%, rgba(99,102,241,0.24), transparent 65%),' +
      'linear-gradient(180deg, #0F172A 0%, #08090E 100%)',
    cardBg: 'linear-gradient(180deg, rgba(17,24,39,0.85), rgba(15,23,42,0.92))',
    cardBorder: '1px solid rgba(255,255,255,0.10)',
    // Inner-border-top fuer Lichtkante (Recherche-Tipp), plus Aurora-Glow
    cardShadow:
      'inset 0 1px 0 rgba(255,255,255,0.18), ' +
      '0 24px 64px rgba(0,0,0,0.55), ' +
      '0 0 32px rgba(232,121,249,0.10)',
    cardRadius: 20,
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    accent: '#E879F9',
    categoryColors: {
      SCHAETZCHEN: '#FBBF24', MUCHO: '#22D3EE', BUNTE_TUETE: '#FB7185',
      ZEHN_VON_ZEHN: '#A3E635', CHEESE: '#C084FC',
    },
    fireflyColor: 'rgba(232, 121, 249, 0.85)',
    wordmark: { text: 'CozyQuiz', weight: 800, tracking: '-0.02em' },
  },
  // ─── 2. AURORA WOLF — Brand-Tweak (Pink+Navy statt Magenta+Cyan+Lime) ────
  // Aurora-Stage Struktur, aber Akzent-Farben aus dem CozyWolf-Logo
  // (Pink #EC4899 + Magenta #A21247 + Navy #1E2A5A statt Stripe-Tech-Palette).
  // Cards bleiben Glas-translucent. Outfit-Display + Plus Jakarta Body.
  {
    id: 'aurora-wolf',
    name: 'Aurora Wolf',
    vibe: 'Aurora-Stage mit CozyWolf-Brand-Farben · Pink-Navy-Mesh · Premium-Glas',
    fonts: { display: "'Outfit', system-ui, sans-serif", body: "'Plus Jakarta Sans', system-ui, sans-serif" },
    palette: [
      { name: 'Void',       hex: '#0A0B14' },
      { name: 'Hoodie',     hex: '#1E2A5A' }, // Wolf-Hoodie
      { name: 'Surface',    hex: '#161A2E' },
      { name: 'Wolf-Pink',  hex: '#EC4899' }, // Wolf-Body
      { name: 'Magenta',    hex: '#A21247' }, // Logo-Ring
      { name: 'Bone',       hex: '#F1F5F9' },
      { name: 'Mint',       hex: '#67E8C9' }, // sparsamer Spannungs-Akzent
      { name: 'Muted',      hex: '#94A3B8' },
    ],
    bgBase: '#0A0B14',
    bgLayers:
      'radial-gradient(ellipse 70% 50% at 14% 18%, rgba(236,72,153,0.32), transparent 65%),' +
      'radial-gradient(ellipse 70% 50% at 86% 22%, rgba(30,58,138,0.32), transparent 65%),' +
      'radial-gradient(ellipse 80% 60% at 25% 90%, rgba(162,18,71,0.22), transparent 65%),' +
      'radial-gradient(ellipse 60% 50% at 80% 85%, rgba(103,232,201,0.16), transparent 65%),' +
      'linear-gradient(180deg, #161A2E 0%, #0A0B14 100%)',
    cardBg: 'linear-gradient(180deg, rgba(22,26,46,0.85), rgba(10,11,20,0.92))',
    cardBorder: '1px solid rgba(255,255,255,0.10)',
    cardShadow:
      'inset 0 1px 0 rgba(255,255,255,0.18), ' +
      '0 24px 64px rgba(0,0,0,0.55), ' +
      '0 0 32px rgba(236,72,153,0.10)',
    cardRadius: 20,
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    accent: '#EC4899',
    categoryColors: {
      SCHAETZCHEN: '#FBBF24', MUCHO: '#A78BFA', BUNTE_TUETE: '#EC4899',
      ZEHN_VON_ZEHN: '#67E8C9', CHEESE: '#F0ABFC',
    },
    fireflyColor: 'rgba(236, 72, 153, 0.85)',
    wordmark: { text: 'CozyQuiz', weight: 800, tracking: '-0.02em' },
  },
  // ─── 3. AURORA VIVID — Pink-Pop, Premium-Karton statt Glas ───────────────
  // Mehr Aurora-Dichte (5 Blobs), Cards solider statt Glas. Border = soft
  // Pink-Glow, Inner-Highlight oben fuer Karton-Look. Bricolage Grotesque
  // (variable, character-stark) + Inter Body.
  {
    id: 'aurora-vivid',
    name: 'Aurora Vivid',
    vibe: 'Pink-Pop-Aurora · solide Premium-Karton-Cards · Gradient-Glow-Border',
    fonts: { display: "'Bricolage Grotesque', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
    palette: [
      { name: 'Void',         hex: '#0A0814' },
      { name: 'Hoodie',       hex: '#1E2A5A' },
      { name: 'Card',         hex: '#1A1525' },
      { name: 'Wolf-Pink',    hex: '#EC4899' },
      { name: 'Hot Pink',     hex: '#F472B6' },
      { name: 'Magenta',      hex: '#BE185D' },
      { name: 'Bone',         hex: '#FAFAF7' },
      { name: 'Mid',          hex: '#9CA3AF' },
    ],
    bgBase: '#0A0814',
    // 2026-05-08 (Wolf-Pick): Dichte/Opacity dezenter — 5. Blob raus,
    // 4 verbleibende Blobs ~30 % weniger Opacity, BG rahmt jetzt statt
    // zu konkurrieren mit dem Card-Pink.
    bgLayers:
      'radial-gradient(ellipse 60% 45% at 10% 15%, rgba(236,72,153,0.30), transparent 65%),' +
      'radial-gradient(ellipse 50% 40% at 90% 20%, rgba(30,42,90,0.32), transparent 65%),' +
      'radial-gradient(ellipse 70% 55% at 30% 85%, rgba(190,24,93,0.22), transparent 70%),' +
      'radial-gradient(ellipse 55% 45% at 80% 80%, rgba(244,114,182,0.15), transparent 65%),' +
      'linear-gradient(180deg, #14101F 0%, #0A0814 100%)',
    cardBg: 'linear-gradient(180deg, #1F1A2E 0%, #14101F 100%)',
    cardBorder: '1.5px solid rgba(236,72,153,0.32)',
    cardShadow:
      'inset 0 1.5px 0 rgba(255,255,255,0.10), ' +
      '0 0 0 1px rgba(236,72,153,0.08), ' +
      '0 16px 50px rgba(0,0,0,0.65), ' +
      '0 0 36px rgba(236,72,153,0.14)',
    cardRadius: 18,
    textPrimary: '#FAFAF7',
    textSecondary: '#9CA3AF',
    accent: '#EC4899',
    categoryColors: {
      SCHAETZCHEN: '#FBBF24', MUCHO: '#A78BFA', BUNTE_TUETE: '#F472B6',
      ZEHN_VON_ZEHN: '#34D399', CHEESE: '#F472B6',
    },
    fireflyColor: 'rgba(236, 72, 153, 0.95)',
    wordmark: { text: 'CozyQuiz', weight: 700, tracking: '-0.03em' },
  },
  // ─── 4. AURORA SOFT — Minimal-clean, mehr Atem, Caveat-Akzent ────────────
  // Reduzierte Aurora (nur 2 grosse weiche Blobs), sehr cleane Cards mit
  // duennem Border, viel Whitespace-Wirkung. Geist Display (Vercel-Style,
  // sehr modern) + Caveat als Cozy-Nod fuer handgeschriebene Akzente.
  {
    id: 'aurora-soft',
    name: 'Aurora Soft',
    vibe: 'Minimal-Aurora · 2-Blob-Wash · Geist + Caveat-Akzent · viel Atem',
    fonts: { display: "'Geist', system-ui, sans-serif", body: "'Geist', system-ui, sans-serif" },
    palette: [
      { name: 'Deep',        hex: '#0C0E1C' },
      { name: 'Hoodie',      hex: '#1E2A5A' },
      { name: 'Surface',     hex: '#15182A' },
      { name: 'Wolf-Pink',   hex: '#EC4899' },
      { name: 'Pink-Soft',   hex: '#F9A8D4' },
      { name: 'Bone',        hex: '#F8FAFC' },
      { name: 'Mid',         hex: '#94A3B8' },
      { name: 'Caveat',      hex: '#FBBF24' },
    ],
    bgBase: '#0C0E1C',
    bgLayers:
      'radial-gradient(ellipse 80% 55% at 20% 25%, rgba(236,72,153,0.20), transparent 70%),' +
      'radial-gradient(ellipse 75% 60% at 80% 80%, rgba(30,42,90,0.28), transparent 70%),' +
      'linear-gradient(180deg, #15182A 0%, #0C0E1C 100%)',
    cardBg: 'linear-gradient(180deg, rgba(21,24,42,0.78), rgba(12,14,28,0.85))',
    cardBorder: '1px solid rgba(255,255,255,0.06)',
    cardShadow:
      'inset 0 1px 0 rgba(255,255,255,0.08), ' +
      '0 18px 56px rgba(0,0,0,0.45)',
    cardRadius: 16,
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    accent: '#EC4899',
    categoryColors: {
      SCHAETZCHEN: '#FBBF24', MUCHO: '#A78BFA', BUNTE_TUETE: '#F9A8D4',
      ZEHN_VON_ZEHN: '#67E8C9', CHEESE: '#F0ABFC',
    },
    fireflyColor: 'rgba(249, 168, 212, 0.80)',
    wordmark: { text: 'CozyQuiz', weight: 600, tracking: '-0.02em' },
  },
  // ─── 5. AURORA BOLD — Hoodie-First, dramatic, harte Pink-Magenta-Border ──
  // Navy-Hoodie als BG-Hauptton, Pink-Magenta-Aurora als Akzent. Cards mit
  // 2px Pink-Magenta solidem Border + starkem Shadow. Space Grotesk
  // (tech-warm) + DM Sans Body. Wirkt wie Brand-Hardcore-Statement.
  {
    id: 'aurora-bold',
    name: 'Aurora Bold',
    vibe: 'Navy-Hoodie-Stage · Pink-Magenta-Akzent-Aurora · solide 2px Pink-Border',
    fonts: { display: "'Space Grotesk', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif" },
    palette: [
      { name: 'Hoodie-Deep', hex: '#0F1530' },
      { name: 'Hoodie',      hex: '#1E2A5A' },
      { name: 'Hoodie-Mid',  hex: '#2A3870' },
      { name: 'Wolf-Pink',   hex: '#EC4899' },
      { name: 'Magenta',     hex: '#A21247' },
      { name: 'Hot Pink',    hex: '#F472B6' },
      { name: 'Bone',        hex: '#FAFAF7' },
      { name: 'Mid',         hex: '#94A3B8' },
    ],
    bgBase: '#0F1530',
    bgLayers:
      'radial-gradient(ellipse 60% 45% at 12% 18%, rgba(236,72,153,0.32), transparent 60%),' +
      'radial-gradient(ellipse 70% 55% at 88% 80%, rgba(162,18,71,0.30), transparent 60%),' +
      'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30,42,90,0.40), transparent 70%),' +
      'linear-gradient(180deg, #1E2A5A 0%, #0F1530 100%)',
    cardBg: 'linear-gradient(180deg, #161D40 0%, #0F1530 100%)',
    cardBorder: '2px solid #EC4899',
    cardShadow:
      'inset 0 1.5px 0 rgba(244,114,182,0.20), ' +
      '0 0 0 1px rgba(162,18,71,0.40), ' +
      '0 20px 60px rgba(0,0,0,0.65), ' +
      '0 0 36px rgba(236,72,153,0.30)',
    cardRadius: 14,
    textPrimary: '#FAFAF7',
    textSecondary: '#94A3B8',
    accent: '#EC4899',
    categoryColors: {
      SCHAETZCHEN: '#FBBF24', MUCHO: '#A78BFA', BUNTE_TUETE: '#F472B6',
      ZEHN_VON_ZEHN: '#67E8C9', CHEESE: '#F0ABFC',
    },
    fireflyColor: 'rgba(244, 114, 182, 0.95)',
    wordmark: { text: 'COZYQUIZ', weight: 700, tracking: '0.02em', transform: 'uppercase' },
  },
];

// ─── Modern-Web Design-Patterns: Animations + Hover-Effects ──────────────────
// Aus Live-Recherche (Stripe, Vercel, Raycast) + Tiefen-Recherche (Jackbox,
// TV-Game-Shows, Awwwards 2025/26 Trends).
const MODERN_KEYFRAMES = `
  /* Stripe-Style Mesh-Gradient: slow drift + breathing, 60s Cycle.
     2026-05-08 (Wolf-Wunsch 'kein Drehen am Background'): Rotation komplett
     raus, nur translate + scale-breath. Bleibt subtil dynamisch ohne dass
     der BG visuell rotiert. */
  @keyframes auroraDrift {
    0%   { transform: translate(0, 0)       scale(1.04); opacity: 0.95; }
    50%  { transform: translate(-2%, 1.5%)  scale(1.10); opacity: 1.00; }
    100% { transform: translate(0, 0)       scale(1.04); opacity: 0.95; }
  }
  /* Cinematic Noir: animated grain (3-Frame Flicker @24fps). */
  @keyframes grainFlicker {
    0%   { opacity: 0.18; transform: translate(0px, 0px); }
    33%  { opacity: 0.20; transform: translate(-3px, 2px); }
    66%  { opacity: 0.16; transform: translate(2px, -3px); }
    100% { opacity: 0.18; transform: translate(0px, 0px); }
  }
  /* View-Switch-Cascade: gestaffeltes Hereinfaden. */
  @keyframes cardCascade {
    0%   { opacity: 0; transform: translateY(14px) scale(0.98); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes wordmarkSlide {
    0%   { opacity: 0; transform: translateY(-12px); letter-spacing: 0.1em; }
    100% { opacity: 1; transform: translateY(0); }
  }
  /* Avatar-Pulse: subtler Glow/Scale-Atemzug fuer 'active' Teams.
     Discord/Figma-Multiplayer-DNA — zeigt 'Team denkt nach'. */
  @keyframes avatarPulse {
    0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 var(--pulse-color, rgba(255,255,255,0.0)); }
    50%      { transform: scale(1.06); box-shadow: 0 0 24px 4px var(--pulse-color, rgba(255,255,255,0.5)); }
  }
  /* Submit-Flow-Bar: fuellt sich von 0 -> 100% in 6s, dann reset.
     Zeigt 'X/Y haben submitted' (Slido/Mentimeter-Pattern). */
  @keyframes flowBarFill {
    0%   { width: 0%; }
    60%  { width: 62.5%; } /* 5/8 visualisiert */
    100% { width: 62.5%; }
  }
  /* Heartbeat-Pulse aufs gesamte BG: Letzte-10s-Druck-Pattern.
     Sehr subtil, color-shift max 4 % brightness. WWM-DNA. */
  @keyframes heartbeatPulse {
    0%, 100% { filter: brightness(1.00); }
    50%      { filter: brightness(1.04); }
  }
  /* Score-Tickup: counter-Property animiert von 0 -> ziel.
     Bouncy ease-out (cubic-bezier(.25, 1.4, .3, 1)) — Pointless-DNA. */
  @keyframes scoreTickup {
    0%   { --score-num: 0; transform: scale(1); }
    80%  { transform: scale(1.18); }
    100% { transform: scale(1); }
  }
  /* Variable-Font-Weight Hover-Boost auf Score-Numbers. */
  @keyframes weightSurge {
    0%, 100% { font-variation-settings: 'wght' 700; }
    50%      { font-variation-settings: 'wght' 950; }
  }
  /* Hover-Lift via transition (im CSS-Block weiter unten). */
`;

// ─── Animated Counter (Tickup von 0 -> target mit bouncy easing) ────────────
function AnimatedNumber({ value, durationMs = 1100, fontFamily, color }: {
  value: number; durationMs?: number; fontFamily?: string; color?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Bouncy ease-out (overshoot leicht ueber 1, dann zurueck — Pointless-DNA)
      const eased = t < 0.85
        ? 1 - Math.pow(1 - t / 0.85, 2)
        : 1 + Math.sin((t - 0.85) / 0.15 * Math.PI) * 0.03;
      setDisplayed(Math.round(value * Math.max(0, Math.min(1.06, eased))));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplayed(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return (
    <span style={{
      fontFamily,
      color,
      fontVariantNumeric: 'tabular-nums',
      // Variable-Font-Weight Surge beim Tickup (nur sichtbar wenn Font Variable-Axis hat).
      animation: 'weightSurge 1.1s cubic-bezier(.25, 1.4, .3, 1) both',
      display: 'inline-block',
    }}>{displayed}</span>
  );
}

// ─── Mini-Fireflies ──────────────────────────────────────────────────────────
// Vereinfachte Version, nicht die echte aus QQBeamerPage (keine Side-Effects).
function MiniFireflies({ color, count = 20 }: { color: string; count?: number }) {
  const flies = useMemo(() => Array.from({ length: count }, (_, i) => {
    const seed = i * 137;
    return {
      x: (seed * 31 % 100),
      y: (seed * 17 % 100),
      size: 2 + (i % 5),
      dur: 8 + (i % 7) * 1.5,
      delay: (i % 6) * 1.2,
      driftX: 30 + (i % 8) * 8,
      driftY: -20 - (i % 6) * 6,
    };
  }), [count]);
  return (
    <>
      <style>{`
        @keyframes flyFloat {
          0%   { transform: translate(0,0); opacity: 0; }
          15%  { opacity: 0.85; }
          85%  { opacity: 0.85; }
          100% { transform: translate(var(--fdx), var(--fdy)); opacity: 0; }
        }
      `}</style>
      {flies.map((f, i) => (
        <span key={i} aria-hidden style={{
          position: 'absolute', left: `${f.x}%`, top: `${f.y}%`,
          width: f.size, height: f.size, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 ${f.size * 3}px ${color}, 0 0 ${f.size * 6}px ${color}`,
          ['--fdx' as string]: `${f.driftX}px`,
          ['--fdy' as string]: `${f.driftY}px`,
          animation: `flyFloat ${f.dur}s ease-in-out ${f.delay}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

// ─── Modern-Web BG-Layers (animated mesh / grain) ────────────────────────────
function ModernBgLayers({ d }: { d: DesignConfig }) {
  const isAurora = d.id === 'aurora';
  const isNoir = d.id === 'noir';
  return (
    <>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: d.bgLayers,
        pointerEvents: 'none',
        // Aurora: Stripe-Style slow rotation + breathing, 60s loop. Animation
        // ist nur auf dem BG-Layer-Wrapper, Children bleiben unberuehrt weil
        // sie in eigenen Layern darueber sind.
        ...(isAurora ? {
          animation: 'auroraDrift 60s ease-in-out infinite',
          transformOrigin: '50% 50%',
        } : {}),
      }} />
      {d.bgPatternSvg && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: d.bgPatternSvg,
          backgroundRepeat: 'repeat',
          pointerEvents: 'none',
        }} />
      )}
      {isNoir && (
        // Animierter Film-Grain (Recherche-Tipp 'MUSS animiert sein, sonst
        // wirkt's wie Bug auf modernen LED-Beamern'). 3-Frame-Flicker via
        // grainFlicker keyframe — Position+Opacity wandern minimal.
        <div aria-hidden style={{
          position: 'absolute', inset: '-10%',
          backgroundImage:
            `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
            `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>` +
            `<rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
          opacity: 0.18,
          pointerEvents: 'none',
          animation: 'grainFlicker 0.42s steps(3) infinite',
        }} />
      )}
      {/* UNIVERSAL Grain-Overlay (Recherche-Tipp 'Textured Grains 2025/26
         Trend' + 'cozy authenticity'). Sehr subtil (4 % opacity), brandet
         alle 5 Designs als analog/warm. Kein Wettbewerber hat das.
         Skip im Noir (hat eigenen animierten Grain mit anderer mixBlendMode). */}
      {!isNoir && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>` +
            `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter>` +
            `<rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
          opacity: 0.045,
          pointerEvents: 'none',
        }} />
      )}
    </>
  );
}

// ─── Mock-View: LOBBY ────────────────────────────────────────────────────────
function MockLobby({ d }: { d: DesignConfig }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: d.bgBase, color: d.textPrimary,
      fontFamily: d.fonts.body,
    }}>
      <ModernBgLayers d={d} />
      <MiniFireflies color={d.fireflyColor} count={18} />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '32px 56px',
        height: '100%',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Wordmark Header */}
        <div className="lab-cascade-wm" style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            fontFamily: d.fonts.display,
            fontSize: 'clamp(40px, 5vw, 80px)',
            fontWeight: d.wordmark.weight,
            letterSpacing: d.wordmark.tracking,
            textTransform: (d.wordmark.transform as any) ?? undefined,
            color: d.accent,
            lineHeight: 1.05,
          }}>{d.wordmark.text}</div>
        </div>

        {/* Center: QR + Teams */}
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr',
          gap: 40, alignItems: 'center', minHeight: 0,
        }}>
          {/* Left: QR placeholder + branding */}
          <div className="lab-cascade-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 280, height: 280,
              background: '#fff',
              borderRadius: d.cardRadius,
              padding: 16,
              boxShadow: d.cardShadow,
              display: 'grid', placeItems: 'center',
            }}>
              {/* Fake QR pattern */}
              <div style={{
                width: '100%', height: '100%',
                background:
                  `repeating-conic-gradient(#0a0a0a 0% 25%, #fff 0% 50%) 50% / 14px 14px`,
                borderRadius: 4,
                opacity: 0.85,
              }} />
            </div>
            <div style={{ fontFamily: d.fonts.display, fontSize: 22, fontWeight: 700, color: d.accent }}>
              Scannen & mitspielen!
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 14, color: d.textSecondary,
              padding: '6px 14px', borderRadius: 8,
              background: 'rgba(127,127,127,0.10)',
              border: `1px solid ${d.cardBorder.replace('2px ', '1px ').replace('2.5px ', '1px ').replace('4px ', '1px ').split('solid ')[1] ?? 'rgba(127,127,127,0.2)'}`,
            }}>
              play.cozyquiz.app/team
            </div>
          </div>

          {/* Right: Teams */}
          <div className="lab-cascade-2" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: d.textSecondary, textAlign: 'center',
            }}>
              Joined Teams · {MOCK_TEAMS.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {MOCK_TEAMS.map((t, idx) => {
                // Avatar-Pulse demo: 2 Teams 'tippen gerade' (Discord/Figma-DNA).
                // In live App via socket-Events 'team:typing' getriggert.
                const isPulsing = idx === 0 || idx === 1;
                return (
                <div key={t.id} className="lab-hover" style={{
                  background: d.cardBg,
                  border: `2px solid ${t.color}55`,
                  borderRadius: d.cardRadius,
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: d.cardShadow,
                  backdropFilter: d.cardBackdrop,
                  WebkitBackdropFilter: d.cardBackdrop,
                  minWidth: 0,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: t.color,
                    display: 'grid', placeItems: 'center',
                    fontSize: 26, lineHeight: 1, flexShrink: 0,
                    ['--pulse-color' as string]: `${t.color}88`,
                    animation: isPulsing ? 'avatarPulse 1.6s ease-in-out infinite' : undefined,
                  }}>{t.emoji}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: d.fonts.display,
                      fontWeight: 800, fontSize: 18,
                      color: t.color, lineHeight: 1.1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{t.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.connected ? '#22C55E' : d.textSecondary, marginTop: 4 }}>
                      {isPulsing ? '● tippt…' : (t.connected ? '● bereit' : '○ offline')}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            <div style={{
              fontSize: 18, fontWeight: 800, textAlign: 'center', color: '#22C55E',
              fontFamily: d.fonts.display,
            }}>
              🔥 8 teams are in!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mock-View: QUESTION ─────────────────────────────────────────────────────
function MockQuestion({ d }: { d: DesignConfig }) {
  const cat = CATEGORIES.find(c => c.key === MOCK_QUESTION.category)!;
  const catColor = d.categoryColors[MOCK_QUESTION.category];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: d.bgBase, color: d.textPrimary,
      fontFamily: d.fonts.body,
      // Subtler Heartbeat-Pulse: simuliert 'Letzte 10s'-Druck-Pattern (WWM-DNA).
      // 4 % brightness-Atemzug, infinite. In Live-App nur bei <=10s Restzeit aktiv.
      animation: 'heartbeatPulse 2s ease-in-out infinite',
    }}>
      <ModernBgLayers d={d} />
      <MiniFireflies color={d.fireflyColor} count={14} />

      {/* Submit-Flow-Bar oben am Beamer-Rand (Slido/Mentimeter-DNA).
          Zeigt 'X von Y haben submitted' als animated fill. Bei 5/8 = 62.5 %.
          Sehr subtil (4px hoch, 30 % Opacity), peripheral-vision-only. */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 4, background: 'rgba(0,0,0,0.15)',
        zIndex: 3, pointerEvents: 'none',
      }}>
        <div style={{
          height: '100%',
          background: `linear-gradient(90deg, ${catColor}, ${catColor})`,
          boxShadow: `0 0 12px ${catColor}88`,
          width: '62.5%',
          animation: 'flowBarFill 6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
          opacity: 0.85,
        }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '40px 80px',
        height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
      }}>
        {/* Round Pill + Category Badge */}
        <div className="lab-cascade-1" style={{
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <div style={{
            padding: '8px 18px', borderRadius: 999,
            background: `${catColor}25`,
            border: `2px solid ${catColor}`,
            fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: catColor,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>{cat.emoji}</span> {cat.label}
          </div>
          <div style={{
            padding: '8px 18px', borderRadius: 999,
            background: 'rgba(127,127,127,0.10)',
            border: `1.5px solid ${d.textSecondary}55`,
            fontWeight: 800, fontSize: 14, letterSpacing: '0.05em',
            color: d.textSecondary,
          }}>
            Runde {MOCK_QUESTION.round} · Frage {MOCK_QUESTION.qInRound}/5
          </div>
        </div>

        {/* Question Card */}
        <div className="lab-cascade-2" style={{
          width: '100%', maxWidth: 1100,
          background: d.cardBg,
          border: d.cardBorder,
          borderRadius: d.cardRadius,
          boxShadow: d.cardShadow,
          backdropFilter: d.cardBackdrop,
          WebkitBackdropFilter: d.cardBackdrop,
          padding: '48px 56px',
          textAlign: 'center',
          flex: 1,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24,
          maxHeight: 480,
        }}>
          <div style={{
            fontFamily: d.fonts.display,
            fontSize: 'clamp(34px, 4vw, 60px)',
            fontWeight: 800,
            color: d.textPrimary,
            lineHeight: 1.2,
          }}>
            {MOCK_QUESTION.text}
          </div>
          <div style={{
            fontSize: 18, color: d.textSecondary,
            fontStyle: 'italic',
          }}>
            {MOCK_QUESTION.hint}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12,
          }}>
            <span style={{
              padding: '12px 28px', borderRadius: 999,
              background: catColor,
              color: '#0a0a0a',
              fontWeight: 900, fontSize: 18,
              boxShadow: `0 8px 24px ${catColor}55`,
            }}>
              ⏱ 30s
            </span>
          </div>
        </div>

        {/* Team-Status-Strip */}
        <div className="lab-cascade-3" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {MOCK_TEAMS.slice(0, 8).map(t => (
            <div key={t.id} className="lab-hover" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: `${t.color}20`,
              border: `1.5px solid ${t.color}66`,
            }}>
              <span style={{ fontSize: 16 }}>{t.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: t.color }}>{t.cells}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mock-View: PAUSE ────────────────────────────────────────────────────────
function MockPause({ d }: { d: DesignConfig }) {
  const sortedTeams = [...MOCK_TEAMS].sort((a, b) => b.cells - a.cells);
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: d.bgBase, color: d.textPrimary,
      fontFamily: d.fonts.body,
    }}>
      <ModernBgLayers d={d} />
      <MiniFireflies color={d.fireflyColor} count={14} />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '40px 60px',
        height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div className="lab-cascade-wm" style={{
          fontFamily: d.fonts.display,
          fontSize: 'clamp(48px, 6vw, 96px)',
          fontWeight: 800,
          color: d.accent,
          letterSpacing: d.wordmark.tracking,
          textShadow: `0 0 48px ${d.accent}66`,
        }}>
          Kurze Pause
        </div>

        <div className="lab-cascade-2" style={{
          width: '100%', maxWidth: 900,
          background: d.cardBg,
          border: d.cardBorder,
          borderRadius: d.cardRadius,
          boxShadow: d.cardShadow,
          backdropFilter: d.cardBackdrop,
          WebkitBackdropFilter: d.cardBackdrop,
          padding: '36px 48px',
          flex: 1,
          maxHeight: 540,
        }}>
          <div style={{
            fontFamily: d.fonts.display,
            fontSize: 32, fontWeight: 800, color: d.textPrimary,
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span>📊</span> Aktueller Stand
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 36, rowGap: 4 }}>
            {sortedTeams.map((t, i) => (
              <div key={t.id} className="lab-hover" style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 8px', borderRadius: 8,
                borderBottom: i < sortedTeams.length - 2 ? `1px solid ${d.textSecondary}22` : 'none',
              }}>
                <div style={{
                  width: 32, fontSize: 22, fontWeight: 900, color: d.textSecondary, textAlign: 'center',
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: t.color,
                  display: 'grid', placeItems: 'center',
                  fontSize: 24, lineHeight: 1, flexShrink: 0,
                }}>{t.emoji}</div>
                <div style={{
                  flex: 1, fontFamily: d.fonts.display,
                  fontSize: 20, fontWeight: 800, color: t.color,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{t.name}</div>
                {/* Score-Tickup mit bouncy easing (Pointless-DNA) +
                    Variable-Font-Weight-Surge (Awwwards 2025+ Trend).
                    Animiert beim Mount jedes Mal — Pause-View-Switch triggers fresh. */}
                <div style={{
                  fontFamily: d.fonts.display, fontWeight: 900, fontSize: 22,
                  color: d.accent, fontVariantNumeric: 'tabular-nums',
                  minWidth: 28, textAlign: 'right',
                }}>
                  <AnimatedNumber value={t.cells} fontFamily={d.fonts.display} color={d.accent} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          fontSize: 16, color: d.textSecondary, fontStyle: 'italic',
        }}>
          · Continuing soon… ·
        </div>
      </div>
    </div>
  );
}

// ─── View-Switcher ──────────────────────────────────────────────────────────
type ViewKey = 'lobby' | 'question' | 'pause';
const VIEWS: { key: ViewKey; label: string; emoji: string }[] = [
  { key: 'lobby',    label: 'Lobby',    emoji: '🏠' },
  { key: 'question', label: 'Frage',    emoji: '❓' },
  { key: 'pause',    label: 'Pause',    emoji: '⏸' },
];

function renderView(view: ViewKey, d: DesignConfig) {
  if (view === 'lobby')    return <MockLobby d={d} />;
  if (view === 'question') return <MockQuestion d={d} />;
  return <MockPause d={d} />;
}

// ─── Color-Swatch-Strip ──────────────────────────────────────────────────────
function PaletteStrip({ palette }: { palette: ColorSwatch[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {palette.map(c => (
        <div key={c.name} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 8px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: c.hex,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            flexShrink: 0,
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.1 }}>{c.name}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{c.hex}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main DesignLab Page ────────────────────────────────────────────────────
export default function DesignLabPage() {
  const [designIdx, setDesignIdx] = useState(0);
  const [viewIdx, setViewIdx] = useState<number>(0);
  const [autoCycle, setAutoCycle] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);

  const d = DESIGNS[designIdx];
  const view = VIEWS[viewIdx].key;

  // Inject Google Fonts + Geist once
  useEffect(() => {
    const fontsId = 'design-lab-fonts';
    if (!document.getElementById(fontsId)) {
      const link = document.createElement('link');
      link.id = fontsId;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    const geistId = 'design-lab-geist';
    if (!document.getElementById(geistId)) {
      const link = document.createElement('link');
      link.id = geistId;
      link.rel = 'stylesheet';
      link.href = GEIST_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  // Auto-Cycle: zykliert Designs alle 9s, View bleibt
  const cycleRef = useRef<number | null>(null);
  useEffect(() => {
    if (cycleRef.current) { window.clearInterval(cycleRef.current); cycleRef.current = null; }
    if (autoCycle) {
      cycleRef.current = window.setInterval(() => {
        setDesignIdx(i => (i + 1) % DESIGNS.length);
      }, 9000);
    }
    return () => { if (cycleRef.current) window.clearInterval(cycleRef.current); };
  }, [autoCycle]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setDesignIdx(i => (i + 1) % DESIGNS.length);
      else if (e.key === 'ArrowLeft') setDesignIdx(i => (i - 1 + DESIGNS.length) % DESIGNS.length);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setViewIdx(i => (i + 1) % VIEWS.length);
      else if (e.key === ' ') { e.preventDefault(); setAutoCycle(a => !a); }
      else if (e.key === 'Escape') setShowThumbs(false);
      else if (e.key === 'g' || e.key === 'G') setShowThumbs(s => !s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a',
      color: '#e2e8f0',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gridTemplateRows: '54px 1fr 54px',
      gap: 0,
    }}>
      {/* Modern Web Patterns: Animationen + Hover-Klassen */}
      <style>{MODERN_KEYFRAMES + `
        /* Vercel/Linear-Style Hover-Lift fuer alle .lab-hover Cards.
           transform-origin center, smooth cubic-bezier easing, 220ms. */
        .lab-hover {
          transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
                      box-shadow 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
                      filter 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: transform;
        }
        .lab-hover:hover {
          transform: translateY(-3px);
          filter: brightness(1.04);
        }
        /* View-Switch-Cascade: gestaffeltes Hereinfaden der Cards beim
           View-Wechsel. .lab-cascade-1 ... -4 = staggered delays. */
        .lab-cascade { animation: cardCascade 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .lab-cascade-1 { animation: cardCascade 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) 0.05s both; }
        .lab-cascade-2 { animation: cardCascade 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) 0.12s both; }
        .lab-cascade-3 { animation: cardCascade 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) 0.20s both; }
        .lab-cascade-wm { animation: wordmarkSlide 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
      `}</style>
      {/* ── Top Header ── */}
      <div style={{
        gridColumn: '1 / -1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,15,20,0.95)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 18 }}>🍳</span>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.05em' }}>CozyQuiz Design Lab</span>
          <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>/gekocht</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {DESIGNS.map((dd, i) => (
            <button key={dd.id}
              onClick={() => setDesignIdx(i)}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: i === designIdx ? `2px solid ${dd.accent}` : '1px solid rgba(255,255,255,0.12)',
                background: i === designIdx ? `${dd.accent}22` : 'transparent',
                color: i === designIdx ? dd.accent : '#cbd5e1',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {i + 1}. {dd.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowThumbs(s => !s)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: showThumbs ? 'rgba(245,158,11,0.18)' : 'transparent',
              color: '#e2e8f0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
            title="Grid view (G)"
          >▦ Grid</button>
          <button onClick={() => setAutoCycle(a => !a)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: autoCycle ? 'rgba(34,197,94,0.20)' : 'transparent',
              color: autoCycle ? '#4ade80' : '#e2e8f0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
            title="Auto-cycle (Space)"
          >{autoCycle ? '⏸ Auto' : '▶ Auto'}</button>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div style={{
        gridColumn: 1,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,15,20,0.95)',
        padding: 14,
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 800 }}>
            Vibe
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
            {d.vibe}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 800 }}>
            Fonts
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            <div><span style={{ color: '#64748b' }}>Display:</span> {d.fonts.display.split(',')[0].replace(/['"]/g, '')}</div>
            <div><span style={{ color: '#64748b' }}>Body:</span> {d.fonts.body.split(',')[0].replace(/['"]/g, '')}</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 800 }}>
            Palette
          </div>
          <PaletteStrip palette={d.palette} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 800 }}>
            Kategorien
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CATEGORIES.map(c => (
              <div key={c.key} style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#cbd5e1',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: d.categoryColors[c.key],
                  border: '1px solid rgba(255,255,255,0.15)',
                }} />
                <span>{c.emoji} {c.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          marginTop: 'auto',
          fontSize: 10, color: '#64748b', lineHeight: 1.4,
          padding: 10, borderRadius: 6,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#94a3b8' }}>Keyboard:</div>
          ←/→ Design · ↑/↓ View<br />
          Space: Auto · G: Grid · Esc: Close
        </div>
      </div>

      {/* ── Main Preview ── */}
      <div style={{
        gridColumn: 2,
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0a',
      }}>
        {renderView(view, d)}
      </div>

      {/* ── Bottom Tabs (Views) ── */}
      <div style={{
        gridColumn: '1 / -1',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '0 18px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,15,20,0.95)',
      }}>
        {VIEWS.map((v, i) => (
          <button key={v.key}
            onClick={() => setViewIdx(i)}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: i === viewIdx ? `2px solid ${d.accent}` : '1px solid rgba(255,255,255,0.12)',
              background: i === viewIdx ? `${d.accent}22` : 'transparent',
              color: i === viewIdx ? d.accent : '#cbd5e1',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <span>{v.emoji}</span> {v.label}
          </button>
        ))}
      </div>

      {/* ── Thumbnail Grid Overlay ── */}
      {showThumbs && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(5,5,10,0.92)',
          padding: 32,
          display: 'flex', flexDirection: 'column', gap: 24,
          overflowY: 'auto',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Alle 5 Designs · {VIEWS[viewIdx].label}
            </div>
            <button onClick={() => setShowThumbs(false)}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'transparent', color: '#e2e8f0',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >✕ Close</button>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 18,
          }}>
            {DESIGNS.map((dd, i) => (
              <div key={dd.id}
                onClick={() => { setDesignIdx(i); setShowThumbs(false); }}
                style={{
                  cursor: 'pointer',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: i === designIdx ? `3px solid ${dd.accent}` : '2px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  aspectRatio: '16 / 10',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.42)', transformOrigin: 'top left', width: '238%', height: '238%', pointerEvents: 'none' }}>
                  {renderView(view, dd)}
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '8px 14px',
                  background: 'rgba(0,0,0,0.75)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <span style={{ fontWeight: 800, color: dd.accent, fontSize: 13 }}>
                    {i + 1}. {dd.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{dd.vibe.split('·')[0].trim()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
