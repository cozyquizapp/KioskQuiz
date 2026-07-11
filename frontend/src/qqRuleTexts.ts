/**
 * Editierbare Regel-Texte mit localStorage-Override.
 *
 * Wolf 2026-05-05: Wolf will Regeltexte ohne Code-Edit ändern können.
 * - Default-Texte sind hier hart kodiert (Quelle der Wahrheit für Render-Code).
 * - Custom-Overrides werden in localStorage als JSON gespeichert.
 * - getRuleText(key, lang, fallback) gibt Override zurück wenn da, sonst Fallback.
 * - Editor-Page (QQRulesEditorPage) bearbeitet die Overrides direkt.
 *
 * Bei neuen Texten: in RULE_TEXT_GROUPS unten registrieren, im Render-Code
 * via `getRuleText(key, lang, fallbackString)` lesen. Default-String bleibt
 * im Render-Code stehen — falls localStorage ausfällt, ist alles spielbar.
 */

const STORAGE_KEY = 'qq-rule-overrides-v1';

export type RuleLang = 'de' | 'en';

export interface RuleTextItem {
  key: string;
  label: string;          // UI-Label im Editor
  defaultDe: string;
  defaultEn: string;
  multiline?: boolean;    // textarea statt input
}

export interface RuleTextGroup {
  id: string;
  title: string;          // im Editor angezeigt
  description?: string;   // optionale Erklärung pro Gruppe
  items: RuleTextItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage I/O
// ─────────────────────────────────────────────────────────────────────────────

type OverrideMap = Record<string, { de?: string; en?: string }>;

function readOverrides(): OverrideMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed as OverrideMap : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: OverrideMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    // Notify listeners (Editor + render-side consumers via re-render).
    window.dispatchEvent(new CustomEvent('qq-rule-overrides-changed'));
  } catch {
    // Quota oder kaputter Storage: still
  }
}

/** Liefert den aktuellen Override für (key, lang) oder undefined. */
export function getRuleOverride(key: string, lang: RuleLang): string | undefined {
  const map = readOverrides();
  const entry = map[key];
  if (!entry) return undefined;
  const val = entry[lang];
  return (typeof val === 'string' && val.length > 0) ? val : undefined;
}

/** Liefert Override falls da, sonst fallback. */
export function getRuleText(key: string, lang: RuleLang, fallback: string): string {
  return getRuleOverride(key, lang) ?? fallback;
}

/** Schreibt einen Override (oder löscht, wenn value leer ist). */
export function setRuleOverride(key: string, lang: RuleLang, value: string): void {
  const map = readOverrides();
  const trimmed = value.trim();
  if (!trimmed) {
    if (map[key]) {
      delete map[key][lang];
      if (!map[key].de && !map[key].en) delete map[key];
    }
  } else {
    if (!map[key]) map[key] = {};
    map[key][lang] = trimmed;
  }
  writeOverrides(map);
}

/** Löscht alle Overrides eines Keys (DE + EN). */
export function resetRuleText(key: string): void {
  const map = readOverrides();
  if (map[key]) {
    delete map[key];
    writeOverrides(map);
  }
}

/** Löscht ALLE Rule-Overrides. */
export function resetAllRuleTexts(): void {
  writeOverrides({});
}

/** Snapshot aller Overrides — nützlich für Editor-State. */
export function getAllRuleOverrides(): OverrideMap {
  return readOverrides();
}

