import { useState, useEffect, useRef } from 'react';
import {
  QQQuestion, QQCategory, QQLanguage, QQDraft,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQImageLayout, QQImageAnimation, QQQuestionImage,
} from '../../../shared/quarterQuizTypes';

// ── Category order ─────────────────────────────────────────────────────────────
const CATEGORIES: QQCategory[] = ['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'];

const LAYOUT_LABELS: Record<QQImageLayout, string> = {
  'none':         'Kein Bild',
  'fullscreen':   'Vollbild',
  'window-left':  'Fenster links',
  'window-right': 'Fenster rechts',
  'cutout':       'Freisteller',
};
const ANIM_LABELS: Record<QQImageAnimation, string> = {
  'none':     'Keine',
  'float':    'Schweben',
  'zoom-in':  'Zoom',
  'reveal':   'Aufdecken',
  'slide-in': 'Einfahren',
};

function makeEmptyQuestion(phaseIndex: number, questionIndexInPhase: number, category: QQCategory, draftId: string): QQQuestion {
  return {
    id: `${draftId}-p${phaseIndex}-q${questionIndexInPhase}`,
    category,
    phaseIndex: phaseIndex as any,
    questionIndexInPhase,
    text: '',
    textEn: '',
    answer: '',
    answerEn: '',
  };
}

