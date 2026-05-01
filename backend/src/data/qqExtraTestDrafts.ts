// QQ Test-Drafts (User-Wunsch 2026-05-01): Harry Potter + Hamburg.
// Im QQ-Format als Pendant zu createSampleQQDrafts. Werden in server.ts
// nach dem Sample-Loader appended. CHEESE-Fragen brauchen evtl. Bilder via
// questionImages.json - Format folgt qq-vol-1 Konvention.
//
// Imposter/oneOfEight bewusst weggelassen (User: "ist noch imposter drin").

interface QQTestDraft {
  id: string;
  title: string;
  phases: 3 | 4;
  language: string;
  questions: any[];
  createdAt: number;
  updatedAt: number;
}

function q(id: string, phase: number, qi: number, cat: string, data: Record<string, any>) {
  return { id, category: cat, phaseIndex: phase, questionIndexInPhase: qi, text: '', answer: '', ...data };
}

const now = Date.now();

// ─── HARRY POTTER ──────────────────────────────────────────────────────
const hp = 'qq-test-harry-potter';
const hpQs = [
  // Phase 1: Charaktere & Häuser
  q(`${hp}-p1-0`, 1, 0, 'SCHAETZCHEN', {
    text: 'Wie viele Sickel ergeben einen Galleone?',
    textEn: 'How many Sickles make one Galleon?',
    answer: '17', targetValue: 17, unit: 'Sickel',
    funFact: '17 Sickel = 1 Galleone, 29 Knuten = 1 Sickel. Britische Zaubererwährung folgt keinem Dezimalsystem.'
  }),
  q(`${hp}-p1-1`, 1, 1, 'MUCHO', {
    text: 'Welcher Hauself dient der Familie Malfoy?',
    textEn: 'Which house-elf serves the Malfoy family?',
    answer: 'Dobby',
    options: ['Dobby', 'Kreacher', 'Winky', 'Hokey'],
    optionsEn: ['Dobby', 'Kreacher', 'Winky', 'Hokey'],
    correctOptionIndex: 0,
    funFact: 'Dobby wurde am Ende von Buch 2 von Harry befreit als er Lucius Malfoy ein Socken-Buch übergab.'
  }),
  q(`${hp}-p1-2`, 1, 2, 'BUNTE_TUETE', {
    text: 'Nenne einen Hogwarts-Lehrer — reihum!',
    textEn: 'Name a Hogwarts teacher — one by one!',
    answer: 'McGonagall, Snape, Dumbledore, Flitwick, Sprout, Hagrid, Trelawney, Lupin, Moody, Umbridge, Slughorn, Hooch, Pince, Pomfrey, Binns, Vector, Sinistra, Burbage, Quirrell, Lockhart, Filch',
    bunteTuete: { kind: 'hotPotato' }
  }),
  q(`${hp}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', {
    text: 'In welchem Hogwarts-Haus lebt Cedric Diggory?',
    textEn: 'In which Hogwarts house does Cedric Diggory belong?',
    answer: 'Hufflepuff',
    options: ['Gryffindor', 'Hufflepuff', 'Ravenclaw'],
    optionsEn: ['Gryffindor', 'Hufflepuff', 'Ravenclaw'],
    correctOptionIndex: 1,
    funFact: 'Cedric ist Hogwarts-Champion im Trimagischen Turnier (Buch 4) und einer der bekanntesten Hufflepuffs.'
  }),
  q(`${hp}-p1-4`, 1, 4, 'CHEESE', {
    text: 'Welches Hogwarts-Haus zeigt dieses Wappen?',
    textEn: 'Which Hogwarts house does this crest belong to?',
    answer: 'Gryffindor', answerEn: 'Gryffindor'
  }),
  // Phase 2: Magie & Sprüche
  q(`${hp}-p2-0`, 2, 0, 'SCHAETZCHEN', {
    text: 'Wie viele Treppen hat das Schloss Hogwarts laut den Büchern?',
    textEn: 'How many staircases does Hogwarts Castle have, according to the books?',
    answer: '142', targetValue: 142, unit: 'Treppen',
    funFact: 'Die Treppen verändern sich angeblich zufällig — eines der Markenzeichen des Schlosses.'
  }),
  q(`${hp}-p2-1`, 2, 1, 'MUCHO', {
    text: 'Welcher Spruch lässt Gegenstände schweben?',
    textEn: 'Which spell makes objects levitate?',
    answer: 'Wingardium Leviosa',
    options: ['Wingardium Leviosa', 'Lumos Maxima', 'Alohomora', 'Expelliarmus'],
    optionsEn: ['Wingardium Leviosa', 'Lumos Maxima', 'Alohomora', 'Expelliarmus'],
    correctOptionIndex: 0,
    funFact: 'Hermine korrigiert Ron in Buch 1: „Es heißt Levi-OH-sa, nicht Levio-SAH!"'
  }),
  q(`${hp}-p2-2`, 2, 2, 'BUNTE_TUETE', {
    text: 'Sortiere die Bücher nach Erscheinungsjahr (ältestes zuerst).',
    textEn: 'Sort the books by publication year (oldest first).',
    answer: 'Stein der Weisen, Kammer des Schreckens, Gefangene von Askaban, Feuerkelch',
    bunteTuete: {
      kind: 'order',
      items: ['Kammer des Schreckens', 'Stein der Weisen', 'Feuerkelch', 'Gefangene von Askaban'],
      correctOrder: [1, 0, 3, 2],
      criteria: 'ältestes zuerst',
      itemValues: ['1998', '1997', '2000', '1999']
    },
    funFact: 'Stein der Weisen erschien 1997 und hieß im UK ursprünglich „Philosopher\'s Stone".'
  }),
  q(`${hp}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', {
    text: 'Welcher Patronus passt zu Hermine Granger?',
    textEn: 'Which Patronus belongs to Hermione Granger?',
    answer: 'Otter',
    options: ['Otter', 'Hirsch', 'Schwan'],
    optionsEn: ['Otter', 'Stag', 'Swan'],
    correctOptionIndex: 0,
    funFact: 'J.K. Rowling wählte den Otter weil sie ihn ihr Lieblingstier nannte.'
  }),
  q(`${hp}-p2-4`, 2, 4, 'CHEESE', {
    text: 'Welcher magische Gegenstand ist hier zu sehen?',
    textEn: 'Which magical object is shown?',
    answer: 'Sprechender Hut', answerEn: 'Sorting Hat'
  }),
  // Phase 3: Voldemort & Horkruxe
  q(`${hp}-p3-0`, 3, 0, 'SCHAETZCHEN', {
    text: 'Wie viele Horkruxe erschuf Voldemort insgesamt (inklusive zufälligem)?',
    textEn: 'How many Horcruxes did Voldemort create in total (including the accidental one)?',
    answer: '7', targetValue: 7, unit: 'Horkruxe',
    funFact: 'Sechs absichtlich + Harry als unbeabsichtigter siebter. Voldemort wollte die mystische 7.'
  }),
  q(`${hp}-p3-1`, 3, 1, 'MUCHO', {
    text: 'Wie lautet Voldemorts Geburtsname?',
    textEn: 'What is Voldemort\'s birth name?',
    answer: 'Tom Marvolo Riddle',
    options: ['Tom Marvolo Riddle', 'Salazar Slytherin', 'Marvolo Gaunt', 'Tom Erebus Riddle'],
    optionsEn: ['Tom Marvolo Riddle', 'Salazar Slytherin', 'Marvolo Gaunt', 'Tom Erebus Riddle'],
    correctOptionIndex: 0,
    funFact: 'Anagramm von „I am Lord Voldemort" — ein Sprachspiel das nur in Englisch funktioniert.'
  }),
  q(`${hp}-p3-2`, 3, 2, 'BUNTE_TUETE', {
    text: 'Wie hieß das Tagebuch von Tom Riddle, das als Horkrux genutzt wurde?',
    textEn: 'What was the title on Tom Riddle\'s diary horcrux?',
    answer: 'T. M. Riddle', answerEn: 'T. M. Riddle',
    bunteTuete: { kind: 'bluff', realAnswer: 'T. M. Riddle', realAnswerEn: 'T. M. Riddle' },
    funFact: 'Im Buch steht der Name Tom Marvolo Riddle eingraviert — als Hinweis auf seine wahre Identität.'
  }),
  q(`${hp}-p3-3`, 3, 3, 'ZEHN_VON_ZEHN', {
    text: 'Wie heißt Voldemorts Schlange?',
    textEn: 'What is the name of Voldemort\'s snake?',
    answer: 'Nagini',
    options: ['Nagini', 'Basilisk', 'Slytherin'],
    optionsEn: ['Nagini', 'Basilisk', 'Slytherin'],
    correctOptionIndex: 0,
    funFact: 'Nagini war ursprünglich eine Maledictus — eine Frau, die zu einer Schlange verwandelt wurde.'
  }),
  q(`${hp}-p3-4`, 3, 4, 'CHEESE', {
    text: 'Welche ikonische Szene ist hier zu sehen?',
    textEn: 'Which iconic scene is shown?',
    answer: 'Bahnhof Gleis 9 3/4', answerEn: 'Platform 9 3/4'
  }),
];

