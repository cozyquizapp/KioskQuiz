// 2026-05-04 — Avatar-Sets fuer Quiz-Lobbies
// Default = 'all' (Emoji-Standard, freie Wahl). 'cozyCast' ist die opt-in
// PNG-Variante (klassische Canva-Tier-Avatare). Themen-Sets ueberschreiben.
//
// Phase 2: getAvatarDisplay() ist der Single Source of Truth fuer den Renderer.
// QQTeamAvatar liest setId aus dem Context und fragt diesen Helper, was zu
// rendern ist (PNG-Pfad oder Emoji + Hintergrund-Farbe).

import { QQ_AVATARS } from '../../shared/quarterQuizTypes';
import { COZY3D_SLUGS, isCozy3dSlug, cozy3dSrc, cozy3dLabel } from './cozy3dAvatars';
import { COZY_ARENA_CREST_SLUGS, isCrestSlug, crestSrc, crestLabel } from './cozyArenaCrests';

export type AvatarSetSource = 'png' | 'emoji';

export type AvatarSet = {
  id: string;
  label: string;
  /** Tint fuer Karten-Glow + aktiver Border-Glow im Set-Picker. */
  tint: string;
  /** Grosses Emoji im Karten-Zentrum (kommuniziert das Theme). */
  leadEmoji: string;
  /** 3 Begleit-Emojis als Mini-Reihe drunter (Vorschau). */
  preview: string[];
  /** Render-Quelle: 'png' = PNGs aus QQ_AVATARS; 'emoji' = avatars-Array. */
  source: AvatarSetSource;
  /**
   * 8 Eintraege fuer die 8 Team-Slots.
   * Bei source='emoji': Unicode-Emojis (z.B. '🎃').
   * Bei source='png': leer (PNGs werden ueber QQ_AVATARS gerendert).
   * Bei id='all': leer; getAvatarDisplay faellt auf 'cozyAnimals'-Default zurueck.
   */
  avatars: string[];
};

// Cozy-Animals als Emoji — der visuelle Default-Look fuer 'all'.
const COZY_ANIMALS_EMOJI = ['🐶', '🦥', '🐧', '🐨', '🦒', '🦝', '🐄', '🐹'];

// 2026-05-04 (Wolf): Mega-Pool fuer 'all'-Set — alle Emojis, frei waehlbar.
// ~140 kuratierte spielerische Emojis quer durch Themen (Tiere, Essen, Sport,
// Fantasy, Symbole). Theme-Sets (Halloween/Pub/Sport/etc.) behalten ihre fixen 8.
export const MEGA_EMOJI_POOL: string[] = [
  // Tiere
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵',
  '🦒','🦓','🐧','🦅','🦆','🦉','🦜','🐺','🦝','🦨','🦡','🦦','🐢','🐍','🦎',
  '🐲','🐉','🦋','🐝','🐞','🐬','🐳','🦈','🐙','🦑','🦀','🐠','🐟','🦞','🐌',
  '🦄','🦛','🦏','🐘','🐪','🦌','🦘','🐎','🦬','🐗',
  // Essen / Cozy-Treats
  '🍕','🍔','🌮','🌯','🥨','🥐','🍩','🍰','🧁','🍪','🍫','🍬','🍭','🍿','🥞',
  '🍣','🍱','🥡','🍜','🍝','🍤','🍙','🍡','🍢','🍦','🥗','🥪','🥙','🌭','🍳',
  '🍇','🍓','🍌','🍎','🍑','🥝','🍍','🥥','🍒','🥑','🌽','🥕','🍄','🌶️','🫐',
  // Sport / Game / Aktivitaet
  '⚽','🏀','🎾','🏈','⚾','🥎','🏐','🏉','🎱','🏓','🏸','🥊','🎯','🎳','⛳',
  '🎲','🃏','🎮','🕹️','🎰','🎨','🎭','🎬','🎤','🎸','🎹','🥁','🎺','🎷','🎻',
  '⛸️','⛷️','🏂','🏊','🚴','🤸',
  // Reise / Welt
  '🚗','🏎️','🚲','🚀','🛸','🚁','🛩️','⛵️','🛶','🚂','🚢','🏝️','🏔️','🌋','🏰',
  '⛺️','🎡','🎢','🎠','🌆','🗽','🗼','🌍','🌎','🌏',
  // Fantasy / Mensch / Charakter
  '👻','🎃','💀','👽','🤖','🤡','🤠','🥷','🧙','🧝','🧜','🧚','🧞','🦸','🦹',
  '🧛','🧟','🧌',
  // Symbole / Elemente / Glanz
  '⭐','🌟','💫','✨','🔥','❄️','💧','💎','💍','🏆','🥇','🥈','🥉','👑','🎖️',
  '🎁','🎈','🎀','🌈','☀️','🌙','⛄','🌸','🌹','🌻','🌷','🌵','🌴','🍀','🪴',
  '🪐','⚡','🌊','🌪️','☄️','🔮','🎃','🍄','🪐','🛡️','⚔️',
];

