/**
 * Global Design System Constants
 * Single source of truth for spacing, colors, and sizing
 */

export const DESIGN_SYSTEM = {
  // SPACING SCALE (8px base)
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
  } as const,

  // BORDER RADIUS
  radius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    pill: 999,
  } as const,

  // COLORS - Theme Variables (reference system)
  colors: {
    // Brand
    primary: 'var(--color-primary)', // #b10a6c (pink)
    secondary: 'var(--color-secondary)', // #f05fb2 (light pink)
    background: 'var(--color-bg)', // #050505 (black)
    surface: 'var(--color-surface)', // #11315d (dark blue)
    text: 'var(--color-text)', // #ffd1e8 (light pink)
    muted: 'var(--color-muted)', // #c49ab5 (muted pink)

    // Semantic
    success: 'var(--success)', // #22c55e (green)
    danger: 'var(--danger)', // #ef4444 (red)
    warning: '#fbbf24',
    info: '#3b82f6',

    // UI
    cardBg: 'var(--ui-card-bg)',
    cardBorder: 'var(--ui-card-border)',
    chipBg: 'var(--ui-chip-bg)',
    chipText: 'var(--ui-chip-text)',

    // Semantic shades
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
  } as const,

  // SHADOWS
  shadow: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.35)',
    lg: '0 14px 32px rgba(0, 0, 0, 0.35)',
    xl: '0 26px 60px rgba(0, 0, 0, 0.58)',
  } as const,

  // BORDERS
  border: {
    subtle: '1px solid rgba(255, 255, 255, 0.1)',
    light: '1px solid rgba(255, 255, 255, 0.2)',
    medium: '1px solid rgba(240, 95, 178, 0.18)',
    strong: '2px solid rgba(240, 95, 178, 0.28)',
  } as const,

  // BREAKPOINTS (mobile-first)
  breakpoints: {
    xs: 320,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  } as const,

  // Z-INDEX SCALE
  zIndex: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    backdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  } as const,

  // TRANSITIONS/DURATIONS
  transition: {
    fast: '150ms',
    base: '200ms',
    slow: '320ms',
    slower: '500ms',
  } as const,

  // FONT FAMILIES
  font: {
    base: "var(--font)",
    game: "var(--font-game)",
  } as const,
} as const;

/**
 * Helper function to get spacing value
 * Usage: space(4) => '16px'
 */
export const space = (value: keyof typeof DESIGN_SYSTEM.spacing): number => {
  return DESIGN_SYSTEM.spacing[value];
};

/**
 * Helper function to get radius value
 * Usage: radius('lg') => 16
 */
export const radius = (value: keyof typeof DESIGN_SYSTEM.radius): number => {
  return DESIGN_SYSTEM.radius[value];
};

/**
 * Helper function to get color value
 * Usage: color('primary') => 'var(--color-primary)'
 */
export const color = (value: keyof typeof DESIGN_SYSTEM.colors): string => {
  return DESIGN_SYSTEM.colors[value];
};

export default DESIGN_SYSTEM;
