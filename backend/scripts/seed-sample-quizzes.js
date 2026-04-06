/**
 * Seed 2 sample quiz drafts into the database.
 *
 * Usage:  node backend/scripts/seed-sample-quizzes.js
 *
 * The drafts are inserted via the public API (POST /api/qq/drafts)
 * so validation rules apply. The API base URL can be set via API_BASE
 * environment variable (default: http://localhost:3001).
 */

const API = process.env.API_BASE || 'http://localhost:3001';

// ─── Quiz 1: Weltreise-Quiz (Geography & Culture) ──────────────────────────
const weltreiseQuiz = {
  id: 'sample-weltreise',
  title: '🌍 Weltreise-Quiz',
  phases: 3,
  language: 'both',
  questions: [
    // ── Phase 1 ──────────────────────────────────────────────────────────────
    {
      id: 'wr-p1-q0',
      category: 'SCHAETZCHEN',
      phaseIndex: 1,
      questionIndexInPhase: 0,
      text: 'Wie viele Länder gibt es auf der Welt?',
      textEn: 'How many countries are there in the world?',
      targetValue: 195,
      unit: 'Länder',
      unitEn: 'countries',
      answer: '195 (von der UNO anerkannt)',
      answerEn: '195 (recognized by the UN)',
    },
    {
      id: 'wr-p1-q1',
      category: 'MUCHO',
      phaseIndex: 1,
      questionIndexInPhase: 1,
      text: 'Welche Stadt hat die meisten Einwohner?',
      textEn: 'Which city has the most inhabitants?',
      options: ['New York', 'Tokio', 'Shanghai', 'São Paulo'],
      optionsEn: ['New York', 'Tokyo', 'Shanghai', 'São Paulo'],
      correctOptionIndex: 1,
      answer: 'Tokio',
      answerEn: 'Tokyo',
    },
    {
      id: 'wr-p1-q2',
      category: 'BUNTE_TUETE',
      phaseIndex: 1,
      questionIndexInPhase: 2,
      text: 'Nenne 5 europäische Hauptstädte!',
      textEn: 'Name 5 European capitals!',
      answer: 'Berlin, Paris, London, Madrid, Rom',
      answerEn: 'Berlin, Paris, London, Madrid, Rome',
      bunteTuete: {
        kind: 'top5',
        answers: ['Berlin', 'Paris', 'London', 'Madrid', 'Rom', 'Wien', 'Prag', 'Bern', 'Amsterdam', 'Lissabon', 'Athen', 'Oslo', 'Stockholm', 'Kopenhagen', 'Brüssel', 'Dublin', 'Helsinki', 'Warschau', 'Budapest', 'Bukarest'],
        answersEn: ['Berlin', 'Paris', 'London', 'Madrid', 'Rome', 'Vienna', 'Prague', 'Bern', 'Amsterdam', 'Lisbon', 'Athens', 'Oslo', 'Stockholm', 'Copenhagen', 'Brussels', 'Dublin', 'Helsinki', 'Warsaw', 'Budapest', 'Bucharest'],
      },
    },
    {
      id: 'wr-p1-q3',
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 1,
      questionIndexInPhase: 3,
      text: 'Welcher ist der längste Fluss der Welt?',
      textEn: 'Which is the longest river in the world?',
      options: ['Amazonas', 'Nil', 'Jangtse'],
      optionsEn: ['Amazon', 'Nile', 'Yangtze'],
      correctOptionIndex: 1,
      answer: 'Nil (ca. 6.650 km)',
      answerEn: 'Nile (approx. 6,650 km)',
    },
    {
      id: 'wr-p1-q4',
      category: 'CHEESE',
      phaseIndex: 1,
      questionIndexInPhase: 4,
      text: 'Welches berühmte Bauwerk ist das?',
      textEn: 'Which famous building is this?',
      answer: 'Kolosseum in Rom',
      answerEn: 'Colosseum in Rome',
    },

    // ── Phase 2 ──────────────────────────────────────────────────────────────
    {
      id: 'wr-p2-q0',
      category: 'SCHAETZCHEN',
      phaseIndex: 2,
      questionIndexInPhase: 0,
      text: 'Wie hoch ist der Mount Everest in Metern?',
      textEn: 'How tall is Mount Everest in metres?',
      targetValue: 8849,
      unit: 'Meter',
      unitEn: 'metres',
      answer: '8.849 Meter',
      answerEn: '8,849 metres',
    },
    {
      id: 'wr-p2-q1',
      category: 'MUCHO',
      phaseIndex: 2,
      questionIndexInPhase: 1,
      text: 'In welchem Land steht die Freiheitsstatue?',
      textEn: 'In which country is the Statue of Liberty?',
      options: ['Frankreich', 'USA', 'England', 'Kanada'],
      optionsEn: ['France', 'USA', 'England', 'Canada'],
      correctOptionIndex: 1,
      answer: 'USA (geschenkt von Frankreich)',
      answerEn: 'USA (a gift from France)',
    },
    {
      id: 'wr-p2-q2',
      category: 'BUNTE_TUETE',
      phaseIndex: 2,
      questionIndexInPhase: 2,
      text: '8 Behauptungen über die Erde — eine stimmt NICHT!',
      textEn: '8 facts about Earth — one is FALSE!',
      answer: 'Die Sahara ist die größte Wüste (falsch — Antarktis ist größer)',
      answerEn: 'The Sahara is the largest desert (false — Antarctica is larger)',
      bunteTuete: {
        kind: 'oneOfEight',
        falseIndex: 4,
        statements: [
          'Der Pazifik ist der größte Ozean',
          'Die Erde dreht sich in 24 Stunden einmal um sich selbst',
          'Der Marianengraben ist der tiefste Punkt im Meer',
          'Der Äquator teilt die Erde in Nord- und Südhalbkugel',
          'Die Sahara ist die größte Wüste der Welt',
          'Die Erde hat einen flüssigen Eisenkern',
          'Ca. 71% der Erdoberfläche sind Wasser',
          'Mount Everest ist der höchste Berg',
        ],
        statementsEn: [
          'The Pacific is the largest ocean',
          'Earth rotates once every 24 hours',
          'The Mariana Trench is the deepest point in the sea',
          'The equator divides Earth into Northern and Southern hemispheres',
          'The Sahara is the largest desert in the world',
          'Earth has a liquid iron core',
          'Approx. 71% of Earth\'s surface is water',
          'Mount Everest is the highest mountain',
        ],
      },
    },
    {
      id: 'wr-p2-q3',
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 2,
      questionIndexInPhase: 3,
      text: 'Welches Land hat die meisten Zeitzonen?',
      textEn: 'Which country has the most time zones?',
      options: ['Russland', 'Frankreich', 'USA'],
      optionsEn: ['Russia', 'France', 'USA'],
      correctOptionIndex: 1,
      answer: 'Frankreich (12 Zeitzonen inkl. Überseegebiete)',
      answerEn: 'France (12 time zones incl. overseas territories)',
    },
    {
      id: 'wr-p2-q4',
      category: 'CHEESE',
      phaseIndex: 2,
      questionIndexInPhase: 4,
      text: 'Welche Sehenswürdigkeit ist auf dem Bild?',
      textEn: 'Which landmark is in the picture?',
      answer: 'Machu Picchu',
      answerEn: 'Machu Picchu',
    },

    // ── Phase 3 (Finale) ─────────────────────────────────────────────────────
    {
      id: 'wr-p3-q0',
      category: 'SCHAETZCHEN',
      phaseIndex: 3,
      questionIndexInPhase: 0,
      text: 'Wie viele Sprachen werden weltweit gesprochen?',
      textEn: 'How many languages are spoken worldwide?',
      targetValue: 7000,
      unit: 'Sprachen',
      unitEn: 'languages',
      answer: 'Ca. 7.000 Sprachen',
      answerEn: 'Approx. 7,000 languages',
    },
    {
      id: 'wr-p3-q1',
      category: 'MUCHO',
      phaseIndex: 3,
      questionIndexInPhase: 1,
      text: 'Welches Land hat die Form eines Stiefels?',
      textEn: 'Which country is shaped like a boot?',
      options: ['Griechenland', 'Italien', 'Spanien', 'Portugal'],
      optionsEn: ['Greece', 'Italy', 'Spain', 'Portugal'],
      correctOptionIndex: 1,
      answer: 'Italien',
      answerEn: 'Italy',
    },
    {
      id: 'wr-p3-q2',
      category: 'BUNTE_TUETE',
      phaseIndex: 3,
      questionIndexInPhase: 2,
      text: 'Ordne diese Bauwerke nach Baujahr!',
      textEn: 'Sort these buildings by construction year!',
      answer: 'Pyramiden → Kolosseum → Taj Mahal → Eiffelturm',
      answerEn: 'Pyramids → Colosseum → Taj Mahal → Eiffel Tower',
      bunteTuete: {
        kind: 'order',
        items: ['Eiffelturm', 'Kolosseum', 'Pyramiden von Gizeh', 'Taj Mahal'],
        itemsEn: ['Eiffel Tower', 'Colosseum', 'Pyramids of Giza', 'Taj Mahal'],
        correctOrder: [2, 1, 3, 0],
        criteria: 'nach Baujahr (ältestes zuerst)',
        criteriaEn: 'by construction year (oldest first)',
      },
    },
    {
      id: 'wr-p3-q3',
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 3,
      questionIndexInPhase: 3,
      text: 'Wie viele Kontinente gibt es?',
      textEn: 'How many continents are there?',
      options: ['5', '6', '7'],
      optionsEn: ['5', '6', '7'],
      correctOptionIndex: 2,
      answer: '7 Kontinente',
      answerEn: '7 continents',
    },
    {
      id: 'wr-p3-q4',
      category: 'CHEESE',
      phaseIndex: 3,
      questionIndexInPhase: 4,
      text: 'Welches Wahrzeichen ist das?',
      textEn: 'Which landmark is this?',
      answer: 'Freiheitsstatue',
      answerEn: 'Statue of Liberty',
    },
  ],
};

