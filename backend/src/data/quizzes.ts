import { QuizTemplate, QuizCategory, QuizBlitzTheme } from '../../../shared/quizTypes';
import { questions } from './questions';

// Hilfsfunktion: hole 5 Fragen pro Kategorie, mische optional
const pickFivePerCategory = (): Record<QuizCategory, string[]> => {
  const byCat: Record<QuizCategory, string[]> = {
    Schaetzchen: [],
    'Mu-Cho': [],
    Stimmts: [],
    Cheese: [],
    GemischteTuete: []
  };

  questions.forEach((q) => {
    byCat[q.category].push(q.id);
  });

  (Object.keys(byCat) as QuizCategory[]).forEach((cat) => {
    if (byCat[cat].length < 5) {
      throw new Error(`Nicht genug Fragen für Kategorie ${cat} (mind. 5 benötigt)`);
    }
    byCat[cat] = byCat[cat].slice(0, 5);
  });

  return byCat;
};

const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const defaultBlitzPool: QuizBlitzTheme[] = [
  {
    id: 'blitz-cities',
    title: 'Städte-Silhouetten',
    items: [
      { id: 'blitz-cities-1', prompt: 'Skyline mit Eiffelturm', answer: 'Paris', aliases: ['Stadt der Liebe'] },
      { id: 'blitz-cities-2', prompt: 'Wolkenkratzer mit Empire State Building', answer: 'New York', aliases: ['NYC'] },
      { id: 'blitz-cities-3', prompt: 'Opernhaus am Hafen', answer: 'Sydney' },
      { id: 'blitz-cities-4', prompt: 'Kolosseum im Sonnenuntergang', answer: 'Rom' },
      { id: 'blitz-cities-5', prompt: 'Brandenburger Tor bei Nacht', answer: 'Berlin' }
    ]
  },
  {
    id: 'blitz-snacks',
    title: 'Snack Attack',
    items: [
      { id: 'blitz-snacks-1', prompt: 'Stapeln aus dünnen Kartoffelscheiben', answer: 'Chips', aliases: ['Kartoffelchips'] },
      { id: 'blitz-snacks-2', prompt: 'Schokoladencreme im Glas mit Löffel', answer: 'Nutella' },
      { id: 'blitz-snacks-3', prompt: 'Frisch gebackene Brezn', answer: 'Brezel', aliases: ['Brezn'] },
      { id: 'blitz-snacks-4', prompt: 'Popcorn im Kinoeimer', answer: 'Popcorn' },
      { id: 'blitz-snacks-5', prompt: 'Gebäck mit rosa Zuckerguss', answer: 'Donut', aliases: ['Doughnut'] }
    ]
  },
  {
    id: 'blitz-songs',
    title: 'Song Lyrics',
    items: [
      { id: 'blitz-songs-1', prompt: '"Is this the real life, is this just fantasy?"', answer: 'Bohemian Rhapsody', aliases: ['Queen'] },
      { id: 'blitz-songs-2', prompt: '"Cause baby you\'re a firework"', answer: 'Firework', aliases: ['Katy Perry'] },
      { id: 'blitz-songs-3', prompt: '"We don\'t talk about..."', answer: 'Bruno', aliases: ['Encanto'] },
      { id: 'blitz-songs-4', prompt: '"Shake it off, shake it off"', answer: 'Shake It Off' },
      { id: 'blitz-songs-5', prompt: '"I\'m gonna swing from the chandelier"', answer: 'Chandelier' }
    ]
  }
];

const defaultPotatoThemes = [
  'Street-Food-Klassiker',
  'Streaming-Highlights',
  '80er-Hits',
  'Urlaubsregionen in Europa',
  'Gameshow-Legenden'
];

const buildBlitzPool = (quizId: string, themes: QuizBlitzTheme[]): QuizBlitzTheme[] =>
  themes.map((theme) => ({
    id: `${quizId}-${theme.id}`,
    title: theme.title,
    items: theme.items.map((item, itemIdx) => ({
      id: `${quizId}-${theme.id}-${itemIdx + 1}`,
      prompt: item.prompt,
      mediaUrl: item.mediaUrl,
      answer: item.answer,
      aliases: item.aliases
    }))
  }));

