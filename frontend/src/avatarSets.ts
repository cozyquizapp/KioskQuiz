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
import { COZY_WOLF_SLUGS, isCozyWolfSlug, cozyWolfSrc, cozyWolfBlinkSrc, cozyWolfLabel } from './cozyWolves';
import { PARTY_SLUGS, isPartySlug, partySrc, partyLabel } from './partyAvatars';
import { QUIRK_SLUGS, isQuirkSlug, quirkBySlug, quirkLabel, quirkColorForSlot, quirkSrc, type QuirkActionType } from './quirksAvatars';
import { QUIRK2_SET_ID, QUIRK2_SLUGS, isQuirk2Slug, quirk2BySlug, quirk2Label, quirk2Src } from './quirks2Avatars';

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
  // 2026-07-19 (Wolf): CozyWölfe — 8 illustrierte Wölfe, je Slot eingefärbt
  // (slot-gebunden wie die Wappen). „avatars"=Wolf-Slugs (isCozyWolfSlug) →
  // ImageAvatar rendert das Wolf-PNG auf der Slot-Farb-Disc, mit 2-Frame-Blinzeln.
  // Charaktere (Slot/Farbe/Name/Wesen/Gender-Leaning):
  //   1 Orange Mika  — Gastgeber, charmant/führungsstark/warm/souverän (m)
  //   2 Grün   Nuri  — Beobachtung/Ruhe/Geduld, gelassen/trocken-humorvoll (neutral)
  //   3 Teal   Ari   — kühler Stratege, übersichtlich/ruhig/kontrolliert (neutral)
  //   4 Violett Ylva — elegante Taktikerin, intuitiv/geistreich/souverän (w)
  //   5 Gelb   Jori  — chaotischer Schnell-Denker, spontan/wild/unberechenbar (m)
  //   6 Blau   Levin — Analyst, Fokus/Kontrolle/Präzision/Rationalität (m)
  //   7 Pink   Maja  — Charisma/Motivation, sozial/schlagfertig/selbstbewusst (w)
  //   8 Rot    Rurik — Antreiber, Mut/Wettbewerb/Entschlossenheit (m)
  {
    id: 'cozyWolves',
    // 2026-07-20 (Wolf, AskUserQuestion): Anzeige-Label "Cozy Pack" — bilingual
    // (pack = Rudel), Cozy-Marken-Praefix, liest fuers EN-Live-Event sauber. Das
    // Label wird allen gezeigt (nicht uebersetzt). Interne id bleibt 'cozyWolves'
    // (ueberall referenziert: localStorage, isCozyWolfSlug, Set-Lookups).
    label: 'Cozy Pack',
    tint: '#EC4899',
    leadEmoji: '🐺',
    preview: ['🐺', '🌙', '🔥'],
    source: 'emoji',
    avatars: COZY_WOLF_SLUGS,
  },
  // 2026-07-28 (Wolf): Cozy Quirks — 8 animierte, slot-gebundene Charaktere
  // (Farbe ins Motiv gebacken, EINER je Farb-Slot wie Cozy Pack). Render =
  // ECKIGE Team-Kachel (nicht runde Disc) + 3-Frame-Animation (open/blink/quirk)
  // + Breathe. „avatars"=Quirk-Slugs (isQuirkSlug) → kind 'quirk'. Reihenfolge =
  // QQ_AVATARS-Slots; der Charakter wird IMMER aus dem Farb-Slot abgeleitet.
  {
    id: 'cozyQuirks',
    label: 'Cozy Quirks',
    tint: '#EC4899',
    leadEmoji: '😉',
    preview: ['🟠', '🟣', '🔴'],
    source: 'emoji',
    avatars: QUIRK_SLUGS,
  },
  // 2026-07-29 (Wolf): Cozy Quirks 2.0 — 8 eckige Kachel-Quirks, SLOT-GEBUNDEN
  // (Farbe fest ins Motiv gebacken, EINER je Farb-Slot wie Cozy Pack). 2-Frame
  // (base/blink), keine Action. Anderer Look als das freie V2-cozyQuirks.
  // „avatars"=Quirks-2.0-Slugs (isQuirk2Slug) → kind 'quirk' ohne actionSrc.
  {
    id: QUIRK2_SET_ID,
    label: 'Cozy Quirks 2.0',
    tint: '#EC4899',
    leadEmoji: '😏',
    preview: ['🟠', '🔵', '🩷'],
    source: 'emoji',
    avatars: QUIRK2_SLUGS,
  },
  // 2026-07-28 (Wolf): Party 3D — 10 neutrale Party-Objekte (Discokugel, Sekt,
  // Cocktail, Torte, Geschenk, Ballons, Konfetti, Würfel, Partyhut, Mikrofon).
  // Modell = cozy3d: neutrales Objekt auf der Slot-Farb-Disc, FREI kombinierbar
  // (kein slot-binding — teamEmoji gewinnt). „avatars"=Party-Slugs (isPartySlug)
  // → image-Zweig rendert das PNG auf der Farb-Disc. Erwachsener Look für
  // Geburtstage/Feiern. Die ersten 8 Slugs = Default-Belegung der 8 Farb-Slots.
  {
    id: 'cozyParty',
    label: 'Party 3D',
    tint: '#EC4899',
    leadEmoji: '🎉',
    preview: ['🪩', '🎂', '🎁'],
    source: 'emoji',
    avatars: PARTY_SLUGS,
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
  | { kind: 'image'; src: string;     color: string; label: string; blinkSrc?: string; discFill?: number }   // cozy3d / CozyWolf (blinkSrc = expliziter Blink-Frame; discFill = Disc-Fuellung, Default cozy3d 0.9)
  | { kind: 'crest'; slug: string; src: string; color: string; label: string }  // CozyArena-Wappen (flach)
  // Cozy Quirks: animierter slot-gebundener Charakter auf ECKIGER Team-Kachel.
  // 3 Frames (open/closed/action) + Wolfs Per-Avatar-Timings.
  // actionSrc & Co. optional: cozyQuirks (V2) hat 3 Frames (open/closed/action),
  // cozyQuirks2 nur 2 (base/blink) → kein action-Layer.
  | { kind: 'quirk'; color: string; label: string; openSrc: string; closedSrc: string; actionSrc?: string;
      actionType?: QuirkActionType; delay: number; blink: number; actionTime?: number; actionDelay?: number }
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

  // CozyWölfe-Set ist slot-gebunden: EIN Wolf je Farbe. Der Wolf wird IMMER aus
  // dem Farb-Slot abgeleitet, nie aus einem (evtl. abweichenden) teamEmoji.
  // 2026-07-20 (Wolf): sonst sitzt z.B. der blaue Wolf auf oranger Disc — die
  // Augenfarbe MUSS die Teamfarbe matchen. Es gibt keinen gueltigen „anderer
  // Wolf gewinnt"-Fall (anders als bei cozy3d, wo man frei mischen darf), daher
  // ohne die alte !isCozyWolfSlug-Ausnahme: der Slot-Wolf gewinnt bedingungslos.
  if (set.id === 'cozyWolves') {
    const setWolf = set.avatars[slotIdx];
    if (isCozyWolfSlug(setWolf)) emoji = setWolf;
  }

  // Cozy Quirks 2.0 ist slot-gebunden: EIN Design je Farbe (Farbe fest gebacken).
  // Das Design IMMER aus dem Slot ableiten (wie Cozy Pack), nie aus abweichendem
  // teamEmoji — sonst säße z.B. das orange Motiv im grünen Slot.
  if (set.id === QUIRK2_SET_ID) {
    const setQ2 = set.avatars[slotIdx];
    if (isQuirk2Slug(setQ2)) emoji = setQ2;
  }

  // Cozy Quirks V2 (2026-07-28): FREI kombinierbar (10 Designs × 8 Farben). Das
  // Design kommt aus teamEmoji (oder Set-Default je Slot), die Farbe IMMER vom
  // Slot → KEIN slot-binding-Override (wie cozy3d/Party). Der teamEmoji-Design-
  // Slug gewinnt; Default = set.avatars[slotIdx] (erste 8 Designs).

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

  // Party 3D: neutrales Party-Objekt auf der Slot-Farb-Disc. Frei kombinierbar
  // (kein slot-binding wie cozy3d), daher KEIN Override oben — der teamEmoji-Slug
  // gewinnt, Default = set.avatars[slotIdx].
  if (isPartySlug(emoji)) {
    return {
      kind: 'image',
      src: partySrc(emoji),
      color: slot.color,
      label: partyLabel(emoji),
    };
  }

  // Cozy Quirks: animiertes Design auf eckiger Team-Kachel. Design aus emoji,
  // Farbe (WebP-Ordner) aus dem Slot → frei kombinierbar. 3 Frames + Timings.
  if (isQuirkSlug(emoji)) {
    const q = quirkBySlug(emoji)!;
    const colorToken = quirkColorForSlot(slotIdx);
    return {
      kind: 'quirk',
      color: slot.color,
      label: quirkLabel(emoji),
      openSrc: quirkSrc(colorToken, q.design, 'open'),
      closedSrc: quirkSrc(colorToken, q.design, 'closed'),
      actionSrc: quirkSrc(colorToken, q.design, 'action'),
      actionType: q.action,
      delay: q.delay,
      blink: q.blink,
      actionTime: q.actionTime,
      actionDelay: q.actionDelay,
    };
  }

  // Cozy Quirks 2.0: eckige Kachel mit fest gebackener Farbe (slot-gebunden),
  // 2 Frames (base/blink), KEINE action. Gleicher kind 'quirk', nur ohne
  // actionSrc → QuirkAvatar rendert nur open+blink.
  if (isQuirk2Slug(emoji)) {
    const q = quirk2BySlug(emoji)!;
    return {
      kind: 'quirk',
      color: slot.color,
      label: quirk2Label(emoji),
      openSrc: quirk2Src(q.id, 'open'),
      closedSrc: quirk2Src(q.id, 'closed'),
      delay: q.delay,
      blink: q.blink,
    };
  }

  // CozyWölfe: illustriertes Wolf-PNG auf der Slot-Farb-Disc, mit explizitem
  // Blink-Frame (open/blink). Slug slot-gebunden (ein Wolf je Farbe).
  if (isCozyWolfSlug(emoji)) {
    return {
      kind: 'image',
      src: cozyWolfSrc(emoji),
      blinkSrc: cozyWolfBlinkSrc(emoji),
      color: slot.color,
      label: cozyWolfLabel(emoji),
      // 2026-07-20 (Wolf „gross rein, nichts abschneiden"): Woelfe fuellen die
      // Disc mehr als die cozy3d-Tiere (0.9). 1.0 = spuerbar groesser, overflow
      // bleibt sichtbar → Ohren beruehren die Kante, werden aber NICHT gekappt
      // (gemessen: blau reicht oben bis 0% Rand). 106% stuende raus, 100% ist rein.
      discFill: 1.0,
    };
  }

  return {
    kind: 'emoji',
    emoji,
    color: slot.color,
    label: slot.label,
  };
}
