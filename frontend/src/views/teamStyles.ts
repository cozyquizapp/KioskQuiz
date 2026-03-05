import { CSSProperties } from 'react';
import { theme } from '../theme';
// Removed getDraftTheme (missing file)

/**
 * MOBILE OPTIMIZATIONS:
 * - iOS Safari notch handling (safe-area-inset)
 * - Android & iOS: Hardware-accelerated rendering
 * - Touch target min-56px for accessibility
 * - Landscape mode optimization
 * - Prevent zoom on input focus
 * - Fallback for older browsers (dvh → vh)
 */

export const pageStyleTeam: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  // @ts-ignore - dvh not in CSSProperties yet
  height: '100dvh', // Modern browsers with dynamic viewport
  minHeight: '100vh', // Fallback for older browsers
  paddingTop: 'calc(clamp(12px, 3vw, 20px) + env(safe-area-inset-top))',
  paddingRight: 'clamp(10px, 3vw, 16px)',
  paddingBottom: 'calc(clamp(12px, 2vw, 16px) + env(safe-area-inset-bottom))',
  paddingLeft: 'clamp(10px, 3vw, 16px)',
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
  boxSizing: 'border-box',
  backgroundColor: '#0d1117',
  backgroundImage: 'linear-gradient(180deg, rgba(177, 10, 108, 0.08) 0%, transparent 28%)',
  backgroundAttachment: 'fixed',
  fontFamily: 'var(--font)',
  color: 'var(--text)',
  WebkitFontSmoothing: 'antialiased',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  fontSize: 16
};

export const gridOverlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  opacity: 0,
  pointerEvents: 'none'
};

export const contentShell: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 'min(760px, calc(100vw - 24px))',
  margin: '0 auto',
  display: 'grid',
  gap: 'clamp(8px, 2vw, 12px)',
  zIndex: 2,
  pointerEvents: 'auto'
};

export const footerLogo: CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 'calc(32px + env(safe-area-inset-bottom))',
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
  zIndex: 0,
  opacity: 0.2
};

export const hourglassStyle: CSSProperties = {
  fontSize: 'clamp(20px, 6vw, 28px)',
  marginTop: 6,
  opacity: 0.8,
  animation: 'hourglass-wiggle 1.6s ease-in-out infinite'
};

export const headerBarTeam: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 'clamp(8px, 2vw, 12px)',
  borderRadius: 24,
  background: 'var(--ui-panel-bg)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255, 255, 255, 0.1)'
};

export const pillSmall: CSSProperties = {
  padding: 'clamp(10px, 2vw, 12px) clamp(14px, 3vw, 16px)',
  borderRadius: 999,
  background: 'var(--ui-chip-bg)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  fontSize: 'clamp(14px, 3vw, 16px)',
  fontWeight: 700,
  color: 'var(--ui-chip-text)'
};

export const logoBadge: CSSProperties = {
  padding: 'clamp(8px, 1.5vw, 10px) clamp(10px, 2vw, 12px)',
  borderRadius: 16,
  background: 'var(--ui-chip-bg)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: 'var(--text)',
  fontWeight: 900,
  letterSpacing: '0.04em',
  fontSize: 'clamp(12px, 2vw, 14px)'
};

export const heroCard: CSSProperties = {
  padding: 'clamp(12px, 4vw, 18px)',
  borderRadius: 24,
  background: 'var(--ui-card-bg)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: 'var(--ui-card-shadow)'
};

export const heroIcon: CSSProperties = {
  width: 'clamp(32px, 8vw, 42px)',
  height: 'clamp(32px, 8vw, 42px)',
  objectFit: 'contain'
};

export const eyebrow: CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  fontSize: 'clamp(10px, 2vw, 11px)',
  color: 'var(--muted)',
  margin: 0,
  marginBottom: 2
};

export const metaRow: CSSProperties = {
  display: 'flex',
  gap: 'clamp(6px, 2vw, 8px)',
  flexWrap: 'wrap',
  marginTop: 10
};

export const metaChip: CSSProperties = {
  ...pillSmall,
  background: 'var(--ui-chip-bg)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  textTransform: 'capitalize'
};

export const glassCard: CSSProperties = {
  background: 'rgba(11, 22, 42, 0.85)',
  backdropFilter: 'blur(20px)',
  padding: 'clamp(20px, 6vw, 28px) clamp(16px, 5vw, 24px)',
  borderRadius: 24,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  width: '100%',
  maxWidth: 'clamp(320px, 90vw, 760px)',
  margin: '0 auto',
  boxShadow: '0 26px 60px rgba(0, 0, 0, 0.58)',
  position: 'relative',
  overflow: 'hidden'
};

export const pillLabel: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'clamp(5px, 1.5vw, 8px)',
  padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 14px)',
  borderRadius: 999,
  background: 'var(--ui-chip-bg)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--team-color, rgba(255,255,255,0.1))',
  fontSize: 'clamp(15px, 3.5vw, 17px)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--ui-chip-text)',
  marginBottom: 8
};

export const heading: CSSProperties = {
  marginTop: 4,
  marginBottom: 4,
  fontFamily: "'Nunito', var(--font)",
  fontSize: 'clamp(26px, 7vw, 36px)',
  lineHeight: 1.1,
  letterSpacing: '0.03em',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#ffd1e8',
  background: 'none',
  WebkitTextFillColor: '#ffd1e8',
};

export const mutedText: CSSProperties = {
  color: '#c49ab5',
  marginTop: 0,
  marginBottom: 12,
  fontSize: 'clamp(16px, 4vw, 18px)',
  lineHeight: 1.5
};

