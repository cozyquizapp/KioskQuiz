import { loadDraft } from '../services/quizzes'

const phases = [
  {
    title: 'Creator',
    items: [
      'Struktur festlegen (Runden, Kategorien, Fragenanzahl, Intro/Regeln-Position)',
      'Fragen filtern/auswählen, Pflichtfelder prüfen',
      'Präsentationsthema setzen (Farben, Schrift, Animation, BG, Logo)',
      'Draft speichern / exportieren / API-Sync',
    ],
  },
  {
    title: 'Moderator/Beamer',
    items: [
      'Draft laden (API oder Import-JSON)',
      'Slides generieren (Intro, Regeln, Kategorien, Fragen, Antworten, Finale)',
      'Live-Steuerung: Start, Timer, Reveal, Punkte',
      'Stats senden: pro Frage und Abschluss',
    ],
  },
  {
    title: 'Team',
    items: ['Join per Code/QR', 'Antworten senden', 'Feedback empfangen (richtig/falsch)'],
  },
]

export default function Planner() {
  const draft = loadDraft()
  const total = draft?.structure.categories.reduce((s, c) => s + c.questions, 0) ?? 0

  return (
    <div className="page">
      <h1>Flow-Plan</h1>
      <p>Wie Creator → Play-App zusammenspielen.</p>

      <div className="grid">
        {phases.map((phase) => (
          <div className="card" key={phase.title}>
            <h3>{phase.title}</h3>
            <ul className="muted">
              {phase.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {draft && (
        <>
          <div className="section-title">Aktueller Draft</div>
          <div className="stack">
            <div className="pill">Name: {draft.name}</div>
            <div className="pill">Kategorien: {draft.structure.categories.length}</div>
            <div className="pill">Fragen gesamt: {total}</div>
          </div>
        </>
      )}
    </div>
  )
}
