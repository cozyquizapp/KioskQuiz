# KioskQuiz — Status

> Kompakte Übersicht. Letztes Update: 2026-04-14

## Aktueller Stand

Quarter Quiz (QQ) ist in der Testphase. Gespräche mit einer Kioskkette laufen,
nichts fixes. Cozy60 (alte App) wird nicht mehr angefasst.

**Nächstes Todo**: Block C #9 — Team-Intro-Animation bei PHASE_INTRO.
Details + Anleitungen zu allen offenen Blöcken:
`~/.claude/projects/c--Users-hornu-Desktop-kioskquiz/memory/project_qq_roadmap_handoff.md`

## Was läuft

- Alle 6 Kategorien: Schätzchen, Mucho, Bunte Tüte (Top5/Reihenfolge/Hot Potato),
  10 von 10, Cheese, Mu-Cho
- 3D-Grid mit Slam-Down-Animation und F-Flyover
- 8 Avatare (Kopf-Only: Fuchs/Frosch/Panda/Hase/Einhorn/Waschbär/Kuh/Katze)
  mit festen Signaturfarben
- 2 Joker pro ganzes Spiel (Sterne im Team-Header)
- Slide-Editor mit 25 Platzhaltern für Custom-Templates
- Host-Notes pro Phase + per-Frage override
- Bilingual DE/EN
- QQ-Drafts persistent in `qqDrafts.json`
- Reconnect-infinity, Timeout-Guards, Room-Cleanup

## Roadmap (priorisiert)

### Block A — Event-Readiness (Woche 1-2)
- [x] Host-Cheatsheet PDF-Export (inkl. Fun-Fact-Feld, Moderator-Tipp, /menu-Einstieg)
- [x] Frage-Validierung beim Speichern (Top5 <5, Imposter ≠ 8, MUCHO/ZvZ-Options, Cheese-Bild, SCHAETZCHEN-Zielwert, Map-Koords)
- [x] Sound-System konsolidieren: Default-WAVs, per-Slot-Mute, Upload-Override,
      Master-Mute, Volume
- [x] CHEESE-Bild-Positionierung (Crop via offsetX/Y, Zoom ≥100%, Safe-Area im Builder)
- [x] Pause-Button mit Musik-Duck (500ms fade auf 20%, question musicUrl bleibt aktiv)

### Block B — Content & Partner (Woche 2-3)
- [x] CSV-Import im Builder (Vorlage-Download, Drag-Drop, Preview, Merge)
- [x] Frage duplizieren (📋 Button neben Move/Delete)
- [x] Live-Frage-Preview im Builder (kollabierbar, beamer-nah, CHEESE-Crop)

### Block C — Show-Polish (Woche 3)
- [ ] Team-Intro-Animation bei PHASE_INTRO
- [ ] Game-Over QR-Code → Team-Summary-Seite

### Block D — Spectator
- [ ] Emote-Rückmeldungen für Zuschauer (ausschaltbar im Moderator)

### Block E — Betrieb
- [ ] Reconnect-Stresstest mit gedrosseltem WLAN
- [ ] Sentry (Error-Tracking)
- [ ] Plausible Analytics

### Block F — Memory & Longterm-Memo
- [ ] Handoff-Memo komprimieren
- [ ] Longterm-TODO-File erweitern (Landing, Höher/Tiefer, Musik-Quiz — bereits drin)

## Offen / Bugs

- MongoDB Films-Frage: falsches `bunteTuete`-Feld (enthält Football oneOfEight
  statt Films) — DB-Fix
- `CreatorCanvasPage.tsx` hat TypeScript-Errors — pre-existing, Cozy60, ignorieren
- Render Free Tier schläft nach Inaktivität → MongoDB Reconnect bis 15s

## Longterm / Nice-to-have

Siehe `memory/project_qq_longterm_todos.md`
