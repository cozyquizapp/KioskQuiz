// DesignLabPage — /gekocht
// 2026-05-07: 5 Design-Richtungen fuer CozyQuiz-Refresh, durchklickbar.
// Jeweils 3 Mock-Views (Lobby / Frage / Pause), Color-Palette daneben,
// Auto-Cycle + manuelle Nav. Keine echte Game-Logik, keine Sockets — nur
// pure Visual-Layer. Standard-CozyQuiz bleibt komplett unbeeinflusst.
import React, { useEffect, useMemo, useRef, useState } from 'react';

// ─── Google-Fonts laden (one-shot, alle 5 Designs) ────────────────────────────
const FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Inter:wght@400;500;700;800;900' +
  '&family=Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900' +
  '&family=Quicksand:wght@400;500;600;700' +
  '&family=DM+Serif+Display:ital@0;1' +
  '&family=Anton' +
  '&family=Bowlby+One' +
  '&family=Outfit:wght@300;500;700;900' +
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
const DESIGNS: DesignConfig[] = [
  // ─── 1. LOUNGE GLASS ─────────────────────────────────────────────────────
  {
    id: 'glass',
    name: 'Lounge Glass',
    vibe: 'Modern Glassmorphism · gedimmte Bar · gefrostete Cards',
    fonts: { display: "'Outfit', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
    palette: [
      { name: 'Base',     hex: '#0A0E1A' },
      { name: 'Surface',  hex: '#141B2D' },
      { name: 'Glass',    hex: '#1E293B' },
      { name: 'Accent',   hex: '#F59E0B' },
      { name: 'Mint',     hex: '#5EEAD4' },
      { name: 'Lavender', hex: '#A78BFA' },
      { name: 'Text',     hex: '#F1F5F9' },
      { name: 'Muted',    hex: '#94A3B8' },
    ],
    bgBase: '#0A0E1A',
    bgLayers:
      'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(245,158,11,0.18), transparent 60%),' +
      'radial-gradient(ellipse 80% 60% at 85% 75%, rgba(167,139,250,0.14), transparent 60%),' +
      'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(94,234,212,0.10), transparent 60%)',
    cardBg: 'linear-gradient(160deg, rgba(30,41,59,0.55), rgba(15,23,42,0.45))',
    cardBorder: '1px solid rgba(255,255,255,0.10)',
    cardShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    cardRadius: 24,
    cardBackdrop: 'blur(18px) saturate(140%)',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    accent: '#F59E0B',
    categoryColors: {
      SCHAETZCHEN: '#F59E0B', MUCHO: '#60A5FA', BUNTE_TUETE: '#FB7185',
      ZEHN_VON_ZEHN: '#5EEAD4', CHEESE: '#A78BFA',
    },
    fireflyColor: 'rgba(245, 200, 130, 0.85)',
    wordmark: { text: 'CozyQuiz', weight: 800, tracking: '-0.02em' },
  },
  // ─── 2. VINTAGE PUB QUIZ ─────────────────────────────────────────────────
  {
    id: 'pub',
    name: 'Vintage Pub Quiz',
    vibe: '70er-Tapete · warme Parchment-Cards · Pub-Night-Vibes',
    fonts: { display: "'Fraunces', Georgia, serif", body: "'Lora', Georgia, serif" },
    palette: [
      { name: 'Walnut',   hex: '#2A1810' },
      { name: 'Bourbon',  hex: '#3D2317' },
      { name: 'Parchment',hex: '#F4E4C1' },
      { name: 'Brick',    hex: '#A0392E' },
      { name: 'Olive',    hex: '#6B8E23' },
      { name: 'Brass',    hex: '#C9A961' },
      { name: 'Ink',      hex: '#1A0F08' },
      { name: 'Rust',     hex: '#B86E3F' },
    ],
    bgBase: '#2A1810',
    bgLayers:
      'radial-gradient(ellipse at 50% 0%, rgba(201,169,97,0.18), transparent 60%),' +
      'radial-gradient(ellipse at 50% 100%, rgba(160,57,46,0.14), transparent 60%)',
    bgPatternSvg:
      `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>` +
      `<g fill='none' stroke='%23C9A961' stroke-opacity='0.06' stroke-width='1.2'>` +
      `<path d='M40 10 L48 25 L65 28 L52 40 L55 57 L40 49 L25 57 L28 40 L15 28 L32 25 Z'/>` +
      `<circle cx='40' cy='40' r='3'/>` +
      `</g></svg>")`,
    cardBg: 'linear-gradient(180deg, #F4E4C1, #E8D4A8)',
    cardBorder: '2px solid #6B4423',
    cardShadow: '0 8px 0 rgba(26,15,8,0.7), 0 24px 40px rgba(0,0,0,0.4)',
    cardRadius: 6,
    textPrimary: '#1A0F08',
    textSecondary: '#5C3A1C',
    accent: '#A0392E',
    categoryColors: {
      SCHAETZCHEN: '#C9A961', MUCHO: '#3D5A80', BUNTE_TUETE: '#A0392E',
      ZEHN_VON_ZEHN: '#6B8E23', CHEESE: '#7B4B94',
    },
    fireflyColor: 'rgba(244, 228, 193, 0.9)',
    wordmark: { text: 'CozyQuiz', weight: 900, tracking: '0.01em' },
  },
  // ─── 3. HAND-DRAWN COZY ──────────────────────────────────────────────────
  {
    id: 'handdrawn',
    name: 'Hand-drawn Cozy',
    vibe: 'Studio-Ghibli · Paper-Texture · runde freundliche Forms',
    fonts: { display: "'Caveat', cursive", body: "'Quicksand', system-ui, sans-serif" },
    palette: [
      { name: 'Cream',    hex: '#FBF6E9' },
      { name: 'Mist',     hex: '#E5DBC4' },
      { name: 'Sage',     hex: '#9CAF88' },
      { name: 'Sky',      hex: '#A4C8DB' },
      { name: 'Coral',    hex: '#E89B7F' },
      { name: 'Plum',     hex: '#8B6F94' },
      { name: 'Ink',      hex: '#3A3026' },
      { name: 'Honey',    hex: '#D9A441' },
    ],
    bgBase: '#FBF6E9',
    bgLayers:
      'radial-gradient(ellipse at 20% 10%, rgba(217,164,65,0.12), transparent 55%),' +
      'radial-gradient(ellipse at 80% 90%, rgba(156,175,136,0.14), transparent 55%),' +
      'radial-gradient(ellipse at 50% 50%, rgba(232,155,127,0.08), transparent 70%)',
    bgPatternSvg:
      `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
      `<g fill='none' stroke='%233A3026' stroke-opacity='0.045' stroke-width='1.4' stroke-linecap='round'>` +
      `<path d='M0 40 Q40 20 80 40 T160 40' />` +
      `<path d='M0 100 Q40 80 80 100 T160 100' />` +
      `<path d='M0 130 Q40 110 80 130 T160 130' />` +
      `</g></svg>")`,
    cardBg: 'linear-gradient(160deg, #FFFCF5, #F4EDD8)',
    cardBorder: '2.5px solid #3A3026',
    cardShadow: '4px 6px 0 #3A3026, 4px 6px 0 0.5px #3A3026',
    cardRadius: 18,
    textPrimary: '#3A3026',
    textSecondary: '#6B5D4D',
    accent: '#E89B7F',
    categoryColors: {
      SCHAETZCHEN: '#D9A441', MUCHO: '#A4C8DB', BUNTE_TUETE: '#E89B7F',
      ZEHN_VON_ZEHN: '#9CAF88', CHEESE: '#8B6F94',
    },
    fireflyColor: 'rgba(217, 164, 65, 0.7)',
    wordmark: { text: 'CozyQuiz', weight: 700, tracking: '0' },
  },
  // ─── 4. CINEMATIC NOIR ───────────────────────────────────────────────────
  {
    id: 'noir',
    name: 'Cinematic Noir',
    vibe: 'Heavy Vignette · Spotlight per Card · atmosphärisch dunkel',
    fonts: { display: "'DM Serif Display', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
    palette: [
      { name: 'Pitch',    hex: '#06060A' },
      { name: 'Coal',     hex: '#13131A' },
      { name: 'Smoke',    hex: '#1F1F2A' },
      { name: 'Ember',    hex: '#E8893A' },
      { name: 'Wine',     hex: '#7A1F2E' },
      { name: 'Bone',     hex: '#E8E0D0' },
      { name: 'Mist',     hex: '#7A7585' },
      { name: 'Rust',     hex: '#A85C3D' },
    ],
    bgBase: '#06060A',
    bgLayers:
      'radial-gradient(ellipse 60% 80% at 50% 35%, rgba(232,137,58,0.16), transparent 55%),' +
      'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 90%)',
    cardBg: 'linear-gradient(180deg, #1F1F2A, #13131A)',
    cardBorder: '1px solid rgba(232,137,58,0.18)',
    cardShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(232,224,208,0.04)',
    cardRadius: 4,
    textPrimary: '#E8E0D0',
    textSecondary: '#7A7585',
    accent: '#E8893A',
    categoryColors: {
      SCHAETZCHEN: '#E8893A', MUCHO: '#5B82A6', BUNTE_TUETE: '#7A1F2E',
      ZEHN_VON_ZEHN: '#7A9572', CHEESE: '#9B7AAE',
    },
    fireflyColor: 'rgba(232, 137, 58, 0.85)',
    wordmark: { text: 'COZYQUIZ', weight: 400, tracking: '0.18em', transform: 'uppercase' },
  },
  // ─── 5. NEO-RETRO GAME SHOW ──────────────────────────────────────────────
  {
    id: 'gameshow',
    name: 'Neo-Retro Game Show',
    vibe: 'Family-Feud-Energie · kräftige Akzente · Bold-Display',
    fonts: { display: "'Bowlby One', Impact, sans-serif", body: "'Outfit', system-ui, sans-serif" },
    palette: [
      { name: 'Stage',    hex: '#0E1856' },
      { name: 'Velvet',   hex: '#7E1538' },
      { name: 'Hot Pink', hex: '#FF2E63' },
      { name: 'Electric', hex: '#08D9D6' },
      { name: 'Gold',     hex: '#FFD23F' },
      { name: 'Spot',     hex: '#FFFCEF' },
      { name: 'Shadow',   hex: '#06091F' },
      { name: 'Mint',     hex: '#3DDC84' },
    ],
    bgBase: '#0E1856',
    bgLayers:
      'radial-gradient(ellipse at 50% 0%, rgba(255,210,63,0.22), transparent 60%),' +
      'radial-gradient(ellipse at 0% 100%, rgba(255,46,99,0.18), transparent 55%),' +
      'radial-gradient(ellipse at 100% 100%, rgba(8,217,214,0.15), transparent 55%),' +
      'linear-gradient(180deg, #0E1856 0%, #06091F 100%)',
    bgPatternSvg:
      `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>` +
      `<circle cx='20' cy='20' r='1.5' fill='%23FFD23F' fill-opacity='0.10'/>` +
      `</svg>")`,
    cardBg: 'linear-gradient(180deg, #1A2275, #0E1856)',
    cardBorder: '4px solid #FFD23F',
    cardShadow: '0 0 0 2px #06091F, 0 12px 40px rgba(255,210,63,0.30), 0 24px 60px rgba(0,0,0,0.5)',
    cardRadius: 16,
    textPrimary: '#FFFCEF',
    textSecondary: '#9DA5D4',
    accent: '#FFD23F',
    categoryColors: {
      SCHAETZCHEN: '#FFD23F', MUCHO: '#08D9D6', BUNTE_TUETE: '#FF2E63',
      ZEHN_VON_ZEHN: '#3DDC84', CHEESE: '#C77DFF',
    },
    fireflyColor: 'rgba(255, 210, 63, 0.95)',
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
