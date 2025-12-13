import { CSSProperties } from 'react';
import { theme } from '../theme';
import { getDraftTheme } from '../utils/draft';

const draftTheme = getDraftTheme();
const primary = draftTheme?.color || '#6dd5fa';

export const pageStyleTeam: CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  padding: '24px 14px 32px',
  overflow: 'hidden',
  color: 'white',
  background: draftTheme?.background
    ? `url(${draftTheme.background}) center/cover fixed`
    : 'var(--bg) url("/background.png") center/cover fixed',
  fontFamily: draftTheme?.font ? `${draftTheme.font}, ${theme.fontFamily}` : theme.fontFamily
};

export const gridOverlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  opacity: 0.35,
  pointerEvents: 'none'
};

export const contentShell: CSSProperties = {
  position: 'relative',
  maxWidth: 760,
  margin: '0 auto',
  display: 'grid',
  gap: 14,
  zIndex: 1
};

export const footerLogo: CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 32,
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
  zIndex: 3,
  opacity: 0.32
};

export const hourglassStyle: CSSProperties = {
  fontSize: 28,
  marginTop: 6,
  opacity: 0.8,
  animation: 'hourglass-wiggle 1.6s ease-in-out infinite'
};

export const headerBarTeam: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
  padding: '12px 16px',
  borderRadius: 16,
  background: 'rgba(16,20,31,0.7)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: primary ? `${primary}55` : 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)'
};

export const pillSmall: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  background: primary ? `${primary}11` : 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: primary ? `${primary}55` : 'rgba(255,255,255,0.08)',
  fontSize: 12,
  fontWeight: 700,
  color: '#e2e8f0'
};

export const logoBadge: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  background: primary
    ? `linear-gradient(135deg, ${primary}, ${primary}cc)`
    : 'linear-gradient(135deg, #6dd5fa, #c471ed)',
  color: '#0d0f14',
  fontWeight: 900,
  letterSpacing: '0.04em',
  boxShadow: '0 14px 28px rgba(0,0,0,0.35)'
};

export const heroCard: CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: 'var(--glass-bg)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: 'var(--glass-shadow)',
  backdropFilter: 'blur(14px)'
};

export const heroIcon: CSSProperties = {
  width: 42,
  height: 42,
  objectFit: 'contain',
  filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.25))'
};

export const eyebrow: CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  fontSize: 11,
  color: 'rgba(255,255,255,0.66)',
  margin: 0,
  marginBottom: 2
};

export const metaRow: CSSProperties = {
  display: 'flex',
  gap: 8,
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
  background: 'rgba(16,20,31,0.72)',
  padding: '18px 16px',
  borderRadius: theme.radius,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.08)',
  width: '100%',
  maxWidth: 760,
  margin: '0 auto',
  boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(16px)',
  position: 'relative',
  overflow: 'hidden'
};

export const pillLabel: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.12)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 800,
  marginBottom: 8
};

export const heading: CSSProperties = {
  marginTop: 4,
  marginBottom: 4,
  fontSize: 22,
  lineHeight: 1.3
};

export const mutedText: CSSProperties = {
  color: 'var(--muted)',
  marginTop: 0,
  marginBottom: 12
};

export const softDivider: CSSProperties = {
  height: 1,
  width: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
  margin: '10px 0'
};

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 12px',
  minHeight: 48,
  borderRadius: theme.radius,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.18)',
  background: 'rgba(0,0,0,0.28)',
  color: '#f8fafc',
  marginTop: 8,
  fontSize: 16,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)'
};

export const primaryButton: CSSProperties = {
  marginTop: 10,
  background: 'linear-gradient(135deg, #fef3c7, #d8b4fe)',
  color: '#0d0f14',
  border: '1px solid rgba(0,0,0,0.12)',
  padding: '14px 16px',
  minHeight: 48,
  borderRadius: theme.radius,
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  fontWeight: 800,
  fontSize: 16,
  transition: 'transform 0.14s ease, box-shadow 0.14s ease',
  boxShadow: '0 16px 36px rgba(0,0,0,0.35)'
};

export const choiceButton: CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#e2e8f0',
  borderRadius: theme.radius,
  padding: '14px 12px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 15,
  minHeight: 52
};

export const progressOuter = (color: string): CSSProperties => ({
  marginTop: 10,
  width: '100%',
  height: 12,
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
  width: 20,
  height: 20,
  borderRadius: '50%',
  transform: 'translate(-50%, -50%)',
  transition: 'left 0.18s ease',
  pointerEvents: 'none',
  background: 'linear-gradient(135deg, #fff, #cbd5e1)',
  boxShadow: `0 0 0 3px ${color}55, 0 10px 18px rgba(0,0,0,0.3)`
});

export const questionShell: CSSProperties = {
  position: 'relative',
  padding: '20px 20px 22px',
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
  background: 'rgba(0,0,0,0.4)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.14)',
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
