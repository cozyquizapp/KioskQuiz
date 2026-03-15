import { useState } from 'react';
import type {
  BunteTueteQuestion,
  BunteTuetePayload,
  BunteTueteTop5Payload,
  BunteTuetePrecisionPayload,
  BunteTueteOneOfEightPayload,
  BunteTueteOrderPayload,
  BunteTueteMapPayload
} from '@shared/quizTypes';
import {
  formSectionStyle,
  labelStyle,
  inputStyle,
  textareaStyle,
  uploadButtonStyle,
  deleteButtonStyle
} from './editorStyles';

interface BunteTueteEditorProps {
  question: BunteTueteQuestion;
  onQuestionChange: (q: BunteTueteQuestion) => void;
}

export const BUNTU_MECHANIC_CONFIGS = [
  { 
    kind: 'top5', 
    label: '🏆 Top 5', 
    icon: '🏆', 
    color: '#f59e0b',
    description: 'Teams geben 5 Antworten ein und ordnen sie nach Häufigkeit/Wichtigkeit'
  },
  { 
    kind: 'precision', 
    label: '🎯 Präzision', 
    icon: '🎯', 
    color: '#3b82f6',
    description: 'Numerische Genauigkeit mit mehreren Stufen (z.B. Jahreszahl erraten)'
  },
  { 
    kind: 'oneOfEight', 
    label: '🚫 1 falsch', 
    icon: '🚫', 
    color: '#ef4444',
    description: 'Genau eine von 8 Aussagen ist falsch'
  },
  {
    kind: 'order',
    label: '📋 Ordnen',
    icon: '📋',
    color: '#10b981',
    description: 'Items in richtige Reihenfolge sortieren'
  },
  {
    kind: 'map',
    label: '🗺️ Weltkarte',
    icon: '🗺️',
    color: '#06b6d4',
    description: 'Teams setzen einen Pin auf der Weltkarte — wer am nächsten ist, gewinnt'
  }
];

export const validateBunteMechanic = (kind: string, question: BunteTueteQuestion): string[] => {
  const errors: string[] = [];
  const payload = question.bunteTuete as any;

  if (kind === 'top5') {
    if (!payload?.correctOrder || payload.correctOrder.length !== 5) {
      errors.push('⚠️ Genau 5 korrekte Antworten erforderlich');
    }
    if (!payload?.prompt) {
      errors.push('⚠️ Frage erforderlich');
    }
  } else if (kind === 'precision') {
    if (!payload?.prompt) {
      errors.push('⚠️ Frage erforderlich');
    }
    if (!payload?.ladder || payload.ladder.length === 0) {
      errors.push('⚠️ Mindestens 1 Genauigkeitsstufe erforderlich');
    } else {
      payload.ladder.forEach((step: any, idx: number) => {
        if (!step.label) errors.push(`⚠️ Stufe ${idx + 1}: Label erforderlich`);
        if (step.acceptedAnswers.length === 0) {
          errors.push(`⚠️ Stufe ${idx + 1}: Mindestens 1 Beispiel-Antwort erforderlich`);
        }
      });
    }
  } else if (kind === 'oneOfEight') {
    if (!payload?.prompt) {
      errors.push('⚠️ Frage erforderlich');
    }
    if (!payload?.statements || payload.statements.length !== 8) {
      errors.push('⚠️ Genau 8 Aussagen erforderlich');
    } else {
      const falseCount = payload.statements.filter((s: { text: string; isFalse?: boolean }) => s.isFalse).length;
      if (falseCount !== 1) {
        errors.push(`⚠️ Genau 1 Aussage als falsch markieren (aktuell: ${falseCount})`);
      }
      payload.statements.forEach((stmt: { text: string; isFalse?: boolean }, idx: number) => {
        if (!stmt.text?.trim()) {
          errors.push(`⚠️ Aussage ${String.fromCharCode(65 + idx)}: Text erforderlich`);
        }
      });
    }
  } else if (kind === 'order') {
    if (!payload?.prompt) {
      errors.push('⚠️ Frage erforderlich');
    }
    if (!payload?.items || payload.items.length < 2) {
      errors.push('⚠️ Mindestens 2 Items erforderlich');
    } else {
      payload.items.forEach((item: any, idx: number) => {
        if (!item.label?.trim()) {
          errors.push(`⚠️ Item ${idx + 1}: Text erforderlich`);
        }
      });
    }
  } else if (kind === 'map') {
    if (!payload?.prompt) {
      errors.push('⚠️ Frage erforderlich');
    }
    const t = payload?.target;
    if (!t || typeof t.lat !== 'number' || typeof t.lng !== 'number') {
      errors.push('⚠️ Zielkoordinaten erforderlich (Karte anklicken oder Koordinaten eingeben)');
    }
  }

  return errors;
};

