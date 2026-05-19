// ── CozyGames — Shared Types ─────────────────────────────────────────────────
// Analoge Real-Life-Mini-Spiele die im Quiz als Brand-Differenziator gegen
// klassisches Pubquiz eingebaut werden. Konzept-Doku: COZYGAMES.md im Repo-Root.
//
// Position im Quiz: nach Runde 1 + Final-Slot.
// Wertung: 1. Platz = 1 Aktion in der aktuellen Phase (wie Frage-Sieger).
// Aktivierung: cozyGamesEnabled-Toggle pro QQDraft.

export type CozyGameSetting = 'tisch' | 'steh' | 'wand' | 'boden';
export type CozyGameNoiseLevel = 'leise' | 'mittel' | 'laut';
export type CozyGameScoringType =
  | 'countIn60s'      // Anzahl Treffer/Erfolge in 60s — höchste Zahl gewinnt
  | 'timeToFinish'    // Schnellste Zeit bis Erfolgs-Bedingung — geringste Zeit gewinnt
  | 'distance'        // Distanz/Weite — größte Distanz gewinnt
  | 'height'          // Höhe/Türmchen — größte Höhe gewinnt
  | 'lastStanding';   // Letzter der durchhält — längste Zeit gewinnt

export const COZY_GAME_SETTING_LABELS: Record<CozyGameSetting, { de: string; en: string; emoji: string }> = {
  tisch: { de: 'Tisch',       en: 'Table',       emoji: '🪑' },
  steh:  { de: 'Steh-Bereich',en: 'Standing',    emoji: '🚶' },
  wand:  { de: 'Wand',        en: 'Wall',        emoji: '🧱' },
  boden: { de: 'Boden',       en: 'Floor',       emoji: '🌍' },
};

export const COZY_GAME_NOISE_LABELS: Record<CozyGameNoiseLevel, { de: string; en: string; emoji: string }> = {
  leise:  { de: 'leise',  en: 'quiet',  emoji: '🔇' },
  mittel: { de: 'mittel', en: 'medium', emoji: '🔉' },
  laut:   { de: 'laut',   en: 'loud',   emoji: '🔊' },
};

export const COZY_GAME_SCORING_LABELS: Record<CozyGameScoringType, { de: string; en: string }> = {
  countIn60s:   { de: 'Anzahl in 60s',         en: 'Count in 60s' },
  timeToFinish: { de: 'Schnellste Zeit',       en: 'Fastest time' },
  distance:     { de: 'Größte Distanz',        en: 'Largest distance' },
  height:       { de: 'Größte Höhe',           en: 'Largest height' },
  lastStanding: { de: 'Letzter durchhält',     en: 'Last standing' },
};

/** Globaler Material-Tag-Pool (V1). Editor kann via Tag-Editor erweitert werden. */
export const COZY_GAME_MATERIAL_TAGS_V1 = [
  'TT-Ball', 'Stäbchen', 'Eimer', 'Magnete', 'Ballon', 'Gabel',
  'Spielzeugauto', 'Bierdeckel', 'Münzen', 'Pappbecher', 'Gummis',
  'Bausteine', 'Plastikbecher', 'Karten', 'Strohhalm', 'Süßigkeit',
  'Wäscheklammer', 'Wurfringe', 'Action-Sport-Set', 'Wattebausch',
  'Flasche', 'Teller',
] as const;

/** Ein einzelnes CozyGame im Katalog. */
export interface CozyGame {
  id: string;
  emoji: string;
  name: string;
  /** Markdown-Ablauf-Beschreibung (2-4 Zeilen). */
  description: string;
  /** Material-Tags fürs Filter-System. Free-Text-Tags zusätzlich erlaubt. */
  materialTags: string[];
  /** Setting/Location-Anforderung. */
  setting: CozyGameSetting;
  /** Lärm-Level für Café-/Bar-Filter. */
  noiseLevel: CozyGameNoiseLevel;
  /** Wertungs-Typ — bestimmt UI-Anzeige + Sieger-Wahl-Logik. */
  scoringType: CozyGameScoringType;
  /** Optionale freitext Notiz zur Wertung (z.B. „Heruntergefallene zählen nicht"). */
  scoringNote?: string;
  /** True = im V1-Seed enthalten (kann nicht via Editor gelöscht werden, nur deaktiviert). */
  isSeed?: boolean;
  /** True wenn Wolf das Spiel im Editor deaktiviert hat (nicht mehr auswählbar im Builder). */
  archived?: boolean;
  /**
   * 2026-05-17 (Wolf): Manche Spiele können nicht parallel gespielt werden
   * (z.B. nur ein Stäbchen-Set, oder ein Reaktions-Buzzer). Bei `false`
   * spielen Teams nacheinander (Sequence-Modus) — sortiert nach
   * largestConnected DESC, totalCells DESC, random bei Tie. Default
   * (undefined/true) = parallel (aktuelles Verhalten).
   */
  parallel?: boolean;
  createdAt: number;
  updatedAt: number;
}

