# 🤖 KI-Anleitung: Fragen für CozyQuiz erstellen

Diese Anleitung beschreibt, wie KI-Systeme neue Quizfragen für die CozyQuiz-App strukturieren sollen.

## 📋 Allgemeine Struktur

Jede Frage ist ein JSON-Objekt mit folgenden Basis-Feldern:

```json
{
  "id": "eindeutige-id",
  "question": "Der Fragetext",
  "type": "MU_CHO | SCHAETZCHEN | STIMMTS | CHEESE | BUNTE_TUETE",
  "category": "Mu-Cho | Schaetzchen | Stimmts | Cheese | GemischteTuete",
  "mechanic": "multipleChoice | estimate | betting | imageQuestion | custom",
  "points": 1,
  "segmentIndex": 0,
  "tags": ["tag1", "tag2"],
  "funFact": "Interessanter Zusatzfakt (optional)"
}
```

### Wichtige Felder:
- **id**: Eindeutig (z.B. `q-mucho-001`, `q-schaetz-042`)
- **type**: Technischer Typ (siehe Kategorien unten)
- **category**: Display-Kategorie für UI
- **segmentIndex**: `0` für 1-Punkt-Fragen, `1` für 2+ Punkt-Fragen
- **tags**: Schlagwörter für Suche (z.B. `["geografie", "europa", "2020s"]`)
- **funFact**: Wird nach der Antwortauflösung angezeigt

---

## 🎯 Kategorie 1: Multiple Choice (Mu-Cho)

**4 Antwortoptionen, 1 richtige**

```json
{
  "id": "q-mucho-001",
  "question": "Welcher Planet ist der größte im Sonnensystem?",
  "type": "MU_CHO",
  "category": "Mu-Cho",
  "mechanic": "multipleChoice",
  "options": [
    "Jupiter",
    "Saturn",
    "Neptun",
    "Uranus"
  ],
  "correctIndex": 0,
  "points": 1,
  "segmentIndex": 0,
  "tags": ["astronomie", "sonnensystem"],
  "funFact": "Jupiter ist etwa 11x so groß wie die Erde und hat über 79 bekannte Monde!"
}
```

**Regeln:**
- Exakt **4 Optionen**
- `correctIndex` ist 0-basiert (0 = erste Option)
- Distraktoren sollten plausibel sein

---

## 📊 Kategorie 2: Schätzfrage (Schaetzchen)

**Numerische Antwort mit Einheit**

```json
{
  "id": "q-schaetz-001",
  "question": "Wie viele Kilometer ist der Äquator lang?",
  "type": "SCHAETZCHEN",
  "category": "Schaetzchen",
  "mechanic": "estimate",
  "targetValue": 40075,
  "unit": "km",
  "points": 2,
  "segmentIndex": 0,
  "tags": ["geografie", "mathematik"],
  "funFact": "Der Äquator teilt die Erde in die Nord- und Südhalbkugel."
}
```

**Regeln:**
- `targetValue` ist die exakte Zahl
- `unit` beschreibt die Einheit (z.B. "kg", "Jahre", "Meter")
- Typischerweise 2 Punkte wert

---

## 🎯 Kategorie 3: Stimmts/Betting

**3 Aussagen, Teams verteilen Punkte auf richtige**

```json
{
  "id": "q-stimmts-001",
  "question": "Welche dieser Aussagen über Wasser ist richtig?",
  "type": "STIMMTS",
  "category": "Stimmts",
  "mechanic": "betting",
  "options": [
    "Wasser hat bei 4°C seine höchste Dichte",
    "Wasser gefriert bei genau 0°C",
    "Wasser dehnt sich beim Gefrieren aus"
  ],
  "correctIndex": 0,
  "pointsPool": 10,
  "points": 2,
  "segmentIndex": 1,
  "tags": ["physik", "chemie"],
  "funFact": "Deshalb schwimmt Eis auf Wasser - es ist weniger dicht!"
}
```

**Regeln:**
- Exakt **3 Optionen**
- Nur **1 richtige** Aussage
- `pointsPool` ist der Punktepool zum Verteilen (meist 10)
- Teams können Punkte auf mehrere Optionen setzen

---

## 🖼️ Kategorie 4: Bildfrage (Cheese)

**Bild wird gezeigt, freie Texteingabe**

```json
{
  "id": "q-cheese-001",
  "question": "Welches berühmte Gebäude ist hier zu sehen?",
  "type": "CHEESE",
  "category": "Cheese",
  "mechanic": "imageQuestion",
  "answer": "Eiffelturm",
  "imageUrl": "/uploads/questions/eiffelturm.jpg",
  "points": 1,
  "segmentIndex": 0,
  "tags": ["architektur", "paris", "frankreich"],
  "funFact": "Der Eiffelturm wurde 1889 für die Weltausstellung gebaut und sollte ursprünglich nach 20 Jahren abgerissen werden."
}
```

**Regeln:**
- `answer` ist die akzeptierte Antwort (wird normalisiert verglichen)
- `imageUrl` ist Pflicht
- Bilder müssen vorher hochgeladen werden

---

## 🎨 Kategorie 5: Bunte Tüte (GemischteTuete)

Diese Kategorie hat **4 verschiedene Sub-Mechaniken:**

### 5.1 Top 5 - Nenne 5 Beispiele

