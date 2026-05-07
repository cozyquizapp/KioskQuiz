// DesignLabPage — /gekocht
// 2026-05-07: 5 Design-Richtungen fuer CozyQuiz-Refresh, durchklickbar.
// Jeweils 3 Mock-Views (Lobby / Frage / Pause), Color-Palette daneben,
// Auto-Cycle + manuelle Nav. Keine echte Game-Logik, keine Sockets — nur
// pure Visual-Layer. Standard-CozyQuiz bleibt komplett unbeeinflusst.
import React, { useEffect, useMemo, useRef, useState } from 'react';

// ─── Google-Fonts laden (one-shot, alle 5 Designs) ────────────────────────────
// Fonts refined nach Recherche-Findings: Newsreader (Noir Body — DM Serif zu
// fragil), Archivo Black (Game-Show Body — Bowlby nur fuer 1-3 Worte),
// Plus Jakarta Sans (modern Body), Caveat (Hand-drawn Headlines).
const FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Inter:wght@400;500;700;800;900' +
  '&family=Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900' +
  '&family=Nunito:wght@400;700;800;900' +
  '&family=DM+Serif+Display:ital@0;1' +
  '&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,700' +
  '&family=Anton' +
  '&family=Bowlby+One' +
  '&family=Archivo+Black' +
  '&family=Outfit:wght@300;500;700;900' +
  '&family=Plus+Jakarta+Sans:wght@400;500;700;800' +
  '&family=Lora:wght@400;700' +
  '&family=Caveat:wght@400;700' +
  '&display=swap';

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
  // ─── 2. VINTAGE PUB QUIZ ─────────────────────────────────────────────────
  // Refined: Burnt-Orange/Mustard/Avocado-Palette aus echtem 70er-Quellen,
  // Parchment 2-Layer (Pattern + Vignette).
  {
    id: 'cafe',
    name: 'Café Vintage',
    vibe: '70er-Café-Tapete · Burnt Orange · Parchment-Cards · Wes Anderson Vibe',
    fonts: { display: "'Fraunces', Georgia, serif", body: "'Lora', Georgia, serif" },
    palette: [
      { name: 'Ink',         hex: '#2A1F14' },
      { name: 'Walnut',      hex: '#3D2317' },
      { name: 'Parchment',   hex: '#F2E4C9' },
      { name: 'Cream',       hex: '#E8D5A8' },
      { name: 'Burnt Orange',hex: '#C8642B' },
      { name: 'Mustard',     hex: '#D8A24A' },
      { name: 'Avocado',     hex: '#6B7A3A' },
      { name: 'Rust Brown',  hex: '#8B3A1F' },
    ],
    bgBase: '#2A1F14',
    bgLayers:
      'radial-gradient(ellipse at 50% 0%, rgba(216,162,74,0.22), transparent 60%),' +
      'radial-gradient(ellipse at 50% 100%, rgba(139,58,31,0.18), transparent 60%)',
    bgPatternSvg:
      `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>` +
      `<g fill='none' stroke='%23D8A24A' stroke-opacity='0.07' stroke-width='1.2'>` +
      `<path d='M40 8 L50 28 L70 32 L54 46 L58 66 L40 56 L22 66 L26 46 L10 32 L30 28 Z'/>` +
      `<circle cx='40' cy='40' r='3'/>` +
      `</g></svg>")`,
    cardBg: 'linear-gradient(180deg, #F2E4C9, #E8D5A8)',
    cardBorder: '2px solid #8B3A1F',
    // Stockflecken-Vignette via inner-shadow auf der Card → 2-Layer Parchment
    cardShadow:
      'inset 0 0 60px rgba(139,58,31,0.18), ' +
      '0 8px 0 rgba(42,31,20,0.7), ' +
      '0 24px 40px rgba(0,0,0,0.45)',
    cardRadius: 6,
    textPrimary: '#2A1F14',
    textSecondary: '#5C3A1C',
    accent: '#C8642B',
    categoryColors: {
      SCHAETZCHEN: '#D8A24A', MUCHO: '#3D5A80', BUNTE_TUETE: '#C8642B',
      ZEHN_VON_ZEHN: '#6B7A3A', CHEESE: '#7B4B94',
    },
    fireflyColor: 'rgba(216, 162, 74, 0.95)',
    wordmark: { text: 'CozyQuiz', weight: 900, tracking: '0.01em' },
  },
  // ─── 3. HAND-DRAWN COZY (Studio Ghibli) ──────────────────────────────────
  // Refined: Hex-Codes aus ewenme/ghibli-Palette, Body Nunito, Caveat fuer
  // handgeschriebene Akzente (Score/Team-Names).
  {
    id: 'handdrawn',
    name: 'Hand-drawn Cozy',
    vibe: 'Studio-Ghibli-Frames · weiche Sky+Sage · Caveat für handgeschrieben',
    fonts: { display: "'Caveat', cursive", body: "'Nunito', system-ui, sans-serif" },
    palette: [
      { name: 'Cream',       hex: '#F4E8D0' },
      { name: 'Card-Cream',  hex: '#FBF6E9' },
      { name: 'Sky',         hex: '#A8C8E1' },
      { name: 'Sage',        hex: '#9DB68C' },
      { name: 'Terracotta',  hex: '#D88B6A' },
      { name: 'Plum',        hex: '#8B6F94' },
      { name: 'Honey',       hex: '#D9A441' },
      { name: 'Ink',         hex: '#3E3A36' }, // never pure black!
    ],
    bgBase: '#F4E8D0',
    bgLayers:
      'radial-gradient(ellipse at 18% 10%, rgba(168,200,225,0.30), transparent 55%),' +
      'radial-gradient(ellipse at 82% 90%, rgba(157,182,140,0.28), transparent 55%),' +
      'radial-gradient(ellipse at 50% 50%, rgba(216,139,106,0.10), transparent 70%)',
    bgPatternSvg:
      `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
      `<g fill='none' stroke='%233E3A36' stroke-opacity='0.05' stroke-width='1.6' stroke-linecap='round'>` +
      `<path d='M0 40 Q40 20 80 40 T160 40' />` +
      `<path d='M0 100 Q40 80 80 100 T160 100' />` +
      `<path d='M0 130 Q40 110 80 130 T160 130' />` +
      `</g></svg>")`,
    cardBg: 'linear-gradient(160deg, #FBF6E9, #F0E5C8)',
    cardBorder: '2.5px solid #3E3A36',
    cardShadow: '5px 7px 0 #3E3A36, 5px 7px 24px rgba(62,58,54,0.20)',
    cardRadius: 22,
    textPrimary: '#3E3A36',
    textSecondary: '#6B5D4D',
    accent: '#D88B6A',
    categoryColors: {
      SCHAETZCHEN: '#D9A441', MUCHO: '#A8C8E1', BUNTE_TUETE: '#D88B6A',
      ZEHN_VON_ZEHN: '#9DB68C', CHEESE: '#8B6F94',
    },
    fireflyColor: 'rgba(217, 164, 65, 0.75)',
    wordmark: { text: 'CozyQuiz', weight: 700, tracking: '0' },
  },
  // ─── 4. CINEMATIC NOIR ───────────────────────────────────────────────────
  // Refined: 'true black-not-black' #0A0808, Brass-Gold Spotlight, Wine sehr
  // sparsam. Body Newsreader (statt DM Serif), echter box-shadow inset
  // Vignette-Effekt.
  {
    id: 'noir',
    name: 'Cinematic Noir',
    vibe: 'Blade Runner / Letterboxd · Brass-Spotlight · Bone-on-Pitch',
    fonts: { display: "'DM Serif Display', Georgia, serif", body: "'Newsreader', Georgia, serif" },
    palette: [
      { name: 'Pitch',    hex: '#0A0808' },
      { name: 'Smoke',    hex: '#1C1A18' },
      { name: 'Char',     hex: '#262320' },
      { name: 'Bone',     hex: '#F1E6D6' },
      { name: 'Brass',    hex: '#CBA135' },
      { name: 'Wine',     hex: '#7A1818' }, // sehr sparsam, max 3 % Flaeche
      { name: 'Mist',     hex: '#7A7585' },
      { name: 'Rust',     hex: '#A85C3D' },
    ],
    bgBase: '#0A0808',
    // Echter box-shadow inset Vignette: blur 200px+ "Linsen"-Gefuehl
    bgLayers:
      'radial-gradient(ellipse 50% 70% at 50% 32%, rgba(203,161,53,0.20), transparent 55%)',
    cardBg: 'linear-gradient(180deg, #1C1A18, #100E0C)',
    cardBorder: '1px solid rgba(203,161,53,0.22)',
    cardShadow:
      'inset 0 0 200px rgba(0,0,0,0.85), ' +     // Linsen-Vignette
      '0 30px 80px rgba(0,0,0,0.75), ' +
      'inset 0 1px 0 rgba(241,230,214,0.06)',
    cardRadius: 4,
    textPrimary: '#F1E6D6',
    textSecondary: '#7A7585',
    accent: '#CBA135',
    categoryColors: {
      SCHAETZCHEN: '#CBA135', MUCHO: '#5B82A6', BUNTE_TUETE: '#7A1818',
      ZEHN_VON_ZEHN: '#7A9572', CHEESE: '#9B7AAE',
    },
    fireflyColor: 'rgba(203, 161, 53, 0.90)',
    wordmark: { text: 'COZYQUIZ', weight: 400, tracking: '0.18em', transform: 'uppercase' },
  },
  // ─── 5. NEO-RETRO GAME SHOW ──────────────────────────────────────────────
  // Refined: Royal/Cobalt + Hot Magenta + Turbo Yellow (Jeopardy 2024+ Palette).
  // Bowlby nur Wordmark, Body Archivo Black. Card-Magie via chrome-bevel +
  // light-strip an Card-Kanten (siehe Recherche-Tipp).
  {
    id: 'gameshow',
    name: 'Neo-Retro Game Show',
    vibe: 'Jeopardy 2024+ / Family Feud · Chrome-Bevels · Bold-Display',
    fonts: { display: "'Bowlby One', Impact, sans-serif", body: "'Archivo Black', Impact, sans-serif" },
    palette: [
      { name: 'Stage',     hex: '#0C1838' },
      { name: 'Royal',     hex: '#1E3A8A' },
      { name: 'Cobalt',    hex: '#2563EB' },
      { name: 'Hot Magenta',hex: '#EC4899' },
      { name: 'Turbo',     hex: '#FACC15' },
      { name: 'Feud Gold', hex: '#F4B83E' },
      { name: 'White',     hex: '#FFFFFF' },
      { name: 'Mint',      hex: '#3DDC84' },
    ],
    bgBase: '#0C1838',
    bgLayers:
      'radial-gradient(ellipse at 50% 0%, rgba(244,184,62,0.28), transparent 60%),' +
      'radial-gradient(ellipse at 0% 100%, rgba(236,72,153,0.22), transparent 55%),' +
      'radial-gradient(ellipse at 100% 100%, rgba(37,99,235,0.20), transparent 55%),' +
      'linear-gradient(180deg, #0C1838 0%, #050B22 100%)',
    bgPatternSvg:
      `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>` +
      `<circle cx='20' cy='20' r='1.5' fill='%23FACC15' fill-opacity='0.12'/>` +
      `</svg>")`,
    cardBg: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
    // Chrome-Bevel + Gold-Light-Strip via gestackten box-shadows
    cardBorder: '4px solid #FACC15',
    cardShadow:
      'inset 0 4px 0 rgba(255,255,255,0.95), ' +
      'inset 0 -4px 0 rgba(244,184,62,0.5), ' +
      '0 0 0 2px #0C1838, ' +
      '0 0 0 6px #F4B83E, ' +
      '0 12px 40px rgba(244,184,62,0.45), ' +
      '0 24px 60px rgba(0,0,0,0.5)',
    cardRadius: 14,
    textPrimary: '#0C1838',
    textSecondary: '#1E3A8A',
    accent: '#FACC15',
    categoryColors: {
      SCHAETZCHEN: '#FACC15', MUCHO: '#2563EB', BUNTE_TUETE: '#EC4899',
      ZEHN_VON_ZEHN: '#3DDC84', CHEESE: '#A855F7',
    },
    fireflyColor: 'rgba(250, 204, 21, 0.95)',
    wordmark: { text: 'COZYQUIZ', weight: 400, tracking: '0.04em', transform: 'uppercase' },
  },
];

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