export const buildBuntePayloadNew = (kind: string, baseId: string): BunteTuetePayload => {
  if (kind === 'precision') {
    return {
      kind: 'precision' as const,
      prompt: 'Schaetze moeglichst genau.',
      ladder: [
        { label: 'Guter Treffer', acceptedAnswers: [''], points: 2 },
        { label: 'Nahe dran', acceptedAnswers: [''], points: 1 }
      ],
      autoMatchEnabled: true,
      requiresModeratorReview: false
    };
  }
  if (kind === 'oneOfEight') {
    return {
      kind: 'oneOfEight' as const,
      prompt: 'Welche eine Aussage ist falsch?',
      statements: Array.from({ length: 8 }).map((_, idx) => ({ 
        id: `${baseId}-stmt-${idx + 1}`, 
        text: `Aussage ${idx + 1}`, 
        isFalse: idx === 0 
      }))
    };
  }
  if (kind === 'order') {
    return {
      kind: 'order' as const,
      prompt: 'Ordne diese Dinge richtig!',
      items: Array.from({ length: 5 }).map((_, idx) => ({ id: `${baseId}-item-${idx + 1}`, label: `Item ${idx + 1}` })),
      criteriaOptions: [{ id: 'default', label: 'Standard', direction: 'asc' as const }],
      defaultCriteriaId: 'default',
      correctByCriteria: {
        default: Array.from({ length: 5 }).map((_, idx) => `${baseId}-item-${idx + 1}`)
      }
    };
  }
  if (kind === 'map') {
    return {
      kind: 'map' as const,
      prompt: 'Wo auf der Weltkarte befindet sich dieser Ort?',
      target: { lat: 27.1751, lng: 78.0421 }, // Taj Mahal als Default
      targetLabel: 'Taj Mahal, Agra, Indien',
      showTargetOnReveal: true
    };
  }
  return {
    kind: 'top5' as const,
    prompt: 'Ordnet die fuenf Eintraege.',
    items: Array.from({ length: 5 }).map((_, idx) => ({ id: `${baseId}-item-${idx + 1}`, label: `Item ${idx + 1}` })),
    correctOrder: Array.from({ length: 5 }).map((_, idx) => `${baseId}-item-${idx + 1}`)
  };
};

const Top5Editor = ({ payload, onUpdate }: { payload: BunteTueteTop5Payload; onUpdate: (p: BunteTueteTop5Payload) => void }) => {
  const correctOrder = payload.correctOrder || [];
  return (
    <div style={formSectionStyle}>
      <label style={labelStyle}>🏆 Top 5 - Teams geben 5 Antworten ein</label>
      <textarea value={payload.prompt || ''} onChange={(e) => onUpdate({ ...payload, prompt: e.target.value })} style={textareaStyle} rows={2} placeholder="z.B. Welche 5 Fast-Food-Gerichte sind die beliebtesten?" />
      <div style={{ marginTop: 12 }}>
        <small style={{ opacity: 0.6, fontSize: 11 }}>Die 5 korrekten Antworten (kommagetrennt)</small>
        <input type="text" value={correctOrder.join(', ')} onChange={(e) => {
          const newOrder = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
          onUpdate({ ...payload, correctOrder: newOrder });
        }} style={inputStyle} placeholder="Burger, Pizza, Pommes, Döner, Currywurst" />
      </div>
    </div>
  );
};

