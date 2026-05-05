// 2026-05-05 (Wolf-Wunsch): Connections-Builder fuer das 4×4 Finale.
// 4 Gruppen × 4 Items, je DE/EN, mit Schwierigkeit. Wird in QQDraft gespeichert
// und ueberschreibt das hardcoded QQ_CONNECTIONS_FALLBACK_PAYLOAD.

import { useState, useEffect } from 'react';
import type { QQConnectionsPayload, QQConnectionsGroup } from '../../../shared/quarterQuizTypes';

const DIFFICULTY_COLORS = ['#22C55E', '#EAB308', '#F97316', '#A855F7'] as const;
const DIFFICULTY_LABELS = ['einfach', 'mittel', 'schwer', 'fies'] as const;

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid #334155',
  background: '#0f172a', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit',
};

function emptyGroup(idx: number): QQConnectionsGroup {
  return {
    id: `g${idx + 1}`,
    name: '',
    nameEn: '',
    items: ['', '', '', ''],
    itemsEn: ['', '', '', ''],
    difficulty: ((idx + 1) as 1 | 2 | 3 | 4),
  };
}

function emptyPayload(): QQConnectionsPayload {
  return { groups: [0, 1, 2, 3].map(emptyGroup) };
}

export function ConnectionsEditorModal({
  initialPayload, initialDurationSec, initialMaxFails,
  onSave, onClose,
}: {
  initialPayload?: QQConnectionsPayload | null;
  initialDurationSec?: number;
  initialMaxFails?: number;
  onSave: (payload: QQConnectionsPayload, durationSec: number, maxFails: number) => void;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<QQConnectionsPayload>(() => {
    if (initialPayload && initialPayload.groups?.length === 4) {
      // Sicherstellen dass alle 4 Items pro Gruppe + EN-Arrays existieren
      return {
        ...initialPayload,
        groups: initialPayload.groups.map((g, i) => ({
          ...g,
          id: g.id ?? `g${i + 1}`,
          items: [...(g.items ?? []), '', '', '', ''].slice(0, 4),
          itemsEn: [...(g.itemsEn ?? []), '', '', '', ''].slice(0, 4),
          difficulty: g.difficulty ?? ((i + 1) as 1 | 2 | 3 | 4),
        })),
      };
    }
    return emptyPayload();
  });
  const [durationSec, setDurationSec] = useState(initialDurationSec ?? 180);
  const [maxFails, setMaxFails] = useState(initialMaxFails ?? 4);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateGroup = (i: number, patch: Partial<QQConnectionsGroup>) => {
    setPayload(p => ({
      ...p,
      groups: p.groups.map((g, idx) => idx === i ? { ...g, ...patch } : g),
    }));
  };
  const updateItem = (groupIdx: number, itemIdx: number, lang: 'de' | 'en', val: string) => {
    setPayload(p => ({
      ...p,
      groups: p.groups.map((g, gi) => {
        if (gi !== groupIdx) return g;
        const arr = [...(lang === 'de' ? g.items : (g.itemsEn ?? ['', '', '', '']))];
        arr[itemIdx] = val;
        return lang === 'de' ? { ...g, items: arr } : { ...g, itemsEn: arr };
      }),
    }));
  };

  // Validation
  const errors: string[] = [];
  payload.groups.forEach((g, i) => {
    if (!g.name.trim()) errors.push(`Gruppe ${i + 1}: Name fehlt`);
    g.items.forEach((it, j) => {
      if (!it.trim()) errors.push(`Gruppe ${i + 1}, Item ${j + 1}: leer`);
    });
  });
  // Doppelte Items?
  const allItems = payload.groups.flatMap(g => g.items.map(i => i.trim().toLowerCase())).filter(Boolean);
  const dups = allItems.filter((v, i) => allItems.indexOf(v) !== i);
  if (dups.length > 0) errors.push(`Doppelte Items: ${[...new Set(dups)].slice(0, 3).join(', ')}`);

  const canSave = errors.length === 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(payload, durationSec, maxFails);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        width: 'min(900px, 100%)', maxHeight: '92vh', overflow: 'auto',
        background: '#1e293b', borderRadius: 18,
        border: '2px solid rgba(168,85,247,0.5)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 60px rgba(168,85,247,0.25)',
        padding: 24,
        fontFamily: "'Nunito', system-ui, sans-serif",
        color: '#e2e8f0',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <span style={{ fontSize: 28 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#A855F7' }}>4×4 Finale — Connections</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>4 Gruppen × 4 Begriffe. Teams müssen alle 4 Gruppen finden.</div>
          </div>
          <button onClick={onClose} style={{
            padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit',
            border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
            color: '#94A3B8', cursor: 'pointer', fontSize: 13,
          }}>✕ Schließen</button>
        </div>

        {/* Settings */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          padding: 12, borderRadius: 10,
          background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 18,
        }}>
          <div>
            <label style={labelStyle}>Spielzeit (Sek.)</label>
            <input
              type="number" min={30} max={600} step={10}
              value={durationSec}
              onChange={e => setDurationSec(Math.max(30, Math.min(600, parseInt(e.target.value) || 180)))}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Max. Fehler pro Team</label>
            <input
              type="number" min={1} max={10}
              value={maxFails}
              onChange={e => setMaxFails(Math.max(1, Math.min(10, parseInt(e.target.value) || 4)))}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
        </div>

        {/* 4 Gruppen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {payload.groups.map((g, gi) => {
            const diffIdx = (g.difficulty ?? gi + 1) - 1;
            const diffColor = DIFFICULTY_COLORS[Math.max(0, Math.min(3, diffIdx))];
            return (
              <div key={gi} style={{
                padding: 14, borderRadius: 12,
                background: `${diffColor}10`,
                border: `1.5px solid ${diffColor}55`,
              }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Gruppe {gi + 1} — Name (DE)</label>
                    <input
                      type="text" value={g.name}
                      onChange={e => updateGroup(gi, { name: e.target.value })}
                      style={{ ...inputStyle, width: '100%' }}
                      placeholder="z.B. Kaffeesorten"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Name (EN)</label>
                    <input
                      type="text" value={g.nameEn ?? ''}
                      onChange={e => updateGroup(gi, { nameEn: e.target.value })}
                      style={{ ...inputStyle, width: '100%' }}
                      placeholder="e.g. Coffee types"
                    />
                  </div>
                  <div style={{ width: 110 }}>
                    <label style={labelStyle}>Schwierigkeit</label>
                    <select
                      value={g.difficulty ?? gi + 1}
                      onChange={e => updateGroup(gi, { difficulty: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      {[1, 2, 3, 4].map(d => (
                        <option key={d} value={d}>{d} · {DIFFICULTY_LABELS[d - 1]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* 4 Items je Gruppe */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[0, 1, 2, 3].map(ii => (
                    <div key={ii} style={{ display: 'flex', gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 900, color: diffColor,
                        width: 18, textAlign: 'center', flexShrink: 0,
                        alignSelf: 'center',
                      }}>{ii + 1}</span>
                      <input
                        type="text" value={g.items[ii] ?? ''}
                        onChange={e => updateItem(gi, ii, 'de', e.target.value)}
                        style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                        placeholder="DE"
                      />
                      <input
                        type="text" value={(g.itemsEn ?? [])[ii] ?? ''}
                        onChange={e => updateItem(gi, ii, 'en', e.target.value)}
                        style={{ ...inputStyle, flex: 1, minWidth: 0, opacity: 0.85 }}
                        placeholder="EN"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Validation + Footer */}
        {errors.length > 0 && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
            fontSize: 12, color: '#FCA5A5',
          }}>
            <strong>{errors.length} Fehler:</strong>
            <ul style={{ margin: '4px 0 0 18px', padding: 0, lineHeight: 1.5 }}>
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>… und {errors.length - 6} weitere</li>}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            padding: '10px 18px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
            color: '#94A3B8', cursor: 'pointer', fontSize: 13,
          }}>Abbrechen</button>
          <button onClick={handleSave} disabled={!canSave} style={{
            padding: '10px 22px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 900,
            border: `2px solid ${canSave ? '#A855F7' : 'rgba(255,255,255,0.1)'}`,
            background: canSave ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
            color: canSave ? '#C4B5FD' : '#475569',
            cursor: canSave ? 'pointer' : 'not-allowed', fontSize: 13,
          }}>💾 Speichern</button>
        </div>
      </div>
    </div>
  );
}
