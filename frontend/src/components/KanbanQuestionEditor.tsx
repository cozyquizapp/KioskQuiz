import { useState, useRef } from 'react';
import type { 
  AnyQuestion, 
  DecorationKey, 
  MultipleChoiceQuestion,
  EstimateQuestion,
  BettingQuestion,
  ImageQuestion,
  BunteTueteQuestion
} from '@shared/quizTypes';
import { COZY_SLOT_TEMPLATE } from '@shared/cozyTemplate';
import { BunteTueteEditor } from './BunteTueteEditor';

interface KanbanQuestionEditorProps {
  question: AnyQuestion;
  slotIndex: number;
  onSave: (question: AnyQuestion) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const decorations: DecorationKey[] = [
  'moon', 'earth', 'cheese', 'target', 'ruler', 'measuringCup',
  'dice', 'questionBag', 'camera', 'filmStrip', 'lightbulb', 'book', 'stopwatch'
];

export function KanbanQuestionEditor({
  question,
  slotIndex,
  onSave,
  onCancel,
  onDelete
}: KanbanQuestionEditorProps) {
  const [localQuestion, setLocalQuestion] = useState<AnyQuestion>(question);
  const [imagePreview, setImagePreview] = useState<string | null>(question.imageUrl || null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const slot = COZY_SLOT_TEMPLATE[slotIndex];
  const mechanic = slot?.type || question.type;
  const bunteKind = slot?.bunteKind;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImagePreview(src);
    };
    reader.readAsDataURL(file);

    // Upload to backend
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('questionId', localQuestion.id);

      const response = await fetch('/api/upload/question-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setLocalQuestion(prev => ({ ...prev, imageUrl: data.imageUrl }));
      setImagePreview(data.imageUrl);
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Bild-Upload fehlgeschlagen');
    }
  };

  const handleSave = () => {
    onSave(localQuestion);
  };

  // Render mechanik-spezifische Felder
  const renderMechanicFields = () => {
    switch (mechanic) {
      case 'MU_CHO':
        return renderMultipleChoice();
      case 'SCHAETZCHEN':
        return renderEstimate();
      case 'STIMMTS':
        return renderBetting();
      case 'CHEESE':
        return renderImageQuestion();
      case 'BUNTE_TUETE':
        return <BunteTueteEditor question={localQuestion as BunteTueteQuestion} onQuestionChange={setLocalQuestion} />;
      default:
        return null;
    }
  };

