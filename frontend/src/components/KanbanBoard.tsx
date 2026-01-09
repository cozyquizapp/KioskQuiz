import React, { useState, useCallback } from 'react';
import {
  AnyQuestion,
  QuizCategory,
  CozyQuizDraft,
  CozyQuestionSlotTemplate
} from '@shared/quizTypes';
import { COZY_SLOT_TEMPLATE } from '@shared/cozyTemplate';
import { categoryColors } from '../categoryColors';
import { categoryLabels } from '../categoryLabels';
import { categoryIcons } from '../categoryAssets';
import KanbanQuestionEditor from './KanbanQuestionEditor';

interface KanbanBoardProps {
  draft: CozyQuizDraft;
  onUpdate: (draft: CozyQuizDraft) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ draft, onUpdate }: KanbanBoardProps) => {
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<QuizCategory | null>(null);
  const language = draft.meta.language === 'en' ? 'en' : 'de'; // Vereinfacht

  const categories: QuizCategory[] = ['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'GemischteTuete'];

  // Gruppiere Fragen nach Kategorie
  const getQuestionsByCategory = (category: QuizCategory) => {
    return draft.questions
      .map((q: AnyQuestion, idx: number) => ({ question: q, index: idx }))
      .filter(({ question }: { question: AnyQuestion; index: number }) => question.category === category);
  };

  const handleQuestionSave = (slotIndex: number, updatedQuestion: AnyQuestion) => {
    const nextQuestions = draft.questions.slice();
    nextQuestions[slotIndex] = updatedQuestion;
    onUpdate({ ...draft, questions: nextQuestions });
    setEditingSlot(null);
  };

  const handleQuestionDelete = (slotIndex: number) => {
    if (!window.confirm('🗑️ Frage wirklich zurücksetzen?\n\nDie Frage wird durch eine leere Vorlage ersetzt.')) {
      return;
    }
    const slot = COZY_SLOT_TEMPLATE[slotIndex] || COZY_SLOT_TEMPLATE[0];
    const emptyQuestion = createEmptyQuestion(slotIndex, slot);
    handleQuestionSave(slotIndex, emptyQuestion);
  };

  const createEmptyQuestion = (slotIndex: number, slot: CozyQuestionSlotTemplate): AnyQuestion => {
    const base = {
      id: draft.questions[slotIndex]?.id || `${draft.id}-q${slotIndex + 1}`,
      question: slot.label,
      points: slot.defaultPoints,
      category: 'Mu-Cho' as QuizCategory,
      mechanic: 'multipleChoice',
      segmentIndex: slot.segmentIndex
    } as AnyQuestion;

    if (slot.type === 'SCHAETZCHEN') {
      return { ...base, category: 'Schaetzchen', mechanic: 'estimate', targetValue: 0, unit: '' };
    }
    if (slot.type === 'STIMMTS') {
      return { ...base, category: 'Stimmts', mechanic: 'betting', options: ['Option A', 'Option B', 'Option C'], correctIndex: 0, pointsPool: 10 };
    }
    if (slot.type === 'CHEESE') {
      return { ...base, category: 'Cheese', mechanic: 'imageQuestion', answer: '', imageUrl: '' };
    }
    return base;
  };

  const handleDragStart = (e: React.DragEvent, slotIndex: number, category: QuizCategory) => {
    setDraggedSlot(slotIndex);
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCategory: QuizCategory) => {
    e.preventDefault();
    
    // Check if dragging from catalog
    const catalogData = e.dataTransfer.getData('question');
    if (catalogData) {
      try {
        const question = JSON.parse(catalogData) as AnyQuestion;
        // Find first empty slot in target category
        const targetSlots = draft.questions
          .map((q: AnyQuestion, idx: number) => ({ q, idx }))
          .filter(({ q }: { q: AnyQuestion; idx: number }) => q.category === targetCategory && (!q.question || q.question === COZY_SLOT_TEMPLATE[0].label));
        
        if (targetSlots.length > 0) {
          const firstEmpty = targetSlots[0].idx;
          handleQuestionSave(firstEmpty, { ...question, category: targetCategory });
        } else {
          alert(`Keine freien Slots in ${targetCategory}`);
        }
      } catch (err) {
        // Parsing error - ignore dropped data
      }
      return;
    }
    
    // Original drag behavior (within board)
    if (draggedSlot === null || draggedCategory === null) return;
    if (draggedCategory === targetCategory) {
      setDraggedSlot(null);
      setDraggedCategory(null);
      return;
    }

    const nextQuestions = draft.questions.slice();
    const draggedQuestion = nextQuestions[draggedSlot];
    nextQuestions[draggedSlot] = { ...draggedQuestion, category: targetCategory };
    onUpdate({ ...draft, questions: nextQuestions });

    setDraggedSlot(null);
    setDraggedCategory(null);
  };

  return (
    <div style={kanbanContainerStyle}>
      <div style={kanbanHeaderStyle}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          📋 Kanban-Board - Fragen nach Kategorien
        </h3>
        <small style={{ opacity: 0.6 }}>Drag & Drop zwischen Kategorien. Click zum Editieren.</small>
      </div>

      <div style={boardStyle}>
        {categories.map((category) => {
          const catLabel = categoryLabels[category]?.[language] || category;
          const catColor = categoryColors[category];
          const questions = getQuestionsByCategory(category);
          const count = questions.length;

          return (
            <div
              key={category}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, category)}
              style={{
                ...columnStyle,
                borderColor: catColor,
                borderTopColor: catColor,
                backgroundColor: `${catColor}08`
              }}
            >
              {/* Column Header */}
              <div style={{ ...columnHeaderStyle, borderBottomColor: catColor }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: catColor
                    }}
                  />
                  <strong style={{ fontSize: 13 }}>{catLabel}</strong>
                </div>
                <div style={{
                  background: `${catColor}20`,
                  color: catColor,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {count}/5
                </div>
              </div>

              {/* Questions */}
              <div style={questionsListStyle}>
                {questions.map(({ question, index }: { question: AnyQuestion; index: number }) => {
                  const slot = COZY_SLOT_TEMPLATE[index] || COZY_SLOT_TEMPLATE[0];
                  const isBeingDragged = draggedSlot === index;
                  const usedCount = question.usedIn?.length || 0;
                  const isUsed = usedCount > 0;

                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, category)}
                      onClick={() => setEditingSlot(index)}
                      style={{
                        ...questionCardStyle,
                        opacity: isBeingDragged ? 0.5 : 1,
                        borderColor: isBeingDragged ? `${catColor}88` : catColor,
                        background: isBeingDragged
                          ? `${catColor}15`
                          : 'rgba(15,23,42,0.6)',
                        cursor: 'grab'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>
                          Slot {index + 1} • {slot.defaultPoints}pts
                        </div>
                        {isUsed && (
                          <div style={{
                            background: 'rgba(251,191,36,0.2)',
                            border: '1px solid rgba(251,191,36,0.4)',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#fbbf24'
                          }}>
                            {usedCount}x verwendet
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                        {question.question || '(leer)'}
                      </div>
                      {question.imageUrl && (
                        <div style={{
                          width: '100%',
                          height: 60,
                          background: `url(${question.imageUrl}) center/cover`,
                          borderRadius: 6,
                          marginBottom: 6
                        }} />
                      )}
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        {question.mechanic} • {question.category}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {questions.length === 0 && (
                  <div style={{
                    padding: 12,
                    textAlign: 'center',
                    opacity: 0.4,
                    fontSize: 12,
                    minHeight: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    Keine Fragen
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Editor */}
      {editingSlot !== null && (
        <KanbanQuestionEditor
          question={draft.questions[editingSlot]}
          slotIndex={editingSlot}
          onSave={(q) => handleQuestionSave(editingSlot, q)}
          onCancel={() => setEditingSlot(null)}
          onDelete={() => handleQuestionDelete(editingSlot)}
        />
      )}
    </div>
  );
};

// Styles
const kanbanContainerStyle: React.CSSProperties = {
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12
};

const kanbanHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4
};

const boardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 12,
  minHeight: 400,
  overflow: 'auto'
};

const columnStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderTop: '3px solid rgba(59,130,246,0.4)',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const columnHeaderStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(0,0,0,0.2)'
};

const questionsListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 8
};

const questionCardStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: 8,
  padding: 10,
  cursor: 'pointer',
  transition: 'all 0.2s',
  userSelect: 'none'
};

export default KanbanBoard;
