# Handoff: Arena-Design/Type/Motion + Screens-1707 (Stand 2026-07-18, vor Compact #2)

> Weiterarbeit NACH dem Compact. Branch **`design/material-pass-standings-bar`** (gepusht,
> HEAD `f2cb94b4`), **main unberührt** bis Wolf merged. Voller Kontext: Memory
> [[project-screens-1707-batch]] · [[project-design-motion-elevation]] · [[reference-beamer-harness]].
> Regeln: [[feedback-real-beamer-never-rebuild]] · [[feedback-red-before-green]] ·
> [[feedback-measure-assets-not-guess]] · [[feedback-use-skills-proactively]].
> Wolf hat diese Session mit 🦖❣️ (Gold-Stern) abgeschlossen — Arbeit lief gut.

## WO STEHEN WIR
Wolfs Screen-Batch (`Desktop/für claude/screens-17-07/`) + Kolosseum-Typo-/Motion-Pass + spontane
Fixes. Alles Frontend + ein Test-Draft (Backend-Logik unangetastet). **Vercel-Preview des Branches
zeigt Frontend gegen Live-Backend.** Lokal siehe HARNESS unten.

## ✅ DIESE SESSION FERTIG + GEPUSHT (Reihenfolge = Commits)
- **bild 10** (CHEESE-Reveal, `4de0fb24`): Fraktions-Wappen waren doppelt (gerankte Reihe IN der
  Card + Abgabe-Raster darunter). Wolf-Wahl „untere morphen hoch" → Abgabe-Raster morpht beim
  Arena-Reveal hoch/verblasst (`qqCheeseGridMorphUp`), gerankte Reihe einheitlich gross (Sieger
  nur Ring→ dann ganz weg, s.u.). **Live verifiziert.**
- **Arena-Test-Draft = ALLE Kategorien** (`3eca7c4c`): `qq-test-cozy-arena-neu` hatte nur
  BUNTE_TUETE+MUCHO → CHEESE/SCHAETZCHEN/All-In nie per Bot-Harness erreichbar. Jetzt 15 Fragen:
  CHEESE Portrait+Landscape, SCHAETZCHEN, MUCHO×2, ZEHN_VON_ZEHN×3, BUNTE_TUETE crowdEstimate/
  crowdTop/hotPotato/order/map. ⚠️ **qqDrafts.json ist GITIGNORED** (lokaler Store) — Source ist
  `backend/src/data/qqExtraTestDrafts.ts` (committed); beides parallel aktualisiert. ⚠️ Fragen
  werden pro Runde **gemischt** → CHEESE nicht garantiert erste Frage (Harness sucht per Text).
- **Bug „moderator-test startet sofort Quiz"** (`d0b6d087`): Ursache = geteilter RAM-Raum `default`
  laeuft weiter → Oeffnen rejoint Alt-Quiz. Fix: TEST-Route resettet beim Oeffnen EINMAL auf LOBBY
  (nur ohne ?run=1, nur wenn keine echten Teams, 900ms nach Join gegen finalen State). `/moderator`
  (echtes Event) nie betroffen. Repro: `scripts/repro-staleroom.mjs`.
