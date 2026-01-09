# 🎮 Test-Quiz Erstellung

## Schnellanleitung

### Option 1: Über den Builder (GUI)
1. Gehe zu http://localhost:5173/builder
2. Klicke "+ Neu" um ein neues Draft zu erstellen
3. Fülle folgende Daten ein:
   - **Name:** "Test-Quiz"
   - **Kategorien:** Alle 5 (Standard)
   - **Modus:** Cozy 60 Standard

### Option 2: Test-Daten importieren

Hier ist ein fertiges Test-Quiz zum Importieren (als JSON):

```json
{
  "id": "test-quiz-001",
  "meta": {
    "title": "🎯 Test-Quiz für alle Features",
    "description": "Komplettes Test-Quiz mit allen Fragetypen und Modi",
    "language": "both",
    "totalTime": 3600
  },
  "questions": [
    {
      "id": "test-mc-1",
      "type": "MU_CHO",
      "question": "🅰️ Welcher Planet ist der größte?",
      "category": "Mu-Cho",
      "points": 10,
      "options": ["Jupiter", "Saturn", "Neptun", "Uranus"],
      "correctIndex": 0,
      "mechanic": "multipleChoice"
    },
    {
      "id": "test-est-1",
      "type": "SCHAETZCHEN",
      "question": "📊 Wie viele Menschen leben auf der Erde? (Milliarden)",
      "category": "Schaetzchen",
      "points": 15,
      "targetValue": 8,
      "unit": "Milliarden",
      "mechanic": "estimate"
    },
    {
      "id": "test-bool-1",
      "type": "STIMMTS",
      "question": "✓/✗ Der Eiffelturm wurde 1889 erbaut",
      "category": "Stimmts",
      "points": 10,
      "options": ["Stimmt", "Stimmt nicht"],
      "correctIndex": 0,
      "mechanic": "betting"
    },
    {
      "id": "test-img-1",
      "type": "CHEESE",
      "question": "🖼️ Was ist auf diesem Bild zu sehen?",
      "category": "Cheese",
      "points": 15,
      "answer": "Wald",
      "imageUrl": "",
      "mechanic": "imageQuestion"
    },
    {
      "id": "test-mc-2",
      "type": "MU_CHO",
      "question": "🅰️ Welche Farbe hat der Himmel?",
      "category": "Mu-Cho",
      "points": 10,
      "options": ["Blau", "Rot", "Grün", "Gelb"],
      "correctIndex": 0,
      "mechanic": "multipleChoice"
    },
    {
      "id": "test-est-2",
      "type": "SCHAETZCHEN",
      "question": "📊 Wie hoch ist der Mount Everest? (Meter)",
      "category": "Schaetzchen",
      "points": 15,
      "targetValue": 8848,
      "unit": "Meter",
      "mechanic": "estimate"
    },
    {
      "id": "test-bool-2",
      "type": "STIMMTS",
      "question": "✓/✗ Fische können trinken",
      "category": "Stimmts",
      "points": 10,
      "options": ["Stimmt", "Stimmt nicht"],
      "correctIndex": 1,
      "mechanic": "betting"
    },
    {
      "id": "test-top5-1",
      "type": "BUNTE_TUETE",
      "question": "🏆 Nenne die 5 größten Städte Deutschlands",
      "category": "GemischteTuete",
      "points": 25,
      "bunteTuete": {
        "kind": "top5" as const,
        "payload": {
          "kind": "top5",
          "correctAnswers": ["Berlin", "München", "Köln", "Hamburg", "Frankfurt"]
        }
      },
      "mechanic": "custom"
    },
    {
      "id": "test-precision-1",
      "type": "BUNTE_TUETE",
      "question": "🎯 In welchem Jahr fiel die Berliner Mauer?",
      "category": "GemischteTuete",
      "points": 20,
      "bunteTuete": {
        "kind": "precision" as const,
        "payload": {
          "kind": "precision",
          "correctAnswer": "1989",
          "tolerance": 2
        }
      },
      "mechanic": "custom"
    },
    {
      "id": "test-mc-3",
      "type": "MU_CHO",
      "question": "🅰️ Hauptstadt von Frankreich?",
      "category": "Mu-Cho",
      "points": 10,
      "options": ["Lyon", "Paris", "Marseille", "Toulouse"],
      "correctIndex": 1,
      "mechanic": "multipleChoice"
    },
    {
      "id": "test-est-3",
      "type": "SCHAETZCHEN",
      "question": "📊 Wie viele Einwohner hat Berlin? (Millionen)",
      "category": "Schaetzchen",
      "points": 15,
      "targetValue": 3.6,
      "unit": "Millionen",
      "mechanic": "estimate"
    },
    {
      "id": "test-bool-3",
      "type": "STIMMTS",
      "question": "✓/✗ Honig verdirbt nie",
      "category": "Stimmts",
      "points": 10,
      "options": ["Stimmt", "Stimmt nicht"],
      "correctIndex": 0,
      "mechanic": "betting"
    },
    {
      "id": "test-one8-1",
      "type": "BUNTE_TUETE",
      "question": "❌ Welche Aussage ist FALSCH?",
      "category": "GemischteTuete",
      "points": 20,
      "bunteTuete": {
        "kind": "oneOfEight" as const,
        "payload": {
          "kind": "oneOfEight",
          "statements": [
            { id: "1", text: "Python ist eine Programmiersprache", isFalse: false },
            { id: "2", text: "Der Mond ist aus Käse", isFalse: true },
            { id: "3", text: "2+2=4", isFalse: false },
            { id: "4", text: "Wasser kocht bei 100°C", isFalse: false }
          ]
        }
      },
      "mechanic": "custom"
    },
    {
      "id": "test-mc-4",
      "type": "MU_CHO",
      "question": "🅰️ Größter Kontinent?",
      "category": "Mu-Cho",
      "points": 10,
      "options": ["Europa", "Afrika", "Asien", "Amerika"],
      "correctIndex": 2,
      "mechanic": "multipleChoice"
    },
    {
      "id": "test-est-4",
      "type": "SCHAETZCHEN",
      "question": "📊 Wie viele Tasten hat ein Klavier? (Anzahl)",
      "category": "Schaetzchen",
      "points": 15,
      "targetValue": 88,
      "unit": "Tasten",
      "mechanic": "estimate"
    },
    {
      "id": "test-bool-4",
      "type": "STIMMTS",
      "question": "✓/✗ Oktopusse haben blaues Blut",
      "category": "Stimmts",
      "points": 10,
      "options": ["Stimmt", "Stimmt nicht"],
      "correctIndex": 0,
      "mechanic": "betting"
    },
    {
      "id": "test-order-1",
      "type": "BUNTE_TUETE",
      "question": "🔢 Ordne nach Größe (klein → groß)",
      "category": "GemischteTuete",
      "points": 20,
      "bunteTuete": {
        "kind": "order" as const,
        "payload": {
          "kind": "order",
          "items": ["Ameise", "Maus", "Hund", "Elefant"],
          "correctOrder": ["Ameise", "Maus", "Hund", "Elefant"],
          "criteriaOptions": [],
          "correctByCriteria": {}
        }
      },
      "mechanic": "custom"
    },
    {
      "id": "test-mc-5",
      "type": "MU_CHO",
      "question": "🅰️ Schnellster Landtier?",
      "category": "Mu-Cho",
      "points": 10,
      "options": ["Löwe", "Gepard", "Antilope", "Pferd"],
      "correctIndex": 1,
      "mechanic": "multipleChoice"
    },
    {
      "id": "test-est-5",
      "type": "SCHAETZCHEN",
      "question": "📊 Lichtgeschwindigkeit? (km/s)",
      "category": "Schaetzchen",
      "points": 15,
      "targetValue": 300000,
      "unit": "km/s",
      "mechanic": "estimate"
    },
    {
      "id": "test-bool-5",
      "type": "STIMMTS",
      "question": "✓/✗ Bananen sind Beeren",
      "category": "Stimmts",
      "points": 10,
      "options": ["Stimmt", "Stimmt nicht"],
      "correctIndex": 0,
      "mechanic": "betting"
    }
  ],
  "blitz": {
    "pool": [
      {
        "id": "test-blitz-animals",
        "title": "🦁 Tierwelt",
        "items": [
          { "id": "1", "prompt": "Streifenmuster", "answer": "Zebra", "aliases": ["Pferd mit Streifen"] },
          { "id": "2", "prompt": "Langer Hals", "answer": "Giraffe" },
          { "id": "3", "prompt": "Dickhäuter", "answer": "Elefant", "aliases": ["Rüssel"] },
          { "id": "4", "prompt": "König der Löwen", "answer": "Löwe", "aliases": ["Mähne"] },
          { "id": "5", "prompt": "Im Wasser, mit Schale", "answer": "Schildkröte", "aliases": ["Panzer"] }
        ]
      },
      {
        "id": "test-blitz-countries",
        "title": "🌍 Länder-Flaggen",
        "items": [
          { "id": "1", "prompt": "Rot-Weiß-Rot", "answer": "Österreich", "aliases": ["AT"] },
          { "id": "2", "prompt": "Schwarz-Rot-Gold", "answer": "Deutschland", "aliases": ["DE"] },
          { "id": "3", "prompt": "Trikolore Blau-Weiß-Rot", "answer": "Frankreich", "aliases": ["FR"] },
          { "id": "4", "prompt": "Rot-Weiß mit Mond-Stern", "answer": "Türkei", "aliases": ["TR"] },
          { "id": "5", "prompt": "Rot mit weißem Kreuz", "answer": "Schweiz", "aliases": ["CH"] }
        ]
      }
    ]
  },
  "rundlauf": {
    "pool": [
      { "name": "Hauptstädte", "questions": 5 },
      { "name": "Berühmte Filme", "questions": 5 },
      { "name": "Wissenschaft", "questions": 5 }
    ]
  },
  "theme": {
    "name": "Test Theme",
    "color": "#fbbf24",
    "background": "radial-gradient(circle at 20% 20%, #1a1f39 0%, #0d0f14 55%)",
    "slotSpinMs": 2400,
    "slotHoldMs": 1200,
    "slotIntervalMs": 260,
    "slotScale": 1
  }
}
```

