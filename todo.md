# CozyQuiz — TODO (Single Source of Truth)

> **Regel (gegen Stale-Listen):** Diese Datei listet **nur genuin offene** Punkte.
> Erledigt → im **selben Commit hier löschen** (die Git-History ist der Beleg, dass
> es das Todo mal gab). `SESSION_LOG.md` ist reines **Verlaufsprotokoll**, KEIN
> Tracker. README/ROADMAP nur grobe Blöcke, keine Einzel-Todos.
>
> **Gruppiert nach WER BLOCKIERT** — nicht nach Datum. Neue Punkte in den passenden
> Block, nicht unten anhängen. Kein Handoff-Stapeln mehr.
>
> **Destilliert 2026-07-17:** 569 → ~150 Zeilen. Erledigtes + 8 abgearbeitete Specs raus
> (`docs/archive/`), Handoffs vom 22.6./23.6./25.6./5.7./12.7./15.7./16.7. zusammengeführt.
> Grund: die echten offenen Punkte ertranken in 550 Zeilen Vergangenheit → wir haben
> zweimal an denselben Fixes gesessen. Details der Erledigten: `git log`.

---

## 🎯 TAGESZIEL + ROADMAP (Wolf 2026-07-19)
> **Nordstern:** beide Modi (CozyQuiz + CozyArena/Colosseum) **vollständig spielbar**.
1. **HEUTE:** CozyArena/Colosseum so weit fertig, dass es **spielbar** ist.
2. **Danach:** CozyQuiz vs CozyArena vergleichen → bessere **Views** (nicht Designs) aus
   Arena in CozyQuiz übernehmen (z.B. bestimmte Reveal-Seiten).
3. **Danach:** alle Modi eigenständig je **einmal komplett testen**.

**Offene Setup-/Moderator-Fragen aus dieser Session (an Wolfs Entscheidung):**
- [ ] **Getrennte Mod-Panels zusammenlegen?** /moderator + /moderator-test sind EIN Page +
      `testMode`-Flag. Vorschlag: EIN Panel + „Test-Modus"-Toggle (Bots/Skip/kein-Leaderboard
      dahinter). (Bots sind seit `9cc56ce1` auch im Normal-Modus sichtbar → Frage kam davon.)
- [ ] **Lobby ins Cockpit falten?** LobbyView-Warteraum (Team-Liste/rename/kick/QR/Start)
      überschneidet sich mit dem Cockpit → könnte EINE Setup-Seite werden.
- [ ] **Format-Kompatibilität absichern:** keine CozyQuiz-only-Drafts in Arena spielbar und
      umgekehrt (Filter im Draft-Picker + Block bei Start). ⚠️ playability-kritisch.
- [ ] **Wizard vs Panel** nochmal offen: Wolf hatte Panel gewählt, fragt Wizard nochmal an.
- [ ] **„Meine Quizze" im Menü einklappbar** machen (MenuPage/MyQuizzesHub).
- [ ] **Colosseum-Einstellung:** aktuell = CozyArena-Format (kein separater Schalter). Ggf.
      expliziten „Colosseum an/aus" trennen falls gewünscht.

---

## 🔴 WARTET AUF WOLF — Beamer-Check (hart neuladen: Strg+Shift+R!)

> ⚠️ **Test-Gate:** Beamer **UND** Moderator hart neuladen, **Autoplay AUS** (sonst drückt
> Autoplay den Mod-Pacing-Space selbst). Eine frühere Screenshot-Runde lief auf ALTEM
> Frontend → wir haben Geister gejagt. Bitte erst reloaden, dann knipsen.

Gebaut, typecheck-grün, aber **nie am Projektor gesehen**. Nach dem Check: Punkt hier löschen
oder Nachdreh-Wunsch dranschreiben.

- [ ] **Siegerehrung/Krönung** (größter neuer Block) — Roulette-Timing + Blink-Tempo · Treppchen
      sitzt (KEINE Scrollbar) · 8-Banner-Zeile passt · Award-Banner-Entrollung überlappt die
      Stat-Zeile nicht · Award-Stat-Texte DE/EN · Streamdeck Weiter/Zurück durch die Beats.