const cozyQuiz60QuestionIds: string[] = [
  'q-est-1',
  'q-mc-1',
  'q-tf-1',
  'q-img-1',
  'q-mc-2',
  'q-est-2',
  'q-bunte-top5-1',
  'q-img-2',
  'q-mc-3',
  'q-tf-2',
  'q-est-3',
  'q-mc-4',
  'q-img-3',
  'q-bunte-precision-1',
  'q-tf-3',
  'q-img-4',
  'q-bunte-oneofeight-1',
  'q-est-4',
  'q-bunte-order-1',
  'q-img-5'
];

const rotateLineup = (offset: number): string[] => {
  const len = cozyQuiz60QuestionIds.length;
  const norm = ((offset % len) + len) % len;
  return [...cozyQuiz60QuestionIds.slice(norm), ...cozyQuiz60QuestionIds.slice(0, norm)];
};

const cozyLineupClassic = [...cozyQuiz60QuestionIds];
const cozyLineupFresh = rotateLineup(4);
const cozyLineupPop = rotateLineup(7);
const cozyLineupHamburg = rotateLineup(2);

const blitzUrbanCreatives: QuizBlitzTheme[] = [
  {
    id: 'urban-art',
    title: 'Urban Art & Icons',
    items: [
      { id: 'urban-art-1', prompt: 'Bunte Ballon-Graffitis auf einer grauen Wand', answer: 'Banksy', aliases: ['Banksy Street Art'] },
      { id: 'urban-art-2', prompt: 'Sticker mit dem Schriftzug “Obey”', answer: 'Shepard Fairey', aliases: ['OBEY'] },
      { id: 'urban-art-3', prompt: 'Bunter Bär mit Kopfhörer vor Betonwand', answer: 'Berlin Buddy Bär', aliases: ['Buddy Bear'] },
      { id: 'urban-art-4', prompt: 'Spiegelnde Kugel-Skulptur im Park', answer: 'Cloud Gate', aliases: ['Bean', 'Chicago Bean'] },
      { id: 'urban-art-5', prompt: 'Längste Open-Air-Galerie an einer Fluss-Promenade', answer: 'East Side Gallery', aliases: ['Berliner Mauer'] }
    ]
  },
  {
    id: 'urban-food',
    title: 'Street-Food-Spotter',
    items: [
      { id: 'urban-food-1', prompt: 'Gerollte Teigtasche mit Kimchi und Glasnudeln', answer: 'Kimbap', aliases: ['Korean Sushi'] },
      { id: 'urban-food-2', prompt: 'Gelbes Mangodessert mit Klebreis', answer: 'Mango Sticky Rice', aliases: ['Sticky Rice'] },
      { id: 'urban-food-3', prompt: 'Knuspriges Gebäckhorn aus Portugal', answer: 'Pastel de Nata', aliases: ['Pasteis de Nata'] },
      { id: 'urban-food-4', prompt: 'Gefülltes Brot mit Falafel und Sesamsoße', answer: 'Sabich', aliases: ['Sabih'] },
      { id: 'urban-food-5', prompt: 'Neonpinkes Getränk mit Basilikumsamen', answer: 'Falooda', aliases: ['Faluda'] }
    ]
  },
  {
    id: 'urban-sounds',
    title: 'City Soundtrack',
    items: [
      { id: 'urban-sounds-1', prompt: '“Concrete jungle where dreams are made of”', answer: 'Empire State of Mind', aliases: ['Alicia Keys', 'Jay-Z'] },
      { id: 'urban-sounds-2', prompt: '“I left my heart…”', answer: 'San Francisco', aliases: ['Tony Bennett'] },
      { id: 'urban-sounds-3', prompt: '“I\'m shipping up to...”', answer: 'Boston', aliases: ['Dropkick Murphys'] },
      { id: 'urban-sounds-4', prompt: '“Streets of...”', answer: 'Philadelphia', aliases: ['Bruce Springsteen'] },
      { id: 'urban-sounds-5', prompt: '“Viva...”', answer: 'Las Vegas', aliases: ['Elvis Presley'] }
    ]
  }
];

