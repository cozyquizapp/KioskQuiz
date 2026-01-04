
import { useEffect, useMemo, useState } from 'react';
import '../styles/cozyBuilder.css';
import {
  AnyQuestion,
  CozyQuestionType,
  CozyQuizDraft,
  Language,
  QuizBlitzTheme
} from '@shared/quizTypes';
import { COZY_SLOT_TEMPLATE } from '@shared/cozyTemplate';
import {
  CozyDraftSummary,
  listCozyDrafts,
  createCozyDraft,
  fetchCozyDraft,
  saveCozyDraft,
  publishCozyDraft
} from '../api';

type TabKey = 'meta' | 'questions' | 'blitz';

const languageOptions: { label: string; value: Language }[] = [
  { label: 'Deutsch', value: 'de' },
  { label: 'Englisch', value: 'en' },
  { label: 'DE + EN', value: 'both' }
];

const typeOptions: { label: string; value: CozyQuestionType }[] = [
  { label: 'Multiple Choice', value: 'MU_CHO' },
  { label: 'Schaetzfrage', value: 'SCHAETZCHEN' },
  { label: 'Stimmts / Betting', value: 'STIMMTS' },
  { label: 'Cheese (Bildfrage)', value: 'CHEESE' },
  { label: 'Bunte Tuete', value: 'BUNTE_TUETE' }
];

const linesFromText = (text: string) =>
  text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const toCommaList = (values?: string[]) => (values && values.length ? values.join(', ') : '');

const fromCommaList = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);


const questionTemplateForSlot = (slotIndex: number, existingId: string, type: CozyQuestionType): AnyQuestion => {
  const slot = COZY_SLOT_TEMPLATE[slotIndex] ?? COZY_SLOT_TEMPLATE[0];
  const base = {
    id: existingId,
    question: slot.label,
    points: slot.defaultPoints,
    segmentIndex: slot.segmentIndex
  } as AnyQuestion;
  if (type === 'MU_CHO') {
    return { ...base, mechanic: 'multipleChoice', category: 'Mu-Cho', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndex: 0 };
  }
  if (type === 'SCHAETZCHEN') {
    return { ...base, mechanic: 'estimate', category: 'Schaetzchen', targetValue: 0, unit: '' };
  }
  if (type === 'STIMMTS') {
    return { ...base, mechanic: 'betting', category: 'Stimmts', options: ['Option A', 'Option B', 'Option C'], correctIndex: 0, pointsPool: 10 };
  }
  if (type === 'CHEESE') {
    return { ...base, mechanic: 'imageQuestion', category: 'Cheese', answer: '', imageUrl: '' };
  }
  return {
    ...base,
    mechanic: 'custom',
    category: 'GemischteTuete',
    type: 'BUNTE_TUETE',
    bunteTuete: {
      kind: 'top5',
      prompt: 'Ordnet die fuenf Eintraege.',
      items: Array.from({ length: 5 }).map((_, idx) => ({ id: `${existingId}-item-${idx + 1}`, label: `Item ${idx + 1}` })),
      correctOrder: Array.from({ length: 5 }).map((_, idx) => `${existingId}-item-${idx + 1}`)
    }
  };
};

const buildBuntePayload = (kind: 'top5' | 'precision' | 'oneOfEight' | 'order', baseId: string) => {
  if (kind === 'precision') {
    return {
      kind,
      prompt: 'Schaetze moeglichst genau.',
      ladder: [
        { label: 'Guter Treffer', acceptedAnswers: [''], points: 2 },
        { label: 'Nahe dran', acceptedAnswers: [''], points: 1 }
      ]
    };
  }
  if (kind === 'oneOfEight') {
    return {
      kind,
      prompt: 'Eine Aussage ist falsch.',
      statements: Array.from({ length: 8 }).map((_, idx) => ({
        id: `${baseId}-stmt-${idx + 1}`,
        text: `Aussage ${idx + 1}`,
        isFalse: idx === 0
      }))
    };
  }
  if (kind === 'order') {
    const items = Array.from({ length: 5 }).map((_, idx) => ({
      id: `${baseId}-item-${idx + 1}`,
      label: `Item ${idx + 1}`
    }));
    const criteriaId = `${baseId}-criteria-1`;
    return {
      kind,
      prompt: 'Ordne die Items.',
      items,
      criteriaOptions: [{ id: criteriaId, label: 'Kriterium', direction: 'asc' }],
      defaultCriteriaId: criteriaId,
      correctByCriteria: { [criteriaId]: items.map((item) => item.id) }
    };
  }
  const items = Array.from({ length: 5 }).map((_, idx) => ({
    id: `${baseId}-item-${idx + 1}`,
    label: `Item ${idx + 1}`
  }));
  return {
    kind: 'top5',
    prompt: 'Ordne die fuenf Eintraege.',
    items,
    correctOrder: items.map((item) => item.id)
  };
};

