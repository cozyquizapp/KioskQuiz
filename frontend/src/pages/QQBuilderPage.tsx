import { useState, useEffect, useRef } from 'react';
import {
  QQQuestion, QQCategory, QQLanguage, QQDraft,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQImageLayout, QQImageAnimation, QQQuestionImage,
  QQBunteTueteKind, QQ_BUNTE_TUETE_LABELS,
  QQBunteTuetePayload,
} from '../../../shared/quarterQuizTypes';

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
const BUNTE_KINDS: QQBunteTueteKind[] = ['hotPotato', 'top5', 'oneOfEight', 'order', 'map'];

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

function makeEmptyDraft(phases: 3 | 4): QQDraft {
  const id = `qq-draft-${Date.now().toString(36)}`;
  const questions: QQQuestion[] = [];
  for (let p = 1; p <= phases; p++) {
    CATEGORIES.forEach((cat, qi) => questions.push(makeEmptyQuestion(p, qi, cat, id)));
  }
  return { id, title: 'Neuer Fragensatz', phases, language: 'both', questions, createdAt: Date.now(), updatedAt: Date.now() };
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
  const [drafts, setDrafts] = useState<QQDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<QQDraft | null>(null);
  const [activeSlot, setActiveSlot] = useState<{ phase: number; qi: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [removingBgFor, setRemovingBgFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/qq/drafts').then(r => r.json()).then(data => { if (Array.isArray(data)) setDrafts(data); }).catch(() => {});
  }, []);

  function getQuestion(draft: QQDraft, phase: number, qi: number) {
    return draft.questions.find(q => q.phaseIndex === phase && q.questionIndexInPhase === qi);
  }
  function updateQuestion(draft: QQDraft, updated: QQQuestion): QQDraft {
    return { ...draft, questions: draft.questions.map(q => q.phaseIndex === updated.phaseIndex && q.questionIndexInPhase === updated.questionIndexInPhase ? updated : q), updatedAt: Date.now() };
  }

  async function createDraft(phases: 3 | 4) {
    const draft = makeEmptyDraft(phases);
    const res = await fetch('/api/qq/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (res.ok) { const saved = await res.json(); setDrafts(prev => [saved, ...prev]); setActiveDraft(saved); }
  }
  async function saveDraft(draft: QQDraft) {
    setSaving(true);
    try {
      const res = await fetch(`/api/qq/drafts/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      if (res.ok) { const saved = await res.json(); setDrafts(prev => prev.map(d => d.id === saved.id ? saved : d)); setActiveDraft(saved); }
    } finally { setSaving(false); }
  }
  async function deleteDraft(id: string) {
    if (!confirm('Fragensatz löschen?')) return;
    await fetch(`/api/qq/drafts/${id}`, { method: 'DELETE' });
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (activeDraft?.id === id) setActiveDraft(null);
  }

  async function uploadImage(questionId: string) {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !activeDraft) return;
    setUploadingFor(questionId);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const q = activeDraft.questions.find(q => q.id === questionId);
      if (!q) return;
      const updated = { ...q, image: { url: data.imageUrl, layout: q.image?.layout ?? 'fullscreen' as QQImageLayout, animation: q.image?.animation ?? 'none' as QQImageAnimation, bgRemovedUrl: undefined } };
      setActiveDraft(updateQuestion(activeDraft, updated));
    } finally { setUploadingFor(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
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

  const activeQ = activeDraft && activeSlot ? getQuestion(activeDraft, activeSlot.phase, activeSlot.qi) : null;

  if (!activeDraft) return <DraftListScreen drafts={drafts} onOpen={setActiveDraft} onCreate={createDraft} onDelete={deleteDraft} />;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 24px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveDraft(null)} style={btnStyle('#475569')}>← Zurück</button>
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
            }} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: activeDraft.phases === n ? '#3B82F6' : 'rgba(255,255,255,0.07)', color: activeDraft.phases === n ? '#fff' : '#94a3b8' }}>{n}</button>
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => saveDraft(activeDraft)} style={btnStyle('#22C55E')} disabled={saving}>{saving ? '…' : '💾 Speichern'}</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${CATEGORIES.length}, 1fr)`, gap: 6, minWidth: 700 }}>
            <div />
            {CATEGORIES.map(cat => (
              <div key={cat} style={{ padding: '8px 6px', borderRadius: 8, textAlign: 'center', background: QQ_CATEGORY_COLORS[cat] + '22', border: `1px solid ${QQ_CATEGORY_COLORS[cat]}44`, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: QQ_CATEGORY_COLORS[cat] }}>
                {QQ_CATEGORY_LABELS[cat].emoji} {QQ_CATEGORY_LABELS[cat].de}
              </div>
            ))}
            {Array.from({ length: activeDraft.phases }, (_, pi) => {
              const phaseNum = pi + 1;
              return [
                <div key={`label-${phaseNum}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ph {phaseNum}</div>,
                ...CATEGORIES.map((cat, qi) => {
                  const q = getQuestion(activeDraft, phaseNum, qi);
                  const isActive = activeSlot?.phase === phaseNum && activeSlot?.qi === qi;
                  const preview = cellPreview(q);
                  return (
                    <div key={`${phaseNum}-${qi}`} onClick={() => setActiveSlot({ phase: phaseNum, qi })} style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', minHeight: 72, position: 'relative',
                      background: isActive ? `${QQ_CATEGORY_COLORS[cat]}33` : preview.text ? '#1e293b' : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${isActive ? QQ_CATEGORY_COLORS[cat] : preview.text ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                      transition: 'all 0.15s',
                    }}>
                      {q?.image?.url && <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 14 }}>🖼</div>}
                      {preview.sub && <div style={{ fontSize: 10, fontWeight: 800, color: QQ_CATEGORY_COLORS[cat], marginBottom: 3, opacity: 0.8 }}>{preview.sub}</div>}
                      <div style={{ fontSize: 11, color: preview.text ? '#94a3b8' : '#334155', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {preview.text || <span style={{ color: '#1e3a5f', fontStyle: 'italic' }}>Leer…</span>}
                      </div>
                      {preview.answer && <div style={{ marginTop: 4, fontSize: 10, color: '#22C55E', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{preview.answer}</div>}
                    </div>
                  );
                }),
              ];
            }).flat()}
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
          />
        )}
        {!activeQ && (
          <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#334155', fontSize: 14, textAlign: 'center' }}>← Slot auswählen</div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={() => activeQ && uploadImage(activeQ.id)} />
    </div>
  );
}

// ── Question editor panel ──────────────────────────────────────────────────────
function QuestionEditor({ question: q, onChange, onUpload, onRemoveBg, uploadingFor, removingBgFor, fileInputRef }: {
  question: QQQuestion; onChange: (q: QQQuestion) => void; onUpload: () => void; onRemoveBg: () => void;
  uploadingFor: string | null; removingBgFor: string | null; fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  const img = q.image;
  const showImage = q.category !== 'CHEESE'; // Picture This always shows image; others optional

  function setImg(patch: Partial<QQQuestionImage>) {
    onChange({ ...q, image: { ...(img ?? { url: '', layout: 'fullscreen', animation: 'none' }), ...patch } });
  }

  return (
    <div style={{ width: 380, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#1e293b', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Category header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: catColor + '22', border: `1px solid ${catColor}44` }}>
        <span style={{ fontSize: 20 }}>{catLabel.emoji}</span>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, color: catColor }}>{catLabel.de} <span style={{ color: '#475569', fontWeight: 400 }}>/ {catLabel.en}</span></div>
          <div style={{ fontSize: 11, color: '#475569' }}>Phase {q.phaseIndex} · Slot {q.questionIndexInPhase + 1}</div>
        </div>
      </div>

      {/* Question text DE/EN — always shown */}
      <div>
        <label style={labelStyle}>Frage (DE)</label>
        <textarea value={q.text} onChange={e => onChange({ ...q, text: e.target.value })} style={{ ...textareaStyle, borderColor: catColor + '44' }} rows={3} placeholder="Fragetext auf Deutsch…" />
      </div>
      <div>
        <label style={labelStyle}>Frage (EN) <span style={{ color: '#334155' }}>optional</span></label>
        <textarea value={q.textEn ?? ''} onChange={e => onChange({ ...q, textEn: e.target.value })} style={textareaStyle} rows={2} placeholder="Question text in English…" />
      </div>

      {/* ── Category-specific answer fields ── */}
      <CategoryFields question={q} onChange={onChange} catColor={catColor} />

      {/* ── Image section ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 10 }}>
          🖼 Bild {q.category === 'CHEESE' ? '(Pflicht)' : '(optional)'}
        </div>

        {img?.url && (
          <div style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#0f172a', maxHeight: 160 }}>
            <img src={img.bgRemovedUrl ?? img.url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
            {img.bgRemovedUrl && <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(34,197,94,0.9)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: '#fff' }}>✓ BG entfernt</div>}
          </div>
        )}

        <button onClick={() => fileInputRef.current?.click()} disabled={!!uploadingFor} style={{ ...btnStyle('#3B82F6'), width: '100%', marginBottom: 6 }}>
          {uploadingFor === q.id ? '⏳ Lädt hoch…' : img?.url ? '🔄 Bild ersetzen' : '📤 Bild hochladen'}
        </button>

        {img?.url && (
          <>
            <button onClick={onRemoveBg} disabled={!!removingBgFor} style={{ ...btnStyle('#8B5CF6'), width: '100%', marginBottom: 10 }}>
              {removingBgFor === q.id ? '⏳ Entferne Hintergrund…' : '✂️ Hintergrund entfernen'}
            </button>

            <label style={labelStyle}>Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 10 }}>
              {(Object.keys(LAYOUT_LABELS) as QQImageLayout[]).map(l => (
                <button key={l} onClick={() => setImg({ layout: l })} style={{ padding: '5px 6px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, background: img.layout === l ? catColor + '44' : 'rgba(255,255,255,0.05)', color: img.layout === l ? catColor : '#64748b', outline: img.layout === l ? `1px solid ${catColor}66` : 'none' }}>
                  {LAYOUT_LABELS[l]}
                </button>
              ))}
            </div>

            <label style={labelStyle}>Animation</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {(Object.keys(ANIM_LABELS) as QQImageAnimation[]).map(a => (
                <button key={a} onClick={() => setImg({ animation: a })} style={{ padding: '5px 6px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, background: img.animation === a ? '#F59E0B33' : 'rgba(255,255,255,0.05)', color: img.animation === a ? '#F59E0B' : '#64748b', outline: img.animation === a ? '1px solid #F59E0B66' : 'none' }}>
                  {ANIM_LABELS[a]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Category-specific answer fields ───────────────────────────────────────────
function CategoryFields({ question: q, onChange, catColor }: { question: QQQuestion; onChange: (q: QQQuestion) => void; catColor: string }) {

  // SCHAETZCHEN ────────────────────────────────────────────────────────────────
  if (q.category === 'SCHAETZCHEN') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#94a3b8' }}>
        Teams geben eine Zahl ein. Die nächste Zahl gewinnt automatisch.
      </div>
      <div>
        <label style={labelStyle}>Zielwert (Zahl)</label>
        <input type="number" value={q.targetValue ?? ''} onChange={e => onChange({ ...q, targetValue: e.target.value === '' ? undefined : Number(e.target.value) })}
          style={{ ...inputStyle, borderColor: 'rgba(245,158,11,0.4)' }} placeholder="z.B. 1989 oder 2500000" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Einheit (DE) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.unit ?? ''} onChange={e => onChange({ ...q, unit: e.target.value })} style={inputStyle} placeholder="z.B. Meter" />
        </div>
        <div>
          <label style={labelStyle}>Unit (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.unitEn ?? ''} onChange={e => onChange({ ...q, unitEn: e.target.value })} style={inputStyle} placeholder="e.g. metres" />
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
          4 Antwortoptionen — eine ist korrekt.
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: correct === i ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: catColor + '33', border: `1px solid ${catColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: catColor, flexShrink: 0 }}>{labels[i]}</div>
              <button onClick={() => onChange({ ...q, correctOptionIndex: i, answer: opts[i], answerEn: optsEn[i] || undefined })}
                style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.1)'}`, background: correct === i ? 'rgba(34,197,94,0.15)' : 'transparent', color: correct === i ? '#22C55E' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800 }}>
                {correct === i ? '✓ Korrekt' : 'Als Antwort'}
              </button>
            </div>
            <input value={opts[i]} onChange={e => { const o = [...opts]; o[i] = e.target.value; onChange({ ...q, options: o, answer: correct === i ? e.target.value : q.answer }); }}
              style={inputStyle} placeholder={`Option ${labels[i]} (DE)…`} />
            <input value={optsEn[i] ?? ''} onChange={e => { const o = [...optsEn]; o[i] = e.target.value; onChange({ ...q, optionsEn: o, answerEn: correct === i ? e.target.value : q.answerEn }); }}
              style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder={`Option ${labels[i]} (EN, optional)…`} />
          </div>
        ))}
      </div>
    );
  }

  // ZEHN_VON_ZEHN (All In) ─────────────────────────────────────────────────────
  if (q.category === 'ZEHN_VON_ZEHN') {
    const opts = q.options ?? ['', '', ''];
    const optsEn = q.optionsEn ?? ['', '', ''];
    const correct = q.correctOptionIndex ?? 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#94a3b8' }}>
          3 Optionen (1 / 2 / 3) — Teams verteilen Punkte. Eine ist korrekt.
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: correct === i ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: catColor + '33', border: `1px solid ${catColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: catColor, flexShrink: 0 }}>{i + 1}</div>
              <button onClick={() => onChange({ ...q, correctOptionIndex: i, answer: opts[i], answerEn: optsEn[i] || undefined })}
                style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.1)'}`, background: correct === i ? 'rgba(34,197,94,0.15)' : 'transparent', color: correct === i ? '#22C55E' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800 }}>
                {correct === i ? '✓ Korrekt' : 'Als Antwort'}
              </button>
            </div>
            <input value={opts[i]} onChange={e => { const o = [...opts]; o[i] = e.target.value; onChange({ ...q, options: o, answer: correct === i ? e.target.value : q.answer }); }}
              style={inputStyle} placeholder={`Option ${i + 1} (DE)…`} />
            <input value={optsEn[i] ?? ''} onChange={e => { const o = [...optsEn]; o[i] = e.target.value; onChange({ ...q, optionsEn: o, answerEn: correct === i ? e.target.value : q.answerEn }); }}
              style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder={`Option ${i + 1} (EN, optional)…`} />
          </div>
        ))}
      </div>
    );
  }

  // CHEESE / Picture This ──────────────────────────────────────────────────────
  if (q.category === 'CHEESE') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
        Ein Bild wird gezeigt. Teams tippen die Antwort als Freitext. Bild unten hochladen.
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
                  else bt = { kind: 'map', lat: 53.55, lng: 10.0, targetLabel: '' };
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
    const correctOrder = bt.correctOrder ?? items.map((_, i) => i);
    const btCriteria = bt.criteria;
    const btCriteriaEn = bt.criteriaEn;

    function patchOrder(newItems: string[], newOrder: number[], newItemsEn?: string[], criteria?: string, criteriaEn?: string) {
      onChange({ ...q, bunteTuete: { kind: 'order' as const, items: newItems, correctOrder: newOrder, itemsEn: newItemsEn ?? itemsEn, criteria: criteria ?? btCriteria, criteriaEn: criteriaEn ?? btCriteriaEn } });
    }
    function addItem() { patchOrder([...items, ''], [...correctOrder, items.length]); }
    function removeItem(i: number) {
      patchOrder(items.filter((_, idx) => idx !== i), correctOrder.filter(x => x !== i).map(x => x > i ? x - 1 : x));
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

  // MAP / Pin It ───────────────────────────────────────────────────────────────
  if (bt.kind === 'map') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#94a3b8' }}>
        📍 Teams pinnen einen Ort auf der Weltkarte. Nähster Pin gewinnt.
      </div>
      <div>
        <label style={labelStyle}>Ort-Name (für Auflösung)</label>
        <input value={bt.targetLabel ?? ''} onChange={e => onChange({ ...q, bunteTuete: { ...bt, targetLabel: e.target.value }, answer: e.target.value })}
          style={inputStyle} placeholder="z.B. Jungfernstieg, Hamburg" />
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
function DraftListScreen({ drafts, onOpen, onCreate, onDelete }: { drafts: QQDraft[]; onOpen: (d: QQDraft) => void; onCreate: (phases: 3 | 4) => void; onDelete: (id: string) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif", padding: 40, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Quarter Quiz</div>
        <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 20 }}>Fragensätze</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onCreate(3)} style={btnStyle('#22C55E')}>+ 3 Runden (15 Fragen)</button>
          <button onClick={() => onCreate(4)} style={btnStyle('#3B82F6')}>+ 4 Runden (20 Fragen)</button>
        </div>
      </div>
      {drafts.length === 0 ? (
        <div style={{ color: '#334155', fontSize: 16 }}>Noch keine Fragensätze — erstelle deinen ersten!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drafts.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#1e293b', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{d.phases} Runden · {d.questions.length} Fragen · {new Date(d.updatedAt).toLocaleDateString('de-DE')}</div>
              </div>
              <button onClick={() => onOpen(d)} style={btnStyle('#3B82F6')}>Bearbeiten</button>
              <button onClick={() => onDelete(d.id)} style={btnStyle('#EF4444', true)}>✕</button>
            </div>
          ))}
        </div>
      )}
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
