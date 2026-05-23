// ── Cozy Library Seed — „Know I Now"-Style Pool-Fragen ───────────────────────
// 2026-05-11: Initiale 60 handgepflegte, recherchierte Mikro-Fact-Fragen für
// die CozyLibrary. KEINE spielbaren Drafts, sondern LOSE Pool-Items die im
// CozyBuilder per "📚 Aus Library importieren" in beliebige Quizze gezogen
// werden können.
//
// Jede Frage hat:
//   - id (stabil, z.B. 'lib-octopus-hearts')
//   - category (SCHAETZCHEN | MUCHO | BUNTE_TUETE | ZEHN_VON_ZEHN | CHEESE)
//   - topic (Wissensgebiet — für Filter)
//   - text + textEn
//   - answer + answerEn
//   - funFact (Know-I-Now-Style Mikro-Story)
//   - Plus Mechanik-spezifische Felder (targetValue/unit, options, bunteTuete, …)
//
// Recherche-Stand Mai 2026. Wolf kann pro Item Topic anpassen, alternative
// Antworten einfügen, Mechanik wechseln — sobald in seinen Draft gezogen.

type LibraryItem = Record<string, any>;

function item(id: string, category: string, topic: string, data: Record<string, any>): LibraryItem {
  return {
    id: `lib-${id}`,
    category,
    topic,
    // phaseIndex/questionIndexInPhase werden gesetzt wenn Wolf die Frage
    // in einen Draft importiert — Library-Items haben kein festes Slot.
    phaseIndex: 1,
    questionIndexInPhase: 0,
    text: '', answer: '',
    ...data,
  };
}

