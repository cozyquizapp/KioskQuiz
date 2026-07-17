# Handoff: Arena-Design-Batch + Motion (Stand 2026-07-17, vor Compact)

> Fuer die Weiterarbeit NACH dem Compact. Ziel: nahtlos auf gleichem Niveau weiter.
> Voller Kontext: Memory [[project-screens-1707-batch]] · [[project-design-motion-elevation]]
> · [[reference-beamer-harness]]. Regeln: [[feedback-real-beamer-never-rebuild]] ·
> [[feedback-red-before-green]] · [[feedback-measure-assets-not-guess]].

## WO STEHEN WIR — in einem Satz
Wir arbeiten Wolfs **16-Punkte-Screen-Batch** (`Desktop/für claude/screens-17-07/`) ab,
EINER nach dem anderen VOLLSTAENDIG fertig, dann der naechste. Parallel kamen Motion- und
Material-Verbesserungen dazu. Alles auf Branch **`design/material-pass-standings-bar`**
(gepusht), **main sauber** (3feab00f) bis Wolf merged.

## ✅ HEUTE FERTIG + GEPUSHT (Branch)
- **bild 1** (Round-Intro nicht symmetrisch): GEMESSEN → Tree war exakt mittig, Ursache war
  der BG-Vortex (rundenintro.webp 50.96% → +20px). Fix ARENA_BG_FOCUS.rundenintro `57%`.
  Commit dbe19108.
- **bild 2** (Starting-Lineup Namen ueberlappen): Vordergrund-Roster (8 gleiche Flex-Slots)
  statt BANNER_ANCHORS. Commit f06c3cb1. DANN: neuer **Sky-BG** `arena-teams-sky.webp` (keine
  gemalten Banner → kein Doppel) + **grosse Wappen** + qqRosterLand-Motion. Commit db4eb615.
- **bild 3** (Cluster-Zoom nicht symmetrisch): BG via bild-1-Fix mit erledigt; Track-Strich
  auf den fokussierten Cluster begrenzt (phaseDotSpans + focusPhaseIdx). Commit f5010369.
