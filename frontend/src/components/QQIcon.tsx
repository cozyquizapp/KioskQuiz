import { useState, type CSSProperties } from 'react';
import { useActiveThemeId, QUIRKS_THEME_ID } from '../qqTheme';

// Kategorie-Slugs mit eigener Quirks-Variante (chunky Clay-Kachel, /icons/quirks/).
// Im Quirks-Theme laden diese die Kachel-Version statt des freistehenden Icons.
const QUIRK_CAT_SLUGS = new Set<string>([
  'cat-schaetzchen', 'cat-mucho', 'cat-bunte-tuete', 'cat-zehn-von-zehn', 'cat-cheese',
]);

// ── Icon-Registry ────────────────────────────────────────────────────────────
// Custom Canva-Style PNGs unter /icons/. Slug = Dateiname ohne Extension.
// Fallback bei Lade-Fehler: Emoji (passt nicht zum Avatar-Stil, aber besser als nichts).

export type QQIconSlug =
  // Marker (Cell-Status / Action-Badges) — bestehende Custom-PNGs
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
  | 'sub-umfrage'
  | 'sub-schwarm'
  // Brett-Aktionen (cozy3d-Look, icons-v2 2026-06-28)
  | 'action-place'
  | 'action-steal'
  | 'action-stack'
  // Final-Reveal-Stempel
  | 'stamp-speedy'
  // Faktions-Awards (Mega Event) — Wolf-Award-PNGs
  | 'award-speedy'
  | 'award-underdog'
  | 'award-sharpshooter'
  // Bieten / Final-Tipp (Auktionshammer, cozy3d-Look)
  | 'bieten'
  // Connections / Großes Finale (rotes 3D-Puzzle, cozy3d-Look)
  | 'connect'
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
  // Wolfs neue 3D-Marken-Icons (2026-07-08, aus "logos für website") — Krone/
  // Arena neu, Trophy/Phone ersetzen die alten Fluent-PNGs in-place.
  | 'fx-crown'
  | 'fx-arena'
  | 'fx-teams'
  // Wolf-Lieferung 2026-07-15 (Arena): 3D-Buch (Regeln) + neutrales Wappen.
  | 'fx-book'
  | 'fx-shield-faction'
  // Wolf-Lieferung 2026-07-16: Rakete (Führungs-Callout), Anker-Wolf (Award
  // „Beständig"), Rudel-Wolf (Award „Vollzählig").
  | 'rocket'
  | 'anker'
  | 'group'
  // Fluent Emoji 3D Kandidaten fuer bestehende Custom-PNGs (Kategorien/Subs/Marker).
  // Nicht automatisch im Einsatz — werden via qqCatSlug/qqSubSlug gesteuert.
  // Alternative Kategorie-Varianten (optional)
  // ── CozyQuiz Icon Set, Wolf-Lieferung 2026-08-22 ──────────────────────────
  // 53 Motive im Stil des CozyQuiz-Avatarsets (weiche 3D-Objekte, warme Farben,
  // freigestellt, 512²). Ersetzt die geliehene Fluent-Emoji-3D-Reihe und macht
  // das erste einheitliche Icon-Set der App. Die 29 Slugs, die es schon gab,
  // laden dieselbe Datei und ziehen den neuen Stil automatisch nach; die 24
  // hier sind neu dazugekommen.
  | 'award-thief'          // Meisterklauer (+1)
  | 'award-heart'          // Mit Herz dabei
  | 'award-participation'  // Vollzaehlig
  | 'award-anchor'         // Bestaendig
  | 'fx-connect'           // Verbindungen / Connections-Finale
  | 'fx-bluff'             // Bluff
  | 'fx-duel'              // Duell
  | 'fx-alliance'          // Buendnis
  | 'fx-finish'            // Ziel / Rundenende
  | 'fx-dice'              // Zufall / Auslosung
  | 'fx-bet'               // Einsatz, Final-Wager
  | 'fx-lock'              // Antwort abgegeben, nicht mehr aenderbar
  | 'fx-idea'              // Tipp / Hinweis
  | 'fx-thought'           // Nachdenkphase
  | 'fx-hundred'           // volle Punktzahl
  | 'fx-wave'              // Begruessung in der Lobby
  | 'fx-mic'               // Moderation
  | 'fx-clapper'           // Runde startet
  | 'fx-faction'           // Fraktion (Arena)
  | 'fx-lead'              // Fuehrung
  | 'fx-signal'            // Netz-Status
  | 'fx-back'              // Zurueck
  | 'fx-sad'               // knapp verfehlt
  | 'brand-wolf'           // der CozyQuiz-Wolf als Marke, nicht als OS-Emoji
  // ── Zweite Lieferung, 2026-08-22 ──────────────────────────────────────────
  // 27 Motive. Damit ist jede Stelle der App, an der ein Zeichen als Marke
  // steht, im selben Stil. fx-check/-cross/-star/-dizzy/-confetti haben nur
  // ihre Datei getauscht und ziehen automatisch nach.
  | 'fx-sparkle'           // loest fx-sparkles ab (Dateiname jetzt Einzahl)
  | 'fx-timer'             // ersetzt drei verschiedene Uhr-Glyphen
  | 'fx-pause'
  | 'fx-joker'             // Narrenhut. Spielmechanik, kein Schmuck
  | 'fx-board'             // das Spielbrett
  | 'fx-list'              // Ablauf des Abends
  | 'fx-write'             // Eingabe, "eure Tipps"
  | 'fx-blocked'           // nicht moeglich
  | 'fx-warning'           // Verbindung unterbrochen
  | 'fx-exit'
  | 'fx-help'
  | 'fx-play'
  | 'fx-screen'            // "schau auf den Beamer"
  | 'fx-wheel'             // Gluecksrad, CozyGame-Auslosung
  | 'fx-tie'               // Gleichstand
  | 'fx-tag'               // Stamm-Code
  // Publikums-Reaktionen. Bewusst eigene Praefix-Familie: sie duerfen als
  // einzige des Sets ein Gesicht zeigen, weil Gefuehl sich nicht als
  // Gegenstand darstellen laesst. Nicht in EMOJI_TO_SLUG eintragen — dort
  // wuerden sie generische Zeichen kapern (🔥 ist auch der Underdog-Award,
  // 🎉 auch der Jubel-Effekt). Aufloesung laeuft ueber qqReactionSlug().
  | 'react-applause'
  | 'react-fire'
  | 'react-shock'
  | 'react-sad'
  | 'react-party'
  | 'react-laugh';

