import { ButtonHTMLAttributes, CSSProperties, PropsWithChildren } from 'react';

type Tone = 'neutral' | 'accent' | 'muted' | 'success' | 'danger';

const pillBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 999,
  fontWeight: 700,
  letterSpacing: '0.02em',
  fontSize: 12,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.01)',
  backdropFilter: 'blur(20px)',
  color: 'var(--text)',
  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
};

const pillPalette: Record<Tone, CSSProperties> = {
  neutral: { background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)', color: 'var(--text)' },
  accent: { background: 'rgba(251,191,36,0.05)', borderColor: 'rgba(251,191,36,0.2)', color: '#fde68a' },
  muted: { background: 'rgba(148,163,184,0.05)', borderColor: 'rgba(148,163,184,0.15)', color: '#cbd5e1' },
  success: { background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)', color: '#86efac' },
  danger: { background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#fca5a5' }
};

export const Pill = ({ children, tone = 'neutral', style }: PropsWithChildren<{ tone?: Tone; style?: CSSProperties }>) => (
  <span style={{ ...pillBase, ...pillPalette[tone], ...style }}>{children}</span>
);

const primaryBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  minHeight: 48,
  padding: '12px 16px',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 16,
  color: '#f8fafc',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
  backdropFilter: 'blur(30px) saturate(200%) brightness(1.15)',
  boxShadow: 'none',
  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
  animation: 'liquid-shimmer 6s ease-in-out infinite'
};

export const PrimaryButton = ({
  children,
  style,
  disabled,
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
  <button
    {...rest}
    disabled={disabled}
    className="primary-button"
    style={{
      ...primaryBase,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px) scale(1.02)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.2)';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }
    }}
  >
    {children}
  </button>
);
