/**
 * qqHLData.ts — Higher/Lower-Vergleichspaare für den Comeback-Mini-Game.
 *
 * Format A (kind='pair'):   Zwei vergleichbare Objekte, Frage wird automatisch
 *                           aus Labels + Unit generiert („Hat X mehr oder weniger
 *                           {unit} als Y?").
 * Format B (kind='anchor'): Fester Anker mit optionaler freier Fragetext-Formulierung
 *                           für mehr Erzähl-Flair.
 *
 * Zahlen sind Schätzwerte (Stand ~2024–2026), nicht Tagesaktuell. Gut genug für
 * eine Bar-Quiz-Atmosphäre, wo eine grobe Schätzung reicht.
 *
 * Kategorien:  'online' | 'promis' | 'sport' | 'filme' | 'geografie' | 'wirtschaft' | 'nerd'
 *
 * 2026-05-10 (Wolf-Bug 'Comeback DE-Text in EN-Spiel'): Jeder Eintrag hat jetzt
 * optionale *En-Felder (unitEn, anchorLabelEn, subjectLabelEn, customQuestionEn).
 * EN-Felder NUR gesetzt wenn sich die Übersetzung tatsächlich vom DE-Wert unter-
 * scheidet. Frontend (QQBeamerPage.ComebackView + QQTeamPage.ComebackCard) fällt
 * auf DE zurück wenn EN nicht gesetzt ist — Eigennamen wie „Cristiano Ronaldo"
 * oder „Apple" brauchen also keinen EN-Doppeleintrag.
 */

import type { QQHLPair } from '../../../shared/quarterQuizTypes';