/**
 * 2026-05-07 (Wolf-Bug 'Flaggen tauchen in Allgemeinwissen-Quizzen auf'):
 * Eurovision-/ESC-Flaggen-Pool fuer das 'esc'-Set-Bot-Filling. Wird NICHT
 * im MEGA_EMOJI_POOL gemischt — sonst zogen Bots in Standard-Quizzen
 * zufaellig Flaggen. Mod-Page-fillTeams-Logic schickt diesen Pool an
 * Backend wenn Wolfs aktuelles Set === 'esc' ist.
 */
export const ESC_FLAG_POOL: string[] = [
  '🇦🇱','🇦🇩','🇦🇲','🇦🇺','🇦🇿','🇧🇪','🇧🇾','🇧🇦','🇧🇬','🇭🇷',
  '🇨🇾','🇨🇿','🇩🇰','🇪🇪','🇫🇮','🇫🇷','🇬🇪','🇩🇪','🇬🇷','🇭🇺',
  '🇮🇸','🇮🇪','🇮🇱','🇮🇹','🇱🇻','🇱🇹','🇱🇺','🇲🇹','🇲🇩','🇲🇨',
  '🇲🇪','🇲🇦','🇳🇱','🇲🇰','🇳🇴','🇵🇱','🇵🇹','🇷🇴','🇷🇺','🇸🇲',
  '🇷🇸','🇸🇰','🇸🇮','🇪🇸','🇸🇪','🇨🇭','🇹🇷','🇺🇦','🇬🇧',
];

