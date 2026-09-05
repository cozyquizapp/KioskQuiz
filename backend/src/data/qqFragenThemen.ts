// ── Wissensgebiete fuer die Spiel-Saetze ─────────────────────────────────────
// 2026-09-05 (Wolf: „trag die topics in die saetze ein").
//
// WARUM ES DIESE DATEI GIBT: `QQQuestion.topic` existiert seit Langem
// (shared/quarterQuizTypes.ts) und die CozyLibrary nutzt es, die SPIEL-SAETZE
// aber nicht. Damit misst `scripts/fragen-themen.mjs` die Bibliothek und nicht
// den Abend. Die Zuordnung steht hier statt verstreut in server.ts, damit man
// sie am Stueck lesen und einzeln widersprechen kann.
//
// ⚠️ DAS SIND URTEILE, KEINE MESSUNGEN. Ich habe die 110 Fragen gelesen und
// einsortiert. Ein paar sind Auslegung, und wer sie anders sieht, hat recht,
// wenn er es begruendet:
//   * Bauwerke (Eiffelturm, Akropolis, Kolosseum, Freiheitsstatue, Cristo
//     Redentor) stehen unter Geographie. Man koennte sie ebenso Kunst oder
//     Geschichte zuschlagen.
//   * Schach steht unter Sport, das Nike-Logo unter Popkultur.
//   * „Wie viele Tasten hat ein Standardklavier" ist Musik, nicht Technik.
// Aendern kostet hier eine Zeile, das ist Absicht.
//
// Vokabular: dieselben Begriffe wie in der Bibliothek und im
// OpenTriviaDB-Import (data/triviaDbImport.ts, CATEGORY_TO_TOPIC), damit sich
// beide Quellen in einer Auswertung addieren lassen.

