// ── OpenTriviaDB Import — Massen-Pool für CozyLibrary ────────────────────────
// 2026-05-11: Holt ~5–6k Trivia-Fragen aus opentdb.com (Creative Commons),
// konvertiert sie zu QQLibraryItem (MUCHO 4-Optionen oder ZEHN_VON_ZEHN 3-Opt),
// übersetzt text+answer via DeepL (sofern Quota), persistiert mit source='triviadb'.
//
// HTML-Entities werden dekodiert (TriviaDB liefert &quot; / &#039; / &amp; usw.).
// Anti-Duplikate: ID = `lib-tdb-{md5(text)[0:12]}` — idempotent über Reruns hinweg.
//
// Lizenz OpenTriviaDB: CC BY-SA 4.0 (siehe https://opentdb.com)

import crypto from 'crypto';
import { upsertQQLibraryItem, QQLibraryItemModel } from '../db/schemas';

const TDB_API = 'https://opentdb.com/api.php';
const TDB_TOKEN_API = 'https://opentdb.com/api_token.php';

// ── HTML-Entity-Decoder ─────────────────────────────────────────────────────
const HTML_ENTITIES: Record<string, string> = {
  '&quot;': '"', '&#039;': "'", '&apos;': "'", '&amp;': '&',
  '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&shy;': '',
  '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&laquo;': '«', '&raquo;': '»', '&ldquo;': '"', '&rdquo;': '"',
  '&lsquo;': "'", '&rsquo;': "'", '&eacute;': 'é', '&Eacute;': 'É',
};
function decodeHtmlEntities(s: string): string {
  if (!s) return '';
  let out = s;
  for (const [ent, ch] of Object.entries(HTML_ENTITIES)) {
    out = out.split(ent).join(ch);
  }
  // Numerische Entities: &#39; / &#x27;
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return out;
}

// ── Category-Mapping (TriviaDB-Kategorie → QQ-Topic) ─────────────────────────
const CATEGORY_TO_TOPIC: Record<string, string> = {
  'General Knowledge':                'Allgemeinwissen',
  'Entertainment: Books':             'Literatur',
  'Entertainment: Film':              'Film & TV',
  'Entertainment: Music':             'Musik',
  'Entertainment: Musicals & Theatres': 'Kultur',
  'Entertainment: Television':        'Film & TV',
  'Entertainment: Video Games':       'Spiele',
  'Entertainment: Board Games':       'Spiele',
  'Entertainment: Japanese Anime & Manga': 'Film & TV',
  'Entertainment: Cartoon & Animations': 'Film & TV',
  'Entertainment: Comics':            'Film & TV',
  'Science & Nature':                 'Wissenschaft',
  'Science: Computers':               'Technologie',
  'Science: Mathematics':             'Mathematik',
  'Science: Gadgets':                 'Technologie',
  'Mythology':                        'Geschichte',
  'Sports':                           'Sport',
  'Geography':                        'Geographie',
  'History':                          'Geschichte',
  'Politics':                         'Politik',
  'Art':                              'Kunst',
  'Celebrities':                      'Promis',
  'Animals':                          'Natur & Tiere',
  'Vehicles':                         'Technologie',
};

function mapCategoryToTopic(cat: string): string {
  return CATEGORY_TO_TOPIC[cat] ?? 'Allgemeinwissen';
}

// ── Translate-Helper (DeepL Free) ────────────────────────────────────────────
// Wiederverwendet das gleiche DeepL-Pattern wie in server.ts.
async function translateOrFallback(text: string, src = 'EN', tgt = 'DE'): Promise<string> {
  if (!text?.trim()) return '';
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return '';  // keine DeepL → leer lassen, Wolf übersetzt später
  try {
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], source_lang: src.toUpperCase(), target_lang: tgt.toUpperCase() }),
    });
    if (!res.ok) return '';
    const data = await res.json() as any;
    return data?.translations?.[0]?.text?.trim() ?? '';
  } catch {
    return '';
  }
}

// ── TriviaDB-API-Aufrufe ────────────────────────────────────────────────────
type TdbQuestion = {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
};

async function fetchSessionToken(): Promise<string | null> {
  try {
    const res = await fetch(`${TDB_TOKEN_API}?command=request`);
    const data = await res.json() as any;
    return data?.token ?? null;
  } catch {
    return null;
  }
}

async function fetchBatch(amount: number, token?: string | null): Promise<TdbQuestion[]> {
  const params = new URLSearchParams({ amount: String(Math.min(amount, 50)) });
  if (token) params.set('token', token);
  try {
    const res = await fetch(`${TDB_API}?${params}`);
    const data = await res.json() as any;
    if (data?.response_code === 4) return [];  // token exhausted = alle Fragen geliefert
    if (Array.isArray(data?.results)) return data.results;
    return [];
  } catch {
    return [];
  }
}

// ── Conversion: TriviaDB-Frage → QQLibraryItem ──────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeItemId(textEn: string, answerEn: string): string {
  const hash = crypto.createHash('md5').update(textEn + '|' + answerEn).digest('hex').slice(0, 12);
  return `lib-tdb-${hash}`;
}