export const AVATAR_SETS: AvatarSet[] = [
  // 2026-06-23 (Wolf): cozy3d — 80 handgemachte 3D-Fluent-Tier-Avatare,
  // der neue Standard-Look. source 'emoji' (reuse der Plumbing), aber die
  // „avatars"-Eintraege sind cozy3d-Slugs statt Unicode → der Renderer
  // erkennt sie via isCozy3dSlug und zeigt das PNG auf der Slot-Farb-Disc.
  // Die ersten 8 Slugs = Default-Belegung der 8 Farb-Slots.
  {
    id: 'cozy3d',
    label: 'Cozy 3D',
    tint: '#EC4899',
    leadEmoji: '🦊',
    preview: ['🐼', '🐧', '🦒'],
    source: 'emoji',
    avatars: COZY3D_SLUGS,
  },
  {
    id: 'all',
    label: 'Alle',
    tint: '#a78bfa',
    leadEmoji: '✨',
    preview: ['🐨', '🎃', '🚀'],
    source: 'emoji',
    avatars: COZY_ANIMALS_EMOJI,    // bei 'all' nutzen wir die Cozy-Tiere als Default-Display
  },
  // 2026-07-03 (Wolf): CozyArena — 8 Fraktions-Wappen (Quiz-Archetypen). Die
  // „avatars"-Einträge sind Crest-Slugs (isCrestSlug), gerendert als flaches
  // Wappen-PNG (eigene Schild-Form+Farbe, KEINE Farb-Disc). Reihenfolge =
  // QQ_AVATARS-Slots. Auch die Groß-Modus-Fraktionen (QQ_MEGA_FACTIONS.slug)
  // ziehen diese Slugs → Wappen erscheinen in Lobby/Reveals unabhängig vom Set.
  {
    id: 'cozyArena',
    label: 'CozyArena',
    tint: '#EC4899',
    leadEmoji: '🛡️',
    preview: ['🏆', '🔥', '🍀'],
    source: 'emoji',
    avatars: COZY_ARENA_CREST_SLUGS,
  },
  {
    id: 'cozyAnimals',
    label: 'Cozy Animals',
    tint: '#9DCB2F',
    leadEmoji: '🐨',
    preview: ['🐶', '🦥', '🐹'],
    source: 'emoji',
    avatars: COZY_ANIMALS_EMOJI,
  },
  // 2026-06-27: 'cozyCast' (alte PNG-Avatare) entfernt — Wolf: nicht mehr genutzt.
  // Assets nach _archive/public-avatars/cozy-cast/. PngAvatar-Codepfad bleibt (tot,
  // harmlos); getSet() fällt auf Default zurück, falls irgendwo noch 'cozyCast' ankommt.
  {
    id: 'halloween',
    label: 'Halloween',
    tint: '#f97316',
    leadEmoji: '🎃',
    preview: ['👻', '🦇', '💀'],
    source: 'emoji',
    avatars: ['👻', '🎃', '🧙', '🧛', '🦇', '💀', '🧟', '🕷️'],
  },
  {
    id: 'christmas',
    label: 'Weihnachten',
    tint: '#dc2626',
    leadEmoji: '🎄',
    preview: ['🎅', '🦌', '☃️'],
    source: 'emoji',
    avatars: ['🎅', '🤶', '🦌', '☃️', '🧝', '🎄', '⛄', '🎁'],
  },
  {
    id: 'pub',
    label: 'Pub & Bar',
    tint: '#d97706',
    leadEmoji: '🍻',
    preview: ['🍕', '🎯', '🃏'],
    source: 'emoji',
    avatars: ['🍻', '🍕', '🌮', '🎯', '🃏', '🎲', '🥨', '🍔'],
  },
  {
    id: 'scifi',
    label: 'Sci-Fi',
    tint: '#6366f1',
    leadEmoji: '🚀',
    preview: ['👽', '🤖', '🛸'],
    source: 'emoji',
    avatars: ['🚀', '👽', '🤖', '🛸', '🪐', '⭐', '👾', '🌌'],
  },
  {
    id: 'sport',
    label: 'Sport',
    tint: '#22c55e',
    leadEmoji: '🏆',
    preview: ['⚽', '🏀', '🎾'],
    source: 'emoji',
    avatars: ['⚽', '🏀', '🎾', '🏆', '🥇', '🎳', '🥊', '🏓'],
  },
  {
    id: 'tropical',
    label: 'Tropical',
    tint: '#06b6d4',
    leadEmoji: '🌴',
    preview: ['🦩', '🐬', '🍍'],
    source: 'emoji',
    avatars: ['🦩', '🐬', '🦜', '🐢', '🌴', '🍍', '🥥', '🌺'],
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    tint: '#ec4899',
    leadEmoji: '🦄',
    preview: ['🐉', '🧚', '🔮'],
    source: 'emoji',
    avatars: ['🦄', '🐉', '🧙', '🧚', '🧜', '⚔️', '🔮', '🏰'],
  },
  // 2026-05-07 (Wolf): Eurovision-Set fuer ESC-Watchparty.
  // 2026-05-07 v2 (Wolf-Bug 'in /team werden nur 8 flaggen angezeigt wenn
  // eurovision-set gewaehlt'): avatars-Liste war nur 8 Default-Slots, daher
  // Carousel hat nur 8 angezeigt. Jetzt alle ~47 ESC-Teilnehmer-Flaggen aus
  // dem ESC_FLAG_POOL — Spieler koennen ihr Heimatland frei waehlen.
  {
    id: 'esc',
    label: 'Eurovision',
    tint: '#ec4899',
    leadEmoji: '🎤',
    preview: ['🇸🇪', '🇮🇪', '🇮🇱'],
    source: 'emoji',
    avatars: ESC_FLAG_POOL,
  },
];

/** Whitelist fuer Backend-Validation. Aenderung hier MUSS auch im
 *  qqSocketHandlers.ts-Handler nachgezogen werden (manueller Sync). */
export const AVATAR_SET_IDS = AVATAR_SETS.map(s => s.id);

export const ALL_SET_ID = 'all';
export const DEFAULT_SET_ID = 'cozy3d';   // <- 2026-06-23: cozy3d-Tiere sind der neue System-Default

export function getSet(id: string | undefined): AvatarSet {
  if (!id) return AVATAR_SETS[0];
  return AVATAR_SETS.find(s => s.id === id) ?? AVATAR_SETS[0];
}

