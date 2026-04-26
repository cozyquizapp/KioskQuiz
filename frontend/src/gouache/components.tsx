// Wieder­verwendbare Gouache-Components fuer die parallele Aquarell-Welt.
//
// Jede Component ist self-contained — importiert nur Tokens. Filter müssen
// einmal pro Page durch <GouacheFilters/> gemountet sein, sonst greifen
// die filter-Properties nicht.

import { CSSProperties } from 'react';
import { PALETTE, F_HAND, F_BODY, SHADOWS, RADIUS, PAPER_GRAIN_BG } from './tokens';
import { useGouacheAvatar } from './useGouacheAvatar';

// ─────────────────────────────────────────────────────────────────────────
// PaperCard — Cremepapier-Card mit Grain-Overlay + optionaler Wobble-Edge
// ─────────────────────────────────────────────────────────────────────────
export function PaperCard({
  children, style, washColor = PALETTE.cream, padding = 28, edge = true,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
  washColor?: string;
  padding?: number | string;
  edge?: boolean;
}) {
  return (
    <div style={{
      position: 'relative',
      background: washColor,
      padding,
      borderRadius: RADIUS.card,
      boxShadow: SHADOWS.card,
      ...style,
    }}>
      {/* Grain-Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: RADIUS.card,
        backgroundImage: PAPER_GRAIN_BG,
        opacity: 0.55,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }} />
      {edge && (
        <div style={{
          position: 'absolute', inset: 0,
          border: `1.5px solid ${PALETTE.charcoal}22`,
          borderRadius: RADIUS.card,
          pointerEvents: 'none',
          filter: 'url(#watercolorEdge)',
        }} />
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PaintedButton — Terracotta-Pill (primary) oder Outline (secondary)
// ─────────────────────────────────────────────────────────────────────────
export function PaintedButton({
  children, onClick, variant = 'primary', size = 'md', style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}) {
  const sizes = {
    sm: { fs: 18, py: 6,  px: 22 },
    md: { fs: 24, py: 10, px: 36 },
    lg: { fs: 30, py: 12, px: 44 },
  } as const;
  const s = sizes[size];
  const isPrimary = variant === 'primary';
  return (
    <button onClick={onClick} style={{
      background: isPrimary ? PALETTE.terracotta : 'transparent',
      color: isPrimary ? PALETTE.cream : PALETTE.inkDeep,
      border: isPrimary ? 'none' : `1.8px solid ${PALETTE.inkDeep}`,
      fontFamily: F_HAND,
      fontSize: s.fs,
      fontWeight: 700,
      padding: `${s.py}px ${s.px}px`,
      borderRadius: RADIUS.pill,
      cursor: 'pointer',
      letterSpacing: '0.02em',
      boxShadow: isPrimary ? SHADOWS.button : 'none',
      filter: isPrimary ? 'url(#paintFrame)' : undefined,
      ...style,
    }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SectionLabel — Sektionsüberschrift (Studie/Demo-Pages)
// ─────────────────────────────────────────────────────────────────────────
export function SectionLabel({
  n, title, sub,
}: { n: string; title: string; sub: string }) {
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

// ─────────────────────────────────────────────────────────────────────────
// PaintedAvatar — Avatar-PNG (Gouache wenn vorhanden, sonst cozy-cast)
// mit Aquarell-Filter + farbigem Frame.
// Wenn `applyGouacheFilter` false: zeigt das Bild ohne Sepia/Color-Matrix
// (sinnvoll wenn die echten Gouache-PNGs schon im Aquarell-Stil gemalt
// sind — die kommen unbearbeitet raus).
// ─────────────────────────────────────────────────────────────────────────
export function PaintedAvatar({
  slug, size = 80, color = PALETTE.terracotta, dimmed = false, withGrain = true,
  applyGouacheFilter,
}: {
  slug: string;
  size?: number;
  color?: string;
  dimmed?: boolean;
  withGrain?: boolean;
  /** Default: Filter NUR auf cozy-cast (nicht auf echte Gouache-PNGs). */
  applyGouacheFilter?: boolean;
}) {
  const { src, isGouache } = useGouacheAvatar(slug);
  const useFilter = applyGouacheFilter ?? !isGouache;
  const filterChain = `${useFilter ? 'url(#avatarGouache)' : ''}${dimmed ? ' grayscale(0.45) opacity(0.55)' : ''}`.trim();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: PALETTE.cream,
      border: `${Math.max(2, size * 0.04)}px solid ${color}`,
      filter: 'url(#paintFrame)',
      boxShadow: dimmed ? 'none' : `0 ${size * 0.08}px ${size * 0.18}px ${color}33`,
      position: 'relative', overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: filterChain || undefined,
      }} />
      {withGrain && !isGouache && (
        // Grain-Overlay nur fuer cozy-cast — die echten Gouache-PNGs haben
        // schon eigene Papier-Textur eingemalt und brauchen keinen Multiply-
        // Layer obendrauf (würde sie sonst muddy machen).
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: PAPER_GRAIN_BG,
          mixBlendMode: 'multiply',
          opacity: 0.5,
        }} />
      )}
    </div>
  );
}

