# CozyQuiz Platform — Roadmap & Long-Term Goals

> Diese Datei ist für zukünftige Coding-Agents und als Planungsdokument gedacht.
> Immer aktuell halten wenn Entscheidungen getroffen werden.

---

## Apps im Überblick

| App | Route-Prefix | Status |
|---|---|---|
| CozyQuiz 60 | `/moderator`, `/beamer`, `/team` | ✅ Live |
| CozyQuiz (intern „QQ", früher Quarter/Block Quiz) | `/quarterquiz-*` | 🚧 In Entwicklung |
| Gemeinsam | `/kanban-builder`, `/question-catalog` | ✅ Live |

---

## CozyQuiz (QQ) — Buildplan

### Kerndaten
- **Name**: CozyQuiz (auf allen Sprachen; Route-Prefix bleibt `/quarterquiz-*` intern)
- Territorium-Grid-Spiel, 2–5 Teams
- 15 Fragen: 3 Phasen × 5 Kategorien (Schätzchen, Mu-cho, Bunte Tüte, 10 von 10, Cheese)
- Gewinnbedingung: **größtes zusammenhängendes Territorium** (BFS-Berechnung)
- Zweisprachig DE/EN durchgehend

### Grid-Größen nach Teamanzahl
| Teams | Grid |
|---|---|
| 2 | 4×4 |
| 3 | 5×5 |
| 4 | 6×6 |
| 5 | 6×6 |

### Spielmechanik (final abgestimmt)
- **Phase 1** (F1–5): Richtig → 1 Feld setzen
- **Phase 2** (F6–10): Richtig → 2 Felder setzen ODER 1 klauen (max 2× Klauen/Team/Phase)
- **Phase 3** (F11–15): Frei setzen oder klauen
- **Vor Phase 3**: Letztes Team (nach verbundenem Territorium) wählt Comeback-Aktion:
  - 2 freie Felder setzen, ODER
  - 1 Feld klauen, ODER
  - 2 Felder tauschen (Feld Team A ↔ Feld Team B, kein Gewinn für letztes Team)
- **Joker**: 2×2-Formation → sofort 1 Extra-Feld (max 2 Joker/Team/Phase, reset pro Phase)
- **Gleichstand**: Beide Teams bekommen Feld, schnelleres Team wählt zuerst
- **Feldwahl**: Erstmal Beamer-only — Moderator klickt Feld im Namen des Teams
- **Langzeit-Ziel**: Teams wählen Feld am eigenen Handy (Team-View)

### Build-Reihenfolge
- [x] **1. Shared Types** — `quarterQuizTypes.ts` (QQSlideTemplate, QQSlideElement, QQTheme, Mechaniken etc.)
- [x] **2. Backend** — Room-Logik, Grid-State, Socket-Events, Answer-Eval, Comeback, Joker, Imposter, Hot Potato, Placement-Flash
- [x] **3. `/quarterquiz-beamer`** — Grid, Kategorie-Slides, Phasenwechsel, CustomSlide-System (25 Platzhalter-Typen), Theme-Support, Slide-Transitions
- [x] **4. `/quarterquiz-moderator`** — Draft laden, Fragen steuern, Gewinner bestätigen, Feld klicken, Antwort-Text-Anzeige (Mucho/10v10)
- [x] **5. `/quarterquiz-team`** — Avatar-Auswahl (vergeben = ausgegraut), Antworten eingeben, Joker, Sprach-Toggle
- [ ] **6. Team Feldwahl am Handy** — Phase 2/3: Team klickt eigenes Feld auf dem Handy-Grid

### Slide-Editor (WYSIWYG, Canva-ähnlich) ✅
- [x] Drag/Resize/Rotate Elemente, Text-Inline-Editing, Bild-Upload (Cloudinary)
- [x] 25 Platzhalter-Typen (ph_game_grid, ph_game_rankings, ph_team_avatars, ...)
- [x] Theme-Presets (default/dark/neon/retro/nature) + Custom-Colors (BG/Akzent/Text/Karte)
- [x] Pro-Element: fontFamily, fontStyle (italic), fontSize, letterSpacing, lineHeight, Farbe, Opacity
- [x] Alignment-Toolbar (links/rechts/oben/unten/zentrieren/verteilen)
- [x] Copy/Paste, Multi-Select, Z-Index, Lock
- [x] Slideshow-Vorschau mit Keyboard-Navigation (←/→/Space/Esc)
- [x] Slide-Transitions (fade/slideUp/zoom) + Dauer-Kontrolle
- [x] Bibliothek mit Filtern (Kategorie/Phase/Mechanik)
- [x] Sample-Quizze (Testquiz Wien, Berlin)

### Spielmechaniken ✅
- [x] Mucho (Multiple Choice A/B/C/D)
- [x] Schätzchen (Schätzfrage, nächster Wert gewinnt)
- [x] Bunte Tüte: Top 5, One of Eight, Order, Map, Hot Potato
- [x] 10 von 10 (Punkte verteilen)
- [x] Cheese (Freitext)
- [x] Imposter (Maulwurf)
- [x] Placement-Flash (Feld-Platzierung mit Animation)
- [x] Comeback-Wahl vor Phase 3

### Design-Anforderungen (WICHTIG)
- **Vorlage**: `preview/sneak-peak.html` und `frontend/public/sneak-peak.html`
- Hauptkritik am alten Design: kein USP, nicht cozy, nicht Canva-esque
- Dunkler Hintergrund `#0D0A06`, Font: Nunito, Karten ohne Border (nur Box-Shadow)
- Kategorie-Farben: Schätzchen `#F59E0B` · Mu-cho `#3B82F6` · Bunte Tüte `#EF4444` · 10 von 10 `#22C55E` · Cheese `#8B5CF6`
- Avatare auf Grid-Feldern statt Buchstaben (Pool wird vom User befüllt, erstmal random Placeholder)
- Avatar-Pool: Teams wählen beim Start aus vordefinierten Avataren

### Referenz: Grid-Tester (bereits gebaut)
- `frontend/public/bingo-grid-test.html` — vollständige Simulation der Spielmechanik
- Enthält: Auto-Simulation, Joker-Detection, Comeback-Wahl, Connected-Score-Berechnung
- **Als Referenz nutzen** für Grid-Rendering und State-Machine-Logik

---

## CozyQuiz 60 — Offene TODOs

### Bunte Tüte — Formate (final)
5 Formate gesamt — Precision wurde ersetzt durch Hot Potato:
1. **Top 5** — bestehend ✅
2. **One of Eight** — bestehend ✅
3. **Order** — bestehend ✅
4. **Map** — bestehend ✅
5. **Hot Potato** — neu, ersetzt Precision:
   - Teams antworten abwechselnd zu einer offenen Frage (z.B. "Länder die mit S anfangen")
   - Falsche Antwort → Team fliegt raus
   - Timer läuft ab → Team fliegt raus
   - Letztes verbleibendes Team gewinnt
   - Moderator steuert: nächstes Team, richtig/falsch, Timer
   - Beamer zeigt: aktives Team, Countdown, ausgeschiedene Teams
   - Zu implementieren in: `ModeratorPage.tsx` + `BeamerView.tsx` + neuer BunteTuete-Subtype `hot_potato`
   - Bestehende `precision`-Fragen im Katalog prüfen/migrieren

### Fragenkatalog / Builder
- [ ] **Bilder auf Frage-Slides** (Canva-ähnlicher Picker):
  - Upload via Cloudinary (bereits konfiguriert)
  - Crop/Position-Picker mit Vorschau (drag, zoom, Ausschnitt wählen)
  - Speichert `{ url, offsetX, offsetY, scale }` im Question-Objekt
  - Anwendungsfälle:
    - Dekoratives Bild frei auf Slide positionieren
    - MC-Antwortfelder einzeln mit Bildern füllen (nur die Tiles)
  - Zu implementieren in: `KanbanQuestionEditor.tsx` / `QuestionEditorPage.tsx`

### Sonstiges
- [ ] MongoDB Films-Frage hat falsches `bunteTuete`-Feld (enthält Football oneOfEight statt Films) — direkt in DB fixen

---

## Deployment-Info (für Agents)
- **Frontend**: Vercel, `https://play.cozyquiz.app`
- **Backend**: Render Free Tier, `https://cozyquiz-backend.onrender.com`
- **DB**: MongoDB Atlas, cluster0.4xushmp.mongodb.net
- **Bilder**: Cloudinary (Cloud Name, API Key/Secret als Render-Env-Vars)
- **Vercel Env**: `VITE_API_BASE`, `VITE_SOCKET_URL` → beide auf Backend-URL
- Render schläft nach Inaktivität → MongoDB reconnect dauert bis 15s

## Wichtige Dateien
- `frontend/src/views/BeamerView.tsx` — Haupt-Beamer (4967 Zeilen, in Chunks lesen)
- `frontend/src/pages/ModeratorPage.tsx` — Moderator (3511 Zeilen)
- `frontend/src/views/TeamView.tsx` — Team-Client (4673 Zeilen)
- `frontend/src/components/beamer/beamerTheme.css` — CSS für Beamer (groß, Grep+offset)
- `shared/quizTypes.ts` — Alle geteilten Typen (710 Zeilen)
- `preview/sneak-peak.html` — Design-Referenz für CozyQuiz
- `frontend/public/bingo-grid-test.html` — Grid-Mechanik-Referenz
