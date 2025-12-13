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
    </div>
  )
}
