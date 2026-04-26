// QQ Gouache Lab — Stilstudie: Wie würde CozyQuiz im
// Aquarell-/Gouache-/Kinderbuch-Illustrations-Stil aussehen?
//
// Implementations-Strategie:
// - Paper-Texture via SVG-Turbulence-Filter (kein externes Asset)
// - Watercolor-Wash via überlagernde Radial-Gradients + leichtes Wobble
// - Hand-written Headings: Caveat (Google Font, free)
// - Body: Lora (warmer Serif) für die "Kinderbuch"-Lesbarkeit
// - Bestehende Avatare bekommen einen CSS-Filter (gedämpfte Sat + warmer
//   Sepia-Touch) und einen handgemalten Frame, um die Demo zu zeigen.
//   Für die echte App müssten die Avatare neu illustriert werden.

import { useEffect, useState } from 'react';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';

// ── Design-Tokens ────────────────────────────────────────────────────────────
const PALETTE = {
  inkDeep:    '#1F3A5F',   // tiefes Indigo-Blau (Nachthimmel)
  inkSoft:    '#3D5A80',   // gedämpftes Mittel-Blau
  sage:       '#7A9E7E',   // gedämpftes Salbei-Grün
  sageLight:  '#B8CDB1',   // helles Salbei
  cream:      '#F2EAD3',   // warmes Papier-Cremeweiß
  paper:      '#EAE0C8',   // Papier-BG Basis
  terracotta: '#E07A5F',   // warme Akzent-Erde
  ochre:      '#D9A05B',   // Ocker für Sterne/Akzente
  charcoal:   '#2D2A26',   // dunkler Tinte-Ton
};

// Font-Stack
const F_HAND   = "'Caveat', 'Kalam', 'Patrick Hand', cursive";
const F_BODY   = "'Lora', 'Cormorant Garamond', Georgia, serif";

// ── SVG-Filter Library (paper grain, watercolor wobble, painted edges) ─────
function GouacheFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {/* Paper-Grain — leichte Turbulenz mit warmer Tint */}
        <filter id="paperGrain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="
            0 0 0 0 0.92
            0 0 0 0 0.86
            0 0 0 0 0.74
            0 0 0 0.18 0
          " />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>

        {/* Watercolor-Edge — wobblige Kanten via Turbulenz + Displacement */}
        <filter id="watercolorEdge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>

        {/* Stärkerer Wobble fuer handgemalte Avatar-Frames */}
        <filter id="paintFrame" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>

        {/* Soft-Watercolor-Bleed — verläuft die Farbe leicht */}
        <filter id="bleed" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>

        {/* Avatar-Sepia: dämpft Saturation, fügt warmen Touch hinzu */}
        <filter id="avatarGouache">
          <feColorMatrix type="matrix" values="
            0.85 0.15 0.0  0 0
            0.05 0.92 0.05 0 0
            0.05 0.05 0.78 0 0
            0    0    0    1 0
          " />
        </filter>

        {/* Painted-Wash: weicher Aquarellfarbverlauf */}
        <radialGradient id="washSky" cx="50%" cy="35%" r="65%">
          <stop offset="0%"  stopColor={PALETTE.sageLight} stopOpacity="0.4" />
          <stop offset="55%" stopColor={PALETTE.inkSoft}    stopOpacity="0.35" />
          <stop offset="100%" stopColor={PALETTE.inkDeep}   stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="washSage" cx="50%" cy="50%" r="65%">
          <stop offset="0%"  stopColor={PALETTE.sageLight} stopOpacity="0.4" />
          <stop offset="100%" stopColor={PALETTE.sage}      stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="washWarm" cx="50%" cy="50%" r="65%">
          <stop offset="0%"  stopColor="#FFF6E0"            stopOpacity="0.6" />
          <stop offset="100%" stopColor={PALETTE.terracotta} stopOpacity="0.25" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ── Reusable: Painted Card mit Papierfaser ──────────────────────────────────
