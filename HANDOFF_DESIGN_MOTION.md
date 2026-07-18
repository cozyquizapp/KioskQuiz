# Handoff: Arena-Design/Type/Motion + Screens-1707 (Stand 2026-07-18, nach Schwarm-Fixes)

> Weiterarbeit. Branch **`design/material-pass-standings-bar`** (gepusht,
> HEAD `4592b3bf`), **main unberührt** bis Wolf merged. ⚠️ Backend/Frontend laufen evtl. noch (Wolf testete). Voller Kontext: Memory
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

- **„⚡ am schnellsten"-Badge beim Schätzchen-Sieger** (`209a83d4`): bei Punkte-Gleichstand
  UND gleichem Abstand zur Wahrheit (z.B. alle spot-on = alle 100P) entscheidet der Abschick-
  Zeitpunkt → sonst wirkte der Sieger willkürlich („warum gewinnt der?"). `winnerBySpeed`-
  Erkennung + dezentes Badge unter dem Sieger-Wert, NUR in dem Fall. ⚡ ist Platzhalter mit
  TODO-Kommentar; **Wolfs 3D-Gold-Blitz `fx-blitz.png` als Icon eingesetzt** (`689e6d2c`,
  schwarzer BG per Luminanz-Alpha freigestellt, 913KB->16KB). Reveal-Test: Toggle „⚡ Gleichstand".
  **Verifiziert** (JA=Badge, Normalfall=kein Badge). Previews `schaetzchen-am-schnellsten-*` + `-BLITZ`.
- **Schwarm-Reveal Sieger-Position** (`f4d84116`): Wolf schwarm.png — Sieger (Glückstreffer/93,
  +3) stand ganz rechts bei „zu hoch" statt fast mittig. Gleicher `spread()`-Bug wie Schätzchen →
  gleicher Anker-Fix (ranked/winner vor placed, Sieger-Lane auf echte axisPct verschoben,
  geclampt). Reveal-Test: neuer **Schwarm-Modus** (CrowdEstimateReveal, echte Komponente).
- **Schwarm-Reveal Text-Overlaps** (`8cf728b5`): 3 Kollisionen gemessen (Stage-%) + behoben —
  „nah genug = Punkte"-Bandlabel unter das Band (lag auf Punkte-Pillen), „🌊 Schwarm X"-Marker
  in die Lücke Name↔Pille hoch, redundante „🏆 vorne · X P"-Sieger-Pille entfernt (kollidierte
  unten mit Callout, Parität mit Schätzchen). **Verifiziert.** Preview `schwarm-overlaps-NACHHER`.
- **bild 11 — Final-Bonus-Badge = Kolosseum-Gem** (`759f2cb3`): flache Pink-Pille (`#A21247→#EC4899`)
  → Gem-Cut-Plakette (clip-path-Hexagon wie Round-Gem, Facetten-Kante + Glanzlinie, dunkler Ember-
  Stein), „FINALRUNDE/SCHLUSSFRAGE" in Cinzel im geshippten FINALE-Gradient (Pink→Ember), „×N"-Gem-
  Chip, Sub in EB Garamond, ×3 intensiver. Kein neues Pur-Gold (Gold-Regel). Themed → schlichte
  Surface-Pille. **Neue Harness-Route `/phaseintro-test`** (echte PhaseIntroView + Finale-Mock,
  ×2/×3-Toggle; `shot-phaseintro.mjs`). **Verifiziert.** Previews `bild11-finalbadge-x2/x3-NACHHER`.
- **bild 12 — Wappen + BG-Roulette** (`3544922e` + `c682dffe`): (1) „Wappen kaputt" → Wolf-Wahl
  „Asset tauschen": 8 neue `<slug> colloseum.png` (schwarzer BG) freigestellt (Luminanz-Alpha
  t0=6/t1=26, keine Loecher, weicher Glow) → ersetzen `<slug>-colosseum.webp` ueberall (Reveals/
  Awards/Standings/PhaseIntro). Quell-PNGs gitignored. Tool `free-crest.mjs`. (2) „BG durchwechseln
  → auf Sieger stehen bleiben" + „epischer": Award-Beat-BG rouletttet durch die Fraktions-Szenen
  (`faction-*.webp`) und rastet ~1s synchron zur Wappen-Enthuellung auf der Gewinner-Fraktion ein
  (Settle-Puls + Sieger-Farbflut beim Lock). Unbedingter Hook (keine Extraktion). **Neue Route
  `/award-test`** (echte Ceremony + Mock, Step-Buttons; `shot-award*.mjs`). **Verifiziert.**
  Previews `wappen-neu-*`, `bild12-bg-roulette-NACHHER`.