const blitzPopCulture: QuizBlitzTheme[] = [
  {
    id: 'pop-stream',
    title: 'Streaming Gesichter',
    items: [
      { id: 'pop-stream-1', prompt: 'Hexe mit rotem Hut vor Retrofarbe', answer: 'Wanda Maximoff', aliases: ['Scarlet Witch'] },
      { id: 'pop-stream-2', prompt: 'Mandarine farbene Raumanzugfigur mit Baby', answer: 'The Mandalorian', aliases: ['Din Djarin'] },
      { id: 'pop-stream-3', prompt: 'Teenager mit Cello und schwarzem Kleid', answer: 'Wednesday Addams', aliases: ['Wednesday'] },
      { id: 'pop-stream-4', prompt: 'Schachbrett und rothaarige Protagonistin', answer: 'Beth Harmon', aliases: ['Queens Gambit'] },
      { id: 'pop-stream-5', prompt: 'Pinkes Schild mit “Hawkins Scoops”', answer: 'Scoops Ahoy', aliases: ['Stranger Things'] }
    ]
  },
  {
    id: 'pop-merch',
    title: 'Nostalgie-Merch',
    items: [
      { id: 'pop-merch-1', prompt: 'Plastikhandy, das wie Kaubonbon aussieht', answer: 'Furby Phone', aliases: ['Furby'] },
      { id: 'pop-merch-2', prompt: 'Handheld mit Pixelmonster', answer: 'Tamagotchi' },
      { id: 'pop-merch-3', prompt: 'Rollschuhe mit Neonstreifen', answer: 'Heelys', aliases: ['Heely Schuh'] },
      { id: 'pop-merch-4', prompt: 'Schlüsselanhänger mit Mini-Skateboard', answer: 'Tech Deck' },
      { id: 'pop-merch-5', prompt: 'Buntes Klick-Armband', answer: 'Slap Bracelet', aliases: ['Snap Bracelet'] }
    ]
  },
  {
    id: 'pop-lyrics',
    title: '90s Lyrics',
    items: [
      { id: 'pop-lyrics-1', prompt: '"If you wanna be my lover"', answer: 'Wannabe', aliases: ['Spice Girls'] },
      { id: 'pop-lyrics-2', prompt: '"Hit me baby one more time"', answer: '...Baby One More Time', aliases: ['Britney Spears'] },
      { id: 'pop-lyrics-3', prompt: '"Tell me why, ain\'t nothin but a heartache"', answer: 'I Want It That Way', aliases: ['Backstreet Boys'] },
      { id: 'pop-lyrics-4', prompt: '"I\'m a Barbie girl, in a Barbie world"', answer: 'Barbie Girl', aliases: ['Aqua'] },
      { id: 'pop-lyrics-5', prompt: '"I don\'t want no scrub"', answer: 'No Scrubs', aliases: ['TLC'] }
    ]
  }
];

