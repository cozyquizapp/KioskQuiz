import { useEffect, useMemo, useState } from 'react'
import { fetchQuestionsApi, loadApiConfig, type QuestionSummary } from '../services/api'

const pipelines = [
  'Duplicate & Edit: sichere Varianten für unterschiedliche Kategorien',
  'Bild- und Medien-Check: Pflichtfelder erzwingen pro Mechanik',
  'Frische-Flag: markiere alte Fragen (z. B. >90 Tage) für Austausch',
  'Tagging: Kategorie, Schwierigkeit, Mechanik, Sprache',
]

export default function QuestionEditor() {
  const [questions, setQuestions] = useState<QuestionSummary[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const apiSet = Boolean(loadApiConfig()?.baseUrl)

  useEffect(() => {
    const load = async () => {
      const res = await fetchQuestionsApi()
      if (!res.ok) {
        setStatus('Fragen konnten nicht geladen werden. API-URL in Settings prüfen.')
        return
      }
      setQuestions(res.questions)
      setStatus(`Geladen: ${res.questions.length} Fragen`)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = filterText.toLowerCase()
    return questions.filter((q) => q.text?.toLowerCase().includes(term) || q.category?.toLowerCase().includes(term))
  }, [questions, filterText])

  return (
    <div className="page">
      <h1>Fragenbank</h1>
      <p>Suche, filtere und poliere Fragen, bevor sie in neue Quizze wandern.</p>
      {status && <div className="pill">{status}</div>}
      {!apiSet && <div className="pill">API-URL fehlt (Settings)</div>}

      <div className="section-title">Filter</div>
      <div className="form-grid">
        <div className="field">
          <label>Suche</label>
          <input placeholder="Text oder Kategorie" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        </div>
      </div>

      <div className="section-title">Workflow</div>
      <div className="grid">
        {pipelines.map((item) => (
          <div className="card" key={item}>
            <h3>{item}</h3>
            <p className="muted">Workflow-Schritt vorbereiten.</p>
          </div>
        ))}
      </div>

      <div className="section-title">Geplante Checks</div>
      <div className="stack">
        <div className="pill">MC/Mechanik gesetzt</div>
        <div className="pill">Bilder/Audio vorhanden (falls benötigt)</div>
        <div className="pill">Keine Duplikate im aktuellen Quiz</div>
        <div className="pill">Tags & Schwierigkeitsgrad gepflegt</div>
      </div>

      <div className="section-title">Fragen</div>
      <div className="stack">
        {filtered.slice(0, 100).map((q) => (
          <div key={q.id} className="card">
            <h3>{q.text}</h3>
            <p className="muted">
              {q.category} {q.hasImage ? '• Bild' : ''} {q.lastUsedAt ? `• zuletzt ${q.lastUsedAt}` : ''}
            </p>
          </div>
        ))}
        {filtered.length === 0 && <div className="muted">Keine Treffer.</div>}
      </div>
    </div>
  )
}