export const QQ_FRAGEN_THEMEN: Record<string, string> = {
  // ── Pitch-Demo ────────────────────────────────────────────────────────────
  'qq-pitch-demo-p1-0': 'Geographie',      // Bundeslaender
  'qq-pitch-demo-p1-1': 'Geographie',      // Brandenburger Tor
  'qq-pitch-demo-p1-2': 'Essen & Trinken', // Getraenk in der Bar
  'qq-pitch-demo-p1-3': 'Natur & Tiere',   // Giraffe
  'qq-pitch-demo-p1-4': 'Geographie',      // Eiffelturm (Bild)
  'qq-pitch-demo-p2-0': 'Musik',           // Klaviertasten
  'qq-pitch-demo-p2-1': 'Sport',           // WM 2014
  'qq-pitch-demo-p2-2': 'Wissenschaft',    // groesste Planeten
  'qq-pitch-demo-p2-3': 'Geographie',      // Fluss durch Paris
  'qq-pitch-demo-p2-4': 'Natur & Tiere',   // Panda (Bild)

  // ── Vol. 1: Geographie und Wissenschaft ───────────────────────────────────
  'qq-vol-1-p1-0': 'Wissenschaft',   'qq-vol-1-p1-1': 'Wissenschaft',
  'qq-vol-1-p1-2': 'Geographie',     'qq-vol-1-p1-3': 'Geographie',
  'qq-vol-1-p1-4': 'Geographie',     'qq-vol-1-p2-0': 'Geographie',
  'qq-vol-1-p2-1': 'Wissenschaft',   'qq-vol-1-p2-2': 'Geschichte',
  'qq-vol-1-p2-3': 'Geographie',     'qq-vol-1-p2-4': 'Natur & Tiere',
  'qq-vol-1-p3-0': 'Wissenschaft',   'qq-vol-1-p3-1': 'Geographie',
  'qq-vol-1-p3-2': 'Geographie',     'qq-vol-1-p3-3': 'Kunst',
  'qq-vol-1-p3-4': 'Essen & Trinken','qq-vol-1-p4-0': 'Geschichte',
  'qq-vol-1-p4-1': 'Wissenschaft',   'qq-vol-1-p4-2': 'Geographie',
  'qq-vol-1-p4-3': 'Musik',          'qq-vol-1-p4-4': 'Film & TV',

  // ── Vol. 2: der Popkultur-Satz (Sport, Musik, Film) ───────────────────────
  'qq-vol-2-p1-0': 'Musik',          'qq-vol-2-p1-1': 'Sport',
  'qq-vol-2-p1-2': 'Sport',          'qq-vol-2-p1-3': 'Musik',
  'qq-vol-2-p1-4': 'Film & TV',      'qq-vol-2-p2-0': 'Geschichte',
  'qq-vol-2-p2-1': 'Sport',          'qq-vol-2-p2-2': 'Wissenschaft',
  'qq-vol-2-p2-3': 'Film & TV',      'qq-vol-2-p2-4': 'Musik',
  'qq-vol-2-p3-0': 'Sport',          'qq-vol-2-p3-1': 'Sport',
  'qq-vol-2-p3-2': 'Geographie',     'qq-vol-2-p3-3': 'Musik',
  'qq-vol-2-p3-4': 'Sport',          'qq-vol-2-p4-0': 'Technologie',
  'qq-vol-2-p4-1': 'Geographie',     'qq-vol-2-p4-2': 'Film & TV',
  'qq-vol-2-p4-3': 'Film & TV',      'qq-vol-2-p4-4': 'Popkultur',

  // ── Vol. 3: Geschichte, Kunst, Literatur ──────────────────────────────────
  'qq-vol-3-p1-0': 'Literatur',      'qq-vol-3-p1-1': 'Geschichte',
  'qq-vol-3-p1-2': 'Geographie',     'qq-vol-3-p1-3': 'Kunst',
  'qq-vol-3-p1-4': 'Kunst',          'qq-vol-3-p2-0': 'Geschichte',
  'qq-vol-3-p2-1': 'Literatur',      'qq-vol-3-p2-2': 'Geographie',
  'qq-vol-3-p2-3': 'Geschichte',     'qq-vol-3-p2-4': 'Geschichte',
  'qq-vol-3-p3-0': 'Musik',          'qq-vol-3-p3-1': 'Wissenschaft',
  'qq-vol-3-p3-2': 'Geographie',     'qq-vol-3-p3-3': 'Sprache',
  'qq-vol-3-p3-4': 'Geographie',     'qq-vol-3-p4-0': 'Literatur',
  'qq-vol-3-p4-1': 'Geschichte',     'qq-vol-3-p4-2': 'Technologie',
  'qq-vol-3-p4-3': 'Geschichte',     'qq-vol-3-p4-4': 'Kunst',

  // ── Vol. 4: Technik und Essen ─────────────────────────────────────────────
  'qq-vol-4-p1-0': 'Technologie',    'qq-vol-4-p1-1': 'Technologie',
  'qq-vol-4-p1-2': 'Geographie',     'qq-vol-4-p1-3': 'Technologie',
  'qq-vol-4-p1-4': 'Essen & Trinken','qq-vol-4-p2-0': 'Technologie',
  'qq-vol-4-p2-1': 'Technologie',    'qq-vol-4-p2-2': 'Geographie',
  'qq-vol-4-p2-3': 'Technologie',    'qq-vol-4-p2-4': 'Technologie',
  'qq-vol-4-p3-0': 'Essen & Trinken','qq-vol-4-p3-1': 'Essen & Trinken',
  'qq-vol-4-p3-2': 'Technologie',    'qq-vol-4-p3-3': 'Essen & Trinken',
  'qq-vol-4-p3-4': 'Essen & Trinken','qq-vol-4-p4-0': 'Sprache',
  'qq-vol-4-p4-1': 'Essen & Trinken','qq-vol-4-p4-2': 'Geographie',
  'qq-vol-4-p4-3': 'Natur & Tiere',  'qq-vol-4-p4-4': 'Technologie',

  // ── Vol. 5: Sport und Natur ───────────────────────────────────────────────
  'qq-vol-5-p1-0': 'Sport',          'qq-vol-5-p1-1': 'Sport',
  'qq-vol-5-p1-2': 'Geographie',     'qq-vol-5-p1-3': 'Sport',
  'qq-vol-5-p1-4': 'Sport',          'qq-vol-5-p2-0': 'Sport',
  'qq-vol-5-p2-1': 'Sport',          'qq-vol-5-p2-2': 'Natur & Tiere',
  'qq-vol-5-p2-3': 'Natur & Tiere',  'qq-vol-5-p2-4': 'Natur & Tiere',
  'qq-vol-5-p3-0': 'Sport',          'qq-vol-5-p3-1': 'Wissenschaft',
  'qq-vol-5-p3-2': 'Geographie',     'qq-vol-5-p3-3': 'Sport',
  'qq-vol-5-p3-4': 'Wissenschaft',   'qq-vol-5-p4-0': 'Wissenschaft',
  'qq-vol-5-p4-1': 'Sport',          'qq-vol-5-p4-2': 'Geschichte',
  'qq-vol-5-p4-3': 'Wissenschaft',   'qq-vol-5-p4-4': 'Natur & Tiere',
};

/**
 * Traegt fehlende Wissensgebiete nach. NUR fehlende: ein von Wolf im Builder
 * gesetztes `topic` wird nie ueberschrieben. Gibt zurueck, wie viele Fragen
 * ergaenzt wurden, damit der Aufrufer entscheiden kann, ob sich Speichern
 * lohnt.
 */
export function ergaenzeFragenThemen(drafts: Array<{ questions?: any[] }>): number {
  let n = 0;
  for (const d of drafts ?? []) {
    for (const q of d?.questions ?? []) {
      if (!q || q.topic) continue;
      const thema = QQ_FRAGEN_THEMEN[q.id];
      if (thema) { q.topic = thema; n++; }
    }
  }
  return n;
}