const blitzHamburgMoments: QuizBlitzTheme[] = [
  {
    id: 'hamburg-spots',
    title: 'Hamburg Spots',
    items: [
      { id: 'hamburg-spots-1', prompt: 'Wellblech-Konzertsaal in Hafencity', answer: 'Elbphilharmonie', aliases: ['Elphi'] },
      { id: 'hamburg-spots-2', prompt: 'Vergnügungsmeile mit rotem Neon', answer: 'Reeperbahn' },
      { id: 'hamburg-spots-3', prompt: 'Miniaturenwelt in Speicherstadt', answer: 'Miniatur Wunderland', aliases: ['Miniaturwunderland'] },
      { id: 'hamburg-spots-4', prompt: 'Grüne Parkschale mit See', answer: 'Planten un Blomen', aliases: ['Planten un Blomen Park'] },
      { id: 'hamburg-spots-5', prompt: 'Backstein-Kontorhaus mit Spitze', answer: 'Chilehaus' }
    ]
  },
  {
    id: 'hamburg-food',
    title: 'Hamburg Food',
    items: [
      { id: 'hamburg-food-1', prompt: 'Fischbrötchen mit Matjes', answer: 'Matjes Brötchen', aliases: ['Fischbrötchen'] },
      { id: 'hamburg-food-2', prompt: 'Süßes rundes Schmalzgebäck', answer: 'Schmalzkuchen', aliases: ['Mutzen'] },
      { id: 'hamburg-food-3', prompt: 'Kaffee mit Rum und Sahne', answer: 'Pharisäer', aliases: ['Pharisaeer'] },
      { id: 'hamburg-food-4', prompt: 'Kartoffel-Karotten-Eintopf', answer: 'Himmel und Erde', aliases: ['Himmel und Äd'] },
      { id: 'hamburg-food-5', prompt: 'Schrippe mit Frikadelle', answer: 'Frikadellenbrötchen', aliases: ['Bulette Brötchen'] }
    ]
  },
  {
    id: 'hamburg-music',
    title: 'Hamburg Music',
    items: [
      { id: 'hamburg-music-1', prompt: 'Band mit Song “Auf nach Wuppertal”', answer: 'Fettes Brot' },
      { id: 'hamburg-music-2', prompt: '“Nur nach vorne gehen”', answer: 'Jan Delay', aliases: ['Jan Eißfeldt'] },
      { id: 'hamburg-music-3', prompt: '“Eisern Union” Sänger', answer: 'Udo Lindenberg' },
      { id: 'hamburg-music-4', prompt: 'Club-Ikone mit blauem Logo', answer: 'Große Freiheit 36', aliases: ['Grosse Freiheit 36'] },
      { id: 'hamburg-music-5', prompt: 'Mädchentrio mit “Die Gedanken sind frei”', answer: 'Tic Tac Toe' }
    ]
  }
];

const potatoPoolClassic = [
  'Street-Food-Klassiker',
  'Streaming-Highlights',
  '80er-Hits',
  'Urlaubsregionen in Europa',
  'Gameshow-Legenden',
  'Weltrekorde',
  'Legendäre Duette',
  'Museen Europas',
  'Craft-Beer-Sorten',
  'Deutsche Sprichwörter',
  'Retro-Spielkonsolen',
  'Südamerikanische Städte',
  'Modetrends der 2000er',
  'Berühmte Cafés',
  'Eissorten des Jahres'
];

const potatoPoolWinter = [
  'Winterdrinks',
  'Holiday Movies',
  'Skiorte Alpen',
  'Nordische Mythen',
  'Brettspiele Klassiker',
  'Festtags-Desserts',
  'Cozy Serien',
  'Schlittenhunderassen',
  'Winter-Sportgeräte',
  'Kandierte Snacks',
  'Lebkuchen-Varianten',
  'Skandinavische Städte',
  'Polarlichter Hotspots',
  'Wintersport-Legenden'
];

const potatoPoolPop = [
  'Streaming Hits',
  'TikTok Trends',
  'Marvel Charaktere',
  'Oscargekrönte Filme',
  'Boybands',
  'Girlgroups',
  'Fashion Labels',
  'Memes der 2010er',
  'Reality-TV Paare',
  'Berlin Clubs',
  'Festival Headliner',
  'Streetwear Brands',
  'Hitserien der 90er',
  'Gaming-Franchises'
];