- [ ] **Schätzchen v4 „nur Strahl"** — Zwei-Lane überlappungsfrei bei 8 Fraktionen mit engen
      Tipps? Falls nicht: `spread` MIN (12%) / Wappen-Größe nachdrehen.
- [ ] **MUCHO** — 2×2 → 4-Reihen-Morph smooth, kein Overflow? · Farb-Balken-Segmente aus der
      Distanz lesbar bei 8 Fraktionen? (falls Matsch → „bild 4"-Umbau unten greift eh)
- [ ] **Kategorie-Intro-Farben** — jede Kategorie in ihrer Eigenfarbe, NUR Progress-Tree pink?
- [ ] **Arena-Nudges** (Konstanten, nur am Projektor justierbar):
      `BANNER_ANCHORS` (Wappen deckungsgleich auf dem gemalten Banner?) ·
      `ARENA_BG_FOCUS` (`rundenintro: 'center 66% / 116%'`) ·
      `FACE_MASK`-Ellipse am Magier-Wolf (sitzt sie aufs Gesicht?)
- [ ] **Arena-Meister-Splash + Rules-Redesign** — Pacing/Titel ok?
- [ ] **Toggle „Schlicht"** wirklich überall sauber (Beamer/Lobby/Welcome-Overlay)?
- [ ] **Scoring/Standings auf der Tafel** (17.7. neu gebaut) — Überschriften sind raus, BG ist
      auf 110% gezoomt und der Inhalt sitzt in der **ausgemessenen** Tafel (Pixel-Scan von
      `standing.webp`, nicht mehr geschätzt). Sitzt es am echten Projektor? Bleibt der
      Edelstein-Zapfen oben mittig frei? ⚠️ Falls nachdrehen: `ARENA_BG_FOCUS['standing']`
      (ArenaBeamerBg) und `MEGA_BOARD` (CozyQuizLargeGroupView) gehören **zusammen**.
- [ ] **bild 4 — Wappen-Wahltafel** (17.7. gebaut) — passen 8 Fraktions-Wappen mit Zahl-Badge
      in eine Zeile (54% Breite)? Falls zu eng: `avatarSz`/`gap` in `MegaOptionCrests`.
- [ ] **Kontrast am echten Beamer** — „Wing It" (Blau) + „Objection" (Pink) auf Dunkel.
- [ ] **Lobby bei 40 Handys** — kein Scroll am Projektor.
- [ ] **Design-Audit-Fixes** (Kontrast/Touch-44px/reduced-motion) auch im **klassischen**
      CozyQuiz gegenchecken, nicht nur Arena.

**🟡 Judgment-Calls (nur du kannst entscheiden, ob's stört):** Schätzchen-Antwort in Gold
(wirkt bewusst?) · CHEESE-Kategorie-Titel violett (= Kategorie-Eigenfarbe) ·
Fraktionsnamen-Ellipsis → Wrap (Risiko fürs arena-main-Layout).

## 🔴 WARTET AUF WOLF — Assets

- [ ] **8× Breitbild-Award-BGs** `frontend/public/arena-bg/award-<slug>.webp` (16:9).
      Drop-in steht (Layer über `faction-<slug>.webp`-Fallback in `MegaAwardBeat`) → greifen
      automatisch sobald da. Slugs: `bauchgefuehl` `glueckstreffer` `feierabend` `letztesekunde`
      `allwissen` `improvisation` `einspruch` `risiko`.
      ⚠️ Wolfs VS Code verarbeitet zu große Bilder nicht → selbst optimieren (max ~2 MB, sonst
      bricht der Workbox-Precache den Build).

## 🔴 WARTET AUF WOLF — Entscheidungen

- [ ] **MUCHO-Delight-Hebel** — Preview anschauen, dann wählen: A Vote-Tally · B Light-Sweep ·
      C Pre-Lock-Drumroll · D Doppelblink→Settle.
- [ ] **Fraktions-Namen** unter die Layout-1-Wappen? (Preview hatte Namen; gebaut ist Wappen+×Anzahl)
- [ ] **Backend-Refactor freigeben:** `qqMegaEventScore`-Distanzzweige auf shared `qqDistanceScore`
      (beseitigt Drift-Risiko, braucht Redeploy). Angeboten, wartet auf OK.
- [ ] **arena-main-Video** auch aufs Welcome-Overlay? (nur wenn dir das Lobby-Video gefällt)
- [ ] **Wolf-Sprechblase im Logo ist oval** — vor jeder Änderung fragen.

## 🟠 WARTET AUF MICH — Build

**Moderator-View-Batch (Wolf 17.7. + 19.7.):**
- [x] **Fraktionen im Moderator einklappen** — Frage-Phase: pro Fraktion nur Zeile (Wappen + X/N +
      ✓), einzeln aufklappbar (`1b89495f`).
- [x] **Moderator-View übersichtlich / RADIKALES Rework** — Cockpit (Ein-Spalten-Fokus): schlanker
      Status-Streifen → Aktion als Held → Frage/Antwort → Kontext → Rangliste → eingeklapptes
      „App-Steuerung". Bedienung 95% / App 5%. (`a43579ba`, verifiziert real, Previews in
      `design-vorschau/moderator-cockpit-1..4`). ⚠️ **WARTET AUF WOLFS URTEIL.**
- [ ] **„Runde 1 / Frage 1 von 5" anders darstellen** — Zähler-Badges (Cinzel/Kolosseum) — im
      Cockpit jetzt schlanke Pills im Status-Streifen; ggf. Kolosseum-Gems auch hier (offen).
- [ ] **Alle SPACE-Befehle aktualisieren** — Befehlsliste/Hints im Moderator auf aktuellen Stand.
- [ ] **„Einen Schritt zurück" reparieren** — Back/Undo-Step im Moderator ist kaputt.
- [x] **Danger-Button aus Aktions-Zone** + **Test-Header aufräumen** (`f557c4d8`): DangerMenu
      runter in App-Steuerung; 5 Skip-Buttons → ein „🧪 Springe zu"-Dropdown.

**Setup-Vereinheitlichung (Wolf 19.7. „alles doppelt/dreifach"):** Audit → SetupView-Panel ≈
QQSetupWizard-Modal waren Duplikate. Wolf-Wahl: Ein-Panel + Show-planen als reine Checklisten.
- [x] **Stage 1** (`89ab6a8f`): QQSetupWizard entfernt; SetupView = DIE eine „⚙ Einstellungen"-
      Fläche (Cockpit + Format-Wahl → selbes Panel, ← Zurück).
- [x] **Stage 2** (`d82a2be7`): „Show planen" Optionen-Schritt (Timer/Sprache/Comeback-Dublette)
      raus → 5 Schritte (nur Vorbereitung). Previews `design-vorschau/setup-unified-1..3`.
- [x] **Stage 3** (`9cc56ce1`): Format als Inline-Toggle ins Cockpit gefaltet (separate Format-
      Wahl-Buehne nur noch No-Draft-Fallback); Einstellungen-Panel von warm-gold auf kuehles
      Cockpit-Indigo umgeskinnt; Bots-Knopf immer im Cockpit sichtbar. → EINE Bildsprache.
      Previews `design-vorschau/setup-v2-1..2`. ⚠️ WARTET AUF WOLFS BLICK.
- [ ] *(klein/intern, offen)* Format-Toggle steckt noch zusätzlich in SetupView „Erweiterte
      Optionen" (umgeht Team-Reset-Gate); Bots-Popover im Cockpit + No-Draft-S2 doppelt (S2 selten).

**Screens-1707-Batch — KOMPLETT durch:** bild 4 ✅, 9 ✅, 11 ✅, 12 ✅, 13 ✅, 14 ✅, 15 ✅,
16 ✅ (Thanks-Page Arena-Glas, Regel `qqArenaGlass()`), 17 ✅ (Summary Kolosseum-BG Sieger-Fraktion +
Wappen). **Einziger offener Rest aus dem Batch:** bild 10 (2/3-Ansicht A/B/C/D + CHEESE-Reveal-Rethink)
— wartet auf Wolfs Design-Wahl aus `design-vorschau/`. Details in Memory `project_screens_1707_batch`.

**Kolosseum-Kohärenz (Wolf 18.7.):** ⚠️ SCOPE-ENTSCHEIDUNG 18.7. = **nur Tier 1 (5 Kategorie-
Medaillons, Wolf zeichnet), dann Design-FREEZE** → Fokus Event-Funktion + Akquise. Tier 2-4 +
folgende Punkte = „spaeter/optional", NICHT jetzt bauen. Details Memory `project_design_motion_elevation`.
- [x] **„Abgeschickt" = Wappen ERLEUCHTEN statt grünem Kreis** — erledigt (`16f05d3b`, `qqCrestLit`,
      Fraktions-Farbe-Glow, verifiziert `/question-test`). Non-Arena behaelt Gruen.
- [ ] *(spaeter/optional, nach Freeze)* Progress-Tree Diamanten/Gems statt Kreise (koppelt an Tier-1-Assets).
- [ ] *(spaeter/optional, nach Freeze)* Verzierte Rahmen für Windows + Frage-Karten.

**bild 10 — 2/3-Ansicht (Wolf entscheidet aus design-vorschau):** Pips (A) vs Segment-Balken (B),
beide Ring-weg + Kategorie-Farbe (QQCorrectViz + Toggle `QQ_CORRECT_VIZ` in CozyQuizQuestionView).
⚠️ Wolf-Bedenken: bei 5 Sub-Teams viele Pips → Balken skaliert besser. Nach Wahl: EINE Variante +
**einheitlich überall in CozyArena** ausrollen (alle „x/y correct"-Stellen).

**🐛 Winner-Value-Bugs in Guess-Reveals (Wolf 18.7.):**
- [x] **Schätzchen-Sieger-Position** — Sieger stand am Lane-Extrem statt am Zielwert (Commit 3f5e8338,
      verifiziert /reveal-test). Sieger sitzt jetzt an echter Tipp-Position (spot-on = Ziel-Mitte).
- [x] **schwarm.png** (CrowdEstimate/Hive Mind) — Sieger-Position (Anker-Fix wie Schätzchen, `f4d84116`)
      + Text-Overlaps (Bandlabel/Swarm-Marker verschoben, redundante Sieger-Pille raus, `8cf728b5`).
      Gemessen + verifiziert am /reveal-test Schwarm-Modus.
- [x] **„⚡ am schnellsten" beim Schätzchen-Sieger** (nur bei Punkte-Gleichstand, `209a83d4`, verifiziert).
      ⚡ = Platzhalter mit TODO-Slot → **Wolf liefert eigenes „am schnellsten"-Icon, dann tauschen.**
- [x] **Counter „Frage X von 5" → Kolosseum-Gem** — erledigt (`a238696c`, neue Komponente
      `ArenaCounterGem`, beide PhaseIntro-Zaehler, Finale-Overlap-Fix). Paused bewusst gelassen (Card-Kontext).

*(bild 4 + Scoring/Standings-Tafel am 17.7. gebaut → stehen auch oben im Beamer-Check.)*

---

## 🎯 CozyArena LIVE-EVENT (~Anfang Aug 2026) — HÖCHSTE PRIO

**Kontext:** Erstes Event mit echten Geräten. Firma lädt ein, 50–100 Leute (theoret. bis 200),
Tech- + UX-Publikum (kritisch!), komplett **Englisch**, kostenloses Testevent, **Wolf moderiert
solo**. 3–4 Leute pro Handy → ~25–40 Handys/Teams.

**🔒 Gelockt:** Fraktions-Soft-Cap (`ceil(Teams/8)`) + freie Wahl · Team-Cap 40
(`QQ_MAX_TEAMS_LARGE`) · 3-vs-4-pro-Handy = Vor-Ort-Ansage, kein Code · Raum auf EN → Handy +
Beamer + Fraktionen komplett EN (Mod-Konsole bleibt DE).

**Server ist NICHT der Flaschenhals** (Lasttest `backend/scripts/loadtest-arena.mjs`: 40/40 Joins,
Broadcast-Fan-out 33 ms, Payload 15,3 KB) → Broadcast-Throttle vorerst nicht nötig.

- [ ] **Kompletter Trockenlauf** mit mehreren echten Geräten, voller Durchlauf, EN. ← der große
      Brocken, deckt die meisten Punkte unten mit ab.
- [ ] **Setup-Flow am echten Gerät** in EN durchklicken (Fraktion wählen → beitreten).
- [ ] **Venue-WLAN-Latenz + in-Frage-Payload** gegenprüfen. Bei Lag: Broadcast drosseln/Delta.
- [ ] **Fraktions-Soft-Cap live validieren** im 40-Geräte-Lauf (Backend-Safety-Net ist gebaut).
- [ ] **EN-Content-Verify:** Event-Draft Frage für Frage — jedes `textEn/answerEn/optionsEn/unitEn`
      gefüllt? Leere Felder fallen still auf DE zurück. **Kommt erst wenn du den Event-Draft machst.**
- [ ] **Stechen-Trockentest** beide Modi (normal + Arena) + Auto-Reveal-Timer. Fummelig ist nur,
      künstlich einen Gleichstand herzustellen.
- [ ] **Wertungs-Tuning am Trockenlauf:** Finale = „letzte Phase" richtig? · Nähe-Kurve K=3 /
      Map-Cap 25° am echten Content justieren.
- [ ] **Progressives Fraktions-Öffnen** entscheiden (nur falls die Bars bei wenig Andrang dünn wirken).

**🧨 Schlafende Landminen** (deaktivierte Features, kein Live-Risiko — NICHT jetzt fixen): falls
Bluff/OnlyConnect je reaktiviert werden → `Bluff.tsx:511/640` + `OnlyConnectBeamerView.tsx:321`
iterieren rohe `s.teams` (40 statt 8 Fraktionen → Overflow); ebenso Final-Wager/Comeback in Arena.
Vor Reaktivierung Fraktions-Bucketing (`isMega`/`qqFactionBuckets`) ergänzen.

**Showdown Phase 2b (episch, bewusst droppbar):** Showdown-Zone (Top-Gruppe leuchtet durchgehend) ·
Cut-Moment (Wolf-Ansage + Awards-Feier, Akt 2) · Showdown-Look (dunkle Bühne/Spotlight im Finale) ·
persönliche Handy-Anzeige `/team` bei Distanz („Du: 96!"). Design-sensibel → eigener Pass.
Phase 1 + 2a + Finale-Banner shippen allein.

> 🎨 **Reveal-DESIGN macht Wolf selbst in Claude Design.** KI-seitiger Reveal-Rethink ist
> **gestrichen** — nicht bauen, nicht brainstormen. Wir setzen nur gelieferte Designs um.
> Backend-Wertung bleibt unsere Domäne (fertig, `test:scoring` ist Build-Gate).

---

## 🐛 GEPARKT — Bugs ohne Repro (kein Fix ohne Snapshot!)

Beim nächsten Live-Vorkommen DevTools-Network `qq:stateUpdate`-Payload ziehen. Blind fixen hat
hier schon Layout-Regressionen gekostet.

- **Team-Color rot↔blau-Swap am Final-Start** — `teams[i].color` vor/nach Final-Start vergleichen.
- **Joker-Re-Detection nach Steal-Roundtrip** — `state.grid[r][c]` der 4 markierten Cells
  (`ownerId`/`jokerFormed`/`jokerCounted`/`stuck`) + `teamPhaseStats[teamId]`. Fix-Optionen:
  (a) `cells.every(...)` statt `some(...)` in `qqBfs.ts:122+` detectNewJokers, oder
  (b) `jokerCounted` bei Steal NICHT resetten. Auch `qqRooms.ts` handleJokerDetection.
- **/team Joker-False-Positive** — Pragma-Patch drin (`myJokersThisPhase > 0`-Gate). Falls
  nochmal: Payload mit `pendingAction`/`placementsLeft`/`teamPhaseStats`.
- **Beamer-Clipping bei 10+ NICHT-genesteten Teams** (kein Scroll, nur Clipping am Stage-Rand):
  `CozyQuizLargeGroupView` CumulativeStandings (10×88px ≈ 970px an der 990er-Kante) +
  `CozyQuizGameOverView` Normal-Recap (`cols=1` ohne Höhen-Cap). 3-4er-Teams unkritisch,
  genestete Arena (8 Fraktionen) sicher. Erst mit genau 10+ echten Teams prüfen.

**Braucht echtes Gerät:** Tastatur verdeckt Eingabefeld auf kleinen Phones (iPhone SE).
Fix-Kandidat `scrollIntoView({block:'center'})` nach Fokus — ⚠️ `preventScroll:true` wurde bewusst
gegen Header-Springen gesetzt, also erst am Gerät testen.

## ⏸ BEWUSST DEFERRED (mit Grund — nicht vergessen, aber nicht blind bauen)

- **Round-Intro-Balance** — tief mit dem Journey-Zoom-Kamerasystem verzahnt (Bug-Hotspot), hohes
  Bruchrisiko; „oben-lastig" ist evtl. nur ein Transition-Frame. Erst am echten Lauf prüfen, ob's
  überhaupt stört.
- **Reflow-Audit Frage-View** (Timer/Badges) — nur falls der CHEESE-Shift nach dem Fix bleibt.
- **Streamdeck-Action-Toast** bei Hotkey-Press — optional, geringer Mehrwert (F13–F19 + Bounce-Locks
  sind verdrahtet, Skip-Toast existiert).
- **Mikro-Polish** (Animation-Easings · Layout-Cap-Bumps · justifyContent-Lücken) — spekulative
  Audit-Notizen, **Zeilennummern veraltet**. Nur anfassen wenn du die Stelle konkret bemängelst,
  vorher re-grepen.

## 🌐 BLOCKIERT / EXTERN (kein Code-Task hier)

- **ThanksView „Nächstes Event"-Block** — wartet auf den cozywolf.de-Buchungsflow. Layout-Skelett
  vorbereitet (`QQBeamerPage.tsx` ThanksView, Suchwort „LINKS: Platzhalter").
- **cozywolf.de Impressum/Datenschutz** ergänzen (App-seitig live). Siehe `COZYWOLF_LANDING.md`.

---

## 🎨 LANGLÄUFER

**Design-Sweep + 1000h-Schlussstrich** → [`DESIGN_SWEEP.md`](DESIGN_SWEEP.md): der einmalige
Design-Durchlauf (Beamer+Team, 21 Stationen, vorne→hinten), danach **Design eingefroren → nur noch
Funktionalität**. Arbeitszeit ~895/1000 h über alle 3 Repos, noch ~105 h. Nach `21/21` keine
Geschmacks-Politur mehr vorschlagen.

**Danach:** UX-Delight- & Motion-Elevation-Pass („Boden fertig, dann Delight"), Screen für Screen,
Wolf im Loop, via `animate` + `ui-ux-pro-max` + `web-design-guidelines`.

**Theme-/Skin-System** — **Studio Mono** ist live durchgeklickt + poliert (Shape-Tokens, Quiet-Motion,
Cheese-Mono-Redesign, Summary skin-aware). Offen:
- [ ] **SoftPop + Neo-Brutal** noch NIE am Live-Screen durchgesehen — kommen laut Wolf **erst wenn
      Mono perfekt** (Mono hat Prio, am ehesten für Corporate).
- [ ] **Augen-Review am Screen** (kein Code): Comeback-View in Mono + Summary-Mono eckig/Hard-Shadow.
- [ ] **Entscheidung offen:** Theme-Resolver-Fundament bauen (`resolveTheme` → ein `ResolvedTheme`,
      `getBrandColors` wird dünner Wrapper, Eurovision = nur ein Preset)? Wenn ja: welche
      Event-Themes zuerst? ⚠️ Ehrliche Kosten: Fundament ~½ Tag, „einheitlich über ALLE Pages" ist
      Langschwanz (~124× hardcoded `#ec4899` + Inline-Brand-Werte) → **graduell**, kein
      Wochenend-Projekt. Mass-Replace ist ausdrücklich verworfen (`qqDesignTokens` sagt das selbst).

**Marketing-Seiten** (`/about` A4-One-Pager mit PDF-Download, `/trailer` 9:16) sind live. Optional:
`/about` 1-Seiten-Fit am Druck verifizieren · MediaRecorder→WebM-Download im Trailer ·
Trailer-Tempo nach Review. ⚠️ Bei Mechanik-Änderungen **beide Seiten mitziehen** (Inhalt ist aus
den Regeln abgeleitet).

---

*Erledigte Punkte stehen in der Git-History (`git log --oneline`), nicht hier.
Abgearbeitete Specs/Audits/Handoffs liegen in [`docs/archive/`](docs/archive/).*