function PaperCard({
  children, style, washColor = PALETTE.cream, padding = 28, edge = true,
}: {
  children: React.ReactNode; style?: React.CSSProperties;
  washColor?: string; padding?: number; edge?: boolean;
}) {
  return (
    <div style={{
      position: 'relative',
      background: washColor,
      padding,
      borderRadius: 14,
      boxShadow: '0 14px 40px rgba(31,58,95,0.12), 0 2px 6px rgba(31,58,95,0.06)',
      ...style,
    }}>
      {/* Paper-Grain-Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 14,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0 0.74  0 0 0 0.16 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
        opacity: 0.55,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }} />
      {edge && (
        <div style={{
          position: 'absolute', inset: 0,
          border: `1.5px solid ${PALETTE.charcoal}22`,
          borderRadius: 14,
          pointerEvents: 'none',
          filter: 'url(#watercolorEdge)',
        }} />
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// ── Painted SVG Illustrations ──────────────────────────────────────────────

// Mini Heißluftballon im Watercolor-Look
function PaintedBalloon({
  color = PALETTE.terracotta, size = 80, hover = true,
}: { color?: string; size?: number; hover?: boolean }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 80 104" style={{
      animation: hover ? 'gFloat 5s ease-in-out infinite' : 'none',
    }}>
      <defs>
        <radialGradient id={`bln-${color}`} cx="40%" cy="35%" r="60%">
          <stop offset="0%"  stopColor="#FFF6E0" stopOpacity="0.5" />
          <stop offset="60%" stopColor={color}    stopOpacity="0.95" />
          <stop offset="100%" stopColor={color}   stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <g filter="url(#watercolorEdge)">
        {/* Body */}
        <ellipse cx="40" cy="40" rx="28" ry="32" fill={`url(#bln-${color})`} />
        {/* Stripes */}
        <path d="M40 8 Q34 40 40 72" stroke={PALETTE.cream} strokeWidth="1.2" strokeOpacity="0.6" fill="none" />
        <path d="M40 8 Q46 40 40 72" stroke={PALETTE.cream} strokeWidth="1.2" strokeOpacity="0.6" fill="none" />
        {/* Highlight */}
        <ellipse cx="32" cy="28" rx="6" ry="9" fill="#FFF6E0" opacity="0.45" />
      </g>
      {/* Ropes */}
      <line x1="28" y1="68" x2="32" y2="84" stroke={PALETTE.charcoal} strokeWidth="0.8" opacity="0.6" />
      <line x1="52" y1="68" x2="48" y2="84" stroke={PALETTE.charcoal} strokeWidth="0.8" opacity="0.6" />
      {/* Basket */}
      <rect x="30" y="84" width="20" height="12" rx="2" fill="#A06A30" filter="url(#watercolorEdge)" />
      <line x1="30" y1="88" x2="50" y2="88" stroke={PALETTE.charcoal} strokeWidth="0.6" opacity="0.4" />
      <line x1="30" y1="92" x2="50" y2="92" stroke={PALETTE.charcoal} strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

// Mond-Sichel
function PaintedMoon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFF6E0" />
          <stop offset="100%" stopColor={PALETTE.ochre} stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="14" fill="url(#moonGlow)" filter="url(#watercolorEdge)" />
      <circle cx="24" cy="18" r="12" fill={PALETTE.inkDeep} />
    </svg>
  );
}

// Berge / Hügel-Silhouette für Hintergrund
function PaintedHills({ width = 600, height = 120 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.sage} stopOpacity="0.55" />
          <stop offset="100%" stopColor={PALETTE.inkSoft} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <path
        d={`M0 ${height} L0 ${height * 0.55} Q ${width * 0.15} ${height * 0.4} ${width * 0.3} ${height * 0.55} T ${width * 0.55} ${height * 0.45} T ${width * 0.85} ${height * 0.5} L ${width} ${height * 0.55} L ${width} ${height} Z`}
        fill="url(#hill1)"
        filter="url(#watercolorEdge)"
      />
      <path
        d={`M0 ${height} L0 ${height * 0.7} Q ${width * 0.2} ${height * 0.6} ${width * 0.4} ${height * 0.72} T ${width * 0.7} ${height * 0.65} T ${width} ${height * 0.7} L ${width} ${height} Z`}
        fill={PALETTE.inkDeep}
        opacity="0.55"
        filter="url(#watercolorEdge)"
      />
    </svg>
  );
}

// Stern-Akzent
function PaintedStars({ count = 18 }: { count?: number }) {
  const stars = Array.from({ length: count }).map((_, i) => {
    const x = ((i * 137) % 100);
    const y = ((i * 71)  % 100);
    const s = 1 + (i % 3) * 0.6;
    const op = 0.4 + (i % 4) * 0.15;
    return { x, y, s, op };
  });
  return (
    <>
      {stars.map((st, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${st.x}%`, top: `${st.y}%`,
          width: st.s * 3, height: st.s * 3,
          borderRadius: '50%',
          background: PALETTE.cream,
          opacity: st.op,
          filter: 'blur(0.3px)',
          animation: `gTwinkle ${3 + i * 0.4}s ease-in-out ${i * 0.2}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

// Skifferner Vogel
function PaintedBird({ x, y, size = 18 }: { x: string; y: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 30 18" style={{
      position: 'absolute', left: x, top: y, opacity: 0.7,
    }}>
      <path d="M2 12 Q8 4 15 9 Q22 4 28 12" stroke={PALETTE.cream} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ── Sections ────────────────────────────────────────────────────────────────

function HeaderSection() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
      <div style={{
        fontFamily: F_BODY, fontSize: 13, letterSpacing: '0.18em',
        color: PALETTE.terracotta, fontWeight: 600,
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        Design-Studie · Aquarell &amp; Gouache
      </div>
      <h1 style={{
        fontFamily: F_HAND, fontSize: 'clamp(48px, 7vw, 92px)',
        color: PALETTE.inkDeep, margin: 0, fontWeight: 700, lineHeight: 1.05,
        letterSpacing: '-0.01em',
      }}>
        Wie sähe CozyQuiz<br/>im Bilderbuch-Stil aus?
      </h1>
      <div style={{
        fontFamily: F_BODY, fontSize: 17, color: PALETTE.charcoal,
        marginTop: 22, maxWidth: 720, margin: '22px auto 0', lineHeight: 1.6,
        fontStyle: 'italic',
      }}>
        Eine Stilstudie zur poetisch-malerischen Variante: gedämpfte Farben,
        Papier-Textur, Aquarell-Wäschen, handgeschriebene Typografie. Die
        bestehenden Avatare zeigen wir hier mit CSS-Filter angedeutet — für
        die echte App müssten sie neu illustriert werden (AI-Image-to-Image
        oder Custom-Art).
      </div>
    </div>
  );
}

function PaletteSection() {
  const swatches: Array<{ name: string; hex: string; role: string }> = [
    { name: 'Tinte tief',   hex: PALETTE.inkDeep,    role: 'Nachthimmel · Textfarbe' },
    { name: 'Tinte sanft',  hex: PALETTE.inkSoft,    role: 'Mittlere Schatten' },
    { name: 'Salbei',       hex: PALETTE.sage,       role: 'Hügel · Beruhigung' },
    { name: 'Salbei hell',  hex: PALETTE.sageLight,  role: 'Wash · Akzent' },
    { name: 'Cremeweiß',    hex: PALETTE.cream,      role: 'Papier · Cards' },
    { name: 'Terracotta',   hex: PALETTE.terracotta, role: 'CTA · Akzent warm' },
    { name: 'Ocker',        hex: PALETTE.ochre,      role: 'Mond · Sterne' },
    { name: 'Holzkohle',    hex: PALETTE.charcoal,   role: 'Pinselkonturen' },
  ];
  return (
    <PaperCard washColor={PALETTE.paper} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="01" title="Farb­palette" sub="Gedämpfte Erdtöne, harmonisch komponiert" />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 20, marginTop: 24,
      }}>
        {swatches.map(sw => (
          <div key={sw.hex} style={{ textAlign: 'center' }}>
            <div style={{
              width: 86, height: 86, margin: '0 auto', borderRadius: '50%',
              background: sw.hex,
              boxShadow: '0 8px 18px rgba(31,58,95,0.18), inset 0 -8px 14px rgba(0,0,0,0.1)',
              filter: 'url(#paintFrame)',
            }} />
            <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep, marginTop: 10 }}>
              {sw.name}
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.charcoal, opacity: 0.7, marginTop: 2 }}>
              {sw.hex}
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft, marginTop: 4, fontStyle: 'italic' }}>
              {sw.role}
            </div>
          </div>
        ))}
      </div>
    </PaperCard>
  );
}

