import React, { useEffect, useState } from 'react';
import { CozyQuizDraft, Language, AnyQuestion, CozyQuestionSlotTemplate } from '@shared/quizTypes';
import {
  listCozyDrafts,
  fetchCozyDraft,
  saveCozyDraft,
  publishCozyDraft,
  CozyDraftSummary,
  createCozyDraft,
  duplicateCozyDraft
} from '../api';
import KanbanBoard from '../components/KanbanBoard';
import { BlitzEditor } from '../components/BlitzEditor';
import { RundlaufEditor } from '../components/RundlaufEditor';
import { QuestionCatalog } from '../components/QuestionCatalog';
import { ThemeCustomizer } from '../components/ThemeCustomizer';
import { MECHANIC_RULES } from '../config/mechanicRules';
import { COZY_SLOT_TEMPLATE } from '@shared/cozyTemplate';

const LOCAL_BACKUP_KEY = 'cozy-builder-draft';
const LOCAL_BACKUP_TS_KEY = 'cozy-builder-timestamp';

const summarizeDraft = (draft: CozyQuizDraft): CozyDraftSummary => ({
  id: draft.id,
  title: draft.meta.title,
  language: draft.meta.language,
  date: draft.meta.date ?? null,
  status: draft.status ?? 'draft',
  updatedAt: draft.updatedAt,
  createdAt: draft.createdAt,
  questionCount: draft.questions.length,
  potatoCount: draft.potatoPool?.length ?? 0,
  blitzThemes: draft.blitz?.pool?.length ?? 0
});

const draftSignature = (draft: CozyQuizDraft) => JSON.stringify(draft);

const toCozyDraftErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('mongodb nicht verbunden') || normalized.includes('503')) {
    return 'MongoDB ist aktuell nicht verbunden. Dein Draft wurde nicht auf dem Server gespeichert.';
  }
  return message;
};

