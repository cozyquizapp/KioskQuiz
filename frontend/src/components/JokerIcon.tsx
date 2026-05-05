// 2026-05-05 (Wolf-Wunsch): Joker-Indikatoren als PNGs (m/w im Wechsel)
// statt 🃏-Emoji. PNGs liegen in /images/jokers/1.png + 2.png.
//
// Wechsel-Logik: i % 2 — bei Joker-Pile (mehrere Slots) wird je nach
// Position alterniert; bei Einzel-Joker pro Team oder Cell bestimmt
// die uebergebene Index-Zahl die Variante.

import type { CSSProperties } from 'react';

type Props = {
  /** Index zur Wechsel-Bestimmung. Gerade → Variante 1, ungerade → Variante 2. */
  i?: number;
  /** Px-Zahl ODER beliebiger CSS-Wert. */
  size?: number | string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function JokerIcon({ i = 0, size = 24, alt = 'Joker', className, style, title }: Props) {
  const variant = (i % 2 === 0) ? 1 : 2;
  return (
    <img
      src={`/images/jokers/${variant}.png`}
      alt={alt}
      title={title ?? alt}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        width: size,
        height: size,
        objectFit: 'contain',
        ...style,
      }}
      draggable={false}
    />
  );
}
