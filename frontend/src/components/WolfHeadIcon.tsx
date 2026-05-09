import type { CSSProperties } from 'react';

/**
 * WolfHeadIcon — kleines Wolf-Head-Asset als Inline-Ersatz für 🐺-Emoji
 * im UI-Branding. Nutzt `head.*` aus dem cozywolf-Avatar-Set: ein dediziertes
 * Head-Only-Icon (Cartoon-Pink, geschlossene Augen, Lächeln) — Wolf-Wunsch
 * 2026-05-09 v2 ("nicht der full-body pink, sondern dieser hier").
 *
 * Quelle: 256×256 komprimiert (PNG 20 KB, WebP 10 KB, AVIF 7.5 KB).
 *
 * Verwendung im Text-Flow:
 *   <span>Drück Space — los geht's <WolfHeadIcon size={20} /></span>
 *
 * 🐺 (generisches Emoji) → diese Komponente überall im UI-Branding
 * (Brand-Footer, Pause-Hinweis, Reveal-Hint, Sonja-Card). NICHT in
 * semantischen Stat-Awards (z.B. Underdog-Stat) wo der 🐺 als
 * Award-Wahl-Emoji bleibt.
 *
 * AVIF/WebP/PNG-Fallback via <picture> (gleiche Pipeline wie CozyWolfImage).
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
      <source srcSet={`${BASE}/head.avif`} type="image/avif" />
      <source srcSet={`${BASE}/head.webp`} type="image/webp" />
      <img
        src={`${BASE}/head.png`}
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
