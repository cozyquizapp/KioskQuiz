import { useEffect, useState } from 'react'
import { loadDraft, saveDraft } from '../services/quizzes'
import type { ThemeSettings } from '../types/quiz'

const slideTypes = [
  'Intro',
  'Regeln',
  'Kategorie-Bumper',
  'Frage',
  'Antwort',
  'Wildcard',
  'Final',
]

export default function PresentationDetail() {
  const draft = loadDraft()
  const [theme, setTheme] = useState<ThemeSettings>(
    draft?.theme ?? { font: 'Aktuell', color: '#5f4cf5', animation: 'Slide' },
  )
  const [background, setBackground] = useState(draft?.theme.background ?? '')
  const [logo, setLogo] = useState(draft?.theme.logoUrl ?? '')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const next = { ...theme, background, logoUrl: logo }
    const saved = saveDraft({
      structure: draft?.structure ?? {
        rounds: 4,
        categories: [],
        introAt: 'start',
        rulesAt: 'start',
        mode: 'standard',
      },
      filters: draft?.filters ?? [],
      theme: next,
      name: draft?.name ?? 'Neues Quiz',
      description: draft?.description,
    })
    setStatus(`Gespeichert: ${new Date(saved.updatedAt).toLocaleTimeString()}`)
  }, [theme, background, logo])

  return (
    <div className="page">
      <h1>Präsentations-Thema</h1>
      <p>Farben, Hintergründe, Logos und Animationen für die Slides festlegen.</p>
      {status && <div className="pill">{status}</div>}

      <div className="form-grid">
        <div className="field">
          <label>Primärfarbe</label>
          <input type="color" value={theme.color} onChange={(e) => setTheme({ ...theme, color: e.target.value })} />
        </div>
        <div className="field">
          <label>Font</label>
          <input value={theme.font} onChange={(e) => setTheme({ ...theme, font: e.target.value })} />
        </div>
        <div className="field">
          <label>Animation</label>
          <select value={theme.animation} onChange={(e) => setTheme({ ...theme, animation: e.target.value })}>
            <option value="Slide">Slide</option>
            <option value="Fade">Fade</option>
            <option value="Pop">Pop</option>
          </select>
        </div>
        <div className="field">
          <label>Hintergrund (Bild/Video URL)</label>
          <input value={background} onChange={(e) => setBackground(e.target.value)} placeholder="https://..." />
        </div>
        <div className="field">
          <label>Logo URL</label>
          <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="section-title">Slide-Typen</div>
      <div className="grid">
        {slideTypes.map((type) => (
          <div className="card" key={type}>
            <h3>{type}</h3>
            <p className="muted">Thema wird für diesen Slide-Typ angewendet.</p>
          </div>
        ))}
      </div>
    </div>
  )
}