// ── Round State (für QQStateUpdate.cozyGame) ─────────────────────────────────
// Flow (Wolf 2026-05-17): kommt NACH dem Grid-Setz-Flow der vorigen Frage.
//   QUESTION_REVEAL → PLACEMENT → Grid (bestehend)
//   → COZY_GAME-Phase:
//      INTRO → WHEEL_SPIN → WHEEL_RESULT → GAME_ACTIVE → WINNER_SELECT
//   → PLACEMENT (mit pendingAction, bestehender Setz-Flow)
//   → Grid → nächste Runde
export type CozyGameRoundPhase =
  | 'INTRO'           // Brand-Moment-Intro analog zu PHASE_INTRO/Kategorie-Intro — „Jetzt: CozyGame!"
  | 'WHEEL_SPIN'      // Glücksrad spinnt — keine Mod-Aktion außer "warte"
  | 'WHEEL_RESULT'    // Rad ist gelandet, Spiel-Card wird angezeigt — Mod startet als nächstes Spiel
  | 'GAME_ACTIVE'     // 60s Spiel läuft, Timer zeigt Countdown — Mod kann jederzeit "Stop" drücken
  | 'WINNER_SELECT';  // Spiel zu Ende, Mod wählt Sieger-Team(s) → setzt pendingAction → PLACEMENT

export interface CozyGameRoundState {
  /** Welche Spiele sind im Pool für diesen Quiz (aus QQDraft.cozyGamesPool). */
  poolGameIds: string[];
  /** Spiele die in diesem Run bereits gespielt wurden (Shrink-Logik). */
  playedGameIds: string[];
  /** Aktuelle Phase im CozyGame-Flow. */
  phase: CozyGameRoundPhase;
  /** ID des gerade gespielten/zu spielenden Spiels (nach WHEEL_RESULT gesetzt). */
  activeGameId: string | null;
  /** RNG-Seed für deterministischen Spin (Backend würfelt, Frontend rendert) — Slice-Index 0..N-1. */
  wheelTargetSliceIndex: number | null;
  /** ms-Timestamp wann Spiel-Timer endet (für 60s-Countdown im GAME_ACTIVE).
   *  Bei pausiertem Timer: null + timerPausedRemainingMs gesetzt. */
  gameEndsAt: number | null;
  /** Slot im Quiz: 'roundPause' = nach Runde 1, 'finalSlot' = Final-Runde-Kategorie. */
  slotKind: 'roundPause' | 'finalSlot';
  /** Sieger-Team-IDs (1 bei Klar-Sieg, mehrere bei Tie). Wird in WINNER_SELECT befüllt. */
  winnerTeamIds: string[];

  // ── Play-Mode (2026-05-17 Wolf): Parallel vs. Sequence ──────────────────
  /**
   * 'parallel' = alle Teams gleichzeitig (1 Timer, aktuelles Verhalten).
   * 'sequence' = Teams nacheinander (1 Timer pro Team-Turn).
   * Wird beim qqCozyGameStartGame aus CozyGame.parallel abgeleitet.
   */
  playMode?: 'parallel' | 'sequence';
  /** Bei sequence: sortierte Team-IDs (largestConnected DESC, totalCells DESC, random bei Tie). */
  sequenceOrder?: string[];
  /** Bei sequence: 0-based Index des Teams das gerade spielt. */
  sequenceCurrentIdx?: number;
  /** Bei sequence: Team-IDs die ihren Turn schon hatten (für „fertig"-Anzeige). */
  sequenceCompletedTeamIds?: string[];

  // ── Timer-Controls (2026-05-17 Wolf): Mod-anpassbar ─────────────────────
  /**
   * Bei Pause: verbleibende ms (gameEndsAt ist dann null).
   * Bei Resume: zurück auf null setzen, gameEndsAt neu rechnen.
   */
  timerPausedRemainingMs?: number;
  /** Initiale Timer-Dauer in Sekunden (für Reset-Button). Default 60. */
  timerDurationSec?: number;
}

// ── V1-Seed: 12 Spiele ───────────────────────────────────────────────────────
// Diese werden beim ersten Backend-Start in die DB geschrieben (idempotent —
// nur wenn DB leer). Wolf kann später via /cozygames-Editor archivieren.

const SEED_TIMESTAMP = 1715900000000; // 2026-05-17 Wolf-Konzept-Date, fixed für Idempotenz

