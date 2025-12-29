import { AnyQuestion } from '../../../shared/quizTypes';

// 25 Fragen: 5 pro Kategorie, mit einfachen EN-Uebersetzungen
export const questions: AnyQuestion[] = [
  // Schaetzchen (Estimate)
  {
    id: 'q-est-1',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Liter Wasser fasst ein olympisches Schwimmbecken?',
    questionEn: 'How many liters of water does an Olympic swimming pool hold?',
    points: 1,
    segmentIndex: 0,
    targetValue: 2_500_000,
    unit: 'Liter'
  },
  {
    id: 'q-est-2',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Treppenstufen hat der Eiffelturm (ohne Aufzug)?',
    questionEn: 'How many steps does the Eiffel Tower have (without elevator)?',
    points: 1,
    segmentIndex: 0,
    targetValue: 1665,
    unit: 'Stufen'
  },
  {
    id: 'q-est-3',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Minuten hat ein Jahr?',
    questionEn: 'How many minutes are in a year?',
    points: 2,
    segmentIndex: 1,
    targetValue: 525_600,
    unit: 'Minuten'
  },
  {
    id: 'q-est-4',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Erden passen volumetrisch in die Sonne?',
    questionEn: 'How many Earths fit by volume into the Sun?',
    points: 2,
    segmentIndex: 1,
    targetValue: 1_300_000,
    unit: 'Erden'
  },
  {
    id: 'q-est-5',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Kilometer ist die Strecke Hamburg-Muenchen (Luftlinie)?',
    questionEn: 'What is the distance Hamburg-Munich as the crow flies (km)?',
    points: 2,
    segmentIndex: 1,
    targetValue: 610,
    unit: 'km'
  },

  // Mu-Cho (Multiple Choice)
  {
    id: 'q-mc-1',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welche Stadt liegt am weitesten noerdlich?',
    questionEn: 'Which city lies furthest north?',
    points: 1,
    segmentIndex: 0,
    options: ['Paris', 'London', 'Berlin', 'Dublin'],
    optionsEn: ['Paris', 'London', 'Berlin', 'Dublin'],
    correctIndex: 1
  },
  {
    id: 'q-mc-2',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Element hat das chemische Symbol Na?',
    questionEn: 'Which element has the chemical symbol Na?',
    points: 1,
    segmentIndex: 0,
    options: ['Stickstoff', 'Natrium', 'Neon', 'Nickel'],
    optionsEn: ['Nitrogen', 'Sodium', 'Neon', 'Nickel'],
    correctIndex: 1
  },
  {
    id: 'q-mc-3',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welche Programmiersprache wurde 1995 veroeffentlicht?',
    questionEn: 'Which programming language was released in 1995?',
    points: 1,
    segmentIndex: 0,
    options: ['Python', 'Java', 'C', 'Kotlin'],
    optionsEn: ['Python', 'Java', 'C', 'Kotlin'],
    correctIndex: 1
  },
  {
    id: 'q-mc-4',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welcher Planet hat die meisten Monde?',
    questionEn: 'Which planet has the most moons?',
    points: 2,
    segmentIndex: 1,
    options: ['Saturn', 'Jupiter', 'Uranus', 'Neptun'],
    optionsEn: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'],
    correctIndex: 0
  },
  {
    id: 'q-mc-5',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welcher Kuenstler malte "Die Sternennacht"?',
    questionEn: 'Which artist painted "The Starry Night"?',
    points: 2,
    segmentIndex: 1,
    options: ['Monet', 'van Gogh', 'Picasso', 'Klimt'],
    optionsEn: ['Monet', 'van Gogh', 'Picasso', 'Klimt'],
    correctIndex: 1
  },

  // Stimmts? (Betting)
  {
    id: 'q-tf-1',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Die ISS umrundet die Erde in ca. 90 Minuten.',
    questionEn: 'The ISS orbits Earth in about 90 minutes.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10
  },
  {
    id: 'q-tf-2',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Bienen koennen UV-Licht sehen.',
    questionEn: 'Bees can see ultraviolet light.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10
  },
  {
    id: 'q-tf-3',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Der Viktoriasee ist der groesste See der Welt.',
    questionEn: 'Lake Victoria is the largest lake in the world.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10
  },
  {
    id: 'q-tf-4',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Der Mensch hat mehr Gene als eine Tomate.',
    questionEn: 'Humans have more genes than a tomato.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10
  },
  {
    id: 'q-tf-5',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Es gibt mehr Sterne im Universum als Sandkoerner auf der Erde.',
    questionEn: 'There are more stars in the universe than grains of sand on Earth.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10
  },

  // Cheese (Image)
  {
    id: 'q-img-1',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches Wahrzeichen ist hier zu sehen?',
    questionEn: 'Which landmark is shown here?',
    points: 1,
    segmentIndex: 0,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg',
      alt: 'Eiffelturm'
    },
    answer: 'Eiffelturm',
    answerEn: 'Eiffel Tower'
  },
  {
    id: 'q-img-2',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welche Bruecke ist das?',
    questionEn: 'Which bridge is this?',
    points: 1,
    segmentIndex: 0,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/GoldenGateBridge-001.jpg',
      alt: 'Golden Gate Bridge'
    },
    answer: 'Golden Gate Bridge'
  },
  {
    id: 'q-img-3',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches Tier ist auf dem Bild?',
    questionEn: 'Which animal is in the picture?',
    points: 2,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Koala_climbing_tree.jpg',
      alt: 'Koala'
    },
    answer: 'Koala'
  },
  {
    id: 'q-img-4',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welche Stadt ist auf diesem Skyline-Foto?',
    questionEn: 'Which city is shown in this skyline photo?',
    points: 2,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/NYC_Midtown_Skyline_at_night_-_Jan_2006_edit1.jpg',
      alt: 'New York Skyline'
    },
    answer: 'New York'
  },
  {
    id: 'q-img-5',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches Bauwerk ist das?',
    questionEn: 'Which building is this?',
    points: 2,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Sydney_Opera_House_-_Dec_2008.jpg',
      alt: 'Sydney Opera House'
    },
    answer: 'Sydney Opera House'
  },

  // Gemischte Tuete (Legacy Beispiele)
  {
    id: 'q-mixed-1',
    category: 'GemischteTuete',
    mechanic: 'sortItems',
    mixedMechanic: 'sortieren',
    question: 'Bringe die folgenden Filme nach Erscheinungsjahr in die richtige Reihenfolge.',
    questionEn: 'Sort these films by release year.',
    points: 3,
    items: ['Matrix', 'Inception', 'Jurassic Park'],
    itemsEn: ['The Matrix', 'Inception', 'Jurassic Park'],
    correctOrder: ['Jurassic Park', 'Matrix', 'Inception'],
    correctOrderEn: ['Jurassic Park', 'The Matrix', 'Inception'],
    hint: 'Aeltester zuerst',
    hintEn: 'Oldest first'
  },
  {
    id: 'q-mixed-2',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    mixedMechanic: 'eine-falsch',
    question: 'Welche dieser Sportarten gehoert NICHT zu den Olympischen Sommerspielen 2024?',
    questionEn: 'Which of these sports is NOT in the 2024 Summer Olympics?',
    points: 2,
    options: ['Skateboard', 'Sportklettern', 'Baseball', 'Surfen'],
    optionsEn: ['Skateboarding', 'Sport Climbing', 'Baseball', 'Surfing'],
    correctIndex: 2
  },
  {
    id: 'q-mixed-3',
    category: 'GemischteTuete',
    mechanic: 'trueFalse',
    mixedMechanic: 'praezise-antwort',
    question: 'In Japan gibt es mehr Haustiere als Kinder.',
    questionEn: 'In Japan there are more pets than children.',
    points: 2,
    isTrue: true
  },
  {
    id: 'q-mixed-4',
    category: 'GemischteTuete',
    mechanic: 'estimate',
    mixedMechanic: 'wer-bietet-mehr',
    question: 'Wie viele Tassen Kaffee werden weltweit pro Tag getrunken?',
    questionEn: 'How many cups of coffee are consumed worldwide per day?',
    points: 3,
    targetValue: 2_300_000_000,
    unit: 'Tassen'
  },
  {
    id: 'q-mixed-5',
    category: 'GemischteTuete',
    mechanic: 'sortItems',
    mixedMechanic: 'vier-woerter-eins',
    question: 'Bringe die folgenden Laender nach Flaeche in die richtige Reihenfolge.',
    questionEn: 'Sort these countries by area (largest to smallest).',
    points: 3,
    items: ['Kanada', 'China', 'Australien'],
    itemsEn: ['Canada', 'China', 'Australia'],
    correctOrder: ['China', 'Kanada', 'Australien'],
    correctOrderEn: ['China', 'Canada', 'Australia']
  },

  // Cozy Quiz 60 – neue Bunte Tuete Mechaniken
  {
    id: 'q-bunte-top5-1',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'TOP 5: Wer eroeffnet die Festival-Buehne zuerst?',
    questionEn: 'Top 5: Order the festival headliners by start time (early to late).',
    points: 5,
    segmentIndex: 0,
    bunteTuete: {
      kind: 'top5',
      prompt: 'Ordnet die Acts nach Startzeit: 1 = erster Auftritt, 5 = letzter.',
      items: [
        { id: 'act-lizzo', label: 'Lizzo' },
        { id: 'act-harry', label: 'Harry Styles' },
        { id: 'act-billy', label: 'Billie Eilish' },
        { id: 'act-stormzy', label: 'Stormzy' },
        { id: 'act-paramore', label: 'Paramore' }
      ],
      correctOrder: ['act-paramore', 'act-stormzy', 'act-lizzo', 'act-billy', 'act-harry'],
      scoringMode: 'position'
    }
  },
  {
    id: 'q-bunte-precision-1',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Praezisere Antwort: Wie heisst das ikonische Kunstwerk?',
    questionEn: 'Precision ladder: Name the exact artwork title.',
    points: 2,
    segmentIndex: 1,
    bunteTuete: {
      kind: 'precision',
      prompt: 'Gesucht ist der genaue deutsche oder englische Titel eines sehr bekannten Gemaeldes.',
      ladder: [
        { label: 'Exakt', acceptedAnswers: ['Die Sternennacht', 'The Starry Night'], points: 2 },
        { label: 'Nah dran', acceptedAnswers: ['Sternennacht', 'Starry Night'], points: 1 }
      ],
      similarityThreshold: 0.82
    }
  },
  {
    id: 'q-bunte-oneofeight-1',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: '8 Dinge, 1 falsch: Welche Aussage stimmt NICHT?',
    questionEn: '8 items, 1 is wrong – spot the liar.',
    points: 2,
    segmentIndex: 1,
    bunteTuete: {
      kind: 'oneOfEight',
      prompt: 'Sieben Statements stimmen, eines ist falsch.',
      statements: [
        { id: 'A', text: 'Die Donau fliesst durch Wien.' },
        { id: 'B', text: 'Der Eiffelturm war urspruenglich bunt gestrichen.' },
        { id: 'C', text: 'Tokio liegt suedlicher als Madrid.', isFalse: true },
        { id: 'D', text: 'Das Matterhorn steht an der Schweizer Grenze.' },
        { id: 'E', text: 'Sydney liegt auf der Suedhalbkugel.' },
        { id: 'F', text: 'Oslo ist die Hauptstadt von Norwegen.' },
        { id: 'G', text: 'Der Nil ist laenger als der Amazonas.' },
        { id: 'H', text: 'Die Alpen erstrecken sich ueber mehr als fuenf Laender.' }
      ],
      chooseMode: 'id'
    }
  },
  {
    id: 'q-bunte-order-1',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Ordnen: Stellt die Staedte nach Einwohnerzahl (aufsteigend) auf.',
    questionEn: 'Ordering: Sort the cities by population (ascending).',
    points: 2,
    segmentIndex: 1,
    bunteTuete: {
      kind: 'order',
      prompt: 'Waehlt das Kriterium Einwohnerzahl (aufsteigend) und ordnet die Staedte entsprechend.',
      items: [
        { id: 'city-lisbon', label: 'Lissabon' },
        { id: 'city-vienna', label: 'Wien' },
        { id: 'city-prague', label: 'Prag' },
        { id: 'city-berlin', label: 'Berlin' }
      ],
      criteriaOptions: [{ id: 'population', label: 'Einwohnerzahl (aufsteigend)', direction: 'asc' }],
      defaultCriteriaId: 'population',
      correctByCriteria: {
        population: ['city-lisbon', 'city-prague', 'city-vienna', 'city-berlin']
      },
      partialPoints: 1,
      fullPoints: 2
    }
  }
];

export const questionById = new Map(questions.map((q) => [q.id, q]));
