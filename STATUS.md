# KioskQuiz — Status-Tracker

> Diese Datei wird bei jeder Session aktualisiert.  
> Letztes Update: 2026-04-06

---

## Erledigt ✅

### 2026-04-06 — Bugfixes & QQ-Drafts
- ✅ Hot Potato startet automatisch wenn Frage aktiviert wird
- ✅ Hot Potato: letztes Team gewinnt automatisch (Turn-Expired + Wrong-Answer)
- ✅ Timer-Dauer kann mitten in der Runde geändert werden (Neustart mit neuer Dauer)
- ✅ Slide-Editor TypeError behoben (template.elements ?? [] Guards)
- ✅ `qqClearHotPotatoTimer` exportiert aus qqRooms.ts
- ✅ QQ-Drafts werden persistent in `qqDrafts.json` gespeichert (überleben Server-Restart)
- ✅ GET-Endpoint merged DB + File-Drafts, synct zu DB
- ✅ 2 Sample-Drafts erstellt: "🧠 Allgemeinwissen" + "🎬 Pop & Kultur" (Seed bei leerem State)
- ✅ SlidePreview + CustomSlide: defensive `?.` Zugriffe auf template
- ✅ Beamer fällt auf Built-in-View zurück wenn Custom-Template keine Elemente hat
- ✅ CHEESE-Bilder werden auf Beamer korrekt angezeigt (QuestionView-Fallback)
- ✅ Triple-Placement-Fix + Bild auf Team-Page

### Frühere Sessions
- ✅ Quarter Quiz Grundgerüst (Types, Backend, Beamer, Moderator, Team-View)
- ✅ Slide-Editor (WYSIWYG, Drag/Resize/Rotate, Platzhalter, Themes)
- ✅ Alle Spielmechaniken (Mucho, Schätzchen, Bunte Tüte, 10v10, Cheese, Imposter, Hot Potato)
- ✅ Placement-Flash Animation
- ✅ Comeback-Wahl vor Phase 3
- ✅ Avatar-Auswahl (vergeben = ausgegraut)
- ✅ Slide-Transitions (fade/slideUp/zoom)
- ✅ Sample-Quizze (Testquiz Wien, Berlin)

---

## Offen 🔲

### Quarter Quiz
- 🔲 **Team Feldwahl am Handy** — Phase 2/3: Team klickt eigenes Feld auf dem Handy-Grid
- 🔲 CHEESE-Fragen brauchen noch Bilder (manuell im QQ Builder hochladen)

### CozyQuiz 60
- 🔲 **Bilder auf Frage-Slides** — Canva-ähnlicher Picker, Cloudinary-Upload, Crop/Position
- 🔲 MongoDB Films-Frage: falsches `bunteTuete`-Feld fixen (enthält Football oneOfEight)

### Sonstiges
- 🔲 "Hands off" Modus? (Klärung ausstehend)

---

## Bekannte Issues ⚠️
- `CreatorCanvasPage.tsx` hat ~12 TypeScript-Errors (flexDirection, textAlign Typen) — pre-existing, nicht blockierend
- Render Free Tier schläft nach Inaktivität → MongoDB Reconnect dauert bis 15s

---

## Commits (aktuelle Session)

| Commit | Beschreibung |
|---|---|
| `43db749` | Slide-Editor fixes + Beamer Fallback + Sample-Drafts |
| `b7f77f2` | QQ-Draft Persistenz (qqDrafts.json) |
| `2bb186e` | HP Auto-Start, Last-Team-Wins, Timer-Fix, Slide-Editor Guards |
