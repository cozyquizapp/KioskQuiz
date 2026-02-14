# STRUKTUR.md

## Übersicht
Dieses Repository enthält die KioskQuiz-Anwendung. Die gelöschten Studio/Bingo/Builder-Module sind nicht mehr enthalten. Die Struktur und die Modulbeschreibungen helfen neuen Mitwirkenden, sich schnell zurechtzufinden.

## Hauptmodule

- **backend/**
  - Enthält die Serverlogik, API-Endpunkte, Validierung und Spielmechanik.
  - Verantwortlich für Datenhaltung, Spielfluss und Kommunikation mit dem Frontend.
  - Unterordner:
    - `src/config/`: Konfiguration (z.B. Intro-Slides)
    - `src/data/`: Quizdaten, Fragen, Layouts
    - `src/game/`: State-Machine und Spiellogik
    - `src/mechanics/`: Quiz-Mechaniken
    - `src/routes/`: API-Routen
    - `src/types/`: Typdefinitionen
    - `src/validation.ts`: Validierungslogik
    - `server.ts`: Einstiegspunkt Backend

- **frontend/**
  - Enthält die Client-Anwendung (React/Vite), UI-Komponenten und Assets.
  - Kommuniziert mit dem Backend, zeigt Quiz und Auswertungen an.
  - Unterordner:
    - `src/components/`: UI-Bausteine
    - `src/pages/`: Seitenstruktur
    - `src/hooks/`: React-Hooks
    - `src/utils/`: Hilfsfunktionen
    - `src/views/`: Hauptansichten
    - `src/admin/`: Admin-Funktionen
    - `public/`: Statische Assets (Bilder, Avatare, Kategorien)
    - `tests/`: End-to-End-Tests

- **shared/**
  - Gemeinsame Logik und Typen für Backend und Frontend.
  - Z.B. Quiz-Typen, Text-Normalisierung, Mechaniken.

- **uploads/**
  - Upload-Verzeichnis für Bilder und Fragen.
  - Wird zur Laufzeit befüllt.

## Zusammenspiel
- Das **Frontend** kommuniziert per API/Websocket mit dem **Backend**.
- **Shared**-Module werden von beiden Seiten genutzt, um Logik und Typen konsistent zu halten.
- **Uploads** werden vom Backend verarbeitet und im Frontend angezeigt.

## Sonstige Dateien
- Diverse Markdown-Dokumentationen (z.B. ACCESSIBILITY_*, UI_IMPROVEMENTS_*)
- Hilfsskripte (z.B. check_all_brackets.ps1)

## Nicht mehr enthalten
- Studio, Bingo, Builder: Alle Reste wurden entfernt.