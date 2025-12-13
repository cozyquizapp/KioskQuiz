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
  const [requireImage, setRequireImage] = useState(false)
  const [maxAgeDays, setMaxAgeDays] = useState(90)
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
    const now = Date.now()
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
    return questions.filter((q) => {
      const matchesText = q.text?.toLowerCase().includes(term) || q.category?.toLowerCase().includes(term)
      const ageOk =
        !q.lastUsedAt || Number.isNaN(Date.parse(q.lastUsedAt)) ? true : now - Date.parse(q.lastUsedAt) <= maxAgeMs
      const imageOk = requireImage ? Boolean(q.hasImage) : true
      return matchesText && ageOk && imageOk
    })
  }, [questions, filterText, requireImage, maxAgeDays])

  const staleCount = useMemo(() => {
    const now = Date.now()
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
    return questions.filter((q) => q.lastUsedAt && now - Date.parse(q.lastUsedAt) > maxAgeMs).length
  }, [questions, maxAgeDays])

  const missingImageCount = useMemo(
    () => questions.filter((q) => requireImage && !q.hasImage).length,
    [questions, requireImage],
  )

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
        <div className="field">
          <label>Frische (max. Alter in Tagen)</label>
          <input
            type="number"
            min={7}
            max={365}
            value={maxAgeDays}
            onChange={(e) => setMaxAgeDays(Number(e.target.value) || 90)}
          />
        </div>
        <div className="field">
          <label>Bildpflicht</label>
          <div className="row">
            <input type="checkbox" checked={requireImage} onChange={(e) => setRequireImage(e.target.checked)} />
            <span className="muted-small">Nur Fragen mit Bild anzeigen</span>
          </div>
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
        <div className="pill">Bilder/Audio vorhanden (falls benötigt) • {missingImageCount} ohne Bild</div>
        <div className="pill">Keine Duplikate im aktuellen Quiz</div>
        <div className="pill">Tags & Schwierigkeitsgrad gepflegt</div>
        <div className="pill">Frische Check • {staleCount} älter als {maxAgeDays} Tage</div>
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
