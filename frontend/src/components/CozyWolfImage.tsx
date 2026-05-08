import React from 'react';

/**
 * CozyWolfImage — `<picture>`-Wrapper fuer Cozywolf-Posen mit AVIF/WebP/PNG-Fallback.
 *
 * Browser-Pick: AVIF (-84 % vs PNG) → WebP (-72 %) → PNG (Universal-Fallback).
 * Style/loading/decoding/alt landen auf dem inneren <img>; <picture> selbst
 * bekommt nichts ausser den <source>-Tags.
 *
 * Anti-Flicker-Hinweis: src-swap funktioniert weiter — bei pose-Aenderung
 * rendert React alle drei <source>/img-srcs gleichzeitig neu, der Browser
 * macht den Atomic-Replace auf die schon-decodierte Variante (sofern alle
 * Posen vorab via Pre-Cache geladen wurden, siehe QQBeamerPage).
 */

interface CozyWolfImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Pose-Dateiname ohne Extension, z. B. 'augenauf.mundauf.daumen' */
  pose: string;
  /** Optionaler Wrapper-style auf das <picture>-Element (selten gebraucht) */
  pictureStyle?: React.CSSProperties;
}

const BASE = '/avatars/cozywolf';

export const CozyWolfImage = React.forwardRef<HTMLImageElement, CozyWolfImageProps>(
  function CozyWolfImage({ pose, pictureStyle, ...imgProps }, ref) {
    return (
      <picture style={pictureStyle}>
        <source srcSet={`${BASE}/${pose}.avif`} type="image/avif" />
        <source srcSet={`${BASE}/${pose}.webp`} type="image/webp" />
        <img ref={ref} src={`${BASE}/${pose}.png`} {...imgProps} />
      </picture>
    );
  }
);
