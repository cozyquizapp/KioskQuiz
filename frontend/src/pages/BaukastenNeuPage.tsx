import { useEffect, useMemo, useRef, useState } from 'react'
import { AnyQuestion } from '@shared/quizTypes'
import { fetchQuestions } from '../api'
import { loadPlayDraft, savePlayDraft } from '../utils/draft'

const card = {
  background: 'rgba(12,16,26,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  padding: 16,
  color: '#e2e8f0',
  boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
} as const

const input = () => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(0,0,0,0.25)',
  color: '#f8fafc',
})

const pill = (label: string, active = false) => ({
  padding: '8px 12px',
  borderRadius: 999,
  border: `1px solid ${active ? '#7a5bff' : 'rgba(255,255,255,0.2)'}`,
  background: active ? 'rgba(122,91,255,0.15)' : 'rgba(255,255,255,0.05)',
  color: '#e2e8f0',
  fontWeight: 700,
})

export default function BaukastenNeuPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [name, setName] = useState('Neues Quiz')
  const [rounds, setRounds] = useState(5)
  const [categories, setCategories] = useState<string[]>(['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'Mixed Bag'])
  const [language, setLanguage] = useState<'de' | 'en' | 'both'>('both')

  const [questions, setQuestions] = useState<AnyQuestion[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [mixedMechanic, setMixedMechanic] = useState('Connect Five')
  const [katalogName, setKatalogName] = useState('Standard-Katalog')

  const [themePreset, setThemePreset] = useState<'CozyBeamer' | 'Custom'>('CozyBeamer')
  const [bg, setBg] = useState('radial-gradient(circle at 20% 20%, #1a1f39 0%, #0d0f14 55%)')
  const [accent, setAccent] = useState('#fbbf24')
  const [themeName, setThemeName] = useState('Cozy Beamer')
  const [savedThemes, setSavedThemes] = useState<{ name: string; bg: string; accent: string }[]>([])

  const [slotSpinMs, setSlotSpinMs] = useState(2400)
  const [slotHoldMs, setSlotHoldMs] = useState(1200)
  const [slotIntervalMs, setSlotIntervalMs] = useState(260)
  const [slotScale, setSlotScale] = useState(1)

  const [slides, setSlides] = useState<{ id: string; title: string; questionId?: string }[]>([])
  const [layoutX, setLayoutX] = useState(10)
  const [layoutY, setLayoutY] = useState(10)
  const [layoutSize, setLayoutSize] = useState(22)
  const [answerX, setAnswerX] = useState(10)
  const [answerY, setAnswerY] = useState(52)
  const [answerSize, setAnswerSize] = useState(18)

  const loadQuestions = async () => {
    const res = await fetchQuestions()
    setQuestions(res.questions)
  }

  const selectedQuestions = useMemo(() => questions.filter((q) => selected.includes(q.id)), [questions, selected])

  const toggleSelect = (id: string) => {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  const isMixedAllowed = (q: AnyQuestion) => {
    if (q.category !== 'Mixed Bag') return true
    const mech = (q as any).mixedMechanic || (q as any).mechanic || ''
    return mech.toLowerCase() === mixedMechanic.toLowerCase()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a', color: '#e2e8f0', padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 12, gridTemplateColumns: '240px 1fr' }}>
        <div style={{ ...card, position: 'sticky', top: 10, alignSelf: 'start' }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Baukasten Neu</div>
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              style={{ ...pill(`Step ${i}`, step === (i as any)), width: '100%', textAlign: 'left', marginBottom: 6 }}
              onClick={() => setStep(i as any)}
            >
              {i === 1 && '1. Struktur'}
              {i === 2 && '2. Fragen'}
              {i === 3 && '3. Theme'}
              {i === 4 && '4. Slides'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {step === 1 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Struktur</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} style={input()} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
                  <div>
                    <label>Runden</label>
                    <input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} style={input()} />
                  </div>
                  <div>
                    <label>Sprache</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value as any)} style={input()}>
                      <option value="de">Deutsch</option>
                      <option value="en">Englisch</option>
                      <option value="both">Beides</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>Kategorien</label>
                  <input
                    value={categories.join(', ')}
                    onChange={(e) => setCategories(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                    style={input()}
                  />
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Komma-getrennt</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Fragen waehlen</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ ...pill(katalogName), display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Katalog:</span>
                  <select value={katalogName} onChange={(e) => setKatalogName(e.target.value)} style={input()}>
                    <option>Standard-Katalog</option>
                    <option>Bilder-Katalog</option>
                    <option>Audio/Video-Katalog</option>
                    <option>Custom (Import)</option>
                  </select>
                </div>
                <button onClick={loadQuestions} style={pill('Katalog laden')}>Katalog laden</button>
                <button style={pill('Frageneditor')} onClick={() => (window.location.href = '/question-editor')}>
                  Fragenkatalog Ã¶ffnen
                </button>
                <div style={{ ...pill('Mixed Bag Mechanik'), display: 'flex', gap: 6 }}>
                  <span>Mechanik:</span>
                  <select value={mixedMechanic} onChange={(e) => setMixedMechanic(e.target.value)} style={input()}>
                    <option>Connect Five</option>
                    <option>Bilder-Raetsel</option>
                    <option>Schnellraten</option>
                    <option>Audio/Clip</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
                {questions
                  .filter(isMixedAllowed)
                  .slice(0, 60)
                  .map((q) => (
                    <div key={q.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, background: selected.includes(q.id) ? 'rgba(122,91,255,0.12)' : 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(q as any).text || (q as any).question}</div>
                        <input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggleSelect(q.id)} />
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{q.category}</div>
                      {q.category === 'Mixed Bag' && (
                        <div style={{ fontSize: 11, color: '#22c55e' }}>
                          Mechanik: {(q as any).mixedMechanic || (q as any).mechanic || 'keine'}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <button style={pill('Cozy Beamer', themePreset === 'CozyBeamer')} onClick={() => setThemePreset('CozyBeamer')}>
                  Cozy Beamer (Default)
                </button>
                <button style={pill('Custom', themePreset === 'Custom')} onClick={() => setThemePreset('Custom')}>
                  Custom
                </button>
              </div>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: 10 }}>
                <div style={{ ...pill('Theme-Name'), display: 'grid', gap: 6, borderRadius: 12 }}>
                  <label>Name</label>
                  <input value={themeName} onChange={(e) => setThemeName(e.target.value)} style={input()} />
                  <button
                    style={pill('Theme speichern')}
                    onClick={() => {
                      if (!themeName.trim()) return
                      setSavedThemes((prev) => [{ name: themeName.trim(), bg, accent }, ...prev.filter((t) => t.name !== themeName.trim())])
                    }}
                  >
                    Speichern
                  </button>
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Gespeicherte Themes</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {savedThemes.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Noch keine Themes gespeichert.</div>}
                    {savedThemes.map((t) => (
                      <button
                        key={t.name}
                        style={{ ...pill(t.name), justifyContent: 'flex-start', width: '100%' }}
                        onClick={() => {
                          setThemeName(t.name)
                          setBg(t.bg)
                          setAccent(t.accent)
                          setThemePreset('Custom')
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {themePreset === 'Custom' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div>
                    <label>Background</label>
                    <input value={bg} onChange={(e) => setBg(e.target.value)} style={input()} />
                  </div>
                  <div>
                    <label>Akzentfarbe</label>
                    <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
              )}
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Slotmachine (Beamer)</div>
                <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
                  <label>
                    Spin (ms)
                    <input type="number" value={slotSpinMs} onChange={(e) => setSlotSpinMs(Number(e.target.value) || 0)} style={input()} />
                  </label>
                  <label>
                    Hold (ms)
                    <input type="number" value={slotHoldMs} onChange={(e) => setSlotHoldMs(Number(e.target.value) || 0)} style={input()} />
                  </label>
                  <label>
                    Intervall (ms)
                    <input type="number" value={slotIntervalMs} onChange={(e) => setSlotIntervalMs(Number(e.target.value) || 0)} style={input()} />
                  </label>
                  <label>
                    Scale
                    <input type="range" min={0.7} max={1.3} step={0.05} value={slotScale} onChange={(e) => setSlotScale(Number(e.target.value))} style={{ width: '100%' }} />
                  </label>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
                <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, background: '#0d0f14' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview Beamer</div>
                  <div
                    style={{
                      background: bg,
                      borderRadius: 16,
                      padding: 16,
                      minHeight: 140,
                      border: `1px solid ${accent}55`,
                      boxShadow: `0 18px 40px ${accent}33`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: accent, fontWeight: 800, textTransform: 'uppercase' }}>Kategorie</div>
                    <div style={{ fontSize: 20, fontWeight: 800, margin: '6px 0', color: '#f8fafc' }}>Frage-Text</div>
                    <div style={{ height: 8, borderRadius: 999, background: '#111827', overflow: 'hidden' }}>
                      <div style={{ width: '60%', height: '100%', background: accent }} />
                    </div>
                  </div>
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, background: '#0d0f14' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview Team</div>
                  <div style={{ borderRadius: 12, padding: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>Frage</div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', margin: '4px 0 10px' }}>Antwort eingeben...</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <div style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 12 }}>Option A</div>
                      <div style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 12 }}>Option B</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Slides (Design)</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>Hier nur Layout/Design anpassen. Inhalte kommen aus den gewaehlt en Fragen.</div>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Canvas Preview</div>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      borderRadius: 14,
                      padding: 12,
                      background: bg,
                      border: `1px solid ${accent}55`,
                      boxShadow: `0 14px 36px ${accent}33`,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: `${layoutX}%`,
                        top: `${layoutY}%`,
                        transform: 'translate(-0%, -0%)',
                        color: '#f8fafc',
                        fontWeight: 800,
                        fontSize: layoutSize,
                        maxWidth: '80%',
                      }}
                    >
                      Frage-Text
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${answerX}%`,
                        top: `${answerY}%`,
                        transform: 'translate(-0%, -0%)',
                        color: '#a5f3fc',
                        fontWeight: 700,
                        fontSize: answerSize,
                        maxWidth: '80%',
                      }}
                    >
                      Antwort-Text
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: 'rgba(0,0,0,0.4)',
                        color: '#e2e8f0',
                        fontSize: 12,
                        border: `1px solid ${accent}55`,
                      }}
                    >
                      11s
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label>Frage X (%)<input type="range" min={0} max={80} value={layoutX} onChange={(e) => setLayoutX(Number(e.target.value))} style={{ width: '100%' }} /></label>
                  <label>Frage Y (%)<input type="range" min={0} max={80} value={layoutY} onChange={(e) => setLayoutY(Number(e.target.value))} style={{ width: '100%' }} /></label>
                  <label>Frage GrÃ¶ÃŸe<input type="range" min={14} max={48} value={layoutSize} onChange={(e) => setLayoutSize(Number(e.target.value))} style={{ width: '100%' }} /></label>
                  <label>Antwort X (%)<input type="range" min={0} max={80} value={answerX} onChange={(e) => setAnswerX(Number(e.target.value))} style={{ width: '100%' }} /></label>
                  <label>Antwort Y (%)<input type="range" min={0} max={80} value={answerY} onChange={(e) => setAnswerY(Number(e.target.value))} style={{ width: '100%' }} /></label>
                  <label>Antwort GrÃ¶ÃŸe<input type="range" min={14} max={48} value={answerSize} onChange={(e) => setAnswerSize(Number(e.target.value))} style={{ width: '100%' }} /></label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <button style={pill('Speichern')} onClick={() => alert('Speichern (Draft) folgt noch')}>Speichern</button>
                    <button
                      style={pill('Export JSON')}
                      onClick={() => {
                        const data = {
                          name,
                          rounds,
                          categories,
                          language,
                          mixedMechanic,
                          theme: { bg, accent, slotSpinMs, slotHoldMs, slotIntervalMs, slotScale },
                          layout: { layoutX, layoutY, layoutSize, answerX, answerY, answerSize },
                          selectedQuestionIds: selected,
                        }
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${name.replace(/\\s+/g, '-').toLowerCase() || 'quiz'}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: 10 }}>
                {selectedQuestions.map((q) => (
                  <div key={q.id} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{(q as any).text || (q as any).question}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{q.category}</div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>Layout: Cozy Beamer Card</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
