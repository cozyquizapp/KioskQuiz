/**
 * crowd-fragesaetze-bauen.mjs — die drei CrowdQuiz-Fragesaetze erzeugen.
 *
 * 2026-08-29, Wolf: „spezielle spielsaetze fuer crowd quiz erstellen! also
 * fragesaetze" und auf Nachfrage „4 runden mit je 5 kategorien, 3 fragesaetze
 * zum start".
 *
 * ── Warum ein Generator und keine drei handgeschriebenen JSON-Bloecke ──────
 * Sechzig Fragen von Hand in eine 6000-Zeilen-Datei zu tippen heisst: sechzig
 * Gelegenheiten fuer einen Tippfehler in einer Id, einem Index oder einem
 * Pflichtfeld. Der Server wirft dafuer beim SPIELSTART einen Fehler, also im
 * schlechtesten Moment (qqRooms.ts, die Schleife „Validate questions"). Hier
 * stehen nur die Inhalte; Ids, `phaseIndex` und `questionIndexInPhase` rechnet
 * der Generator, und er prueft dieselben Regeln wie der Server, bevor er
 * schreibt.
 *
 * ── Was CrowdQuiz von CozyQuiz unterscheidet, und was das hier heisst ──────
 * * KEINE Heisse Kartoffel. Sie laeuft reihum mit Ausscheiden und ist bei
 *   vierzig Geraeten neununddreissigmal Warten (QQ_BUNTE_TUETE_COZY_ONLY).
 *   Genau deshalb gibt es diese Saetze: qq-vol-1 enthaelt sie, und der Server
 *   musste sie bisher beim Start herausfiltern. Ein eigener Satz loest das an
 *   der Quelle statt am Symptom.
 * * DAFUER die beiden CrowdQuiz-eigenen: Umfrage (`crowdTop`) und
 *   Schwarmintelligenz (`crowdEstimate`). Jeder Satz hat beide - die Umfrage
 *   als Auftakt in Runde 1, die Schwarmintelligenz als Finale in Runde 4, weil
 *   sie mit vielen Handys am staerksten ist („die Masse ist kluegerals der
 *   Einzelne", Kommentar am Typ).
 * * KEINE Connections. Im Grossformat abgeschaltet (qqRooms.ts, largeGroupMode).
 *
 * ⚠️ CHEESE-Fragen haben `image: null`, genau wie in allen bestehenden
 * Entwuerfen. Die Bilder haengt Wolf im Editor an; der Text nennt deshalb
 * immer eine EINDEUTIGE Antwort, damit klar ist, welches Bild gemeint ist.
 *
 * NUTZUNG: node scripts/crowd-fragesaetze-bauen.mjs [--schreiben]
 *          ohne Schalter wird nur geprueft und berichtet.
 */
import fs from 'node:fs';
import path from 'node:path';

const DATEI = path.resolve('backend/src/data/qqDrafts.json');

/** Eine Runde: fuenf Kategorien in fester Reihenfolge, wie in allen Entwuerfen. */
const KATEGORIEN = ['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'];

