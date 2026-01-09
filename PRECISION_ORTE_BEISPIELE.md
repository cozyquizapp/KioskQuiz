# 🗺️ Präzisions-Fragen: Orte & Geografie

## Konzept

Bei Ort-Fragen gibt es verschiedene Genauigkeitsstufen:
- **Exakt**: Stadt/Gebäude
- **Mittel**: Region/Bundesland/Land  
- **Grob**: Kontinent/Großregion

## Beispiel 1: Wo steht der Eiffelturm?

```json
{
  "id": "q-precision-eiffel",
  "question": "Wo steht der Eiffelturm?",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "precision",
    "payload": {
      "prompt": "Nenne den Ort (Stadt, Land oder Kontinent)",
      "autoMatchEnabled": true,
      "requiresModeratorReview": false,
      "ladder": [
        {
          "label": "Exakt - Stadt",
          "acceptedAnswers": ["Paris"],
          "points": 5,
          "fuzzyMatch": true,
          "examples": ["paris", "París", "Pariser"],
          "description": "Name der Stadt"
        },
        {
          "label": "Land",
          "acceptedAnswers": ["Frankreich", "France"],
          "points": 3,
          "fuzzyMatch": true,
          "examples": ["Französische Republik", "FR"],
          "description": "Land wo er steht"
        },
        {
          "label": "Kontinent",
          "acceptedAnswers": ["Europa"],
          "points": 1,
          "fuzzyMatch": true,
          "examples": ["Europe", "Europäische Union"],
          "description": "Kontinent"
        }
      ]
    }
  },
  "points": 5,
  "segmentIndex": 1,
  "tags": ["geografie", "wahrzeichen", "frankreich"]
}
```

## Beispiel 2: Wo wurde das iPhone erfunden?

```json
{
  "id": "q-precision-iphone",
  "question": "Wo wurde das iPhone erfunden?",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "precision",
    "payload": {
      "prompt": "Stadt, Bundesstaat oder Land?",
      "autoMatchEnabled": true,
      "requiresModeratorReview": false,
      "ladder": [
        {
          "label": "Stadt",
          "acceptedAnswers": ["Cupertino", "San Francisco", "Palo Alto"],
          "points": 5,
          "fuzzyMatch": true,
          "examples": ["SF", "San Fran"],
          "description": "Stadt im Silicon Valley"
        },
        {
          "label": "Bundesstaat",
          "acceptedAnswers": ["Kalifornien", "California"],
          "points": 3,
          "fuzzyMatch": true,
          "regexPattern": "Calif|CA",
          "examples": ["Cali"],
          "description": "US-Bundesstaat"
        },
        {
          "label": "Land",
          "acceptedAnswers": ["USA", "Vereinigte Staaten", "Amerika"],
          "points": 2,
          "fuzzyMatch": true,
          "examples": ["United States", "US"],
          "description": "Land"
        },
        {
          "label": "Kontinent",
          "acceptedAnswers": ["Nordamerika", "Amerika"],
          "points": 1,
          "fuzzyMatch": true,
          "description": "Kontinent"
        }
      ]
    }
  },
  "points": 5,
  "segmentIndex": 1,
  "tags": ["technologie", "apple", "geografie"]
}
```

## Beispiel 3: Wo fand die Fußball-WM 2014 statt?

```json
{
  "id": "q-precision-wm2014",
  "question": "Wo fand die Fußball-WM 2014 statt?",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "precision",
    "payload": {
      "prompt": "Land, Stadt oder Kontinent?",
      "autoMatchEnabled": true,
      "requiresModeratorReview": false,
      "ladder": [
        {
          "label": "Austragungsort (Stadt)",
          "acceptedAnswers": [
            "Rio de Janeiro",
            "São Paulo",
            "Brasília",
            "Salvador",
            "Belo Horizonte",
            "Porto Alegre",
            "Recife",
            "Fortaleza"
          ],
          "points": 5,
          "fuzzyMatch": true,
          "description": "Eine der Spielstädte"
        },
        {
          "label": "Land",
          "acceptedAnswers": ["Brasilien", "Brazil"],
          "points": 3,
          "fuzzyMatch": true,
          "examples": ["Brasil"],
          "description": "Gastgeberland"
        },
        {
          "label": "Kontinent",
          "acceptedAnswers": ["Südamerika"],
          "points": 1,
          "fuzzyMatch": true,
          "examples": ["South America", "Lateinamerika"],
          "description": "Kontinent"
        }
      ]
    }
  },
  "points": 5,
  "segmentIndex": 1,
  "tags": ["sport", "fußball", "wm", "brasilien"]
}
```

## Beispiel 4: Koordinaten-basiert (mit Regex)

```json
{
  "id": "q-precision-mount-everest",
  "question": "Wo liegt der Mount Everest?",
  "type": "BUNTE_TUETE",
  "category": "GemischteTuete",
  "mechanic": "custom",
  "bunteTuete": {
    "kind": "precision",
    "payload": {
      "prompt": "Gebirgszug, Land oder Region?",
      "autoMatchEnabled": true,
      "requiresModeratorReview": false,
      "ladder": [
        {
          "label": "Gebirgszug",
          "acceptedAnswers": ["Himalaya", "Himalaja"],
          "points": 5,
          "fuzzyMatch": true,
          "regexPattern": "[Hh]imalay",
          "description": "Name des Gebirgszugs"
        },
        {
          "label": "Grenzregion",
          "acceptedAnswers": ["Nepal-Tibet", "Nepal", "Tibet"],
          "points": 3,
          "fuzzyMatch": true,
          "examples": ["Nepal/China", "Grenze Nepal-China"],
          "description": "Grenzgebiet zwischen zwei Ländern"
        },
        {
          "label": "Kontinent/Region",
          "acceptedAnswers": ["Asien", "Südasien"],
          "points": 1,
          "fuzzyMatch": true,
          "examples": ["Asia", "South Asia"],
          "description": "Kontinent oder Region"
        }
      ]
    }
  },
  "points": 5,
  "segmentIndex": 1,
  "tags": ["geografie", "berge", "himalaya"]
}
```

## Best Practices für Ort-Fragen

### ✅ Fuzzy Match IMMER aktivieren
```json
"fuzzyMatch": true
```
→ Erkennt "París", "Pariser", "paris"

### ✅ Viele Varianten in acceptedAnswers
```json
"acceptedAnswers": ["Frankreich", "France", "FR"]
```

### ✅ Regex für Abkürzungen
```json
"regexPattern": "^(USA|US|U\\.S\\.)$"
```

### ✅ Beispiele für Moderator
```json
"examples": ["NYC", "Big Apple", "New York City"]
```

### ✅ Beschreibungen klar formulieren
```json
"description": "Exakte Stadt (nicht Stadtteil)"
```

## Moderator-Interface

Wenn Team antwortet:
- **"Paris"** → Auto-Match: Stufe 1 (5pt, 100% sicher)
- **"Frankreich"** → Auto-Match: Stufe 2 (3pt, 100% sicher)
- **"Europa"** → Auto-Match: Stufe 3 (1pt, 100% sicher)
- **"Île-de-France"** → Kein Match, Moderator entscheidet manuell
- **"Pariser Vorstadt"** → Fuzzy Match: Stufe 1 (5pt, 85% sicher) - Moderator kann überschreiben

## Tipps

1. **Hierarchie klar machen**: Stadt → Region → Land → Kontinent
2. **Fuzzy Match**: Immer bei Orten (Schreibweisen variieren)
3. **Beispiele**: Historische/alternative Namen hinzufügen
4. **Review bei Unsicherheit**: `requiresModeratorReview: true` für komplexe Regionen
