import { loadDraft } from '../services/quizzes'

export default function Preview() {
  const draft = loadDraft()

  if (!draft) {
    return (
      <div className="page">
        <h1>Preview</h1>
        <p className="muted">Kein Draft geladen. Bitte im Creator speichern oder JSON importieren.</p>
      </div>
    )
  }

  const total = draft.structure.categories.reduce((sum, c) => sum + c.questions, 0)
  const slides: string[] = []

  if (draft.structure.introAt === 'start') slides.push('Intro')
  if (draft.structure.rulesAt === 'start') slides.push('Regeln')

  draft.structure.categories.forEach((cat, index) => {
    slides.push(`Kategorie ${index + 1}: ${cat.name}`)
    for (let i = 1; i <= cat.questions; i += 1) {
      slides.push(`Frage ${i} (${cat.name})`)
    }
    slides.push(`Antworten (${cat.name})`)
  })

  if (draft.structure.introAt === 'before-final') slides.push('Intro (vor Final)')
  if (draft.structure.rulesAt === 'before-final') slides.push('Regeln (vor Final)')
  slides.push('Finale / Abschluss')

  return (
    <div className="page">
      <h1>Preview</h1>
      <p>Kurze Übersicht des aktuellen Drafts.</p>

      <div className="grid">
        <div className="card">
          <h3>Name</h3>
          <p className="muted">{draft.name}</p>
        </div>
        <div className="card">
          <h3>Kategorien</h3>
          <p className="muted">{draft.structure.categories.length}</p>
        </div>
        <div className="card">
          <h3>Fragen (Summe)</h3>
          <p className="muted">{total}</p>
        </div>
        <div className="card">
          <h3>Modus</h3>
          <p className="muted">{draft.structure.mode}</p>
        </div>
        <div className="card">
          <h3>Intro/Regeln</h3>
          <p className="muted">
            Intro: {draft.structure.introAt} – Regeln: {draft.structure.rulesAt}
          </p>
        </div>
        <div className="card">
          <h3>Theme</h3>
          <p className="muted">
            {draft.theme.font} / {draft.theme.animation}
          </p>
        </div>
      </div>

      <div className="section-title">Kategorien</div>
      <div className="stack">
        {draft.structure.categories.map((c, idx) => (
          <div key={idx} className="pill">
            {c.name}: {c.questions} Fragen
          </div>
        ))}
      </div>

      <div className="section-title">Slide-Plan</div>
      <div className="stack">
        {slides.map((label, idx) => (
          <div key={idx} className="step-chip">
            <span>{idx + 1}.</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