function TypographySection() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="02" title="Typografie" sub="Handgeschrieben + warmer Serif" />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 28,
      }}>
        <div>
          <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.terracotta, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Heading · Caveat
          </div>
          <div style={{ fontFamily: F_HAND, fontSize: 64, color: PALETTE.inkDeep, lineHeight: 1, fontWeight: 700 }}>
            Wie viele Sterne?
          </div>
          <div style={{ fontFamily: F_HAND, fontSize: 36, color: PALETTE.sage, marginTop: 14 }}>
            Schätzt mit dem Herzen.
          </div>
        </div>
        <div>
          <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.terracotta, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Body · Lora
          </div>
          <div style={{ fontFamily: F_BODY, fontSize: 18, color: PALETTE.charcoal, lineHeight: 1.65 }}>
            Antworten sind oft nur ein leiser Anfang. Manchmal liegt der
            schönste Moment des Quiz darin, gemeinsam zu staunen — über das,
            was nahe und das, was fern ist.
          </div>
          <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 12, fontStyle: 'italic' }}>
            Caveat 700 · 64px Heading<br/>
            Lora 400 · 18px Body · 1.65 line-height
          </div>
        </div>
      </div>
    </PaperCard>
  );
}

function SectionLabel({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div>
      <div style={{
        fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.2em',
        color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
      }}>
        Sektion {n}
      </div>
      <div style={{
        fontFamily: F_HAND, fontSize: 44, color: PALETTE.inkDeep,
        marginTop: 4, lineHeight: 1, fontWeight: 700,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: F_BODY, fontSize: 15, color: PALETTE.inkSoft,
        marginTop: 6, fontStyle: 'italic',
      }}>
        {sub}
      </div>
    </div>
  );
}

// ── Mockup: Beamer Welcome ──────────────────────────────────────────────────
function BeamerWelcomeMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="03" title="Beamer · Welcome" sub="Atmosphärischer Einstieg" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `linear-gradient(180deg, ${PALETTE.inkDeep} 0%, ${PALETTE.inkSoft} 60%, ${PALETTE.sage} 100%)`,
      }}>
        {/* Sterne */}
        <PaintedStars count={28} />
        {/* Mond */}
        <div style={{ position: 'absolute', top: 32, right: 60 }}>
          <PaintedMoon size={64} />
        </div>
        {/* Vögel */}
        <PaintedBird x="22%" y="18%" size={28} />
        <PaintedBird x="64%" y="24%" size={22} />
        {/* Hügel-Silhouette unten */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <svg width="100%" height="180" viewBox="0 0 1200 180" preserveAspectRatio="none">
            <path d="M0 180 L0 90 Q200 50 400 95 T800 80 T1200 100 L1200 180 Z"
                  fill={PALETTE.sage} opacity="0.7" filter="url(#watercolorEdge)" />
            <path d="M0 180 L0 130 Q300 110 600 140 T1200 130 L1200 180 Z"
                  fill={PALETTE.inkDeep} opacity="0.6" filter="url(#watercolorEdge)" />
          </svg>
        </div>
        {/* Heißluftballons */}
        <div style={{ position: 'absolute', left: '14%', top: '32%', animation: 'gFloat 6s ease-in-out infinite' }}>
          <PaintedBalloon color={PALETTE.terracotta} size={68} hover={false} />
        </div>
        <div style={{ position: 'absolute', right: '20%', top: '46%', animation: 'gFloat 7s ease-in-out 1s infinite' }}>
          <PaintedBalloon color={PALETTE.ochre} size={56} hover={false} />
        </div>
        <div style={{ position: 'absolute', left: '42%', top: '54%', animation: 'gFloat 5.5s ease-in-out 2s infinite' }}>
          <PaintedBalloon color={PALETTE.sageLight} size={44} hover={false} />
        </div>
        {/* Title */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 40px', zIndex: 5,
        }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 14, letterSpacing: '0.32em',
            color: PALETTE.cream, opacity: 0.82,
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            Ein Quiz-Abend
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(48px, 6vw, 100px)',
            color: PALETTE.cream, lineHeight: 1, fontWeight: 700,
            textShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            CozyQuiz
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(22px, 2.4vw, 38px)',
            color: PALETTE.sageLight, marginTop: 14,
            fontStyle: 'italic', opacity: 0.92,
          }}>
            Beim Schein der Laternen
          </div>
          {/* Painted CTA */}
          <div style={{
            marginTop: 36,
            background: PALETTE.terracotta, color: PALETTE.cream,
            fontFamily: F_HAND, fontSize: 30, fontWeight: 700,
            padding: '12px 44px', borderRadius: 999,
            boxShadow: '0 8px 22px rgba(224,122,95,0.4), inset 0 -3px 0 rgba(0,0,0,0.12)',
            filter: 'url(#paintFrame)',
            letterSpacing: '0.02em',
          }}>
            Spiel beginnen
          </div>
        </div>
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 14, fontStyle: 'italic', textAlign: 'center' }}>
        Aquarell-Verlauf · gemalte Hügel · schwebende Heißluftballons in Teamfarbe · handgeschriebener Titel
      </div>
    </PaperCard>
  );
}