## Wie verwenden?

1. **Über den Builder:**
   - http://localhost:5173/builder
   - "+ Neu" → Wizard durchlaufen
   - Oder einen neuen Draft erstellen

2. **Oder über das Testquiz spielen:**
   - http://localhost:5173/play (Team-Sicht)
   - http://localhost:5173/beamer (Beamer-Sicht)
   - http://localhost:5173/moderator (Moderator-Panel)

## Alle Fragetypen zum Testen

✅ **Multiple Choice** (Mu-Cho)
✅ **Schätzfragen** (Schaetzchen)
✅ **Wahr/Falsch** (Stimmts)
✅ **Bildfragen** (Cheese)
✅ **Top 5** (Bunte Tüte)
✅ **Präzision** (Bunte Tüte)
✅ **1 von 8 Falsch** (Bunte Tüte)
✅ **Ordnen nach Kriterium** (Bunte Tüte)
✅ **Fotoblitz** (Mini-Game)
✅ **Rundlauf** (Kategorien-Runde)

## Keyboard Shortcuts zum Testen

- **F13 / 1** → Nächste Frage
- **F14 / 2** → Frage sperren
- **F15 / 3** → Antwort aufdecken
- **F16 / 4** → Blitz Action
- **F17 / 5** → Potato Action
- **F18 / 6** → Scoreboard
