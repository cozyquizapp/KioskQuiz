import { useEffect, useMemo, useState } from 'react'
import { fetchQuestions } from '../api'
import { loadPlayDraft, savePlayDraft } from '../utils/draft'
import { AnyQuestion } from '@shared/quizTypes'

type Category = { name: string; questions: number }

const defaultCategories: Category[] = [
  { name: 'Bingo', questions: 5 },
  { name: 'Mixed Bag', questions: 5 },
  { name: 'Cheese', questions: 5 },
  { name: 'Wildcard', questions: 5 },
]

export default function CreatorCanvasPage() {
  const draft = loadPlayDraft()
  const [name, setName] = useState(draft?.name || 'Neues Quiz')
  const [categories, setCategories] = useState<Category[]>(draft?.structure.categories || defaultCategories)
  const [themeColor, setThemeColor] = useState(draft?.theme.color || '#7a5bff')
  const [bg, setBg] = useState(draft?.theme.background || '')
  const [logo, setLogo] = useState(draft?.theme.logoUrl || '')
  const [font, setFont] = useState(draft?.theme.font || 'Inter')
  const [intro, setIntro] = useState(draft?.structure.introAt || 'start')
  const [rules, setRules] = useState(draft?.structure.rulesAt || 'start')
  const [animation, setAnimation] = useState(draft?.theme.animation || 'Slide')
  const [currentStep, setCurrentStep] = useState(0)
  const [questions, setQuestions] = useState<AnyQuestion[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [layoutX, setLayoutX] = useState(10)
  const [layoutY, setLayoutY] = useState(10)
  const [layoutSize, setLayoutSize] = useState(18)

  useEffect(() => {
    fetchQuestions()
      .then((res) => setQuestions(res.questions))
      .catch(() => setQuestions([]))
  }, [])

  const totalQuestions = useMemo(() => categories.reduce((s, c) => s + c.questions, 0), [categories])

  const persist = () => {
    savePlayDraft({
      id: draft?.id || 'draft-canvas',
      name,
      structure: {
        rounds: 4,
        categories,
        introAt: intro as any,
        rulesAt: rules as any,
        mode: 'standard',
      },
      filters: draft?.filters || [],
      theme: { color: themeColor, background: bg, logoUrl: logo, font, animation },
      updatedAt: Date.now(),
    })
  }

  const addCategory = () => {
    setCategories((prev) => [...prev, { name: `Kategorie ${prev.length + 1}`, questions: 5 }])
  }

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), #0d0f14',
        color: '#e2e8f0',
        padding: '28px 18px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 14, gridTemplateColumns: '280px 1fr' }}>
        <div style={sideCard()}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Schritte</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {['Struktur', 'Fragen', 'Präsentation', 'Publish'].map((label, idx) => (
              <button
                key={label}
                style={{
                  ...pill('#7a5bff'),
                  justifyContent: 'flex-start',
                  background: currentStep === idx ? '#7a5bff22' : 'rgba(255,255,255,0.05)',
                  borderColor: currentStep === idx ? '#7a5bffcc' : 'rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentStep(idx)}
              >
                {idx + 1}. {label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#cbd5e1' }}>
            Autosave speichert in den lokalen Draft (gleiches Theme wie Play-App).
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <button
              style={cta(themeColor)}
              onClick={() => {
                persist()
                alert('Draft gespeichert.')
              }}
            >
              Speichern
            </button>
            <button style={smallBtn()} onClick={() => setCurrentStep((s) => Math.min(3, s + 1))}>
              Weiter
            </button>
            <button style={smallBtn()} onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}>
              Zurück
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {currentStep === 0 && (
          <section style={card()}>
            <h2>Struktur</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
          <section style={card()}>
            <h2>Fragen auswählen</h2>
            <div style={{ color: '#cbd5e1', marginBottom: 8 }}>
              Wähle Fragen für dein Quiz. Filter/Checks kannst du im Question Editor vertiefen.
            </div>
            <div style={{ maxHeight: 320, overflow: 'auto', display: 'grid', gap: 8 }}>
              {questions.slice(0, 50).map((q) => (
                <label
                  key={q.id}
                  style={{
                    display: 'grid',
                    gap: 4,
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
                    {q.category} {q.imageUrl ? '• Bild' : ''}
                  </div>
                </label>
              ))}
              {questions.length === 0 && <div style={{ color: '#cbd5e1' }}>Keine Fragen geladen.</div>}
            </div>
            <div style={{ marginTop: 8, color: '#cbd5e1' }}>Ausgewählt: {selectedIds.length}</div>
          </section>
          )}

          {currentStep === 2 && (
          <section style={card()}>
            <h2>Präsentation & Branding</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div style={field()}>
                <label>Primärfarbe</label>
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
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              {bg && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>BG Preview</div>
                  <img src={bg} alt="bg" style={{ width: 180, height: 100, objectFit: 'cover', borderRadius: 12 }} />
                </div>
              )}
              {logo && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Logo Preview</div>
                  <img src={logo} alt="logo" style={{ height: 80, objectFit: 'contain' }} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Element-Positionen (Frage-Text)</div>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                  X (%)
                  <input type="range" min={0} max={80} value={layoutX} onChange={(e) => setLayoutX(Number(e.target.value))} style={{ width: '100%' }} />
                </label>
                <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                  Y (%)
                  <input type="range" min={0} max={80} value={layoutY} onChange={(e) => setLayoutY(Number(e.target.value))} style={{ width: '100%' }} />
                </label>
                <label style={{ color: '#cbd5e1', fontSize: 13 }}>
                  Größe (px)
                  <input type="range" min={14} max={36} value={layoutSize} onChange={(e) => setLayoutSize(Number(e.target.value))} style={{ width: '100%' }} />
                </label>
              </div>
            </div>
          </section>
          )}

          {currentStep === 1 && (
          <section style={card()}>
            <h2>Fragen (Checks)</h2>
            <div style={{ color: '#cbd5e1' }}>
              Nutze den Question Editor für Bildpflicht, Frische, Duplikate. Hier nur ein kurzer Hinweisblock.
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <div style={pill('#f97316')}>Bildpflicht für Bild-Runden</div>
              <div style={pill('#22c55e')}>Frische: alte Fragen (&gt;60/90 Tage) ersetzen</div>
              <div style={pill('#38bdf8')}>Mechanik gesetzt (Mixed Bag)</div>
            </div>
          </section>
          )}

          {currentStep === 3 && (
          <section style={card()}>
            <h2>Preview</h2>
            <div
              style={{
                borderRadius: 12,
                padding: 16,
                background: bg ? `url(${bg}) center/cover` : 'linear-gradient(135deg, #111827, #0b1224)',
                color: '#e5e7eb',
                minHeight: 140,
                position: 'relative',
              }}
            >
              {logo && <img src={logo} alt="logo" style={{ position: 'absolute', top: 12, right: 12, height: 50 }} />}
              <div style={{ fontWeight: 800, fontSize: 18 }}>Titel: {name}</div>
              <div style={{ marginTop: 6, color: '#cbd5e1' }}>
                Intro: {intro} • Regeln: {rules} • Fragen: {totalQuestions}
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
                    Kategorie {idx + 1}: {c.name} • {c.questions} Fragen
                  </div>
                ))}
                <div style={pill('#22c55e')}>Regeln ({rules})</div>
                <div style={pill('#f97316')}>Finale / Abschluss</div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Position-Preview</div>
              <div
                style={{
                  position: 'relative',
                  height: 180,
                  borderRadius: 12,
                  background: '#0f172a',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  overflow: 'hidden',
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
                  }}
                >
                  Frage-Text
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/draft-import" style={cta(themeColor)}>
                Draft laden / spielen
              </a>
              <button
                style={smallBtn()}
                onClick={() => {
                  persist()
                  alert('Draft gespeichert.')
                }}
              >
                Speichern
              </button>
            </div>
          </section>
          )}
        </div>
      </div>
    </div>
  )
}

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
})

const smallBtn = () => ({
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.08)',
  color: '#e2e8f0',
  cursor: 'pointer',
})
