import { useState, useEffect } from 'react';
import type { AnyQuestion, QuizCategory, CozyQuestionType, MultipleChoiceQuestion } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryLabels } from '../categoryLabels';

interface QuestionCatalogProps {
  onSelectQuestion: (question: AnyQuestion) => void;
  usedQuestionIds?: string[];
}

// Mechanik-Labels für verschiedene Frage-Typen
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
  precision: '🎯 Präzisiere Antwort',
  oneOfEight: '❌ 1 von 8 falsch',
  order: '🔢 Ordnen nach Kriterium'
};

export function QuestionCatalog({ onSelectQuestion, usedQuestionIds = [] }: QuestionCatalogProps) {
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<AnyQuestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<QuizCategory | 'all'>('all');
  const [mechanicFilter, setMechanicFilter] = useState<CozyQuestionType | 'all'>('all');
  const [hideUsed, setHideUsed] = useState(false);

  // Fragen vom Backend laden
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
      console.error('Fehler beim Laden der Fragen:', err);
    }
  };

  // Filter anwenden
  useEffect(() => {
    let filtered = [...questions];

    // Suchbegriff
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Kategorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((q) => q.category === categoryFilter);
    }

    // Mechanik
    if (mechanicFilter !== 'all') {
      filtered = filtered.filter((q) => q.type === mechanicFilter);
    }

    // Bereits verwendete ausblenden
    if (hideUsed) {
      filtered = filtered.filter((q) => !usedQuestionIds.includes(q.id));
    }

    setFilteredQuestions(filtered);
  }, [searchTerm, categoryFilter, mechanicFilter, hideUsed, questions, usedQuestionIds]);

  const isQuestionUsed = (questionId: string) => usedQuestionIds.includes(questionId);

  const handleCreateQuestion = () => {
    const newQuestion: AnyQuestion = {
      id: `q-${Date.now()}`,
      question: 'Neue Frage',
      points: 1,
      category: 'Mu-Cho',
      mechanic: 'multipleChoice',
      type: 'MU_CHO',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctIndex: 0,
      segmentIndex: 0
    } as MultipleChoiceQuestion;
    onSelectQuestion(newQuestion);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📚 Fragenkatalog</h3>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{filteredQuestions.length} Fragen</div>
          </div>
          <button onClick={handleCreateQuestion} style={createButtonStyle}>
            ➕ Neue Frage
          </button>
        </div>
      </div>

      {/* Filterleiste */}
      <div style={filtersStyle}>
        <input
          type="text"
          placeholder="🔍 Suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />

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

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={hideUsed}
            onChange={(e) => setHideUsed(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Verwendete ausblenden
        </label>
      </div>

      {/* Fragenliste */}
      <div style={questionListStyle}>
        {filteredQuestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>
            Keine Fragen gefunden
          </div>
        )}

        {filteredQuestions.map((q) => {
          const catColor = categoryColors[q.category] || '#64748b';
          const used = isQuestionUsed(q.id);
          const bunteKind = (q as any).bunteTuete?.kind;

          return (
            <div
              key={q.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('question', JSON.stringify(q));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onSelectQuestion(q)}
              style={{
                ...questionCardStyle,
                borderColor: catColor,
                opacity: used ? 0.5 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {q.question.length > 80 ? q.question.substring(0, 80) + '...' : q.question}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: catColor }}>
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
                  </div>
                </div>

                {used && (
                  <div style={{
                    background: 'rgba(251,191,36,0.2)',
                    border: '1px solid rgba(251,191,36,0.4)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#fbbf24',
                    whiteSpace: 'nowrap'
                  }}>
                    Im Quiz
                  </div>
                )}
              </div>

              {q.imageUrl && (
                <div style={{
                  width: '100%',
                  height: 50,
                  background: `url(${q.imageUrl}) center/cover`,
                  borderRadius: 6,
                  marginTop: 8
                }} />
              )}

              {q.tags && q.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                  {q.tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={tagStyle}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: 'rgba(15,23,42,0.8)',
  borderRadius: 12,
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  background: 'rgba(15,23,42,0.6)'
};

const filtersStyle: React.CSSProperties = {
  padding: 16,
  display: 'grid',
  gap: 8,
  borderBottom: '1px solid rgba(148,163,184,0.2)'
};

const searchInputStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#f1f5f9',
  fontSize: 13,
  outline: 'none'
};

const selectStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#f1f5f9',
  fontSize: 13,
  outline: 'none'
};

const checkboxLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#cbd5e1',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer'
};

const questionListStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 12,
  display: 'grid',
  gap: 10
};

const questionCardStyle: React.CSSProperties = {
  background: 'rgba(30,41,59,0.6)',
  border: '2px solid',
  borderRadius: 10,
  padding: 12,
  cursor: 'grab',
  transition: 'all 0.2s ease'
};

const tagStyle: React.CSSProperties = {
  background: 'rgba(59,130,246,0.2)',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: 4,
  padding: '2px 8px',
  fontSize: 10,
  color: '#60a5fa'
};

const createButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid rgba(34,197,94,0.4)',
  background: 'rgba(34,197,94,0.2)',
  color: '#22c55e',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  gap: 6
};
