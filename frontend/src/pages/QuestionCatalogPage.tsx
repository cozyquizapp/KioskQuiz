import { useState, useEffect, useRef } from 'react';
import type { AnyQuestion, QuizCategory, CozyQuestionType } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryLabels } from '../categoryLabels';
import KanbanQuestionEditor from '../components/KanbanQuestionEditor';

const MECHANIC_LABELS: Record<string, string> = {
  estimate: '📊 Schätzfrage',
  multipleChoice: '🅰️ Multiple Choice',
  trueFalse: '✓/✗ Wahr/Falsch',
  imageQuestion: '🖼️ Bildfrage',
  betting: '🎯 Punkte verteilen',
  sortItems: '🔢 Sortieren',
  custom: '⚙️ Custom'
};

const BUNTE_TUETE_LABELS: Record<string, string> = {
  top5: '🏆 Top 5',
  precision: '🎯 Präzision',
  oneOfEight: '❌ 1 von 8 falsch',
  order: '🔢 Ordnen'
};

export default function QuestionCatalogPage() {
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<AnyQuestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<QuizCategory | 'all'>('all');
  const [mechanicFilter, setMechanicFilter] = useState<CozyQuestionType | 'all'>('all');
  const [editingQuestion, setEditingQuestion] = useState<AnyQuestion | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      const data = await response.json();
      setQuestions(data.questions || []);
      setFilteredQuestions(data.questions || []);
    } catch (err) {
      // Failed to load questions
    }
  };

  // Filter anwenden
  useEffect(() => {
    let filtered = [...questions];

    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((q) => q.category === categoryFilter);
    }

    if (mechanicFilter !== 'all') {
      filtered = filtered.filter((q) => q.type === mechanicFilter);
    }

    setFilteredQuestions(filtered);
  }, [searchTerm, categoryFilter, mechanicFilter, questions]);

  const handleSaveQuestion = async (question: AnyQuestion) => {
    try {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question)
      });

      if (!response.ok) throw new Error('Speichern fehlgeschlagen');

      await loadQuestions();
      setEditingQuestion(null);
      alert('✓ Frage gespeichert');
    } catch (err) {
      alert('Fehler beim Speichern');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('🗑️ Frage wirklich dauerhaft löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.')) return;

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Löschen fehlgeschlagen');

      await loadQuestions();
      alert('✓ Frage gelöscht');
    } catch (err) {
      alert('Fehler beim Löschen');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Lädt Fragen...');

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const questionsToUpload = Array.isArray(data) ? data : [data];

      const response = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsToUpload })
      });

      if (!response.ok) throw new Error('Upload fehlgeschlagen');

      const result = await response.json();
      await loadQuestions();
      setUploadStatus(`✓ ${result.count || questionsToUpload.length} Fragen importiert`);
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      setUploadStatus('❌ Upload fehlgeschlagen');
      setTimeout(() => setUploadStatus(''), 3000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportQuestions = () => {
    const dataStr = JSON.stringify(filteredQuestions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `questions-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAIStructure = () => {
    const structure = `# Fragenstruktur für KI-Generierung

## Multiple Choice Frage (Mu-Cho)
\`\`\`json
{
  "id": "unique-id",
  "question": "Frage Text",
  "type": "MU_CHO",
  "category": "Mu-Cho",
  "mechanic": "multipleChoice",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 0,
  "points": 1,
  "segmentIndex": 0,
  "tags": ["tag1", "tag2"],
  "funFact": "Interessanter Fakt zur Antwort"
}
\`\`\`

## Schätzfrage (Schaetzchen)
\`\`\`json
{
  "id": "unique-id",
  "question": "Wie viele...",
  "type": "SCHAETZCHEN",
  "category": "Schaetzchen",
  "mechanic": "estimate",
  "targetValue": 42,
  "unit": "Stück",
  "points": 2,
  "segmentIndex": 0,
  "funFact": "Zusatzinfo"
}
\`\`\`

## Stimmts Frage (Betting)
\`\`\`json
{
  "id": "unique-id",
  "question": "Welche Aussage ist richtig?",
  "type": "STIMMTS",
  "category": "Stimmts",
  "mechanic": "betting",
  "options": ["Aussage A", "Aussage B", "Aussage C"],
  "correctIndex": 1,
  "pointsPool": 10,
  "points": 2,
  "segmentIndex": 0
}
\`\`\`

## Bildfrage (Cheese)
\`\`\`json
{
  "id": "unique-id",
  "question": "Was ist auf dem Bild zu sehen?",
  "type": "CHEESE",
  "category": "Cheese",
  "mechanic": "imageQuestion",
  "answer": "Die korrekte Antwort",
  "imageUrl": "/path/to/image.jpg",
  "points": 1,
  "segmentIndex": 0
}
\`\`\`

## Bunte Tüte - Top 5
\`\`\`json
{
  "id": "unique-id",
  "question": "Nenne 5 Beispiele",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "top5",
    "payload": {
      "prompt": "Frage Prompt",
      "correctOrder": ["Antwort 1", "Antwort 2", "Antwort 3", "Antwort 4", "Antwort 5"]
    }
  },
  "points": 3,
  "segmentIndex": 0
}
\`\`\`

## Bunte Tüte - Präzision (Ladder)
\`\`\`json
{
  "id": "unique-id",
  "question": "Präzise Antwort gesucht",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "precision",
    "payload": {
      "prompt": "Was ist...",
      "ladder": [
        { "label": "Exakt", "acceptedAnswers": ["Präzise Antwort"], "points": 5 },
        { "label": "Nah dran", "acceptedAnswers": ["Ungefähre Antwort"], "points": 3 },
        { "label": "Weit weg", "acceptedAnswers": ["Grobe Antwort"], "points": 1 }
      ]
    }
  },
  "points": 5,
  "segmentIndex": 1
}
\`\`\`

## Bunte Tüte - One of Eight
\`\`\`json
{
  "id": "unique-id",
  "question": "Welche Aussage ist falsch?",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "oneOfEight",
    "payload": {
      "prompt": "Finde die falsche Aussage",
      "statements": [
        { "text": "Wahre Aussage 1", "isFalse": false },
        { "text": "Wahre Aussage 2", "isFalse": false },
        { "text": "Wahre Aussage 3", "isFalse": false },
        { "text": "Wahre Aussage 4", "isFalse": false },
        { "text": "Wahre Aussage 5", "isFalse": false },
        { "text": "Wahre Aussage 6", "isFalse": false },
        { "text": "Wahre Aussage 7", "isFalse": false },
        { "text": "FALSCHE Aussage", "isFalse": true }
      ]
    }
  },
  "points": 3,
  "segmentIndex": 1
}
\`\`\`

## Bunte Tüte - Order (Sortieren)
\`\`\`json
{
  "id": "unique-id",
  "question": "Sortiere nach Kriterium",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "order",
    "payload": {
      "prompt": "Ordne die Items",
      "items": ["Item A", "Item B", "Item C", "Item D"],
      "criteriaOptions": ["Nach Größe", "Nach Alter", "Alphabetisch"],
      "correctByCriteria": {
        "Nach Größe": ["Item C", "Item A", "Item D", "Item B"],
        "Nach Alter": ["Item B", "Item D", "Item A", "Item C"]
      }
    }
  },
  "points": 3,
  "segmentIndex": 1
}
\`\`\`

## Wichtige Felder:
- \`id\`: Eindeutige ID (z.B. "q-schaetz-001")
- \`type\`: MU_CHO | SCHAETZCHEN | STIMMTS | CHEESE | BUNTE_TUETE
- \`category\`: Mu-Cho | Schaetzchen | Stimmts | Cheese | GemischteTuete
- \`segmentIndex\`: 0 (für 1pt Fragen) oder 1 (für 2pt+ Fragen)
- \`tags\`: Array von Schlagwörtern für Suche
- \`funFact\`: Zusätzliche Info nach Auflösung
`;

    navigator.clipboard.writeText(structure);
    alert('✓ KI-Struktur in Zwischenablage kopiert!');
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>📚 Fragenkatalog</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, opacity: 0.6 }}>
            {filteredQuestions.length} von {questions.length} Fragen
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleCopyAIStructure} style={buttonSecondaryStyle}>
            🤖 KI-Struktur
          </button>
          <button onClick={handleExportQuestions} style={buttonSecondaryStyle}>
            📥 Export JSON
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={buttonPrimaryStyle}>
            📤 Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleBulkUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {uploadStatus && (
        <div style={{
          padding: 12,
          background: uploadStatus.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(248,113,113,0.1)',
          border: `1px solid ${uploadStatus.startsWith('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.3)'}`,
          borderRadius: 8,
          margin: '0 20px',
          color: uploadStatus.startsWith('✓') ? '#22c55e' : '#f87171',
          fontWeight: 600
        }}>
          {uploadStatus}
        </div>
      )}

      {/* Filterleiste */}
      <div style={filtersStyle}>
        <input
          type="text"
          placeholder="🔍 Suche nach Frage, ID oder Tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as QuizCategory | 'all')}
            style={selectStyle}
          >
            <option value="all">Alle Kategorien</option>
            <option value="Schaetzchen">Schaetzchen</option>
            <option value="Mu-Cho">Mu-Cho</option>
            <option value="Stimmts">Stimmts</option>
            <option value="Cheese">Cheese</option>
            <option value="GemischteTuete">Bunte Tüte</option>
          </select>

          <select
            value={mechanicFilter}
            onChange={(e) => setMechanicFilter(e.target.value as CozyQuestionType | 'all')}
            style={selectStyle}
          >
            <option value="all">Alle Mechaniken</option>
            <option value="MU_CHO">Multiple Choice</option>
            <option value="SCHAETZCHEN">Schätzfrage</option>
            <option value="STIMMTS">Stimmts/Betting</option>
            <option value="CHEESE">Cheese/Bild</option>
            <option value="BUNTE_TUETE">Bunte Tüte</option>
          </select>
        </div>
      </div>

      {/* Fragenliste */}
      <div style={questionListStyle}>
        {filteredQuestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.4 }}>
            Keine Fragen gefunden
          </div>
        )}

        {filteredQuestions.map((q) => {
          const catColor = categoryColors[q.category] || '#64748b';
          const usedCount = q.usedIn?.length || 0;
          const bunteKind = (q as any).bunteTuete?.kind;

          return (
            <div
              key={q.id}
              style={{
                ...questionCardStyle,
                borderColor: catColor
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                    {q.question}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: catColor, fontWeight: 600 }}>
                      {(categoryLabels as any)[q.category]?.de || q.category}
                    </span>
                    <span>•</span>
                    <span>{MECHANIC_LABELS[q.mechanic] || q.mechanic}</span>
                    {bunteKind && (
                      <>
                        <span>•</span>
                        <span>{BUNTE_TUETE_LABELS[bunteKind] || bunteKind}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{q.points}pt</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'monospace' }}>ID: {q.id}</span>
                  </div>

                  {q.tags && q.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {q.tags.map((tag) => (
                        <span key={tag} style={tagStyle}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {usedCount > 0 && (
                    <div style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: '#fbbf24',
                      fontWeight: 600
                    }}>
                      🎯 Verwendet in {usedCount} Quiz{usedCount > 1 ? 'zes' : ''}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={() => setEditingQuestion(q)}
                    style={editButtonStyle}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    style={deleteButtonStyle}
                  >
                    🗑️ Del
                  </button>
                </div>
              </div>

              {q.imageUrl && (
                <div style={{
                  width: '100%',
                  height: 80,
                  background: `url(${q.imageUrl}) center/cover`,
                  borderRadius: 8,
                  marginTop: 12
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Modal */}
      {editingQuestion && (
        <KanbanQuestionEditor
          question={editingQuestion}
          slotIndex={0}
          onSave={handleSaveQuestion}
          onCancel={() => setEditingQuestion(null)}
          onDelete={() => {
            handleDeleteQuestion(editingQuestion.id);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0b0d14',
  color: '#e2e8f0',
  display: 'flex',
  flexDirection: 'column'
};

const headerStyle: React.CSSProperties = {
  padding: '24px 20px',
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(15,23,42,0.8)'
};

const filtersStyle: React.CSSProperties = {
  padding: 20,
  display: 'flex',
  gap: 12,
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  background: 'rgba(15,23,42,0.5)'
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(15,23,42,0.8)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none'
};

const selectStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.8)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none',
  minWidth: 180
};

const questionListStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 20,
  display: 'grid',
  gap: 16
};

const questionCardStyle: React.CSSProperties = {
  background: 'var(--ui-card-bg)',
  border: '2px solid',
  borderRadius: 12,
  padding: 16,
  transition: 'all 0.2s ease'
};

const tagStyle: React.CSSProperties = {
  background: 'rgba(99, 229, 255, 0.16)',
  border: '1px solid rgba(99, 229, 255, 0.35)',
  borderRadius: 4,
  padding: '3px 10px',
  fontSize: 11,
  color: '#bae6fd',
  fontWeight: 600
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '1px solid rgba(99, 229, 255, 0.45)',
  background: 'var(--ui-button-info)',
  color: 'var(--ui-button-on-light)',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '1px solid var(--ui-panel-border)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--ui-chip-text)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14
};

const editButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid rgba(34,197,94,0.45)',
  background: 'var(--ui-button-success)',
  color: 'var(--ui-button-on-light)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: 'nowrap'
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid rgba(239, 68, 68, 0.45)',
  background: 'var(--ui-button-danger)',
  color: 'var(--ui-button-on-light)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: 'nowrap'
};