const OneOfEightEditor = ({ payload, onUpdate }: { payload: BunteTueteOneOfEightPayload; onUpdate: (p: BunteTueteOneOfEightPayload) => void }) => {
  const statements = payload.statements || [];
  return (
    <div style={formSectionStyle}>
      <label style={labelStyle}>❌ 1 von 8 falsch - Welche Aussage ist falsch?</label>
      <textarea value={payload.prompt || ''} onChange={(e) => onUpdate({ ...payload, prompt: e.target.value })} style={textareaStyle} rows={2} placeholder="z.B. Welche dieser Aussagen ist falsch?" />
      <div style={{ marginTop: 12 }}>
        <small style={{ opacity: 0.6, fontSize: 11, display: 'block', marginBottom: 8 }}>8 Aussagen (1 davon falsch)</small>
        {statements.map((stmt, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="checkbox" checked={stmt.isFalse || false} onChange={(e) => {
              const newStatements = statements.map((s, idx) => ({ ...s, isFalse: idx === i ? e.target.checked : false }));
              onUpdate({ ...payload, statements: newStatements });
            }} title="Ist falsch?" />
            <input type="text" value={stmt.text} onChange={(e) => {
              const newStatements = [...statements];
              newStatements[i] = { ...stmt, text: e.target.value };
              onUpdate({ ...payload, statements: newStatements });
            }} placeholder={`Aussage ${String.fromCharCode(65 + i)}`} style={inputStyle} />
          </div>
        ))}
        {statements.length < 8 && (
          <button onClick={() => {
            const newStatements = [...statements, { id: `stmt${statements.length + 1}`, text: '', isFalse: false }];
            onUpdate({ ...payload, statements: newStatements });
          }} style={{ ...uploadButtonStyle, marginTop: 8 }}>+ Aussage hinzufügen</button>
        )}
      </div>
    </div>
  );
};

const OrderEditor = ({ payload, onUpdate }: { payload: BunteTueteOrderPayload; onUpdate: (p: BunteTueteOrderPayload) => void }) => {
  const items = payload.items || [];
  const criteriaOptions = payload.criteriaOptions || [];
  
  return (
    <div style={formSectionStyle}>
      <label style={labelStyle}>🔢 Ordnen nach Kriterium</label>
      <textarea value={payload.prompt || ''} onChange={(e) => onUpdate({ ...payload, prompt: e.target.value })} style={textareaStyle} rows={2} placeholder="z.B. Sortiere die Tiere" />
      <div style={{ marginTop: 12 }}>
        <small style={{ opacity: 0.6, fontSize: 11, display: 'block', marginBottom: 8 }}>Items</small>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="text" value={item.label} onChange={(e) => {
              const newItems = [...items];
              newItems[i] = { ...item, label: e.target.value };
              onUpdate({ ...payload, items: newItems });
            }} placeholder={`Item ${i + 1}`} style={inputStyle} />
            <button onClick={() => {
              const newItems = items.filter((_, idx) => idx !== i);
              onUpdate({ ...payload, items: newItems });
            }} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✕</button>
          </div>
        ))}
        <button onClick={() => {
          const newItems = [...items, { id: `item${items.length + 1}`, label: '' }];
          onUpdate({ ...payload, items: newItems });
        }} style={{ ...uploadButtonStyle, marginTop: 8 }}>+ Item hinzufügen</button>
      </div>
    </div>
  );
};