export const QQ_HL_POOL: readonly QQHLPair[] = [
  // ── 🌐 Online & Social Media ─────────────────────────────────────────────
  { id: 'insta-ronaldo-messi', kind: 'pair', category: 'online', unit: 'Instagram-Follower', unitEn: 'Instagram followers',
    anchorLabel: 'Cristiano Ronaldo', anchorValue: 640_000_000,
    subjectLabel: 'Lionel Messi', subjectValue: 510_000_000 },
  { id: 'insta-beyonce-taylor', kind: 'pair', category: 'online', unit: 'Instagram-Follower', unitEn: 'Instagram followers',
    anchorLabel: 'Beyoncé', anchorValue: 320_000_000,
    subjectLabel: 'Taylor Swift', subjectValue: 280_000_000 },
  { id: 'yt-mrbeast-pewdiepie', kind: 'pair', category: 'online', unit: 'YouTube-Abos', unitEn: 'YouTube subscribers',
    anchorLabel: 'MrBeast', anchorValue: 370_000_000,
    subjectLabel: 'PewDiePie', subjectValue: 111_000_000 },
  { id: 'yt-tseries', kind: 'anchor', category: 'online', unit: 'YouTube-Abos', unitEn: 'YouTube subscribers',
    anchorLabel: 'T-Series (indischer Musik-Kanal)', anchorLabelEn: 'T-Series (Indian music channel)', anchorValue: 280_000_000,
    subjectLabel: 'MrBeast', subjectValue: 370_000_000,
    customQuestion: 'T-Series hat ca. 280 Mio. YouTube-Abos. Hat MrBeast mehr oder weniger?',
    customQuestionEn: 'T-Series has approx. 280 M YouTube subscribers. Does MrBeast have more or less?' },
  { id: 'tiktok-khaby-bella', kind: 'pair', category: 'online', unit: 'TikTok-Follower', unitEn: 'TikTok followers',
    anchorLabel: 'Khaby Lame', anchorValue: 162_000_000,
    subjectLabel: 'Bella Poarch', subjectValue: 93_000_000 },
  { id: 'wiki-en-de', kind: 'pair', category: 'online', unit: 'Wikipedia-Artikel', unitEn: 'Wikipedia articles',
    anchorLabel: 'Englische Wikipedia', anchorLabelEn: 'English Wikipedia', anchorValue: 6_900_000,
    subjectLabel: 'Deutsche Wikipedia', subjectLabelEn: 'German Wikipedia', subjectValue: 2_900_000 },
  { id: 'spotify-taylor-drake', kind: 'pair', category: 'online', unit: 'Monatliche Spotify-Hörer', unitEn: 'Monthly Spotify listeners',
    anchorLabel: 'Taylor Swift', anchorValue: 93_000_000,
    subjectLabel: 'Drake', subjectValue: 76_000_000 },
  { id: 'insta-kim-kylie', kind: 'pair', category: 'online', unit: 'Instagram-Follower', unitEn: 'Instagram followers',
    anchorLabel: 'Kim Kardashian', anchorValue: 360_000_000,
    subjectLabel: 'Kylie Jenner', subjectValue: 400_000_000 },
  { id: 'reddit-users', kind: 'anchor', category: 'online', unit: 'Monatliche User', unitEn: 'Monthly users',
    anchorLabel: 'Reddit', anchorValue: 1_200_000_000,
    subjectLabel: 'Pinterest', subjectValue: 500_000_000,
    customQuestion: 'Reddit hat ca. 1,2 Mrd. monatliche Nutzer. Hat Pinterest mehr oder weniger?',
    customQuestionEn: 'Reddit has approx. 1.2 bn monthly users. Does Pinterest have more or less?' },
  { id: 'fb-whatsapp-users', kind: 'pair', category: 'online', unit: 'Monatliche User (Mio)', unitEn: 'Monthly users (M)',
    anchorLabel: 'Facebook', anchorValue: 3070,
    subjectLabel: 'WhatsApp', subjectValue: 2780 },

  // ── 👥 Promis & Personen ─────────────────────────────────────────────────
  { id: 'vermogen-musk-bezos', kind: 'pair', category: 'promis', unit: 'Mrd. USD Vermögen', unitEn: 'billion USD net worth',
    anchorLabel: 'Elon Musk', anchorValue: 420,
    subjectLabel: 'Jeff Bezos', subjectValue: 240 },
  { id: 'alter-madonna-cher', kind: 'pair', category: 'promis', unit: 'Jahre alt', unitEn: 'years old',
    anchorLabel: 'Madonna', anchorValue: 67,
    subjectLabel: 'Cher', subjectValue: 79 },
  { id: 'oscars-meryl-jack', kind: 'pair', category: 'promis', unit: 'Oscar-Nominierungen', unitEn: 'Oscar nominations',
    anchorLabel: 'Meryl Streep', anchorValue: 21,
    subjectLabel: 'Jack Nicholson', subjectValue: 12 },
  { id: 'grammy-beyonce-jay', kind: 'pair', category: 'promis', unit: 'Grammy-Wins', unitEn: 'Grammy wins',
    anchorLabel: 'Beyoncé', anchorValue: 35,
    subjectLabel: 'Jay-Z', subjectValue: 24 },
  { id: 'alter-dicaprio-pitt', kind: 'pair', category: 'promis', unit: 'Jahre alt', unitEn: 'years old',
    anchorLabel: 'Leonardo DiCaprio', anchorValue: 50,
    subjectLabel: 'Brad Pitt', subjectValue: 61 },
  { id: 'vermogen-bernard-mark', kind: 'pair', category: 'promis', unit: 'Mrd. USD Vermögen', unitEn: 'billion USD net worth',
    anchorLabel: 'Bernard Arnault', anchorValue: 190,
    subjectLabel: 'Mark Zuckerberg', subjectValue: 200 },
  { id: 'alter-schwarzi-stallone', kind: 'pair', category: 'promis', unit: 'Jahre alt', unitEn: 'years old',
    anchorLabel: 'Arnold Schwarzenegger', anchorValue: 77,
    subjectLabel: 'Sylvester Stallone', subjectValue: 78 },
  { id: 'nobel-einstein-curie', kind: 'anchor', category: 'promis', unit: 'Nobelpreise', unitEn: 'Nobel Prizes',
    anchorLabel: 'Marie Curie', anchorValue: 2,
    subjectLabel: 'Albert Einstein', subjectValue: 1,
    customQuestion: 'Marie Curie hat 2 Nobelpreise gewonnen. Wie viele hat Albert Einstein — mehr oder weniger?',
    customQuestionEn: 'Marie Curie won 2 Nobel Prizes. How many did Albert Einstein win — more or less?' },

  // ── ⚽ Sport ─────────────────────────────────────────────────────────────
  { id: 'tore-ronaldo-messi', kind: 'pair', category: 'sport', unit: 'Karriere-Tore', unitEn: 'career goals',
    anchorLabel: 'Cristiano Ronaldo', anchorValue: 925,
    subjectLabel: 'Lionel Messi', subjectValue: 860 },
  { id: 'marktwert-mbappe-haaland', kind: 'pair', category: 'sport', unit: 'Mio. € Marktwert', unitEn: 'million € market value',
    anchorLabel: 'Kylian Mbappé', anchorValue: 180,
    subjectLabel: 'Erling Haaland', subjectValue: 200 },
  { id: 'stadion-barca-realmadrid', kind: 'pair', category: 'sport', unit: 'Zuschauer-Kapazität', unitEn: 'spectator capacity',
    anchorLabel: 'Camp Nou (Barcelona)', anchorValue: 99354,
    subjectLabel: 'Santiago Bernabéu (Real Madrid)', subjectValue: 81044 },
  { id: 'stadion-dortmund-bayern', kind: 'pair', category: 'sport', unit: 'Zuschauer-Kapazität', unitEn: 'spectator capacity',
    anchorLabel: 'Signal Iduna Park (Dortmund)', anchorValue: 81365,
    subjectLabel: 'Allianz Arena (Bayern)', subjectValue: 75024 },
  { id: 'cl-titel-real-milan', kind: 'pair', category: 'sport', unit: 'Champions-League-Titel', unitEn: 'Champions League titles',
    anchorLabel: 'Real Madrid', anchorValue: 15,
    subjectLabel: 'AC Milan', subjectValue: 7 },
  { id: 'wm-titel-brasilien-deutschland', kind: 'pair', category: 'sport', unit: 'WM-Titel', unitEn: 'World Cup titles',
    anchorLabel: 'Brasilien', anchorLabelEn: 'Brazil', anchorValue: 5,
    subjectLabel: 'Deutschland', subjectLabelEn: 'Germany', subjectValue: 4 },
  { id: 'nba-rings-lebron-mj', kind: 'pair', category: 'sport', unit: 'NBA-Championship-Titel', unitEn: 'NBA Championship titles',
    anchorLabel: 'LeBron James', anchorValue: 4,
    subjectLabel: 'Michael Jordan', subjectValue: 6 },
  { id: 'olympia-phelps', kind: 'anchor', category: 'sport', unit: 'Olympia-Goldmedaillen', unitEn: 'Olympic gold medals',
    anchorLabel: 'Michael Phelps', anchorValue: 23,
    subjectLabel: 'Usain Bolt', subjectValue: 8,
    customQuestion: 'Michael Phelps hat 23 Olympia-Goldmedaillen. Wie viele hat Usain Bolt?',
    customQuestionEn: 'Michael Phelps has 23 Olympic gold medals. How many does Usain Bolt have?' },
  { id: 'tennis-slams-djoko-nadal', kind: 'pair', category: 'sport', unit: 'Grand-Slam-Titel', unitEn: 'Grand Slam titles',
    anchorLabel: 'Novak Djokovic', anchorValue: 24,
    subjectLabel: 'Rafael Nadal', subjectValue: 22 },
  { id: 'f1-titel-schumi-hamilton', kind: 'pair', category: 'sport', unit: 'F1-Weltmeister-Titel', unitEn: 'F1 World Championships',
    anchorLabel: 'Michael Schumacher', anchorValue: 7,
    subjectLabel: 'Lewis Hamilton', subjectValue: 7 },

  // ── 🎬 Filme, Serien & Games ────────────────────────────────────────────
  { id: 'boxoffice-avatar-endgame', kind: 'pair', category: 'filme', unit: 'Mio. USD Einnahmen', unitEn: 'million USD box office',
    anchorLabel: 'Avatar (2009)', anchorValue: 2923,
    subjectLabel: 'Avengers: Endgame', subjectValue: 2797 },
  { id: 'boxoffice-titanic-barbie', kind: 'pair', category: 'filme', unit: 'Mio. USD Einnahmen', unitEn: 'million USD box office',
    anchorLabel: 'Titanic', anchorValue: 2257,
    subjectLabel: 'Barbie (2023)', subjectValue: 1446 },
  { id: 'imdb-godfather-shawshank', kind: 'pair', category: 'filme', unit: 'IMDb-Rating', unitEn: 'IMDb rating',
    anchorLabel: 'The Godfather', anchorValue: 9.2,
    subjectLabel: 'The Shawshank Redemption', subjectValue: 9.3 },
  { id: 'imdb-darkknight-inception', kind: 'pair', category: 'filme', unit: 'IMDb-Rating', unitEn: 'IMDb rating',
    anchorLabel: 'The Dark Knight', anchorValue: 9.0,
    subjectLabel: 'Inception', subjectValue: 8.8 },
  { id: 'budget-endgame-avatar2', kind: 'pair', category: 'filme', unit: 'Mio. USD Budget', unitEn: 'million USD budget',
    anchorLabel: 'Avengers: Endgame', anchorValue: 356,
    subjectLabel: 'Avatar 2', subjectValue: 460 },
  { id: 'minecraft-fortnite', kind: 'pair', category: 'filme', unit: 'Monatlich aktive Spieler (Mio)', unitEn: 'Monthly active players (M)',
    anchorLabel: 'Minecraft', anchorValue: 170,
    subjectLabel: 'Fortnite', subjectValue: 80 },
  { id: 'gta5-sales', kind: 'anchor', category: 'filme', unit: 'Mio. verkaufte Einheiten', unitEn: 'million units sold',
    anchorLabel: 'GTA V', anchorValue: 205,
    subjectLabel: 'Minecraft', subjectValue: 300,
    customQuestion: 'GTA V wurde ca. 205 Mio. mal verkauft. Hat Minecraft mehr oder weniger verkauft?',
    customQuestionEn: 'GTA V has sold approx. 205 M units. Has Minecraft sold more or less?' },
  { id: 'imdb-office-breakingbad', kind: 'pair', category: 'filme', unit: 'IMDb-Rating', unitEn: 'IMDb rating',
    anchorLabel: 'The Office (US)', anchorValue: 9.0,
    subjectLabel: 'Breaking Bad', subjectValue: 9.5 },
  { id: 'boxoffice-lionking-frozen', kind: 'pair', category: 'filme', unit: 'Mio. USD Einnahmen', unitEn: 'million USD box office',
    anchorLabel: 'Der König der Löwen (2019)', anchorLabelEn: 'The Lion King (2019)', anchorValue: 1663,
    subjectLabel: 'Die Eiskönigin 2', subjectLabelEn: 'Frozen 2', subjectValue: 1453 },
  { id: 'spotify-weeknd-rihanna', kind: 'pair', category: 'filme', unit: 'Monatliche Spotify-Hörer', unitEn: 'Monthly Spotify listeners',
    anchorLabel: 'The Weeknd', anchorValue: 100_000_000,
    subjectLabel: 'Rihanna', subjectValue: 82_000_000 },

  // ── 🌍 Geografie & Wissen ───────────────────────────────────────────────
  { id: 'einwohner-berlin-madrid', kind: 'pair', category: 'geografie', unit: 'Einwohner', unitEn: 'inhabitants',
    anchorLabel: 'Berlin', anchorValue: 3_800_000,
    subjectLabel: 'Madrid', subjectValue: 3_300_000 },
  { id: 'einwohner-tokyo-delhi', kind: 'pair', category: 'geografie', unit: 'Einwohner (Metro)', unitEn: 'inhabitants (metro)',
    anchorLabel: 'Tokio (Metro)', anchorLabelEn: 'Tokyo (metro)', anchorValue: 37_000_000,
    subjectLabel: 'Delhi (Metro)', subjectLabelEn: 'Delhi (metro)', subjectValue: 32_000_000 },
  { id: 'flaeche-russland-kanada', kind: 'pair', category: 'geografie', unit: 'km² Fläche', unitEn: 'km² area',
    anchorLabel: 'Russland', anchorLabelEn: 'Russia', anchorValue: 17_098_000,
    subjectLabel: 'Kanada', subjectLabelEn: 'Canada', subjectValue: 9_985_000 },
  { id: 'flaeche-frankreich-deutschland', kind: 'pair', category: 'geografie', unit: 'km² Fläche', unitEn: 'km² area',
    anchorLabel: 'Frankreich', anchorLabelEn: 'France', anchorValue: 643_800,
    subjectLabel: 'Deutschland', subjectLabelEn: 'Germany', subjectValue: 357_600 },
  { id: 'hoehe-everest-k2', kind: 'pair', category: 'geografie', unit: 'm Höhe', unitEn: 'm height',
    anchorLabel: 'Mount Everest', anchorValue: 8849,
    subjectLabel: 'K2', subjectValue: 8611 },
  { id: 'hoehe-kilimanjaro-montblanc', kind: 'pair', category: 'geografie', unit: 'm Höhe', unitEn: 'm height',
    anchorLabel: 'Kilimandscharo', anchorLabelEn: 'Kilimanjaro', anchorValue: 5895,
    subjectLabel: 'Mont Blanc', subjectValue: 4810 },
  { id: 'laenge-nil-amazonas', kind: 'pair', category: 'geografie', unit: 'km Länge', unitEn: 'km length',
    anchorLabel: 'Nil', anchorLabelEn: 'Nile', anchorValue: 6650,
    subjectLabel: 'Amazonas', subjectLabelEn: 'Amazon', subjectValue: 6400 },
  { id: 'laenge-rhein-donau', kind: 'pair', category: 'geografie', unit: 'km Länge', unitEn: 'km length',
    anchorLabel: 'Rhein', anchorLabelEn: 'Rhine', anchorValue: 1233,
    subjectLabel: 'Donau', subjectLabelEn: 'Danube', subjectValue: 2857 },
  { id: 'einwohner-china-indien', kind: 'pair', category: 'geografie', unit: 'Einwohner (Mrd)', unitEn: 'inhabitants (bn)',
    anchorLabel: 'China', anchorValue: 1.41,
    subjectLabel: 'Indien', subjectLabelEn: 'India', subjectValue: 1.43 },
  { id: 'inseln-griechenland', kind: 'anchor', category: 'geografie', unit: 'bewohnte Inseln', unitEn: 'inhabited islands',
    anchorLabel: 'Griechenland', anchorLabelEn: 'Greece', anchorValue: 227,
    subjectLabel: 'Kroatien', subjectLabelEn: 'Croatia', subjectValue: 48,
    customQuestion: 'Griechenland hat ca. 227 bewohnte Inseln. Hat Kroatien mehr oder weniger?',
    customQuestionEn: 'Greece has approx. 227 inhabited islands. Does Croatia have more or less?' },

  // ── 🛒 Wirtschaft & Produkte ────────────────────────────────────────────
  { id: 'marktwert-apple-microsoft', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Börsenwert', unitEn: 'billion USD market cap',
    anchorLabel: 'Apple', anchorValue: 3500,
    subjectLabel: 'Microsoft', subjectValue: 3100 },
  { id: 'marktwert-nvidia-alphabet', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Börsenwert', unitEn: 'billion USD market cap',
    anchorLabel: 'Nvidia', anchorValue: 3300,
    subjectLabel: 'Alphabet (Google)', subjectValue: 2200 },
  { id: 'starbucks-mcd-filialen', kind: 'pair', category: 'wirtschaft', unit: 'Filialen weltweit', unitEn: 'stores worldwide',
    anchorLabel: 'Starbucks', anchorValue: 39000,
    subjectLabel: "McDonald's", subjectValue: 42000 },
  { id: 'umsatz-amazon-walmart', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Jahresumsatz', unitEn: 'billion USD annual revenue',
    anchorLabel: 'Amazon', anchorValue: 620,
    subjectLabel: 'Walmart', subjectValue: 670 },
  { id: 'iphone-samsung-verkauf', kind: 'pair', category: 'wirtschaft', unit: 'Mio. Geräte verkauft (2023)', unitEn: 'million devices sold (2023)',
    anchorLabel: 'Apple iPhones', anchorValue: 230,
    subjectLabel: 'Samsung Phones', subjectValue: 226 },
  { id: 'preis-rolex-omega', kind: 'pair', category: 'wirtschaft', unit: 'EUR Einstiegspreis', unitEn: 'EUR entry price',
    anchorLabel: 'Rolex Submariner', anchorValue: 10500,
    subjectLabel: 'Omega Speedmaster', subjectValue: 6500 },
  { id: 'ikea-filialen', kind: 'anchor', category: 'wirtschaft', unit: 'Filialen weltweit', unitEn: 'stores worldwide',
    anchorLabel: 'IKEA', anchorValue: 480,
    subjectLabel: 'H&M', subjectValue: 4300,
    customQuestion: 'IKEA hat ca. 480 Filialen weltweit. Hat H&M mehr oder weniger?',
    customQuestionEn: 'IKEA has approx. 480 stores worldwide. Does H&M have more or less?' },
  { id: 'tesla-bmw-absatz', kind: 'pair', category: 'wirtschaft', unit: 'Mio. verkaufte Autos/Jahr', unitEn: 'million cars sold/year',
    anchorLabel: 'Tesla', anchorValue: 1.8,
    subjectLabel: 'BMW', subjectValue: 2.5 },
  { id: 'toyota-vw-absatz', kind: 'pair', category: 'wirtschaft', unit: 'Mio. verkaufte Autos/Jahr', unitEn: 'million cars sold/year',
    anchorLabel: 'Toyota', anchorValue: 10.3,
    subjectLabel: 'VW-Konzern', subjectLabelEn: 'VW Group', subjectValue: 9.2 },
  { id: 'bitcoin-gold-marketcap', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Marktkapitalisierung', unitEn: 'billion USD market cap',
    anchorLabel: 'Bitcoin', anchorValue: 2000,
    subjectLabel: 'Gold', subjectValue: 17000 },

  // ── 🧪 Nerdige / kreative Varianten ─────────────────────────────────────
  { id: 'kalorien-pizza-salat', kind: 'pair', category: 'nerd', unit: 'kcal pro Portion', unitEn: 'kcal per portion',
    anchorLabel: 'Pizza Margherita (groß)', anchorLabelEn: 'Pizza Margherita (large)', anchorValue: 1200,
    subjectLabel: 'Caesar Salad mit Hühnchen', subjectLabelEn: 'Caesar Salad with chicken', subjectValue: 520 },
  { id: 'kalorien-burger-pasta', kind: 'pair', category: 'nerd', unit: 'kcal',
    anchorLabel: 'Big Mac', anchorValue: 550,
    subjectLabel: 'Spaghetti Bolognese (Portion)', subjectLabelEn: 'Spaghetti Bolognese (portion)', subjectValue: 670 },
  { id: 'lebenserwartung-schildkroete-papagei', kind: 'pair', category: 'nerd', unit: 'Jahre Lebenserwartung', unitEn: 'years lifespan',
    anchorLabel: 'Galapagos-Schildkröte', anchorLabelEn: 'Galápagos tortoise', anchorValue: 100,
    subjectLabel: 'Ara (Papagei)', subjectLabelEn: 'Macaw (parrot)', subjectValue: 50 },
  { id: 'lebenserwartung-hund-katze', kind: 'pair', category: 'nerd', unit: 'Jahre Lebenserwartung', unitEn: 'years lifespan',
    anchorLabel: 'Hund (durchschnitt)', anchorLabelEn: 'Dog (average)', anchorValue: 12,
    subjectLabel: 'Katze (durchschnitt)', subjectLabelEn: 'Cat (average)', subjectValue: 14 },
  { id: 'wiki-artikellaenge', kind: 'pair', category: 'nerd', unit: 'Zeichen (DE-Artikel)', unitEn: 'characters (DE article)',
    anchorLabel: 'Artikel „Deutschland"', anchorLabelEn: 'Article "Germany"', anchorValue: 220000,
    subjectLabel: 'Artikel „Berlin"', subjectLabelEn: 'Article "Berlin"', subjectValue: 195000 },
  { id: 'google-trefferzahl-katze-hund', kind: 'pair', category: 'nerd', unit: 'Mrd. Google-Ergebnisse', unitEn: 'billion Google results',
    anchorLabel: 'Suche „Katze"', anchorLabelEn: 'Search "cat"', anchorValue: 1.2,
    subjectLabel: 'Suche „Hund"', subjectLabelEn: 'Search "dog"', subjectValue: 1.5 },
  { id: 'wortschatz-shakespeare', kind: 'anchor', category: 'nerd', unit: 'Unique Words',
    anchorLabel: "Shakespeares Gesamtwerk", anchorLabelEn: "Shakespeare's complete works", anchorValue: 31534,
    subjectLabel: 'Harry-Potter-Reihe (alle 7 Bücher)', subjectLabelEn: 'Harry Potter series (all 7 books)', subjectValue: 20000,
    customQuestion: 'Shakespeares Gesamtwerk hat ca. 31.500 verschiedene Wörter. Hat die Harry-Potter-Reihe mehr oder weniger?',
    customQuestionEn: 'Shakespeare\'s complete works contain approx. 31,500 unique words. Does the Harry Potter series have more or less?' },
  { id: 'kalorien-bier-wein', kind: 'pair', category: 'nerd', unit: 'kcal pro 0,5L / 0,2L', unitEn: 'kcal per 0.5L / 0.2L',
    anchorLabel: 'Bier (0,5L Pils)', anchorLabelEn: 'Beer (0.5L Pilsner)', anchorValue: 210,
    subjectLabel: 'Rotwein (0,2L)', subjectLabelEn: 'Red wine (0.2L)', subjectValue: 170 },
  { id: 'emojis-unicode', kind: 'anchor', category: 'nerd', unit: 'Emojis',
    anchorLabel: 'Unicode-Standard', anchorLabelEn: 'Unicode standard', anchorValue: 3790,
    subjectLabel: 'Nintendo Mii-Gesichter-Varianten', subjectLabelEn: 'Nintendo Mii face variants', subjectValue: 20000,
    customQuestion: 'Im Unicode-Standard gibt es ca. 3790 Emojis. Nintendo Mii erlaubt wie viele Gesichter-Varianten — mehr oder weniger?',
    customQuestionEn: 'The Unicode standard contains approx. 3790 emojis. How many face variants does Nintendo Mii allow — more or less?' },
  { id: 'lebenserwartung-elefant-blauwal', kind: 'pair', category: 'nerd', unit: 'Jahre Lebenserwartung', unitEn: 'years lifespan',
    anchorLabel: 'Afrikanischer Elefant', anchorLabelEn: 'African elephant', anchorValue: 70,
    subjectLabel: 'Blauwal', subjectLabelEn: 'Blue whale', subjectValue: 90 },

  // ── 🎤 Eurovision (2026-05-13, fuer Watchparty-Edition) ─────────────────
  { id: 'esc-teilnehmer-2024-vs-2011', kind: 'anchor', category: 'eurovision',
    unit: 'teilnehmende Länder', unitEn: 'participating countries',
    anchorLabel: 'ESC 2024 (Malmö)', anchorLabelEn: 'ESC 2024 (Malmö)', anchorValue: 37,
    subjectLabel: 'ESC 2011 (Düsseldorf)', subjectLabelEn: 'ESC 2011 (Düsseldorf)', subjectValue: 43,
    customQuestion: 'Beim ESC 2024 in Malmö waren 37 Länder am Start. Waren es 2011 in Düsseldorf mehr oder weniger?',
    customQuestionEn: 'ESC 2024 in Malmö had 37 countries. Were there more or fewer in 2011 in Düsseldorf?' },
  { id: 'esc-lena-2010-vs-conchita-2014', kind: 'pair', category: 'eurovision',
    unit: 'Punkte', unitEn: 'points',
    anchorLabel: 'Lena — Satellite (2010)', anchorLabelEn: 'Lena — Satellite (2010)', anchorValue: 246,
    subjectLabel: 'Conchita Wurst — Rise Like a Phoenix (2014)', subjectLabelEn: 'Conchita Wurst — Rise Like a Phoenix (2014)', subjectValue: 290 },
  { id: 'esc-finale-dauer-2024-vs-1956', kind: 'anchor', category: 'eurovision',
    unit: 'Minuten Sendezeit', unitEn: 'minutes of broadcast',
    anchorLabel: 'ESC-Finale heute (~4 Stunden)', anchorLabelEn: 'ESC final today (~4 hours)', anchorValue: 240,
    subjectLabel: 'Allererster ESC 1956 (Lugano)', subjectLabelEn: 'Very first ESC 1956 (Lugano)', subjectValue: 100,
    customQuestion: 'Ein modernes ESC-Finale dauert etwa 240 Minuten. Wie lang ging der allererste ESC 1956 in Lugano — mehr oder weniger?',
    customQuestionEn: 'A modern ESC final runs about 240 minutes. How long was the very first ESC in 1956 in Lugano — more or less?' },
];

