// CSV ↔ QQQuestion[] — minimaler Parser ohne externe Deps.
//
// Dialekt: Komma-separiert, doppelte Anführungszeichen als Escape (""), \n/\r\n Zeilenumbrüche.
// Header MUSS in der ersten Zeile stehen. Leerzeilen werden ignoriert.
//
// Spalten-Mapping siehe CSV_COLUMNS unten.
//
// Keine Bild-URLs / optionImages / musicUrl im CSV — die kommen weiter über
// Upload im Builder, wäre sonst eine Copy-Paste-Wüste.

import type {
  QQQuestion, QQCategory, QQGamePhaseIndex,
  QQBunteTuetePayload, QQBunteTueteKind,
} from '../../../shared/quarterQuizTypes';

export interface QQCsvRow {
  phase: string;
  questionInPhase: string;
  category: string;
  text: string;
  textEn?: string;
  answer?: string;
  answerEn?: string;
  options?: string;
  optionsEn?: string;
  correctOptionIndex?: string;
  targetValue?: string;
  unit?: string;
  unitEn?: string;
  bunteTueteKind?: string;
  bunteTueteData?: string;
  hostNote?: string;
  funFact?: string;
  funFactEn?: string;
}

export const CSV_COLUMNS: (keyof QQCsvRow)[] = [
  'phase', 'questionInPhase', 'category',
  'text', 'textEn', 'answer', 'answerEn',
  'options', 'optionsEn', 'correctOptionIndex',
  'targetValue', 'unit', 'unitEn',
  'bunteTueteKind', 'bunteTueteData',
  'hostNote', 'funFact', 'funFactEn',
];

const VALID_CATEGORIES: QQCategory[] = ['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'];
const VALID_BT_KINDS: QQBunteTueteKind[] = ['hotPotato', 'top5', 'oneOfEight', 'order', 'map'];

// ── CSV parsing ───────────────────────────────────────────────────────────────

