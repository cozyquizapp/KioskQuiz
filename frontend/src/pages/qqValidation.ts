// ── Quarter Quiz — Frage-Validierung ─────────────────────────────────────────
// Pure functions. Checks a question/draft for data issues that would bite
// during a live event. Separates hard "errors" (kaputte Daten) from softer
// "warnings" (unvollständig, aber spielbar).

import { QQQuestion, QQDraft } from '../../../shared/quarterQuizTypes';

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  level: IssueLevel;
  field: string;     // z.B. "text", "answer", "bunteTuete.answers[2]"
  message: string;   // kurze DE-Beschreibung
}

export interface QuestionValidation {
  questionId: string;
  phaseIndex: number;
  questionIndexInPhase: number;
  issues: Issue[];
}

function isEmpty(s: string | undefined | null): boolean {
  return !s || !s.trim();
}

export function validateQuestion(q: QQQuestion): Issue[] {
  const issues: Issue[] = [];

  // Core fields
  if (isEmpty(q.text)) {
    issues.push({ level: 'error', field: 'text', message: 'Fragetext fehlt' });
  }
  if (isEmpty(q.answer)) {
    issues.push({ level: 'error', field: 'answer', message: 'Antwort fehlt' });
  }
  if (isEmpty(q.textEn)) {
    issues.push({ level: 'warning', field: 'textEn', message: 'Englische Übersetzung fehlt' });
  }

  // SCHAETZCHEN
  if (q.category === 'SCHAETZCHEN') {
    if (q.targetValue == null || !Number.isFinite(q.targetValue)) {
      issues.push({ level: 'error', field: 'targetValue', message: 'Zielwert fehlt oder ist keine Zahl' });
    }
  }

  // MUCHO (4 Optionen) / ZEHN_VON_ZEHN (3 Optionen)
  if (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN') {
    const expected = q.category === 'MUCHO' ? 4 : 3;
    const opts = q.options ?? [];
    if (opts.length < expected) {
      issues.push({ level: 'error', field: 'options', message: `Nur ${opts.length}/${expected} Optionen` });
    }
    for (let i = 0; i < expected; i++) {
      if (isEmpty(opts[i])) {
        issues.push({ level: 'error', field: `options[${i}]`, message: `Option ${String.fromCharCode(65 + i)} ist leer` });
      }
    }
    const idx = q.correctOptionIndex;
    if (idx == null || idx < 0 || idx >= expected) {
      issues.push({ level: 'error', field: 'correctOptionIndex', message: 'Keine richtige Option markiert' });
    }
    // EN-Übersetzung warnen (nur wenn textEn vorhanden, sonst schon oben gemeldet)
    if (!isEmpty(q.textEn)) {
      const optsEn = q.optionsEn ?? [];
      for (let i = 0; i < expected; i++) {
        if (!isEmpty(opts[i]) && isEmpty(optsEn[i])) {
          issues.push({ level: 'warning', field: `optionsEn[${i}]`, message: `Option ${String.fromCharCode(65 + i)} (EN) fehlt` });
        }
      }
    }
  }

  // BUNTE_TUETE — sub-mechanic payload
  if (q.category === 'BUNTE_TUETE') {
    if (!q.bunteTuete) {
      issues.push({ level: 'error', field: 'bunteTuete', message: 'Bunte-Tüte-Mechanik nicht gewählt' });
    } else {
      const bt = q.bunteTuete;
      if (bt.kind === 'top5') {
        const answers = bt.answers ?? [];
        const filled = answers.filter(a => !isEmpty(a)).length;
        if (filled < 5) {
          issues.push({ level: 'error', field: 'bunteTuete.answers', message: `Top5 braucht 5 Antworten (nur ${filled} gefüllt)` });
        }
      } else if (bt.kind === 'oneOfEight') {
        const stmts = bt.statements ?? [];
        const filled = stmts.filter(s => !isEmpty(s)).length;
        if (filled < 8) {
          issues.push({ level: 'error', field: 'bunteTuete.statements', message: `Imposter braucht 8 Aussagen (nur ${filled} gefüllt)` });
        }
        if (bt.falseIndex == null || bt.falseIndex < 0 || bt.falseIndex > 7) {
          issues.push({ level: 'error', field: 'bunteTuete.falseIndex', message: 'Imposter-Aussage (falsch) nicht markiert' });
        }
      } else if (bt.kind === 'order') {
        const items = bt.items ?? [];
        const filled = items.filter(i => !isEmpty(i)).length;
        if (filled < 2) {
          issues.push({ level: 'error', field: 'bunteTuete.items', message: `Fix It braucht mindestens 2 Items (nur ${filled})` });
        }
        const order = bt.correctOrder ?? [];
        if (order.length !== items.length) {
          issues.push({ level: 'error', field: 'bunteTuete.correctOrder', message: 'Richtige Reihenfolge unvollständig' });
        }
        if (isEmpty(bt.criteria)) {
          issues.push({ level: 'warning', field: 'bunteTuete.criteria', message: 'Kein Sortierkriterium gesetzt' });
        }
      } else if (bt.kind === 'map') {
        if (typeof bt.lat !== 'number' || typeof bt.lng !== 'number' || !Number.isFinite(bt.lat) || !Number.isFinite(bt.lng)) {
          issues.push({ level: 'error', field: 'bunteTuete.lat/lng', message: 'Pin-Koordinaten fehlen oder ungültig' });
        }
        if (isEmpty(bt.targetLabel)) {
          issues.push({ level: 'warning', field: 'bunteTuete.targetLabel', message: 'Kein Ort-Name für Pin gesetzt' });
        }
      } else if (bt.kind === 'hotPotato') {
        // Answer-Feld ist hier der Antwort-Pool — schon oben via core-check abgedeckt.
      }
    }
  }

  // CHEESE — Bild ist Pflicht
  if (q.category === 'CHEESE') {
    if (!q.image?.url) {
      issues.push({ level: 'error', field: 'image', message: 'Bild fehlt (Picture-This braucht ein Bild)' });
    }
  }

  return issues;
}

export interface DraftValidation {
  byQuestion: QuestionValidation[];
  totalErrors: number;
  totalWarnings: number;
}

export function validateDraft(draft: QQDraft): DraftValidation {
  const byQuestion: QuestionValidation[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const q of draft.questions) {
    const issues = validateQuestion(q);
    if (issues.length === 0) continue;
    byQuestion.push({
      questionId: q.id,
      phaseIndex: q.phaseIndex,
      questionIndexInPhase: q.questionIndexInPhase,
      issues,
    });
    for (const i of issues) {
      if (i.level === 'error') totalErrors++;
      else totalWarnings++;
    }
  }

  return { byQuestion, totalErrors, totalWarnings };
}

/** Höchster Issue-Level für eine Frage (oder null wenn alles gut). */
export function worstLevel(issues: Issue[]): IssueLevel | null {
  if (issues.some(i => i.level === 'error')) return 'error';
  if (issues.length > 0) return 'warning';
  return null;
}