const PrecisionEditor = ({ payload, onUpdate }: { payload: BunteTuetePrecisionPayload; onUpdate: (p: BunteTuetePrecisionPayload) => void }) => {
  const ladder = payload.ladder || [];
  
  return (
    <div style={formSectionStyle}>
      <label style={labelStyle}>🎯 Präzisiere Antwort - Mehrere Stufen</label>
      <textarea value={payload.prompt || ''} onChange={(e) => onUpdate({ ...payload, prompt: e.target.value })} style={textareaStyle} rows={2} placeholder="z.B. In welchem Jahr fiel die Berliner Mauer?" />

      <div style={{ marginTop: 12, padding: 12, background: 'rgba(59,130,246,0.1)', borderRadius: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
          <input type="checkbox" checked={payload.autoMatchEnabled !== false} onChange={(e) => onUpdate({ ...payload, autoMatchEnabled: e.target.checked })} />
          <span>🤖 Auto-Match aktiviert</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={payload.requiresModeratorReview === true} onChange={(e) => onUpdate({ ...payload, requiresModeratorReview: e.target.checked })} />
          <span>👤 Moderator-Review erforderlich</span>
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <small style={{ opacity: 0.6, fontSize: 11, display: 'block', marginBottom: 8 }}>Präzisionsstufen</small>
        {ladder.map((step, i) => (
          <div key={i} style={{ background: 'rgba(30,41,59,0.4)', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid rgba(148,163,184,0.2)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input type="text" value={step.label} onChange={(e) => {
                const newLadder = [...ladder];
                newLadder[i] = { ...step, label: e.target.value };
                onUpdate({ ...payload, ladder: newLadder });
              }} placeholder="Label (z.B. Exakt, Nah dran, Jahrzehnt)" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
              <input type="number" value={step.points} onChange={(e) => {
                const newLadder = [...ladder];
                newLadder[i] = { ...step, points: Number(e.target.value) };
                onUpdate({ ...payload, ladder: newLadder });
              }} placeholder="Punkte" style={{ ...inputStyle, width: 80, marginBottom: 0 }} />
              <button onClick={() => {
                const newLadder = ladder.filter((_, idx) => idx !== i);
                onUpdate({ ...payload, ladder: newLadder });
              }} style={deleteButtonStyle}>✕</button>
            </div>
            <input type="text" value={step.acceptedAnswers.join(', ')} onChange={(e) => {
              const newLadder = [...ladder];
              newLadder[i] = { ...step, acceptedAnswers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
              onUpdate({ ...payload, ladder: newLadder });
            }} placeholder="Beispiel-Antworten (kommagetrennt)" style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
        ))}
        <button onClick={() => {
          const newLadder = [...ladder, { label: '', acceptedAnswers: [], points: 1 }];
          onUpdate({ ...payload, ladder: newLadder });
        }} style={{ ...uploadButtonStyle, marginTop: 8 }}>+ Stufe hinzufügen</button>
      </div>
    </div>
  );
};

const MapEditor = ({ payload, onUpdate }: { payload: BunteTueteMapPayload; onUpdate: (p: BunteTueteMapPayload) => void }) => {
  const lat = payload.target?.lat ?? '';
  const lng = payload.target?.lng ?? '';
  const updateCoord = (field: 'lat' | 'lng', val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) onUpdate({ ...payload, target: { ...payload.target, [field]: num } });
  };
  return (
    <div style={formSectionStyle}>
      <label style={labelStyle}>🗺️ Weltkarte — Zielort festlegen</label>
      <textarea
        value={payload.prompt || ''}
        onChange={(e) => onUpdate({ ...payload, prompt: e.target.value })}
        style={textareaStyle}
        rows={2}
        placeholder="z.B. Wo befindet sich der Taj Mahal?"
      />
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <small style={{ opacity: 0.6, fontSize: 11 }}>Breitengrad (Latitude)</small>
          <input
            type="number"
            step="0.0001"
            min="-90"
            max="90"
            value={lat}
            onChange={(e) => updateCoord('lat', e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
            placeholder="z.B. 27.1751"
          />
        </div>
        <div>
          <small style={{ opacity: 0.6, fontSize: 11 }}>Längengrad (Longitude)</small>
          <input
            type="number"
            step="0.0001"
            min="-180"
            max="180"
            value={lng}
            onChange={(e) => updateCoord('lng', e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
            placeholder="z.B. 78.0421"
          />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <small style={{ opacity: 0.6, fontSize: 11 }}>Ortsbezeichnung (für Reveal)</small>
        <input
          type="text"
          value={payload.targetLabel || ''}
          onChange={(e) => onUpdate({ ...payload, targetLabel: e.target.value })}
          style={{ ...inputStyle, width: '100%' }}
          placeholder="z.B. Taj Mahal, Agra, Indien"
        />
      </div>
      {typeof lat === 'number' && typeof lng === 'number' && (
        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', fontSize: 12, color: '#67e8f9' }}>
          📍 Ziel: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
          {payload.targetLabel ? ` — ${payload.targetLabel}` : ''}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, lineHeight: 1.4 }}>
        💡 Koordinaten über Google Maps ermitteln: Rechtsklick auf Ort → "Was ist hier?"
      </div>
    </div>
  );
};

export function BunteTueteEditor({ question, onQuestionChange }: BunteTueteEditorProps) {
  const [activeTab, setActiveTab] = useState<'top5' | 'precision' | 'oneOfEight' | 'order' | 'map'>(
    (question.bunteTuete?.kind as 'top5' | 'precision' | 'oneOfEight' | 'order' | 'map') || 'top5'
  );

  const payload = question.bunteTuete || {};
  const currentErrors = validateBunteMechanic(activeTab, question);

  const handlePayloadUpdate = (newPayload: BunteTuetePayload) => {
    onQuestionChange({ ...question, bunteTuete: newPayload } as BunteTueteQuestion);
  };

  const handleTabChange = (kind: string) => {
    setActiveTab(kind as 'top5' | 'precision' | 'oneOfEight' | 'order');
    const newPayload = buildBuntePayloadNew(kind, question.id);
    handlePayloadUpdate(newPayload);
  };

  return (
    <div style={formSectionStyle}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ ...labelStyle, marginBottom: 12 }}>🎲 Bunte Tüte - Wähle eine Mechanik:</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {BUNTU_MECHANIC_CONFIGS.map((config) => {
            const configErrors = validateBunteMechanic(config.kind, question);
            const isActive = activeTab === config.kind;
            const hasErrors = configErrors.length > 0;
            
            return (
              <div key={config.kind} style={{ position: 'relative' }}>
                <button onClick={() => handleTabChange(config.kind)} title={config.description} style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: isActive ? `2px solid ${config.color}` : `1px solid ${hasErrors ? '#ef4444' : 'rgba(148,163,184,0.3)'}`,
                  background: isActive ? `${config.color}20` : (hasErrors ? 'rgba(239,68,68,0.1)' : 'rgba(30,41,59,0.4)'),
                  color: isActive ? config.color : (hasErrors ? '#ef4444' : '#cbd5e1'),
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.2s',
                  width: '100%',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{config.label}</span>
                    {hasErrors && <span style={{ fontSize: 10, opacity: 0.7 }}>⚠️</span>}
                  </div>
                </button>
                {isActive && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, color: config.color, fontStyle: 'italic' }}>💡 {config.description}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {currentErrors.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#fca5a5', marginBottom: 6 }}>❌ Validierungsfehler:</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
            {currentErrors.map((err, idx) => (
              <li key={idx} style={{ color: '#fca5a5', marginBottom: 2 }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: 12, padding: 16, border: '1px solid rgba(148,163,184,0.2)' }}>
        {activeTab === 'top5' && <Top5Editor payload={payload as BunteTueteTop5Payload} onUpdate={handlePayloadUpdate} />}
        {activeTab === 'precision' && <PrecisionEditor payload={payload as BunteTuetePrecisionPayload} onUpdate={handlePayloadUpdate} />}
        {activeTab === 'oneOfEight' && <OneOfEightEditor payload={payload as BunteTueteOneOfEightPayload} onUpdate={handlePayloadUpdate} />}
        {activeTab === 'order' && <OrderEditor payload={payload as BunteTueteOrderPayload} onUpdate={handlePayloadUpdate} />}
        {activeTab === 'map' && <MapEditor payload={payload as BunteTueteMapPayload} onUpdate={handlePayloadUpdate} />}
      </div>
    </div>
  );
}