// ─── Mock-View: LOBBY ────────────────────────────────────────────────────────
function MockLobby({ d }: { d: DesignConfig }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: d.bgBase, color: d.textPrimary,
      fontFamily: d.fonts.body,
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: d.bgLayers, pointerEvents: 'none' }} />
      {d.bgPatternSvg && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: d.bgPatternSvg,
          backgroundRepeat: 'repeat',
          pointerEvents: 'none',
        }} />
      )}
      <MiniFireflies color={d.fireflyColor} count={18} />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '32px 56px',
        height: '100%',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Wordmark Header */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: d.textSecondary, textAlign: 'center',
            }}>
              Joined Teams · {MOCK_TEAMS.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {MOCK_TEAMS.map(t => (
                <div key={t.id} style={{
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
                  }}>{t.emoji}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: d.fonts.display,
                      fontWeight: 800, fontSize: 18,
                      color: t.color, lineHeight: 1.1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{t.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.connected ? '#22C55E' : d.textSecondary, marginTop: 4 }}>
                      {t.connected ? '● bereit' : '○ offline'}
                    </div>
                  </div>
                </div>
              ))}
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
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: d.bgLayers, pointerEvents: 'none' }} />
      {d.bgPatternSvg && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: d.bgPatternSvg,
          backgroundRepeat: 'repeat',
          pointerEvents: 'none',
        }} />
      )}
      <MiniFireflies color={d.fireflyColor} count={14} />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '40px 80px',
        height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
      }}>
        {/* Round Pill + Category Badge */}
        <div style={{
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
        <div style={{
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {MOCK_TEAMS.slice(0, 8).map(t => (
            <div key={t.id} style={{
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
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: d.bgLayers, pointerEvents: 'none' }} />
      {d.bgPatternSvg && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: d.bgPatternSvg,
          backgroundRepeat: 'repeat',
          pointerEvents: 'none',
        }} />
      )}
      <MiniFireflies color={d.fireflyColor} count={14} />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '40px 60px',
        height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div style={{
          fontFamily: d.fonts.display,
          fontSize: 'clamp(48px, 6vw, 96px)',
          fontWeight: 800,
          color: d.accent,
          letterSpacing: d.wordmark.tracking,
          textShadow: `0 0 48px ${d.accent}66`,
        }}>
          Kurze Pause
        </div>

        <div style={{
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
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 0',
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
                <div style={{
                  fontFamily: d.fonts.display, fontWeight: 900, fontSize: 22,
                  color: d.accent, fontVariantNumeric: 'tabular-nums',
                }}>{t.cells}</div>
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

  // Inject Google Fonts once
  useEffect(() => {
    const id = 'design-lab-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
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