// ── Satz 1 ────────────────────────────────────────────────────────────────
const SATZ1 = [
  // Runde 1
  [
    { text: 'Wie viele Tasten hat ein Klavier?', textEn: 'How many keys does a piano have?',
      answer: '88', targetValue: 88, unit: 'Tasten', unitEn: 'keys',
      funFact: 'Davon sind 52 weiß und 36 schwarz.' },
    { text: 'Welches Metall ist bei Zimmertemperatur flüssig?', textEn: 'Which metal is liquid at room temperature?',
      answer: 'Quecksilber',
      options: ['Quecksilber', 'Blei', 'Zinn', 'Zink'],
      optionsEn: ['Mercury', 'Lead', 'Tin', 'Zinc'], correctOptionIndex: 0,
      funFact: 'Quecksilber gefriert erst bei minus 39 Grad.' },
    { text: 'Nenne EINE Farbe des Regenbogens.', textEn: 'Name ONE colour of the rainbow.',
      answer: 'Rot, Orange, Gelb, Grün, Blau, Indigo, Violett',
      answerEn: 'Red, orange, yellow, green, blue, indigo, violet',
      bunteTuete: { kind: 'crowdTop', answers: [
        { label: 'Rot', labelEn: 'Red' },
        { label: 'Orange', labelEn: 'Orange' },
        { label: 'Gelb', labelEn: 'Yellow' },
        { label: 'Grün', labelEn: 'Green', aliases: ['Gruen'] },
        { label: 'Blau', labelEn: 'Blue' },
        { label: 'Violett', labelEn: 'Violet', aliases: ['Lila'], aliasesEn: ['Purple'] },
      ] } },
    { text: 'Wie lange dauert ein Fußballspiel regulär?', textEn: 'How long is a regular football match?',
      answer: '90 Minuten',
      options: ['80 Minuten', '90 Minuten', '120 Minuten'],
      optionsEn: ['80 minutes', '90 minutes', '120 minutes'], correctOptionIndex: 1 },
    { text: 'Welches Bauwerk ist hier zu sehen? (Kolosseum)', textEn: 'Which building is shown here? (Colosseum)',
      answer: 'Kolosseum', answerEn: 'Colosseum' },
  ],
  // Runde 2
  [
    { text: 'Wie viele Mitgliedsländer hat die Europäische Union?', textEn: 'How many member states does the European Union have?',
      answer: '27', targetValue: 27, unit: 'Länder', unitEn: 'countries',
      funFact: 'Seit dem Austritt des Vereinigten Königreichs 2020 sind es 27.' },
    { text: 'Welches dieser Instrumente hat Saiten UND Tasten?', textEn: 'Which of these instruments has both strings and keys?',
      answer: 'Cembalo',
      options: ['Cembalo', 'Harfe', 'Posaune', 'Pauke'],
      optionsEn: ['Harpsichord', 'Harp', 'Trombone', 'Timpani'], correctOptionIndex: 0,
      funFact: 'Beim Cembalo werden die Saiten gezupft, beim Klavier angeschlagen.' },
    { text: 'Sortiert diese Tiere vom leichtesten zum schwersten.', textEn: 'Sort these animals from lightest to heaviest.',
      answer: 'Kolibri, Hauskatze, Mensch, Pferd, Elefant',
      bunteTuete: { kind: 'order',
        items: ['Kolibri', 'Hauskatze', 'Mensch', 'Pferd', 'Afrikanischer Elefant'],
        itemsEn: ['Hummingbird', 'House cat', 'Human', 'Horse', 'African elephant'],
        itemValues: ['2 g', '4 kg', '70 kg', '500 kg', '5.000 kg'],
        correctOrder: [0, 1, 2, 3, 4],
        criteria: 'vom leichtesten zum schwersten', criteriaEn: 'lightest to heaviest' } },
    { text: 'Welche Farbe entsteht, wenn man Blau und Gelb mischt?', textEn: 'Which colour do you get mixing blue and yellow?',
      answer: 'Grün',
      options: ['Grün', 'Orange', 'Violett'],
      optionsEn: ['Green', 'Orange', 'Violet'], correctOptionIndex: 0 },
    { text: 'Welche Stadt ist hier zu sehen? (Venedig)', textEn: 'Which city is shown here? (Venice)',
      answer: 'Venedig', answerEn: 'Venice' },
  ],
  // Runde 3
  [
    { text: 'Wie viele Sekunden hat ein Tag?', textEn: 'How many seconds are there in a day?',
      answer: '86400', targetValue: 86400, unit: 'Sekunden', unitEn: 'seconds',
      funFact: '24 mal 60 mal 60. Schaltsekunden nicht mitgerechnet.' },
    { text: 'Wer schrieb „Die Verwandlung"?', textEn: 'Who wrote "The Metamorphosis"?',
      answer: 'Franz Kafka',
      options: ['Franz Kafka', 'Thomas Mann', 'Hermann Hesse', 'Robert Musil'],
      optionsEn: ['Franz Kafka', 'Thomas Mann', 'Hermann Hesse', 'Robert Musil'], correctOptionIndex: 0 },
    { text: 'Nennt die fünf größten Länder der Welt nach Fläche.', textEn: 'Name the five largest countries in the world by area.',
      answer: 'Russland, Kanada, USA, China, Brasilien',
      bunteTuete: { kind: 'top5',
        answers: ['Russland', 'Kanada', 'USA', 'China', 'Brasilien'],
        answersEn: ['Russia', 'Canada', 'USA', 'China', 'Brazil'],
        aliases: [['Russische Föderation'], [], ['Vereinigte Staaten', 'Amerika', 'United States'], ['Volksrepublik China'], []] } },
    { text: 'Wie viele Streifen hat die Flagge der USA?', textEn: 'How many stripes does the flag of the USA have?',
      answer: '13',
      options: ['12', '13', '15'], optionsEn: ['12', '13', '15'], correctOptionIndex: 1,
      funFact: 'Ein Streifen je Gründungsstaat, ein Stern je heutigem Bundesstaat.' },
    { text: 'Welches Tier ist hier zu sehen? (Axolotl)', textEn: 'Which animal is shown here? (Axolotl)',
      answer: 'Axolotl', answerEn: 'Axolotl' },
  ],
  // Runde 4
  [
    { text: 'Wie hoch ist der Eiffelturm mit Antenne, in Metern?', textEn: 'How tall is the Eiffel Tower including its antenna, in metres?',
      answer: '330', targetValue: 330, unit: 'Meter', unitEn: 'metres',
      funFact: 'Bei Hitze dehnt er sich aus und wächst um bis zu 15 Zentimeter.' },
    { text: 'Welches Land wurde 2014 Fußball-Weltmeister?', textEn: 'Which country won the 2014 football World Cup?',
      answer: 'Deutschland',
      options: ['Deutschland', 'Argentinien', 'Brasilien', 'Spanien'],
      optionsEn: ['Germany', 'Argentina', 'Brazil', 'Spain'], correctOptionIndex: 0 },
    { text: 'Wie weit ist der Mond im Mittel von der Erde entfernt, in Kilometern?', textEn: 'What is the average distance from the Earth to the Moon, in kilometres?',
      answer: '384400',
      bunteTuete: { kind: 'crowdEstimate', targetValue: 384400, unit: 'km', unitEn: 'km' } },
    { text: 'Was ist schwerer: ein Kilo Federn oder ein Kilo Blei?', textEn: 'Which is heavier: a kilo of feathers or a kilo of lead?',
      answer: 'Gleich schwer',
      options: ['Die Federn', 'Das Blei', 'Gleich schwer'],
      optionsEn: ['The feathers', 'The lead', 'The same'], correctOptionIndex: 2 },
    { text: 'Welches Gemälde ist hier zu sehen? (Die Sternennacht)', textEn: 'Which painting is shown here? (The Starry Night)',
      answer: 'Die Sternennacht', answerEn: 'The Starry Night' },
  ],
];

