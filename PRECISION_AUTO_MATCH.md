# 🎯 UPDATE: Präzisions-Fragen mit Auto-Match

## Überblick

Die Präzision/Ladder-Mechanik wurde erweitert um:
- ✅ Automatisches Matching von Team-Antworten
- ✅ Numerische Bereiche (z.B. 1987-1991)
- ✅ Regex-Pattern-Matching
- ✅ Fuzzy-String-Matching (Tippfehler/Varianten)
- ✅ Moderator-Review-Interface

## Erweiterte JSON-Struktur

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
      "autoMatchEnabled": true,
      "requiresModeratorReview": false,
      "ladder": [
        {
          "label": "Exakt",
          "acceptedAnswers": ["1989"],
          "points": 5,
          "numericRange": { "min": 1989, "max": 1989 },
          "fuzzyMatch": true,
          "examples": ["'89", "achtundachtzig", "neunzehnhundertneunundachtzig"],
          "description": "Exakte Jahreszahl"
        },
        {
          "label": "Nahbereich",
          "acceptedAnswers": ["1988", "1990", "1987", "1991"],
          "points": 3,
          "numericRange": { "min": 1987, "max": 1991 },
          "description": "±2 Jahre vom tatsächlichen Datum"
        },
        {
          "label": "Jahrzehnt",
          "acceptedAnswers": ["1980er", "80er", "achtziger"],
          "points": 1,
          "regexPattern": "198[0-9]|80er|achtzig",
          "fuzzyMatch": true,
          "description": "Richtiges Jahrzehnt"
        }
      ]
    }
  },
  "points": 5,
  "segmentIndex": 1
}
```

## Neue Felder

### Payload-Level:
- **`autoMatchEnabled`** (boolean): Automatische Zuordnung versuchen
- **`requiresModeratorReview`** (boolean): Moderator muss alle Antworten prüfen

### Pro Ladder-Stufe:
- **`numericRange`**: `{ "min": number, "max": number }` - Auto-Match für Zahlen
- **`regexPattern`** (string): Pattern für Text-Matching (z.B. `"198[0-9]"`)
- **`fuzzyMatch`** (boolean): Erkennt Tippfehler/Varianten (≥85% ähnlich)
- **`caseSensitive`** (boolean): Groß-/Kleinschreibung beachten (default: false)
- **`examples`** (string[]): Weitere Beispiele für Moderator
- **`description`** (string): Erklärung der Stufe für Moderator

## Beispiele

### Jahreszahl-Frage:
```json
{
  "label": "Exakt",
  "acceptedAnswers": ["1989"],
  "points": 5,
  "numericRange": { "min": 1989, "max": 1989 },
  "fuzzyMatch": true
}
```

### Text-Varianten:
```json
{
  "label": "Land",
  "acceptedAnswers": ["Frankreich"],
  "points": 3,
  "fuzzyMatch": true,
  "examples": ["France", "Französische Republik"],
  "description": "Name des Landes (beliebige Schreibweise)"
}
```

### Pattern-Matching (PLZ):
```json
{
  "label": "Richtige Region",
  "acceptedAnswers": ["10115", "10117", "10119"],
  "points": 2,
  "regexPattern": "^101[0-9]{2}$",
  "description": "Berlin-Mitte PLZ"
}
```

## Auto-Match-Priorität

1. **Exakter Match**: Normalisierter Textvergleich (case-insensitive)
2. **Numerischer Range**: Prüft ob Zahl in min-max liegt
3. **Regex Pattern**: Matched gegen Reg Expression
4. **Fuzzy Match**: Levenshtein Distance ≥85%

Von höchster zu niedrigster Stufe (best

e Antwort zuerst).

## Moderator-Interface

Wenn Frage gespielt wird:
1. Teams geben Antworten ein
2. System versucht Auto-Match (wenn `autoMatchEnabled: true`)
3. Moderator sieht:
   - Alle Team-Antworten
   - Auto-Match-Vorschläge mit Confidence-Score
   - Alle Ladder-Stufen mit Beispielen
   - Kann jeden Match überschreiben

## Best Practices

✅ **Für Jahreszahlen:**
```json
"numericRange": { "min": 1987, "max": 1991 }
```

✅ **Für Namen/Begriffe:**
```json
"fuzzyMatch": true,
"examples": ["Variante 1", "Variante 2"]
```

✅ **Für Patterns (PLZ, Telefon):**
```json
"regexPattern": "^[0-9]{5}$"
```

✅ **Für komplexe Bewertung:**
```json
"requiresModeratorReview": true,
"autoMatchEnabled": false
```

## Implementation

Backend: `shared/precisionMatcher.ts`
Frontend: `components/moderator/PrecisionReviewPanel.tsx`
Types: `shared/quizTypes.ts` (BunteTuetePrecisionPayload)
