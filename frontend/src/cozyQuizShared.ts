/**
 * cozyQuizShared.ts — Module-level Helpers, Constants, Hooks, Translations.
 *
 * Aufgabe: alle Helfer/Konstanten die SOWOHL in QQBeamerPage als auch in den
 * extrahierten Sub-Components (CozyQuizActionCard, CozyQuizQuestionView, …)
 * gebraucht werden. Vorher waren sie inline in QQBeamerPage.tsx (22k Zeilen)
 * und blockierten Extraktion.
 *
 * Naming: cozyQuiz* (neu) statt qq* (legacy). QQ-Prefix bleibt nur fuer Code
 * der schon lange existiert (qqShared.ts, qqRuleTexts.ts, qqDesignTokens.ts).
 *
 * Re-exportiert auch passende Tokens aus qqShared / qqDesignTokens, damit
 * extrahierte Komponenten EINEN zentralen Import-Pfad haben.
 */
import { useState, useEffect } from 'react';
import { QQ_CAT_BADGE_BG, QQ_CAT_ACCENT } from './qqShared';

// ── Card-Theme ───────────────────────────────────────────────────────────────
export const COZY_CARD_BG = 'linear-gradient(180deg, #1F1A2E, #14101F)';

// ── Quiz-Option-Normalisierung ───────────────────────────────────────────────
/**
 * Quiz-Drafts haben oft inkonsistente Capitalization in den Antworten
 * (Wolf-Bug 2026-05-25: "Cricket / basketball / Hockey / tennis" gemischt).
 * Erster Buchstabe wird auf Render-Zeit auf Großbuchstaben normalisiert.
 *
 * Edge-Cases: "iPhone", "pH-Wert", Emoji-Prefixes bleiben unverändert wenn
 * der erste Buchstabe schon ein Großbuchstabe oder kein Buchstabe ist
 * (z.B. Zahl, Emoji, Sonderzeichen).
 */
export function qqCapOption(text: string | undefined | null): string {
  if (!text || text.length === 0) return text ?? '';
  const first = text.charAt(0);
  if (first === first.toUpperCase()) return text; // bereits groß / kein Buchstabe
  return first.toUpperCase() + text.slice(1);
}

// ── Re-exports aus qqShared (zentraler Import-Pfad) ─────────────────────────
export const CAT_BADGE_BG = QQ_CAT_BADGE_BG;
export const CAT_ACCENT = QQ_CAT_ACCENT;

// ── Category themes (BG-Gradient pro Kategorie) ─────────────────────────────
export const CAT_BG: Record<string, string> = {
  SCHAETZCHEN:   ['radial-gradient(ellipse at 18% 68%, rgba(133,77,14,0.42) 0%, transparent 55%)','radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.13) 0%, transparent 52%)','#0A0814'].join(','),
  MUCHO:         ['radial-gradient(ellipse at 70% 28%, rgba(29,78,216,0.28) 0%, transparent 55%)','radial-gradient(ellipse at 20% 78%, rgba(59,130,246,0.10) 0%, transparent 50%)','#0A0814'].join(','),
  BUNTE_TUETE:   ['radial-gradient(ellipse at 50% 55%, rgba(185,28,28,0.25) 0%, transparent 58%)','radial-gradient(ellipse at 14% 18%, rgba(220,38,38,0.11) 0%, transparent 45%)','#0A0814'].join(','),
  ZEHN_VON_ZEHN: ['repeating-linear-gradient(transparent, transparent 39px, rgba(52,211,153,0.03) 39px, rgba(52,211,153,0.03) 40px)','radial-gradient(ellipse at 28% 42%, rgba(6,78,59,0.32) 0%, transparent 55%)','#0A0814'].join(','),
  CHEESE:        ['radial-gradient(ellipse at 30% 40%, rgba(91,33,182,0.30) 0%, transparent 55%)','radial-gradient(ellipse at 80% 72%, rgba(139,92,246,0.12) 0%, transparent 50%)','#0A0814'].join(','),
};

// ── Category-Glow (Question-Card Halo pro Kategorie) ────────────────────────
// 2026-05-24 (Refactor #4): derived aus shared/qqCategoryTheme.ts.
import { QQ_CATEGORY_THEME } from '@shared/qqCategoryTheme';
export const CAT_GLOW: Record<string, string> = Object.fromEntries(
  (Object.keys(QQ_CATEGORY_THEME) as Array<keyof typeof QQ_CATEGORY_THEME>)
    .map(cat => [cat, QQ_CATEGORY_THEME[cat].glow])
);

