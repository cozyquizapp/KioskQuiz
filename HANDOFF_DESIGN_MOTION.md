# Handoff: Arena-Design/Type/Motion + Screens-1707 (Stand 2026-07-18, vor Compact #3)

> Weiterarbeit NACH dem Compact. Branch **`design/material-pass-standings-bar`** (gepusht,
> HEAD `3f5e8338`), **main unberührt** bis Wolf merged. ⚠️ Backend läuft evtl. noch (Wolf testete). Voller Kontext: Memory
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
- **bild 10 Wappen-Umbruch 8 = 4+4** (`e0383197`): 8 Fraktionen brachen greedy als 7+1 um. Jetzt
  Grid `repeat(perRow, auto)`, `perRow = n>=7 ? ceil(n/2) : n` → 8=4+4, 7=4+3, ≤6 einreihig.
- **Schätzchen-Sieger-Position** (`3f5e8338`): Wolf-Screenshot (alle 8 spot-on) → gekrönter Sieger
  stand ganz LINKS (weitester vom Ziel) obwohl spot-on. Ursache: `spread()` streute den Sieger bei
  identischen Tipps ans Lane-Extrem. Fix: obere Lane so verschieben, dass Sieger auf ECHTER
  Tipp-Position (`axisPct`) sitzt (spot-on = Ziel-Mitte), Rest relativ mit, clampen. **Verifiziert
  am `/reveal-test`** (alle-spot-on + Normalfall; `scripts/shot-revealtest.mjs`, FACTS temporär
  alle=87 setzen für den all-spot-on-Fall). Previews `design-vorschau/schaetzchen-sieger-*-NACHHER`.

## ⏳ WARTET AUF WOLFS LIVE-URTEIL / OK
- Round-Gem (`2f192d64`, letzte Session) — noch kein OK → **Frage-X-von-5-Zähler-Gem NICHT ausrollen**.
- Alles oben liegt als Preview in `Desktop/für claude/design-vorschau/` (bild10-*, VARIANTE-A/B/C/D,
  DIAMANT, standings-diamanten, cheese-rahmen-lila+diamant).

## ➡️ NÄCHSTE SCHRITTE (nach Compact — offen aus Wolfs Live-Review 18.7.)
1. **„⚡ am schnellsten" beim Schätzchen-Sieger** (HALB begonnen, NICHT committet — nur Code gelesen):
   Wolf-Entscheidung „⚡ BEHALTEN" (konsistent mit den Zeit-Pillen). Zu bauen: dem Sieger ein
   „⚡ am schnellsten / fastest" geben, NUR wenn Sieg per Speed entschieden (Punkte-Gleichstand,
   z.B. alle spot-on = alle 100P → „warum gewinnt der?"). Stelle: SchaetzchenReveal ~398-427
   (Sieger-Wert-Label unter dem Wappen). Tie erkennen via `ptsOfAvatar(rankedFinal[1])===ptsOfAvatar(winner)`.
2. 🐛 **schwarm.png** (CrowdEstimate/Hive Mind, `CrowdEstimateReveal.tsx`) — Wolf: Sieger nicht nahe
   Zielwert + Texte überlappen. Wahrscheinlich SELBER Positions-Bug wie Schätzchen (eben gefixt) →
   analog anwenden. Repro: All-Kategorien-Draft crowdEstimate (p1-3 „Knochen 206" / p3-2 „USA-Sterne 50").
3. **Counter „Question 1 of 5" → Gem/Diamant** (Wolf-Idee): reiner Diamant um langen Text wird eng →
   als **facettierter Gem-Rahmen** bauen. Stellen: PhaseIntroView ~1643 („Frage X von 5") + aktive
   Frage (CozyQuizQuestionView) + PausedView. Der PhaseIntro-Round-Gem (`~1054`) ist die Vorlage.
4. **Aktive-Frage Kolosseum-Texte** (Wolf-Frage): Frage-TEXT bleibt bewusst Nunito (Lesbarkeit);
   Counter/Eyebrow/Chrome könnten Cinzel/Gem werden.
5. **⚡-Kolosseum-Konsistenz-Pass** (Wolf-Notiz): das ⚡ steckt in allen Zeit-Pillen — später
   einheitlich kolosseum-tauglich machen (eigener kleiner Pass, kein Muss jetzt).
6. **Design-TODOs** (in todo.md): verzierte Rahmen (Windows+Fragen wie Wappen); „abgeschickt" =
   Wappen ERLEUCHTEN statt grünem Kreis; Progress-Tree Kolosseum/Diamanten.
7. **Top5/Order** „X/Y correct" (andere Metrik = Listen-Treffer/Team) — auf Wunsch auch Diamant.
8. **Screens-Batch:** bild 11 (Final-Bonus-×2-Badge), 12, 13, 14, 15, 16, 17.
9. **Moderator-View-Batch** (Fraktionen einklappen · übersichtlicher · SPACE-Befehle · „Schritt
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