- **bild 13 — Krönung: epic-moment-BG + Fahnen-Motion** (`55900c62`): Wolf-Wahl BG **epic-moment**
  (statt award-ceremony, dessen gemalte Banner mit der Roulette-Reihe kollidierten) — nur in
  `MegaCrownCeremony` gerendert (Award-Beats/Endstand behalten ihre BGs), + staerkere Abdunklung
  + Kopf-Scrim (Lesbarkeit). Banner-Reihe verbreitert (8cqw + 2.2cqw gap → ~80%). Motion (Wolf-Wahl
  „sanftes Wehen + Glut"): `qqBannerSway` (out-of-sync Neigen) + `qqEmberRise` (Funken, nur lit).
  Verifiziert `/award-test` Krönung. Previews `bild13-kroenung-roulette/podium-NACHHER`.
- **bild 14 — Podium-Titel-Overlap** (`afa4e08b`): „ARENA CHAMPIONS" ueberlappte den Pokal an der
  Sieger-Saeulen-Spitze → Titel top 27cqh→18cqh gehoben. Preview `bild14-titel-pokal-NACHHER`.
- **bild 15 — Endstand-Tabelle lesbar** (`4592b3bf`): Wolf-Option „andere Loesung" (BG behalten) →
  Gesamt-Scrim + **Frosted-Glass-Panel** (blur, dunkel) hinter der 8-Zeilen-Tabelle + Titel/Hero-
  Schatten. Alle 8 Zeilen passen bei Beamer-Groesse. `/award-test`-Buehne zeigt jetzt award-ceremony-
  BG + beamer-genaue Breite (1760). Previews `bild15-endstand-panel-NACHHER`/`-VORHER`.

## ⏳ WARTET AUF WOLFS LIVE-URTEIL / OK
- Round-Gem (`2f192d64`, letzte Session) — noch kein OK → **Frage-X-von-5-Zähler-Gem NICHT ausrollen**.
- Alles oben liegt als Preview in `Desktop/für claude/design-vorschau/` (bild10-*, VARIANTE-A/B/C/D,
  DIAMANT, standings-diamanten, cheese-rahmen-lila+diamant).

## ➡️ NÄCHSTE SCHRITTE (offen aus Wolfs Live-Review 18.7.)
1. **Counter „Question 1 of 5" → Gem/Diamant** (Wolf-Idee): reiner Diamant um langen Text wird eng →
   als **facettierter Gem-Rahmen** bauen. Stellen: PhaseIntroView ~1643 („Frage X von 5") + aktive
   Frage (CozyQuizQuestionView) + PausedView. Der PhaseIntro-Round-Gem (`~1054`) ist die Vorlage.
2. **Aktive-Frage Kolosseum-Texte** (Wolf-Frage): Frage-TEXT bleibt bewusst Nunito (Lesbarkeit);
   Counter/Eyebrow/Chrome könnten Cinzel/Gem werden.
3. **⚡-Kolosseum-Konsistenz-Pass** (Wolf-Notiz): das ⚡ steckt in allen Zeit-Pillen — später
   einheitlich kolosseum-tauglich machen (eigener kleiner Pass, kein Muss jetzt).
4. **Design-TODOs** (in todo.md): verzierte Rahmen (Windows+Fragen wie Wappen); „abgeschickt" =
   Wappen ERLEUCHTEN statt grünem Kreis; Progress-Tree Kolosseum/Diamanten.
5. **Top5/Order** „X/Y correct" (andere Metrik = Listen-Treffer/Team) — auf Wunsch auch Diamant.
6. **Screens-Batch:** ✅ 11 · ✅ 12 · ✅ 13 · ✅ 14 · ✅ 15 (Endstand-Panel) · offen: 16 (Kolosseum-BG
   sichtbarer + Windows transparenter = allg. Regel), 17 (Summary noch nicht CozyArena-ready).
7. **Moderator-View-Batch** (Fraktionen einklappen · übersichtlicher · SPACE-Befehle · „Schritt
   zurück" · Zähler-Darstellung) — in todo.md.

## 🧰 HARNESS (Details [[reference-beamer-harness]])
- **Backend frisch:** alten PID killen (`netstat -ano|grep :4000|grep ABH` → `taskkill //PID x //F`),
  `rm -f backend/.qq-rooms/*.json`, dann `cd backend && env -u MONGODB_URI -u DATABASE_URL npm run dev`
  (Port 4000, lädt qqDrafts.json inkl. neuem Draft). Frontend 5173 (läuft meist schon).
- **`scripts/shot-cheese-arena.mjs`** — echter Arena-CHEESE-Reveal (bild 10) + Standings. WICHTIG:
  pausiert Autoplay VERIFIZIERT (idempotent, `button[title="Autoplay pausieren"]` + **blur**, sonst
  togglet Space den Button!), sucht CHEESE per TEXT (Fragen gemischt), erfasst letzten
  QUESTION_REVEAL-Frame (vollste Reihe vor Scoring). Admin-PIN 2506.
- **`/reveal-test`** (KEIN Backend) — SchaetzchenReveal + jetzt CrowdEstimateReveal (Toggle
  „Schätzchen/Schwarm") mit 8 Mock-Fraktionen. Schätzchen-Toggle „⚡ Gleichstand (alle spot-on)"
  triggert das Speed-Badge. Scripts: `shot-revealtest.mjs`, `shot-revealtest-tie.mjs`,
  `shot-revealtest-schwarm.mjs`, `measure-schwarm.mjs` (Bounding-Box-Messung Stage-%).
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