const FALLBACK_EMOJI: Record<QQIconSlug, string> = {
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
  'sub-umfrage':       '🗳️',
  'sub-schwarm':       '🧠',
  'action-place':      '📍',
  'action-steal':      '⚡',
  'action-stack':      '🏯',
  'stamp-speedy':      '⚡',
  'award-speedy':       '⚡',
  'award-underdog':     '🔥',
  'award-sharpshooter': '🎯',
  'bieten':            '🪙',
  'connect':           '🧩',
  'fx-trophy':         '🏆',
  'fx-medal-gold':     '🥇',
  'fx-medal-silver':   '🥈',
  'fx-medal-bronze':   '🥉',
  'fx-lightning':      '⚡',
  'fx-check':          '✅',
  'fx-cross':          '❌',
  'fx-place':          '📍',
  'fx-stack':          '🏯',
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
  'fx-crown':          '👑',
  'fx-arena':          '🏟️',
  'fx-teams':          '👥',
  'fx-book':           '📖',
  'fx-shield-faction': '🛡️',
  'rocket':            '🚀',
  'anker':             '⚓',
  'group':             '👥',
  // CozyQuiz Icon Set 2026-08-22
  'award-thief':          '🦝',
  'award-heart':          '💛',
  'award-participation':  '👥',
  'award-anchor':         '⚓',
  'fx-connect':           '🧩',
  'fx-bluff':             '🎭',
  'fx-duel':              '⚔️',
  'fx-alliance':          '🤝',
  'fx-finish':            '🏁',
  'fx-dice':              '🎲',
  'fx-bet':               '🪙',
  'fx-lock':              '🔒',
  'fx-idea':              '💡',
  'fx-thought':           '💭',
  'fx-hundred':           '💯',
  'fx-wave':              '👋',
  'fx-mic':               '🎤',
  'fx-clapper':           '🎬',
  'fx-faction':           '🛡️',
  'fx-lead':              '🚀',
  'fx-signal':            '📶',
  'fx-back':              '🔙',
  'fx-sad':               '😢',
  'brand-wolf':           '🐺',
  // Zweite Lieferung 2026-08-22
  'fx-sparkle':           '✨',
  'fx-timer':             '⏱',
  'fx-pause':             '⏸',
  'fx-joker':             '🃏',
  'fx-board':             '🎮',
  'fx-list':              '📋',
  'fx-write':             '📝',
  'fx-blocked':           '🚫',
  'fx-warning':           '⚠️',
  'fx-exit':              '🚪',
  'fx-help':              '❓',
  'fx-play':              '▶',
  'fx-screen':            '📺',
  'fx-wheel':             '🎡',
  'fx-tie':               '⚖️',
  'fx-tag':               '🔖',
  'react-applause':       '👏',
  'react-fire':           '🔥',
  'react-shock':          '😱',
  'react-sad':            '😢',
  'react-party':          '🎉',
  'react-laugh':          '😂',
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
    case 'crowdTop':      return 'sub-umfrage';
    case 'crowdEstimate': return 'sub-schwarm';
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
  // 2026-07-20 (Wolf liefert 'blitz.png' fuer Schnelligkeit): Mapping wieder
  // scharf. Die alte fx-lightning.png hatte ein sichtbares Rechteck-Artefakt
  // (schlecht freigestellt) und war deshalb deaktiviert; die neue ist aus dem
  // Gold-auf-Schwarz-Master per Luminanz-Alpha freigestellt und auf Weiss/
  // Brand-Pink/Navy/Beamer-Dunkel gegengeprueft (kein Halo, kein Kasten).
  '⚡': 'fx-lightning',
  '✅': 'fx-check',
  '❌': 'fx-cross',
  '📍': 'fx-place',
  // '🏯': 'fx-stack',  // entfernt — fx-stack.png ist die alte Pin-Variante,
  // wir wollen aber das Pagoden-Emoji (Stapel = aufeinander gestapelte
  // Stockwerke). 🏯 faellt auf natives Unicode-Rendering durch.
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
  '👑': 'fx-crown',
  '👥': 'fx-teams',
  '📖': 'fx-book',
  '🚀': 'rocket',
  // 2026-08-22 (CozyQuiz Icon Set): diese Emoji hatten bisher kein Motiv und
  // wurden als OS-Glyphe gerendert — also in jedem Betriebssystem anders und
  // stilfremd zum Rest. Jetzt haben sie eins.
  '🧩': 'fx-connect',
  '🎭': 'fx-bluff',
  '⚔️': 'fx-duel',
  '⚔': 'fx-duel',
  '🤝': 'fx-alliance',
  '🏁': 'fx-finish',
  '🎲': 'fx-dice',
  '🪙': 'fx-bet',
  '🔒': 'fx-lock',
  '💡': 'fx-idea',
  '💭': 'fx-thought',
  '💯': 'fx-hundred',
  '👋': 'fx-wave',
  '🎤': 'fx-mic',
  '🎬': 'fx-clapper',
  '📶': 'fx-signal',
  '🔙': 'fx-back',
  '😢': 'fx-sad',
  '🐺': 'brand-wolf',
  '🦝': 'award-thief',
  '⚓': 'anker',
  '🛡️': 'fx-faction',
  '🛡': 'fx-faction',
  '🏟️': 'fx-arena',
  '🏟': 'fx-arena',
  '🗳️': 'sub-umfrage',
  '🗳': 'sub-umfrage',
  '🧠': 'sub-schwarm',
  '🔀': 'sub-order',
  '🎁': 'cat-bunte-tuete',
  '🎰': 'cat-zehn-von-zehn',
  '📸': 'cat-cheese',
  // 2026-08-22: acht Emoji, die kein eigenes Motiv brauchen, weil im Set
  // bereits eins fuer dieselbe Sache liegt. Vorher liefen sie als OS-Glyphe.
  '🏅': 'fx-medal-gold',   // Medaille im Pause-Panel
  '💰': 'fx-bet',          // "die meisten Punkte auf die richtige Antwort"
  '🔍': 'cat-cheese',      // Lupe in den Schau-mal-Partikeln
  '🌊': 'sub-schwarm',     // Schwarm-Median bei Schwarmintelligenz
  '🗡️': 'award-thief',     // Steal-Master im Pause-Panel = Meisterklauer
  '🗡': 'award-thief',
  '🦅': 'fx-lead',         // Comeback-King im Pause-Panel
  // 2026-08-22: Glyph-Drift geradegezogen. Der Underdog-Award trug drei
  // verschiedene Zeichen an drei Stellen (🔥 in der Registry, 🍀 im
  // Turm-Finale, 🐢 im Final-Reveal). Alle drei meinen dieselbe Ehrung.
  '🐢': 'award-underdog',
  '🍀': 'award-underdog',
  // 2026-08-22, zweite Lieferung: die letzten Bedienelemente, die noch als
  // OS-Glyphe liefen. Mehrere Zeichen fuer dieselbe Sache laufen bewusst auf
  // EIN Motiv zusammen — drei Uhren waren drei verschiedene Bilder fuer
  // "die Zeit laeuft".
  '⏱': 'fx-timer',  '⏱️': 'fx-timer',
  '⏰': 'fx-timer',  '⏳': 'fx-timer',
  '⏸': 'fx-pause',  '⏸️': 'fx-pause',
  '🃏': 'fx-joker',
  '🎮': 'fx-board',
  '📋': 'fx-list',
  '📝': 'fx-write',  '✍️': 'fx-write',  '✍': 'fx-write',
  '🚫': 'fx-blocked',
  '⚠️': 'fx-warning', '⚠': 'fx-warning',
  '🚪': 'fx-exit',
  '❓': 'fx-help',
  '📺': 'fx-screen',
  '🎡': 'fx-wheel',
  '⚖️': 'fx-tie',   '⚖': 'fx-tie',
  '🔖': 'fx-tag',
};

