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
  borderColor: 'rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text)'
};

const pillPalette: Record<Tone, CSSProperties> = {
  neutral: { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'var(--text)' },
  accent: { background: 'rgba(251,191,36,0.16)', borderColor: 'rgba(251,191,36,0.55)', color: '#fbbf24' },
  muted: { background: 'rgba(148,163,184,0.16)', borderColor: 'rgba(148,163,184,0.4)', color: '#cbd5e1' },
  success: { background: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.5)', color: '#22c55e' },
  danger: { background: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }
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
  border: '1px solid rgba(0,0,0,0.12)',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 16,
  color: '#0d0f14',
  background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
  boxShadow: 'var(--shadow-soft)'
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
    style={{
      ...primaryBase,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }}
  >
    {children}
  </button>
);
