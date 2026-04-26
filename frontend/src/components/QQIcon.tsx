import { useState, type CSSProperties } from 'react';

// ── Icon-Registry ────────────────────────────────────────────────────────────
// Custom Canva-Style PNGs unter /icons/. Slug = Dateiname ohne Extension.
// Fallback bei Lade-Fehler: Emoji (passt nicht zum Avatar-Stil, aber besser als nichts).

export type QQIconSlug =
  // Marker (Cell-Status / Action-Badges) — bestehende Custom-PNGs
  | 'marker-frost'
  | 'marker-shield'
  | 'marker-sanduhr'
  | 'marker-swap'
  // Kategorien — bestehende Custom-PNGs
  | 'cat-schaetzchen'
  | 'cat-mucho'
  | 'cat-bunte-tuete'
  | 'cat-zehn-von-zehn'
  | 'cat-cheese'
  // Sub-Mechaniken (Bunte Tüte) — bestehende Custom-PNGs
  | 'sub-hotpotato'
  | 'sub-top5'
  | 'sub-order'
  | 'sub-map'
  // Fluent Emoji 3D (Microsoft, MIT/CC-BY) — Ersatz fuer Inline-Emoji
  | 'fx-trophy'
  | 'fx-medal-gold'
  | 'fx-medal-silver'
  | 'fx-medal-bronze'
  | 'fx-lightning'
  | 'fx-check'
  | 'fx-cross'
  | 'fx-place'
  | 'fx-stack'
  | 'fx-potato'
  | 'fx-target'
  | 'fx-fire'
  | 'fx-phone'
  | 'fx-sparkles'
  | 'fx-star'
  | 'fx-dizzy'
  | 'fx-confetti'
  | 'fx-chart'
  | 'fx-detective'
  | 'fx-globe'
  | 'fx-map'
  // Fluent Emoji 3D Kandidaten fuer bestehende Custom-PNGs (Kategorien/Subs/Marker).
  // Nicht automatisch im Einsatz — werden via qqCatSlug/qqSubSlug gesteuert.
  | 'fx-cat-schaetzchen'
  | 'fx-cat-mucho'
  | 'fx-cat-bunte-tuete'
  | 'fx-cat-zehn-von-zehn'
  | 'fx-cat-cheese'
  | 'fx-sub-hotpotato'
  | 'fx-sub-top5'
  | 'fx-sub-order'
  | 'fx-sub-map'
  | 'fx-marker-frost'
  | 'fx-marker-shield'
  | 'fx-marker-sanduhr'
  | 'fx-marker-swap'
  // Alternative Kategorie-Varianten (optional)
  | 'fx-mucho-alt-light'
  | 'fx-mucho-alt-thought'
  | 'fx-zvz-alt-100'
  | 'fx-zvz-alt-dice';