// ── Publikums-Reaktionen ─────────────────────────────────────────────────────
// 2026-08-22. Bewusst getrennt von EMOJI_TO_SLUG. Drei der sechs Zeichen sind
// mehrdeutig: 🔥 steht auch fuer den Underdog-Award, 🎉 auch fuer den
// Jubel-Effekt bei einer Aufloesung, 😢 auch fuer "knapp verfehlt". Ein
// globaler Eintrag haette diese Stellen mitgekapert. Nur die beiden echten
// Reaktions-Aufrufer (Reaktions-Pad am Handy, Floater am Beamer) gehen hier
// durch.
const REACTION_TO_SLUG: Record<string, QQIconSlug> = {
  '👏': 'react-applause',
  '🔥': 'react-fire',
  '😱': 'react-shock',
  '😢': 'react-sad',
  '🎉': 'react-party',
  '😂': 'react-laugh',
};

/** Motiv fuer eine Publikums-Reaktion. null = unbekanntes Zeichen, dann Text. */
export function qqReactionSlug(emoji: string): QQIconSlug | null {
  return REACTION_TO_SLUG[emoji] ?? REACTION_TO_SLUG[emoji.trim()] ?? null;
}

/** Rendert eine Publikums-Reaktion als Motiv, sonst als Zeichen. */
export function QQReactionIcon({ emoji, size = '1em', style, className }: {
  emoji: string; size?: number | string; style?: CSSProperties; className?: string;
}) {
  const slug = qqReactionSlug(emoji);
  if (!slug) return <span className={className} style={style}>{emoji}</span>;
  return <QQIcon slug={slug} size={size} style={style} className={className} alt={emoji} />;
}

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
// 2026-06-28: AUS — die fx-cat-*/fx-sub-* liegen im _archive/, und cat-*/sub-*
// sind jetzt Wolfs neue cozy3d-Look-Icons (icons-v2). cat-*/sub-* laden also
// direkt ihre eigenen, echten PNGs.
// 2026-08-22 (CozyQuiz Icon Set): der Alias hat jetzt eine echte Aufgabe. Von
// den 70 gewachsenen Slugs haben 29 direkt eine neue Datei bekommen (gleicher
// Name, neues Motiv — die ziehen ohne Zutun nach). Die hier unten heissen
// historisch anders als ihr neues Motiv; statt 40 Aufrufstellen umzubenennen,
// zeigen sie auf die neue Datei. Ein Slug bleibt also gueltig, das Bild ist neu.
const SLUG_ALIAS: Partial<Record<QQIconSlug, QQIconSlug>> = {
  // Historischer Name → neues Motiv aus dem Set
  'stamp-speedy':      'award-speedy',      // Final-Reveal-Stempel = derselbe Blitz
  'bieten':            'fx-bet',            // Auktionshammer → Einsatz-Motiv
  'connect':           'fx-connect',
  'fx-lightning':      'award-speedy',      // generisches ⚡ = Schnelligkeit
  'fx-place':          'action-place',
  'fx-stack':          'action-stack',
  'fx-potato':         'sub-hotpotato',
  'fx-target':         'cat-schaetzchen',   // Zielscheibe = Schaetzchen
  'fx-fire':           'award-underdog',    // 🔥 stand fuer die Aufholjagd
  'fx-map':            'fx-globe',          // 🗺️ und 🌍 fallen im Set zusammen
  'fx-shield-faction': 'fx-faction',
  'rocket':            'fx-lead',           // Rakete = Fuehrungs-Callout
  'anker':             'award-anchor',
  'group':             'award-participation', // Rudel-Wolf = Award "Vollzaehlig"
  // Zweite Lieferung: die Datei heisst jetzt in der Einzahl.
  'fx-sparkles':       'fx-sparkle',
};