const ImprovedCozy60BuilderPage = () => {
  const [drafts, setDrafts] = useState<CozyDraftSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CozyQuizDraft | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tab, setTab] = useState<'board' | 'meta' | 'blitz' | 'rundlauf' | 'catalog' | 'help' | 'theme'>('board');
  const [showCatalog, setShowCatalog] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [restoredFromLocal, setRestoredFromLocal] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null);
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null);
  const [catalogOnlyMatching, setCatalogOnlyMatching] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [lastPersistedSignature, setLastPersistedSignature] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const slotCategoryMap: Record<CozyQuestionSlotTemplate['type'], AnyQuestion['category']> = {
    MU_CHO: 'Mu-Cho',
    SCHAETZCHEN: 'Schaetzchen',
    STIMMTS: 'Stimmts',
    CHEESE: 'Cheese',
    BUNTE_TUETE: 'GemischteTuete'
  };

  const isPlaceholder = (question: AnyQuestion, idx: number) => {
    const slot = COZY_SLOT_TEMPLATE[idx] || COZY_SLOT_TEMPLATE[0];
    const text = (question.question || '').trim().toLowerCase();
    if (!text) return true;
    if (text === slot.label.trim().toLowerCase()) return true;
    if (text === `frage ${idx + 1}`) return true;
    return false;
  };

  const matchesSlot = (question: AnyQuestion, slotIndex: number) => {
    const slot = COZY_SLOT_TEMPLATE[slotIndex] || COZY_SLOT_TEMPLATE[0];
    const expectedCategory = slotCategoryMap[slot.type];
    if (question.category !== expectedCategory) return false;

    const typeByMechanic: Record<string, CozyQuestionSlotTemplate['type']> = {
      multipleChoice: 'MU_CHO',
      estimate: 'SCHAETZCHEN',
      betting: 'STIMMTS',
      trueFalse: 'STIMMTS',
      imageQuestion: 'CHEESE',
      sortItems: 'BUNTE_TUETE'
    };

    const normalizedType = question.type || typeByMechanic[question.mechanic] || null;
    if (normalizedType !== slot.type) return false;

    if (slot.type === 'BUNTE_TUETE' && slot.bunteKind) {
      const kind = (question as any).bunteTuete?.kind;
      return !kind || kind === slot.bunteKind;
    }

    return true;
  };

  const normalizeQuestionForSlot = (question: AnyQuestion, slotIndex: number): AnyQuestion => {
    const slot = COZY_SLOT_TEMPLATE[slotIndex] || COZY_SLOT_TEMPLATE[0];
    return {
      ...question,
      category: slotCategoryMap[slot.type],
      type: slot.type,
      points: slot.defaultPoints,
      segmentIndex: slot.segmentIndex
    } as AnyQuestion;
  };

  const insertQuestionIntoSlot = (question: AnyQuestion, slotIndex: number) => {
    if (!draft) return;
    if (!matchesSlot(question, slotIndex)) {
      alert(`Frage passt nicht zu Slot ${slotIndex + 1}.`);
      return;
    }

    const updatedQuestions = [...draft.questions];
    updatedQuestions[slotIndex] = normalizeQuestionForSlot(question, slotIndex);
    setDraft({ ...draft, questions: updatedQuestions });
  };

  const insertQuestionIntoNextFreeSlot = (question: AnyQuestion) => {
    if (!draft) return;

    const match = draft.questions
      .map((existing, idx) => ({ existing, idx }))
      .find(({ existing, idx }) => isPlaceholder(existing, idx) && matchesSlot(question, idx));

    if (!match) {
      alert('Kein passender freier Slot gefunden.');
      return;
    }

    insertQuestionIntoSlot(question, match.idx);
    setFocusedSlotIndex(match.idx);
  };

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 0) return `${mins} min ${secs}s`;
    return `${secs}s`;
  };

  const loadDraft = async (draftId: string) => {
    try {
      const data = await fetchCozyDraft(draftId);
      setDraft(data.draft);
      setLastPersistedSignature(draftSignature(data.draft));
      setIsDirty(false);
      setSelectedDraftId(draftId);
      setStatus('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const loadDrafts = async () => {
    try {
      const data = await listCozyDrafts();
      const deduped = Array.from(new Map(data.drafts.map((d) => [d.id, d])).values());
      setDrafts(deduped);
      setIsOffline(data.offline || false);
      if (data.offlineReason) {
        setError(toCozyDraftErrorMessage(data.offlineReason));
      } else {
        setError('');
      }

      const localRaw = localStorage.getItem(LOCAL_BACKUP_KEY);
      // Clear stale localStorage backup if MongoDB is online (prevent accidental restore)
      if (!data.offline) {
        localStorage.removeItem(LOCAL_BACKUP_KEY);
        localStorage.removeItem(LOCAL_BACKUP_TS_KEY);
      }

      const localTs = localStorage.getItem(LOCAL_BACKUP_TS_KEY);
      if (localRaw && !restoredFromLocal && data.offline) {
        try {
          const localDraft = JSON.parse(localRaw) as CozyQuizDraft;
          const tsNum = localTs ? Number(localTs) : null;
          const age = tsNum ? formatRelative(tsNum) : 'unbekannt';
          const accept = window.confirm(`Lokaler Entwurf gefunden (vor ${age} gespeichert). Wiederherstellen?`);
          if (accept) {
            setDraft(localDraft);
            setSelectedDraftId(localDraft.id);
            setStatus('✓ Lokaler Entwurf wiederhergestellt');
            setRestoredFromLocal(true);
            setLastPersistedSignature(null);
            setIsDirty(true);
            localStorage.removeItem(LOCAL_BACKUP_KEY);
            localStorage.removeItem(LOCAL_BACKUP_TS_KEY);
            return;
          }
          localStorage.removeItem(LOCAL_BACKUP_KEY);
          localStorage.removeItem(LOCAL_BACKUP_TS_KEY);
        } catch {
          // Ignoriere fehlerhafte Backups
        }
      }

      if (data.drafts.length > 0 && !selectedDraftId) {
        await loadDraft(data.drafts[0].id);
      }
    } catch (err) {
      setError(toCozyDraftErrorMessage((err as Error).message));
    }
  };

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    localStorage.removeItem(LOCAL_BACKUP_KEY);
    localStorage.removeItem(LOCAL_BACKUP_TS_KEY);
    setStatus('✨ Neues Quiz erstellt...');
    try {
      const data = await createCozyDraft();
      setDrafts((prev) => [data.draft, ...prev.filter((d) => d.id !== data.draft.id)]);
      setDraft(data.draft);
      setLastPersistedSignature(draftSignature(data.draft));
      setIsDirty(false);
      setSelectedDraftId(data.draft.id);
      setStatus('✓ Bereit zum Bearbeiten!');
      setShowCreateDialog(false);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(toCozyDraftErrorMessage((err as Error).message));
      setStatus('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (sourceDraftId: string) => {
    if (isCreating) return;
    setIsCreating(true);
    setStatus('🔄 Quiz wird kopiert...');
    const newTitle = `Kopie von ${drafts.find(d => d.id === sourceDraftId)?.title || 'Quiz'}`;
    try {
      const data = await duplicateCozyDraft(sourceDraftId, newTitle);
      setDrafts((prev) => [data.draft, ...prev]);
      setDraft(data.draft);
      setLastPersistedSignature(draftSignature(data.draft));
      setIsDirty(false);
      setSelectedDraftId(data.draft.id);
      setStatus('✓ Quiz erfolgreich kopiert!');
      setShowCreateDialog(false);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      const offlineLikely = isOffline || typeof navigator !== 'undefined' && !navigator.onLine;
      const isNetworkErr = err instanceof Error && err.message && err.message.toLowerCase().includes('fetch');
      const canUseLocal = draft && draft.id === sourceDraftId;

      if ((offlineLikely || isNetworkErr) && canUseLocal && draft) {
        const now = Date.now();
        const cloned: CozyQuizDraft = {
          ...JSON.parse(JSON.stringify(draft)),
          id: `local-dup-${Math.random().toString(36).slice(2, 10)}`,
          meta: { ...draft.meta, title: newTitle },
          status: 'draft',
          createdAt: now,
          updatedAt: now,
          lastPublishedAt: undefined
        };

        setDrafts((prev) => [summarizeDraft(cloned), ...prev]);
        setDraft(cloned);
        setLastPersistedSignature(null);
        setIsDirty(true);
        setSelectedDraftId(cloned.id);
        setStatus('✓ Offline kopiert (lokal gespeichert)');
        setShowCreateDialog(false);
        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(cloned));
        localStorage.setItem(LOCAL_BACKUP_TS_KEY, String(now));
        setTimeout(() => setStatus(''), 3000);
        return;
      }

      setError(toCozyDraftErrorMessage((err as Error).message));
      setStatus('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!draft || !isDirty || isSaving) return;
    setIsSaving(true);
    setStatus('Speichere...');
    try {
      const response = await saveCozyDraft(draft.id, draft);
      setDraft(response.draft);
      setLastPersistedSignature(draftSignature(response.draft));
      setIsDirty(false);
      await loadDrafts();
      setStatus('✓ Gespeichert');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      setError(toCozyDraftErrorMessage((err as Error).message));
      setStatus('');
    } finally {
      setIsSaving(false);
    }
  };

  const validateDraft = (currentDraft: CozyQuizDraft): string[] => {
    const errors: string[] = [];

    const emptySlots = currentDraft.questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => !q.question || q.question === `Frage ${i + 1}`);
    if (emptySlots.length > 0) {
      errors.push(`❌ ${emptySlots.length} leere Slots: ${emptySlots.map(s => `#${s.i + 1}`).join(', ')}`);
    }

    const questionTexts = currentDraft.questions.map(q => q.question.toLowerCase());
    const duplicates = questionTexts.filter((q, i) => questionTexts.indexOf(q) !== i);
    if (duplicates.length > 0) {
      errors.push(`⚠️ ${duplicates.length} doppelte Fragen gefunden`);
    }

    if (!currentDraft.blitz?.pool || currentDraft.blitz.pool.length === 0) {
      errors.push('❌ Fotosprint: Keine Themes vorhanden');
    } else {
      const emptyThemes = currentDraft.blitz.pool.filter((t) => !t.items || t.items.length === 0);
      if (emptyThemes.length > 0) {
        errors.push(`❌ Fotosprint: ${emptyThemes.length} leere Themes`);
      }
    }

    if (!currentDraft.rundlauf?.pool || currentDraft.rundlauf.pool.length === 0) {
      errors.push('❌ K.O.-Rallye: Keine Kategorien konfiguriert');
    }

    return errors;
  };

  const getQuizProgress = (currentDraft: CozyQuizDraft): { filled: number; total: number; percent: number } => {
    const total = currentDraft.questions.length || 60;
    const filled = currentDraft.questions.reduce((acc, q, idx) => {
      const text = (q.question || '').trim();
      if (!text) return acc;
      const placeholder = text.toLowerCase() === `frage ${idx + 1}`.toLowerCase();
      return placeholder ? acc : acc + 1;
    }, 0);
    return { filled, total, percent: Math.round((filled / total) * 100) };
  };

  const buildChecklist = (currentDraft: CozyQuizDraft) => {
    const progress = getQuizProgress(currentDraft);
    const hasMeta = Boolean(currentDraft.meta.title?.trim());
    const hasBlitz = Boolean(currentDraft.blitz?.pool?.length) && currentDraft.blitz.pool.some((t) => (t.items?.length ?? 0) > 0);
    const hasRundlauf = Boolean(currentDraft.rundlauf?.pool?.length);

    return [
      { label: 'Titel & Sprache gesetzt', done: hasMeta },
      { label: '10 Fragen gefüllt', done: progress.filled >= 10 },
      { label: 'Fotosprint vorbereitet', done: hasBlitz },
      { label: 'K.O.-Rallye konfiguriert', done: hasRundlauf },
      { label: 'Alle Fragen fertig', done: progress.filled >= progress.total }
    ];
  };

  const getMedal = (percent: number) => {
    if (percent >= 100) return { label: '🏆 Gold', color: '#fbbf24' };
    if (percent >= 60) return { label: '🥈 Silber', color: '#cbd5e1' };
    if (percent >= 30) return { label: '🥉 Bronze', color: '#f59e0b' };
    return { label: '🌱 Start', color: '#4ade80' };
  };

  const progress = draft ? getQuizProgress(draft) : { filled: 0, total: 60, percent: 0 };
  const checklist = draft ? buildChecklist(draft) : [];
  const medal = getMedal(progress.percent);

  const handlePublish = async () => {
    if (!draft) return;

    const validationErrors = validateDraft(draft);
    if (validationErrors.length > 0) {
      const confirmMsg = `⚠️ Es wurden Probleme gefunden:\n\n${validationErrors.join('\n')}\n\nTrotzdem veröffentlichen?`;
      if (!window.confirm(confirmMsg)) return;
    } else {
      const confirmed = window.confirm(`🚀 Quiz "${draft.meta.title}" veröffentlichen?\n\nDies macht das Quiz für alle Spieler verfügbar.`);
      if (!confirmed) return;
    }

    setStatus('Veröffentliche...');
    try {
      const response = await publishCozyDraft(draft.id, { draft });
      setDraft(response.draft);
      setLastPersistedSignature(draftSignature(response.draft));
      setIsDirty(false);
      await loadDrafts();
      setStatus(`✓ Veröffentlicht als ${response.quizId}`);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(toCozyDraftErrorMessage((err as Error).message));
      setStatus('');
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  useEffect(() => {
    if (!draft) return;
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(draft));
        localStorage.setItem(LOCAL_BACKUP_TS_KEY, Date.now().toString());
        setLastAutoSave(Date.now());
        setStatus((prev) => (prev ? prev : 'Auto-Save ausgeführt'));
      } catch (err) {
        // Auto-save failed silently
      }
    }, 1000);
    return () => clearTimeout(handle);
  }, [draft]);

  useEffect(() => {
    if (!draft) {
      setIsDirty(false);
      return;
    }
    if (!lastPersistedSignature) {
      setIsDirty(true);
      return;
    }
    setIsDirty(draftSignature(draft) !== lastPersistedSignature);
  }, [draft, lastPersistedSignature]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
      if (!isSaveCombo) return;
      event.preventDefault();
      handleSave();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
      <div style={containerStyle} className="tool-page">
        <aside style={sidebarStyle} className="tool-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 14 }}>Quiz Drafts</strong>
              {isOffline && (
                <span style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  background: 'rgba(248,113,113,0.2)',
                  color: '#fca5a5',
                  borderRadius: 4
                }}>
                  📡 Offline
                </span>
              )}
            </div>
            <button onClick={() => setShowCreateDialog(true)} style={buttonPrimaryStyle} disabled={isCreating}>
              + Neu
            </button>
          </div>

          <div style={draftListStyle}>
            {drafts.length === 0 ? (
              <div style={{
                padding: 12,
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 12,
                lineHeight: 1.5
              }}>
                {isOffline ? (
                  <>
                    <div>📡 Offline – Keine Drafts im Cache</div>
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                      Bitte Backend verbinden oder klicke „+ Neu"
                    </div>
                  </>
                ) : (
                  <>
                    <div>Noch keine Drafts</div>
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                      Klicke „+ Neu" um einen neuen Draft zu erstellen
                    </div>
                  </>
                )}
              </div>
            ) : (
              drafts.map((d) => (
                <div
                  key={d.id}
                  style={{
                    ...draftItemStyle,
                    borderColor: selectedDraftId === d.id ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.08)',
                    background: selectedDraftId === d.id ? 'rgba(34,211,238,0.1)' : 'rgba(15,23,42,0.5)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <button
                    onClick={() => loadDraft(d.id)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, display: 'flex', gap: 8 }}>
                      <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ color: '#22d3ee', fontWeight: 500 }}>
                        {draft?.id === d.id ? `${getQuizProgress(draft).filled}/${getQuizProgress(draft).total} Fragen` : `${d.questionCount || 0}/60`}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${d.title}" wirklich löschen?`)) {
                        const updated = drafts.filter((draft) => draft.id !== d.id);
                        setDrafts(updated);
                        localStorage.setItem('cozyQuizDrafts', JSON.stringify(updated));
                        if (selectedDraftId === d.id) {
                          setSelectedDraftId(null);
                          setDraft(null);
                        }
                        setStatus('Draft gelöscht');
                      }
                    }}
                    style={{
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      borderRadius: 4,
                      padding: '4px 8px',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: 12,
                      marginLeft: 8,
                      whiteSpace: 'nowrap'
                    }}
                    title="Draft löschen"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          {status && (
            <div style={{ marginTop: 12, color: '#22d3ee', fontSize: 12, lineHeight: 1.4 }}>{status}</div>
          )}
          {error && (
            <div style={{ marginTop: 8, color: '#f87171', fontSize: 12, lineHeight: 1.4 }}>{error}</div>
          )}
        </aside>

        <main style={mainStyle} className="page-transition-enter-active">
          {!draft ? (
            <div style={{ padding: 32, color: '#94a3b8', display: 'grid', gap: 10, maxWidth: 520 }}>
              Bitte ein Draft auswählen oder neu erstellen.
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
            </div>
          ) : (
            <>
              <header style={headerStyle}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{draft.meta.title || 'Unbenanntes Quiz'}</h2>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
                    <span>ID: {draft.id}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: isDirty ? '1px solid rgba(251,146,60,0.45)' : '1px solid rgba(34,197,94,0.4)',
                        background: isDirty ? 'rgba(251,146,60,0.18)' : 'rgba(34,197,94,0.15)',
                        color: isDirty ? '#fdba74' : '#86efac',
                        fontWeight: 700
                      }}
                      title={isDirty ? 'Es gibt ungespeicherte Aenderungen' : 'Alle Aenderungen sind gespeichert'}
                    >
                      {isDirty ? 'Nicht gespeichert' : 'Gespeichert'}
                    </span>
                    {restoredFromLocal && <span style={{ color: '#4ade80' }}>Lokaler Restore aktiv</span>}
                    {lastAutoSave && (
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>
                        💾 Gespeichert: {new Date(lastAutoSave).toLocaleTimeString()}
                      </span>
                    )}
                    {status && <span style={{ color: '#22d3ee' }}>{status}</span>}
                    {error && <span style={{ color: '#f87171' }}>{error}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setShowPreview(true)} style={buttonSecondaryStyle} className="tap-squish">👀 Vorschau</button>
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    style={{
                      ...buttonSuccessStyle,
                      opacity: !isDirty || isSaving ? 0.6 : 1,
                      cursor: !isDirty || isSaving ? 'not-allowed' : 'pointer'
                    }}
                    className="tap-squish"
                    title={!isDirty ? 'Keine ungespeicherten Aenderungen' : 'Aenderungen speichern'}
                  >
                    {isSaving ? '⏳ Speichere...' : isDirty ? '💾 Speichern *' : '💾 Gespeichert'}
                  </button>
                  <button onClick={handlePublish} style={buttonPrimaryStyle} className="tap-squish">🚀 Publish</button>
                </div>
              </header>

              <div
                style={{
                  margin: '12px 16px 0',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
                      Fortschritt: {progress.filled}/{progress.total} Fragen
                    </div>
                    <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                          background: 'linear-gradient(90deg, #22d3ee, #818cf8)',
                          borderRadius: 999,
                          boxShadow: '0 0 12px rgba(34,211,238,0.35)'
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(15,23,42,0.7)',
                      color: medal.color,
                      fontWeight: 700,
                      fontSize: 13
                    }}
                    title={`Meilenstein bei ${progress.percent}%`}
                  >
                    {medal.label}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: item.done ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.06)',
                        border: item.done ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(148,163,184,0.15)',
                        color: item.done ? '#bbf7d0' : '#cbd5e1',
                        fontSize: 12
                      }}
                    >
                      <span>{item.done ? '✅' : '⬜'}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={tabsStyle}>
                <button
                  onClick={() => setTab('board')}
                  style={{
                    ...tabButtonStyle,
                    borderBottomColor: tab === 'board' ? '#22d3ee' : 'transparent',
                    color: tab === 'board' ? '#22d3ee' : '#94a3b8'
                  }}
                >
                  📋 Kanban-Board
                </button>
                <button
                  onClick={() => setTab('meta')}
                  style={{
                    ...tabButtonStyle,
                    borderBottomColor: tab === 'meta' ? '#22d3ee' : 'transparent',
                    color: tab === 'meta' ? '#22d3ee' : '#94a3b8'
                  }}
                >
                  ⚙️ Meta
                </button>
                <button
                  onClick={() => setTab('blitz')}
                  style={{
                    ...tabButtonStyle,
                    borderBottomColor: tab === 'blitz' ? '#22d3ee' : 'transparent',
                    color: tab === 'blitz' ? '#22d3ee' : '#94a3b8'
                  }}
                >
                  ⚡ Fotosprint
                </button>
                <button
                  onClick={() => setTab('rundlauf')}
                  style={{
                    ...tabButtonStyle,
                    borderBottomColor: tab === 'rundlauf' ? '#22d3ee' : 'transparent',
                    color: tab === 'rundlauf' ? '#22d3ee' : '#94a3b8'
                  }}
                >
                  🏃 K.O.-Rallye
                </button>
                <button
                  onClick={() => setTab('help')}
                  style={{
                    ...tabButtonStyle,
                    borderBottomColor: tab === 'help' ? '#22d3ee' : 'transparent',
                    color: tab === 'help' ? '#22d3ee' : '#94a3b8'
                  }}
                >
                  ❓ Mechaniken
                </button>
                <button
                  onClick={() => setTab('theme')}
                  style={{
                    ...tabButtonStyle,
                    borderBottomColor: tab === 'theme' ? '#22d3ee' : 'transparent',
                    color: tab === 'theme' ? '#22d3ee' : '#94a3b8'
                  }}
                >
                  🎨 Themes
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowCatalog(!showCatalog)}
                    style={{
                      ...tabButtonStyle,
                      color: showCatalog ? '#4ade80' : '#94a3b8'
                    }}
                  >
                    {showCatalog ? '📚 Katalog an' : '📚 Katalog aus'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: showCatalog ? 2 : 1, overflow: 'auto' }}>
                  {tab === 'board' && (
                    <KanbanBoard
                      draft={draft}
                      onUpdate={(updated: CozyQuizDraft) => setDraft(updated)}
                      onSlotFocus={(slotIndex) => setFocusedSlotIndex(slotIndex)}
                    />
                  )}

                  {tab === 'meta' && (
                    <div style={{ padding: 16 }}>
                      <h3 style={{ marginTop: 0 }}>Quiz Metadaten</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Titel</label>
                          <input
                            value={draft.meta.title}
                            onChange={(e) => setDraft(prev => prev ? { ...prev, meta: { ...prev.meta, title: e.target.value } } : prev)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Sprache</label>
                          <select
                            value={draft.meta.language}
                            onChange={(e) => setDraft(prev => prev ? { ...prev, meta: { ...prev.meta, language: e.target.value as Language } } : prev)}
                            style={inputStyle}
                          >
                            <option value="de">Deutsch</option>
                            <option value="en">English</option>
                            <option value="both">Beide Sprachen</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <label style={labelStyle}>Beschreibung</label>
                        <textarea
                          value={draft.meta.description || ''}
                          onChange={(e) => setDraft(prev => prev ? { ...prev, meta: { ...prev.meta, description: e.target.value } } : prev)}
                          style={{ ...inputStyle, minHeight: 100, resize: 'vertical' } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  )}

                  {tab === 'blitz' && (
                    <BlitzEditor
                      themes={draft.blitz?.pool || []}
                      onChange={(themes) => {
                        setDraft(prev => prev ? {
                          ...prev,
                          blitz: { ...prev.blitz, pool: themes }
                        } : prev);
                      }}
                    />
                  )}

                  {tab === 'rundlauf' && (
                    <RundlaufEditor
                      config={draft.rundlauf || { pool: [], turnDurationMs: 30000, pointsWinner: 3, pointsTie: 1 }}
                      onChange={(config) => {
                        setDraft(prev => prev ? { ...prev, rundlauf: config } : prev);
                      }}
                    />
                  )}

                  {tab === 'help' && (
                    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
                      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
                        📖 Mechaniken-Übersicht
                      </h2>

                      {Object.values(MECHANIC_RULES).map((rule) => (
                        <div key={rule.category} style={{
                          background: 'rgba(15,23,42,0.6)',
                          border: '1px solid rgba(148,163,184,0.2)',
                          borderRadius: 12,
                          padding: 20,
                          marginBottom: 16
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ fontSize: 32 }}>{rule.icon}</div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                                {rule.category}
                              </h3>
                              <div style={{ fontSize: 12, opacity: 0.6 }}>
                                Typ: {rule.type} • Mechanik: {rule.mechanic}
                              </div>
                            </div>
                          </div>

                          <p style={{ margin: '0 0 12px 0', fontSize: 14 }}>
                            {rule.description}
                          </p>

                          <div style={{ marginBottom: 12 }}>
                            <strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Regeln:</strong>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
                              {rule.rules.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>

                          <div style={{
                            background: 'rgba(30,41,59,0.6)',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 12
                          }}>
                            <strong style={{ display: 'block', marginBottom: 8, opacity: 0.8 }}>
                              Beispiel:
                            </strong>
                            <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.5, overflow: 'auto' }}>
                              {JSON.stringify((rule as any).example, null, 2)}
                            </pre>
                          </div>

                          {(rule as any).subMechanics && (
                            <div style={{ marginTop: 16 }}>
                              <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                                Unter-Mechaniken:
                              </strong>
                              {(rule as any).subMechanics.map((sub: any) => (
                                <div key={sub.kind} style={{
                                  background: 'rgba(30,41,59,0.6)',
                                  borderRadius: 8,
                                  padding: 12,
                                  marginBottom: 8
                                }}>
                                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
                                    {sub.label}
                                  </div>
                                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                                    {sub.description}
                                  </div>
                                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.5 }}>
                                    {sub.rules.map((r: string, i: number) => (
                                      <li key={i}>{r}</li>
                                    ))}
                                  </ul>
                                  <div style={{
                                    background: 'rgba(15,23,42,0.4)',
                                    borderRadius: 6,
                                    padding: 8,
                                    marginTop: 8
                                  }}>
                                    <pre style={{ margin: 0, fontSize: 10, lineHeight: 1.4, overflow: 'auto' }}>
                                      {JSON.stringify(sub.example, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'theme' && (
                    <div style={{ padding: 0, maxWidth: 600, margin: 0 }}>
                      <ThemeCustomizer />
                    </div>
                  )}
                </div>

                {showCatalog && tab === 'board' && (
                  <div style={{ width: 400, borderLeft: '1px solid rgba(148,163,184,0.2)', overflow: 'auto' }}>
                    <div
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(148,163,184,0.2)',
                        background: 'rgba(15,23,42,0.4)',
                        display: 'grid',
                        gap: 8
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          {focusedSlotIndex !== null
                            ? `🎯 Markierter Slot: #${focusedSlotIndex + 1}`
                            : '🎯 Markiere einen Slot im Board fuer Fokus'}
                        </span>
                        {focusedSlotIndex !== null && (
                          <button
                            onClick={() => setFocusedSlotIndex(null)}
                            style={{
                              border: '1px solid rgba(148,163,184,0.45)',
                              background: 'rgba(15,23,42,0.6)',
                              color: '#cbd5e1',
                              borderRadius: 6,
                              padding: '2px 6px',
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            Fokus aus
                          </button>
                        )}
                      </div>
                      <label style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={catalogOnlyMatching}
                          onChange={(e) => setCatalogOnlyMatching(e.target.checked)}
                        />
                        Nur passende Fragen zum markierten Slot zeigen
                      </label>
                    </div>
                    <QuestionCatalog
                      onSelectQuestion={(q: AnyQuestion) => {
                        if (focusedSlotIndex !== null) {
                          insertQuestionIntoSlot(q, focusedSlotIndex);
                          return;
                        }
                        insertQuestionIntoNextFreeSlot(q);
                      }}
                      usedQuestionIds={draft?.questions.map(q => q.id) || []}
                      focusedSlotIndex={focusedSlotIndex}
                      onlyMatchingFocusedSlot={catalogOnlyMatching}
                      isQuestionMatchingFocusedSlot={(q) =>
                        focusedSlotIndex === null ? true : matchesSlot(q, focusedSlotIndex)
                      }
                      onInsertToFocusedSlot={(q) => {
                        if (focusedSlotIndex === null) return;
                        insertQuestionIntoSlot(q, focusedSlotIndex);
                      }}
                      onInsertToNextFree={(q) => insertQuestionIntoNextFreeSlot(q)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {showPreview && draft && (
          <div style={previewOverlayStyle} onClick={() => setShowPreview(false)}>
            <div style={previewModalStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Vorschau</h3>
                <button onClick={() => setShowPreview(false)} style={buttonSecondaryStyle}>Schließen</button>
              </div>
              <div style={{ maxHeight: '70vh', overflow: 'auto', display: 'grid', gap: 12 }}>
                <section style={previewSectionStyle}>
                  <h4 style={{ margin: '0 0 8px' }}>Fragen (20 Slots)</h4>
                  <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 4 }}>
                    {draft.questions.map((q, idx) => (
                      <li key={q.id || idx} style={{ fontSize: 13 }}>
                        <strong>#{idx + 1}</strong> [{q.category}] ({q.points} pts): {q.question || 'Leer'}
                      </li>
                    ))}
                  </ul>
                </section>

                <section style={previewSectionStyle}>
                  <h4 style={{ margin: '0 0 8px' }}>Fotosprint</h4>
                  {draft.blitz?.pool?.length ? (
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 4 }}>
                      {draft.blitz.pool.map((t, i) => (
                        <li key={i} style={{ fontSize: 13 }}>
                          <strong>{t.title || 'Theme'}</strong> – {t.items?.length || 0} Bilder
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>Keine Themes angelegt.</p>
                  )}
                </section>

                <section style={previewSectionStyle}>
                  <h4 style={{ margin: '0 0 8px' }}>K.O.-Rallye</h4>
                  {draft.rundlauf?.pool?.length ? (
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 4 }}>
                      {draft.rundlauf.pool.map((t, i) => (
                        <li key={i} style={{ fontSize: 13 }}>
                          <strong>{typeof t === 'string' ? t : t}</strong> – Kategorie
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>Keine Kategorien konfiguriert.</p>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {showCreateDialog && (
          <div style={previewOverlayStyle} onClick={() => !isCreating && setShowCreateDialog(false)}>
            <div
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                borderRadius: 12,
                padding: 28,
                width: 'min(500px, 90vw)',
                boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
                border: '1px solid rgba(34,211,238,0.3)',
                animation: 'slideUp 0.3s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 24px', textAlign: 'center', fontSize: 18 }}>🎯 Neues Quiz erstellen</h2>
              
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Option 1: Quick Start mit Demo */}
                <button
                  onClick={() => handleDuplicate('cozy-demo-schnellstart')}
                  disabled={isCreating}
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(34,211,238,0.1))',
                    border: '2px solid rgba(34,211,238,0.4)',
                    borderRadius: 8,
                    padding: 16,
                    textAlign: 'left',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.5 : 1,
                    transition: 'all 0.2s',
                    color: '#e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating) (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(34,211,238,0.2))';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(34,211,238,0.1))';
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>⚡ Quick Start – Demo kopieren</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8 }}>Starte mit dem vorgefertigten Probe-Quiz und passe es an</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 12 }}>
                    <span>✓ 5 Beispiel-Fragen</span>
                    <span>✓ Fotosprint & K.O.-Rallye</span>
                    <span>✓ Sofort spielbar</span>
                  </div>
                </button>

                {/* Option 2: Leeres Quiz */}
                <button
                  onClick={() => handleCreate()}
                  disabled={isCreating}
                  style={{
                    background: 'rgba(148,163,184,0.1)',
                    border: '2px solid rgba(148,163,184,0.3)',
                    borderRadius: 8,
                    padding: 16,
                    textAlign: 'left',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.5 : 1,
                    transition: 'all 0.2s',
                    color: '#e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating) (e.target as HTMLButtonElement).style.background = 'rgba(148,163,184,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(148,163,184,0.1)';
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📝 Von Grund auf – Leeres Quiz</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8 }}>Starte mit 60 leeren Slots und fülle alles selbst aus</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Für Profis die genau wissen was sie tun</div>
                </button>

                {/* Option 3: Von existierendem kopieren */}
                {drafts.filter(d => d.id !== 'cozy-demo-schnellstart').length > 0 && (
                  <button
                    onClick={() => handleDuplicate(drafts.find(d => d.id !== 'cozy-demo-schnellstart')?.id || '')}
                    disabled={isCreating}
                    style={{
                      background: 'rgba(167,139,250,0.1)',
                      border: '2px solid rgba(167,139,250,0.3)',
                      borderRadius: 8,
                      padding: 16,
                      textAlign: 'left',
                      cursor: isCreating ? 'not-allowed' : 'pointer',
                      opacity: isCreating ? 0.5 : 1,
                      transition: 'all 0.2s',
                      color: '#e2e8f0'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCreating) (e.target as HTMLButtonElement).style.background = 'rgba(167,139,250,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(167,139,250,0.1)';
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📋 Ähnliches kopieren</div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>Dupliziere "{drafts.find(d => d.id !== 'cozy-demo-schnellstart')?.title}" und passe es an</div>
                  </button>
                )}

                {/* Close button */}
                <button
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(148,163,184,0.3)',
                    borderRadius: 6,
                    padding: 10,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    color: '#94a3b8',
                    fontSize: 12,
                    opacity: isCreating ? 0.5 : 1
                  }}
                >
                  Abbrechen
                </button>
              </div>

              {/* Loading state */}
              {isCreating && (
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#cbd5e1' }}>
                  ⏳ {status}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

// Styles
const containerStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: 'var(--bg)',
  color: '#e2e8f0',
  fontFamily: 'var(--font)'
};

const sidebarStyle: React.CSSProperties = {
  width: 280,
  background: 'rgba(15,23,42,0.6)',
  borderRight: '1px solid rgba(255,255,255,0.08)',
  padding: 16,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  backdropFilter: 'blur(16px)'
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column'
};

const headerStyle: React.CSSProperties = {
  padding: '24px 32px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(15,23,42,0.5)',
  backdropFilter: 'blur(12px)'
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  padding: '0 32px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const previewOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16
};

const previewModalStyle: React.CSSProperties = {
  background: '#0f172a',
  color: '#e2e8f0',
  borderRadius: 12,
  padding: 16,
  width: 'min(900px, 90vw)',
  boxShadow: '0 20px 80px rgba(0,0,0,0.4)',
  border: '1px solid rgba(148,163,184,0.2)'
};

const previewSectionStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: 12
};

const tabButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#94a3b8',
  padding: '12px 0',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'color 0.2s'
};

const draftListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flex: 1,
  overflow: 'auto'
};

const draftItemStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.5)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: 10,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s'
};

const buttonPrimaryStyle: React.CSSProperties = {
  background: 'rgba(34,211,238,0.2)',
  border: '1px solid rgba(34,211,238,0.4)',
  borderRadius: 6,
  color: '#22d3ee',
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const buttonSecondaryStyle: React.CSSProperties = {
  background: 'rgba(148,163,184,0.1)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  color: '#cbd5e1',
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const buttonSuccessStyle: React.CSSProperties = {
  background: 'rgba(34,211,238,0.2)',
  border: '1px solid rgba(34,211,238,0.4)',
  borderRadius: 8,
  color: '#22d3ee',
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 6
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(15,23,42,0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#e2e8f0',
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: 'inherit'
};

export default ImprovedCozy60BuilderPage;
