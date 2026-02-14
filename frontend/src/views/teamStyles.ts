import { CSSProperties } from 'react';
import { theme } from '../theme';
// Removed getDraftTheme (missing file)
const primary = '#6dd5fa';

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
  overflowY: 'hidden',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
  boxSizing: 'border-box',
  color: 'white',
  background: 'var(--bg)',
  backgroundSize: '200% 200%',
  animation: draftTheme?.background ? 'none' : 'ambient-shift 30s ease-in-out infinite',
  backgroundAttachment: 'fixed',
  fontFamily: draftTheme?.font ? `${draftTheme.font}, var(--font)` : 'var(--font)',
  // iOS optimization
  WebkitFontSmoothing: 'antialiased',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  // Prevent zoom on input focus (iOS)
  fontSize: 16
};

export const gridOverlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
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
  gap: 'clamp(16px, 4vw, 20px)',
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
  opacity: 0.32
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
  borderRadius: 16,
  background: 'rgba(255,255,255,0.001)',
  backdropFilter: 'blur(40px) saturate(200%) brightness(1.15)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: primary ? `${primary}55` : 'rgba(255,255,255,0.08)'
  // padding removed to rely on .team-header CSS for responsive header height
};

export const pillSmall: CSSProperties = {
  padding: 'clamp(10px, 2vw, 12px) clamp(14px, 3vw, 16px)',
  borderRadius: 999,
  background: primary ? `${primary}11` : 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: primary ? `${primary}55` : 'rgba(255,255,255,0.08)',
  fontSize: 'clamp(14px, 3vw, 16px)',
  fontWeight: 700,
  color: '#e2e8f0'
};

export const logoBadge: CSSProperties = {
  padding: 'clamp(8px, 1.5vw, 10px) clamp(10px, 2vw, 12px)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  color: '#0d0f14',
  fontWeight: 900,
  letterSpacing: '0.04em',
  fontSize: 'clamp(12px, 2vw, 14px)'
};

export const heroCard: CSSProperties = {
  padding: 'clamp(12px, 4vw, 18px)',
  borderRadius: 20,
  background: 'var(--glass-bg)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: 'var(--glass-shadow)',
  backdropFilter: 'blur(14px)'
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
  color: 'rgba(255,255,255,0.66)',
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
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  textTransform: 'capitalize'
};

export const glassCard: CSSProperties = {
  background: 'rgba(255,255,255,0.001)',
  padding: 'clamp(18px, 5vw, 24px) clamp(18px, 5vw, 22px)',
  borderRadius: theme.radius,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.06)',
  width: '100%',
  maxWidth: 'clamp(320px, 90vw, 760px)',
  margin: '0 auto',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
  backdropFilter: 'blur(50px)',
  position: 'relative',
  overflow: 'hidden'
};

export const pillLabel: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'clamp(5px, 1.5vw, 8px)',
  padding: 'clamp(9px, 2vw, 10px) clamp(12px, 3vw, 14px)',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.01)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.06)',
  fontSize: 'clamp(14px, 3vw, 15px)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 800,
  marginBottom: 8
};

export const heading: CSSProperties = {
  marginTop: 4,
  marginBottom: 4,
  fontSize: 'clamp(22px, 6vw, 28px)',
  lineHeight: 1.4
};

export const mutedText: CSSProperties = {
  color: 'var(--muted)',
  marginTop: 0,
  marginBottom: 12,
  fontSize: 'clamp(16px, 3.5vw, 18px)',
  lineHeight: 1.5
};

export const softDivider: CSSProperties = {
  height: 1,
  width: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
  margin: '10px 0'
};

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: 'clamp(18px, 4.5vw, 20px) clamp(18px, 4.5vw, 20px)',
  minHeight: 'clamp(56px, 14vw, 68px)',
  borderRadius: theme.radius,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.02)',
  color: '#f8fafc',
  marginTop: 10,
  fontSize: 'max(16px, clamp(18px, 4vw, 21px))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  backdropFilter: 'blur(30px)',
  WebkitAppearance: 'none',
  WebkitBorderRadius: theme.radius,
  WebkitBoxSizing: 'border-box',
  // iOS optimization: Prevents zoom on input focus
  WebkitFontSmoothing: 'antialiased',
  // Hardware acceleration for smooth typing (applied via CSS)
  transform: 'translateZ(0)'
};

export const primaryButton: CSSProperties = {
  marginTop: 14,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
  backdropFilter: 'blur(30px) saturate(200%) brightness(1.15)',
  color: '#f8fafc',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: 'clamp(18px, 4.5vw, 20px) clamp(20px, 5.5vw, 24px)',
  minHeight: 'clamp(56px, 14vw, 68px)',
  borderRadius: theme.radius,
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  fontWeight: 800,
  fontSize: 'max(16px, clamp(18px, 4.2vw, 21px))',
  transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
  WebkitFontSmoothing: 'antialiased',
  // Hardware acceleration for smooth tap feedback
  transform: 'translateZ(0)',
  WebkitTapHighlightColor: 'transparent',
  // Touch optimization for both platforms
  touchAction: 'manipulation'
};

export const choiceButton: CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#e2e8f0',
  borderRadius: theme.radius,
  padding: 'clamp(18px, 4.5vw, 20px) clamp(16px, 4.5vw, 18px)',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 'max(16px, clamp(17px, 3.8vw, 20px))',
  minHeight: 'clamp(56px, 14vw, 68px)',
  WebkitFontSmoothing: 'antialiased',
  WebkitTapHighlightColor: 'transparent',
  // Faster transition for immediate touch feedback
  transition: 'all 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
  // Hardware acceleration
  transform: 'translateZ(0)',
  // Touch optimization for both platforms
  touchAction: 'manipulation'
};

export const progressOuter = (color: string): CSSProperties => ({
  marginTop: 10,
  width: '100%',
  height: 'clamp(8px, 2vw, 12px)',
  borderRadius: 999,
  background: 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1))',
  overflow: 'hidden',
  position: 'relative',
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px ${color}25`
});

export const progressInner = (color: string): CSSProperties => ({
  height: '100%',
  background: `linear-gradient(90deg, ${color} 0%, #cbd5e1 100%)`,
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
  background: 'linear-gradient(135deg, #fff, #cbd5e1)',
  boxShadow: `0 0 0 3px ${color}55, 0 10px 18px rgba(0,0,0,0.3)`
});

export const questionShell: CSSProperties = {
  position: 'relative',
  padding: 'clamp(14px, 4vw, 20px) clamp(14px, 4vw, 20px) clamp(16px, 4vw, 22px)',
  margin: '0 auto',
  borderRadius: 22,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.12)',
  background: 'rgba(12,14,20,0.9)',
  overflow: 'hidden',
  boxShadow: '0 14px 30px rgba(0,0,0,0.38)',
  backdropFilter: 'blur(14px)',
  width: '100%',
  maxWidth: 720,
  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
};

export const gradientHalo: CSSProperties = {
  position: 'absolute',
  inset: -6,
  zIndex: 0,
  opacity: 0.9,
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
  background: 'rgba(255,255,255,0.02)',
  backdropFilter: 'blur(20px)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.06)',
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
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  letterSpacing: '0.05em'
};

export const questionStyleTeam: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  margin: '8px 0 12px',
  fontSize: 22,
  lineHeight: 1.4
};