// ── Satz 2 ────────────────────────────────────────────────────────────────
const SATZ2 = [
  [
    { text: 'Wie viele Knochen hat ein erwachsener Mensch?', textEn: 'How many bones does an adult human have?',
      answer: '206', targetValue: 206, unit: 'Knochen', unitEn: 'bones',
      funFact: 'Babys starten mit rund 270; viele verwachsen später.' },
    { text: 'Welcher Planet ist der Sonne am nächsten?', textEn: 'Which planet is closest to the Sun?',
      answer: 'Merkur',
      options: ['Merkur', 'Venus', 'Erde', 'Mars'],
      optionsEn: ['Mercury', 'Venus', 'Earth', 'Mars'], correctOptionIndex: 0,
      funFact: 'Am heißesten ist trotzdem die Venus - wegen ihrer dichten Atmosphäre.' },
    { text: 'Nenne EIN Getränk, das man in einer Bar bestellt.', textEn: 'Name ONE drink you order at a bar.',
      answer: 'Bier, Wein, Cola, Wasser, Gin Tonic, Aperol Spritz, Kaffee',
      answerEn: 'Beer, wine, cola, water, gin and tonic, Aperol Spritz, coffee',
      bunteTuete: { kind: 'crowdTop', answers: [
        { label: 'Bier', labelEn: 'Beer', aliases: ['Pils', 'Helles', 'Weizen'], aliasesEn: ['Lager', 'Ale'] },
        { label: 'Wein', labelEn: 'Wine', aliases: ['Weißwein', 'Rotwein', 'Weisswein'] },
        { label: 'Cola', labelEn: 'Cola', aliases: ['Coke'] },
        { label: 'Wasser', labelEn: 'Water' },
        { label: 'Gin Tonic', labelEn: 'Gin and tonic', aliases: ['Gin'] },
        { label: 'Aperol Spritz', labelEn: 'Aperol Spritz', aliases: ['Aperol'] },
      ] } },
    { text: 'Wie viele Beine hat eine Spinne?', textEn: 'How many legs does a spider have?',
      answer: '8', options: ['6', '8', '10'], optionsEn: ['6', '8', '10'], correctOptionIndex: 1,
      funFact: 'Insekten haben sechs, Spinnen acht - deshalb sind Spinnen keine Insekten.' },
    { text: 'Welches Tier ist hier zu sehen? (Schnabeltier)', textEn: 'Which animal is shown here? (Platypus)',
      answer: 'Schnabeltier', answerEn: 'Platypus' },
  ],
  [
    { text: 'Wie viele Länder liegen auf dem afrikanischen Kontinent?', textEn: 'How many countries are on the African continent?',
      answer: '54', targetValue: 54, unit: 'Länder', unitEn: 'countries',
      funFact: '54 von den Vereinten Nationen anerkannte Staaten.' },
    { text: 'Welcher Fluss ist der laengste Afrikas?', textEn: 'Which is the longest river in Africa?',
      answer: 'Nil',
      options: ['Nil', 'Kongo', 'Niger', 'Sambesi'],
      optionsEn: ['Nile', 'Congo', 'Niger', 'Zambezi'], correctOptionIndex: 0 },
    { text: 'Nennt fünf Planeten unseres Sonnensystems.', textEn: 'Name five planets of our solar system.',
      answer: 'Merkur, Venus, Erde, Mars, Jupiter, Saturn, Uranus, Neptun',
      bunteTuete: { kind: 'top5',
        answers: ['Merkur', 'Venus', 'Erde', 'Mars', 'Jupiter'],
        answersEn: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter'],
        aliases: [[], [], ['Erdkugel'], ['der rote Planet'], []] } },
    { text: 'Welches Tier ist das schnellste an Land?', textEn: 'Which is the fastest land animal?',
      answer: 'Gepard',
      options: ['Gepard', 'Löwe', 'Antilope'],
      optionsEn: ['Cheetah', 'Lion', 'Antelope'], correctOptionIndex: 0 },
    { text: 'Welches Bauwerk ist hier zu sehen? (Taj Mahal)', textEn: 'Which building is shown here? (Taj Mahal)',
      answer: 'Taj Mahal', answerEn: 'Taj Mahal' },
  ],
  [
    { text: 'Wie viele Zähne hat ein erwachsener Mensch mit Weisheitszähnen?', textEn: 'How many teeth does an adult human have including wisdom teeth?',
      answer: '32', targetValue: 32, unit: 'Zähne', unitEn: 'teeth' },
    { text: 'Welche Sprache hat weltweit die meisten Muttersprachler?', textEn: 'Which language has the most native speakers worldwide?',
      answer: 'Mandarin',
      options: ['Mandarin', 'Englisch', 'Spanisch', 'Hindi'],
      optionsEn: ['Mandarin', 'English', 'Spanish', 'Hindi'], correctOptionIndex: 0,
      funFact: 'Englisch hat mehr SPRECHER insgesamt, aber weniger Muttersprachler.' },
    { text: 'Wo liegt der Big Ben? Setzt euren Pin auf die Karte.', textEn: 'Where is Big Ben? Drop your pin on the map.',
      answer: 'London',
      bunteTuete: { kind: 'map', lat: 51.5007, lng: -0.1246, targetLabel: 'Big Ben, London' } },
    { text: 'Aus welchem Land stammt die Pizza Margherita?', textEn: 'Which country does the Pizza Margherita come from?',
      answer: 'Italien',
      options: ['Italien', 'Griechenland', 'Spanien'],
      optionsEn: ['Italy', 'Greece', 'Spain'], correctOptionIndex: 0 },
    { text: 'Welches Tier ist hier zu sehen? (Quokka)', textEn: 'Which animal is shown here? (Quokka)',
      answer: 'Quokka', answerEn: 'Quokka' },
  ],
  [
    { text: 'Wie viele Herzen hat ein Tintenfisch?', textEn: 'How many hearts does an octopus have?',
      answer: '3', targetValue: 3, unit: 'Herzen', unitEn: 'hearts',
      funFact: 'Zwei pumpen durch die Kiemen, eines durch den restlichen Körper.' },
    { text: 'Welches Element hat das chemische Zeichen „Au"?', textEn: 'Which element has the chemical symbol "Au"?',
      answer: 'Gold',
      options: ['Gold', 'Silber', 'Aluminium', 'Argon'],
      optionsEn: ['Gold', 'Silver', 'Aluminium', 'Argon'], correctOptionIndex: 0,
      funFact: 'Von lateinisch „aurum".' },
    { text: 'Wie viele Liter Wasser passen in eine normale Badewanne?', textEn: 'How many litres of water fit in an ordinary bathtub?',
      answer: '150',
      bunteTuete: { kind: 'crowdEstimate', targetValue: 150, unit: 'Liter', unitEn: 'litres' } },
    { text: 'Welcher Kontinent ist der größte?', textEn: 'Which is the largest continent?',
      answer: 'Asien',
      options: ['Asien', 'Afrika', 'Nordamerika'],
      optionsEn: ['Asia', 'Africa', 'North America'], correctOptionIndex: 0 },
    { text: 'Welches Wahrzeichen ist hier zu sehen? (Freiheitsstatue)', textEn: 'Which landmark is shown here? (Statue of Liberty)',
      answer: 'Freiheitsstatue', answerEn: 'Statue of Liberty' },
  ],
];

