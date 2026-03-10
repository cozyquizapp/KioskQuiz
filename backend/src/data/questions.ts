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

  // Cheese (Image) - Fotoblitz Finale
  {
    id: 'q-img-1',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches ikonische Wahrzeichen ist hier zu sehen?',
    questionEn: 'Which iconic landmark is this?',
    points: 1,
    segmentIndex: 0,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Eiffel_Tower_from_Trocadero%2C_Paris_%282D%2C_retouched%29.jpg/1200px-Eiffel_Tower_from_Trocadero%2C_Paris_%282D%2C_retouched%29.jpg',
      alt: 'Eiffelturm Paris'
    },
    answer: 'Eiffelturm',
    answerEn: 'Eiffel Tower',
    tags: ['Fotoblitz', 'Sehenswürdigkeiten', 'Paris']
  },
  {
    id: 'q-img-2',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Erkenne dieses berühmte Bauwerk!',
    questionEn: 'Name this iconic building!',
    points: 1,
    segmentIndex: 0,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat_03.jpg/1200px-Cat_03.jpg',
      alt: 'Statue of Liberty'
    },
    answer: 'Freiheitsstatue',
    answerEn: 'Statue of Liberty',
    tags: ['Fotoblitz', 'Sehenswürdigkeiten', 'USA']
  },
  {
    id: 'q-img-3',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches berühmte Tier ist das?',
    questionEn: 'What famous animal is this?',
    points: 2,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Giant_Panda_2.jpg/1024px-Giant_Panda_2.jpg',
      alt: 'Großer Panda'
    },
    answer: 'Panda',
    answerEn: 'Panda',
    tags: ['Fotoblitz', 'Tiere', 'Asien']
  },
  {
    id: 'q-img-4',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches Wunderwerk der Architektur ist das?',
    questionEn: 'Which architectural wonder is shown?',
    points: 2,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Sydney_Opera_House_-_Dec_2008_%28edit%29.jpg/1200px-Sydney_Opera_House_-_Dec_2008_%28edit%29.jpg',
      alt: 'Sydney Opera House'
    },
    answer: 'Sydney Opera House',
    answerEn: 'Sydney Opera House',
    tags: ['Fotoblitz', 'Sehenswürdigkeiten', 'Australien']
  },
  {
    id: 'q-img-5',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Erkenne diese berühmte Brücke!',
    questionEn: 'Which famous bridge is this?',
    points: 2,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Brooklyn_Bridge_Manhattan.jpg/1200px-Brooklyn_Bridge_Manhattan.jpg',
      alt: 'Brooklyn Bridge'
    },
    answer: 'Brooklyn Bridge',
    answerEn: 'Brooklyn Bridge',
    tags: ['Fotoblitz', 'Sehenswürdigkeiten', 'USA']
  },

  // === Zusätzliche Fotoblitz Finale Bilder (für Spannungssteigerung) ===
  {
    id: 'q-blitz-1',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Dieses weltberühmte Kunstwerk - wer malte es?',
    questionEn: 'Who painted this world-famous artwork?',
    points: 3,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/24701-nature-natural-beauty.jpg/1024px-24701-nature-natural-beauty.jpg',
      alt: 'Starry Night'
    },
    answer: 'Van Gogh',
    answerEn: 'Van Gogh',
    tags: ['Fotoblitz-Finale', 'Kunst', 'Klassiker']
  },
  {
    id: 'q-blitz-2',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'In welchem Land steht dieser Monolith?',
    questionEn: 'In which country is this monolith located?',
    points: 3,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Uluru%2C_near_Alice_Springs%2C_NT%2C_07.2007.jpg/800px-Uluru%2C_near_Alice_Springs%2C_NT%2C_07.2007.jpg',
      alt: 'Uluru Australien'
    },
    answer: 'Australien',
    answerEn: 'Australia',
    tags: ['Fotoblitz-Finale', 'Natur', 'Australien']
  },
  {
    id: 'q-blitz-3',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Dieses Tier ist bekannt für sein Gift - welches Tier?',
    questionEn: 'This animal is famous for its venom - what is it?',
    points: 3,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Elaphe_quadrivirgata_01.jpg/800px-Elaphe_quadrivirgata_01.jpg',
      alt: 'Kobra Schlange'
    },
    answer: 'Kobra',
    answerEn: 'Cobra',
    tags: ['Fotoblitz-Finale', 'Tiere', 'Gefährlich']
  },
  {
    id: 'q-blitz-4',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'In welcher Stadt wurde dieses Kunstwerk erschaffen?',
    questionEn: 'In which city was this masterpiece created?',
    points: 3,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Colosseum_2020.jpg/1024px-Colosseum_2020.jpg',
      alt: 'Kolosseum Rom'
    },
    answer: 'Rom',
    answerEn: 'Rome',
    tags: ['Fotoblitz-Finale', 'Sehenswürdigkeiten', 'Italien']
  },
  {
    id: 'q-blitz-5',
    category: 'Cheese',
    mechanic: 'imageQuestion',
    question: 'Welches Land hat diesen prächtigen Palast als UNESCO Weltkulturerbe?',
    questionEn: 'Which country has this magnificent palace as UNESCO heritage?',
    points: 3,
    segmentIndex: 1,
    media: {
      type: 'image',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Taj_Mahal.jpg/1024px-Taj_Mahal.jpg',
      alt: 'Taj Mahal'
    },
    answer: 'Indien',
    answerEn: 'India',
    tags: ['Fotoblitz-Finale', 'Sehenswürdigkeiten', 'Indien']
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
    question: 'TOP 5: Meistgehoerte Artists auf Spotify (All Time)',
    questionEn: 'Top 5: Most streamed artists on Spotify (all time)',
    points: 5,
    segmentIndex: 0,
    bunteTuete: {
      kind: 'top5',
      prompt: 'Nenne bis zu 5 Artists, die weltweit die meisten Spotify-Streams haben (All Time). Reihenfolge egal.',
      items: [
        { id: 'artist-drake', label: 'Drake' },
        { id: 'artist-taylor', label: 'Taylor Swift' },
        { id: 'artist-bad-bunny', label: 'Bad Bunny' },
        { id: 'artist-weeknd', label: 'The Weeknd' },
        { id: 'artist-bieber', label: 'Justin Bieber' }
      ],
      correctOrder: ['artist-drake', 'artist-taylor', 'artist-bad-bunny', 'artist-weeknd', 'artist-bieber'],
      scoringMode: 'contains'
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
        { label: 'Exakt', acceptedAnswers: ['Die Sternennacht', 'The Starry Night'] },
        { label: 'Nah dran', acceptedAnswers: ['Sternennacht', 'Starry Night'] }
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
  },

  // --- NEUE FRAGEN (Aha-Effekt Bonus Pack) ---
  // Schaetzchen Extra (6-10)
  {
    id: 'q-est-6',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Menschen sind in der GESAMTEN Menschheitsgeschichte gestorben und beerdigt (Homo sapiens)?',
    questionEn: 'How many humans have ever been born and died in all of human history?',
    points: 2,
    segmentIndex: 1,
    targetValue: 108_000_000_000,
    unit: 'Menschen',
    tags: ['Statistik', 'Bevölkerung', 'Geschichte']
  },
  {
    id: 'q-est-7',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Welcher Prozentsatz der Ozeane haben wir ERFORSCHT?',
    questionEn: 'What percentage of the ocean have we explored?',
    points: 2,
    segmentIndex: 1,
    targetValue: 5,
    unit: '%',
    tags: ['Ozean', 'Raumfahrt', 'Aha-Effekt']
  },
  {
    id: 'q-est-8',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Filme wurden in DER GESAMTEN KINO-GESCHICHTE gedreht?',
    questionEn: 'How many feature films have been made in cinema history?',
    points: 2,
    segmentIndex: 1,
    targetValue: 2_500_000,
    unit: 'Filme',
    tags: ['Kino', 'Statistik']
  },
  {
    id: 'q-est-9',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele NEUE ZELLEN produziert der menschliche Körper PRO TAG?',
    questionEn: 'How many new cells does the human body produce per day?',
    points: 2,
    segmentIndex: 1,
    targetValue: 330_000_000_000,
    unit: 'Zellen',
    tags: ['Biologie', 'Körper', 'Science']
  },
  {
    id: 'q-est-10',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie lange braucht Licht VON DER SONNE ZUR ERDE?',
    questionEn: 'How many seconds does light take from the sun to Earth?',
    points: 1,
    segmentIndex: 0,
    targetValue: 500,
    unit: 'Sekunden',
    tags: ['Physik', 'Sonne', 'Astronomie']
  },

  // Mu-Cho Extra (6-10)
  {
    id: 'q-mc-6',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Material ist zaeher als Stahl und kommt in der Natur vor?',
    questionEn: 'What natural material is tougher than steel?',
    points: 2,
    segmentIndex: 1,
    options: ['Diamant', 'Spinnenseide', 'Perlmutt', 'Obsidian'],
    optionsEn: ['Diamond', 'Spider silk', 'Mother-of-pearl', 'Obsidian'],
    correctIndex: 1,
    tags: ['Aha-Effekt', 'Natur', 'Materialwissenschaft']
  },
  {
    id: 'q-mc-7',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Tier hat 9 Gehirne?',
    questionEn: 'Which animal has 9 brains?',
    points: 2,
    segmentIndex: 1,
    options: ['Octopus', 'Seestern', 'Schnecke', 'Qualle'],
    optionsEn: ['Octopus', 'Starfish', 'Snail', 'Jellyfish'],
    correctIndex: 0,
    tags: ['Tiere', 'Neurologie', 'Aha-Effekt']
  },
  {
    id: 'q-mc-8',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welche FRUCHT ist botanisch kein Obst?',
    questionEn: 'Which "fruit" is botanically NOT a fruit?',
    points: 2,
    segmentIndex: 1,
    options: ['Erdbeere', 'Tomate', 'Banane', 'Apfel'],
    optionsEn: ['Strawberry', 'Tomato', 'Banana', 'Apple'],
    correctIndex: 0,
    tags: ['Botanik', 'Ueberschneidung', 'Aha-Effekt']
  },
  {
    id: 'q-mc-9',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welcher US-Präsident hatte eine schwarze Katze namens Mittens?',
    questionEn: 'Which U.S. President had a black cat named Mittens?',
    points: 1,
    segmentIndex: 0,
    options: ['Barack Obama', 'Bill Clinton', 'Ronald Reagan', 'George W. Bush'],
    optionsEn: ['Barack Obama', 'Bill Clinton', 'Ronald Reagan', 'George W. Bush'],
    correctIndex: 1,
    tags: ['Trivial', 'USA', 'History']
  },
  {
    id: 'q-mc-10',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Tier kann NICHT rückwärts gehen?',
    questionEn: 'Which animal cannot walk backwards?',
    points: 1,
    segmentIndex: 0,
    options: ['Kangaroo', 'Elephant', 'Ostrich', 'Walking Stick'],
    optionsEn: ['Kangaroo', 'Elephant', 'Ostrich', 'Walking Stick'],
    correctIndex: 0,
    tags: ['Tiere', 'Bewegung', 'Symbolik']
  },

  // Stimmt's Extra (6-10)
  {
    id: 'q-tf-6',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Kühe haben beste Freunde und leiden unter Trennungen.',
    questionEn: 'Cows have best friends and suffer from separation.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Tierkunde', 'Aha-Effekt', 'Wissenschaft']
  },
  {
    id: 'q-tf-7',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Honig ist das einzige Lebensmittel das über 3000 Jahre haltbar ist.',
    questionEn: 'Honey is the only food that never expires and lasts 3000+ years.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Chemie', 'Konservierung', 'Aha-Effekt']
  },
  {
    id: 'q-tf-8',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Es gibt mehr Sterne im Universum als Sandkörner auf allen Erden zusammen.',
    questionEn: 'There are more stars in the universe than grains of sand on Earth.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Astronomie', 'Kontraintuitivität', 'Mathe']
  },
  {
    id: 'q-tf-9',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Menschen sind die einzigen Tiere die weinen können.',
    questionEn: 'Humans are the only animals that can cry.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Biologie', 'Tiere', 'Emotionen']
  },
  {
    id: 'q-tf-10',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Der menschliche Körper hat mehr Atome als es Sterne im Universum gibt.',
    questionEn: 'The human body has more atoms than there are stars in the universe.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Physik', 'Mathe', 'Aha-Effekt']
  },

  // Cheese Extra (6-10)
  {
    id: 'q-cheese-6',
    category: 'Cheese',
    mechanic: 'multipleChoice',
    question: 'Welches Land hat das längste Wort in seinem Namen?',
    questionEn: 'Which country has the longest word in its name?',
    points: 1,
    segmentIndex: 0,
    options: ['Liechtenstein', 'Kapverdische Inseln', 'Deutschland', 'Bulgarien'],
    optionsEn: ['Liechtenstein', 'Cape Verde', 'Germany', 'Bulgaria'],
    correctIndex: 0,
    tags: ['Geographie', 'Sprache', 'Trivial']
  },
  {
    id: 'q-cheese-7',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Bananen sind technisch BEEREN, aber Erdbeeren sind KEINE Beeren.',
    questionEn: 'Bananas are technically berries, but strawberries are NOT.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Botanik', 'Ueberraschung', 'Fruechte']
  },
  {
    id: 'q-cheese-8',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Nase und Ohren wachsen dein Leben lang immer weiter.',
    questionEn: 'Your nose and ears continue to grow throughout your life.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Biologie', 'Altern', 'Koerper']
  },
  {
    id: 'q-cheese-9',
    category: 'Cheese',
    mechanic: 'multipleChoice',
    question: 'Mit welchem Wort bezeichnet man die Angst vor langen Wörtern?',
    questionEn: 'What is the phobia of long words called?',
    points: 2,
    segmentIndex: 1,
    options: ['Hippophobie', 'Glossophobie', 'Hippopotomonstrosesquippedaliophobia', 'Lexiphobie'],
    optionsEn: ['Hippophobia', 'Glossophobia', 'Hippopotomonstrosesquippedaliophobia', 'Lexiphobia'],
    correctIndex: 2,
    tags: ['Sprache', 'Meta', 'Aha-Effekt']
  },
  {
    id: 'q-cheese-10',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Jeder Mensch ist automatisch Neffe oder Nichte von mindestens einer Person.',
    questionEn: 'Everyone is automatically a nephew or niece of at least one person.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Logik', 'Familie', 'Denksport']
  },

  // === PHASE 2: Expansion to 100 Questions ===
  // Additional Schaetzchen (11-20)
  {
    id: 'q-est-11',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Haare hat ein Mensch durchschnittlich auf dem Kopf?',
    questionEn: 'How many hairs does an average human have on their head?',
    points: 1,
    segmentIndex: 0,
    targetValue: 100000,
    unit: 'Haare',
    tags: ['Biologie', 'Körper']
  },
  {
    id: 'q-est-12',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie lange braucht ein Briefumschlag durchschnittlich von A nach B in Deutschland?',
    questionEn: 'How many days does an average letter take from A to B in Germany?',
    points: 2,
    segmentIndex: 1,
    targetValue: 2,
    unit: 'Tage',
    tags: ['Logistik', 'Deutschland']
  },
  {
    id: 'q-est-13',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Menschen nutzen täglich die globale Internetverbindung?',
    questionEn: 'How many people use the internet daily worldwide?',
    points: 2,
    segmentIndex: 1,
    targetValue: 5000000000,
    unit: 'Menschen',
    tags: ['Internet', 'Statistik', 'Global']
  },
  {
    id: 'q-est-14',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Kalorien verbraucht das menschliche Gehirn pro Tag?',
    questionEn: 'How many calories does the human brain burn per day?',
    points: 2,
    segmentIndex: 1,
    targetValue: 500,
    unit: 'Kalorien',
    tags: ['Neurologie', 'Biologie', 'Energie']
  },
  {
    id: 'q-est-15',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Bäume gibt es auf der Erde insgesamt?',
    questionEn: 'How many trees are there on Earth?',
    points: 2,
    segmentIndex: 1,
    targetValue: 3000000000000,
    unit: 'Bäume',
    tags: ['Umwelt', 'Ökologie', 'Wald']
  },
  {
    id: 'q-est-16',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viel Prozent der weltweiten Sauerstoffproduktion stammt aus dem Meer?',
    questionEn: 'What percentage of global oxygen production comes from the ocean?',
    points: 2,
    segmentIndex: 1,
    targetValue: 70,
    unit: '%',
    tags: ['Ozean', 'Umwelt', 'Überraschung']
  },
  {
    id: 'q-est-17',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Insekten gibt es auf der Erde für jeden Menschen?',
    questionEn: 'How many insects are there on Earth for every human?',
    points: 2,
    segmentIndex: 1,
    targetValue: 1400000000,
    unit: 'Insekten pro Person',
    tags: ['Biologie', 'Insekten', 'Verhältnisse']
  },
  {
    id: 'q-est-18',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Menschen sind derzeit in einer Flugzeugkabine in der Luft?',
    questionEn: 'How many people are airborne in commercial flights right now?',
    points: 2,
    segmentIndex: 1,
    targetValue: 1000000,
    unit: 'Menschen',
    tags: ['Luftfahrt', 'Raumfahrt', 'Verkehr']
  },
  {
    id: 'q-est-19',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viel Wasser verbraucht die Welt pro Tag für Bewässerung?',
    questionEn: 'How many liters of water are used daily for irrigation worldwide?',
    points: 2,
    segmentIndex: 1,
    targetValue: 4000000000000,
    unit: 'Liter',
    tags: ['Wasser', 'Landwirtschaft', 'Ressourcen']
  },
  {
    id: 'q-est-20',
    category: 'Schaetzchen',
    mechanic: 'estimate',
    question: 'Wie viele Pizze werden in Italien pro Jahr gegessen?',
    questionEn: 'How many pizzas are eaten per year in Italy?',
    points: 1,
    segmentIndex: 0,
    targetValue: 3000000000,
    unit: 'Pizze',
    tags: ['Essen', 'Italien', 'Kultur']
  },

  // Additional Mu-Cho (11-20)
  {
    id: 'q-mc-11',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches ist das älteste noch funktionierende Wissenschaftsmuseum der Welt?',
    questionEn: 'What is the oldest still-functioning science museum in the world?',
    points: 2,
    segmentIndex: 1,
    options: ['Deutsches Museum München', 'Science Museum London', 'Musée des Arts et Métiers Paris', 'Royal Institution London'],
    optionsEn: ['German Museum Munich', 'Science Museum London', 'Arts and Crafts Museum Paris', 'Royal Institution London'],
    correctIndex: 2,
    tags: ['Geschichte', 'Museen', 'Wissenschaft']
  },
  {
    id: 'q-mc-12',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Land verwendet das Symbol ☪ in seiner Flagge?',
    questionEn: 'Which country features the ☪ symbol in its flag?',
    points: 2,
    segmentIndex: 1,
    options: ['Türkei', 'Tunesien', 'Marokko', 'Irak'],
    optionsEn: ['Turkey', 'Tunisia', 'Morocco', 'Iraq'],
    correctIndex: 2,
    tags: ['Geographie', 'Flaggen', 'Symbole']
  },
  {
    id: 'q-mc-13',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welcher Künstler schnitt sich selbst ein Ohr ab?',
    questionEn: 'Which artist cut off his own ear?',
    points: 1,
    segmentIndex: 0,
    options: ['Pablo Picasso', 'Vincent van Gogh', 'Salvador Dalí', 'Frida Kahlo'],
    optionsEn: ['Pablo Picasso', 'Vincent van Gogh', 'Salvador Dalí', 'Frida Kahlo'],
    correctIndex: 1,
    tags: ['Kunst', 'Geschichte', 'Klassiker']
  },
  {
    id: 'q-mc-14',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welcher Fluss ist der längste Europas?',
    questionEn: 'Which river is the longest in Europe?',
    points: 1,
    segmentIndex: 0,
    options: ['Donau', 'Wolga', 'Rhein', 'Dnepr'],
    optionsEn: ['Danube', 'Volga', 'Rhine', 'Dnieper'],
    correctIndex: 1,
    tags: ['Geographie', 'Flüsse', 'Europa']
  },
  {
    id: 'q-mc-15',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Tier kann mit geschlossenem Mund kauen?',
    questionEn: 'Which animal can chew with its mouth closed?',
    points: 2,
    segmentIndex: 1,
    options: ['Pferd', 'Kuh', 'Krokodil', 'Kaninchen'],
    optionsEn: ['Horse', 'Cow', 'Crocodile', 'Rabbit'],
    correctIndex: 3,
    tags: ['Tiere', 'Anatomie', 'Aha-Effekt']
  },
  {
    id: 'q-mc-16',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welche Farbe ist Grün und Rot zugleich in der Natur normalerweise nicht?',
    questionEn: 'Which natural object is rarely both green and red?',
    points: 1,
    segmentIndex: 0,
    options: ['Tomate', 'Wassermelone', 'Apfel', 'Paprika'],
    optionsEn: ['Tomato', 'Watermelon', 'Apple', 'Pepper'],
    correctIndex: 1,
    tags: ['Botanik', 'Farben', 'Natur']
  },
  {
    id: 'q-mc-17',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Wer war die erste Person die eine Zeitschrift für Kinder veröffentlichte?',
    questionEn: 'Who published the first children\'s magazine?',
    points: 2,
    segmentIndex: 1,
    options: ['Johann Pestalozzi', 'Jean-Jacques Rousseau', 'Bertolt Brecht', 'Erich Kästner'],
    optionsEn: ['Johann Pestalozzi', 'Jean-Jacques Rousseau', 'Bertolt Brecht', 'Erich Kästner'],
    correctIndex: 1,
    tags: ['Literatur', 'Geschichte', 'Bildung']
  },
  {
    id: 'q-mc-18',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welcher Kontinent hat die meisten Länder?',
    questionEn: 'Which continent has the most countries?',
    points: 1,
    segmentIndex: 0,
    options: ['Asien', 'Afrika', 'Amerika', 'Europa'],
    optionsEn: ['Asia', 'Africa', 'America', 'Europe'],
    correctIndex: 1,
    tags: ['Geographie', 'Länder', 'Afrika']
  },
  {
    id: 'q-mc-19',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Mineral ist der Hauptbestandteil von Diamanten?',
    questionEn: 'What mineral is the main component of diamonds?',
    points: 1,
    segmentIndex: 0,
    options: ['Graphit', 'Kohlenstoff', 'Silizium', 'Zirconium'],
    optionsEn: ['Graphite', 'Carbon', 'Silicon', 'Zirconium'],
    correctIndex: 1,
    tags: ['Chemie', 'Mineralien', 'Edelsteine']
  },
  {
    id: 'q-mc-20',
    category: 'Mu-Cho',
    mechanic: 'multipleChoice',
    question: 'Welches Organ regeneriert sich am schnellsten in der menschlicher Körper?',
    questionEn: 'Which organ regenerates fastest in the human body?',
    points: 2,
    segmentIndex: 1,
    options: ['Leber', 'Haut', 'Magenschleimhaut', 'Nervenzellen'],
    optionsEn: ['Liver', 'Skin', 'Stomach lining', 'Nerve cells'],
    correctIndex: 2,
    tags: ['Biologie', 'Körper', 'Regeneration']
  },

  // Additional Stimmts (11-20)
  {
    id: 'q-tf-11',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Ein Gorilla ist stärker als 20 Menschen.',
    questionEn: 'A gorilla is stronger than 20 humans.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Tiere', 'Kraft', 'Überraschung']
  },
  {
    id: 'q-tf-12',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Schlangen haben Augenlider.',
    questionEn: 'Snakes have eyelids.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Reptilien', 'Tiere', 'Anatomie']
  },
  {
    id: 'q-tf-13',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Rein chemisch betrachtet ist Wasser ein Öl.',
    questionEn: 'Chemically, water is technically an oil.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Chemie', 'Definitionen', 'Falschinformation']
  },
  {
    id: 'q-tf-14',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Venus ist heißer als Merkur, obwohl sie weiter von der Sonne entfernt ist.',
    questionEn: 'Venus is hotter than Mercury despite being farther from the Sun.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Astronomie', 'Planeten', 'Atmosphäre']
  },
  {
    id: 'q-tf-15',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Der menschliche Körper produziert jeden Tag eine neue Magenschleimhaut.',
    questionEn: 'The human body produces a new stomach lining every day.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Biologie', 'Körper', 'Regeneration']
  },
  {
    id: 'q-tf-16',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Flamingos sind von Natur aus rosa.',
    questionEn: 'Flamingos are naturally pink.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Tiere', 'Farben', 'Ernährung']
  },
  {
    id: 'q-tf-17',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Das menschliche Auge kann infrarote Strahlen sehen.',
    questionEn: 'The human eye can see infrared rays.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Sinne', 'Physik', 'Optik']
  },
  {
    id: 'q-tf-18',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Champagner ist eine Wein-Sorte, kein Champagner.',
    questionEn: 'Champagne can only be made in the Champagne region of France.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Recht', 'Wein', 'Geographie']
  },
  {
    id: 'q-tf-19',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Papageien können das ganze Alphabet aufsagen.',
    questionEn: 'Parrots can recite the entire alphabet.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Tiere', 'Kommunikation', 'Mythos']
  },
  {
    id: 'q-tf-20',
    category: 'Stimmts',
    mechanic: 'betting',
    question: 'Pflanzen haben auch ein Nervensystem.',
    questionEn: 'Plants also have a nervous system.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Botanik', 'Biologie', 'Kommunikation']
  },

  // Additional Cheese / Image (11-20)
  {
    id: 'q-cheese-11',
    category: 'Cheese',
    mechanic: 'multipleChoice',
    question: 'Welches Material ist teurer als Gold?',
    questionEn: 'Which material is more expensive than gold?',
    points: 2,
    segmentIndex: 1,
    options: ['Platin', 'Uranium', 'Rhodium', 'Alle der drei'],
    optionsEn: ['Platinum', 'Uranium', 'Rhodium', 'All three'],
    correctIndex: 3,
    tags: ['Materialien', 'Chemie', 'Wert']
  },
  {
    id: 'q-cheese-12',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Ein Känguru kann nicht rückwärts hüpfen.',
    questionEn: 'A kangaroo cannot hop backwards.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Tiere', 'Bewegung', 'Symbolik']
  },
  {
    id: 'q-cheese-13',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Wassermelonen sind zu 92% Wasser.',
    questionEn: 'Watermelons are 92% water.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Botanik', 'Früchte', 'Zusammensetzung']
  },
  {
    id: 'q-cheese-14',
    category: 'Cheese',
    mechanic: 'multipleChoice',
    question: 'Welches Tier schläft immer mit einem Auge offen?',
    questionEn: 'Which animal sleeps with one eye always open?',
    points: 2,
    segmentIndex: 1,
    options: ['Fisch', 'Delfin', 'Vogel', 'Alle der drei'],
    optionsEn: ['Fish', 'Dolphin', 'Bird', 'All three'],
    correctIndex: 3,
    tags: ['Tiere', 'Schlaf', 'Neurologie']
  },
  {
    id: 'q-cheese-15',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Tinte ist im Wasser gelöst, nicht in Wasser suspendiert.',
    questionEn: 'Ink dissolves in water as a solution, not a suspension.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Chemie', 'Definitionen', 'Lösungen']
  },
  {
    id: 'q-cheese-16',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Ein Blitzschlag trifft den gleichen Ort nicht zweimal.',
    questionEn: 'Lightning never strikes the same place twice.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Meteorologie', 'Mythos', 'Wissenschaft']
  },
  {
    id: 'q-cheese-17',
    category: 'Cheese',
    mechanic: 'multipleChoice',
    question: 'Welches Element kommt im menschlichen Körper am häufigsten vor?',
    questionEn: 'Which element is most abundant in the human body?',
    points: 1,
    segmentIndex: 0,
    options: ['Kohlenstoff', 'Sauerstoff', 'Stickstoff', 'Wasserstoff'],
    optionsEn: ['Carbon', 'Oxygen', 'Nitrogen', 'Hydrogen'],
    correctIndex: 1,
    tags: ['Chemie', 'Körper', 'Elemente']
  },
  {
    id: 'q-cheese-18',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Der Lebenszyklus einer Mücke dauert weniger als ein Monat.',
    questionEn: 'A mosquito\'s life cycle is less than a month.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Insekten', 'Biologie', 'Lebenszyklus']
  },
  {
    id: 'q-cheese-19',
    category: 'Cheese',
    mechanic: 'multipleChoice',
    question: 'Welches Tier hat die längste Schwangerschaft?',
    questionEn: 'Which animal has the longest pregnancy?',
    points: 2,
    segmentIndex: 1,
    options: ['Elefant', 'Wal', 'Giraffe', 'Nilpferd'],
    optionsEn: ['Elephant', 'Whale', 'Giraffe', 'Hippopotamus'],
    correctIndex: 1,
    tags: ['Tiere', 'Reproduktion', 'Rekorde']
  },
  {
    id: 'q-cheese-20',
    category: 'Cheese',
    mechanic: 'betting',
    question: 'Gold kann von Hand gestreckt werden zu einem dünnen Blatt ohne zu brechen.',
    questionEn: 'Gold can be hammered into a thin sheet without breaking.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Chemie', 'Materialien', 'Metallurgie']
  },

  // Additional GemischteTüete / Mixed (21-30)
  {
    id: 'q-mixed-6',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Welche Disney-Princess kam NICHT aus Europa?',
    questionEn: 'Which Disney Princess is NOT from Europe?',
    points: 2,
    segmentIndex: 1,
    options: ['Schneewittchen', 'Rapunzel', 'Moana', 'Arielle'],
    optionsEn: ['Snow White', 'Rapunzel', 'Moana', 'Ariel'],
    correctIndex: 2,
    tags: ['Disney', 'Populärkultur', 'Geographie']
  },
  {
    id: 'q-mixed-7',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Polar Bears haben schwarze Haut unter ihrem weißen Fell.',
    questionEn: 'Polar bears have black skin under their white fur.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Tiere', 'Biologie', 'Fell']
  },
  {
    id: 'q-mixed-8',
    category: 'GemischteTuete',
    mechanic: 'estimate',
    question: 'Wie viele Jahre vergehen zwischen Ossietzky und Heute?',
    questionEn: 'Carl von Ossietzky won the Nobel Peace Prize in which year?',
    points: 2,
    segmentIndex: 1,
    targetValue: 1936,
    unit: 'Jahr',
    tags: ['Geschichte', 'Nobelpreis', 'Deutschland']
  },
  {
    id: 'q-mixed-9',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Welcher Kontinent ist gleichzeitig ein Land?',
    questionEn: 'Which continent is also a country?',
    points: 1,
    segmentIndex: 0,
    options: ['Europa', 'Afrika', 'Australien', 'Asien'],
    optionsEn: ['Europe', 'Africa', 'Australia', 'Asia'],
    correctIndex: 2,
    tags: ['Geographie', 'Politik', 'Definitionen']
  },
  {
    id: 'q-mixed-10',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Koalas sind größer als Pandas.',
    questionEn: 'Koalas are bigger than pandas.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Tiere', 'Größe', 'Größenvergleich']
  },
  {
    id: 'q-mixed-11',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Wie viele Seiten hat ein Würfel?',
    questionEn: 'How many sides does a cube have?',
    points: 1,
    segmentIndex: 0,
    options: ['4', '6', '8', '12'],
    optionsEn: ['4', '6', '8', '12'],
    correctIndex: 1,
    tags: ['Geometrie', 'Mathe', 'Formen']
  },
  {
    id: 'q-mixed-12',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Schnecken haben Zähne.',
    questionEn: 'Snails have teeth.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Mollusken', 'Anatomie', 'Überraschung']
  },
  {
    id: 'q-mixed-13',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Welches Land hat die längste Küstenlinie?',
    questionEn: 'Which country has the longest coastline?',
    points: 2,
    segmentIndex: 1,
    options: ['Indonesien', 'Norwegen', 'Kanada', 'Russland'],
    optionsEn: ['Indonesia', 'Norway', 'Canada', 'Russia'],
    correctIndex: 2,
    tags: ['Geographie', 'Küsten', 'Länder']
  },
  {
    id: 'q-mixed-14',
    category: 'GemischteTuete',
    mechanic: 'estimate',
    question: 'Wie viele Hochzeiten finden weltweit pro TAG statt?',
    questionEn: 'How many weddings occur worldwide per day?',
    points: 2,
    segmentIndex: 1,
    targetValue: 350000,
    unit: 'Hochzeiten',
    tags: ['Statistik', 'Global', 'Kultur']
  },
  {
    id: 'q-mixed-15',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Ein Kamel kann lange Zeit ohne Wasser leben, weil es Wasser in seinem Höcker speichert.',
    questionEn: 'Camels can survive long without water because the hump stores water.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Tiere', 'Mythos', 'Physiologie']
  },

  // Additional Questions to reach 100 (16-25 of mixed)
  {
    id: 'q-mixed-16',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Welches Tier ist farbenblind?',
    questionEn: 'Which animal is color blind?',
    points: 1,
    segmentIndex: 0,
    options: ['Hund', 'Katze', 'Stier', 'Delfin'],
    optionsEn: ['Dog', 'Cat', 'Bull', 'Dolphin'],
    correctIndex: 2,
    tags: ['Tiere', 'Sinne', 'Mythos']
  },
  {
    id: 'q-mixed-17',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Ein Basketball hüpft höher, wenn er vor Gebrauch im Gefrierschrank war.',
    questionEn: 'A basketball bounces higher if cooled in the freezer first.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Physik', 'Sport', 'Kälte']
  },
  {
    id: 'q-mixed-18',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Welches Gas nehmen wir NOT mit unserer Atmung auf?',
    questionEn: 'Which gas does NOT enter our lungs when we breathe?',
    points: 2,
    segmentIndex: 1,
    options: ['Stickstoff', 'Sauerstoff', 'Neon', 'Kohlendioxid'],
    optionsEn: ['Nitrogen', 'Oxygen', 'Neon', 'Carbon Dioxide'],
    correctIndex: 2,
    tags: ['Biologie', 'Atmung', 'Chemie']
  },
  {
    id: 'q-mixed-19',
    category: 'GemischteTuete',
    mechanic: 'estimate',
    question: 'Wie lange dauert es bis die Sonne aufgeht (von ersten Licht bis vollständig sichtbar)?',
    questionEn: 'How many minutes from first light to full sunrise?',
    points: 2,
    segmentIndex: 1,
    targetValue: 3,
    unit: 'Minuten',
    tags: ['Astronomie', 'Zeit', 'Optik']
  },
  {
    id: 'q-mixed-20',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Es gibt mehr Welt Länder mit X im Namen als Länder mit Q.',
    questionEn: 'There are more countries with X in their name than with Q.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 1,
    pointsPool: 10,
    tags: ['Geographie', 'Länder', 'Buchstaben']
  },
  {
    id: 'q-mixed-21',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Welchen Fleck hat ein Marienkäfer nicht?',
    questionEn: 'Which spot is NOT found on a ladybug?',
    points: 1,
    segmentIndex: 0,
    options: ['Kopf', 'Flügel', 'Bauch', 'Beine'],
    optionsEn: ['Head', 'Wings', 'Belly', 'Legs'],
    correctIndex: 2,
    tags: ['Insekten', 'Tiere', 'Anatomie']
  },
  {
    id: 'q-mixed-22',
    category: 'GemischteTuete',
    mechanic: 'estimate',
    question: 'Wie lange kann ein Mensch ohne Sauerstoff überleben?',
    questionEn: 'How many minutes can a human survive without oxygen?',
    points: 2,
    segmentIndex: 1,
    targetValue: 6,
    unit: 'Minuten',
    tags: ['Biologie', 'Körper', 'Extreme']
  },
  {
    id: 'q-mixed-23',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Die Anzahl der Wörter auf Englisch ist größer als auf Deutsch.',
    questionEn: 'English has more words than German.',
    points: 2,
    segmentIndex: 1,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Sprache', 'Lexikon', 'Kultur']
  },
  {
    id: 'q-mixed-24',
    category: 'GemischteTuete',
    mechanic: 'multipleChoice',
    question: 'Welches Tier kann am längsten Luft anhalten?',
    questionEn: 'Which animal can hold its breath the longest?',
    points: 2,
    segmentIndex: 1,
    options: ['Alligator', 'Schildkröte', 'Elefant', 'Seele'],
    optionsEn: ['Alligator', 'Turtle', 'Elephant', 'Seal'],
    correctIndex: 3,
    tags: ['Tiere', 'Rekorde', 'Meere']
  },
  {
    id: 'q-mixed-25',
    category: 'GemischteTuete',
    mechanic: 'betting',
    question: 'Das Wort "Queue" hat die meisten stummen Buchstaben aller englischen Wörter.',
    questionEn: '"Queue" has the most silent letters of any English word.',
    points: 1,
    segmentIndex: 0,
    options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
    optionsEn: ['True', 'False', 'Not sure'],
    correctIndex: 0,
    pointsPool: 10,
    tags: ['Sprache', 'Linguistik', 'Trivia']
  },

  // === Bunte Tüte: Ordnen-Fragen ===
  {
    id: 'q-order-1',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Ordnen: Städte von Nord nach Süd',
    questionEn: 'Order: Cities from North to South',
    points: 2,
    segmentIndex: 0,
    tags: ['Geographie', 'Europa', 'Ordnen'],
    bunteTuete: {
      kind: 'order',
      prompt: 'Ordnet die Städte von der nördlichsten zur südlichsten.',
      items: [
        { id: 'oslo', label: 'Oslo' },
        { id: 'berlin', label: 'Berlin' },
        { id: 'paris', label: 'Paris' },
        { id: 'madrid', label: 'Madrid' }
      ],
      criteriaOptions: [{ id: 'north-south', label: 'Nord → Süd', direction: 'asc' }],
      defaultCriteriaId: 'north-south',
      correctByCriteria: {
        'north-south': ['oslo', 'berlin', 'paris', 'madrid']
      },
      partialPoints: 1,
      fullPoints: 2
    }
  },
  {
    id: 'q-order-2',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Ordnen: Promis nach Geburtsjahr (älteste zuerst)',
    questionEn: 'Order: Celebrities by birth year (oldest first)',
    points: 2,
    segmentIndex: 0,
    tags: ['Promis', 'Pop-Kultur', 'Ordnen'],
    bunteTuete: {
      kind: 'order',
      prompt: 'Ordnet die Promis vom ältesten zum jüngsten.',
      items: [
        { id: 'obama', label: 'Barack Obama' },
        { id: 'leo', label: 'Leonardo DiCaprio' },
        { id: 'gaga', label: 'Lady Gaga' },
        { id: 'billie', label: 'Billie Eilish' }
      ],
      criteriaOptions: [{ id: 'age', label: 'Älteste zuerst', direction: 'asc' }],
      defaultCriteriaId: 'age',
      correctByCriteria: {
        age: ['obama', 'leo', 'gaga', 'billie']
      },
      partialPoints: 1,
      fullPoints: 2
    }
  },
  {
    id: 'q-order-3',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Ordnen: Berge nach Höhe (höchster zuerst)',
    questionEn: 'Order: Mountains by height (tallest first)',
    points: 2,
    segmentIndex: 1,
    tags: ['Geographie', 'Natur', 'Ordnen'],
    bunteTuete: {
      kind: 'order',
      prompt: 'Ordnet die Berge vom höchsten zum niedrigsten.',
      items: [
        { id: 'everest', label: 'Mount Everest' },
        { id: 'k2', label: 'K2' },
        { id: 'kili', label: 'Kilimanjaro' },
        { id: 'montblanc', label: 'Mont Blanc' }
      ],
      criteriaOptions: [{ id: 'height', label: 'Höchster zuerst', direction: 'desc' }],
      defaultCriteriaId: 'height',
      correctByCriteria: {
        height: ['everest', 'k2', 'kili', 'montblanc']
      },
      partialPoints: 1,
      fullPoints: 2
    }
  },
  {
    id: 'q-order-4',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Ordnen: Hits nach Erscheinungsjahr (ältester zuerst)',
    questionEn: 'Order: Hits by release year (oldest first)',
    points: 2,
    segmentIndex: 1,
    tags: ['Musik', 'Pop-Kultur', 'Ordnen'],
    bunteTuete: {
      kind: 'order',
      prompt: 'Ordnet die Songs nach ihrem Erscheinungsjahr, ältester zuerst.',
      items: [
        { id: 'bohemian', label: 'Bohemian Rhapsody' },
        { id: 'smells', label: 'Smells Like Teen Spirit' },
        { id: 'shape', label: 'Shape of You' },
        { id: 'blinding', label: 'Blinding Lights' }
      ],
      criteriaOptions: [{ id: 'year', label: 'Ältester zuerst', direction: 'asc' }],
      defaultCriteriaId: 'year',
      correctByCriteria: {
        year: ['bohemian', 'smells', 'shape', 'blinding']
      },
      partialPoints: 1,
      fullPoints: 2
    }
  },
  {
    id: 'q-order-5',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Ordnen: Planeten nach Entfernung von der Sonne (nächster zuerst)',
    questionEn: 'Order: Planets by distance from the Sun (closest first)',
    points: 2,
    segmentIndex: 0,
    tags: ['Astronomie', 'Weltraum', 'Ordnen'],
    bunteTuete: {
      kind: 'order',
      prompt: 'Ordnet die Planeten vom sonnenächsten zum sonnenfernsten.',
      items: [
        { id: 'venus', label: 'Venus' },
        { id: 'erde', label: 'Erde' },
        { id: 'merkur', label: 'Merkur' },
        { id: 'mars', label: 'Mars' }
      ],
      criteriaOptions: [{ id: 'distance', label: 'Nächster zur Sonne zuerst', direction: 'asc' }],
      defaultCriteriaId: 'distance',
      correctByCriteria: {
        distance: ['merkur', 'venus', 'erde', 'mars']
      },
      partialPoints: 1,
      fullPoints: 2
    }
  },

  // === Bunte Tüte: Top 5 ===
  {
    id: 'q-top5-2',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'TOP 5: Bevölkerungsreichste Länder der Welt',
    questionEn: 'TOP 5: Most populous countries in the world',
    points: 5,
    segmentIndex: 0,
    tags: ['Geographie', 'Bevölkerung', 'Top5'],
    bunteTuete: {
      kind: 'top5',
      prompt: 'Nennt die 5 Länder mit den meisten Einwohnern. Reihenfolge egal.',
      items: [
        { id: 'india', label: 'Indien' },
        { id: 'china', label: 'China' },
        { id: 'usa', label: 'USA' },
        { id: 'indonesia', label: 'Indonesien' },
        { id: 'pakistan', label: 'Pakistan' }
      ],
      correctOrder: ['india', 'china', 'usa', 'indonesia', 'pakistan'],
      scoringMode: 'contains'
    }
  },
  {
    id: 'q-top5-3',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'TOP 5: Meistverkaufte Videospiele aller Zeiten',
    questionEn: 'TOP 5: Best-selling video games of all time',
    points: 5,
    segmentIndex: 1,
    tags: ['Gaming', 'Pop-Kultur', 'Top5'],
    bunteTuete: {
      kind: 'top5',
      prompt: 'Nennt 5 der meistverkauften Videospiele aller Zeiten. Reihenfolge egal.',
      items: [
        { id: 'minecraft', label: 'Minecraft' },
        { id: 'gta5', label: 'GTA V' },
        { id: 'tetris', label: 'Tetris' },
        { id: 'wii-sports', label: 'Wii Sports' },
        { id: 'pubg', label: 'PUBG' }
      ],
      correctOrder: ['minecraft', 'gta5', 'tetris', 'wii-sports', 'pubg'],
      scoringMode: 'contains'
    }
  },
  {
    id: 'q-top5-4',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'TOP 5: Längste Flüsse der Welt',
    questionEn: 'TOP 5: Longest rivers in the world',
    points: 5,
    segmentIndex: 0,
    tags: ['Geographie', 'Natur', 'Top5'],
    bunteTuete: {
      kind: 'top5',
      prompt: 'Nennt die 5 längsten Flüsse der Welt. Reihenfolge egal.',
      items: [
        { id: 'nil', label: 'Nil' },
        { id: 'amazon', label: 'Amazonas' },
        { id: 'yangtze', label: 'Yangtze' },
        { id: 'mississippi', label: 'Mississippi' },
        { id: 'jenissei', label: 'Jenissei' }
      ],
      correctOrder: ['nil', 'amazon', 'yangtze', 'mississippi', 'jenissei'],
      scoringMode: 'contains'
    }
  },

  // === Bunte Tüte: Precision (Ort-Zoom) ===
  {
    id: 'q-precision-2',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Präzision: Wo steht das Taj Mahal?',
    questionEn: 'Precision: Where is the Taj Mahal located?',
    points: 2,
    segmentIndex: 0,
    tags: ['Geographie', 'Sehenswürdigkeiten', 'Präzision'],
    bunteTuete: {
      kind: 'precision',
      prompt: 'Wo steht das Taj Mahal? Je genauer, desto besser. Das Team mit der präzisesten richtigen Antwort gewinnt.',
      ladder: [
        { label: 'Kontinent', acceptedAnswers: ['Asien', 'Asia'] },
        { label: 'Land', acceptedAnswers: ['Indien', 'India'] },
        { label: 'Stadt', acceptedAnswers: ['Agra'] }
      ],
      similarityThreshold: 0.8
    }
  },
  {
    id: 'q-precision-3',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Präzision: Wo liegt Machu Picchu?',
    questionEn: 'Precision: Where is Machu Picchu located?',
    points: 2,
    segmentIndex: 1,
    tags: ['Geographie', 'Sehenswürdigkeiten', 'Präzision'],
    bunteTuete: {
      kind: 'precision',
      prompt: 'Wo liegt Machu Picchu? Je genauer, desto besser. Das Team mit der präzisesten richtigen Antwort gewinnt.',
      ladder: [
        { label: 'Kontinent', acceptedAnswers: ['Südamerika', 'South America'] },
        { label: 'Land', acceptedAnswers: ['Peru'] },
        { label: 'Region', acceptedAnswers: ['Cusco', 'Cuzco'] }
      ],
      similarityThreshold: 0.8
    }
  },
  {
    id: 'q-precision-4',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: 'Präzision: Wo steht das Kolosseum?',
    questionEn: 'Precision: Where is the Colosseum located?',
    points: 2,
    segmentIndex: 0,
    tags: ['Geographie', 'Sehenswürdigkeiten', 'Präzision'],
    bunteTuete: {
      kind: 'precision',
      prompt: 'Wo steht das Kolosseum? Je genauer, desto besser. Das Team mit der präzisesten richtigen Antwort gewinnt.',
      ladder: [
        { label: 'Kontinent', acceptedAnswers: ['Europa', 'Europe'] },
        { label: 'Land', acceptedAnswers: ['Italien', 'Italy'] },
        { label: 'Stadt', acceptedAnswers: ['Rom', 'Rome'] }
      ],
      similarityThreshold: 0.8
    }
  },

  // === Bunte Tüte: One of Eight ===
  {
    id: 'q-oneofeight-2',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: '8 Tierfakten – welches stimmt NICHT?',
    questionEn: '8 animal facts – which one is FALSE?',
    points: 2,
    segmentIndex: 0,
    tags: ['Tiere', 'Biologie', 'OneOfEight'],
    bunteTuete: {
      kind: 'oneOfEight',
      prompt: 'Sieben Statements stimmen, eines ist falsch.',
      statements: [
        { id: 'A', text: 'Flamingos werden durch ihre Nahrung rosa.' },
        { id: 'B', text: 'Oktopusse haben drei Herzen.' },
        { id: 'C', text: 'Eine Gruppe Krähen heißt "Murder".' },
        { id: 'D', text: 'Haie sind die einzigen Fische ohne Knochen.' },
        { id: 'E', text: 'Elefanten können nicht springen.' },
        { id: 'F', text: 'Delphine schlafen mit einem Auge offen.' },
        { id: 'G', text: 'Schnecken können bis zu 3 Jahre schlafen.' },
        { id: 'H', text: 'Haie müssen ständig schwimmen, sonst sterben sie.', isFalse: true }
      ],
      chooseMode: 'id'
    }
  },
  {
    id: 'q-oneofeight-3',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: '8 Weltrekorde – welcher stimmt NICHT?',
    questionEn: '8 world records – which one is FALSE?',
    points: 2,
    segmentIndex: 1,
    tags: ['Rekorde', 'Weltrekorde', 'OneOfEight'],
    bunteTuete: {
      kind: 'oneOfEight',
      prompt: 'Sieben Rekorde sind echt, einer ist erfunden.',
      statements: [
        { id: 'A', text: 'Der größte Buchstabe der Welt ist in der Atacama-Wüste.' },
        { id: 'B', text: 'Der längste Bart einer Frau war über 25 cm lang.' },
        { id: 'C', text: 'Das teuerste Buch der Welt wurde für 30 Mio. Dollar verkauft.' },
        { id: 'D', text: 'Der schnellste Mensch läuft 100m in 9,58 Sekunden.' },
        { id: 'E', text: 'Das größte Puzzle hatte über 40.000 Teile.' },
        { id: 'F', text: 'Die älteste Katze wurde 38 Jahre alt.', isFalse: true },
        { id: 'G', text: 'Der lauteste Schrei wurde mit 129 dB gemessen.' },
        { id: 'H', text: 'Die längste Fingernägel einer Frau waren zusammen über 8 Meter lang.' }
      ],
      chooseMode: 'id'
    }
  },
  {
    id: 'q-oneofeight-4',
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    question: '8 Aussagen über das Internet – welche stimmt NICHT?',
    questionEn: '8 internet facts – which one is FALSE?',
    points: 2,
    segmentIndex: 1,
    tags: ['Technologie', 'Internet', 'OneOfEight'],
    bunteTuete: {
      kind: 'oneOfEight',
      prompt: 'Sieben Fakten über das Internet sind wahr, einer ist falsch.',
      statements: [
        { id: 'A', text: 'Mehr als 4 Milliarden Menschen nutzen das Internet.' },
        { id: 'B', text: 'Täglich werden über 300 Milliarden E-Mails verschickt.' },
        { id: 'C', text: 'Das erste Foto im Internet zeigte eine Band.' },
        { id: 'D', text: 'Google wurde 1998 gegründet.' },
        { id: 'E', text: 'Jeden Tag werden über 500 Stunden Video auf YouTube hochgeladen.' },
        { id: 'F', text: 'Das erste Tweet war: "Hello, World!"', isFalse: true },
        { id: 'G', text: 'Wikipedia hat über 60 Millionen Artikel in allen Sprachen.' },
        { id: 'H', text: 'Das Darknet macht nur ca. 5% des gesamten Internets aus.' }
      ],
      chooseMode: 'id'
    }
  }
];

export const questionById = new Map(questions.map((q) => [q.id, q]));
