import { useState, type CSSProperties } from 'react';

// ── Icon-Registry ────────────────────────────────────────────────────────────
// Custom Canva-Style PNGs unter /icons/. Slug = Dateiname ohne Extension.
// Fallback bei Lade-Fehler: Emoji (passt nicht zum Avatar-Stil, aber besser als nichts).

export type QQIconSlug =
  // Marker (Cell-Status)
  | 'marker-frost'
  | 'marker-shield'
  | 'marker-sanduhr'
  | 'marker-bomb'
  // Kategorien
  | 'cat-schaetzchen'
  | 'cat-mucho'
  | 'cat-bunte-tuete'
  | 'cat-zehn-von-zehn'
  | 'cat-cheese'
  // Sub-Mechaniken (Bunte Tüte)
  | 'sub-hotpotato'
  | 'sub-top5'
  | 'sub-order'
  | 'sub-map';

const FALLBACK_EMOJI: Record<QQIconSlug, string> = {
  'marker-frost':      '❄️',
  'marker-shield':     '🛡️',
  'marker-sanduhr':    '⏳',
  'marker-bomb':       '🎯',
  'cat-schaetzchen':   '🎯',
  'cat-mucho':         '🅰️',
  'cat-bunte-tuete':   '🎁',
  'cat-zehn-von-zehn': '🎰',
  'cat-cheese':        '📸',
  'sub-hotpotato':     '🥔',
  'sub-top5':          '🏆',
  'sub-order':         '🔀',
  'sub-map':           '📍',
};

type Props = {
  slug: QQIconSlug;
  size: number | string;
  style?: CSSProperties;
  className?: string;
  title?: string;
  alt?: string;
};

// Mapper: Kategorie/Sub-Mechanik → Icon-Slug. Imposter ist bewusst nicht
// gemapped (Mechanik deaktiviert, kein Icon vorhanden) → null = Fallback nutzen.
export function qqCatSlug(cat: string): QQIconSlug | null {
  switch (cat) {
    case 'SCHAETZCHEN':   return 'cat-schaetzchen';
    case 'MUCHO':         return 'cat-mucho';
    case 'BUNTE_TUETE':   return 'cat-bunte-tuete';
    case 'ZEHN_VON_ZEHN': return 'cat-zehn-von-zehn';
    case 'CHEESE':        return 'cat-cheese';
    default:              return null;
  }
}

export function qqSubSlug(kind: string): QQIconSlug | null {
  switch (kind) {
    case 'hotPotato': return 'sub-hotpotato';
    case 'top5':      return 'sub-top5';
    case 'order':     return 'sub-order';
    case 'map':       return 'sub-map';
    case 'oneOfEight': return null; // Imposter deaktiviert
    default:          return null;
  }
}

export function QQIcon({ slug, size, style, className, title, alt }: Props) {
  const [failed, setFailed] = useState(false);
  const base: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'inline-block',
    objectFit: 'contain',
    ...style,
  };

  if (failed) {
    return (
      <span
        className={className}
        title={title}
        aria-label={alt}
        style={{
          ...base,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: typeof size === 'number' ? Math.round(size * 0.85) : '85%',
          lineHeight: 1,
        }}
      >
        {FALLBACK_EMOJI[slug]}
      </span>
    );
  }

  return (
    <img
      src={`/icons/${slug}.png`}
      alt={alt ?? title ?? slug}
      title={title}
      className={className}
      onError={() => setFailed(true)}
      style={base}
      draggable={false}
    />
  );
}