// ── Satz 3 ────────────────────────────────────────────────────────────────
const SATZ3 = [
  [
    { text: 'Wie viele Felder hat ein Schachbrett?', textEn: 'How many squares does a chessboard have?',
      answer: '64', targetValue: 64, unit: 'Felder', unitEn: 'squares' },
    { text: 'Welches Gewürz ist nach Gewicht das teuerste der Welt?', textEn: 'Which spice is the most expensive in the world by weight?',
      answer: 'Safran',
      options: ['Safran', 'Vanille', 'Kardamom', 'Zimt'],
      optionsEn: ['Saffron', 'Vanilla', 'Cardamom', 'Cinnamon'], correctOptionIndex: 0,
      funFact: 'Für ein Kilo braucht es rund 150.000 Blüten, alle von Hand gepflückt.' },
    { text: 'Nenne EIN Werkzeug, das in keinem Haushalt fehlen darf.', textEn: 'Name ONE tool no household should be without.',
      answer: 'Hammer, Schraubenzieher, Zange, Schere, Maßband, Bohrmaschine',
      answerEn: 'Hammer, screwdriver, pliers, scissors, tape measure, drill',
      bunteTuete: { kind: 'crowdTop', answers: [
        { label: 'Hammer', labelEn: 'Hammer' },
        { label: 'Schraubenzieher', labelEn: 'Screwdriver', aliases: ['Schraubendreher'] },
        { label: 'Zange', labelEn: 'Pliers' },
        { label: 'Schere', labelEn: 'Scissors' },
        { label: 'Maßband', labelEn: 'Tape measure', aliases: ['Massband', 'Zollstock'] },
        { label: 'Bohrmaschine', labelEn: 'Drill', aliases: ['Akkuschrauber'] },
      ] } },
    { text: 'Wie viele Seiten hat ein Würfel?', textEn: 'How many faces does a die have?',
      answer: '6', options: ['4', '6', '8'], optionsEn: ['4', '6', '8'], correctOptionIndex: 1 },
    { text: 'Welches Instrument ist hier zu sehen? (Akkordeon)', textEn: 'Which instrument is shown here? (Accordion)',
      answer: 'Akkordeon', answerEn: 'Accordion' },
  ],
  [
    { text: 'Wie viele Ringe hat das olympische Symbol?', textEn: 'How many rings does the Olympic symbol have?',
      answer: '5', targetValue: 5, unit: 'Ringe', unitEn: 'rings',
      funFact: 'Einer je Kontinent, wobei Amerika als einer gezaehlt wird.' },
    { text: 'In welcher Stadt steht die Hagia Sophia?', textEn: 'In which city is the Hagia Sophia?',
      answer: 'Istanbul',
      options: ['Istanbul', 'Athen', 'Kairo', 'Jerusalem'],
      optionsEn: ['Istanbul', 'Athens', 'Cairo', 'Jerusalem'], correctOptionIndex: 0 },
    { text: 'Sortiert diese Erfindungen von der ältesten zur jüngsten.', textEn: 'Sort these inventions from oldest to newest.',
      answer: 'Buchdruck, Dampfmaschine, Glühbirne, Fernsehen, Internet',
      bunteTuete: { kind: 'order',
        items: ['Buchdruck', 'Dampfmaschine', 'Glühbirne', 'Fernsehen', 'World Wide Web'],
        itemsEn: ['Printing press', 'Steam engine', 'Light bulb', 'Television', 'World Wide Web'],
        itemValues: ['um 1450', 'um 1712', '1879', '1926', '1989'],
        correctOrder: [0, 1, 2, 3, 4],
        criteria: 'von der ältesten zur jüngsten', criteriaEn: 'oldest to newest' } },
    { text: 'Welches Tier legt Eier und ist trotzdem ein Säugetier?', textEn: 'Which animal lays eggs and is still a mammal?',
      answer: 'Schnabeltier',
      options: ['Schnabeltier', 'Pinguin', 'Fledermaus'],
      optionsEn: ['Platypus', 'Penguin', 'Bat'], correctOptionIndex: 0 },
    { text: 'Welche Brücke ist hier zu sehen? (Golden Gate Bridge)', textEn: 'Which bridge is shown here? (Golden Gate Bridge)',
      answer: 'Golden Gate Bridge', answerEn: 'Golden Gate Bridge' },
  ],
  [
    { text: 'Wie viele Saiten hat eine klassische Gitarre?', textEn: 'How many strings does a classical guitar have?',
      answer: '6', targetValue: 6, unit: 'Saiten', unitEn: 'strings' },
    { text: 'Welche Farbe hat das Blut eines Tintenfisches?', textEn: 'What colour is an octopus’s blood?',
      answer: 'Blau',
      options: ['Blau', 'Rot', 'Grün', 'Farblos'],
      optionsEn: ['Blue', 'Red', 'Green', 'Colourless'], correctOptionIndex: 0,
      funFact: 'Es transportiert Sauerstoff mit Kupfer statt mit Eisen.' },
    { text: 'Wo liegt das Brandenburger Tor? Setzt euren Pin auf die Karte.', textEn: 'Where is the Brandenburg Gate? Drop your pin on the map.',
      answer: 'Berlin',
      bunteTuete: { kind: 'map', lat: 52.5163, lng: 13.3777, targetLabel: 'Brandenburger Tor, Berlin' } },
    { text: 'Wie viele Minuten hat ein Viertel im Basketball (NBA)?', textEn: 'How many minutes is a quarter in the NBA?',
      answer: '12',
      options: ['10', '12', '15'], optionsEn: ['10', '12', '15'], correctOptionIndex: 1 },
    { text: 'Welches Gebäude ist hier zu sehen? (Opernhaus Sydney)', textEn: 'Which building is shown here? (Sydney Opera House)',
      answer: 'Opernhaus Sydney', answerEn: 'Sydney Opera House' },
  ],
  [
    { text: 'Wie viele Buchstaben hat das deutsche Alphabet ohne Umlaute und ß?', textEn: 'How many letters does the German alphabet have without umlauts and eszett?',
      answer: '26', targetValue: 26, unit: 'Buchstaben', unitEn: 'letters' },
    { text: 'Welcher Berg ist der höchste der Welt ueber dem Meeresspiegel?', textEn: 'Which is the highest mountain in the world above sea level?',
      answer: 'Mount Everest',
      options: ['Mount Everest', 'K2', 'Kilimandscharo', 'Mont Blanc'],
      optionsEn: ['Mount Everest', 'K2', 'Kilimanjaro', 'Mont Blanc'], correctOptionIndex: 0,
      funFact: 'Gemessen vom Fuß aus wäre der Mauna Kea auf Hawaii höher.' },
    { text: 'Wie viele Haare hat ein Mensch im Schnitt auf dem Kopf?', textEn: 'How many hairs does a person have on their head on average?',
      answer: '100000',
      bunteTuete: { kind: 'crowdEstimate', targetValue: 100000, unit: 'Haare', unitEn: 'hairs' } },
    { text: 'Welches Getreide steckt in klassischem Bier nach Reinheitsgebot?', textEn: 'Which grain is in classic beer under the German purity law?',
      answer: 'Gerste',
      options: ['Gerste', 'Roggen', 'Hafer'],
      optionsEn: ['Barley', 'Rye', 'Oats'], correctOptionIndex: 0 },
    { text: 'Welches Wahrzeichen ist hier zu sehen? (Machu Picchu)', textEn: 'Which landmark is shown here? (Machu Picchu)',
      answer: 'Machu Picchu', answerEn: 'Machu Picchu' },
  ],
];

