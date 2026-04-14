import { useState, useRef } from 'react';
import type { QQDraft, QQQuestion } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_LABELS } from '../../../shared/quarterQuizTypes';
import {
  buildCsvTemplate,
  parseCsvToQuestions,
  mergeImportedQuestions,
  type QQCsvParseResult,
} from './qqCsvImport';

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function QQCsvImportModal({
  draft, onClose, onApply,
}: {
  draft: QQDraft;
  onClose: () => void;
  onApply: (mergedQuestions: QQQuestion[]) => void;
}) {
  const [result, setResult] = useState<QQCsvParseResult | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setFilename(file.name);
    const text = await file.text();
    const r = parseCsvToQuestions(text, { draftId: draft.id });
    setResult(r);
  }

  function apply() {
    if (!result || result.errors.length > 0 || result.questions.length === 0) return;
    const merged = mergeImportedQuestions(draft.questions, result.questions);
    onApply(merged);
  }

  const canApply = result && result.errors.length === 0 && result.questions.length > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 860, maxHeight: '90vh',
        background: '#0f172a', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#e2e8f0' }}>📥 CSV importieren</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => downloadCsv('qq-vorlage.csv', buildCsvTemplate())} style={btn('#F59E0B')}>
              📄 Vorlage herunterladen
            </button>
            <button onClick={onClose} style={btn('#475569')}>✕ Schließen</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
          {!result && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#3B82F6' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 12, padding: 48, textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>
                  CSV-Datei hier ablegen oder klicken
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Komma-getrennt · UTF-8 · erste Zeile = Header
                </div>
                <input
                  ref={fileInputRef} type="file" accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
              </div>

              <div style={{ marginTop: 20, padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>💡 So geht's</div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li><b>Vorlage herunterladen</b> (oben rechts) — hat Beispielzeilen aller Kategorien.</li>
                  <li>In Excel / Google Sheets öffnen, Fragen reinschreiben, als CSV exportieren.</li>
                  <li>Zurück hier CSV droppen → Preview checken → "Importieren".</li>
                </ol>
                <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                  Bilder (CHEESE / MUCHO-Karten), Musik und Slide-Designs bleiben unverändert — nur der Frage-Inhalt wird importiert.
                </div>
              </div>
            </>
          )}

          {result && <ResultView result={result} filename={filename} onReset={() => setResult(null)} />}
        </div>

        {/* Footer */}
        {result && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {result.questions.length} gültig · {result.errors.length} Fehler · {result.warnings.length} Hinweise
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setResult(null)} style={btn('#475569')}>↩ Andere Datei</button>
              <button
                onClick={apply}
                disabled={!canApply}
                style={{ ...btn(canApply ? '#22C55E' : '#334155'), opacity: canApply ? 1 : 0.5, cursor: canApply ? 'pointer' : 'not-allowed' }}
              >
                ✓ {result.questions.length} Fragen übernehmen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultView({ result, filename, onReset }: { result: QQCsvParseResult; filename: string; onReset: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
        <span style={{ fontSize: 14 }}>📄</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{filename}</span>
        <button onClick={onReset} style={{ marginLeft: 'auto', ...btn('#475569'), padding: '4px 10px', fontSize: 11 }}>↩ Andere Datei</button>
      </div>

      {result.errors.length > 0 && (
        <div style={{ marginBottom: 12, padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fca5a5', marginBottom: 6 }}>
            🛑 {result.errors.length} {result.errors.length === 1 ? 'Fehler — Import nicht möglich' : 'Fehler — Import nicht möglich'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
            {result.errors.map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: '#fecaca', fontFamily: 'monospace' }}>
                Zeile {e.row}: {e.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div style={{ marginBottom: 12, padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fcd34d', marginBottom: 6 }}>
            ⚠️ {result.warnings.length} Hinweis{result.warnings.length === 1 ? '' : 'e'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto' }}>
            {result.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 11, color: '#fde68a', fontFamily: 'monospace' }}>
                Zeile {w.row}: {w.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.questions.length > 0 && (
        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 800, color: '#86efac', background: 'rgba(34,197,94,0.08)' }}>
            ✓ {result.questions.length} Fragen erkannt
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0f172a' }}>
                <tr style={{ color: '#64748b', fontWeight: 800 }}>
                  <th style={th}>Phase</th>
                  <th style={th}>Slot</th>
                  <th style={th}>Kategorie</th>
                  <th style={{ ...th, textAlign: 'left' }}>Frage</th>
                  <th style={{ ...th, textAlign: 'left' }}>Antwort</th>
                </tr>
              </thead>
              <tbody>
                {result.questions.map(q => {
                  const lbl = QQ_CATEGORY_LABELS[q.category];
                  const ans = q.answer || (q.targetValue != null ? `${q.targetValue}${q.unit ? ' ' + q.unit : ''}` : (q.options && q.correctOptionIndex != null ? q.options[q.correctOptionIndex] : '—'));
                  return (
                    <tr key={q.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}>
                      <td style={td}>P{q.phaseIndex}</td>
                      <td style={td}>{q.questionIndexInPhase + 1}</td>
                      <td style={td}>{lbl.emoji} {lbl.de}</td>
                      <td style={{ ...td, textAlign: 'left', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</td>
                      <td style={{ ...td, textAlign: 'left', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#86efac' }}>{ans}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' };
const td: React.CSSProperties = { padding: '6px 10px', textAlign: 'center' };

function btn(color: string): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 8, border: 'none',
    background: color, color: '#fff',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