// ─── Quiz 2: Pop-Kultur-Quiz (Music, Film, Entertainment) ──────────────────
const popKulturQuiz = {
  id: 'sample-popkultur',
  title: '🎬 Pop-Kultur-Quiz',
  phases: 3,
  language: 'both',
  questions: [
    // ── Phase 1 ──────────────────────────────────────────────────────────────
    {
      id: 'pk-p1-q0',
      category: 'SCHAETZCHEN',
      phaseIndex: 1,
      questionIndexInPhase: 0,
      text: 'Wie viele Follower hat Instagram auf Instagram?',
      textEn: 'How many followers does Instagram have on Instagram?',
      targetValue: 676000000,
      unit: 'Follower',
      unitEn: 'followers',
      answer: 'Ca. 676 Millionen',
      answerEn: 'Approx. 676 million',
    },
    {
      id: 'pk-p1-q1',
      category: 'MUCHO',
      phaseIndex: 1,
      questionIndexInPhase: 1,
      text: 'Welcher Film hat weltweit am meisten eingespielt?',
      textEn: 'Which film has the highest worldwide box office?',
      options: ['Titanic', 'Avatar', 'Avengers: Endgame', 'Star Wars: A New Hope'],
      optionsEn: ['Titanic', 'Avatar', 'Avengers: Endgame', 'Star Wars: A New Hope'],
      correctOptionIndex: 1,
      answer: 'Avatar (ca. 2,92 Mrd. $)',
      answerEn: 'Avatar (approx. $2.92 billion)',
    },
    {
      id: 'pk-p1-q2',
      category: 'BUNTE_TUETE',
      phaseIndex: 1,
      questionIndexInPhase: 2,
      text: 'Nenne 5 Marvel-Superhelden!',
      textEn: 'Name 5 Marvel superheroes!',
      answer: 'Spider-Man, Iron Man, Hulk, Thor, Captain America',
      answerEn: 'Spider-Man, Iron Man, Hulk, Thor, Captain America',
      bunteTuete: {
        kind: 'top5',
        answers: ['Spider-Man', 'Iron Man', 'Hulk', 'Thor', 'Captain America', 'Black Widow', 'Doctor Strange', 'Black Panther', 'Scarlet Witch', 'Ant-Man', 'Hawkeye', 'Wolverine', 'Deadpool'],
        answersEn: ['Spider-Man', 'Iron Man', 'Hulk', 'Thor', 'Captain America', 'Black Widow', 'Doctor Strange', 'Black Panther', 'Scarlet Witch', 'Ant-Man', 'Hawkeye', 'Wolverine', 'Deadpool'],
      },
    },
    {
      id: 'pk-p1-q3',
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 1,
      questionIndexInPhase: 3,
      text: 'Wer sang "Bohemian Rhapsody"?',
      textEn: 'Who sang "Bohemian Rhapsody"?',
      options: ['The Beatles', 'Queen', 'Led Zeppelin'],
      optionsEn: ['The Beatles', 'Queen', 'Led Zeppelin'],
      correctOptionIndex: 1,
      answer: 'Queen (Freddie Mercury)',
      answerEn: 'Queen (Freddie Mercury)',
    },
    {
      id: 'pk-p1-q4',
      category: 'CHEESE',
      phaseIndex: 1,
      questionIndexInPhase: 4,
      text: 'Aus welcher Serie stammt diese Szene?',
      textEn: 'From which series is this scene?',
      answer: 'Breaking Bad',
      answerEn: 'Breaking Bad',
    },

    // ── Phase 2 ──────────────────────────────────────────────────────────────
    {
      id: 'pk-p2-q0',
      category: 'SCHAETZCHEN',
      phaseIndex: 2,
      questionIndexInPhase: 0,
      text: 'Wie viele Harry-Potter-Bücher gibt es?',
      textEn: 'How many Harry Potter books are there?',
      targetValue: 7,
      unit: 'Bücher',
      unitEn: 'books',
      answer: '7 Bücher',
      answerEn: '7 books',
    },
    {
      id: 'pk-p2-q1',
      category: 'MUCHO',
      phaseIndex: 2,
      questionIndexInPhase: 1,
      text: 'Welche Band hat "Smells Like Teen Spirit" geschrieben?',
      textEn: 'Which band wrote "Smells Like Teen Spirit"?',
      options: ['Pearl Jam', 'Nirvana', 'Soundgarden', 'Alice in Chains'],
      optionsEn: ['Pearl Jam', 'Nirvana', 'Soundgarden', 'Alice in Chains'],
      correctOptionIndex: 1,
      answer: 'Nirvana',
      answerEn: 'Nirvana',
    },
    {
      id: 'pk-p2-q2',
      category: 'BUNTE_TUETE',
      phaseIndex: 2,
      questionIndexInPhase: 2,
      text: 'Jedes Team nennt abwechselnd einen Disney-Film! 🎬',
      textEn: 'Each team takes turns naming a Disney movie! 🎬',
      answer: 'Frozen, Lion King, Aladdin, etc.',
      answerEn: 'Frozen, The Lion King, Aladdin, etc.',
      bunteTuete: { kind: 'hotPotato' },
    },
    {
      id: 'pk-p2-q3',
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 2,
      questionIndexInPhase: 3,
      text: 'Wer spielte Jack in "Titanic"?',
      textEn: 'Who played Jack in "Titanic"?',
      options: ['Brad Pitt', 'Leonardo DiCaprio', 'Johnny Depp'],
      optionsEn: ['Brad Pitt', 'Leonardo DiCaprio', 'Johnny Depp'],
      correctOptionIndex: 1,
      answer: 'Leonardo DiCaprio',
      answerEn: 'Leonardo DiCaprio',
    },
    {
      id: 'pk-p2-q4',
      category: 'CHEESE',
      phaseIndex: 2,
      questionIndexInPhase: 4,
      text: 'Welches Videospiel ist das?',
      textEn: 'Which video game is this?',
      answer: 'Minecraft',
      answerEn: 'Minecraft',
    },

    // ── Phase 3 (Finale) ─────────────────────────────────────────────────────
    {
      id: 'pk-p3-q0',
      category: 'SCHAETZCHEN',
      phaseIndex: 3,
      questionIndexInPhase: 0,
      text: 'In welchem Jahr erschien das erste iPhone?',
      textEn: 'In which year was the first iPhone released?',
      targetValue: 2007,
      unit: '',
      unitEn: '',
      answer: '2007',
      answerEn: '2007',
    },
    {
      id: 'pk-p3-q1',
      category: 'MUCHO',
      phaseIndex: 3,
      questionIndexInPhase: 1,
      text: 'Welcher Hogwarts-Haus gehört Harry Potter an?',
      textEn: 'Which Hogwarts house does Harry Potter belong to?',
      options: ['Slytherin', 'Gryffindor', 'Hufflepuff', 'Ravenclaw'],
      optionsEn: ['Slytherin', 'Gryffindor', 'Hufflepuff', 'Ravenclaw'],
      correctOptionIndex: 1,
      answer: 'Gryffindor',
      answerEn: 'Gryffindor',
    },
    {
      id: 'pk-p3-q2',
      category: 'BUNTE_TUETE',
      phaseIndex: 3,
      questionIndexInPhase: 2,
      text: '8 Aussagen über Filme — eine ist gelogen!',
      textEn: '8 facts about movies — one is a lie!',
      answer: 'Der Weiße Hai wurde in Australien gedreht (falsch — Martha\'s Vineyard, USA)',
      answerEn: 'Jaws was filmed in Australia (false — Martha\'s Vineyard, USA)',
      bunteTuete: {
        kind: 'oneOfEight',
        falseIndex: 5,
        statements: [
          'Der Herr der Ringe wurde in Neuseeland gedreht',
          'James Bond wurde von Ian Fleming erfunden',
          'Star Wars erschien erstmals 1977',
          'Pixar machte den ersten komplett computeranimierten Film',
          'Die Matrix wurde in Sydney, Australien gedreht',
          'Der Weiße Hai wurde in Australien gedreht',
          'Walt Disney gründete sein Studio 1923',
          'Inception wurde von Christopher Nolan gedreht',
        ],
        statementsEn: [
          'Lord of the Rings was filmed in New Zealand',
          'James Bond was created by Ian Fleming',
          'Star Wars was first released in 1977',
          'Pixar made the first fully computer-animated film',
          'The Matrix was filmed in Sydney, Australia',
          'Jaws was filmed in Australia',
          'Walt Disney founded his studio in 1923',
          'Inception was directed by Christopher Nolan',
        ],
      },
    },
    {
      id: 'pk-p3-q3',
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 3,
      questionIndexInPhase: 3,
      text: 'Wie heißt die Heimatstadt von Batman?',
      textEn: 'What is Batman\'s home city called?',
      options: ['Metropolis', 'Gotham City', 'Star City'],
      optionsEn: ['Metropolis', 'Gotham City', 'Star City'],
      correctOptionIndex: 1,
      answer: 'Gotham City',
      answerEn: 'Gotham City',
    },
    {
      id: 'pk-p3-q4',
      category: 'CHEESE',
      phaseIndex: 3,
      questionIndexInPhase: 4,
      text: 'Welcher Musiker oder welche Band ist das?',
      textEn: 'Which musician or band is this?',
      answer: 'Taylor Swift',
      answerEn: 'Taylor Swift',
    },
  ],
};

// ─── Seed function ──────────────────────────────────────────────────────────
async function seed() {
  for (const quiz of [weltreiseQuiz, popKulturQuiz]) {
    console.log(`Seeding "${quiz.title}" …`);
    const res = await fetch(`${API}/api/qq/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quiz),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`  ✅ Created: ${data.id}`);
    } else {
      const text = await res.text();
      console.error(`  ❌ Failed (${res.status}): ${text}`);
      // Try updating if already exists
      const putRes = await fetch(`${API}/api/qq/drafts/${quiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quiz, updatedAt: Date.now() }),
      });
      if (putRes.ok) {
        console.log(`  ✅ Updated instead: ${quiz.id}`);
      } else {
        console.error(`  ❌ Update also failed: ${await putRes.text()}`);
      }
    }
  }
  console.log('\nDone! Access them in the QQ Builder.');
}

seed().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
