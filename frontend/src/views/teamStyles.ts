import { CSSProperties } from 'react';
import { theme } from '../theme';
import { getDraftTheme } from '../utils/draft';

const draftTheme = getDraftTheme();
const primary = draftTheme?.color || '#6dd5fa';

export const pageStyleTeam: CSSProperties = {
  position: 'relative',
  height: '100dvh',
  minHeight: '100dvh',
  maxHeight: '100dvh',
  paddingTop: 'calc(clamp(12px, 4vw, 24px) + env(safe-area-inset-top))',
  paddingRight: 'clamp(8px, 3vw, 14px)',
  paddingBottom: 'calc(clamp(24px, 6vw, 32px) + env(safe-area-inset-bottom))',
  paddingLeft: 'clamp(8px, 3vw, 14px)',
  overflowY: 'hidden',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
  color: 'white',
  background: draftTheme?.background
    ? `url(${draftTheme.background}) center/cover` // drop fixed for mobile jank
    : 'url("/background.png") center/cover',
  backgroundAttachment:
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'scroll' : 'fixed',
  fontFamily: draftTheme?.font ? `${draftTheme.font}, ${theme.fontFamily}` : theme.fontFamily
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
  maxWidth: 'min(760px, calc(100vw - 16px))',
  margin: '0 auto',
  display: 'grid',
  gap: 'clamp(8px, 2vw, 14px)',
  zIndex: 2
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
  gap: 'clamp(6px, 2vw, 8px)',
  padding: 'clamp(8px, 2vw, 12px) clamp(10px, 3vw, 16px)',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.001)',
  backdropFilter: 'blur(40px) saturate(200%) brightness(1.15)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: primary ? `${primary}55` : 'rgba(255,255,255,0.08)'
};

export const pillSmall: CSSProperties = {
  padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 12px)',
  borderRadius: 999,
  background: primary ? `${primary}11` : 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: primary ? `${primary}55` : 'rgba(255,255,255,0.08)',
  fontSize: 'clamp(11px, 2vw, 12px)',
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
  padding: 'clamp(12px, 4vw, 18px) clamp(12px, 4vw, 16px)',
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
  gap: 'clamp(4px, 1vw, 6px)',
  padding: 'clamp(5px, 1vw, 6px) clamp(8px, 2vw, 10px)',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.01)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.06)',
  fontSize: 'clamp(10px, 2vw, 11px)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 800,
  marginBottom: 8
};

export const heading: CSSProperties = {
  marginTop: 4,
  marginBottom: 4,
  fontSize: 'clamp(18px, 5vw, 22px)',
  lineHeight: 1.3
};

export const mutedText: CSSProperties = {
  color: 'var(--muted)',
  marginTop: 0,
  marginBottom: 12,
  fontSize: 'clamp(13px, 2.5vw, 15px)'
};

export const softDivider: CSSProperties = {
  height: 1,
  width: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
  margin: '10px 0'
};

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: 'clamp(10px, 2.5vw, 13px) clamp(10px, 2.5vw, 12px)',
  minHeight: 'clamp(40px, 10vw, 48px)',
  borderRadius: theme.radius,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.02)',
  color: '#f8fafc',
  marginTop: 8,
  fontSize: 'clamp(14px, 2.5vw, 16px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  backdropFilter: 'blur(30px)'
};

export const primaryButton: CSSProperties = {
  marginTop: 10,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
  backdropFilter: 'blur(30px) saturate(200%) brightness(1.15)',
  color: '#f8fafc',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: 'clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 16px)',
  minHeight: 'clamp(40px, 10vw, 48px)',
  borderRadius: theme.radius,
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  fontWeight: 800,
  fontSize: 'clamp(14px, 2.5vw, 16px)',
  transition: 'transform 0.14s ease, box-shadow 0.14s ease'
};

export const choiceButton: CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#e2e8f0',
  borderRadius: theme.radius,
  padding: 'clamp(10px, 2vw, 14px) clamp(10px, 2vw, 12px)',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 'clamp(13px, 2.5vw, 15px)',
  minHeight: 'clamp(44px, 10vw, 52px)'
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
  transition: 'width 0.18s ease',
  boxShadow: `0 0 18px ${color}55`
});

export const progressKnob = (color: string): CSSProperties => ({
  position: 'absolute',
  top: '50%',
  width: 'clamp(16px, 4vw, 20px)',
  height: 'clamp(16px, 4vw, 20px)',
  borderRadius: '50%',
  transform: 'translate(-50%, -50%)',
  transition: 'left 0.18s ease',
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
  transition: 'transform 0.25s ease, box-shadow 0.25s ease'
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