// ── Decorative Corner-Emojis pro Kategorie ──────────────────────────────────
// Positions avoid the top-right timer (at top:16px right:48px) and top-left
// category pill. Decorations stay on sides (mid-height) and near the bottom,
// where nothing else sits.
export interface CutoutSpec {
  emoji: string;
  top?: string; bottom?: string; left?: string; right?: string;
  size: number; rot: number; alt?: boolean;
}
export const CAT_CUTOUTS: Record<string, CutoutSpec[]> = {
  SCHAETZCHEN:   [{ emoji:'🎯', top:'10%', left:'1.5%',  size:64, rot:-12 },{ emoji:'✨', bottom:'6%', left:'2%',  size:48, rot:8  },{ emoji:'🔮', bottom:'6%', right:'1.5%',  size:52, rot:16, alt:true }],
  MUCHO:         [{ emoji:'🅰️', top:'12%', left:'1.5%',  size:60, rot:-8  },{ emoji:'💡', bottom:'6%', left:'2%',  size:50, rot:12 },{ emoji:'🤔', bottom:'6%', right:'1.5%',  size:54, rot:-14, alt:true }],
  BUNTE_TUETE:   [{ emoji:'🎁', top:'10%', left:'1.5%',  size:66, rot:-10 },{ emoji:'🎲', bottom:'6%', left:'2%',  size:54, rot:14 },{ emoji:'⭐', bottom:'6%', right:'1.5%',  size:54, rot:20 }],
  ZEHN_VON_ZEHN: [{ emoji:'🎰', top:'10%', left:'1.5%',  size:58, rot:-6  },{ emoji:'⚡', bottom:'6%', left:'2%',  size:48, rot:10 },{ emoji:'💪', bottom:'6%', right:'1.5%',  size:54, rot:-12, alt:true }],
  CHEESE:        [{ emoji:'📸', top:'10%', left:'1.5%',  size:64, rot:-11 },{ emoji:'🔍', bottom:'6%', left:'2%',  size:50, rot:8  },{ emoji:'👁️', bottom:'6%', right:'1.5%',  size:54, rot:-9, alt:true }],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Hard-Truncation fuer Inline-Saetze (z.B. "X ist dran!") wo Multi-line-
 *  Wrap das Layout brechen wuerde. Block-/Card-Kontexte sollten stattdessen
 *  <TeamNameLabel/> nutzen, das wrappt 2-zeilig statt zu zerstuemmeln. */
export function truncName(name: string, max = 28): string {
  if (!name) return '';
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

/** In 'both' mode, alternate between de and en with a fade transition.
 *  Intervall war frueher 8s — fuehlte sich hektisch an, weil DE und EN oft
 *  unterschiedlich lange Texte sind und der Container bei jedem Wechsel
 *  resized. 12s gibt mehr Lese-Zeit pro Sprache und reduziert die Frequenz
 *  der Layout-Shifts entsprechend. */
export function useLangFlip(serverLang: string): 'de' | 'en' {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (serverLang !== 'both') {
      setFlip(false);
      return;
    }
    setFlip(false); // always start with DE on new slide
    const iv = setInterval(() => setFlip(f => !f), 12000);
    return () => clearInterval(iv);
  }, [serverLang]);
  if (serverLang === 'de') return 'de';
  if (serverLang === 'en') return 'en';
  return flip ? 'en' : 'de';
}