```json
{
  "id": "q-bunte-top5-001",
  "question": "Nenne 5 Länder, die an Deutschland grenzen",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "top5",
    "payload": {
      "prompt": "Welche 5 Nachbarländer fallen dir ein?",
      "correctOrder": [
        "Polen",
        "Tschechien",
        "Österreich",
        "Schweiz",
        "Frankreich"
      ]
    }
  },
  "points": 3,
  "segmentIndex": 0,
  "tags": ["geografie", "europa", "deutschland"]
}
```

**Hinweis:** `correctOrder` enthält 5 gültige Antworten (nicht sortiert). Teams geben freie Texte ein.

---

### 5.2 Präzision (Ladder) - Mehrstufige Antwort

```json
{
  "id": "q-bunte-precision-001",
  "question": "In welchem Jahr fiel die Berliner Mauer?",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "precision",
    "payload": {
      "prompt": "Nenne das Jahr (oder Jahrzehnt)",
      "ladder": [
        {
          "label": "Exakt",
          "acceptedAnswers": ["1989"],
          "points": 5
        },
        {
          "label": "Nahbereich",
          "acceptedAnswers": ["1988", "1990", "1987", "1991"],
          "points": 3
        },
        {
          "label": "Jahrzehnt",
          "acceptedAnswers": ["1980er", "80er"],
          "points": 1
        }
      ]
    }
  },
  "points": 5,
  "segmentIndex": 1,
  "tags": ["geschichte", "deutschland", "80er"]
}
```

**Regeln:**
- `ladder` hat 2-4 Stufen (von präzise zu grob)
- Jede Stufe hat eigene `acceptedAnswers` und `points`
- Beste Antwort bekommt höchste Punkte

---

### 5.3 One of Eight - Finde die falsche Aussage

```json
{
  "id": "q-bunte-oneofeight-001",
  "question": "Welche dieser Aussagen über den Mars ist FALSCH?",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "oneOfEight",
    "payload": {
      "prompt": "Eine von 8 Aussagen ist falsch - welche?",
      "statements": [
        { "text": "Mars ist der viertgrößte Planet", "isFalse": false },
        { "text": "Mars hat zwei Monde", "isFalse": false },
        { "text": "Mars ist als roter Planet bekannt", "isFalse": false },
        { "text": "Mars hat eine dichtere Atmosphäre als die Erde", "isFalse": true },
        { "text": "Mars hat Polkappen aus Eis", "isFalse": false },
        { "text": "Ein Marstag dauert etwa 24,6 Stunden", "isFalse": false },
        { "text": "Mars ist der äußerste Gesteinsplanet", "isFalse": false },
        { "text": "Mars hat Vulkane", "isFalse": false }
      ]
    }
  },
  "points": 3,
  "segmentIndex": 1,
  "tags": ["astronomie", "mars", "planeten"]
}
```

**Regeln:**
- Exakt **8 Statements**
- Exakt **1** hat `"isFalse": true`
- Teams müssen die falsche Aussage identifizieren

---

### 5.4 Order - Sortiere nach Kriterium

```json
{
  "id": "q-bunte-order-001",
  "question": "Sortiere diese Länder",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "order",
    "payload": {
      "prompt": "Ordne die Länder korrekt",
      "items": ["China", "Indien", "USA", "Indonesien"],
      "criteriaOptions": [
        "Nach Einwohnerzahl (absteigend)",
        "Nach Fläche (absteigend)"
      ],
      "correctByCriteria": {
        "Nach Einwohnerzahl (absteigend)": ["China", "Indien", "USA", "Indonesien"],
        "Nach Fläche (absteigend)": ["China", "USA", "Indien", "Indonesien"]
      }
    }
  },
  "points": 3,
  "segmentIndex": 1,
  "tags": ["geografie", "statistik"]
}
```

**Regeln:**
- `items` sind die zu sortierenden Elemente
- `criteriaOptions` sind 1-3 mögliche Sortierkriterien
- `correctByCriteria` mappt jedes Kriterium zur korrekten Reihenfolge
- Moderator wählt das Kriterium während des Spiels

---

## 📦 Bulk-Import Format

Für den Upload mehrerer Fragen auf einmal:

```json
[
  {
    "id": "q-mucho-001",
    "question": "...",
    "type": "MU_CHO",
    ...
  },
  {
    "id": "q-schaetz-001",
    "question": "...",
    "type": "SCHAETZCHEN",
    ...
  }
]
```

Speichere als `.json`-Datei und lade über "📤 Import JSON" hoch.

---

## ✅ Best Practices für KI

1. **Eindeutige IDs:** Nutze Präfixe wie `q-mucho-`, `q-schaetz-`, `q-bunte-top5-`
2. **Relevante Tags:** 3-5 Schlagwörter für gute Durchsuchbarkeit
3. **FunFacts:** Mache sie interessant und lehrreich!
4. **Plausible Distraktoren:** Bei Multiple Choice sollten falsche Optionen glaubwürdig sein
5. **Schwierigkeit variieren:** Mix aus leichten (1pt) und schweren (2-3pt) Fragen
6. **Aktualität:** Verwende zeitlose Fakten oder füge Jahresangaben in Tags ein

---

## 🎯 Verwendung im Builder

1. Fragen werden im **Fragenkatalog** (`/question-catalog`) verwaltet
2. Im **Kanban-Builder** (`/kanban-builder`) werden Fragen per Drag & Drop in Quiz-Slots gezogen
3. Ein Cozy 60 Quiz hat **20 Fragen** + Fotoblitz + Rundlauf
4. Die Fragen werden automatisch nach Kategorie und Slot-Typ gefiltert

---

**Viel Erfolg beim Erstellen spannender Quizfragen! 🎉**
