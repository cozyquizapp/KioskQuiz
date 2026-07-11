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
    text: 'Sortiert diese Harry-Potter-Bände chronologisch — ältester zuerst.',
    textEn: 'Put these Harry Potter books in chronological order — oldest first.',
    answer: 'Stein der Weisen, Kammer des Schreckens, Gefangene von Askaban, Feuerkelch', answerEn: 'Philosopher\'s Stone, Chamber of Secrets, Prisoner of Azkaban, Goblet of Fire',
    bunteTuete: { kind: 'order', items: ['Feuerkelch', 'Stein der Weisen', 'Gefangene von Askaban', 'Kammer des Schreckens'], itemsEn: ['Goblet of Fire', 'Philosopher\'s Stone', 'Prisoner of Azkaban', 'Chamber of Secrets'], correctOrder: [1, 3, 2, 0], criteria: 'chronologisch (ältester zuerst)', criteriaEn: 'chronological (oldest first)', itemValues: ['2000', '1997', '1999', '1998'] },
    funFact: 'Die Reihe erschien 1997–2007. Der erste Band wurde von zwölf Verlagen abgelehnt, bevor Bloomsbury zusagte.'
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
    text: 'Sortiert diese Hamburger Bauwerke nach Baujahr — ältestes zuerst.',
    textEn: 'Sort these Hamburg landmarks by year built — oldest first.',
    answer: 'Michel, Rathaus, Köhlbrandbrücke, Elbphilharmonie', answerEn: 'St. Michael\'s, City Hall, Köhlbrand Bridge, Elbphilharmonie',
    bunteTuete: { kind: 'order', items: ['Elbphilharmonie', 'Michel', 'Köhlbrandbrücke', 'Rathaus'], itemsEn: ['Elbphilharmonie', 'St. Michael\'s Church', 'Köhlbrand Bridge', 'City Hall'], correctOrder: [1, 3, 2, 0], criteria: 'nach Baujahr (ältestes zuerst)', criteriaEn: 'by year built (oldest first)', itemValues: ['2017', '1786', '1974', '1897'] },
    funFact: 'Zwischen dem Michel (vollendet 1786) und der Elbphilharmonie (2017) liegen über 230 Jahre Hamburger Baugeschichte.'
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

