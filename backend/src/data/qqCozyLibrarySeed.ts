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
];
