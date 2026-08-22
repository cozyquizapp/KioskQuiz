// 2026-05-05 (Wolf-Wunsch): Joker-Indikatoren als PNGs statt 🃏-Emoji.
//
// 2026-06-28 (Wolf): einheitlicher CozyWolf-Joker — pinker Wolf im Joker-
// Kostüm (/images/jokers/wolf.png) für ALLE Slots. Ersetzt die alten m/w-
// Emoji-Jester (1.png/2.png, liegen noch ungenutzt im Ordner). Der i-Index
// wechselt im Standard-Modus nichts mehr durch, bleibt aber in der Signatur
// für Caller-Kompatibilität (+ ESC-Mode unten).
//
// 2026-05-07 (Wolf-ESC 'EU-Stars als Joker im Eurovision-Quiz'):
// eurovisionMode + square props. ESC-Mode nutzt 'eu 1.png' (rund, fuer
// generelle Joker-Indikatoren) und 'eu 2.png' (eckig, fuer Grid-Cells).

import type { CSSProperties } from 'react';
import { useAvatarSet } from '../avatarSetContext';
import { QUIRK2_SET_ID } from '../quirks2Avatars';

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
  /** Cozy Quirks 2.0: eigener Joker (cremefarbene Kachel) statt Wolf-Joker
   *  (Wolf 2026-07-29 „ersetzt in quirks 2.0 den wolf joker"). Ein Asset für
   *  alle Slots, statisch (nur kurz sichtbar solange der Joker platziert wird). */
  quirk2?: boolean;
};

export function JokerIcon({ i = 0, size = 24, alt = 'Joker', className, style, title, eurovisionMode, square, quirk2 }: Props) {
  // Quirks 2.0 aktiv? Prop-Override, sonst aus dem Avatar-Set-Context (deckt alle
  // Call-Sites automatisch; ohne Provider defaultet der Context safe → Wolf-Joker).
  const activeSet = useAvatarSet();
  const isQuirk2 = quirk2 ?? (activeSet === QUIRK2_SET_ID);
  let src: string;
  const visualScale = 1;
  if (eurovisionMode) {
    src = square ? '/images/jokers/eu%202.png' : '/images/jokers/eu%201.png';
  } else if (isQuirk2) {
    // Quirks 2.0: cremefarbener Kachel-Joker (ein Asset, eckig=rund identisch).
    src = '/images/jokers/quirk2.webp';
  } else {
    // 2026-06-28 (Wolf): einheitlicher CozyWolf-Joker (pinker Wolf im Joker-
    // Kostüm) statt der alten m/w-Emoji-Jester (1.png/2.png). Ein Asset für
    // alle Slots — der i-Index wechselt nichts mehr durch (bleibt in der
    // Signatur für Caller-Kompat).
    //
    // 2026-08-22 (Wolf „wir brauchen den joker neu"): jetzt der Narrenhut aus
    // dem CozyQuiz-Icon-Set. Zwei Gründe. Erstens Stil: der Wolf im Kostüm ist
    // flache Vektor-Grafik, der Rest der Bühne ist weiches Tonmaterial.
    // Zweitens Distanz: auf dem Brett sitzt der Joker in einer Zelle von rund
    // 40 px. Eine ganze Figur mit Gesicht, Armen und Beinen verliert dort ihre
    // Zeichnung, ein Hut bleibt als Silhouette erkennbar. Der alte Wolf liegt
    // weiter unter /images/jokers/wolf.png.
    void i;
    src = '/icons/fx-joker.png';
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
        transform: visualScale !== 1 ? `scale(${visualScale})` : undefined,
        transformOrigin: 'center',
        ...style,
      }}
      draggable={false}
    />
  );
}