export const COZY_GAME_V1_SEED: CozyGame[] = [
  // ── Mund/Atem (3) ──
  {
    id: 'cg-watt-puste',
    emoji: '🌬️',
    name: 'Wattebausch-Pusten',
    description: 'Wattebausch mit Strohhalm in Zielzone (Teller) pusten. Anzahl in 60s.',
    materialTags: ['Wattebausch', 'Strohhalm', 'Teller'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-mm-strohhalm',
    emoji: '🍭',
    name: 'M&M-Strohhalm-Transport',
    description: 'Strohhalm an M&M ansaugen (Vakuum), zum zweiten Teller tragen, fallenlassen. Anzahl in 60s.',
    materialTags: ['Strohhalm', 'Süßigkeit', 'Teller'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-ballon-puste',
    emoji: '🎈',
    name: 'Luftballon-Pusten-Hochhalten',
    description: 'Ballon nur durch Anpusten in der Luft halten, keine Hände. Zeit bis Bodenberührung — längste Zeit gewinnt.',
    materialTags: ['Ballon'],
    setting: 'steh',
    noiseLevel: 'leise',
    scoringType: 'lastStanding',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },

  // ── Stapel/Bau (3) ──
  {
    id: 'cg-muenzturm',
    emoji: '🪙',
    name: 'Münzturm einhändig',
    description: 'Eine Hand baut, andere bleibt unter dem Tisch. Höchster Turm in 60s.',
    materialTags: ['Münzen'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'height',
    scoringNote: 'Höhe = Anzahl gestapelter Münzen am Ende der 60s.',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-karten-haus',
    emoji: '🃏',
    name: 'Karten-Haus 3 Stockwerke',
    description: 'Schnellste Zeit für stabiles 3-Stockwerk-Kartenhaus. Niemand schafft\'s in 60s → höchster Versuch zählt.',
    materialTags: ['Karten'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'timeToFinish',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-sport-stacking',
    emoji: '🥤',
    name: 'Sport-Stacking Becher-Pyramide',
    description: '10 Becher zu 3-2-1 Pyramide aufbauen + wieder abbauen. Schnellste Zeit gewinnt.',
    materialTags: ['Plastikbecher', 'Action-Sport-Set'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'timeToFinish',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },

  // ── Wurf/Ziel (5) ──
  {
    id: 'cg-bierdeckel-muenzen',
    emoji: '🛟',
    name: 'Bierdeckel-Rettungsringe',
    description: 'Bierdeckel schwimmen als „Rettungsringe", Spieler wirft Münzen aus Distanz drauf. Treffer in 60s.',
    materialTags: ['Bierdeckel', 'Münzen'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-staebchen-eimer',
    emoji: '🥢',
    name: 'Stäbchen-Eimer',
    description: 'Mit Essstäbchen TT-Bälle aufnehmen und in Eimer befördern. Treffer in 60s. Kein Fingerwurf erlaubt.',
    materialTags: ['Stäbchen', 'TT-Ball', 'Eimer'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-ringwurf',
    emoji: '🪢',
    name: 'Ringwurf auf Flaschenhals',
    description: 'Wurfringe auf Flaschenhals werfen, Treffer (Ring bleibt am Hals) in 60s.',
    materialTags: ['Wurfringe', 'Flasche', 'Action-Sport-Set'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-waescheklammer-glas',
    emoji: '🧷',
    name: 'Wäscheklammer in Glas',
    description: 'Spieler steht über Glas, hält Klammer auf Brust-Höhe (Hand am Kinn), lässt fallen. Treffer in 60s.',
    materialTags: ['Wäscheklammer', 'Flasche'],
    setting: 'steh',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'cg-gummi-pyramide',
    emoji: '🎯',
    name: 'Gummi-Pyramide',
    description: 'Pappbecher-Pyramide steht, mit Haushaltsgummis abschießen. Anzahl umgefallener Becher in 60s. Bei alle weg: schnellste Zeit gewinnt.',
    materialTags: ['Pappbecher', 'Gummis'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    scoringNote: 'Sonderfall: bei mehreren Teams die alle Becher abräumen → schnellste Zeit entscheidet.',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },

  // ── Hand-Geschick (1) ──
  {
    id: 'cg-tt-ball-sammeln',
    emoji: '🏓',
    name: 'TT-Ball-Sammeln',
    description: 'Start mit TT-Ball in Hand. Sequenz: Ball hoch → 1 Spielstein aufnehmen → Ball fangen → Ball hoch → 2. Stein aufnehmen → … Steine bleiben in Hand. Beste Serie in 60s.',
    materialTags: ['TT-Ball'],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    scoringNote: 'Serie endet bei Ball- oder Stein-Fall, sofort Neustart. Beste Serie = max. gleichzeitig gehaltene Steine.',
    isSeed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const COZY_GAME_V1_SEED_IDS = COZY_GAME_V1_SEED.map(g => g.id);
