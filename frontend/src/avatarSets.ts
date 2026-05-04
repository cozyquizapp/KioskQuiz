// 2026-05-04 — Avatar-Sets für /testpage Lobby-Setup
// Pro Event ein Theme; "all" ist Default und legt sich nicht fest.
// Beim Wechsel auf ein spezifisches Set werden alle 8 Team-Emojis gemappt.

export type AvatarSet = {
  id: string;
  label: string;
  /** Tint für Karten-Glow + aktiver Border-Glow im Set-Picker. */
  tint: string;
  /** Großes Emoji im Karten-Zentrum (kommuniziert das Theme). */
  leadEmoji: string;
  /** 3 Begleit-Emojis als Mini-Reihe drunter (Vorschau, was drinsteckt). */
  preview: string[];
  /** 8 Avatare für die 8 Team-Slots; bei "all" leer (kein Auto-Map). */
  avatars: string[];
};

export const AVATAR_SETS: AvatarSet[] = [
  {
    id: 'all',
    label: 'Alle',
    tint: '#a78bfa',
    leadEmoji: '✨',
    preview: ['🐨', '🎃', '🚀'],
    avatars: [],            // kein Auto-Map — User pickt frei
  },
  {
    id: 'cozyAnimals',
    label: 'Cozy Animals',
    tint: '#9DCB2F',
    leadEmoji: '🐨',
    preview: ['🐶', '🦥', '🐹'],
    avatars: ['🐶', '🦥', '🐧', '🐨', '🦒', '🦝', '🐄', '🐹'],
  },
  {
    id: 'halloween',
    label: 'Halloween',
    tint: '#f97316',
    leadEmoji: '🎃',
    preview: ['👻', '🦇', '💀'],
    avatars: ['👻', '🎃', '🧙', '🧛', '🦇', '💀', '🧟', '🕷️'],
  },
  {
    id: 'christmas',
    label: 'Weihnachten',
    tint: '#dc2626',
    leadEmoji: '🎄',
    preview: ['🎅', '🦌', '☃️'],
    avatars: ['🎅', '🤶', '🦌', '☃️', '🧝', '🎄', '⛄', '🎁'],
  },
  {
    id: 'pub',
    label: 'Pub & Bar',
    tint: '#d97706',
    leadEmoji: '🍻',
    preview: ['🍕', '🎯', '🃏'],
    avatars: ['🍻', '🍕', '🌮', '🎯', '🃏', '🎲', '🥨', '🍔'],
  },
  {
    id: 'scifi',
    label: 'Sci-Fi',
    tint: '#6366f1',
    leadEmoji: '🚀',
    preview: ['👽', '🤖', '🛸'],
    avatars: ['🚀', '👽', '🤖', '🛸', '🪐', '⭐', '👾', '🌌'],
  },
  {
    id: 'sport',
    label: 'Sport',
    tint: '#22c55e',
    leadEmoji: '🏆',
    preview: ['⚽', '🏀', '🎾'],
    avatars: ['⚽', '🏀', '🎾', '🏆', '🥇', '🎳', '🥊', '🏓'],
  },
  {
    id: 'tropical',
    label: 'Tropical',
    tint: '#06b6d4',
    leadEmoji: '🌴',
    preview: ['🦩', '🐬', '🍍'],
    avatars: ['🦩', '🐬', '🦜', '🐢', '🌴', '🍍', '🥥', '🌺'],
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    tint: '#ec4899',
    leadEmoji: '🦄',
    preview: ['🐉', '🧚', '🔮'],
    avatars: ['🦄', '🐉', '🧙', '🧚', '🧜', '⚔️', '🔮', '🏰'],
  },
];

export const ALL_SET_ID = 'all';

export function getSet(id: string): AvatarSet {
  return AVATAR_SETS.find(s => s.id === id) ?? AVATAR_SETS[0];
}
