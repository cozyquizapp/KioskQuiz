// 2026-05-04 — Avatar-Sets fuer Quiz-Lobbies
// Default = 'all' (Emoji-Standard, freie Wahl). 'cozyCast' ist die opt-in
// PNG-Variante (klassische Canva-Tier-Avatare). Themen-Sets ueberschreiben.
//
// Phase 2: getAvatarDisplay() ist der Single Source of Truth fuer den Renderer.
// QQTeamAvatar liest setId aus dem Context und fragt diesen Helper, was zu
// rendern ist (PNG-Pfad oder Emoji + Hintergrund-Farbe).

import { QQ_AVATARS } from '../../shared/quarterQuizTypes';

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

export const AVATAR_SETS: AvatarSet[] = [
  {
    id: 'all',
    label: 'Alle',
    tint: '#a78bfa',
    leadEmoji: '✨',
    preview: ['🐨', '🎃', '🚀'],
    source: 'emoji',
    avatars: COZY_ANIMALS_EMOJI,    // bei 'all' nutzen wir die Cozy-Tiere als Default-Display
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
  {
    id: 'cozyCast',
    label: 'CozyCast (PNG)',
    tint: '#FA507F',
    leadEmoji: '🐕',
    preview: ['🦥', '🐧', '🐨'],
    source: 'png',
    avatars: [],   // PNGs kommen via QQ_AVATARS direkt
  },
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
];

/** Whitelist fuer Backend-Validation. Aenderung hier MUSS auch im
 *  qqSocketHandlers.ts-Handler nachgezogen werden (manueller Sync). */
export const AVATAR_SET_IDS = AVATAR_SETS.map(s => s.id);

export const ALL_SET_ID = 'all';
export const DEFAULT_SET_ID = 'all';   // <- der globale System-Default

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
  | { kind: 'emoji'; emoji: string;   color: string; label: string };

export function getAvatarDisplay(
  avatarId: string,
  setId: string | undefined,
  /** Optional Server-gewuerfelte Slot-Emojis bei Set 'all'. Wenn 8 Eintraege
   *  vorhanden, ueberschreibt der Eintrag an `slotIdx` den Set-Default. */
  serverEmojis?: string[],
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

  // Emoji-Source. Prio: Server-Override (bei 'all') > Set-Default > Cozy-Tier-Fallback.
  const overrideEmoji = (set.id === 'all' && serverEmojis && serverEmojis.length === 8)
    ? serverEmojis[slotIdx]
    : undefined;
  const emoji = overrideEmoji ?? set.avatars[slotIdx] ?? COZY_ANIMALS_EMOJI[slotIdx] ?? slot.emoji;
  return {
    kind: 'emoji',
    emoji,
    color: slot.color,
    label: slot.label,   // Tier-Label bleibt fuer Aria/Tooltip; Display zeigt Emoji
  };
}