/** RFC-4180-style CSV → string[][]. Unterstützt "" als Escape. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { cur.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') {
      cur.push(field); field = '';
      if (cur.length > 1 || cur[0] !== '') rows.push(cur);
      cur = []; i++; continue;
    }
    field += c; i++;
  }
  cur.push(field);
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);
  return rows;
}

function escapeCsv(value: string): string {
  if (value == null) return '';
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

// ── Template ──────────────────────────────────────────────────────────────────

export function buildCsvTemplate(): string {
  const header = CSV_COLUMNS.join(',');
  const examples: QQCsvRow[] = [
    {
      phase: '1', questionInPhase: '0', category: 'SCHAETZCHEN',
      text: 'Wie viele Einwohner hat Köln?', textEn: 'How many people live in Cologne?',
      answer: '', answerEn: '',
      targetValue: '1080000', unit: 'Einwohner', unitEn: 'people',
      hostNote: 'Nah dran zählt!', funFact: 'Viertgrößte Stadt Deutschlands.',
    },
    {
      phase: '1', questionInPhase: '1', category: 'MUCHO',
      text: 'Welches Land ist das flächenmäßig größte?',
      textEn: 'Which country has the largest area?',
      answer: '', answerEn: '',
      options: 'Russland|Kanada|China|USA', optionsEn: 'Russia|Canada|China|USA',
      correctOptionIndex: '0',
    },
    {
      phase: '1', questionInPhase: '2', category: 'BUNTE_TUETE',
      text: 'Top 5 meistgesprochene Sprachen',
      textEn: 'Top 5 most spoken languages',
      answer: '', answerEn: '',
      bunteTueteKind: 'top5',
      bunteTueteData: '{"answers":["Englisch","Mandarin","Hindi","Spanisch","Französisch"]}',
    },
    {
      phase: '2', questionInPhase: '0', category: 'ZEHN_VON_ZEHN',
      text: 'Wie viele Knochen hat ein erwachsener Mensch?',
      textEn: 'How many bones does an adult human have?',
      answer: '206', answerEn: '206',
      options: '200|206|212', optionsEn: '200|206|212',
      correctOptionIndex: '1',
    },
    {
      phase: '2', questionInPhase: '1', category: 'CHEESE',
      text: 'Welches Gebäude ist das?', textEn: 'Which building is this?',
      answer: 'Kölner Dom', answerEn: 'Cologne Cathedral',
      hostNote: 'Bild muss separat hochgeladen werden.',
    },
  ];
  const rows = examples.map(r => CSV_COLUMNS.map(c => escapeCsv(r[c] ?? '')).join(','));
  return [header, ...rows].join('\r\n');
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface QQCsvParseResult {
  questions: QQQuestion[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

interface ImportContext {
  draftId: string;
}

export function parseCsvToQuestions(text: string, ctx: ImportContext): QQCsvParseResult {
  const result: QQCsvParseResult = { questions: [], errors: [], warnings: [] };
  const rows = parseCsv(text);
  if (rows.length === 0) {
    result.errors.push({ row: 0, message: 'CSV ist leer.' });
    return result;
  }

  const header = rows[0].map(h => h.trim());
  const headerIdx: Record<string, number> = {};
  CSV_COLUMNS.forEach(col => {
    const i = header.indexOf(col);
    if (i >= 0) headerIdx[col] = i;
  });

  const required: (keyof QQCsvRow)[] = ['phase', 'questionInPhase', 'category', 'text'];
  for (const col of required) {
    if (headerIdx[col] === undefined) {
      result.errors.push({ row: 0, message: `Spalte "${col}" fehlt im Header.` });
    }
  }
  if (result.errors.length > 0) return result;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (col: keyof QQCsvRow) => {
      const i = headerIdx[col];
      return i === undefined ? '' : (row[i] ?? '').trim();
    };
    const rowNum = r + 1; // 1-basiert, wie in Excel

    const phaseRaw = get('phase');
    const qidxRaw = get('questionInPhase');
    const catRaw = get('category').toUpperCase();
    const text = get('text');

    // leere Zeile komplett überspringen
    if (!phaseRaw && !catRaw && !text) continue;

    const phase = Number(phaseRaw);
    const questionIndexInPhase = Number(qidxRaw);

    if (!Number.isInteger(phase) || phase < 1 || phase > 4) {
      result.errors.push({ row: rowNum, message: `phase muss 1–4 sein (war: "${phaseRaw}")` });
      continue;
    }
    if (!Number.isInteger(questionIndexInPhase) || questionIndexInPhase < 0 || questionIndexInPhase > 4) {
      result.errors.push({ row: rowNum, message: `questionInPhase muss 0–4 sein (war: "${qidxRaw}")` });
      continue;
    }
    if (!VALID_CATEGORIES.includes(catRaw as QQCategory)) {
      result.errors.push({ row: rowNum, message: `category unbekannt: "${catRaw}". Erlaubt: ${VALID_CATEGORIES.join(', ')}` });
      continue;
    }
    if (!text) {
      result.errors.push({ row: rowNum, message: 'text ist leer.' });
      continue;
    }

    const cat = catRaw as QQCategory;
    const q: QQQuestion = {
      id: `${ctx.draftId}-p${phase}-q${questionIndexInPhase}-${cat}-${Date.now().toString(36)}-${r}`,
      category: cat,
      phaseIndex: phase as QQGamePhaseIndex,
      questionIndexInPhase,
      text,
      textEn: get('textEn') || undefined,
      answer: get('answer'),
      answerEn: get('answerEn') || undefined,
    };

    // Optionale globale Felder
    const hostNote = get('hostNote');     if (hostNote) q.hostNote = hostNote;
    const funFact  = get('funFact');      if (funFact)  q.funFact = funFact;
    const funEn    = get('funFactEn');    if (funEn)    q.funFactEn = funEn;

    // Kategorie-spezifisch
    if (cat === 'SCHAETZCHEN') {
      const tv = get('targetValue');
      if (!tv) { result.errors.push({ row: rowNum, message: 'SCHAETZCHEN braucht targetValue.' }); continue; }
      const n = Number(tv.replace(/[.\s]/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) { result.errors.push({ row: rowNum, message: `targetValue keine Zahl: "${tv}"` }); continue; }
      q.targetValue = n;
      const unit = get('unit');     if (unit) q.unit = unit;
      const unitEn = get('unitEn'); if (unitEn) q.unitEn = unitEn;
    }

    if (cat === 'MUCHO' || cat === 'ZEHN_VON_ZEHN') {
      const expected = cat === 'MUCHO' ? 4 : 3;
      const opts = get('options').split('|').map(s => s.trim()).filter(Boolean);
      if (opts.length !== expected) {
        result.errors.push({ row: rowNum, message: `${cat} braucht exakt ${expected} options (pipe-separated), waren ${opts.length}.` });
        continue;
      }
      q.options = opts;
      const optsEn = get('optionsEn').split('|').map(s => s.trim()).filter(Boolean);
      if (optsEn.length > 0 && optsEn.length !== expected) {
        result.warnings.push({ row: rowNum, message: `optionsEn-Anzahl (${optsEn.length}) passt nicht zu ${expected} — ignoriert.` });
      } else if (optsEn.length === expected) {
        q.optionsEn = optsEn;
      }
      const idxRaw = get('correctOptionIndex');
      const idx = Number(idxRaw);
      if (!Number.isInteger(idx) || idx < 0 || idx >= expected) {
        result.errors.push({ row: rowNum, message: `correctOptionIndex muss 0–${expected - 1} sein (war: "${idxRaw}")` });
        continue;
      }
      q.correctOptionIndex = idx;
    }

    if (cat === 'BUNTE_TUETE') {
      const kindRaw = get('bunteTueteKind');
      if (!VALID_BT_KINDS.includes(kindRaw as QQBunteTueteKind)) {
        result.errors.push({ row: rowNum, message: `bunteTueteKind ungültig: "${kindRaw}". Erlaubt: ${VALID_BT_KINDS.join(', ')}` });
        continue;
      }
      const dataRaw = get('bunteTueteData');
      // Union-Type: die Validierung einzelner Payload-Felder (answers/items/etc.)
      // übernimmt qqValidation.ts beim Speichern — hier reicht JSON-Parse + kind.
      let payload: Record<string, unknown> = { kind: kindRaw };
      if (dataRaw) {
        try {
          payload = { ...JSON.parse(dataRaw), kind: kindRaw };
        } catch {
          result.errors.push({ row: rowNum, message: `bunteTueteData ist kein gültiges JSON.` });
          continue;
        }
      } else {
        result.warnings.push({ row: rowNum, message: `bunteTueteData leer — Frage wird unvollständig importiert.` });
      }
      q.bunteTuete = payload as unknown as QQBunteTuetePayload;
    }

    if (cat === 'CHEESE') {
      result.warnings.push({ row: rowNum, message: `CHEESE: Bild muss nach Import manuell hochgeladen werden.` });
    }

    result.questions.push(q);
  }

  // Duplikat-Check: gleiche phase+questionInPhase mehrfach
  const seen = new Map<string, number>();
  for (let i = 0; i < result.questions.length; i++) {
    const q = result.questions[i];
    const key = `${q.phaseIndex}-${q.questionIndexInPhase}`;
    if (seen.has(key)) {
      result.warnings.push({
        row: i + 2,
        message: `Doppelter Slot P${q.phaseIndex}/Q${q.questionIndexInPhase + 1} — die spätere Frage überschreibt.`,
      });
    }
    seen.set(key, i);
  }

  return result;
}

// ── Merge into existing draft ─────────────────────────────────────────────────

/**
 * Merged importierte Fragen in eine bestehende Liste. Fragen mit gleichem
 * (phaseIndex, questionIndexInPhase) werden überschrieben, Rest kommt dazu.
 */
export function mergeImportedQuestions(existing: QQQuestion[], imported: QQQuestion[]): QQQuestion[] {
  const byKey = new Map<string, QQQuestion>();
  for (const q of existing) byKey.set(`${q.phaseIndex}-${q.questionIndexInPhase}`, q);
  for (const q of imported) byKey.set(`${q.phaseIndex}-${q.questionIndexInPhase}`, q);
  return Array.from(byKey.values()).sort((a, b) =>
    a.phaseIndex !== b.phaseIndex ? a.phaseIndex - b.phaseIndex : a.questionIndexInPhase - b.questionIndexInPhase
  );
}