const SAETZE = [
  { id: 'crowd-vol-1', title: '🏟️ CrowdQuiz Vol. 1', runden: SATZ1 },
  { id: 'crowd-vol-2', title: '🏟️ CrowdQuiz Vol. 2', runden: SATZ2 },
  { id: 'crowd-vol-3', title: '🏟️ CrowdQuiz Vol. 3', runden: SATZ3 },
];

// ── Bauen und pruefen ─────────────────────────────────────────────────────
/** Dieselben Regeln, die der Server beim Spielstart wirft (qqRooms.ts). Hier
 *  schlagen sie beim Erzeugen zu, nicht vor Publikum. */
function pruefe(q, wo, fehler) {
  const t = `${wo} (${q.category})`;
  if (q.category === 'MUCHO') {
    if (!Array.isArray(q.options) || q.options.length !== 4) fehler.push(`${t}: braucht genau 4 Optionen`);
    if (q.correctOptionIndex == null || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) fehler.push(`${t}: correctOptionIndex fehlt oder ausserhalb 0-3`);
  } else if (q.category === 'ZEHN_VON_ZEHN') {
    if (!Array.isArray(q.options) || q.options.length < 2) fehler.push(`${t}: braucht mindestens 2 Optionen`);
    if (q.correctOptionIndex == null || q.correctOptionIndex < 0 || q.correctOptionIndex >= (q.options?.length ?? 0)) fehler.push(`${t}: correctOptionIndex ausserhalb`);
  } else if (q.category === 'SCHAETZCHEN') {
    if (typeof q.targetValue !== 'number' || Number.isNaN(q.targetValue)) fehler.push(`${t}: targetValue fehlt`);
  }
  // Zweisprachigkeit ist Repo-Regel, nicht Server-Regel - trotzdem pruefen.
  if (!q.textEn) fehler.push(`${t}: textEn fehlt`);
  if (q.options && !q.optionsEn) fehler.push(`${t}: optionsEn fehlt`);
  // CrowdQuiz-Regel: keine Heisse Kartoffel.
  if (q.bunteTuete?.kind === 'hotPotato') fehler.push(`${t}: hotPotato gehoert nicht in einen CrowdQuiz-Satz`);
  // Antwortindex muss auf die als `answer` genannte Option zeigen.
  if (q.options && q.correctOptionIndex != null && q.answer
      && q.options[q.correctOptionIndex] !== q.answer) {
    fehler.push(`${t}: answer „${q.answer}" passt nicht zu options[${q.correctOptionIndex}] = „${q.options[q.correctOptionIndex]}"`);
  }
}