- **Menü: Format + Rundenzahl merken** (`b19d04db`): Setup fiel bei jedem frischen Raum auf Default.
  Jetzt localStorage: `qqLastPhases` + `qqLastFormat` (Format-Karte beim frischen LOBBY vorbelegt →
  Wolf pickt nur noch Draft; „Format ändern" bleibt). Draft bewusst manuell. `scripts/verify-format.mjs`.
- **2/3-Ansicht = Kolosseum-Diamant** (`ec795587`→`b51647fa`→`f2cb94b4`): Wolf-Feedback zu bild 10:
  Sieger-Ring weg, nur Kategorie-Farbe (kein Pink), „2/3 correct"-Text bildlicher. **A/B/C/D
  durchgespielt** (Pips/Segment-Balken/Fuellbalken/vertikal) + **Fern-Lesbarkeits-Test** (Screenshot
  auf 560px → nur Wappen+Antwort+Reihenfolge tragen, Detail ist Nah-Info). Wolf-Wahl: **gefuellter
  Diamant** (Kolosseum-Gem-Sprache), fuellt von unten in Kategorie-Farbe, feste Groesse.
  `QQGemFill` in eigener Datei (`components/QQGemFill.tsx`). **Einheitlich ausgerollt:** CHEESE-Reveal
  + Standings-Wertung (`LargeGroupView` „X/Y Handys richtig" — alte Punkte-Dots → Diamant).
  Ausserdem **CHEESE-Reveal-Card-Rahmen** in der Arena jetzt KATEGORIE-Farbe (lila) statt Sieger-
  Fraktions-Farbe (blau). **Live verifiziert.**

## ⏳ WARTET AUF WOLFS LIVE-URTEIL / OK
- Round-Gem (`2f192d64`, letzte Session) — noch kein OK → **Frage-X-von-5-Zähler-Gem NICHT ausrollen**.
- Alles oben liegt als Preview in `Desktop/für claude/design-vorschau/` (bild10-*, VARIANTE-A/B/C/D,
  DIAMANT, standings-diamanten, cheese-rahmen-lila+diamant).

## ➡️ NÄCHSTE SCHRITTE (nach Compact — Wolf: „danach gehts weiter")
1. 🐛 **Winner-Value-Bugs** (Wolf 18.7., klingen verwandt — Sieger-Positionierung Zahlenstrahl):
   - **bild9-schaetzchen-dicht**: Sieger wird NICHT am richtigen Zielwert angezeigt.
   - **schwarm.png** (CrowdEstimate/Hive Mind): Sieger nicht nahe Zielwert + Texte überlappen.
   - Reveals: `SchaetzchenReveal.tsx` + `CrowdEstimateReveal.tsx`. Repro via `/reveal-test` bzw.
     neuer All-Kategorien-Draft (crowdEstimate = p1-3/p3-2).
2. **Design-TODOs** (Wolf 18.7., in todo.md, nach Batch): verzierte Rahmen (Windows+Fragen wie
   Wappen); „abgeschickt" = Wappen ERLEUCHTEN statt grünem Kreis; Progress-Tree Kolosseum/Diamanten.
3. **Top5/Order** „X/Y correct" (andere Metrik = Listen-Treffer/Team) — auf Wunsch auch Diamant.
4. **Screens-Batch:** bild 11 (Final-Bonus-×2-Badge), 12, 13, 14, 15, 16, 17.
5. **Moderator-View-Batch** (Fraktionen einklappen · übersichtlicher · SPACE-Befehle · „Schritt
   zurück" · Zähler-Darstellung) — in todo.md.

## 🧰 HARNESS (Details [[reference-beamer-harness]])
- **Backend frisch:** alten PID killen (`netstat -ano|grep :4000|grep ABH` → `taskkill //PID x //F`),
  `rm -f backend/.qq-rooms/*.json`, dann `cd backend && env -u MONGODB_URI -u DATABASE_URL npm run dev`
  (Port 4000, lädt qqDrafts.json inkl. neuem Draft). Frontend 5173 (läuft meist schon).
- **`scripts/shot-cheese-arena.mjs`** — echter Arena-CHEESE-Reveal (bild 10) + Standings. WICHTIG:
  pausiert Autoplay VERIFIZIERT (idempotent, `button[title="Autoplay pausieren"]` + **blur**, sonst
  togglet Space den Button!), sucht CHEESE per TEXT (Fragen gemischt), erfasst letzten
  QUESTION_REVEAL-Frame (vollste Reihe vor Scoring). Admin-PIN 2506.
- **`/reveal-test`** (KEIN Backend) — SchaetzchenReveal mit 8 Mock-Fraktionen (bild 9).
- **Fern-Lesbarkeit testen:** Screenshot mit `sharp` auf ~560px runterskalieren (simuliert Beamer-
  Distanz): `node -e 'require("./frontend/node_modules/sharp")(".shots/x.png").resize(560).toFile(...)'`.
- ⚠️ Motion ~0.5s: Film-Streifen zeigen sie nicht → Wolf live urteilen. Read-Bilder sieht nur die KI
  → immer nach `Desktop/für claude/design-vorschau/` kopieren.
- Repro-Scripts: `repro-staleroom.mjs`, `repro-autostart.mjs`, `verify-format.mjs`.

## ⚠️ HARTE REGELN
IMMER echter /beamer bzw. /reveal-test, NIE Nachbau · NIE gegen Prod · erst ROT dann GRÜN · Asset
AUSMESSEN · „Premium schlägt frühere Deko" (Reversals VORHER benennen) · KEINE Em-Dashes, Umlaute
direkt · KEIN Gold außer Krönung · nach Änderung committen+pushen (Branch, nicht main) · bei
Idee/Vorschlag erst brainstormen + AskUserQuestion (Wolf liebt Klick-Klärungen).