// ── Mockup: Beamer Question (Schätzchen) ───────────────────────────────────
function BeamerQuestionMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="04" title="Beamer · Frage" sub="Klare Bühne, malerischer Rahmen" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `radial-gradient(ellipse at 50% 30%, ${PALETTE.cream} 0%, ${PALETTE.paper} 100%)`,
      }}>
        {/* Paper grain */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.08 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
          mixBlendMode: 'multiply',
        }} />
        {/* Header bar */}
        <div style={{
          position: 'absolute', top: 24, left: 32, right: 32,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.22em',
            color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
          }}>
            🎯 Schätzchen · Frage 3 von 5
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 32, color: PALETTE.inkDeep,
          }}>
            00:24
          </div>
        </div>
        {/* Question */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(36px, 4.4vw, 70px)',
            color: PALETTE.inkDeep, textAlign: 'center', lineHeight: 1.1,
            fontWeight: 700, maxWidth: 900,
          }}>
            Wie schnell kann<br/>
            ein Gepard maximal<br/>
            laufen?
          </div>
          <div style={{
            fontFamily: F_BODY, fontSize: 18, color: PALETTE.inkSoft,
            marginTop: 18, fontStyle: 'italic',
          }}>
            in Kilometern pro Stunde
          </div>
          {/* Answer-Avatare-Reihe (Antwort-Status) */}
          <div style={{
            marginTop: 48, display: 'flex', gap: 14, alignItems: 'center',
            background: `${PALETTE.cream}c0`,
            padding: '14px 24px', borderRadius: 999,
            border: `1.5px dashed ${PALETTE.sage}`,
          }}>
            <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.sage, fontWeight: 600 }}>
              5 von 8 haben geschätzt
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {QQ_AVATARS.slice(0, 8).map((a, i) => (
                <PaintedAvatarMini key={a.id} slug={a.slug} answered={i < 5} />
              ))}
            </div>
          </div>
        </div>
        {/* Decorative birds */}
        <PaintedBird x="8%" y="16%" size={20} />
        <PaintedBird x="88%" y="22%" size={26} />
      </div>
    </PaperCard>
  );
}

function PaintedAvatarMini({ slug, answered }: { slug: string; answered: boolean }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: PALETTE.cream,
      border: `2px solid ${answered ? PALETTE.terracotta : PALETTE.inkSoft + '55'}`,
      filter: answered ? 'url(#avatarGouache)' : 'url(#avatarGouache) grayscale(0.4) opacity(0.55)',
      backgroundImage: `url(/avatars/cozy-cast/avatar-${slug}.png)`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      boxShadow: answered ? `0 4px 8px ${PALETTE.terracotta}55` : 'none',
    }} />
  );
}

