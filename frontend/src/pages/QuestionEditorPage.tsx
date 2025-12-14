import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnyQuestion, MixedMechanicId, QuizCategory } from '@shared/quizTypes';
import {
  fetchQuestions,
  setQuestionMeta,
  uploadQuestionImage,
  deleteQuestionImage,
  setQuestionLayout,
  resetQuestionLayout,
  createQuestion
} from '../api';
import { categoryColors } from '../categoryColors';
import { categoryIcons } from '../categoryAssets';

const catList: QuizCategory[] = ['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'GemischteTuete'];
const catLabel: Record<QuizCategory, string> = {
  Schaetzchen: 'Schaetzchen',
  'Mu-Cho': 'Mu-Cho',
  Stimmts: "Stimmt's?",
  Cheese: 'Cheese',
  GemischteTuete: 'Gemischte Tuete'
};

const badge = (color: string, inverted?: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: inverted ? 'rgba(255,255,255,0.08)' : `${color}22`,
  border: `1px solid ${inverted ? 'rgba(255,255,255,0.25)' : `${color}55`}`,
  color: inverted ? '#e2e8f0' : '#0d0f14'
});

const QuestionEditorPage: React.FC = () => {
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<QuizCategory | 'ALL'>('ALL');
  const [filterCatalog, setFilterCatalog] = useState<string>('ALL');
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [layoutPreview, setLayoutPreview] = useState<
    Record<string, { imageOffsetX: number; imageOffsetY: number; logoOffsetX: number; logoOffsetY: number }>
  >({});
  const [filterCustomOnly, setFilterCustomOnly] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [catalogDrafts, setCatalogDrafts] = useState<Record<string, string>>({});
  const [mediaSlotsDrafts, setMediaSlotsDrafts] = useState<Record<string, number>>({});

  const load = () => {
    setLoading(true);
    fetchQuestions()
      .then((res) => setQuestions(res.questions))
      .catch(() => setError('Fragen konnten nicht geladen werden'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('focus');
    if (focus) setFocusId(focus);
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return questions
      .filter((q: any) => (filterCat === 'ALL' ? true : q.category === filterCat))
      .filter((q: any) => (filterCatalog === 'ALL' ? true : (q.catalogId || 'default') === filterCatalog))
      .filter((q: any) => (filterCustomOnly ? q.isCustom : true))
      .filter((q) =>
        term
          ? q.question.toLowerCase().includes(term) || q.questionEn?.toLowerCase().includes(term)
          : true
      )
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [questions, filterCat, search, filterCatalog, filterCustomOnly]);

  const catalogs = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => set.add((q as any).catalogId || 'default'));
    return Array.from(set).sort();
  }, [questions]);

  const totalCount = questions.length;
  const filteredCount = filtered.length;
  const customCount = questions.filter((q: any) => q.isCustom).length;

  const handleMixedChange = async (id: string, value: MixedMechanicId | 'none') => {
    setStatus(null);
    try {
      await setQuestionMeta(id, { mixedMechanic: value === 'none' ? null : value });
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, mixedMechanic: value === 'none' ? undefined : value } : q))
      );
      setStatus('Mechanik gespeichert');
    } catch {
      setStatus('Fehler beim Speichern der Mechanik');
    }
  };

  const handleAnswerSave = async (id: string, value: string) => {
    setStatus(null);
    try {
      await setQuestionMeta(id, { answer: value });
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answer: value } : q)));
      setStatus('Loesung gespeichert');
    } catch {
      setStatus('Loesung konnte nicht gespeichert werden');
    }
  };

  const triggerUpload = (questionId: string) => {
    setUploadTarget(questionId);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    setStatus('Upload lÃ¤uft ...');
    try {
      await uploadQuestionImage(uploadTarget, file);
      setStatus('Bild gespeichert');
      load();
    } catch {
      setStatus('Upload fehlgeschlagen');
    } finally {
      e.target.value = '';
      setUploadTarget(null);
    }
  };

  const handleRemoveImage = async (questionId: string) => {
    setStatus('Bild entfernen ...');
    try {
      await deleteQuestionImage(questionId);
      load();
      setStatus('Bild entfernt');
    } catch {
      setStatus('Bild konnte nicht entfernt werden');
    }
  };

  const handleLayoutChange = async (
    questionId: string,
    key: 'imageOffsetX' | 'imageOffsetY' | 'logoOffsetX' | 'logoOffsetY',
    value: number
  ) => {
    setLayoutPreview((prev) => ({
      ...prev,
      [questionId]: {
        imageOffsetX: prev[questionId]?.imageOffsetX ?? 0,
        imageOffsetY: prev[questionId]?.imageOffsetY ?? 0,
        logoOffsetX: prev[questionId]?.logoOffsetX ?? 0,
        logoOffsetY: prev[questionId]?.logoOffsetY ?? 0,
        [key]: value
      }
    }));
    try {
      await setQuestionLayout(questionId, { [key]: value });
      setStatus('Layout gespeichert');
    } catch {
      setStatus('Layout konnte nicht gespeichert werden');
    }
  };

  const handleResetLayout = async (questionId: string) => {
    try {
      await resetQuestionLayout(questionId);
      setLayoutPreview((prev) => ({ ...prev, [questionId]: { imageOffsetX: 0, imageOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0 } }));
      setStatus('Layout zurÃ¼ckgesetzt');
    } catch {
      setStatus('Layout-Reset fehlgeschlagen');
    }
  };

  const handleDuplicate = async (q: AnyQuestion) => {
    try {
      const newId = `${q.id}-copy-${Date.now()}`;
      const payload: Partial<AnyQuestion> = { ...q, id: newId, question: `${q.question} (Copy)` };
      delete (payload as any).usedIn;
      delete (payload as any).lastUsedAt;
      delete (payload as any).createdAt;
      const res = await createQuestion(payload);
      setQuestions((prev) => [...prev, res.question]);
      setStatus('Frage dupliziert');
    } catch {
      setStatus('Duplizieren fehlgeschlagen');
    }
  };

  const handleExportCustom = async () => {
    try {
      const res = await fetch('/api/questions/custom/export');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.questions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'custom-questions.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatus('Export fehlgeschlagen');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), #0d0f14',
        color: '#e2e8f0',
        padding: '24px'
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={badge('#7c8cff', true)}>Question Editor</div>
          <h2 style={{ margin: '10px 0 4px' }}>Fragen verwalten</h2>
          <div style={{ color: '#94a3b8' }}>
            Mixed-Mechanik fuer Gemischte Tuete setzen und Bilder fuer Cheese/Bildfragen verwalten.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ ...badge('#7c8cff', true) }}>Gesamt: {totalCount}</span>
          <span style={{ ...badge('#22c55e', true) }}>Gefiltert: {filteredCount}</span>
          <span style={{ ...badge('#fbbf24', true) }}>Custom: {customCount}</span>
        </div>
        <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Suche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 240,
                padding: 10,
                borderRadius: 10,
                border: '1px solid #2d3748',
                background: '#0f172a',
                color: '#e2e8f0'
              }}
            />
            <button
              onClick={load}
              style={{
                ...badge('#7c8cff'),
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
            <button
              onClick={handleExportCustom}
              style={{ ...badge('#ffffff', true), cursor: 'pointer' }}
            >
              Custom Export
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            {(['ALL', ...catList] as (QuizCategory | 'ALL')[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: filterCat === cat ? '1px solid #7c8cff' : '1px solid rgba(255,255,255,0.16)',
                  background: filterCat === cat ? 'rgba(124,140,255,0.12)' : 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{cat === 'ALL' ? 'Alle Kategorien' : catLabel[cat]}</span>
                {filterCat === cat && <span style={{ fontSize: 12, color: '#7c8cff' }}>aktiv</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            <button
              onClick={() => setFilterCatalog('ALL')}
              style={{
                padding: 12,
                borderRadius: 12,
                border: filterCatalog === 'ALL' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.16)',
                background: filterCatalog === 'ALL' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                color: '#e2e8f0',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              Alle Kataloge
            </button>
            {catalogs.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCatalog(c)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: filterCatalog === c ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.16)',
                  background: filterCatalog === c ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setFilterCustomOnly((v) => !v)}
              style={{
                ...badge(filterCustomOnly ? '#fbbf24' : '#ffffff', true),
                border: filterCustomOnly ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer'
              }}
            >
              Nur Custom
            </button>
            {bulkSelection.size > 0 && (
              <>
                <input
                  placeholder="Katalog fuer Auswahl"
                  value={catalogDrafts['__bulk__'] ?? ''}
                  onChange={(e) =>
                    setCatalogDrafts((prev) => ({
                      ...prev,
                      ['__bulk__']: e.target.value
                    }))
                  }
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid #2d3748',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    minWidth: 200
                  }}
                />
                <button
                  style={{ ...badge('#22c55e', true), cursor: 'pointer' }}
                  onClick={async () => {
                    const catalogId = (catalogDrafts['__bulk__'] ?? '').trim() || 'default';
                    try {
                      await Promise.all(
                        Array.from(bulkSelection).map((id) => setQuestionMeta(id, { catalogId }))
                      );
                      setStatus('Katalog fuer Auswahl gespeichert');
                      setQuestions((prev) =>
                        prev.map((q) =>
                          bulkSelection.has(q.id) ? ({ ...(q as any), catalogId } as AnyQuestion) : q
                        )
                      );
                      setBulkSelection(new Set());
                    } catch {
                      setStatus('Katalog konnte nicht gespeichert werden');
                    }
                  }}
                >
                  Katalog auf Auswahl setzen ({bulkSelection.size})
                </button>
                <button
                  style={{ ...badge('#ffffff', true), cursor: 'pointer' }}
                  onClick={() => setBulkSelection(new Set())}
                >
                  Auswahl leeren
                </button>
              </>
            )}
          </div>
        </div>
{status && <div style={{ marginBottom: 10, color: '#7c8cff' }}>{status}</div>}
        {loading && <div>Loading ...</div>}
        {error && <div style={{ color: '#f87171' }}>{error}</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((q) => {
            const color = categoryColors[q.category] ?? '#f3c367';
            const icon = categoryIcons[q.category];
            const isGemTuete = q.category === 'GemischteTuete';
            const hasImage = Boolean((q as any).imageUrl || q.media?.url);
            const layout = (q as any).layout || layoutPreview[q.id] || {};
            return (
              <div
                key={q.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${color}44`,
                  background: q.id === focusId ? 'rgba(124,140,255,0.08)' : 'rgba(255,255,255,0.03)',
                  boxShadow: '0 14px 28px rgba(0,0,0,0.28)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {icon && (
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img src={icon} alt={q.category} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                      </div>
                    )}
                    <span style={badge(color)}>{catLabel[q.category]}</span>
                    <span style={badge('#ffffff', true)}>{q.mechanic}</span>
                    <span style={badge('#7c8cff', true)}>Katalog: {(q as any).catalogId || 'default'}</span>
                    {isGemTuete && q.mixedMechanic && (
                      <span style={badge(color, true)}>Mechanik: {q.mixedMechanic}</span>
                    )}
                    {q.usedIn && q.usedIn.length > 0 && (
                      <span style={badge('#ffffff', true)}>Genutzt in: {q.usedIn.join(', ')}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>ID: {q.id}</div>
                </div>
                <div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>{q.question}</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>Loesung:</label>
                  <input
                    type="text"
                    value={answerDrafts[q.id] ?? (q as any).answer ?? ''}
                    onChange={(e) =>
                      setAnswerDrafts((prev) => ({
                        ...prev,
                        [q.id]: e.target.value
                      }))
                    }
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #2d3748',
                      background: '#0f141d',
                      color: '#f8fafc',
                      minWidth: 220
                    }}
                  />
                  <button
                    onClick={() => handleAnswerSave(q.id, answerDrafts[q.id] ?? ((q as any).answer ?? ''))}
                    style={{ ...badge('#7c8cff'), cursor: 'pointer' }}
                  >
                    Loesung speichern
                  </button>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>Katalog:</label>
                  <input
                    type="text"
                    value={catalogDrafts[q.id] ?? (q as any).catalogId ?? 'default'}
                    onChange={(e) =>
                      setCatalogDrafts((prev) => ({
                        ...prev,
                        [q.id]: e.target.value
                      }))
                    }
                    style={{
                      minWidth: 160,
                      padding: 8,
                      borderRadius: 8,
                      border: '1px solid #2d3748',
                      background: '#0f172a',
                      color: '#e2e8f0'
                    }}
                  />
                  <button
                    style={{ ...badge('#22c55e', true), cursor: 'pointer' }}
                    onClick={async () => {
                      const catalogId = (catalogDrafts[q.id] ?? (q as any).catalogId ?? 'default').trim() || 'default';
                      try {
                        await setQuestionMeta(q.id, { catalogId });
                        setStatus('Katalog gespeichert');
                        setQuestions((prev) => prev.map((qq) => (qq.id === q.id ? { ...(qq as any), catalogId } : qq)));
                      } catch {
                        setStatus('Katalog konnte nicht gespeichert werden');
                      }
                    }}
                  >
                    Katalog speichern
                  </button>
                  {(q as any).answer && (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Aktuell: {(q as any).answer}</span>
                  )}
                  {q.mediaSlots && <span style={{ fontSize: 12, color: '#94a3b8' }}>Media-Slots: {q.mediaSlots.count}</span>}
                </div>
                {hasImage && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>Bild:</div>
                    <img
                      src={(q as any).imageUrl || q.media?.url}
                      alt="Preview"
                      style={{
                        width: 96,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: `1px solid ${color}55`,
                        transform: `translate(${layout.imageOffsetX ?? 0}px, ${layout.imageOffsetY ?? 0}px)`
                      }}
                    />
                    <button
                      onClick={() => handleRemoveImage(q.id)}
                      style={{ ...badge('#ffffff', true), cursor: 'pointer' }}
                    >
                      Bild entfernen
                    </button>
                  </div>
                )}
                <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {isGemTuete && (<>
                      <select
                        value={(q.mixedMechanic as string) ?? 'none'}
                        onChange={(e) => handleMixedChange(q.id, e.target.value as MixedMechanicId | 'none')}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: '1px solid #2d3748',
                          background: '#111827',
                          color: '#f8fafc',
                          minWidth: 200
                        }}
                      >
                        <option value="none">Mechanik waehlen</option>
                        <option value="sortieren">Sortieren / Reihenfolge</option>
                        <option value="praezise-antwort">Praezise Antwort</option>
                        <option value="wer-bietet-mehr">Wer bietet mehr?</option>
                        <option value="eine-falsch">Eine ist falsch</option>
                        <option value="three-clue-race">Drei Hinweise</option>
                        <option value="vier-woerter-eins">Vier Woerter - eins</option>
                      </select>
                      <label style={{ fontSize: 12, color: '#cbd5e1' }}>Media-Slots (1-6):</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={mediaSlotsDrafts[q.id] ?? q.mediaSlots?.count ?? 0}
                        onChange={(e) =>
                          setMediaSlotsDrafts((prev) => ({
                            ...prev,
                            [q.id]: Number(e.target.value) || 0
                          }))
                        }
                        style={{
                          width: 80,
                          padding: 8,
                          borderRadius: 8,
                          border: '1px solid #2d3748',
                          background: '#0f172a',
                          color: '#e2e8f0'
                        }}
                      />
                      <button
                        style={{ ...badge('#22c55e', true), cursor: 'pointer' }}
                        onClick={async () => {
                          const count = mediaSlotsDrafts[q.id] ?? q.mediaSlots?.count ?? 0;
                          try {
                            await setQuestionMeta(q.id, { mediaSlots: { count } });
                            setStatus('Media-Slots gespeichert');
                            setQuestions((prev) =>
                              prev.map((qq) =>
                                qq.id === q.id ? ({ ...(qq as any), mediaSlots: { count } } as AnyQuestion) : qq
                              )
                            );
                          } catch {
                            setStatus('Media-Slots konnten nicht gespeichert werden');
                          }
                        }}
                      >
                        Slots speichern
                      </button>
                    </>)}
                  <button
                    onClick={() => triggerUpload(q.id)}
                    style={{ ...badge(color), cursor: 'pointer' }}
                  >
                    Bild hochladen/ersetzen
                  </button>
                  <a
                    href={`/creator-wizard?add=${q.id}`}
                    style={{ ...badge('#ffffff', true), cursor: 'pointer', textDecoration: 'none' }}
                  >
                    Im Wizard Ã¶ffnen
                  </a>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>Bild-Offset (X/Y)</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={layout.imageOffsetX ?? 0}
                        onChange={(e) => handleLayoutChange(q.id, 'imageOffsetX', Number(e.target.value))}
                      />
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={layout.imageOffsetY ?? 0}
                        onChange={(e) => handleLayoutChange(q.id, 'imageOffsetY', Number(e.target.value))}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>Logo-Offset (X/Y)</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={layout.logoOffsetX ?? 0}
                        onChange={(e) => handleLayoutChange(q.id, 'logoOffsetX', Number(e.target.value))}
                      />
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={layout.logoOffsetY ?? 0}
                        onChange={(e) => handleLayoutChange(q.id, 'logoOffsetY', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && <div style={{ color: '#94a3b8' }}>Keine Fragen gefunden.</div>}
        </div>
      </div>
    </div>
  );
};

export default QuestionEditorPage;
