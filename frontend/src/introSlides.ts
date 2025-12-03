export type IntroSlide = {
  title: string;
  subtitle: string;
  body: string;
  badge?: string;
};

export const introSlides: IntroSlide[] = [
  {
    title: 'Willkommen zum Cozy Bingo Quiz',
    subtitle: 'Kurz erklärt',
    body: 'Ihr spielt Kategorie für Kategorie. Jede Runde bringt Punkte aufs Bingo-Board – also schön aufmerksam bleiben und gemeinsam rätseln.',
    badge: 'Intro'
  },
  {
    title: 'So läuft eine Frage ab',
    subtitle: 'Frage sehen → Timer läuft',
    body: 'Ihr seht die Frage, dann startet der Timer automatisch. Antworten sauber eintippen, abschicken – danach wird ausgewertet.',
    badge: 'Ablauf'
  },
  {
    title: 'Ready-Status',
    subtitle: 'Alle müssen bereit sein',
    body: 'Vor dem Start: Drückt „Team ist bereit“. Erst wenn alle Teams bereit sind, geht es los. Sonst warten wir.',
    badge: 'Regel'
  },
  {
    title: 'Schätzfragen',
    subtitle: 'Am nächsten dran gewinnt',
    body: 'Bei Schätzfragen zählt, wer am nächsten liegt. Extremwerte riskieren, oder konservativ bleiben? Eure Entscheidung.',
    badge: 'Regel'
  },
  {
    title: 'Bilder & Cheese',
    subtitle: 'Genau hinsehen',
    body: 'Manche Fragen zeigen Bilder. Nutzt jedes Detail – Logos, Farben, Hintergründe können Hinweise sein.',
    badge: 'Regel'
  },
  {
    title: 'Fair Play',
    subtitle: 'Kein Googeln, nur Teamwork',
    body: 'Bitte ehrlich bleiben: Keine Suche im Netz. Der Spaß kommt vom gemeinsamen Raten, nicht von der schnellsten Suche.',
    badge: 'Fairplay'
  }
];
