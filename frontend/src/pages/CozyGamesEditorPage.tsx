import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  CozyGame,
  CozyGameSetting,
  CozyGameNoiseLevel,
  CozyGameScoringType,
} from '@shared/cozyGameTypes';
import {
  COZY_GAME_MATERIAL_TAGS_V1,
  COZY_GAME_SETTING_LABELS,
  COZY_GAME_NOISE_LABELS,
  COZY_GAME_SCORING_LABELS,
} from '@shared/cozyGameTypes';

// 2026-05-17 (Wolf-Feature CozyGames): Editor unter /cozygames.
// CRUD-Backend in /api/cozygames. Seed (12 V1-Spiele) wird beim ersten Backend-
// Start eingefügt — Wolf kann ergänzen, löschen (außer Seed → archived) und
// editieren. Doku: COZYGAMES.md im Repo-Root.

const COZY_NAVY = '#1E2A5A';
const COZY_NAVY_DARK = '#0F1736';
const COZY_PINK = '#EC4899';
const COZY_MAGENTA = '#A21247';
const COZY_BG = '#0b0d14';

type FilterMode = 'aktiv' | 'archiviert' | 'alle';

const ALL_SETTINGS: CozyGameSetting[] = ['tisch', 'steh', 'wand', 'boden'];
const ALL_NOISE: CozyGameNoiseLevel[] = ['leise', 'mittel', 'laut'];
const ALL_SCORING: CozyGameScoringType[] = [
  'countIn60s', 'timeToFinish', 'distance', 'height', 'lastStanding',
];

