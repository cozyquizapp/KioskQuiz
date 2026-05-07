// 2026-05-05 (Wolf-Wunsch): Joker-Indikatoren als PNGs (m/w im Wechsel)
// statt 🃏-Emoji. PNGs liegen in /images/jokers/1.png + 2.png.
//
// Wechsel-Logik: i % 2 — bei Joker-Pile (mehrere Slots) wird je nach
// Position alterniert; bei Einzel-Joker pro Team oder Cell bestimmt
// die uebergebene Index-Zahl die Variante.
//
// 2026-05-07 (Wolf-ESC 'EU-Stars als Joker im Eurovision-Quiz'):
// eurovisionMode + square props. ESC-Mode nutzt 'eu 1.png' (rund, fuer
// generelle Joker-Indikatoren) und 'eu 2.png' (eckig, fuer Grid-Cells).

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
  /** Wenn true: Eurovision-Joker (EU-Stars) statt Cozy-Joker (m/w). */
  eurovisionMode?: boolean;
  /** Nur in ESC-Mode wirksam: square-Variante (eu 2.png) statt rund (eu 1.png).
   *  Grid-Cells nutzen square fuer den 90deg-Cell-Match, alles andere rund. */
  square?: boolean;
};

export function JokerIcon({ i = 0, size = 24, alt = 'Joker', className, style, title, eurovisionMode, square }: Props) {
  let src: string;
  if (eurovisionMode) {
    // Filename hat Leerzeichen → URL-encoded
    src = square ? '/images/jokers/eu%202.png' : '/images/jokers/eu%201.png';
  } else {
    const variant = (i % 2 === 0) ? 1 : 2;
    src = `/images/jokers/${variant}.png`;
  }
  return (
    <img
      src={src}
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