function makeEmptyDraft(phases: 3 | 4): QQDraft {
  const id = `qq-draft-${Date.now().toString(36)}`;
  const questions: QQQuestion[] = [];
  for (let p = 1; p <= phases; p++) {
    CATEGORIES.forEach((cat, qi) => {
      questions.push(makeEmptyQuestion(p, qi, cat, id));
    });
  }
  return {
    id,
    title: 'Neuer Fragensatz',
    phases,
    language: 'both',
    questions,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
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
    fetch('/api/qq/drafts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDrafts(data); })
      .catch(() => {});
  }, []);

  function getQuestion(draft: QQDraft, phase: number, qi: number): QQQuestion | undefined {
    return draft.questions.find(q => q.phaseIndex === phase && q.questionIndexInPhase === qi);
  }

  function updateQuestion(draft: QQDraft, updated: QQQuestion): QQDraft {
    return {
      ...draft,
      questions: draft.questions.map(q =>
        q.phaseIndex === updated.phaseIndex && q.questionIndexInPhase === updated.questionIndexInPhase
          ? updated : q
      ),
      updatedAt: Date.now(),
    };
  }

  async function createDraft(phases: 3 | 4) {
    const draft = makeEmptyDraft(phases);
    const res = await fetch('/api/qq/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const saved = await res.json();
      setDrafts(prev => [saved, ...prev]);
      setActiveDraft(saved);
    }
  }

  async function saveDraft(draft: QQDraft) {
    setSaving(true);
    try {
      const res = await fetch(`/api/qq/drafts/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const saved = await res.json();
        setDrafts(prev => prev.map(d => d.id === saved.id ? saved : d));
        setActiveDraft(saved);
      }
    } finally {
      setSaving(false);
    }
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
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const q = activeDraft.questions.find(q => q.id === questionId);
      if (!q) return;
      const updated: QQQuestion = {
        ...q,
        image: {
          url: data.imageUrl,
          layout: q.image?.layout ?? 'fullscreen',
          animation: q.image?.animation ?? 'none',
          bgRemovedUrl: undefined,
        },
      };
      const newDraft = updateQuestion(activeDraft, updated);
      setActiveDraft(newDraft);
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removeBg(question: QQQuestion) {
    if (!activeDraft || !question.image?.url) return;
    setRemovingBgFor(question.id);
    try {
      const res = await fetch('/api/qq/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: question.image.url }),
      });
      if (!res.ok) throw new Error('BG removal failed');
      const data = await res.json();
      const updated: QQQuestion = {
        ...question,
        image: { ...question.image!, bgRemovedUrl: data.bgRemovedUrl },
      };
      const newDraft = updateQuestion(activeDraft, updated);
      setActiveDraft(newDraft);
    } catch (e) {
      alert('Hintergrundentfernung fehlgeschlagen');
    } finally {
      setRemovingBgFor(null);
    }
  }

  const activeQ = activeDraft && activeSlot
    ? getQuestion(activeDraft, activeSlot.phase, activeSlot.qi)
    : null;

  if (!activeDraft) {
    return <DraftListScreen drafts={drafts} onOpen={setActiveDraft} onCreate={createDraft} onDelete={deleteDraft} />;
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px', background: '#1e293b',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <button onClick={() => setActiveDraft(null)} style={btnStyle('#475569')}>← Zurück</button>
        <input
          value={activeDraft.title}
          onChange={e => setActiveDraft({ ...activeDraft, title: e.target.value, updatedAt: Date.now() })}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '6px 14px', color: '#fff', fontWeight: 800, fontSize: 16,
            fontFamily: 'inherit', minWidth: 220,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Runden:</span>
          {([3, 4] as const).map(n => (
            <button key={n} onClick={() => {
              if (n === activeDraft.phases) return;
              if (!confirm(`Zu ${n} Runden wechseln? Fragen der ${n === 4 ? 'neuen' : 'letzten'} Runde werden${n === 4 ? ' leer erstellt' : ' gelöscht'}.`)) return;
              const newDraft: QQDraft = { ...activeDraft, phases: n, questions: makeEmptyDraft(n).questions.map((eq, i) => activeDraft.questions[i] ?? eq), updatedAt: Date.now() };
              setActiveDraft(newDraft);
            }} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 13,
              background: activeDraft.phases === n ? '#3B82F6' : 'rgba(255,255,255,0.07)',
              color: activeDraft.phases === n ? '#fff' : '#94a3b8',
            }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Sprache:</span>
          <select
            value={activeDraft.language}
            onChange={e => setActiveDraft({ ...activeDraft, language: e.target.value as QQLanguage })}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 8px', color: '#fff', fontFamily: 'inherit', fontSize: 13 }}
          >
            <option value="both">DE + EN</option>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => saveDraft(activeDraft)} style={btnStyle('#22C55E')} disabled={saving}>
            {saving ? '…' : '💾 Speichern'}
          </button>
        </div>
      </div>

      {/* Body: grid + editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Question grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${CATEGORIES.length}, 1fr)`, gap: 6, minWidth: 700 }}>
            {/* Header row */}
            <div />
            {CATEGORIES.map(cat => (
              <div key={cat} style={{
                padding: '8px 6px', borderRadius: 8, textAlign: 'center',
                background: QQ_CATEGORY_COLORS[cat] + '22',
                border: `1px solid ${QQ_CATEGORY_COLORS[cat]}44`,
                fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: QQ_CATEGORY_COLORS[cat],
              }}>
                {QQ_CATEGORY_LABELS[cat].emoji} {QQ_CATEGORY_LABELS[cat].de}
              </div>
            ))}

            {/* Phase rows */}
            {Array.from({ length: activeDraft.phases }, (_, pi) => {
              const phaseNum = pi + 1;
              return [
                <div key={`label-${phaseNum}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 900, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  Ph {phaseNum}
                </div>,
                ...CATEGORIES.map((cat, qi) => {
                  const q = getQuestion(activeDraft, phaseNum, qi);
                  const isActive = activeSlot?.phase === phaseNum && activeSlot?.qi === qi;
                  const hasText = Boolean(q?.text);
                  const hasImage = Boolean(q?.image?.url);
                  return (
                    <div
                      key={`${phaseNum}-${qi}`}
                      onClick={() => setActiveSlot({ phase: phaseNum, qi })}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: isActive
                          ? `${QQ_CATEGORY_COLORS[cat]}33`
                          : hasText ? '#1e293b' : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${isActive ? QQ_CATEGORY_COLORS[cat] : hasText ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                        transition: 'all 0.15s',
                        minHeight: 72,
                        position: 'relative',
                      }}
                    >
                      {hasImage && (
                        <div style={{
                          position: 'absolute', top: 6, right: 8,
                          fontSize: 14, lineHeight: 1,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                        }}>🖼</div>
                      )}
                      <div style={{
                        fontSize: 11, color: hasText ? '#94a3b8' : '#334155',
                        lineHeight: 1.4, overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                      }}>
                        {q?.text || <span style={{ color: '#1e3a5f', fontStyle: 'italic' }}>Leer…</span>}
                      </div>
                      {q?.answer && (
                        <div style={{ marginTop: 4, fontSize: 10, color: '#22C55E', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          ✓ {q.answer}
                        </div>
                      )}
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
            onChange={updated => {
              const newDraft = updateQuestion(activeDraft, updated);
              setActiveDraft(newDraft);
            }}
          />
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={() => activeQ && uploadImage(activeQ.id)}
      />
    </div>
  );
}

// ── Question editor panel ──────────────────────────────────────────────────────
function QuestionEditor({
  question: q, onChange, onUpload, onRemoveBg, uploadingFor, removingBgFor, fileInputRef,
}: {
  question: QQQuestion;
  onChange: (q: QQQuestion) => void;
  onUpload: () => void;
  onRemoveBg: () => void;
  uploadingFor: string | null;
  removingBgFor: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  const img = q.image;

  function setImg(patch: Partial<QQQuestionImage>) {
    onChange({ ...q, image: { ...(img ?? { url: '', layout: 'fullscreen', animation: 'none' }), ...patch } });
  }

  return (
    <div style={{
      width: 360, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)',
      background: '#1e293b', overflow: 'auto', padding: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Category header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderRadius: 10, background: catColor + '22', border: `1px solid ${catColor}44`,
      }}>
        <span style={{ fontSize: 18 }}>{catLabel.emoji}</span>
        <div>
          <div style={{ fontWeight: 900, fontSize: 13, color: catColor }}>{catLabel.de}</div>
          <div style={{ fontSize: 11, color: '#475569' }}>Phase {q.phaseIndex} · Slot {q.questionIndexInPhase + 1}</div>
        </div>
      </div>

      {/* Text DE */}
      <div>
        <label style={labelStyle}>Frage (DE)</label>
        <textarea
          value={q.text}
          onChange={e => onChange({ ...q, text: e.target.value })}
          style={{ ...textareaStyle, borderColor: catColor + '44' }}
          rows={3}
          placeholder="Fragetext auf Deutsch…"
        />
      </div>

      {/* Text EN */}
      <div>
        <label style={labelStyle}>Frage (EN) <span style={{ color: '#475569' }}>optional</span></label>
        <textarea
          value={q.textEn ?? ''}
          onChange={e => onChange({ ...q, textEn: e.target.value })}
          style={textareaStyle}
          rows={2}
          placeholder="Question text in English…"
        />
      </div>

      {/* Answer DE */}
      <div>
        <label style={labelStyle}>Antwort (DE)</label>
        <input
          value={q.answer}
          onChange={e => onChange({ ...q, answer: e.target.value })}
          style={{ ...inputStyle, borderColor: 'rgba(34,197,94,0.4)' }}
          placeholder="Korrekte Antwort…"
        />
      </div>

      {/* Answer EN */}
      <div>
        <label style={labelStyle}>Antwort (EN) <span style={{ color: '#475569' }}>optional</span></label>
        <input
          value={q.answerEn ?? ''}
          onChange={e => onChange({ ...q, answerEn: e.target.value })}
          style={inputStyle}
          placeholder="Correct answer in English…"
        />
      </div>

      {/* Target value (Schätzchen only) */}
      {q.category === 'SCHAETZCHEN' && (
        <div>
          <label style={labelStyle}>🍯 Zielwert <span style={{ color: '#EAB308' }}>Schätzchen</span></label>
          <input
            type="number"
            value={q.targetValue ?? ''}
            onChange={e => onChange({ ...q, targetValue: e.target.value === '' ? undefined : Number(e.target.value) })}
            style={{ ...inputStyle, borderColor: 'rgba(234,179,8,0.4)' }}
            placeholder="z.B. 42"
          />
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
            Team mit nächster Antwort gewinnt automatisch
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 12 }}>
          🖼 Bild-Einstellungen
        </div>

        {/* Image preview */}
        {img?.url && (
          <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#0f172a' }}>
            <img
              src={img.bgRemovedUrl ?? img.url}
              alt=""
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            />
            {img.bgRemovedUrl && (
              <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(34,197,94,0.9)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                ✓ Hintergrund entfernt
              </div>
            )}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploadingFor}
          style={{ ...btnStyle('#3B82F6'), width: '100%', marginBottom: 8 }}
        >
          {uploadingFor === q.id ? '⏳ Lädt hoch…' : img?.url ? '🔄 Bild ersetzen' : '📤 Bild hochladen'}
        </button>

        {/* BG remove button */}
        {img?.url && (
          <button
            onClick={onRemoveBg}
            disabled={!!removingBgFor}
            style={{ ...btnStyle('#8B5CF6'), width: '100%', marginBottom: 12 }}
          >
            {removingBgFor === q.id ? '⏳ Entferne Hintergrund…' : '✂️ Hintergrund entfernen'}
          </button>
        )}

        {/* Layout picker */}
        {img?.url && (
          <>
            <label style={labelStyle}>Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {(Object.keys(LAYOUT_LABELS) as QQImageLayout[]).map(l => (
                <button key={l} onClick={() => setImg({ layout: l })} style={{
                  padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 800,
                  background: img.layout === l ? catColor + '44' : 'rgba(255,255,255,0.05)',
                  color: img.layout === l ? catColor : '#64748b',
                  outline: img.layout === l ? `1px solid ${catColor}66` : 'none',
                }}>
                  {LAYOUT_LABELS[l]}
                </button>
              ))}
            </div>

            {/* Animation picker */}
            <label style={labelStyle}>Animation</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(Object.keys(ANIM_LABELS) as QQImageAnimation[]).map(a => (
                <button key={a} onClick={() => setImg({ animation: a })} style={{
                  padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 800,
                  background: img.animation === a ? '#F59E0B33' : 'rgba(255,255,255,0.05)',
                  color: img.animation === a ? '#F59E0B' : '#64748b',
                  outline: img.animation === a ? '1px solid #F59E0B66' : 'none',
                }}>
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

// ── Draft list screen ─────────────────────────────────────────────────────────
function DraftListScreen({ drafts, onOpen, onCreate, onDelete }: {
  drafts: QQDraft[];
  onOpen: (d: QQDraft) => void;
  onCreate: (phases: 3 | 4) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: 40, maxWidth: 960, margin: '0 auto',
    }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Quarter Quiz
        </div>
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
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              background: '#1e293b', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  {d.phases} Runden · {d.questions.length} Fragen
                  · {new Date(d.updatedAt).toLocaleDateString('de-DE')}
                </div>
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

// ── Styles ─────────────────────────────────────────────────────────────────────
function btnStyle(color: string, outline = false): React.CSSProperties {
  return {
    padding: '7px 16px', borderRadius: 8, border: outline ? `1px solid ${color}44` : 'none',
    cursor: 'pointer', fontWeight: 800, fontSize: 13,
    background: outline ? 'transparent' : color,
    color: outline ? color : '#fff',
    fontFamily: 'inherit',
  };
}
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 };
