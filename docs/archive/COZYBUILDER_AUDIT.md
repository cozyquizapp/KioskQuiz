# CozyBuilder — Designer-Audit 2026-05-10

3 parallele Audits (Content-Flow / Visual-UX / Feature-Wishlist) auf
[frontend/src/pages/QQBuilderPage.tsx](frontend/src/pages/QQBuilderPage.tsx)
(~2000 Zeilen) + Sub-Components. Brand-Refresh: Werkzeug-Tab heißt jetzt
**CozyBuilder** (intern QQBuilder bleibt im Code).

---

## Gesamtdiagnose

Heute fühlt sich der Builder an wie **Linear/Notion** statt wie ein
CozyQuiz-Werkzeug: dark-slate, kalt, funktional. Spacings diszipliniert,
Density hoch, aber **CozyQuiz-Brand-DNA (Pink/Magenta/Navy + CozyWolf)
fehlt komplett** — Wolf öffnet /builder und es fühlt sich an wie ein
anderes Tool als /beamer + /team. Validierungs-Badges fluten Cells mit
harten Warn-Farben (jede frische Frage „du hast was vergessen!"). Save-
Click ist silent — Wolfs am-häufigsten-gedrückter Button belohnt nicht.

Mechanisch funktioniert vieles gut (Auto-Save, CSV-Import, Cloudinary,
Theme-Swap, DeepL-Translate-All, MP3 pro Frage, Connections-Editor,
Validation, Mini-Preview). **Was fehlt = Charakter + Reduktion-an-
Schritten + AI-Assist.**

Marken-Richtung: **„Heimathafen" statt „Werkzeugkasten"**. Wolf sitzt
hier 1-2h/Sonntag mit Kaffee — der Schreibtisch soll sich wie sein
eigener anfühlen.

---

## 🟢 Quick-Wins — Pack A (Brand + Wärme)

### #1 Brand-Farben-Sweep
- **Was-heute**: Page-BG `#0f172a` (Slate-900), Header `#1e293b`, Tab-
  Underline `#3B82F6`, Save-Button blau. Null Pink/Magenta/Navy. Files:
  [QQBuilderPage.tsx:490](frontend/src/pages/QQBuilderPage.tsx#L490),
  [:724](frontend/src/pages/QQBuilderPage.tsx#L724),
  [:12](frontend/src/pages/QQBuilderPage.tsx#L12)
- **Vorschlag**: Page-BG → Brand-Navy `#1E2A5A` (oder dunkler `#141B3A`),
  Tab-Underline + primärer Save-Button → Brand-Pink `#EC4899`, Errors-
  State → Magenta `#A21247`. Header-Bar `rgba(236,72,153,0.06)` Tint.
- **Effort**: M · **Risiko**: Niedrig

### #2 CozyWolf in Drafts-Liste-Header
- **Was-heute**: Header-Titel „Fragensätze" flach in Slate. Kein Brand-
  Anker. File: [QQBuilderPage.tsx:1933](frontend/src/pages/QQBuilderPage.tsx#L1933)
- **Vorschlag**: `AnimatedCozyWolf` (existiert!) klein-links neben Titel
  + Sprechblase „Was bauen wir heute, Wolf?". „+ Leer (3 Runden)"-Buttons
  als Brand-Karten (Pink-Border, Navy-Fill).
- **Effort**: S · **Risiko**: Null

### #4 Save-Button belohnt
- **Was-heute**: Wechselt Hex je nach Validation, sonst statisch. Silent
  Click. File: [QQBuilderPage.tsx:787-794](frontend/src/pages/QQBuilderPage.tsx#L787)
- **Vorschlag**: Wenn `errors === 0` → sanfter Pink-Glow auf Button.
  Beim Click: 98%→100% Shrink (50ms) + Save-Bell-Sound + ✓-Cascade in
  Pink (1.2s Auto-Fade).
- **Effort**: S · **Risiko**: Null

### #5 Empty-State-Wolf im Editor
- **Was-heute**: `← Slot auswählen` als 14px-grauer Text im 480px-Panel.
  Triste Leere. File: [QQBuilderPage.tsx:961](frontend/src/pages/QQBuilderPage.tsx#L961)
- **Vorschlag**: `AnimatedCozyWolf` 200×200 + Sprechblase aus 4 Random-
  Sprüchen: „Klick eine Zelle, dann basteln wir.", „Welche Frage bauen
  wir zuerst?", „Phase 2 sieht noch leer aus, hm?", „Eurovision-Quiz
  ist mein Favorit.". Idle-Wackel-Animation (4s sine).
- **Effort**: S · **Risiko**: Null

---

## 🟢 Quick-Wins — Pack B (Workflow-Heilen)

### #6 Save-Modal entschärfen
- **Was-heute**: Modal blockt bei `totalWarnings > 0` — Wolf klickt bei
  jedem Save „Trotzdem speichern". File: [QQBuilderPage.tsx:339-344](frontend/src/pages/QQBuilderPage.tsx#L339)
- **Vorschlag**: Modal nur bei `errors > 0`. Warnings als Inline-Badge
  im Header (Counter neben Save). Speichern just-works.
- **Effort**: S · **Risiko**: Niedrig

### #7 Auto-Save-Pill im Header
- **Was-heute**: Auto-Save schreibt alle 2s nach localStorage, aber kein
  UI-Feedback. Wolf weiß nicht ob Stand sicher ist. File: [QQBuilderPage.tsx:228-237](frontend/src/pages/QQBuilderPage.tsx#L228)
- **Vorschlag**: „Auto-saved 2s ago"-Pill im Header (live aktualisiert).
  Mikro-Tick-Bounce auf Save-Erfolg.
- **Effort**: S · **Risiko**: Null

### #9 Drag-Drop + Paste-from-Clipboard für Bilder
- **Was-heute**: Nur File-Picker via Button. CSV-Modal kann's schon
  ([QQCsvImportModal.tsx:76-80](frontend/src/pages/QQCsvImportModal.tsx#L76))
  — Pattern wiederverwenden.
- **Vorschlag**: Editor-Panel mit `onDragOver`/`onDrop`+`onPaste`.
  Screenshot machen → Strg+V → fertig. Pro Quiz 5+ Min gespart.
- **Effort**: M · **Risiko**: Niedrig

### #10 Tastatur-Navigation
- **Was-heute**: Slot-Wechsel nur per Maus. 25 Fragen schreiben = 25×
  zur Maus greifen.
- **Vorschlag**: `Cmd/Ctrl+J/K` Slot-Wechsel, `Cmd+S` Save, `Cmd+Enter`
  Save + nächster leerer Slot. Mikro-Bounce-Animation auf Slot-Wechsel.
- **Effort**: M · **Risiko**: Niedrig

---

## 🟢 Weitere Quick-Wins (nicht in Pack A/B aber im Topf)

### #3 Validierungs-Badges entschärfen
- **Was-heute**: 🛑/⚠️ + harte Rot/Gelb-Pills fluten frische Drafts.
  File: [QQBuilderPage.tsx:851-863](frontend/src/pages/QQBuilderPage.tsx#L851)
- **Vorschlag**: Mini-Dots am Card-Rand statt Browser-Emojis. Errors →
  Magenta `#A21247`, Warnings → Amber. Hover zeigt Issues. Empty-Slots
  dürfen einladen, nicht schreien.
- **Effort**: S · **Risiko**: Null

### #8 EN-Felder default collapsed
- **Was-heute**: EN-Textareas + EN-Optionen immer sichtbar, default
  leer → graue Placeholder fluten Editor.
- **Vorschlag**: `<details>`-Toggle „➕ EN anzeigen". State pro Draft
  persistieren. Auto-expand wenn EN gefüllt. -50% visuelles Rauschen.
- **Effort**: S · **Risiko**: Niedrig

### Weitere kleine Friction-Heiler
- **Default-Titel "Neuer Fragensatz"** — bei 5+ Drafts alle gleich.
  Fix: `Quiz #N · 10.05.` Counter + Datum, Title-Input auto-fokussieren.
- **Bild-Upload-Race** — `onChange` triggert immer auf `activeQ`, bei
  Frage-Wechsel mid-Upload landet das Bild auf falscher Frage.
  Fix: Snapshot der `questionId` bei Klick (wie `optionUploadTarget`).
- **Move-Button-Icons inkonsistent** — Filmstrip ◀▶ vs. Grid ▲▼.
  Fix: beide gleich + `aria-label`.
- **Cloudinary-Upload-Fehler** verwenden `alert()` statt Toast. Im
  Catch: Retry-Button + err.message.
- **Kategorie-Reihenfolge im Grid** prüfen vs. Live-Reihenfolge.

---

## 🟡 Mid-Bets (2-4h, klarer Win)

### #11 Side-by-Side DE | EN Live-Translation
Rechte 280px-Spalte einklappbar, beim Tippen DE → 1.5s später grauer
EN-Vorschlag im Twin-Feld, Tab akzeptiert. Spinner pro Feld, Mini-
Flaggen-Flip beim Suggest. Ersetzt den „Big-Bang"-Button als Default.
**Effort**: L · **Risiko**: Mittel

### #12 CHEESE-Dropzone groß + Wolf-Maskottchen
Leere CHEESE-Frage zeigt 140px-Drop-Zone mit „🧀 Bild hierher ziehen"
+ CozyWolf winkt. Drag-Over-Highlight, Upload-Progress, ✓-Cascade.
**Effort**: M

### #13 Filmstrip-Polaroid-Look
Phase-Trenner-Linien, Active-Thumb Pink-Glow + 5° Tilt, Hover Tilt-
Lift. Statt YouTube-Player → Polaroid-Reihe.
**Effort**: S

### #14 Milestone-Toasts mit Wolf
Bei 10/25/50 Fragen, Phase voll, alle EN übersetzt: Wolf-Toast
„🐺 5 Fragen — Bier verdient!", „🎉 Phase 1 voll!", „🌍 Alle EN
übersetzt!". 2.5s Auto-Dismiss.
**Effort**: M

### #15 Sound-Layer (subtil, toggle-bar)
3 Beats: Add-Question (60ms Click), Save-Success (200ms Bell), Upload-
Complete (300ms Soft-Chime). Volume 0.15, Header-Toggle 🔊/🔇 mit
localStorage. Sounds existieren schon im Game-Frontend.
**Effort**: M

### #16 Translation-State-Dot pro Feld
Mini-Dot links vom Label: ● grün (synced), ◐ amber (DE neuer), ○ grau
(leer). Bei DE-Change → 500ms Debounce → Dot wechselt auf amber.
**Effort**: M

### #17 Image-Adjustment-Panel Tabs
Heute: Zoom/Drag/Brightness/Contrast/Animation alles untereinander.
Vorschlag: 3 Tabs „🎯 Position · 🎨 Filter · ✨ Animation".
**Effort**: M

### #18 Quiz-Health-Header-Widget
Kategorien-Mix-Donut, DE/EN-Coverage %, geschätzte Spielzeit („~58
Min"). `validateDraft` liefert die Daten schon.
**Effort**: M

### #19 Smart-Default Schätzchen-Unit
Wenn `text` „Wie viele …" enthält, Wort extrahieren als Unit-Vorschlag.
Tab akzeptiert.
**Effort**: S

### #20 Question-Templates pro Kategorie
„+ Frage"-Klick öffnet Popover mit 3-4 vorgefüllten Schablonen pro Kat:
SCHAETZCHEN → „Wie viele X gibt es in Y?", MUCHO → „Welche/r X ist
NICHT Y?". Click füllt `text` + setzt sinnvolle Defaults.
**Effort**: M

### #21 Bulk-Edit Multiselect
Shift-Click in Grid markiert Range, Toolbar mit „→ Phase 2",
„MP3 entfernen", „funFact leeren".
**Effort**: M

### #22 Search/Filter über alle Drafts
Inkrementelle Suche auf Landing-Page über `text`/`answer`/`options`/
`bunteTuete.*`. Highlight + Draft-Card öffnet sich, Frage scrollt ins
Bild.
**Effort**: M

### #23 Undo/Redo (Cmd+Z)
`useReducer` mit Undo-Stack (max 30 Steps), Cmd+Z/Cmd+Shift+Z global.
Auto-Save weiter, aber pre-action-Snapshot in History.
**Effort**: M

---

## 🟣 AI-Assist (brauchen Anthropic-Endpoint)

### #24 🔍 Fact-Check-Button (Wolf-Wunsch)
Pro Frage Button → Claude Haiku checkt Antwort:
```
POST /api/qq/factcheck { text, answer, category }
→ { ok, confidence, concerns[], suggestion? }
```
Inline-Badge ✅/⚠️. Beste Targets: SCHAETZCHEN (Jahre/Zahlen), MUCHO
(Korrektheit), CHEESE (Ortsname). Token <1 ct/check.
**Effort**: L · **Wow**: Sehr Hoch

### #25 🪄 Auto-Distraktoren (Wolf-Wunsch)
Bei MUCHO/ZvZ: aus `text` + `answer` 3 plausible Falsch-Optionen
generieren. Modal mit 5-6 Vorschlägen, Click-to-Add. **Killer-Feature**
— gute Distraktoren sind die anstrengendste Schreib-Arbeit.
**Effort**: L · **Wow**: Sehr Hoch

### #26 💡 Auto-funFact
Aus question+answer einen 25-Wort-Fakt für die Moderation, automatisch
DE+EN. Macht ein verkümmertes Feld nützlich.
**Effort**: M · **Wow**: Hoch

### #27 🪄 Thema → 5 Fragen-Generator
Modal: Thema (z.B. „Berlin") + Schwierigkeit + Kategorie-Anzahl-Slider
→ Claude generiert N Fragen als QQQuestion-Stubs, Wolf kuratiert per
Click („✓ übernehmen / ✗ verwerfen / 🔄 neu"). **Aus 1h Schreiben → 15
Min Kuration.**
**Effort**: L · **Wow**: Sehr Hoch

### #28 Bunte-Tüte Sub-Type-Suggest
Heuristik (comma-list → top5, „in welcher Reihenfolge" → order) +
Claude-Fallback. Inline-Hint „sieht eher nach Top-5 aus".
**Effort**: M · **Wow**: Mittel

### #29 Unsplash/Pexels-Bild-Suche
Tab im CHEESE-Slot „Upload | Suche". Click auf Treffer → Cloudinary-
Pipeline + Lizenz-Credit ins Host-Sheet.
**Effort**: M · **Wow**: Hoch

---

## 🔴 Big-Bets (mehrtägig, transformativ)

### #30 Wizard-Modus (Toggle, nicht Replacement)
Header-Switch `📋 Grid | 🪄 Wizard`. Wizard = Full-Screen-Single-
Frage-View, „1/15"-Counter, Pfeiltasten Next/Prev, Mini-Filmstrip am
Boden. Erste Page: Theme/Titel. Letzte Page: Validation + Publish.
Wolf wechselt Modi je nach Mood. `CategoryFields` ist modular genug
für beide Hosts.
**Effort**: L · **Risiko**: Mittel

### #31 Mobile-Editing-Mode
Mobile = automatisch Wizard. Bottom-Tab-Bar `Grid · Bild · Antwort ·
Mehr`. Pinch-Zoom auf Image-Canvas. Drafts-Liste als swipe-Cards.
Wolf-Sprechblase oben „Lass uns das Quiz fertig machen".
**Effort**: L · **Risiko**: Hoch

### #32 Wolfs Fragebank/Bibliothek
Backend-Index aller je gespielten Fragen mit Metadata (wie oft
gespielt, mittlere Korrekt-Quote aus `gameresults`, gefeedback-Score).
Builder-Sidebar „📚 Bibliothek" — durchsuchbar nach Kategorie/Thema/
Tag, Drag-Drop in aktiven Draft. Plus AI-Tag-Generator der retroaktiv
Themen-Tags vergibt. Mit Difficulty-Score aus Live-Daten („nur 20%
haben das geknackt"). **Verwandelt 500+h Vergangenheit in Asset-Pool.**
**Effort**: L (mehrtägig) · **Risiko**: Mittel

### #33 Bild-Crop-Tool inline
Echtes destruktives Crop (react-easy-crop). Plus Cloudinary-AI-Auto-
Crop auf Subject (`g_auto`). Plus Filter-Presets (Sepia/BW/Polaroid).
**Effort**: L · **Risiko**: Niedrig

### #34 🎮 Probe-Run (Solo-Quiz-Test)
„Probe-Run"-Button → Solo-Simulation mit Bot-Teams läuft Draft in 2 Min
durch, gibt Wolf eine Run-Card pro Frage (Reading-Time, Validation,
Animation-Render). Catcht „Bild fehlt" + „Items < Limit" vor Live.
**Effort**: L · **Risiko**: Mittel

### #35 Save vs. Publish trennen
Status `draft|ready|archived`, Publish-Button nur bei `errors === 0`,
Bühne-frei-Animation auf Drafts-Liste. Beamer/Mod filtern auf `ready`.
**Effort**: L · **Risiko**: Mittel

### #36 Versions-Historie
Server-Snapshots pro Save in `qqDraftHistory` Collection, Drawer mit
Diff-View, „Wiederherstellen"-Button.
**Effort**: L · **Risiko**: Niedrig

---

## „CozyBuilder ist Heimathafen" — die Marken-Empfehlung

Heimathafen, nicht Werkzeugkasten. Wolf sitzt hier 1-2h pro Quiz-Session,
oft entspannt am Sonntag mit Kaffee. Werkzeugkasten wäre Linear/Excel/
Notion. Heimathafen ist **warm, persönlich, niedrigschwelliges Erfolgs-
gefühl** — Pink-Akzente, Wolf-Maskottchen-Touches, Milestone-Toasts,
Sound-Layer. Reasoning: der Builder ist Wolfs „Schreibtisch" für *sein*
Hauptprodukt — wenn der Schreibtisch sich anfühlt wie der Schreibtisch
eines anderen Tools (Tailwind-Slate-Devtool), hat er kein emotionales
Investment. Heimathafen bedeutet: jedes Mal wenn er reinkommt, freut er
sich kurz.

**Konkret heißt das: Pack A (Brand-Refresh + Wolf-Touch + Save-Belohnung
+ Empty-State-Wolf) — diese vier Dinge wechseln den Vibe vom Werkzeug
zum Schreibtisch.**

---

## Implementierungs-Reihenfolge (empfohlen)

**Pack A — 1 Abend Brand + Wärme** ✅ HEUTE
#1 Brand-Farben-Sweep + #2 Wolf in Drafts-Liste + #4 Save-Belohnung
+ #5 Empty-State-Wolf

**Pack B — 1 Abend Workflow-Heilen** ✅ HEUTE
#6 Save-Modal entschärft + #7 Auto-Save-Pill + #9 Drag-Drop-Bilder +
#10 Tastatur-Nav

**Pack C — AI-Plumbing + Pilot (1 Abend, später)**
Backend `/api/qq/llm` Endpoint mit Claude Haiku + #25 Auto-Distraktoren
+ #26 Auto-funFact (parallele Demo des Patterns). Beide rechtfertigen
die API-Investition.

**Pack D — AI-Erweiterung (1 Abend, später)**
#24 Fact-Check + #27 Thema-Generator. Wolf hat beides namentlich
gewünscht.

**Pack E — Big-Bet wenn Zeit:**
#30 Wizard ODER #32 Bibliothek. Beides game-changer, aber 1+ Tag.

---

*Audit-Datum: 2026-05-10. Quellen: 3 parallele AI-Agents (Content-Flow /
Visual-UX / Feature-Wishlist).*
