import React, { CSSProperties } from 'react';

interface BilingualLabelProps {
  en: string;
  de: string;
  variant?: 'heading' | 'label' | 'badge' | 'custom';
  primaryColor?: string;
  secondaryColor?: string;
  uppercase?: boolean;
  align?: 'left' | 'center' | 'right';
  gap?: number;
  style?: CSSProperties;
  className?: string;
}

/**
 * BilingualLabel Component
 * Renders bilingual text with primary (EN) large/bold and secondary (DE) small/dimmed
 * 
 * Usage:
 * <BilingualLabel 
 *   en="WELCOME" 
 *   de="Willkommen"
 *   variant="heading"
 * />
 */
const BilingualLabel: React.FC<BilingualLabelProps> = ({
  en,
  de,
  variant = 'label',
  primaryColor = 'var(--color-secondary)', // pink
  secondaryColor = 'rgba(255, 255, 255, 0.6)',
  uppercase = true,
  align = 'center',
  gap = 4,
  style,
  className,
}) => {
  const getVariantStyles = (): { primary: CSSProperties; secondary: CSSProperties } => {
    switch (variant) {
      case 'heading':
        return {
          primary: {
            fontSize: 'clamp(24px, 6vw, 42px)',
            fontWeight: 900,
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          },
          secondary: {
            fontSize: 'clamp(12px, 3vw, 20px)',
            fontWeight: 500,
            letterSpacing: '0.03em',
            lineHeight: 1.2,
          },
        };

      case 'badge':
        return {
          primary: {
            fontSize: 'clamp(11px, 2vw, 14px)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            lineHeight: 1.4,
          },
          secondary: {
            fontSize: 'clamp(8px, 1.5vw, 10px)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            lineHeight: 1.2,
          },
        };

      case 'custom':
        return { primary: {}, secondary: {} };

      case 'label':
      default:
        return {
          primary: {
            fontSize: 'clamp(16px, 4vw, 24px)',
            fontWeight: 700,
            letterSpacing: '0.01em',
            lineHeight: 1.3,
          },
          secondary: {
            fontSize: 'clamp(8px, 2vw, 12px)',
            fontWeight: 500,
            letterSpacing: '0.02em',
            lineHeight: 1.2,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: `${gap}px`,
    textAlign: align,
    ...style,
  };

  const primaryStyle: CSSProperties = {
    color: primaryColor,
    textTransform: uppercase ? 'uppercase' : 'none',
    margin: 0,
    padding: 0,
    fontFamily: 'var(--font-game)',
    ...variantStyles.primary,
  };

  const secondaryStyle: CSSProperties = {
    color: secondaryColor,
    margin: 0,
    padding: 0,
    fontFamily: 'var(--font)',
    ...variantStyles.secondary,
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={primaryStyle}>{en}</div>
      <div style={secondaryStyle}>{de}</div>
    </div>
  );
};

export default BilingualLabel;
