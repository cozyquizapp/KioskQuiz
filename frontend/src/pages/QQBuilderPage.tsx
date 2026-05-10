import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── CozyBuilder Brand-Tokens ──────────────────────────────────────────────────
// 2026-05-10 (CozyBuilder Audit Pack A #1): Brand-Refresh statt Tailwind-Slate-
// Devtool-Look. Werte = CozyQuiz-Hauptpalette (Pink/Magenta/Navy aus
// qqDesignTokens + Memory brand_cozywolf_colors.md). Builder fühlt sich jetzt
// wie /beamer + /team an statt wie ein fremder Editor-Tab.
const COZY_NAVY      = '#1E2A5A';    // Hauptseiten-BG (Brand-Navy)
const COZY_NAVY_DARK = '#141B3A';    // tieferer Akzent (Modals/Overlays)
const COZY_PINK      = '#EC4899';    // Primary-Action, Active-Tab
const COZY_PINK_SOFT = '#FBCFE8';    // Helle Pink-Variante (Highlights)
const COZY_MAGENTA   = '#A21247';    // Errors, Magenta-Akzent (Finale-Farbe)

// ── Shared tab bar (Builder ↔ Editor) ─────────────────────────────────────────
function QQEditorTabs({ active, draftId, onSave }: { active: 'builder' | 'editor'; draftId?: string; onSave?: () => void }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'builder', label: '📋 Fragen',  path: '/builder' },
    { id: 'editor',  label: '🎨 Design',  path: `/slides?draft=${draftId}` },
  ] as const;
  return (
    <div style={{ display: 'flex', gap: 2, background: COZY_NAVY_DARK, borderBottom: '1px solid rgba(236,72,153,0.12)', padding: '0 16px', flexShrink: 0 }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <button key={t.id} onClick={() => { if (!isActive) { onSave?.(); navigate(t.path); } }}
            style={{ padding: '9px 18px', border: 'none', borderBottom: isActive ? `2px solid ${COZY_PINK}` : '2px solid transparent', background: 'transparent', color: isActive ? '#F8FAFC' : '#94A3B8', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: isActive ? 'default' : 'pointer', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
import {
  QQQuestion, QQCategory, QQLanguage, QQDraft,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQImageLayout, QQImageAnimation, QQQuestionImage,
  QQBunteTueteKind, QQ_BUNTE_TUETE_LABELS,
  QQBunteTuetePayload, QQOptionImage,
  QQThemePreset, QQ_THEME_PRESETS,
} from '../../../shared/quarterQuizTypes';
import { compressImageIfNeeded } from '../utils/imageCompress';
import { ConnectionsEditorModal } from '../components/ConnectionsEditor';
import { CozyWolfImage } from '../components/CozyWolfImage';
import {
  playCozyClick, playCozySave, playCozyUpload, playCozyMilestone,
  getBuilderMuted, setBuilderMuted,
} from './cozyBuilderSounds';
import { exportHostCheatsheet } from './qqHostCheatsheet';
import { validateQuestion, validateDraft, worstLevel } from './qqValidation';
import { QQCsvImportModal } from './QQCsvImportModal';
import { QQMiniPreview } from './QQMiniPreview';
import { makeEurovisionDraft } from '../data/eurovisionDraftTemplate';

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORIES: QQCategory[] = ['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'];

const LAYOUT_LABELS: Record<QQImageLayout, string> = {
  'none': 'Kein Bild', 'fullscreen': 'Vollbild',
  'window-left': 'Links', 'window-right': 'Rechts', 'cutout': 'Freisteller',
};
const ANIM_LABELS: Record<QQImageAnimation, string> = {
  'none': 'Keine', 'float': 'Schweben', 'zoom-in': 'Zoom',
  'reveal': 'Aufdecken', 'slide-in': 'Einfahren',
};
const BUNTE_KINDS: QQBunteTueteKind[] = ['hotPotato', 'top5', 'oneOfEight', 'order', 'map', 'onlyConnect', 'bluff'];

// 2026-05-11 (Wolf-Wunsch): Wizard-Sub-Steps. Statt langer Scroll-Liste klickt
// Wolf sich pro Frage durch wenige Felder-Blöcke. Pro Kategorie eigenes Schema.
// Die `fields`-IDs werden vom QuestionEditor (visibleSection-Prop) gefiltert.
export type WizardSubStep = {
  id: string;
  label: string;
  emoji: string;
  /** Welche Editor-Sections in diesem Step sichtbar sind. */
  sections: WizardSection[];
};
export type WizardSection =
  | 'text'         // Frage-Text DE + EN + Mod-Notiz
  | 'main'         // Kategorie-spezifische Hauptfelder (Antwort/Optionen/SubMech/...)
  | 'image'        // Bild-Upload + Hintergrund-entfernen
  | 'imagePosition'// Position/Zoom Canvas + Slider + Visuelle Anpassungen
  | 'cheeseLayout' // CHEESE-spezifischer Horizontal/Hochkant-Toggle
  | 'funFact'      // Fun-Fact DE + EN
  | 'music';       // Musik-URL + musicMode (selten)

const SUB_STEPS_BY_CATEGORY: Record<QQCategory, WizardSubStep[]> = {
  SCHAETZCHEN: [
    { id: 'text',     label: 'Frage',    emoji: '📝', sections: ['text'] },
    { id: 'main',     label: 'Antwort',  emoji: '✅', sections: ['main'] },
    { id: 'image',    label: 'Bild',     emoji: '🖼️', sections: ['image', 'imagePosition'] },
    { id: 'funFact',  label: 'Fact',     emoji: '💡', sections: ['funFact'] },
  ],
  MUCHO: [
    { id: 'text',     label: 'Frage',    emoji: '📝', sections: ['text'] },
    { id: 'main',     label: 'Optionen', emoji: '🔤', sections: ['main'] },
    { id: 'image',    label: 'Bild',     emoji: '🖼️', sections: ['image', 'imagePosition'] },
    { id: 'funFact',  label: 'Fact',     emoji: '💡', sections: ['funFact'] },
  ],
  ZEHN_VON_ZEHN: [
    { id: 'text',     label: 'Frage',    emoji: '📝', sections: ['text'] },
    { id: 'main',     label: 'Optionen', emoji: '🔤', sections: ['main'] },
    { id: 'image',    label: 'Bild',     emoji: '🖼️', sections: ['image', 'imagePosition'] },
    { id: 'funFact',  label: 'Fact',     emoji: '💡', sections: ['funFact'] },
  ],
  BUNTE_TUETE: [
    { id: 'text',     label: 'Frage',    emoji: '📝', sections: ['text'] },
    { id: 'main',     label: 'Mechanik', emoji: '🎁', sections: ['main'] },
    { id: 'funFact',  label: 'Fact',     emoji: '💡', sections: ['funFact'] },
  ],
  CHEESE: [
    { id: 'text',     label: 'Frage',    emoji: '📝', sections: ['text'] },
    // 2026-05-11 (Wolf-Bug 'wo wähle ich Layout?'): cheeseLayout-Section gehört
    // logisch zum Bild-Step, nicht zum Antwort-Step. Vorher war Toggle in
    // CategoryFields-CHEESE → erschien beim 'main'-Step (Antwort), obwohl die
    // Validation-Warnung beim 'image'-Step erscheint. Jetzt: Layout-Wahl direkt
    // beim Bild zusammen mit Position.
    { id: 'image',    label: 'Bild',     emoji: '🖼️', sections: ['image', 'cheeseLayout', 'imagePosition'] },
    { id: 'main',     label: 'Antwort',  emoji: '✅', sections: ['main'] },
    { id: 'funFact',  label: 'Fact',     emoji: '💡', sections: ['funFact'] },
  ],
};

// 2026-05-11 Wizard Focus-Mode: Step-Hero-Texte pro (Kategorie, Step-ID).
// Großer Titel + Mini-Tipp am Editor-Card-Top. Gibt jedem Step einen klaren
// „Was soll ich hier tun"-Anker statt einem leeren Formular.
const STEP_HERO: Record<string, { title: string; tip: string }> = {
  // SCHAETZCHEN
  'SCHAETZCHEN/text':    { title: '📝 Worüber wird geschätzt?',    tip: 'Frag nach einer Zahl. Kurz, klar, eindeutig beantwortbar.' },
  'SCHAETZCHEN/main':    { title: '✅ Die Zahl, auf die getippt wird', tip: 'Bei Jahreszahlen den Toggle aktivieren — Beamer zeigt dann „1989" statt „1.989".' },
  'SCHAETZCHEN/image':   { title: '🖼️ Bild (optional)',            tip: 'Visualisiert das Thema. Drag-Drop oder Strg+V zum Einfügen.' },
  'SCHAETZCHEN/funFact': { title: '💡 Mod-Notiz / Fun-Fact',          tip: 'Nur du siehst es. Fun-Fact für Publikum + Ablauf-Tipp/Mechanik-Hinweis für dich — alles in einem Feld.' },
  // MUCHO
  'MUCHO/text':    { title: '📝 Die Quiz-Frage',                    tip: 'Eine Frage mit 4 Antwort-Optionen.' },
  'MUCHO/main':    { title: '✅ 4 Optionen, eine ist richtig',       tip: 'Plausible Distraktoren machen die Frage spannend.' },
  'MUCHO/image':   { title: '🖼️ Bild (optional)',                   tip: 'Drag-Drop oder Strg+V — zeigt sich als Hintergrund.' },
  'MUCHO/funFact': { title: '💡 Fun-Fact zur Auflockerung',          tip: 'Nur du als Mod siehst ihn — wirf ihn beim Reveal ein.' },
  // ZEHN_VON_ZEHN
  'ZEHN_VON_ZEHN/text':    { title: '📝 Die Quiz-Frage',                 tip: 'Eine Frage mit 3 Antwort-Optionen.' },
  'ZEHN_VON_ZEHN/main':    { title: '✅ 3 Optionen, eine ist richtig',    tip: 'Plus oder Minus 10 — alle setzen oder nichts.' },
  'ZEHN_VON_ZEHN/image':   { title: '🖼️ Bild (optional)',                tip: 'Drag-Drop oder Strg+V — zeigt sich als Hintergrund.' },
  'ZEHN_VON_ZEHN/funFact': { title: '💡 Fun-Fact zur Auflockerung',       tip: 'Nur du als Mod siehst ihn — wirf ihn beim Reveal ein.' },
  // BUNTE_TUETE
  'BUNTE_TUETE/text':    { title: '📝 Die Bunte-Tüte-Frage',          tip: 'Was sollen die Teams machen?' },
  'BUNTE_TUETE/main':    { title: '🎁 Welche Mechanik?',               tip: 'Hot Potato, Top 5, Order, OnlyConnect, Bluff, Map. Pro Mechanik eigene Felder.' },
  'BUNTE_TUETE/funFact': { title: '💡 Fun-Fact zur Auflockerung',       tip: 'Nur du als Mod siehst ihn — wirf ihn beim Reveal ein.' },
  // CHEESE
  'CHEESE/text':    { title: '📝 Worauf zielt die Frage?',             tip: '„Was ist das?" — die Antwort kommt als Freitext der Teams.' },
  'CHEESE/image':   { title: '🖼️ Bild + Beamer-Layout',                tip: 'Upload, Layout-Wahl (Horizontal/Hochkant), Position. Layout ist unabhängig vom Bildformat — du croppst per Position.' },
  'CHEESE/main':    { title: '✅ Die echte Antwort',                    tip: 'Wird beim Reveal eingeblendet. Freitext-Match toleriert Tippfehler.' },
  'CHEESE/funFact': { title: '💡 Fun-Fact zur Auflockerung',            tip: 'Nur du als Mod siehst ihn — wirf ihn beim Reveal ein.' },
};
function getStepHero(category: QQCategory, stepId: string): { title: string; tip: string } {
  return STEP_HERO[`${category}/${stepId}`] ?? { title: `${stepId}`, tip: '' };
}

// 2026-05-10 CozyBuilder Audit #19: Smart-Unit-Suggest. Extrahiert
// das wahrscheinliche Unit-Wort aus einem Schätzchen-Frage-Text.
// Beispiele:
//   'Wie viele Brücken hat Hamburg?'        → 'Brücken'
//   'Wie viele Spieler stehen auf dem Feld?' → 'Spieler'
//   'Wie viel Kalorien hat ein Big Mac?'    → 'Kalorien'
//   'Wie hoch ist der Mount Everest in Metern?' → 'Meter'
// Gibt null zurück wenn kein klares Pattern matched.
function suggestSchaetzchenUnit(text: string): string | null {
  const t = text.trim();
  if (!t || t.length < 6) return null;
  // Pattern 1: 'Wie viele/viel X …' (X = nächstes Wort, meist Plural)
  let m = t.match(/wie\s+viele?\s+([A-ZÄÖÜa-zäöüß-]{3,})/i);
  if (m) {
    const word = m[1];
    // Filtere triviale Verb-Form-Hits ('hat', 'ist', etc.)
    if (!/^(hat|ist|sind|war|hatten|gibt|wird|werden|sieht|stehen)$/i.test(word)) {
      return capitalize(word);
    }
  }
  // Pattern 2: '… in Metern/Kilometern/Sekunden/…'
  m = t.match(/in\s+([A-ZÄÖÜa-zäöüß]{4,})n?\b/i);
  if (m) {
    const word = m[1];
    if (/(meter|kilometer|sekunde|minute|stunde|jahr|tag|monat|gramm|liter)/i.test(word)) {
      // 'Metern' → 'Meter', 'Sekunden' → 'Sekunden' (bleibt — Plural ok)
      return capitalize(word.replace(/n$/, ''));
    }
  }
  // Pattern 3: 'Anzahl der X' / 'Anzahl X'
  m = t.match(/anzahl\s+(?:der|von)?\s*([A-ZÄÖÜa-zäöüß-]{3,})/i);
  if (m) return capitalize(m[1]);
  return null;
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeEmptyQuestion(phaseIndex: number, questionIndexInPhase: number, category: QQCategory, draftId: string): QQQuestion {
  const base = {
    id: `${draftId}-p${phaseIndex}-q${questionIndexInPhase}`,
    category, phaseIndex: phaseIndex as any, questionIndexInPhase,
    text: '', textEn: '', answer: '', answerEn: '',
  };
  if (category === 'MUCHO' || category === 'ZEHN_VON_ZEHN') {
    return { ...base, options: ['', '', '', ...(category === 'MUCHO' ? [''] : [])], optionsEn: [], correctOptionIndex: 0 };
  }
  if (category === 'BUNTE_TUETE') {
    return { ...base, bunteTuete: { kind: 'hotPotato' } };
  }
  return base;
}

function makeSampleDraft(): QQDraft {
  const id = `qq-draft-sample-${Date.now().toString(36)}`;
  const questions: QQQuestion[] = [
    // ── Phase 1 ────────────────────────────────────────────────────────────────
    { id: `${id}-p1-0`, category: 'SCHAETZCHEN', phaseIndex: 1, questionIndexInPhase: 0,
      text: 'Wie viele Brücken hat Hamburg?',
      textEn: 'How many bridges does Hamburg have?',
      targetValue: 2500, unit: 'Brücken', unitEn: 'bridges',
      answer: 'Ca. 2.500 Brücken — mehr als Venedig!', answerEn: 'Around 2,500 bridges — more than Venice!' },
    { id: `${id}-p1-1`, category: 'MUCHO', phaseIndex: 1, questionIndexInPhase: 1,
      text: 'Welche Stadt hat mehr Einwohner als Hamburg?',
      textEn: 'Which city has more inhabitants than Hamburg?',
      options: ['Bremen', 'Hannover', 'München', 'Kiel'], optionsEn: ['Bremen', 'Hannover', 'Munich', 'Kiel'],
      correctOptionIndex: 2, answer: 'München', answerEn: 'Munich' },
    { id: `${id}-p1-2`, category: 'BUNTE_TUETE', phaseIndex: 1, questionIndexInPhase: 2,
      text: 'Nenne ein Hamburger Wahrzeichen — reihum!',
      textEn: 'Name a Hamburg landmark — one by one!',
      answer: 'Michel, Elbphilharmonie, Speicherstadt, Hafen…', answerEn: 'Michel, Elbphilharmonie, Speicherstadt, Port…',
      bunteTuete: { kind: 'hotPotato' } },
    { id: `${id}-p1-3`, category: 'ZEHN_VON_ZEHN', phaseIndex: 1, questionIndexInPhase: 3,
      text: 'Was war Hamburg bevor es Teil Deutschlands wurde?',
      textEn: 'What was Hamburg before becoming part of Germany?',
      options: ['Fürstentum', 'Freie Hansestadt', 'Königreich'],
      optionsEn: ['Principality', 'Free Hanseatic City', 'Kingdom'],
      correctOptionIndex: 1, answer: 'Freie Hansestadt', answerEn: 'Free Hanseatic City' },
    { id: `${id}-p1-4`, category: 'CHEESE', phaseIndex: 1, questionIndexInPhase: 4,
      text: 'Was ist auf diesem Bild zu sehen?',
      textEn: 'What can you see in this picture?',
      answer: 'Elbphilharmonie', answerEn: 'Elbphilharmonie' },
    // ── Phase 2 ────────────────────────────────────────────────────────────────
    { id: `${id}-p2-0`, category: 'SCHAETZCHEN', phaseIndex: 2, questionIndexInPhase: 0,
      text: 'In welchem Jahr wurde der Hamburger Hafen offiziell gegründet?',
      textEn: 'In which year was Hamburg\'s port officially founded?',
      targetValue: 1189, unit: '', unitEn: '',
      answer: '1189 — per Urkunde von Friedrich Barbarossa', answerEn: '1189 — by charter of Frederick Barbarossa' },
    { id: `${id}-p2-1`, category: 'MUCHO', phaseIndex: 2, questionIndexInPhase: 1,
      text: 'Welcher Hamburger Künstler gilt als „König von Hamburg"?',
      textEn: 'Which Hamburg artist is known as the "King of Hamburg"?',
      options: ['Fettes Brot', 'Jan Delay', 'Beginner', 'Samy Deluxe'], optionsEn: ['Fettes Brot', 'Jan Delay', 'Beginner', 'Samy Deluxe'],
      correctOptionIndex: 1, answer: 'Jan Delay', answerEn: 'Jan Delay' },
    { id: `${id}-p2-2`, category: 'BUNTE_TUETE', phaseIndex: 2, questionIndexInPhase: 2,
      text: '8 Aussagen über Hamburg — eine ist gelogen. Welche?',
      textEn: '8 facts about Hamburg — one is a lie. Which one?',
      answer: 'Hamburg hat keinen U-Bahn-Tunnel unter der Elbe (falsch — es gibt den Elbtunnel!)',
      answerEn: 'Hamburg has no subway tunnel under the Elbe (false — the Elbtunnel exists!)',
      bunteTuete: { kind: 'oneOfEight', falseIndex: 4,
        statements: [
          'Hamburg hat mehr Brücken als Venedig',
          'Der Hamburger Michel ist 132 Meter hoch',
          'Die Reeperbahn ist Deutschlands bekannteste Amüsiermeile',
          'Der Hamburger Hafen ist der drittgrößte in Europa',
          'In Hamburg gibt es keinen Tunnel unter der Elbe',
          'Der Hamburger SV wurde 1887 gegründet',
          'Die Speicherstadt steht auf der UNESCO-Welterbeliste',
          'Hamburg war Gründungsmitglied der Hanse',
        ],
        statementsEn: [
          'Hamburg has more bridges than Venice',
          'St. Michael\'s Church is 132 metres tall',
          'The Reeperbahn is Germany\'s most famous entertainment district',
          'Hamburg\'s port is the third largest in Europe',
          'There is no tunnel under the Elbe in Hamburg',
          'Hamburger SV was founded in 1887',
          'The Speicherstadt is on the UNESCO World Heritage list',
          'Hamburg was a founding member of the Hanseatic League',
        ] } },
    { id: `${id}-p2-3`, category: 'ZEHN_VON_ZEHN', phaseIndex: 2, questionIndexInPhase: 3,
      text: 'In welchem Jahr wurde die Elbphilharmonie eröffnet?',
      textEn: 'In which year was the Elbphilharmonie opened?',
      options: ['2015', '2017', '2019'], optionsEn: ['2015', '2017', '2019'],
      correctOptionIndex: 1, answer: '2017', answerEn: '2017' },
    { id: `${id}-p2-4`, category: 'CHEESE', phaseIndex: 2, questionIndexInPhase: 4,
      text: 'Was ist dieses typisch norddeutsche Gericht?',
      textEn: 'What is this typical North German dish?',
      answer: 'Labskaus', answerEn: 'Labskaus' },
    // ── Phase 3 ────────────────────────────────────────────────────────────────
    { id: `${id}-p3-0`, category: 'SCHAETZCHEN', phaseIndex: 3, questionIndexInPhase: 0,
      text: 'Wie viele Meter hoch ist die Elbphilharmonie (Dach)?',
      textEn: 'How many metres tall is the Elbphilharmonie (roof)?',
      targetValue: 110, unit: 'Meter', unitEn: 'metres',
      answer: '110 Meter (Firsthöhe)', answerEn: '110 metres (roof height)' },
    { id: `${id}-p3-1`, category: 'MUCHO', phaseIndex: 3, questionIndexInPhase: 1,
      text: 'Welches Hamburger Unternehmen ist für Kaffee weltweit bekannt?',
      textEn: 'Which Hamburg company is world-famous for coffee?',
      options: ['Jacobs', 'Dallmayr', 'Tchibo', 'Löwenbräu'], optionsEn: ['Jacobs', 'Dallmayr', 'Tchibo', 'Löwenbräu'],
      correctOptionIndex: 2, answer: 'Tchibo', answerEn: 'Tchibo' },
    { id: `${id}-p3-2`, category: 'BUNTE_TUETE', phaseIndex: 3, questionIndexInPhase: 2,
      text: 'Nenne 5 Hamburger Stadtteile!',
      textEn: 'Name 5 Hamburg districts!',
      answer: 'Altona, Eimsbüttel, Wandsbek, Bergedorf, Harburg, St. Pauli…',
      answerEn: 'Altona, Eimsbüttel, Wandsbek, Bergedorf, Harburg, St. Pauli…',
      bunteTuete: { kind: 'top5',
        answers: ['Altona', 'Eimsbüttel', 'Wandsbek', 'Bergedorf', 'Harburg'],
        answersEn: ['Altona', 'Eimsbüttel', 'Wandsbek', 'Bergedorf', 'Harburg'] } },
    { id: `${id}-p3-3`, category: 'ZEHN_VON_ZEHN', phaseIndex: 3, questionIndexInPhase: 3,
      text: 'Wie heißt der amtierende Hamburger Bürgermeister (2024)?',
      textEn: 'Who is the current Hamburg mayor (2024)?',
      options: ['Peter Tschentscher', 'Ole von Beust', 'Olaf Scholz'],
      optionsEn: ['Peter Tschentscher', 'Ole von Beust', 'Olaf Scholz'],
      correctOptionIndex: 0, answer: 'Peter Tschentscher', answerEn: 'Peter Tschentscher' },
    { id: `${id}-p3-4`, category: 'CHEESE', phaseIndex: 3, questionIndexInPhase: 4,
      text: 'Welches Hamburger Expressionismus-Gebäude ist das?',
      textEn: 'Which Hamburg Expressionist building is this?',
      answer: 'Chilehaus', answerEn: 'Chilehaus' },
  ];
  return { id, title: '🗺️ Hamburg Probekatalog', phases: 3, language: 'both', questions, createdAt: Date.now(), updatedAt: Date.now() };
}

function makeEmptyDraft(phases: 3 | 4, existingCount = 0): QQDraft {
  const id = `qq-draft-${Date.now().toString(36)}`;
  const questions: QQQuestion[] = [];
  for (let p = 1; p <= phases; p++) {
    CATEGORIES.forEach((cat, qi) => questions.push(makeEmptyQuestion(p, qi, cat, id)));
  }
  // 2026-05-10 CozyBuilder Audit (Quick-Win): Default-Titel mit Counter +
  // Datum statt N× 'Neuer Fragensatz'. Wolf umbenennt sofort, aber wenn er
  // es vergisst sind die Drafts in der Liste eindeutig.
  const dd = String(new Date().getDate()).padStart(2, '0');
  const mm = String(new Date().getMonth() + 1).padStart(2, '0');
  const title = `Quiz #${existingCount + 1} · ${dd}.${mm}.`;
  return { id, title, phases, language: 'both', questions, createdAt: Date.now(), updatedAt: Date.now() };
}

function cellPreview(q: QQQuestion | undefined): { text: string; sub?: string; answer?: string } {
  if (!q) return { text: '' };
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete) {
    const sub = QQ_BUNTE_TUETE_LABELS[q.bunteTuete.kind];
    return { text: q.text, sub: `${sub.emoji} ${sub.de}`, answer: q.answer };
  }
  if (q.category === 'MUCHO' && q.options) {
    const correct = q.options[q.correctOptionIndex ?? 0];
    return { text: q.text, answer: correct ? `✓ ${correct}` : undefined };
  }
  if (q.category === 'ZEHN_VON_ZEHN' && q.options) {
    const correct = q.options[q.correctOptionIndex ?? 0];
    return { text: q.text, answer: correct ? `✓ ${q.correctOptionIndex! + 1}: ${correct}` : undefined };
  }
  if (q.category === 'SCHAETZCHEN') {
    return { text: q.text, answer: q.targetValue != null ? `→ ${q.targetValue.toLocaleString('de-DE')}${q.unit ? ' ' + q.unit : ''}` : undefined };
  }
  return { text: q.text, answer: q.answer || undefined };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function QQBuilderPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<QQDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<QQDraft | null>(null);
  const [activeQId, setActiveQId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [removingBgFor, setRemovingBgFor] = useState<string | null>(null);
  const [showRestore, setShowRestore] = useState<{ draft: QQDraft; savedAt: number } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [validationPrompt, setValidationPrompt] = useState<{ draft: QQDraft } | null>(null);
  const [optionUploadTarget, setOptionUploadTarget] = useState<{ questionId: string; optionIndex: number } | null>(null);
  // 2026-05-10 CozyBuilder Pack A #4: kurze Save-Success-Cascade nach Save.
  const [saveCascade, setSaveCascade] = useState<number>(0);
  // 2026-05-10 CozyBuilder Pack B #7: Auto-Save-Pill (Zeitstempel sichtbar).
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null);
  // 2026-05-10 CozyBuilder Pack C #30: Wizard-Modus (Slide-by-Slide statt
  // Grid). localStorage-persistiert, damit Wolf seinen bevorzugten Modus
  // zwischen Sessions hält. Toggle via Grid|Wizard-Button im Header.
  const [wizardMode, setWizardMode] = useState<boolean>(() => {
    try { return localStorage.getItem('qq-builder-wizard') === '1'; } catch { return false; }
  });
  const toggleWizardMode = () => {
    setWizardMode(v => {
      const next = !v;
      try { localStorage.setItem('qq-builder-wizard', next ? '1' : '0'); } catch {}
      return next;
    });
  };
  // 2026-05-10 CozyBuilder Audit #15: Sound-Layer Toggle (localStorage).
  const [soundMuted, setSoundMuted] = useState<boolean>(() => getBuilderMuted());
  const toggleSound = () => {
    setSoundMuted(prev => {
      const next = !prev;
      setBuilderMuted(next);
      if (!next) playCozyClick(); // Wenn entmutet, kurzes Click-Feedback
      return next;
    });
  };
  // 2026-05-10 CozyBuilder Audit #14: Milestone-Toasts.
  const [milestoneToast, setMilestoneToast] = useState<{ icon: string; text: string; key: number } | null>(null);
  const shownMilestonesRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save: debounced localStorage backup ──
  useEffect(() => {
    if (!activeDraft) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try {
        const ts = Date.now();
        localStorage.setItem(`qq-draft-backup-${activeDraft.id}`, JSON.stringify({ draft: activeDraft, savedAt: ts }));
        setAutoSavedAt(ts); // Pack B #7
      } catch { /* quota exceeded */ }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [activeDraft]);

  // 2026-05-10 CozyBuilder Pack B #9: globaler Paste-Handler. Strg+V
  // Bild-aus-Clipboard auf aktiven Slot upen wenn nicht in Text-Input
  // fokussiert (sonst stört es normales Text-Paste).
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (!activeQId) return;
      const item = Array.from(e.clipboardData?.items ?? []).find(it => it.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      const renamed = new File([file], `paste-${Date.now()}.png`, { type: file.type });
      void uploadImageFile(activeQId, renamed);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQId, activeDraft?.id]);

  // 2026-05-10 CozyBuilder Pack B #10: Tastatur-Navigation.
  // Cmd/Ctrl+S    → explizit speichern (überschreibt Browser-Default).
  // Cmd/Ctrl+J/K  → vorheriger/nächster Slot.
  // Cmd/Ctrl+Enter → save + nächster LEERER Slot (Schreib-Flow).
  // Ignoriert wenn Modal offen ist oder Eingabefeld fokussiert (Tab-Navigation
  // in Inputs bleibt intakt; nur Cmd+S/J/K/Enter werden abgefangen).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!activeDraft) return;
      if (showRestore || showImport || showConnections || validationPrompt) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      // Cmd+S → Save
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (!saving) void saveDraft(activeDraft);
        return;
      }
      // Cmd+Enter → Save + Sprung zum nächsten leeren Slot
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!saving) void saveDraft(activeDraft);
        const nextEmpty = activeDraft.questions.find(q => !q.text?.trim());
        if (nextEmpty) setActiveQId(nextEmpty.id);
        return;
      }
      // Cmd+J / Cmd+K → Slot-Navigation
      if (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const qs = activeDraft.questions;
        if (qs.length === 0) return;
        const curIdx = activeQId ? qs.findIndex(q => q.id === activeQId) : -1;
        const dir = (e.key === 'j' || e.key === 'J') ? 1 : -1;
        const nextIdx = curIdx < 0
          ? (dir > 0 ? 0 : qs.length - 1)
          : (curIdx + dir + qs.length) % qs.length;
        setActiveQId(qs[nextIdx].id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDraft, activeQId, saving, showRestore, showImport, showConnections, validationPrompt]);

  // ── Warn before leaving with unsaved changes ──
  useEffect(() => {
    if (!activeDraft) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeDraft]);

  // ── Check for unsaved local backup when opening a draft ──
  const origSetActiveDraft = useCallback((draft: QQDraft | null) => {
    if (draft) {
      try {
        const raw = localStorage.getItem(`qq-draft-backup-${draft.id}`);
        if (raw) {
          const backup = JSON.parse(raw) as { draft: QQDraft; savedAt: number };
          if (backup.draft.updatedAt > draft.updatedAt) {
            setShowRestore({ draft: backup.draft, savedAt: backup.savedAt });
            setActiveDraft(draft);
            return;
          }
          localStorage.removeItem(`qq-draft-backup-${draft.id}`);
        }
      } catch { /* ignore corrupt data */ }
    }
    setActiveDraft(draft);
  }, []);

  useEffect(() => {
    fetch('/api/qq/drafts').then(r => r.json()).then(data => { if (Array.isArray(data)) setDrafts(data); }).catch(() => {});
  }, []);

  function getQuestionsForCell(draft: QQDraft, phase: number, cat: QQCategory): QQQuestion[] {
    return draft.questions.filter(q => q.phaseIndex === phase && q.category === cat);
  }
  function updateQuestion(draft: QQDraft, updated: QQQuestion): QQDraft {
    return { ...draft, questions: draft.questions.map(q => q.id === updated.id ? updated : q), updatedAt: Date.now() };
  }
  function addQuestion(draft: QQDraft, phase: number, cat: QQCategory): QQDraft {
    const existing = draft.questions.filter(q => q.phaseIndex === phase && q.category === cat);
    const newQ = makeEmptyQuestion(phase, draft.questions.length, cat, draft.id);
    newQ.id = `${draft.id}-p${phase}-${cat}-${Date.now().toString(36)}`;
    // 2026-05-10 Audit #15: Cozy-Click bei Add-Question.
    try { playCozyClick(); } catch {}
    return { ...draft, questions: [...draft.questions, newQ], updatedAt: Date.now() };
  }
  function deleteQuestion(draft: QQDraft, id: string): QQDraft {
    return { ...draft, questions: draft.questions.filter(q => q.id !== id), updatedAt: Date.now() };
  }
  function duplicateQuestion(draft: QQDraft, id: string): { draft: QQDraft; newId: string | null } {
    const src = draft.questions.find(q => q.id === id);
    if (!src) return { draft, newId: null };
    const newId = `${draft.id}-p${src.phaseIndex}-${src.category}-${Date.now().toString(36)}`;
    const copy: QQQuestion = { ...src, id: newId };
    const idx = draft.questions.findIndex(q => q.id === id);
    const questions = [...draft.questions.slice(0, idx + 1), copy, ...draft.questions.slice(idx + 1)];
    return { draft: { ...draft, questions, updatedAt: Date.now() }, newId };
  }
  function moveQuestion(draft: QQDraft, id: string, dir: 'up' | 'down'): QQDraft {
    const qs = [...draft.questions];
    const idx = qs.findIndex(q => q.id === id);
    if (idx < 0) return draft;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= qs.length) return draft;
    // Only swap within same phase
    if (qs[idx].phaseIndex !== qs[swapIdx].phaseIndex) return draft;
    [qs[idx], qs[swapIdx]] = [qs[swapIdx], qs[idx]];
    return { ...draft, questions: qs, updatedAt: Date.now() };
  }

  async function createDraft(phases: 3 | 4) {
    // existingCount = nur Wolfs eigene Quiz-#-Drafts, nicht Demo-Packs
    // (qq-vol-*/qq-sample-*/qq-esc/qq-eurovision sind nicht „Quiz #N").
    const wolfDrafts = drafts.filter(d => /^Quiz #\d+/.test(d.title));
    const draft = makeEmptyDraft(phases, wolfDrafts.length);
    const res = await fetch('/api/qq/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (res.ok) { const saved = await res.json(); setDrafts(prev => [saved, ...prev]); setActiveDraft(saved); }
  }
  async function createSampleDraft() {
    const draft = makeSampleDraft();
    const res = await fetch('/api/qq/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (res.ok) { const saved = await res.json(); setDrafts(prev => [saved, ...prev]); setActiveDraft(saved); }
  }
  // 2026-05-07 (Wolf-Wunsch direkter ESC-Quiz statt CSV-Zwischenschritt):
  // gleicher Pattern wie createSampleDraft — Demo-Pack via POST anlegen,
  // Builder switcht direkt drauf. Wolf ergaenzt Bilder/musicMode pro Frage
  // im Editor.
  async function createEurovisionDraft() {
    const draft = makeEurovisionDraft();
    const res = await fetch('/api/qq/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (res.ok) { const saved = await res.json(); setDrafts(prev => [saved, ...prev]); setActiveDraft(saved); }
  }
  async function saveDraftRaw(draft: QQDraft) {
    setSaving(true);
    try {
      const res = await fetch(`/api/qq/drafts/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      if (res.ok) {
        const saved = await res.json();
        setDrafts(prev => prev.map(d => d.id === saved.id ? saved : d));
        setActiveDraft(saved);
        try { localStorage.removeItem(`qq-draft-backup-${draft.id}`); } catch {}
        // 2026-05-10 CozyBuilder Pack A #4: Save-Cascade triggern (✓-Pop).
        setSaveCascade(c => c + 1);
        setAutoSavedAt(Date.now());
        // 2026-05-10 Audit #15: Save-Bell. Subtle 2-Ton-Belohnung.
        try { playCozySave(); } catch {}
      }
    } finally { setSaving(false); }
  }
  // Validiert Draft und zeigt Prompt NUR bei Errors — sonst direkt speichern.
  // 2026-05-10 CozyBuilder Pack B #6: Warnings blocken Save nicht mehr.
  // Wolf-Schmerz war: jedes Save endete im 'Trotzdem speichern'-Modal weil
  // EN-Felder noch leer waren. Jetzt fließt Save just-works durch; Warnings
  // sind im Header-Save-Button als Counter sichtbar.
  async function saveDraft(draft: QQDraft) {
    const v = validateDraft(draft);
    if (v.totalErrors > 0) {
      setValidationPrompt({ draft });
      return;
    }
    await saveDraftRaw(draft);
  }
  async function translateAllToEnglish() {
    if (!activeDraft || translating) return;
    // 2026-05-05 (Wolf-Bug 'felder werden nicht automatisch uebersetzt die
    // ich gerade mit deutschem text gefuellt habe'): vorher skipped der
    // Translator alle Felder die schon textEn hatten — auch wenn DE
    // inzwischen geaendert wurde. Jetzt: Confirm + komplett neu uebersetzen,
    // sodass DE-Aenderungen immer ankommen. Manuelle EN-Eingaben gehen
    // verloren, das ist der bewusste Trade-off.
    if (!confirm('Alle EN-Felder neu übersetzen?\nVorhandene EN-Texte werden überschrieben.')) return;
    setTranslating(true);
    try {
      async function tr(text: string): Promise<string> {
        if (!text?.trim()) return '';
        try {
          const res = await fetch('/api/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim(), source: 'de', target: 'en' }),
          });
          if (!res.ok) return '';
          const data = await res.json();
          return (data.translatedText as string)?.trim() ?? '';
        } catch { return ''; }
      }

      const translatedQuestions = await Promise.all(activeDraft.questions.map(async (q) => {
        const updated = { ...q };
        // Core fields — IMMER neu uebersetzen wenn DE-Text vorhanden
        if (q.text)      updated.textEn   = await tr(q.text);
        if (q.answer)    updated.answerEn = await tr(q.answer);
        if (q.funFact)   updated.funFactEn = await tr(q.funFact);
        // SCHAETZCHEN unit
        if (q.unit)      updated.unitEn = await tr(q.unit);
        // Multiple choice options
        if (q.options?.length && (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN')) {
          updated.optionsEn = await Promise.all(q.options.map(opt => opt ? tr(opt) : Promise.resolve('')));
        }
        // BUNTE_TUETE sub-fields
        if (q.bunteTuete) {
          const bt = { ...q.bunteTuete } as any;
          if (bt.kind === 'oneOfEight' && bt.statements?.length) {
            bt.statementsEn = await Promise.all(bt.statements.map((s: string) => s ? tr(s) : Promise.resolve('')));
          }
          if (bt.kind === 'top5' && bt.answers?.length) {
            bt.answersEn = await Promise.all(bt.answers.map((a: string) => a ? tr(a) : Promise.resolve('')));
          }
          if (bt.kind === 'order' && bt.items?.length) {
            bt.itemsEn = await Promise.all(bt.items.map((item: string) => item ? tr(item) : Promise.resolve('')));
            if (bt.criteria) bt.criteriaEn = await tr(bt.criteria);
          }
          if (bt.kind === 'onlyConnect') {
            // 2026-05-10 (Wolf-Bug 'EN-Button füllt nicht alle Felder'):
            // hints war schon dabei, aber answer + acceptedAnswers fehlten.
            if (bt.hints?.length) {
              bt.hintsEn = await Promise.all(bt.hints.map((h: string) => h ? tr(h) : Promise.resolve('')));
            }
            if (bt.answer) bt.answerEn = await tr(bt.answer);
            if (bt.acceptedAnswers?.length) {
              bt.acceptedAnswersEn = await Promise.all(bt.acceptedAnswers.map((a: string) => a ? tr(a) : Promise.resolve('')));
            }
          }
          if (bt.kind === 'bluff' && bt.realAnswer) {
            // 2026-05-10 (Wolf-Bug 'EN-Button überspringt Bluff'): realAnswer
            // fehlte im Translation-Sweep. Auch question.answerEn matchen,
            // weil Bluff-Editor (~Z. 1885) realAnswer + answer parallel hält.
            bt.realAnswerEn = await tr(bt.realAnswer);
            if (!updated.answerEn) updated.answerEn = bt.realAnswerEn;
          }
          updated.bunteTuete = bt;
        }
        return updated;
      }));

      const newDraft = { ...activeDraft, questions: translatedQuestions };
      setActiveDraft(newDraft);
      await saveDraftRaw(newDraft);
    } finally {
      setTranslating(false);
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm('Fragensatz löschen?')) return;
    await fetch(`/api/qq/drafts/${id}`, { method: 'DELETE' });
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (activeDraft?.id === id) setActiveDraft(null);
  }

  // 2026-05-10 CozyBuilder Pack B #9: in 2 Layer aufgeteilt damit Drop/Paste
  // ohne fileInputRef-Roundtrip uploaden kann. uploadImage = Wrapper für
  // File-Picker-Flow (greift den ref-File), uploadImageFile = pure File-Upload
  // (für Drag-Drop + Paste-from-Clipboard).
  async function uploadImage(questionId: string) {
    const rawFile = fileInputRef.current?.files?.[0];
    if (!rawFile) return;
    await uploadImageFile(questionId, rawFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
  async function uploadImageFile(questionId: string, rawFile: File) {
    if (!activeDraft) return;
    setUploadingFor(questionId);
    // 2026-05-05 (Wolf 'bilddatei zu gross, automatisch komprimieren'):
    // statt hard-fail bei >2MB: clientside Canvas-Komprimierung (max
    // 1920px, JPEG 0.85→0.5 quality steps). Originals bleiben unter 2MB
    // unangetastet.
    let file: File;
    try {
      file = await compressImageIfNeeded(rawFile);
    } catch (e) {
      alert('Bild konnte nicht verarbeitet werden');
      setUploadingFor(null);
      return;
    }
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const q = activeDraft.questions.find(q => q.id === questionId);
      if (!q) return;
      const updated = { ...q, image: { url: data.imageUrl, layout: q.image?.layout ?? 'fullscreen' as QQImageLayout, animation: q.image?.animation ?? 'none' as QQImageAnimation, bgRemovedUrl: undefined } };
      setActiveDraft(updateQuestion(activeDraft, updated));
      // 2026-05-10 Audit #15: Upload-Chime nach Bild-Upload.
      try { playCozyUpload(); } catch {}
    } finally { setUploadingFor(null); }
  }

  async function removeBg(question: QQQuestion) {
    if (!activeDraft || !question.image?.url) return;
    setRemovingBgFor(question.id);
    try {
      const res = await fetch('/api/qq/remove-bg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: question.image.url }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const updated = { ...question, image: { ...question.image!, bgRemovedUrl: data.bgRemovedUrl } };
      setActiveDraft(updateQuestion(activeDraft, updated));
    } catch { alert('Hintergrundentfernung fehlgeschlagen'); }
    finally { setRemovingBgFor(null); }
  }
  async function uploadOptionImage() {
    const rawFile = optionFileInputRef.current?.files?.[0];
    if (!rawFile || !activeDraft || !optionUploadTarget) return;
    let file: File;
    try {
      file = await compressImageIfNeeded(rawFile);
    } catch {
      alert('Bild konnte nicht verarbeitet werden');
      if (optionFileInputRef.current) optionFileInputRef.current.value = '';
      return;
    }
    const { questionId, optionIndex } = optionUploadTarget;
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const q = activeDraft.questions.find(q => q.id === questionId);
      if (!q) return;
      const imgs = [...(q.optionImages ?? [])];
      while (imgs.length <= optionIndex) imgs.push(null);
      imgs[optionIndex] = { url: data.imageUrl, fit: 'cover', opacity: 0.4 };
      setActiveDraft(updateQuestion(activeDraft, { ...q, optionImages: imgs }));
    } catch { alert('Upload fehlgeschlagen'); }
    finally { setOptionUploadTarget(null); if (optionFileInputRef.current) optionFileInputRef.current.value = ''; }
  }
  const activeQ = activeDraft && activeQId ? activeDraft.questions.find(q => q.id === activeQId) ?? null : null;

  // 2026-05-10 CozyBuilder #30: Wenn Wizard-Modus aktiv und keine Frage
  // ausgewählt, springe automatisch auf Frage 1. Sonst sieht der Wizard
  // leer aus (nichts editierbar).
  useEffect(() => {
    if (wizardMode && activeDraft && !activeQId && activeDraft.questions.length > 0) {
      setActiveQId(activeDraft.questions[0].id);
    }
  }, [wizardMode, activeDraft?.id, activeQId, activeDraft]);

  // 2026-05-10 CozyBuilder Audit #14: Milestone-Toasts mit Wolf.
  // Bei Meilensteinen feiert Wolf das Schreib-Fortschritt — Toast 2.5s
  // mit Pink-Magenta-Gradient + kleiner Fanfare-Sound.
  // Pro Draft-ID nur jeweils 1× pro Milestone, damit beim Wechseln zwischen
  // Drafts der Toast nicht spam-weise erscheint.
  useEffect(() => {
    if (!activeDraft) return;
    const filledCount = activeDraft.questions.filter(q => q.text?.trim()).length;
    const phaseCount = activeDraft.phases;
    const fullPhases: number[] = [];
    for (let p = 1; p <= phaseCount; p++) {
      const phaseQs = activeDraft.questions.filter(q => q.phaseIndex === p);
      if (phaseQs.length > 0 && phaseQs.every(q => q.text?.trim())) fullPhases.push(p);
    }
    const enCoverage = activeDraft.questions.filter(q => q.text?.trim()).length > 0
      && activeDraft.questions.every(q => !q.text?.trim() || q.textEn?.trim());

    const milestones: Array<{ key: string; icon: string; text: string }> = [];
    if (filledCount === 5)  milestones.push({ key: `${activeDraft.id}-5q`,  icon: '🐺', text: '5 Fragen geschrieben — Wolf nickt anerkennend.' });
    if (filledCount === 10) milestones.push({ key: `${activeDraft.id}-10q`, icon: '🎉', text: '10 Fragen geschrieben — Bier verdient!' });
    if (filledCount === 25) milestones.push({ key: `${activeDraft.id}-25q`, icon: '🔥', text: '25 Fragen — Wolf ist beeindruckt.' });
    for (const p of fullPhases) {
      milestones.push({ key: `${activeDraft.id}-p${p}-full`, icon: '✨', text: `Phase ${p} ist voll — sieht echt gut aus.` });
    }
    if (enCoverage && activeDraft.questions.length >= 5) {
      milestones.push({ key: `${activeDraft.id}-all-en`, icon: '🌍', text: 'Alle EN-Felder gefüllt — internationalisiert!' });
    }

    for (const m of milestones) {
      if (shownMilestonesRef.current.has(m.key)) continue;
      shownMilestonesRef.current.add(m.key);
      setMilestoneToast({ icon: m.icon, text: m.text, key: Date.now() });
      try { playCozyMilestone(); } catch {}
      window.setTimeout(() => {
        setMilestoneToast(prev => (prev && prev.text === m.text ? null : prev));
      }, 2800);
      break; // 1 Milestone pro Effect-Run, sonst stapeln sie
    }
  }, [activeDraft]);

  if (!activeDraft) return <DraftListScreen drafts={drafts} onOpen={origSetActiveDraft} onCreate={createDraft} onCreateSample={createSampleDraft} onCreateEurovision={createEurovisionDraft} onDelete={deleteDraft} />;

  return (
    <div style={{ minHeight: '100vh', background: COZY_NAVY, color: '#F8FAFC', fontFamily: "'Nunito', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* 2026-05-10 CozyBuilder Pack A #4: Save-Success-Cascade.
          Kurzes ✓-Pop neben dem Save-Button (1.2s Auto-Fade). */}
      {saveCascade > 0 && (
        <div
          key={`cascade-${saveCascade}`}
          style={{
            position: 'fixed', top: 72, right: 28, zIndex: 8000,
            color: COZY_PINK, fontSize: 36, fontWeight: 900,
            pointerEvents: 'none',
            textShadow: `0 0 16px ${COZY_PINK}`,
            animation: 'cozySaveCheck 1.2s ease-out forwards',
          }}
          aria-hidden
        >✓</div>
      )}
      {/* 2026-05-10 CozyBuilder Audit #14: Milestone-Toast. */}
      {milestoneToast && (
        <div
          key={`milestone-${milestoneToast.key}`}
          style={{
            position: 'fixed', top: 90, right: 28, zIndex: 8001,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 20px 14px 16px', borderRadius: 16,
            background: `linear-gradient(135deg, ${COZY_PINK}, ${COZY_MAGENTA})`,
            color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
            boxShadow: `0 12px 32px ${COZY_PINK}55, 0 0 0 1px ${COZY_PINK}66`,
            maxWidth: 360,
            animation: 'cozyMilestoneIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both, cozyMilestoneOut 0.4s ease 2.4s forwards',
            pointerEvents: 'none',
          }}
          aria-live="polite"
        >
          <span style={{ fontSize: 26, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{milestoneToast.icon}</span>
          <span style={{ lineHeight: 1.35 }}>{milestoneToast.text}</span>
        </div>
      )}
      <style>{`
        .qq-filmstrip-thumb:hover .qq-filmstrip-design-btn { opacity: 1 !important; }
        /* 2026-05-11: Wizard-Filmstrip Hover-Tooltip mit Frage-Preview. */
        .qq-filmstrip-chip-wrap:hover .qq-filmstrip-tooltip { opacity: 1 !important; }
        /* 2026-05-11: Kategorie-Focus-Glow auf Textareas. catColor per
           CSS-Custom-Property (--cozy-focus-color). */
        textarea.cozy-input:focus, input.cozy-input:focus {
          outline: none !important;
          border-color: var(--cozy-focus-color, ${COZY_PINK}) !important;
          box-shadow: 0 0 0 3px var(--cozy-focus-color, ${COZY_PINK})22, 0 0 18px var(--cozy-focus-color, ${COZY_PINK})33 !important;
        }
        /* 2026-05-10 CozyBuilder Pack A #4: Save-Button Click-Bounce.
           Wolfs am-häufigsten-gedrückter Button belohnt jetzt sichtbar.
           Glow pulst sanft wenn ready, beim Klick kurz schrumpfen-bouncen. */
        .cozy-save-btn:not(:disabled):active { transform: scale(0.96); }
        .cozy-save-btn:not(:disabled):hover { transform: translateY(-1px); }
        @keyframes cozySaveCheck {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          70%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -120%) scale(1); }
        }
        @keyframes cozyAutoSaveTick {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        /* 2026-05-10 CozyBuilder Audit #14: Milestone-Toast Drop-In + Out. */
        @keyframes cozyMilestoneIn {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0)     scale(1); }
        }
        @keyframes cozyMilestoneOut {
          0%   { opacity: 1; transform: translateY(0)    scale(1); }
          100% { opacity: 0; transform: translateY(-12px) scale(0.96); }
        }
        @media (max-width: 800px) {
          .qq-builder-body { flex-direction: column !important; }
          .qq-builder-grid { min-width: 0 !important; }
          .qq-builder-grid-inner { min-width: auto !important; grid-template-columns: 90px repeat(3, 1fr) !important; gap: 4px !important; font-size: 10px !important; }
          .qq-builder-editor { width: 100% !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.07) !important; max-height: 55vh !important; overflow-y: auto !important; }
          .qq-builder-header { padding: 8px 12px !important; gap: 8px !important; }
        }
      `}</style>
      {/* Restore dialog */}
      {showRestore && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: COZY_NAVY_DARK, borderRadius: 16, padding: '28px 32px', maxWidth: 420, border: `1px solid ${COZY_PINK}33`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>💾 Lokale Änderungen gefunden</div>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, margin: '0 0 20px' }}>
              Es gibt ungespeicherte Änderungen vom {new Date(showRestore.savedAt).toLocaleString('de-DE')}. Wiederherstellen?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setActiveDraft(showRestore.draft); setShowRestore(null); }} style={{ ...btnStyle('#22C55E'), flex: 1 }}>✅ Wiederherstellen</button>
              <button onClick={() => { try { localStorage.removeItem(`qq-draft-backup-${showRestore.draft.id}`); } catch {} setShowRestore(null); }} style={{ ...btnStyle('#EF4444'), flex: 1 }}>🗑 Verwerfen</button>
            </div>
          </div>
        </div>
      )}
      {/* Preview modal */}
      {showImport && activeDraft && (
        <QQCsvImportModal
          draft={activeDraft}
          onClose={() => setShowImport(false)}
          onApply={merged => {
            setActiveDraft({ ...activeDraft, questions: merged, updatedAt: Date.now() });
            setShowImport(false);
          }}
        />
      )}
      {showConnections && activeDraft && (
        <ConnectionsEditorModal
          initialPayload={activeDraft.connections}
          initialDurationSec={activeDraft.connectionsDurationSec}
          initialMaxFails={activeDraft.connectionsMaxFails}
          onSave={(payload, durationSec, maxFails) => {
            const newDraft = {
              ...activeDraft,
              connections: payload,
              connectionsDurationSec: durationSec,
              connectionsMaxFails: maxFails,
              updatedAt: Date.now(),
            };
            setActiveDraft(newDraft);
            saveDraftRaw(newDraft);
          }}
          onClose={() => setShowConnections(false)}
        />
      )}
      {/* Validation prompt modal */}
      {validationPrompt && (() => {
        const v = validateDraft(validationPrompt.draft);
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px 28px', maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: v.totalErrors > 0 ? '#EF4444' : '#F59E0B' }}>
                {v.totalErrors > 0 ? '🛑 Probleme gefunden' : '⚠️ Warnungen'}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                {v.totalErrors > 0 && <><b style={{ color: '#EF4444' }}>{v.totalErrors}</b> Fehler</>}
                {v.totalErrors > 0 && v.totalWarnings > 0 && ' · '}
                {v.totalWarnings > 0 && <><b style={{ color: '#F59E0B' }}>{v.totalWarnings}</b> Warnungen</>}
                {' — du kannst trotzdem speichern, aber das Event könnte daran scheitern.'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {v.byQuestion.map(qv => {
                  const q = validationPrompt.draft.questions.find(x => x.id === qv.questionId);
                  if (!q) return null;
                  const catLbl = QQ_CATEGORY_LABELS[q.category];
                  const catColor = QQ_CATEGORY_COLORS[q.category];
                  const preview = q.text.trim().slice(0, 60) || '—';
                  return (
                    <div key={qv.questionId} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}
                        onClick={() => { setActiveQId(qv.questionId); setValidationPrompt(null); }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 900, color: catColor, padding: '2px 8px', borderRadius: 6, background: catColor + '22', border: `1px solid ${catColor}44` }}>
                          {catLbl.emoji} P{qv.phaseIndex}
                        </span>
                        <span style={{ fontSize: 12, color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>
                        <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700 }}>→ öffnen</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#94a3b8' }}>
                        {qv.issues.map((iss, i) => (
                          <li key={i} style={{ color: iss.level === 'error' ? '#FCA5A5' : '#FCD34D', marginBottom: 2 }}>
                            {iss.level === 'error' ? '🛑' : '⚠️'} {iss.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setValidationPrompt(null)} style={{ ...btnStyle('#475569'), flex: 1 }}>Abbrechen</button>
                <button
                  onClick={async () => {
                    const d = validationPrompt.draft;
                    setValidationPrompt(null);
                    await saveDraftRaw(d);
                  }}
                  style={{ ...btnStyle(v.totalErrors > 0 ? '#EF4444' : '#F59E0B'), flex: 1 }}
                >
                  {v.totalErrors > 0 ? 'Trotzdem speichern' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Shared tab bar */}
      <QQEditorTabs active="builder" draftId={activeDraft.id} onSave={() => saveDraftRaw(activeDraft)} />

      {/* Header — 2026-05-10 CozyBuilder Pack A: Navy + Pink-Tint statt
          Tailwind-Slate. Subtle Pink-Border-Bottom als Brand-Anker.
          2026-05-11 (Wolf-Wunsch 'Wizard im Vollbild'): Settings (Title-
          Input, Runden, Sprache, Theme) + Aktions-Buttons (CSV, 4×4
          Finale, Host-Sheet, EN befüllen) im Wizard ausgeblendet. Bleiben:
          Zurück, Grid|Wizard-Toggle, Sound, Save. Plus Read-Only-Title
          als Mini-Pille damit Wolf weiß welcher Draft offen ist. */}
      <div style={{ padding: '12px 24px', background: 'rgba(236,72,153,0.06)', borderBottom: `1px solid ${COZY_PINK}22`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }} className="qq-builder-header">
        <button onClick={() => setActiveDraft(null)} style={btnStyle('#475569')}>← Zurück</button>
        {wizardMode ? (
          // Wizard-Mode: nur kompakter Read-Only-Title (klein, kein Edit).
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            fontSize: 13, fontWeight: 800, color: '#CBD5E1',
            maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={activeDraft.title}>
            <span>📝</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeDraft.title}</span>
          </div>
        ) : (
          <>
            <input value={activeDraft.title} onChange={e => setActiveDraft({ ...activeDraft, title: e.target.value, updatedAt: Date.now() })}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'inherit', minWidth: 220 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Runden:</span>
              {([3, 4] as const).map(n => (
                <button key={n} onClick={() => {
                  if (n === activeDraft.phases) return;
                  if (!confirm(`Zu ${n} Runden wechseln?`)) return;
                  const newDraft: QQDraft = { ...activeDraft, phases: n, questions: makeEmptyDraft(n).questions.map((eq, i) => activeDraft.questions[i] ?? eq), updatedAt: Date.now() };
                  setActiveDraft(newDraft);
                }} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: activeDraft.phases === n ? COZY_PINK : 'rgba(255,255,255,0.07)', color: activeDraft.phases === n ? '#fff' : '#94a3b8' }}>{n}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Sprache:</span>
              <select value={activeDraft.language} onChange={e => setActiveDraft({ ...activeDraft, language: e.target.value as QQLanguage })}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 8px', color: '#fff', fontFamily: 'inherit', fontSize: 13 }}>
                <option value="both">DE + EN</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Theme:</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(Object.keys(QQ_THEME_PRESETS) as Exclude<QQThemePreset, 'custom'>[]).map(t => {
                  const th = QQ_THEME_PRESETS[t];
                  const active = (activeDraft.theme?.preset ?? 'default') === t;
                  return (
                    <button key={t} onClick={() => setActiveDraft({ ...activeDraft, theme: { ...th }, updatedAt: Date.now() })}
                      title={t.charAt(0).toUpperCase() + t.slice(1)}
                      style={{ width: 22, height: 22, borderRadius: 6, border: active ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', background: `linear-gradient(135deg, ${th.bgColor}, ${th.accentColor})`, boxShadow: active ? `0 0 8px ${th.accentColor}66` : 'none' }} />
                  );
                })}
              </div>
            </div>
          </>
        )}
        {/* 2026-05-10 CozyBuilder #30: Grid ↔ Wizard Mode-Toggle.
            Grid = Übersicht für Browse/Reorder, Wizard = Slide-by-Slide
            zum konzentrierten Schreiben. Wolf-Preferenz in localStorage. */}
        <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, border: `1px solid ${COZY_PINK}22` }}>
          <button
            onClick={() => wizardMode && toggleWizardMode()}
            style={{
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 800, fontSize: 12, transition: 'all 0.15s',
              background: !wizardMode ? COZY_PINK : 'transparent',
              color: !wizardMode ? '#fff' : '#94A3B8',
              boxShadow: !wizardMode ? `0 0 12px ${COZY_PINK}66` : 'none',
            }}
            title="Grid-Übersicht — alle Fragen auf einen Blick"
          >📋 Grid</button>
          <button
            onClick={() => !wizardMode && toggleWizardMode()}
            style={{
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 800, fontSize: 12, transition: 'all 0.15s',
              background: wizardMode ? COZY_PINK : 'transparent',
              color: wizardMode ? '#fff' : '#94A3B8',
              boxShadow: wizardMode ? `0 0 12px ${COZY_PINK}66` : 'none',
            }}
            title="Wizard — Slide-by-Slide, konzentriert eine Frage nach der anderen"
          >🪄 Wizard</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 2026-05-10 CozyBuilder Audit #15: Sound-Toggle. Subtle Beats
              fürs Schreib-Erlebnis (Save-Bell, Click, Upload-Chime).
              localStorage-persistiert in 'qq-builder-sound-muted'. */}
          <button
            onClick={toggleSound}
            style={{
              padding: '6px 10px', borderRadius: 8,
              border: `1px solid ${soundMuted ? 'rgba(255,255,255,0.1)' : COZY_PINK + '44'}`,
              background: soundMuted ? 'rgba(255,255,255,0.04)' : `${COZY_PINK}14`,
              color: soundMuted ? '#64748B' : COZY_PINK,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
              transition: 'all 0.15s',
            }}
            title={soundMuted ? 'Sounds aktivieren' : 'Sounds stummschalten'}
            aria-label={soundMuted ? 'Sounds aktivieren' : 'Sounds stummschalten'}
          >{soundMuted ? '🔇' : '🔊'}</button>
          {/* 2026-05-10 CozyBuilder Pack B #7: Auto-Save-Pill. Reduziert
              Save-Angst — Wolf sieht live dass localStorage-Backup safe ist. */}
          <AutoSavePill timestamp={autoSavedAt} />
          {/* 2026-05-11 (Wolf-Wunsch 'Wizard im Vollbild'): Setup-Aktionen (CSV-
              Import, 4×4-Finale-Editor, Host-Sheet-Export, EN-Bulk-Übersetzung)
              im Wizard ausgeblendet — sind Grid-Mode-Werkzeuge. Wolf wechselt
              kurz auf 📋 Grid wenn er sie braucht. */}
          {!wizardMode && (
            <>
              <button onClick={() => setShowImport(true)} style={btnStyle('#10B981')} title="Fragen aus CSV-Datei importieren (Vorlage im Modal)">📥 CSV</button>
              <button
                onClick={() => setShowConnections(true)}
                style={btnStyle(activeDraft.connections ? '#A855F7' : '#64748B')}
                title={activeDraft.connections ? '4×4 Finale anpassen — eigenes Set gespeichert' : '4×4 Finale erstellen (sonst Default-Set)'}
              >🏆 4×4 Finale {activeDraft.connections ? '✓' : ''}</button>
              <button onClick={() => exportHostCheatsheet(activeDraft)} style={btnStyle('#F59E0B')} title="Druckbares Host-Sheet mit allen Fragen, Antworten & Moderator-Tipps">📄 Host-Sheet</button>
              <button onClick={translateAllToEnglish} style={btnStyle('#0EA5E9')} disabled={translating || saving}>{translating ? '⏳ Übersetze…' : '🌐 EN befüllen'}</button>
            </>
          )}
          {/* 2026-05-05 (Wolf 'editor useless geworden'): Folien-Editor-Button
              aus Builder entfernt. Slide-Editor jetzt nur noch im Menü unter
              Extras erreichbar fuer bestehende Drafts. */}
          {/* 2026-05-11 (Wolf): 👁 Vorschau-Button entfernt — Modal zeigte
              fake/random Beamer-Render. Wolf nutzt /beamer für echte Vorschau. */}
          {(() => {
            const v = validateDraft(activeDraft);
            const hasIssues = v.totalErrors > 0 || v.totalWarnings > 0;
            // 2026-05-10 CozyBuilder Pack A #1: Errors → Magenta (Brand-
            // Finale), Warnings → Amber (Semantik), OK → Brand-Pink.
            const saveColor = v.totalErrors > 0 ? COZY_MAGENTA : hasIssues ? '#F59E0B' : COZY_PINK;
            const label = saving
              ? '…'
              : v.totalErrors > 0
                ? `🛑 Speichern (${v.totalErrors})`
                : v.totalWarnings > 0
                  ? `⚠️ Speichern (${v.totalWarnings})`
                  : '💾 Speichern';
            // 2026-05-10 CozyBuilder Pack A #4: Save-Button belohnt jetzt.
            // Pink-Glow wenn alles OK, Click-Shrink-Bounce via CSS-Klasse.
            const isReady = !hasIssues && !saving;
            return (
              <button
                onClick={() => saveDraft(activeDraft)}
                className="cozy-save-btn"
                style={{
                  ...btnStyle(saveColor),
                  boxShadow: isReady ? `0 0 14px ${COZY_PINK}66, 0 2px 8px rgba(0,0,0,0.4)` : undefined,
                  transition: 'box-shadow 0.3s ease, transform 0.08s ease',
                }}
                disabled={saving}
                title={hasIssues ? `${v.totalErrors} Fehler, ${v.totalWarnings} Warnungen — Klick zum Prüfen` : 'Alles ok'}
              >{label}</button>
            );
          })()}
        </div>
      </div>

      {/* Body — 2026-05-10 CozyBuilder #30: Wizard-Mode-Switch.
          Wizard = WizardView (Slide-by-Slide), Default = Grid+Editor-Split. */}
      {wizardMode ? (
        <WizardView
          activeDraft={activeDraft}
          activeQId={activeQId}
          setActiveQId={setActiveQId}
          uploadingFor={uploadingFor}
          removingBgFor={removingBgFor}
          fileInputRef={fileInputRef}
          onUpload={() => activeQ && uploadImage(activeQ.id)}
          onRemoveBg={() => activeQ && removeBg(activeQ)}
          onChange={(updated: QQQuestion) => setActiveDraft(updateQuestion(activeDraft, updated))}
          onDelete={() => activeQ && (setActiveDraft(deleteQuestion(activeDraft, activeQ.id)), setActiveQId(null))}
          onOptionImageUpload={(optIdx: number) => activeQ && (setOptionUploadTarget({ questionId: activeQ.id, optionIndex: optIdx }), setTimeout(() => optionFileInputRef.current?.click(), 0))}
          onFileDrop={(file: File) => activeQ && uploadImageFile(activeQ.id, file)}
        />
      ) : (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }} className="qq-builder-body">
        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }} className="qq-builder-grid">
          <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${activeDraft.phases}, 1fr)`, gap: 6, minWidth: 560 }} className="qq-builder-grid-inner">
            {/* Header: blank + Phase labels */}
            <div />
            {Array.from({ length: activeDraft.phases }, (_, pi) => (
              <div key={pi} style={{ padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em' }}>
                Phase {pi + 1}
              </div>
            ))}
            {/* Category rows */}
            {CATEGORIES.map((cat) => [
              <div key={`cat-${cat}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: 10, background: QQ_CATEGORY_COLORS[cat] + '11', border: `1px solid ${QQ_CATEGORY_COLORS[cat]}22`, alignSelf: 'start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{QQ_CATEGORY_LABELS[cat].emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: QQ_CATEGORY_COLORS[cat], lineHeight: 1.2 }}>{QQ_CATEGORY_LABELS[cat].de}</div>
                  <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.2 }}>{QQ_CATEGORY_LABELS[cat].en}</div>
                </div>
              </div>,
              ...Array.from({ length: activeDraft.phases }, (_, pi) => {
                const phaseNum = pi + 1;
                const cellQs = getQuestionsForCell(activeDraft, phaseNum, cat);
                return (
                  <div key={`${phaseNum}-${cat}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cellQs.map((q) => {
                      const isActive = activeQId === q.id;
                      const preview = cellPreview(q);
                      const qIssues = validateQuestion(q);
                      const qLevel = worstLevel(qIssues);
                      // find position in phase for move buttons
                      const phaseQs = activeDraft.questions.filter(x => x.phaseIndex === phaseNum);
                      const qIdx = phaseQs.findIndex(x => x.id === q.id);
                      return (
                        <div key={q.id} onClick={() => setActiveQId(q.id)} style={{
                          padding: '8px 10px', borderRadius: 10, cursor: 'pointer', minHeight: 60, position: 'relative',
                          background: isActive ? `${QQ_CATEGORY_COLORS[cat]}33` : preview.text ? '#1e293b' : 'rgba(255,255,255,0.03)',
                          border: `2px solid ${isActive ? QQ_CATEGORY_COLORS[cat] : preview.text ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                          transition: 'all 0.15s',
                        }}>
                          {/* Move + delete controls */}
                          <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                            <button title="Nach oben" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'up'))}
                              style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: qIdx === 0 ? '#1e293b' : '#64748b', cursor: qIdx === 0 ? 'default' : 'pointer', fontSize: 9, lineHeight: 1, fontFamily: 'inherit' }}>▲</button>
                            <button title="Nach unten" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'down'))}
                              style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: qIdx >= phaseQs.length - 1 ? '#1e293b' : '#64748b', cursor: qIdx >= phaseQs.length - 1 ? 'default' : 'pointer', fontSize: 9, lineHeight: 1, fontFamily: 'inherit' }}>▼</button>
                            <button title="Duplizieren" onClick={() => { const r = duplicateQuestion(activeDraft, q.id); setActiveDraft(r.draft); if (r.newId) setActiveQId(r.newId); }}
                              style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#64748b', cursor: 'pointer', fontSize: 9, lineHeight: 1, fontFamily: 'inherit' }}>📋</button>
                            <button title="Löschen" onClick={() => { if (confirm('Frage löschen?')) { setActiveDraft(deleteQuestion(activeDraft, q.id)); if (activeQId === q.id) setActiveQId(null); }}}
                              style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontSize: 9, lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
                          </div>
                          {q.image?.url && <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 11 }}>🖼</div>}
                          {qLevel && (
                            <div title={qIssues.map(i => `${i.level === 'error' ? '🛑' : '⚠️'} ${i.message}`).join('\n')}
                              style={{
                                position: 'absolute', top: 4, left: q.image?.url ? 26 : 8,
                                fontSize: 10, lineHeight: 1,
                                padding: '2px 5px', borderRadius: 4,
                                background: qLevel === 'error' ? '#EF444455' : '#F59E0B55',
                                border: `1px solid ${qLevel === 'error' ? '#EF4444' : '#F59E0B'}`,
                                color: qLevel === 'error' ? '#FCA5A5' : '#FCD34D',
                                fontWeight: 900,
                              }}>
                              {qLevel === 'error' ? '🛑' : '⚠️'}{qIssues.length > 1 ? ` ${qIssues.length}` : ''}
                            </div>
                          )}
                          {preview.sub && <div style={{ fontSize: 10, fontWeight: 800, color: QQ_CATEGORY_COLORS[cat], marginBottom: 2, opacity: 0.8, paddingRight: 52 }}>{preview.sub}</div>}
                          <div style={{ fontSize: 11, color: preview.text ? '#94a3b8' : '#334155', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', paddingRight: 52 }}>
                            {preview.text || <span style={{ color: '#1e3a5f', fontStyle: 'italic' }}>Leer…</span>}
                          </div>
                          {preview.answer && <div style={{ marginTop: 3, fontSize: 10, color: '#22C55E', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{preview.answer}</div>}
                        </div>
                      );
                    })}
                    {/* Add button */}
                    <button onClick={() => {
                      const newDraft = addQuestion(activeDraft, phaseNum, cat);
                      const newQ = newDraft.questions[newDraft.questions.length - 1];
                      setActiveDraft(newDraft);
                      setActiveQId(newQ.id);
                    }} style={{
                      padding: '6px 0', borderRadius: 8, border: `1px dashed ${QQ_CATEGORY_COLORS[cat]}44`,
                      background: 'transparent', color: QQ_CATEGORY_COLORS[cat] + '99', cursor: 'pointer',
                      fontSize: 13, fontFamily: 'inherit', fontWeight: 800, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = QQ_CATEGORY_COLORS[cat] + '15'; e.currentTarget.style.color = QQ_CATEGORY_COLORS[cat]; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = QQ_CATEGORY_COLORS[cat] + '99'; }}
                    >+ Frage</button>
                  </div>
                );
              }),
            ]).flat()}
          </div>

          {/* Slide filmstrip */}
          <div style={{ marginTop: 16, paddingBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Reihenfolge ({activeDraft.questions.length} Fragen) — ◀▶ zum Verschieben
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {activeDraft.questions.map((q, i) => {
                const cat = q.category;
                const isActive = activeQId === q.id;
                const th = activeDraft.theme ?? QQ_THEME_PRESETS.default;
                const phaseQs = activeDraft.questions.filter(x => x.phaseIndex === q.phaseIndex);
                const phaseIdx = phaseQs.findIndex(x => x.id === q.id);
                return (
                  <div key={q.id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    <div
                      onClick={() => setActiveQId(q.id)}
                      className="qq-filmstrip-thumb"
                      style={{ width: 128, height: 72, borderRadius: 8, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                        background: th.bgColor ?? '#0D0A06', border: isActive ? `2px solid ${QQ_CATEGORY_COLORS[cat]}` : '2px solid rgba(255,255,255,0.08)',
                        boxShadow: isActive ? `0 0 12px ${QQ_CATEGORY_COLORS[cat]}44` : 'none', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                      {q.image?.url && <img src={q.image.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />}
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, color: QQ_CATEGORY_COLORS[cat], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {QQ_CATEGORY_LABELS[cat].emoji} P{q.phaseIndex}
                        </div>
                        <div style={{ fontSize: 8, color: th.textColor ?? '#e2e8f0', textAlign: 'center', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, width: '100%' }}>
                          {q.text || '—'}
                        </div>
                      </div>
                      <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 7, color: '#475569', fontWeight: 700 }}>#{i + 1}</div>
                      <div className="qq-filmstrip-design-btn"
                        onClick={async e => { e.stopPropagation(); await saveDraftRaw(activeDraft); navigate(`/slides?draft=${activeDraft.id}&focusQuestion=${q.id}`); }}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', zIndex: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', background: '#6366F1', padding: '3px 8px', borderRadius: 6 }}>🎨 Design</span>
                      </div>
                    </div>
                    {/* Move left/right within phase */}
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button title="In Phase früher" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'up'))}
                        disabled={phaseIdx === 0}
                        style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: phaseIdx === 0 ? '#1e293b' : '#64748b', cursor: phaseIdx === 0 ? 'default' : 'pointer', fontSize: 10, fontFamily: 'inherit' }}>◀</button>
                      <button title="In Phase später" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'down'))}
                        disabled={phaseIdx >= phaseQs.length - 1}
                        style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: phaseIdx >= phaseQs.length - 1 ? '#1e293b' : '#64748b', cursor: phaseIdx >= phaseQs.length - 1 ? 'default' : 'pointer', fontSize: 10, fontFamily: 'inherit' }}>▶</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Editor panel */}
        {activeQ && (
          <QuestionEditor
            question={activeQ}
            uploadingFor={uploadingFor}
            removingBgFor={removingBgFor}
            fileInputRef={fileInputRef}
            onUpload={() => uploadImage(activeQ.id)}
            onRemoveBg={() => removeBg(activeQ)}
            onChange={updated => setActiveDraft(updateQuestion(activeDraft, updated))}
            onDelete={() => { setActiveDraft(deleteQuestion(activeDraft, activeQ.id)); setActiveQId(null); }}
            onOptionImageUpload={(optIdx: number) => { setOptionUploadTarget({ questionId: activeQ.id, optionIndex: optIdx }); setTimeout(() => optionFileInputRef.current?.click(), 0); }}
            onFileDrop={(file: File) => uploadImageFile(activeQ.id, file)}
          />
        )}
        {!activeQ && <EmptyStateWolf />}
      </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={() => activeQ && uploadImage(activeQ.id)} />
      <input ref={optionFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadOptionImage} />
    </div>
  );
}

// ── Question editor panel ──────────────────────────────────────────────────────
function QuestionEditor({ question: q, onChange, onUpload, onRemoveBg, onDelete, uploadingFor, removingBgFor, fileInputRef, onOptionImageUpload, onFileDrop, visibleSections, fullWidth }: {
  question: QQQuestion; onChange: (q: QQQuestion) => void; onUpload: () => void; onRemoveBg: () => void; onDelete: () => void;
  uploadingFor: string | null; removingBgFor: string | null; fileInputRef: React.RefObject<HTMLInputElement>;
  onOptionImageUpload: (optIdx: number) => void;
  onFileDrop?: (file: File) => void;
  /** 2026-05-11 Wizard-Sub-Steps: wenn gesetzt, nur die genannten Sektionen
   *  rendern. Wenn undefined: alle Sektionen sichtbar (Grid-Mode). */
  visibleSections?: Set<WizardSection>;
  /** Wizard-Mode: Editor füllt verfügbare Breite, kein 480-Sidebar-Fix. */
  fullWidth?: boolean;
}) {
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  const img = q.image;
  const showImage = q.category !== 'CHEESE'; // Picture This always shows image; others optional
  const issues = validateQuestion(q);
  const errorCount = issues.filter(i => i.level === 'error').length;
  const warnCount = issues.filter(i => i.level === 'warning').length;
  // 2026-05-10 CozyBuilder Pack B #9: Drag-Drop-State für Visual-Highlight.
  const [dragOver, setDragOver] = useState(false);
  // 2026-05-11 Wizard-Sub-Steps: Helper für conditional-Section-Render.
  const show = (s: WizardSection) => !visibleSections || visibleSections.has(s);

  function setImg(patch: Partial<QQQuestionImage>) {
    onChange({ ...q, image: { ...(img ?? { url: '', layout: 'fullscreen', animation: 'none' }), ...patch } });
  }

  return (
    <div
      className="qq-builder-editor"
      onDragOver={(e) => { if (onFileDrop && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!onFileDrop) return;
        e.preventDefault(); setDragOver(false);
        const file = Array.from(e.dataTransfer.files ?? []).find(f => f.type.startsWith('image/'));
        if (file) onFileDrop(file);
      }}
      style={{
        ...(fullWidth
          ? { width: '100%', flex: 1, borderLeft: 'none' }
          : { width: 480, flexShrink: 0, borderLeft: `1px solid ${dragOver ? COZY_PINK : 'rgba(255,255,255,0.07)'}` }),
        background: dragOver ? `${COZY_PINK}14` : (fullWidth ? 'transparent' : '#1e293b'),
        overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
        position: 'relative',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Drop-Hint-Overlay — sichtbar nur während Drag-Over */}
      {dragOver && (
        <div aria-hidden style={{
          position: 'absolute', inset: 8, borderRadius: 18,
          border: `3px dashed ${COZY_PINK}`,
          background: 'rgba(236,72,153,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 100,
          fontSize: 18, fontWeight: 900, color: '#fff',
          textShadow: `0 0 12px ${COZY_PINK}`,
          letterSpacing: '0.04em',
        }}>📎 Bild hier loslassen</div>
      )}

      {/* Validation summary */}
      {issues.length > 0 && (
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: errorCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${errorCount > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`,
          borderLeft: `4px solid ${errorCount > 0 ? '#EF4444' : '#F59E0B'}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: errorCount > 0 ? '#FCA5A5' : '#FCD34D', marginBottom: 6 }}>
            {errorCount > 0 ? `🛑 ${errorCount} Fehler` : ''}{errorCount > 0 && warnCount > 0 ? ' · ' : ''}{warnCount > 0 ? `⚠️ ${warnCount} Warnungen` : ''}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
            {issues.map((iss, i) => (
              <li key={i} style={{ color: iss.level === 'error' ? '#FCA5A5' : '#FCD34D' }}>
                {iss.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Category header — nur im Grid-Mode (im Wizard zeigt Phase-Pille oben
          schon die Kategorie + es gibt einen Step-Hero mit Titel). */}
      {!visibleSections && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: catColor + '22', border: `1px solid ${catColor}44` }}>
          <span style={{ fontSize: 20 }}>{catLabel.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: catColor }}>{catLabel.de} <span style={{ color: '#475569', fontWeight: 400 }}>/ {catLabel.en}</span></div>
            <div style={{ fontSize: 11, color: '#475569' }}>Phase {q.phaseIndex}</div>
          </div>
          <button onClick={() => { if (confirm('Frage löschen?')) onDelete(); }}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 800 }}>
            🗑 Löschen
          </button>
        </div>
      )}

      {/* Mini live preview — nur sichtbar wenn 'image'-Section sichtbar (oder
          Grid-Mode wo immer alle Sektionen rendern). MiniPreviewPanel selber
          rendert nur bei CHEESE etwas. */}
      {(show('image') || !visibleSections) && <MiniPreviewPanel question={q} />}


      {/* Question text DE/EN — Section 'text'.
          2026-05-11 (Wolf-Entscheid 'Mod-Notiz + Fun-Fact sind eigentlich
          gleich'): hostNote-Field aus dem Builder entfernt. Fun-Fact (mit
          DE+EN) ist jetzt das einzige Mod-Private-Feld. Alte Drafts mit
          hostNote bleiben in der DB; Mod-Cheatsheet rendert sie weiter,
          aber im Builder nicht mehr editierbar. */}
      {show('text') && (
        <>
          <div>
            <label style={labelStyle}>Frage (DE)</label>
            <textarea
              className="cozy-input"
              value={q.text}
              onChange={e => onChange({ ...q, text: e.target.value })}
              style={{ ...textareaStyle, borderColor: catColor + '55', ['--cozy-focus-color' as any]: catColor }}
              rows={fullWidth ? 4 : 3}
              placeholder="Fragetext auf Deutsch…"
              autoFocus={fullWidth}
            />
          </div>
          <div>
            <label style={labelStyle}>Frage (EN) <span style={{ color: '#334155' }}>optional</span></label>
            <textarea
              className="cozy-input"
              value={q.textEn ?? ''}
              onChange={e => onChange({ ...q, textEn: e.target.value })}
              style={{ ...textareaStyle, borderColor: catColor + '33', ['--cozy-focus-color' as any]: catColor }}
              rows={fullWidth ? 3 : 2}
              placeholder="Question text in English…"
            />
          </div>
        </>
      )}

      {/* Mod-Notiz / Fun-Fact — Section 'funFact'.
          2026-05-11 (Wolf-Merge): das EINZIGE Mod-Private-Feld jetzt. Vorher
          gab es zusätzlich q.hostNote — semantisch quasi identisch (beides
          mod-privat), aber doppelte UI. Wolf nutzt jetzt nur funFact (mit
          DE+EN). Im Mod-Cheatsheet wird beides gerendert (falls hostNote
          aus alten Drafts noch da ist), aber im Builder nur funFact. */}
      {show('funFact') && (
        <div>
          <label style={labelStyle}>
            💡 Mod-Notiz / Fun-Fact <span style={{ color: '#334155' }}>nur für Mod sichtbar — beim Reveal einwerfen</span>
          </label>
          <textarea
            value={q.funFact ?? ''}
            onChange={e => onChange({ ...q, funFact: e.target.value || undefined })}
            style={{ ...textareaStyle, borderColor: 'rgba(168,85,247,0.35)' }}
            rows={fullWidth ? 3 : 2}
            placeholder="Witziger oder überraschender Fakt zum Thema — oder Ablauf-Tipp/Mechanik-Hinweis für dich."
          />
          <label style={{ ...labelStyle, marginTop: 6 }}>
            Mod-Note / Fun Fact (EN) <span style={{ color: '#334155' }}>optional</span>
          </label>
          <textarea
            value={q.funFactEn ?? ''}
            onChange={e => onChange({ ...q, funFactEn: e.target.value || undefined })}
            style={{ ...textareaStyle, borderColor: 'rgba(168,85,247,0.2)' }}
            rows={fullWidth ? 3 : 2}
            placeholder="Fun fact or mod-note in English…"
          />
        </div>
      )}

      {/* ── Category-specific answer fields — Section 'main' ── */}
      {show('main') && <CategoryFields question={q} onChange={onChange} catColor={catColor} onOptionImageUpload={onOptionImageUpload} />}

      {/* ── Image-Header + Upload + BG-remove — Section 'image' ── */}
      {show('image') && (
      <div style={{ borderTop: visibleSections ? 'none' : '1px solid rgba(255,255,255,0.07)', paddingTop: visibleSections ? 0 : 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 10 }}>
          🖼 Bild {q.category === 'CHEESE' ? '(Pflicht)' : '(optional)'}
        </div>

        {img?.url ? (
          // Bild vorhanden: Preview + Replace/Remove
          <>
            <div style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#0f172a', height: fullWidth ? 200 : 140 }}>
              <img src={img.bgRemovedUrl ?? img.url} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: (img.layout === 'cutout' || img.layout === 'window-left' || img.layout === 'window-right') ? 'contain' : 'cover',
                transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
              }} />
              {img.bgRemovedUrl && <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(34,197,94,0.9)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: '#fff' }}>✓ BG entfernt</div>}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={!!uploadingFor} style={{ ...btnStyle('#3B82F6'), width: '100%', marginBottom: 6 }}>
              {uploadingFor === q.id ? '⏳ Lädt hoch…' : '🔄 Bild ersetzen'}
            </button>
            <button onClick={onRemoveBg} disabled={!!removingBgFor} style={{ ...btnStyle('#8B5CF6'), width: '100%', marginBottom: 10 }}>
              {removingBgFor === q.id ? '⏳ Entferne Hintergrund…' : '✂️ Hintergrund entfernen'}
            </button>
          </>
        ) : (
          // Empty-State: große einladende Drop-Zone statt nüchterner Upload-Button.
          // 2026-05-11: Wolf-Maskottchen + Drag-Drop-Hint + Strg+V-Hinweis.
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              minHeight: fullWidth ? 280 : 180,
              borderRadius: 14,
              border: `2px dashed ${catColor}55`,
              background: `${catColor}08`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '24px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${catColor}14`;
              e.currentTarget.style.borderColor = `${catColor}99`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${catColor}08`;
              e.currentTarget.style.borderColor = `${catColor}55`;
            }}
          >
            <div style={{ fontSize: fullWidth ? 60 : 44, lineHeight: 1, opacity: 0.7 }}>
              {q.category === 'CHEESE' ? '🧀' : '🖼️'}
            </div>
            <div style={{ fontSize: fullWidth ? 16 : 14, fontWeight: 900, color: '#F8FAFC', textAlign: 'center' }}>
              {uploadingFor === q.id ? '⏳ Lädt hoch…' : 'Bild hier loslassen oder klicken'}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', fontWeight: 600, lineHeight: 1.4 }}>
              Drag &amp; Drop · Strg+V aus Zwischenablage · Klick zum Auswählen
            </div>
            {q.category === 'CHEESE' && (
              <div style={{
                marginTop: 4, padding: '4px 10px', borderRadius: 999,
                background: `${catColor}22`, border: `1px solid ${catColor}66`,
                fontSize: 10, fontWeight: 800, color: catColor,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Pflicht für Picture-This</div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ── CHEESE Layout-Picker (Horizontal/Hochkant) — Section 'cheeseLayout' ── */}
      {show('cheeseLayout') && q.category === 'CHEESE' && (
        <CheeseLayoutPicker q={q} onChange={onChange} />
      )}

      {/* ── Image position canvas + sliders — Section 'imagePosition' ── */}
      {show('imagePosition') && img?.url && (
      <div style={{ borderTop: visibleSections ? 'none' : '1px solid rgba(255,255,255,0.07)', paddingTop: visibleSections ? 0 : 12 }}>
        <>
            {/* Image position & scale controls — drag canvas */}
            <label style={{ ...labelStyle, marginTop: 8 }}>Position & Größe <span style={{ fontSize: 10, color: '#334155', fontWeight: 400 }}>Drag = verschieben · Scroll = Zoom</span></label>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* 16:9 interactive drag preview */}
              <div
                style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', cursor: 'grab', background: '#000', marginBottom: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseDown={e => {
                  e.preventDefault();
                  const startX = e.clientX, startY = e.clientY;
                  const startOX = img.offsetX ?? 0, startOY = img.offsetY ?? 0;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const onMove = (ev: MouseEvent) => {
                    const dx = ((ev.clientX - startX) / rect.width) * 200;
                    const dy = ((ev.clientY - startY) / rect.height) * 200;
                    setImg({ offsetX: Math.round(Math.max(-100, Math.min(100, startOX + dx))), offsetY: Math.round(Math.max(-100, Math.min(100, startOY + dy))) });
                  };
                  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
                onWheel={e => {
                  e.preventDefault();
                  const cur = img.scale ?? 1;
                  const delta = e.deltaY > 0 ? -0.05 : 0.05;
                  const minScale = q.category === 'CHEESE' ? 0.5 : 0.1;
                  setImg({ scale: Math.round(Math.max(minScale, Math.min(3, cur + delta)) * 100) / 100 });
                }}
                onTouchStart={e => {
                  if (e.touches.length !== 1) return;
                  const t = e.touches[0];
                  const startX = t.clientX, startY = t.clientY;
                  const startOX = img.offsetX ?? 0, startOY = img.offsetY ?? 0;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const onMove = (ev: TouchEvent) => {
                    ev.preventDefault();
                    const ct = ev.touches[0];
                    const dx = ((ct.clientX - startX) / rect.width) * 200;
                    const dy = ((ct.clientY - startY) / rect.height) * 200;
                    setImg({ offsetX: Math.round(Math.max(-100, Math.min(100, startOX + dx))), offsetY: Math.round(Math.max(-100, Math.min(100, startOY + dy))) });
                  };
                  const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
                  window.addEventListener('touchmove', onMove, { passive: false });
                  window.addEventListener('touchend', onEnd);
                }}
              >
                {q.category === 'CHEESE' ? (() => {
                  // CHEESE Preview spiegelt Beamer-Rendering: blurred cover backdrop +
                  // sharp contain foreground. scale=1 zeigt das vollständige Bild
                  // (kein Crop), scale>1 zoomt rein, scale<1 lässt Backdrop um das
                  // Bild herum sichtbar werden.
                  const z = img.scale ?? 1;
                  const px = 50 + (img.offsetX ?? 0) / 2;
                  const py = 50 + (img.offsetY ?? 0) / 2;
                  const url = img.bgRemovedUrl ?? img.url;
                  return (
                    <>
                      {/* Layer 1: blurred backdrop */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        filter: 'blur(20px) brightness(0.45) saturate(1.1)',
                        transform: 'scale(1.15)',
                        transformOrigin: 'center',
                        pointerEvents: 'none',
                      }} />
                      {/* Layer 2: sharp contain foreground */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${url})`,
                        backgroundSize: 'contain',
                        backgroundPosition: `${px}% ${py}%`,
                        backgroundRepeat: 'no-repeat',
                        transform: `scale(${z})${img.rotation ? ` rotate(${img.rotation}deg)` : ''}`,
                        transformOrigin: `${px}% ${py}%`,
                        pointerEvents: 'none', transition: 'background-position 0.05s, transform 0.05s',
                      }} />
                    </>
                  );
                })() : (
                  <img src={img.bgRemovedUrl ?? img.url} alt="" style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                    transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
                    pointerEvents: 'none', transition: 'transform 0.05s',
                  }} />
                )}
                {/* Crosshair */}
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)', pointerEvents: 'none' }} />
                {/* CHEESE: Safe-Area-Overlay — zeigt wo die Frage-Card auf dem Beamer liegt */}
                {q.category === 'CHEESE' && (
                  <>
                    <div style={{
                      position: 'absolute', left: '8%', right: '8%', bottom: '8%', height: '32%',
                      border: '1.5px dashed rgba(255,215,0,0.55)',
                      background: 'rgba(13,10,6,0.25)',
                      borderRadius: 8, pointerEvents: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,215,0,0.8)', letterSpacing: '0.08em' }}>
                        FRAGE-CARD · nicht verdecken
                      </span>
                    </div>
                  </>
                )}
                {/* Position indicator */}
                <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4 }}>
                  X:{img.offsetX ?? 0} Y:{img.offsetY ?? 0} · {((img.scale ?? 1) * 100).toFixed(0)}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>
                    Zoom ({((img.scale ?? 1) * 100).toFixed(0)}%)
                    {q.category === 'CHEESE' && <span style={{ color: '#334155', fontSize: 9 }}> · 100% = ganzes Bild</span>}
                  </div>
                  <input
                    type="range"
                    min={q.category === 'CHEESE' ? 50 : 10}
                    max={300}
                    value={Math.max((img.scale ?? 1) * 100, q.category === 'CHEESE' ? 50 : 10)}
                    onChange={e => setImg({ scale: Number(e.target.value) / 100 })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Drehung ({img.rotation ?? 0}°)</div>
                  <input type="range" min={0} max={360} value={img.rotation ?? 0} onChange={e => setImg({ rotation: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
              {(img.offsetX || img.offsetY || (img.scale && img.scale !== 1) || img.rotation) && (
                <button onClick={() => setImg({ offsetX: 0, offsetY: 0, scale: 1, rotation: 0 })} style={{ ...btnStyle('#475569'), width: '100%', marginTop: 8, fontSize: 11 }}>↩ Zurücksetzen</button>
              )}
            </div>

            {/* Visual adjustments */}
            <label style={{ ...labelStyle, marginTop: 12 }}>Visuelle Anpassungen</label>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Deckkraft ({((img.opacity ?? 1) * 100).toFixed(0)}%)</div>
                  <input type="range" min={0} max={100} value={(img.opacity ?? 1) * 100} onChange={e => setImg({ opacity: Number(e.target.value) / 100 })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Helligkeit ({img.brightness ?? 100}%)</div>
                  <input type="range" min={0} max={200} value={img.brightness ?? 100} onChange={e => setImg({ brightness: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Kontrast ({img.contrast ?? 100}%)</div>
                  <input type="range" min={0} max={200} value={img.contrast ?? 100} onChange={e => setImg({ contrast: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Weichzeichner ({img.blur ?? 0}px)</div>
                  <input type="range" min={0} max={20} value={img.blur ?? 0} onChange={e => setImg({ blur: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
              {(img.opacity !== undefined && img.opacity !== 1) || (img.brightness !== undefined && img.brightness !== 100) || (img.contrast !== undefined && img.contrast !== 100) || img.blur ? (
                <button onClick={() => setImg({ opacity: 1, brightness: 100, contrast: 100, blur: 0 })} style={{ ...btnStyle('#475569'), width: '100%', marginTop: 8, fontSize: 11 }}>↩ Filter zurücksetzen</button>
              ) : null}
            </div>
            {/* 2026-05-11 (Wolf-Cleanup): Animation-Timing-Sliders entfernt —
                wirken nur bei layout='cutout' (Picker entfernt). */}
        </>
      </div>
      )}

      {/* ── Floating Emojis — only in Grid-Mode (advanced) ── */}
      {!visibleSections && (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 8 }}>
          ✨ Deko-Emojis <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
          Überschreibt die Standard-Emojis der Kategorie. Leer = Standard.
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <input
              key={i}
              value={q.emojis?.[i] ?? ''}
              onChange={e => {
                const emojis = [...(q.emojis ?? ['', '', ''])];
                emojis[i] = e.target.value;
                // Clear array if all empty
                const hasAny = emojis.some(v => v.trim());
                onChange({ ...q, emojis: hasAny ? emojis : undefined });
              }}
              placeholder={['Emoji 1', 'Emoji 2', 'Emoji 3'][i]}
              style={{ ...inputStyle, flex: 1, textAlign: 'center', fontSize: 20, padding: '6px 4px' }}
              maxLength={4}
            />
          ))}
        </div>
      </div>

      )}
      {/* ── Music (per-question MP3) — only in Grid-Mode (advanced) ── */}
      {!visibleSections && (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 8 }}>
          🎵 Hintergrundmusik <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional, MP3)</span>
        </div>
        {q.musicUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <audio src={q.musicUrl} controls style={{ height: 32, flex: 1 }} />
              <button onClick={() => onChange({ ...q, musicUrl: undefined, musicMode: undefined })} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#EF4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 11 }}>✕</button>
            </div>
            {/* 2026-05-07 (Wolf-Konzept): Musik-Modus pro Frage. Default 'auto'
                = altes Verhalten (active+reveal). 'revealOnly' fuer Climax-
                Songs (z.B. ESC-Sieger-Song erst bei Aufloesung). */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Wann spielen?</label>
              <select
                value={q.musicMode ?? 'auto'}
                onChange={e => onChange({ ...q, musicMode: e.target.value as QQQuestion['musicMode'] })}
                style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="auto" style={{ background: '#0f172a' }}>🅰️ Auto — laeuft Frage + Reveal (Standard)</option>
                <option value="duringActive" style={{ background: '#0f172a' }}>⏱ Nur waehrend der Frage (stoppt beim Reveal)</option>
                <option value="revealOnly" style={{ background: '#0f172a' }}>🎉 Nur beim Reveal (Climax-Song)</option>
                <option value="audioQuestion" style={{ background: '#0f172a' }}>🎧 Audio-Frage (Song = Frage, hoere genau hin)</option>
              </select>
            </div>
          </div>
        ) : (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
            MP3 hochladen (max 10 MB)
            <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) { alert('max 10 MB'); e.target.value = ''; return; }
              const fd = new FormData(); fd.append('file', file);
              try {
                const res = await fetch('/api/upload/question-audio', { method: 'POST', body: fd });
                if (!res.ok) throw new Error();
                const data = await res.json();
                onChange({ ...q, musicUrl: data.audioUrl });
              } catch { alert('Upload fehlgeschlagen'); }
              e.target.value = '';
            }} />
          </label>
        )}
      </div>
      )}
    </div>
  );
}

// ── Category-specific answer fields ───────────────────────────────────────────
function CategoryFields({ question: q, onChange, catColor, onOptionImageUpload }: { question: QQQuestion; onChange: (q: QQQuestion) => void; catColor: string; onOptionImageUpload: (optIdx: number) => void }) {

  // SCHAETZCHEN ────────────────────────────────────────────────────────────────
  if (q.category === 'SCHAETZCHEN') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#94a3b8' }}>
        Teams geben eine Zahl ein. Die nächste Zahl gewinnt automatisch.
      </div>
      <div>
        <label style={labelStyle}>Zielwert (Zahl)</label>
        <input type="number" value={q.targetValue ?? ''} onChange={e => onChange({ ...q, targetValue: e.target.value === '' ? undefined : Number(e.target.value) })}
          style={{ ...inputStyle, borderColor: 'rgba(245,158,11,0.4)' }} placeholder={q.isYearAnswer ? 'z.B. 1989' : 'z.B. 1989 oder 2500000'} />
      </div>
      {/* 2026-05-07 (Wolf): Jahreszahl-Toggle. Bei true → kein Tausender-Punkt
          im Antwort-Display, /team-Input rendert ohne Komma-Group, Range-Hint
          ~1000-2200. Default false (freie Zahl mit Tausender-Format). */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: q.isYearAnswer ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${q.isYearAnswer ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}`,
        cursor: 'pointer', userSelect: 'none', fontSize: 12, fontWeight: 700,
        color: q.isYearAnswer ? '#FBBF24' : '#94a3b8',
        transition: 'all 0.15s',
      }}>
        <input
          type="checkbox"
          checked={!!q.isYearAnswer}
          onChange={e => onChange({ ...q, isYearAnswer: e.target.checked || undefined })}
          style={{ width: 16, height: 16, accentColor: '#F59E0B', cursor: 'pointer' }}
        />
        <span>📅 Jahreszahl als Lösung</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
          {q.isYearAnswer ? 'kein Tausender-Punkt · Range ~1000-2200' : 'freie Zahl, mit Tausender-Format'}
        </span>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Einheit (DE) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.unit ?? ''} onChange={e => onChange({ ...q, unit: e.target.value })} style={inputStyle} placeholder={q.isYearAnswer ? '(meist leer)' : 'z.B. Meter'} />
          {/* 2026-05-10 CozyBuilder Audit #19: Smart-Unit-Suggest aus Frage-
              Text. Heuristik: 'Wie viele Brücken …' → Vorschlag 'Brücken'. */}
          {(() => {
            if (q.isYearAnswer || (q.unit ?? '').trim()) return null;
            const suggested = suggestSchaetzchenUnit(q.text ?? '');
            if (!suggested) return null;
            return (
              <button
                type="button"
                onClick={() => onChange({ ...q, unit: suggested })}
                style={{
                  marginTop: 6, padding: '4px 10px', borderRadius: 999,
                  border: `1px dashed ${COZY_PINK}55`,
                  background: 'rgba(236,72,153,0.08)',
                  color: '#FBCFE8', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
                title="Klick um Vorschlag zu übernehmen"
              >
                <span>✨</span><span>Vorschlag: <strong>{suggested}</strong></span>
              </button>
            );
          })()}
        </div>
        <div>
          <label style={labelStyle}>Unit (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.unitEn ?? ''} onChange={e => onChange({ ...q, unitEn: e.target.value })} style={inputStyle} placeholder={q.isYearAnswer ? '(usually empty)' : 'e.g. metres'} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Antwort-Text (DE) <span style={{ color: '#334155' }}>für Anzeige</span></label>
        <input value={q.answer} onChange={e => onChange({ ...q, answer: e.target.value })} style={inputStyle} placeholder="z.B. 1.989 Meter" />
      </div>
      <div>
        <label style={labelStyle}>Answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
        <input value={q.answerEn ?? ''} onChange={e => onChange({ ...q, answerEn: e.target.value })} style={inputStyle} placeholder="e.g. 1,989 metres" />
      </div>
    </div>
  );

  // MUCHO ──────────────────────────────────────────────────────────────────────
  if (q.category === 'MUCHO') {
    const opts = q.options ?? ['', '', '', ''];
    const optsEn = q.optionsEn ?? ['', '', '', ''];
    const correct = q.correctOptionIndex ?? 0;
    const labels = ['A', 'B', 'C', 'D'];
    const optImgs = q.optionImages ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
          4 Antwortoptionen — eine ist korrekt. Optional: Bilder pro Option.
        </div>
        {[0, 1, 2, 3].map(i => {
          const optImg = optImgs[i];
          return (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: correct === i ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
            {optImg?.url && <img src={optImg.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.15, pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: catColor + '33', border: `1px solid ${catColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: catColor, flexShrink: 0 }}>{labels[i]}</div>
                <button onClick={() => onChange({ ...q, correctOptionIndex: i, answer: opts[i], answerEn: optsEn[i] || undefined })}
                  style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.1)'}`, background: correct === i ? 'rgba(34,197,94,0.15)' : 'transparent', color: correct === i ? '#22C55E' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800 }}>
                  {correct === i ? '✓ Korrekt' : 'Als Antwort'}
                </button>
                <button onClick={() => onOptionImageUpload(i)} style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: optImg?.url ? 'rgba(139,92,246,0.15)' : 'transparent', color: optImg?.url ? '#A78BFA' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>
                  {optImg?.url ? '🔄 Bild' : '🖼 Bild'}
                </button>
                {optImg?.url && (
                  <button onClick={() => { const imgs = [...optImgs]; imgs[i] = null; onChange({ ...q, optionImages: imgs }); }}
                    style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>✕</button>
                )}
              </div>
              {optImg?.url && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>Deckkraft:</span>
                  <input type="range" min={5} max={100} value={(optImg.opacity ?? 0.4) * 100} onChange={e => { const imgs = [...optImgs]; imgs[i] = { ...optImg, opacity: Number(e.target.value) / 100 }; onChange({ ...q, optionImages: imgs }); }}
                    style={{ flex: 1, height: 14 }} />
                  <span style={{ fontSize: 9, color: '#64748b', width: 28 }}>{((optImg.opacity ?? 0.4) * 100).toFixed(0)}%</span>
                </div>
              )}
              <input value={opts[i]} onChange={e => { const o = [...opts]; o[i] = e.target.value; onChange({ ...q, options: o, answer: correct === i ? e.target.value : q.answer }); }}
                style={inputStyle} placeholder={`Option ${labels[i]} (DE)…`} />
              <input value={optsEn[i] ?? ''} onChange={e => { const o = [...optsEn]; o[i] = e.target.value; onChange({ ...q, optionsEn: o, answerEn: correct === i ? e.target.value : q.answerEn }); }}
                style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder={`Option ${labels[i]} (EN, optional)…`} />
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  // ZEHN_VON_ZEHN (All In) ─────────────────────────────────────────────────────
  if (q.category === 'ZEHN_VON_ZEHN') {
    const opts = q.options ?? ['', '', ''];
    const optsEn = q.optionsEn ?? ['', '', ''];
    const correct = q.correctOptionIndex ?? 0;
    const optImgs = q.optionImages ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#94a3b8' }}>
          3 Optionen (1 / 2 / 3) — Teams verteilen Punkte. Optional: Bilder pro Option.
        </div>
        {[0, 1, 2].map(i => {
          const optImg = optImgs[i];
          return (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: correct === i ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
            {optImg?.url && <img src={optImg.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.15, pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: catColor + '33', border: `1px solid ${catColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: catColor, flexShrink: 0 }}>{i + 1}</div>
                <button onClick={() => onChange({ ...q, correctOptionIndex: i, answer: opts[i], answerEn: optsEn[i] || undefined })}
                  style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.1)'}`, background: correct === i ? 'rgba(34,197,94,0.15)' : 'transparent', color: correct === i ? '#22C55E' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800 }}>
                  {correct === i ? '✓ Korrekt' : 'Als Antwort'}
                </button>
                <button onClick={() => onOptionImageUpload(i)} style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: optImg?.url ? 'rgba(139,92,246,0.15)' : 'transparent', color: optImg?.url ? '#A78BFA' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>
                  {optImg?.url ? '🔄 Bild' : '🖼 Bild'}
                </button>
                {optImg?.url && (
                  <button onClick={() => { const imgs = [...optImgs]; imgs[i] = null; onChange({ ...q, optionImages: imgs }); }}
                    style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>✕</button>
                )}
              </div>
              {optImg?.url && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>Deckkraft:</span>
                  <input type="range" min={5} max={100} value={(optImg.opacity ?? 0.4) * 100} onChange={e => { const imgs = [...optImgs]; imgs[i] = { ...optImg, opacity: Number(e.target.value) / 100 }; onChange({ ...q, optionImages: imgs }); }}
                    style={{ flex: 1, height: 14 }} />
                  <span style={{ fontSize: 9, color: '#64748b', width: 28 }}>{((optImg.opacity ?? 0.4) * 100).toFixed(0)}%</span>
                </div>
              )}
              <input value={opts[i]} onChange={e => { const o = [...opts]; o[i] = e.target.value; onChange({ ...q, options: o, answer: correct === i ? e.target.value : q.answer }); }}
                style={inputStyle} placeholder={`Option ${i + 1} (DE)…`} />
              <input value={optsEn[i] ?? ''} onChange={e => { const o = [...optsEn]; o[i] = e.target.value; onChange({ ...q, optionsEn: o, answerEn: correct === i ? e.target.value : q.answerEn }); }}
                style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder={`Option ${i + 1} (EN, optional)…`} />
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  // CHEESE / Picture This ──────────────────────────────────────────────────────
  if (q.category === 'CHEESE') {
    // 2026-05-11 (Wolf-Bug 'wo wähle ich Layout?'): Layout-Toggle wurde aus
    // CategoryFields-CHEESE rausgezogen und in eigene Section 'cheeseLayout'
    // verschoben — wird jetzt von QuestionEditor im Bild-Sub-Step gerendert.
    // CHEESE-CategoryFields zeigen nur noch die Antwort-Felder.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
          Ein Bild wird gezeigt. Teams tippen die Antwort als Freitext.
        </div>
        <div>
          <label style={labelStyle}>Antwort (DE)</label>
          <input value={q.answer} onChange={e => onChange({ ...q, answer: e.target.value })} style={{ ...inputStyle, borderColor: 'rgba(139,92,246,0.4)' }} placeholder="z.B. Jungfernstieg" />
        </div>
        <div>
          <label style={labelStyle}>Answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.answerEn ?? ''} onChange={e => onChange({ ...q, answerEn: e.target.value })} style={inputStyle} placeholder="e.g. Jungfernstieg" />
        </div>
      </div>
    );
  }

  // BUNTE_TUETE ────────────────────────────────────────────────────────────────
  if (q.category === 'BUNTE_TUETE') {
    const kind = q.bunteTuete?.kind ?? 'hotPotato';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Sub-mechanic picker */}
        <div>
          <label style={labelStyle}>🎁 Bunte-Tüte-Mechanik</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {BUNTE_KINDS.map(k => {
              const lbl = QQ_BUNTE_TUETE_LABELS[k];
              const active = kind === k;
              return (
                <button key={k} onClick={() => {
                  let bt: QQBunteTuetePayload;
                  if (k === 'hotPotato') bt = { kind: 'hotPotato' };
                  else if (k === 'top5') bt = { kind: 'top5', answers: ['', '', '', '', ''] };
                  else if (k === 'oneOfEight') bt = { kind: 'oneOfEight', statements: ['', '', '', '', '', '', '', ''], falseIndex: 0 };
                  else if (k === 'order') bt = { kind: 'order', items: ['', '', ''], correctOrder: [0, 1, 2] };
                  else if (k === 'map') bt = { kind: 'map', lat: 53.55, lng: 10.0, targetLabel: '' };
                  else if (k === 'onlyConnect') bt = { kind: 'onlyConnect', hints: ['', '', '', ''], answer: '' };
                  else if (k === 'bluff') bt = { kind: 'bluff', realAnswer: '' };
                  else bt = { kind: 'hotPotato' };
                  onChange({ ...q, bunteTuete: bt });
                }} style={{ padding: '7px 8px', borderRadius: 8, border: `1px solid ${active ? catColor + '66' : 'rgba(255,255,255,0.08)'}`, background: active ? catColor + '22' : 'rgba(255,255,255,0.03)', color: active ? catColor : '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800, textAlign: 'left' }}>
                  {lbl.emoji} {lbl.de}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-mechanic specific fields */}
        <BunteTueteFields question={q} onChange={onChange} />
      </div>
    );
  }

  return null;
}

// ── Bunte Tüte sub-mechanic editors ───────────────────────────────────────────
function BunteTueteFields({ question: q, onChange }: { question: QQQuestion; onChange: (q: QQQuestion) => void }) {
  const bt = q.bunteTuete;
  if (!bt) return null;

  // HOT POTATO ─────────────────────────────────────────────────────────────────
  if (bt.kind === 'hotPotato') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#94a3b8' }}>
        🥔 Teams werden reihum gefragt. Wer falsch antwortet scheidet aus. Letztes Team gewinnt. Moderator bewertet jede Antwort live.
      </div>
      <div>
        <label style={labelStyle}>Antwort (für Moderator-Referenz, DE)</label>
        <input value={q.answer} onChange={e => onChange({ ...q, answer: e.target.value })} style={inputStyle} placeholder="Korrekte Antwort…" />
      </div>
      <div>
        <label style={labelStyle}>Answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
        <input value={q.answerEn ?? ''} onChange={e => onChange({ ...q, answerEn: e.target.value })} style={inputStyle} placeholder="Correct answer…" />
      </div>
    </div>
  );

  // TOP 5 ──────────────────────────────────────────────────────────────────────
  if (bt.kind === 'top5') {
    const ans = bt.answers ?? ['', '', '', '', ''];
    const ansEn = bt.answersEn ?? ['', '', '', '', ''];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: '#94a3b8' }}>
          🏆 Teams nennen bis zu 5 Antworten. Alle gültigen treffer zählen.
        </div>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 22, flexShrink: 0, fontSize: 12, fontWeight: 900, color: '#475569', textAlign: 'center' }}>#{i + 1}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input value={ans[i] ?? ''} onChange={e => { const a = [...ans]; a[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, answers: a }, answer: a.filter(Boolean).join(', ') }); }}
                style={inputStyle} placeholder={`Antwort ${i + 1} (DE)…`} />
              <input value={ansEn[i] ?? ''} onChange={e => { const a = [...ansEn]; a[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, answersEn: a } }); }}
                style={{ ...inputStyle, fontSize: 12, opacity: 0.7 }} placeholder={`Answer ${i + 1} (EN, opt.)…`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ONE OF EIGHT / Imposter ────────────────────────────────────────────────────
  if (bt.kind === 'oneOfEight') {
    const stmts = bt.statements ?? Array(8).fill('');
    const stmtsEn = bt.statementsEn ?? Array(8).fill('');
    const falseIdx = bt.falseIndex ?? 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#94a3b8' }}>
          🕵️ 8 Aussagen, eine ist falsch (der Imposter). Teams raten welche.
        </div>
        {Array(8).fill(null).map((_, i) => {
          const isFalse = falseIdx === i;
          return (
            <div key={i} style={{ padding: '8px 10px', borderRadius: 10, border: `2px solid ${isFalse ? '#EF4444' : 'rgba(255,255,255,0.07)'}`, background: isFalse ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: isFalse ? '#EF444433' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: isFalse ? '#EF4444' : '#475569', flexShrink: 0 }}>{i + 1}</div>
                <button onClick={() => onChange({ ...q, bunteTuete: { ...bt, falseIndex: i }, answer: stmts[i] })}
                  style={{ padding: '2px 8px', borderRadius: 5, border: `1px solid ${isFalse ? '#EF4444' : 'rgba(255,255,255,0.1)'}`, background: isFalse ? 'rgba(239,68,68,0.15)' : 'transparent', color: isFalse ? '#EF4444' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>
                  {isFalse ? '🕵️ Imposter' : 'Als Imposter'}
                </button>
              </div>
              <input value={stmts[i] ?? ''} onChange={e => { const s = [...stmts]; s[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, statements: s }, answer: falseIdx === i ? e.target.value : q.answer }); }}
                style={inputStyle} placeholder={`Aussage ${i + 1} (DE)…`} />
              <input value={stmtsEn[i] ?? ''} onChange={e => { const s = [...stmtsEn]; s[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, statementsEn: s } }); }}
                style={{ ...inputStyle, marginTop: 4, fontSize: 12, opacity: 0.7 }} placeholder={`Statement ${i + 1} (EN, opt.)…`} />
            </div>
          );
        })}
      </div>
    );
  }

  // ORDER / Fix It ─────────────────────────────────────────────────────────────
  if (bt.kind === 'order') {
    const items = bt.items ?? ['', '', ''];
    const itemsEn = bt.itemsEn ?? [];
    const itemValues = bt.itemValues ?? [];
    const correctOrder = bt.correctOrder ?? items.map((_, i) => i);
    const btCriteria = bt.criteria;
    const btCriteriaEn = bt.criteriaEn;

    function patchOrder(newItems: string[], newOrder: number[], newItemsEn?: string[], criteria?: string, criteriaEn?: string, newItemValues?: string[]) {
      onChange({ ...q, bunteTuete: { kind: 'order' as const, items: newItems, correctOrder: newOrder, itemsEn: newItemsEn ?? itemsEn, criteria: criteria ?? btCriteria, criteriaEn: criteriaEn ?? btCriteriaEn, itemValues: newItemValues ?? itemValues } });
    }
    function addItem() { patchOrder([...items, ''], [...correctOrder, items.length], undefined, undefined, undefined, [...itemValues, '']); }
    function removeItem(i: number) {
      patchOrder(items.filter((_, idx) => idx !== i), correctOrder.filter(x => x !== i).map(x => x > i ? x - 1 : x), undefined, undefined, undefined, itemValues.filter((_, idx) => idx !== i));
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
          🔀 Teams bringen Elemente in die richtige Reihenfolge. Oben = Nummer 1.
        </div>
        <div>
          <label style={labelStyle}>Sortierkriterium (DE)</label>
          <input value={bt.criteria ?? ''} onChange={e => patchOrder(items, correctOrder, itemsEn, e.target.value, bt.criteriaEn)} style={inputStyle} placeholder="z.B. nach Größe (klein → groß)" />
          <input value={bt.criteriaEn ?? ''} onChange={e => patchOrder(items, correctOrder, itemsEn, bt.criteria, e.target.value)} style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder="e.g. by size (small → large)" />
        </div>
        <div>
          <label style={labelStyle}>Elemente <span style={{ color: '#334155', fontWeight: 400 }}>— in korrekter Reihenfolge eingeben</span></label>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
              <div style={{ width: 22, flexShrink: 0, fontSize: 12, fontWeight: 900, color: '#3B82F6', textAlign: 'center' }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <input value={item} onChange={e => { const it = [...items]; it[i] = e.target.value; patchOrder(it, correctOrder); onChange({ ...q, answer: it.filter(Boolean).join(' → ') }); }}
                  style={inputStyle} placeholder={`Element ${i + 1} (DE)…`} />
                <input value={itemsEn[i] ?? ''} onChange={e => { const it = [...itemsEn]; it[i] = e.target.value; patchOrder(items, correctOrder, it); }}
                  style={{ ...inputStyle, marginTop: 4, fontSize: 12, opacity: 0.7 }} placeholder={`Element ${i + 1} (EN, opt.)…`} />
                <input value={itemValues[i] ?? ''} onChange={e => { const iv = [...itemValues]; iv[i] = e.target.value; patchOrder(items, correctOrder, undefined, undefined, undefined, iv); }}
                  style={{ ...inputStyle, marginTop: 4, fontSize: 12, opacity: 0.85 }} placeholder={`Wert für Auflösung (z.B. „1 Tag", „8848 m")…`} />
              </div>
              {items.length > 2 && (
                <button onClick={() => removeItem(i)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✕</button>
              )}
            </div>
          ))}
          {items.length < 8 && (
            <button onClick={addItem} style={{ ...btnStyle('#3B82F6', true), marginTop: 4, width: '100%', fontSize: 12 }}>+ Element hinzufügen</button>
          )}
        </div>
      </div>
    );
  }

  // 4 GEWINNT / Only Connect ──────────────────────────────────────────────────
  if (bt.kind === 'onlyConnect') {
    const hints = bt.hints ?? ['', '', '', ''];
    const hintsEn = bt.hintsEn ?? ['', '', '', ''];
    const accepted = bt.acceptedAnswers ?? [];
    const acceptedEn = bt.acceptedAnswersEn ?? [];
    const setHint = (i: number, val: string) => {
      const a = [...hints]; a[i] = val;
      onChange({ ...q, bunteTuete: { ...bt, hints: a } });
    };
    const setHintEn = (i: number, val: string) => {
      const a = [...hintsEn]; a[i] = val;
      onChange({ ...q, bunteTuete: { ...bt, hintsEn: a } });
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', fontSize: 12, color: '#94a3b8' }}>
          🧩 4 Hinweise werden nacheinander aufgedeckt (Hinweis 1 zeigt am wenigsten, Hinweis 4 am meisten). Teams raten den Verbindungs-Begriff per Freitext. 1 Tipp pro Team — falsch → gesperrt.
        </div>
        <div>
          <label style={labelStyle}>Hinweise (DE) — von schwer (1) zu leicht (4)</label>
          {[0, 1, 2, 3].map(i => (
            <input key={i} value={hints[i] ?? ''} onChange={e => setHint(i, e.target.value)}
              style={{ ...inputStyle, marginTop: 4 }}
              placeholder={`Hinweis ${i + 1}…`} />
          ))}
        </div>
        <div>
          <label style={labelStyle}>Hints (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          {[0, 1, 2, 3].map(i => (
            <input key={i} value={hintsEn[i] ?? ''} onChange={e => setHintEn(i, e.target.value)}
              style={{ ...inputStyle, marginTop: 4 }}
              placeholder={`Clue ${i + 1}…`} />
          ))}
        </div>
        <div>
          <label style={labelStyle}>Lösung (DE)</label>
          <input value={bt.answer ?? ''} onChange={e => onChange({ ...q, bunteTuete: { ...bt, answer: e.target.value }, answer: e.target.value })}
            style={inputStyle} placeholder="z.B. Komponisten mit 9 Sinfonien" />
        </div>
        <div>
          <label style={labelStyle}>Answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={bt.answerEn ?? ''} onChange={e => onChange({ ...q, bunteTuete: { ...bt, answerEn: e.target.value }, answerEn: e.target.value })}
            style={inputStyle} placeholder="e.g. Composers with 9 symphonies" />
        </div>
        <div>
          <label style={labelStyle}>Akzeptierte Schreibweisen (DE) <span style={{ color: '#334155' }}>opt., komma-getrennt</span></label>
          <input value={accepted.join(', ')} onChange={e => onChange({ ...q, bunteTuete: { ...bt, acceptedAnswers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
            style={inputStyle} placeholder="z.B. 9 Sinfonien, neun Sinfonien, 9 Symphonien" />
        </div>
        <div>
          <label style={labelStyle}>Accepted spellings (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={acceptedEn.join(', ')} onChange={e => onChange({ ...q, bunteTuete: { ...bt, acceptedAnswersEn: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
            style={inputStyle} placeholder="e.g. 9 symphonies, nine symphonies" />
        </div>
      </div>
    );
  }

  // BLUFF — Implementation folgt, hier minimaler Editor ───────────────────────
  if (bt.kind === 'bluff') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(244,114,182,0.10)', border: '1px solid rgba(244,114,182,0.3)', fontSize: 12, color: '#94a3b8' }}>
        🎭 Teams erfinden eine plausible Falsch-Antwort. Phase 2: alle Bluffs + die echte Antwort werden gemischt angezeigt, Teams stimmen ab. <strong>Implementation folgt — Frontend kommt im nächsten Schritt.</strong>
      </div>
      <div>
        <label style={labelStyle}>Frage</label>
        <input value={q.text ?? ''} onChange={e => onChange({ ...q, text: e.target.value })}
          style={inputStyle} placeholder="z.B. In welchem Jahr wurde der erste elektrische Toaster patentiert?" />
      </div>
      <div>
        <label style={labelStyle}>Echte Antwort (DE)</label>
        <input value={bt.realAnswer ?? ''} onChange={e => onChange({ ...q, bunteTuete: { ...bt, realAnswer: e.target.value }, answer: e.target.value })}
          style={inputStyle} placeholder="z.B. 1909" />
      </div>
      <div>
        <label style={labelStyle}>Real answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
        <input value={bt.realAnswerEn ?? ''} onChange={e => onChange({ ...q, bunteTuete: { ...bt, realAnswerEn: e.target.value }, answerEn: e.target.value })}
          style={inputStyle} placeholder="e.g. 1909" />
      </div>
    </div>
  );

  // MAP / Pin It ───────────────────────────────────────────────────────────────
  if (bt.kind === 'map') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#94a3b8' }}>
        📍 Teams pinnen einen Ort auf der Weltkarte. Nähster Pin gewinnt.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Ort-Name (DE)</label>
          <input value={bt.targetLabel ?? ''} onChange={e => onChange({ ...q, bunteTuete: { ...bt, targetLabel: e.target.value }, answer: e.target.value })}
            style={inputStyle} placeholder="z.B. Jungfernstieg, Hamburg" />
        </div>
        <div>
          <label style={labelStyle}>Place name (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.answerEn ?? ''} onChange={e => onChange({ ...q, answerEn: e.target.value })}
            style={inputStyle} placeholder="e.g. Jungfernstieg, Hamburg" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Breitengrad (Lat)</label>
          <input type="number" step="0.0001" value={bt.lat} onChange={e => onChange({ ...q, bunteTuete: { ...bt, lat: Number(e.target.value) } })}
            style={inputStyle} placeholder="z.B. 53.5503" />
        </div>
        <div>
          <label style={labelStyle}>Längengrad (Lng)</label>
          <input type="number" step="0.0001" value={bt.lng} onChange={e => onChange({ ...q, bunteTuete: { ...bt, lng: Number(e.target.value) } })}
            style={inputStyle} placeholder="z.B. 9.9922" />
        </div>
      </div>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
        💡 Koordinaten findest du auf Google Maps: rechtsklick → "Was ist hier?" → Lat/Lng kopieren
      </div>
    </div>
  );

  return null;
}

// ── Draft list screen ─────────────────────────────────────────────────────────
function DraftListScreen({ drafts, onOpen, onCreate, onCreateSample, onCreateEurovision, onDelete }: { drafts: QQDraft[]; onOpen: (d: QQDraft) => void; onCreate: (phases: 3 | 4) => void; onCreateSample: () => void; onCreateEurovision: () => void; onDelete: (id: string) => void }) {
  // 2026-05-10 CozyBuilder Pack A #2: Wolf-Greeting + Random-Spruch.
  const greetings = [
    'Was bauen wir heute, Wolf?',
    'Neue Fragen-Idee dabei?',
    'Bereit fürs nächste Quiz?',
    'Cozy-Quiz-Werkstatt 🪄',
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  return (
    <div style={{ minHeight: '100vh', background: COZY_NAVY, color: '#F8FAFC', fontFamily: "'Nunito', system-ui, sans-serif", padding: 40, maxWidth: 960, margin: '0 auto' }}>
      {/* Header mit CozyWolf + Sprechblase — 2026-05-10 Pack A #2 */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: COZY_PINK, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>CozyBuilder</div>
          <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 10, color: '#F8FAFC', letterSpacing: '-0.01em' }}>Fragensätze</div>
          <div style={{ fontSize: 14, color: '#CBD5E1', marginBottom: 24, opacity: 0.85 }}>Erstelle einen neuen leeren Fragensatz oder lade einen Demo-Pack als Startpunkt.</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => onCreate(3)} style={brandCreateBtn()}>+ Leer (3 Runden)</button>
            <button onClick={() => onCreate(4)} style={brandCreateBtn()}>+ Leer (4 Runden)</button>
            <button onClick={onCreateSample} style={{ ...brandCreateBtn(true), display: 'flex', alignItems: 'center', gap: 6 }}>🗺️ Hamburg Probekatalog</button>
            <button onClick={onCreateEurovision} style={{ ...brandCreateBtn(true), display: 'flex', alignItems: 'center', gap: 6 }}>🎤 Eurovision Quiz</button>
          </div>
        </div>
        {/* CozyWolf + Sprechblase rechts oben */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 0, flexShrink: 0 }}>
          <div style={{
            background: `linear-gradient(135deg, ${COZY_PINK}, ${COZY_MAGENTA})`,
            color: '#fff', padding: '14px 20px', borderRadius: '22px 22px 6px 22px',
            fontSize: 15, fontWeight: 800, maxWidth: 200, lineHeight: 1.35,
            boxShadow: `0 4px 18px ${COZY_PINK}55`, marginBottom: 24, marginRight: -4,
            position: 'relative',
          }}>
            {greeting}
            <span style={{
              position: 'absolute', right: -8, bottom: 8, width: 0, height: 0,
              borderLeft: `10px solid ${COZY_MAGENTA}`, borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
            }} />
          </div>
          <CozyWolfImage pose="augenauf.mundauf.winken" style={{ width: 130, height: 130, objectFit: 'contain', filter: `drop-shadow(0 4px 14px ${COZY_PINK}44)` }} alt="" />
        </div>
      </div>
      {drafts.length === 0 ? (
        <div style={{ padding: 28, borderRadius: 16, background: `${COZY_PINK}0d`, border: `1px dashed ${COZY_PINK}55`, color: '#CBD5E1', fontSize: 16, textAlign: 'center' }}>
          Noch keine Fragensätze — bau deinen ersten oben ✨
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drafts.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: COZY_NAVY_DARK, borderRadius: 14, border: `1px solid ${COZY_PINK}1f` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{d.phases} Runden · {d.questions.length} Fragen · {new Date(d.updatedAt).toLocaleDateString('de-DE')}</div>
              </div>
              <button onClick={() => onOpen(d)} style={btnStyle(COZY_PINK)}>Bearbeiten</button>
              <button onClick={() => onDelete(d.id)} style={btnStyle(COZY_MAGENTA, true)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 2026-05-10 CozyBuilder Pack A #2: Brand-Styled Create-Button. Erste Reihe
// = Brand-Pink (Primary), Sample/Eurovision = Navy-Outline-Variant.
function brandCreateBtn(secondary?: boolean): React.CSSProperties {
  if (secondary) return {
    padding: '10px 18px', borderRadius: 12,
    border: `1.5px solid ${COZY_PINK}66`,
    background: 'rgba(236,72,153,0.08)',
    color: '#F8FAFC', fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
    cursor: 'pointer', transition: 'all 0.15s',
  };
  return {
    padding: '10px 18px', borderRadius: 12, border: 'none',
    background: COZY_PINK, color: '#fff',
    fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
    cursor: 'pointer', transition: 'all 0.15s',
    boxShadow: `0 4px 14px ${COZY_PINK}55`,
  };
}

// ── Mini preview wrapper (kollabierbar, Zustand persistiert) ──────────────────
function MiniPreviewPanel({ question }: { question: QQQuestion }) {
  // 2026-05-11 (Wolf): Mini-Preview nur noch bei CHEESE — andere Kategorien
  // hatten ein 'random'-Render das mit Beamer-Realität nicht matched.
  // Bei CHEESE: Dual-Frame zeigt beide Beamer-Layouts live.
  // useState VOR dem early-return (Rules of Hooks).
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('qq-builder-preview-collapsed') === '1'; } catch { return false; }
  });
  if (question.category !== 'CHEESE') return null;
  function toggle() {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('qq-builder-preview-collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
      <button onClick={toggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        background: 'transparent', border: 'none', color: '#94a3b8',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: 0.08, padding: 0,
        marginBottom: collapsed ? 0 : 8,
      }}>
        <span>🎬 Beamer-Vorschau</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && <QQMiniPreview question={question} />}
    </div>
  );
}

// ── Auto-Save-Pill ────────────────────────────────────────────────────────────
// 2026-05-10 CozyBuilder Pack B #7: zeigt „Auto-saved Xs ago" oder ein
// pulsierendes ✓ nach Server-Save. Live-Updates per 1s-Timer.
function AutoSavePill({ timestamp }: { timestamp: number | null }) {
  const [, force] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const prevTsRef = useRef<number | null>(null);

  // Re-render every 1s so 'X s ago' counter ticks live
  useEffect(() => {
    const i = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Pulse-Animation triggern bei Timestamp-Update
  useEffect(() => {
    if (timestamp && timestamp !== prevTsRef.current) {
      prevTsRef.current = timestamp;
      setPulseKey(k => k + 1);
    }
  }, [timestamp]);

  if (!timestamp) return null;
  const ageSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const label = ageSec < 3 ? 'gerade gespeichert'
    : ageSec < 60 ? `vor ${ageSec}s gespeichert`
    : ageSec < 3600 ? `vor ${Math.floor(ageSec / 60)} min gespeichert`
    : 'lokal gesichert';
  return (
    <div
      key={pulseKey}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 999,
        background: 'rgba(34,197,94,0.10)',
        border: '1px solid rgba(34,197,94,0.30)',
        fontSize: 11, fontWeight: 700, color: '#86EFAC',
        animation: ageSec < 1 ? 'cozyAutoSaveTick 0.6s ease-out' : undefined,
      }}
      title="Lokale Sicherung (auto-saved alle 2 Sek + nach jedem Server-Save)"
    >
      <span style={{ fontSize: 10 }}>💾</span>
      <span>{label}</span>
    </div>
  );
}

// ── WizardView — Slide-by-Slide-Schreib-Modus ─────────────────────────────────
// 2026-05-10 CozyBuilder #30 (Audit Big-Bet): Wolf-Wunsch „der builder führt
// mich durch's quiz, eine Frage nach der anderen". Toggle im Header — Grid
// bleibt für Übersicht, Wizard für konzentriertes Schreiben.
//
// Layout:
//   - Top: Phase-Header + Counter „Frage 3/20" + Validation-Inline
//   - Center: QuestionEditor zentral & breit (max 820px statt 480px Sidebar)
//   - Bottom: Mini-Filmstrip (alle Fragen) + Big-Prev/Next-Buttons
//   - Pfeiltasten ← → navigieren (Hotkey-Wiring in QQBuilderPage)
function WizardView({
  activeDraft, activeQId, setActiveQId,
  uploadingFor, removingBgFor, fileInputRef,
  onUpload, onRemoveBg, onChange, onDelete, onOptionImageUpload, onFileDrop,
}: {
  activeDraft: QQDraft;
  activeQId: string | null;
  setActiveQId: (id: string | null) => void;
  uploadingFor: string | null;
  removingBgFor: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUpload: () => void;
  onRemoveBg: () => void;
  onChange: (q: QQQuestion) => void;
  onDelete: () => void;
  onOptionImageUpload: (optIdx: number) => void;
  onFileDrop: (file: File) => void;
}) {
  const qs = activeDraft.questions;
  const curIdx = activeQId ? qs.findIndex(q => q.id === activeQId) : 0;
  const safeIdx = curIdx < 0 ? 0 : curIdx;
  const curQ = qs[safeIdx];

  // 2026-05-11 Wizard Sub-Steps: pro Frage einen Sub-Step-Index merken.
  // Beim Wechsel zwischen Fragen bleibt die letzte Step-Position erhalten —
  // Wolf kann z.B. „Antwort" für alle Fragen durchklicken bleibend auf dem
  // 'main'-Step.
  const [subStepByQuestion, setSubStepByQuestion] = useState<Record<string, number>>({});
  const curSubSteps = curQ ? SUB_STEPS_BY_CATEGORY[curQ.category] : [];
  const curSubStepIdx = Math.min(
    Math.max(0, subStepByQuestion[curQ?.id ?? ''] ?? 0),
    Math.max(0, curSubSteps.length - 1),
  );
  const curSubStep = curSubSteps[curSubStepIdx];
  const visibleSections = curSubStep ? new Set(curSubStep.sections) : undefined;

  function setSubStep(idx: number) {
    if (!curQ) return;
    setSubStepByQuestion(prev => ({ ...prev, [curQ.id]: idx }));
  }

  // 2026-05-11: Per-Step-Validation. Mappt Validation-Issues auf Sub-Step-IDs,
  // damit jeder Step im Mini-Stepper einen roten/amber-Dot bekommen kann wenn
  // er Errors/Warnings hat. validateQuestion(q) gibt { field, level } pro Issue.
  // Mapping field → Step-ID basiert auf den Feldern die in jedem Step gerendert
  // werden (siehe SUB_STEPS_BY_CATEGORY + QuestionEditor visibleSections-Map).
  const validationByStep = curQ ? (() => {
    const issues = validateQuestion(curQ);
    const map: Record<string, { errors: number; warnings: number }> = {};
    for (const step of curSubSteps) map[step.id] = { errors: 0, warnings: 0 };
    for (const iss of issues) {
      // field-Mapping: vereinfacht — die meisten Issues mit 'text' gehören zu
      // 'text'-Step, 'image' zum 'image'-Step etc. Default = 'main'-Step.
      let stepId = 'main';
      if (iss.field === 'text' || iss.field === 'textEn') stepId = 'text';
      else if (iss.field === 'image') {
        // Image-Issues: Bild + cheeseLayout-Wahl gehören zum image-Step.
        stepId = curSubSteps.find(s => s.id === 'image') ? 'image' : 'main';
      }
      else if (iss.field === 'funFact') stepId = 'funFact';
      // Wenn Step-Map den stepId nicht hat (z.B. Bunte-Tüte hat kein image-Step),
      // fall-back auf 'main'.
      if (!map[stepId]) stepId = 'main';
      if (!map[stepId]) continue;
      if (iss.level === 'error') map[stepId].errors++;
      else map[stepId].warnings++;
    }
    return map;
  })() : {};
  function goToQuestion(idx: number, atLastStep = false) {
    const nextQ = qs[idx];
    if (!nextQ) return;
    const nextSteps = SUB_STEPS_BY_CATEGORY[nextQ.category];
    const targetStep = atLastStep ? Math.max(0, nextSteps.length - 1) : 0;
    setSubStepByQuestion(prev => ({ ...prev, [nextQ.id]: targetStep }));
    setActiveQId(nextQ.id);
  }

  // Pfeil-Tasten — Sub-Step-Nav innerhalb Frage, an Step-Grenzen springt's
  // zur Nachbar-Frage (Step 0 bzw. letzter Step).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (curSubStepIdx > 0) {
          setSubStep(curSubStepIdx - 1);
        } else {
          const prevIdx = safeIdx > 0 ? safeIdx - 1 : qs.length - 1;
          goToQuestion(prevIdx, /* atLastStep */ true);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (curSubStepIdx < curSubSteps.length - 1) {
          setSubStep(curSubStepIdx + 1);
        } else {
          const nextIdx = (safeIdx + 1) % qs.length;
          goToQuestion(nextIdx, /* atLastStep */ false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdx, qs, curSubStepIdx, curSubSteps.length, curQ?.id]);

  if (!curQ) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
        Keine Fragen in diesem Draft.
      </div>
    );
  }

  const catLabel = QQ_CATEGORY_LABELS[curQ.category];
  const catColor = QQ_CATEGORY_COLORS[curQ.category];
  const phaseCount = activeDraft.phases;
  const isFirst = safeIdx === 0;
  const isLast = safeIdx === qs.length - 1;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: COZY_NAVY, overflow: 'hidden',
      animation: 'cozyWizardFadeIn 0.35s ease both',
    }}>
      <style>{`
        @keyframes cozyWizardFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        /* 2026-05-11: Step-Transitions punchier — translate + leichter scale +
           subtle pink-glow-trail beim Wechsel. Bouncy-easing, 0.42s. */
        @keyframes cozyWizardSlideIn {
          0%   { opacity: 0; transform: translateX(36px) scale(0.985); filter: blur(2px); }
          60%  { opacity: 1; transform: translateX(-4px) scale(1.005); filter: blur(0); }
          100% { opacity: 1; transform: translateX(0)    scale(1); filter: blur(0); }
        }
      `}</style>

      {/* 2026-05-11 Wizard Focus-Mode — Top-Stack auf 1 Zeile komprimiert.
          Phase-Pille + Frage-Counter + Sub-Stepper-Pills + Schritt-Counter +
          Tastatur-Hint alles inline. Progress-Bars entfernt (Filmstrip unten
          + Sub-Step-Pills zeigen Fortschritt schon). */}
      <div style={{
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${COZY_PINK}1a`,
        background: `linear-gradient(180deg, ${catColor}10, transparent)`,
        overflowX: 'auto', flexShrink: 0,
      }}>
        {/* Phase-Pille (kompakt) */}
        <div style={{
          padding: '5px 12px', borderRadius: 999, flexShrink: 0,
          background: `${catColor}22`, border: `1.5px solid ${catColor}66`,
          fontSize: 11, fontWeight: 900, color: catColor,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{catLabel.emoji}</span>
          <span>P{curQ.phaseIndex}</span>
        </div>
        {/* Frage-Counter */}
        <div style={{
          fontSize: 12, fontWeight: 800, color: '#CBD5E1', flexShrink: 0,
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>
          <span style={{ color: COZY_PINK, fontSize: 14 }}>{safeIdx + 1}</span>
          <span style={{ opacity: 0.45 }}> / {qs.length}</span>
        </div>
        {/* Vertikaler Divider */}
        <div style={{ width: 1, height: 24, background: `${COZY_PINK}22`, flexShrink: 0 }} />
        {/* Sub-Stepper-Pills mit Validation-Indikator */}
        {curSubSteps.map((step, i) => {
          const isActive = i === curSubStepIdx;
          // 2026-05-11: Validation-Dot pro Step.
          const v = validationByStep[step.id] ?? { errors: 0, warnings: 0 };
          const hasErr = v.errors > 0;
          const hasWarn = v.warnings > 0 && !hasErr;
          const dotColor = hasErr ? '#EF4444' : hasWarn ? '#F59E0B' : null;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setSubStep(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                border: `2px solid ${isActive ? COZY_PINK : COZY_PINK + '33'}`,
                background: isActive ? `${COZY_PINK}22` : 'transparent',
                color: isActive ? '#fff' : '#94A3B8',
                fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
                cursor: 'pointer',
                boxShadow: isActive ? `0 0 14px ${COZY_PINK}55` : 'none',
                transition: 'all 0.15s',
                flexShrink: 0, position: 'relative',
              }}
              aria-current={isActive ? 'step' : undefined}
              title={`Step ${i + 1}: ${step.label}${hasErr ? ` · ${v.errors} Fehler` : hasWarn ? ` · ${v.warnings} Warnung${v.warnings > 1 ? 'en' : ''}` : ''}`}
            >
              <span style={{ fontSize: 14 }}>{step.emoji}</span>
              <span style={{ letterSpacing: '0.02em' }}>{step.label}</span>
              {dotColor && (
                <span aria-hidden style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 10, height: 10, borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 8px ${dotColor}cc`,
                  border: `1.5px solid ${COZY_NAVY}`,
                }} />
              )}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* Tastatur-Hint (rechts) */}
        <div style={{
          fontSize: 10, color: '#64748B', fontWeight: 700, flexShrink: 0,
          textAlign: 'right', lineHeight: 1.4,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        }}>
          <span>← → Schritt</span>
          <span style={{ opacity: 0.6 }}>Cmd+Enter nächster Slot</span>
        </div>
      </div>

      {/* Editor (zentriert, breiter als Grid-Editor).
          Prev/Next-Buttons sind Step-aware: am Step-Anfang/-Ende springt der
          Pfeil zur Nachbar-Frage; sonst innerhalb der aktuellen Frage. */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        gap: 12, padding: '12px 24px 12px', overflow: 'hidden',
      }}>
        {/* Prev-Button — Step-aware */}
        <button
          onClick={() => {
            if (curSubStepIdx > 0) setSubStep(curSubStepIdx - 1);
            else if (!isFirst) goToQuestion(safeIdx - 1, true);
          }}
          disabled={isFirst && curSubStepIdx === 0}
          style={{
            flexShrink: 0, width: 56,
            background: (isFirst && curSubStepIdx === 0) ? 'rgba(255,255,255,0.03)' : `${COZY_PINK}15`,
            border: `1px solid ${(isFirst && curSubStepIdx === 0) ? 'rgba(255,255,255,0.05)' : COZY_PINK + '44'}`,
            color: (isFirst && curSubStepIdx === 0) ? '#334155' : COZY_PINK,
            borderRadius: 16, fontFamily: 'inherit', fontSize: 28, fontWeight: 900,
            cursor: (isFirst && curSubStepIdx === 0) ? 'default' : 'pointer',
            transition: 'all 0.15s',
          }}
          title={curSubStepIdx > 0 ? 'Vorheriger Schritt (←)' : 'Vorherige Frage (←)'}
          aria-label={curSubStepIdx > 0 ? 'Vorheriger Schritt' : 'Vorherige Frage'}
        >‹</button>

        {/* Editor-Card — Single-Step-Inhalt, breit-zentral. */}
        <div
          key={`${curQ.id}-${curSubStepIdx}`}
          style={{
            flex: 1, maxWidth: 920,
            animation: 'cozyWizardSlideIn 0.3s ease both',
            display: 'flex', flexDirection: 'column', minHeight: 0,
          }}
        >
          <div style={{
            flex: 1, overflow: 'auto',
            background: COZY_NAVY_DARK,
            borderRadius: 18,
            // 2026-05-11: Kategorie-Farbe als subtler Akzent statt überall Pink.
            // Card-Border + Glow nehmen catColor → jede Kategorie fühlt sich
            // eigen an.
            border: `1px solid ${catColor}33`,
            boxShadow: `0 0 0 1px ${catColor}14, 0 16px 40px rgba(0,0,0,0.35), 0 0 60px ${catColor}10`,
            display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>
            {/* Vertikaler Kategorie-Akzent-Streifen (4px) links — visueller
                Kat-Anker, sehr subtil aber sofort lesbar. */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              width: 4, borderRadius: '18px 0 0 18px',
              background: `linear-gradient(180deg, ${catColor}, ${catColor}88)`,
              opacity: 0.7,
              pointerEvents: 'none',
            }} />
            {/* Step-Hero — großer Titel + Mini-Tipp pro Step. Wolf weiß
                sofort „was tue ich hier?". Kategorie-Farbe als Akzent. */}
            {(() => {
              const hero = getStepHero(curQ.category, curSubStep?.id ?? '');
              return (
                <div style={{
                  padding: '24px 32px 16px',
                  borderBottom: `1px solid ${catColor}22`,
                  background: `linear-gradient(180deg, ${catColor}08, transparent)`,
                }}>
                  <div style={{
                    fontSize: 22, fontWeight: 900, color: '#F8FAFC',
                    letterSpacing: '-0.01em', marginBottom: 6, lineHeight: 1.25,
                  }}>{hero.title}</div>
                  {hero.tip && (
                    <div style={{
                      fontSize: 13, color: '#94A3B8', fontWeight: 600,
                      lineHeight: 1.4,
                    }}>{hero.tip}</div>
                  )}
                </div>
              );
            })()}

            {/* Editor-Inhalt (filtered nach visibleSections) */}
            <div style={{ flex: 1, padding: '8px 16px' }}>
              <QuestionEditor
                question={curQ}
                uploadingFor={uploadingFor}
                removingBgFor={removingBgFor}
                fileInputRef={fileInputRef}
                visibleSections={visibleSections}
                fullWidth
                onUpload={onUpload}
                onRemoveBg={onRemoveBg}
                onChange={onChange}
                onDelete={onDelete}
                onOptionImageUpload={onOptionImageUpload}
                onFileDrop={onFileDrop}
              />
            </div>

            {/* Footer-CTA — „weiter zu X" / „nächste Frage" / „fertig" */}
            {(() => {
              const isLastStep = curSubStepIdx === curSubSteps.length - 1;
              const nextStep = curSubSteps[curSubStepIdx + 1];
              const ctaLabel = isLastStep
                ? (isLast ? '✓ Letzte Frage — fertig' : '→ Nächste Frage')
                : `→ Weiter zu ${nextStep.emoji} ${nextStep.label}`;
              const ctaDisabled = isLastStep && isLast;
              return (
                <div style={{
                  padding: '14px 24px',
                  borderTop: `1px solid ${COZY_PINK}1a`,
                  background: 'rgba(0,0,0,0.18)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexShrink: 0,
                }}>
                  {/* Löschen-Button links (im Wizard-Card-Footer) */}
                  <button
                    type="button"
                    onClick={() => { if (confirm('Frage löschen?')) onDelete(); }}
                    style={{
                      padding: '7px 12px', borderRadius: 8,
                      border: '1px solid rgba(239,68,68,0.25)',
                      background: 'rgba(239,68,68,0.06)',
                      color: '#EF4444', cursor: 'pointer',
                      fontSize: 12, fontFamily: 'inherit', fontWeight: 700,
                    }}
                    title="Diese Frage löschen"
                  >🗑</button>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    onClick={() => {
                      if (isLastStep) {
                        if (!isLast) goToQuestion(safeIdx + 1, false);
                      } else {
                        setSubStep(curSubStepIdx + 1);
                      }
                    }}
                    disabled={ctaDisabled}
                    style={{
                      padding: '11px 22px', borderRadius: 12,
                      border: 'none',
                      background: ctaDisabled ? 'rgba(255,255,255,0.05)' : COZY_PINK,
                      color: ctaDisabled ? '#475569' : '#fff',
                      cursor: ctaDisabled ? 'default' : 'pointer',
                      fontSize: 14, fontFamily: 'inherit', fontWeight: 900,
                      boxShadow: ctaDisabled ? 'none' : `0 0 18px ${COZY_PINK}55, 0 4px 12px rgba(0,0,0,0.3)`,
                      transition: 'all 0.15s',
                    }}
                  >{ctaLabel}</button>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Next-Button — rechte Spalte, gleich groß wie Prev */}
        <button
          onClick={() => {
            if (curSubStepIdx < curSubSteps.length - 1) setSubStep(curSubStepIdx + 1);
            else if (!isLast) goToQuestion(safeIdx + 1, false);
          }}
          disabled={isLast && curSubStepIdx === curSubSteps.length - 1}
          style={{
            flexShrink: 0, width: 56,
            background: (isLast && curSubStepIdx === curSubSteps.length - 1) ? 'rgba(255,255,255,0.03)' : `${COZY_PINK}15`,
            border: `1px solid ${(isLast && curSubStepIdx === curSubSteps.length - 1) ? 'rgba(255,255,255,0.05)' : COZY_PINK + '44'}`,
            color: (isLast && curSubStepIdx === curSubSteps.length - 1) ? '#334155' : COZY_PINK,
            borderRadius: 16, fontFamily: 'inherit', fontSize: 28, fontWeight: 900,
            cursor: (isLast && curSubStepIdx === curSubSteps.length - 1) ? 'default' : 'pointer',
            transition: 'all 0.15s',
          }}
          title={curSubStepIdx < curSubSteps.length - 1 ? 'Nächster Schritt (→)' : 'Nächste Frage (→)'}
          aria-label={curSubStepIdx < curSubSteps.length - 1 ? 'Nächster Schritt' : 'Nächste Frage'}
        >›</button>
      </div>

      {/* Mini-Filmstrip am Boden — alle Fragen, current highlighted, Phase-Trenner */}
      <WizardFilmstrip
        questions={qs}
        activeQId={activeQId}
        phaseCount={phaseCount}
        onJump={(id) => setActiveQId(id)}
      />
    </div>
  );
}

// ── WizardFilmstrip — kompakter Mini-Strip aller Fragen unten ─────────────────
function WizardFilmstrip({ questions, activeQId, phaseCount, onJump }: {
  questions: QQQuestion[];
  activeQId: string | null;
  phaseCount: number;
  onJump: (id: string) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  // Auto-Scroll: zentriert die aktive Card im sichtbaren Bereich.
  useEffect(() => {
    const active = stripRef.current?.querySelector('[data-active="1"]') as HTMLElement | null;
    if (active && stripRef.current) {
      const stripRect = stripRef.current.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const offset = (activeRect.left + activeRect.width / 2) - (stripRect.left + stripRect.width / 2);
      stripRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [activeQId]);

  return (
    <div style={{
      padding: '10px 24px 18px',
      borderTop: `1px solid ${COZY_PINK}14`,
      background: 'rgba(0,0,0,0.18)',
    }}>
      <div ref={stripRef} style={{
        display: 'flex', gap: 6, overflowX: 'auto', scrollBehavior: 'smooth',
        paddingBottom: 4,
      }}>
        {Array.from({ length: phaseCount }, (_, pi) => {
          const phaseQs = questions.filter(q => q.phaseIndex === pi + 1);
          return (
            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {pi > 0 && (
                <div style={{
                  width: 1, height: 28, background: `${COZY_PINK}33`, margin: '0 6px',
                  alignSelf: 'center',
                }} />
              )}
              <div style={{
                fontSize: 9, fontWeight: 900, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                writingMode: 'horizontal-tb', padding: '0 4px',
                alignSelf: 'center',
              }}>P{pi + 1}</div>
              {phaseQs.map(q => {
                const isActive = q.id === activeQId;
                const filled = !!q.text?.trim();
                const catColor = QQ_CATEGORY_COLORS[q.category];
                const catLbl = QQ_CATEGORY_LABELS[q.category];
                // 2026-05-11: Custom-Hover-Tooltip mit Frage-Preview + Kat-Name.
                // Schöner als native browser-title-Attribut.
                return (
                  <div key={q.id} style={{ position: 'relative' }} className="qq-filmstrip-chip-wrap">
                    <button
                      data-active={isActive ? '1' : '0'}
                      onClick={() => onJump(q.id)}
                      style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        border: isActive ? `2px solid ${COZY_PINK}` : `1px solid ${catColor}33`,
                        background: filled ? `${catColor}33` : 'rgba(255,255,255,0.03)',
                        color: filled ? catColor : '#475569',
                        fontFamily: 'inherit', fontSize: 14, fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: isActive ? `0 0 14px ${COZY_PINK}66` : 'none',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {catLbl.emoji}
                    </button>
                    {/* Hover-Tooltip mit Frage-Preview + Kat-Name */}
                    <div className="qq-filmstrip-tooltip" style={{
                      position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none', opacity: 0,
                      transition: 'opacity 0.15s ease',
                      background: 'rgba(20,27,58,0.96)',
                      border: `1px solid ${catColor}66`,
                      borderRadius: 10, padding: '8px 12px',
                      maxWidth: 240, minWidth: 140,
                      fontSize: 11, lineHeight: 1.4, color: '#F8FAFC',
                      fontWeight: 600,
                      boxShadow: `0 8px 20px rgba(0,0,0,0.5), 0 0 0 1px ${catColor}33`,
                      zIndex: 10,
                      whiteSpace: 'normal',
                    }}>
                      <div style={{
                        fontSize: 9, fontWeight: 900, color: catColor,
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
                      }}>{catLbl.emoji} {catLbl.de}</div>
                      <div style={{
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {q.text?.trim() || <span style={{ color: '#64748B', fontStyle: 'italic', fontWeight: 700 }}>leer</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CheeseLayoutPicker — Horizontal/Hochkant-Toggle für CHEESE ────────────────
// 2026-05-11 (Wolf-Bug-Fix): aus CategoryFields-CHEESE rausgezogen damit der
// Toggle im Wizard-Bild-Step erscheint statt im Antwort-Step. Funktional
// identisch, nur Render-Location ist anders.
function CheeseLayoutPicker({ q, onChange }: { q: QQQuestion; onChange: (q: QQQuestion) => void }) {
  const currentLayout = q.image?.cheeseLayout;
  const setCheeseLayout = (layout: 'landscape' | 'portrait') => {
    onChange({
      ...q,
      image: {
        ...(q.image ?? { url: '', layout: 'fullscreen', animation: 'none' }),
        cheeseLayout: layout,
      },
    });
  };
  return (
    <div>
      <label style={labelStyle}>📐 Beamer-Layout (wie wird's auf dem Beamer angeordnet?)</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          type="button"
          onClick={() => setCheeseLayout('landscape')}
          style={{
            padding: '14px 14px', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
            border: `2px solid ${currentLayout === 'landscape' ? COZY_PINK : 'rgba(139,92,246,0.25)'}`,
            background: currentLayout === 'landscape' ? `${COZY_PINK}22` : 'rgba(255,255,255,0.03)',
            color: currentLayout === 'landscape' ? COZY_PINK : '#CBD5E1',
            boxShadow: currentLayout === 'landscape' ? `0 0 16px ${COZY_PINK}55` : 'none',
            transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1 }}>🖼️</span>
          <span>Horizontal</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textAlign: 'center', lineHeight: 1.3 }}>Bild vollflächig,<br/>Card unten</span>
        </button>
        <button
          type="button"
          onClick={() => setCheeseLayout('portrait')}
          style={{
            padding: '14px 14px', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
            border: `2px solid ${currentLayout === 'portrait' ? COZY_PINK : 'rgba(139,92,246,0.25)'}`,
            background: currentLayout === 'portrait' ? `${COZY_PINK}22` : 'rgba(255,255,255,0.03)',
            color: currentLayout === 'portrait' ? COZY_PINK : '#CBD5E1',
            boxShadow: currentLayout === 'portrait' ? `0 0 16px ${COZY_PINK}55` : 'none',
            transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1 }}>📱</span>
          <span>Hochkant</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textAlign: 'center', lineHeight: 1.3 }}>Bild links,<br/>Card rechts</span>
        </button>
      </div>
      {!currentLayout && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)',
          fontSize: 12, fontWeight: 700, color: '#FCD34D',
        }}>
          ⚠️ Layout nicht gewählt — Beamer rät automatisch nach Bild-Dimension.
        </div>
      )}
    </div>
  );
}

// ── Empty-State-Wolf ──────────────────────────────────────────────────────────
// 2026-05-10 CozyBuilder Pack A #5: ersetzt das tristliche „← Slot auswählen"
// durch den CozyWolf + Random-Spruch. Wolf wackelt sanft (4s sine via CSS-
// keyframe in der Pack-A-style-Block). Pose: Daumen hoch = einladend.
function EmptyStateWolf() {
  const lines = [
    'Klick eine Zelle, dann basteln wir.',
    'Welche Frage bauen wir zuerst?',
    'Phase 2 sieht noch leer aus, hm?',
    'Eurovision-Quiz ist mein Favorit.',
    'Ich freu mich auf deine nächste Frage 🐺',
    'Pick a slot — let\'s craft a Q!',
  ];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return (
    <div className="qq-builder-editor" style={{
      width: 480, flexShrink: 0, borderLeft: `1px solid ${COZY_PINK}1f`,
      background: COZY_NAVY_DARK,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 18, padding: '32px 28px',
    }}>
      <CozyWolfImage
        pose="augenauf.mundzu.daumen"
        style={{
          width: 200, height: 200, objectFit: 'contain',
          filter: `drop-shadow(0 6px 18px ${COZY_PINK}33)`,
          animation: 'cozyWolfIdleWiggle 4s ease-in-out infinite',
        }}
        alt=""
      />
      <div style={{
        maxWidth: 280, textAlign: 'center',
        padding: '12px 18px', borderRadius: 16,
        background: `${COZY_PINK}10`,
        border: `1px solid ${COZY_PINK}33`,
        fontSize: 14, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.4,
      }}>{line}</div>
      <style>{`
        @keyframes cozyWolfIdleWiggle {
          0%, 100% { transform: rotate(-1.2deg) translateY(0); }
          50%      { transform: rotate(1.2deg)  translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function btnStyle(color: string, outline = false): React.CSSProperties {
  return { padding: '7px 16px', borderRadius: 8, border: outline ? `1px solid ${color}44` : 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: outline ? 'transparent' : color, color: outline ? color : '#fff', fontFamily: 'inherit' };
}
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 };
