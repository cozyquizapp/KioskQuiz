import { useState } from 'react';
import type { RundlaufConfig, QuizCategory } from '@shared/quizTypes';
import { categoryLabels } from '../categoryLabels';

interface RundlaufEditorProps {
  config: RundlaufConfig;
  onChange: (config: RundlaufConfig) => void;
}

const AVAILABLE_CATEGORIES: QuizCategory[] = [
  'Schaetzchen',
  'Mu-Cho',
  'Stimmts',
  'Cheese',
  'GemischteTuete'
];

export function RundlaufEditor({ config, onChange }: RundlaufEditorProps) {
  const [newCategory, setNewCategory] = useState('');

  const addCategory = (cat: string) => {
    if (cat && !config.pool.includes(cat)) {
      onChange({ ...config, pool: [...config.pool, cat] });
    }
  };

  const removeCategory = (cat: string) => {
    onChange({ ...config, pool: config.pool.filter((c) => c !== cat) });
  };

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 24 }}>
        🏁 Rundlauf Konfiguration
      </h2>

      {/* Category Pool */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Kategorien-Pool</label>
        <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
          Diese Kategorien stehen im Rundlauf zur Auswahl
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="">Kategorie wählen...</option>
            {AVAILABLE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} disabled={config.pool.includes(cat)}>
                {(categoryLabels as any)[cat]?.de || cat}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              addCategory(newCategory);
              setNewCategory('');
            }}
            disabled={!newCategory}
            style={{
              ...addButtonStyle,
              opacity: newCategory ? 1 : 0.5,
              cursor: newCategory ? 'pointer' : 'not-allowed'
            }}
          >
            Hinzufügen
          </button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {config.pool.map((cat) => (
            <div key={cat} style={categoryCardStyle}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {(categoryLabels as any)[cat]?.de || cat}
              </span>
              <button
                onClick={() => removeCategory(cat)}
                style={removeButtonStyle}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {config.pool.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, opacity: 0.4, fontSize: 13 }}>
            Noch keine Kategorien im Pool
          </div>
        )}
      </div>

      {/* Timing & Points */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Rundenzeit (ms)</label>
        <input
          type="number"
          value={config.turnDurationMs || 30000}
          onChange={(e) => onChange({ ...config, turnDurationMs: parseInt(e.target.value) || 30000 })}
          style={inputStyle}
          min={5000}
          step={1000}
        />
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
          Standard: 30000ms (30 Sekunden)
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={sectionStyle}>
          <label style={labelStyle}>Punkte (Gewinner)</label>
          <input
            type="number"
            value={config.pointsWinner || 3}
            onChange={(e) => onChange({ ...config, pointsWinner: parseInt(e.target.value) || 3 })}
            style={inputStyle}
            min={0}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Punkte (Unentschieden)</label>
          <input
            type="number"
            value={config.pointsTie || 1}
            onChange={(e) => onChange({ ...config, pointsTie: parseInt(e.target.value) || 1 })}
            style={inputStyle}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 24
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#cbd5e1',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const selectStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none'
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#f1f5f9',
  fontSize: 14,
  width: '100%',
  outline: 'none'
};

const addButtonStyle: React.CSSProperties = {
  background: 'rgba(34,197,94,0.2)',
  border: '1px solid rgba(34,197,94,0.4)',
  borderRadius: 8,
  padding: '10px 20px',
  color: '#4ade80',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14
};

const categoryCardStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '12px 16px'
};

const removeButtonStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.2)',
  border: '1px solid rgba(239,68,68,0.4)',
  borderRadius: 6,
  padding: '4px 10px',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: 13
};
