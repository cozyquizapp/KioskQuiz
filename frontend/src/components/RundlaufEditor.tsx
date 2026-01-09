import type { RundlaufConfig } from '@shared/quizTypes';

interface RundlaufEditorProps {
  config: RundlaufConfig;
  onChange: (config: RundlaufConfig) => void;
}

// Mapping of category IDs to answer counts (sync with backend RUN_LOOP_DATA)
const CATEGORY_ANSWER_COUNTS: Record<string, number> = {
  'HAUPTSTAEDTE AFRIKA': 20,
  'HAUPTSTAEDTE EUROPA': 26,
  'DEUTSCHE STAEDTE': 20,
  'DEUTSCHE BUNDESLAENDER': 16,
  'US BUNDESSTAATEN': 50,
  'LAENDER MIT S': 19,
  'DISNEY FILME': 25,
  'AUTOMOBILMARKEN': 35,
  'AFRIKANISCHE SAEUGETIERE': 24,
  'OLYMPISCHE SPORTARTEN': 33,
  'LAENDER MIT A': 21,
  'FRUECHTE': 25,
  'GEMUESESORTEN': 25,
  'EUROPAEISCHE FLUESSE': 21,
  'MUSIKINSTRUMENTE': 25
};

export function RundlaufEditor({ config, onChange }: RundlaufEditorProps) {
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
          Diese Kategorien stehen im Rundlauf zur Auswahl. Anzahl in Klammern = gültige Antworten.
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {config.pool.map((cat) => {
            const answerCount = CATEGORY_ANSWER_COUNTS[cat] || '?';
            return (
              <div key={cat} style={categoryCardStyle}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {cat} <span style={{ opacity: 0.6, fontWeight: 400 }}>({answerCount})</span>
                </span>
                <button
                  onClick={() => removeCategory(cat)}
                  style={removeButtonStyle}
                >
                  ✕
                </button>
              </div>
            );
          })}
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