export const softDivider: CSSProperties = {
  height: 1,
  width: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
  margin: '10px 0'
};

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: 'clamp(14px, 3.5vw, 18px) clamp(16px, 4vw, 20px)',
  minHeight: 'clamp(54px, 14vw, 64px)',
  borderRadius: 16,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--team-color, rgba(255,255,255,0.1))',
  background: 'var(--ui-input-bg)',
  color: 'var(--ui-input-text)',
  marginTop: 10,
  fontSize: 'max(16px, clamp(18px, 4vw, 20px))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  WebkitAppearance: 'none',
  WebkitBorderRadius: 10,
  WebkitBoxSizing: 'border-box',
  WebkitFontSmoothing: 'antialiased',
  transform: 'translateZ(0)'
};

export const primaryButton: CSSProperties = {
  marginTop: 16,
  background: 'var(--ui-button-primary)',
  color: '#ffffff',
  border: '2px solid transparent',
  padding: 'clamp(16px, 4vw, 20px) clamp(20px, 5vw, 28px)',
  minHeight: 'clamp(56px, 14vw, 68px)',
  borderRadius: 16,
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  fontFamily: "'Nunito', var(--font)",
  fontWeight: 700,
  fontSize: 'max(18px, clamp(20px, 5vw, 24px))',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  boxShadow: '0 4px 0 rgba(128, 8, 77, 0.95), 0 10px 24px rgba(0,0,0,0.38)',
  transition: 'transform var(--transition-soft), box-shadow var(--transition-soft)',
  WebkitFontSmoothing: 'antialiased',
  transform: 'translateZ(0)',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation'
};

export const choiceButton: CSSProperties = {
  flex: 1,
  background: 'var(--ui-card-bg)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  color: 'var(--text)',
  borderRadius: 16,
  padding: 'clamp(18px, 4.5vw, 22px) clamp(14px, 4vw, 18px)',
  cursor: 'pointer',
  fontFamily: "'Nunito', var(--font)",
  fontWeight: 700,
  fontSize: 'max(17px, clamp(18px, 4.2vw, 22px))',
  letterSpacing: '0.04em',
  minHeight: 'clamp(64px, 16vw, 80px)',
  boxShadow: '0 3px 0 rgba(0,0,0,0.45)',
  WebkitFontSmoothing: 'antialiased',
  WebkitTapHighlightColor: 'transparent',
  transition: 'all 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
  transform: 'translateZ(0)',
  touchAction: 'manipulation',
  textAlign: 'left',
};

export const progressOuter = (color: string): CSSProperties => ({
  marginTop: 10,
  width: '100%',
  height: 'clamp(8px, 2vw, 12px)',
  borderRadius: 999,
  background: 'rgba(15, 30, 57, 0.85)',
  overflow: 'hidden',
  position: 'relative',
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 16px ${color}25`
});

export const progressInner = (color: string): CSSProperties => ({
  height: '100%',
  background: `linear-gradient(90deg, ${color} 0%, ${color}88 100%)`,
  borderRadius: 999,
  transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  boxShadow: `0 0 18px ${color}55`
});

export const progressKnob = (color: string): CSSProperties => ({
  position: 'absolute',
  top: '50%',
  width: 'clamp(16px, 4vw, 20px)',
  height: 'clamp(16px, 4vw, 20px)',
  borderRadius: '50%',
  transform: 'translate(-50%, -50%)',
  transition: 'left 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  pointerEvents: 'none',
  background: 'linear-gradient(135deg, #1b457d, #0c1d38)',
  boxShadow: `0 0 0 3px ${color}55, 0 10px 18px rgba(0,0,0,0.5)`
});

export const questionShell: CSSProperties = {
  position: 'relative',
  padding: 'clamp(8px, 3vw, 14px) clamp(16px, 4vw, 24px) clamp(12px, 3vw, 16px)',
  margin: '0 auto',
  borderRadius: 24,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'var(--ui-card-bg)',
  overflow: 'visible',
  width: '100%',
  maxWidth: 720,
  boxShadow: 'var(--ui-card-shadow)',
  transition: 'transform var(--transition-soft)'
};

export const gradientHalo: CSSProperties = {
  position: 'absolute',
  inset: -6,
  zIndex: 0,
  opacity: 0,
  filter: 'blur(18px)',
  pointerEvents: 'none'
};

export const questionHeader: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
  gap: 10
};

export const categoryChip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 999,
  background: 'var(--ui-chip-bg)',
  color: 'var(--ui-chip-text)',
  border: '1px solid var(--ui-chip-border)',
  fontWeight: 800
};

export const chipIcon: CSSProperties = {
  width: 28,
  height: 28,
  objectFit: 'contain'
};

export const connectionPill = (status: 'connecting' | 'connected' | 'disconnected'): CSSProperties => {
  const map = {
    connected: { bg: '#22c55e' },
    connecting: { bg: '#f59e0b' },
    disconnected: { bg: '#ef4444' }
  } as const;
  const palette = map[status];
  return {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: palette.bg,
    display: 'inline-block'
  };
};

export const timerPill: CSSProperties = {
  ...categoryChip,
  background: 'var(--ui-chip-bg)',
  color: 'var(--text)',
  letterSpacing: '0.05em'
};

export const questionStyleTeam: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  margin: '8px 0 12px',
  fontSize: 'clamp(20px, 5vw, 26px)',
  fontWeight: 700,
  color: 'var(--text)',
  lineHeight: 1.4
};