// Mini-Variante (Antwort-Tracking, Score-Listen)
export function PaintedAvatarMini({
  slug, answered, size = 36,
}: { slug: string; answered: boolean; size?: number }) {
  const { src, isGouache } = useGouacheAvatar(slug);
  const dim = !answered;
  const baseFilter = isGouache ? '' : 'url(#avatarGouache)';
  const filterChain = `${baseFilter}${dim ? ' grayscale(0.4) opacity(0.55)' : ''}`.trim();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: PALETTE.cream,
      border: `2px solid ${answered ? PALETTE.terracotta : PALETTE.inkSoft + '55'}`,
      filter: filterChain || undefined,
      backgroundImage: `url(${src})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      boxShadow: answered ? `0 4px 8px ${PALETTE.terracotta}55` : 'none',
      flexShrink: 0,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PaintedBalloon — Heißluftballon im Aquarell-Look
// ─────────────────────────────────────────────────────────────────────────
export function PaintedBalloon({
  color = PALETTE.terracotta, size = 80, hover = true,
}: { color?: string; size?: number; hover?: boolean }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 80 104" style={{
      animation: hover ? 'gFloat 5s ease-in-out infinite' : 'none',
    }}>
      <defs>
        <radialGradient id={`bln-${color.replace('#', '')}`} cx="40%" cy="35%" r="60%">
          <stop offset="0%"  stopColor="#FFF6E0" stopOpacity="0.5" />
          <stop offset="60%" stopColor={color}    stopOpacity="0.95" />
          <stop offset="100%" stopColor={color}   stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <g filter="url(#watercolorEdge)">
        <ellipse cx="40" cy="40" rx="28" ry="32" fill={`url(#bln-${color.replace('#', '')})`} />
        <path d="M40 8 Q34 40 40 72" stroke={PALETTE.cream} strokeWidth="1.2" strokeOpacity="0.6" fill="none" />
        <path d="M40 8 Q46 40 40 72" stroke={PALETTE.cream} strokeWidth="1.2" strokeOpacity="0.6" fill="none" />
        <ellipse cx="32" cy="28" rx="6" ry="9" fill="#FFF6E0" opacity="0.45" />
      </g>
      <line x1="28" y1="68" x2="32" y2="84" stroke={PALETTE.charcoal} strokeWidth="0.8" opacity="0.6" />
      <line x1="52" y1="68" x2="48" y2="84" stroke={PALETTE.charcoal} strokeWidth="0.8" opacity="0.6" />
      <rect x="30" y="84" width="20" height="12" rx="2" fill="#A06A30" filter="url(#watercolorEdge)" />
      <line x1="30" y1="88" x2="50" y2="88" stroke={PALETTE.charcoal} strokeWidth="0.6" opacity="0.4" />
      <line x1="30" y1="92" x2="50" y2="92" stroke={PALETTE.charcoal} strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PaintedMoon — Sichelmond mit warmem Glow
// ─────────────────────────────────────────────────────────────────────────
export function PaintedMoon({ size = 40 }: { size?: number }) {
  const glowId = `moonGlow-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFF6E0" />
          <stop offset="100%" stopColor={PALETTE.ochre} stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="14" fill={`url(#${glowId})`} filter="url(#watercolorEdge)" />
      <circle cx="24" cy="18" r="12" fill={PALETTE.inkDeep} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PaintedHills — Hügel-Silhouette als Decoration unter Hero-Sections
// ─────────────────────────────────────────────────────────────────────────
export function PaintedHills({
  width = 600, height = 120,
}: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`hill-${width}-${height}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.sage} stopOpacity="0.55" />
          <stop offset="100%" stopColor={PALETTE.inkSoft} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <path
        d={`M0 ${height} L0 ${height * 0.55} Q ${width * 0.15} ${height * 0.4} ${width * 0.3} ${height * 0.55} T ${width * 0.55} ${height * 0.45} T ${width * 0.85} ${height * 0.5} L ${width} ${height * 0.55} L ${width} ${height} Z`}
        fill={`url(#hill-${width}-${height})`}
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

// ─────────────────────────────────────────────────────────────────────────
// PaintedStars — animierte Twinkle-Sterne als Container-Overlay
// ─────────────────────────────────────────────────────────────────────────
export function PaintedStars({ count = 18 }: { count?: number }) {
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

// ─────────────────────────────────────────────────────────────────────────
// PaintedBird — fliegender Vogel als Decoration
// ─────────────────────────────────────────────────────────────────────────
export function PaintedBird({
  x, y, size = 18,
}: { x: string; y: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 30 18" style={{
      position: 'absolute', left: x, top: y, opacity: 0.7, pointerEvents: 'none',
    }}>
      <path d="M2 12 Q8 4 15 9 Q22 4 28 12" stroke={PALETTE.cream} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PaintedKeyframes — global gemounted, damit gFloat/gTwinkle funktionieren
// ─────────────────────────────────────────────────────────────────────────
export function PaintedKeyframes() {
  return (
    <style>{`
      @keyframes gFloat {
        0%, 100% { transform: translateY(0) rotate(-1deg); }
        50% { transform: translateY(-10px) rotate(1deg); }
      }
      @keyframes gTwinkle {
        0%, 100% { opacity: 0.3; transform: scale(0.85); }
        50% { opacity: 0.95; transform: scale(1.1); }
      }
      @keyframes gFadeIn {
        0% { opacity: 0; transform: translateY(8px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}
