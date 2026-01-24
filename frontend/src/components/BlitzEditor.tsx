import { useState } from 'react';
import type { QuizBlitzTheme, QuizBlitzItem } from '@shared/quizTypes';

interface BlitzEditorProps {
  themes: QuizBlitzTheme[];
  onChange: (themes: QuizBlitzTheme[]) => void;
}

export function BlitzEditor({ themes, onChange }: BlitzEditorProps) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ themeId: string; itemId: string } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const addTheme = () => {
    const newTheme: QuizBlitzTheme = {
      id: `theme_${Date.now()}`,
      title: 'Neues Fotosprint-Thema',
      items: []
    };
    onChange([...themes, newTheme]);
  };

  const deleteTheme = (themeId: string) => {
    if (confirm('Thema löschen?')) {
      onChange(themes.filter((t) => t.id !== themeId));
    }
  };

  const updateTheme = (themeId: string, updates: Partial<QuizBlitzTheme>) => {
    onChange(
      themes.map((t) => (t.id === themeId ? { ...t, ...updates } : t))
    );
  };

  const addItem = (themeId: string) => {
    const newItem: QuizBlitzItem = {
      id: `item_${Date.now()}`,
      answer: 'Neue Antwort',
      aliases: []
    };
    onChange(
      themes.map((t) =>
        t.id === themeId ? { ...t, items: [...t.items, newItem] } : t
      )
    );
  };

  const deleteItem = (themeId: string, itemId: string) => {
    onChange(
      themes.map((t) =>
        t.id === themeId
          ? { ...t, items: t.items.filter((i) => i.id !== itemId) }
          : t
      )
    );
  };

  const updateItem = (themeId: string, itemId: string, updates: Partial<QuizBlitzItem>) => {
    onChange(
      themes.map((t) =>
        t.id === themeId
          ? { ...t, items: t.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)) }
          : t
      )
    );
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>
          📸 Fotosprint Themen
        </h2>
        <button onClick={addTheme} style={addButtonStyle}>
          + Neues Thema
        </button>
      </div>

      {themes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
          Noch keine Themen. Erstelle eines!
        </div>
      )}

      {themes.map((theme) => {
        const isExpanded = expandedTheme === theme.id;

        return (
          <div key={theme.id} style={themeCardStyle}>
            <div
              onClick={() => setExpandedTheme(isExpanded ? null : theme.id)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <input
                type="text"
                value={theme.title}
                onChange={(e) => {
                  e.stopPropagation();
                  updateTheme(theme.id, { title: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                style={themeTitleInputStyle}
              />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, opacity: 0.5 }}>
                  {theme.items.length} Items
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTheme(theme.id);
                  }}
                  style={deleteButtonStyle}
                >
                  🗑️
                </button>
                <span style={{ fontSize: 18 }}>{isExpanded ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
                <button onClick={() => addItem(theme.id)} style={addItemButtonStyle}>
                  + Item hinzufügen
                </button>

                <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                  {theme.items.map((item, idx) => {
                    const imageStatus = item.mediaUrl ? '✅' : '⚠️';
                    const aliasCount = (item.aliases?.length || 0);
                    
                    return (
                      <div
                        key={item.id}
                        style={itemCardStyle}
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        {/* Item Preview Hover Card */}
                        {hoveredItem === item.id && (
                          <div style={previewCardStyle}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                              {item.answer || 'Ohne Antwort'}
                            </div>
                            <div style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                              <div>Bild: {imageStatus} {item.mediaUrl ? 'gefüllt' : 'leer'}</div>
                              <div>Varianten: {aliasCount}</div>
                              {item.prompt && <div>Hinweis: {item.prompt}</div>}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Antwort</label>
                            <input
                              type="text"
                              value={item.answer}
                              onChange={(e) => updateItem(theme.id, item.id, { answer: e.target.value })}
                              style={itemInputStyle}
                            />

                            <label style={labelStyle}>Frage/Hinweis (optional)</label>
                            <input
                              type="text"
                              value={item.prompt || ''}
                              onChange={(e) => updateItem(theme.id, item.id, { prompt: e.target.value })}
                              placeholder="z.B. 'Hauptstadt von...'"
                              style={itemInputStyle}
                            />

                            <label style={labelStyle}>Bild (URL oder Upload)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                              <input
                                type="text"
                                value={item.mediaUrl || ''}
                                onChange={(e) => updateItem(theme.id, item.id, { mediaUrl: e.target.value })}
                                placeholder="https://... oder wird nach Upload gefüllt"
                                style={itemInputStyle}
                              />
                              <button
                                onClick={async () => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = async () => {
                                    const file = input.files?.[0];
                                    if (!file) return;
                                    const form = new FormData();
                                    form.append('file', file);
                                    try {
                                      const res = await fetch('/api/upload/blitz-image', { method: 'POST', body: form });
                                      if (!res.ok) throw new Error('Upload fehlgeschlagen');
                                      const data = await res.json();
                                      updateItem(theme.id, item.id, { mediaUrl: data.imageUrl });
                                    } catch (err) {
                                      alert(`Upload fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
                                    }
                                  };
                                  input.click();
                                }}
                                style={{
                                  background: 'rgba(59,130,246,0.2)',
                                  border: '1px solid rgba(59,130,246,0.4)',
                                  borderRadius: 8,
                                  padding: '8px 12px',
                                  color: '#60a5fa',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: 12
                                }}
                              >
                                📤 Upload
                              </button>
                            </div>

                            <label style={labelStyle}>Alias-Antworten (optional)</label>
                            <input
                              type="text"
                              value={item.aliases?.join(', ') || ''}
                              onChange={(e) =>
                                updateItem(theme.id, item.id, {
                                  aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                })
                              }
                              placeholder="Alternative Antworten, kommagetrennt"
                              style={itemInputStyle}
                            />
                          </div>

                          <button
                            onClick={() => deleteItem(theme.id, item.id)}
                            style={deleteButtonStyle}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const themeCardStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16
};

const themeTitleInputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#f1f5f9',
  fontSize: 18,
  fontWeight: 700,
  outline: 'none',
  padding: '4px 0',
  width: '100%'
};

const addButtonStyle: React.CSSProperties = {
  background: 'rgba(59,130,246,0.2)',
  border: '1px solid rgba(59,130,246,0.4)',
  borderRadius: 8,
  padding: '10px 20px',
  color: '#60a5fa',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14
};

const addItemButtonStyle: React.CSSProperties = {
  background: 'rgba(34,197,94,0.2)',
  border: '1px solid rgba(34,197,94,0.4)',
  borderRadius: 8,
  padding: '8px 16px',
  color: '#4ade80',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13
};

const deleteButtonStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.2)',
  border: '1px solid rgba(239,68,68,0.4)',
  borderRadius: 6,
  padding: '6px 12px',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: 13
};

const itemCardStyle: React.CSSProperties = {
  background: 'rgba(30,41,59,0.6)',
  border: '1px solid rgba(148,163,184,0.15)',
  borderRadius: 8,
  padding: 16,
  position: 'relative'
};

const previewCardStyle: React.CSSProperties = {
  position: 'absolute',
  top: -60,
  left: 16,
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(34,197,94,0.4)',
  borderRadius: 6,
  padding: 12,
  minWidth: 200,
  zIndex: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  color: '#e2e8f0'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: 6,
  marginTop: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const itemInputStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 6,
  padding: '8px 12px',
  color: '#f1f5f9',
  fontSize: 13,
  width: '100%',
  outline: 'none'
};
