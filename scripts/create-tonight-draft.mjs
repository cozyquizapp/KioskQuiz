// One-shot: erstellt den Draft "Spielegruppe Quiz · 23.05.2026" via Backend-API.
// Run: node scripts/create-tonight-draft.mjs

const BACKEND = 'https://backend.cozyquiz.app';

const draft = {
  title: 'Spielegruppe Quiz · 23.05.2026',
  phases: 4,
  language: 'both',
  questions: [
    // === Phase 1 ===========================================================
    {
      id: 'tonight-p1-q0', phaseIndex: 1, questionIndexInPhase: 0, category: 'SCHAETZCHEN',
      text: 'Wie lange braucht ein Containerschiff von Hamburg nach Vancouver durchschnittlich?',
      textEn: 'How long does a container ship take from Hamburg to Vancouver on average?',
      answer: '~30 Tage', answerEn: '~30 days',
      targetValue: 30, unit: 'Tage', unitEn: 'days',
      funFact: 'Standard-Route via Panama-Kanal: 28-32 Tage. Über den Suez-Kanal + Pazifik dauerts ~45 Tage. Schnellste Express-Frachter schaffen Hamburg-Vancouver in 22 Tagen.',
    },
    {
      id: 'tonight-p1-q1', phaseIndex: 1, questionIndexInPhase: 1, category: 'MUCHO',
      text: 'Woher kommt der Name "Tattoo"?',
      textEn: 'Where does the word "Tattoo" come from?',
      answer: 'Polynesisch ("tatau")', answerEn: 'Polynesian ("tatau")',
      options: ['Polynesisch ("tatau")', 'Italienisch ("tato")', 'Englisch ("tatter")', 'Japanisch ("tatō")'],
      optionsEn: ['Polynesian ("tatau")', 'Italian ("tato")', 'English ("tatter")', 'Japanese ("tatō")'],
      correctOptionIndex: 0,
      funFact: 'Kapitän James Cook brachte das Wort 1769 von Tahiti mit nach Europa — "tatau" ist das Klopfgeräusch beim Stechen mit Knochen-Nadeln. Im Deutschen wurde es als "Tätowierung" eingedeutscht.',
    },
    {
      id: 'tonight-p1-q2', phaseIndex: 1, questionIndexInPhase: 2, category: 'BUNTE_TUETE',
      text: 'Wo liegt Mount Rushmore? Setz einen Pin auf der Karte!',
      textEn: 'Where is Mount Rushmore? Place a pin on the map!',
      answer: 'Black Hills, South Dakota, USA',
      answerEn: 'Black Hills, South Dakota, USA',
      bunteTuete: { kind: 'map', lat: 43.8791, lng: -103.4591, targetLabel: 'Mount Rushmore' },
      funFact: 'Geplant war ursprünglich ein "Garten der Helden" mit westlichen Pionieren. Aus Geld-Gründen wurde es auf 4 Präsidenten reduziert.',
    },
    {
      id: 'tonight-p1-q3', phaseIndex: 1, questionIndexInPhase: 3, category: 'ZEHN_VON_ZEHN',
      text: 'Welches Tier ist im NBC-Logo zu sehen?',
      textEn: 'Which animal appears in the NBC logo?',
      answer: 'Pfau', answerEn: 'Peacock',
      options: ['Adler', 'Pfau', 'Phönix'],
      optionsEn: ['Eagle', 'Peacock', 'Phoenix'],
      correctOptionIndex: 1,
      funFact: 'NBC führte den Pfau 1956 ein, um sein neues Farbfernseh-Programm zu bewerben. Heute 6 Federn (gelb, orange, rot, lila, blau, grün). Slogan: "NBC — Proud as a Peacock".',
    },
    {
      id: 'tonight-p1-q4', phaseIndex: 1, questionIndexInPhase: 4, category: 'CHEESE',
      text: 'Welche Pflanze ist auf dem Bild zu sehen?',
      textEn: 'Which plant is shown in the picture?',
      answer: 'Wasabi', answerEn: 'Wasabi',
      funFact: 'Echtes Wasabi (Wasabia japonica) wächst nur in bestimmten Bach-Schatten-Lagen Japans. Rund 95% des "Wasabi" weltweit ist eingefärbter Meerrettich + Senf — sogar in Japan! Das echte Rhizom kostet ~150 €/kg.',
    },

    // === Phase 2 ===========================================================
    {
      id: 'tonight-p2-q0', phaseIndex: 2, questionIndexInPhase: 0, category: 'SCHAETZCHEN',
      text: 'Wie viele Felder hat ein Monopoly-Brett?',
      textEn: 'How many fields does a Monopoly board have?',
      answer: '40', answerEn: '40',
      targetValue: 40, unit: 'Felder', unitEn: 'fields',
      funFact: 'Das klassische Monopoly hat 40 Felder: 22 Straßen, 4 Bahnhöfe, 2 Versorgungsbetriebe, 4 Eckfelder, 3 Steuerfelder, 3 Gemeinschaftskarten, 3 Ereigniskarten. Die Original-Straßen kommen aus Atlantic City (USA, 1935).',
    },
    {
      id: 'tonight-p2-q1', phaseIndex: 2, questionIndexInPhase: 1, category: 'MUCHO',
      text: 'Welches ist weltweit das meistverkaufte Belletristik-Genre?',
      textEn: 'Which is the worldwide best-selling fiction genre?',
      answer: 'Romance / Liebesroman', answerEn: 'Romance',
      options: ['Krimi & Thriller', 'Fantasy & Science-Fiction', 'Romance / Liebesroman', 'Historischer Roman'],
      optionsEn: ['Crime & Thriller', 'Fantasy & Sci-Fi', 'Romance', 'Historical Fiction'],
      correctOptionIndex: 2,
      funFact: 'Romance macht weltweit ~30-40% der Belletristik-Umsätze aus. Treiber: TikTok-"BookTok"-Community, Stars wie Colleen Hoover. "It Ends with Us" allein 4 Mio mal verkauft.',
    },
    {
      id: 'tonight-p2-q2', phaseIndex: 2, questionIndexInPhase: 2, category: 'BUNTE_TUETE',
      text: 'Nenne eines der 5 Länder mit den meisten Veganer:innen — prozentual zur Bevölkerung!',
      textEn: 'Name one of the top 5 countries with the highest share of vegans!',
      answer: 'Israel, Großbritannien, Schweden, Deutschland, Österreich',
      answerEn: 'Israel, United Kingdom, Sweden, Germany, Austria',
      bunteTuete: {
        kind: 'top5',
        answers: ['Israel', 'Großbritannien', 'Schweden', 'Deutschland', 'Österreich'],
        answersEn: ['Israel', 'United Kingdom', 'Sweden', 'Germany', 'Austria'],
      },
      funFact: 'Israel ist seit Jahren weltweit führend (~5% Veganer:innen) — Tel Aviv gilt als "vegane Hauptstadt der Welt". Deutschland hat den größten veganen Produktmarkt Europas.',
    },
    {
      id: 'tonight-p2-q3', phaseIndex: 2, questionIndexInPhase: 3, category: 'ZEHN_VON_ZEHN',
      text: 'Welcher dieser Disney-Trickfilme erschien zuerst?',
      textEn: 'Which of these Disney animated features came out first?',
      answer: 'Schneewittchen und die sieben Zwerge', answerEn: 'Snow White and the Seven Dwarfs',
      options: ['Pinocchio', 'Schneewittchen und die sieben Zwerge', 'Bambi'],
      optionsEn: ['Pinocchio', 'Snow White and the Seven Dwarfs', 'Bambi'],
      correctOptionIndex: 1,
      funFact: 'Schneewittchen (1937) war der allererste abendfüllende Disney-Trickfilm. Pinocchio folgte 1940, Bambi 1942. Schneewittchen wurde intern als "Disney\'s Folly" verspottet.',
    },
    {
      id: 'tonight-p2-q4', phaseIndex: 2, questionIndexInPhase: 4, category: 'CHEESE',
      text: 'Welches Instrument ist auf dem Bild zu sehen?',
      textEn: 'Which instrument is shown in the picture?',
      answer: 'Handpan', answerEn: 'Handpan',
      funFact: 'Erfunden im Jahr 2000 in Bern von PANArt als "Hang" — Berndeutsch für "Hand". Das UFO-förmige Stahlinstrument hat 8-9 gestimmte Töne und wird mit den Händen gespielt.',
    },

    // === Phase 3 ===========================================================
    {
      id: 'tonight-p3-q0', phaseIndex: 3, questionIndexInPhase: 0, category: 'SCHAETZCHEN',
      text: 'In welchem Jahr wurde die Band Bring Me The Horizon gegründet?',
      textEn: 'In what year was the band Bring Me The Horizon founded?',
      answer: '2004', answerEn: '2004',
      targetValue: 2004, unit: '', unitEn: '',
      funFact: 'Bring Me The Horizon gründete sich 2004 in Sheffield (UK) um Frontmann Oli Sykes — damals 17. Stilistisch wanderten sie von Deathcore über Metalcore zu Stadion-Rock bis zu Pop/Synth-Sound.',
    },
    {
      id: 'tonight-p3-q1', phaseIndex: 3, questionIndexInPhase: 1, category: 'MUCHO',
      text: 'Welcher Philosoph war der Lehrer von Alexander dem Großen?',
      textEn: 'Which philosopher was the teacher of Alexander the Great?',
      answer: 'Aristoteles', answerEn: 'Aristotle',
      options: ['Sokrates', 'Platon', 'Aristoteles', 'Heraklit'],
      optionsEn: ['Socrates', 'Plato', 'Aristotle', 'Heraclitus'],
      correctOptionIndex: 2,
      funFact: 'Philipp II von Makedonien holte Aristoteles 343 v.Chr. an seinen Hof, um den 13-jährigen Alexander zu unterrichten. Lehrer-Reihe: Sokrates → Platon → Aristoteles → Alexander.',
    },
    {
      id: 'tonight-p3-q2', phaseIndex: 3, questionIndexInPhase: 2, category: 'BUNTE_TUETE',
      text: 'Nenne ein Land, dessen Nationalflagge ohne die Farbe Rot auskommt!',
      textEn: 'Name a country whose national flag contains no red!',
      answer: 'Argentinien, Brasilien, Irland, Indien, Niger, Côte d\'Ivoire, Schweden, Finnland, Griechenland, Ukraine, Israel, Saudi-Arabien, Bhutan, Pakistan, Estland, Botswana, Bahamas, Kasachstan',
      answerEn: 'Argentina, Brazil, Ireland, India, Niger, Côte d\'Ivoire, Sweden, Finland, Greece, Ukraine, Israel, Saudi Arabia, Bhutan, Pakistan, Estonia, Botswana, Bahamas, Kazakhstan',
      bunteTuete: { kind: 'hotPotato' },
      funFact: 'Rund 75% aller Nationalflaggen enthalten Rot. Orange zählt NICHT als Rot. Häufige Trugschlüsse: Italien, Mexiko, Niederlande, Belgien, Schweiz — alle haben Rot.',
    },
    {
      id: 'tonight-p3-q3', phaseIndex: 3, questionIndexInPhase: 3, category: 'ZEHN_VON_ZEHN',
      text: 'Eine dieser Personen ist KEINE bekannte Sängerin — welche?',
      textEn: 'One of these people is NOT a famous singer — which one?',
      answer: 'Melissa Benoist', answerEn: 'Melissa Benoist',
      options: ['Robyn Rajad Fenty', 'Ashley Nicolette Frangipane', 'Melissa Benoist'],
      optionsEn: ['Robyn Rajad Fenty', 'Ashley Nicolette Frangipane', 'Melissa Benoist'],
      correctOptionIndex: 2,
      funFact: 'Auflösung: Robyn Rajad Fenty = Rihanna · Ashley Nicolette Frangipane = Halsey · Melissa Benoist = US-Schauspielerin (Supergirl, Glee, Whiplash). Halseys Künstlername ist ein Anagramm ihres Vornamens "Ashley".',
    },
    {
      id: 'tonight-p3-q4', phaseIndex: 3, questionIndexInPhase: 4, category: 'CHEESE',
      text: 'In welcher Sportart hat diese Olympiasiegerin Gold gewonnen?',
      textEn: 'In which sport did this Olympic champion win gold?',
      answer: 'Eiskunstlauf', answerEn: 'Figure Skating',
      funFact: 'Alysa Liu (USA, *2005) holte bei den Olympischen Winterspielen 2026 in Mailand-Cortina Gold im Eiskunstlauf. Mit 13 wurde sie 2019 jüngste US-Meisterin der Geschichte.',
    },

    // === Phase 4 ===========================================================
    {
      id: 'tonight-p4-q0', phaseIndex: 4, questionIndexInPhase: 0, category: 'SCHAETZCHEN',
      text: 'Wie viele der ca. 6.000 Inseln Griechenlands sind tatsächlich bewohnt?',
      textEn: 'Of the roughly 6,000 islands in Greece, how many are actually inhabited?',
      answer: '~227', answerEn: '~227',
      targetValue: 227, unit: 'Inseln', unitEn: 'islands',
      funFact: 'Griechenland hat etwa 6.000 Inseln und Inselchen — aber nur rund 227 sind tatsächlich bewohnt. Davon haben nur ca. 130 mehr als 100 Einwohner:innen. Größte: Kreta (~620.000), Euböa (~190.000).',
    },
    {
      id: 'tonight-p4-q1', phaseIndex: 4, questionIndexInPhase: 1, category: 'MUCHO',
      text: 'Welche Sportart ist nach Fußball die zweitgrößte der Welt (gemessen an Fans)?',
      textEn: 'Which sport ranks second in the world by global fanbase (after football)?',
      answer: 'Cricket', answerEn: 'Cricket',
      options: ['Cricket', 'Basketball', 'Hockey', 'Tennis'],
      optionsEn: ['Cricket', 'Basketball', 'Field Hockey', 'Tennis'],
      correctOptionIndex: 0,
      funFact: 'Cricket hat weltweit ~2,5 Milliarden Fans — getragen vor allem von Indien (1+ Mrd!), Pakistan, Bangladesch, UK, Australien. Fußball führt mit ~3,5 Mrd. Hockey liegt auf Platz 3.',
    },
    {
      id: 'tonight-p4-q2', phaseIndex: 4, questionIndexInPhase: 2, category: 'BUNTE_TUETE',
      text: 'Welches Tier war das erste Säugetier im Weltall (über der Kármán-Linie, 100 km)?',
      textEn: 'Which animal was the first mammal in space (above the Kármán line, 100 km)?',
      answer: 'Albert II (Rhesusaffe)', answerEn: 'Albert II (Rhesus monkey)',
      bunteTuete: {
        kind: 'bluff',
        realAnswer: 'Albert II (Rhesusaffe)',
        realAnswerEn: 'Albert II (Rhesus monkey)',
      },
      funFact: 'Am 14. Juni 1949 erreichte der Rhesusaffe Albert II in einer US-V-2-Rakete eine Höhe von ~134 km. Häufige Falle: Laika kam erst 1957 in die Erdumlaufbahn. Die ersten Tiere überhaupt im All (1947) waren Fruchtfliegen.',
    },
    {
      id: 'tonight-p4-q3', phaseIndex: 4, questionIndexInPhase: 3, category: 'ZEHN_VON_ZEHN',
      text: 'Welches dieser EU-Länder hat den Euro als offizielle Währung eingeführt?',
      textEn: 'Which of these EU countries has officially adopted the Euro?',
      answer: 'Kroatien', answerEn: 'Croatia',
      options: ['Kroatien', 'Bulgarien', 'Rumänien'],
      optionsEn: ['Croatia', 'Bulgaria', 'Romania'],
      correctOptionIndex: 0,
      funFact: 'Kroatien hat am 1. Januar 2023 den Euro eingeführt — als 20. Mitglied der Eurozone. Bulgarien und Rumänien haben den Euro-Beitritt geplant, aber noch nicht vollzogen.',
    },
    {
      id: 'tonight-p4-q4', phaseIndex: 4, questionIndexInPhase: 4, category: 'CHEESE',
      text: 'Welches Bauwerk ist auf dem Bild zu sehen?',
      textEn: 'Which structure is shown in the picture?',
      answer: 'Atomium', answerEn: 'Atomium',
      funFact: 'Gebaut für die Weltausstellung 1958 in Brüssel — eine Eisen-Kristallstruktur, 165 Milliarden Mal vergrößert. 102 m hoch, 2.400 Tonnen Stahl, 9 begehbare Kugeln verbunden durch Rolltreppen-Röhren.',
    },
  ],
};

const res = await fetch(`${BACKEND}/api/qq/drafts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(draft),
});
const txt = await res.text();
console.log(`HTTP ${res.status}`);
console.log(txt.slice(0, 500));
