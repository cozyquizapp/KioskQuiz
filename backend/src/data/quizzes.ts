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

export const defaultBlitzPool: QuizBlitzTheme[] = [
  {
    id: 'blitz-demo-buildings',
    title: '🏗️ Berühmte Bauwerke',
    items: [
      { id: 'blitz-demo-1', prompt: 'Eiserner Turm in Paris', mediaUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', answer: 'Eiffelturm', aliases: ['Eiffel Tower', 'La Tour Eiffel'] },
      { id: 'blitz-demo-2', prompt: 'Weißes Mausoleum in Indien', mediaUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&h=300&fit=crop', answer: 'Taj Mahal', aliases: ['Agra', 'Taj'] },
      { id: 'blitz-demo-3', prompt: 'Kupferstatue mit Fackel in New York', mediaUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=300&fit=crop', answer: 'Statue of Liberty', aliases: ['Liberty Statue', 'Freedom'] },
      { id: 'blitz-demo-4', prompt: 'Steinerne Skulpturen auf einer Insel', mediaUrl: 'https://images.unsplash.com/photo-1568393691622-3ee206a5caea?w=400&h=300&fit=crop', answer: 'Osterinsel Moai', aliases: ['Easter Island', 'Moai'] },
      { id: 'blitz-demo-5', prompt: 'Große Pyramide mit Sphinx in Ägypten', mediaUrl: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=400&h=300&fit=crop', answer: 'Pyramiden von Giza', aliases: ['Great Pyramid', 'Giza'] }
    ]
  },
  {
    id: 'blitz-demo-films',
    title: '🎬 Blockbuster Poster',
    items: [
      { id: 'blitz-demo-films-1', prompt: 'Avatar mit blauen Aliens', mediaUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop', answer: 'Avatar', aliases: ['Pandora', 'James Cameron'] },
      { id: 'blitz-demo-films-2', prompt: 'Titanic sinkt im Eis', mediaUrl: 'https://images.unsplash.com/photo-1533020487191-3f96f06ce94b?w=400&h=300&fit=crop', answer: 'Titanic', aliases: ['Jack Rose', 'Schiff'] },
      { id: 'blitz-demo-films-3', prompt: 'Inception - Traum in Traum', mediaUrl: 'https://images.unsplash.com/photo-1536440936694-f32de2c6d1d5?w=400&h=300&fit=crop', answer: 'Inception', aliases: ['Nolan', 'Traum'] },
      { id: 'blitz-demo-films-4', prompt: 'Matrix - digitale grüne Welt', mediaUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop', answer: 'The Matrix', aliases: ['Neo', 'digitale Welt'] },
      { id: 'blitz-demo-films-5', prompt: 'Jurassic Park - Dinosaurier', mediaUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=300&fit=crop', answer: 'Jurassic Park', aliases: ['Dinosaurier', 'Dino'] }
    ]
  },
  {
    id: 'blitz-demo-gaming',
    title: '🎮 Gaming Icons',
    items: [
      { id: 'blitz-demo-gaming-1', prompt: 'Super Mario springt über Hindernisse', mediaUrl: 'https://images.unsplash.com/photo-1579546059361-9ac0f3c4e0f3?w=400&h=300&fit=crop', answer: 'Mario', aliases: ['Super Mario', 'Nintendo', 'Klempner'] },
      { id: 'blitz-demo-gaming-2', prompt: 'Pikachu gelbes Elektro-Pokémon', mediaUrl: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=300&fit=crop', answer: 'Pikachu', aliases: ['Pokemon', 'Elektro', 'gelb'] },
      { id: 'blitz-demo-gaming-3', prompt: 'Sonic der blaue schnelle Igel', mediaUrl: 'https://images.unsplash.com/photo-1579546059361-9ac0f3c4e0f3?w=400&h=300&fit=crop', answer: 'Sonic', aliases: ['Sonic the Hedgehog', 'Igel', 'blau'] },
      { id: 'blitz-demo-gaming-4', prompt: 'Link mit Schwert und Schild', mediaUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop', answer: 'Link', aliases: ['Zelda', 'Hylian', 'Held'] },
      { id: 'blitz-demo-gaming-5', prompt: 'Donkey Kong springt über Fässer', mediaUrl: 'https://images.unsplash.com/photo-1577720643272-265f434b4d24?w=400&h=300&fit=crop', answer: 'Donkey Kong', aliases: ['Kong', 'Affe', 'Fässer'] }
    ]
  },
  {
    id: 'blitz-demo-sports',
    title: '🏀 Sportler Silhouetten',
    items: [
      { id: 'blitz-demo-sports-1', prompt: 'Cristiano Ronaldo Fußball-Superstar', mediaUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop', answer: 'Cristiano Ronaldo', aliases: ['Ronaldo', 'CR7', 'Portugal'] },
      { id: 'blitz-demo-sports-2', prompt: 'Messi mit Nummer 10', mediaUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop', answer: 'Lionel Messi', aliases: ['Messi', 'Argentinien', 'Fußball'] },
      { id: 'blitz-demo-sports-3', prompt: 'Michael Jordan Basketball Nr. 23', mediaUrl: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=400&h=300&fit=crop', answer: 'Michael Jordan', aliases: ['Jordan', 'MJ', 'Basketball', '23'] },
      { id: 'blitz-demo-sports-4', prompt: 'Usain Bolt schnellster Sprinter', mediaUrl: 'https://images.unsplash.com/photo-1552168325-eb5ddfb8ff46?w=400&h=300&fit=crop', answer: 'Usain Bolt', aliases: ['Bolt', 'Jamaika', 'Sprint'] },
      { id: 'blitz-demo-sports-5', prompt: 'Serena Williams Tennis-Legende', mediaUrl: 'https://images.unsplash.com/photo-1554838811-e91d68c6f851?w=400&h=300&fit=crop', answer: 'Serena Williams', aliases: ['Williams', 'Tennis', 'USA'] }
    ]
  },
  {
    id: 'blitz-demo-stadiums',
    title: '🏟️ Stadion Silhouetten',
    items: [
      { id: 'blitz-demo-stadiums-1', prompt: 'Wembley Stadium in London', mediaUrl: 'https://images.unsplash.com/photo-1536502083949-ba4b1b5ff504?w=400&h=300&fit=crop', answer: 'Wembley Stadium', aliases: ['Wembley', 'England', 'Fußball'] },
      { id: 'blitz-demo-stadiums-2', prompt: 'Camp Nou Barcelona Stadion', mediaUrl: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=300&fit=crop', answer: 'Camp Nou', aliases: ['Barcelona', 'FC Barcelona', 'Spanien'] },
      { id: 'blitz-demo-stadiums-3', prompt: 'Old Trafford Manchester United', mediaUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop', answer: 'Old Trafford', aliases: ['Manchester', 'United', 'England'] },
      { id: 'blitz-demo-stadiums-4', prompt: 'Allianz Arena Bayern München rot', mediaUrl: 'https://images.unsplash.com/photo-1536502083949-ba4b1b5ff504?w=400&h=300&fit=crop', answer: 'Allianz Arena', aliases: ['Bayern', 'München', 'Deutschland'] },
      { id: 'blitz-demo-stadiums-5', prompt: 'Maracanã Rio de Janeiro Stadion', mediaUrl: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=300&fit=crop', answer: 'Maracanã', aliases: ['Rio', 'Brasilien', 'Fußball'] }
    ]
  },
  {
    id: 'blitz-demo-cars',
    title: '🏎️ Legendäre Autos',
    items: [
      { id: 'blitz-demo-cars-1', prompt: 'Ferrari Sportwagen rot', mediaUrl: 'https://images.unsplash.com/photo-1531566877142-48fcc718e61d?w=400&h=300&fit=crop', answer: 'Ferrari', aliases: ['Sportwagen', 'italienisch', 'rot'] },
      { id: 'blitz-demo-cars-2', prompt: 'Porsche 911 klassisches Design', mediaUrl: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=300&fit=crop', answer: 'Porsche 911', aliases: ['Porsche', 'Sportwagen', 'Deutschland'] },
      { id: 'blitz-demo-cars-3', prompt: 'Lamborghini Supersportwagen gelb', mediaUrl: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=400&h=300&fit=crop', answer: 'Lamborghini', aliases: ['Sportwagen', 'italienisch', 'Supersportwagen'] },
      { id: 'blitz-demo-cars-4', prompt: 'Tesla Model S elektrisch futuristisch', mediaUrl: 'https://images.unsplash.com/photo-1560958089-b8a46dd52d60?w=400&h=300&fit=crop', answer: 'Tesla Model S', aliases: ['Tesla', 'Elektroauto', 'modern'] },
      { id: 'blitz-demo-cars-5', prompt: 'Bugatti Veyron schnellster Wagen', mediaUrl: 'https://images.unsplash.com/photo-1556821552-7f41c5d440db?w=400&h=300&fit=crop', answer: 'Bugatti Veyron', aliases: ['Bugatti', 'Supersportwagen', 'schnell'] }
    ]
  },
  {
    id: 'blitz-demo-mountains',
    title: '⛰️ Berge der Welt',
    items: [
      { id: 'blitz-demo-mountains-1', prompt: 'Mount Everest höchster Berg', mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', answer: 'Mount Everest', aliases: ['Everest', 'Himalaya', 'Nepal'] },
      { id: 'blitz-demo-mountains-2', prompt: 'Matterhorn spitzer Berg Schweiz', mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', answer: 'Matterhorn', aliases: ['Schweiz', 'Alpen', 'Berg'] },
      { id: 'blitz-demo-mountains-3', prompt: 'Kilimanjaro Afrika höchster Berg', mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop', answer: 'Kilimanjaro', aliases: ['Kili', 'Tansania', 'Afrika'] },
      { id: 'blitz-demo-mountains-4', prompt: 'Mont Blanc höchster Alpenb Berg', mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', answer: 'Mont Blanc', aliases: ['Frankreich', 'Alpen', 'Europa'] },
      { id: 'blitz-demo-mountains-5', prompt: 'K2 zweithöchster Berg der Welt', mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop', answer: 'K2', aliases: ['Karakorum', 'Pakistan', 'Berg'] }
    ]
  },
  {
    id: 'blitz-demo-theater',
    title: '🎭 Theater & Opernhäuser',
    items: [
      { id: 'blitz-demo-theater-1', prompt: 'Sydney Opera House weiße Muscheln', mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', answer: 'Sydney Opera House', aliases: ['Sydney', 'Australien', 'Opern'] },
      { id: 'blitz-demo-theater-2', prompt: 'Palais Garnier Paris Oper golden', mediaUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop', answer: 'Palais Garnier', aliases: ['Paris', 'Oper', 'Frankreich'] },
      { id: 'blitz-demo-theater-3', prompt: 'Teatro alla Scala Mailand Oper', mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop', answer: 'Teatro alla Scala', aliases: ['Scala', 'Mailand', 'Italien'] },
      { id: 'blitz-demo-theater-4', prompt: 'Bolschoi Ballett Moskau Oper', mediaUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop', answer: 'Bolschoi Theater', aliases: ['Bolschoi', 'Moskau', 'Russland'] },
      { id: 'blitz-demo-theater-5', prompt: 'Apollo Theater New York Blues Jazz', mediaUrl: 'https://images.unsplash.com/photo-1503185912284-5271ff81b9a8?w=400&h=300&fit=crop', answer: 'Apollo Theater', aliases: ['Apollo', 'New York', 'USA'] }
    ]
  },
  {
    id: 'blitz-buildings',
    title: '🏢 Berühmte Gebäude (lokal)',
    items: [
      { id: 'blitz-buildings-1', prompt: 'Gotisches Meisterwerk in London', mediaUrl: '/blitz/buildings/1.jpg', answer: 'Big Ben', aliases: ['Elizabeth Tower', 'Palace of Westminster'] },
      { id: 'blitz-buildings-2', prompt: 'Weißes Mausoleum in Indien', mediaUrl: '/blitz/buildings/2.jpg', answer: 'Taj Mahal', aliases: ['Agra'] },
      { id: 'blitz-buildings-3', prompt: 'Kupferstatue im New Yorker Hafen', mediaUrl: '/blitz/buildings/3.jpg', answer: 'Statue of Liberty', aliases: ['Liberty Statue'] },
      { id: 'blitz-buildings-4', prompt: 'Bogenbrücke über die Themse', mediaUrl: '/blitz/buildings/4.jpg', answer: 'Tower Bridge', aliases: ['London Bridge'] },
      { id: 'blitz-buildings-5', prompt: 'Kathedrale mit schiefen Säulen in Barcelona', mediaUrl: '/blitz/buildings/5.jpg', answer: 'Sagrada Familia', aliases: ['Gaudí'] }
    ]
  },
  {
    id: 'blitz-films',
    title: '🎬 Blockbuster Poster (lokal)',
    items: [
      { id: 'blitz-films-1', prompt: 'Science-Fiction mit blauem humanoidem Alien', mediaUrl: '/blitz/films/1.jpg', answer: 'Avatar', aliases: ['Pandora'] },
      { id: 'blitz-films-2', prompt: 'Schiff sinkt im Eiswasser', mediaUrl: '/blitz/films/2.jpg', answer: 'Titanic', aliases: ['Jack Rose'] },
      { id: 'blitz-films-3', prompt: 'Traum in Traum in Traum', mediaUrl: '/blitz/films/3.jpg', answer: 'Inception', aliases: ['Nolan'] },
      { id: 'blitz-films-4', prompt: 'Grüne digitale Welt mit schwarzem Anzug', mediaUrl: '/blitz/films/4.jpg', answer: 'The Matrix', aliases: ['Neo'] },
      { id: 'blitz-films-5', prompt: 'Dinosaurier im modernen Park', mediaUrl: '/blitz/films/5.jpg', answer: 'Jurassic Park', aliases: ['Dino'] }
    ]
  },
  {
    id: 'blitz-gaming',
    title: '🎮 Gaming Icons (lokal)',
    items: [
      { id: 'blitz-gaming-1', prompt: 'Springender Klempner mit Schnurrbart', mediaUrl: '/blitz/gaming/1.jpg', answer: 'Mario', aliases: ['Super Mario', 'Nintendo'] },
      { id: 'blitz-gaming-2', prompt: 'Gelbes rundes Elektro-Pokémon', mediaUrl: '/blitz/gaming/2.jpg', answer: 'Pikachu', aliases: ['Pokemon'] },
      { id: 'blitz-gaming-3', prompt: 'Blauer schneller Igel mit Spikes', mediaUrl: '/blitz/gaming/3.jpg', answer: 'Sonic', aliases: ['Sonic the Hedgehog'] },
      { id: 'blitz-gaming-4', prompt: 'Grüner Held mit Schwert und Schild', mediaUrl: '/blitz/gaming/4.jpg', answer: 'Link', aliases: ['Zelda'] },
      { id: 'blitz-gaming-5', prompt: 'Brauner starker Affe in Fässern', mediaUrl: '/blitz/gaming/5.jpg', answer: 'Donkey Kong', aliases: ['Kong'] }
    ]
  },
  {
    id: 'blitz-sports',
    title: '🏀 Sportler Silhouetten (lokal)',
    items: [
      { id: 'blitz-sports-1', prompt: 'Portugiesischer Fußball-Megastar', mediaUrl: '/blitz/sports/1.jpg', answer: 'Cristiano Ronaldo', aliases: ['Ronaldo', 'CR7'] },
      { id: 'blitz-sports-2', prompt: 'Argentinischer Fußballer mit Nummer 10', mediaUrl: '/blitz/sports/2.jpg', answer: 'Messi', aliases: ['Lionel Messi'] },
      { id: 'blitz-sports-3', prompt: 'Basketball-Legende mit Nummer 23', mediaUrl: '/blitz/sports/3.jpg', answer: 'Michael Jordan', aliases: ['Jordan', 'MJ'] },
      { id: 'blitz-sports-4', prompt: 'Jamaikanischer Sprint-Weltrekordler', mediaUrl: '/blitz/sports/4.jpg', answer: 'Usain Bolt', aliases: ['Bolt'] },
      { id: 'blitz-sports-5', prompt: 'Amerikanische Tennis-Großmeisterin', mediaUrl: '/blitz/sports/5.jpg', answer: 'Serena Williams', aliases: ['Williams'] }
    ]
  },
  {
    id: 'blitz-stadiums',
    title: '🏟️ Stadion Silhouetten (lokal)',
    items: [
      { id: 'blitz-stadiums-1', prompt: 'Englisches Fußball-Tempel in London', mediaUrl: '/blitz/stadiums/1.jpg', answer: 'Wembley Stadium', aliases: ['Wembley'] },
      { id: 'blitz-stadiums-2', prompt: 'Größtes Stadion von FC Barcelona', mediaUrl: '/blitz/stadiums/2.jpg', answer: 'Camp Nou', aliases: ['Barcelona Stadium'] },
      { id: 'blitz-stadiums-3', prompt: 'Heimat von Manchester United', mediaUrl: '/blitz/stadiums/3.jpg', answer: 'Old Trafford', aliases: ['Manchester'] },
      { id: 'blitz-stadiums-4', prompt: 'Bayerns rotes Fußball-Stadion', mediaUrl: '/blitz/stadiums/4.jpg', answer: 'Allianz Arena', aliases: ['Bayern München'] },
      { id: 'blitz-stadiums-5', prompt: 'Brasilianisches Fußball-Wahrzeichen', mediaUrl: '/blitz/stadiums/5.jpg', answer: 'Maracanã', aliases: ['Rio'] }
    ]
  },
  {
    id: 'blitz-theater',
    title: '🎭 Theater & Kino',
    items: [
      { id: 'blitz-theater-1', prompt: 'Weißes muschelförmiges Gebäude am Hafen', mediaUrl: '/blitz/theater/1.jpg', answer: 'Sydney Opera House', aliases: ['Sydney Opera'] },
      { id: 'blitz-theater-2', prompt: 'Prächtiges Opernhaus in Paris', mediaUrl: '/blitz/theater/2.jpg', answer: 'Palais Garnier', aliases: ['Opera Paris'] },
      { id: 'blitz-theater-3', prompt: 'Weltberühmtes Opernhaus in Mailand', mediaUrl: '/blitz/theater/3.jpg', answer: 'Teatro alla Scala', aliases: ['La Scala'] },
      { id: 'blitz-theater-4', prompt: 'Russisches Balletttheater in Moskau', mediaUrl: '/blitz/theater/4.jpg', answer: 'Bolschoi Theater', aliases: ['Bolshoi'] },
      { id: 'blitz-theater-5', prompt: 'Legendäres Jazztheater in New York', mediaUrl: '/blitz/theater/5.jpg', answer: 'Apollo Theater', aliases: ['Apollo'] }
    ]
  },
  {
    id: 'blitz-herbs',
    title: '🌿 Kräuter',
    items: [
      { id: 'blitz-herbs-1', prompt: 'Grüne breite Blätter, italienisches Aroma', mediaUrl: '/blitz/herbs/1.jpg', answer: 'Basilikum', aliases: ['Basil'] },
      { id: 'blitz-herbs-2', prompt: 'Kleine Blätter auf dünnem Stiel, Mittelmeer', mediaUrl: '/blitz/herbs/2.jpg', answer: 'Oregano', aliases: ['Oreganum'] },
      { id: 'blitz-herbs-3', prompt: 'Feine kleine Blätter auf verholztem Stiel', mediaUrl: '/blitz/herbs/3.jpg', answer: 'Thymian', aliases: ['Thyme'] },
      { id: 'blitz-herbs-4', prompt: 'Nadelartige Blätter, intensiver Geschmack', mediaUrl: '/blitz/herbs/4.jpg', answer: 'Rosmarin', aliases: ['Rosemary'] },
      { id: 'blitz-herbs-5', prompt: 'Herzförmige grüne Blätter, erfrischend', mediaUrl: '/blitz/herbs/5.jpg', answer: 'Minze', aliases: ['Mint', 'Pfefferminze'] }
    ]
  },
  {
    id: 'blitz-mountains',
    title: '⛰️ Berge der Welt',
    items: [
      { id: 'blitz-mountains-1', prompt: 'Höchster Berg der Erde in Nepal', mediaUrl: '/blitz/mountains/1.jpg', answer: 'Mount Everest', aliases: ['Everest'] },
      { id: 'blitz-mountains-2', prompt: 'Schweizer Alpenriese mit Matterhorn', mediaUrl: '/blitz/mountains/2.jpg', answer: 'Matterhorn', aliases: ['Berg'] },
      { id: 'blitz-mountains-3', prompt: 'Vulkanischer Gipfel in Japan', mediaUrl: '/blitz/mountains/3.jpg', answer: 'Fuji', aliases: ['Mount Fuji'] },
      { id: 'blitz-mountains-4', prompt: 'Kolumbianischer schneebedeckter Andengipfel', mediaUrl: '/blitz/mountains/4.jpg', answer: 'Nevado del Ruiz', aliases: ['Ruiz'] },
      { id: 'blitz-mountains-5', prompt: 'Schwefelberg mit heißen Quellen in Island', mediaUrl: '/blitz/mountains/5.jpg', answer: 'Hekla', aliases: ['Volcano'] }
    ]
  },
  {
    id: 'blitz-cars',
    title: '🏎️ Klassische Autos',
    items: [
      { id: 'blitz-cars-1', prompt: 'Italienischer Sportwagen von Ferrari', mediaUrl: '/blitz/cars/1.jpg', answer: 'Ferrari', aliases: ['Ferrari Testarossa'] },
      { id: 'blitz-cars-2', prompt: 'Britischer Luxuswagen aus dem 20. Jh', mediaUrl: '/blitz/cars/2.jpg', answer: 'Rolls-Royce', aliases: ['Phantom'] },
      { id: 'blitz-cars-3', prompt: 'Deutscher Sportwagen aus Porsche', mediaUrl: '/blitz/cars/3.jpg', answer: 'Porsche', aliases: ['911'] },
      { id: 'blitz-cars-4', prompt: 'Amerikanischer Muskelwagen von Chevrolet', mediaUrl: '/blitz/cars/4.jpg', answer: 'Corvette', aliases: ['Stingray'] },
      { id: 'blitz-cars-5', prompt: 'Britischer Sportwagen mit keilförmiger Form', mediaUrl: '/blitz/cars/5.jpg', answer: 'Jaguar E-Type', aliases: ['E-Type'] }
    ]
  },
  {
    id: 'blitz-flags',
    title: '🚩 Länder Flaggen',
    items: [
      { id: 'blitz-flags-1', prompt: 'Rot-Gelb-Rot mit Wappenschild', mediaUrl: '/blitz/flags/1.jpg', answer: 'Österreich', aliases: ['Austria'] },
      { id: 'blitz-flags-2', prompt: 'Rot-Weiß-Rot horizontale Streifen', mediaUrl: '/blitz/flags/2.jpg', answer: 'Dänemark', aliases: ['Denmark'] },
      { id: 'blitz-flags-3', prompt: 'Rot-Weiß-Grün mit orange Rad', mediaUrl: '/blitz/flags/3.jpg', answer: 'Indien', aliases: ['India'] },
      { id: 'blitz-flags-4', prompt: 'Orange-Weiß-Grün tricolore', mediaUrl: '/blitz/flags/4.jpg', answer: 'Irland', aliases: ['Ireland'] },
      { id: 'blitz-flags-5', prompt: 'Rot-Weiß-Blau mit Kreuz', mediaUrl: '/blitz/flags/5.jpg', answer: 'Schweiz', aliases: ['Switzerland'] }
    ]
  }
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

const buildCozyQuiz60 = (
  mode: 'ordered' | 'random',
  overrides?: {
    id?: string;
    name?: string;
    meta?: Record<string, unknown>;
    blitzPool?: QuizBlitzTheme[];
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
    blitz: { pool: buildBlitzPool(id, defaultBlitzPool) }
  };
};

// WICHTIG: Haupt-Quizze werden jetzt über den Studio Builder (cozyQuizDrafts.json) erstellt!
// Hier nur noch ein minimales Demo-Quiz für Tests.
export const defaultQuizzes: QuizTemplate[] = [
  buildCozyQuiz60('ordered', {
    id: 'demo-quiz-probe',
    name: '🎯 Demo Quiz (Probe)',
    meta: { description: 'Test-Quiz für schnelle Sessions – im Builder anpassen!' },
    questionIds: cozyLineupClassic.slice(0, 5), // Nur 5 Fragen für schnelles Testen
    // Use only themes with working Unsplash images (defaultBlitzPool)
    // Hamburg themes and local /blitz/ paths don't have images yet
    blitzPool: defaultBlitzPool
  })
];

export const quizById = new Map(defaultQuizzes.map((q) => [q.id, q]));