const potatoPoolHamburg = [
  'Speicherstadt Orte',
  'Hamburger Museen',
  'Hamburger Hafen',
  'Kaffeehäuser',
  'Stadtteile',
  'Fischgerichte',
  'Plattdeutsche Wörter',
  'Reeperbahn-Clubs',
  'Elbe Strände',
  'Kaffeespezialitäten',
  'Hamburger Unternehmen',
  'Brücken der Stadt',
  'Parks und Grünflächen',
  'Musicalbühnen',
  'Sehenswürdigkeiten Umland'
];
const buildCozyQuiz60 = (
  mode: 'ordered' | 'random',
  overrides?: {
    id?: string;
    name?: string;
    meta?: Record<string, unknown>;
    blitzPool?: QuizBlitzTheme[];
    potatoPool?: string[];
    questionIds?: string[];
  }
): QuizTemplate => {
  const orderedList = mode === 'ordered' ? [...cozyQuiz60QuestionIds] : shuffle(cozyQuiz60QuestionIds);
  const requestedIds = overrides?.questionIds?.length === 20 ? overrides.questionIds : orderedList;
  const templateId =
    overrides?.id || (mode === 'ordered' ? 'cozy-quiz-60' : 'cozy-quiz-60-random');
  return {
    id: templateId,
    name: overrides?.name || (mode === 'ordered' ? 'Cozy Quiz 60' : 'Cozy Quiz 60 (Random)'),
    mode,
    questionIds: requestedIds,
    meta: {
      description: '20-Fragen-Template für Cozy Quiz 60',
      defaultTimer: 60,
      language: 'both',
      ...overrides?.meta
    },
    blitz: { pool: buildBlitzPool(templateId, overrides?.blitzPool || defaultBlitzPool) },
    potatoPool: overrides?.potatoPool ?? defaultPotatoThemes,
    enableBingo: false
  };
};

const buildQuiz = (id: string, name: string, mode: 'ordered' | 'random'): QuizTemplate => {
  const cat = pickFivePerCategory();
  const ordered = [
    ...cat.Schaetzchen,
    ...cat['Mu-Cho'],
    ...cat.Stimmts,
    ...cat.Cheese,
    ...cat.GemischteTuete
  ];
  const questionIds = mode === 'random' ? shuffle(ordered) : ordered;
  return {
    id,
    name,
    mode,
    questionIds,
    blitz: { pool: buildBlitzPool(id, defaultBlitzPool) },
    potatoPool: defaultPotatoThemes
  };
};

export const defaultQuizzes: QuizTemplate[] = [
  buildCozyQuiz60('ordered', {
    id: 'cozy-quiz-60-2025-01-12',
    name: 'Cozy Quiz 60 #1 – 12.01.2026',
    meta: { date: Date.parse('2026-01-12'), description: 'Klassischer Auftakt im Januar' },
    questionIds: cozyLineupClassic,
    blitzPool: defaultBlitzPool,
    potatoPool: potatoPoolClassic
  }),
  buildCozyQuiz60('ordered', {
    id: 'cozy-quiz-60-2025-01-26',
    name: 'Cozy Quiz 60 #2 – 26.01.2026',
    meta: { date: Date.parse('2026-01-26'), description: 'Frischer Mix mit Fokus auf Musik & Bilder' },
    questionIds: cozyLineupFresh,
    blitzPool: blitzUrbanCreatives,
    potatoPool: potatoPoolWinter
  }),
  buildCozyQuiz60('ordered', {
    id: 'cozy-quiz-60-popculture-special',
    name: 'Cozy Quiz 60 – Popkultur Special',
    meta: { date: Date.parse('2026-02-02'), description: 'Streaming, Nostalgie und Popkultur' },
    questionIds: cozyLineupPop,
    blitzPool: blitzPopCulture,
    potatoPool: potatoPoolPop
  }),
  buildCozyQuiz60('ordered', {
    id: 'cozy-quiz-60-hamburg-light',
    name: 'Cozy Quiz 60 – Hamburg Light',
    meta: { date: Date.parse('2026-02-14'), description: 'Nordlichter Edition mit Hamburg Flavor' },
    questionIds: cozyLineupHamburg,
    blitzPool: blitzHamburgMoments,
    potatoPool: potatoPoolHamburg
  }),
  buildCozyQuiz60('ordered'),
  buildCozyQuiz60('random'),
  buildQuiz('quiz-1-ordered', 'Quiz 1 (Legacy geordnet)', 'ordered'), // TODO(LEGACY): Altbestand, migrieren
  buildQuiz('quiz-1-random', 'Quiz 1 (Legacy randomisiert)', 'random')
];

export const quizById = new Map(defaultQuizzes.map((q) => [q.id, q]));