// ─── COZYARENA: NEUE BUNTE TÜTE (Top-Antworten + Schwarm-Schätzen) ──────
// Test-Draft für die zwei neuen Groß-Gruppen-Formate (2026-07-04). Je Phase
// 2× Top-Antworten (Family Feud) + 2× Schwarm-Schätzen + 1× MUCHO.
const ca = 'qq-test-cozy-arena-neu';
const caQs = [
  // ── Phase 1 ──────────────────────────────────────────────────────────
  q(`${ca}-p1-0`, 1, 0, 'BUNTE_TUETE', {
    text: 'Wie viele Gummibärchen sind in einem 200g-Beutel Haribo Goldbären?',
    textEn: 'How many gummy bears are in a 200g bag of Haribo Goldbears?',
    answer: '90',
    bunteTuete: { kind: 'crowdEstimate', targetValue: 90, unit: 'Gummibärchen', unitEn: 'gummy bears' },
    funFact: 'Ein 200g-Beutel enthält rund 90 Goldbären — je nach Sorten-Mix.'
  }),
  q(`${ca}-p1-1`, 1, 1, 'BUNTE_TUETE', {
    text: 'Nenne eine Pizza-Zutat.',
    textEn: 'Name a pizza topping.',
    answer: 'Salami, Käse, Champignon, Schinken, Ananas, Tomate, Zwiebel, Paprika',
    bunteTuete: { kind: 'crowdTop', answers: [
      { label: 'Salami', labelEn: 'Salami', aliases: ['peperoni-salami', 'salamie'] },
      { label: 'Käse', labelEn: 'Cheese', aliases: ['mozzarella', 'gouda', 'cheese'], aliasesEn: ['mozzarella'] },
      { label: 'Champignon', labelEn: 'Mushroom', aliases: ['pilz', 'pilze', 'champignons'], aliasesEn: ['mushrooms'] },
      { label: 'Schinken', labelEn: 'Ham', aliases: ['kochschinken'] },
      { label: 'Ananas', labelEn: 'Pineapple', aliases: [] },
      { label: 'Tomate', labelEn: 'Tomato', aliases: ['tomaten', 'tomatensauce', 'tomatensoße'] },
      { label: 'Zwiebel', labelEn: 'Onion', aliases: ['zwiebeln'] },
      { label: 'Paprika', labelEn: 'Bell pepper', aliases: [] },
    ] },
    funFact: 'Salami und Käse sind fast überall die Top-Nennungen — Ananas spaltet die Runde.'
  }),
  q(`${ca}-p1-2`, 1, 2, 'MUCHO', {
    text: 'Welche Farbe entsteht, wenn man Blau und Gelb mischt?',
    textEn: 'Which color do you get by mixing blue and yellow?',
    answer: 'Grün',
    options: ['Grün', 'Orange', 'Lila', 'Braun'],
    optionsEn: ['Green', 'Orange', 'Purple', 'Brown'],
    correctOptionIndex: 0,
    funFact: 'Blau + Gelb = Grün ist eine der ersten Farbmischungen, die Kinder lernen.'
  }),
  q(`${ca}-p1-3`, 1, 3, 'BUNTE_TUETE', {
    text: 'Wie viele Knochen hat ein erwachsener Mensch?',
    textEn: 'How many bones does an adult human have?',
    answer: '206',
    bunteTuete: { kind: 'crowdEstimate', targetValue: 206, unit: 'Knochen', unitEn: 'bones' },
    funFact: 'Ein Neugeborenes hat ~300 Knochen — viele verwachsen bis zum Erwachsenenalter zu 206.'
  }),
  q(`${ca}-p1-4`, 1, 4, 'BUNTE_TUETE', {
    text: 'Nenne ein Tier, das man im Zoo sieht.',
    textEn: 'Name an animal you see at the zoo.',
    answer: 'Löwe, Elefant, Giraffe, Affe, Pinguin, Zebra, Tiger, Bär',
    bunteTuete: { kind: 'crowdTop', answers: [
      { label: 'Löwe', labelEn: 'Lion', aliases: ['löwen'] },
      { label: 'Elefant', labelEn: 'Elephant', aliases: ['elefanten'] },
      { label: 'Giraffe', labelEn: 'Giraffe', aliases: ['giraffen'] },
      { label: 'Affe', labelEn: 'Monkey', aliases: ['affen', 'gorilla', 'schimpanse'], aliasesEn: ['ape', 'gorilla'] },
      { label: 'Pinguin', labelEn: 'Penguin', aliases: ['pinguine'] },
      { label: 'Zebra', labelEn: 'Zebra', aliases: ['zebras'] },
      { label: 'Tiger', labelEn: 'Tiger', aliases: [] },
      { label: 'Bär', labelEn: 'Bear', aliases: ['bären', 'eisbär'] },
    ] },
    funFact: 'Löwe und Elefant sind die Klassiker — Pinguine überraschen oft als Top-Nennung.'
  }),
  // ── Phase 2 ──────────────────────────────────────────────────────────
  q(`${ca}-p2-0`, 2, 0, 'BUNTE_TUETE', {
    text: 'Nenne eine Eissorte.',
    textEn: 'Name a flavor of ice cream.',
    answer: 'Vanille, Schokolade, Erdbeere, Zitrone, Stracciatella, Pistazie, Haselnuss, Mango',
    bunteTuete: { kind: 'crowdTop', answers: [
      { label: 'Vanille', labelEn: 'Vanilla', aliases: [] },
      { label: 'Schokolade', labelEn: 'Chocolate', aliases: ['schoko'] },
      { label: 'Erdbeere', labelEn: 'Strawberry', aliases: ['erdbeer'] },
      { label: 'Zitrone', labelEn: 'Lemon', aliases: ['zitroneneis'] },
      { label: 'Stracciatella', labelEn: 'Stracciatella', aliases: ['straciatella'] },
      { label: 'Pistazie', labelEn: 'Pistachio', aliases: ['pistazien'] },
      { label: 'Haselnuss', labelEn: 'Hazelnut', aliases: ['nuss'] },
      { label: 'Mango', labelEn: 'Mango', aliases: [] },
    ] },
    funFact: 'Vanille und Schokolade führen fast jede Umfrage an.'
  }),
  q(`${ca}-p2-1`, 2, 1, 'BUNTE_TUETE', {
    text: 'Wie viele Tasten hat ein Standard-Klavier?',
    textEn: 'How many keys does a standard piano have?',
    answer: '88',
    bunteTuete: { kind: 'crowdEstimate', targetValue: 88, unit: 'Tasten', unitEn: 'keys' },
    funFact: '88 Tasten: 52 weiße + 36 schwarze, über 7 Oktaven plus etwas.'
  }),
  q(`${ca}-p2-2`, 2, 2, 'MUCHO', {
    text: 'Welches Tier ist das schnellste an Land?',
    textEn: 'Which animal is the fastest on land?',
    answer: 'Gepard',
    options: ['Gepard', 'Löwe', 'Pferd', 'Antilope'],
    optionsEn: ['Cheetah', 'Lion', 'Horse', 'Antelope'],
    correctOptionIndex: 0,
    funFact: 'Ein Gepard erreicht kurzzeitig bis zu 110 km/h.'
  }),
  q(`${ca}-p2-3`, 2, 3, 'BUNTE_TUETE', {
    text: 'Wie viele Zähne hat ein Erwachsener (mit Weisheitszähnen)?',
    textEn: 'How many teeth does an adult have (including wisdom teeth)?',
    answer: '32',
    bunteTuete: { kind: 'crowdEstimate', targetValue: 32, unit: 'Zähne', unitEn: 'teeth' },
    funFact: '32 Zähne inklusive der vier Weisheitszähne — die fehlen aber vielen Menschen.'
  }),
  q(`${ca}-p2-4`, 2, 4, 'BUNTE_TUETE', {
    text: 'Nenne einen Brotaufstrich.',
    textEn: 'Name a bread spread.',
    answer: 'Nutella, Marmelade, Honig, Butter, Käse, Wurst, Frischkäse, Erdnussbutter',
    bunteTuete: { kind: 'crowdTop', answers: [
      { label: 'Nutella', labelEn: 'Nutella', aliases: ['nuss-nougat-creme', 'nussnougatcreme'] },
      { label: 'Marmelade', labelEn: 'Jam', aliases: ['konfitüre'] },
      { label: 'Honig', labelEn: 'Honey', aliases: [] },
      { label: 'Butter', labelEn: 'Butter', aliases: [] },
      { label: 'Käse', labelEn: 'Cheese', aliases: [] },
      { label: 'Wurst', labelEn: 'Sausage', aliases: ['salami', 'leberwurst'] },
      { label: 'Frischkäse', labelEn: 'Cream cheese', aliases: [] },
      { label: 'Erdnussbutter', labelEn: 'Peanut butter', aliases: ['peanutbutter'] },
    ] },
    funFact: 'Nutella und Marmelade dominieren den süßen Frühstückstisch.'
  }),
  // ── Phase 3 ──────────────────────────────────────────────────────────
  q(`${ca}-p3-0`, 3, 0, 'BUNTE_TUETE', {
    text: 'Nenne einen Cocktail.',
    textEn: 'Name a cocktail.',
    answer: 'Mojito, Caipirinha, Margarita, Piña Colada, Cuba Libre, Aperol Spritz, Gin Tonic, Sex on the Beach',
    bunteTuete: { kind: 'crowdTop', answers: [
      { label: 'Mojito', labelEn: 'Mojito', aliases: [] },
      { label: 'Caipirinha', labelEn: 'Caipirinha', aliases: ['caipi'] },
      { label: 'Margarita', labelEn: 'Margarita', aliases: [] },
      { label: 'Piña Colada', labelEn: 'Piña Colada', aliases: ['pina colada', 'colada'] },
      { label: 'Cuba Libre', labelEn: 'Cuba Libre', aliases: ['cubalibre'] },
      { label: 'Aperol Spritz', labelEn: 'Aperol Spritz', aliases: ['aperol', 'spritz'] },
      { label: 'Gin Tonic', labelEn: 'Gin & Tonic', aliases: ['gin tonic', 'gt'] },
      { label: 'Sex on the Beach', labelEn: 'Sex on the Beach', aliases: [] },
    ] },
    funFact: 'Mojito und Caipirinha sind die meistgenannten Klassiker an der Bar.'
  }),
  q(`${ca}-p3-1`, 3, 1, 'BUNTE_TUETE', {
    text: 'Wie lang ist die Chinesische Mauer ungefähr (in Kilometern)?',
    textEn: 'Roughly how long is the Great Wall of China (in kilometers)?',
    answer: '21196',
    bunteTuete: { kind: 'crowdEstimate', targetValue: 21196, unit: 'km', unitEn: 'km' },
    funFact: 'Inklusive aller Zweige misst die Mauer laut offizieller Vermessung rund 21.196 km.'
  }),
  q(`${ca}-p3-2`, 3, 2, 'MUCHO', {
    text: 'Welcher Planet ist der Sonne am nächsten?',
    textEn: 'Which planet is closest to the Sun?',
    answer: 'Merkur',
    options: ['Merkur', 'Venus', 'Erde', 'Mars'],
    optionsEn: ['Mercury', 'Venus', 'Earth', 'Mars'],
    correctOptionIndex: 0,
    funFact: 'Merkur ist der Sonne am nächsten — aber Venus ist der heißeste Planet.'
  }),
  q(`${ca}-p3-3`, 3, 3, 'BUNTE_TUETE', {
    text: 'Wie viele Länder hat der Kontinent Afrika?',
    textEn: 'How many countries does the continent of Africa have?',
    answer: '54',
    bunteTuete: { kind: 'crowdEstimate', targetValue: 54, unit: 'Länder', unitEn: 'countries' },
    funFact: 'Afrika hat 54 von der UN anerkannte Staaten — der Kontinent mit den zweitmeisten.'
  }),
  q(`${ca}-p3-4`, 3, 4, 'BUNTE_TUETE', {
    text: 'Nenne etwas, das in fast jeder WG-Küche steht.',
    textEn: 'Name something found in almost every shared-flat kitchen.',
    answer: 'Kühlschrank, Herd, Wasserkocher, Mikrowelle, Kaffeemaschine, Spülmaschine, Toaster',
    bunteTuete: { kind: 'crowdTop', answers: [
      { label: 'Kühlschrank', labelEn: 'Fridge', aliases: ['kuehlschrank'] },
      { label: 'Herd', labelEn: 'Stove', aliases: ['ofen', 'backofen'] },
      { label: 'Wasserkocher', labelEn: 'Kettle', aliases: [] },
      { label: 'Mikrowelle', labelEn: 'Microwave', aliases: [] },
      { label: 'Kaffeemaschine', labelEn: 'Coffee maker', aliases: ['kaffee', 'kaffeevollautomat'] },
      { label: 'Spülmaschine', labelEn: 'Dishwasher', aliases: ['geschirrspüler'] },
      { label: 'Toaster', labelEn: 'Toaster', aliases: [] },
    ] },
    funFact: 'Wasserkocher und Kühlschrank sind quasi WG-Grundausstattung.'
  }),
];

export const QQ_EXTRA_TEST_DRAFTS: QQTestDraft[] = [
  {
    id: ca,
    title: '🌊 CozyArena: Neue Bunte Tüte (Test)',
    phases: 3,
    language: 'both',
    questions: caQs,
    createdAt: now,
    updatedAt: now,
  },
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