  const renderMultipleChoice = () => {
    const q = localQuestion as MultipleChoiceQuestion;
    const options = q.options || ['', '', '', ''];

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>🅰️ Multiple Choice Optionen</label>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              checked={q.correctIndex === i}
              onChange={() => setLocalQuestion(prev => ({ ...prev, correctIndex: i } as MultipleChoiceQuestion))}
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[i] = e.target.value;
                setLocalQuestion(prev => ({ ...prev, options: newOptions } as MultipleChoiceQuestion));
              }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderEstimate = () => {
    const q = localQuestion as EstimateQuestion;

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>📊 Schätzfrage</label>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <small style={{ opacity: 0.6, fontSize: 11 }}>Zielwert</small>
            <input
              type="number"
              value={q.targetValue || 0}
              onChange={(e) => setLocalQuestion(prev => ({ ...prev, targetValue: Number(e.target.value) } as EstimateQuestion))}
              style={inputStyle}
              placeholder="z.B. 2500000"
            />
          </div>
          <div>
            <small style={{ opacity: 0.6, fontSize: 11 }}>Einheit</small>
            <input
              type="text"
              value={q.unit || ''}
              onChange={(e) => setLocalQuestion(prev => ({ ...prev, unit: e.target.value } as EstimateQuestion))}
              style={inputStyle}
              placeholder="z.B. Liter"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderBetting = () => {
    const q = localQuestion as BettingQuestion;
    const options = q.options || ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'];

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>🎯 Stimmts / Punkte verteilen</label>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              checked={q.correctIndex === i}
              onChange={() => setLocalQuestion(prev => ({ ...prev, correctIndex: i } as BettingQuestion))}
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[i] = e.target.value;
                setLocalQuestion(prev => ({ ...prev, options: newOptions } as BettingQuestion));
              }}
              style={inputStyle}
            />
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <small style={{ opacity: 0.6, fontSize: 11 }}>Punkte-Pool</small>
          <input
            type="number"
            value={q.pointsPool || 10}
            onChange={(e) => setLocalQuestion(prev => ({ ...prev, pointsPool: Number(e.target.value) } as BettingQuestion))}
            style={{ ...inputStyle, width: 100 }}
            min={1}
          />
        </div>
      </div>
    );
  };

  const renderImageQuestion = () => {
    const q = localQuestion as ImageQuestion;

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>🖼️ Cheese - Richtige Antwort</label>
        <input
          type="text"
          value={q.answer || ''}
          onChange={(e) => setLocalQuestion(prev => ({ ...prev, answer: e.target.value } as ImageQuestion))}
          style={inputStyle}
          placeholder="z.B. Eiffelturm"
        />
      </div>
    );
  };

  const renderPrecision = () => {
    const q = localQuestion as BunteTueteQuestion;
    const payload = (q.bunteTuete || { 
      kind: 'precision', 
      prompt: '', 
      ladder: [],
      autoMatchEnabled: true,
      requiresModeratorReview: false
    }) as BunteTuetePrecisionPayload;
    const ladder = payload.ladder || [];

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>🎯 Präzisiere Antwort - Mehrere Stufen</label>
        <textarea
          value={payload.prompt || ''}
          onChange={(e) => setLocalQuestion(prev => ({
            ...prev,
            bunteTuete: { ...payload, prompt: e.target.value }
          } as BunteTueteQuestion))}
          style={textareaStyle}
          rows={2}
          placeholder="z.B. In welchem Jahr fiel die Berliner Mauer?"
        />

        {/* Auto-Match Settings */}
        <div style={{ marginTop: 12, padding: 12, background: 'rgba(59,130,246,0.1)', borderRadius: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={payload.autoMatchEnabled !== false}
              onChange={(e) => setLocalQuestion(prev => ({
                ...prev,
                bunteTuete: { ...payload, autoMatchEnabled: e.target.checked }
              } as BunteTueteQuestion))}
            />
            <span>🤖 Auto-Match aktiviert (versucht automatische Zuordnung)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={payload.requiresModeratorReview === true}
              onChange={(e) => setLocalQuestion(prev => ({
                ...prev,
                bunteTuete: { ...payload, requiresModeratorReview: e.target.checked }
              } as BunteTueteQuestion))}
            />
            <span>👤 Moderator-Review erforderlich (alle Antworten manuell prüfen)</span>
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <small style={{ opacity: 0.6, fontSize: 11 }}>Präzisionsstufen (von höchster zu niedrigster Genauigkeit)</small>
          </div>
          {ladder.map((step, i) => (
            <div key={i} style={{ background: 'rgba(30,41,59,0.4)', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid rgba(148,163,184,0.2)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => {
                    const newLadder = [...ladder];
                    newLadder[i] = { ...step, label: e.target.value };
                    setLocalQuestion(prev => ({
                      ...prev,
                      bunteTuete: { ...payload, ladder: newLadder }
                    } as BunteTueteQuestion));
                  }}
                  placeholder="Label (z.B. Exakt, Nah dran, Jahrzehnt)"
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                <input
                  type="number"
                  value={step.points}
                  onChange={(e) => {
                    const newLadder = [...ladder];
                    newLadder[i] = { ...step, points: Number(e.target.value) };
                    setLocalQuestion(prev => ({
                      ...prev,
                      bunteTuete: { ...payload, ladder: newLadder }
                    } as BunteTueteQuestion));
                  }}
                  placeholder="Punkte"
                  style={{ ...inputStyle, width: 80, marginBottom: 0 }}
                />
                <button
                  onClick={() => {
                    const newLadder = ladder.filter((_, idx) => idx !== i);
                    setLocalQuestion(prev => ({
                      ...prev,
                      bunteTuete: { ...payload, ladder: newLadder }
                    } as BunteTueteQuestion));
                  }}
                  style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  ✕
                </button>
              </div>
              
              <input
                type="text"
                value={step.acceptedAnswers.join(', ')}
                onChange={(e) => {
                  const newLadder = [...ladder];
                  newLadder[i] = { ...step, acceptedAnswers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                  setLocalQuestion(prev => ({
                    ...prev,
                    bunteTuete: { ...payload, ladder: newLadder }
                  } as BunteTueteQuestion));
                }}
                placeholder="Beispiel-Antworten (kommagetrennt, z.B. 1989, neunzehnhundertneunundachtzig)"
                style={{ ...inputStyle, marginBottom: 6 }}
              />
              
              {/* Erweiterte Auto-Match Optionen */}
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                  ⚙️ Erweiterte Auto-Match Optionen
                </summary>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid rgba(148,163,184,0.2)', marginTop: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>
                      📊 Numerischer Bereich (z.B. 1987-1991)
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="number"
                        value={step.numericRange?.min ?? ''}
                        onChange={(e) => {
                          const newLadder = [...ladder];
                          newLadder[i] = { 
                            ...step, 
                            numericRange: { 
                              min: Number(e.target.value), 
                              max: step.numericRange?.max || Number(e.target.value) 
                            } 
                          };
                          setLocalQuestion(prev => ({
                            ...prev,
                            bunteTuete: { ...payload, ladder: newLadder }
                          } as BunteTueteQuestion));
                        }}
                        placeholder="Min"
                        style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                      />
                      <span style={{ lineHeight: '36px' }}>-</span>
                      <input
                        type="number"
                        value={step.numericRange?.max ?? ''}
                        onChange={(e) => {
                          const newLadder = [...ladder];
                          newLadder[i] = { 
                            ...step, 
                            numericRange: { 
                              min: step.numericRange?.min || 0, 
                              max: Number(e.target.value) 
                            } 
                          };
                          setLocalQuestion(prev => ({
                            ...prev,
                            bunteTuete: { ...payload, ladder: newLadder }
                          } as BunteTueteQuestion));
                        }}
                        placeholder="Max"
                        style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>
                      🔤 Regex Pattern (z.B. 198[0-9] für 1980er)
                    </label>
                    <input
                      type="text"
                      value={step.regexPattern ?? ''}
                      onChange={(e) => {
                        const newLadder = [...ladder];
                        newLadder[i] = { ...step, regexPattern: e.target.value || undefined };
                        setLocalQuestion(prev => ({
                          ...prev,
                          bunteTuete: { ...payload, ladder: newLadder }
                        } as BunteTueteQuestion));
                      }}
                      placeholder="z.B. 198[0-9]"
                      style={{ ...inputStyle, marginBottom: 0, fontFamily: 'monospace' }}
                    />
                  </div>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={step.fuzzyMatch === true}
                      onChange={(e) => {
                        const newLadder = [...ladder];
                        newLadder[i] = { ...step, fuzzyMatch: e.target.checked };
                        setLocalQuestion(prev => ({
                          ...prev,
                          bunteTuete: { ...payload, ladder: newLadder }
                        } as BunteTueteQuestion));
                      }}
                    />
                    <span>🔍 Fuzzy Match (erkennt ähnliche Schreibweisen)</span>
                  </label>
                  
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>
                      📝 Weitere Beispiele für Moderator (kommagetrennt)
                    </label>
                    <input
                      type="text"
                      value={step.examples?.join(', ') ?? ''}
                      onChange={(e) => {
                        const newLadder = [...ladder];
                        newLadder[i] = { ...step, examples: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                        setLocalQuestion(prev => ({
                          ...prev,
                          bunteTuete: { ...payload, ladder: newLadder }
                        } as BunteTueteQuestion));
                      }}
                      placeholder="z.B. '89, achtundachtzig"
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>
                      💡 Beschreibung für Moderator
                    </label>
                    <input
                      type="text"
                      value={step.description ?? ''}
                      onChange={(e) => {
                        const newLadder = [...ladder];
                        newLadder[i] = { ...step, description: e.target.value || undefined };
                        setLocalQuestion(prev => ({
                          ...prev,
                          bunteTuete: { ...payload, ladder: newLadder }
                        } as BunteTueteQuestion));
                      }}
                      placeholder="z.B. Exakte Jahreszahl"
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                </div>
              </details>
            </div>
          ))}
          <button
            onClick={() => {
              const newLadder = [...ladder, { label: '', acceptedAnswers: [], points: 1 }];
              setLocalQuestion(prev => ({
                ...prev,
                bunteTuete: { ...payload, ladder: newLadder }
              } as BunteTueteQuestion));
            }}
            style={{ ...uploadButtonStyle, marginTop: 8 }}
          >
            + Stufe hinzufügen
          </button>
        </div>
      </div>
    );
  };

  const renderOneOfEight = () => {
    const q = localQuestion as BunteTueteQuestion;
    const payload = (q.bunteTuete || { kind: 'oneOfEight', prompt: '', statements: [] }) as BunteTueteOneOfEightPayload;
    const statements = payload.statements || [];

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>❌ 1 von 8 falsch - Welche Aussage ist falsch?</label>
        <textarea
          value={payload.prompt || ''}
          onChange={(e) => setLocalQuestion(prev => ({
            ...prev,
            bunteTuete: { ...payload, prompt: e.target.value }
          } as BunteTueteQuestion))}
          style={textareaStyle}
          rows={2}
          placeholder="z.B. Welche dieser Aussagen ist falsch?"
        />

        <div style={{ marginTop: 12 }}>
          <small style={{ opacity: 0.6, fontSize: 11, display: 'block', marginBottom: 8 }}>8 Aussagen (1 davon falsch)</small>
          {statements.map((stmt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={stmt.isFalse || false}
                onChange={(e) => {
                  const newStatements = statements.map((s, idx) => ({
                    ...s,
                    isFalse: idx === i ? e.target.checked : false
                  }));
                  setLocalQuestion(prev => ({
                    ...prev,
                    bunteTuete: { ...payload, statements: newStatements }
                  } as BunteTueteQuestion));
                }}
                title="Ist falsch?"
              />
              <input
                type="text"
                value={stmt.text}
                onChange={(e) => {
                  const newStatements = [...statements];
                  newStatements[i] = { ...stmt, text: e.target.value };
                  setLocalQuestion(prev => ({
                    ...prev,
                    bunteTuete: { ...payload, statements: newStatements }
                  } as BunteTueteQuestion));
                }}
                placeholder={`Aussage ${String.fromCharCode(65 + i)}`}
                style={inputStyle}
              />
            </div>
          ))}
          {statements.length < 8 && (
            <button
              onClick={() => {
                const newStatements = [...statements, { id: `stmt${statements.length + 1}`, text: '', isFalse: false }];
                setLocalQuestion(prev => ({
                  ...prev,
                  bunteTuete: { ...payload, statements: newStatements }
                } as BunteTueteQuestion));
              }}
              style={{ ...uploadButtonStyle, marginTop: 8 }}
            >
              + Aussage hinzufügen
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderOrder = () => {
    const q = localQuestion as BunteTueteQuestion;
    const payload = (q.bunteTuete || { 
      kind: 'order', 
      prompt: '', 
      items: [], 
      criteriaOptions: [],
      correctByCriteria: {}
    }) as BunteTueteOrderPayload;
    const items = payload.items || [];
    const criteriaOptions = payload.criteriaOptions || [];

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>🔢 Ordnen nach Kriterium</label>
        <textarea
          value={payload.prompt || ''}
          onChange={(e) => setLocalQuestion(prev => ({
            ...prev,
            bunteTuete: { ...payload, prompt: e.target.value }
          } as BunteTueteQuestion))}
          style={textareaStyle}
          rows={2}
          placeholder="z.B. Sortiere die Tiere"
        />

        <div style={{ marginTop: 12 }}>
          <small style={{ opacity: 0.6, fontSize: 11, display: 'block', marginBottom: 8 }}>Items</small>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={item.label}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = { ...item, label: e.target.value };
                  setLocalQuestion(prev => ({
                    ...prev,
                    bunteTuete: { ...payload, items: newItems }
                  } as BunteTueteQuestion));
                }}
                placeholder={`Item ${i + 1}`}
                style={inputStyle}
              />
              <button
                onClick={() => {
                  const newItems = items.filter((_, idx) => idx !== i);
                  setLocalQuestion(prev => ({
                    ...prev,
                    bunteTuete: { ...payload, items: newItems }
                  } as BunteTueteQuestion));
                }}
                style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newItems = [...items, { id: `item${items.length + 1}`, label: '' }];
              setLocalQuestion(prev => ({
                ...prev,
                bunteTuete: { ...payload, items: newItems }
              } as BunteTueteQuestion));
            }}
            style={{ ...uploadButtonStyle, marginTop: 8 }}
          >
            + Item hinzufügen
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <small style={{ opacity: 0.6, fontSize: 11, display: 'block', marginBottom: 8 }}>
            Kriterien & Richtige Reihenfolge
          </small>
          {criteriaOptions.map((crit, i) => (
            <div key={i} style={{ background: 'rgba(30,41,59,0.4)', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={crit.label}
                onChange={(e) => {
                  const newCriteria = [...criteriaOptions];
                  newCriteria[i] = { ...crit, label: e.target.value };
                  setLocalQuestion(prev => ({
                    ...prev,
                    bunteTuete: { ...payload, criteriaOptions: newCriteria }
                  } as BunteTueteQuestion));
                }}
                placeholder="z.B. Nach Größe"
                style={{ ...inputStyle, marginBottom: 4 }}
              />
              <input
                type="text"
                value={(payload.correctByCriteria?.[crit.id] || []).join(', ')}
                onChange={(e) => {
                  const order = e.target.value.split(',').map(s => s.trim());
                  setLocalQuestion(prev => ({
                    ...prev,
                    bunteTuete: { 
                      ...payload, 
                      correctByCriteria: { 
                        ...payload.correctByCriteria, 
                        [crit.id]: order 
                      }
                    }
                  } as BunteTueteQuestion));
                }}
                placeholder="Richtige Reihenfolge (IDs, kommagetrennt)"
                style={inputStyle}
              />
            </div>
          ))}
          <button
            onClick={() => {
              const newId = `crit${criteriaOptions.length + 1}`;
              const newCriteria = [...criteriaOptions, { id: newId, label: '' }];
              setLocalQuestion(prev => ({
                ...prev,
                bunteTuete: { ...payload, criteriaOptions: newCriteria }
              } as BunteTueteQuestion));
            }}
            style={{ ...uploadButtonStyle, marginTop: 8 }}
          >
            + Kriterium hinzufügen
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 800 }}>
              Slot {slotIndex + 1}: {slot?.label || 'Frage'}
            </h2>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {question.category} • {mechanic} {bunteKind && `(${bunteKind})`}
            </div>
          </div>
          <button onClick={onCancel} style={closeButtonStyle}>✕</button>
        </div>

        {/* Content */}
        <div style={modalContentStyle}>
          {/* Frage */}
          <div style={formSectionStyle}>
            <label style={labelStyle}>Frage (Deutsch)</label>
            <textarea
              value={localQuestion.question || ''}
              onChange={(e) => setLocalQuestion(prev => ({ ...prev, question: e.target.value }))}
              style={textareaStyle}
              rows={3}
              placeholder="Gib deine Frage ein..."
            />
          </div>

          {/* Mechanik-spezifische Felder */}
          {renderMechanicFields()}

          {/* Fun Fact */}
          <div style={formSectionStyle}>
            <label style={labelStyle}>Fun Fact / Moderationsnotiz</label>
            <textarea
              value={localQuestion.funFact || ''}
              onChange={(e) => setLocalQuestion(prev => ({ ...prev, funFact: e.target.value }))}
              style={textareaStyle}
              rows={2}
              placeholder="Interessante Info für den Moderator..."
            />
          </div>

          {/* Bild-Upload */}
          <div style={formSectionStyle}>
            <label style={labelStyle}>📸 Bild</label>
            {imagePreview && (
              <div style={imagePreviewStyle}>
                <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8 }} />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setLocalQuestion(prev => ({ ...prev, imageUrl: '' }));
                  }}
                  style={{ marginTop: 8, padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Löschen
                </button>
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <button onClick={() => imageInputRef.current?.click()} style={uploadButtonStyle}>
              📁 {imagePreview ? 'Bild ändern' : 'Bild auswählen'}
            </button>
          </div>

          {/* Deko-Icons */}
          <div style={formSectionStyle}>
            <label style={labelStyle}>✨ Deko-Icons</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div>
                <small style={{ opacity: 0.6 }}>Links:</small>
                <select
                  value={localQuestion.decorationLeft || ''}
                  onChange={(e) => setLocalQuestion(prev => ({ ...prev, decorationLeft: e.target.value as DecorationKey || null }))}
                  style={selectStyle}
                >
                  <option value="">Keine</option>
                  {decorations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <small style={{ opacity: 0.6 }}>Rechts:</small>
                <select
                  value={localQuestion.decorationRight || ''}
                  onChange={(e) => setLocalQuestion(prev => ({ ...prev, decorationRight: e.target.value as DecorationKey || null }))}
                  style={selectStyle}
                >
                  <option value="">Keine</option>
                  {decorations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Points */}
          <div style={formSectionStyle}>
            <label style={labelStyle}>Punkte</label>
            <input
              type="number"
              value={localQuestion.points}
              onChange={(e) => setLocalQuestion(prev => ({ ...prev, points: Number(e.target.value) }))}
              style={{ ...inputStyle, width: 100 }}
              min={0}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          {onDelete && (
            <button onClick={onDelete} style={deleteButtonStyle}>
              🗑️ Löschen
            </button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={cancelButtonStyle}>
              Abbrechen
            </button>
            <button onClick={handleSave} style={saveButtonStyle}>
              ✓ Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20
};

const modalStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(10,14,24,0.98))',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 16,
  width: '100%',
  maxWidth: 700,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
};

const modalHeaderStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const modalContentStyle: React.CSSProperties = {
  padding: '24px',
  overflowY: 'auto',
  flex: 1
};

const modalFooterStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid rgba(148,163,184,0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const formSectionStyle: React.CSSProperties = {
  marginBottom: 20
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'inherit'
};

const selectStyle: React.CSSProperties = {
  ...inputStyle
};

const uploadButtonStyle: React.CSSProperties = {
  background: 'rgba(59,130,246,0.2)',
  border: '1px solid rgba(59,130,246,0.4)',
  borderRadius: 8,
  padding: '10px 16px',
  color: '#60a5fa',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13
};

const imagePreviewStyle: React.CSSProperties = {
  marginBottom: 12,
  textAlign: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e2e8f0',
  cursor: 'pointer',
  padding: '6px 12px',
  fontSize: 14
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(239,68,68,0.4)',
  background: 'rgba(239,68,68,0.1)',
  color: '#fca5a5',
  cursor: 'pointer',
  fontWeight: 600
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontWeight: 600
};

const saveButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(34,211,238,0.4)',
  background: 'rgba(34,211,238,0.2)',
  color: '#22d3ee',
  cursor: 'pointer',
  fontWeight: 600
};

export default KanbanQuestionEditor;
