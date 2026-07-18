# Handoff: Arena-Design/Type/Motion + Screens-1707 (Stand 2026-07-18, vor Compact)

> Weiterarbeit NACH dem Compact. Branch **`design/material-pass-standings-bar`** (gepusht,
> HEAD `2f192d64`), **main unberührt** bis Wolf merged. Voller Kontext: Memory
> [[project-screens-1707-batch]] · [[project-design-motion-elevation]] · [[reference-beamer-harness]].
> Regeln: [[feedback-real-beamer-never-rebuild]] · [[feedback-red-before-green]] ·
> [[feedback-measure-assets-not-guess]] · [[feedback-use-skills-proactively]].

## WO STEHEN WIR
Wolfs 16-Punkte-Screen-Batch (`Desktop/für claude/screens-17-07/`) + parallel ein Kolosseum-
Typo-/Motion-Pass. Alles Frontend (Backend unangetastet) → **Vercel-Preview des Branches zeigt
alles gegen das Live-Backend**; lokal: `localhost:5173/moderator-test?arena=1&mega=1&run=1` +
`/beamer`, Space-steppen.

## ✅ DIESE SESSION FERTIG + GEPUSHT
- **Regel-Fenster-Schub** (CozyQuizRulesView): Zwei-Karten-Push, alte Karte führt sichtbar RAUS
  (ease-out, schneller Start), neue folgt 0.09s versetzt + settled. renderCard()-Extraktion +
  view/outgoing-State. Commits `cccc773e`→`5c225300`.
- **Teams-Finale = Hero-Startaufstellung** (CozyQuizTeamsRevealView): Wappen groß zentriert
  (Podest-Glut, qqLineupRise/Float) statt Boden-Streifen. Einzug-Overlap gefixt (paddingBottom).
  Wappen breiter als Flex-Slot (transparenter Rand überlappt harmlos). `cccc773e`.
- **Kolosseum-Typo-System:**
  - **Cinzel** (`--font-arena`) auf ALLE großen Hero-Worte (Teams-Wortmarke/Fraktionsname/„Los
    geht's!", PhaseIntro „Runde N"+Kategorie, Regel-Titel, Krönung/Champions/Award). Gegatet
    `largeGroupMode && !themed`. `acd13a39`→`ea6d3fd5`.
  - **EB Garamond** (`--font-arena-quote` Sprüche kursiv + `--font-arena-body` genereller Sub-Font):
    Fraktions-Spruch + PhaseIntro-Untertitel/Kategorie-Zeilen + Regel-Body. `ea6d3fd5`,`e1096081`.
    Kleinste Pills/Zahlen bleiben Nunito. Frage-TEXT bewusst NICHT ändern (Lesbarkeit).
- **bild 4** — All-In-Intro-Beispiel spiegelt echte Runde (1/2/3, alles grün). `641b28c2`.
- **bild 9** — Schätzchen-Reveal Sieger-Stack entzerrt: Label unter Wappen (Krone frei), Sieger
  immer obere Hero-Lane + 20% Abstand. Am `/reveal-test` reproduziert+verifiziert (normal+dicht).
  `fccd1bf7`.
- **Round-Counter Gem** (Wolf-Idee „farblich passender diamant"): PhaseIntro Round-Counter im
  Arena-Modus als facettiertes Gem (clip-path, Rundenfarbe, keine Gold-Kante). `2f192d64`.

## ⏳ WARTET AUF WOLFS LIVE-URTEIL (nicht ändern bis Rückmeldung)
Regel-Exit-Schub · Teams-Finale+Einzug · Cinzel überall · EB-Garamond-Paarung · bild 4 · bild 9
(nur via `/reveal-test` sichtbar!) · Round-Gem. Previews alle in `Desktop/für claude/design-vorschau/`.

## ➡️ NÄCHSTE SCHRITTE (nach Compact)
1. **Round-Gem OK abwarten** → dann identisch auf die **„Frage X von 5"-Zähler** (PhaseIntro
   Zeilen ~1643 + ~1824, Kategorie-Farbe) ausrollen. Gem-clip-path `polygon(6% 0,94% 0,100% 50%,
   94% 100%,6% 100%,0 50%)` (im Round-Counter-Block ~Zeile 1054).
2. **Screens-Batch weiter:** bild 10 (+18), 11, 12, 13, 14, 15, 16, 17 — Details/Status in
   [[project-screens-1707-batch]].
3. **Moderator-View-Batch** (Wolf 17.7., in todo.md): Fraktionen einklappen · View übersichtlicher
   · alle SPACE-Befehle aktualisieren · „einen Schritt zurück" reparieren · Zähler-Darstellung.

## 🧰 HARNESS (Details [[reference-beamer-harness]])
- **`/reveal-test`** (KEIN Backend nötig!): rendert echte SchaetzchenReveal mit 8 Mock-Fraktionen.
  `scripts/shot-revealtest.mjs`. Ideal für Reveal-Layout-Arbeit. Tipp-Cluster in `QQRevealTestPage`
  FACTS anpassbar (dichter Fall = bild 9).
- Beamer-Flow: Backend `env -u MONGODB_URI npm run dev` (4000, frisch: `rm -f backend/.qq-rooms/*`,
  PID via `netstat|grep :4000|grep ABH` killen). Frontend 5173. `run=1` autostartet Bots + hält bei
  TEAMS_REVEAL (dann Space-steppen). ⚠️ Mega-Test-Draft hat KEINE plain-Schätzchen-Frage (Hive Mind).
  Scripts: `shot-teams`, `shot-intro-steps`, `shot-allin`, `shot-guess`, `shot-revealtest`.
- ⚠️ Motion ~0.5s: Film-Streifen zeigen sie NICHT sauber → Wolf live urteilen. Statische
  Kompositionen (Finale, Reveal-Endzustand, Gem, Typo) capturebar.
- Read-Bilder sieht nur die KI → immer nach `Desktop/für claude/design-vorschau/` kopieren.

## ⚠️ HARTE REGELN
IMMER echter /beamer bzw. /reveal-test, NIE Nachbau · NIE gegen Prod · erst ROT dann GRÜN · Asset
AUSMESSEN · „Premium schlägt frühere Deko" (Reversals VORHER benennen) · KEINE Em-Dashes, Umlaute
direkt · KEIN Gold außer Krönung · nach Änderung committen+pushen (Branch, nicht main).
