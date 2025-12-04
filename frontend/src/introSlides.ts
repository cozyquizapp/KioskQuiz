export type IntroSlide = {
  title: string;
  subtitle: string;
  body: string;
  badge?: string;
};

export const introSlides: Record<'de' | 'en', IntroSlide[]> = {
  de: [
    {
      title: 'Willkommen zum Cozy Kiosk Quiz',
      subtitle: 'Kurz erklaert',
      body: 'Ihr spielt Kategorie fuer Kategorie. Jede Runde bringt Punkte aufs Bingo-Board, also aufmerksam bleiben und gemeinsam raetseln.',
      badge: 'Intro'
    },
    {
      title: 'So laeuft eine Frage ab',
      subtitle: 'Frage sehen, Timer laeuft',
      body: 'Ihr seht die Frage, dann startet der Timer automatisch. Antwort eintippen, abschicken – danach wird ausgewertet.',
      badge: 'Ablauf'
    },
    {
      title: 'Ready-Status',
      subtitle: 'Alle muessen bereit sein',
      body: 'Vor dem Start: Drueckt "Team ist bereit". Erst wenn alle Teams bereit sind, geht es los. Sonst warten wir.',
      badge: 'Regel'
    },
    {
      title: 'Schaetzfragen',
      subtitle: 'Am naechsten dran gewinnt',
      body: 'Bei Schaetzfragen zaehlt, wer am naechsten liegt. Extremwert riskieren oder konservativ bleiben? Eure Entscheidung.',
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
  ],
  en: [
    {
      title: 'Welcome to Cozy Kiosk Quiz',
      subtitle: 'Quick overview',
      body: 'You play category by category. Each round adds points to your bingo board, so stay sharp and solve together.',
      badge: 'Intro'
    },
    {
      title: 'How a question runs',
      subtitle: 'Question shows, timer starts',
      body: 'You see the question, the timer starts automatically. Type your answer, submit it – then we evaluate.',
      badge: 'Flow'
    },
    {
      title: 'Ready status',
      subtitle: 'Everyone must be ready',
      body: 'Before we start: press "Team is ready". Only when all teams are ready we begin. Otherwise we wait.',
      badge: 'Rule'
    },
    {
      title: 'Estimation questions',
      subtitle: 'Closest wins',
      body: 'For estimation, the closest answer wins. Take the risk with an extreme value or stay conservative – your call.',
      badge: 'Rule'
    },
    {
      title: 'Images & Cheese',
      subtitle: 'Look closely',
      body: 'Some questions show images. Use every detail – logos, colors, backgrounds can be hints.',
      badge: 'Rule'
    },
    {
      title: 'Fair play',
      subtitle: 'No Googling',
      body: 'Stay honest: no searching the web. The fun comes from guessing together, not from the fastest search.',
      badge: 'Fairplay'
    }
  ]
};