const FALLBACK_EMOJI: Record<QQIconSlug, string> = {
  'marker-frost':      '❄️',
  'marker-shield':     '🛡️',
  'marker-sanduhr':    '⏳',
  'marker-swap':       '🔄',
  'cat-schaetzchen':   '🎯',
  'cat-mucho':         '🅰️',
  'cat-bunte-tuete':   '🎁',
  'cat-zehn-von-zehn': '🎰',
  'cat-cheese':        '📸',
  'sub-hotpotato':     '🥔',
  'sub-top5':          '🏆',
  'sub-order':         '🔀',
  'sub-map':           '📍',
  'fx-trophy':         '🏆',
  'fx-medal-gold':     '🥇',
  'fx-medal-silver':   '🥈',
  'fx-medal-bronze':   '🥉',
  'fx-lightning':      '⚡',
  'fx-check':          '✅',
  'fx-cross':          '❌',
  'fx-place':          '📍',
  'fx-stack':          '🗼',
  'fx-potato':         '🥔',
  'fx-target':         '🎯',
  'fx-fire':           '🔥',
  'fx-phone':          '📱',
  'fx-sparkles':       '✨',
  'fx-star':           '⭐',
  'fx-dizzy':          '💫',
  'fx-confetti':       '🎉',
  'fx-chart':          '📊',
  'fx-detective':      '🕵️',
  'fx-globe':          '🌍',
  'fx-map':            '🗺️',
  'fx-cat-schaetzchen':   '🎯',
  'fx-cat-mucho':         '🅰️',
  'fx-cat-bunte-tuete':   '🎁',
  'fx-cat-zehn-von-zehn': '🎰',
  'fx-cat-cheese':        '📸',
  'fx-sub-hotpotato':     '🥔',
  'fx-sub-top5':          '🏆',
  'fx-sub-order':         '🔀',
  'fx-sub-map':           '🗺️',
  'fx-marker-frost':      '❄️',
  'fx-marker-shield':     '🛡️',
  'fx-marker-sanduhr':    '⏳',
  'fx-marker-swap':       '🔄',
  'fx-mucho-alt-light':   '💡',
  'fx-mucho-alt-thought': '💭',
  'fx-zvz-alt-100':       '💯',
  'fx-zvz-alt-dice':      '🎲',
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

// Emoji → Fluent-Icon-Slug Mapping. Ermoeglicht Inline-Replacement via
// <QQEmojiIcon emoji="🏆" size={...}/> ohne jedesmal den Slug rauszusuchen.
const EMOJI_TO_SLUG: Record<string, QQIconSlug> = {
  '🏆': 'fx-trophy',
  '🥇': 'fx-medal-gold',
  '🥈': 'fx-medal-silver',
  '🥉': 'fx-medal-bronze',
  // '⚡': 'fx-lightning',  // entfernt — fx-lightning.png rendert mit
  // sichtbarem Rechteck-Artefakt; `⚡` faellt jetzt durch auf native
  // Unicode-Emoji-Rendering, das ist ueberall sauber transparent.
  '✅': 'fx-check',
  '❌': 'fx-cross',
  '📍': 'fx-place',
  // '🗼': 'fx-stack',  // entfernt — fx-stack.png ist die alte Pin-Variante,
  // wir wollen aber das Turm-Emoji (Stapel = Turm). 🗼 faellt jetzt auf
  // natives Unicode-Rendering durch, das den Turm zeigt.
  '🥔': 'fx-potato',
  '🎯': 'fx-target',
  '🔥': 'fx-fire',
  '📱': 'fx-phone',
  '✨': 'fx-sparkles',
  '⭐': 'fx-star',
  '💫': 'fx-dizzy',
  '🎉': 'fx-confetti',
  '📊': 'fx-chart',
  '🕵️': 'fx-detective',
  '🕵': 'fx-detective',
  '🌍': 'fx-globe',
  '🗺️': 'fx-map',
  '🗺': 'fx-map',
};

export function qqEmojiSlug(emoji: string): QQIconSlug | null {
  return EMOJI_TO_SLUG[emoji] ?? EMOJI_TO_SLUG[emoji.trim()] ?? null;
}

// Inline-Helper: rendert Emoji als Fluent-PNG, faellt bei unbekanntem Emoji
// sauber auf Text-Rendering zurueck. Size default '1em' = passt sich Parent-Schrift an.
export function QQEmojiIcon({ emoji, size = '1em', style, className, title, alt }: {
  emoji: string; size?: number | string;
  style?: CSSProperties; className?: string; title?: string; alt?: string;
}) {
  const slug = qqEmojiSlug(emoji);
  if (!slug) {
    return (
      <span className={className} title={title} aria-label={alt} style={{
        display: 'inline-block', ...style,
      }}>{emoji}</span>
    );
  }
  return (
    <QQIcon
      slug={slug}
      size={size}
      style={{ verticalAlign: '-0.15em', ...style }}
      className={className}
      title={title}
      alt={alt ?? emoji}
    />
  );
}

// Slug-Alias: bestehende cat-*/sub-*/marker-*-Referenzen laden transparent die
// Fluent-Version — ein Flag-Toggle genuegt, um zwischen Custom-Stil und Fluent
// hin und her zu schalten.
const USE_FLUENT_FOR_CUSTOM = true;
const SLUG_ALIAS: Partial<Record<QQIconSlug, QQIconSlug>> = USE_FLUENT_FOR_CUSTOM ? {
  'cat-schaetzchen':   'fx-cat-schaetzchen',
  'cat-mucho':         'fx-cat-mucho',
  'cat-bunte-tuete':   'fx-cat-bunte-tuete',
  'cat-zehn-von-zehn': 'fx-cat-zehn-von-zehn',
  'cat-cheese':        'fx-cat-cheese',
  'sub-hotpotato':     'fx-sub-hotpotato',
  'sub-top5':          'fx-sub-top5',
  'sub-order':         'fx-sub-order',
  'sub-map':           'fx-sub-map',
  'marker-frost':      'fx-marker-frost',
  'marker-shield':     'fx-marker-shield',
  'marker-sanduhr':    'fx-marker-sanduhr',
  'marker-swap':       'fx-marker-swap',
} : {};

export function QQIcon({ slug, size, style, className, title, alt }: Props) {
  const [failed, setFailed] = useState(false);
  const effectiveSlug = SLUG_ALIAS[slug] ?? slug;
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
      src={`/icons/${effectiveSlug}.png`}
      alt={alt ?? title ?? slug}
      title={title}
      className={className}
      onError={() => setFailed(true)}
      style={base}
      draggable={false}
    />
  );
}