// ── Mockup: Beamer Reveal (Schätzchen) ─────────────────────────────────────
function BeamerRevealMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="05" title="Beamer · Auflösung" sub="Lösung oben · Sieger unten · Aquarell-Wash" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `linear-gradient(180deg, ${PALETTE.inkSoft} 0%, ${PALETTE.sage} 60%, ${PALETTE.sageLight} 100%)`,
      }}>
        <PaintedStars count={14} />
        <div style={{ position: 'absolute', inset: 0, padding: '40px 60px', display: 'flex', gap: 32 }}>
          {/* Linke Spalte: Lösung + Sieger */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Lösung */}
            <div style={{
              flex: 1,
              background: `${PALETTE.cream}f0`,
              borderRadius: 18,
              padding: '22px 28px',
              boxShadow: '0 12px 28px rgba(31,58,95,0.25)',
              filter: 'url(#paintFrame)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.22em', color: PALETTE.sage, fontWeight: 700, textTransform: 'uppercase' }}>
                Lösung
              </div>
              <div style={{ fontFamily: F_HAND, fontSize: 'clamp(80px, 11vw, 180px)', color: PALETTE.inkDeep, lineHeight: 1, fontWeight: 700 }}>
                112
              </div>
              <div style={{ fontFamily: F_BODY, fontSize: 16, color: PALETTE.inkSoft, fontStyle: 'italic' }}>
                km/h
              </div>
            </div>
            {/* Sieger */}
            <div style={{
              flex: 1,
              background: `${PALETTE.terracotta}26`,
              border: `2.5px solid ${PALETTE.terracotta}`,
              borderRadius: 18,
              padding: '22px 28px',
              filter: 'url(#paintFrame)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8,
            }}>
              <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.terracotta }}>
                Am nächsten dran
              </div>
              <div style={{ fontFamily: F_HAND, fontSize: 'clamp(60px, 9vw, 140px)', color: PALETTE.terracotta, lineHeight: 1, fontWeight: 700 }}>
                111
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <PaintedAvatarMini slug="waschbaer" answered={true} />
                <span style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep }}>Robin</span>
                <span style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.terracotta, padding: '3px 10px', borderRadius: 999, background: `${PALETTE.terracotta}22`, fontWeight: 700 }}>
                  Δ 1 · in Range
                </span>
              </div>
            </div>
          </div>
          {/* Rechte Spalte: Top-5 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            {[
              { rank: 1, name: 'Till',   slug: 'shiba',     val: 112, delta: 0, hit: true },
              { rank: 2, name: 'Robin',  slug: 'waschbaer', val: 111, delta: 1, hit: true },
              { rank: 3, name: 'Harald', slug: 'koala',     val: 110, delta: 2, hit: false },
              { rank: 4, name: 'Maria',  slug: 'pinguin',   val: 114, delta: 2, hit: false },
              { rank: 5, name: 'Sonja',  slug: 'giraffe',   val: 117, delta: 5, hit: false },
            ].map(r => (
              <div key={r.rank} style={{
                display: 'grid', gridTemplateColumns: 'auto auto 1fr auto',
                alignItems: 'center', gap: 14,
                padding: '8px 16px', borderRadius: 12,
                background: `${PALETTE.cream}c0`,
                border: r.hit ? `2px solid ${PALETTE.terracotta}` : `1px solid ${PALETTE.inkSoft}33`,
              }}>
                <div style={{
                  fontFamily: F_HAND, fontSize: 30, color: r.rank === 1 ? PALETTE.terracotta : PALETTE.inkDeep,
                  fontWeight: 700, minWidth: 36, textAlign: 'center',
                }}>#{r.rank}</div>
                <PaintedAvatarMini slug={r.slug} answered={true} />
                <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep }}>{r.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep }}>{r.val}</div>
                  <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft }}>Δ {r.delta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PaperCard>
  );
}

// ── Mockup: Grid + Score ──────────────────────────────────────────────────
function GridMockup() {
  // 5x5 Demo-Grid mit gemischten Teams + Joker-Stern + Pagoden-Markierung
  const grid: Array<Array<{ owner: string | null; joker?: boolean; stack?: boolean }>> = [
    [{ owner: 'fox' }, { owner: null }, { owner: 'frog' }, { owner: 'frog' }, { owner: null }],
    [{ owner: 'fox' }, { owner: 'cat' }, { owner: null }, { owner: 'frog', stack: true }, { owner: 'panda' }],
    [{ owner: null }, { owner: 'cat' }, { owner: 'unicorn', joker: true }, { owner: 'unicorn' }, { owner: 'panda' }],
    [{ owner: 'cow' }, { owner: null }, { owner: 'unicorn' }, { owner: null }, { owner: 'rabbit' }],
    [{ owner: 'cow' }, { owner: 'cow' }, { owner: null }, { owner: 'rabbit' }, { owner: 'rabbit' }],
  ];
  const colorOf = (id: string | null) => {
    if (!id) return PALETTE.cream;
    const a = QQ_AVATARS.find(x => x.id === id);
    return a?.color ?? PALETTE.cream;
  };
  const slugOf = (id: string | null) => {
    if (!id) return null;
    const a = QQ_AVATARS.find(x => x.id === id);
    return a?.slug ?? null;
  };

  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="06" title="Spielfeld · 5×5" sub="Bemalte Aquarell-Felder mit Tier-Symbolen" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        background: `linear-gradient(180deg, ${PALETTE.inkSoft} 0%, ${PALETTE.sage} 100%)`,
        padding: '40px 60px',
        display: 'flex', gap: 40, alignItems: 'center',
      }}>
        {/* Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10, padding: 14,
          background: `${PALETTE.paper}c0`,
          borderRadius: 14,
          filter: 'url(#paintFrame)',
          boxShadow: '0 14px 38px rgba(31,58,95,0.3)',
          flex: '0 0 auto',
        }}>
          {grid.flatMap((row, r) => row.map((cell, c) => {
            const color = colorOf(cell.owner);
            const slug = slugOf(cell.owner);
            const tilt = ((r * 7 + c * 13) % 7 - 3) * 0.6;
            return (
              <div key={`${r}-${c}`} style={{
                width: 78, height: 78, borderRadius: 10,
                background: cell.owner
                  ? `radial-gradient(circle at 30% 30%, ${color}cc, ${color}99 60%, ${color}66 100%)`
                  : `${PALETTE.cream}aa`,
                border: cell.owner ? `1.5px solid ${color}` : `1.5px dashed ${PALETTE.inkSoft}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                transform: `rotate(${tilt}deg)`,
                boxShadow: cell.owner ? `0 4px 12px ${color}55, inset 0 -3px 6px rgba(0,0,0,0.1)` : 'none',
              }}>
                {slug && (
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    backgroundImage: `url(/avatars/cozy-cast/avatar-${slug}.png)`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'url(#avatarGouache)',
                  }} />
                )}
                {cell.joker && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 22, height: 22, borderRadius: '50%',
                    background: PALETTE.ochre,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: PALETTE.cream,
                    boxShadow: `0 0 12px ${PALETTE.ochre}99`,
                  }}>★</div>
                )}
                {cell.stack && (
                  <div style={{
                    position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                    fontFamily: F_HAND, fontSize: 14, color: PALETTE.cream,
                    background: PALETTE.charcoal, padding: '0 6px', borderRadius: 4,
                  }}>×2</div>
                )}
              </div>
            );
          }))}
        </div>
        {/* Score */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: F_HAND, fontSize: 36, color: PALETTE.cream, marginBottom: 6 }}>
            Stand
          </div>
          {[
            { rank: 1, name: 'Sonja',   slug: 'giraffe',   pts: 8, max: true },
            { rank: 2, name: 'Robin',   slug: 'waschbaer', pts: 7 },
            { rank: 3, name: 'Harald',  slug: 'koala',     pts: 7 },
            { rank: 4, name: 'Maria',   slug: 'pinguin',   pts: 5 },
          ].map(t => (
            <div key={t.rank} style={{
              display: 'grid', gridTemplateColumns: 'auto auto 1fr auto',
              alignItems: 'center', gap: 12, padding: '8px 14px', borderRadius: 12,
              background: t.max ? `${PALETTE.terracotta}33` : `${PALETTE.cream}c0`,
              border: t.max ? `2px solid ${PALETTE.terracotta}` : 'none',
              filter: 'url(#watercolorEdge)',
            }}>
              <div style={{ fontFamily: F_HAND, fontSize: 26, color: t.max ? PALETTE.terracotta : PALETTE.inkDeep, fontWeight: 700, minWidth: 30 }}>
                {t.max ? '🏆' : `#${t.rank}`}
              </div>
              <PaintedAvatarMini slug={t.slug} answered={true} />
              <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep }}>{t.name}</div>
              <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep, fontWeight: 700 }}>
                {t.pts}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 14, fontStyle: 'italic', textAlign: 'center' }}>
        Felder leicht verdreht (rotation ±3°) für hand-gelegtes Look · Joker = goldener Stern · Stapel = handgeschriebenes ×2
      </div>
    </PaperCard>
  );
}

