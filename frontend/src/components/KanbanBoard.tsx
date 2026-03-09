import React, { useState, useCallback, useRef } from 'react';
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
import { API_BASE } from '../api';

interface KanbanBoardProps {
  draft: CozyQuizDraft;
  onUpdate: (draft: CozyQuizDraft) => void;
  onSlotFocus?: (slotIndex: number) => void;
}

// Undo/Redo History
interface HistoryState {
  questions: AnyQuestion[];
  timestamp: number;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ draft, onUpdate, onSlotFocus }: KanbanBoardProps) => {
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<QuizCategory | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [isDense, setIsDense] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<Record<QuizCategory, boolean>>({
    Schaetzchen: false,
    'Mu-Cho': true,
    Stimmts: true,
    Cheese: true,
    GemischteTuete: true
  });
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set());
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [catalogPool, setCatalogPool] = useState<AnyQuestion[]>([]);
  
  // Undo/Redo
  const [history, setHistory] = useState<HistoryState[]>([{ questions: draft.questions, timestamp: Date.now() }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const language = draft.meta.language === 'en' ? 'en' : 'de'; // Vereinfacht

  const categories: QuizCategory[] = ['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'GemischteTuete'];

  React.useEffect(() => {
    const loadCatalogPool = async () => {
      try {
        const response = await fetch(`${API_BASE}/questions`);
        if (!response.ok) return;
        const data = await response.json();
        setCatalogPool(Array.isArray(data.questions) ? data.questions : []);
      } catch {
        // Keep board usable even if catalog fetch fails
      }
    };

    loadCatalogPool();
  }, []);

  const slotCategoryMap: Record<CozyQuestionSlotTemplate['type'], QuizCategory> = {
    MU_CHO: 'Mu-Cho',
    SCHAETZCHEN: 'Schaetzchen',
    STIMMTS: 'Stimmts',
    CHEESE: 'Cheese',
    BUNTE_TUETE: 'GemischteTuete'
  };

  const isSlotPlaceholder = useCallback((question: AnyQuestion, slotIndex: number) => {
    const slot = COZY_SLOT_TEMPLATE[slotIndex] || COZY_SLOT_TEMPLATE[0];
    const text = (question.question || '').trim().toLowerCase();
    if (!text) return true;
    if (text === slot.label.trim().toLowerCase()) return true;
    if (text === `frage ${slotIndex + 1}`) return true;
    return false;
  }, []);

  const matchesSlot = useCallback((question: AnyQuestion, slot: CozyQuestionSlotTemplate) => {
    const expectedCategory = slotCategoryMap[slot.type];
    const categoryMatch = question.category === expectedCategory;
    if (!categoryMatch) return false;

    const typeByMechanic: Record<string, CozyQuestionSlotTemplate['type']> = {
      multipleChoice: 'MU_CHO',
      estimate: 'SCHAETZCHEN',
      betting: 'STIMMTS',
      trueFalse: 'STIMMTS',
      imageQuestion: 'CHEESE',
      sortItems: 'BUNTE_TUETE'
    };

    const normalizedType = question.type || typeByMechanic[question.mechanic] || null;
    if (normalizedType !== slot.type) return false;

    if (slot.type === 'BUNTE_TUETE' && slot.bunteKind) {
      const kind = (question as any).bunteTuete?.kind;
      return !kind || kind === slot.bunteKind;
    }

    return true;
  }, []);

  const buildSlotQuestion = useCallback((source: AnyQuestion, slotIndex: number): AnyQuestion => {
    const slot = COZY_SLOT_TEMPLATE[slotIndex] || COZY_SLOT_TEMPLATE[0];
    return {
      ...source,
      category: slotCategoryMap[slot.type],
      type: slot.type,
      points: slot.defaultPoints,
      segmentIndex: slot.segmentIndex
    } as AnyQuestion;
  }, []);

  const getSuggestionForSlot = useCallback((slotIndex: number, blockedIds: Set<string>) => {
    const slot = COZY_SLOT_TEMPLATE[slotIndex] || COZY_SLOT_TEMPLATE[0];
    const candidates = catalogPool.filter((q) => matchesSlot(q, slot) && !blockedIds.has(q.id));
    if (candidates.length === 0) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return buildSlotQuestion(pick, slotIndex);
  }, [catalogPool, matchesSlot, buildSlotQuestion]);

  // Undo/Redo System
  const addToHistory = useCallback((questions: AnyQuestion[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ questions: [...questions], timestamp: Date.now() });
    // Keep max 50 history states
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onUpdate({ ...draft, questions: history[newIndex].questions });
    }
  }, [historyIndex, history, draft, onUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onUpdate({ ...draft, questions: history[newIndex].questions });
    }
  }, [historyIndex, history, draft, onUpdate]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Gruppiere Fragen nach Kategorie
  const getQuestionsByCategory = (category: QuizCategory) => {
    const items = draft.questions
      .map((q: AnyQuestion, idx: number) => ({ question: q, index: idx }))
      .filter(({ question }: { question: AnyQuestion; index: number }) => question.category === category);
    if (!filterQuery.trim()) return items;
    const qLower = filterQuery.trim().toLowerCase();
    return items.filter(({ question }) =>
      (question.question || '').toLowerCase().includes(qLower) ||
      (question.tags || []).some((tag: string) => tag.toLowerCase().includes(qLower)) ||
      (question.mechanic || '').toLowerCase().includes(qLower)
    );
  };

  // Auto-Balance: Gleicht Kategorien aus (5 pro Kategorie)
  const autoBalance = useCallback(() => {
    if (!window.confirm('⚖️ Kategorien automatisch ausgleichen?\n\nVerteilt Fragen gleichmäßig: 5 pro Kategorie.')) return;
    
    const nextQuestions = [...draft.questions];
    const categoryCounts: Record<QuizCategory, number> = {
      Schaetzchen: 0,
      'Mu-Cho': 0,
      Stimmts: 0,
      Cheese: 0,
      GemischteTuete: 0
    };
    
    // Count current distribution
    nextQuestions.forEach(q => {
      categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
    });
    
    // Find over/under filled categories
    const overFilled = categories.filter(cat => categoryCounts[cat] > 5);
    const underFilled = categories.filter(cat => categoryCounts[cat] < 5);
    
    if (overFilled.length === 0 && underFilled.length === 0) {
      alert('✓ Bereits ausbalanciert!');
      return;
    }
    
    // Move excess questions to underfilled categories
    overFilled.forEach(catFrom => {
      while (categoryCounts[catFrom] > 5 && underFilled.length > 0) {
        const catTo = underFilled[0];
        const excessIdx = nextQuestions.findIndex(q => q.category === catFrom);
        if (excessIdx >= 0) {
          nextQuestions[excessIdx] = { ...nextQuestions[excessIdx], category: catTo };
          categoryCounts[catFrom]--;
          categoryCounts[catTo]++;
          if (categoryCounts[catTo] >= 5) underFilled.shift();
        } else break;
      }
    });
    
    addToHistory(nextQuestions);
    onUpdate({ ...draft, questions: nextQuestions });
  }, [draft, onUpdate, categories, addToHistory]);

  // Bulk Actions: Delete/Move selected questions
  const bulkDelete = useCallback(() => {
    if (selectedSlots.size === 0) return;
    if (!window.confirm(`🗑️ ${selectedSlots.size} Fragen zurücksetzen?`)) return;
    
    const nextQuestions = draft.questions.map((q, idx) => {
      if (selectedSlots.has(idx)) {
        const slot = COZY_SLOT_TEMPLATE[idx] || COZY_SLOT_TEMPLATE[0];
        return createEmptyQuestion(idx, slot);
      }
      return q;
    });
    
    addToHistory(nextQuestions);
    onUpdate({ ...draft, questions: nextQuestions });
    setSelectedSlots(new Set());
  }, [selectedSlots, draft, onUpdate, addToHistory]);

  const bulkMove = useCallback((targetCategory: QuizCategory) => {
    if (selectedSlots.size === 0) return;
    
    const nextQuestions = draft.questions.map((q, idx) => {
      if (selectedSlots.has(idx)) {
        return { ...q, category: targetCategory };
      }
      return q;
    });
    
    addToHistory(nextQuestions);
    onUpdate({ ...draft, questions: nextQuestions });
    setSelectedSlots(new Set());
  }, [selectedSlots, draft, onUpdate, addToHistory]);

  // Templates
  const applyTemplate = useCallback((templateName: string) => {
    let nextQuestions = [...draft.questions];
    
    if (templateName === 'difficulty-ascending') {
      // Sort by difficulty: easy → hard
      nextQuestions.sort((a, b) => (a.points || 10) - (b.points || 10));
    } else if (templateName === 'difficulty-descending') {
      // Sort by difficulty: hard → easy
      nextQuestions.sort((a, b) => (b.points || 10) - (a.points || 10));
    } else if (templateName === 'shuffle') {
      // Shuffle questions
      for (let i = nextQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nextQuestions[i], nextQuestions[j]] = [nextQuestions[j], nextQuestions[i]];
      }
    } else if (templateName === 'alternate-categories') {
      // Alternate categories
      const byCat: Record<QuizCategory, AnyQuestion[]> = {
        Schaetzchen: [],
        'Mu-Cho': [],
        Stimmts: [],
        Cheese: [],
        GemischteTuete: []
      };
      nextQuestions.forEach(q => byCat[q.category].push(q));
      nextQuestions = [];
      let catIndex = 0;
      while (nextQuestions.length < 25) {
        const cat = categories[catIndex % categories.length];
        if (byCat[cat].length > 0) {
          nextQuestions.push(byCat[cat].shift()!);
        }
        catIndex++;
      }
    }
    
    addToHistory(nextQuestions);
    onUpdate({ ...draft, questions: nextQuestions });
    setShowOverflowMenu(false);
  }, [draft, onUpdate, categories, addToHistory]);

  const handleQuestionSave = (slotIndex: number, updatedQuestion: AnyQuestion) => {
    const nextQuestions = draft.questions.slice();
    nextQuestions[slotIndex] = updatedQuestion;
    addToHistory(nextQuestions);
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

  const quickSuggestForSlot = useCallback((slotIndex: number) => {
    onSlotFocus?.(slotIndex);
    const current = draft.questions[slotIndex];
    if (current && !isSlotPlaceholder(current, slotIndex)) {
      const ok = window.confirm('Slot ist bereits gefuellt. Mit Vorschlag ersetzen?');
      if (!ok) return;
    }

    const usedIds = new Set(
      draft.questions
        .filter((q, idx) => idx !== slotIndex && !isSlotPlaceholder(q, idx))
        .map((q) => q.id)
    );

    const suggested = getSuggestionForSlot(slotIndex, usedIds);
    if (!suggested) {
      alert('Kein passender Vorschlag gefunden (Kategorie/Mechanik bereits ausgereizt).');
      return;
    }

    const nextQuestions = draft.questions.slice();
    nextQuestions[slotIndex] = suggested;
    addToHistory(nextQuestions);
    onUpdate({ ...draft, questions: nextQuestions });
  }, [draft, isSlotPlaceholder, getSuggestionForSlot, addToHistory, onUpdate, onSlotFocus]);

  const fillEmptySlotsSmart = useCallback(() => {
    const emptyIndices = draft.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => isSlotPlaceholder(q, idx))
      .map(({ idx }) => idx);

    if (emptyIndices.length === 0) {
      alert('Keine leeren Slots gefunden.');
      return;
    }

    const blockedIds = new Set(
      draft.questions
        .filter((q, idx) => !isSlotPlaceholder(q, idx))
        .map((q) => q.id)
    );

    const nextQuestions = draft.questions.slice();
    let filled = 0;

    emptyIndices.forEach((slotIndex) => {
      const suggested = getSuggestionForSlot(slotIndex, blockedIds);
      if (!suggested) return;
      nextQuestions[slotIndex] = suggested;
      blockedIds.add(suggested.id);
      filled++;
    });

    if (filled === 0) {
      alert('Keine passenden Fragen fuer die leeren Slots gefunden.');
      return;
    }

    addToHistory(nextQuestions);
    onUpdate({ ...draft, questions: nextQuestions });
    alert(`✓ ${filled}/${emptyIndices.length} leere Slots intelligent gefuellt`);
  }, [draft, isSlotPlaceholder, getSuggestionForSlot, addToHistory, onUpdate]);

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
          alert(`✗ Keine freien Slots in ${targetCategory}`);
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
    addToHistory(nextQuestions);
    onUpdate({ ...draft, questions: nextQuestions });

    setDraggedSlot(null);
    setDraggedCategory(null);
  };

  // Multi-select toggle
  const toggleSlotSelection = useCallback((slotIndex: number, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.stopPropagation();
      setSelectedSlots(prev => {
        const next = new Set(prev);
        if (next.has(slotIndex)) {
          next.delete(slotIndex);
        } else {
          next.add(slotIndex);
        }
        return next;
      });
    } else if (event.shiftKey && selectedSlots.size > 0) {
      // Shift-select range
      event.stopPropagation();
      const indices = Array.from(selectedSlots);
      const lastSelected = indices[indices.length - 1];
      const start = Math.min(lastSelected, slotIndex);
      const end = Math.max(lastSelected, slotIndex);
      const next = new Set(selectedSlots);
      for (let i = start; i <= end; i++) {
        next.add(i);
      }
      setSelectedSlots(next);
    } else {
      // Regular click
      setEditingSlot(slotIndex);
      onSlotFocus?.(slotIndex);
    }
  }, [selectedSlots, onSlotFocus]);

  return (
    <div style={kanbanContainerStyle}>
      <div style={kanbanHeaderStyle}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          📋 Kanban-Board - Fragen nach Kategorien
        </h3>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="🔍 Suchen... (Text, Tags, Mechanik)"
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(0,0,0,0.25)',
              color: '#e2e8f0',
              flex: '1 1 200px',
              minWidth: 200
            }}
          />
          
          {/* Overflow menu: Auto-Balance, Slots füllen, Templates */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowOverflowMenu(!showOverflowMenu)}
              style={toolbarButtonStyle}
              title="Weitere Aktionen"
            >
              ⋯
            </button>
            {showOverflowMenu && (
              <div style={templateMenuStyle}>
                <button onClick={() => { autoBalance(); setShowOverflowMenu(false); }} style={templateItemStyle}>
                  ⚖️ Auto-Balance
                </button>
                <button onClick={() => { fillEmptySlotsSmart(); setShowOverflowMenu(false); }} style={templateItemStyle}>
                  ✨ Leere Slots füllen
                </button>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 4px' }} />
                <button onClick={() => { applyTemplate('difficulty-ascending'); setShowOverflowMenu(false); }} style={templateItemStyle}>
                  📈 Schwierigkeit aufsteigend
                </button>
                <button onClick={() => { applyTemplate('difficulty-descending'); setShowOverflowMenu(false); }} style={templateItemStyle}>
                  📉 Schwierigkeit absteigend
                </button>
                <button onClick={() => { applyTemplate('shuffle'); setShowOverflowMenu(false); }} style={templateItemStyle}>
                  🔀 Zufällig mischen
                </button>
                <button onClick={() => { applyTemplate('alternate-categories'); setShowOverflowMenu(false); }} style={templateItemStyle}>
                  🎯 Kategorien abwechseln
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            style={{ ...toolbarButtonStyle, opacity: historyIndex === 0 ? 0.4 : 1 }}
            title="Rückgängig (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          
          <button
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            style={{ ...toolbarButtonStyle, opacity: historyIndex === history.length - 1 ? 0.4 : 1 }}
            title="Wiederherstellen (Ctrl+Y)"
          >
            ↷ Redo
          </button>
          
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.8 }}>
            <input type="checkbox" checked={isDense} onChange={(e) => setIsDense(e.target.checked)} />
            Kompakt
          </label>
          
        </div>
        
        {/* Bulk Actions Bar */}
        {selectedSlots.size > 0 && (
          <div style={bulkActionsBarStyle}>
            <span style={{ fontWeight: 700 }}>{selectedSlots.size} Fragen ausgewählt</span>
            <button onClick={bulkDelete} style={bulkActionButtonStyle}>
              🗑️ Löschen
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => bulkMove(cat)}
                style={{
                  ...bulkActionButtonStyle,
                  background: `${categoryColors[cat]}22`,
                  borderColor: categoryColors[cat]
                }}
              >
                → {categoryLabels[cat]?.[language] || cat}
              </button>
            ))}
            <button
              onClick={() => setSelectedSlots(new Set())}
              style={bulkActionButtonStyle}
            >
              ✕ Abbrechen
            </button>
          </div>
        )}
      </div>

      <div style={boardStyle}>
        {categories.map((category) => {
          const catLabel = categoryLabels[category]?.[language] || category;
          const catColor = categoryColors[category];
          const questions = getQuestionsByCategory(category);
          const count = questions.length;
          const isValid = count === 5;
          const isOverfilled = count > 5;
          const isUnderfilled = count < 5;

          return (
            <div
              key={category}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, category)}
              style={{
                ...columnStyle,
                borderColor: isOverfilled ? '#ef4444' : isUnderfilled ? '#f59e0b' : catColor,
                borderTopColor: isOverfilled ? '#ef4444' : isUnderfilled ? '#f59e0b' : catColor,
                backgroundColor: isOverfilled ? 'rgba(239,68,68,0.08)' : isUnderfilled ? 'rgba(245,158,11,0.08)' : `${catColor}08`
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
                  background: isOverfilled ? 'rgba(239,68,68,0.2)' : isUnderfilled ? 'rgba(245,158,11,0.2)' : `${catColor}20`,
                  color: isOverfilled ? '#ef4444' : isUnderfilled ? '#f59e0b' : catColor,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {count}/5 {isOverfilled ? '⚠️' : isUnderfilled ? '⚠️' : '✓'}
                </div>
                <button
                  onClick={() => setCollapsed(prev => ({ ...prev, [category]: !prev[category] }))}
                  style={{
                    marginLeft: 'auto',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#e2e8f0',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  {collapsed[category] ? 'Aufklappen' : 'Zuklappen'}
                </button>
              </div>

              {/* Questions */}
              <div style={{
                ...questionsListStyle,
                display: collapsed[category] ? 'none' : 'flex'
              }}>
                {questions.map(({ question, index }: { question: AnyQuestion; index: number }) => {
                  const slot = COZY_SLOT_TEMPLATE[index] || COZY_SLOT_TEMPLATE[0];
                  const isBeingDragged = draggedSlot === index;
                  const isSelected = selectedSlots.has(index);
                  const isHovered = hoveredSlot === index;
                  const usedCount = question.usedIn?.length || 0;
                  const isUsed = usedCount > 0;

                  return (
                    <div key={index} style={{ position: 'relative' }}>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index, category)}
                        onClick={(e) => toggleSlotSelection(index, e)}
                        onMouseEnter={() => setHoveredSlot(index)}
                        onMouseLeave={() => setHoveredSlot(null)}
                        style={{
                          ...questionCardStyle,
                          padding: 0,
                          opacity: isBeingDragged ? 0.5 : 1,
                          borderColor: isSelected ? '#3b82f6' : isBeingDragged ? `${catColor}88` : catColor,
                          borderWidth: isSelected ? 2 : 1,
                          background: isSelected
                            ? 'rgba(59,130,246,0.15)'
                            : isBeingDragged
                            ? `${catColor}15`
                            : 'rgba(15,23,42,0.6)',
                          cursor: 'grab',
                          transform: isHovered ? 'translateY(-2px)' : 'none',
                          boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Card Content */}
                        <div style={{ padding: isDense ? 8 : 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ fontSize: isDense ? 10 : 11, opacity: 0.5 }}>
                              Slot {index + 1} • {slot.defaultPoints}pts
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {isUsed && (
                                <div style={{
                                  background: 'rgba(251,191,36,0.2)',
                                  border: '1px solid rgba(251,191,36,0.4)',
                                  borderRadius: 4,
                                  padding: isDense ? '1px 5px' : '2px 6px',
                                  fontSize: isDense ? 9 : 10,
                                  fontWeight: 600,
                                  color: '#fbbf24'
                                }}>
                                  {usedCount}x
                                </div>
                              )}
                              {isSelected && (
                                <div style={{
                                  background: '#3b82f6',
                                  color: '#fff',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  fontSize: 10,
                                  fontWeight: 700
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                quickSuggestForSlot(index);
                              }}
                              style={{
                                border: '1px solid rgba(74,222,128,0.45)',
                                background: 'rgba(74,222,128,0.14)',
                                color: '#86efac',
                                borderRadius: 6,
                                padding: isDense ? '2px 6px' : '3px 8px',
                                fontSize: isDense ? 9 : 10,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Passende Frage fuer diesen Slot vorschlagen"
                            >
                              ✨ Vorschlag
                            </button>
                          </div>
                          {index === 0 && (isUsed || isSelected) && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                              {isUsed && (
                                <div style={{
                                  background: 'rgba(251,191,36,0.2)',
                                  border: '1px solid rgba(251,191,36,0.4)',
                                  borderRadius: 4,
                                  padding: isDense ? '1px 5px' : '2px 6px',
                                  fontSize: isDense ? 9 : 10,
                                  fontWeight: 600,
                                  color: '#fbbf24'
                                }}>
                                  {usedCount}x verwendet
                                </div>
                              )}
                              {isSelected && (
                                <div style={{
                                  background: '#3b82f6',
                                  color: '#fff',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  fontSize: 10,
                                  fontWeight: 700
                                }}>
                                  ✓ Ausgewählt
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ fontSize: isDense ? 11 : 12, fontWeight: 600, marginBottom: isDense ? 4 : 6, lineHeight: 1.35 }}>
                            {question.question || '(leer)'}
                          </div>
                          {question.imageUrl && (
                            <div style={{
                              width: '100%',
                              height: isDense ? 48 : 60,
                              background: `url(${question.imageUrl}) center/cover`,
                              borderRadius: 6,
                              marginBottom: isDense ? 4 : 6
                            }} />
                          )}
                          <div style={{ fontSize: isDense ? 10 : 11, opacity: 0.6 }}>
                            {question.mechanic} • {question.category}
                            {question.tags && question.tags.length > 0 && (
                              <span style={{ marginLeft: 4 }}>
                                • {question.tags.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Hover Preview Tooltip */}
                      {isHovered && !isBeingDragged && !isDense && (
                        <div style={hoverPreviewStyle}>
                          <strong style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>
                            {question.question}
                          </strong>
                          {question.mechanic === 'multipleChoice' && (question as any).options && (
                            <div style={{ fontSize: 11, opacity: 0.9 }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>Optionen:</div>
                              {((question as any).options || []).map((opt: string, i: number) => (
                                <div key={i} style={{
                                  padding: '2px 4px',
                                  background: (question as any).correctIndex === i ? 'rgba(34,197,94,0.2)' : 'transparent',
                                  borderRadius: 4
                                }}>
                                  {String.fromCharCode(65 + i)}) {opt}
                                  {(question as any).correctIndex === i && ' ✓'}
                                </div>
                              ))}
                            </div>
                          )}
                          {question.mechanic === 'estimate' && (
                            <div style={{ fontSize: 11 }}>
                              Zielwert: {(question as any).targetValue} {(question as any).unit}
                            </div>
                          )}
                          {(question as any).answer && (
                            <div style={{ fontSize: 11 }}>
                              Antwort: {(question as any).answer}
                            </div>
                          )}
                        </div>
                      )}
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

const toolbarButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(0,0,0,0.25)',
  color: '#e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const bulkActionsBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  padding: '10px 12px',
  borderRadius: 8,
  background: 'rgba(59,130,246,0.15)',
  border: '1px solid rgba(59,130,246,0.3)'
};

const bulkActionButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(0,0,0,0.3)',
  color: '#e2e8f0',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const templateMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  padding: 4,
  zIndex: 100,
  minWidth: 200,
  display: 'flex',
  flexDirection: 'column',
  gap: 2
};

const templateItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: '#e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s'
};

const hoverPreviewStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: 'rgba(15,23,42,0.98)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 8,
  padding: 10,
  zIndex: 10,
  minWidth: 250,
  maxWidth: 300,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  color: '#e2e8f0',
  fontSize: 11,
  lineHeight: 1.4
};

export default KanbanBoard;
