export type IntroSlide = {
  title: string;
  subtitle: string;
  body: string;
  badge: string;
};

export const INTRO_SLIDES: IntroSlide[] = [
  {
    title: 'Willkommen zum Cozy Bingo Quiz',
    subtitle: 'Kurz erklaert',
    body: 'Ihr spielt Kategorie fuer Kategorie. Jede Runde bringt Punkte aufs Bingo-Board – also aufmerksam bleiben und gemeinsam raetseln.',
    badge: 'Intro'
  },
  {
    title: 'So laeuft eine Frage ab',
    subtitle: 'Frage sehen, Timer laeuft',
    body: 'Ihr seht die Frage, dann startet der Timer automatisch. Antworten sauber eintippen, abschicken – danach wird ausgewertet.',
    badge: 'Ablauf'
  },
  {
    title: 'Ready-Status',
    subtitle: 'Alle muessen bereit sein',
    body: 'Vor dem Start: Drueckt „Team ist bereit“. Erst wenn alle Teams bereit sind, geht es los. Sonst warten wir.',
    badge: 'Regel'
  },
  {
    title: 'Schaetzfragen',
    subtitle: 'Am naechsten dran gewinnt',
    body: 'Bei Schaetzfragen zaehlt, wer am naechsten liegt. Extremwerte riskieren oder konservativ bleiben? Eure Entscheidung.',
    badge: 'Regel'
  },
  {
    title: 'Bilder & Cheese',
    subtitle: 'Genau hinsehen',
    body: 'Manche Fragen zeigen Bilder. Nutzt jedes Detail – Logos, Farben, Hintergruende koennen Hinweise sein.',
    badge: 'Regel'
  },
  {
    title: 'Fair Play',
    subtitle: 'Kein Googeln, nur Teamwork',
    body: 'Bitte ehrlich bleiben: Keine Suche im Netz. Der Spass kommt vom gemeinsamen Raten, nicht von der schnellsten Suche.',
    badge: 'Fairplay'
  }
];