const fehler = [];
const jetzt = Date.now();
const neu = SAETZE.map(satz => {
  const questions = [];
  satz.runden.forEach((runde, ri) => {
    if (runde.length !== 5) fehler.push(`${satz.id} Runde ${ri + 1}: ${runde.length} statt 5 Fragen`);
    runde.forEach((roh, qi) => {
      const q = {
        id: `${satz.id}-p${ri + 1}-${qi}`,
        category: KATEGORIEN[qi],
        phaseIndex: ri + 1,
        questionIndexInPhase: qi,
        ...roh,
      };
      if (q.category === 'CHEESE') q.image = null;
      pruefe(q, `${satz.id} R${ri + 1}/${qi + 1}`, fehler);
      questions.push(q);
    });
  });
  return {
    id: satz.id, title: satz.title, language: 'both', phases: 4,
    // CrowdQuiz hat keine Connections (im Grossformat abgeschaltet).
    connections: null,
    questions, createdAt: jetzt, updatedAt: jetzt,
  };
});

console.log(`\n  ${neu.length} Saetze gebaut, je ${neu[0].questions.length} Fragen.`);
for (const s of neu) {
  const kinds = s.questions.map(q => q.bunteTuete?.kind).filter(Boolean);
  console.log(`    ${s.id.padEnd(13)} ${s.title.padEnd(24)} Bunte Tuete: ${kinds.join(', ')}`);
}
if (fehler.length) {
  console.log(`\n  ⚠️ ${fehler.length} Fehler, nichts geschrieben:`);
  for (const f of fehler) console.log('     ' + f);
  process.exit(1);
}
console.log('\n  ✓ Alle Pruefungen bestanden (dieselben wie im Server, plus zweisprachig und keine Heisse Kartoffel).');

if (!process.argv.includes('--schreiben')) {
  console.log('  (Nur geprueft. Mit --schreiben in backend/src/data/qqDrafts.json eintragen.)');
  process.exit(0);
}
const alle = JSON.parse(fs.readFileSync(DATEI, 'utf8'));
const ohneAlte = alle.filter(d => !SAETZE.some(s => s.id === d.id));
fs.writeFileSync(DATEI, JSON.stringify([...ohneAlte, ...neu], null, 2) + '\n');
console.log(`  Geschrieben: ${ohneAlte.length} bestehende + ${neu.length} CrowdQuiz-Saetze -> ${DATEI}`);