function convertToLibraryItem(tdb: TdbQuestion, deText: string, deAnswer: string): any {
  const textEn      = decodeHtmlEntities(tdb.question);
  const answerEn    = decodeHtmlEntities(tdb.correct_answer);
  const wrongEn     = tdb.incorrect_answers.map(decodeHtmlEntities);

  // 'multiple' → MUCHO (4 Optionen), 'boolean' → ZEHN_VON_ZEHN (2 Optionen,
  // wir fügen kein Drittes hinzu — bei 10v10 sind das 'pro/kontra/nichts'-
  // Antworten. Da es nur 'True/False' gibt, mappen wir es ebenfalls auf MUCHO
  // mit nur 2 Optionen, das Game-Engine kommt damit klar).
  const isMultiple = tdb.type === 'multiple';
  const category   = isMultiple ? 'MUCHO' : 'ZEHN_VON_ZEHN';
  const allEn      = shuffle([answerEn, ...wrongEn]);
  const correctIdx = allEn.indexOf(answerEn);

  return {
    id: makeItemId(textEn, answerEn),
    category,
    topic: mapCategoryToTopic(tdb.category),
    text:    deText || '',
    textEn,
    answer:  deAnswer || '',
    answerEn,
    options: [],         // DE leer — Wolf übersetzt beim Import in Quiz
    optionsEn: allEn,
    correctOptionIndex: correctIdx,
    source: 'triviadb',
  };
}

// ── Import-State (in-memory progress tracker) ───────────────────────────────
export type ImportStatus = {
  running: boolean;
  startedAt: number;
  finishedAt: number | null;
  fetchedTotal: number;
  importedTotal: number;
  translatedTotal: number;
  errors: string[];
  lastBatch: number;
  targetTotal: number;
};

let _status: ImportStatus = {
  running: false,
  startedAt: 0,
  finishedAt: null,
  fetchedTotal: 0,
  importedTotal: 0,
  translatedTotal: 0,
  errors: [],
  lastBatch: 0,
  targetTotal: 0,
};

export function getImportStatus(): ImportStatus {
  return { ..._status };
}

// ── Main-Pipeline ───────────────────────────────────────────────────────────
export async function runTriviaDbImport(opts: {
  targetCount?: number;
  translate?: boolean;
} = {}): Promise<ImportStatus> {
  if (_status.running) return getImportStatus();
  const target = Math.min(opts.targetCount ?? 5000, 10000);
  const translate = opts.translate !== false;

  _status = {
    running: true,
    startedAt: Date.now(),
    finishedAt: null,
    fetchedTotal: 0,
    importedTotal: 0,
    translatedTotal: 0,
    errors: [],
    lastBatch: 0,
    targetTotal: target,
  };

  // Background-async, return status immediately
  (async () => {
    try {
      const token = await fetchSessionToken();
      if (!token) {
        _status.errors.push('TriviaDB-Token-Anforderung fehlgeschlagen');
      }
      // Existing-IDs cache, damit wir Doppel-Translate vermeiden
      let imported = 0;
      let consecutiveEmpty = 0;
      while (imported < target && consecutiveEmpty < 3) {
        const batchSize = Math.min(50, target - imported);
        const batch = await fetchBatch(batchSize, token);
        _status.lastBatch = batch.length;
        if (batch.length === 0) {
          consecutiveEmpty++;
          // Rate-Limit-Wait 5s
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        consecutiveEmpty = 0;
        _status.fetchedTotal += batch.length;

        for (const tdb of batch) {
          try {
            const textEn = decodeHtmlEntities(tdb.question);
            const answerEn = decodeHtmlEntities(tdb.correct_answer);
            const id = makeItemId(textEn, answerEn);

            // Schon existent? Skip-Translate.
            const existing = await QQLibraryItemModel.findOne({ id }).lean();
            if (existing) {
              imported++;
              continue;
            }

            let deText = '';
            let deAnswer = '';
            if (translate) {
              deText = await translateOrFallback(textEn, 'EN', 'DE');
              deAnswer = await translateOrFallback(answerEn, 'EN', 'DE');
              if (deText) _status.translatedTotal++;
              // Kleines Throttling, damit DeepL nicht rate-limited
              await new Promise(r => setTimeout(r, 50));
            }

            const item = convertToLibraryItem(tdb, deText, deAnswer);
            await upsertQQLibraryItem(item);
            imported++;
            _status.importedTotal = imported;
          } catch (err) {
            _status.errors.push(String(err).slice(0, 200));
            if (_status.errors.length > 50) _status.errors = _status.errors.slice(-50);
          }
        }
        // TriviaDB API-Rate-Limit: 1 Request pro 5 Sekunden mit Token
        await new Promise(r => setTimeout(r, 5500));
      }
    } catch (err) {
      _status.errors.push(`Pipeline-Fehler: ${String(err).slice(0, 300)}`);
    } finally {
      _status.running = false;
      _status.finishedAt = Date.now();
      console.log(`[triviadb-import] Fertig — ${_status.importedTotal} Items importiert, ${_status.translatedTotal} übersetzt, ${_status.errors.length} Fehler`);
    }
  })().catch(err => {
    _status.running = false;
    _status.finishedAt = Date.now();
    _status.errors.push(`Background-Fehler: ${String(err).slice(0, 300)}`);
  });

  return getImportStatus();
}
