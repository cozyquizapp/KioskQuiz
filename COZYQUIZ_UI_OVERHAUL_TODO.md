# CozyQuiz UI-Überarbeitung – Übergabe-Checkliste

Stand: 2026-08-18

## Zielbild

CozyQuiz fühlt sich außerhalb der Live-Spielansichten wie eine ruhige, hochwertige
Host-App an: schnell zu scannen, konsequent bedienbar und auf die jeweilige Aufgabe
fokussiert. Das ist kein Landingpage-Redesign. Die private Anwendung ist desktop-first,
MoPo bleibt touch-first und die öffentlichen Seiten behalten ihren eigenen Format-Charakter.

## Nicht anfassen

- `/team`
- `/beamer`
- Dateien, die parallel von anderen Personen geändert werden, erst nach `git status`
  und Diff-Prüfung anfassen.

## Arbeitsregeln

- Keine neuen UI-Bibliotheken, kein Tailwind-Ausbau, kein Framer Motion oder GSAP.
- Bestehende Marke verwenden: Nunito für UI, Fredoka für große Titel/Zahlen, League Spartan
  nur für Wortmarken; Pink `#EC4899`, Magenta `#A21247`, Navy `#1E2A5A`.
- Produktflächen: Akzent nur für primäre Aktionen, Auswahl und sinntragende Zustände.
  Kategorie-Farben bleiben Kategorie-Farben, nicht Chrome.
- Echte Buttons/Links, sichtbarer Fokus, keine Tastaturfallen, sinnvolle Leer-, Lade- und Fehlerzustände.
- Motion nur als Zustandsfeedback und immer mit `prefers-reduced-motion`-Fallback.
- Vor jeder Übergabe ausführen:
  - `npm run typecheck:frontend`
  - `npm run lint -- --quiet`
  - `git diff --check`

## Bereits umgesetzt

- [x] `/menu` als 3×3 Desktop-Launcher mit getrennten Bereichen für Spielabend,
  Quizze und seltene Werkzeuge. Intro ist per `?intro=1` testbar.
- [x] Gemeinsame Shell-Klasse für alle Routen außerhalb `/team` und `/beamer`:
  [frontend/src/App.tsx](frontend/src/App.tsx) und [frontend/src/main.css](frontend/src/main.css).
  Sie liefert gemeinsame Produkt-Tokens sowie Fokuszustände, ohne die zwei Live-Views zu verändern.
- [x] Gemeinsamer Arbeitskopf für Regeltexte, Host-Sheets, CozyGames und Vorbereitungsfluss:
  [frontend/src/components/PrepWorkspaceHeader.tsx](frontend/src/components/PrepWorkspaceHeader.tsx).
- [x] QR-Beitrittsseite als klarer Spielabend-Flow: QR scannen oder Team-Link kopieren:
  [frontend/src/pages/QrCodePage.tsx](frontend/src/pages/QrCodePage.tsx).
- [x] Erste Kontextschärfung für CozyBuilder und CozyLibrary.

## Nächste Welle: private Host- und Vorbereitungsflächen

- [ ] `/moderator` – als Desktop-Regiearbeitsplatz auditieren: wichtigste Aktion und Spielstatus
  immer sichtbar; Nebenaktionen in klare Gruppen; leere/fehlende Daten und Verbindungsstatus verbessern.
  Datei: `frontend/src/pages/QQModeratorPage.tsx`.
- [ ] `/mopo` – nur das Nötigste für eine Hand/Touch: Status, aktuelle Host-Informationen und
  Weiter-Aktion. Prüfen, ob der große Button bei allen Phasen einen eindeutigen, sicheren Labeltext hat.
  Datei: `frontend/src/pages/QQModPortablePage.tsx`.
- [ ] `/builder` – vorhandene Funktionalität beibehalten, aber Kopfzeile, Aktionen und
  Grid/Wizard-Hierarchie aufräumen. Keine neuen Einstellungsflächen ohne klaren Nutzen.
  Datei: `frontend/src/pages/QQBuilderPage.tsx`.