/** Liefert die korrekte Antwort anhand anchor/subject Werte. */
export function qqHLCorrectAnswer(pair: QQHLPair): 'higher' | 'lower' {
  return pair.subjectValue > pair.anchorValue ? 'higher' : 'lower';
}

/** Zieht zufällig ein Paar aus dem Pool, das noch nicht genutzt wurde.
 *  Falls alle genutzt: recyclet komplett neu. */
export function qqHLPickPair(usedIds: string[]): QQHLPair {
  const unused = QQ_HL_POOL.filter(p => !usedIds.includes(p.id));
  const pool = unused.length > 0 ? unused : QQ_HL_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Balance-Berechnung: Wie viele H/L-Runden gespielt werden sollen.
 *
 * gap = maxLargestConnected - lastLargestConnected (bzw. ähnliche Metrik vom
 *       Caller übergeben, hier egal solange >0 = hinten)
 * tiedLasts = Anzahl Teams auf dem letzten Platz (gleiche largest+total)
 *
 * Basis-Runden je nach Gap:
 *   gap >=  5 → 3 Runden (großer Abstand, volles Comeback)
 *   gap >=  3 → 2 Runden (mittel)
 *   gap >=  1 → 1 Runde (gering)
 *   gap === 0 → 0 Runden (kein Comeback nötig, Caller sollte gar nicht triggern)
 *
 * Tied-Cap (Schutz gegen zu viel Klau bei mehreren Last-Teams):
 *   1 Last → Basis unverändert
 *   2 Last → max 2 Runden
 *   3 Last → max 1 Runde
 *   4+ Last → 0 Runden (Comeback wird komplett übersprungen)
 *
 * Ergebnis = min(basis, cap).
 */
export function qqComebackHLRounds(gap: number, tiedLasts: number): number {
  if (tiedLasts >= 4) return 0;
  const base = gap >= 5 ? 3 : gap >= 3 ? 2 : gap >= 1 ? 1 : 0;
  const cap = tiedLasts === 1 ? 3 : tiedLasts === 2 ? 2 : tiedLasts === 3 ? 1 : 0;
  return Math.min(base, cap);
}