const updateQuestionArray = (draft: CozyQuizDraft, index: number, updater: (question: AnyQuestion) => AnyQuestion): CozyQuizDraft => {
  const next = draft.questions.slice();
  next[index] = updater(next[index]);
  return { ...draft, questions: next };
};

const getQuestionTypeKey = (question: AnyQuestion): CozyQuestionType => {
  if ((question as any).type === 'BUNTE_TUETE') return 'BUNTE_TUETE';
  switch (question.mechanic) {
    case 'estimate':
      return 'SCHAETZCHEN';
    case 'betting':
      return 'STIMMTS';
    case 'imageQuestion':
      return 'CHEESE';
    default:
      return 'MU_CHO';
  }
};

const Cozy60BuilderPage = () => {
  const [draftSummaries, setDraftSummaries] = useState<CozyDraftSummary[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CozyQuizDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tab, setTab] = useState<TabKey>('meta');
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [draftFilter, setDraftFilter] = useState('');
  const [questionSegmentFilter, setQuestionSegmentFilter] = useState<'all' | 'seg1' | 'seg2'>('all');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadSummaries = async () => {
    try {
      const data = await listCozyDrafts();
      setDraftSummaries(data.drafts);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const loadDraft = async (draftId: string) => {
    try {
      const data = await fetchCozyDraft(draftId);
      setDraft(data.draft);
      setWarnings(data.warnings ?? []);
      setSelectedDraftId(draftId);
      setSelectedSlot(0);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  useEffect(() => {
    if (!draft && draftSummaries.length > 0) {
      loadDraft(draftSummaries[0].id);
    }
  }, [draftSummaries, draft]);

  const updateDraft = (updater: (prev: CozyQuizDraft) => CozyQuizDraft) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
  };

  const handleCreate = async () => {
    setStatus('Erstelle neues Draft ...');
    try {
      const data = await createCozyDraft();
      setDraft(data.draft);
      setWarnings(data.warnings ?? []);
      setSelectedDraftId(data.draft.id);
      setSelectedSlot(0);
      await loadSummaries();
      setStatus('Draft erstellt');
    } catch (err) {
      setError((err as Error).message);
      setStatus('');
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setStatus('Speichere ...');
    try {
      const response = await saveCozyDraft(draft.id, draft);
      setDraft(response.draft);
      setWarnings(response.warnings ?? []);
      await loadSummaries();
      setStatus('Gespeichert');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    setStatus('Veroeffentliche ...');
    try {
      const response = await publishCozyDraft(draft.id, { draft });
      setDraft(response.draft);
      setWarnings(response.warnings ?? []);
      await loadSummaries();
      setStatus(`Veroeffentlicht als ${response.quizId}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleValidate = async () => {
    if (!draft) return;
    setStatus('Validiere ...');
    try {
      const response = await saveCozyDraft(draft.id, draft);
      setDraft(response.draft);
      setWarnings(response.warnings ?? []);
      await loadSummaries();
      setStatus('Validierung ok');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleApplyTemplate = () => {
    if (!draft) return;
    const confirmed = window.confirm('20 Slots Vorlage anwenden? Bestehende Fragen werden ueberschrieben.');
    if (!confirmed) return;
    updateDraft((prev) => {
      const nextQuestions = COZY_SLOT_TEMPLATE.map((slot, idx) =>
        questionTemplateForSlot(idx, prev.questions[idx]?.id ?? `${prev.id}-q${idx + 1}`, slot.type)
      );
      return { ...prev, questions: nextQuestions };
    });
    setSelectedSlot(0);
  };

  const updateCurrentQuestion = (updater: (question: AnyQuestion) => AnyQuestion) => {
    updateDraft((prev) => {
      if (!prev) return prev;
      return updateQuestionArray(prev, selectedSlot, updater);
    });
  };

  const updateQuestionOptions = (count: number, index: number, value: string) => {
    updateCurrentQuestion((prevQ) => {
      const next = { ...prevQ } as AnyQuestion & { options?: string[]; correctIndex?: number };
      const options = Array.isArray(next.options) ? [...next.options] : [];
      while (options.length < count) options.push('');
      options[index] = value;
      next.options = options.slice(0, count);
      if (typeof next.correctIndex !== 'number') next.correctIndex = 0;
      if (next.correctIndex >= count) next.correctIndex = 0;
      return next;
    });
  };

  const updateBlitzTheme = (themeIndex: number, updater: (theme: QuizBlitzTheme) => QuizBlitzTheme) => {
    updateDraft((prev) => {
      const pool = prev.blitz?.pool ?? [];
      if (!pool[themeIndex]) return prev;
      const nextPool = pool.slice();
      nextPool[themeIndex] = updater(pool[themeIndex]);
      return { ...prev, blitz: { pool: nextPool } };
    });
  };

  const updateBlitzItem = (themeIndex: number, itemIndex: number, updater: (item: QuizBlitzTheme['items'][number]) => QuizBlitzTheme['items'][number]) => {
    updateBlitzTheme(themeIndex, (theme) => {
      const items = theme.items.slice();
      if (!items[itemIndex]) return theme;
      items[itemIndex] = updater(items[itemIndex]);
      return { ...theme, items };
    });
  };

  const currentQuestion = draft?.questions[selectedSlot];
  const currentSlot = useMemo(() => COZY_SLOT_TEMPLATE[selectedSlot] ?? COZY_SLOT_TEMPLATE[0], [selectedSlot]);
  const currentType = currentQuestion ? getQuestionTypeKey(currentQuestion) : 'MU_CHO';
  const filteredDrafts = useMemo(() => {
    const needle = draftFilter.trim().toLowerCase();
    if (!needle) return draftSummaries;
    return draftSummaries.filter((summary) => {
      const title = summary.title?.toLowerCase() ?? '';
      return title.includes(needle) || summary.id.toLowerCase().includes(needle);
    });
  }, [draftSummaries, draftFilter]);
  const filteredQuestionIndices = useMemo(() => {
    if (!draft) return [];
    if (questionSegmentFilter === 'all') return draft.questions.map((_, idx) => idx);
    const segmentIndex = questionSegmentFilter === 'seg1' ? 0 : 1;
    return draft.questions
      .map((_, idx) => idx)
      .filter((idx) => (COZY_SLOT_TEMPLATE[idx]?.segmentIndex ?? 0) === segmentIndex);
  }, [draft, questionSegmentFilter]);

  useEffect(() => {
    if (!draft || tab !== 'questions') return;
    if (filteredQuestionIndices.length === 0) return;
    if (!filteredQuestionIndices.includes(selectedSlot)) {
      setSelectedSlot(filteredQuestionIndices[0]);
    }
  }, [draft, tab, filteredQuestionIndices, selectedSlot]);

  return (
    <div className="cozy-builder" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="builder-sidebar" style={{ width: 300, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Cozy Drafts</strong>
          <button className="builder-button secondary" onClick={handleCreate}>
            Neu
          </button>
        </div>
        <input
          className="builder-input"
          value={draftFilter}
          onChange={(e) => setDraftFilter(e.target.value)}
          placeholder="Draft suchen..."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredDrafts.map((summary) => (
            <button
              key={summary.id}
              onClick={() => loadDraft(summary.id)}
              className={`builder-draft-item${selectedDraftId === summary.id ? ' is-active' : ''}`}
              style={{
                borderColor: selectedDraftId === summary.id ? 'rgba(34, 211, 238, 0.6)' : undefined
              }}
            >
              <div style={{ fontWeight: 600 }}>{summary.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(summary.updatedAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
        <small>Status: {status || 'bereit'}</small>
        {error && <small style={{ color: '#f87171' }}>Error: {error}</small>}
      </aside>
      <main className="builder-main" style={{ flex: 1, overflowY: 'auto' }}>
        {!draft ? (
          <div>Draft wird geladen ...</div>
        ) : (
          <>
            <div className="builder-header" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Cozy60 Builder</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{draft.meta.title || 'Unbenanntes Quiz'}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{status || 'bereit'}</div>
              </div>
              <div className="builder-actions">
                <button className="builder-button secondary" onClick={handleSave}>
                  Speichern
                </button>
                <button className="builder-button secondary" onClick={handleValidate}>
                  Validieren
                </button>
                <button className="builder-button primary" onClick={handlePublish}>
                  Publish
                </button>
              </div>
            </div>
            <div className="builder-tabs" style={{ marginBottom: 16 }}>
              {(['meta', 'questions', 'blitz'] as TabKey[]).map((entry) => (
                <button
                  key={entry}
                  onClick={() => setTab(entry)}
                  className={`builder-tab${tab === entry ? ' is-active' : ''}`}
                >
                  {entry === 'meta' && 'Meta'}
                  {entry === 'questions' && 'Fragen'}
                  {entry === 'blitz' && 'Fotoblitz'}
                </button>
              ))}
            </div>
            {tab === 'meta' && (
              <section className="builder-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Titel
                  <input
                    value={draft.meta.title}
                    onChange={(e) => updateDraft((prev) => ({ ...prev, meta: { ...prev.meta, title: e.target.value } }))}
                    style={{ padding: 8, borderRadius: 6 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Beschreibung
                  <textarea
                    rows={3}
                    value={draft.meta.description ?? ''}
                    onChange={(e) =>
                      updateDraft((prev) => ({ ...prev, meta: { ...prev.meta, description: e.target.value } }))
                    }
                    style={{ padding: 8, borderRadius: 6 }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Datum
                    <input
                      type="date"
                      value={
                        draft.meta.date ? new Date(draft.meta.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
                      }
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          meta: { ...prev.meta, date: Date.parse(e.target.value) }
                        }))
                      }
                      style={{ padding: 8, borderRadius: 6 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Sprache
                    <select
                      value={draft.meta.language}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          meta: { ...prev.meta, language: e.target.value as Language }
                        }))
                      }
                      style={{ padding: 8, borderRadius: 6 }}
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {warnings.length > 0 && (
                  <details style={{ background: 'rgba(248,113,113,0.15)', borderRadius: 8, padding: 12 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Warnings ({warnings.length})</summary>
                    <ul>
                      {warnings.map((warn) => (
                        <li key={warn}>{warn}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            )}
            {tab === 'questions' && currentQuestion && (
              <section style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
                <div className="builder-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 12 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Segment-Filter</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { key: 'all', label: 'Alle' },
                        { key: 'seg1', label: 'Segment 1' },
                        { key: 'seg2', label: 'Segment 2' }
                      ].map((entry) => (
                        <button
                          key={entry.key}
                          onClick={() => setQuestionSegmentFilter(entry.key as 'all' | 'seg1' | 'seg2')}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            border: questionSegmentFilter === entry.key ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                            background: questionSegmentFilter === entry.key ? 'rgba(56,189,248,0.2)' : 'transparent',
                            color: 'inherit'
                          }}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                <button className="builder-button secondary" onClick={handleApplyTemplate} style={{ marginTop: 6 }}>
                  20 Slots Vorlage anwenden
                </button>
                  </div>
                  {filteredQuestionIndices.map((idx) => {
                    const question = draft.questions[idx];
                    return (
                      <button
                        key={question.id}
                        onClick={() => setSelectedSlot(idx)}
                        style={{
                          textAlign: 'left',
                          padding: 8,
                          borderRadius: 6,
                          border: selectedSlot === idx ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                          background: selectedSlot === idx ? 'rgba(56,189,248,0.12)' : 'transparent',
                          color: 'inherit'
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {idx + 1}. {COZY_SLOT_TEMPLATE[idx].label}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          Segment {COZY_SLOT_TEMPLATE[idx].segmentIndex + 1} | {question.points} Punkte
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>{question.mechanic}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="builder-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <strong>Frage {selectedSlot + 1}</strong>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{currentSlot.label}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Segment
                      <input value={`Segment ${currentSlot.segmentIndex + 1}`} readOnly style={{ padding: 8, borderRadius: 6, opacity: 0.7 }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Punkte
                      <input
                        type="number"
                        min={0}
                        value={currentQuestion.points}
                        onChange={(e) =>
                          updateCurrentQuestion((prevQ) => ({ ...prevQ, points: Number(e.target.value) }))
                        }
                        style={{ padding: 8, borderRadius: 6, width: 120 }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
                      Kategorie
                      <input
                        value={currentQuestion.category}
                        onChange={(e) =>
                          updateCurrentQuestion((prevQ) => ({ ...prevQ, category: e.target.value }))
                        }
                        style={{ padding: 8, borderRadius: 6 }}
                      />
                    </label>
                    <button className="builder-button secondary"
                      onClick={() =>
                        updateDraft((prev) =>
                          updateQuestionArray(prev, selectedSlot, (prevQ) =>
                            questionTemplateForSlot(selectedSlot, prevQ.id, getQuestionTypeKey(prevQ))
                          )
                        )
                      }
                    >
                      Slot zuruecksetzen
                    </button>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Fragentyp
                    <select
                      value={getQuestionTypeKey(currentQuestion)}
                      onChange={(e) =>
                        updateDraft((prev) =>
                          updateQuestionArray(prev, selectedSlot, (prevQ) =>
                            questionTemplateForSlot(selectedSlot, prevQ.id, e.target.value as CozyQuestionType)
                          )
                        )
                      }
                      style={{ padding: 8, borderRadius: 6 }}
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Frage
                    <textarea
                      rows={3}
                      value={currentQuestion.question}
                      onChange={(e) =>
                        updateDraft((prev) =>
                          updateQuestionArray(prev, selectedSlot, (prevQ) => ({ ...prevQ, question: e.target.value }))
                        )
                      }
                      style={{ padding: 8, borderRadius: 6 }}
                    />
                  </label>
                  {currentType === 'MU_CHO' && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Antwort-Optionen</div>
                      {Array.from({ length: 4 }).map((_, idx) => {
                        const value = Array.isArray((currentQuestion as any).options) ? (currentQuestion as any).options[idx] ?? '' : '';
                        return (
                          <input
                            key={`mc-opt-${idx}`}
                            value={value}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            onChange={(e) => updateQuestionOptions(4, idx, e.target.value)}
                            style={{ padding: 8, borderRadius: 6 }}
                          />
                        );
                      })}
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Richtige Option
                        <select
                          value={(currentQuestion as any).correctIndex ?? 0}
                          onChange={(e) =>
                            updateCurrentQuestion((prevQ) => ({ ...(prevQ as any), correctIndex: Number(e.target.value) }))
                          }
                          style={{ padding: 8, borderRadius: 6, width: 160 }}
                        >
                          {['A', 'B', 'C', 'D'].map((label, idx) => (
                            <option key={label} value={idx}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {currentType === 'SCHAETZCHEN' && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Zielwert
                        <input
                          type="number"
                          value={(currentQuestion as any).targetValue ?? 0}
                          onChange={(e) =>
                            updateCurrentQuestion((prevQ) => ({ ...(prevQ as any), targetValue: Number(e.target.value) }))
                          }
                          style={{ padding: 8, borderRadius: 6, width: 160 }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Einheit
                        <input
                          value={(currentQuestion as any).unit ?? ''}
                          onChange={(e) => updateCurrentQuestion((prevQ) => ({ ...(prevQ as any), unit: e.target.value }))}
                          style={{ padding: 8, borderRadius: 6, width: 160 }}
                        />
                      </label>
                    </div>
                  )}
                  {currentType === 'STIMMTS' && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Aussagen (3)</div>
                      {Array.from({ length: 3 }).map((_, idx) => {
                        const value = Array.isArray((currentQuestion as any).options) ? (currentQuestion as any).options[idx] ?? '' : '';
                        return (
                          <input
                            key={`bet-opt-${idx}`}
                            value={value}
                            placeholder={`Aussage ${idx + 1}`}
                            onChange={(e) => updateQuestionOptions(3, idx, e.target.value)}
                            style={{ padding: 8, borderRadius: 6 }}
                          />
                        );
                      })}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          Richtige Aussage
                          <select
                            value={(currentQuestion as any).correctIndex ?? 0}
                            onChange={(e) =>
                              updateCurrentQuestion((prevQ) => ({ ...(prevQ as any), correctIndex: Number(e.target.value) }))
                            }
                            style={{ padding: 8, borderRadius: 6, width: 160 }}
                          >
                            {['A', 'B', 'C'].map((label, idx) => (
                              <option key={label} value={idx}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          Punkte-Pool
                          <input
                            type="number"
                            value={(currentQuestion as any).pointsPool ?? 10}
                            onChange={(e) =>
                              updateCurrentQuestion((prevQ) => ({ ...(prevQ as any), pointsPool: Number(e.target.value) }))
                            }
                            style={{ padding: 8, borderRadius: 6, width: 160 }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                  {currentType === 'CHEESE' && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Bild URL
                        <input
                          value={(currentQuestion as any).imageUrl ?? ''}
                          onChange={(e) =>
                            updateCurrentQuestion((prevQ) => ({ ...(prevQ as any), imageUrl: e.target.value }))
                          }
                          style={{ padding: 8, borderRadius: 6 }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Antwort
                        <input
                          value={(currentQuestion as any).answer ?? ''}
                          onChange={(e) => updateCurrentQuestion((prevQ) => ({ ...(prevQ as any), answer: e.target.value }))}
                          style={{ padding: 8, borderRadius: 6 }}
                        />
                      </label>
                    </div>
                  )}
                  {currentType === 'BUNTE_TUETE' && (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {(() => {
                        const base = currentQuestion as any;
                        const payload = base.bunteTuete;
                        if (!payload) {
                          return (
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 6 }}>Bunte Tuete</div>
                              <button className="builder-button secondary"
                                onClick={() =>
                                  updateCurrentQuestion((prevQ) => ({
                                    ...(prevQ as any),
                                    type: 'BUNTE_TUETE',
                                    bunteTuete: buildBuntePayload('top5', prevQ.id)
                                  }))
                                }
                              >
                                Template erzeugen
                              </button>
                            </div>
                          );
                        }
                        return (
                          <>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                Subtype
                                <select
                                  value={payload.kind}
                                  onChange={(e) =>
                                    updateCurrentQuestion((prevQ) => ({
                                      ...(prevQ as any),
                                      type: 'BUNTE_TUETE',
                                      bunteTuete: buildBuntePayload(e.target.value as any, prevQ.id)
                                    }))
                                  }
                                  style={{ padding: 8, borderRadius: 6, width: 180 }}
                                >
                                  <option value="top5">Top 5</option>
                                  <option value="precision">Praezision</option>
                                  <option value="oneOfEight">8 Dinge - 1 falsch</option>
                                  <option value="order">Ordnen</option>
                                </select>
                              </label>
                              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 320px' }}>
                                Prompt
                                <input
                                  value={payload.prompt ?? ''}
                                  onChange={(e) =>
                                    updateCurrentQuestion((prevQ) => ({
                                      ...(prevQ as any),
                                      bunteTuete: { ...payload, prompt: e.target.value }
                                    }))
                                  }
                                  style={{ padding: 8, borderRadius: 6 }}
                                />
                              </label>
                            </div>
                            {(payload.kind === 'top5' || payload.kind === 'order') && (
                              <div style={{ display: 'grid', gap: 8 }}>
                                <div style={{ fontWeight: 600 }}>Items</div>
                                {payload.items?.map((item: any, idx: number) => (
                                  <input
                                    key={item.id ?? `${base.id}-item-${idx}`}
                                    value={item.label ?? ''}
                                    onChange={(e) =>
                                      updateCurrentQuestion((prevQ) => {
                                        const nextPayload = { ...(payload as any) };
                                        const items = [...(nextPayload.items ?? [])];
                                        items[idx] = { ...items[idx], label: e.target.value };
                                        nextPayload.items = items;
                                        return { ...(prevQ as any), bunteTuete: nextPayload };
                                      })
                                    }
                                    style={{ padding: 8, borderRadius: 6 }}
                                  />
                                ))}
                              </div>
                            )}
                            {payload.kind === 'precision' && (
                              <div style={{ display: 'grid', gap: 10 }}>
                                <div style={{ fontWeight: 600 }}>Praezisionsleiter</div>
                                {payload.ladder?.map((step: any, idx: number) => (
                                  <div key={`${base.id}-step-${idx}`} style={{ display: 'grid', gap: 6, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <input
                                      value={step.label ?? ''}
                                      placeholder="Label"
                                      onChange={(e) =>
                                        updateCurrentQuestion((prevQ) => {
                                          const nextPayload = { ...(payload as any) };
                                          const ladder = [...(nextPayload.ladder ?? [])];
                                          ladder[idx] = { ...ladder[idx], label: e.target.value };
                                          nextPayload.ladder = ladder;
                                          return { ...(prevQ as any), bunteTuete: nextPayload };
                                        })
                                      }
                                      style={{ padding: 8, borderRadius: 6 }}
                                    />
                                    <textarea
                                      rows={2}
                                      value={(step.acceptedAnswers ?? []).join('\n')}
                                      placeholder="Erlaubte Antworten (1 pro Zeile)"
                                      onChange={(e) =>
                                        updateCurrentQuestion((prevQ) => {
                                          const nextPayload = { ...(payload as any) };
                                          const ladder = [...(nextPayload.ladder ?? [])];
                                          ladder[idx] = { ...ladder[idx], acceptedAnswers: linesFromText(e.target.value) };
                                          nextPayload.ladder = ladder;
                                          return { ...(prevQ as any), bunteTuete: nextPayload };
                                        })
                                      }
                                      style={{ padding: 8, borderRadius: 6 }}
                                    />
                                    <input
                                      type="number"
                                      value={step.points ?? 0}
                                      onChange={(e) =>
                                        updateCurrentQuestion((prevQ) => {
                                          const nextPayload = { ...(payload as any) };
                                          const ladder = [...(nextPayload.ladder ?? [])];
                                          ladder[idx] = { ...ladder[idx], points: Number(e.target.value) };
                                          nextPayload.ladder = ladder;
                                          return { ...(prevQ as any), bunteTuete: nextPayload };
                                        })
                                      }
                                      style={{ padding: 8, borderRadius: 6, width: 140 }}
                                    />
                                  </div>
                                ))}
                                <button className="builder-button secondary"
                                  onClick={() =>
                                    updateCurrentQuestion((prevQ) => {
                                      const nextPayload = { ...(payload as any) };
                                      const ladder = [...(nextPayload.ladder ?? [])];
                                      ladder.push({ label: 'Stufe', acceptedAnswers: [], points: 0 });
                                      nextPayload.ladder = ladder;
                                      return { ...(prevQ as any), bunteTuete: nextPayload };
                                    })
                                  }
                                >
                                  Stufe hinzufuegen
                                </button>
                              </div>
                            )}
                            {payload.kind === 'oneOfEight' && (
                              <div style={{ display: 'grid', gap: 8 }}>
                                <div style={{ fontWeight: 600 }}>Aussagen (1 falsch)</div>
                                {payload.statements?.map((statement: any, idx: number) => (
                                  <label
                                    key={statement.id ?? `${base.id}-stmt-${idx}`}
                                    style={{ display: 'grid', gap: 6, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}
                                  >
                                    <input
                                      value={statement.text ?? ''}
                                      placeholder={`Aussage ${idx + 1}`}
                                      onChange={(e) =>
                                        updateCurrentQuestion((prevQ) => {
                                          const nextPayload = { ...(payload as any) };
                                          const statements = [...(nextPayload.statements ?? [])];
                                          statements[idx] = { ...statements[idx], text: e.target.value };
                                          nextPayload.statements = statements;
                                          return { ...(prevQ as any), bunteTuete: nextPayload };
                                        })
                                      }
                                      style={{ padding: 8, borderRadius: 6 }}
                                    />
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(statement.isFalse)}
                                        onChange={(e) =>
                                          updateCurrentQuestion((prevQ) => {
                                            const nextPayload = { ...(payload as any) };
                                            const statements = [...(nextPayload.statements ?? [])];
                                            statements[idx] = { ...statements[idx], isFalse: e.target.checked };
                                            nextPayload.statements = statements;
                                            return { ...(prevQ as any), bunteTuete: nextPayload };
                                          })
                                        }
                                      />
                                      Falsche Aussage
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <details style={{ display: 'grid', gap: 6 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Advanced JSON</summary>
                    <textarea
                      rows={10}
                      value={JSON.stringify(currentQuestion, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateDraft((prev) => updateQuestionArray(prev, selectedSlot, () => parsed));
                          setError('');
                        } catch {
                          setError('JSON Parser Fehler');
                        }
                      }}
                      style={{ padding: 8, borderRadius: 6, fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </details>
                </div>
              </section>
            )}
            {tab === 'blitz' && (
              <section className="builder-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <strong>Fotoblitz Themes</strong>
                  <button className="builder-button secondary"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        blitz: { pool: [...(prev.blitz?.pool ?? []), createBlankTheme(prev.blitz?.pool ?? [])] }
                      }))
                    }
                  >
                    Add Theme
                  </button>
                </div>
                {(draft.blitz?.pool ?? []).map((theme, idx) => (
                  <div key={theme.id} className="builder-card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px' }}>
                        Titel
                        <input
                          value={theme.title}
                          onChange={(e) => updateBlitzTheme(idx, (prevTheme) => ({ ...prevTheme, title: e.target.value }))}
                          style={{ padding: 6, borderRadius: 6 }}
                        />
                      </label>
                        <button className="builder-button secondary"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              blitz: { pool: (prev.blitz?.pool ?? []).filter((_, poolIdx) => poolIdx !== idx) }
                            }))
                          }
                        >
                          Entfernen
                        </button>
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                      {theme.items.map((item, itemIdx) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 8,
                              padding: 10,
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.08)'
                            }}
                          >
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            Prompt
                            <input
                              value={item.prompt ?? ''}
                              onChange={(e) =>
                                updateBlitzItem(idx, itemIdx, (prevItem) => ({ ...prevItem, prompt: e.target.value }))
                              }
                              style={{ padding: 6, borderRadius: 6 }}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            Media URL
                            <input
                              value={item.mediaUrl ?? ''}
                              onChange={(e) =>
                                updateBlitzItem(idx, itemIdx, (prevItem) => ({ ...prevItem, mediaUrl: e.target.value }))
                              }
                              style={{ padding: 6, borderRadius: 6 }}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            Antwort
                            <input
                              value={item.answer ?? ''}
                              onChange={(e) =>
                                updateBlitzItem(idx, itemIdx, (prevItem) => ({ ...prevItem, answer: e.target.value }))
                              }
                              style={{ padding: 6, borderRadius: 6 }}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            Aliases (comma)
                            <input
                              value={toCommaList(item.aliases)}
                              onChange={(e) =>
                                updateBlitzItem(idx, itemIdx, (prevItem) => ({ ...prevItem, aliases: fromCommaList(e.target.value) }))
                              }
                              style={{ padding: 6, borderRadius: 6 }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                    <details className="builder-card" style={{ marginTop: 10 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Advanced JSON</summary>
                      <textarea
                        rows={6}
                        value={JSON.stringify(theme.items, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateBlitzTheme(idx, (prevTheme) => ({ ...prevTheme, items: parsed }));
                            setError('');
                          } catch {
                            setError('Ungueltiges Blitz JSON');
                          }
                        }}
                        style={{ padding: 6, borderRadius: 6, marginTop: 6, fontFamily: 'monospace' }}
                      />
                    </details>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const createBlankTheme = (existing: QuizBlitzTheme[]): QuizBlitzTheme => {
  const baseId = `builder-theme-${existing.length + 1}`;
  return {
    id: baseId,
    title: `Thema ${existing.length + 1}`,
    items: Array.from({ length: 5 }).map((_, idx) => ({
      id: `${baseId}-${idx + 1}`,
      prompt: `Motiv ${idx + 1}`,
      answer: '',
      aliases: []
    }))
  };
};

export default Cozy60BuilderPage;