// ── Mockup: Team-Seite (Phone) ─────────────────────────────────────────────
function TeamPageMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="07" title="Team · Handy" sub="Sanfte Cards, organische Buttons" />
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
        {/* Phone 1: Frage-Screen */}
        <PhoneFrame title="Frage 3 / 10">
          <div style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.18em', color: PALETTE.terracotta, textTransform: 'uppercase', fontWeight: 700 }}>
              🅰️ Mucho · 4 Optionen
            </div>
            <div style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep, lineHeight: 1.15, fontWeight: 700 }}>
              Welcher Planet ist der Sonne am nächsten?
            </div>
            {['Merkur', 'Venus', 'Mars', 'Jupiter'].map((opt, i) => (
              <div key={opt} style={{
                padding: '12px 18px', borderRadius: 14,
                background: i === 0 ? `${PALETTE.sage}44` : `${PALETTE.cream}`,
                border: i === 0 ? `2px solid ${PALETTE.sage}` : `1.5px solid ${PALETTE.inkSoft}33`,
                fontFamily: F_BODY, fontSize: 16, color: PALETTE.inkDeep,
                display: 'flex', alignItems: 'center', gap: 12,
                filter: 'url(#watercolorEdge)',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${i === 0 ? PALETTE.sage : PALETTE.inkSoft}55`,
                  background: i === 0 ? PALETTE.sage : 'transparent',
                  flexShrink: 0,
                }} />
                {opt}
              </div>
            ))}
          </div>
        </PhoneFrame>

        {/* Phone 2: Feedback */}
        <PhoneFrame title="Richtig!">
          <div style={{
            padding: '40px 22px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 18,
            background: `radial-gradient(circle at 50% 35%, ${PALETTE.sageLight}66 0%, transparent 60%)`,
            minHeight: '100%',
          }}>
            <div style={{
              width: 78, height: 78, borderRadius: '50%',
              background: PALETTE.cream, border: `3px solid ${PALETTE.sage}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, color: PALETTE.sage,
              filter: 'url(#paintFrame)',
            }}>✓</div>
            <div style={{ fontFamily: F_HAND, fontSize: 56, color: PALETTE.sage, lineHeight: 1, fontWeight: 700 }}>
              Richtig!
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 15, color: PALETTE.inkSoft, fontStyle: 'italic', textAlign: 'center' }}>
              Sehr gut, weiter so.
            </div>
            <div style={{ flex: 1 }} />
            <div style={{
              background: PALETTE.terracotta, color: PALETTE.cream,
              fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
              padding: '10px 36px', borderRadius: 999,
              filter: 'url(#paintFrame)',
              boxShadow: `0 6px 16px ${PALETTE.terracotta}66`,
            }}>
              Weiter
            </div>
          </div>
        </PhoneFrame>

        {/* Phone 3: Ergebnis */}
        <PhoneFrame title="Spielende">
          <div style={{
            padding: '36px 22px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14, minHeight: '100%',
            background: `linear-gradient(180deg, ${PALETTE.cream} 0%, ${PALETTE.paper} 100%)`,
          }}>
            <div style={{ fontFamily: F_HAND, fontSize: 50, color: PALETTE.inkDeep, lineHeight: 1, fontWeight: 700, textAlign: 'center' }}>
              Du hast<br/>7 von 10
            </div>
            <div style={{
              width: '60%', height: 2, background: PALETTE.terracotta,
              filter: 'url(#watercolorEdge)', marginTop: -4,
            }} />
            <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, fontStyle: 'italic', marginTop: 4 }}>
              Gar nicht schlecht.
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              backgroundImage: `url(/avatars/cozy-cast/avatar-pinguin.png)`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'url(#avatarGouache)',
              border: `3px solid ${PALETTE.terracotta}`,
              marginTop: 14,
            }} />
            <div style={{ flex: 1 }} />
            <div style={{
              background: PALETTE.terracotta, color: PALETTE.cream,
              fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
              padding: '10px 36px', borderRadius: 999, marginBottom: 10,
              boxShadow: `0 6px 16px ${PALETTE.terracotta}66`,
            }}>
              Nochmal spielen
            </div>
            <div style={{
              border: `1.5px solid ${PALETTE.inkDeep}`,
              color: PALETTE.inkDeep,
              fontFamily: F_HAND, fontSize: 20,
              padding: '8px 30px', borderRadius: 999,
            }}>
              Zur Startseite
            </div>
          </div>
        </PhoneFrame>
      </div>
    </PaperCard>
  );
}

function PhoneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: 280, height: 540,
      background: PALETTE.cream,
      border: `8px solid ${PALETTE.charcoal}`,
      borderRadius: 38,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 18px 44px rgba(31,58,95,0.25)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: PALETTE.cream,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px dashed ${PALETTE.inkSoft}33`,
      }}>
        <div style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700 }}>{title}</div>
        <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft }}>CozyQuiz</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

// ── Mockup: Spielende (Beamer) ─────────────────────────────────────────────
function GameOverMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="08" title="Beamer · Spielende" sub="Stiller Triumph, kein Konfetti-Feuerwerk" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `linear-gradient(180deg, ${PALETTE.inkDeep} 0%, ${PALETTE.inkSoft} 50%, ${PALETTE.sage} 100%)`,
      }}>
        <PaintedStars count={32} />
        <div style={{ position: 'absolute', top: 28, right: 60 }}>
          <PaintedMoon size={70} />
        </div>
        {/* Hügel unten */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <PaintedHills width={1200} height={140} />
        </div>
        {/* Hauptinhalt */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 13, letterSpacing: '0.32em',
            color: PALETTE.cream, opacity: 0.78,
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            Spielende · Sieger­team
          </div>
          <div style={{
            width: 132, height: 132, borderRadius: '50%',
            backgroundImage: `url(/avatars/cozy-cast/avatar-giraffe.png)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'url(#avatarGouache)',
            border: `4px solid ${PALETTE.cream}`,
            boxShadow: `0 0 0 8px ${PALETTE.terracotta}, 0 16px 36px rgba(0,0,0,0.4)`,
          }} />
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(56px, 7vw, 110px)',
            color: PALETTE.cream, lineHeight: 1, fontWeight: 700, marginTop: 22,
            textShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            Sonja
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(22px, 2.6vw, 38px)',
            color: PALETTE.sageLight, marginTop: 6,
            fontStyle: 'italic',
          }}>
            8 verbundene Felder
          </div>
          {/* Mini-Ranking-Strip */}
          <div style={{
            marginTop: 36, display: 'flex', gap: 14, alignItems: 'center',
            background: `${PALETTE.cream}d0`,
            padding: '12px 24px', borderRadius: 999,
            filter: 'url(#paintFrame)',
          }}>
            {[
              { name: 'Anna',   slug: 'faultier',  pts: 7, medal: '🥈' },
              { name: 'Jule',   slug: 'capybara',  pts: 7, medal: '🥉' },
              { name: 'Harald', slug: 'koala',     pts: 7, medal: '#4' },
              { name: 'Robin',  slug: 'waschbaer', pts: 6, medal: '#5' },
            ].map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep }}>{t.medal}</span>
                <PaintedAvatarMini slug={t.slug} answered={true} />
                <span style={{ fontFamily: F_HAND, fontSize: 20, color: PALETTE.inkDeep }}>{t.name}</span>
                <span style={{ fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkSoft }}>· {t.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PaperCard>
  );
}