export function QQIcon({ slug, size, style, className, title, alt }: Props) {
  const [failed, setFailed] = useState(false);
  const themeId = useActiveThemeId();
  // Quirks-Theme: Kategorie-Icons als chunky Clay-Kacheln aus /icons/quirks/.
  const quirkCat = themeId === QUIRKS_THEME_ID && QUIRK_CAT_SLUGS.has(slug);
  const effectiveSlug = SLUG_ALIAS[slug] ?? slug;
  const src = quirkCat ? `/icons/quirks/${slug}.png` : `/icons/${effectiveSlug}.png`;
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
          // 2026-06-30 (Wolf 'hot potato emoji viel zu klein'): bei String-Größen
          // (clamp/cqw) war der Emoji-Fallback '85%' = 85% der GEERBTEN Font-Size
          // (winzig), nicht 85% der gewünschten Icon-Größe. Fehlt ein PNG (z.B.
          // sub-hotpotato.png existiert nicht), schrumpfte das Emoji auf Body-
          // Default. Jetzt skaliert der Fallback mit der echten Größe.
          fontSize: typeof size === 'number' ? Math.round(size * 0.85) : `calc(${size} * 0.85)`,
          lineHeight: 1,
        }}
      >
        {FALLBACK_EMOJI[slug]}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? title ?? slug}
      title={title}
      className={className}
      onError={() => setFailed(true)}
      style={base}
      draggable={false}
    />
  );
}
