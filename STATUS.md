# KioskQuiz — Status-Tracker

> Diese Datei wird bei jeder Session aktualisiert.  
> Letztes Update: 2026-04-06 (Session 2)

---

## Erledigt ✅

### 2026-04-06 (Session 2) — QQ Audit: Bugfixes, Stabilität, i18n, Nice-to-haves
- ✅ **B1–B5 Game-Breaking Bugs** (commit `dea2148`)
  - B1: Imposter auto-advance bei 0 Survivors
  - B2: Hot Potato Timer wird bei richtiger Antwort gelöscht
  - B3: Game-Reset räumt alle Timer/Queues auf
  - B4: Placement-Queue wird bei Phasenstart geleert
  - B5: CHEESE-Eval akzeptiert min. 2 Zeichen
- ✅ **S1–S6 Stabilität & UX** (commit `d7db456`)
  - S1: Infinite Reconnection für Team-Socket
  - S2: 10s Emit-Timeout
  - S3: Defensive Guards in QuestionView/PlacementView
  - S4: Moderator-Disconnect-Banner
  - S5: Hot Potato isAlive-Guard
  - S6: Room-Cleanup (4h TTL, 10min Sweep)
- ✅ **i18n DE/EN** (commit `a64712d`)
  - QQTeamPage: ~90 Keys, alle Sub-Components mit `lang` prop
  - QQBeamerPage: ~40 Keys, `useLangFlip` für alle Views
- ✅ **Nice-to-haves** (commit `b1e1bb8`)
  - Dynamische Phase-Namen (letzter Phase = "Finale" unabhängig von totalPhases)
  - Builder: beforeunload-Warnung bei ungespeicherten Änderungen
  - Builder: Client-seitige Upload-Größenprüfung (max 2 MB)
  - Moderator: QR-Code lokal generiert (QRCodeSVG statt CDN)

### 2026-04-06 — Bugfixes, QQ-Drafts & Editor-Preview
- ✅ Slide-Editor zeigt jetzt echte Fragenbilder aus dem Draft in der Vorschau
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

### Sonstiges
- 🔲 MongoDB Films-Frage: falsches `bunteTuete`-Feld fixen (enthält Football oneOfEight) — DB-Fix

⚠️ **CozyQuiz 60 ist eine separate App — NICHT anfassen!**

---

## Bekannte Issues ⚠️
- `CreatorCanvasPage.tsx` hat ~12 TypeScript-Errors (flexDirection, textAlign Typen) — pre-existing, nicht blockierend
- Render Free Tier schläft nach Inaktivität → MongoDB Reconnect dauert bis 15s

---

## Commits (aktuelle Session)

| Commit | Beschreibung |
|---|---|
| `b1e1bb8` | Nice-to-haves: Phase-Namen, beforeunload, Upload-Check, lokaler QR |
| `a64712d` | i18n: bilingual DE/EN für QQ Team + Beamer |
| `d7db456` | Stabilität & UX (S1–S6) |
| `dea2148` | 5 Game-Breaking QQ Bugs (B1–B5) |
| `540c1c0` | Echte Fragenbilder im Slide-Editor Preview |
| `43db749` | Slide-Editor fixes + Beamer Fallback + Sample-Drafts |
| `b7f77f2` | QQ-Draft Persistenz (qqDrafts.json) |
| `2bb186e` | HP Auto-Start, Last-Team-Wins, Timer-Fix, Slide-Editor Guards |
