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
 */

import type { QQHLPair } from '../../../shared/quarterQuizTypes';

export const QQ_HL_POOL: readonly QQHLPair[] = [
  // ── 🌐 Online & Social Media ─────────────────────────────────────────────
  { id: 'insta-ronaldo-messi', kind: 'pair', category: 'online', unit: 'Instagram-Follower',
    anchorLabel: 'Cristiano Ronaldo', anchorValue: 640_000_000,
    subjectLabel: 'Lionel Messi', subjectValue: 510_000_000 },
  { id: 'insta-beyonce-taylor', kind: 'pair', category: 'online', unit: 'Instagram-Follower',
    anchorLabel: 'Beyoncé', anchorValue: 320_000_000,
    subjectLabel: 'Taylor Swift', subjectValue: 280_000_000 },
  { id: 'yt-mrbeast-pewdiepie', kind: 'pair', category: 'online', unit: 'YouTube-Abos',
    anchorLabel: 'MrBeast', anchorValue: 370_000_000,
    subjectLabel: 'PewDiePie', subjectValue: 111_000_000 },
  { id: 'yt-tseries', kind: 'anchor', category: 'online', unit: 'YouTube-Abos',
    anchorLabel: 'T-Series (indischer Musik-Kanal)', anchorValue: 280_000_000,
    subjectLabel: 'MrBeast', subjectValue: 370_000_000,
    customQuestion: 'T-Series hat ca. 280 Mio. YouTube-Abos. Hat MrBeast mehr oder weniger?' },
  { id: 'tiktok-khaby-bella', kind: 'pair', category: 'online', unit: 'TikTok-Follower',
    anchorLabel: 'Khaby Lame', anchorValue: 162_000_000,
    subjectLabel: 'Bella Poarch', subjectValue: 93_000_000 },
  { id: 'wiki-en-de', kind: 'pair', category: 'online', unit: 'Wikipedia-Artikel',
    anchorLabel: 'Englische Wikipedia', anchorValue: 6_900_000,
    subjectLabel: 'Deutsche Wikipedia', subjectValue: 2_900_000 },
  { id: 'spotify-taylor-drake', kind: 'pair', category: 'online', unit: 'Monatliche Spotify-Hörer',
    anchorLabel: 'Taylor Swift', anchorValue: 93_000_000,
    subjectLabel: 'Drake', subjectValue: 76_000_000 },
  { id: 'insta-kim-kylie', kind: 'pair', category: 'online', unit: 'Instagram-Follower',
    anchorLabel: 'Kim Kardashian', anchorValue: 360_000_000,
    subjectLabel: 'Kylie Jenner', subjectValue: 400_000_000 },
  { id: 'reddit-users', kind: 'anchor', category: 'online', unit: 'Monatliche User',
    anchorLabel: 'Reddit', anchorValue: 1_200_000_000,
    subjectLabel: 'Pinterest', subjectValue: 500_000_000,
    customQuestion: 'Reddit hat ca. 1,2 Mrd. monatliche Nutzer. Hat Pinterest mehr oder weniger?' },
  { id: 'fb-whatsapp-users', kind: 'pair', category: 'online', unit: 'Monatliche User (Mio)',
    anchorLabel: 'Facebook', anchorValue: 3070,
    subjectLabel: 'WhatsApp', subjectValue: 2780 },

  // ── 👥 Promis & Personen ─────────────────────────────────────────────────
  { id: 'vermogen-musk-bezos', kind: 'pair', category: 'promis', unit: 'Mrd. USD Vermögen',
    anchorLabel: 'Elon Musk', anchorValue: 420,
    subjectLabel: 'Jeff Bezos', subjectValue: 240 },
  { id: 'alter-madonna-cher', kind: 'pair', category: 'promis', unit: 'Jahre alt',
    anchorLabel: 'Madonna', anchorValue: 67,
    subjectLabel: 'Cher', subjectValue: 79 },
  { id: 'oscars-meryl-jack', kind: 'pair', category: 'promis', unit: 'Oscar-Nominierungen',
    anchorLabel: 'Meryl Streep', anchorValue: 21,
    subjectLabel: 'Jack Nicholson', subjectValue: 12 },
  { id: 'grammy-beyonce-jay', kind: 'pair', category: 'promis', unit: 'Grammy-Wins',
    anchorLabel: 'Beyoncé', anchorValue: 35,
    subjectLabel: 'Jay-Z', subjectValue: 24 },
  { id: 'alter-dicaprio-pitt', kind: 'pair', category: 'promis', unit: 'Jahre alt',
    anchorLabel: 'Leonardo DiCaprio', anchorValue: 50,
    subjectLabel: 'Brad Pitt', subjectValue: 61 },
  { id: 'vermogen-bernard-mark', kind: 'pair', category: 'promis', unit: 'Mrd. USD Vermögen',
    anchorLabel: 'Bernard Arnault', anchorValue: 190,
    subjectLabel: 'Mark Zuckerberg', subjectValue: 200 },
  { id: 'alter-schwarzi-stallone', kind: 'pair', category: 'promis', unit: 'Jahre alt',
    anchorLabel: 'Arnold Schwarzenegger', anchorValue: 77,
    subjectLabel: 'Sylvester Stallone', subjectValue: 78 },
  { id: 'nobel-einstein-curie', kind: 'anchor', category: 'promis', unit: 'Nobelpreise',
    anchorLabel: 'Marie Curie', anchorValue: 2,
    subjectLabel: 'Albert Einstein', subjectValue: 1,
    customQuestion: 'Marie Curie hat 2 Nobelpreise gewonnen. Wie viele hat Albert Einstein — mehr oder weniger?' },

  // ── ⚽ Sport ─────────────────────────────────────────────────────────────
  { id: 'tore-ronaldo-messi', kind: 'pair', category: 'sport', unit: 'Karriere-Tore',
    anchorLabel: 'Cristiano Ronaldo', anchorValue: 925,
    subjectLabel: 'Lionel Messi', subjectValue: 860 },
  { id: 'marktwert-mbappe-haaland', kind: 'pair', category: 'sport', unit: 'Mio. € Marktwert',
    anchorLabel: 'Kylian Mbappé', anchorValue: 180,
    subjectLabel: 'Erling Haaland', subjectValue: 200 },
  { id: 'stadion-barca-realmadrid', kind: 'pair', category: 'sport', unit: 'Zuschauer-Kapazität',
    anchorLabel: 'Camp Nou (Barcelona)', anchorValue: 99354,
    subjectLabel: 'Santiago Bernabéu (Real Madrid)', subjectValue: 81044 },
  { id: 'stadion-dortmund-bayern', kind: 'pair', category: 'sport', unit: 'Zuschauer-Kapazität',
    anchorLabel: 'Signal Iduna Park (Dortmund)', anchorValue: 81365,
    subjectLabel: 'Allianz Arena (Bayern)', subjectValue: 75024 },
  { id: 'cl-titel-real-milan', kind: 'pair', category: 'sport', unit: 'Champions-League-Titel',
    anchorLabel: 'Real Madrid', anchorValue: 15,
    subjectLabel: 'AC Milan', subjectValue: 7 },
  { id: 'wm-titel-brasilien-deutschland', kind: 'pair', category: 'sport', unit: 'WM-Titel',
    anchorLabel: 'Brasilien', anchorValue: 5,
    subjectLabel: 'Deutschland', subjectValue: 4 },
  { id: 'nba-rings-lebron-mj', kind: 'pair', category: 'sport', unit: 'NBA-Championship-Titel',
    anchorLabel: 'LeBron James', anchorValue: 4,
    subjectLabel: 'Michael Jordan', subjectValue: 6 },
  { id: 'olympia-phelps', kind: 'anchor', category: 'sport', unit: 'Olympia-Goldmedaillen',
    anchorLabel: 'Michael Phelps', anchorValue: 23,
    subjectLabel: 'Usain Bolt', subjectValue: 8,
    customQuestion: 'Michael Phelps hat 23 Olympia-Goldmedaillen. Wie viele hat Usain Bolt?' },
  { id: 'tennis-slams-djoko-nadal', kind: 'pair', category: 'sport', unit: 'Grand-Slam-Titel',
    anchorLabel: 'Novak Djokovic', anchorValue: 24,
    subjectLabel: 'Rafael Nadal', subjectValue: 22 },
  { id: 'f1-titel-schumi-hamilton', kind: 'pair', category: 'sport', unit: 'F1-Weltmeister-Titel',
    anchorLabel: 'Michael Schumacher', anchorValue: 7,
    subjectLabel: 'Lewis Hamilton', subjectValue: 7 },

  // ── 🎬 Filme, Serien & Games ────────────────────────────────────────────
  { id: 'boxoffice-avatar-endgame', kind: 'pair', category: 'filme', unit: 'Mio. USD Einnahmen',
    anchorLabel: 'Avatar (2009)', anchorValue: 2923,
    subjectLabel: 'Avengers: Endgame', subjectValue: 2797 },
  { id: 'boxoffice-titanic-barbie', kind: 'pair', category: 'filme', unit: 'Mio. USD Einnahmen',
    anchorLabel: 'Titanic', anchorValue: 2257,
    subjectLabel: 'Barbie (2023)', subjectValue: 1446 },
  { id: 'imdb-godfather-shawshank', kind: 'pair', category: 'filme', unit: 'IMDb-Rating',
    anchorLabel: 'The Godfather', anchorValue: 9.2,
    subjectLabel: 'The Shawshank Redemption', subjectValue: 9.3 },
  { id: 'imdb-darkknight-inception', kind: 'pair', category: 'filme', unit: 'IMDb-Rating',
    anchorLabel: 'The Dark Knight', anchorValue: 9.0,
    subjectLabel: 'Inception', subjectValue: 8.8 },
  { id: 'budget-endgame-avatar2', kind: 'pair', category: 'filme', unit: 'Mio. USD Budget',
    anchorLabel: 'Avengers: Endgame', anchorValue: 356,
    subjectLabel: 'Avatar 2', subjectValue: 460 },
  { id: 'minecraft-fortnite', kind: 'pair', category: 'filme', unit: 'Monatlich aktive Spieler (Mio)',
    anchorLabel: 'Minecraft', anchorValue: 170,
    subjectLabel: 'Fortnite', subjectValue: 80 },
  { id: 'gta5-sales', kind: 'anchor', category: 'filme', unit: 'Mio. verkaufte Einheiten',
    anchorLabel: 'GTA V', anchorValue: 205,
    subjectLabel: 'Minecraft', subjectValue: 300,
    customQuestion: 'GTA V wurde ca. 205 Mio. mal verkauft. Mehr oder weniger als Minecraft?' },
  { id: 'imdb-office-breakingbad', kind: 'pair', category: 'filme', unit: 'IMDb-Rating',
    anchorLabel: 'The Office (US)', anchorValue: 9.0,
    subjectLabel: 'Breaking Bad', subjectValue: 9.5 },
  { id: 'boxoffice-lionking-frozen', kind: 'pair', category: 'filme', unit: 'Mio. USD Einnahmen',
    anchorLabel: 'Der König der Löwen (2019)', anchorValue: 1663,
    subjectLabel: 'Die Eiskönigin 2', subjectValue: 1453 },
  { id: 'spotify-weeknd-rihanna', kind: 'pair', category: 'filme', unit: 'Monatliche Spotify-Hörer',
    anchorLabel: 'The Weeknd', anchorValue: 100_000_000,
    subjectLabel: 'Rihanna', subjectValue: 82_000_000 },

  // ── 🌍 Geografie & Wissen ───────────────────────────────────────────────
  { id: 'einwohner-berlin-madrid', kind: 'pair', category: 'geografie', unit: 'Einwohner',
    anchorLabel: 'Berlin', anchorValue: 3_800_000,
    subjectLabel: 'Madrid', subjectValue: 3_300_000 },
  { id: 'einwohner-tokyo-delhi', kind: 'pair', category: 'geografie', unit: 'Einwohner (Metro)',
    anchorLabel: 'Tokio (Metro)', anchorValue: 37_000_000,
    subjectLabel: 'Delhi (Metro)', subjectValue: 32_000_000 },
  { id: 'flaeche-russland-kanada', kind: 'pair', category: 'geografie', unit: 'km² Fläche',
    anchorLabel: 'Russland', anchorValue: 17_098_000,
    subjectLabel: 'Kanada', subjectValue: 9_985_000 },
  { id: 'flaeche-frankreich-deutschland', kind: 'pair', category: 'geografie', unit: 'km² Fläche',
    anchorLabel: 'Frankreich', anchorValue: 643_800,
    subjectLabel: 'Deutschland', subjectValue: 357_600 },
  { id: 'hoehe-everest-k2', kind: 'pair', category: 'geografie', unit: 'm Höhe',
    anchorLabel: 'Mount Everest', anchorValue: 8849,
    subjectLabel: 'K2', subjectValue: 8611 },
  { id: 'hoehe-kilimanjaro-montblanc', kind: 'pair', category: 'geografie', unit: 'm Höhe',
    anchorLabel: 'Kilimandscharo', anchorValue: 5895,
    subjectLabel: 'Mont Blanc', subjectValue: 4810 },
  { id: 'laenge-nil-amazonas', kind: 'pair', category: 'geografie', unit: 'km Länge',
    anchorLabel: 'Nil', anchorValue: 6650,
    subjectLabel: 'Amazonas', subjectValue: 6400 },
  { id: 'laenge-rhein-donau', kind: 'pair', category: 'geografie', unit: 'km Länge',
    anchorLabel: 'Rhein', anchorValue: 1233,
    subjectLabel: 'Donau', subjectValue: 2857 },
  { id: 'einwohner-china-indien', kind: 'pair', category: 'geografie', unit: 'Einwohner (Mrd)',
    anchorLabel: 'China', anchorValue: 1.41,
    subjectLabel: 'Indien', subjectValue: 1.43 },
  { id: 'inseln-griechenland', kind: 'anchor', category: 'geografie', unit: 'bewohnte Inseln',
    anchorLabel: 'Griechenland', anchorValue: 227,
    subjectLabel: 'Kroatien', subjectValue: 48,
    customQuestion: 'Griechenland hat ca. 227 bewohnte Inseln. Hat Kroatien mehr oder weniger?' },

  // ── 🛒 Wirtschaft & Produkte ────────────────────────────────────────────
  { id: 'marktwert-apple-microsoft', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Börsenwert',
    anchorLabel: 'Apple', anchorValue: 3500,
    subjectLabel: 'Microsoft', subjectValue: 3100 },
  { id: 'marktwert-nvidia-alphabet', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Börsenwert',
    anchorLabel: 'Nvidia', anchorValue: 3300,
    subjectLabel: 'Alphabet (Google)', subjectValue: 2200 },
  { id: 'starbucks-mcd-filialen', kind: 'pair', category: 'wirtschaft', unit: 'Filialen weltweit',
    anchorLabel: 'Starbucks', anchorValue: 39000,
    subjectLabel: "McDonald's", subjectValue: 42000 },
  { id: 'umsatz-amazon-walmart', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Jahresumsatz',
    anchorLabel: 'Amazon', anchorValue: 620,
    subjectLabel: 'Walmart', subjectValue: 670 },
  { id: 'iphone-samsung-verkauf', kind: 'pair', category: 'wirtschaft', unit: 'Mio. Geräte verkauft (2023)',
    anchorLabel: 'Apple iPhones', anchorValue: 230,
    subjectLabel: 'Samsung Phones', subjectValue: 226 },
  { id: 'preis-rolex-omega', kind: 'pair', category: 'wirtschaft', unit: 'EUR Einstiegspreis',
    anchorLabel: 'Rolex Submariner', anchorValue: 10500,
    subjectLabel: 'Omega Speedmaster', subjectValue: 6500 },
  { id: 'ikea-filialen', kind: 'anchor', category: 'wirtschaft', unit: 'Filialen weltweit',
    anchorLabel: 'IKEA', anchorValue: 480,
    subjectLabel: 'H&M', subjectValue: 4300,
    customQuestion: 'IKEA hat ca. 480 Filialen weltweit. Hat H&M mehr oder weniger?' },
  { id: 'tesla-bmw-absatz', kind: 'pair', category: 'wirtschaft', unit: 'Mio. verkaufte Autos/Jahr',
    anchorLabel: 'Tesla', anchorValue: 1.8,
    subjectLabel: 'BMW', subjectValue: 2.5 },
  { id: 'toyota-vw-absatz', kind: 'pair', category: 'wirtschaft', unit: 'Mio. verkaufte Autos/Jahr',
    anchorLabel: 'Toyota', anchorValue: 10.3,
    subjectLabel: 'VW-Konzern', subjectValue: 9.2 },
  { id: 'bitcoin-gold-marketcap', kind: 'pair', category: 'wirtschaft', unit: 'Mrd. USD Marktkapitalisierung',
    anchorLabel: 'Bitcoin', anchorValue: 2000,
    subjectLabel: 'Gold', subjectValue: 17000 },

  // ── 🧪 Nerdige / kreative Varianten ─────────────────────────────────────
  { id: 'kalorien-pizza-salat', kind: 'pair', category: 'nerd', unit: 'kcal pro Portion',
    anchorLabel: 'Pizza Margherita (groß)', anchorValue: 1200,
    subjectLabel: 'Caesar Salad mit Hühnchen', subjectValue: 520 },
  { id: 'kalorien-burger-pasta', kind: 'pair', category: 'nerd', unit: 'kcal',
    anchorLabel: 'Big Mac', anchorValue: 550,
    subjectLabel: 'Spaghetti Bolognese (Portion)', subjectValue: 670 },
  { id: 'lebenserwartung-schildkroete-papagei', kind: 'pair', category: 'nerd', unit: 'Jahre Lebenserwartung',
    anchorLabel: 'Galapagos-Schildkröte', anchorValue: 100,
    subjectLabel: 'Ara (Papagei)', subjectValue: 50 },
  { id: 'lebenserwartung-hund-katze', kind: 'pair', category: 'nerd', unit: 'Jahre Lebenserwartung',
    anchorLabel: 'Hund (durchschnitt)', anchorValue: 12,
    subjectLabel: 'Katze (durchschnitt)', subjectValue: 14 },
  { id: 'wiki-artikellaenge', kind: 'pair', category: 'nerd', unit: 'Zeichen (DE-Artikel)',
    anchorLabel: 'Artikel „Deutschland"', anchorValue: 220000,
    subjectLabel: 'Artikel „Berlin"', subjectValue: 195000 },
  { id: 'google-trefferzahl-katze-hund', kind: 'pair', category: 'nerd', unit: 'Mrd. Google-Ergebnisse',
    anchorLabel: 'Suche „Katze"', anchorValue: 1.2,
    subjectLabel: 'Suche „Hund"', subjectValue: 1.5 },
  { id: 'wortschatz-shakespeare', kind: 'anchor', category: 'nerd', unit: 'Unique Words',
    anchorLabel: "Shakespeares Gesamtwerk", anchorValue: 31534,
    subjectLabel: 'Harry-Potter-Reihe (alle 7 Bücher)', subjectValue: 20000,
    customQuestion: 'Shakespeares Gesamtwerk hat ca. 31.500 verschiedene Wörter. Hat die Harry-Potter-Reihe mehr oder weniger?' },
  { id: 'kalorien-bier-wein', kind: 'pair', category: 'nerd', unit: 'kcal pro 0,5L / 0,2L',
    anchorLabel: 'Bier (0,5L Pils)', anchorValue: 210,
    subjectLabel: 'Rotwein (0,2L)', subjectValue: 170 },
  { id: 'emojis-unicode', kind: 'anchor', category: 'nerd', unit: 'Emojis',
    anchorLabel: 'Unicode-Standard', anchorValue: 3790,
    subjectLabel: 'Nintendo Mii-Gesichter-Varianten', subjectValue: 20000,
    customQuestion: 'Im Unicode-Standard gibt es ca. 3790 Emojis. Nintendo Mii erlaubt wie viele Gesichter-Varianten — mehr oder weniger?' },
  { id: 'lebenserwartung-elefant-blauwal', kind: 'pair', category: 'nerd', unit: 'Jahre Lebenserwartung',
    anchorLabel: 'Afrikanischer Elefant', anchorValue: 70,
    subjectLabel: 'Blauwal', subjectValue: 90 },
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