- **Regel-Motion** (Wolf-Idee): ganze Karte als STARRES Fenster horizontal reingeschoben
  (qqRulesArriveR/L, 150px, rechts→links) passend zum Progress-Tree. Alle internen Entrance-
  Animationen RAUS (Titel-Kaskade/Icon-heroEntrance/Divider-Draw/Kachel-Fades) → Inhalt starr,
  faehrt mit; nur ambientes Wiegen + Shimmer bleiben. Commits ef1d0348 → 996fd43a (Wolf „nicht
  wirklich als ganze windows reingeschoben"). Depth-Keyframe qqRulesArrive bleibt fuer Rueckkehr.
- **Kolosseum-Wappen**: `<slug>-colosseum.webp` (freigestellt aus Wolfs `<slug> colloseum.png`
  via Luma-Key t0=6/t1=34, auf 680px + WebP 119-233KB) ersetzen glossy. crestSrc → `.webp`.
  Commit 403fe0d6 (PNG) → fd1aaaaf (WebP, weil 3MB-PNG den Vercel/PWA-Build sprengte).
  ⚠️ `public/neue background/` jetzt gitignored + workbox globIgnores (Wolfs 2-3MB-Staging-PNGs).

## ⏳ WARTET AUF WOLFS LIVE-URTEIL (nichts committen/aendern bis er sich meldet)
1. **Regel-Motion horizontal vs Tiefe** — er vergleicht live. „Tiefe zurueck" = crestSrc… nein:
   in CozyQuizRulesView Animation-Zeile wieder auf `qqRulesArrive` (Depth-Keyframe liegt da).
2. **Kolosseum-Wappen behalten?** — pending wegen Gold-Regel („kein Gold ausser Kroenung").
   „Behalten" = fertig. Revert = crestSrc zurueck auf `${slug}.png`.
3. Er sagte, er **compactet** und will danach an **bild 4** weiter.

## ➡️ NAECHSTE SCHRITTE (nach Compact, in dieser Reihenfolge)
1. Wolfs Live-Rueckmeldung zu (1)+(2) oben abwarten/umsetzen.
2. **bild 4** starten (naechster Screen): das All-In-Beispiel auf der 1. All-In-Seite passt
   nicht zur echten Runde (zeigt „1/2/3 + alles gruen"). Beispiel an echte Runde anpassen.
   Danach bild 9,10,11,12,13,14,15,16,17 (Details + Status in [[project-screens-1707-batch]]).
3. **Kolosseum-Kohaerenz** (Wolf-Frage „was noch, damit's runder wird?") — NACH dem Batch,
   nicht dazwischen. Rangfolge: (a) Kategorie-Icons als Kolosseum-Satz [BILD-KI, Wolf liefert],
   (b) Panel-/Karten-Material-Rezept Stein+Gold-Kante [CODE], (c) UI-Chrome [CODE], (d) Titel
   als Inschrift [CODE]. Bild-KI-Bedarf s.u.

## 🎨 WAS WOLF PER BILD-KI ERSTELLEN SOLL (Assets, nicht Code)
- **Kategorie-Icons als Kolosseum-Satz** (klarer #1): die 5 Kategorien (Mucho, Schaetzchen,
  Bunte Tuete, All In/10v10, Schau mal/Cheese) + ggf. Sub-Mechaniken. Gleiche Material-Sprache
  wie die neuen Wappen (gemeisseltes Stein-Symbol + duenner Gold/Glut-Rahmen). Vorschlag: RUND/
  Medaillon (nicht Schild, sonst mit Fraktions-Schilden verwechselbar). Auf SCHWARZEM BG
  rendern → KI stellt frei via Luma-Key (t0=6,t1=34, s. crest-cutout in Session-Historie).
- **Optional**: eine nahtlose Stein-/Pergament-Textur-Kachel als Material-Basis fuer Panels.
- Panel-Rahmen, Chrome, Typo = CODE (nicht Bild-KI).

## 🧰 BEDIENUNG (Details [[reference-beamer-harness]])
- Server: Backend `env -u MONGODB_URI -u DATABASE_URL npm run dev` (4000, Raum vorher loeschen:
  `rm -f backend/.qq-rooms/default.json`, PID per `netstat|grep :4000|grep ABH` killen —
  deutsches Windows!). Frontend 5173. Health-uptime klein = frisch.
- Capture-Skripte (scripts/): `record-rules.mjs` (Regel-Motion), `shot-teams.mjs` (TEAMS_REVEAL
  mid+done), `shot-intro-steps.mjs` (PHASE_INTRO Step 0/1), `measure-tree.mjs` (Tree-Zentrierung),
  `record-run.mjs`/`shot-placement.mjs` (Durchlauf/Gesamtstand), `montage-strip.mjs` (Film-Streifen).
- ⚠️ Read-Bilder sieht nur die KI → immer nach `Desktop/für claude/design-vorschau/` kopieren.
- ⚠️ Motion ~0.4s: Film-Streifen zeigen sie NICHT sauber (Latenz-Streuung) → Wolf live urteilen.
- Mess-Anker im Code: `data-qq-phase`/`-mega`/`-standings-revealed` (QQBeamerPage), `data-qq-tree`
  (QQProgressTree). Reine data-Attribute.

## ⚠️ HARTE REGELN (nicht brechen)
- IMMER echter /beamer, NIE Nachbau. NIE gegen Prod (Bots im Live-Backend). Erst ROT dann GRUEN,
  Asset AUSMESSEN statt schaetzen. Nordstern: „Premium schlaegt fruehere Deko" (Reversals VORHER
  benennen). Keine Em-Dashes, Umlaute direkt. Nach Aenderung committen+pushen (Branch, nicht main).
