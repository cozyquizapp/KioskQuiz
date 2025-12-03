import { AnyQuestion } from '../../../shared/quizTypes';

// 25 Fragen: 5 pro Kategorie, mit einfachen EN-Übersetzungen
export const questions: AnyQuestion[] = [
  // Schätzchen (Estimate)
  {
    id: 'q-est-1',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Liter Wasser fasst ein olympisches Schwimmbecken?',
    questionEn: 'How many liters of water does an Olympic swimming pool hold?',
    points: 2,
    targetValue: 2_500_000,
    unit: 'Liter'
  },
  {
    id: 'q-est-2',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Treppenstufen hat der Eiffelturm (ohne Aufzug)?',
    questionEn: 'How many steps does the Eiffel Tower have (without elevator)?',
    points: 2,
    targetValue: 1665,
    unit: 'Stufen'
  },
  {
    id: 'q-est-3',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Minuten hat ein Jahr?',
    questionEn: 'How many minutes are in a year?',
    points: 1,
    targetValue: 525_600,
    unit: 'Minuten'
  },
  {
    id: 'q-est-4',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Erden passen volumetrisch in die Sonne?',
    questionEn: 'How many Earths fit by volume into the Sun?',
    points: 3,
    targetValue: 1_300_000,
    unit: 'Erden'
  },
  {
    id: 'q-est-5',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Kilometer ist die Strecke Hamburg–München (Luftlinie)?',
    questionEn: 'What is the distance Hamburg–Munich as the crow flies (km)?',
    points: 1,
    targetValue: 610,
    unit: 'km'
  },

  // Mu-Cho (Multiple Choice)
  {
    id: 'q-mc-1',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welche Stadt liegt am weitesten nördlich?',
    questionEn: 'Which city lies furthest north?',
    points: 1,
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
    options: ['Stickstoff', 'Natrium', 'Neon', 'Nickel'],
    optionsEn: ['Nitrogen', 'Sodium', 'Neon', 'Nickel'],
    correctIndex: 1
  },
  {
    id: 'q-mc-3',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welche Programmiersprache wurde 1995 veröffentlicht?',
    questionEn: 'Which programming language was released in 1995?',
    points: 1,
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
    options: ['Saturn', 'Jupiter', 'Uranus', 'Neptun'],
    optionsEn: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'],
    correctIndex: 0
  },
  {
    id: 'q-mc-5',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welcher Künstler malte „Die Sternennacht“?',
    questionEn: 'Which artist painted “The Starry Night”?',
    points: 1,
    options: ['Monet', 'van Gogh', 'Picasso', 'Klimt'],
    optionsEn: ['Monet', 'van Gogh', 'Picasso', 'Klimt'],
    correctIndex: 1
  },

  // Stimmt’s (True/False)
  {
    id: 'q-tf-1',
    category: 'Stimmts',
    mechanic: 'trueFalse',
    question: 'Die ISS umrundet die Erde in ca. 90 Minuten.',
    questionEn: 'The ISS orbits Earth in about 90 minutes.',
    points: 1,
    isTrue: true
  },
  {
    id: 'q-tf-2',
    category: 'Stimmts',
    mechanic: 'trueFalse',
    question: 'Bienen können UV-Licht sehen.',
    questionEn: 'Bees can see ultraviolet light.',
    points: 1,
    isTrue: true
  },
  {
    id: 'q-tf-3',
    category: 'Stimmts',
    mechanic: 'trueFalse',
    question: 'Der Viktoriasee ist der größte See der Welt.',
    questionEn: 'Lake Victoria is the largest lake in the world.',
    points: 1,
    isTrue: false
  },
  {
    id: 'q-tf-4',
    category: 'Stimmts',
    mechanic: 'trueFalse',
    question: 'Der Mensch hat mehr Gene als eine Tomate.',
    questionEn: 'Humans have more genes than a tomato.',
    points: 2,
    isTrue: false
  },
  {
    id: 'q-tf-5',
    category: 'Stimmts',
    mechanic: 'trueFalse',
    question: 'Es gibt mehr Sterne im Universum als Sandkörner auf der Erde.',
    questionEn: 'There are more stars in the universe than grains of sand on Earth.',
    points: 2,
    isTrue: true
  },

  // Cheese (Image)
  {
    id: 'q-img-1',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches Wahrzeichen ist hier zu sehen?',
    questionEn: 'Which landmark is shown here?',
    points: 1,
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
    question: 'Welche Brücke ist das?',
    questionEn: 'Which bridge is this?',
    points: 1,
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
    points: 1,
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
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Sydney_Opera_House_-_Dec_2008.jpg',
      alt: 'Sydney Opera House'
    },
    answer: 'Sydney Opera House'
  },

  // Gemischte Tüte
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
    hint: 'Ältester zuerst',
    hintEn: 'Oldest first'
  },
  {
    id: 'q-mixed-2',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    mixedMechanic: 'eine-falsch',
    question: 'Welche dieser Sportarten gehört NICHT zu den Olympischen Sommerspielen 2024?',
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
    question: 'Bringe die folgenden Länder nach Fläche in die richtige Reihenfolge.',
    questionEn: 'Sort these countries by area (largest to smallest).',
    points: 3,
    items: ['Kanada', 'China', 'Australien'],
    itemsEn: ['Canada', 'China', 'Australia'],
    correctOrder: ['China', 'Kanada', 'Australien'],
    correctOrderEn: ['China', 'Canada', 'Australia']
  }
];

export const questionById = new Map(questions.map((q) => [q.id, q]));