// ── Beamer translations ─────────────────────────────────────────────────────
export const bt = {
  action: {
    steal: { de: '⚡ Klauen', en: '⚡ Steal' },
    comeback: { de: '⚡ Comeback', en: '⚡ Comeback' },
    place: { de: '📍 Setzen', en: '📍 Place' },
    choose1: { de: '1 Feld wählen', en: 'Choose 1 field' },
    choose2: { de: '2 Felder wählen ({n} übrig)', en: 'Choose 2 fields ({n} left)' },
    stealDesc: { de: '1 fremdes Feld klauen', en: 'Steal 1 opponent field' },
    freeDesc: { de: 'Setzen oder Klauen', en: 'Place or steal' },
  },
  phase: {
    // Quiz-Runden heißen immer „Runde N". Das echte „Finale" ist seit
    // Connections-Einführung das 4×4-Mini-Game (eigene Phase, eigener Header).
    names: { de: ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4'], en: ['', 'Round 1', 'Round 2', 'Round 3', 'Round 4'] },
    descs: { de: ['', 'Erobert das Spielfeld!', 'Klaut euren Gegnern Felder!', 'Stapeln freigeschaltet!', 'Quiz-Buddy-Punkte!'],
             en: ['', 'Conquer the grid!', 'Steal from your rivals!', 'Stack unlocked!', 'Quiz buddy points!'] },
    of: { de: 'Phase {a} von {b}', en: 'Phase {a} of {b}' },
    fields: { de: 'Felder', en: 'fields' },
  },
  question: {
    introLabel: { de: 'Frage {n} von 5', en: 'Question {n} of 5' },
    counter: { de: 'Phase {p}/{t} · Frage {q}/5', en: 'Phase {p}/{t} · Q {q}/5' },
    hits: { de: 'Treffer', en: 'hits' },
    correct: { de: 'richtig', en: 'correct' },
    imposterTitle: { de: '🕵️ Imposter — wählt eine Aussage', en: '🕵️ Imposter — choose a statement' },
    statementsLeft: { de: 'Aussage(n) übrig', en: 'statement(s) left' },
    out: { de: 'Raus', en: 'Out' },
    answers: { de: 'Antworten', en: 'Answers' },
  },
  comeback: {
    title: { de: '⚡ Comeback-Chance!', en: '⚡ Comeback chance!' },
    place2: { de: '2 Felder setzen', en: 'Place 2 fields' },
    place2desc: { de: 'Platziere 2 freie Felder deiner Wahl', en: 'Place 2 empty fields of your choice' },
    steal1: { de: '1 Feld klauen', en: 'Steal 1 field' },
    steal1desc: { de: 'Nimm ein fremdes Feld', en: 'Take an opponent\'s field' },
    swap2: { de: '2 Felder tauschen', en: 'Swap 2 fields' },
    swap2desc: { de: 'Tausche je ein Feld von zwei Gegnern', en: 'Swap 1 field each of two opponents' },
    chosenPlace2: { de: '📍 2 Felder werden gesetzt…', en: '📍 Placing 2 fields…' },
    chosenSteal1: { de: '⚡ 1 Feld wird geklaut…', en: '⚡ Stealing 1 field…' },
    chosenSwap2: { de: '🔄 Felder werden getauscht…', en: '🔄 Swapping fields…' },
  },
  grid: { label: { de: 'Quartier', en: 'Quarter' } },
  gameOver: {
    title: { de: 'Spielende! 🎉', en: 'Game over! 🎉' },
    connected: { de: 'verbunden', en: 'connected' },
    total: { de: 'gesamt', en: 'total' },
  },
  loading: {
    room: { de: 'Raum', en: 'Room' },
    waiting: { de: '● Warte auf Spielzustand…', en: '● Waiting for game state…' },
    connecting: { de: '○ Verbinde…', en: '○ Connecting…' },
  },
};

export function actionVerb(a: string | null, lang: 'de' | 'en' = 'de') {
  if (a === 'STEAL_1') return bt.action.steal[lang];
  if (a === 'COMEBACK') return bt.action.comeback[lang];
  // 2026-05-05 (Wolf-Bug 'rechts in der tabelle steht klein setzen'):
  // Connections-Finale nutzt STAPEL_BONUS — vorher fiel das auf 'Setzen'
  // zurueck. Jetzt eigenes Label, alle Stapel-Pfade auch.
  if (a === 'STAPEL_BONUS' || a === 'STAPEL_1') return lang === 'en' ? '🏯 Stack' : '🏯 Stapeln';
  return bt.action.place[lang];
}

export function actionDesc(a: string | null, stats: any, lang: 'de' | 'en' = 'de') {
  if (a === 'PLACE_1') return bt.action.choose1[lang];
  if (a === 'PLACE_2') return bt.action.choose2[lang].replace('{n}', String(stats?.placementsLeft ?? 2));
  if (a === 'STEAL_1') return bt.action.stealDesc[lang];
  if (a === 'FREE')    return bt.action.freeDesc[lang];
  return '';
}

export function imgAnim(anim: string, layout?: string, delay?: number, duration?: number): string | undefined {
  const d = duration ?? undefined;
  const del = delay ?? 0;
  if (anim === 'float')    return `imgFloat ${d ?? 4}s ease-in-out ${del}s infinite`;
  if (anim === 'zoom-in')  return `imgZoomIn ${d ?? 0.8}s ease ${del}s both`;
  if (anim === 'reveal')   return `imgReveal ${d ?? 1}s ease ${del}s both`;
  if (anim === 'slide-in') return layout === 'window-left' ? `imgSlideL ${d ?? 0.7}s ease ${del}s both` : `imgSlideR ${d ?? 0.7}s ease ${del}s both`;
  return undefined;
}

export function imgFilter(img: { brightness?: number; contrast?: number; blur?: number }): string | undefined {
  const parts: string[] = [];
  if (img.brightness !== undefined && img.brightness !== 100) parts.push(`brightness(${img.brightness}%)`);
  if (img.contrast !== undefined && img.contrast !== 100) parts.push(`contrast(${img.contrast}%)`);
  if (img.blur) parts.push(`blur(${img.blur}px)`);
  return parts.length ? parts.join(' ') : undefined;
}

/**
 * Formatiert die aufgelöste Antwort für den Beamer.
 * 2026-05-19 (Wolf 'connect 4 zeigt DE+EN beim reveal, soll wie sonst sein'):
 * Vorher kombinierte EN-Mode 'EN / DE'. Jetzt: nur die aktive Sprache, sonst
 * Fallback auf die andere. Bei 'both' wird useLangFlip mitwechseln, an dieser
 * Stelle wird `lang` schon DE/EN sein → keine Doppel-Anzeige mehr.
 */
export function formatRevealedAnswer(
  lang: 'de' | 'en',
  de: string | null | undefined,
  en: string | null | undefined,
): string {
  const deTrim = (de ?? '').trim();
  const enTrim = (en ?? '').trim();
  if (lang === 'en') return enTrim || deTrim;
  return deTrim || enTrim;
}
