import { useMemo, useState } from 'react'

type CategoryBlock = { name: string; questions: number }

type StructureState = {
  rounds: number
  categories: CategoryBlock[]
  introAt: 'start' | 'before-final' | 'off'
  rulesAt: 'start' | 'before-final' | 'off'
  mode: 'standard' | 'bingo' | 'mixed'
}

const defaultStructure: StructureState = {
  rounds: 4,
  categories: [
    { name: 'Bingo', questions: 5 },
    { name: 'Mixed Bag', questions: 5 },
    { name: 'Cheese', questions: 5 },
    { name: 'Wildcard', questions: 5 },
  ],
  introAt: 'start',
  rulesAt: 'start',
  mode: 'standard',
}

const quickFilters = ['Frisch (letzte 60 Tage)', 'Bildpflicht für Bild-Runden', 'Mechanik gesetzt', 'Keine Duplikate']

export default function Creator() {
  const [step, setStep] = useState(0)
  const [structure, setStructure] = useState<StructureState>(defaultStructure)
  const [questionFilters] = useState<string[]>(quickFilters)
  const [theme, setTheme] = useState({ font: 'Aktuell', color: '#5f4cf5', animation: 'Slide' })
  const totalQuestions = useMemo(
    () => structure.categories.reduce((sum, cat) => sum + cat.questions, 0),
    [structure.categories],
  )

  const steps = ['Struktur', 'Fragen', 'Präsentation', 'Publish']

  const updateCategory = (index: number, patch: Partial<CategoryBlock>) => {
    setStructure((prev) => {
      const next = [...prev.categories]
      next[index] = { ...next[index], ...patch }
      return { ...prev, categories: next }
    })
  }

  const addCategory = () => {
    setStructure((prev) => ({
      ...prev,
      categories: [...prev.categories, { name: `Kategorie ${prev.categories.length + 1}`, questions: 5 }],
    }))
  }

  const removeCategory = (index: number) => {
    setStructure((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="page">
      <h1>Quiz Creator</h1>
      <p>Geführter Flow in vier Phasen. Starte mit Struktur und arbeite dich vor.</p>

      <div className="stepper">
        {steps.map((label, i) => (
          <div key={label} className={`step-chip ${step === i ? 'active' : ''}`} onClick={() => setStep(i)}>
            <span>{i + 1}.</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="section-title">1) Struktur</div>
          <div className="form-grid">
            <div className="field">
              <label>Runden</label>
              <input
                type="number"
                min={1}
                value={structure.rounds}
                onChange={(e) => setStructure({ ...structure, rounds: Number(e.target.value) })}
              />
              <span className="muted-small">Steuert Übergänge und Bumper.</span>
            </div>
            <div className="field">
              <label>Modus</label>
              <select value={structure.mode} onChange={(e) => setStructure({ ...structure, mode: e.target.value as any })}>
                <option value="standard">Standard</option>
                <option value="bingo">Bingo</option>
                <option value="mixed">Mixed Bag</option>
              </select>
            </div>
            <div className="field">
              <label>Intro Slide</label>
              <select
                value={structure.introAt}
                onChange={(e) => setStructure({ ...structure, introAt: e.target.value as StructureState['introAt'] })}
              >
                <option value="start">Am Anfang</option>
                <option value="before-final">Vor Finalrunde</option>
                <option value="off">Keine</option>
              </select>
            </div>
            <div className="field">
              <label>Regeln Slide</label>
              <select
                value={structure.rulesAt}
                onChange={(e) => setStructure({ ...structure, rulesAt: e.target.value as StructureState['rulesAt'] })}
              >
                <option value="start">Am Anfang</option>
                <option value="before-final">Vor Finalrunde</option>
                <option value="off">Keine</option>
              </select>
            </div>
          </div>

          <div className="section-title">Kategorien & Fragen</div>
          <div className="stack">
            {structure.categories.map((cat, idx) => (
              <div key={idx} className="card">
                <div className="row">
                  <div className="field" style={{ flex: 1 }}>
                    <label>Name</label>
                    <input value={cat.name} onChange={(e) => updateCategory(idx, { name: e.target.value })} />
                  </div>
                  <div className="field" style={{ width: 120 }}>
                    <label>Fragen</label>
                    <input
                      type="number"
                      min={1}
                      value={cat.questions}
                      onChange={(e) => updateCategory(idx, { questions: Number(e.target.value) })}
                    />
                  </div>
                  <button className="btn" onClick={() => removeCategory(idx)}>
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
            <div className="actions">
              <button className="btn" onClick={addCategory}>
                + Kategorie
              </button>
              <div className="pill">Summe: {totalQuestions} Fragen</div>
            </div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="section-title">2) Fragen wählen</div>
          <p className="muted">Filter vorbereiten und fehlende Pflichtfelder blocken.</p>
          <div className="stack">
            {questionFilters.map((filter) => (
              <div key={filter} className="pill">
                {filter}
              </div>
            ))}
          </div>
          <div className="section-title">Inline-Checks</div>
          <div className="grid">
            <div className="card">
              <h3>Mechanik Pflicht</h3>
              <p className="muted">“Gemischte Tüte” ohne Mechanik blocken.</p>
            </div>
            <div className="card">
              <h3>Bild/Audio Pflicht</h3>
              <p className="muted">“Cheese” ohne Bild blocken.</p>
            </div>
            <div className="card">
              <h3>Frische</h3>
              <p className="muted">Markiere Fragen älter als 60/90 Tage.</p>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="section-title">3) Präsentation</div>
          <div className="form-grid">
            <div className="field">
              <label>Font</label>
              <input value={theme.font} onChange={(e) => setTheme({ ...theme, font: e.target.value })} />
            </div>
            <div className="field">
              <label>Primärfarbe</label>
              <input type="color" value={theme.color} onChange={(e) => setTheme({ ...theme, color: e.target.value })} />
            </div>
            <div className="field">
              <label>Animation</label>
              <select value={theme.animation} onChange={(e) => setTheme({ ...theme, animation: e.target.value })}>
                <option value="Slide">Slide</option>
                <option value="Fade">Fade</option>
                <option value="Pop">Pop</option>
              </select>
            </div>
          </div>
          <div className="section-title">Overlay</div>
          <div className="tags">
            <div className="tag">Logo oben rechts</div>
            <div className="tag">Timer</div>
            <div className="tag">Punkteanzeige</div>
            <div className="tag">Kategorie-Bumper</div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="section-title">4) Publish</div>
          <div className="grid">
            <div className="card">
              <h3>Speichern</h3>
              <p className="muted">Version taggen und im Moderator verfügbar machen.</p>
            </div>
            <div className="card">
              <h3>Export</h3>
              <p className="muted">PNG/PDF für Offline/Whiteboard.</p>
            </div>
            <div className="card">
              <h3>Routing-Check</h3>
              <p className="muted">Beamer/Team/Intro/Regeln verlinkt?</p>
            </div>
          </div>
          <div className="actions">
            <button className="btn primary">Quiz speichern</button>
            <button className="btn">PDF/PNG export</button>
          </div>
        </>
      )}

      <div className="actions" style={{ marginTop: 22 }}>
        <button className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Zurück
        </button>
        <button className="btn primary" disabled={step === steps.length - 1} onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
          Weiter
        </button>
        <div className="pill">Status: {steps[step]}</div>
      </div>
    </div>
  )
}
