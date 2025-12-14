import { useEffect, useMemo, useState, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { AnyQuestion } from '@shared/quizTypes'
import { fetchQuestions } from '../api'
import { loadPlayDraft, savePlayDraft } from '../utils/draft'

type Category = { name: string; questions: number }

const defaultCategories: Category[] = [
  { name: 'Bingo', questions: 5 },
  { name: 'Mixed Bag', questions: 5 },
  { name: 'Cheese', questions: 5 },
  { name: 'Wildcard', questions: 5 },
]

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

const input = () => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(0,0,0,0.28)',
  color: '#f8fafc',
  fontSize: 14,
})

const smallBtn = () => ({
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.08)',
  color: '#e2e8f0',
  cursor: 'pointer',
  textAlign: 'center' as const,
  textDecoration: 'none',
  fontWeight: 700,
})

const field = () => ({ display: 'flex', flexDirection: 'column', gap: 6 })

export default function BaukastenPage() {
  const draft = loadPlayDraft()
  const [tab, setTab] = useState<'struktur' | 'fragen' | 'slides' | 'theme' | 'publish'>('slides')
  const [name, setName] = useState(draft?.name || 'Neues Quiz')
  const [categories, setCategories] = useState<Category[]>(draft?.structure.categories || defaultCategories)
  const [intro, setIntro] = useState(draft?.structure.introAt || 'start')
  const [rules, setRules] = useState(draft?.structure.rulesAt || 'start')
  const [themeColor, setThemeColor] = useState(draft?.theme.color || '#7a5bff')
  const [bg, setBg] = useState(draft?.theme.background || '')
  const [logo, setLogo] = useState(draft?.theme.logoUrl || '')
  const [font, setFont] = useState(draft?.theme.font || 'Inter')
  const [animation, setAnimation] = useState(draft?.theme.animation || 'Slide')
  const [introText, setIntroText] = useState(draft?.structure.introText || 'Willkommen zum Cozy Kiosk Quiz!')
  const [rulesText, setRulesText] = useState(draft?.structure.rulesText || 'Regeln kurz erklaeren')
  const [questionText, setQuestionText] = useState('Frage-Text')
  const [answerText, setAnswerText] = useState('Antwort-Text')

  const [questions, setQuestions] = useState<AnyQuestion[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [qSearch, setQSearch] = useState('')
  const [qCategory, setQCategory] = useState<string>('all')
  const [qImageOnly, setQImageOnly] = useState(false)
  const [qMechanicOnly, setQMechanicOnly] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showAnswer, setShowAnswer] = useState(true)
  const [lockDrag, setLockDrag] = useState(false)
  const [layerVisibility, setLayerVisibility] = useState({
    question: true,
    answer: true,
    timer: true,
    points: false,
  })
  const [layerLock, setLayerLock] = useState({
    question: false,
    answer: false,
    timer: false,
    points: false,
  })
  const themePresets = [
    { name: 'Neon', color: '#7a5bff', bg: 'linear-gradient(135deg,#0f172a,#1f2937)', font: 'Inter', animation: 'Slide' },
    { name: 'Minimal', color: '#38bdf8', bg: 'linear-gradient(135deg,#0b1224,#0f172a)', font: 'Poppins', animation: 'Fade' },
    { name: 'Playful', color: '#f97316', bg: 'linear-gradient(135deg,#1d1b27,#312e81)', font: 'Nunito', animation: 'Pop' },
    { name: 'Clean', color: '#ffffff', bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', font: 'Inter', animation: 'Fade' },
    { name: 'Bold', color: '#0ea5e9', bg: 'linear-gradient(135deg,#111827,#0b1224)', font: 'Montserrat', animation: 'Slide' },
  ]
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const [layoutX, setLayoutX] = useState(10)
  const [layoutY, setLayoutY] = useState(10)
  const [layoutSize, setLayoutSize] = useState(22)
  const [answerX, setAnswerX] = useState(10)
  const [answerY, setAnswerY] = useState(52)
  const [answerSize, setAnswerSize] = useState(18)
  const [timerX, setTimerX] = useState(82)
  const [timerY, setTimerY] = useState(6)
  const [pointsX, setPointsX] = useState(82)
  const [pointsY, setPointsY] = useState(16)
  const [showTimer, setShowTimer] = useState(true)
  const [showPoints, setShowPoints] = useState(false)
  const [editTarget, setEditTarget] = useState<'question' | 'answer' | 'timer' | 'points'>('question')
  const [dragging, setDragging] = useState<null | 'question' | 'answer' | 'timer' | 'points'>(null)
  const [resizing, setResizing] = useState<null | 'question' | 'answer'>(null)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [resizeStartSize, setResizeStartSize] = useState(0)

  const previewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchQuestions()
      .then((res) => setQuestions(res.questions))
      .catch(() => setQuestions([]))
  }, [])

  const totalQuestions = useMemo(() => categories.reduce((s, c) => s + c.questions, 0), [categories])
  const slides = useMemo(
    () => [{ id: 'intro', title: 'Intro' }, { id: 'rules', title: 'Regeln' }, ...categories.map((c, i) => ({ id: `cat-${i}`, title: c.name }))],
    [categories],
  )

  const filteredQuestions = useMemo(() => {
    const term = qSearch.toLowerCase()
    return questions.filter((q) => {
      const matchesText = q.text?.toLowerCase().includes(term) || q.category?.toLowerCase().includes(term)
      const matchesCat = qCategory === 'all' ? true : q.category === qCategory
      const hasImg = Boolean((q as any).imageUrl || (q as any).image)
      const matchesImg = qImageOnly ? hasImg : true
      const mech = (q as any).mixedMechanic
      const matchesMech = qMechanicOnly ? Boolean(mech) : true
      return matchesText && matchesCat && matchesImg && matchesMech
    })
  }, [questions, qSearch, qCategory, qImageOnly, qMechanicOnly])
  const selectedByCategory = useMemo(() => {
    const map: Record<string, AnyQuestion[]> = {}
    selectedIds.forEach((id) => {
      const q = questions.find((qq) => qq.id === id)
      if (!q?.category) return
      if (!map[q.category]) map[q.category] = []
      map[q.category].push(q)
    })
    return map
  }, [selectedIds, questions])
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    selectedIds.forEach((id) => {
      const q = questions.find((qq) => qq.id === id)
      if (!q?.category) return
      counts[q.category] = (counts[q.category] || 0) + 1
    })
    return counts
  }, [selectedIds, questions])

  const persist = () => {
    savePlayDraft({
      id: draft?.id || 'draft-baukasten',
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
    setShowToast(true)
    setTimeout(() => setShowToast(false), 1600)
  }

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const addCategory = () => setCategories((prev) => [...prev, { name: `Kategorie ${prev.length + 1}`, questions: 5 }])

  const getQuestionWarnings = (q: AnyQuestion) => {
    const warns: string[] = []
    const hasImg = Boolean((q as any).imageUrl || (q as any).image)
    const mech = (q as any).mixedMechanic
    if (q.category?.toLowerCase() === 'cheese' && !hasImg) warns.push('Bild fehlt')
    if (q.category?.toLowerCase() === 'mixed bag' && !mech) warns.push('Mechanik fehlt')
    return warns
  }

  const snap = (val: number) => Math.min(95, Math.max(0, Math.round(val / 2) * 2))

  const handleStageMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (lockDrag) return
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    if ((layerLock as any)[editTarget]) return
    setDragging(editTarget)
    setResizing(null)
    if (editTarget === 'question') {
      setLayoutX(snap(xPct))
      setLayoutY(snap(yPct))
    }
    if (editTarget === 'answer') {
      setAnswerX(snap(xPct))
      setAnswerY(snap(yPct))
    }
    if (editTarget === 'timer') {
      setTimerX(snap(xPct))
      setTimerY(snap(yPct))
    }
    if (editTarget === 'points') {
      setPointsX(snap(xPct))
      setPointsY(snap(yPct))
    }
  }

  const handleStageMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (lockDrag) return
    if ((!dragging && !resizing) || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    if (dragging === 'question') {
      setLayoutX(snap(xPct))
      setLayoutY(snap(yPct))
    }
    if (dragging === 'answer') {
      setAnswerX(snap(xPct))
      setAnswerY(snap(yPct))
    }
    if (dragging === 'timer') {
      setTimerX(snap(xPct))
      setTimerY(snap(yPct))
    }
    if (dragging === 'points') {
      setPointsX(snap(xPct))
      setPointsY(snap(yPct))
    }
    if (resizing === 'question') {
      const delta = yPct - resizeStartY
      setLayoutSize(Math.max(12, Math.min(60, resizeStartSize + delta * 0.6)))
    }
    if (resizing === 'answer') {
      const delta = yPct - resizeStartY
      setAnswerSize(Math.max(12, Math.min(60, resizeStartSize + delta * 0.6)))
    }
  }

  const handleStageMouseUp = () => {
    setDragging(null)
    setResizing(null)
  }

  const handleResizeMouseDown = (e: ReactMouseEvent<HTMLDivElement>, target: 'question' | 'answer') => {
    e.stopPropagation()
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    setResizing(target)
    setResizeStartY(yPct)
    setResizeStartSize(target === 'question' ? layoutSize : answerSize)
  }

  const renderInspector = () => {
    if (tab === 'struktur') {
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Struktur</div>
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
          <div style={{ fontWeight: 700 }}>Kategorien</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {categories.map((cat, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 44px', gap: 6, alignItems: 'center' }}>
                <input style={input()} value={cat.name} onChange={(e) => setCategories((p) => p.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c)))} />
                <input
                  style={input()}
                  type="number"
                  min={1}
                  value={cat.questions}
                  onChange={(e) => setCategories((p) => p.map((c, i) => (i === idx ? { ...c, questions: Number(e.target.value) } : c)))}
                />
                <button style={smallBtn()} disabled={categories.length <= 1} onClick={() => setCategories((p) => p.filter((_, i) => i !== idx))}>
                  X
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={smallBtn()} onClick={addCategory}>
              + Kategorie
            </button>
            <div style={{ color: '#cbd5e1' }}>Gesamt: {totalQuestions}</div>
          </div>
        </div>
      )
    }

    if (tab === 'fragen') {
      return (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Fragen</div>
            <button style={smallBtn()} onClick={() => setShowDrawer(true)}>
              Fragen-Drawer oeffnen
            </button>
            <div style={{ display: 'grid', gap: 6, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontWeight: 700 }}>Soll/Ist je Kategorie</div>
              {categories.map((c) => {
                const have = categoryCounts[c.name] || 0
                const target = c.questions
                const ok = have >= target
                return (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', color: ok ? '#22c55e' : '#f97316', fontSize: 13 }}>
                    <span>{c.name}</span>
                    <span>
                      {have} / {target}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={field()}>
              <label>Suche</label>
              <input style={input()} value={qSearch} onChange={(e) => setQSearch(e.target.value)} placeholder="Text / Kategorie" />
            </div>
            <div style={field()}>
            <label>Kategorie</label>
            <select style={input()} value={qCategory} onChange={(e) => setQCategory(e.target.value)}>
              <option value="all">Alle Kategorien</option>
              {[...new Set(questions.map((q) => q.category))].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <label style={{ color: '#cbd5e1', fontSize: 13 }}>
            <input type="checkbox" checked={qImageOnly} onChange={(e) => setQImageOnly(e.target.checked)} /> Nur mit Bild
          </label>
          <label style={{ color: '#cbd5e1', fontSize: 13 }}>
            <input type="checkbox" checked={qMechanicOnly} onChange={(e) => setQMechanicOnly(e.target.checked)} /> Mechanik gesetzt
          </label>
          <div style={{ color: '#cbd5e1', fontSize: 12 }}>Ausgewaehlt: {selectedIds.length} | Treffer: {filteredQuestions.length}</div>
          {selectedIds.length > 0 && (
            <div style={{ display: 'grid', gap: 6, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', maxHeight: 160, overflow: 'auto' }}>
              <div style={{ fontWeight: 700 }}>Auswahl</div>
              {selectedIds.map((id) => {
                const q = questions.find((qq) => qq.id === id)
                if (!q) return null
                return (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#cbd5e1', gap: 8 }}>
                    <span style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</span>
                    <span style={{ color: '#94a3b8' }}>{q.category}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (tab === 'theme') {
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Theme</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {themePresets.map((p) => (
              <button
                key={p.name}
                style={{ ...smallBtn(), background: `${p.color}22`, borderColor: `${p.color}77`, color: '#e2e8f0' }}
                onClick={() => {
                  setThemeColor(p.color)
                  setBg(p.bg)
                  setFont(p.font)
                  setAnimation(p.animation as any)
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
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
            <input value={font} onChange={(e) => setFont(e.target.value)} style={input()} placeholder="Inter" />
          </div>
          <div style={field()}>
            <label>Animation</label>
            <select value={animation} onChange={(e) => setAnimation(e.target.value)} style={input()}>
              <option value="Slide">Slide</option>
              <option value="Fade">Fade</option>
              <option value="Pop">Pop</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {bg && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>BG Preview</div>
                <img src={bg} alt="bg" style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 10 }} />
              </div>
            )}
            {logo && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Logo Preview</div>
                <img src={logo} alt="logo" style={{ height: 60, objectFit: 'contain' }} />
              </div>
            )}
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
      )
    }

    if (tab === 'publish') {
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Publish</div>
          <div style={{ color: '#cbd5e1' }}>Titel: {name}</div>
          <div style={{ color: '#cbd5e1' }}>Intro: {intro} | Regeln: {rules}</div>
          <div style={{ color: '#cbd5e1' }}>Fragen: {totalQuestions}</div>
          <div style={{ color: '#cbd5e1' }}>Kategorien: {categories.map((c) => `${c.name} (${c.questions})`).join(', ')}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <button style={smallBtn()} onClick={persist}>
              Speichern
            </button>
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
            <a href="/draft-import" style={smallBtn()}>
              Draft laden
            </a>
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
        </div>
      )
    }

    // slides tab
    return (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Slides</div>
          <div style={{ color: '#cbd5e1' }}>Elemente auf der Bühne anklicken & verschieben, Feinjustierung per Slider.</div>
          <div style={field()}>
            <label>Frage-Text</label>
          <input value={questionText} onChange={(e) => setQuestionText(e.target.value)} style={input()} />
        </div>
        <div style={field()}>
          <label>Antwort-Text</label>
          <input value={answerText} onChange={(e) => setAnswerText(e.target.value)} style={input()} />
        </div>
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
            Frage Groesse
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
            Antwort Groesse
            <input type="range" min={14} max={48} value={answerSize} onChange={(e) => setAnswerSize(Number(e.target.value))} style={{ width: '100%' }} />
          </label>
          <button style={smallBtn()} onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Advanced zuklappen' : 'Advanced anzeigen'}
          </button>
          {showAdvanced && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                <input type="checkbox" checked={showTimer} onChange={(e) => setShowTimer(e.target.checked)} /> Timer
              </label>
              <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                <input type="checkbox" checked={showPoints} onChange={(e) => setShowPoints(e.target.checked)} /> Punkte
              </label>
              <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                <input type="checkbox" checked={showAnswer} onChange={(e) => setShowAnswer(e.target.checked)} /> Antwort einblenden
              </label>
              <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                <input type="checkbox" checked={lockDrag} onChange={(e) => setLockDrag(e.target.checked)} /> Drag sperren
              </label>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 700 }}>Layer Sichtbarkeit</div>
                {(['question', 'answer', 'timer', 'points'] as const).map((key) => (
                  <label key={key} style={{ color: '#cbd5e1', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={(layerVisibility as any)[key]}
                      onChange={(e) => setLayerVisibility((s) => ({ ...s, [key]: e.target.checked }))}
                    />{' '}
                    {key} sichtbar
                  </label>
                ))}
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 700 }}>Layer Lock</div>
                {(['question', 'answer', 'timer', 'points'] as const).map((key) => (
                  <label key={key} style={{ color: '#cbd5e1', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={(layerLock as any)[key]}
                      onChange={(e) => setLayerLock((s) => ({ ...s, [key]: e.target.checked }))}
                    />{' '}
                    {key} sperren
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['question', 'answer', 'timer', 'points'] as const).map((t) => (
                  <button
                    key={t}
                    style={{
                      ...smallBtn(),
                      background: editTarget === t ? '#7a5bff33' : 'rgba(255,255,255,0.08)',
                      borderColor: editTarget === t ? '#7a5bff88' : 'rgba(255,255,255,0.16)',
                    }}
                    onClick={() => setEditTarget(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), #0d0f14',
        color: '#e2e8f0',
        padding: '20px 16px',
      }}
    >
      <div style={{ maxWidth: 1500, margin: '0 auto', display: 'grid', gap: 12, gridTemplateColumns: '210px 1fr 340px' }}>
        <div
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            padding: 14,
            height: 'fit-content',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Baukasten</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(['struktur', 'fragen', 'slides', 'theme', 'publish'] as const).map((t) => (
              <button
                key={t}
                style={{
                  ...pill(tab === t ? '#7a5bff' : '#94a3b8'),
                  justifyContent: 'flex-start',
                  cursor: 'pointer',
                  borderColor: tab === t ? '#7a5bffcc' : 'rgba(255,255,255,0.16)',
                }}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            <button style={smallBtn()} onClick={() => setShowDrawer(true)}>
              Fragen-Drawer
            </button>
            <button style={smallBtn()} onClick={persist}>
              Speichern
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#cbd5e1' }}>16:9 Canvas, Tabs nur im Inspector.</div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Slides</div>
              {slides.map((s) => (
                <div
                  key={s.id}
                  style={{
                    ...pill(currentSlideId === s.id ? '#7a5bff' : '#38bdf8'),
                    cursor: 'pointer',
                    borderColor: currentSlideId === s.id ? '#7a5bffcc' : 'rgba(255,255,255,0.16)',
                  }}
                  onClick={() => setCurrentSlideId(s.id)}
                >
                  {s.title}
                </div>
              ))}
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 8, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Canvas</div>
              <div
                ref={previewRef}
                onMouseDown={handleStageMouseDown}
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp}
                onMouseLeave={handleStageMouseUp}
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: 12,
                  padding: 10,
                  background: bg ? `url(${bg}) center/cover` : '#0f172a',
                  overflow: 'hidden',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  cursor: dragging || resizing ? 'grabbing' : 'crosshair',
                }}
              >
                {(dragging || resizing) && (
                  <>
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(122,91,255,0.4)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(122,91,255,0.4)' }} />
                  </>
                )}
                {layerVisibility.question && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${layoutX}%`,
                    top: `${layoutY}%`,
                      transform: 'translate(-0%, -0%)',
                      fontSize: layoutSize,
                      fontWeight: 800,
                      color: '#e2e8f0',
                    border: editTarget === 'question' ? '1px dashed #7a5bff' : 'none',
                    padding: 4,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (layerLock.question) return
                    setEditTarget('question')
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
                )}
                {layerVisibility.answer && showAnswer && (
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
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        if (layerLock.answer) return
                        setEditTarget('answer')
                        handleResizeMouseDown(e, 'answer')
                      }}
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
                {layerVisibility.timer && showTimer && (
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
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      if (layerLock.timer) return
                      setEditTarget('timer')
                    }}
                  >
                    Timer
                  </div>
                )}
                {layerVisibility.points && showPoints && (
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
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      if (layerLock.points) return
                      setEditTarget('points')
                    }}
                  >
                    Punkte
                  </div>
                )}
                {logo && <img src={logo} alt="logo" style={{ position: 'absolute', top: 10, right: 10, height: 40 }} />}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['question', 'answer', 'timer', 'points'] as const).map((t) => (
                  <button
                    key={t}
                    style={{
                      ...smallBtn(),
                      background: editTarget === t ? '#7a5bff33' : 'rgba(255,255,255,0.08)',
                      borderColor: editTarget === t ? '#7a5bff88' : 'rgba(255,255,255,0.16)',
                    }}
                    onClick={() => setEditTarget(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Slots / Kategorien</div>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div
                style={{ ...pill('#7a5bff'), borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
                onClick={() => setTab('slides')}
              >
                Intro / Regeln
              </div>
              {categories.map((c, idx) => {
                const list = selectedByCategory[c.name] || []
                const slideId = `cat-${idx}`
                return (
                  <div
                    key={c.name}
                    onClick={() => {
                      setCurrentSlideId(slideId)
                      setTab('slides')
                    }}
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.04)',
                      padding: 10,
                      display: 'grid',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ color: '#cbd5e1', fontSize: 12 }}>
                      {list.length} / {c.questions} ausgewählt
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {list.slice(0, 4).map((q) => (
                        <div key={q.id} style={{ fontSize: 12, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          • {q.text}
                        </div>
                      ))}
                      {list.length > 4 && <div style={{ color: '#94a3b8', fontSize: 12 }}>… {list.length - 4} weitere</div>}
                    </div>
                  </div>
                )
              })}
              <div
                style={{ ...pill('#f97316'), borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
                onClick={() => setTab('slides')}
              >
                Finale / Abschluss
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            padding: 14,
            height: 'fit-content',
          }}
        >
          {renderInspector()}
        </div>
      </div>

      {showDrawer && (
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
          onClick={() => setShowDrawer(false)}
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
              <div style={{ fontWeight: 800 }}>Fragen</div>
              <button style={smallBtn()} onClick={() => setShowDrawer(false)}>
                Schliessen
              </button>
            </div>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 8 }}>
              <input style={input()} placeholder="Suche nach Text/Kategorie" value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
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
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={pill('#f97316')}>Warnung: kein Bild (Cheese)</div>
              <div style={pill('#22c55e')}>Warnung: Mechanik fehlt (Mixed Bag)</div>
            </div>
            <div style={{ maxHeight: 420, overflow: 'auto', display: 'grid', gap: 8 }}>
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
                  <div style={{ color: '#cbd5e1', fontSize: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span>{q.category}</span>
                    {(q as any).imageUrl || (q as any).image ? <span style={pill('#22c55e')}>Bild</span> : <span style={pill('#f97316')}>kein Bild</span>}
                    {(q as any).mixedMechanic ? <span style={pill('#22c55e')}>Mechanik</span> : <span style={pill('#f97316')}>keine Mechanik</span>}
                    {(() => {
                      const warns = getQuestionWarnings(q)
                      return warns.length
                        ? warns.map((w, i) => (
                            <span key={w + i} style={pill('#f97316')}>
                              {w}
                            </span>
                          ))
                        : null
                    })()}
                  </div>
                </div>
              ))}
              {filteredQuestions.length === 0 && <div style={{ color: '#cbd5e1' }}>Keine Fragen geladen.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
