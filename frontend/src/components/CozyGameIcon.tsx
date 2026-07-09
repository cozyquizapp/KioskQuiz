import { useState, type CSSProperties } from 'react';

// ── CozyGame-Icon ────────────────────────────────────────────────────────────
// Rendert das selbstdesignte 3D-Icon /icons/<gameId>.png (Wolf 2026-07-09) mit
// sauberem Emoji-Fallback. Anders als QQIcon KEINE feste Slug-Union — nimmt
// beliebige (auch custom im Editor angelegte) Game-IDs. Fehlt die PNG-Datei,
// faellt es via onError aufs OS-Emoji zurueck.

/** DOM-Variante (Reveal-Card, aktives Spiel, Sieger-Zeile). */
export function CozyGameIcon({ id, emoji, size, style, title }: {
  id: string;
  emoji: string;
  size: number | string;
  style?: CSSProperties;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);
  const base: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'inline-block',
    objectFit: 'contain',
    ...style,
  };
  if (failed || !id) {
    return (
      <span
        title={title}
        style={{
          ...base,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: typeof size === 'number' ? Math.round(size * 0.9) : `calc(${size} * 0.9)`,
          lineHeight: 1,
        }}
      >
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={`/icons/${id}.png`}
      alt={title ?? id}
      title={title}
      onError={() => setFailed(true)}
      style={base}
      draggable={false}
    />
  );
}

/** SVG-Variante fuer Gluecksrad-Slices. Faellt bei fehlender PNG auf <text>-Emoji
 *  zurueck (gleiche Position/Rotation wie vorher). */
export function CozyGameWheelIcon({ id, emoji, cx, cy, size, rotateDeg, fontSize }: {
  id: string;
  emoji: string;
  cx: number;
  cy: number;
  size: number;
  rotateDeg: number;
  fontSize: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !id) {
    return (
      <text
        x={cx}
        y={cy}
        fontSize={fontSize}
        fontWeight={900}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        transform={`rotate(${rotateDeg} ${cx} ${cy})`}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
      >
        {emoji}
      </text>
    );
  }
  return (
    <image
      href={`/icons/${id}.png`}
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      transform={`rotate(${rotateDeg} ${cx} ${cy})`}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
    />
  );
}