// ─────────────────────────────────────────────────────────────────────────────
// React-Hook für Render-Code: bekommt re-renders wenn Overrides sich ändern.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function useRuleOverridesVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion(v => v + 1);
    window.addEventListener('qq-rule-overrides-changed', handler);
    window.addEventListener('storage', handler); // anderes Tab
    return () => {
      window.removeEventListener('qq-rule-overrides-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return version;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY: alle editierbaren Texte mit Defaults
//
// Keys verwenden ein flaches Schema z.B. „rules.slide1.title" damit der
// Render-Code lesbar bleibt. Defaults müssen exakt mit den fest verdrahteten
// Strings im Render-Code übereinstimmen — wenn du dort etwas änderst, hier
// nachziehen, sonst spielen die Defaults im Editor nicht mehr.
// ─────────────────────────────────────────────────────────────────────────────

export const RULE_TEXT_GROUPS: RuleTextGroup[] = [
  // ───────────── Spielregeln-Folien (Welcome → 8 Folien) ─────────────────────
  {
    id: 'rules-slides',
    title: 'Spielregeln-Folien',
    description: 'Die 8 großen Folien nach „Willkommen". Title + 1–3 Zeilen + optionaler Extra-Hinweis.',
    items: [
      // Slide 1: Das Ziel
      { key: 'rules.slide1.title',  label: '1 · Das Ziel — Titel',   defaultDe: 'Das Ziel', defaultEn: 'The Goal' },
      { key: 'rules.slide1.line1',  label: '1 · Das Ziel — Zeile 1', defaultDe: 'Größtes zusammenhängendes Gebiet gewinnt', defaultEn: 'Largest connected area wins' },

      // Slide 2: So läuft's
      { key: 'rules.slide2.title',  label: '2 · So läuft\'s — Titel',   defaultDe: 'So läuft\'s', defaultEn: 'How It Works' },
      { key: 'rules.slide2.line1',  label: '2 · So läuft\'s — Zeile 1 (mit {phases})', defaultDe: '{phases} Runden · 5 Kategorien', defaultEn: '{phases} rounds · 5 categories' },
      { key: 'rules.slide2.line2',  label: '2 · So läuft\'s — Zeile 2', defaultDe: 'Richtige Antwort → Feld setzen', defaultEn: 'Right answer → place a cell' },
      { key: 'rules.slide2.line3',  label: '2 · So läuft\'s — Zeile 3', defaultDe: 'Schnellste richtige Antwort setzt zuerst', defaultEn: 'Fastest correct answer places first' },

      // Slide 3: Roadmap (treeShowcase — kein Body-Text außer Title)
      { key: 'rules.slide3.title',  label: '3 · Roadmap — Titel', defaultDe: 'Dein Weg durchs Quiz', defaultEn: 'Your Quiz Roadmap' },
      { key: 'rules.slide3.hint',   label: '3 · Roadmap — Hinweis-Text', defaultDe: '5 Kategorien pro Runde, jede mit eigenem Twist', defaultEn: '5 categories per round, each with its own twist' },

      // Slide 4: Joker
      { key: 'rules.slide4.title',  label: '4 · Joker — Titel', defaultDe: 'Joker-Bonus', defaultEn: 'Joker Bonus' },
      { key: 'rules.slide4.line1',  label: '4 · Joker — Zeile 1', defaultDe: '2×2-Block oder 4 in einer Reihe = 1 Bonus-Feld', defaultEn: '2×2 block or 4 in a row = 1 bonus tile' },
      { key: 'rules.slide4.line2',  label: '4 · Joker — Zeile 2', defaultDe: 'Max. 2 Joker pro Team', defaultEn: 'Max 2 jokers per team' },
      { key: 'rules.slide4.gridLabel', label: '4 · Joker — Grid-Label', defaultDe: 'Beide Muster zählen', defaultEn: 'Both patterns count' },

      // Slide 5 „Neue Fähigkeiten" 2026-05-09 entfernt — Klauen/Stapeln werden
      // beim Runden-Intro (R2/R3) als Überraschung enthüllt (3D-Card-Flip mit
      // NEU-Badge). Editor-Keys mit raus, sonst sieht Wolf hier Items, die im
      // Render nirgends auftauchen.

      // Slide 6: Bunte Tüte
      { key: 'rules.slide6.title',  label: '6 · Bunte Tüte — Titel', defaultDe: 'Bunte Tüte', defaultEn: 'Lucky Bag' },
      { key: 'rules.slide6.line1',  label: '6 · Bunte Tüte — Zeile 1', defaultDe: 'Eine Kategorie pro Runde ist eine Überraschung', defaultEn: 'One category per round is a surprise' },
      { key: 'rules.slide6.line2',  label: '6 · Bunte Tüte — Zeile 2', defaultDe: 'Jede Runde ein anderes Format', defaultEn: 'A different format each round' },
      { key: 'rules.slide6.extra',  label: '6 · Bunte Tüte — Extra-Hinweis', defaultDe: 'Regeln werden vor jeder Frage kurz erklärt', defaultEn: 'Rules explained before each question' },

      // Slide CozyGame (zwischen Bunte Tüte und Comeback, nur sichtbar wenn cozyGamesEnabled)
      { key: 'rules.slide_cozygames.title', label: 'CozyGame — Titel', defaultDe: 'CozyGame', defaultEn: 'CozyGame' },
      { key: 'rules.slide_cozygames.line1', label: 'CozyGame — Zeile 1', defaultDe: 'Nach jeder Runde dreht das Glücksrad: ein analoges Mini-Spiel', defaultEn: 'After every round the wheel spins: one analog mini-game' },
      { key: 'rules.slide_cozygames.line2', label: 'CozyGame — Zeile 2', defaultDe: 'Sieger setzt 1 Aktion auf dem Brett · Geschick > Wissen', defaultEn: 'Winner places 1 action on the board · skill > knowledge' },

      // Slide 7: Comeback
      { key: 'rules.slide7.title',  label: '7 · Comeback — Titel', defaultDe: 'Comeback', defaultEn: 'Comeback' },
      { key: 'rules.slide7.line1',  label: '7 · Comeback — Zeile 1', defaultDe: 'Letztes Team holt vor dem Finale auf', defaultEn: 'Last-place team catches up before the finale' },
      { key: 'rules.slide7.line2',  label: '7 · Comeback — Zeile 2', defaultDe: '„Mehr oder Weniger?": Treffer klaut Feld vom 1. Platz', defaultEn: '„Higher or Lower?": correct answer steals a cell from the leader' },

      // Slide Final-Tipp (vor dem Finale)
      { key: 'rules.slide_final_tip.title', label: 'Final-Tipp — Titel', defaultDe: 'Final-Tipp', defaultEn: 'Final Tip' },
      { key: 'rules.slide_final_tip.line1', label: 'Final-Tipp — Zeile 1', defaultDe: 'Vor dem Finale tippt jedes Team auf ein anderes (oder eigenes) Team', defaultEn: 'Before the finale every team tips on another (or own) team' },
      { key: 'rules.slide_final_tip.line2', label: 'Final-Tipp — Zeile 2', defaultDe: 'Pro gewonnene Final-Kategorie eures Tipps = +1 Bonus', defaultEn: 'Per final-category win of your tip = +1 bonus' },

      // Slide Fair Play (Anti-Google + Tonfall)
      { key: 'rules.slide_fairplay.title', label: 'Fair Play — Titel', defaultDe: 'Fair Play', defaultEn: 'Fair Play' },
      { key: 'rules.slide_fairplay.line1', label: 'Fair Play — Zeile 1', defaultDe: 'Kein Googeln · Handy nur fürs Antworten', defaultEn: 'No googling · phones only for answering' },
      { key: 'rules.slide_fairplay.line2', label: 'Fair Play — Zeile 2', defaultDe: 'Antworten nicht zwischen Teams spoilern', defaultEn: 'Don\'t spoil answers between teams' },
      { key: 'rules.slide_fairplay.line3', label: 'Fair Play — Zeile 3', defaultDe: 'Im Zweifel zählt der Moderator-Wolf 🐺', defaultEn: 'When in doubt, the wolf decides 🐺' },
      { key: 'rules.slide_fairplay.extra', label: 'Fair Play — Extra', defaultDe: 'Hauptsache, ihr habt Spaß.', defaultEn: 'The main thing is having fun.' },

      // Slide 8: Finale
      { key: 'rules.slide8.title',  label: '8 · Finale — Titel', defaultDe: 'Großes Finale', defaultEn: 'Grand Finale' },
      { key: 'rules.slide8.line1',  label: '8 · Finale — Zeile 1', defaultDe: '16 Begriffe · 4 Gruppen finden', defaultEn: '16 terms · find 4 hidden groups' },
      { key: 'rules.slide8.line2',  label: '8 · Finale — Zeile 2', defaultDe: 'Pro Gruppe = +1 Punkt auf ein Feld eurer Wahl', defaultEn: 'Each group = +1 point on a cell of your choice' },
      { key: 'rules.slide8.extra',  label: '8 · Finale — Extra-Hinweis', defaultDe: '🏆 Größtes Gebiet + alle Bonus-Punkte gewinnt', defaultEn: '🏆 Largest area + all bonus points wins' },

      // Header-Strings
      { key: 'rules.header',        label: 'Header — „Spielregeln" Pille', defaultDe: 'Spielregeln', defaultEn: 'Game Rules' },
      { key: 'rules.lastSlideHint', label: 'Letzte Folie — „Los geht\'s!"-Hinweis', defaultDe: '🎬 Los geht\'s!', defaultEn: '🎬 Let\'s go!' },
    ],
  },

  // ───────────── Kategorie-Erklärungen (1-Zeiler in Cat-Intro) ───────────────
  {
    id: 'cat-explain',
    title: 'Kategorie-Erklärungen',
    description: '1-Zeiler unter dem Kategorie-Namen im Phase-Intro.',
    items: [
      { key: 'cat.SCHAETZCHEN.explain',   label: 'Schätzchen',   defaultDe: 'Wer schätzt am nächsten dran?', defaultEn: 'Who can guess the closest?' },
      { key: 'cat.MUCHO.explain',         label: 'Mucho',        defaultDe: 'Wählt die richtige Antwort', defaultEn: 'Pick the right answer' },
      { key: 'cat.BUNTE_TUETE.explain',   label: 'Bunte Tüte',   defaultDe: 'Immer eine Überraschung. Jedes Mal anders.', defaultEn: 'Always a surprise. Different every time.' },
      { key: 'cat.ZEHN_VON_ZEHN.explain', label: 'Zehn von Zehn',defaultDe: '3 Antworten, 10 Punkte vergeben', defaultEn: '3 answers, distribute 10 points' },
      { key: 'cat.CHEESE.explain',        label: 'Cheese',       defaultDe: 'Was ist das?', defaultEn: 'What is this?' },
    ],
  },

  // ───────────── Bunte-Tüte-Sub-Mechaniken ───────────────────────────────────
  {
    id: 'bunte-sub',
    title: 'Bunte-Tüte-Mechaniken',
    description: 'Name + 1-Zeiler pro Sub-Mechanik. Erscheint im Cat-Intro vor jeder Bunte-Tüte-Frage.',
    items: [
      { key: 'bunte.onlyConnect.name',    label: '4 gewinnt — Name',    defaultDe: '4 gewinnt',     defaultEn: 'Only Connect' },
      { key: 'bunte.onlyConnect.explain', label: '4 gewinnt — Erkl.',   defaultDe: '4 Begriffe — was verbindet sie? Ein Tipp pro Team, schnellste richtige Antwort gewinnt zuerst.', defaultEn: '4 terms — what connects them? One guess per team, fastest correct answer wins first.' },

      { key: 'bunte.bluff.name',          label: 'Bluff — Name',        defaultDe: 'Bluff',         defaultEn: 'Bluff' },
      { key: 'bunte.bluff.explain',       label: 'Bluff — Erkl.',       defaultDe: 'Erfindet plausible Falsch-Antworten und ratet die echte.', defaultEn: 'Make up plausible fake answers and find the real one.' },

      { key: 'bunte.hotPotato.name',      label: 'Hot Potato — Name',   defaultDe: 'Heiße Kartoffel', defaultEn: 'Hot Potato' },
      { key: 'bunte.hotPotato.explain',   label: 'Hot Potato — Erkl.',  defaultDe: 'Reihum antworten, keine Antwort vor Zeitende = raus.', defaultEn: 'Take turns, no answer before time runs out = out.' },

      { key: 'bunte.top5.name',           label: 'Top 5 — Name',        defaultDe: 'Top 5',         defaultEn: 'Top 5' },
      { key: 'bunte.top5.explain',        label: 'Top 5 — Erkl.',       defaultDe: 'Nennt die häufigsten Antworten, je oben desto mehr Punkte.', defaultEn: 'Guess the most common answers, higher rank means more points.' },

      // Imposter (oneOfEight) ist deaktiviert (Mai 2026) — keine Editor-Items,
      // sonst irritiert es Wolf, weil sich die Mechanik im Quiz nirgends zeigt.

      { key: 'bunte.order.name',          label: 'Reihenfolge — Name',  defaultDe: 'Reihenfolge',   defaultEn: 'Order' },
      { key: 'bunte.order.explain',       label: 'Reihenfolge — Erkl.', defaultDe: 'Sortiert in der richtigen Reihenfolge.', defaultEn: 'Sort in the correct order.' },

      { key: 'bunte.map.name',            label: 'CozyGuessr — Name',   defaultDe: 'CozyGuessr',    defaultEn: 'CozyGuessr' },
      { key: 'bunte.map.explain',         label: 'CozyGuessr — Erkl.',  defaultDe: 'Errate den Ort auf der Karte. Nächstes Team gewinnt.', defaultEn: 'Guess the location on the map. Closest team wins.' },
    ],
  },

  // ───────────── Runden-Regeln (Subtitle über Action-Cards) ──────────────────
  {
    id: 'round-rules',
    title: 'Runden-Hinweise',
    description: 'Subtitles über den Action-Cards im Phase-Intro pro Runde.',
    items: [
      { key: 'round.1.line1', label: 'Runde 1 — Zeile 1', defaultDe: 'Eure Aktion diese Runde:',  defaultEn: 'Your action this round:' },
      { key: 'round.1.line2', label: 'Runde 1 — Zeile 2', defaultDe: 'Sichert euch eure ersten Felder!', defaultEn: 'Claim your first cells!' },

      { key: 'round.2.line1', label: 'Runde 2 — Zeile 1', defaultDe: 'Pro richtige Antwort wählt eine Aktion:', defaultEn: 'Per correct answer choose one action:' },
      { key: 'round.2.line2', label: 'Runde 2 — Zeile 2', defaultDe: 'Klauen jetzt möglich!', defaultEn: 'Stealing now possible!' },

      { key: 'round.3.line1', label: 'Runde 3 — Zeile 1', defaultDe: 'Pro richtige Antwort wählt eine Aktion:', defaultEn: 'Per correct answer choose one action:' },
      { key: 'round.3.line2', label: 'Runde 3 — Zeile 2', defaultDe: 'Stapeln freigeschaltet: Felder dauerhaft sichern + 1 Punkt extra!', defaultEn: 'Stack unlocked: lock your tile + 1 extra point!' },

      { key: 'round.4.line1',         label: 'Runde 4 — Zeile 1', defaultDe: 'Pro richtige Antwort wählt eine Aktion:', defaultEn: 'Per correct answer choose one action:' },
      { key: 'round.4.line2_finale',  label: 'Runde 4 — Zeile 2 (mit Finale)', defaultDe: 'Quiz-Buddy-Punkte sammeln, danach Stapel-Bonus im Finale!', defaultEn: 'Collect quiz buddy points, stack-bonus finale follows!' },
      { key: 'round.4.line2_nofin',   label: 'Runde 4 — Zeile 2 (ohne Finale)', defaultDe: 'Quiz-Buddy-Punkte, alles bleibt verfügbar!', defaultEn: 'Quiz buddy points, everything stays available!' },
    ],
  },
];

// Schneller Lookup für Editor-Konsistenz-Checks.
export const ALL_RULE_KEYS: Set<string> = new Set(
  RULE_TEXT_GROUPS.flatMap(g => g.items.map(i => i.key))
);
