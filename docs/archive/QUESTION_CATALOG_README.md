# 📚 Fragenkatalog - Standalone Question Manager

## Zugriff
**URL:** `http://localhost:5173/question-catalog`

## Features

### ✨ Hauptfunktionen

1. **📋 Alle Fragen durchsuchen**
   - Suche nach Fragetext, ID oder Tags
   - Filter nach Kategorie (Mu-Cho, Schaetzchen, Stimmts, Cheese, Bunte Tüte)
   - Filter nach Mechanik-Typ

2. **✏️ Fragen bearbeiten**
   - Click auf "Edit" öffnet den vollständigen Editor
   - Alle mechanik-spezifischen Felder verfügbar
   - Speichern direkt in die Datenbank

3. **🗑️ Fragen löschen**
   - Click auf "Del" mit Bestätigung
   - Achtung: Löschen ist permanent!

4. **📤 Bulk-Import (JSON)**
   - Click auf "Import JSON"
   - Wähle eine `.json`-Datei mit Fragen
   - Format: Array von Question-Objekten (siehe AI_QUESTION_STRUCTURE.md)
   - Beispiel:
     ```json
     [
       {
         "id": "q-mucho-001",
         "question": "Welcher Planet ist am größten?",
         "type": "MU_CHO",
         "category": "Mu-Cho",
         "mechanic": "multipleChoice",
         "options": ["Jupiter", "Saturn", "Neptun", "Uranus"],
         "correctIndex": 0,
         "points": 1,
         "segmentIndex": 0
       }
     ]
     ```

5. **📥 Export JSON**
   - Click auf "Export JSON"
   - Exportiert aktuell gefilterte Fragen
   - Perfekt für Backup oder Sharing

6. **🤖 KI-Struktur kopieren**
   - Click auf "KI-Struktur"
   - Kopiert vollständige Anleitung in Zwischenablage
   - Perfekt zum Einfügen in ChatGPT, Claude etc.
   - KI kann dann neue Fragen im korrekten Format generieren

## Workflow

### Neue Fragen mit KI erstellen:

1. Click auf "🤖 KI-Struktur" im Fragenkatalog
2. Füge die Struktur in deine KI ein (z.B. ChatGPT)
3. Prompt: "Erstelle 10 Multiple Choice Fragen über Geografie im angegebenen Format"
4. KI generiert JSON mit Fragen
5. Kopiere das JSON in eine `.json`-Datei
6. Click "📤 Import JSON" und wähle die Datei
7. ✅ Fragen sind jetzt im Katalog!

### Fragen für Quiz verwenden:

1. Gehe zum **Kanban-Builder** (`/kanban-builder`)
2. Toggle die Katalog-Sidebar (rechts)
3. Drag & Drop Fragen aus dem Katalog auf die Board-Kategorien
4. Fertig!

## Backend-Endpoints

- `GET /api/questions` - Alle Fragen laden
- `POST /api/questions` - Einzelne Frage erstellen
- `POST /api/questions/bulk` - Mehrere Fragen importieren
- `PUT /api/questions/:id` - Frage aktualisieren
- `DELETE /api/questions/:id` - Frage löschen

## Tips

- **Tags nutzen:** Gute Tags erleichtern spätere Suche (z.B. "geografie", "2020s", "schwierig")
- **FunFacts hinzufügen:** Machen das Quiz interessanter für Spieler
- **IDs organisieren:** Nutze Präfixe wie `q-mucho-`, `q-schaetz-` für bessere Übersicht
- **Backup machen:** Regelmäßig Export durchführen
- **KI nutzen:** ChatGPT/Claude können viele Fragen auf einmal generieren

## Siehe auch

- `AI_QUESTION_STRUCTURE.md` - Vollständige KI-Anleitung mit allen Kategorien
- `/kanban-builder` - Quiz-Builder mit Drag & Drop
- `/question-editor` - Alter Question Editor (Legacy)
