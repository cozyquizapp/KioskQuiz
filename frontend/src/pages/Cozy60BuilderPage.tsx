
import { useEffect, useMemo, useState } from 'react';
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

type TabKey = 'meta' | 'questions' | 'blitz' | 'potato';

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

  const currentQuestion = draft?.questions[selectedSlot];
  const currentSlot = useMemo(() => COZY_SLOT_TEMPLATE[selectedSlot] ?? COZY_SLOT_TEMPLATE[0], [selectedSlot]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      <aside style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.08)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Cozy Drafts</strong>
          <button onClick={handleCreate}>Neu</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {draftSummaries.map((summary) => (
            <button
              key={summary.id}
              onClick={() => loadDraft(summary.id)}
              style={{
                textAlign: 'left',
                padding: 8,
                borderRadius: 6,
                border: selectedDraftId === summary.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                background: selectedDraftId === summary.id ? 'rgba(56,189,248,0.12)' : 'transparent',
                color: 'inherit'
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
      <main style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        {!draft ? (
          <div>Draft wird geladen ...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {(['meta', 'questions', 'blitz', 'potato'] as TabKey[]).map((entry) => (
                <button
                  key={entry}
                  onClick={() => setTab(entry)}
                  style={{
                    borderBottom: tab === entry ? '2px solid #38bdf8' : '2px solid transparent',
                    paddingBottom: 6
                  }}
                >
                  {entry === 'meta' && 'Meta'}
                  {entry === 'questions' && 'Fragen'}
                  {entry === 'blitz' && 'Blitz'}
                  {entry === 'potato' && 'Potato'}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={handleSave}>Speichern</button>
                <button onClick={handlePublish}>Publish</button>
              </div>
            </div>
            {tab === 'meta' && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
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
                  <div style={{ background: 'rgba(248,113,113,0.15)', borderRadius: 8, padding: 12 }}>
                    <strong>Warnings</strong>
                    <ul>
                      {warnings.map((warn) => (
                        <li key={warn}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
            {tab === 'questions' && currentQuestion && (
              <section style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 12 }}>
                  {draft.questions.map((question, idx) => (
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
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{question.mechanic}</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <strong>Frage {selectedSlot + 1}</strong>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{currentSlot.label}</div>
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
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Rohdaten (JSON)
                    <textarea
                      rows={12}
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
                  </label>
                </div>
              </section>
            )}
            {tab === 'blitz' && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <strong>Blitz Themes</strong>
                  <button
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
                  <div key={theme.id} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Titel
                      <input
                        value={theme.title}
                        onChange={(e) => {
                          const next = (draft.blitz?.pool ?? []).slice();
                          next[idx] = { ...theme, title: e.target.value };
                          updateDraft((prev) => ({ ...prev, blitz: { pool: next } }));
                        }}
                        style={{ padding: 6, borderRadius: 6 }}
                      />
                    </label>
                    <textarea
                      rows={6}
                      value={JSON.stringify(theme.items, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          const next = (draft.blitz?.pool ?? []).slice();
                          next[idx] = { ...theme, items: parsed };
                          updateDraft((prev) => ({ ...prev, blitz: { pool: next } }));
                          setError('');
                        } catch {
                          setError('Ungueltiges Blitz JSON');
                        }
                      }}
                      style={{ padding: 6, borderRadius: 6, marginTop: 6, fontFamily: 'monospace' }}
                    />
                  </div>
                ))}
              </section>
            )}
            {tab === 'potato' && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Potato Themen (ein Thema pro Zeile)
                  <textarea
                    rows={12}
                    value={draft.potatoPool.join('\n')}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        potatoPool: Array.from(
                          new Set(
                            e.target.value
                              .split(/\\r?\\n/)
                              .map((entry) => entry.trim())
                              .filter(Boolean)
                          )
                        )
                      }))
                    }
                    style={{ padding: 8, borderRadius: 6 }}
                  />
                </label>
                <small>
                  {draft.potatoPool.length} Themen - Empfehlung {'>= 14'}
                </small>
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
