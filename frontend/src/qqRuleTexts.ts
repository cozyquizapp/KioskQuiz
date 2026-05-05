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
      { key: 'rules.slide2.line3',  label: '2 · So läuft\'s — Zeile 3', defaultDe: 'Tempo entscheidet bei Gleichstand', defaultEn: 'Speed decides ties' },

      // Slide 3: Roadmap (treeShowcase — kein Body-Text außer Title)
      { key: 'rules.slide3.title',  label: '3 · Roadmap — Titel', defaultDe: 'Dein Weg durchs Quiz', defaultEn: 'Your Quiz Roadmap' },
      { key: 'rules.slide3.hint',   label: '3 · Roadmap — Hinweis-Text', defaultDe: '5 Kategorien pro Runde — jede mit eigenem Twist', defaultEn: '5 categories per round — each with its own twist' },

      // Slide 4: Joker
      { key: 'rules.slide4.title',  label: '4 · Joker — Titel', defaultDe: 'Joker-Bonus', defaultEn: 'Joker Bonus' },
      { key: 'rules.slide4.line1',  label: '4 · Joker — Zeile 1', defaultDe: '2×2-Block oder 4 in einer Reihe = 1 Bonus-Feld', defaultEn: '2×2 block or 4 in a row = 1 bonus tile' },
      { key: 'rules.slide4.line2',  label: '4 · Joker — Zeile 2', defaultDe: 'Max. 2 Joker pro Team', defaultEn: 'Max 2 jokers per team' },
      { key: 'rules.slide4.gridLabel', label: '4 · Joker — Grid-Label', defaultDe: 'Beide Muster zählen', defaultEn: 'Both patterns count' },

      // Slide 5: Fähigkeiten (lines hängen von totalPhases ab — wir editieren pro Runde)
      { key: 'rules.slide5.title',  label: '5 · Fähigkeiten — Titel', defaultDe: 'Neue Fähigkeiten', defaultEn: 'New Abilities' },
      { key: 'rules.slide5.r2',     label: '5 · Fähigkeiten — Runde 2', defaultDe: 'Runde 2: Klauen freigeschaltet', defaultEn: 'Round 2: Steal unlocked' },
      { key: 'rules.slide5.r3',     label: '5 · Fähigkeiten — Runde 3', defaultDe: 'Runde 3: Stapeln — Feld dauerhaft sichern + 1 Bonus-Punkt', defaultEn: 'Round 3: Stack — lock your tile + 1 bonus pt' },
      { key: 'rules.slide5.r4',     label: '5 · Fähigkeiten — Runde 4 (nur 4-Runden-Modus)', defaultDe: 'Runde 4: alles bleibt — letzte Quiz-Runde', defaultEn: 'Round 4: everything stays — last quiz round' },
      { key: 'rules.slide5.r3short',label: '5 · Fähigkeiten — Runde 3 (3-Runden-Modus)', defaultDe: 'Runde 3: Stapeln — sichert euer Feld dauerhaft + 1 Bonus-Punkt', defaultEn: 'Round 3: Stack — lock your tile + 1 bonus pt' },
      { key: 'rules.slide5.abil1',  label: '5 · Fähigkeiten — Badge 1', defaultDe: 'Klauen', defaultEn: 'Steal' },
      { key: 'rules.slide5.abil2',  label: '5 · Fähigkeiten — Badge 2', defaultDe: 'Stapeln', defaultEn: 'Stack' },

      // Slide 6: Bunte Tüte
      { key: 'rules.slide6.title',  label: '6 · Bunte Tüte — Titel', defaultDe: 'Bunte Tüte', defaultEn: 'Lucky Bag' },
      { key: 'rules.slide6.line1',  label: '6 · Bunte Tüte — Zeile 1', defaultDe: 'Eine Kategorie pro Runde ist eine Überraschung', defaultEn: 'One category per round is a surprise' },
      { key: 'rules.slide6.line2',  label: '6 · Bunte Tüte — Zeile 2', defaultDe: '4 gewinnt · Bluff · Hot Potato · Top 5 · Reihenfolge · CozyGuessr', defaultEn: 'Connect 4 · Bluff · Hot Potato · Top 5 · Order · CozyGuessr' },
      { key: 'rules.slide6.extra',  label: '6 · Bunte Tüte — Extra-Hinweis', defaultDe: 'Regeln werden vor jeder Frage kurz erklärt', defaultEn: 'Rules explained before each question' },

      // Slide 7: Comeback
      { key: 'rules.slide7.title',  label: '7 · Comeback — Titel', defaultDe: 'Comeback', defaultEn: 'Comeback' },
      { key: 'rules.slide7.line1',  label: '7 · Comeback — Zeile 1', defaultDe: 'Letztes Team holt vor dem Finale auf', defaultEn: 'Last-place team catches up before the finale' },
      { key: 'rules.slide7.line2',  label: '7 · Comeback — Zeile 2', defaultDe: '„Mehr oder Weniger?" — Treffer klaut Feld vom 1. Platz', defaultEn: '"Higher or Lower?" — each hit steals from the leader' },

      // Slide 8: Finale
      { key: 'rules.slide8.title',  label: '8 · Finale — Titel', defaultDe: 'Großes Finale', defaultEn: 'Grand Finale' },
      { key: 'rules.slide8.line1',  label: '8 · Finale — Zeile 1', defaultDe: '16 Begriffe · 4 Gruppen finden', defaultEn: '16 terms · find 4 hidden groups' },
      { key: 'rules.slide8.line2',  label: '8 · Finale — Zeile 2', defaultDe: 'Pro Gruppe = 1 Stapel-Bonus (+1 Pkt) auf eure Felder', defaultEn: 'Each group = 1 stack-bonus (+1 pt) on your cells' },
      { key: 'rules.slide8.extra',  label: '8 · Finale — Extra-Hinweis', defaultDe: '🏆 Größtes Gebiet + Boni danach gewinnt', defaultEn: '🏆 Largest area + bonuses wins' },

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
      { key: 'cat.BUNTE_TUETE.explain',   label: 'Bunte Tüte',   defaultDe: 'Überraschungs-Mechanik — seid bereit!', defaultEn: 'Surprise mechanic — be ready!' },
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
      { key: 'bunte.onlyConnect.explain', label: '4 gewinnt — Erkl.',   defaultDe: '4 Hinweise, eine Lösung — wer mit den wenigsten Hinweisen löst, gewinnt eine Aktion.', defaultEn: '4 clues, one answer — solve with fewest clues to win an action.' },

      { key: 'bunte.bluff.name',          label: 'Bluff — Name',        defaultDe: 'Bluff',         defaultEn: 'Bluff' },
      { key: 'bunte.bluff.explain',       label: 'Bluff — Erkl.',       defaultDe: 'Erfindet plausible Falsch-Antworten und ratet die echte.', defaultEn: 'Make up plausible fake answers and find the real one.' },

      { key: 'bunte.hotPotato.name',      label: 'Hot Potato — Name',   defaultDe: 'Heiße Kartoffel', defaultEn: 'Hot Potato' },
      { key: 'bunte.hotPotato.explain',   label: 'Hot Potato — Erkl.',  defaultDe: 'Reihum antworten — keine Antwort vor Zeitende = raus.', defaultEn: 'Take turns — no answer before time runs out = out.' },

      { key: 'bunte.top5.name',           label: 'Top 5 — Name',        defaultDe: 'Top 5',         defaultEn: 'Top 5' },
      { key: 'bunte.top5.explain',        label: 'Top 5 — Erkl.',       defaultDe: 'Nennt die häufigsten Antworten — je oben, desto mehr Punkte.', defaultEn: 'Guess the most common answers — higher rank, more points.' },

      { key: 'bunte.oneOfEight.name',     label: 'Imposter — Name',     defaultDe: 'Imposter',      defaultEn: 'Imposter' },
      { key: 'bunte.oneOfEight.explain',  label: 'Imposter — Erkl.',    defaultDe: 'Findet die EINE falsche Aussage zwischen 7 wahren.', defaultEn: 'Spot the ONE false statement among 7 true ones.' },

      { key: 'bunte.order.name',          label: 'Reihenfolge — Name',  defaultDe: 'Reihenfolge',   defaultEn: 'Order' },
      { key: 'bunte.order.explain',       label: 'Reihenfolge — Erkl.', defaultDe: 'Sortiert in der richtigen Reihenfolge.', defaultEn: 'Sort in the correct order.' },

      { key: 'bunte.map.name',            label: 'CozyGuessr — Name',   defaultDe: 'CozyGuessr',    defaultEn: 'CozyGuessr' },
      { key: 'bunte.map.explain',         label: 'CozyGuessr — Erkl.',  defaultDe: 'Errate den Ort auf der Karte — je näher, desto mehr Punkte.', defaultEn: 'Guess the location on the map — closer means more points.' },
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
      { key: 'round.3.line2', label: 'Runde 3 — Zeile 2', defaultDe: 'Stapeln freigeschaltet — Felder dauerhaft sichern + 1 Punkt extra!', defaultEn: 'Stack unlocked — lock your tile + 1 extra point!' },

      { key: 'round.4.line1',         label: 'Runde 4 — Zeile 1', defaultDe: 'Pro richtige Antwort wählt eine Aktion:', defaultEn: 'Per correct answer choose one action:' },
      { key: 'round.4.line2_finale',  label: 'Runde 4 — Zeile 2 (mit Finale)', defaultDe: 'Letzte Quiz-Runde — danach kommt der Stapel-Bonus im Finale!', defaultEn: 'Last quiz round — stack-bonus finale follows!' },
      { key: 'round.4.line2_nofin',   label: 'Runde 4 — Zeile 2 (ohne Finale)', defaultDe: 'Letzte Runde — alles bleibt verfügbar!', defaultEn: 'Final round — everything stays available!' },
    ],
  },
];

// Schneller Lookup für Editor-Konsistenz-Checks.
export const ALL_RULE_KEYS: Set<string> = new Set(
  RULE_TEXT_GROUPS.flatMap(g => g.items.map(i => i.key))
);