export const COZY_LIBRARY_SEED: LibraryItem[] = [
  // ═══ NATUR & TIERE ════════════════════════════════════════════════════════
  item('octopus-hearts', 'SCHAETZCHEN', 'Natur & Tiere', {
    text: 'Wie viele Herzen hat ein Oktopus?',
    textEn: 'How many hearts does an octopus have?',
    answer: '3', targetValue: 3, unit: 'Herzen', unitEn: 'hearts',
    funFact: 'Drei Herzen, neun Gehirne, blaues Blut. Eins der Herzen pumpt das Blut durch den Körper, die anderen beiden durch die Kiemen. Wenn der Oktopus schwimmt, hört das Hauptherz auf zu schlagen — deshalb gehen Oktopusse lieber zu Fuß.',
  }),
  item('octopus-brains', 'ZEHN_VON_ZEHN', 'Natur & Tiere', {
    text: 'Wie viele Gehirne hat ein Oktopus?',
    textEn: 'How many brains does an octopus have?',
    answer: '9',
    options: ['1', '3', '9'], optionsEn: ['1', '3', '9'], correctOptionIndex: 2,
    funFact: '1 zentrales Gehirn + 8 Mini-Gehirne in den Armen. Jeder Arm denkt halbwegs eigenständig — etwa 2/3 aller Neuronen sitzen in den Armen. Der Oktopus muss seinen Armen nicht sagen, was sie tun sollen.',
  }),
  item('immortal-jellyfish', 'ZEHN_VON_ZEHN', 'Natur & Tiere', {
    text: 'Wie heißt die einzige biologisch unsterbliche Quallen-Art?',
    textEn: 'What is the only biologically immortal jellyfish species called?',
    answer: 'Turritopsis dohrnii',
    options: ['Turritopsis dohrnii', 'Aurelia aurita', 'Cyanea capillata'],
    optionsEn: ['Turritopsis dohrnii', 'Aurelia aurita', 'Cyanea capillata'],
    correctOptionIndex: 0,
    funFact: 'Im Stressfall kann sich Turritopsis dohrnii (4,5 mm groß) komplett in ihr Polyp-Stadium zurückverwandeln — biologische Rückspul-Taste. Sie ist die einzige bekannte Art, die das kann.',
  }),
  item('wombat-cube-poop', 'CHEESE', 'Natur & Tiere', {
    text: 'Welches Tier produziert würfelförmigen Kot?',
    textEn: 'Which animal produces cube-shaped feces?',
    answer: 'Wombat', answerEn: 'Wombat',
    funFact: 'Wombats sind die einzigen Tiere mit würfelförmigem Kot. Ihre Eingeweide haben 2 steife und 2 elastische Zonen — das presst die Würfel in über 40.000 Kontraktionen. Würfel rollen nicht von Markierungs-Steinen runter.',
  }),
  item('sperm-whale-brain', 'MUCHO', 'Natur & Tiere', {
    text: 'Welches Tier hat das größte Gehirn aller existierenden Lebewesen?',
    textEn: 'Which living animal has the largest brain on Earth?',
    answer: 'Pottwal',
    options: ['Elefant', 'Pottwal', 'Großer Tümmler (Delfin)', 'Mensch'],
    optionsEn: ['Elephant', 'Sperm Whale', 'Bottlenose Dolphin', 'Human'],
    correctOptionIndex: 1,
    funFact: 'Das Gehirn eines Pottwals wiegt rund 7,8 kg — sechsmal so viel wie unseres. Aber Größe ≠ Intelligenz: relativ zur Körpermasse hat der Mensch das größte.',
  }),
  item('bee-zero', 'MUCHO', 'Natur & Tiere', {
    text: 'Welche Tierart kann mathematisch das Konzept „Null" verstehen?',
    textEn: 'Which animal species can understand the mathematical concept of „zero"?',
    answer: 'Honigbiene & Krähe',
    options: ['Schimpanse', 'Honigbiene', 'Krähe', 'Beide: Bienen und Krähen'],
    optionsEn: ['Chimpanzee', 'Honeybee', 'Crow', 'Both bees & crows'],
    correctOptionIndex: 3,
    funFact: 'Eine RMIT-Studie 2018 zeigte: Bienen erkennen „Null" als kleiner als 1. Damit gehören sie zu einer winzigen Gruppe mit Affen, Krähen und Kleinkindern, die Null abstrakt verstehen. Bienen können auch bis 4 zählen.',
  }),
  item('butterfly-tastes-feet', 'MUCHO', 'Natur & Tiere', {
    text: 'Mit welchem Körperteil schmecken Schmetterlinge?',
    textEn: 'Which body part do butterflies use to taste?',
    answer: 'Mit den Füßen',
    options: ['Mit den Füßen', 'Mit den Flügeln', 'Mit den Fühlern', 'Mit dem Rüssel'],
    optionsEn: ['Feet', 'Wings', 'Antennae', 'Proboscis'],
    correctOptionIndex: 0,
    funFact: 'Sensoren an den Tarsen (Füßen) sagen Schmetterlingen, ob sie auf einer essbaren Pflanze sitzen oder auf einer für ihre Eier geeigneten. Wenn ein Schmetterling auf dir landet, schmeckt er gerade deinen Schweiß.',
  }),
  item('gentoo-pebble-proposal', 'MUCHO', 'Natur & Tiere', {
    text: 'Welches Tier macht „Heiratsanträge" mit einem sorgfältig ausgesuchten Stein?',
    textEn: 'Which animal „proposes marriage" with a carefully chosen stone?',
    answer: 'Eselspinguin',
    options: ['Eselspinguin', 'Otter', 'Pfauen-Spinne', 'Krähe'],
    optionsEn: ['Gentoo penguin', 'Otter', 'Peacock spider', 'Crow'],
    correctOptionIndex: 0,
    funFact: 'Eselspinguin-Männchen suchen den perfekt-glatten Stein und legen ihn dem Weibchen zu Füßen. Nimmt sie ihn, sind sie ein Paar. Mit denselben Steinen bauen sie später das Nest — teurer Schmuck mit Nutzen.',
  }),
  item('axolotl-regen', 'CHEESE', 'Natur & Tiere', {
    text: 'Welches mexikanische Schwanzlurch-Tier regeneriert Gliedmaßen, Augen und Hirnteile?',
    textEn: 'Which Mexican salamander regenerates limbs, eyes and brain parts?',
    answer: 'Axolotl', answerEn: 'Axolotl',
    funFact: 'Axolotl behalten lebenslang ihre Larvenform — werden nie zur erwachsenen Salamanderform. In freier Wildbahn (Mexiko, Xochimilco) fast ausgestorben.',
  }),
  item('tardigrade', 'CHEESE', 'Natur & Tiere', {
    text: 'Welches mikroskopisch kleine Tier überlebt Weltraum-Vakuum, -272°C und 30 Jahre ohne Wasser?',
    textEn: 'Which microscopic creature survives space vacuum, -272°C and 30 years without water?',
    answer: 'Bärtierchen', answerEn: 'Tardigrade',
    funFact: 'Bärtierchen (0,5 mm) trocknen ein, ihr Stoffwechsel fällt auf 0,01% — und sie booten wieder hoch sobald Wasser dazukommt. Überleben kosmische Strahlung, 6000 bar Druck, +150°C.',
  }),
  item('toucan-beak-temp', 'CHEESE', 'Natur & Tiere', {
    text: 'Welcher Vogel benutzt seinen riesigen Schnabel als Wärmetauscher zur Temperaturregulation?',
    textEn: 'Which bird uses its giant beak as a heat exchanger?',
    answer: 'Tukan', answerEn: 'Toucan',
    funFact: 'Bei Hitze pumpt der Tukan Blut in den Schnabel und kühlt es dort ab. Erst 2009 wissenschaftlich nachgewiesen — vorher dachte man, der Schnabel wäre nur Show.',
  }),
  item('sloth-digestion', 'SCHAETZCHEN', 'Natur & Tiere', {
    text: 'Wie viele Tage braucht ein Faultier um eine einzige Mahlzeit zu verdauen?',
    textEn: 'How many days does a sloth need to digest a single meal?',
    answer: '30', targetValue: 30, unit: 'Tage', unitEn: 'days',
    funFact: 'Faultiere haben den langsamsten Stoffwechsel aller Säugetiere. Algen wachsen in ihrem Fell, eine Motten-Art lebt ausschließlich auf Faultieren. Sie steigen 1× pro Woche zum Boden ab — zum Toilettengang.',
  }),
  item('cow-stomach-chambers', 'ZEHN_VON_ZEHN', 'Natur & Tiere', {
    text: 'Wie viele Mägen hat eine Kuh?',
    textEn: 'How many stomachs does a cow have?',
    answer: '1 Magen mit 4 Kammern',
    options: ['4 echte Mägen', '1 Magen mit 4 Kammern', '7 Mägen'],
    optionsEn: ['4 separate stomachs', '1 stomach with 4 chambers', '7 stomachs'],
    correctOptionIndex: 1,
    funFact: 'Anatomisch korrekt ist 1 Magen mit 4 Kammern: Pansen, Netzmagen, Blättermagen, Labmagen. Der Pansen alleine fasst 200 Liter — vorwiegend Pflanzenmaterial, das von Mikroben fermentiert wird.',
  }),
  item('chickens-worldwide', 'SCHAETZCHEN', 'Natur & Tiere', {
    text: 'Wie viele Hühner gibt es ungefähr weltweit (in Milliarden)?',
    textEn: 'How many chickens are there worldwide (in billions)?',
    answer: '33', targetValue: 33, unit: 'Milliarden', unitEn: 'billion',
    funFact: 'Mehr als jeder andere Vogel auf der Erde — etwa 4× so viele wie Menschen. Hühner-Knochen sind so dominant in der modernen Fossilschicht, dass Geologen das Anthropozän daran erkennen werden.',
  }),
  item('greenland-shark-lifespan', 'SCHAETZCHEN', 'Natur & Tiere', {
    text: 'Wie alt kann ein Grönlandhai werden (in Jahren)?',
    textEn: 'How old can a Greenland shark live (in years)?',
    answer: '400', targetValue: 400, unit: 'Jahre', unitEn: 'years',
    funFact: 'Grönlandhaie sind die langlebigsten Wirbeltiere. Wachsen 1 cm pro Jahr, werden erst mit 150 geschlechtsreif. Ein Grönlandhai von 2026 schwamm zu Shakespeares Zeiten als Jungtier durchs Eismeer.',
  }),
  item('ming-clam-age', 'SCHAETZCHEN', 'Natur & Tiere', {
    text: 'Wie alt wurde das älteste je dokumentierte Lebewesen (Quahog-Muschel „Ming") in Jahren?',
    textEn: 'How old was the oldest documented living creature (the quahog clam „Ming")?',
    answer: '507', targetValue: 507, unit: 'Jahre', unitEn: 'years',
    funFact: 'Ming wurde 2006 vor Island gefunden, geboren 1499 — Kolumbus lebte noch. Forscher öffneten sie, um ihr Alter zu bestimmen, und töteten sie dabei. Alter abgelesen an den Schalenringen.',
  }),
  item('bees-fly-backwards', 'ZEHN_VON_ZEHN', 'Natur & Tiere', {
    text: 'Können Bienen rückwärts fliegen?',
    textEn: 'Can bees fly backwards?',
    answer: 'Ja',
    options: ['Ja', 'Nein', 'Nur Königinnen'],
    optionsEn: ['Yes', 'No', 'Only queens'],
    correctOptionIndex: 0,
    funFact: 'Bienen fliegen vorwärts, rückwärts, seitwärts und schweben auf der Stelle — Flügelschlag 230 Hz. Kolibris können dasselbe (50–80 Hz). Die meisten anderen Vögel können nur vorwärts.',
  }),
  item('banana-berry', 'ZEHN_VON_ZEHN', 'Natur & Tiere', {
    text: 'Was ist eine Banane botanisch gesehen?',
    textEn: 'What is a banana botanically?',
    answer: 'Beere',
    options: ['Beere', 'Steinfrucht', 'Nuss'],
    optionsEn: ['Berry', 'Stone fruit', 'Nut'],
    correctOptionIndex: 0,
    funFact: 'Bananen sind botanisch Beeren — und die Bananenpflanze ist kein Baum, sondern die größte krautige Pflanze der Welt (über 7 m hoch). Erdbeeren dagegen sind keine Beeren, sondern Sammelnussfrüchte.',
  }),
  item('trees-vs-stars', 'SCHAETZCHEN', 'Natur & Tiere', {
    text: 'Wie viele Bäume gibt es geschätzt auf der Erde (in Billionen)?',
    textEn: 'Approximately how many trees on Earth (in trillions)?',
    answer: '3', targetValue: 3, unit: 'Billionen', unitEn: 'trillion',
    funFact: 'Etwa 3 Billionen Bäume — das ist 10× mehr als Sterne in der Milchstraße (100–400 Milliarden). Vor 12.000 Jahren waren es noch doppelt so viele. Jährlich verlieren wir ~10 Milliarden netto.',
  }),
  item('immortal-animals-connect', 'BUNTE_TUETE', 'Natur & Tiere', {
    text: 'Was verbindet diese 4 Tiere?',
    textEn: 'What connects these 4 animals?',
    answer: 'Biologisch (fast) unsterbliche Lebewesen', answerEn: 'Biologically (nearly) immortal',
    bunteTuete: {
      kind: 'onlyConnect',
      hints: ['Turritopsis dohrnii', 'Hydra', 'Hummer', 'Bärtierchen'],
      hintsEn: ['Turritopsis dohrnii', 'Hydra', 'Lobster', 'Tardigrade'],
      answer: 'Biologisch (fast) unsterbliche Lebewesen',
      answerEn: 'Biologically (nearly) immortal creatures',
      acceptedAnswers: ['unsterblich', 'unsterbliche Tiere', 'biologisch unsterblich', 'altern nicht', 'sterben nicht'],
      acceptedAnswersEn: ['immortal', 'biologically immortal', 'do not age'],
    },
    funFact: 'Qualle resettet sich, Hydra produziert nur Stammzellen, Hummer altern ohne Telomer-Verkürzung, Bärtierchen überleben Weltraum-Vakuum. Alle 4 sterben trotzdem an Fressfeinden — aber nicht an Alter.',
  }),
  item('animal-half-brain-sleep', 'BUNTE_TUETE', 'Natur & Tiere', {
    text: 'Nenne ein Tier, das schlafen kann, während ein Teil seines Gehirns wach bleibt — reihum!',
    textEn: 'Name an animal that sleeps with half its brain awake — one by one!',
    answer: 'Delfin, Pottwal, Orca, Walross, Robbe, Ente, Pinguin, Möwe, Albatros',
    answerEn: 'Dolphin, sperm whale, orca, walrus, seal, duck, penguin, gull, albatross',
    bunteTuete: { kind: 'hotPotato' },
    funFact: 'Phänomen heißt „unihemisphärischer Schlaf". Delfine schließen ein Auge, schalten die gegenüberliegende Gehirnhälfte ab — und schwimmen weiter. Enten in der Gruppen-Mitte schlafen mit beiden Hälften, am Rand mit halber.',
  }),
  item('ancient-survivors-top5', 'BUNTE_TUETE', 'Natur & Tiere', {
    text: 'Nenne eine der 5 Tierarten, die ALLE Dinosaurier-Massensterben überlebt haben!',
    textEn: 'Name one of the 5 animal groups that survived ALL mass extinctions!',
    answer: 'Pfeilschwanzkrebs, Quastenflosser, Nautilus, Hai, Krokodil',
    answerEn: 'Horseshoe crab, coelacanth, nautilus, shark, crocodile',
    bunteTuete: {
      kind: 'top5',
      answers: ['Pfeilschwanzkrebs', 'Quastenflosser', 'Nautilus', 'Hai', 'Krokodil'],
      answersEn: ['Horseshoe crab', 'Coelacanth', 'Nautilus', 'Shark', 'Crocodile'],
    },
    funFact: 'Pfeilschwanzkrebse sind ~450 Mio Jahre alt — älter als Bäume. Ihr blaues Blut wird heute medizinisch genutzt, weil es bakterielle Verunreinigungen sofort gerinnen lässt. Ein Liter kostet bis zu 15.000 $.',
  }),

  // ═══ WISSENSCHAFT & UNIVERSUM ═════════════════════════════════════════════
  item('saturn-moons', 'MUCHO', 'Wissenschaft', {
    text: 'Wie viele Monde hat der Saturn nach offiziellen Bestätigungen ungefähr (Stand 2026)?',
    textEn: 'How many moons does Saturn officially have (as of 2026)?',
    answer: '~274',
    options: ['83', '146', '~274', 'genau 200'],
    optionsEn: ['83', '146', '~274', 'exactly 200'],
    correctOptionIndex: 2,
    funFact: '2023 noch 146 Monde, 2025 stiegen sie nach einer Mega-Entdeckung auf 274, 2026 sind es 285+ — Saturn überholt Jupiter seither permanent.',
  }),
  item('marie-curie-double-nobel', 'MUCHO', 'Wissenschaft', {
    text: 'Marie Curie ist bis heute die einzige Person mit Nobelpreisen in zwei Naturwissenschaften. Welche?',
    textEn: 'Marie Curie is still the only person to win Nobel Prizes in two sciences. Which?',
    answer: 'Physik & Chemie',
    options: ['Physik & Chemie', 'Chemie & Medizin', 'Physik & Medizin', 'Chemie & Physiologie'],
    optionsEn: ['Physics & Chemistry', 'Chemistry & Medicine', 'Physics & Medicine', 'Chemistry & Physiology'],
    correctOptionIndex: 0,
    funFact: '1903 Physik (mit Pierre Curie & Becquerel), 1911 Chemie (allein, für Radium & Polonium). Ihre Notizbücher strahlen heute noch so stark, dass sie in Bleikästen aufbewahrt werden müssen.',
  }),
  item('eiffel-summer-growth', 'SCHAETZCHEN', 'Wissenschaft', {
    text: 'Um wie viele Zentimeter wächst der Eiffelturm im Sommer durch Wärmeausdehnung?',
    textEn: 'How many cm does the Eiffel Tower grow in summer due to thermal expansion?',
    answer: '15', targetValue: 15, unit: 'cm',
    funFact: '12–15 cm zwischen kältester Winter- und heißester Sommer-Messung. Plus: er neigt sich von der Sonne weg, weil die Sonnenseite stärker expandiert.',
  }),
  item('mary-anning-ichthyosaur', 'ZEHN_VON_ZEHN', 'Wissenschaft', {
    text: 'In welchem Alter machte Mary Anning ihren Fund des ersten wissenschaftlich beschriebenen Ichthyosaurus-Skeletts?',
    textEn: 'At what age did Mary Anning find the first scientifically described ichthyosaur skeleton?',
    answer: '12 Jahre',
    options: ['12 Jahre', '18 Jahre', '24 Jahre'],
    optionsEn: ['12 years', '18 years', '24 years'],
    correctOptionIndex: 0,
    funFact: 'Mary Anning grub den 5 Meter langen Schädel 1811 mit 12 Jahren aus den Klippen von Lyme Regis (England) aus. Sie durfte als Frau nicht in die Geological Society — die zitierte ihre Funde trotzdem.',
  }),
  item('stomach-acid-razor', 'SCHAETZCHEN', 'Wissenschaft', {
    text: 'Bei welchem pH-Wert (ungefähr) liegt menschliche Magensäure?',
    textEn: 'What is the approximate pH of human stomach acid?',
    answer: '1.5', targetValue: 2, unit: 'pH',
    funFact: 'pH 1.0–2.0 — stark genug, um die Klinge einer einseitigen Rasierklinge in 2 Stunden zu zerfressen (in Studien, nicht im echten Magen — die Verweildauer ist zu kurz).',
  }),
  item('star-light-8-min', 'SCHAETZCHEN', 'Wissenschaft', {
    text: 'Wie viele Minuten braucht das Licht von der Sonne zur Erde?',
    textEn: 'How many minutes does sunlight take to reach Earth?',
    answer: '8', targetValue: 8, unit: 'Minuten', unitEn: 'minutes',
    funFact: 'Exakt 8 Min 20 Sek. Wenn die Sonne genau jetzt verschwände, würden wir es erst 8 Minuten später merken. Vom nächsten Stern (Proxima Centauri) braucht Licht 4,25 Jahre.',
  }),
  item('female-nobel-connect', 'BUNTE_TUETE', 'Wissenschaft', {
    text: 'Was verbindet diese Frauen?',
    textEn: 'What connects these women?',
    answer: 'Frauen mit Nobelpreis (verschiedene Gebiete)', answerEn: 'Female Nobel laureates',
    bunteTuete: {
      kind: 'onlyConnect',
      hints: ['Marie Curie', 'Bertha von Suttner', 'Selma Lagerlöf', 'Jane Addams'],
      hintsEn: ['Marie Curie', 'Bertha von Suttner', 'Selma Lagerlöf', 'Jane Addams'],
      answer: 'Frauen mit Nobelpreis',
      answerEn: 'Women with Nobel Prizes',
      acceptedAnswers: ['Nobelpreisträgerinnen', 'Frauen mit Nobelpreis', 'Nobelpreis', 'Erste Nobelpreisträgerinnen'],
      acceptedAnswersEn: ['Nobel laureates', 'female Nobel laureates', 'first female Nobel'],
    },
    funFact: 'Curie (Physik 1903), von Suttner (Frieden 1905), Lagerlöf (Literatur 1909), Addams (Frieden 1931). Bertha von Suttners Roman „Die Waffen nieder!" überzeugte Alfred Nobel überhaupt erst, den Friedenspreis einzurichten.',
  }),

  // ═══ GESCHICHTE ═══════════════════════════════════════════════════════════
  item('shortest-war', 'SCHAETZCHEN', 'Geschichte', {
    text: 'Wie viele Minuten dauerte der kürzeste Krieg der Geschichte (Anglo-Sansibar-Krieg 1896)?',
    textEn: 'How many minutes did the shortest war in history (Anglo-Zanzibar War 1896) last?',
    answer: '38', targetValue: 38, unit: 'Minuten', unitEn: 'minutes',
    funFact: 'Am 27. August 1896 schoss die britische Royal Navy 38 Min auf den Palast von Sultan Khalid bin Barghash in Sansibar. ~500 Tote auf der Sultans-Seite, ein verwundeter britischer Matrose. Quellen schwanken zwischen 38 und 45 Minuten.',
  }),
  item('cleopatra-pyramids-gap', 'SCHAETZCHEN', 'Geschichte', {
    text: 'Wie viele Jahre liegen zwischen dem Bau der Cheops-Pyramide und Kleopatras Geburt?',
    textEn: 'How many years between Great Pyramid construction and Cleopatra\'s birth?',
    answer: '~2.500', targetValue: 2500, unit: 'Jahre', unitEn: 'years',
    funFact: 'Pyramide ~2560 v. Chr. fertig, Kleopatra 69 v. Chr. geboren. Kleopatra lebte näher an der Mondlandung (1969) als am Pyramidenbau.',
  }),
  item('pyramid-tallest-3800', 'SCHAETZCHEN', 'Geschichte', {
    text: 'Wie viele Jahre lang war die Cheops-Pyramide das höchste Bauwerk der Welt?',
    textEn: 'For how many years was the Great Pyramid the tallest building?',
    answer: '~3800', targetValue: 3800, unit: 'Jahre', unitEn: 'years',
    funFact: 'Ca. 2560 v. Chr. fertig (146,6 m hoch), abgelöst um 1311 n. Chr. vom Lincoln Cathedral (160 m). Heute ist sie nur noch 138,8 m — der Spitzenstein und einige obere Schichten fehlen.',
  }),
  item('vatican-latin-atms', 'MUCHO', 'Sprache', {
    text: 'In welcher Sprache zeigen die Geldautomaten im Vatikan ihre Menüs an?',
    textEn: 'In which language do Vatican ATMs show their menus?',
    answer: 'Latein',
    options: ['Italienisch', 'Latein', 'Französisch', 'Esperanto'],
    optionsEn: ['Italian', 'Latin', 'French', 'Esperanto'],
    correctOptionIndex: 1,
    funFact: 'Der Vatikan ist der einzige Staat mit Latein als offizieller Sprache. ATMs zeigen „Inserito scidulam quaeso" („Karte einführen bitte"). Der Papst twittert auch auf Latein (@Pontifex_ln).',
  }),
  item('sax-near-deaths', 'SCHAETZCHEN', 'Musik', {
    text: 'Wie viele nahe Todeserfahrungen überlebte Saxophon-Erfinder Adolphe Sax in seiner Kindheit?',
    textEn: 'How many near-death experiences did saxophone inventor Adolphe Sax survive?',
    answer: '7', targetValue: 7, unit: 'Beinahe-Tode', unitEn: 'near-deaths',
    funFact: 'Mit 3 fiel er auf den Kopf, eine Woche später trank er Schwefelsäure. Später Stein-auf-den-Kopf, Schießpulver-Explosion, mehrere Vergiftungen — alles vor seinem 10. Lebensjahr.',
  }),
  item('zanzibar-war-year', 'ZEHN_VON_ZEHN', 'Geschichte', {
    text: 'In welchem Jahr fand der Anglo-Sansibar-Krieg statt — der kürzeste Krieg der Geschichte?',
    textEn: 'In which year did the Anglo-Zanzibar War (shortest in history) take place?',
    answer: '1896',
    options: ['1837', '1896', '1923'],
    optionsEn: ['1837', '1896', '1923'],
    correctOptionIndex: 1,
    funFact: 'Sultan Khalid bin Barghash hatte sich illegal selbst zum Sultan erklärt. Britische Marine schoss 38 Minuten auf den Palast — Khalid floh, ~500 Tote bei seinen Truppen, 1 Verwundeter Brite.',
  }),
  item('einstein-presidency', 'CHEESE', 'Geschichte', {
    text: 'Welcher Wissenschaftler lehnte 1952 das Angebot ab, Präsident Israels zu werden?',
    textEn: 'Which scientist declined the offer to become President of Israel in 1952?',
    answer: 'Albert Einstein', answerEn: 'Albert Einstein',
    funFact: 'Einstein antwortete: „Ich bin tief bewegt vom Angebot, aber ich habe weder die natürlichen Anlagen noch die Erfahrung dafür." Sein Gehirn wurde später vom Pathologen Thomas Harvey gestohlen — 43 Jahre in Whiskey-Gläsern aufbewahrt.',
  }),
  item('jeanne-calment-age', 'SCHAETZCHEN', 'Geschichte', {
    text: 'Wie alt wurde Jeanne Calment, die älteste je dokumentierte Person der Welt?',
    textEn: 'How old was Jeanne Calment, the oldest documented person ever?',
    answer: '122', targetValue: 122, unit: 'Jahre', unitEn: 'years',
    funFact: 'Jeanne Calment (1875–1997). Traf Vincent van Gogh als Teenager im Atelier ihres Onkels und überlebte den Mauerfall. Sie behauptete, mit 117 das Rauchen aufgegeben zu haben.',
  }),
  item('celeb-patents-connect', 'BUNTE_TUETE', 'Geschichte', {
    text: 'Was verbindet diese Personen?',
    textEn: 'What connects these people?',
    answer: 'Promis mit eigenen Patenten', answerEn: 'Celebrities with patents',
    bunteTuete: {
      kind: 'onlyConnect',
      hints: ['Hedy Lamarr', 'Mark Twain', 'Marlon Brando', 'Michael Jackson'],
      hintsEn: ['Hedy Lamarr', 'Mark Twain', 'Marlon Brando', 'Michael Jackson'],
      answer: 'Promis mit eigenen Patenten',
      answerEn: 'Celebrities with patents',
      acceptedAnswers: ['Patente', 'Erfinder', 'Patentinhaber', 'haben Patente', 'Erfindungen'],
      acceptedAnswersEn: ['patents', 'inventors', 'patent holders'],
    },
    funFact: 'Hedy Lamarr (Schauspielerin): Frequenz-Hopping (Basis von WiFi/Bluetooth). Mark Twain: 3 Patente (selbstklebendes Album). Brando: Trommel-Tuning-System. Michael Jackson: Anti-Schwerkraft-Schuhe für „Smooth Criminal".',
  }),

  // ═══ GEOGRAPHIE ════════════════════════════════════════════════════════════
  item('russia-timezones', 'SCHAETZCHEN', 'Geographie', {
    text: 'Wie viele Zeitzonen umspannt Russland?',
    textEn: 'How many time zones does Russia span?',
    answer: '11', targetValue: 11, unit: 'Zeitzonen', unitEn: 'time zones',
    funFact: 'Wenn in Moskau Sonntag 23:00 Uhr ist, ist es in Kamtschatka schon Montag 08:00 Uhr — 11 Stunden Differenz im selben Land. Davor 9 (Reform 2010) und mal wieder 11 (Re-Reform 2014).',
  }),
  item('vatican-area', 'ZEHN_VON_ZEHN', 'Geographie', {
    text: 'Welcher ist der kleinste Staat der Welt nach Fläche?',
    textEn: 'Which is the smallest country in the world by area?',
    answer: 'Vatikanstadt',
    options: ['Monaco', 'Vatikanstadt', 'San Marino'],
    optionsEn: ['Monaco', 'Vatican City', 'San Marino'],
    correctOptionIndex: 1,
    funFact: '0,49 km² Fläche, ~880 Einwohner. Du kannst ihn in ~20 Minuten zu Fuß umrunden. Die Vatikanische Stadtmauer ist gleichzeitig die Staatsgrenze.',
  }),
  item('istanbul-two-continents', 'ZEHN_VON_ZEHN', 'Geographie', {
    text: 'Welche Großstadt liegt auf zwei Kontinenten?',
    textEn: 'Which major city spans two continents?',
    answer: 'Istanbul',
    options: ['Kairo', 'Istanbul', 'Suez'],
    optionsEn: ['Cairo', 'Istanbul', 'Suez'],
    correctOptionIndex: 1,
    funFact: 'Istanbul ist die einzige Großstadt der Welt auf 2 Kontinenten — Bosporus trennt Europa und Asien. ~16 Mio Einwohner verteilen sich auf beide Seiten.',
  }),
  item('mandarin-most-native', 'MUCHO', 'Sprache', {
    text: 'Welche Sprache hat die meisten Muttersprachler weltweit?',
    textEn: 'Which language has the most native speakers worldwide?',
    answer: 'Mandarin-Chinesisch',
    options: ['Englisch', 'Spanisch', 'Mandarin-Chinesisch', 'Hindi'],
    optionsEn: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'],
    correctOptionIndex: 2,
    funFact: '~940 Mio Muttersprachler Mandarin, ~485 Mio Spanisch, ~380 Mio Englisch. Aber: Englisch hat die meisten GESAMT-Sprecher (~1,5 Mrd) wenn man Zweitsprachler dazuzählt.',
  }),
  item('pisa-tilt', 'MUCHO', 'Geographie', {
    text: 'Welches berühmte Bauwerk wäre nach heutigen Sicherheitsstandards nie gebaut worden?',
    textEn: 'Which famous building would never be built today?',
    answer: 'Schiefer Turm von Pisa',
    options: ['Eiffelturm', 'Schiefer Turm von Pisa', 'Empire State Building', 'Petersdom'],
    optionsEn: ['Eiffel Tower', 'Leaning Tower of Pisa', 'Empire State Building', 'St Peter\'s'],
    correctOptionIndex: 1,
    funFact: 'Der Turm steht auf nachgebendem Lehm-Untergrund — die Schräglage entstand schon während des Baus 1173. Die Sicherungsarbeiten nach 1990 kosteten 30 Mio. €. Aktuelle Neigung: 3,97°.',
  }),
  item('china-one-timezone', 'MUCHO', 'Geographie', {
    text: 'Wie viele Zeitzonen nutzt China offiziell — obwohl es geographisch über 5 reicht?',
    textEn: 'How many time zones does China officially use, despite spanning 5 geographically?',
    answer: '1',
    options: ['1', '3', '5'],
    optionsEn: ['1', '3', '5'],
    correctOptionIndex: 0,
    funFact: 'Beijing-Zeit gilt überall — von der Pazifikküste bis nach Xinjiang (3000 km westlich). Im Westen geht die Sonne dadurch erst um ~10:00 auf. Politik > Geographie.',
  }),
  item('timbuktu-map', 'BUNTE_TUETE', 'Geographie', {
    text: 'Wo liegt Timbuktu? Setz einen Pin auf der Karte!',
    textEn: 'Where is Timbuktu? Place a pin on the map!',
    answer: 'Timbuktu (Mali)', answerEn: 'Timbuktu (Mali)',
    bunteTuete: { kind: 'map', lat: 16.7666, lng: -3.0026, targetLabel: 'Timbuktu' },
    funFact: 'Im 14. Jahrhundert war Timbuktu eines der reichsten Handelszentren der Welt — Goldhandel, 25.000 Studenten an islamischen Universitäten. „Bis nach Timbuktu reisen" wurde im Westen Synonym für „ans Ende der Welt".',
  }),
  item('two-continent-countries', 'BUNTE_TUETE', 'Geographie', {
    text: 'Nenne ein Land, das auf 2 Kontinenten liegt — reihum!',
    textEn: 'Name a country that lies on 2 continents — one by one!',
    answer: 'Russland, Türkei, Ägypten, Kasachstan, Aserbaidschan, Georgien, Indonesien, Panama',
    answerEn: 'Russia, Turkey, Egypt, Kazakhstan, Azerbaijan, Georgia, Indonesia, Panama',
    bunteTuete: { kind: 'hotPotato' },
    funFact: 'Die Türkei mit Istanbul ist der bekannteste Fall. Ägypten gehört über die Sinai-Halbinsel zu Asien. Kasachstan und Aserbaidschan ebenfalls über den Kaukasus.',
  }),
  item('great-barrier-reef', 'CHEESE', 'Geographie', {
    text: 'Welches Naturwunder ist mit über 2300 km Länge das größte Lebewesen der Erde?',
    textEn: 'Which natural wonder, over 2300km long, is the largest living thing on Earth?',
    answer: 'Großes Barriereriff', answerEn: 'Great Barrier Reef',
    funFact: 'Vom Weltraum aus sichtbar. Jeder Korallenstock besteht aus Millionen genetisch identischer Polypen. Aktuell durch Bleichevents und Erwärmung stark bedroht.',
  }),

  // ═══ TECHNOLOGIE & ERFINDUNGEN ════════════════════════════════════════════
  item('vhs-vs-beta', 'MUCHO', 'Technologie', {
    text: 'Welches Format setzte sich im Heimvideo-Krieg der späten 70er gegen Sonys Betamax durch?',
    textEn: 'Which format won the home-video format war against Sony\'s Betamax?',
    answer: 'VHS',
    options: ['VHS', 'LaserDisc', 'Video 2000', 'U-matic'],
    optionsEn: ['VHS', 'LaserDisc', 'Video 2000', 'U-matic'],
    correctOptionIndex: 0,
    funFact: 'Beta hatte bessere Bildqualität — aber VHS konnte 2 Stunden statt 1 Stunde aufnehmen und JVC vergab die Lizenz großzügig. Sony hielt Beta proprietär. Lektion: Marketing > Technik.',
  }),
  item('email-year', 'SCHAETZCHEN', 'Technologie', {
    text: 'In welchem Jahr wurde die allererste E-Mail verschickt?',
    textEn: 'In which year was the very first email sent?',
    answer: '1971', targetValue: 1971, isYearAnswer: true,
    funFact: 'Ray Tomlinson schickte sich selbst eine Test-Mail über das ARPANET — er kann sich nicht erinnern, was drinstand („irgendwas wie QWERTYUIOP"). Er erfand auch das @-Zeichen als Trennzeichen.',
  }),
  item('at-sign-inventor', 'MUCHO', 'Technologie', {
    text: 'Wer „erfand" das @-Zeichen in E-Mail-Adressen?',
    textEn: 'Who „invented" the @ symbol in email addresses?',
    answer: 'Ray Tomlinson',
    options: ['Tim Berners-Lee', 'Ray Tomlinson', 'Vint Cerf', 'Bill Gates'],
    optionsEn: ['Tim Berners-Lee', 'Ray Tomlinson', 'Vint Cerf', 'Bill Gates'],
    correctOptionIndex: 1,
    funFact: 'Tomlinson griff 1971 das @-Zeichen, weil es kaum genutzt wurde. Auf Deutsch sagt man „Klammeraffe", im Niederländischen „apenstaartje" (Affenschwänzchen), im Italienischen „chiocciola" (Schnecke).',
  }),
  item('twitter-origin', 'ZEHN_VON_ZEHN', 'Technologie', {
    text: 'Welche Plattform pivotete 2006 in das, was wir heute Twitter (X) nennen?',
    textEn: 'Which company pivoted in 2006 into what we now know as Twitter?',
    answer: 'Podcast-Plattform Odeo',
    options: ['Friendster', 'Podcast-Plattform Odeo', 'Yik Yak'],
    optionsEn: ['Friendster', 'Podcast platform Odeo', 'Yik Yak'],
    correctOptionIndex: 1,
    funFact: 'Odeo war eine Podcast-Firma — als Apple iTunes Podcasts launchte, wussten die Gründer: vorbei. Aus dem Pivot entstand Twitter. Jack Dorseys erster Tweet: „just setting up my twttr". 2021 als NFT für 2,9 Mio $ verkauft.',
  }),
  item('apple-logo-meaning', 'CHEESE', 'Technologie', {
    text: 'Welches berühmte Tech-Logo wurde nur deshalb angebissen, um es von einer Kirsche zu unterscheiden?',
    textEn: 'Which famous tech logo was bitten only to distinguish it from a cherry?',
    answer: 'Apple', answerEn: 'Apple',
    funFact: 'Designer Rob Janoff sagte später, der Biss diente nur dazu, das Logo von einer Kirsche zu unterscheiden — nicht als Anspielung auf Alan Turing oder Adam & Eva. Steve Jobs liebte den Namen, weil er alphabetisch vor „Atari" stand.',
  }),
  item('microwave-discovery', 'CHEESE', 'Technologie', {
    text: 'Welches Küchen-Gerät wurde 1945 entdeckt, weil ein Schokoladenriegel in der Hosentasche schmolz?',
    textEn: 'Which kitchen appliance was discovered in 1945 because a chocolate bar melted in someone\'s pocket?',
    answer: 'Mikrowelle', answerEn: 'Microwave',
    funFact: 'Percy Spencer (Raytheon) arbeitete an Radar, als ihm das Schmelzen auffiel. Erste Markteinführung 1947 — 1,80 m hoch, 340 kg schwer.',
  }),
  item('invention-timeline', 'BUNTE_TUETE', 'Technologie', {
    text: 'Sortiere diese Erfindungen nach Jahr, beginnend mit der ältesten!',
    textEn: 'Sort these inventions by year, starting with the oldest!',
    answer: 'Telefon, Fernseher, E-Mail, WhatsApp',
    answerEn: 'Telephone, TV, Email, WhatsApp',
    bunteTuete: {
      kind: 'order',
      items: ['E-Mail', 'WhatsApp', 'Telefon', 'Fernseher'],
      correctOrder: [2, 3, 0, 1],
      criteria: 'älteste Erfindung zuerst',
      criteriaEn: 'oldest invention first',
      itemValues: ['1971', '2009', '1876', '1925'],
    },
    funFact: 'Bells erstes Telefonat 1876: „Mr. Watson — come here — I want to see you." Baird zeigte 1925 in seinem Londoner Labor das erste TV-Bild — eine Puppe mit Bauchredner-Augen.',
  }),

  // ═══ KUNST & MUSIK ════════════════════════════════════════════════════════
  item('starry-night-asylum', 'CHEESE', 'Kunst', {
    text: 'Welches Gemälde malte Van Gogh aus dem Fenster einer Nervenheilanstalt?',
    textEn: 'Which painting did Van Gogh create from a mental asylum window?',
    answer: 'Die Sternennacht', answerEn: 'The Starry Night',
    funFact: 'Saint-Rémy-de-Provence, 1889. Er verkaufte zu Lebzeiten kaum Bilder — heute ist „Sternennacht" eins der berühmtesten Gemälde der Welt, ständig im MoMA New York ausgestellt.',
  }),
  item('frida-mirror-bed', 'CHEESE', 'Kunst', {
    text: 'Welche Künstlerin malte 55 ihrer 143 Werke als Selbstporträts?',
    textEn: 'Which artist painted 55 of her 143 works as self-portraits?',
    answer: 'Frida Kahlo', answerEn: 'Frida Kahlo',
    funFact: 'Nach einem Busunfall mit 18 verbrachte sie Monate im Bett mit einem über ihr montierten Spiegel — sie wurde ihr eigenes Modell. Heiratete Diego Rivera, ließ sich scheiden und heiratete ihn erneut.',
  }),
  item('piano-88-keys', 'SCHAETZCHEN', 'Musik', {
    text: 'Wie viele Tasten hat eine Standard-Klaviatur?',
    textEn: 'How many keys does a standard piano have?',
    answer: '88', targetValue: 88, unit: 'Tasten', unitEn: 'keys',
    funFact: '52 weiße + 36 schwarze. Davor experimentierte man mit bis zu 97 Tasten — aber das menschliche Ohr unterscheidet die extremen Frequenzen kaum noch. Steinway etablierte 88 um 1880 als Standard.',
  }),
  item('bmth-founded', 'SCHAETZCHEN', 'Musik', {
    text: 'In welchem Jahr wurde die Band Bring Me The Horizon gegründet?',
    textEn: 'In what year was the band Bring Me The Horizon founded?',
    answer: '2004', targetValue: 2004, unit: '', unitEn: '',
    funFact: 'Bring Me The Horizon gründete sich 2004 in Sheffield (UK) um Frontmann Oli Sykes — damals war er 17. Stilistisch wanderten sie von Deathcore über Metalcore (Sempiternal, 2013) zu Stadion-Rock (That\'s The Spirit, 2015) bis zu Pop/Synth-Sound auf „POST HUMAN: NeX GEn" (2024). Wenige Bands haben so radikal das Genre gewechselt — und ihre Fans mitgenommen.',
  }),
  item('mona-lisa-eyebrows', 'CHEESE', 'Kunst', {
    text: 'Welches berühmte Porträt hat keine Augenbrauen?',
    textEn: 'Which famous portrait has no eyebrows?',
    answer: 'Mona Lisa', answerEn: 'Mona Lisa',
    funFact: 'Entweder weil rasierte Augenbrauen damals Mode waren, oder weil Leonardo die feinen Härchen mit einer empfindlichen Lasur malte, die spätere Restauratoren weggewaschen haben. Hochauflösende Scans zeigen Spuren.',
  }),

  // ═══ ESSEN & TRINKEN ════════════════════════════════════════════════════════
  item('honey-never-spoils', 'ZEHN_VON_ZEHN', 'Essen & Trinken', {
    text: 'Welches Lebensmittel verdirbt unter normalen Bedingungen niemals?',
    textEn: 'Which food never spoils under normal conditions?',
    answer: 'Honig',
    options: ['Honig', 'Salz', 'Beides verdirbt nicht'],
    optionsEn: ['Honey', 'Salt', 'Both never spoil'],
    correctOptionIndex: 2,
    funFact: 'In ägyptischen Pyramiden wurde 3000 Jahre alter Honig gefunden — noch essbar. Das saure pH + niedrige Wasseraktivität machen Honig zur Bakterien-Wüste.',
  }),
  item('never-spoils-hotpotato', 'BUNTE_TUETE', 'Essen & Trinken', {
    text: 'Nenne ein Lebensmittel, das unter normalen Bedingungen NIEMALS verdirbt — reihum!',
    textEn: 'Name a food that never spoils — one by one!',
    answer: 'Honig, Salz, Zucker, weißer Reis, Essig (purer), Vanille-Extrakt, Sojasauce, Maple-Sirup, Trockenbohnen',
    answerEn: 'Honey, salt, sugar, white rice, pure vinegar, vanilla extract, soy sauce, maple syrup, dried beans',
    bunteTuete: { kind: 'hotPotato' },
    funFact: '3000 Jahre alter Honig in Pyramiden — noch essbar. Salz und Zucker sind Konservierungsmittel an sich. Essig + Sojasauce sind durch Fermentation/Säure bereits konserviert.',
  }),

  // ═══ WOLF-BATCH 2026-05-20 ═══════════════════════════════════════════════════
  item('cargo-ship-hh-vancouver', 'SCHAETZCHEN', 'Geographie', {
    text: 'Wie lange braucht ein Containerschiff von Hamburg nach Vancouver durchschnittlich?',
    textEn: 'How long does a container ship take from Hamburg to Vancouver on average?',
    answer: '~30 Tage', answerEn: '~30 days',
    targetValue: 30, unit: 'Tage', unitEn: 'days',
    funFact: 'Standard-Route via Panama-Kanal: 28-32 Tage. Über den Suez-Kanal + Pazifik dauerts ~45 Tage. Schnellste Express-Frachter schaffen Hamburg-Vancouver in 22 Tagen — aber Bunker-Diesel kostet dann 2× so viel.',
  }),

  item('feta-rules', 'MUCHO', 'Essen & Trinken', {
    text: 'Was macht einen Feta aus, dass er den Namen tragen darf?',
    textEn: 'What does a feta need to legally carry that name?',
    answer: 'Aus Schafs- und Ziegenmilch in bestimmten Regionen Griechenlands',
    options: [
      'Aus Schafs- und Ziegenmilch in bestimmten Regionen Griechenlands',
      'Aus Kuhmilch, beliebige Herkunft',
      'Aus jeder Milchsorte, solange er weiß und in Salzlake ist',
      'Aus Schafsmilch, EU-weit produziert',
    ],
    optionsEn: [
      'Sheep and goat milk, from specific regions of Greece',
      'Cow milk, any origin',
      'Any milk, as long as it\'s white and in brine',
      'Sheep milk, produced anywhere in the EU',
    ],
    correctOptionIndex: 0,
    funFact: 'Seit 2002 EU-geschützte Ursprungsbezeichnung. Mind. 70% Schafsmilch, max. 30% Ziegenmilch, aus Festland-Griechenland oder Insel Lesbos. Dänischer „Feta" musste nach EuGH-Urteil 2022 umbenannt werden.',
  }),

  item('mount-rushmore-map', 'BUNTE_TUETE', 'Geographie', {
    text: 'Wo liegt Mount Rushmore? Setz einen Pin auf der Karte!',
    textEn: 'Where is Mount Rushmore? Place a pin on the map!',
    answer: 'Black Hills, South Dakota, USA',
    answerEn: 'Black Hills, South Dakota, USA',
    bunteTuete: { kind: 'map', lat: 43.8791, lng: -103.4591, targetLabel: 'Mount Rushmore' },
    funFact: 'Geplant war ursprünglich ein „Garten der Helden" mit westlichen Pionieren. Aus Geld-Gründen wurde es auf 4 Präsidenten reduziert. Granit-Erosion: ~2,5 cm in 10.000 Jahren — die Gesichter überstehen das nächste Eiszeit-Zyklus locker.',
  }),

  item('not-commonwealth', 'MUCHO', 'Geographie', {
    text: 'Welches Land ist NICHT Teil des Commonwealth?',
    textEn: 'Which country is NOT part of the Commonwealth?',
    answer: 'Irland',
    options: ['Kanada', 'Australien', 'Indien', 'Irland'],
    optionsEn: ['Canada', 'Australia', 'India', 'Ireland'],
    correctOptionIndex: 3,
    funFact: 'Irland trat 1949 aus — als das Land Republik wurde, war eine Mitgliedschaft mit dem damaligen Statut nicht mehr vereinbar. Indien blieb trotz Republik-Status drin (Spezialregel 1949). Kanada + Australien sind sogar noch Commonwealth-Realms mit König Charles als Staatsoberhaupt.',
  }),

  item('el-nino-explained', 'MUCHO', 'Wissenschaft', {
    text: 'Was ist El Niño?',
    textEn: 'What is El Niño?',
    answer: 'Ein periodisches Klimaphänomen mit Erwärmung des Pazifiks',
    options: [
      'Ein periodisches Klimaphänomen mit Erwärmung des Pazifiks',
      'Ein tropischer Wirbelsturm in der Karibik',
      'Ein Erdbeben-Frühwarnsystem in Chile',
      'Ein spanischer Kinderchor',
    ],
    optionsEn: [
      'A periodic climate phenomenon with Pacific warming',
      'A tropical hurricane in the Caribbean',
      'An earthquake early-warning system in Chile',
      'A Spanish children\'s choir',
    ],
    correctOptionIndex: 0,
    funFact: 'Name kommt von peruanischen Fischern: „El Niño" = das Christkind, weil das Phänomen meist um Weihnachten beginnt. Tritt alle 2-7 Jahre auf, dauert 9-12 Monate. Globale Folgen: Dürren in Australien, Fluten in Südamerika, milde Winter in Europa.',
  }),

  item('hamburg-plz-count', 'SCHAETZCHEN', 'Geographie', {
    text: 'Wie viele Postleitzahlen hat Hamburg?',
    textEn: 'How many postal codes does Hamburg have?',
    answer: '190', answerEn: '190',
    targetValue: 190, unit: 'PLZ', unitEn: 'postal codes',
    funFact: 'Hamburg hat 190 verschiedene PLZ-Bereiche (Stand 2024) — von 20095 (Altstadt) bis 22769 (Altona). Berlin hat 198, München 91. Die kleinste PLZ-Stadt Deutschlands ist Ottenhöfen im Schwarzwald mit nur einer einzigen.',
  }),

  item('tattoo-origin', 'MUCHO', 'Sprache & Etymologie', {
    text: 'Woher kommt der Name „Tattoo"?',
    textEn: 'Where does the word „Tattoo" come from?',
    answer: 'Vom polynesischen „tatau" (Klopfgeräusch beim Stechen)',
    options: [
      'Vom polynesischen „tatau" (Klopfgeräusch beim Stechen)',
      'Vom italienischen „tato" (= geliebt)',
      'Vom englischen „tatter" (= Stoff-Fetzen)',
      'Vom japanischen „tatō" (= Symbol)',
    ],
    optionsEn: [
      'From Polynesian „tatau" (tapping sound when stippling)',
      'From Italian „tato" (= beloved)',
      'From English „tatter" (= rag/scrap)',
      'From Japanese „tatō" (= symbol)',
    ],
    correctOptionIndex: 0,
    funFact: 'Kapitän James Cook brachte das Wort 1769 von Tahiti mit nach Europa. Vorher gab es im Englischen nur „pricking" oder „staining". Im Deutschen wurde es als „Tätowierung" eingedeutscht — die ursprüngliche Klopf-Lautmalerei steckt noch drin.',
  }),

  item('eu-euro-country', 'ZEHN_VON_ZEHN', 'Geographie', {
    text: 'Welches dieser EU-Länder hat den Euro als offizielle Währung eingeführt?',
    textEn: 'Which of these EU countries has officially adopted the Euro?',
    answer: 'Kroatien', answerEn: 'Croatia',
    options: ['Kroatien', 'Bulgarien', 'Rumänien'],
    optionsEn: ['Croatia', 'Bulgaria', 'Romania'],
    correctOptionIndex: 0,
    funFact: 'Kroatien hat am 1. Januar 2023 den Euro eingeführt — als 20. Mitglied der Eurozone und gleichzeitig dem Schengen-Raum beigetreten. Bulgarien und Rumänien haben den Euro-Beitritt geplant, aber noch nicht vollzogen — sie nutzen weiter Lew bzw. Leu. (Stand 2026)',
  }),
  item('disney-first-feature', 'ZEHN_VON_ZEHN', 'Popkultur', {
    text: 'Welcher dieser Disney-Trickfilme erschien zuerst?',
    textEn: 'Which of these Disney animated features came out first?',
    answer: 'Schneewittchen und die sieben Zwerge',
    answerEn: 'Snow White and the Seven Dwarfs',
    options: ['Pinocchio', 'Schneewittchen und die sieben Zwerge', 'Bambi'],
    optionsEn: ['Pinocchio', 'Snow White and the Seven Dwarfs', 'Bambi'],
    correctOptionIndex: 1,
    funFact: 'Schneewittchen (1937) war der allererste abendfüllende Disney-Trickfilm überhaupt. Pinocchio folgte 1940, Bambi 1942. Schneewittchen wurde intern als „Disney\'s Folly" verspottet, weil niemand glaubte, dass Erwachsene 83 Minuten Zeichentrick anschauen würden — wurde dann der bis dahin erfolgreichste Tonfilm überhaupt.',
  }),
  item('google-logo-color-order', 'ZEHN_VON_ZEHN', 'Technologie', {
    text: 'In welcher Reihenfolge erscheinen die Farben im Google-Logo (Buchstaben G-o-o-g-l-e von links nach rechts)?',
    textEn: 'In which order do the colors appear in the Google logo (letters G-o-o-g-l-e, left to right)?',
    answer: 'Blau, Rot, Gelb, Blau, Grün, Rot',
    answerEn: 'Blue, Red, Yellow, Blue, Green, Red',
    options: [
      'Blau, Rot, Gelb, Blau, Grün, Rot',
      'Blau, Gelb, Rot, Blau, Grün, Rot',
      'Rot, Gelb, Blau, Grün, Blau, Rot',
    ],
    optionsEn: [
      'Blue, Red, Yellow, Blue, Green, Red',
      'Blue, Yellow, Red, Blue, Green, Red',
      'Red, Yellow, Blue, Green, Blue, Red',
    ],
    correctOptionIndex: 0,
    funFact: 'Die korrekte Reihenfolge ist Blau-Rot-Gelb-Blau-Grün-Rot. Die meisten erkennen die 4 Primärfarben (Blau, Rot, Gelb, Grün), aber niemand merkt sich die exakte Permutation. Das aktuelle Logo („Product Sans") gibt es seit 2015 — die Farbreihenfolge hat sich seit dem Original von 1998 nicht geändert.',
  }),
  item('singer-real-names', 'ZEHN_VON_ZEHN', 'Popkultur', {
    text: 'Eine dieser Personen ist KEINE bekannte Sängerin — welche?',
    textEn: 'One of these people is NOT a famous singer — which one?',
    answer: 'Melissa Benoist',
    answerEn: 'Melissa Benoist',
    options: [
      'Robyn Rajad Fenty',
      'Ashley Nicolette Frangipane',
      'Melissa Benoist',
    ],
    optionsEn: [
      'Robyn Rajad Fenty',
      'Ashley Nicolette Frangipane',
      'Melissa Benoist',
    ],
    correctOptionIndex: 2,
    funFact: 'Auflösung: Robyn Rajad Fenty = Rihanna · Ashley Nicolette Frangipane = Halsey · Melissa Benoist = US-Schauspielerin (Supergirl, Glee, Whiplash). Halseys Künstlername ist übrigens ein Anagramm ihres Vornamens „Ashley".',
  }),

  item('vegan-top5-countries', 'BUNTE_TUETE', 'Essen & Trinken', {
    text: 'Nenne eines der 5 Länder mit den meisten Veganer:innen — prozentual zur Bevölkerung!',
    textEn: 'Name one of the top 5 countries with the highest share of vegans!',
    answer: 'Israel, Großbritannien, Schweden, Deutschland, Österreich',
    answerEn: 'Israel, United Kingdom, Sweden, Germany, Austria',
    bunteTuete: {
      kind: 'top5',
      answers: ['Israel', 'Großbritannien', 'Schweden', 'Deutschland', 'Österreich'],
      answersEn: ['Israel', 'United Kingdom', 'Sweden', 'Germany', 'Austria'],
    },
    funFact: 'Israel ist seit Jahren weltweit führend (~5% Veganer:innen) — Tel Aviv gilt als „vegane Hauptstadt der Welt". Deutschland hat den größten veganen Produktmarkt Europas (~3 Mrd. €/Jahr), trotz „nur" 2-3% Veganer-Anteil.',
  }),

  // ═══ POPKULTUR & FILM ════════════════════════════════════════════════════════
  item('longest-detective-series', 'BUNTE_TUETE', 'Film & TV', {
    text: 'Nenne eine der 5 längsten Krimi-Reihen im deutschsprachigen Fernsehen!',
    textEn: 'Name one of the 5 longest German-language detective TV series!',
    answer: 'Tatort, Polizeiruf 110, Aktenzeichen XY ungelöst, Der Alte, Soko 5113',
    answerEn: 'Tatort, Polizeiruf 110, Aktenzeichen XY ungelöst, Der Alte, Soko 5113',
    bunteTuete: {
      kind: 'top5',
      answers: ['Tatort', 'Polizeiruf 110', 'Aktenzeichen XY ungelöst', 'Der Alte', 'Soko 5113'],
      answersEn: ['Tatort', 'Polizeiruf 110', 'Aktenzeichen XY', 'Der Alte', 'Soko 5113'],
    },
    funFact: 'Tatort läuft seit 1970 — über 1200 Folgen. Polizeiruf 110 startete 1971 als DDR-Antwort und läuft bis heute weiter — bisher älteste durchgehende deutsche Krimi-Reihe.',
  }),

  // ═══ WOLF-BATCH 2026-05-23 — CHEESE-BILDFRAGEN ═══════════════════════════════
  // Bild ergänzt Wolf beim Import im Builder. Text + Antwort sind generisch
  // gehalten („Welches X ist auf dem Bild zu sehen?") — das Bild trägt die Frage.
  item('saffron', 'CHEESE', 'Essen & Trinken', {
    text: 'Welches Gewürz ist auf dem Bild zu sehen?',
    textEn: 'Which spice is shown in the picture?',
    answer: 'Safran', answerEn: 'Saffron',
    funFact: 'Safran besteht aus den getrockneten Narben der Krokusblüte — pro Blüte nur 3 Stück. Für 1 kg braucht es etwa 200.000 Blüten und ~400 Stunden Handarbeit, daher der Preis von 5.000-10.000 €/kg. Iran produziert rund 90% des Welt-Safrans.',
  }),
  item('handpan', 'CHEESE', 'Musik', {
    text: 'Welches Instrument ist auf dem Bild zu sehen?',
    textEn: 'Which instrument is shown in the picture?',
    answer: 'Handpan', answerEn: 'Handpan',
    funFact: 'Erfunden im Jahr 2000 in Bern von PANArt (Felix Rohner + Sabina Schärer) als „Hang" — Berndeutsch für „Hand". Das UFO-förmige Stahlinstrument hat 8-9 gestimmte Töne und wird mit den Händen gespielt. „Handpan" ist heute der Gattungsbegriff, weil PANArt den Original-Namen markenrechtlich geschützt hat.',
  }),
  item('okapi', 'CHEESE', 'Natur & Tiere', {
    text: 'Welches Tier ist auf dem Bild zu sehen?',
    textEn: 'Which animal is shown in the picture?',
    answer: 'Okapi', answerEn: 'Okapi',
    funFact: 'Erst 1901 wissenschaftlich beschrieben — davor hielten Europäer es für einen Mythos („African Unicorn"). Das Okapi ist der einzige lebende Verwandte der Giraffe. Es hat eine 30 cm lange blau-graue Zunge, mit der es sich auch die Ohren putzen kann. Lebt ausschließlich im Ituri-Regenwald (DR Kongo).',
  }),
  item('wasabi-plant', 'CHEESE', 'Natur & Tiere', {
    text: 'Welche Pflanze ist auf dem Bild zu sehen?',
    textEn: 'Which plant is shown in the picture?',
    answer: 'Wasabi', answerEn: 'Wasabi',
    funFact: 'Echtes Wasabi (Wasabia japonica) wächst nur in bestimmten Bach-Schatten-Lagen Japans und ist eine der schwierigsten Nutzpflanzen der Welt im Anbau. Rund 95% des „Wasabi" weltweit ist eingefärbter Meerrettich + Senf — sogar in Japan! Das echte Rhizom kostet ~150 €/kg.',
  }),
  item('paraguay-flag', 'CHEESE', 'Geographie', {
    text: 'Welches Land hat diese Flagge?',
    textEn: 'Which country has this flag?',
    answer: 'Paraguay', answerEn: 'Paraguay',
    funFact: 'Paraguay hat die einzige Nationalflagge der Welt mit unterschiedlichen Vor- und Rückseiten: vorn das Staatswappen mit Stern, hinten das Schatzkammer-Siegel mit Löwe und der Aufschrift „Paz y Justicia". Eingeführt 1842, heutige Form seit 2013.',
  }),
  item('atomium', 'CHEESE', 'Geographie', {
    text: 'Welches Bauwerk ist auf dem Bild zu sehen?',
    textEn: 'Which structure is shown in the picture?',
    answer: 'Atomium', answerEn: 'Atomium',
    funFact: 'Gebaut für die Weltausstellung 1958 in Brüssel — eine Eisen-Kristallstruktur, 165 Milliarden Mal vergrößert. Ursprünglich nur als 6-Monate-Provisorium gedacht, wurde es zu Belgiens Wahrzeichen. 102 m hoch, 2.400 Tonnen Stahl, 9 begehbare Kugeln verbunden durch Rolltreppen-Röhren.',
  }),
  item('alysa-liu-sport', 'CHEESE', 'Sport', {
    text: 'In welcher Sportart hat diese Olympiasiegerin Gold gewonnen?',
    textEn: 'In which sport did this Olympic champion win gold?',
    answer: 'Eiskunstlauf', answerEn: 'Figure Skating',
    funFact: 'Alysa Liu (USA, *2005) holte bei den Olympischen Winterspielen 2026 in Mailand-Cortina Gold im Eiskunstlauf. Mit 13 wurde sie 2019 jüngste US-Meisterin der Geschichte — pausierte 2022 ihre Karriere und kam 2024 stärker zurück. Sie widerspricht vielen Klassik-Klischees des Eiskunstlaufs: kurze Haare, asiatisch-amerikanisch, vegan, sehr fokussiert auf Athletik statt Glamour.',
  }),
  item('first-mammal-space', 'BUNTE_TUETE', 'Wissenschaft', {
    text: 'Welches Tier war das erste Säugetier im Weltall (über der Kármán-Linie, 100 km)?',
    textEn: 'Which animal was the first mammal in space (above the Kármán line, 100 km)?',
    answer: 'Albert II (Rhesusaffe)',
    answerEn: 'Albert II (Rhesus monkey)',
    bunteTuete: {
      kind: 'bluff',
      realAnswer: 'Albert II (Rhesusaffe)',
      realAnswerEn: 'Albert II (Rhesus monkey)',
    },
    funFact: 'Am 14. Juni 1949 erreichte der Rhesusaffe Albert II in einer US-V-2-Rakete eine Höhe von ~134 km — das erste Säugetier über der Kármán-Linie. Er überlebte den Flug nicht (Fallschirm-Versagen beim Aufprall). Sein Vorgänger Albert I (1948) starb schon vor Erreichen der Weltraum-Grenze. Häufige Falle: die berühmte Hündin Laika kam erst 1957 — und war das erste Tier in der Erdumlaufbahn, nicht das erste Säugetier im All. Die ersten Tiere überhaupt im All (1947) waren Fruchtfliegen.',
  }),
  item('flags-no-red', 'BUNTE_TUETE', 'Geographie', {
    text: 'Nenne ein Land, dessen Nationalflagge ohne die Farbe Rot auskommt!',
    textEn: 'Name a country whose national flag contains no red!',
    answer: 'Argentinien, Brasilien, Irland, Indien, Niger, Côte d\'Ivoire, Schweden, Finnland, Griechenland, Ukraine, Israel, Saudi-Arabien, Bhutan, Pakistan, Estland, Botswana, Bahamas, Kasachstan',
    answerEn: 'Argentina, Brazil, Ireland, India, Niger, Côte d\'Ivoire, Sweden, Finland, Greece, Ukraine, Israel, Saudi Arabia, Bhutan, Pakistan, Estonia, Botswana, Bahamas, Kazakhstan',
    bunteTuete: { kind: 'hotPotato' },
    funFact: 'Rund 75% aller Nationalflaggen enthalten Rot — eine der häufigsten Farben weltweit. Orange zählt NICHT als Rot (Irland, Niger, Indien, Bhutan ok). Häufige Trugschlüsse: Italien, Mexiko, Niederlande, Belgien, Schweiz — alle haben Rot drin, auch wenn man sie mit Grün oder Orange assoziiert.',
  }),
];