// ─── Display-Resolver ─────────────────────────────────────────────────────
// Single Source of Truth fuer „was rendert QQTeamAvatar gerade".
//
// Wichtig: avatarId bleibt der eindeutige Slot-Schluessel (Farb-Eindeutigkeit).
// Das Set bestimmt nur das DISPLAY: welcher Inhalt im Slot zu sehen ist.

export type AvatarDisplay =
  | { kind: 'png';   pngBase: string; pngClosed: string; color: string; label: string }
  | { kind: 'image'; src: string;     color: string; label: string }   // cozy3d 3D-Avatar
  | { kind: 'crest'; slug: string; src: string; color: string; label: string }  // CozyArena-Wappen (flach)
  | { kind: 'emoji'; emoji: string;   color: string; label: string };

export function getAvatarDisplay(
  avatarId: string,
  setId: string | undefined,
  /** Optional Server-gewuerfelte Slot-Emojis bei Set 'all'. Wenn 8 Eintraege
   *  vorhanden, ueberschreibt der Eintrag an `slotIdx` den Set-Default. */
  serverEmojis?: string[],
  /** Optional Team-spezifischer Emoji-Override (vom 3-Step-SetupFlow auf /team
   *  vom Spieler frei aus dem Set-Pool gewaehlt). Hat hoechste Prioritaet. */
  teamEmoji?: string,
): AvatarDisplay {
  // Slot-Index ueber QQ_AVATARS — das ist die kanonische 8-Slot-Liste mit Farben.
  const slotIdx = Math.max(0, QQ_AVATARS.findIndex(a => a.id === avatarId));
  const slot = QQ_AVATARS[slotIdx] ?? QQ_AVATARS[0];
  const set = getSet(setId);

  if (set.source === 'png') {
    return {
      kind: 'png',
      pngBase: `/avatars/cozy-cast/avatar-${slot.slug}.png`,
      pngClosed: `/avatars/cozy-cast/avatar-${slot.slug}-closed.png`,
      color: slot.color,
      label: slot.label,
    };
  }

  // Emoji-Source. Prio in absteigender Reihenfolge:
  //   1. teamEmoji (Spieler-Choice via /team 3-Step-Editor)
  //   2. Server-Override (bei 'all' vom Backend gewuerfelt)
  //   3. Set-Default (avatarSets[setId].avatars[slotIdx])
  //   4. Cozy-Tier-Fallback
  const candidates: (string | undefined)[] = [
    teamEmoji && teamEmoji.trim() ? teamEmoji.trim() : undefined,
    (set.id === 'all' && serverEmojis && serverEmojis.length === 8) ? serverEmojis[slotIdx] : undefined,
    set.avatars[slotIdx],
    COZY_ANIMALS_EMOJI[slotIdx],
    slot.emoji,
  ];
  let emoji = candidates.find((e): e is string => typeof e === 'string' && e.length > 0) ?? slot.emoji;

  // 2026-07-07 (Wolf 'im cozyArena-Set unten cozy-Animals statt Wappen'):
  // Im Wappen-Set ist das Fraktions-Wappen AUTORITATIV. Ein cozy3d-/Emoji-
  // teamEmoji (z.B. von Bots oder aus einem frueher gewaehlten Set) darf das
  // Wappen NICHT ueberschreiben — sonst zeigen ScoreBar/Standings/etc. an
  // Stellen ohne expliziten Crest-Override wieder Tier-Avatare. Nur ein
  // explizit gewaehltes ANDERES Wappen (isCrestSlug) darf gewinnen; alles
  // andere faellt auf das Slot-Wappen des Sets zurueck.
  if (set.id === 'cozyArena' && !isCrestSlug(emoji)) {
    const setCrest = set.avatars[slotIdx];
    if (isCrestSlug(setCrest)) emoji = setCrest;
  }

  // CozyArena: der „Emoji"-Kandidat ist ein Wappen-Slug → flaches Crest-Bild.
  if (isCrestSlug(emoji)) {
    return {
      kind: 'crest',
      slug: emoji,
      src: crestSrc(emoji),
      color: slot.color,
      label: crestLabel(emoji),
    };
  }

  // cozy3d: der „Emoji"-Kandidat ist in Wahrheit ein Avatar-Slug → Bild rendern.
  if (isCozy3dSlug(emoji)) {
    return {
      kind: 'image',
      src: cozy3dSrc(emoji),
      color: slot.color,
      label: cozy3dLabel(emoji),
    };
  }

  return {
    kind: 'emoji',
    emoji,
    color: slot.color,
    label: slot.label,
  };
}
