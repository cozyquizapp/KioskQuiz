import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnyQuestion } from '@shared/quizTypes'
import { fetchQuestions } from '../api'
import { loadPlayDraft, savePlayDraft } from '../utils/draft'
import { Modal } from '../components/Modal'
import { useRef } from 'react'

type Category = { name: string; questions: number }

const defaultCategories: Category[] = [
  { name: 'Mixed Bag', questions: 5 },
  { name: 'Cheese', questions: 5 },
  { name: 'Wildcard', questions: 5 },
]

const Stepper = ({
  current,
  onChange,
}: {
  current: number
  onChange: (idx: number) => void
}) => {
  const steps = ['Struktur', 'Fragen', 'Praesentation', 'Publish']
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {steps.map((label, idx) => (
        <button
          key={label}
          className="tap-squish"
          style={{
            ...pill('#7a5bff'),
            justifyContent: 'flex-start',
            background: current === idx ? '#7a5bff22' : 'rgba(255,255,255,0.05)',
            borderColor: current === idx ? '#7a5bffcc' : 'rgba(255,255,255,0.12)',
            cursor: 'pointer',
          }}
          onClick={() => onChange(idx)}
        >
          {idx + 1}. {label}
        </button>
      ))}
    </div>
  )
}

const SlidePreview = ({
  title,
  bg,
  question,
  answer,
  showTimer,
  showPoints,
  layout,
}: {
  title: string
  bg: string
  question: string
  answer: string
  showTimer: boolean
  showPoints: boolean
  layout: {
    layoutX: number
    layoutY: number
    layoutSize: number
    answerX: number
    answerY: number
    answerSize: number
    timerX: number
    timerY: number
    pointsX: number
    pointsY: number
  }
}) => {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: 12,
        background: bg,
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#e5e7eb',
        minHeight: 180,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{title}</div>
      <div
        style={{
          position: 'relative',
          height: 140,
          borderRadius: 10,
          border: '1px dashed rgba(255,255,255,0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${layout.layoutX}%`,
            top: `${layout.layoutY}%`,
            transform: 'translate(-0%, -0%)',
            fontSize: layout.layoutSize,
            fontWeight: 800,
          }}
        >
          {question}
        </div>
        {answer && (
          <div
            style={{
              position: 'absolute',
              left: `${layout.answerX}%`,
              top: `${layout.answerY}%`,
              transform: 'translate(-0%, -0%)',
              fontSize: layout.answerSize,
              fontWeight: 700,
              color: '#a5f3fc',
            }}
          >
            {answer}
          </div>
        )}
        {showTimer && (
          <div
            style={{
              position: 'absolute',
              left: `${layout.timerX}%`,
              top: `${layout.timerY}%`,
              padding: '6px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Timer
          </div>
        )}
        {showPoints && (
          <div
            style={{
              position: 'absolute',
              left: `${layout.pointsX}%`,
              top: `${layout.pointsY}%`,
              padding: '6px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Punkte
          </div>
        )}
      </div>
    </div>
  )
}

export default function CreatorCanvasPage() {
  const draft = loadPlayDraft()
  const [name, setName] = useState(draft?.name || 'Neues Quiz')
  const [categories, setCategories] = useState<Category[]>(draft?.structure.categories || defaultCategories)
  const [themeColor, setThemeColor] = useState(draft?.theme.color || '#7a5bff')
  const [bg, setBg] = useState(draft?.theme.background || '')
  const [logo, setLogo] = useState(draft?.theme.logoUrl || '')
  const [font, setFont] = useState(draft?.theme.font || 'Geist')
  const [intro, setIntro] = useState(draft?.structure.introAt || 'start')
  const [rules, setRules] = useState(draft?.structure.rulesAt || 'start')
  const [animation, setAnimation] = useState(draft?.theme.animation || 'Slide')
  const [introText, setIntroText] = useState(draft?.structure.introText || 'Willkommen zum Cozy Kiosk Quiz!')
  const [rulesText, setRulesText] = useState(draft?.structure.rulesText || 'Regeln kurz erklaeren')
  const [currentTab, setCurrentTab] = useState<'struktur' | 'fragen' | 'slides' | 'theme' | 'publish'>('slides')
  const [questions, setQuestions] = useState<AnyQuestion[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [layoutX, setLayoutX] = useState(10)
  const [layoutY, setLayoutY] = useState(10)
  const [layoutSize, setLayoutSize] = useState(18)
  const [answerX, setAnswerX] = useState(10)
  const [answerY, setAnswerY] = useState(50)
  const [answerSize, setAnswerSize] = useState(16)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const [snapGuides, setSnapGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1600)
  }, [])
  const [showTimer, setShowTimer] = useState(true)
  const [showPoints, setShowPoints] = useState(true)
  const [timerX, setTimerX] = useState(8)
  const [timerY, setTimerY] = useState(8)
  const [pointsX, setPointsX] = useState(85)
  const [pointsY, setPointsY] = useState(8)
  const [editTarget, setEditTarget] = useState<'question' | 'answer' | 'timer' | 'points'>('question')
  const [editQuestion, setEditQuestion] = useState<AnyQuestion | null>(null)
  const [editText, setEditText] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editMechanic, setEditMechanic] = useState('')
  const [editImage, setEditImage] = useState('')
  const [questionText, setQuestionText] = useState('Frage-Text')
  const [answerText, setAnswerText] = useState('Antwort-Text')
  const [slideConfig, setSlideConfig] = useState({
    question: { showTimer: true, showPoints: true },
    answer: { showTimer: true, showPoints: true },
    intro: { showRules: true },
  })
  const [mechanicFilter, setMechanicFilter] = useState<string>('all')
  const [qSearch, setQSearch] = useState('')
  const [qImageOnly, setQImageOnly] = useState(false)
  const [qMechanicOnly, setQMechanicOnly] = useState(false)
  const [qCategory, setQCategory] = useState<string>('all')
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState<null | 'question' | 'answer' | 'timer' | 'points'>(null)
  const [resizing, setResizing] = useState<null | 'question' | 'answer'>(null)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [resizeStartSize, setResizeStartSize] = useState(0)
  const [currentSlideId, setCurrentSlideId] = useState<string>('intro')
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false)
  const [beamerPreview, setBeamerPreview] = useState(true)

  useEffect(() => {
    fetchQuestions()
      .then((res) => setQuestions(res.questions))
      .catch(() => setQuestions([]))
  }, [])

  const totalQuestions = useMemo(() => categories.reduce((s, c) => s + c.questions, 0), [categories])

  const slides = useMemo(() => {
    const list: { id: string; title: string }[] = []
    list.push({ id: 'intro', title: 'Intro' })
    list.push({ id: 'rules', title: 'Regeln' })
    categories.forEach((c, idx) => list.push({ id: `cat-${idx}`, title: `Kategorie ${idx + 1}: ${c.name}` }))
    list.push({ id: 'final', title: 'Finale' })
    return list
  }, [categories])

  const filteredQuestions = useMemo(() => {
    const term = qSearch.toLowerCase()
    return questions.filter((q) => {
      const matchesText = q.text?.toLowerCase().includes(term) || q.category?.toLowerCase().includes(term)
      const matchesImage = qImageOnly ? Boolean((q as any).imageUrl || (q as any).image) : true
      const mech = (q as any).mixedMechanic
      const matchesMech = qMechanicOnly ? Boolean(mech) : true
      const matchesMechSelect = mechanicFilter === 'all' ? true : mech === mechanicFilter
      const matchesCategory = qCategory === 'all' ? true : q.category === qCategory
      return matchesText && matchesImage && matchesMech && matchesMechSelect && matchesCategory
    })
  }, [questions, qSearch, qImageOnly, qMechanicOnly, qCategory, mechanicFilter])

  const mechanicOptions = useMemo(() => {
    const set = new Set<string>()
    questions.forEach((q) => {
      const mech = (q as any).mixedMechanic
      if (mech) set.add(mech)
    })
    return Array.from(set)
  }, [questions])

  const persist = () => {
    savePlayDraft({
      id: draft?.id || 'draft-canvas',
      name,
      structure: {
        rounds: 4,
        categories,
        introAt: intro as any,
        rulesAt: rules as any,
        introText,
        rulesText,
        mode: 'standard',
      },
      filters: draft?.filters || [],
      theme: { color: themeColor, background: bg, logoUrl: logo, font, animation },
      updatedAt: Date.now(),
    })
  }

  const addCategory = () => {
                  {snapGuides.x !== null && (
                    <div className="snap-guide vertical" style={{ left: `${snapGuides.x}%`, top: 0 }} />
                  )}
                  {snapGuides.y !== null && (
                    <div className="snap-guide" style={{ top: `${snapGuides.y}%`, left: 0, width: '100%', height: 1 }} />
                  )}
    setCategories((prev) => [...prev, { name: `Kategorie ${prev.length + 1}`, questions: 5 }])
  }

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const openEdit = (q: AnyQuestion) => {
    setEditQuestion(q)
    setEditText(q.text || '')
    setEditAnswer((q as any).answer || '')
    setEditCategory(q.category || '')
    setEditMechanic((q as any).mixedMechanic || '')
    setEditImage((q as any).imageUrl || (q as any).image || '')
  }

  const saveEdit = async () => {
    if (!editQuestion) return
    const updated = {
      ...editQuestion,
      text: editText,
      category: editCategory,
      mixedMechanic: editMechanic || undefined,
      imageUrl: editImage || undefined,
      answer: editAnswer || undefined,
    }
    setQuestions((prev) => prev.map((q) => (q.id === editQuestion.id ? updated : q)))
    try {
      await fetch('/api/questions/' + editQuestion.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      // ignore for now
    }
    setEditQuestion(null)
  }

  const snap = (val: number) => Math.min(95, Math.max(0, Math.round(val / 2) * 2))
  const applyMagnet = (val: number, extraPoints: number[] = []) => {
    const snapPoints = [0, 33.33, 50, 66.67, 95, ...extraPoints]
    let guide: number | null = null
    let next = val
    let nearest = snapPoints[0]
    let bestDist = Math.abs(val - nearest)
    for (const p of snapPoints) {
      const dist = Math.abs(val - p)
      if (dist < bestDist) {
        bestDist = dist
        nearest = p
      }
    }
    if (bestDist <= 2) {
      next = nearest
      guide = nearest
    }
    return { value: snap(next), guide }
  }

  const getAlignPoints = (target: typeof editTarget) => {
    const alignX: number[] = []
    const alignY: number[] = []
    const container = previewRef.current
    if (!container) return { pointsX: alignX, pointsY: alignY }
    const root = container.getBoundingClientRect()
    const roles: Array<typeof editTarget> = ['question', 'answer', 'timer', 'points']
    roles.forEach((role) => {
      if (role === target) return
      const el = container.querySelector(`[data-role="${role}"]`) as HTMLElement | null
      if (!el) return
      const rect = el.getBoundingClientRect()
      const left = ((rect.left - root.left) / root.width) * 100
      const right = ((rect.right - root.left) / root.width) * 100
      const top = ((rect.top - root.top) / root.height) * 100
      const bottom = ((rect.bottom - root.top) / root.height) * 100
      const centerX = (left + right) / 2
      const centerY = (top + bottom) / 2
      alignX.push(left, centerX, right)
      alignY.push(top, centerY, bottom)
    })
    return { pointsX: alignX, pointsY: alignY }
  }

  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    const { pointsX, pointsY } = getAlignPoints(editTarget)
    const snapX = applyMagnet(xPct, pointsX)
    const snapY = applyMagnet(yPct, pointsY)
    setSnapGuides({ x: snapX.guide, y: snapY.guide })
    setDragging(editTarget)
    setResizing(null)
    if (editTarget === 'question') {
      setLayoutX(snapX.value)
      setLayoutY(snapY.value)
    }
    if (editTarget === 'answer') {
      setAnswerX(snapX.value)
      setAnswerY(snapY.value)
    }
    if (editTarget === 'timer') {
      setTimerX(snapX.value)
      setTimerY(snapY.value)
    }
    if (editTarget === 'points') {
      setPointsX(snapX.value)
      setPointsY(snapY.value)
    }
  }

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((!dragging && !resizing) || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    const { pointsX, pointsY } = getAlignPoints(dragging ?? editTarget)
    const snapX = applyMagnet(xPct, pointsX)
    const snapY = applyMagnet(yPct, pointsY)
    if (dragging) {
      setSnapGuides({ x: snapX.guide, y: snapY.guide })
    }
    if (dragging === 'question') {
      setLayoutX(snapX.value)
      setLayoutY(snapY.value)
    }
    if (dragging === 'answer') {
      setAnswerX(snapX.value)
      setAnswerY(snapY.value)
    }
    if (dragging === 'timer') {
      setTimerX(snapX.value)
      setTimerY(snapY.value)
    }
    if (dragging === 'points') {
      setPointsX(snapX.value)
      setPointsY(snapY.value)
    }
    if (resizing === 'question') {
      const delta = yPct - resizeStartY
      setLayoutSize(Math.max(12, Math.min(48, resizeStartSize + delta * 0.6)))
    }
    if (resizing === 'answer') {
      const delta = yPct - resizeStartY
      setAnswerSize(Math.max(12, Math.min(48, resizeStartSize + delta * 0.6)))
    }
  }

  const handlePreviewMouseUp = () => {
    setDragging(null)
    setResizing(null)
    setSnapGuides({ x: null, y: null })
  }

  const handleResizeMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    target: 'question' | 'answer',
  ) => {
    e.stopPropagation()
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    setResizing(target)
    setResizeStartY(yPct)
    setResizeStartSize(target === 'question' ? layoutSize : answerSize)
  }

  const getQuestionWarnings = (q: AnyQuestion) => {
    const warnings: string[] = []
    const hasImage = Boolean((q as any).imageUrl || (q as any).image)
    const mech = (q as any).mixedMechanic
    const updated = (q as any).updatedAt || (q as any).createdAt
    if (q.category?.toLowerCase() === 'cheese' && !hasImage) warnings.push('Bild fehlt')
    if (q.category?.toLowerCase() === 'mixed bag' && !mech) warnings.push('Mechanik fehlt')
    if (updated) {
      const days = (Date.now() - new Date(updated).getTime()) / (1000 * 60 * 60 * 24)
      if (days > 60) warnings.push('Alt (>60T)')
    }
    return warnings
  }

  return (
    <div
      className="page-transition-enter-active tool-page"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: '#e2e8f0',
        padding: '28px 18px',
        fontFamily: 'var(--font)'
      }}
    >
      {toast && (
        <div className="tool-toast toast toast--success">
          {toast}
        </div>
      )}
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gap: 14, gridTemplateColumns: '260px 1fr' }}>
        <div style={sideCard()} className="tool-card">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Schritte</div>
          <Stepper current={currentStep} onChange={setCurrentStep} />
          <div style={{ marginTop: 12, fontSize: 12, color: '#cbd5e1' }}>
            Autosave speichert in den lokalen Draft (gleiches Theme wie Play-App).
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <button
              className="tap-squish"
              style={cta(themeColor)}
              onClick={() => {
                persist()
                showToast('Draft gespeichert')
              }}
            >
              Speichern
            </button>
            <button className="tap-squish" style={smallBtn()} onClick={() => setCurrentStep((s) => Math.min(3, s + 1))}>
              Weiter
            </button>
            <button className="tap-squish" style={smallBtn()} onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}>
              Zurueck
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {currentStep === 0 && (
            <section style={card()} className="tool-card card-tilt">
              <h2>Struktur</h2>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div style={field()}>
                  <label>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} style={input()} />
                </div>
                <div style={field()}>
                  <label>Intro</label>
                  <select value={intro} onChange={(e) => setIntro(e.target.value)} style={input()}>
                    <option value="start">Am Anfang</option>
                    <option value="before-final">Vor Finalrunde</option>
                    <option value="off">Keine</option>
                  </select>
                </div>
                <div style={field()}>
                  <label>Regeln</label>
                  <select value={rules} onChange={(e) => setRules(e.target.value)} style={input()}>
                    <option value="start">Am Anfang</option>
                    <option value="before-final">Vor Finalrunde</option>
                    <option value="off">Keine</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Kategorien</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {categories.map((cat, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 60px',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        style={input()}
                        value={cat.name}
                        onChange={(e) =>
                          setCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c)))
                        }
                      />
                      <input
                        style={input()}
                        type="number"
                        min={1}
                        value={cat.questions}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, questions: Number(e.target.value) } : c)),
                          )
                        }
                      />
                      <button
                        style={smallBtn()}
                        onClick={() => setCategories((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={categories.length <= 1}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                  <button style={smallBtn()} onClick={addCategory}>
                    + Kategorie
                  </button>
                  <div style={{ color: '#cbd5e1' }}>Gesamt: {totalQuestions} Fragen</div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 1 && (
            <>
              <section style={card()} className="tool-card card-tilt">
                <h2>Fragen auswaehlen</h2>
                <div style={{ color: '#cbd5e1', marginBottom: 8 }}>
                  Filter/Checks kannst du im Question Editor vertiefen. Hier schnell picken/abwaehlen.
                </div>
                <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button style={smallBtn()} onClick={() => setShowQuestionDrawer(true)}>
                    Fragen-Drawer oeffnen
                  </button>
                  <div style={{ color: '#cbd5e1', fontSize: 12 }}>Drawer zeigt denselben Picker als Overlay.</div>
                </div>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 8 }}>
                  <input
                    style={input()}
                    placeholder="Suche nach Text/Kategorie"
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                  />
                  <select style={input()} value={qCategory} onChange={(e) => setQCategory(e.target.value)}>
                    <option value="all">Alle Kategorien</option>
                    {[...new Set(questions.map((q) => q.category))].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                    <input type="checkbox" checked={qImageOnly} onChange={(e) => setQImageOnly(e.target.checked)} /> Nur mit Bild
                  </label>
                  <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                    <input type="checkbox" checked={qMechanicOnly} onChange={(e) => setQMechanicOnly(e.target.checked)} /> Mechanik gesetzt
                  </label>
                  <select style={input()} value={mechanicFilter} onChange={(e) => setMechanicFilter(e.target.value)}>
                    <option value="all">Alle Mechaniken</option>
                    {mechanicOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={pill('#f97316')}>Warnung: kein Bild (Cheese)</div>
                  <div style={pill('#22c55e')}>Warnung: Mechanik fehlt (Mixed Bag)</div>
                  <div style={pill('#38bdf8')}>Frische: &gt; 60 Tage</div>
                </div>
                <div style={{ maxHeight: 320, overflow: 'auto', display: 'grid', gap: 8 }}>
                  {filteredQuestions.slice(0, 60).map((q) => (
                    <div
                      key={q.id}
                      style={{
                        display: "grid",
                        gap: 6,
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: selectedIds.includes(q.id) ? "#7a5bff22" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                        <div style={{ fontWeight: 700 }}>{q.text}</div>
                      </div>
                      <div style={{ color: "#cbd5e1", fontSize: 12 }}>
                        {q.category} {(q as any).imageUrl || (q as any).image ? "* Bild" : ""} {(q as any).mixedMechanic ? "* Mechanik" : ""}
                        {(() => {
                          const warns = getQuestionWarnings(q)
                          return warns.length ? ` | ${warns.join(' / ')}` : ''
                        })()}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={smallBtn()} onClick={() => openEdit(q)}>
                          Bearbeiten
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredQuestions.length === 0 && <div style={{ color: '#cbd5e1' }}>Keine Fragen geladen.</div>}
                </div>
                <div style={{ marginTop: 8, color: '#cbd5e1' }}>
                  Ausgewaehlt: {selectedIds.length} | Treffer: {filteredQuestions.length}
                </div>
                <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: 12 }}>
                  Tipp: Warnungen in der Liste zeigen fehlende Bilder/Mechaniken oder alte Fragen.
                </div>
                {showQuestionDrawer && (
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.7)',
                      zIndex: 2000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                    }}
                    onClick={() => setShowQuestionDrawer(false)}
                  >
                    <div
                      style={{
                        width: 'min(960px, 100%)',
                        maxHeight: '80vh',
                        background: '#0f172a',
                        borderRadius: 16,
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: 12,
                        overflow: 'auto',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 800 }}>Fragen-Drawer</div>
                        <button style={smallBtn()} onClick={() => setShowQuestionDrawer(false)}>
                          Schliessen
                        </button>
                      </div>
                      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 8 }}>
                        <input
                          style={input()}
                          placeholder="Suche nach Text/Kategorie"
                          value={qSearch}
                          onChange={(e) => setQSearch(e.target.value)}
                        />
                        <select style={input()} value={qCategory} onChange={(e) => setQCategory(e.target.value)}>
                          <option value="all">Alle Kategorien</option>
                          {[...new Set(questions.map((q) => q.category))].map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                          <input type="checkbox" checked={qImageOnly} onChange={(e) => setQImageOnly(e.target.checked)} /> Nur mit Bild
                        </label>
                        <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                          <input type="checkbox" checked={qMechanicOnly} onChange={(e) => setQMechanicOnly(e.target.checked)} /> Mechanik gesetzt
                        </label>
                        <select style={input()} value={mechanicFilter} onChange={(e) => setMechanicFilter(e.target.value)}>
                          <option value="all">Alle Mechaniken</option>
                          {mechanicOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ maxHeight: 400, overflow: 'auto', display: 'grid', gap: 8 }}>
                        {filteredQuestions.slice(0, 80).map((q) => (
                          <div
                            key={q.id}
                            style={{
                              display: 'grid',
                              gap: 6,
                              padding: 10,
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.12)',
                              background: selectedIds.includes(q.id) ? '#7a5bff22' : 'rgba(255,255,255,0.03)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                              <div style={{ fontWeight: 700 }}>{q.text}</div>
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: 12 }}>
                              {q.category} {(q as any).imageUrl || (q as any).image ? '* Bild' : ''}{' '}
                              {(q as any).mixedMechanic ? '* Mechanik' : ''}
                              {(() => {
                                const warns = getQuestionWarnings(q)
                                return warns.length ? ` | ${warns.join(' / ')}` : ''
                              })()}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button style={smallBtn()} onClick={() => openEdit(q)}>
                                Bearbeiten
                              </button>
                            </div>
                          </div>
                        ))}
                        {filteredQuestions.length === 0 && <div style={{ color: '#cbd5e1' }}>Keine Fragen geladen.</div>}
                      </div>
                    </div>
                  </div>
                )}
                {editQuestion && (
                  <Modal open={true} onClose={() => setEditQuestion(null)} title="Frage bearbeiten (Canvas)">
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={field()}>
                        <label>Text</label>
                        <input style={input()} value={editText} onChange={(e) => setEditText(e.target.value)} />
                      </div>
                      <div style={field()}>
                        <label>Antwort</label>
                        <input style={input()} value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} />
                      </div>
                      <div style={field()}>
                        <label>Kategorie</label>
                        <input style={input()} value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                      </div>
                      <div style={field()}>
                        <label>Mechanik</label>
                        <input style={input()} value={editMechanic} onChange={(e) => setEditMechanic(e.target.value)} placeholder="z.B. Schaetzfrage" />
                      </div>
                      <div style={field()}>
                        <label>Bild (URL)</label>
                        <input style={input()} value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="https://..." />
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button style={cta(themeColor)} onClick={saveEdit}>
                          Speichern (Canvas)
                        </button>
                        <button style={smallBtn()} onClick={() => setEditQuestion(null)}>
                          Abbrechen
                        </button>
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: 12 }}>
                        Hinweis: Speichert im Canvas und schickt ein PUT ans Backend; tiefergehende Pflege weiter im Question Editor.
                      </div>
                    </div>
                  </Modal>
                )}
              </section>

              <section style={card()} className="tool-card card-tilt">
                <h2>Checks</h2>
                <div style={{ color: '#cbd5e1' }}>
                  Empfohlene Pflichtpruefungen: Bildpflicht (Cheese), Mechanik (Mixed Bag), Frische (60/90 Tage), Duplikate.
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <div style={pill('#f97316')}>Bildpflicht fuer Bild-Runden</div>
                  <div style={pill('#22c55e')}>Frische: alte Fragen (&gt;60/90 Tage) ersetzen</div>
                  <div style={pill('#38bdf8')}>Mechanik gesetzt (Mixed Bag)</div>
                </div>
              </section>
            </>
          )}

          {currentStep === 2 && (
            <section style={card()} className="tool-card card-tilt">
              <h2>Praesentation & Branding</h2>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div style={field()}>
                  <label>Primaerfarbe</label>
                  <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div style={field()}>
                  <label>Hintergrund (URL)</label>
                  <input value={bg} onChange={(e) => setBg(e.target.value)} style={input()} placeholder="https://..." />
                </div>
                <div style={field()}>
                  <label>Logo (URL)</label>
                  <input value={logo} onChange={(e) => setLogo(e.target.value)} style={input()} placeholder="https://..." />
                </div>
                <div style={field()}>
                  <label>Font</label>
                  <input value={font} onChange={(e) => setFont(e.target.value)} style={input()} placeholder="Geist" />
                </div>
                <div style={field()}>
                  <label>Animation</label>
                  <select value={animation} onChange={(e) => setAnimation(e.target.value)} style={input()}>
                    <option value="Slide">Slide</option>
                    <option value="Fade">Fade</option>
                    <option value="Pop">Pop</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '240px 1.4fr 0.9fr', gap: 12, alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Slides</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {slides.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          ...pill(currentSlideId === s.id ? '#7a5bff' : '#94a3b8'),
                          cursor: 'pointer',
                          borderColor: currentSlideId === s.id ? '#7a5bffcc' : 'rgba(255,255,255,0.16)',
                        }}
                        onClick={() => setCurrentSlideId(s.id)}
                      >
                        {s.title}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 8, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Canvas</div>
                  <div
                    ref={previewRef}
                    onMouseDown={handlePreviewMouseDown}
                    onMouseMove={handlePreviewMouseMove}
                    onMouseUp={handlePreviewMouseUp}
                    onMouseLeave={handlePreviewMouseUp}
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      borderRadius: 12,
                      padding: 10,
                      background: bg ? `url(${bg}) center/cover` : '#0f172a',
                      overflow: 'hidden',
                      cursor: dragging || resizing ? 'grabbing' : 'crosshair',
                      border: '1px dashed rgba(255,255,255,0.2)',
                    }}
                  >
                    {(dragging || resizing) && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            bottom: 0,
                            width: 1,
                            background: 'rgba(122,91,255,0.4)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: 1,
                            background: 'rgba(122,91,255,0.4)',
                          }}
                        />
                      </>
                    )}
                    <div
                      data-role="question"
                      style={{
                        position: 'absolute',
                        left: `${layoutX}%`,
                        top: `${layoutY}%`,
                        transform: 'translate(-0%, -0%)',
                        fontSize: layoutSize,
                        fontWeight: 800,
                        border: editTarget === 'question' ? '1px dashed #7a5bff' : 'none',
                        padding: 4,
                        color: '#e2e8f0',
                      }}
                    >
                      {questionText}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'question')}
                        style={{
                          position: 'absolute',
                          right: -8,
                          bottom: -8,
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          background: '#7a5bff',
                          border: '1px solid rgba(255,255,255,0.4)',
                          cursor: 'nwse-resize',
                        }}
                      />
                    </div>
                    {answerText && (
                      <div
                        data-role="answer"
                        style={{
                          position: 'absolute',
                          left: `${answerX}%`,
                          top: `${answerY}%`,
                          transform: 'translate(-0%, -0%)',
                          fontSize: answerSize,
                          fontWeight: 700,
                          color: '#a5f3fc',
                          border: editTarget === 'answer' ? '1px dashed #7a5bff' : 'none',
                          padding: 4,
                        }}
                      >
                        {answerText}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, 'answer')}
                          style={{
                            position: 'absolute',
                            right: -8,
                            bottom: -8,
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            background: '#7a5bff',
                            border: '1px solid rgba(255,255,255,0.4)',
                            cursor: 'nwse-resize',
                          }}
                        />
                      </div>
                    )}
                    {showTimer && slideConfig.question.showTimer && (
                      <div
                        data-role="timer"
                        style={{
                          position: 'absolute',
                          left: `${timerX}%`,
                          top: `${timerY}%`,
                          padding: '6px 10px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.12)',
                          color: '#e2e8f0',
                          fontSize: 12,
                          fontWeight: 800,
                          border: editTarget === 'timer' ? '1px dashed #7a5bff' : 'none',
                        }}
                      >
                        Timer
                      </div>
                    )}
                    {showPoints && slideConfig.question.showPoints && (
                      <div
                        data-role="points"
                        style={{
                          position: 'absolute',
                          left: `${pointsX}%`,
                          top: `${pointsY}%`,
                          padding: '6px 10px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.12)',
                          color: '#e2e8f0',
                          fontSize: 12,
                          fontWeight: 800,
                          border: editTarget === 'points' ? '1px dashed #7a5bff' : 'none',
                        }}
                      >
                        Punkte
                      </div>
                    )}
                    {logo && <img src={logo} alt="logo" style={{ position: 'absolute', top: 10, right: 10, height: 40 }} />}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>Eigenschaften</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={field()}>
                      <label>Frage-Text</label>
                      <input value={questionText} onChange={(e) => setQuestionText(e.target.value)} style={input()} />
                    </div>
                    <div style={field()}>
                      <label>Antwort-Text</label>
                      <input value={answerText} onChange={(e) => setAnswerText(e.target.value)} style={input()} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700 }}>Preview</div>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        <input type="radio" checked={beamerPreview} onChange={() => setBeamerPreview(true)} /> Beamer
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        <input type="radio" checked={!beamerPreview} onChange={() => setBeamerPreview(false)} /> Team
                      </label>
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontWeight: 700 }}>Elemente</div>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={slideConfig.question.showTimer}
                            onChange={(e) =>
                              setSlideConfig((s) => ({ ...s, question: { ...s.question, showTimer: e.target.checked } }))
                            }
                          />{' '}
                          Timer (Frage)
                        </label>
                        <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={slideConfig.question.showPoints}
                            onChange={(e) =>
                              setSlideConfig((s) => ({ ...s, question: { ...s.question, showPoints: e.target.checked } }))
                            }
                          />{' '}
                          Punkte (Frage)
                        </label>
                        <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={slideConfig.intro.showRules}
                            onChange={(e) => setSlideConfig((s) => ({ ...s, intro: { showRules: e.target.checked } }))}
                          />{' '}
                          Regeln im Intro
                        </label>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>Positionen</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Frage X (%)
                        <input type="range" min={0} max={80} value={layoutX} onChange={(e) => setLayoutX(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Frage Y (%)
                        <input type="range" min={0} max={80} value={layoutY} onChange={(e) => setLayoutY(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Frage Groesse (px)
                        <input type="range" min={14} max={48} value={layoutSize} onChange={(e) => setLayoutSize(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Antwort X (%)
                        <input type="range" min={0} max={80} value={answerX} onChange={(e) => setAnswerX(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Antwort Y (%)
                        <input type="range" min={0} max={80} value={answerY} onChange={(e) => setAnswerY(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Antwort Groesse (px)
                        <input type="range" min={14} max={48} value={answerSize} onChange={(e) => setAnswerSize(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Timer X (%)
                        <input type="range" min={0} max={90} value={timerX} onChange={(e) => setTimerX(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Timer Y (%)
                        <input type="range" min={0} max={90} value={timerY} onChange={(e) => setTimerY(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Punkte X (%)
                        <input type="range" min={0} max={90} value={pointsX} onChange={(e) => setPointsX(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                      <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                        Punkte Y (%)
                        <input type="range" min={0} max={90} value={pointsY} onChange={(e) => setPointsY(Number(e.target.value))} style={{ width: '100%' }} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontWeight: 700 }}>Intro & Regeln</div>
                      <input value={introText} onChange={(e) => setIntroText(e.target.value)} style={input()} placeholder="Intro-Text" />
                      <textarea
                        value={rulesText}
                        onChange={(e) => setRulesText(e.target.value)}
                        style={{ ...input(), height: 80, resize: 'vertical' }}
                        placeholder="Regeln"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section style={card()} className="tool-card card-tilt">
              <h2>Preview & Publish</h2>
              <div
                style={{
                  borderRadius: 12,
                  padding: 16,
                  background: bg ? `url(${bg}) center/cover` : 'linear-gradient(135deg, #111827, #0b1224)',
                  color: '#e5e7eb',
                  minHeight: 140,
                  position: 'relative',
                  cursor: 'crosshair',
                }}
                ref={previewRef}
                onMouseDown={handlePreviewMouseDown}
              >
                {logo && <img src={logo} alt="logo" style={{ position: 'absolute', top: 12, right: 12, height: 50 }} />}
                <div style={{ fontWeight: 800, fontSize: 18 }}>Titel: {name}</div>
                <div style={{ marginTop: 6, color: '#cbd5e1' }}>
                  Intro: {intro} | Regeln: {rules} | Fragen: {totalQuestions}
                </div>
                <div style={{ marginTop: 6, color: '#cbd5e1' }}>Kategorien: {categories.map((c) => c.name).join(', ')}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#e5e7eb' }}>Animation: {animation}</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Slides (Reihenfolge)</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={pill('#7a5bff')}>Intro ({intro})</div>
                  {categories.map((c, idx) => (
                    <div key={idx} style={pill('#38bdf8')}>
                      Kategorie {idx + 1}: {c.name} | {c.questions} Fragen
                    </div>
                  ))}
                  <div style={pill('#22c55e')}>Regeln ({rules})</div>
                  <div style={pill('#f97316')}>Finale / Abschluss</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Slide-Preview</div>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '300px 1fr', alignItems: 'start' }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 700 }}>Layer</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {[
                        { key: 'question', label: 'Frage', visible: true },
                        { key: 'answer', label: 'Antwort', visible: true },
                        { key: 'timer', label: 'Timer', visible: showTimer && slideConfig.question.showTimer },
                        { key: 'points', label: 'Punkte', visible: showPoints && slideConfig.question.showPoints },
                      ].map((layer) => (
                        <div
                          key={layer.key}
                          style={{
                            ...pill(editTarget === layer.key ? '#7a5bff' : '#94a3b8'),
                            display: 'flex',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                          onClick={() => setEditTarget(layer.key as any)}
                        >
                          <span>{layer.label}</span>
                          <span style={{ fontSize: 12, color: layer.visible ? '#e2e8f0' : '#94a3b8' }}>
                            {layer.visible ? 'sichtbar' : 'aus'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                    <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 8 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{beamerPreview ? 'Beamer-Preview' : 'Team-Preview'}</div>
                      <div
                        ref={previewRef}
                        onMouseDown={handlePreviewMouseDown}
                        onMouseMove={handlePreviewMouseMove}
                        onMouseUp={handlePreviewMouseUp}
                        onMouseLeave={handlePreviewMouseUp}
                        style={{
                          position: 'relative',
                          height: 260,
                          borderRadius: 12,
                          padding: 10,
                          background: bg ? `url(${bg}) center/cover` : beamerPreview ? '#0f172a' : '#0b1724',
                          overflow: 'hidden',
                          cursor: dragging || resizing ? 'grabbing' : 'crosshair',
                        }}
                      >
                      <div
                        style={{
                          position: 'absolute',
                          left: `${layoutX}%`,
                          top: `${layoutY}%`,
                          transform: 'translate(-0%, -0%)',
                          fontSize: layoutSize,
                          fontWeight: 800,
                          border: editTarget === 'question' ? '1px dashed #7a5bff' : 'none',
                          padding: 4,
                        }}
                      >
                        {questionText}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, 'question')}
                          style={{
                            position: 'absolute',
                            right: -8,
                            bottom: -8,
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            background: '#7a5bff',
                            border: '1px solid rgba(255,255,255,0.4)',
                            cursor: 'nwse-resize',
                          }}
                        />
                      </div>
                      {answerText && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${answerX}%`,
                            top: `${answerY}%`,
                            transform: 'translate(-0%, -0%)',
                            fontSize: answerSize,
                            fontWeight: 700,
                            color: '#a5f3fc',
                            border: editTarget === 'answer' ? '1px dashed #7a5bff' : 'none',
                            padding: 4,
                          }}
                        >
                          {answerText}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, 'answer')}
                            style={{
                              position: 'absolute',
                              right: -8,
                              bottom: -8,
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              background: '#7a5bff',
                              border: '1px solid rgba(255,255,255,0.4)',
                              cursor: 'nwse-resize',
                            }}
                          />
                        </div>
                      )}
                      {showTimer && slideConfig.question.showTimer && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${timerX}%`,
                            top: `${timerY}%`,
                            padding: '6px 10px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.12)',
                            color: '#e2e8f0',
                            fontSize: 12,
                            fontWeight: 800,
                            border: editTarget === 'timer' ? '1px dashed #7a5bff' : 'none',
                          }}
                        >
                          Timer
                        </div>
                      )}
                      {showPoints && slideConfig.question.showPoints && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${pointsX}%`,
                            top: `${pointsY}%`,
                            padding: '6px 10px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.12)',
                            color: '#e2e8f0',
                            fontSize: 12,
                            fontWeight: 800,
                            border: editTarget === 'points' ? '1px dashed #7a5bff' : 'none',
                          }}
                        >
                          Punkte
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: 12 }}>Klicken um zu setzen, Drag fuer Feintuning, Handle fuer Groesse.</div>
                  </div>
                  <SlidePreview
                    title="Antwort"
                    bg="#0b1724"
                    question={questionText}
                    answer={answerText}
                    showTimer={showTimer && slideConfig.answer.showTimer}
                    showPoints={showPoints && slideConfig.answer.showPoints}
                    layout={{ layoutX, layoutY, layoutSize, answerX, answerY, answerSize, timerX, timerY, pointsX, pointsY }}
                  />
                  <SlidePreview
                    title="Intro"
                    bg="#111827"
                    question={introText}
                    answer={slideConfig.intro.showRules ? rulesText : ''}
                    showTimer={false}
                    showPoints={false}
                    layout={{ layoutX: 10, layoutY: 20, layoutSize: 22, answerX: 10, answerY: 50, answerSize: 16, timerX: 0, timerY: 0, pointsX: 0, pointsY: 0 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href="/draft-import" style={cta(themeColor)}>
                  Draft laden / spielen
                </a>
                <button
                  style={smallBtn()}
                  onClick={() => {
                    const data = {
                      name,
                      categories,
                      intro,
                      rules,
                      introText,
                      rulesText,
                      theme: { color: themeColor, background: bg, logoUrl: logo, font, animation },
                      selectedQuestionIds: selectedIds,
                    }
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${name.replace(/\s+/g, '-').toLowerCase() || 'quiz'}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Export JSON
                </button>
                <button
                  style={smallBtn()}
                  onClick={() => {
                    persist()
                    alert('Draft gespeichert.')
                  }}
                >
                  Speichern
                </button>
                <a href="/moderator" style={smallBtn()}>
                  Moderator
                </a>
                <a href="/beamer" style={smallBtn()}>
                  Beamer
                </a>
                <a href="/team" style={smallBtn()}>
                  Team
                </a>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

const sideCard = () => ({
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  padding: 14,
  position: 'sticky',
  top: 16,
  height: 'fit-content',
})

const card = () => ({
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.03)',
  padding: 14,
  boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
})

const input = () => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(0,0,0,0.28)',
  color: '#f8fafc',
  fontSize: 14,
})

const field = () => ({ display: 'flex', flexDirection: 'column', gap: 6 })

const pill = (color: string) => ({
  padding: '8px 12px',
  borderRadius: 999,
  border: `1px solid ${color}55`,
  background: `${color}22`,
  color: '#e2e8f0',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
})

const cta = (color: string) => ({
  width: '100%',
  marginTop: 12,
  padding: '10px 14px',
  borderRadius: 12,
  border: `1px solid ${color}66`,
  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
  color: '#0b1020',
  fontWeight: 800,
  cursor: 'pointer',
  textAlign: 'center',
  textDecoration: 'none',
  display: 'inline-block',
})

const smallBtn = () => ({
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.08)',
  color: '#e2e8f0',
  cursor: 'pointer',
})