// ─── HAMBURG ───────────────────────────────────────────────────────────
const hh = 'qq-test-hamburg';
const hhQs = [
  // Phase 1: Stadtteile & Wahrzeichen
  q(`${hh}-p1-0`, 1, 0, 'SCHAETZCHEN', {
    text: 'Wie viele Brücken hat Hamburg insgesamt? (mehr als Venedig + Amsterdam zusammen)',
    textEn: 'How many bridges does Hamburg have? (more than Venice + Amsterdam combined)',
    answer: '2500', targetValue: 2500, unit: 'Brücken',
    funFact: 'Hamburg hat ca. 2.500 Brücken — mehr als Venedig (~400), Amsterdam (~1.500) und London (~30) zusammen.'
  }),
  q(`${hh}-p1-1`, 1, 1, 'MUCHO', {
    text: 'Welcher Stadtteil ist Hamburgs ältester?',
    textEn: 'Which is Hamburg\'s oldest district?',
    answer: 'Altstadt',
    options: ['Altstadt', 'St. Pauli', 'Eimsbüttel', 'Wandsbek'],
    optionsEn: ['Altstadt', 'St. Pauli', 'Eimsbüttel', 'Wandsbek'],
    correctOptionIndex: 0,
    funFact: 'Die Hamburger Altstadt geht zurück auf die Hammaburg, eine Burg aus dem 9. Jahrhundert.'
  }),
  q(`${hh}-p1-2`, 1, 2, 'BUNTE_TUETE', {
    text: 'Nenne einen Hamburger Stadtteil — reihum!',
    textEn: 'Name a Hamburg district — one by one!',
    answer: 'Altona, Eimsbüttel, St. Pauli, Sternschanze, Eppendorf, Winterhude, Wandsbek, Bergedorf, Harburg, HafenCity, Speicherstadt, Rotherbaum, Blankenese, Othmarschen, Ottensen, Barmbek, Uhlenhorst, Hammerbrook, Veddel, Wilhelmsburg, Rissen, Nienstedten, Lurup, Stellingen, Niendorf',
    bunteTuete: { kind: 'hotPotato' }
  }),
  q(`${hh}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', {
    text: 'Welcher Hamburger Klub spielt im Volksparkstadion?',
    textEn: 'Which Hamburg club plays at Volksparkstadion?',
    answer: 'Hamburger SV',
    options: ['Hamburger SV', 'FC St. Pauli', 'Holstein Kiel'],
    optionsEn: ['Hamburger SV', 'FC St. Pauli', 'Holstein Kiel'],
    correctOptionIndex: 0,
    funFact: 'St. Pauli spielt im Millerntor-Stadion auf St. Pauli, der HSV im Volksparkstadion in Bahrenfeld.'
  }),
  q(`${hh}-p1-4`, 1, 4, 'CHEESE', {
    text: 'Welches Hamburger Wahrzeichen ist hier zu sehen?',
    textEn: 'Which Hamburg landmark is shown?',
    answer: 'Elbphilharmonie', answerEn: 'Elbphilharmonie'
  }),
  // Phase 2: Hafen & Norden
  q(`${hh}-p2-0`, 2, 0, 'SCHAETZCHEN', {
    text: 'Wie hoch ist die Elbphilharmonie?',
    textEn: 'How tall is the Elbphilharmonie?',
    answer: '110', targetValue: 110, unit: 'Meter',
    funFact: 'Die Elphi ist 110 m hoch — höher als der bisherige Maßstab Michel (132 m mit Turm) zumindest auf Glas-Ebene knapp drunter.'
  }),
  q(`${hh}-p2-1`, 2, 1, 'MUCHO', {
    text: 'Welcher Fluss mündet bei Hamburg in die Elbe?',
    textEn: 'Which river flows into the Elbe near Hamburg?',
    answer: 'Alster',
    options: ['Alster', 'Bille', 'Süderelbe', 'Krückau'],
    optionsEn: ['Alster', 'Bille', 'Süderelbe', 'Krückau'],
    correctOptionIndex: 0,
    funFact: 'Die Alster wird in der Innenstadt zur Außen- und Binnenalster aufgestaut — Wahrzeichen.'
  }),
  q(`${hh}-p2-2`, 2, 2, 'BUNTE_TUETE', {
    text: 'Sortiere die Hamburger Stadtteile nach Einwohnerzahl (größter zuerst).',
    textEn: 'Sort the Hamburg districts by population (largest first).',
    answer: 'Rahlstedt, Billstedt, Eimsbüttel, St. Pauli',
    bunteTuete: {
      kind: 'order',
      items: ['Eimsbüttel', 'Rahlstedt', 'St. Pauli', 'Billstedt'],
      correctOrder: [1, 3, 0, 2],
      criteria: 'meiste Einwohner zuerst',
      itemValues: ['~57.000', '~94.000', '~22.000', '~70.000']
    },
    funFact: 'Rahlstedt ist mit ~94.000 Einwohnern der bevölkerungsreichste Stadtteil — größer als manche deutsche Mittelstadt.'
  }),
  q(`${hh}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', {
    text: 'Welches Hamburger Original ist KEIN Fischbrötchen?',
    textEn: 'Which Hamburg classic is NOT a fish sandwich?',
    answer: 'Pannfisch',
    options: ['Pannfisch', 'Bismarck-Brötchen', 'Matjes-Brötchen'],
    optionsEn: ['Pannfisch', 'Bismarck sandwich', 'Matjes sandwich'],
    correctOptionIndex: 0,
    funFact: 'Pannfisch ist gebratener Fisch mit Senfsoße — kein Brötchen, sondern ein Pfannengericht.'
  }),
  q(`${hh}-p2-4`, 2, 4, 'CHEESE', {
    text: 'Welcher Hamburger Bahnhof ist hier zu sehen?',
    textEn: 'Which Hamburg station is shown?',
    answer: 'Hauptbahnhof', answerEn: 'Main Station'
  }),
  // Phase 3: Kultur & Geschichte
  q(`${hh}-p3-0`, 3, 0, 'SCHAETZCHEN', {
    text: 'Wie viele Konsulate hat Hamburg? (mehr als jede andere Stadt der Welt)',
    textEn: 'How many consulates does Hamburg have? (more than any other city)',
    answer: '105', targetValue: 105, unit: 'Konsulate',
    funFact: 'Hamburg hat über 100 Konsulate — mehr als New York. Erbe der Hansezeit als Welthandelsstadt.'
  }),
  q(`${hh}-p3-1`, 3, 1, 'MUCHO', {
    text: 'In welchem Jahr brannte der „Große Brand" von Hamburg?',
    textEn: 'In which year did Hamburg\'s „Great Fire" rage?',
    answer: '1842',
    options: ['1842', '1813', '1892', '1755'],
    optionsEn: ['1842', '1813', '1892', '1755'],
    correctOptionIndex: 0,
    funFact: 'Der Große Brand zerstörte 1842 ein Viertel der Innenstadt — danach wurden weite Teile neu im Klassizismus gebaut.'
  }),
  q(`${hh}-p3-2`, 3, 2, 'BUNTE_TUETE', {
    text: 'Wer war Hamburgs erster Bürgermeister nach 1945?',
    textEn: 'Who was Hamburg\'s first mayor after 1945?',
    answer: 'Rudolf Petersen', answerEn: 'Rudolf Petersen',
    bunteTuete: { kind: 'bluff', realAnswer: 'Rudolf Petersen', realAnswerEn: 'Rudolf Petersen' },
    funFact: 'Petersen wurde 1945 von der britischen Besatzung eingesetzt und war bis 1946 Erster Bürgermeister.'
  }),
  q(`${hh}-p3-3`, 3, 3, 'ZEHN_VON_ZEHN', {
    text: 'Welche Band kommt aus Hamburg?',
    textEn: 'Which band is from Hamburg?',
    answer: 'Tocotronic',
    options: ['Tocotronic', 'Wir sind Helden', 'Silbermond'],
    optionsEn: ['Tocotronic', 'Wir sind Helden', 'Silbermond'],
    correctOptionIndex: 0,
    funFact: 'Tocotronic gilt als Speerspitze der „Hamburger Schule" — Indie-Pop mit deutschsprachigen Texten.'
  }),
  q(`${hh}-p3-4`, 3, 4, 'CHEESE', {
    text: 'Welcher Hamburger Stadtteil ist hier zu sehen?',
    textEn: 'Which Hamburg district is shown?',
    answer: 'Speicherstadt', answerEn: 'Speicherstadt'
  }),
];

export const QQ_EXTRA_TEST_DRAFTS: QQTestDraft[] = [
  {
    id: hp,
    title: '🪄 Harry Potter (Test)',
    phases: 3,
    language: 'both',
    questions: hpQs,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: hh,
    title: '🐟 Hamburg (Test)',
    phases: 3,
    language: 'both',
    questions: hhQs,
    createdAt: now,
    updatedAt: now,
  },
];
