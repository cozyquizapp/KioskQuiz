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
import {
  modalOverlayStyle,
  modalStyle,
  modalHeaderStyle,
  modalContentStyle,
  modalFooterStyle,
  formSectionStyle,
  labelStyle,
  inputStyle,
  textareaStyle,
  selectStyle,
  uploadButtonStyle,
  closeButtonStyle,
  deleteButtonStyle,
  cancelButtonStyle,
  saveButtonStyle,
  imagePreviewStyle,
  errorNotificationStyle,
  successNotificationStyle
} from './editorStyles';

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
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const slot = COZY_SLOT_TEMPLATE[slotIndex];
  const mechanic = slot?.type || question.type;
  const bunteKind = slot?.bunteKind;

  const showNotification = (type: 'error' | 'success', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('error', '❌ Nur Bilddateien erlaubt');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', '❌ Bild zu groß (max. 5MB)');
      return;
    }

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setLocalQuestion(prev => ({ ...prev, imageUrl: data.imageUrl }));
      setImagePreview(data.imageUrl);
      showNotification('success', '✅ Bild erfolgreich hochgeladen');
    } catch (err) {
      console.error('Image upload error:', err);
      showNotification('error', `❌ Upload fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      // Revert preview on error
      setImagePreview(question.imageUrl || null);
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

  return (
    <>
      {/* Notification */}
      {notification && (
        <div style={notification.type === 'error' ? errorNotificationStyle : successNotificationStyle}>
          {notification.message}
        </div>
      )}

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
    </>
  );
}

export default KanbanQuestionEditor;
