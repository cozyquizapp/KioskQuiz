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
import { translateText } from '../api';
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

const IMAGE_POLICY_HINT = 'Tipp: Wenn moeglich Bild-Links nutzen und Uploads fuer eigene Spezialbilder reservieren.';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isTranslatingFunFact, setIsTranslatingFunFact] = useState(false);
  const [isTranslatingQuestion, setIsTranslatingQuestion] = useState(false);
  const [isTranslatingOptions, setIsTranslatingOptions] = useState<boolean[]>([false, false, false, false]);
  const [isTranslatingAnswer, setIsTranslatingAnswer] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'mechanic' | 'media' | 'points' | 'preview'>('basic');

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
    setIsUploading(true);
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
      showNotification('success', '✅ Bild hochgeladen. Tipp: Fuer Standardbilder lieber stabile Bild-Links nutzen.');
    } catch (err) {
      showNotification('error', `❌ Upload fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      // Revert preview on error
      setImagePreview(question.imageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    onSave(localQuestion);
  };

  const handleAutoTranslateFunFact = async () => {
    const source = (localQuestion.funFact || '').trim();
    if (!source) {
      showNotification('error', '❌ Bitte zuerst eine deutsche Moderationsnotiz eingeben');
      return;
    }
    setIsTranslatingFunFact(true);
    try {
      const translated = await translateText(source, 'de', 'en');
      setLocalQuestion((prev) => ({ ...prev, funFactEn: translated }));
      showNotification('success', '✅ Moderationsnotiz automatisch nach EN übersetzt');
    } catch (err) {
      showNotification('error', `❌ Übersetzung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsTranslatingFunFact(false);
    }
  };

  const handleTranslateQuestion = async () => {
    const source = ((localQuestion as any).question || '').trim();
    if (!source) {
      showNotification('error', '❌ Bitte zuerst eine deutsche Frage eingeben');
      return;
    }
    setIsTranslatingQuestion(true);
    try {
      const translated = await translateText(source, 'de', 'en');
      setLocalQuestion((prev) => ({ ...prev, questionEn: translated } as any));
      showNotification('success', '✅ Frage nach EN übersetzt');
    } catch (err) {
      showNotification('error', `❌ Übersetzung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsTranslatingQuestion(false);
    }
  };

  const handleTranslateOption = async (index: number) => {
    const q = localQuestion as MultipleChoiceQuestion;
    const options = q.options || ['', '', '', ''];
    const source = (options[index] || '').trim();
    if (!source) {
      showNotification('error', `❌ Bitte zuerst Option ${String.fromCharCode(65 + index)} eingeben`);
      return;
    }
    setIsTranslatingOptions((prev) => { const next = [...prev]; next[index] = true; return next; });
    try {
      const translated = await translateText(source, 'de', 'en');
      setLocalQuestion((prev) => {
        const optionsEn = [...(((prev as any).optionsEn as string[]) || [])];
        optionsEn[index] = translated;
        return { ...prev, optionsEn } as any;
      });
    } catch (err) {
      showNotification('error', `❌ Übersetzung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsTranslatingOptions((prev) => { const next = [...prev]; next[index] = false; return next; });
    }
  };

  const handleTranslateAnswer = async () => {
    const source = ((localQuestion as any).answer || '').trim();
    if (!source) {
      showNotification('error', '❌ Bitte zuerst eine Antwort eingeben');
      return;
    }
    setIsTranslatingAnswer(true);
    try {
      const translated = await translateText(source, 'de', 'en');
      setLocalQuestion((prev) => ({ ...prev, answerEn: translated } as any));
      showNotification('success', '✅ Antwort nach EN übersetzt');
    } catch (err) {
      showNotification('error', `❌ Übersetzung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsTranslatingAnswer(false);
    }
  };

  const handleTranslateAll = async () => {
    setIsTranslatingAll(true);
    try {
      const any = localQuestion as any;
      const updates: Record<string, any> = {};

      if (any.question) {
        updates.questionEn = await translateText(any.question, 'de', 'en');
      }
      if (Array.isArray(any.options) && any.options.length > 0) {
        updates.optionsEn = await Promise.all(
          (any.options as string[]).map((o: string) => translateText(o, 'de', 'en'))
        );
      }
      if (any.answer) {
        updates.answerEn = await translateText(any.answer, 'de', 'en');
      }
      if (any.funFact) {
        updates.funFactEn = await translateText(any.funFact, 'de', 'en');
      }
      if (Object.keys(updates).length > 0) {
        setLocalQuestion((prev) => ({ ...prev, ...updates } as any));
        showNotification('success', '✅ Alle EN-Felder übersetzt');
      } else {
        showNotification('error', '❌ Keine DE-Felder zum Übersetzen gefunden');
      }
    } catch (err) {
      showNotification('error', `❌ Übersetzung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsTranslatingAll(false);
    }
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
    const optionsEn: string[] = (q as any).optionsEn || [];

    return (
      <div style={formSectionStyle}>
        <label style={labelStyle}>🅰️ Multiple Choice Optionen</label>
        {options.map((opt, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
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
            <div style={{ display: 'flex', gap: 6, marginTop: 4, marginLeft: 24, alignItems: 'center' }}>
              <input
                type="text"
                value={optionsEn[i] || ''}
                onChange={(e) => {
                  const newOptionsEn = [...optionsEn];
                  newOptionsEn[i] = e.target.value;
                  setLocalQuestion(prev => ({ ...prev, optionsEn: newOptionsEn } as any));
                }}
                placeholder={`🇬🇧 Option ${String.fromCharCode(65 + i)} (EN, auto)`}
                style={{
                  ...inputStyle,
                  flex: 1,
                  marginTop: 0,
                  fontSize: 12,
                  color: '#94a3b8',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(148,163,184,0.2)'
                }}
              />
              <button
                onClick={() => handleTranslateOption(i)}
                disabled={isTranslatingOptions[i]}
                style={{
                  border: '1px solid rgba(148,163,184,0.3)',
                  background: 'rgba(148,163,184,0.1)',
                  color: '#94a3b8',
                  borderRadius: 999,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isTranslatingOptions[i] ? 'not-allowed' : 'pointer',
                  opacity: isTranslatingOptions[i] ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title={`Option ${String.fromCharCode(65 + i)} übersetzen`}
              >
                {isTranslatingOptions[i] ? '⏳' : '🌐'}
              </button>
            </div>
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
        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
          <input
            type="text"
            value={(q as any).answerEn || ''}
            onChange={(e) => setLocalQuestion(prev => ({ ...prev, answerEn: e.target.value } as any))}
            placeholder="🇬🇧 Answer (EN, auto)"
            style={{
              ...inputStyle,
              flex: 1,
              marginTop: 0,
              fontSize: 12,
              color: '#94a3b8',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(148,163,184,0.2)'
            }}
          />
          <button
            onClick={handleTranslateAnswer}
            disabled={isTranslatingAnswer}
            style={{
              border: '1px solid rgba(148,163,184,0.3)',
              background: 'rgba(148,163,184,0.1)',
              color: '#94a3b8',
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 600,
              cursor: isTranslatingAnswer ? 'not-allowed' : 'pointer',
              opacity: isTranslatingAnswer ? 0.6 : 1,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            title="Antwort ins Englische übersetzen"
          >
            {isTranslatingAnswer ? '⏳' : '🌐'}
          </button>
        </div>
      </div>
    );
  };

  const renderBeamerPreview = () => {
    const isMC = mechanic === 'MU_CHO';
    const questionText = (localQuestion as any).question || '';
    const mcOptions: string[] = isMC ? ((localQuestion as MultipleChoiceQuestion).options || ['', '', '', '']) : [];
    const tileColors = [
      { bg: 'rgba(59,130,246,0.25)', border: '#3B82F6' },
      { bg: 'rgba(34,197,94,0.25)', border: '#22C55E' },
      { bg: 'rgba(239,68,68,0.25)', border: '#EF4444' },
      { bg: 'rgba(249,115,22,0.25)', border: '#F97316' },
    ];
    const letters = ['A', 'B', 'C', 'D'];

    return (
      <div style={{ padding: '8px 0' }}>
        <div
          style={{
            borderRadius: 12,
            background: '#0f0f1a',
            padding: 16,
            marginTop: 8,
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div
            style={{
              color: '#f05fb2',
              fontWeight: 900,
              fontSize: 16,
              textAlign: 'center',
              marginBottom: isMC ? 12 : 0,
              lineHeight: 1.3,
              minHeight: 24
            }}
          >
            {questionText || <span style={{ opacity: 0.35, fontWeight: 400 }}>Fragetext...</span>}
          </div>

          {isMC && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8
              }}
            >
              {mcOptions.slice(0, 4).map((opt, i) => (
                <div
                  key={i}
                  style={{
                    background: tileColors[i].bg,
                    border: `2px solid ${tileColors[i].border}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6
                  }}
                >
                  <span style={{ opacity: 0.7, flexShrink: 0 }}>{letters[i]}</span>
                  <span style={{ wordBreak: 'break-word' }}>
                    {opt || <span style={{ opacity: 0.35, fontWeight: 400 }}>Option {letters[i]}...</span>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isMC && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>
              {mechanic === 'SCHAETZCHEN' ? '— Schätzfrage —' : `— ${mechanic} —`}
            </div>
          )}
        </div>
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

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.2)' }}>
          {[
            { key: 'basic', label: 'Basis' },
            { key: 'mechanic', label: 'Mechanik' },
            { key: 'media', label: 'Medien & Deko' },
            { key: 'points', label: 'Punkte' },
            { key: 'preview', label: '👁 Vorschau' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: activeTab === tab.key ? 'rgba(59,130,246,0.25)' : 'rgba(0,0,0,0.2)',
                color: '#e2e8f0',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={modalContentStyle}>
          {activeTab === 'basic' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslatingAll}
                  style={{
                    border: '1px solid rgba(59,130,246,0.45)',
                    background: 'rgba(59,130,246,0.15)',
                    color: '#93c5fd',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: isTranslatingAll ? 'not-allowed' : 'pointer',
                    opacity: isTranslatingAll ? 0.6 : 1
                  }}
                  title="Alle DE-Felder automatisch ins Englische übersetzen"
                >
                  {isTranslatingAll ? '⏳ Übersetze...' : '🌐 Alle übersetzen'}
                </button>
              </div>
              <div style={formSectionStyle}>
                <label style={labelStyle}>Frage (Deutsch)</label>
                <textarea
                  value={localQuestion.question || ''}
                  onChange={(e) => setLocalQuestion(prev => ({ ...prev, question: e.target.value }))}
                  style={textareaStyle}
                  rows={3}
                  placeholder="Gib deine Frage ein..."
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={(localQuestion as any).questionEn || ''}
                    onChange={(e) => setLocalQuestion(prev => ({ ...prev, questionEn: e.target.value } as any))}
                    placeholder="🇬🇧 English (auto)"
                    style={{
                      ...inputStyle,
                      flex: 1,
                      marginTop: 0,
                      fontSize: 12,
                      color: '#94a3b8',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(148,163,184,0.2)'
                    }}
                  />
                  <button
                    onClick={handleTranslateQuestion}
                    disabled={isTranslatingQuestion}
                    style={{
                      border: '1px solid rgba(148,163,184,0.3)',
                      background: 'rgba(148,163,184,0.1)',
                      color: '#94a3b8',
                      borderRadius: 999,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: isTranslatingQuestion ? 'not-allowed' : 'pointer',
                      opacity: isTranslatingQuestion ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    title="Frage ins Englische übersetzen"
                  >
                    {isTranslatingQuestion ? '⏳' : '🌐'}
                  </button>
                </div>
              </div>
              <div style={formSectionStyle}>
                <label style={labelStyle}>Fun Fact / Moderationsnotiz (DE)</label>
                <textarea
                  value={localQuestion.funFact || ''}
                  onChange={(e) => setLocalQuestion(prev => ({ ...prev, funFact: e.target.value }))}
                  style={textareaStyle}
                  rows={2}
                  placeholder="Interessante Info für den Moderator..."
                />
              </div>
              <div style={formSectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Fun Fact / Moderationsnotiz (EN)</label>
                  <button
                    onClick={handleAutoTranslateFunFact}
                    disabled={isTranslatingFunFact}
                    style={{
                      border: '1px solid rgba(59,130,246,0.45)',
                      background: 'rgba(59,130,246,0.2)',
                      color: '#93c5fd',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: isTranslatingFunFact ? 'not-allowed' : 'pointer',
                      opacity: isTranslatingFunFact ? 0.6 : 1
                    }}
                    title="DE-Notiz automatisch ins Englische übersetzen"
                  >
                    {isTranslatingFunFact ? '⏳ Übersetze...' : '🌐 Auto EN'}
                  </button>
                </div>
                <textarea
                  value={(localQuestion as any).funFactEn || ''}
                  onChange={(e) => setLocalQuestion((prev) => ({ ...prev, funFactEn: e.target.value }))}
                  style={textareaStyle}
                  rows={2}
                  placeholder="English note for moderator..."
                />
              </div>
            </>
          )}

          {activeTab === 'mechanic' && (
            <>{renderMechanicFields()}</>
          )}

          {activeTab === 'media' && (
            <>
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
                  disabled={isUploading}
                />
                <button 
                  onClick={() => imageInputRef.current?.click()} 
                  style={{
                    ...uploadButtonStyle,
                    opacity: isUploading ? 0.6 : 1,
                    cursor: isUploading ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? '⏳ Lädt...' : `📁 ${imagePreview ? 'Bild ändern' : 'Bild auswählen'}`}
                </button>
                <small style={{ display: 'block', marginTop: 8, opacity: 0.75, fontSize: 11 }}>
                  {IMAGE_POLICY_HINT}
                </small>
              </div>

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
            </>
          )}

          {activeTab === 'points' && (
            <>
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
            </>
          )}

          {activeTab === 'preview' && renderBeamerPreview()}
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
