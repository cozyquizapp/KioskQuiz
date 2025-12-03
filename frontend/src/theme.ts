// Zentrales Theme für Farben, Abstände und Schriftarten
export const theme = {
  colors: {
    background: 'var(--bg)',
    surface: 'var(--surface)',
    surfaceAlt: 'var(--surface-2)',
    accent: 'var(--accent)',
    accentStrong: 'var(--accent-strong)',
    text: 'var(--text)',
    muted: 'var(--muted)',
    success: 'var(--success)',
    danger: 'var(--danger)'
  },
  radius: 'var(--radius)',
  spacing: (factor: number) => `${factor * 8}px`
};
