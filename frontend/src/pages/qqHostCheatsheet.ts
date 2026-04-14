// ── Quarter Quiz — Host Cheatsheet PDF Export ────────────────────────────────
// Client-side PDF: opens a new window with print-optimized HTML and triggers
// window.print(). Dependency-free, user picks "Save as PDF" in the print dialog.

import {
  QQDraft, QQQuestion, QQCategory,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';

// Duplicate of HOST_NOTES_DE from QQModeratorPage.tsx — keep in sync.
const HOST_NOTES_DE: Record<string, { title: string; text: string }> = {
  LOBBY: {
    title: 'Lobby — Teams einchecken',
    text: 'Begrüße dein Publikum. Weise Teams darauf hin, den QR-Code zu scannen, einen Avatar (inkl. Teamfarbe) und einen Teamnamen zu wählen. Warte, bis alle Teams bereit sind, bevor du startest.',
  },
  RULES: {
    title: 'Regeln erklären',
    text: 'Gehe die Regel-Folien kurz durch. Wichtig: Jedes Team, das richtig antwortet, darf ein Feld auf dem Gitter setzen. Bei Gleichstand entscheidet die Geschwindigkeit nur darüber, wer ZUERST wählen darf.',
  },
  PHASE_INTRO: {
    title: 'Kategorie-Intro',
    text: 'Stimme das Publikum auf die kommende Kategorie ein. Erwähne kurz, worum es geht — baue Spannung auf, bevor die erste Frage kommt.',
  },
  QUESTION_ACTIVE: {
    title: 'Frage läuft',
    text: 'Lies die Frage laut vor. Erinnere die Teams: "Alle gleichzeitig auf dem Handy antworten!" Beobachte den Timer und heize die Stimmung an.',
  },
  QUESTION_REVEAL: {
    title: 'Antwort aufdecken',
    text: 'Verkünde die richtige Antwort mit Nachdruck. Hebe knappe oder überraschende Antworten hervor. Erwähne, welche Teams richtig lagen.',
  },
  PLACEMENT: {
    title: 'Feld-Platzierung',
    text: 'Jedes richtige Team darf jetzt ein Feld setzen. Bei Gleichstand: Das schnellste Team wählt zuerst. Kommentiere strategische Züge ("ah, cleverer Block!").',
  },
  COMEBACK_CHOICE: {
    title: 'Comeback-Runde',
    text: 'Das zurückliegende Team darf einen Joker einsetzen. Erkläre kurz die Optionen und baue Spannung auf — das kann die Runde drehen!',
  },
  PAUSED: {
    title: 'Pause',
    text: 'Kurze Verschnaufpause. Nutze die Zeit für eine Anekdote, einen kurzen Überblick über den Spielstand oder um auf die nächste Runde einzustimmen.',
  },
  GAME_OVER: {
    title: 'Spielende',
    text: 'Verkünde den Gewinner! Bedanke dich bei allen Teams für ihre Teilnahme. Würdige besondere Momente oder Comebacks aus der Partie.',
  },
};

function esc(s: string | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMechanicDetails(q: QQQuestion): string {
  const blocks: string[] = [];

  if (q.category === 'SCHAETZCHEN') {
    const unit = q.unit ? ` ${esc(q.unit)}` : '';
    if (q.targetValue != null) {
      blocks.push(`<div class="meta"><b>Zielwert:</b> ${esc(String(q.targetValue))}${unit}</div>`);
    }
  }

  if (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN') {
    if (q.options && q.options.length) {
      const correctIdx = q.correctOptionIndex ?? 0;
      const items = q.options.map((opt, i) => {
        const isCorrect = i === correctIdx;
        const label = String.fromCharCode(65 + i);
        return `<li class="${isCorrect ? 'correct' : ''}">${label}. ${esc(opt)}${isCorrect ? ' ✓' : ''}</li>`;
      }).join('');
      blocks.push(`<ol class="opts">${items}</ol>`);
    }
  }

  if (q.category === 'BUNTE_TUETE' && q.bunteTuete) {
    const bt = q.bunteTuete;
    const kindLbl = QQ_BUNTE_TUETE_LABELS[bt.kind];
    blocks.push(`<div class="meta"><b>Mechanik:</b> ${kindLbl.emoji} ${esc(kindLbl.de)}</div>`);
    if (bt.kind === 'top5' && bt.answers?.length) {
      const items = bt.answers.map((a, i) => `<li>${i + 1}. ${esc(a)}</li>`).join('');
      blocks.push(`<ol class="opts">${items}</ol>`);
    } else if (bt.kind === 'oneOfEight' && bt.statements?.length) {
      const items = bt.statements.map((s, i) => {
        const isFalse = i === bt.falseIndex;
        return `<li class="${isFalse ? 'correct' : ''}">${i + 1}. ${esc(s)}${isFalse ? ' ← Imposter' : ''}</li>`;
      }).join('');
      blocks.push(`<ol class="opts">${items}</ol>`);
    } else if (bt.kind === 'order' && bt.items?.length) {
      if (bt.criteria) blocks.push(`<div class="meta"><b>Kriterium:</b> ${esc(bt.criteria)}</div>`);
      const correct = bt.correctOrder ?? [];
      const ordered = correct.map((idx, pos) => {
        const label = bt.items[idx] ?? `(${idx})`;
        return `<li>${pos + 1}. ${esc(label)}</li>`;
      }).join('');
      if (ordered) blocks.push(`<div class="meta"><b>Richtige Reihenfolge:</b></div><ol class="opts">${ordered}</ol>`);
    } else if (bt.kind === 'map') {
      const lbl = bt.targetLabel ? ` — ${esc(bt.targetLabel)}` : '';
      blocks.push(`<div class="meta"><b>Pin:</b> ${bt.lat.toFixed(4)}, ${bt.lng.toFixed(4)}${lbl}</div>`);
    } else if (bt.kind === 'hotPotato') {
      blocks.push(`<div class="meta"><b>Ablauf:</b> Reihum Antworten sammeln — wer nicht kann, scheidet aus.</div>`);
    }
  }

  if (q.category === 'CHEESE') {
    if (q.image?.url) {
      blocks.push(`<div class="meta"><b>Bild:</b> vorhanden (${esc(q.image.layout)})</div>`);
    } else {
      blocks.push(`<div class="meta warn"><b>⚠️ Bild fehlt</b></div>`);
    }
  }

  return blocks.join('\n');
}

function renderQuestion(q: QQQuestion, globalIdx: number): string {
  const catLbl = QQ_CATEGORY_LABELS[q.category];
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const phasePos = `Phase ${q.phaseIndex} · Frage ${q.questionIndexInPhase + 1}`;
  const textEn = q.textEn ? `<div class="qtext-en">${esc(q.textEn)}</div>` : '';
  const answerEn = q.answerEn ? `<div class="ans-en">${esc(q.answerEn)}</div>` : '';
  const hostNote = q.hostNote?.trim()
    ? `<div class="hostnote"><div class="hostnote-hd">🎙️ Moderator-Tipp</div><div>${esc(q.hostNote)}</div></div>`
    : '';
  const funFact = q.funFact?.trim()
    ? `<div class="funfact"><div class="funfact-hd">💡 Fun Fact</div><div>${esc(q.funFact)}</div>${q.funFactEn?.trim() ? `<div class="funfact-en">${esc(q.funFactEn)}</div>` : ''}</div>`
    : '';

  return `
  <section class="q">
    <header class="qhead">
      <div class="qnum">#${globalIdx + 1}</div>
      <div class="qmeta">
        <div class="qphase">${esc(phasePos)}</div>
        <div class="qcat" style="background:${catColor}1a;color:${catColor};border-color:${catColor}55">
          ${catLbl.emoji} ${esc(catLbl.de)}
        </div>
      </div>
    </header>
    <div class="qtext">${esc(q.text || '—')}</div>
    ${textEn}
    ${renderMechanicDetails(q)}
    <div class="answer">
      <div class="answer-lbl">Antwort</div>
      <div class="answer-text">${esc(q.answer || '—')}</div>
      ${answerEn}
    </div>
    ${hostNote}
    ${funFact}
  </section>`;
}

function renderCoverPage(draft: QQDraft): string {
  const phases = draft.phases ?? 3;
  const totalQ = draft.questions.length;
  const coverNotes = ['LOBBY', 'RULES', 'PHASE_INTRO', 'QUESTION_ACTIVE', 'QUESTION_REVEAL', 'PLACEMENT', 'COMEBACK_CHOICE', 'PAUSED', 'GAME_OVER']
    .map(k => {
      const n = HOST_NOTES_DE[k];
      return `<div class="note"><div class="note-hd">${esc(n.title)}</div><div class="note-body">${esc(n.text)}</div></div>`;
    }).join('');

  return `
  <section class="cover">
    <div class="cover-top">
      <div class="brand">Quartier Quiz</div>
      <div class="cover-title">${esc(draft.title || 'Host Cheatsheet')}</div>
      <div class="cover-sub">${phases} Phasen · ${totalQ} Fragen · Stand: ${new Date().toLocaleDateString('de-DE')}</div>
    </div>
    <h2 class="notes-hd">Moderator-Tipps pro Phase</h2>
    <div class="notes">${coverNotes}</div>
  </section>`;
}

function renderPhaseHeader(phaseIndex: number): string {
  return `<section class="phasehead"><div class="phasehead-big">Phase ${phaseIndex}</div></section>`;
}

export function exportHostCheatsheet(draft: QQDraft): void {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) {
    alert('Popup blockiert — bitte Popups für diese Seite erlauben.');
    return;
  }

  // Sort questions by phase then index
  const sorted = [...draft.questions].sort((a, b) => {
    if (a.phaseIndex !== b.phaseIndex) return a.phaseIndex - b.phaseIndex;
    return a.questionIndexInPhase - b.questionIndexInPhase;
  });

  // Group by phase for headers
  const blocks: string[] = [];
  let currentPhase = -1;
  let globalIdx = 0;
  for (const q of sorted) {
    if (q.phaseIndex !== currentPhase) {
      currentPhase = q.phaseIndex;
      blocks.push(renderPhaseHeader(currentPhase));
    }
    blocks.push(renderQuestion(q, globalIdx));
    globalIdx++;
  }

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Host Cheatsheet — ${esc(draft.title || 'Quarter Quiz')}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Nunito', system-ui, -apple-system, sans-serif; color: #0f172a; background: #fff; font-size: 11pt; line-height: 1.4; }
  h1, h2, h3 { margin: 0; }

  .cover { page-break-after: always; padding: 20mm 0 0; }
  .cover-top { text-align: center; padding-bottom: 24px; border-bottom: 3px solid #0f172a; margin-bottom: 24px; }
  .brand { font-size: 14pt; font-weight: 800; letter-spacing: 0.12em; color: #64748b; text-transform: uppercase; }
  .cover-title { font-size: 28pt; font-weight: 900; margin-top: 8px; }
  .cover-sub { font-size: 11pt; color: #475569; margin-top: 8px; }
  .notes-hd { font-size: 14pt; font-weight: 800; margin: 8px 0 12px; color: #0f172a; }
  .notes { display: grid; gap: 10px; }
  .note { border: 1px solid #e2e8f0; border-left: 4px solid #FBBF24; border-radius: 6px; padding: 8px 12px; background: #fffbeb; }
  .note-hd { font-size: 10pt; font-weight: 800; color: #b45309; margin-bottom: 2px; }
  .note-body { font-size: 10pt; color: #334155; }

  .phasehead { page-break-before: always; page-break-after: avoid; margin-bottom: 12px; padding-top: 10mm; }
  .phasehead-big { font-size: 36pt; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; border-bottom: 4px solid #0f172a; padding-bottom: 6px; }

  .q { page-break-inside: avoid; margin-bottom: 14px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
  .qhead { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .qnum { font-size: 20pt; font-weight: 900; color: #94a3b8; min-width: 50px; }
  .qmeta { flex: 1; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  .qphase { font-size: 10pt; font-weight: 700; color: #475569; }
  .qcat { font-size: 10pt; font-weight: 800; padding: 3px 10px; border-radius: 999px; border: 1px solid; }

  .qtext { font-size: 13pt; font-weight: 700; color: #0f172a; margin: 4px 0 2px; }
  .qtext-en { font-size: 10pt; color: #64748b; font-style: italic; margin-bottom: 6px; }

  .meta { font-size: 10pt; color: #334155; margin: 4px 0; }
  .meta.warn { color: #b45309; }
  .opts { list-style: none; padding: 0; margin: 6px 0; display: grid; gap: 3px; }
  .opts li { font-size: 10pt; padding: 3px 8px; border-radius: 4px; background: #f1f5f9; color: #334155; }
  .opts li.correct { background: #dcfce7; color: #14532d; font-weight: 700; }

  .answer { margin-top: 8px; padding: 8px 12px; background: #f0fdf4; border-left: 4px solid #22C55E; border-radius: 4px; }
  .answer-lbl { font-size: 9pt; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.08em; }
  .answer-text { font-size: 12pt; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .ans-en { font-size: 10pt; color: #475569; font-style: italic; margin-top: 2px; }

  .hostnote { margin-top: 8px; padding: 8px 12px; background: #fef3c7; border-left: 4px solid #FBBF24; border-radius: 4px; }
  .hostnote-hd { font-size: 9pt; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }

  .funfact { margin-top: 8px; padding: 8px 12px; background: #faf5ff; border-left: 4px solid #A855F7; border-radius: 4px; }
  .funfact-hd { font-size: 9pt; font-weight: 800; color: #7e22ce; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
  .funfact-en { font-size: 10pt; color: #6b7280; font-style: italic; margin-top: 3px; }

  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  .no-print { position: fixed; top: 10px; right: 10px; z-index: 100; display: flex; gap: 8px; }
  .no-print button { padding: 8px 16px; font-weight: 800; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 11pt; }
  .btn-print { background: #22C55E; color: white; }
  .btn-close { background: #64748b; color: white; }
</style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Drucken / PDF speichern</button>
    <button class="btn-close" onclick="window.close()">Schließen</button>
  </div>
  ${renderCoverPage(draft)}
  ${blocks.join('\n')}
  <script>
    // Auto-trigger print dialog after render
    window.addEventListener('load', () => { setTimeout(() => window.print(), 400); });
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
