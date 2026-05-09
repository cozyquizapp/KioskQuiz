import type { CSSProperties } from 'react';

/**
 * WolfHeadIcon — kleines Wolf-Asset-Bild als Inline-Ersatz für 🐺-Emoji
 * im UI-Branding. Nutzt das pink.png aus dem cozywolf-Avatar-Set
 * (gleiche Datei, die der ProgressTree als Wolf-Wandernder verwendet).
 *
 * Verwendung im Text-Flow:
 *   <span>Drück Space — los geht's <WolfHeadIcon size={20} /></span>
 *
 * Wolf-Wunsch 2026-05-09: 🐺 (generisches Emoji) → unser Custom-Wolf
 * überall im UI-Branding (Brand-Footer, Pause-Hinweis, Rules-Footer,
 * Reveal-Hint, Sonja-Card). NICHT in semantischen Stat-Awards (z.B.
 * Underdog-Stat) wo der 🐺 als Award-Wahl-Emoji bleibt.
 *
 * AVIF/WebP/PNG-Fallback via <picture> (gleiche Pipeline wie
 * CozyWolfImage), aber mit Inline-Default-Style für Text-Flow.
 */
const BASE = '/avatars/cozywolf';

export function WolfHeadIcon({
  size = 20,
  style,
  alt = 'Wolf',
}: {
  size?: number | string;
  style?: CSSProperties;
  alt?: string;
}) {
  const sz = typeof size === 'number' ? `${size}px` : size;
  return (
    <picture style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 0, ...style }}>
      <source srcSet={`${BASE}/pink.avif`} type="image/avif" />
      <source srcSet={`${BASE}/pink.webp`} type="image/webp" />
      <img
        src={`${BASE}/pink.png`}
        alt={alt}
        style={{
          width: sz, height: sz,
          display: 'inline-block',
          objectFit: 'contain',
          verticalAlign: 'middle',
        }}
      />
    </picture>
  );
}
