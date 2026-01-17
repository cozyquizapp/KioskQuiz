import React, { useEffect, useState } from 'react';
import { CozyQuizDraft, Language, AnyQuestion } from '@shared/quizTypes';
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
import { MECHANIC_RULES } from '../config/mechanicRules';

const LOCAL_BACKUP_KEY = 'cozy-builder-draft';
const LOCAL_BACKUP_TS_KEY = 'cozy-builder-timestamp';

const ImprovedCozy60BuilderPage = () => {
  const [drafts, setDrafts] = useState<CozyDraftSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CozyQuizDraft | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tab, setTab] = useState<'board' | 'meta' | 'blitz' | 'rundlauf' | 'catalog' | 'help'>('board');
  const [showCatalog, setShowCatalog] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [restoredFromLocal, setRestoredFromLocal] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null);

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

      const localRaw = localStorage.getItem(LOCAL_BACKUP_KEY);
      const localTs = localStorage.getItem(LOCAL_BACKUP_TS_KEY);
      if (localRaw && !restoredFromLocal) {
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
      setError((err as Error).message);
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
      setSelectedDraftId(data.draft.id);
      setStatus('✓ Bereit zum Bearbeiten!');
      setShowCreateDialog(false);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError((err as Error).message);
      setStatus('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (sourceDraftId: string) => {
    if (isCreating) return;
    setIsCreating(true);
    setStatus('🔄 Quiz wird kopiert...');
    try {
      const data = await duplicateCozyDraft(sourceDraftId, `Kopie von ${drafts.find(d => d.id === sourceDraftId)?.title || 'Quiz'}`);
      setDrafts((prev) => [data.draft, ...prev]);
      setDraft(data.draft);
      setSelectedDraftId(data.draft.id);
      setStatus('✓ Quiz erfolgreich kopiert!');
      setShowCreateDialog(false);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError((err as Error).message);
      setStatus('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setStatus('Speichere...');
    try {
      const response = await saveCozyDraft(draft.id, draft);
      setDraft(response.draft);
      await loadDrafts();
      setStatus('✓ Gespeichert');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      setError((err as Error).message);
      setStatus('');
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
    const filled = currentDraft.questions.filter(q => q.question && q.question !== `Frage 1`).length;
    const total = currentDraft.questions.length || 60;
    return { filled, total, percent: Math.round((filled / total) * 100) };
  };

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
      await loadDrafts();
      setStatus(`✓ Veröffentlicht als ${response.quizId}`);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError((err as Error).message);
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

  return (
      <div style={containerStyle}>
        <aside style={sidebarStyle}>
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
            {drafts.map((d) => (
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
            ))}
          </div>

          {status && (
            <div style={{ marginTop: 12, color: '#22d3ee', fontSize: 12, lineHeight: 1.4 }}>{status}</div>
          )}
          {error && (
            <div style={{ marginTop: 8, color: '#f87171', fontSize: 12, lineHeight: 1.4 }}>{error}</div>
          )}
        </aside>

        <main style={mainStyle}>
          {!draft ? (
            <div style={{ padding: 32, color: '#94a3b8' }}>
              Bitte ein Draft auswählen oder neu erstellen.
            </div>
          ) : (
            <>
              <header style={headerStyle}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{draft.meta.title || 'Unbenanntes Quiz'}</h2>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
                    <span>ID: {draft.id}</span>
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
                  <button onClick={() => setShowPreview(true)} style={buttonSecondaryStyle}>👀 Vorschau</button>
                  <button onClick={handleSave} style={buttonSuccessStyle}>💾 Speichern</button>
                  <button onClick={handlePublish} style={buttonPrimaryStyle}>🚀 Publish</button>
                </div>
              </header>

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
                </div>

                {showCatalog && tab === 'board' && (
                  <div style={{ width: 400, borderLeft: '1px solid rgba(148,163,184,0.2)', overflow: 'auto' }}>
                    <QuestionCatalog
                      onSelectQuestion={(q: AnyQuestion) => {
                        console.log('Selected question:', q);
                        // TODO: Add question to draft
                      }}
                      usedQuestionIds={draft.questions.map(q => q.id)}
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
  background: '#0b0d14',
  color: '#e2e8f0'
};

const sidebarStyle: React.CSSProperties = {
  width: 280,
  background: 'linear-gradient(180deg, rgba(15,23,42,0.8), rgba(10,14,24,0.9))',
  borderRight: '1px solid rgba(255,255,255,0.08)',
  padding: 16,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column'
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
  background: 'rgba(15,23,42,0.5)'
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

  // Add animation styles on mount
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.querySelector('#cozy-builder-styles')) {
      const style = document.createElement('style');
      style.id = 'cozy-builder-styles';
      style.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