- [ ] `/library` – Suche, Filter, Auswahl und „in Draft kopieren“ als einen nachvollziehbaren
  Arbeitsfluss gestalten; sichtbare Zielauswahl und klare aktive Filter.
  Datei: `frontend/src/pages/QQLibraryPage.tsx`.
- [ ] `/cozygames`, `/rules-editor`, `/host-sheets`, `/vorbereiten` – die eingeführte
  Kopfzeile visuell und funktional konsistent nachziehen: Fokus, Fehler-/Leerzustände,
  responsive Arbeitsbreiten und eindeutige primäre Aktion.

## Danach: Rückblick und Verwaltung

- [ ] `/stats` und `/recap` zusammenführen oder sauber trennen. Aktuell überschneiden sich
  Übersicht und Recap-Einstieg. Empfohlen: `/recap` als einzige Archivübersicht;
  `/stats` entweder dorthin weiterleiten oder als echte zusammenfassende Analyse definieren.
  Dateien: `StatsPage.tsx`, `QQRecapIndexPage.tsx`, `QQRecapPage.tsx`.
- [ ] `/feedback` – Triage-Ansicht statt bloßer Datenliste: offen, geprüft, erledigt;
  klare leere und Fehlerzustände.
- [ ] `/admin` – Room-Code-Start, Einstellungen und Fehlerzustände auf die gemeinsame
  Produkt-Sprache bringen. Prüfen, welche Legacy-Optionen in Single-Session noch sinnvoll sind.
- [ ] `/summary` – öffentliche Nachspielansicht mit klarer Lesereihenfolge und robusten
  leeren/fehlenden Datenzuständen.

## Öffentliche Begleitflächen

- [ ] `/` und `/about` – eine klare, kurze Erklärung des Formats; keine zweite, abweichende
  Markenwelt neben CozyQuiz aufbauen.
- [ ] `/showroom`, `/trailer`, `/reels`, `/clip`, `/karussell`, `/welches-team`, `/formats`, `/skins` –
  in zwei Gruppen aufteilen: echte öffentliche Erlebnis-/Informationsseiten und interne
  Marken-/Medienwerkzeuge. Navigation und Rückwege vereinheitlichen.
- [ ] `/impressum`, `/datenschutz` – lesbare, ruhige Dokumentseiten mit sichtbarem Rückweg.

## Test-, Vorschau- und Legacy-Routen

- [ ] Alle `*-test`-Routen, `/blinktest` und `/race-finale` in einem klaren, PIN-geschützten
  Entwicklertools-Hub dokumentieren. Routen nicht brechen; sie können aus dem normalen Menü
  verschwinden und über den Hub erreichbar bleiben.
- [ ] Legacy-Redirects in `App.tsx` beibehalten, aber nicht als sichtbare Navigation anbieten.
- [ ] Prüfen, ob `/slides` und der alte Slide-Editor endgültig entfernt oder nur als
  dokumentierter Legacy-Pfad bewahrt werden sollen.

## Qualitätssicherung je Welle

- [ ] Desktop: Tab-Reihenfolge, Fokus, Hover und mindestens 1280 px Breite prüfen.
- [ ] MoPo: mindestens 390 px Breite, Safe Areas und 44 px Touch-Ziele prüfen.
- [ ] Lade-, Leer-, Fehler- und deaktivierte Zustände jeder geänderten Datenfläche prüfen.
- [ ] Keine Änderung an `/team` oder `/beamer` im Diff.
- [ ] Nach Abschluss jeder Welle Typecheck, Lint und Diff-Check ausführen.

## Einstieg in der nächsten Sitzung

1. `git status --short` prüfen und fremde Änderungen bewahren.
2. Diese Datei lesen und mit „Nächste Welle: private Host- und Vorbereitungsflächen“ fortfahren.
3. Zuerst `QQModeratorPage.tsx` und `QQModPortablePage.tsx` prüfen, weil sie den tatsächlichen
   Live-Betrieb direkt beeinflussen.
4. Nach einem abgeschlossenen, testbaren Teilbereich die Checkliste aktualisieren.