function newGameDraft(): CozyGame {
  const now = Date.now();
  return {
    id: `cg-${Math.random().toString(36).slice(2, 8)}`,
    emoji: '🪅',
    name: '',
    description: '',
    materialTags: [],
    setting: 'tisch',
    noiseLevel: 'leise',
    scoringType: 'countIn60s',
    scoringNote: '',
    isSeed: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export default function CozyGamesEditorPage() {
  const [games, setGames] = useState<CozyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('aktiv');
  const [draft, setDraft] = useState<CozyGame | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom-Tag-Pool: aus DB-Daten extrahieren + V1-Pool mergen
  const allTags = useMemo(() => {
    const set = new Set<string>(COZY_GAME_MATERIAL_TAGS_V1);
    for (const g of games) for (const t of g.materialTags) set.add(t);
    return Array.from(set).sort();
  }, [games]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cozygames');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr: CozyGame[] = Array.isArray(data) ? data : [];
      setGames(arr);
      if (arr.length > 0 && !activeId) {
        const first = arr.find(g => !g.archived) ?? arr[0];
        setActiveId(first.id);
        setDraft(first);
      }
    } catch (err) {
      console.error('CozyGames-Load failed:', err);
      setError('Konnte CozyGames nicht laden — Backend offline?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filteredGames = useMemo(() => {
    if (filter === 'alle') return games;
    if (filter === 'aktiv') return games.filter(g => !g.archived);
    return games.filter(g => g.archived);
  }, [games, filter]);

  function selectGame(id: string) {
    if (dirty && draft) {
      const ok = window.confirm('Ungespeicherte Änderungen verwerfen?');
      if (!ok) return;
    }
    const g = games.find(x => x.id === id);
    if (!g) return;
    setActiveId(id);
    setDraft(g);
    setDirty(false);
  }

  function handleNew() {
    if (dirty && draft) {
      const ok = window.confirm('Ungespeicherte Änderungen verwerfen?');
      if (!ok) return;
    }
    const d = newGameDraft();
    setActiveId(d.id);
    setDraft(d);
    setDirty(true);
    setGames(prev => [...prev, d]);
  }

  function patchDraft<K extends keyof CozyGame>(key: K, value: CozyGame[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
    setDirty(true);
  }

  function toggleTag(tag: string) {
    if (!draft) return;
    const has = draft.materialTags.includes(tag);
    const next = has ? draft.materialTags.filter(t => t !== tag) : [...draft.materialTags, tag];
    patchDraft('materialTags', next);
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError('Name darf nicht leer sein.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const existing = games.find(g => g.id === draft.id && g.createdAt !== draft.createdAt) ||
                       games.find(g => g.id === draft.id && !dirty);
      const isNew = !games.some(g => g.id === draft.id) || (dirty && draft.name && !games.find(g => g.id === draft.id && g.name === draft.name));
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/cozygames' : `/api/cozygames/${encodeURIComponent(draft.id)}`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      const saved = await res.json();
      setGames(prev => {
        const map = new Map(prev.map(g => [g.id, g]));
        map.set(saved.id, saved);
        return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
      });
      setActiveId(saved.id);
      setDraft(saved);
      setDirty(false);
    } catch (err: any) {
      console.error('CozyGame-Save failed:', err);
      setError(`Speichern fehlgeschlagen: ${err?.message ?? 'unbekannt'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft) return;
    const label = draft.isSeed ? 'archivieren' : 'löschen';
    const ok = window.confirm(`Wirklich "${draft.name}" ${label}?`);
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cozygames/${encodeURIComponent(draft.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadAll();
      setActiveId(null);
      setDraft(null);
      setDirty(false);
    } catch (err: any) {
      console.error('CozyGame-Delete failed:', err);
      setError(`Löschen fehlgeschlagen: ${err?.message ?? 'unbekannt'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${COZY_BG} 0%, ${COZY_NAVY_DARK} 100%)`,
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          background: `linear-gradient(90deg, ${COZY_NAVY}cc 0%, ${COZY_NAVY_DARK}cc 100%)`,
        }}
      >
        <Link to="/menu" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>← Menu</Link>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>
          🪅 CozyGames Editor
        </h1>
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
          Mini-Spiele-Katalog für analoge CozyGame-Slots im Quiz
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleNew}
          style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: COZY_PINK, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: `0 4px 14px ${COZY_PINK}66`,
          }}
        >
          + Neues Spiel
        </button>
      </header>

      {error && (
        <div
          style={{
            margin: '12px 24px', padding: '10px 14px',
            background: '#7f1d1d44', border: '1px solid #b91c1c', borderRadius: 10,
            color: '#fecaca', fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, padding: 20, alignItems: 'flex-start' }}>
        {/* Liste */}
        <aside style={{ width: 320, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['aktiv', 'archiviert', 'alle'] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 8,
                  border: `1px solid ${filter === f ? COZY_PINK : 'rgba(255,255,255,0.12)'}`,
                  background: filter === f ? `${COZY_PINK}22` : 'transparent',
                  color: filter === f ? '#fff' : '#94a3b8',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f} {f === 'aktiv' ? `(${games.filter(g => !g.archived).length})` : f === 'archiviert' ? `(${games.filter(g => !!g.archived).length})` : `(${games.length})`}
              </button>
            ))}
          </div>

          {loading && <div style={{ padding: 16, color: '#64748b' }}>Lade …</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '70vh', overflowY: 'auto' }}>
            {filteredGames.map(g => (
              <button
                key={g.id}
                onClick={() => selectGame(g.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${activeId === g.id ? COZY_PINK : 'rgba(255,255,255,0.08)'}`,
                  background: activeId === g.id ? `${COZY_PINK}1a` : 'rgba(255,255,255,0.03)',
                  color: '#e2e8f0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: g.archived ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{g.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', lineHeight: 1.2 }}>
                    {g.name || <i style={{ color: '#64748b' }}>(neu)</i>}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {g.isSeed && <span style={{ color: COZY_PINK }}>★ V1</span>}
                    <span>{COZY_GAME_SETTING_LABELS[g.setting]?.emoji}</span>
                    <span>{COZY_GAME_NOISE_LABELS[g.noiseLevel]?.emoji}</span>
                    {g.materialTags.length > 0 && <span>{g.materialTags.slice(0, 2).join(' · ')}{g.materialTags.length > 2 ? ` +${g.materialTags.length - 2}` : ''}</span>}
                  </div>
                </div>
              </button>
            ))}
            {!loading && filteredGames.length === 0 && (
              <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
                Keine Spiele in „{filter}".
              </div>
            )}
          </div>
        </aside>

        {/* Editor-Form */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {!draft && (
            <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>
              ← Spiel auswählen oder ein neues anlegen
            </div>
          )}
          {draft && (
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Field label="Emoji" style={{ flexBasis: 80 }}>
                  <input
                    type="text"
                    value={draft.emoji}
                    onChange={e => patchDraft('emoji', e.target.value.slice(0, 8))}
                    style={inputStyle({ fontSize: 28, textAlign: 'center', padding: '4px 8px' })}
                  />
                </Field>
                <Field label="Name" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => patchDraft('name', e.target.value)}
                    placeholder="z.B. Stäbchen-Eimer"
                    style={inputStyle({ fontWeight: 700, fontSize: 18 })}
                  />
                </Field>
                {draft.isSeed && (
                  <div style={{ alignSelf: 'flex-end', padding: '6px 10px', borderRadius: 8, background: `${COZY_PINK}22`, color: COZY_PINK, fontSize: 12, fontWeight: 700 }}>
                    ★ V1-Seed
                  </div>
                )}
              </div>

              <Field label="Ablauf-Beschreibung">
                <textarea
                  value={draft.description}
                  onChange={e => patchDraft('description', e.target.value)}
                  rows={3}
                  placeholder="Wie läuft das Spiel ab? Was zählt als Treffer?"
                  style={inputStyle({ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 })}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Setting">
                  <RadioGroup
                    options={ALL_SETTINGS.map(s => ({ value: s, label: `${COZY_GAME_SETTING_LABELS[s].emoji} ${COZY_GAME_SETTING_LABELS[s].de}` }))}
                    value={draft.setting}
                    onChange={v => patchDraft('setting', v as CozyGameSetting)}
                  />
                </Field>
                <Field label="Lärm-Level">
                  <RadioGroup
                    options={ALL_NOISE.map(n => ({ value: n, label: `${COZY_GAME_NOISE_LABELS[n].emoji} ${COZY_GAME_NOISE_LABELS[n].de}` }))}
                    value={draft.noiseLevel}
                    onChange={v => patchDraft('noiseLevel', v as CozyGameNoiseLevel)}
                  />
                </Field>
                <Field label="Wertungs-Typ">
                  <RadioGroup
                    options={ALL_SCORING.map(s => ({ value: s, label: COZY_GAME_SCORING_LABELS[s].de }))}
                    value={draft.scoringType}
                    onChange={v => patchDraft('scoringType', v as CozyGameScoringType)}
                  />
                </Field>
              </div>

              <Field label="Wertungs-Notiz (optional)">
                <input
                  type="text"
                  value={draft.scoringNote ?? ''}
                  onChange={e => patchDraft('scoringNote', e.target.value)}
                  placeholder="z.B. Heruntergefallene zählen nicht."
                  style={inputStyle({})}
                />
              </Field>

              <Field label={`Material-Tags (${draft.materialTags.length})`}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {allTags.map(tag => {
                    const active = draft.materialTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        type="button"
                        style={{
                          padding: '4px 10px', borderRadius: 999,
                          border: `1px solid ${active ? COZY_PINK : 'rgba(255,255,255,0.15)'}`,
                          background: active ? `${COZY_PINK}33` : 'rgba(255,255,255,0.04)',
                          color: active ? '#fff' : '#94a3b8',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  <CustomTagInput onAdd={t => {
                    if (!t.trim() || draft.materialTags.includes(t.trim())) return;
                    patchDraft('materialTags', [...draft.materialTags, t.trim()]);
                  }} />
                </div>
              </Field>

              <Field label="Spielmodus">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 14, marginBottom: 4 }}>
                  <input
                    type="radio"
                    name="parallel-mode"
                    checked={draft.parallel !== false}
                    onChange={() => patchDraft('parallel', true)}
                  />
                  🤜 Alle gleichzeitig (default) — 1 Timer, alle Teams parallel
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 14 }}>
                  <input
                    type="radio"
                    name="parallel-mode"
                    checked={draft.parallel === false}
                    onChange={() => patchDraft('parallel', false)}
                  />
                  👤 Nacheinander — Teams spielen sequenziell (z.B. wenn nur 1 Material-Set vorhanden). Bestes Team zuerst.
                </label>
              </Field>

              <Field label="">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={!!draft.archived}
                    onChange={e => patchDraft('archived', e.target.checked)}
                  />
                  Archiviert (nicht mehr im Builder auswählbar)
                </label>
              </Field>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  style={{
                    padding: '10px 16px', borderRadius: 10,
                    border: `1px solid ${COZY_MAGENTA}`,
                    background: 'transparent',
                    color: COZY_MAGENTA, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {draft.isSeed ? 'Archivieren' : 'Löschen'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving || !draft.name.trim()}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: dirty && draft.name.trim() ? COZY_PINK : 'rgba(255,255,255,0.08)',
                    color: '#fff', fontWeight: 800, fontSize: 14, cursor: dirty && draft.name.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: dirty && draft.name.trim() ? `0 4px 14px ${COZY_PINK}66` : 'none',
                  }}
                >
                  {saving ? 'Speichere …' : dirty ? 'Speichern' : 'Gespeichert'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

function inputStyle(extra: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 10,
    color: '#f1f5f9',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    ...extra,
  };
}

function RadioGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {options.map(o => (
        <label
          key={o.value}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 8,
            border: `1px solid ${value === o.value ? '#EC4899' : 'rgba(255,255,255,0.08)'}`,
            background: value === o.value ? '#EC489922' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer', fontSize: 13, color: '#cbd5e1',
          }}
        >
          <input
            type="radio"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            style={{ accentColor: '#EC4899' }}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function CustomTagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
      <input
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onAdd(val);
            setVal('');
          }
        }}
        placeholder="+ Tag"
        style={{
          padding: '3px 8px', borderRadius: 999,
          border: '1px dashed rgba(255,255,255,0.2)',
          background: 'transparent', color: '#94a3b8',
          fontSize: 12, width: 80, outline: 'none',
        }}
      />
    </span>
  );
}
