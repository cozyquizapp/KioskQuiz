export const MECHANIC_RULES = {
  Schaetzchen: {
    category: 'Schaetzchen',
    icon: '📊',
    type: 'SCHAETZCHEN',
    mechanic: 'estimate',
    description: 'Schätzfragen - Teams müssen einen numerischen Wert schätzen',
    rules: [
      'Teams geben eine Zahl ein (z.B. 2500000)',
      'Das Team, das am nächsten dran ist, gewinnt die Punkte',
      'Braucht: targetValue (Zielwert) und optional unit (Einheit)'
    ],
    example: {
      question: 'Wie viele Liter Wasser fasst ein olympisches Schwimmbecken?',
      targetValue: 2_500_000,
      unit: 'Liter'
    }
  },
  'Mu-Cho': {
    category: 'Mu-Cho',
    icon: '🅰️',
    type: 'MU_CHO',
    mechanic: 'multipleChoice',
    description: 'Multiple Choice - Teams wählen eine von vier Optionen',
    rules: [
      'Genau 4 Antwortoptionen (A, B, C, D)',
      'Teams wählen einen Buchstaben',
      'correctIndex gibt die richtige Option an (0 = A, 1 = B, etc.)',
      'Braucht: options (Array mit 4 Strings) und correctIndex'
    ],
    example: {
      question: 'Welche Stadt liegt am weitesten nördlich?',
      options: ['Paris', 'London', 'Berlin', 'Dublin'],
      correctIndex: 1
    }
  },
  Stimmts: {
    category: 'Stimmts',
    icon: '🎯',
    type: 'STIMMTS',
    mechanic: 'betting',
    description: 'Punkte verteilen - Teams verteilen 10 Punkte auf 3 Optionen',
    rules: [
      'Teams haben 10 Punkte zum Verteilen',
      '3 Optionen: "Ja, stimmt", "Nein, stimmt nicht", "Unsicher"',
      'Punkte auf der richtigen Option werden gutgeschrieben',
      'Braucht: options (3 Strings), correctIndex, pointsPool (meist 10)'
    ],
    example: {
      question: 'Die ISS umrundet die Erde in ca. 90 Minuten.',
      options: ['Ja, stimmt', 'Nein, stimmt nicht', 'Unsicher'],
      correctIndex: 0,
      pointsPool: 10
    }
  },
  Cheese: {
    category: 'Cheese',
    icon: '🖼️',
    type: 'CHEESE',
    mechanic: 'imageQuestion',
    description: 'Bildfragen - Teams sehen ein Bild und müssen es identifizieren',
    rules: [
      'Bild wird angezeigt (imageUrl oder media.url)',
      'Teams geben eine Textantwort ein',
      'Braucht: imageUrl oder media-Block, answer (richtige Antwort)'
    ],
    example: {
      question: 'Welches Wahrzeichen ist hier zu sehen?',
      imageUrl: '/uploads/eiffel.jpg',
      answer: 'Eiffelturm'
    }
  },
  GemischteTuete: {
    category: 'GemischteTuete',
    icon: '🎲',
    type: 'BUNTE_TUETE',
    mechanic: 'custom',
    description: 'Bunte Tüte - Verschiedene Mechaniken pro Frage',
    rules: [
      'Diese Kategorie hat 4 verschiedene Unter-Mechaniken',
      'Jede Frage definiert ihre eigene Mechanik im bunteTuete-Feld',
      'Die Mechanik ändert sich von Frage zu Frage!'
    ],
    subMechanics: [
      {
        kind: 'top5',
        label: '🏆 Top 5',
        description: 'Teams geben 5 Antworten ein, die sie für die Top 5 halten (Freitext)',
        rules: [
          'Teams sehen nur die Frage (KEINE vorgegebenen Items)',
          'Teams geben 5 Antworten als Freitext ein',
          'Die Reihenfolge/Position ist NICHT wichtig',
          'correctOrder enthält die 5 korrekten Antworten (Strings)',
          'Optional: items-Array kann für Auflösung mit Plätzen verwendet werden',
          'Braucht: correctOrder (Array mit 5 Strings)'
        ],
        example: {
          prompt: 'Welche 5 Fast-Food-Gerichte sind die beliebtesten?',
          correctOrder: ['Burger', 'Pizza', 'Pommes', 'Döner', 'Currywurst']
        }
      },
      // precision: hidden — durch Weltkarte ersetzt (bleibt im Backend für bestehende Fragen)
      {
        kind: 'oneOfEight',
        label: '❌ 1 von 8 falsch',
        description: 'Teams identifizieren eine falsche Aussage aus 8 Statements',
        rules: [
          '8 Statements werden angezeigt',
          '1 davon ist falsch (isFalse: true)',
          'Teams wählen den Buchstaben der falschen Aussage',
          'Braucht: statements (Array mit 8 Objekten, eines mit isFalse: true)'
        ],
        example: {
          prompt: 'Welche dieser Aussagen ist falsch?',
          statements: [
            { id: 'a', text: 'Die Erde ist rund', isFalse: false },
            { id: 'b', text: 'Wasser kocht bei 100°C', isFalse: false },
            { id: 'c', text: 'Der Mond ist aus Käse', isFalse: true }
          ]
        }
      },
      {
        kind: 'order',
        label: '🔢 Ordnen nach Kriterium',
        description: 'Teams sortieren Items nach einem wählbaren Kriterium',
        rules: [
          'Items können nach verschiedenen Kriterien sortiert werden',
          'z.B. "Größe", "Alter", "Gewicht"',
          'correctByCriteria definiert die richtige Reihenfolge pro Kriterium',
          'Braucht: items, criteriaOptions, correctByCriteria (Record<criteriaId, order[]>)'
        ],
        example: {
          prompt: 'Sortiere die Tiere',
          items: [
            { id: 'elephant', label: 'Elefant' },
            { id: 'mouse', label: 'Maus' },
            { id: 'dog', label: 'Hund' }
          ],
          criteriaOptions: [
            { id: 'size', label: 'Nach Größe' },
            { id: 'weight', label: 'Nach Gewicht' }
          ],
          correctByCriteria: {
            size: ['elephant', 'dog', 'mouse'],
            weight: ['elephant', 'dog', 'mouse']
          }
        }
      }
    ]
  }
};
