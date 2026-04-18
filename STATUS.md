# KioskQuiz — Status

> Kompakte Übersicht. Letztes Update: 2026-04-14

## Aktueller Stand

CozyQuiz (intern QQ, früher „Quarter Quiz / Block Quiz") ist in der Testphase.
Gespräche mit einer Kioskkette laufen, nichts fixes. Cozy60 (alte App) wird
nicht mehr angefasst.

**Nächstes Todo**: Keine offenen Roadmap-Punkte. Neue Features/Bugs ad-hoc.
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
- [x] Epische Team-Reveal-Folie (einmalig nach Rules vor Phase 1)
- [x] Game-Over QR-Code → Team-Summary-Seite (Stats, Feedback, Upcoming)

### Block D — Spectator
- [→] Emote-Rückmeldungen für Zuschauer — nach Longterm verschoben (2026-04-14)

### Block E — Betrieb
- [x] Reconnect-Audit (Beamer-Rejoin-Bug gefixt, Team+Moderator sauber, Socket.IO buffert Offline-Emits)
- [→] Sentry — nach Longterm (erst bei konkretem Kiosk-Deal)
- [→] Plausible — nach Longterm (skippen bis Marketing-Landing existiert)

### Block F — Memory & Longterm-Memo
- [x] Handoff-Memo komprimiert (297 → ~55 Zeilen, nur Code-Map + Regeln)
- [x] Longterm-TODO-File gepflegt (Sentry, Plausible, Spectator-Emotes eingepflegt)

## Offen / Bugs

- MongoDB Films-Frage: falsches `bunteTuete`-Feld (enthält Football oneOfEight
  statt Films) — DB-Fix
- `CreatorCanvasPage.tsx` hat TypeScript-Errors — pre-existing, Cozy60, ignorieren
- Render Free Tier schläft nach Inaktivität → MongoDB Reconnect bis 15s

## Longterm / Nice-to-have

Siehe `memory/project_qq_longterm_todos.md`
