// Update Spielegruppe-Quiz-Draft mit Audit-Fixes:
// 1. P3-ZvZ Singer-Real-Names: "Robyn Rajad Fenty" → "Robyn Fenty"
// 2. P2-Schätzchen Monopoly funFact: 3 → 2 Steuerfelder
// 3. P3-Mucho Aristoteles → Brüder Montgolfier

const BACKEND = 'https://backend.cozyquiz.app';

// 1. GET all drafts, find tonight's
const draftsRes = await fetch(`${BACKEND}/api/qq/drafts`);
const drafts = await draftsRes.json();
const tonight = drafts.find(d => d.title === 'Spielegruppe Quiz · 23.05.2026');
if (!tonight) {
  console.error('❌ Tonight-Draft nicht gefunden!');
  process.exit(1);
}
console.log(`✅ Draft gefunden: ${tonight.id}`);

// 2. Modify questions
tonight.questions = tonight.questions.map(q => {
  if (q.id === 'tonight-p3-q3') {
    // Singer real-names: Rajad → just "Robyn Fenty"
    return {
      ...q,
      options: ['Robyn Fenty', 'Ashley Nicolette Frangipane', 'Melissa Benoist'],
      optionsEn: ['Robyn Fenty', 'Ashley Nicolette Frangipane', 'Melissa Benoist'],
      funFact: 'Auflösung: Robyn Fenty = Rihanna (mit vollständigem Namen "Robyn Rihanna Fenty") · Ashley Nicolette Frangipane = Halsey · Melissa Benoist = US-Schauspielerin (Supergirl, Glee, Whiplash). Halseys Künstlername ist übrigens ein Anagramm ihres Vornamens "Ashley".',
    };
  }
  if (q.id === 'tonight-p2-q0') {
    // Monopoly funFact: 3 → 2 Steuerfelder
    return {
      ...q,
      funFact: 'Das klassische Monopoly hat 40 Felder: 22 Straßen, 4 Bahnhöfe, 2 Versorgungsbetriebe, 4 Eckfelder (Los/Gefängnis/Frei Parken/Gehen Sie ins Gefängnis), 2 Steuerfelder (Einkommensteuer + Zusatzsteuer), 3 Gemeinschaftskarten, 3 Ereigniskarten. Die Original-Straßen kommen aus Atlantic City (USA, 1935).',
    };
  }
  if (q.id === 'tonight-p3-q1') {
    // Replace Aristoteles → Brüder Montgolfier
    return {
      id: 'tonight-p3-q1',
      phaseIndex: 3,
      questionIndexInPhase: 1,
      category: 'MUCHO',
      text: 'Welches berühmte Brüder-Paar erfand 1783 den Heißluftballon?',
      textEn: 'Which famous pair of brothers invented the hot air balloon in 1783?',
      answer: 'Brüder Montgolfier',
      answerEn: 'The Montgolfier brothers',
      options: ['Brüder Montgolfier', 'Brüder Lumière', 'Brüder Wright', 'Brüder Lilienthal'],
      optionsEn: ['Montgolfier brothers', 'Lumière brothers', 'Wright brothers', 'Lilienthal brothers'],
      correctOptionIndex: 0,
      funFact: 'Joseph-Michel + Jacques-Étienne Montgolfier (Papierfabrikanten aus Annonay/Frankreich) ließen am 4. Juni 1783 den ersten unbemannten Heißluftballon steigen. Ursprünglich dachten sie, es sei "elektrischer Rauch", der den Sack hebt — sie verstanden nicht, dass es einfach erhitzte Luft war. Erste bemannte Fahrt: 21. November 1783 in Paris vor König Ludwig XVI. — mit einem Schaf, einer Ente und einem Hahn an Bord für den Testflug zuvor. Distraktoren: Brüder Lumière = Kino (1895), Brüder Wright = Motorflug (1903), Brüder Lilienthal = Gleitflug (1890er).',
    };
  }
  return q;
});

// 3. PUT back
const putRes = await fetch(`${BACKEND}/api/qq/drafts/${tonight.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(tonight),
});
console.log(`PUT HTTP ${putRes.status}`);
const txt = await putRes.text();
console.log(txt.slice(0, 300));