// ── Mockup: Avatar-Stilstudie ──────────────────────────────────────────────
function AvatarStudyMockup() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="09" title="Avatare · Stilstudie" sub="CSS-Filter-Andeutung — echte Version: AI-Image-to-Image oder Custom-Art" />
      <div style={{
        marginTop: 28,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 20,
      }}>
        {QQ_AVATARS.map(a => (
          <div key={a.id} style={{ textAlign: 'center' }}>
            {/* Painted Frame mit Avatar drin */}
            <div style={{
              position: 'relative',
              width: 140, height: 140,
              margin: '0 auto',
            }}>
              <div style={{
                position: 'absolute', inset: -8,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${a.color}44 0%, transparent 70%)`,
                filter: 'url(#paintFrame)',
              }} />
              <div style={{
                width: 140, height: 140, borderRadius: '50%',
                background: PALETTE.cream,
                border: `4px solid ${a.color}`,
                filter: 'url(#paintFrame)',
                boxShadow: `0 12px 24px ${a.color}33`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(/avatars/cozy-cast/avatar-${a.slug}.png)`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  filter: 'url(#avatarGouache) brightness(1.02)',
                }} />
                {/* Paper grain over avatar */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.18 0'/></filter><rect width='100' height='100' filter='url(%23n)'/></svg>")`,
                  mixBlendMode: 'multiply',
                  opacity: 0.5,
                }} />
              </div>
            </div>
            <div style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep, marginTop: 10, fontWeight: 700 }}>
              {a.label}
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft, fontStyle: 'italic', marginTop: 2 }}>
              Teamfarbe {a.color}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 32, padding: '16px 20px', borderRadius: 12,
        background: `${PALETTE.terracotta}1a`,
        border: `1.5px dashed ${PALETTE.terracotta}`,
        fontFamily: F_BODY, fontSize: 14, color: PALETTE.charcoal, lineHeight: 1.6,
      }}>
        <strong style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.terracotta, fontWeight: 700, display: 'block', marginBottom: 4 }}>
          Hinweis zur echten Umsetzung
        </strong>
        Diese Avatare sind die bestehenden cozy-cast PNGs mit CSS-Color-Matrix-Filter
        (gedämpfte Saturation + warmer Sepia) und einem hand-gemalten Frame —
        nur eine <em>Andeutung</em> des Aquarell-Looks. Für das echte Quiz im Bilderbuch-Stil
        müssten die 8 Avatare neu illustriert werden:
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li><strong>Schnell &amp; günstig:</strong> Midjourney/DALL-E mit Image-to-Image-Modus, Prompt
            wie „watercolor children's book illustration of a fox in a hoodie, soft warm palette, paper texture"</li>
          <li><strong>Hochwertig:</strong> Custom-Art von einer Illustrator:in im Stil deines Beispiel-Screenshots</li>
        </ul>
      </div>
    </PaperCard>
  );
}

// ── Verdict-Section ────────────────────────────────────────────────────────
function VerdictSection() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="10" title="Ehrliches Verdict" sub="Was geht, was wird haarig, was sollte hybrid bleiben" />
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <VerdictCard
          icon="✓"
          color={PALETTE.sage}
          title="Sofort machbar"
          items={[
            'Komplette Farbpalette + Tokens',
            'Paper-Grain via SVG-Filter',
            'Caveat / Lora als Fonts',
            'Wobble-Borders auf Cards',
            'Aquarell-Wash-Backgrounds',
            'Soft-Pill-Buttons',
            'Hand-gemalte Hügel/Mond/Vögel als SVG',
          ]}
        />
        <VerdictCard
          icon="!"
          color={PALETTE.ochre}
          title="Braucht Custom-Art"
          items={[
            '8 Avatare neu illustrieren',
            'Hero-Illustrationen pro Game-Phase (Lobby, Reveal, Spielende)',
            'Kategorie-Header-Illustrationen',
            'Gemalte Hot-Air-Balloon-Asset (statt Three.js)',
            'Wenn DIY: Midjourney/DALL-E in 2-3h erledigt',
          ]}
        />
        <VerdictCard
          icon="✕"
          color={PALETTE.terracotta}
          title="Hybrid behalten"
          items={[
            '3D-Grid (Three.js → scharf, nicht malerisch) — bleibt 3D oder wird 2D-illustriertes Grid',
            'Slam-Down + Comeback-Animations — Energie schlägt Aquarell',
            'Moderator-Page mit Buttons-Density — bleibt funktional',
            'Score-Bar Live-Updates — bleiben punchy',
          ]}
        />
      </div>
    </PaperCard>
  );
}

function VerdictCard({ icon, color, title, items }: { icon: string; color: string; title: string; items: string[] }) {
  return (
    <div style={{
      padding: 20, borderRadius: 14,
      background: `${color}12`,
      border: `2px solid ${color}66`,
      filter: 'url(#watercolorEdge)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: color, color: PALETTE.cream,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, fontFamily: F_BODY,
        }}>{icon}</div>
        <div style={{ fontFamily: F_HAND, fontSize: 28, color, fontWeight: 700 }}>{title}</div>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, fontFamily: F_BODY, fontSize: 14, color: PALETTE.charcoal, lineHeight: 1.65 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function QQGouachePage() {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    // Google Fonts: Caveat (handwritten) + Lora (serif body)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap';
    document.head.appendChild(link);
    link.onload = () => setFontsReady(true);
    setTimeout(() => setFontsReady(true), 1500);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: PALETTE.paper,
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0 0.65  0 0 0 0.18 0'/></filter><rect width='400' height='400' filter='url(%23n)'/></svg>")`,
      padding: '48px 28px 80px',
      fontFamily: F_BODY,
      opacity: fontsReady ? 1 : 0.95,
      transition: 'opacity 0.4s ease',
    }}>
      {/* Inline Animation Keyframes */}
      <style>{`
        @keyframes gFloat {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes gTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 0.95; transform: scale(1.1); }
        }
      `}</style>

      <GouacheFilters />

      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <HeaderSection />
        <PaletteSection />
        <TypographySection />
        <BeamerWelcomeMockup />
        <BeamerQuestionMockup />
        <BeamerRevealMockup />
        <GridMockup />
        <TeamPageMockup />
        <GameOverMockup />
        <AvatarStudyMockup />
        <VerdictSection />

        {/* Footer Note */}
        <div style={{
          textAlign: 'center', marginTop: 40,
          fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep,
        }}>
          <span style={{ fontStyle: 'italic' }}>— gemalt mit Code —</span>
        </div>
      </div>
    </div>
  );
}
