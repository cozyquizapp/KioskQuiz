import React, { useEffect, useMemo, useState } from 'react';
import { AnyQuestion, MixedMechanicId, QuizCategory } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryIcons } from '../categoryAssets';
import { theme } from '../theme';
import {
  createCustomQuiz,
  fetchQuestions,
  fetchQuizzes,
  deleteQuiz,
  createQuestion,
  uploadQuestionImage,
  deleteQuestionImage,
  setQuestionLayout
} from '../api';

type Step = 'base' | 'categories' | 'pool' | 'order' | 'review';

const steps: { key: Step; label: string }[] = [
  { key: 'base', label: 'Grundlage' },
  { key: 'categories', label: 'Kategorien' },
  { key: 'pool', label: 'Fragen wählen' },
  { key: 'order', label: 'Reihenfolge' },
  { key: 'review', label: 'Review' }
];

const catList: QuizCategory[] = ['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'GemischteTuete'];
const catLabel: Record<QuizCategory, string> = {
  Schaetzchen: 'Schätzchen',
  'Mu-Cho': 'Mu-Cho',
  Stimmts: "Stimmt's?",
  Cheese: 'Cheese',
  GemischteTuete: 'Gemischte Tüte'
};

const mixedMechanics: { value: MixedMechanicId; label: string; hint: string }[] = [
  { value: 'sortieren', label: 'Sortieren (Nord/Süd/Chrono)', hint: 'Ordne Reihenfolgen zu' },
  { value: 'praezise-antwort', label: 'Präzise Antwort', hint: 'Wer am nächsten dran ist' },
  { value: 'wer-bietet-mehr', label: 'Wer bietet mehr?', hint: 'Bieten, dann liefern' },
  { value: 'eine-ist-falsch', label: '8 Aussagen – eine falsch', hint: 'Finde die falsche' },
  { value: 'three-clue-race', label: 'Three Clue Race', hint: 'Frühes Raten = mehr Risiko' },
  { value: 'vier-woerter', label: '4 Wörter – ein Ursprung', hint: 'Gemeinsamen Begriff finden' }
];

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

const pill = (color: string, inverted?: boolean): React.CSSProperties => ({
  ...badge,
  background: inverted ? 'rgba(255,255,255,0.15)' : `${color}22`,
  border: `1px solid ${inverted ? 'rgba(255,255,255,0.35)' : `${color}55`}`,
  color: inverted ? 'var(--text)' : '#0d0f14',
  boxShadow: inverted ? '0 8px 18px rgba(0,0,0,0.25)' : `0 8px 18px ${color}33`
});

const card: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(15,18,28,0.92), rgba(16,18,28,0.78))',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 18,
  padding: 16,
  boxShadow: '0 12px 32px rgba(0,0,0,0.28)'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0f141d',
  color: '#f8fafc'
};

type CsvPreviewRow = { line: number; raw: string; id?: string; category?: string; mechanic?: string; valid: boolean; reason?: string };

const CreatorWizardPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<Step>('base');
  const [quizName, setQuizName] = useState('Cozy Bingo Quiz');
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [defaultTimer, setDefaultTimer] = useState(30);
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<QuizCategory | 'ALL'>('ALL');
  const [mixedFilter, setMixedFilter] = useState<MixedMechanicId | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mixedSelection, setMixedSelection] = useState<Record<string, MixedMechanicId | undefined>>({});
  const [previewMode, setPreviewMode] = useState<'beamer' | 'team'>('beamer');
  const [status, setStatus] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<{ id: string; name: string }[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
  const [newlyAddedIds, setNewlyAddedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [layoutPreview, setLayoutPreview] = useState<Record<string, { imageOffsetX?: number; imageOffsetY?: number; logoOffsetX?: number; logoOffsetY?: number }>>({});

  useEffect(() => {
    setLoading(true);
    fetchQuestions()
      .then((res) => setQuestions(res.questions))
      .catch(() => setError('Fragen konnten nicht geladen werden'))
      .finally(() => setLoading(false));

    setQuizLoading(true);
    fetchQuizzes()
      .then((res) => setQuizzes(res.quizzes.map((q) => ({ id: q.id, name: q.name }))))
      .finally(() => setQuizLoading(false));

    const params = new URLSearchParams(window.location.search);
    const addParam = params.get('add');
    if (addParam) {
      const ids = addParam
        .split(/[\n,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const added: string[] = [];
      ids.forEach((id) => {
        setSelectedIds((prev) => {
          if (prev.includes(id)) return prev;
          const next = [...prev, id];
          added.push(id);
          return next;
        });
      });
      if (added.length > 0) {
        setNewlyAddedIds((prev) => Array.from(new Set([...prev, ...added])));
        setStatus(`${added.length} Fragen aus add-Param übernommen`);
      } else {
        setStatus('Keine gültigen IDs im add-Param');
      }
    }
  }, []);

  const selectedQuestions = useMemo(
    () => selectedIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean) as AnyQuestion[],
    [questions, selectedIds]
  );

  const categoryCount = useMemo(() => {
    const counts: Record<QuizCategory, number> = {
      Schaetzchen: 0,
      'Mu-Cho': 0,
      Stimmts: 0,
      Cheese: 0,
      GemischteTuete: 0
    };
    selectedQuestions.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return counts;
  }, [selectedQuestions]);

  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      if (filterCat !== 'ALL' && q.category !== filterCat) return false;
      if (mixedFilter !== 'all' && q.category === 'GemischteTuete' && q.mixedMechanic !== mixedFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const hay = `${q.question} ${q.id} ${q.answer ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [questions, filterCat, mixedFilter, search]);

  const maxPerCat = 5;
  const maxTotal = 25;

  const addQuestion = (id: string) => {
    const q = questions.find((item) => item.id === id);
    if (!q) return;
    const cat = q.category;
    const catCount = categoryCount[cat] || 0;
    if (catCount >= maxPerCat) {
      setStatus(`${catLabel[cat]} hat bereits ${maxPerCat} Fragen`);
      return;
    }
    if (selectedIds.length >= maxTotal) {
      setStatus('Maximal 25 Fragen erreicht');
      return;
    }
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeQuestion = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= prev.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedIds.length !== maxTotal) {
      setStatus('Bitte genau 25 Fragen wählen (5 je Kategorie).');
      return;
    }
    await createCustomQuiz(quizName, selectedIds, { meta: { language, timerSeconds: defaultTimer } });
    setStatus('Quiz gespeichert');
    setActiveStep('review');
    setQuizLoading(true);
    fetchQuizzes()
      .then((res) => setQuizzes(res.quizzes.map((q) => ({ id: q.id, name: q.name }))))
      .finally(() => setQuizLoading(false));
  };

  const parseCsv = async () => {
    const lines = csvInput.split('\n').map((l) => l.trim()).filter(Boolean);
    const preview: CsvPreviewRow[] = [];
    const idsToAdd: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const parts = raw.split(/[,;]+/).map((p) => p.trim());
      const [id, catRaw, mechRaw] = parts;
      const cat = catList.find((c) => c.toLowerCase() === (catRaw ?? '').toLowerCase()) as QuizCategory | undefined;
      const mech = mechRaw as MixedMechanicId | undefined;
      if (!id) {
        preview.push({ line: i + 1, raw, valid: false, reason: 'keine ID' });
        continue;
      }
      if (cat && cat === 'GemischteTuete' && mech) {
        setMixedSelection((prev) => ({ ...prev, [id]: mech }));
      }
      const existing = questions.find((q) => q.id === id);
      if (!existing && cat) {
        // create bare question placeholder
        const created = await createQuestion({ id, category: cat, question: `Platzhalter ${id}`, mixedMechanic: mech });
        setQuestions((prev) => [...prev, created.question]);
      }
      idsToAdd.push(id);
      preview.push({ line: i + 1, raw, id, category: cat, mechanic: mech, valid: true });
    }
    setCsvPreview(preview);
    idsToAdd.forEach(addQuestion);
    setNewlyAddedIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    setStatus(`${idsToAdd.length} Fragen aus CSV importiert`);
  };

  const baseStep = (
    <div style={card}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Quiz-Name</div>
          <input style={inputStyle} value={quizName} onChange={(e) => setQuizName(e.target.value)} />
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Sprache</div>
          <select
            style={{ ...inputStyle, background: '#101420', color: '#f8fafc' }}
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'de' | 'en')}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Standard-Timer (Sek.)</div>
          <input
            type="number"
            style={inputStyle}
            value={defaultTimer}
            min={5}
            max={120}
            onChange={(e) => setDefaultTimer(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );

  const categoriesStep = (
    <div style={card}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {catList.map((cat) => (
          <div
            key={cat}
            style={{
              ...pill(categoryColors[cat]),
              background: `${categoryColors[cat]}22`,
              borderColor: `${categoryColors[cat]}55`
            }}
          >
            <img src={categoryIcons[cat]} alt={cat} style={{ width: 20, height: 20 }} />
            <span>{catLabel[cat]}</span>
            <span style={{ marginLeft: 8, fontWeight: 800 }}>{categoryCount[cat] || 0}/5</span>
          </div>
        ))}
      </div>
    </div>
  );

  const poolStep = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="Suchen (ID, Text)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select
            style={{ ...inputStyle, background: '#101420', color: '#f8fafc' }}
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value as QuizCategory | 'ALL')}
          >
            <option value="ALL">Alle Kategorien</option>
            {catList.map((cat) => (
              <option key={cat} value={cat}>
                {catLabel[cat]}
              </option>
            ))}
          </select>
          <select
            style={{ ...inputStyle, background: '#101420', color: '#f8fafc' }}
            value={mixedFilter}
            onChange={(e) => setMixedFilter(e.target.value as MixedMechanicId | 'all')}
          >
            <option value="all">Alle Mechaniken</option>
            {mixedMechanics.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <textarea
            placeholder="IDs per Zeile oder Komma"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            style={{ ...inputStyle, minHeight: 80 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              style={{ ...inputStyle, background: theme.accentStrong, color: '#0d0f14', cursor: 'pointer' }}
              onClick={() => {
                const ids = bulkInput
                  .split(/[\n,;\s]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                ids.forEach(addQuestion);
                setNewlyAddedIds((prev) => Array.from(new Set([...prev, ...ids])));
                setStatus(`${ids.length} IDs hinzugefügt`);
              }}
            >
              IDs hinzufügen
            </button>
            <button
              style={{ ...inputStyle, background: '#1f2733', color: '#f8fafc', cursor: 'pointer' }}
              onClick={() => setBulkInput('')}
            >
              Feld leeren
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>CSV-Import (id,category,mixedMechanic)</div>
          <textarea
            style={{ ...inputStyle, minHeight: 90 }}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder="id, GemischteTuete, three-clue-race"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              style={{ ...inputStyle, background: theme.success, color: '#0d0f14', cursor: 'pointer' }}
              onClick={parseCsv}
            >
              CSV einlesen & hinzufügen
            </button>
            <button
              style={{ ...inputStyle, background: '#1f2733', color: '#f8fafc', cursor: 'pointer' }}
              onClick={() => {
                setCsvInput('');
                setCsvPreview([]);
              }}
            >
              CSV zurücksetzen
            </button>
          </div>
          {csvPreview.length > 0 && (
            <div style={{ marginTop: 10, ...card, background: '#111826' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>CSV Vorschau</div>
              <div style={{ maxHeight: 160, overflow: 'auto', fontSize: 12 }}>
                {csvPreview.map((row) => (
                  <div key={row.line} style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: 8, marginBottom: 4 }}>
                    <div style={{ color: '#94a3b8' }}>#{row.line}</div>
                    <div style={{ color: row.valid ? '#c7f9cc' : '#fca5a5' }}>
                      {row.raw} {row.reason ? `(${row.reason})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...card, maxHeight: '70vh', overflow: 'auto' }}>
        {loading && <div>Fragen werden geladen ...</div>}
        {!loading &&
          filteredPool.map((q) => {
            const catColor = categoryColors[q.category];
            const isSelected = selectedIds.includes(q.id);
            const isNew = newlyAddedIds.includes(q.id);
            const layout = (q as any).layout || layoutPreview[q.id] || {};
            return (
              <div
                key={q.id}
                style={{
                  border: `1px solid ${isSelected ? theme.accentStrong : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  background: isSelected ? 'rgba(111, 142, 255, 0.12)' : 'rgba(16,18,28,0.7)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ ...pill(catColor), background: `${catColor}22`, color: '#0d0f14' }}>
                      <img src={categoryIcons[q.category]} alt={q.category} style={{ width: 18, height: 18 }} />
                      {catLabel[q.category]}
                    </div>
                    {q.category === 'GemischteTuete' && q.mixedMechanic && (
                      <div style={{ ...pill(theme.accentStrong, true) }}>{q.mixedMechanic}</div>
                    )}
                    {isNew && <div style={{ ...pill(theme.success), color: '#0d0f14' }}>Neu</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={{ ...inputStyle, background: isSelected ? '#1f2733' : theme.accentStrong, color: '#0d0f14', cursor: 'pointer' }}
                      onClick={() => (isSelected ? removeQuestion(q.id) : addQuestion(q.id))}
                    >
                      {isSelected ? 'Entfernen' : 'Hinzufügen'}
                    </button>
                    <a
                      style={{ ...inputStyle, background: '#0f141d', color: '#f8fafc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      href={`/question-editor?id=${q.id}`}
                    >
                      Bearbeiten
                    </a>
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>{q.question}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{q.id}</div>
                {q.answer && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#cbd5e1' }}>
                    Lösung: <span style={{ fontWeight: 700 }}>{String(q.answer)}</span>
                  </div>
                )}
                {q.imageUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 120,
                        height: 72,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: '#0d1118'
                      }}
                    >
                      <img src={q.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>Bild vorhanden</div>
                      <button
                        style={{ ...inputStyle, background: '#2c3442', color: '#f8fafc', cursor: 'pointer' }}
                        onClick={async () => {
                          await deleteQuestionImage(q.id);
                          setQuestions((prev) =>
                            prev.map((item) => (item.id === q.id ? ({ ...item, imageUrl: undefined } as AnyQuestion) : item))
                          );
                        }}
                      >
                        Bild entfernen
                      </button>
                    </div>
                  </div>
                )}
                {!q.imageUrl && q.category === 'Cheese' && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 12, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Bild hochladen</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading((prev) => ({ ...prev, [q.id]: true }));
                        try {
                          const res = await uploadQuestionImage(q.id, file);
                          setQuestions((prev) =>
                            prev.map((item) => (item.id === q.id ? ({ ...item, imageUrl: res.imageUrl } as AnyQuestion) : item))
                          );
                          setStatus('Bild aktualisiert');
                        } catch (err) {
                          setStatus('Upload fehlgeschlagen');
                        } finally {
                          setUploading((prev) => ({ ...prev, [q.id]: false }));
                          e.target.value = '';
                        }
                      }}
                    />
                    {uploading[q.id] && <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>Upload läuft ...</div>}
                  </div>
                )}
                {(q.imageUrl || q.category === 'Cheese') && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Mini-Layout (Bild/Logo)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label style={{ fontSize: 12 }}>
                        Bild X
                        <input
                          type="range"
                          min={-120}
                          max={120}
                          value={layout.imageOffsetX ?? 0}
                          onChange={async (e) => {
                            const val = Number(e.target.value);
                            setLayoutPreview((prev) => ({ ...prev, [q.id]: { ...prev[q.id], imageOffsetX: val } }));
                            await setQuestionLayout(q.id, { imageOffsetX: val });
                          }}
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label style={{ fontSize: 12 }}>
                        Bild Y
                        <input
                          type="range"
                          min={-120}
                          max={120}
                          value={layout.imageOffsetY ?? 0}
                          onChange={async (e) => {
                            const val = Number(e.target.value);
                            setLayoutPreview((prev) => ({ ...prev, [q.id]: { ...prev[q.id], imageOffsetY: val } }));
                            await setQuestionLayout(q.id, { imageOffsetY: val });
                          }}
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label style={{ fontSize: 12 }}>
                        Logo X
                        <input
                          type="range"
                          min={-120}
                          max={120}
                          value={layout.logoOffsetX ?? 0}
                          onChange={async (e) => {
                            const val = Number(e.target.value);
                            setLayoutPreview((prev) => ({ ...prev, [q.id]: { ...prev[q.id], logoOffsetX: val } }));
                            await setQuestionLayout(q.id, { logoOffsetX: val });
                          }}
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label style={{ fontSize: 12 }}>
                        Logo Y
                        <input
                          type="range"
                          min={-120}
                          max={120}
                          value={layout.logoOffsetY ?? 0}
                          onChange={async (e) => {
                            const val = Number(e.target.value);
                            setLayoutPreview((prev) => ({ ...prev, [q.id]: { ...prev[q.id], logoOffsetY: val } }));
                            await setQuestionLayout(q.id, { logoOffsetY: val });
                          }}
                          style={{ width: '100%' }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'linear-gradient(135deg, rgba(15,18,28,0.9), rgba(20,24,34,0.8))',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: 140
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0, opacity: 0.12, background: `${catColor}` }} />
                      {q.imageUrl ? (
                        <img
                          src={q.imageUrl}
                          alt="layout"
                          style={{
                            position: 'absolute',
                            width: 90,
                            height: 90,
                            objectFit: 'cover',
                            borderRadius: 12,
                            top: 20 + (layout.imageOffsetY ?? 0),
                            left: 20 + (layout.imageOffsetX ?? 0),
                            border: '1px solid rgba(255,255,255,0.12)'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            position: 'absolute',
                            width: 90,
                            height: 90,
                            borderRadius: 12,
                            top: 20 + (layout.imageOffsetY ?? 0),
                            left: 20 + (layout.imageOffsetX ?? 0),
                            border: '1px dashed rgba(255,255,255,0.25)',
                            color: '#cbd5e1',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          Bild
                        </div>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          right: 20 + (layout.logoOffsetX ?? 0),
                          top: 18 + (layout.logoOffsetY ?? 0),
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#0f141d',
                          border: `2px solid ${catColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: `0 6px 14px ${catColor}44`
                        }}
                      >
                        <img src={categoryIcons[q.category]} alt="icon" style={{ width: 28, height: 28 }} />
                      </div>
                      <div style={{ position: 'absolute', bottom: 14, left: 20, fontSize: 12, color: '#e2e8f0' }}>
                        Live-Preview (Wizard)
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                      Für Feintuning gibt es den Question Editor. Diese Vorschau gilt für Beamer/Team-Ansicht.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );

  const orderStep = (
    <div style={card}>
      {selectedQuestions.map((q) => (
        <div
          key={q.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 200px 160px',
            gap: 8,
            alignItems: 'center',
            padding: 10,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 8
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{q.question}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{catLabel[q.category]}</div>
          </div>
          {q.category === 'GemischteTuete' && (
            <select
              style={{ ...inputStyle, background: '#101420', color: '#f8fafc' }}
              value={mixedSelection[q.id] ?? q.mixedMechanic ?? 'sortieren'}
              onChange={(e) => setMixedSelection((prev) => ({ ...prev, [q.id]: e.target.value as MixedMechanicId }))}
            >
              {mixedMechanics.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...inputStyle, cursor: 'pointer' }} onClick={() => move(q.id, -1)}>
              ▲
            </button>
            <button style={{ ...inputStyle, cursor: 'pointer' }} onClick={() => move(q.id, 1)}>
              ▼
            </button>
            <button style={{ ...inputStyle, cursor: 'pointer', background: '#2c3442', color: '#f8fafc' }} onClick={() => removeQuestion(q.id)}>
              Entfernen
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const reviewStep = (
    <div style={card}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {catList.map((cat) => (
          <div key={cat} style={{ ...pill(categoryColors[cat]), background: `${categoryColors[cat]}22`, color: '#0d0f14' }}>
            {catLabel[cat]} {categoryCount[cat] || 0}/5
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Gesamt: {selectedIds.length}/25</div>
      <button
        style={{ ...inputStyle, background: theme.accentStrong, color: '#0d0f14', cursor: 'pointer' }}
        onClick={handleSave}
      >
        Quiz speichern
      </button>
    </div>
  );

  const previewCard = () => {
    const q = selectedQuestions[0];
    if (!q) return null;
    const layout = (q as any).layout || layoutPreview[q.id] || {};
    const catColor = categoryColors[q.category];
    return (
      <div
        style={{
          ...card,
          position: 'sticky',
          top: 520,
          padding: 14,
          border: `1px solid ${catColor}55`,
          boxShadow: `0 12px 30px ${catColor}33`
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Mini-Vorschau (Beamer/Team)</div>
        <div
          style={{
            position: 'relative',
            height: 180,
            borderRadius: 14,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(15,18,28,0.9), rgba(20,24,34,0.85))',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: catColor, opacity: 0.06 }} />
          {q.imageUrl ? (
            <img
              src={q.imageUrl}
              alt="preview"
              style={{
                position: 'absolute',
                width: 90,
                height: 90,
                objectFit: 'cover',
                borderRadius: 12,
                top: 22 + (layout.imageOffsetY ?? 0),
                left: 18 + (layout.imageOffsetX ?? 0),
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.35)'
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                width: 90,
                height: 90,
                borderRadius: 12,
                top: 22 + (layout.imageOffsetY ?? 0),
                left: 18 + (layout.imageOffsetX ?? 0),
                border: '1px dashed rgba(255,255,255,0.25)',
                color: '#cbd5e1',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Bild
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              right: 18 + (layout.logoOffsetX ?? 0),
              top: 18 + (layout.logoOffsetY ?? 0),
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#0f141d',
              border: `2px solid ${catColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: `0 6px 14px ${catColor}44`
            }}
          >
            <img src={categoryIcons[q.category]} alt="icon" style={{ width: 28, height: 28 }} />
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>
            {q.question}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Nutze die Slider in der Karte, um Positionen zu ändern.</div>
      </div>
    );
  };

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...card, position: 'sticky', top: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Fortschritt</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {steps.map((s) => (
            <button
              key={s.key}
              style={{
                ...inputStyle,
                background: activeStep === s.key ? theme.accentStrong : '#0f141d',
                color: activeStep === s.key ? '#0d0f14' : '#f8fafc',
                cursor: 'pointer'
              }}
              onClick={() => setActiveStep(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            style={{ ...inputStyle, background: '#1f2733', color: '#f8fafc', cursor: 'pointer' }}
            onClick={() => setPreviewMode('beamer')}
          >
            Beamer-Preview
          </button>
          <button
            style={{ ...inputStyle, background: '#1f2733', color: '#f8fafc', cursor: 'pointer' }}
            onClick={() => setPreviewMode('team')}
          >
            Team-Preview
          </button>
        </div>
        {status && <div style={{ marginTop: 10, color: '#c7f9cc' }}>{status}</div>}
        {error && <div style={{ marginTop: 10, color: '#fca5a5' }}>{error}</div>}
      </div>

      <div style={{ ...card, position: 'sticky', top: 320, maxHeight: '40vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 800 }}>Quizzes</div>
          <button
            style={{ ...inputStyle, background: '#1f2733', color: '#f8fafc', cursor: 'pointer' }}
            onClick={() => {
              setQuizLoading(true);
              fetchQuizzes()
                .then((res) => setQuizzes(res.quizzes.map((q) => ({ id: q.id, name: q.name }))))
                .finally(() => setQuizLoading(false));
            }}
          >
            Refresh
          </button>
        </div>
        {quizLoading && <div>Lade Quizzes ...</div>}
        {!quizLoading &&
          quizzes.map((q) => (
            <div
              key={q.id}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: 10,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{q.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{q.id}</div>
              </div>
              <button
                style={{ ...inputStyle, background: '#2c3442', color: '#f8fafc', cursor: 'pointer' }}
                onClick={async () => {
                  await deleteQuiz(q.id);
                  setQuizzes((prev) => prev.filter((x) => x.id !== q.id));
                }}
              >
                Löschen
              </button>
            </div>
          ))}
      </div>
      {previewCard()}
    </div>
  );

  return (
    <main style={{ padding: 20, color: '#f8fafc', background: '#0c111a', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 12 }}>Quiz Wizard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr', gap: 16 }}>
        <div>
          {activeStep === 'base' && baseStep}
          {activeStep === 'categories' && categoriesStep}
          {activeStep === 'pool' && poolStep}
          {activeStep === 'order' && orderStep}
          {activeStep === 'review' && reviewStep}
        </div>
        {sidebar}
      </div>
    </main>
  );
};

export default CreatorWizardPage;
